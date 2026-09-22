// /notes 的整個主區：頁首 Tab、Toolbar、四種 view、Drawer 是**同一份 state**，所以做成同一個 island
//（規格 §4.3）。頁面以 <WorkbenchLayout bare> 掛它；#nc-scroll.wb-body 由這裡輸出。
//
// 首次 render 必須與 SSR 一致：SSR 看不到 query、也沒有 localStorage，畫的是「全部筆記 · List · 依資料夾」。
// 真正的篩選、偏好、收藏都在 effect 裡才套用；layout 的 pre-paint script 會先把主區藏起來避免閃一下。
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Filter, Folder, Layers, Search, Tag } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import type { SeriesAccent } from "@/data/series";
import type { WbNoteRow } from "@/lib/wb-types";
import { markerCounts } from "@/lib/wb-types";
import { applyFilters, EMPTY_QUERY, groupRows, parseQuery, toSearch, type WbQuery } from "@/lib/wb-filter";
import { DEFAULT_PREFS, GROUP_LABEL, readPrefs, VIEW_LABEL, WB_GROUPS, WB_VIEWS, writePrefs, type WbGroupBy, type WbView } from "@/lib/wb-prefs";
import { FAVORITES_EVENT, getFavorites } from "@/lib/favorites";
import { md } from "@/lib/wb-time";
import WbHeader, { type WbHeaderPill } from "./WbHeader";
import NoteRow from "./NoteRow";
import { Chip, GroupHeader, SearchBox, Seg } from "./ui";

export type NotesSeriesInfo = { id: string; title: string; accent: SeriesAccent; dataChapters: number };

