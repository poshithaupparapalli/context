import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "./primitives";

export function AskBox({
  busy,
  prefill,
  onSubmit,
}: {
  busy: boolean;
  /** Setting this (with a fresh nonce) drops text into the box and focuses it. */
  prefill: { text: string; nonce: number } | null;
  onSubmit: (question: string) => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setValue(prefill.text);
    const el = ref.current;
    if (el) {
      el.focus({ preventScroll: true });
      el.setSelectionRange(prefill.text.length, prefill.text.length);
    }
  }, [prefill]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [value]);

  const submit = () => {
    const q = value.trim();
    if (!q || busy) return;
    onSubmit(q);
    setValue("");
  };

  return (
    <div className="px-6 pt-3 pb-4 border-t border-ink/85 bg-paper relative">
      <label htmlFor="ctx-ask" className="ctx-label block mb-1.5">
        Ask about this
      </label>
      <div className="flex items-end gap-3 border-b border-ink/70 focus-within:border-cobalt focus-within:border-b-2 pb-1.5">
        <textarea
          id="ctx-ask"
          ref={ref}
          rows={1}
          value={value}
          maxLength={1000}
          placeholder="How is this different from…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="flex-1 resize-none bg-transparent border-0 outline-none p-0 m-0 font-sans text-base text-ink placeholder:text-ink-2/70"
          style={{ boxShadow: "none" }}
        />
        <button
          type="button"
          className="ctx-btn-text shrink-0 pb-0.5"
          disabled={busy || !value.trim()}
          onClick={submit}
        >
          <span className="ctx-btn-label">Ask</span>
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}
