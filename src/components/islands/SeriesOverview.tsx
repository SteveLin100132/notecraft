import { useMemo, useState } from "react";
import { Search, X, Filter, ChevronDown, Check, Play, RotateCcw, FileText } from "lucide-react";
import { ACCENT, type SeriesAccent, type SeriesIconName } from "@/data/series";
import { seriesProgress } from "@/lib/reading-progress";
import { SeriesIcon, StatusDot, ProgressBar, ProgStat, truncate, useReadingVersion } from "./seriesShared";

export type SeriesChapterLite = { slug: string; title: string; tags: string[] };
export type SeriesCardData = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: SeriesAccent;
  icon: SeriesIconName;
  chapters: SeriesChapterLite[];
};

type SortKey = "progress" | "chapters" | "name";
type FilterKey = "all" | "active" | "done" | "notStarted";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "progress", label: "進度" },
  { key: "chapters", label: "章節數" },
  { key: "name", label: "名稱" },
];
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "進行中" },
  { key: "done", label: "已完成" },
  { key: "notStarted", label: "未開始" },
];

export default function SeriesOverview({ series }: { series: SeriesCardData[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("progress");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortOpen, setSortOpen] = useState(false);
  // 進度即時：SSR 與 hydration 首次 render 視為空進度（version 0），掛載後依 localStorage 修正
  const version = useReadingVersion();

  const rows = useMemo(() => {
    return series.map((s) => ({ s, prog: seriesProgress(s.chapters.map((c) => c.slug), version > 0) }));
  }, [series, version]);

  const view = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter(({ s }) => {
      if (!ql) return true;
      const hay = [
        s.title,
        s.eyebrow,
        s.description,
        ...s.chapters.map((c) => c.title),
        ...s.chapters.flatMap((c) => c.tags),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(ql);
    });
    list = list.filter(({ prog }) => {
      if (filter === "done") return prog.completed;
      if (filter === "active") return prog.started && !prog.completed;
      if (filter === "notStarted") return !prog.started;
      return true;
    });
    const sorted = [...list].sort((a, b) => {
      if (sort === "chapters") return b.prog.total - a.prog.total;
      if (sort === "name") return a.s.title.localeCompare(b.s.title, "zh-Hant");
      return b.prog.pct - a.prog.pct;
    });
    return sorted;
  }, [rows, q, filter, sort]);

  return (
    <div>
      {/* 搜尋列 + 排序 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 240,
            height: 46,
            padding: "0 16px",
            background: "#fff",
            border: "1.5px solid var(--neutral-200)",
            borderRadius: 999,
          }}
        >
          <span style={{ color: "var(--text-muted)", display: "flex" }}>
            <Search size={18} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋系列，或系列內的筆記、標籤…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 14.5,
              color: "var(--text-strong)",
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="清除搜尋"
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 46,
              padding: "0 16px",
              border: "1.5px solid var(--neutral-200)",
              borderRadius: 999,
              background: "#fff",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--text-body)",
              whiteSpace: "nowrap",
            }}
          >
            <Filter size={16} />
            排序：{SORTS.find((x) => x.key === sort)!.label}
            <ChevronDown size={16} />
          </button>
          {sortOpen && (
            <>
              <div onClick={() => setSortOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
              <div
                style={{
                  position: "absolute",
                  top: 52,
                  right: 0,
                  zIndex: 11,
                  minWidth: 160,
                  background: "#fff",
                  border: "1px solid var(--neutral-200)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-md)",
                  padding: 6,
                }}
              >
                {SORTS.map((o) => {
                  const on = o.key === sort;
                  return (
                    <button
                      key={o.key}
                      onClick={() => {
                        setSort(o.key);
                        setSortOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "9px 12px",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        background: on ? "var(--blue-50)" : "transparent",
                        color: on ? "var(--blue-700)" : "var(--text-body)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13.5,
                        fontWeight: on ? 700 : 600,
                        textAlign: "left",
                      }}
                    >
                      {o.label}
                      {on && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 篩選 pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "7px 15px",
                borderRadius: 999,
                border: `1.5px solid ${on ? "var(--blue-500)" : "var(--neutral-200)"}`,
                background: on ? "var(--blue-50)" : "#fff",
                color: on ? "var(--blue-700)" : "var(--text-body)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 140ms",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 系列卡網格 */}
      {view.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0", color: "var(--text-muted)" }}>
          <div style={{ display: "inline-flex", color: "var(--neutral-300)", marginBottom: 12 }}>
            <Search size={40} />
          </div>
          <p style={{ margin: 0, fontSize: 15 }}>找不到符合的系列</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {view.map(({ s, prog }) => (
            <SeriesCard key={s.id} s={s} prog={prog} />
          ))}
        </div>
      )}
    </div>
  );
}

function SeriesCard({ s, prog }: { s: SeriesCardData; prog: ReturnType<typeof seriesProgress> }) {
  const accent = ACCENT[s.accent];
  const nextTitle = prog.nextSlug ? s.chapters.find((c) => c.slug === prog.nextSlug)?.title ?? "" : "";
  const cta = prog.completed
    ? { label: "重新閱讀", Icon: RotateCcw }
    : prog.started
      ? { label: "繼續閱讀", Icon: Play }
      : { label: "開始閱讀", Icon: Play };

  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (prog.nextSlug) window.location.href = `/notes/${prog.nextSlug}`;
  };

  return (
    <a
      href={`/series/${s.id}`}
      className="nc-card-link"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        border: "1px solid var(--neutral-200)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-xs)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
      }}
    >
      {/* 封面 */}
      <div style={{ position: "relative", height: 132, background: accent.gradient, padding: 18, overflow: "hidden" }}>
        <span
          style={{
            position: "absolute",
            top: -30,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 28,
            right: 40,
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
          }}
        />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 46,
              height: 46,
              borderRadius: "var(--radius-lg)",
              background: "rgba(255,255,255,0.18)",
              color: "#fff",
            }}
          >
            <SeriesIcon name={s.icon} size={24} />
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <FileText size={12} /> {prog.total} 篇
          </span>
        </div>
        <div style={{ position: "absolute", left: 18, bottom: 14, right: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", color: "rgba(255,255,255,0.78)", fontWeight: 700, textTransform: "uppercase" }}>
            {s.eyebrow}
          </div>
          <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.title}
          </div>
        </div>
      </div>

      {/* 內文 */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.65,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {s.description}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {prog.statuses.map((st, i) => (
            <StatusDot key={i} status={st} />
          ))}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <ProgStat done={prog.done} reading={prog.reading} notStarted={prog.notStarted} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 900,
                fontSize: 14,
                color: prog.completed ? "var(--success-500)" : accent.deep,
              }}
            >
              {prog.pct}%
            </span>
          </div>
          <ProgressBar total={prog.total} done={prog.done} reading={prog.reading} accent={accent} />
        </div>

        <button
          onClick={go}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            height: 36,
            padding: "0 16px",
            borderRadius: 999,
            border: prog.completed ? "1.5px solid var(--neutral-200)" : "none",
            background: prog.completed ? "#fff" : "var(--action-secondary)",
            color: prog.completed ? "var(--text-body)" : "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <cta.Icon size={15} />
          {cta.label}
          {nextTitle ? `：${truncate(nextTitle)}` : ""}
        </button>
      </div>
    </a>
  );
}
