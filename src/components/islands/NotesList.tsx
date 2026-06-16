import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Search,
  X,
  Grid3x3,
  List,
  Sparkles,
  ChevronRight,
  FileText,
  ArrowUp,
  ArrowDown,
  Star,
} from "lucide-react";
import { getFavorites, toggleFavorite, FAVORITES_EVENT } from "@/lib/favorites";
import { readingStatus, READING_EVENT, type ReadingStatus } from "@/lib/reading-progress";
import { ReadingBadge } from "./seriesShared";

export type NoteCardData = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  series: string | null;
  order: number | null;
  excerpt: string;
  markersTotal: number;
  markersGenerated: number;
};

type SortField = "updatedAt" | "createdAt" | "title" | "series";
type SortDir = "asc" | "desc";

const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "updatedAt", label: "更新時間" },
  { key: "createdAt", label: "建立時間" },
  { key: "title", label: "標題" },
  { key: "series", label: "系列" },
];

type Props = {
  notes: NoteCardData[];
  tagStats: { name: string; count: number }[];
  defaultLayout?: "grid" | "list";
  initialTag?: string | null;
};

function daysAgo(s: string, today = "2026-06-12") {
  const ms = new Date(today + "T00:00:00").getTime() - new Date(s + "T00:00:00").getTime();
  const d = Math.round(ms / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 週前`;
  return `${Math.floor(d / 30)} 個月前`;
}

function compareField(a: NoteCardData, b: NoteCardData, field: "updatedAt" | "createdAt" | "title") {
  return field === "title" ? a.title.localeCompare(b.title) : a[field].localeCompare(b[field]);
}

// 系列排序：有系列者依系列名分組、組內依 order（無 order 排後），無系列者整體置底。
function compareSeries(a: NoteCardData, b: NoteCardData) {
  if (a.series !== b.series) {
    if (!a.series) return 1;
    if (!b.series) return -1;
    return a.series.localeCompare(b.series);
  }
  if (!a.series) return compareField(a, b, "createdAt") || a.title.localeCompare(b.title);
  const oa = a.order ?? Number.POSITIVE_INFINITY;
  const ob = b.order ?? Number.POSITIVE_INFINITY;
  return oa - ob || compareField(a, b, "createdAt") || a.title.localeCompare(b.title);
}

export default function NotesList({ notes, tagStats, defaultLayout = "grid", initialTag = null }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string[]>(initialTag ? [initialTag] : []);
  const [layout, setLayout] = useState<"grid" | "list">(defaultLayout);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  // 閱讀進度：SSR 視為空，hydration 後讀 localStorage、監聽變更事件即時同步
  const [reading, setReading] = useState<Record<string, ReadingStatus>>({});

  useEffect(() => {
    const sync = () => setReading(Object.fromEntries(notes.map((n) => [n.slug, readingStatus(n.slug)])));
    sync();
    window.addEventListener(READING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(READING_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [notes]);

  // 收藏狀態：SSR 視為空，hydration 後讀 localStorage；切換時透過事件即時同步
  useEffect(() => {
    const sync = () => setFavs(getFavorites());
    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const favSet = useMemo(() => new Set(favs), [favs]);

  useEffect(() => {
    const u = new URL(window.location.href);
    const tag = u.searchParams.get("tag");
    if (tag) setActive([tag]);
  }, []);

  const toggle = (tg: string) =>
    setActive((a) => (a.includes(tg) ? a.filter((x) => x !== tg) : [...a, tg]));

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (onlyFav && !favSet.has(n.slug)) return false;
        if (active.length && !active.every((t) => n.tags.includes(t))) return false;
        if (!ql) return true;
        return (
          (n.title + n.description + n.tags.join(" ") + n.excerpt).toLowerCase().includes(ql)
        );
      })
      .sort((a, b) => {
        const cmp = sortField === "series" ? compareSeries(a, b) : compareField(a, b, sortField);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [q, active, notes, sortField, sortDir, onlyFav, favSet]);

  return (
    <div>
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
            placeholder="搜尋標題、描述、標籤、內文…"
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
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--neutral-100)", borderRadius: 999 }}>
          {SORT_FIELDS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setSortField(f.key);
                setSortDir(f.key === "series" || f.key === "title" ? "asc" : "desc");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 36,
                padding: "0 14px",
                border: "none",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                background: sortField === f.key ? "#fff" : "transparent",
                color: sortField === f.key ? "var(--blue-700)" : "var(--text-muted)",
                boxShadow: sortField === f.key ? "var(--shadow-xs)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "升冪" : "降冪"}
            aria-label={sortDir === "asc" ? "升冪排序" : "降冪排序"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
              background: "#fff",
              color: "var(--blue-700)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            {sortDir === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--neutral-100)", borderRadius: 999 }}>
          {(["grid", "list"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setLayout(k)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                border: "none",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 700,
                background: layout === k ? "#fff" : "transparent",
                color: layout === k ? "var(--blue-700)" : "var(--text-muted)",
                boxShadow: layout === k ? "var(--shadow-xs)" : "none",
              }}
            >
              {k === "grid" ? <Grid3x3 size={16} /> : <List size={16} />}
              {k === "grid" ? "卡片" : "清單"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          title="只看收藏"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 46,
            padding: "0 16px",
            border: `1.5px solid ${onlyFav ? "var(--orange-400)" : "var(--neutral-200)"}`,
            borderRadius: 999,
            cursor: "pointer",
            background: onlyFav ? "var(--orange-50)" : "#fff",
            color: onlyFav ? "var(--orange-600)" : "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <Star size={16} fill={onlyFav ? "currentColor" : "none"} /> 只看收藏
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22, alignItems: "center" }}>
        {tagStats.map((t) => {
          const on = active.includes(t.name);
          return (
            <button
              key={t.name}
              onClick={() => toggle(t.name)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 13px",
                borderRadius: 999,
                border: `1.5px solid ${on ? "var(--blue-500)" : "var(--neutral-200)"}`,
                background: on ? "var(--blue-50)" : "#fff",
                color: on ? "var(--blue-700)" : "var(--text-body)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 140ms",
              }}
            >
              {t.name}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{t.count}</span>
            </button>
          );
        })}
        {active.length > 0 && (
          <button
            onClick={() => setActive([])}
            style={{
              border: "none",
              background: "none",
              color: "var(--blue-600)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginLeft: 4,
            }}
          >
            清除
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0", color: "var(--text-muted)" }}>
          <div style={{ display: "inline-flex", color: "var(--neutral-300)", marginBottom: 12 }}>
            {onlyFav ? <Star size={40} /> : <Search size={40} />}
          </div>
          <p style={{ margin: 0, fontSize: 15 }}>
            {onlyFav ? "尚無收藏，點卡片上的星號加入" : "找不到符合的筆記"}
          </p>
        </div>
      ) : layout === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {filtered.map((n) => (
            <NoteCardGrid key={n.slug} note={n} fav={favSet.has(n.slug)} onToggleFav={() => toggleFavorite(n.slug)} reading={reading[n.slug] ?? "not-started"} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((n) => (
            <NoteCardList key={n.slug} note={n} fav={favSet.has(n.slug)} onToggleFav={() => toggleFavorite(n.slug)} reading={reading[n.slug] ?? "not-started"} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarkerBadge({ n }: { n: NoteCardData }) {
  if (n.markersTotal === 0) return null;
  const allGen = n.markersGenerated === n.markersTotal;
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
        background: allGen ? "var(--success-50)" : "var(--warning-50)",
        color: allGen ? "#1d6b48" : "var(--orange-600)",
      }}
    >
      <Sparkles size={12} /> {allGen ? "已生成" : `${n.markersGenerated}/${n.markersTotal}`}
    </span>
  );
}

function TagRow({ tags }: { tags: string[] }) {
  // 卡片本身是 <a>，標籤不可再用 <a>（巢狀 <a> 不合法）。
  // 改用 role="link" 的 <span> + 點擊 / 鍵盤導頁，並擋住卡片的冒泡。
  const goTag = (tg: string) => {
    window.location.href = `/notes?tag=${encodeURIComponent(tg)}`;
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {tags.map((tg) => (
        <span
          key={tg}
          role="link"
          tabIndex={0}
          aria-label={`篩選標籤 ${tg}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goTag(tg);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              goTag(tg);
            }
          }}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--blue-700)",
            background: "var(--blue-50)",
            padding: "3px 9px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          {tg}
        </span>
      ))}
    </div>
  );
}

