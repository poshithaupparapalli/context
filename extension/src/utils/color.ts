export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseCssColor(value: string): Rgba | null {
  const m = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/i);
  if (!m) return null;
  const alphaRaw = m[4];
  let a = 1;
  if (alphaRaw !== undefined) a = alphaRaw.endsWith("%") ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance({ r, g, b }: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export type ResolvedTheme = "light" | "dark";

/**
 * Looks at the page behind the selection. A dark page gets the dark card, a
 * light page the light one. Falls back to the OS preference when the page's
 * background can't be determined (e.g. images or gradients).
 */
export function detectPageTheme(from: Element | null, doc: Document = document): ResolvedTheme {
  const win = doc.defaultView;
  const systemDark = Boolean(win?.matchMedia?.("(prefers-color-scheme: dark)").matches);
  if (!win) return "light";

  let el: Element | null = from;
  while (el) {
    const style = win.getComputedStyle(el);
    const color = parseCssColor(style.backgroundColor);
    if (color && color.a > 0.6) return luminance(color) < 0.35 ? "dark" : "light";
    if (style.backgroundImage && style.backgroundImage !== "none") return systemDark ? "dark" : "light";
    el = el.parentElement;
  }
  const scheme = win.getComputedStyle(doc.documentElement).colorScheme;
  if (scheme.includes("dark") && !scheme.includes("light")) return "dark";
  return systemDark && scheme.includes("dark") ? "dark" : "light";
}
