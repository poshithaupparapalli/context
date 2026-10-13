/** The small mark that appears beside a selection. */
export function Trigger({ onActivate }: { onActivate: () => void }) {
  return (
    <button
      type="button"
      aria-label="Explain with Context"
      title="Explain with Context"
      // Keep the page's text selection alive when the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onActivate}
      className="group relative flex items-center justify-center w-7 h-7 bg-paper border border-ink/85 rounded-sm
                 text-ink shadow-[2px_2px_0_rgb(var(--ink)/0.12)] animate-fade
                 hover:bg-cobalt hover:text-paper hover:border-cobalt transition-colors duration-150"
    >
      <span className="font-serif italic text-[19px] leading-none -mt-px select-none">c</span>
      <span className="absolute top-[3px] right-[3px] w-1 h-1 rounded-full bg-cobalt group-hover:bg-paper" />
    </button>
  );
}
