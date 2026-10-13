import { LIMITS } from "@context/shared/limits";
import type { PageContext } from "@context/shared";
import { normalizeText, truncate, windowAround } from "../utils/text";

const BLOCK_TAGS = new Set([
  "P", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6",
  "PRE", "TD", "TH", "FIGCAPTION", "DD", "DT", "SUMMARY",
]);
const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const CANDIDATE_SELECTOR = "p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, figcaption";
const CHROME_SELECTOR = "nav, header, footer, aside, form, [role='navigation'], [role='banner'], [role='complementary']";
const MIN_NEIGHBOR_CHARS = 25;

function elementOf(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function textOf(el: Element): string {
  return normalizeText(el.textContent ?? "");
}

function isInlineDisplay(el: Element): boolean {
  const display = el.ownerDocument.defaultView?.getComputedStyle(el).display ?? "block";
  return (display === "" || display.startsWith("inline")) && display !== "inline-block" && display !== "inline-flex";
}

/** The paragraph-like element that contains the start of the selection. */
export function findBlock(range: Range): Element {
  const start = elementOf(range.startContainer) ?? range.commonAncestorContainer.parentElement;
  const doc = range.startContainer.ownerDocument ?? document;
  let el: Element | null = start;
  while (el && el !== doc.body && el !== doc.documentElement) {
    if (BLOCK_TAGS.has(el.tagName) || !isInlineDisplay(el)) return el;
    el = el.parentElement;
  }
  return start ?? doc.body;
}

function metaContent(doc: Document, selector: string): string {
  return normalizeText(doc.querySelector<HTMLMetaElement>(selector)?.content ?? "");
}

function visibleCandidates(root: Element): Element[] {
  return [...root.querySelectorAll(CANDIDATE_SELECTOR)].filter((el) => !el.closest(CHROME_SELECTOR));
}

export interface ExtractedPage {
  context: PageContext;
  /** Element whose background decides light/dark theme. */
  anchor: Element;
}

/**
 * Gathers a bounded amount of text around the selection: its paragraph, a
 * couple of neighbouring passages, the section heading and page metadata.
 * It never sends the whole page.
 */
export function extractPageContext(range: Range, selectionText: string, doc: Document = document): ExtractedPage {
  const selection = truncate(normalizeText(selectionText), LIMITS.selection);
  const block = findBlock(range);

  const blockText = textOf(block);
  const pre = doc.createRange();
  pre.selectNodeContents(block);
  try {
    pre.setEnd(range.startContainer, range.startOffset);
  } catch {
    /* start is outside the block; fall back to offset 0 */
  }
  const offset = normalizeText(pre.toString()).length;
  const paragraph = windowAround(blockText, offset, selection.length, LIMITS.paragraph);

  const root = block.closest("article, main, [role='main']") ?? doc.body;
  const candidates = visibleCandidates(root);
  const before: Element[] = [];
  const after: Element[] = [];
  for (const c of candidates) {
    if (c === block) continue;
    const pos = block.compareDocumentPosition(c);
    if (pos & (Node.DOCUMENT_POSITION_CONTAINS | Node.DOCUMENT_POSITION_CONTAINED_BY)) continue;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) before.push(c);
    else if (pos & Node.DOCUMENT_POSITION_FOLLOWING) after.push(c);
  }

  const asPassage = (el: Element) => truncate(textOf(el), LIMITS.neighbor);
  const usable = (el: Element) => !HEADING_TAGS.has(el.tagName) && textOf(el).length >= MIN_NEIGHBOR_CHARS;

  const heading = HEADING_TAGS.has(block.tagName)
    ? ""
    : [...before].reverse().find((el) => HEADING_TAGS.has(el.tagName));

  const articleTitle =
    metaContent(doc, "meta[property='og:title']") || normalizeText(doc.title) || "";
  const location = doc.location;

  return {
    anchor: block,
    context: {
      selection,
      paragraph,
      before: before.filter(usable).slice(-LIMITS.neighborsBefore).map(asPassage),
      after: after.filter(usable).slice(0, LIMITS.neighborsAfter).map(asPassage),
      articleTitle: truncate(articleTitle, LIMITS.articleTitle),
      heading: heading ? truncate(textOf(heading), LIMITS.heading) : "",
      description: truncate(
        metaContent(doc, "meta[name='description']") || metaContent(doc, "meta[property='og:description']"),
        LIMITS.description,
      ),
      siteName: truncate(metaContent(doc, "meta[property='og:site_name']") || location.hostname, LIMITS.siteName),
      // Query strings and fragments are dropped: they can carry tokens.
      url: truncate(`${location.origin}${location.pathname}`, LIMITS.url),
    },
  };
}
