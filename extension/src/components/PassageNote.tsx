import type { Explanation } from "@context/shared";
import { InlineText } from "./RichText";

const BASIS: Record<Explanation["passageBasis"], { label: string; hint: string }> = {
  stated: { label: "Stated in the text", hint: "The passage itself makes this connection explicit." },
  inferred: { label: "Inferred", hint: "Read from the surrounding context, not stated outright." },
  unclear: { label: "Unclear", hint: "The passage doesn't give enough to be sure." },
};

/** "In this passage": why the reference matters here, labelled by how sure we are. */
export function PassageNote({ explanation, compact = false }: { explanation: Explanation; compact?: boolean }) {
  const basis = BASIS[explanation.passageBasis];
  return (
    <section className={compact ? "" : "pl-4 border-l-2 border-cobalt"}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          {compact && <span className="block w-4 h-px bg-cobalt" aria-hidden="true" />}
          <h3 className="ctx-label-accent m-0">In this passage</h3>
        </div>
        <span className="ctx-label" title={basis.hint}>
          {basis.label}
        </span>
      </div>
      <p className="m-0 text-base text-ink">
        <InlineText text={explanation.inThisPassage} />
      </p>
    </section>
  );
}
