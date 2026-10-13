import { isMeaningfulSelection, normalizeText } from "../utils/text";

export interface Captured {
  /** A private copy of the selection's range; it stays valid after the user clicks elsewhere. */
  range: Range;
  text: string;
}

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/** Reads the current selection if it's something Context should offer to explain. */
export function readSelection(ignore?: Node | null, win: Window = window): Captured | null {
  const sel = win.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const text = normalizeText(sel.toString());
  if (!isMeaningfulSelection(text)) return null;

  const container = range.commonAncestorContainer;
  const el = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
  if (el?.closest(EDITABLE)) return null;
  if (ignore && (ignore === container || ignore.contains(container))) return null;
  return { range: range.cloneRange(), text };
}

export interface SelectionHandlers {
  onSelect(captured: Captured): void;
  onClear(): void;
}

/**
 * Notices when the reader finishes selecting text (mouse or keyboard) and
 * when the selection goes away. `host` is our own UI, which is never "selected".
 */
export function watchSelection(handlers: SelectionHandlers, host: () => Node | null, doc: Document = document): () => void {
  let timer: number | undefined;

  const evaluate = () => {
    const captured = readSelection(host(), doc.defaultView ?? window);
    if (captured) handlers.onSelect(captured);
    else handlers.onClear();
  };
  const schedule = (delay: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(evaluate, delay);
  };

  const fromOurUi = (e: Event) => {
    const h = host();
    return Boolean(h && e.composedPath().includes(h));
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0 || fromOurUi(e)) return;
    schedule(12);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (fromOurUi(e)) return;
    if (e.shiftKey || e.key === "Shift" || (e.key.toLowerCase() === "a" && (e.ctrlKey || e.metaKey))) schedule(30);
  };
  const onSelectionChange = () => {
    const sel = doc.getSelection();
    if (!sel || sel.isCollapsed) schedule(120);
  };

  doc.addEventListener("mouseup", onMouseUp, true);
  doc.addEventListener("keyup", onKeyUp, true);
  doc.addEventListener("selectionchange", onSelectionChange);
  return () => {
    window.clearTimeout(timer);
    doc.removeEventListener("mouseup", onMouseUp, true);
    doc.removeEventListener("keyup", onKeyUp, true);
    doc.removeEventListener("selectionchange", onSelectionChange);
  };
}
