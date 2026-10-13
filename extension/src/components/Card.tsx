import type { Explanation } from "@context/shared";
import { truncate } from "../utils/text";
import { PanelHeader } from "./PanelHeader";
import { PassageNote } from "./PassageNote";
import { ArrowRight, Notice, SkeletonLines, SweepLine } from "./primitives";
import { InlineText } from "./RichText";
import type { Load } from "./types";

export function Labels({ labels }: { labels: string[] }) {
  return (
    <p className="ctx-label m-0 mt-2.5">
      {labels.slice(0, 3).map((l, i) => (
        <span key={`${l}-${i}`}>
          {i > 0 && <span className="mx-1.5 text-cobalt">·</span>}
          {l}
        </span>
      ))}
    </p>
  );
}

export function titleSize(title: string): string {
  return title.length > 52 ? "text-xl" : "text-2xl";
}

export function Card({
  reference,
  selection,
  explain,
  onClose,
  onToggleTheme,
  onDeeper,
  onRetry,
}: {
  reference: string;
  selection: string;
  explain: Load<Explanation>;
  onClose: () => void;
  onToggleTheme: () => void;
  onDeeper: () => void;
  onRetry: () => void;
}) {
  const ready = explain.status === "ready" ? explain.data : null;
  return (
    <>
      {explain.status === "loading" && <SweepLine />}
      <PanelHeader label="Context" reference={reference} onClose={onClose} onToggleTheme={onToggleTheme} />
      <hr className="ctx-rule-dashed mx-5 shrink-0" />

      <div className="ctx-scroll flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-5">
        {explain.status === "loading" && (
          <div aria-busy="true" aria-live="polite">
            <h2 className="m-0 font-serif italic text-2xl text-ink-2 [overflow-wrap:anywhere] line-clamp-3">
              {truncate(selection, 120)}
            </h2>
            <p className="ctx-label m-0 mt-2.5">Reading the passage…</p>
            <div className="mt-5">
              <SkeletonLines />
            </div>
          </div>
        )}

        {explain.status === "error" && (
          <div>
            <h2 className="m-0 mb-4 font-serif italic text-xl text-ink-2 [overflow-wrap:anywhere] line-clamp-2">
              {truncate(selection, 120)}
            </h2>
            <Notice error={explain.error} onRetry={onRetry} />
          </div>
        )}

        {ready && (
          <div className="animate-rise">
            <h2 className={`m-0 font-serif ${titleSize(ready.title)} text-ink [overflow-wrap:anywhere]`}>
              {ready.title}
            </h2>
            <Labels labels={ready.labels} />
            <p className="m-0 mt-4 text-base text-ink">
              <InlineText text={ready.whatItIs} />
            </p>
            {ready.identification === "uncertain" && (
              <p className="m-0 mt-2 ctx-label normal-case !tracking-normal">
                <span className="ctx-label-accent mr-1.5">Not sure</span>
                Treat this identification with caution.
              </p>
            )}
            <div className="mt-5">
              <PassageNote explanation={ready} compact />
            </div>
          </div>
        )}
      </div>

      {ready && (
        <footer className="shrink-0 flex items-center justify-between px-5 h-11 border-t border-line">
          <button type="button" className="ctx-btn-text" onClick={onDeeper}>
            <span className="ctx-btn-label">Go deeper</span>
            <ArrowRight />
          </button>
          <span className="ctx-label">Esc to close</span>
        </footer>
      )}
    </>
  );
}
