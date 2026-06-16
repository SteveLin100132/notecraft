import { Layers, Play, RotateCcw, Check, Sparkles, ChevronRight } from "lucide-react";
import { ACCENT, type SeriesAccent, type SeriesIconName } from "@/data/series";
import { seriesProgress, resetSeriesProgress, type ReadingStatus } from "@/lib/reading-progress";
import { SeriesIcon, ReadingBadge, ProgressBar, ProgStat, truncate, useReadingVersion } from "./seriesShared";

export type DetailChapter = {
  slug: string;
  title: string;
  description: string;
  markersTotal: number;
  markersGenerated: number;
};
export type SeriesDetailData = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  chapters: DetailChapter[];
};

function toast(msg: string, icon = "check") {
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon } }));
}

export default function SeriesDetail({ series }: { series: SeriesDetailData }) {
  const accent = ACCENT[series.accent];
  const slugs = series.chapters.map((c) => c.slug);
  const version = useReadingVersion();
  const prog = seriesProgress(slugs, version > 0);
  const nextTitle = prog.nextSlug ? series.chapters.find((c) => c.slug === prog.nextSlug)?.title ?? "" : "";
  const cta = prog.completed
    ? { label: "重新閱讀", Icon: RotateCcw }
    : prog.started
      ? { label: "繼續閱讀", Icon: Play }
      : { label: "開始閱讀", Icon: Play };

  const openNext = () => {
    if (prog.nextSlug) window.location.href = `/notes/${prog.nextSlug}`;
  };
  const reset = () => {
    if (window.confirm("確定要重設這個系列所有章節的閱讀進度嗎？")) {
      resetSeriesProgress(slugs);
      toast("已重設系列進度", "check");
    }
  };

  return (
    <div>
      {/* Hero 卡 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--neutral-200)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xs)",
          overflow: "hidden",
          marginBottom: 22,
        }}
      >
        <div style={{ position: "relative", background: accent.gradient, padding: "30px 30px 28px", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
          <div style={{ position: "relative", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                flex: "none",
              }}
            >
              <SeriesIcon name={series.icon} size={30} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: ".18em", color: "rgba(255,255,255,0.78)", fontWeight: 700, textTransform: "uppercase" }}>
                {series.eyebrow}
              </div>
              <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, color: "#fff", margin: "6px 0 0", lineHeight: 1.2 }}>
                {series.title}
              </h1>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.88)", margin: "10px 0 0", lineHeight: 1.65, maxWidth: 620 }}>
                {series.description}
              </p>
            </div>
          </div>
        </div>

        {/* 進度帶 */}
        <div style={{ padding: "20px 30px", display: "flex", flexWrap: "wrap", gap: 26, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: "none" }}>
            <span style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--font-mono)", color: prog.completed ? "var(--success-500)" : accent.deep, lineHeight: 1 }}>
              {prog.pct}%
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>已完成</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ marginBottom: 8 }}>
              <ProgStat done={prog.done} reading={prog.reading} notStarted={prog.notStarted} />
            </div>
            <ProgressBar total={prog.total} done={prog.done} reading={prog.reading} accent={accent} height={10} />
          </div>
          <div style={{ display: "flex", gap: 10, flex: "none", flexWrap: "wrap" }}>
            <button
              onClick={openNext}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 38,
                padding: "0 18px",
                borderRadius: 999,
                border: prog.completed ? "1.5px solid var(--neutral-200)" : "none",
                background: prog.completed ? "#fff" : "var(--action-secondary)",
                color: prog.completed ? "var(--text-body)" : "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <cta.Icon size={16} /> {cta.label}
              {nextTitle ? `：${truncate(nextTitle)}` : ""}
            </button>
            {prog.started && (
              <button
                onClick={reset}
                className="nc-btn-reset"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  color: "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <RotateCcw size={15} /> 重設進度
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 章節區 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 14px", color: "var(--text-strong)" }}>
        <Layers size={18} />
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>章節</h2>
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>共 {prog.total} 章</span>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid var(--neutral-200)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xs)",
          overflow: "hidden",
        }}
      >
        {series.chapters.map((c, i) => (
          <ChapterRow key={c.slug} chapter={c} index={i} status={prog.statuses[i] ?? "not-started"} accent={series.accent} />
        ))}
      </div>
    </div>
  );
}

function ChapterRow({
  chapter,
  index,
  status,
  accent,
}: {
  chapter: DetailChapter;
  index: number;
  status: ReadingStatus;
  accent: SeriesAccent;
}) {
  const a = ACCENT[accent];
  const done = status === "done";
  return (
    <a
      href={`/notes/${chapter.slug}`}
      className="nc-chapter-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        borderTop: index === 0 ? "none" : "1px solid var(--neutral-100)",
        textDecoration: "none",
        color: "inherit",
        transition: "background 140ms",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: "var(--radius-md)",
          flex: "none",
          fontFamily: "var(--font-mono)",
          fontWeight: 800,
          fontSize: 13,
          background: done ? "var(--success-50)" : a.soft,
          color: done ? "#1d6b48" : a.deep,
        }}
      >
        {done ? <Check size={17} /> : String(index + 1).padStart(2, "0")}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.4 }}>{chapter.title}</div>
        {chapter.description && (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {chapter.description}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        {chapter.markersTotal > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
            <Sparkles size={13} /> {chapter.markersGenerated}/{chapter.markersTotal}
          </span>
        )}
        <ReadingBadge status={status} />
        <span style={{ color: "var(--neutral-300)", display: "flex" }}>
          <ChevronRight size={18} />
        </span>
      </div>
    </a>
  );
}
