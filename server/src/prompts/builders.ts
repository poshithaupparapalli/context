import type { ChatMessage, PageContext } from "@context/shared";
import type { LLMMessage } from "../services/llm/types.js";

const TAGS = [
  "page_context",
  "selected_text",
  "article_title",
  "site",
  "url",
  "section_heading",
  "description",
  "passages_before",
  "paragraph_with_selection",
  "passages_after",
  "reader_question",
  "earlier_card",
  "earlier_overview",
];
const TAG_PATTERN = new RegExp(`<\\s*(/?)\\s*(${TAGS.join("|")})\\b`, "gi");

/** Stops page text from forging our delimiters. Everything else is left readable. */
export function neutralizeTags(text: string): string {
  return text.replace(TAG_PATTERN, (_m, slash: string, name: string) => `‹${slash}${name}`);
}

/** Wraps the first occurrence of the selection inside the paragraph with ⟦ ⟧. */
export function markSelection(paragraph: string, selection: string): string {
  if (!paragraph || !selection) return paragraph;
  const idx = paragraph.indexOf(selection);
  if (idx === -1) return paragraph;
  return `${paragraph.slice(0, idx)}⟦${selection}⟧${paragraph.slice(idx + selection.length)}`;
}

function tag(name: string, value: string): string {
  const v = neutralizeTags(value.trim());
  return v ? `<${name}>\n${v}\n</${name}>` : "";
}

export function buildPageContextBlock(ctx: PageContext): string {
  const paragraph = markSelection(ctx.paragraph, ctx.selection) || ctx.selection;
  const parts = [
    tag("article_title", ctx.articleTitle),
    tag("site", ctx.siteName),
    tag("url", ctx.url),
    tag("section_heading", ctx.heading),
    tag("description", ctx.description),
    tag("passages_before", ctx.before.join("\n\n")),
    tag("paragraph_with_selection", paragraph),
    tag("passages_after", ctx.after.join("\n\n")),
    tag("selected_text", ctx.selection),
  ].filter(Boolean);
  return `<page_context>\n${parts.join("\n")}\n</page_context>`;
}

export function buildExplainMessages(ctx: PageContext): LLMMessage[] {
  return [
    {
      role: "user",
      content: `${buildPageContextBlock(ctx)}\n\nWrite the card for the selected text.`,
    },
  ];
}

interface CardSummary {
  title: string;
  whatItIs: string;
  inThisPassage: string;
}

function buildCardBlock(card: CardSummary): string {
  return `<earlier_card>\nTitle: ${neutralizeTags(card.title)}\nWhat it is: ${neutralizeTags(card.whatItIs)}\nIn this passage: ${neutralizeTags(card.inThisPassage)}\n</earlier_card>`;
}

export function buildDeepenMessages(ctx: PageContext, card: CardSummary): LLMMessage[] {
  return [
    {
      role: "user",
      content: `${buildPageContextBlock(ctx)}\n\n${buildCardBlock(card)}\n\nWrite the deeper exploration of the selected text.`,
    },
  ];
}

/**
 * Follow-ups are stateless on the server: the extension sends the running
 * history. The page context rides along with the first reader turn only.
 * Roles are normalised so providers that require strict alternation accept them.
 */
export function buildFollowUpMessages(
  ctx: PageContext,
  card: CardSummary,
  overview: string,
  history: ChatMessage[],
  question: string,
): LLMMessage[] {
  const turns = normalizeHistory(history);
  const preamble = [
    buildPageContextBlock(ctx),
    buildCardBlock(card),
    overview.trim() ? tag("earlier_overview", overview) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const wrapQuestion = (q: string) => `<reader_question>\n${neutralizeTags(q.trim())}\n</reader_question>`;

  const out: LLMMessage[] = [];
  const first = turns[0];
  if (first && first.role === "user") {
    out.push({ role: "user", content: `${preamble}\n\n${wrapQuestion(first.content)}` });
    for (const turn of turns.slice(1)) {
      out.push(
        turn.role === "user" ? { role: "user", content: wrapQuestion(turn.content) } : turn,
      );
    }
    out.push({ role: "user", content: wrapQuestion(question) });
  } else {
    out.push({ role: "user", content: `${preamble}\n\n${wrapQuestion(question)}` });
  }
  return mergeConsecutive(out);
}

/** Drops leading assistant turns and collapses repeats so roles alternate. */
export function normalizeHistory(history: ChatMessage[]): ChatMessage[] {
  const trimmed = [...history];
  while (trimmed[0] && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}

function mergeConsecutive(messages: LLMMessage[]): LLMMessage[] {
  const merged: LLMMessage[] = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }
  return merged;
}
