import type { ApiErrorCode } from "@context/shared";

const STATUS: Record<ApiErrorCode, number> = {
  not_configured: 503,
  bad_request: 400,
  timeout: 504,
  rate_limited: 429,
  upstream: 502,
  bad_output: 502,
  network: 502,
  internal: 500,
};

export class ContextError extends Error {
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ContextError";
    this.code = code;
  }
  get status(): number {
    return STATUS[this.code];
  }
}
