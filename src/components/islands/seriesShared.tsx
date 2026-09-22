// 系列相關 island 的共用 UI 小元件（封面 icon、閱讀徽章、狀態圓點、分段進度條、狀態統計）。
import { Target, Code2, Layers, BookOpen, Zap } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { SeriesIconName, AccentTokens } from "@/data/series";
import { READING_EVENT } from "@/lib/reading-progress";

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

/** 「N 已完成 · N 閱讀中 · N 未開始」，每段前綴對應小圓點。 */
