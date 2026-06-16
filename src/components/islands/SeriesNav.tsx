import { ChevronLeft, ChevronRight, ArrowRight, BookOpen } from "lucide-react";
import { ACCENT, type SeriesAccent, type SeriesIconName } from "@/data/series";
import { seriesProgress } from "@/lib/reading-progress";
import { SeriesIcon, ProgressBar, useReadingVersion } from "./seriesShared";

export type SeriesNavChapter = { slug: string; title: string };
export type SeriesNavData = {
  id: string;
  title: string;
  eyebrow: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  chapters: SeriesNavChapter[];
  currentIndex: number;
};

export default function SeriesNav({ series }: { series: SeriesNavData }) {
  const accent = ACCENT[series.accent];
  const slugs = series.chapters.map((c) => c.slug);
  const version = useReadingVersion();
  const prog = seriesProgress(slugs, version > 0);
  const cur = series.currentIndex;
  const prev = cur > 0 ? series.chapters[cur - 1] : null;
  const next = cur < series.chapters.length - 1 ? series.chapters[cur + 1] : null;

  return (
    <nav aria-label="系列筆記導覽" style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--neutral-200)" }}>
      {/* 系列標頭 + 進度 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--neutral-200)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xs)",
          padding: "16px 18px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "var(--radius-md)",
              background: accent.soft,
              color: accent.deep,
              flex: "none",
            }}
          >
            <SeriesIcon name={series.icon} size={20} />
          </span>
          <a href={`/series/${series.id}`} style={{ minWidth: 0, flex: 1, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              {series.eyebrow}
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--text-strong)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {series.title}
            </div>
          </a>
          <a
            href={`/series/${series.id}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--blue-600)", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flex: "none" }}
          >
            查看系列 <ArrowRight size={14} />
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap" }}>
            第 {cur + 1} 章 · 共 {prog.total} 章
          </span>
          <span style={{ flex: 1 }}>
            <ProgressBar total={prog.total} done={prog.done} reading={prog.reading} accent={accent} duration={400} />
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: 13, color: prog.completed ? "var(--success-500)" : accent.deep, whiteSpace: "nowrap" }}>
            {prog.pct}%
          </span>
        </div>

        {/* 逐章縮覽 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {series.chapters.map((c, i) => {
            const isCurrent = i === cur;
            const st = prog.statuses[i] ?? "not-started";
            return (
              <a
                key={c.slug}
                href={`/notes/${c.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  color: "inherit",
                  background: isCurrent ? "var(--blue-50)" : "transparent",
                  border: isCurrent ? "1px solid var(--blue-200)" : "1px solid transparent",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "var(--radius-sm)",
                    flex: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 800,
                    background: st === "done" ? "var(--success-50)" : "var(--neutral-100)",
                    color: st === "done" ? "#1d6b48" : "var(--text-muted)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ minWidth: 0, flex: 1, fontSize: 13, fontWeight: isCurrent ? 700 : 600, color: isCurrent ? "var(--blue-700)" : "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.title}
                </span>
                {isCurrent && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--blue-600)", whiteSpace: "nowrap", flex: "none" }}>
                    <BookOpen size={12} /> 閱讀中的章節
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* 上一章 / 下一章 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {prev ? (
          <a href={`/notes/${prev.slug}`} className="nc-card-link" style={cardStyle()}>
            <span style={dirStyle()}>
              <ChevronLeft size={15} /> 上一章
            </span>
            <span style={titleStyle()}>{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={`/notes/${next.slug}`} className="nc-card-link" style={{ ...cardStyle(), textAlign: "right", alignItems: "flex-end" }}>
            <span style={dirStyle()}>
              下一章 <ChevronRight size={15} />
            </span>
            <span style={titleStyle()}>{next.title}</span>
          </a>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}

function cardStyle(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "16px 18px",
    background: "#fff",
    border: "1px solid var(--neutral-200)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-xs)",
    textDecoration: "none",
    color: "inherit",
    minWidth: 0,
  };
}
function dirStyle(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" };
}
function titleStyle(): React.CSSProperties {
  return { display: "block", maxWidth: "100%", fontSize: 15, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
}
