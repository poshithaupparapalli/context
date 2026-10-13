import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
  type VirtualElement,
} from "@floating-ui/dom";

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function toRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x, y, width, height,
    top: y, left: x, right: x + width, bottom: y + height,
    toJSON() { return this; },
  } as DOMRect;
}

/**
 * For selections taller than the viewport, anchor to the part you can see so
 * the card never lands off-screen. A selection that is wholly scrolled away
 * is left alone (the card scrolls away with it).
 */
export function clampRectToViewport(rect: RectLike, viewportW: number, viewportH: number): DOMRect {
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, viewportH);
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, viewportW);
  if (bottom <= top || right <= left) return toRect(rect.x, rect.y, rect.width, rect.height);
  return toRect(left, top, right - left, bottom - top);
}

function liveRect(range: Range): DOMRect {
  const rect = range.getBoundingClientRect();
  return clampRectToViewport(rect, window.innerWidth, window.innerHeight);
}

/** A floating-ui reference that follows the selection as the page scrolls or reflows. */
export function selectionReference(range: Range, kind: "block" | "end"): VirtualElement {
  const parent = range.commonAncestorContainer;
  const contextElement = parent.nodeType === Node.ELEMENT_NODE ? (parent as Element) : parent.parentElement ?? undefined;
  let last: DOMRect = liveRect(range);

  return {
    contextElement,
    getBoundingClientRect() {
      let rect: DOMRect;
      if (kind === "end") {
        const rects = range.getClientRects();
        const tail = rects[rects.length - 1];
        rect = tail ? toRect(tail.right, tail.top, 0, tail.height) : range.getBoundingClientRect();
      } else {
        rect = liveRect(range);
      }
      if (rect.width === 0 && rect.height === 0 && kind === "block") return last;
      last = rect;
      return rect;
    },
  };
}

export interface AnchorOptions {
  placement: Placement;
  gap: number;
  margin: number;
  /** Upper bound for the floating element's height, or undefined to size to content. */
  constrainHeight: boolean;
  minHeight?: number;
}

/**
 * Positions `floating` next to `reference` (position: fixed, so the page's
 * layout is never touched), flipping and shifting to stay inside the viewport.
 */
export function anchor(reference: VirtualElement, floating: HTMLElement, opts: AnchorOptions): () => void {
  const update = () => {
    void computePosition(reference, floating, {
      strategy: "fixed",
      placement: opts.placement,
      middleware: [
        offset(opts.gap),
        flip({
          padding: opts.margin,
          fallbackPlacements: [
            opts.placement.startsWith("top") ? "bottom-start" : "top-start",
            "right-start",
            "left-start",
          ],
          fallbackStrategy: "bestFit",
        }),
        shift({ padding: opts.margin }),
        size({
          padding: opts.margin,
          apply({ availableHeight, availableWidth, elements }) {
            const maxH = Math.max(opts.minHeight ?? 120, availableHeight);
            const style = elements.floating.style;
            style.maxHeight = opts.constrainHeight ? `${Math.floor(maxH)}px` : "";
            style.maxWidth = `${Math.floor(Math.max(240, availableWidth))}px`;
          },
        }),
      ],
    }).then(({ x, y }) => {
      floating.style.left = `${Math.round(x)}px`;
      floating.style.top = `${Math.round(y)}px`;
    });
  };
  return autoUpdate(reference, floating, update, { animationFrame: false });
}

/**
 * How far to scroll the page so a tall panel fits below the selection.
 * Never scrolls the selection's first line out of view.
 */
export function scrollDeltaForPanel(
  rect: { top: number; bottom: number },
  viewportH: number,
  desiredHeight: number,
  gap: number,
  margin: number,
): number {
  const spaceBelow = viewportH - rect.bottom - gap - margin;
  if (spaceBelow >= desiredHeight) return 0;
  const needed = desiredHeight - spaceBelow;
  const room = Math.max(0, rect.top - margin);
  return Math.round(Math.min(needed, room));
}
