import { Fragment } from "react";
import { parseBlocks, parseInline, type Inline } from "../utils/richtext";

function renderInline(nodes: Inline[]) {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "em":
        return <em key={i}>{n.v}</em>;
      case "strong":
        return <strong key={i}>{n.v}</strong>;
      case "code":
        return <code key={i}>{n.v}</code>;
      default:
        return <Fragment key={i}>{n.v}</Fragment>;
    }
  });
}

/** Inline emphasis only (single paragraph of text). */
export function InlineText({ text }: { text: string }) {
  return <>{renderInline(parseInline(text))}</>;
}

/** Paragraphs, lists and code blocks from a small markdown subset. Never emits raw HTML. */
export function Rich({ text }: { text: string }) {
  return (
    <div className="ctx-prose">
      {parseBlocks(text).map((b, i) => {
        switch (b.t) {
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre key={i}>
                <code style={{ background: "none", border: 0, padding: 0 }}>{b.text}</code>
              </pre>
            );
          default:
            return <p key={i}>{renderInline(b.inline)}</p>;
        }
      })}
    </div>
  );
}