function FavStar({ fav, onToggle }: { fav: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={fav}
      aria-label={fav ? "取消收藏" : "收藏"}
      title={fav ? "取消收藏" : "收藏"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "none",
        borderRadius: 999,
        cursor: "pointer",
        background: "transparent",
        color: fav ? "var(--orange-500)" : "var(--neutral-300)",
        flex: "none",
      }}
    >
      <Star size={18} fill={fav ? "currentColor" : "none"} />
    </button>
  );
}

function NoteCardGrid({ note, fav, onToggleFav, reading }: { note: NoteCardData; fav: boolean; onToggleFav: () => void; reading: ReadingStatus }) {
  const allGen = note.markersTotal > 0 && note.markersGenerated === note.markersTotal;
  return (
    <a
      href={`/notes/${note.slug}`}
      className="nc-card-link"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        padding: 22,
        background: "#fff",
        border: "1px solid var(--neutral-200)",
        borderTop: allGen ? "3px solid var(--orange-400)" : "1px solid var(--neutral-200)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-xs)",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            borderRadius: 5,
            background: "var(--blue-50)",
            color: "var(--blue-700)",
          }}
        >
          <FileText size={20} />
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Clock size={14} /> {daysAgo(note.updatedAt)}
          </span>
          {reading !== "not-started" && <ReadingBadge status={reading} />}
          <MarkerBadge n={note} />
          <FavStar fav={fav} onToggle={onToggleFav} />
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 18, color: "var(--text-strong)", margin: "0 0 7px", fontWeight: 700, lineHeight: 1.35 }}>
          {note.title}
        </h3>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.7,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.excerpt || note.description}
        </p>
      </div>
      <div style={{ marginTop: "auto" }}>
        <TagRow tags={note.tags} />
      </div>
    </a>
  );
}

function NoteCardList({ note, fav, onToggleFav, reading }: { note: NoteCardData; fav: boolean; onToggleFav: () => void; reading: ReadingStatus }) {
  return (
    <a
      href={`/notes/${note.slug}`}
      className="nc-card-link"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 20px",
        background: "#fff",
        border: "1px solid var(--neutral-200)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-xs)",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: 5,
          background: "var(--blue-50)",
          color: "var(--blue-700)",
          flex: "none",
        }}
      >
        <FileText size={20} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3 style={{ fontSize: 16.5, color: "var(--text-strong)", margin: "0 0 4px", fontWeight: 700 }}>
          {note.title}
        </h3>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note.description}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
        <TagRow tags={note.tags} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--text-muted)" }}>
          <Clock size={14} /> {daysAgo(note.updatedAt)}
        </span>
        {reading !== "not-started" && <ReadingBadge status={reading} />}
        <MarkerBadge n={note} />
        <FavStar fav={fav} onToggle={onToggleFav} />
        <span style={{ color: "var(--neutral-300)", display: "flex" }}>
          <ChevronRight size={18} />
        </span>
      </div>
    </a>
  );
}
