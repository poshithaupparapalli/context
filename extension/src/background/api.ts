import type { ApiError, ApiErrorCode } from "@context/shared";
import type { ApiOp } from "../utils/messages";

const PATHS: Record<ApiOp, string> = {
  explain: "/api/explain",
  deepen: "/api/deepen",
  followup: "/api/followup",
};

/** The server enforces its own (shorter) limit; these only catch a hung connection. */
const TIMEOUT_MS: Record<ApiOp, number> = {
  explain: 50_000,
  deepen: 80_000,
  followup: 80_000,
};

export class ApiFailure extends Error {
  constructor(readonly error: ApiError) {
    super(error.message);
  }
}

const KNOWN_CODES: ApiErrorCode[] = [
  "not_configured",
  "bad_request",
  "timeout",
  "rate_limited",
  "upstream",
  "bad_output",
  "network",
  "internal",
];

export async function callServer<T>(
  serverUrl: string,
  op: ApiOp,
  payload: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(`${serverUrl}${PATHS[op]}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS[op]),
    });
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ApiFailure({ code: "timeout", message: "That took too long. Try again in a moment." });
    }
    throw new ApiFailure({
      code: "network",
      message: `Can't reach the Context server at ${serverUrl}. Is it running?`,
    });
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as { error?: Partial<ApiError> } | null)?.error;
    const code = KNOWN_CODES.includes(err?.code as ApiErrorCode) ? (err!.code as ApiErrorCode) : "upstream";
    throw new ApiFailure({
      code,
      message: err?.message || `The server returned an error (${res.status}).`,
    });
  }
  if (body === null || typeof body !== "object") {
    throw new ApiFailure({ code: "upstream", message: "The server sent an unreadable response." });
  }
  return body as T;
}
