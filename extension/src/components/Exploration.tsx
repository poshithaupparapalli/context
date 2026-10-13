import type { DeepResponse, Block, Explanation } from "@context/shared";
import { useEffect, useRef, useState } from "react";
import { excerptAround } from "../utils/text";
import { AskBox } from "./AskBox";
import { Labels, titleSize } from "./Card";
import { PanelHeader } from "./PanelHeader";
import { PassageNote } from "./PassageNote";
import { ArrowUpRight, Notice, SectionHeading, SkeletonLines, SweepLine } from "./primitives";
import { InlineText } from "./RichText";
import { Thread, type Turn } from "./Thread";
import type { Load } from "./types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      return block.basis === "interpretation" ? (
        <div className="my-3 pl-3.5 border-l border-dashed border-cobalt">
          <div className="ctx-label-accent mb-1">Interpretation</div>
          <p className="m-0 text-md text-ink">
            <InlineText text={block.text} />
          </p>
        </div>
      ) : (
        <p className="m-0 mb-3 text-md text-ink">
          <InlineText text={block.text} />
        </p>
      );
    case "formula":
      return (
        <figure className="m-0 my-3">
          <pre className="m-0 px-4 py-3 bg-paper-2 border border-line font-mono text-[13px] leading-6 text-ink whitespace-pre-wrap [overflow-wrap:anywhere]">
            {block.text}
          </pre>
          {block.caption && (
            <figcaption className="mt-1.5 text-sm italic text-ink-2">
              <InlineText text={block.caption} />
            </figcaption>
          )}
        </figure>
      );
    case "list":
      return (
        <ul className="m-0 mb-3 p-0 list-none">
          {block.items.map((item, i) => (
            <li key={i} className="relative pl-4 mb-1.5 text-md text-ink">
              <span className="absolute left-0 text-cobalt" aria-hidden="true">
                –
              </span>
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "example":
      return (
        <aside className="my-3 px-4 py-3 border border-line bg-paper-2">
          <div className="ctx-label mb-1.5">Example</div>
          <p className="m-0 text-md text-ink">
            <InlineText text={block.text} />
          </p>
        </aside>
      );
  }
}

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function DeepContent({
  deep,
  title,
  onRelated,
}: {
  deep: DeepResponse;
  title: string;
  onRelated: (term: string, title: string) => void;
}) {
  let n = 1;
  const next = () => pad(n++);
  const hasReading = deep.verifiedSources.length > 0 || deep.originalWorks.length > 0;

  return (
    <div className="animate-rise">
      <section className="mt-7">
        <SectionHeading index={next()}>Overview</SectionHeading>
        <p className="m-0 text-md text-ink">
          <InlineText text={deep.overview} />
        </p>
      </section>

      {deep.sections.map((section, i) => (
        <section key={i} className="mt-7">
          <SectionHeading index={next()}>{section.heading}</SectionHeading>
          {section.blocks.map((block, j) => (
            <BlockView key={j} block={block} />
          ))}
        </section>
      ))}

      {deep.related.length > 0 && (
        <section className="mt-7">
          <SectionHeading index={next()}>Related ideas</SectionHeading>
          <ul className="m-0 p-0 list-none">
            {deep.related.slice(0, 5).map((r) => (
              <li key={r.term} className="mb-3 last:mb-0">
                <button
                  type="button"
                  className="p-0 bg-transparent border-0 text-left font-serif text-xl text-ink border-b border-dashed border-ink-2/60 hover:border-cobalt hover:text-cobalt"
                  title={`Ask how ${r.term} relates to ${title}`}
                  onClick={() => onRelated(r.term, title)}
                >
                  {r.term}
                </button>
                <p className="m-0 mt-1 text-sm text-ink-2">
                  <InlineText text={r.note} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasReading && (
        <section className="mt-7">
          <SectionHeading index={next()}>Further reading</SectionHeading>
          {deep.verifiedSources.length > 0 && (
            <ul className="m-0 p-0 list-none">
              {deep.verifiedSources.map((s) => {
                const href = safeHref(s.url);
                return (
                  <li key={s.url} className="mb-2.5">
                    {href ? (
                      <a className="ctx-link text-md" href={href} target="_blank" rel="noopener noreferrer">
                        {s.title}
                        <ArrowUpRight />
                      </a>
                    ) : (
                      <span className="text-md">{s.title}</span>
                    )}
                    <div className="ctx-label mt-0.5 normal-case !tracking-normal">
                      <span className="text-cobalt uppercase tracking-[0.09em]">Wikipedia · verified</span>
                      {s.description ? <span className="ml-2">{s.description}</span> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {deep.originalWorks.length > 0 && (
            <div className={deep.verifiedSources.length > 0 ? "mt-5" : ""}>
              <div className="ctx-label mb-2">Original works</div>
              <ul className="m-0 p-0 list-none">
                {deep.originalWorks.slice(0, 4).map((w) => (
                  <li key={`${w.title}-${w.author ?? ""}`} className="mb-1.5 text-md text-ink">
                    <span className="font-serif italic text-lg">{w.title}</span>
                    {(w.author || w.year) && (
                      <span className="text-ink-2">
                        {" "}
                        — {[w.author, w.year].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-2 text-sm italic text-ink-2">
                Named from memory and not linked. Check editions before citing.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function Exploration({
  reference,
  selection,
  paragraph,
  explanation,
  deep,
  turns,
  prefill,
  onClose,
  onToggleTheme,
  onCollapse,
  onRetryDeep,
  onAsk,
  onRetryTurn,
  onRelated,
}: {
  reference: string;
  selection: string;
  paragraph: string;
  explanation: Explanation;
  deep: Load<DeepResponse>;
  turns: Turn[];
  prefill: { text: string; nonce: number } | null;
  onClose: () => void;
  onToggleTheme: () => void;
  onCollapse: () => void;
  onRetryDeep: () => void;
  onAsk: (question: string) => void;
  onRetryTurn: (id: number) => void;
  onRelated: (term: string, title: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const excerpt = excerptAround(paragraph, selection);
  const busy = turns.some((t) => t.status === "loading");
  const [seenTurns, setSeenTurns] = useState(0);

  // Bring a newly asked question into view.
  useEffect(() => {
    if (turns.length <= seenTurns) return;
    setSeenTurns(turns.length);
    const last = turns[turns.length - 1];
    const el = scroller.current?.querySelector<HTMLElement>(`[data-turn="${last?.id}"]`);
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [turns, seenTurns]);

  return (
    <>
      {(deep.status === "loading" || busy) && <SweepLine />}
      <PanelHeader
        label="Context / Exploration"
        reference={reference}
        onClose={onClose}
        onToggleTheme={onToggleTheme}
        onCollapse={onCollapse}
      />
      <hr className="ctx-rule-dashed mx-6 shrink-0" />

      <div ref={scroller} className="ctx-scroll flex-1 min-h-0 overflow-y-auto px-6 pt-5 pb-7">
        <h2 className={`m-0 font-serif ${explanation.title.length > 30 ? "text-2xl" : "text-3xl"} text-ink [overflow-wrap:anywhere]`}>
          {explanation.title}
        </h2>
        <Labels labels={explanation.labels} />

        {excerpt && (
          <blockquote className="m-0 mt-5 font-serif italic text-lg text-ink-2">
            <span className="ctx-label not-italic block mb-1.5">From the passage</span>
            {excerpt.before}
            <mark className="bg-mist/60 text-ink px-0.5 [box-decoration-break:clone]">{excerpt.match}</mark>
            {excerpt.after}
          </blockquote>
        )}

        <div className="mt-6">
          <PassageNote explanation={explanation} />
        </div>

        {deep.status === "loading" && (
          <div className="mt-8" aria-busy="true" aria-live="polite">
            <div className="ctx-label mb-3">Gathering a fuller picture…</div>
            <SkeletonLines widths={["100%", "94%", "98%", "70%"]} />
            <div className="mt-7">
              <SkeletonLines widths={["34%", "100%", "88%", "92%", "52%"]} />
            </div>
          </div>
        )}
        {deep.status === "error" && (
          <div className="mt-8">
            <Notice error={deep.error} onRetry={onRetryDeep} />
          </div>
        )}
        {deep.status === "ready" && (
          <DeepContent deep={deep.data} title={explanation.title} onRelated={onRelated} />
        )}

        <Thread turns={turns} onRetry={onRetryTurn} />
      </div>

      <AskBox busy={busy} prefill={prefill} onSubmit={onAsk} />
    </>
  );
}