const GROUP_ICON: Record<WbGroupBy, ComponentType<LucideProps>> = {
  folder: Folder,
  series: Layers,
  tag: Tag,
  month: CalendarDays,
};

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export default function NotesWorkbench({
  rows = [],
  series = [],
  isDev = false,
}: {
  rows?: WbNoteRow[];
  series?: NotesSeriesInfo[];
  /** Drawer 頂列要用（Task 63） */
  workspaceLabel?: string;
  isDev?: boolean;
}) {
  const [query, setQuery] = useState<WbQuery>(EMPTY_QUERY);
  const [groupBy, setGroupBy] = useState<WbGroupBy>(DEFAULT_PREFS.groupBy);
  const [defaultView, setDefaultView] = useState<WbView>(DEFAULT_PREFS.defaultView);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());
  const [text, setText] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const narrow = useNarrow();

  // hydrate 之後才讀網址、偏好與收藏
  useEffect(() => {
    setQuery(parseQuery(window.location.search));
    const prefs = readPrefs();
    setGroupBy(prefs.groupBy);
    setDefaultView(prefs.defaultView);
    const syncFav = () => setFavorites(new Set(getFavorites()));
    syncFav();
    window.addEventListener(FAVORITES_EVENT, syncFav);
    window.addEventListener("storage", syncFav);
    document.documentElement.removeAttribute("data-wb-filtering");
    return () => {
      window.removeEventListener(FAVORITES_EVENT, syncFav);
      window.removeEventListener("storage", syncFav);
    };
  }, []);

  // Q3：island 內切 Tab、切 chip 用 replaceState —— 不堆疊歷史，上一頁會直接離開列表
  const patch = useCallback((p: Partial<WbQuery>) => {
    setQuery((cur) => {
      const next = { ...cur, ...p };
      window.history.replaceState(null, "", window.location.pathname + toSearch(next));
      // Rail 的 AI 佇列高亮跟著 ?pending=1 走（靜態殼只在載入時判斷一次）
      document.querySelector('[data-rail="ai"]')?.classList.toggle("on", next.pending);
      return next;
    });
  }, []);

  const view: WbView = narrow ? "list" : (query.view ?? defaultView);

  const filtered = useMemo(() => applyFilters(rows, query, { favorites, text }), [rows, query, favorites, text]);
  const groups = useMemo(() => groupRows(filtered, groupBy, query.folder), [filtered, groupBy, query.folder]);

  // chip 上的數字是全站的量，不隨目前篩選變動
  const totals = useMemo(() => {
    let pending = 0;
    let nofm = 0;
    let fav = 0;
    for (const r of rows) {
      pending += markerCounts(r.markers).pending;
      if (!r.hasFrontmatter) nofm += 1;
      if (favorites.has(r.slug)) fav += 1;
    }
    return { pending, nofm, fav };
  }, [rows, favorites]);

  const activeSeries = query.series ? series.find((s) => s.id === query.series) : undefined;
  const scopeLabel = query.folder
    ? query.folder.split("/").pop()!
    : activeSeries
      ? activeSeries.title
      : query.series
        ? query.series
        : query.tag
          ? `#${query.tag}`
          : query.pending
            ? "AI 標記佇列"
            : "全部筆記";

  const pills: WbHeaderPill[] = [{ label: `${filtered.length} 篇`, tone: "muted" }];
  if (totals.pending > 0) pills.push({ label: `待生成 ${totals.pending}`, tone: "warn" });
  if (activeSeries && activeSeries.dataChapters > 0) pills.push({ label: "僅筆記", tone: "muted" });

  const onSelect = useCallback((slug: string) => setSel((cur) => (cur === slug ? null : slug)), []);

  return (
    <>
      <WbHeader
        title={scopeLabel}
        crumbs={[{ label: "NoteCraft", href: "/" }, { label: "筆記", href: "/notes" }, { label: scopeLabel }]}
        pills={pills}
        tabs={(narrow ? (["list"] as WbView[]) : [...WB_VIEWS]).map((v) => ({ key: v, label: VIEW_LABEL[v] }))}
        activeTab={view}
        onTab={(v) => patch({ view: v })}
        isDev={isDev}
      />
      <div className="wb-tb">
        {activeSeries && activeSeries.dataChapters > 0 ? (
          <>
            <span className="wb-tb-lbl">
              此系列另有 {activeSeries.dataChapters} 個資料檔章節　
              <a className="wb-sb-foot-a" style={{ padding: 0 }} href={`/series/${activeSeries.id}`}>
                系列總覽 →
              </a>
            </span>
            <span className="wb-tb-div" />
          </>
        ) : null}
        {view === "list" ? (
          <>
            <Seg
              label="分組"
              value={groupBy}
              options={WB_GROUPS.map((g) => ({ value: g, label: GROUP_LABEL[g] }))}
              onChange={(g) => {
                setGroupBy(g);
                setCollapsed({});
                writePrefs({ groupBy: g }); // 分組是偏好，不進網址
              }}
            />
            <span className="wb-tb-div" />
          </>
        ) : null}
        <div className="wb-tb-group" role="group" aria-label="篩選">
          <Chip icon={Filter} on={query.hasAi} onClick={() => patch({ hasAi: !query.hasAi })}>
            含 AI 標記
          </Chip>
          <Chip on={query.pending} count={totals.pending} onClick={() => patch({ pending: !query.pending })}>
            待生成{" "}
          </Chip>
          {totals.nofm > 0 || query.nofm ? (
            <Chip on={query.nofm} count={totals.nofm} onClick={() => patch({ nofm: !query.nofm })}>
              無 frontmatter{" "}
            </Chip>
          ) : null}
          {totals.fav > 0 || query.fav ? (
            <Chip on={query.fav} count={totals.fav} onClick={() => patch({ fav: !query.fav })}>
              收藏{" "}
            </Chip>
          ) : null}
        </div>
        <div className="wb-tb-right">
          <SearchBox value={text} onChange={setText} icon={Search} placeholder="搜尋標題、路徑、標籤…" />
          <span className="wb-count tnum">{filtered.length} 篇</span>
        </div>
      </div>
      <div id="nc-scroll" className={"wb-body" + (view === "list" || view === "table" ? " flush" : "")} data-wb-rows>
        {filtered.length === 0 ? (
          <div className="wb-empty">沒有符合條件的筆記。試著清掉篩選條件或搜尋字。</div>
        ) : view === "list" ? (
          groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <GroupHeader
                name={g.label}
                count={g.rows.length}
                icon={GROUP_ICON[groupBy]}
                gc={g.gc}
                collapsed={!!collapsed[g.key]}
                onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                stats={`已生成 ${g.done} ・ 待生成 ${g.pending} ・ 最後更新 ${md(g.latest)}`}
              />
              {collapsed[g.key]
                ? null
                : g.rows.map((r) => <NoteRow key={r.slug} row={r} selected={sel === r.slug} onSelect={onSelect} />)}
            </section>
          ))
        ) : (
          <div className="wb-empty">{VIEW_LABEL[view]} view 尚未實作。</div>
        )}
      </div>
    </>
  );
}
