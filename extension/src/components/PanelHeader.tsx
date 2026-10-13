import { CloseIcon, CollapseIcon, IconButton, ThemeIcon } from "./primitives";

export function PanelHeader({
  label,
  reference,
  onClose,
  onToggleTheme,
  onCollapse,
}: {
  label: string;
  reference: string;
  onClose: () => void;
  onToggleTheme: () => void;
  onCollapse?: () => void;
}) {
  return (
    <header className="relative flex items-center justify-between gap-3 pl-5 pr-3 h-10 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="block w-1.5 h-1.5 bg-cobalt shrink-0" aria-hidden="true" />
        <span className="ctx-label !text-ink truncate">
          {label} / <span className="text-ink-2">{reference}</span>
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton label="Switch light / dark" onClick={onToggleTheme}>
          <ThemeIcon />
        </IconButton>
        {onCollapse && (
          <IconButton label="Back to the short card" onClick={onCollapse}>
            <CollapseIcon />
          </IconButton>
        )}
        <IconButton label="Close (Esc)" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
    </header>
  );
}
