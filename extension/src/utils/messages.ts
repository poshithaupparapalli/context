import type {
  ApiError,
  DeepResponse,
  DeepenRequest,
  ExplainRequest,
  Explanation,
  FollowUpRequest,
  FollowUpResponse,
} from "@context/shared";

export interface ApiOps {
  explain: { request: ExplainRequest; response: Explanation };
  deepen: { request: DeepenRequest; response: DeepResponse };
  followup: { request: FollowUpRequest; response: FollowUpResponse };
}
export type ApiOp = keyof ApiOps;

export type ApiMessage = {
  [K in ApiOp]: { type: "context:api"; op: K; payload: ApiOps[K]["request"] };
}[ApiOp];

export type ApiResult<T> =
  | { ok: true; data: T; cached: boolean }
  | { ok: false; error: ApiError };

/** Sent by the background worker when "Explain with Context" is chosen. */
export interface ExplainSelectionMessage {
  type: "context:explain-selection";
}

export type ClearCacheMessage = { type: "context:clear-cache" };
export type ContentMessage = ExplainSelectionMessage;
export type BackgroundMessage = ApiMessage | ClearCacheMessage;

/** Content-script side: talk to the service worker, never to the network. */
export async function callApi<K extends ApiOp>(
  op: K,
  payload: ApiOps[K]["request"],
): Promise<ApiResult<ApiOps[K]["response"]>> {
  const message = { type: "context:api", op, payload } as ApiMessage;
  try {
    const result = (await chrome.runtime.sendMessage(message)) as
      | ApiResult<ApiOps[K]["response"]>
      | undefined;
    if (!result) {
      return { ok: false, error: { code: "internal", message: "No response from the Context extension." } };
    }
    return result;
  } catch (err) {
    const stale = String((err as Error)?.message ?? "").includes("Extension context invalidated");
    return {
      ok: false,
      error: {
        code: "internal",
        message: stale
          ? "Context was just updated. Reload this page to keep using it."
          : "Could not reach the Context extension. Reload the page and try again.",
      },
    };
  }
}
