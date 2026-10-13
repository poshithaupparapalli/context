import { ContextError } from "../../errors.js";

/** fetch wrapper that maps transport and HTTP failures onto ContextError codes. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
  providerLabel: string,
  fetchImpl: typeof fetch = fetch,
): Promise<any> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (isAbort(err)) {
      throw new ContextError("timeout", `${providerLabel} took too long to respond.`);
    }
    throw new ContextError("network", `Could not reach ${providerLabel}. Check your connection.`);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) throw mapHttpError(res.status, text, providerLabel);

  try {
    return JSON.parse(text);
  } catch {
    throw new ContextError("upstream", `${providerLabel} returned an unreadable response.`);
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function mapHttpError(status: number, body: string, label: string): ContextError {
  const detail = extractMessage(body);
  if (status === 401 || status === 403) {
    return new ContextError(
      "not_configured",
      `${label} rejected the API key${detail ? ` (${detail})` : ""}. Check server/.env.`,
    );
  }
  if (status === 429) {
    return new ContextError("rate_limited", `${label} is rate limiting requests. Try again shortly.`);
  }
  if (status === 404) {
    return new ContextError(
      "upstream",
      `${label} could not find the requested model${detail ? ` (${detail})` : ""}. Check CONTEXT_FAST_MODEL / CONTEXT_DEEP_MODEL.`,
    );
  }
  return new ContextError("upstream", `${label} returned an error (${status})${detail ? `: ${detail}` : ""}.`);
}

function extractMessage(body: string): string {
  try {
    const json = JSON.parse(body);
    const msg = json?.error?.message ?? json?.message;
    if (typeof msg === "string") return msg.slice(0, 200);
  } catch {
    /* not JSON */
  }
  return "";
}
