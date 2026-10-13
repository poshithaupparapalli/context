import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { anchor, selectionReference } from "../content/position";

/**
 * The floating surface for the card and the expanded panel. It is positioned
 * with `position: fixed` next to the selection, so the page's own layout is
 * never touched, and it follows the selection through scrolling and resizing.
 */
export function Panel({
  range,
  expanded,
  children,
  autoFocus,
}: {
  range: Range;
  expanded: boolean;
  children: ReactNode;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [positioned, setPositioned] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = anchor(selectionReference(range, "block"), el, {
      placement: "bottom-start",
      gap: 10,
      margin: 12,
      constrainHeight: true,
      minHeight: 200,
    });
    const frame = requestAnimationFrame(() => setPositioned(true));
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [range]);

  useLayoutEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={expanded ? "Context exploration" : "Context explanation"}
      tabIndex={-1}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
      className={`ctx-surface pointer-events-auto fixed flex flex-col outline-none
        transition-[width] duration-200 ease-out ${positioned ? "animate-rise" : "opacity-0"}`}
      style={{ width: expanded ? "min(580px, calc(100vw - 24px))" : "min(380px, calc(100vw - 24px))" }}
    >
      {children}
    </div>
  );
}

/** Positions the small trigger just below the end of the selection. */
export function TriggerAnchor({ range, children }: { range: Range; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [positioned, setPositioned] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = anchor(selectionReference(range, "end"), el, {
      placement: "bottom-start",
      gap: 6,
      margin: 8,
      constrainHeight: false,
    });
    const frame = requestAnimationFrame(() => setPositioned(true));
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [range]);

  return (
    <div
      ref={ref}
      className={`pointer-events-auto fixed ${positioned ? "" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}
