import type { ApiError } from "@context/shared";
import type { ReactNode } from "react";

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <path d="M0 5h12M8.5 1.2 12.6 5 8.5 8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function ArrowUpRight() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true" className="inline-block ml-0.5 -translate-y-px">
      <path d="M1 8 8 1M2.5 1H8v5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="m1 1 9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function CollapseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1 11 5 7M5 10.5V7H1.5M11 1 7 5M7 1.5V5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}

export function ThemeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 1.4a4.6 4.6 0 0 1 0 9.2z" fill="currentColor" />
    </svg>
  );
}

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="ctx-icon-btn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

/** A cobalt hairline that sweeps across the top edge while something loads. */
export function SweepLine() {
  return (
    <div className="absolute left-0 right-0 top-0 h-0.5 overflow-hidden z-10" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 bg-cobalt animate-sweep" />
    </div>
  );
}

export function SkeletonLines({ widths = ["100%", "92%", "64%"] }: { widths?: string[] }) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      {widths.map((w, i) => (
        <div key={i} className="h-2.5 bg-ink/10 rounded-sm" style={{ width: w }} />
      ))}
    </div>
  );
}

export function SectionHeading({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 pb-2 mb-3 border-b border-line">
      {index && <span className="ctx-label-accent">{index}</span>}
      {index && <span className="ctx-label">/</span>}
      <h3 className="ctx-label m-0 !text-ink">{children}</h3>
    </div>
  );
}

const TITLES: Partial<Record<ApiError["code"], string>> = {
  not_configured: "Setup needed",
  network: "No connection",
  timeout: "Too slow",
  rate_limited: "Slow down",
  bad_output: "Unreadable answer",
};

export function Notice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="border border-line bg-paper-2 px-3.5 py-3" role="alert">
      <div className="ctx-label-accent mb-1.5">{TITLES[error.code] ?? "Something went wrong"}</div>
      <p className="m-0 text-sm text-ink">{error.message}</p>
      {error.code === "network" && (
        <p className="m-0 mt-2 ctx-label normal-case !tracking-normal">
          Start it with <code className="font-mono text-ink">npm run dev:server</code>
        </p>
      )}
      {onRetry && (
        <button type="button" className="ctx-btn-text mt-3" onClick={onRetry}>
          <span className="ctx-btn-label">Try again</span>
        </button>
      )}
    </div>
  );
}
