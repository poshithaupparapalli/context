import type { ApiError } from "@context/shared";

export type Load<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: ApiError };

export type ResolvedTheme = "light" | "dark";
