import type { ApiError } from "@context/shared";
import { Notice, SkeletonLines, SweepLine } from "./primitives";
import { Rich } from "./RichText";

export interface Turn {
  id: number;
  question: string;
  status: "loading" | "ready" | "error";
  answer?: string;
  error?: ApiError;
}

export function Thread({ turns, onRetry }: { turns: Turn[]; onRetry: (id: number) => void }) {
  if (turns.length === 0) return null;
  return (
    <div className="mt-8">
      {turns.map((turn, i) => (
        <article key={turn.id} data-turn={turn.id} className="relative pt-5 pb-5 border-t border-line animate-rise">
          <div className="flex gap-3">
            <span className="ctx-label-accent pt-1.5 shrink-0">Q.{String(i + 1).padStart(2, "0")}</span>
            <p className="m-0 font-serif italic text-xl text-ink">{turn.question}</p>
          </div>
          <div className="mt-3 pl-[38px]">
            {turn.status === "loading" && (
              <div className="relative pt-3">
                <SweepLine />
                <div className="ctx-label mb-3">Thinking</div>
                <SkeletonLines widths={["96%", "82%", "48%"]} />
              </div>
            )}
            {turn.status === "ready" && turn.answer && <Rich text={turn.answer} />}
            {turn.status === "error" && turn.error && (
              <Notice error={turn.error} onRetry={() => onRetry(turn.id)} />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
