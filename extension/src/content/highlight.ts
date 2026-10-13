import type { ResolvedTheme } from "../utils/color";

const NAME = "context-selection";

const RULES: Record<ResolvedTheme, string> = {
  light: `::highlight(${NAME}) { background-color: rgba(168, 196, 218, 0.62); }`,
  dark: `::highlight(${NAME}) { background-color: rgba(38, 56, 217, 0.5); color: #fff; }`,
};

let sheet: CSSStyleSheet | null = null;

function ensureSheet(): CSSStyleSheet | null {
  if (sheet) return sheet;
  try {
    sheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return sheet;
  } catch {
    sheet = null;
    return null;
  }
}

/**
 * Keeps the selected words visibly marked while the card is open, even though
 * clicking inside the card clears the browser's own selection. Uses the CSS
 * Custom Highlight API, so the page's DOM is never touched.
 */
export function showSelectionHighlight(range: Range, theme: ResolvedTheme): void {
  if (typeof CSS === "undefined" || !("highlights" in CSS) || typeof Highlight === "undefined") return;
  const s = ensureSheet();
  if (!s) return;
  s.replaceSync(RULES[theme]);
  CSS.highlights.set(NAME, new Highlight(range));
}

export function clearSelectionHighlight(): void {
  if (typeof CSS !== "undefined" && "highlights" in CSS) CSS.highlights.delete(NAME);
}
