import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/Card";
import { Exploration } from "../components/Exploration";
import { Panel, TriggerAnchor } from "../components/Panel";
import { Trigger } from "../components/Trigger";
import { detectPageTheme, type ResolvedTheme } from "../utils/color";
import { loadFonts } from "../utils/fonts";
import {
  formatReference,
  getSettings,
  nextReferenceNumber,
  onSettingsChanged,
  updateSettings,
  type ThemeSetting,
} from "../utils/settings";
import type { Bus } from "./bus";
import { extractPageContext } from "./extract";
import { clearSelectionHighlight, showSelectionHighlight } from "./highlight";
import { scrollDeltaForPanel } from "./position";
import type { Captured } from "./selection";
import { useExploration } from "./useExploration";

type Ui =
  | { kind: "idle" }
  | { kind: "trigger"; captured: Captured }
  | { kind: "open"; captured: Captured; id: number };

export function App({ bus, host }: { bus: Bus; host: HTMLElement }) {
  const [ui, setUi] = useState<Ui>({ kind: "idle" });
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>("auto");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const sessionId = useRef(0);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    void getSettings().then((s) => setThemeSetting(s.theme));
    return onSettingsChanged((s) => setThemeSetting(s.theme));
  }, []);

  const close = useCallback(() => setUi({ kind: "idle" }), []);

  useEffect(
    () =>
      bus.subscribe((event) => {
        if (event.type === "select") {
          if (uiRef.current.kind !== "open") setUi({ kind: "trigger", captured: event.captured });
        } else if (event.type === "clear") {
          if (uiRef.current.kind === "trigger") setUi({ kind: "idle" });
        } else {
          setUi({ kind: "open", captured: event.captured, id: ++sessionId.current });
        }
      }),
    [bus],
  );

  useEffect(() => {
    if (ui.kind === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.composedPath().includes(host)) return;
      close();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [ui.kind, host, close]);

  const range = ui.kind === "idle" ? null : ui.captured.range;
  useEffect(() => {
    if (!range) return;
    const el = range.commonAncestorContainer;
    const anchorEl = el.nodeType === Node.ELEMENT_NODE ? (el as Element) : el.parentElement;
    setSystemTheme(detectPageTheme(anchorEl));
  }, [range]);

  const theme: ResolvedTheme = themeSetting === "auto" ? systemTheme : themeSetting;

  useEffect(() => {
    if (ui.kind === "trigger") void loadFonts();
  }, [ui.kind]);

  useEffect(() => {
    if (ui.kind !== "open") return;
    showSelectionHighlight(ui.captured.range, theme);
    return clearSelectionHighlight;
  }, [ui, theme]);

  const toggleTheme = useCallback(() => {
    void updateSettings({ theme: theme === "dark" ? "light" : "dark" });
  }, [theme]);

  return (
    <div className="ctx-root" data-theme={theme}>
      {ui.kind === "trigger" && (
        <TriggerAnchor range={ui.captured.range}>
          <Trigger
            onActivate={() => setUi({ kind: "open", captured: ui.captured, id: ++sessionId.current })}
          />
        </TriggerAnchor>
      )}
      {ui.kind === "open" && (
        <Session key={ui.id} captured={ui.captured} onClose={close} onToggleTheme={toggleTheme} />
      )}
    </div>
  );
}

function Session({
  captured,
  onClose,
  onToggleTheme,
}: {
  captured: Captured;
  onClose: () => void;
  onToggleTheme: () => void;
}) {
  const extracted = useMemo(() => extractPageContext(captured.range, captured.text), [captured]);
  const { context } = extracted;
  const { explain, deep, turns, retryExplain, startDeep, retryDeep, ask, retryTurn } = useExploration(context);

  const [expanded, setExpanded] = useState(false);
  const [number, setNumber] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);

  useEffect(() => {
    void loadFonts();
    let live = true;
    void nextReferenceNumber().then((n) => live && setNumber(n));
    return () => {
      live = false;
    };
  }, []);

  const reference = number === null ? "···" : formatReference(number);
  const goDeeper = () => {
    setExpanded(true);
    startDeep();
    // Make room for the reading panel below the selection instead of squeezing it.
    const rect = captured.range.getBoundingClientRect();
    const desired = Math.min(560, window.innerHeight - 24);
    const dy = scrollDeltaForPanel(rect, window.innerHeight, desired, 10, 12);
    if (dy > 0) window.scrollBy({ top: dy, behavior: "instant" });
  };

  return (
    <Panel range={captured.range} expanded={expanded && explain.status === "ready"} autoFocus>
      {expanded && explain.status === "ready" ? (
        <Exploration
          reference={reference}
          selection={context.selection}
          paragraph={context.paragraph}
          explanation={explain.data}
          deep={deep}
          turns={turns}
          prefill={prefill}
          onClose={onClose}
          onToggleTheme={onToggleTheme}
          onCollapse={() => setExpanded(false)}
          onRetryDeep={retryDeep}
          onAsk={ask}
          onRetryTurn={retryTurn}
          onRelated={(term, title) =>
            setPrefill({ text: `How does ${term} relate to ${title}?`, nonce: Date.now() })
          }
        />
      ) : (
        <Card
          reference={reference}
          selection={context.selection}
          explain={explain}
          onClose={onClose}
          onToggleTheme={onToggleTheme}
          onDeeper={goDeeper}
          onRetry={retryExplain}
        />
      )}
    </Panel>
  );
}
