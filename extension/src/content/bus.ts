import type { Captured } from "./selection";

export type UiEvent =
  | { type: "select"; captured: Captured }
  | { type: "clear" }
  | { type: "open"; captured: Captured };

/** A one-listener channel that holds events until the UI has mounted. */
export function createBus() {
  let listener: ((e: UiEvent) => void) | null = null;
  const pending: UiEvent[] = [];
  return {
    emit(e: UiEvent) {
      if (listener) listener(e);
      else pending.push(e);
    },
    subscribe(fn: (e: UiEvent) => void) {
      listener = fn;
      pending.splice(0).forEach(fn);
      return () => {
        if (listener === fn) listener = null;
      };
    },
  };
}
export type Bus = ReturnType<typeof createBus>;
