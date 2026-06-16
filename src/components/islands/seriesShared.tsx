// 系列相關 island 的共用 UI 小元件（封面 icon、閱讀徽章、狀態圓點、分段進度條、狀態統計）。
import { Target, Code2, Layers, BookOpen, Zap, Circle, CheckCircle2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { SeriesIconName, AccentTokens } from "@/data/series";
import { readingMeta, READING_EVENT, type ReadingStatus, type ReadingTone } from "@/lib/reading-progress";

/**
 * 回傳一個「閱讀進度版本號」：SSR 與 hydration 首次 render 為 0（視為尚未讀取 localStorage），
 * 掛載後變為 1、並於每次 nc-reading-changed / storage 事件遞增以觸發重算。
 * 以 `version > 0` 作為 seriesProgress 的 `live` 旗標，即可同時解決 hydration mismatch 與即時更新。
 */
export function useReadingVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    setVersion(1);
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(READING_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(READING_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return version;
}

const SERIES_ICONS: Record<SeriesIconName, typeof Target> = {
  target: Target,
  code: Code2,
  layers: Layers,
  bookOpen: BookOpen,
  bolt: Zap,
};

export function SeriesIcon({ name, size = 20 }: { name: SeriesIconName; size?: number }) {
  const Ic = SERIES_ICONS[name] ?? Layers;
  return <Ic size={size} />;
}

const TONE: Record<ReadingTone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--neutral-100)", fg: "var(--neutral-700)" },
  blue: { bg: "var(--blue-50)", fg: "var(--blue-700)" },
  success: { bg: "var(--success-50)", fg: "#1d6b48" },
};

export function ReadingBadge({ status }: { status: ReadingStatus }) {
  const m = readingMeta(status);
  const c = TONE[m.tone];
  const Ic = m.icon === "circleCheck" ? CheckCircle2 : m.icon === "bookOpen" ? BookOpen : Circle;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      <Ic size={12} /> {m.label}
    </span>
  );
}

/** 各章一顆 9px 狀態圓點。 */
export function StatusDot({ status }: { status: ReadingStatus }) {
  const base: CSSProperties = { width: 9, height: 9, borderRadius: "50%", flex: "none", boxSizing: "border-box" };
  const style: CSSProperties =
    status === "done"
      ? { ...base, background: "var(--success-500)" }
      : status === "reading"
        ? { ...base, background: "#fff", border: "2.5px solid var(--blue-500)" }
        : { ...base, background: "transparent", border: "1.5px solid var(--neutral-300)" };
  return <span style={style} aria-hidden="true" />;
}

/** 分段進度條：先 done 段（success 綠），緊接 reading 段（accent 0.45）。 */
export function ProgressBar({
  total,
  done,
  reading,
  accent,
  height = 8,
  duration = 500,
}: {
  total: number;
  done: number;
  reading: number;
  accent: AccentTokens;
  height?: number;
  duration?: number;
}) {
  const donePct = total ? (done / total) * 100 : 0;
  const readingPct = total ? (reading / total) * 100 : 0;
  const seg: CSSProperties = {
    height: "100%",
    transition: `width ${duration}ms cubic-bezier(0.16,1,0.3,1)`,
  };
  return (
    <div
      style={{
        display: "flex",
        height,
        borderRadius: 999,
        background: "var(--neutral-100)",
        overflow: "hidden",
      }}
    >
      <span style={{ ...seg, width: `${donePct}%`, background: "var(--success-500)" }} />
      <span style={{ ...seg, width: `${readingPct}%`, background: accent.solid, opacity: 0.45 }} />
    </div>
  );
}

const STAT_DOT: Record<"done" | "reading" | "notStarted", string> = {
  done: "var(--success-500)",
  reading: "var(--blue-500)",
  notStarted: "var(--neutral-300)",
};

/** 「N 已完成 · N 閱讀中 · N 待開始」，每段前綴對應小圓點。 */
export function ProgStat({ done, reading, notStarted }: { done: number; reading: number; notStarted: number }) {
  const items: [keyof typeof STAT_DOT, number, string][] = [
    ["done", done, "已完成"],
    ["reading", reading, "閱讀中"],
    ["notStarted", notStarted, "待開始"],
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12.5,
        color: "var(--text-muted)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {items.map(([k, n, label], i) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          {i > 0 && <span style={{ opacity: 0.4 }}>·</span>}
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: STAT_DOT[k], flex: "none" }} />
          {n} {label}
        </span>
      ))}
    </div>
  );
}

export function truncate(s: string, max = 12): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
