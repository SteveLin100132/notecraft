import { BookOpen, ArrowRight, Play } from "lucide-react";
import { ACCENT, type SeriesAccent } from "@/data/series";
import { seriesProgress } from "@/lib/reading-progress";
import { ProgressBar, truncate, useReadingVersion } from "./seriesShared";

export type ContinueSeries = {
  id: string;
  title: string;
  accent: SeriesAccent;
  chapters: { slug: string; title: string }[];
};

export default function ContinueReading({ series }: { series: ContinueSeries[] }) {
  const version = useReadingVersion();

  if (series.length === 0) return null;

  const rows = series.map((s) => ({ s, prog: seriesProgress(s.chapters.map((c) => c.slug), version > 0) }));
  const active = rows
    .filter(({ prog }) => prog.started && !prog.completed)
    .sort((a, b) => b.prog.pct - a.prog.pct)
    .slice(0, 2);
  // 無進行中系列 → 顯示尚未開始的系列（標題改「開始一個系列」）
  const notStarted = rows.filter(({ prog }) => !prog.started).slice(0, 2);
  const showStartMode = active.length === 0;
  const list = showStartMode ? notStarted : active;

  if (list.length === 0) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--neutral-200)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-xs)",
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", color: "var(--blue-600)" }}>
            <BookOpen size={18} />
          </span>
          <h2 style={{ fontSize: 16, color: "var(--text-strong)", margin: 0 }}>
            {showStartMode ? "開始一個系列" : "繼續閱讀"}
          </h2>
        </div>
        <a href="/series" style={{ color: "var(--blue-600)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          全部
        </a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {list.map(({ s, prog }) => {
          const accent = ACCENT[s.accent];
          const nextTitle = prog.nextSlug ? s.chapters.find((c) => c.slug === prog.nextSlug)?.title ?? "" : "";
          return (
            <div key={s.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                <a
                  href={`/series/${s.id}`}
                  style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {s.title}
                </a>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 900, color: accent.deep, flex: "none" }}>
                  {prog.pct}%
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <ProgressBar total={prog.total} done={prog.done} reading={prog.reading} accent={accent} height={6} />
              </div>
              <a
                href={prog.nextSlug ? `/notes/${prog.nextSlug}` : `/series/${s.id}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--blue-600)", textDecoration: "none" }}
              >
                <Play size={12} />
                {showStartMode ? "開始" : "繼續"}
                {nextTitle ? `：${truncate(nextTitle, 16)}` : ""}
                <ArrowRight size={13} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
