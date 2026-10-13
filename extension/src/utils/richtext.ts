/**
 * A deliberately tiny markdown subset, parsed into plain data so the UI can
 * render it as React elements. Nothing here ever produces HTML, so model or
 * page text can't inject markup.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "em"; v: string }
  | { t: "strong"; v: string }
  | { t: "code"; v: string };

export type RichBlock =
  | { t: "p"; inline: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "code"; text: string };

const INLINE = /(\*\*[^*\n]+?\*\*|`[^`\n]+`|\*[^*\s][^*\n]*?\*)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push({ t: "text", v: text.slice(last, at) });
    if (token.startsWith("**")) out.push({ t: "strong", v: token.slice(2, -2) });
    else if (token.startsWith("`")) out.push({ t: "code", v: token.slice(1, -1) });
    else out.push({ t: "em", v: token.slice(1, -1) });
    last = at + token.length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

const BULLET = /^\s*[-•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseBlocks(source: string): RichBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ t: "p", inline: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ t: list.kind, items: list.items.map(parseInline) });
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        body.push(lines[i] ?? "");
        i++;
      }
      blocks.push({ t: "code", text: body.join("\n").replace(/\s+$/, "") });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBERED);
    if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? "ul" : "ol";
      if (list && list.kind !== kind) flushList();
      list ??= { kind, items: [] };
      list.items.push((bullet ?? numbered)![1] ?? "");
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}
