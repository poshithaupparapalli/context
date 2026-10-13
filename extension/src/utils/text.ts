export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Whether a selection is worth offering a trigger for. */
export function isMeaningfulSelection(text: string): boolean {
  const t = normalizeText(text);
  if (t.length < 2) return false;
  return /[\p{L}\p{N}]/u.test(t);
}

/**
 * A window of `text` centred on [start, start+length), cut at word boundaries.
 * Used when the nearest block-level element is much larger than a paragraph.
 */
export function windowAround(text: string, start: number, length: number, max: number): string {
  if (text.length <= max) return text;
  const room = Math.max(0, max - length);
  let from = Math.max(0, start - Math.floor(room / 2));
  let to = Math.min(text.length, from + max);
  from = Math.max(0, to - max);

  if (from > 0) {
    const nextSpace = text.indexOf(" ", from);
    if (nextSpace !== -1 && nextSpace < start) from = nextSpace + 1;
  }
  if (to < text.length) {
    const lastSpace = text.lastIndexOf(" ", to);
    if (lastSpace > start + length) to = lastSpace;
  }
  return `${from > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`;
}

export interface Excerpt {
  before: string;
  match: string;
  after: string;
}

/** A short run of the paragraph around the selection, for the notebook header. */
export function excerptAround(paragraph: string, selection: string, radius = 90): Excerpt | null {
  const idx = paragraph.indexOf(selection);
  if (idx === -1 || !paragraph) return null;
  const matchText = truncate(selection, 140);
  let before = paragraph.slice(Math.max(0, idx - radius), idx);
  let after = paragraph.slice(idx + selection.length, idx + selection.length + radius);
  if (idx > radius) before = `…${before.replace(/^\S*\s/, "")}`;
  if (idx + selection.length + radius < paragraph.length) after = `${after.replace(/\s\S*$/, "")}…`;
  return { before, match: matchText, after };
}
