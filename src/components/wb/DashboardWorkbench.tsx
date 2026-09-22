// Dashboard（規格 §8.1）：三個 Tab 是同一份資料的三種投影，做成同一個 island。
// 時間相關的量（近 7／30 日、近 8 週）在瀏覽器以 Date.now() 算（Q10）：SSR 以「—」佔位、長條畫 0 高的軌。
// 完整的 WbNoteRow（Drawer 要用）走 useWbIndex() 延遲載入；inline 的 props 只有精簡列。
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import type { WbNoteRow, WbSeries, WbTagStat } from "@/lib/wb-types";
import { markerCounts } from "@/lib/wb-types";
import { seriesProgress, READING_EVENT } from "@/lib/reading-progress";
import { weekBuckets, withinDays, type WeekBucket } from "@/lib/wb-time";
import WbHeader from "./WbHeader";
import NoteRow, { rowHandlers } from "./NoteRow";
import NoteDrawer from "./NoteDrawer";
import { GroupHeader, Ic, MiniButton, Pill } from "./ui";
import { useWbIndex } from "./useWbIndex";

type Tab = "overview" | "week" | "ai";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "總覽" },
  { key: "week", label: "本週" },
  { key: "ai", label: "AI 佇列" },
];

function Widget({ span, title, meta, action, children }: { span: number; title: string; meta?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <section className={`wb-wg wb-span-${span}`} aria-label={title}>
      <header className="wb-wg-h">
        <span className="wb-wg-t">{title}</span>
        {action ?? (meta ? <span className="wb-wg-m">{meta}</span> : null)}
      </header>
      <div className="wb-wg-b">{children}</div>
    </section>
  );
}

/** 版本號：0 = SSR／首次 render（全部未開始、不顯示按鈕），掛載後 ≥1。 */
function useReadingVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(1);
    const bump = () => setV((x) => x + 1);
    window.addEventListener(READING_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(READING_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return v;
}

function SeriesProgressWidget({ series, live }: { series: WbSeries[]; live: boolean }) {
  const items = series
    .filter((s) => s.chapters.length > 0)
    .map((s, i) => {
      const p = seriesProgress(
        s.chapters.map((c) => c.ref),
        live,
      );
      const next = p.nextIndex >= 0 ? s.chapters[p.nextIndex] : null;
      const state: 0 | 1 | 2 = p.completed ? 2 : p.started ? 0 : 1; // 進行中 0 → 未開始 1 → 已讀完 2
      return { s, p, next, state, i };
    })
    .sort((a, b) => a.state - b.state || (a.state === 0 ? b.p.pct - a.p.pct : 0) || a.i - b.i);
  return (
    <div className="wb-series-list">
      {items.map(({ s, p, next, state }) => (
        <div key={s.id} className={`wb-series-item wb-acc-${s.accent}`}>
          <a className="wb-series" href={`/series/${s.id}`}>
            <div className="wb-series-top">
              <span className="wb-sb-swatch" aria-hidden="true" />
              <span className="wb-series-n">{s.title}</span>
              <span className="wb-series-c tnum">
                {p.done}/{p.total}
              </span>
            </div>
            <div className="wb-bar">
              <i style={{ width: p.pct + "%" }} />
            </div>
          </a>
          <div className="wb-series-foot">
            <span className="wb-series-next">
              {state === 2 ? "已全部讀完" : state === 0 ? `繼續讀：${next?.title ?? ""}` : `第一章：${next?.title ?? ""}`}
            </span>
            {live && state !== 2 && next ? <MiniButton href={next.href}>{state === 0 ? "繼續閱讀" : "開始閱讀"}</MiniButton> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardWorkbench({
  rows = [],
  series = [],
  tags = [],
  tagTotal = 0,
  workspaceLabel = "",
  isDev = false,
}: {
  /** 精簡列：沒有 description、標記沒有 prompt */
  rows?: WbNoteRow[];
  series?: WbSeries[];
  tags?: WbTagStat[];
  tagTotal?: number;
  workspaceLabel?: string;
  isDev?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [now, setNow] = useState<Date | null>(null); // null = 尚未 hydrate，相對量以「—」佔位
  const [sel, setSel] = useState<string | null>(null);
  const live = useReadingVersion() > 0;
  const { index, load } = useWbIndex();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "week" || t === "ai") setTab(t);
    setNow(new Date());
  }, []);

  const goTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", window.location.pathname + (t === "overview" ? "" : `?tab=${t}`));
  };

  const onSelect = useCallback(
    (slug: string) => {
      setSel((cur) => (cur === slug ? null : slug));
      load();
    },
    [load],
  );

  const stats = useMemo(() => {
    let done = 0;
    let pending = 0;
    const pendingRows: WbNoteRow[] = [];
    for (const r of rows) {
      const c = markerCounts(r.markers);
      done += c.done;
      pending += c.pending;
      if (c.pending > 0) pendingRows.push(r);
    }
    const total = done + pending;
    return { done, pending, total, pct: total ? Math.round((done / total) * 100) : 0, pendingRows };
  }, [rows]);

  const week = now ? rows.filter((r) => withinDays(r.updatedAt, 7, now)) : null;
  const month = now ? rows.filter((r) => withinDays(r.updatedAt, 30, now)).length : null;
  const buckets: WeekBucket[] = now
    ? weekBuckets(
        rows.map((r) => r.updatedAt),
        8,
        now,
      )
    : Array.from({ length: 8 }, () => ({ label: "", count: 0 }));
  const maxWeek = Math.max(...buckets.map((b) => b.count), 1);
  const maxTag = tags[0]?.count ?? 1;

  const selRow = sel ? (index?.notes.find((r) => r.slug === sel) ?? null) : null;
  const drawerSeries = selRow?.series ? (index?.series.find((s) => s.id === selRow.series!.id) ?? null) : null;

  return (
    <>
      <WbHeader
        title="儀表板"
        crumbs={[{ label: "NoteCraft", href: "/" }, { label: "工作區" }]}
        pills={[{ label: `${rows.length} 篇筆記`, tone: "muted" }, ...(stats.pending ? [{ label: `${stats.pending} 待生成`, tone: "warn" as const }] : [])]}
        tabs={TABS}
        activeTab={tab}
        onTab={goTab}
        isDev={isDev}
      />
      {tab === "week" ? (
        <div id="nc-scroll" className="wb-body flush" data-wb-rows>
          {week === null ? (
            <>
              <div className="wb-row wb-skel" aria-hidden="true" />
              <div className="wb-row wb-skel" aria-hidden="true" />
              <div className="wb-row wb-skel" aria-hidden="true" />
            </>
          ) : week.length === 0 ? (
            <div className="wb-empty">近 7 日沒有更新的筆記</div>
          ) : (
            week.map((r) => <NoteRow key={r.slug} row={r} selected={sel === r.slug} onSelect={onSelect} />)
          )}
        </div>
      ) : tab === "ai" ? (
        <div id="nc-scroll" className="wb-body flush" data-wb-rows>
          {stats.pendingRows.length === 0 ? (
            <div className="wb-empty">沒有待生成的標記</div>
          ) : (
            stats.pendingRows.map((r) => (
              <section key={r.slug} aria-label={r.title}>
                <a className="wb-gh wb-gc-warn" href={`/notes/${r.slug}`}>
                  <span className="wb-sp11" />
                  <Ic icon={FileText} size={13} />
                  <span className="wb-gh-n">{r.title}</span>
                  <span className="wb-gh-c tnum">{markerCounts(r.markers).pending}</span>
                  <span className="wb-gh-stats tnum">{r.path}</span>
                </a>
                {r.markers
                  .filter((m) => m.status !== "generated")
                  .map((m) => (
                    <a key={m.id} className="wb-row" href={`/notes/${r.slug}`}>
                      <span className="wb-dot warn" aria-hidden="true" />
                      <span className="wb-row-t">{m.id}</span>
                      <span className="wb-row-p">{m.prompt}</span>
                      <Pill tone="muted">{m.type}</Pill>
                      <span className="wb-row-d">待生成</span>
                    </a>
                  ))}
              </section>
            ))
          )}
        </div>
      ) : (
        <div id="nc-scroll" className="wb-body" data-wb-rows>
          <div className="wb-grid">
            <Widget span={3} title="筆記總數" meta="全部資料夾">
              <div className="wb-kpi">
                <div className="wb-kpi-n tnum">{rows.length}</div>
                <div className="wb-kpi-sub">
                  近 7 日更新 <b className="tnum up">{week ? week.length : "—"}</b> ・ 近 30 日 <b className="tnum">{month ?? "—"}</b>
                </div>
              </div>
            </Widget>
            <Widget span={3} title="AI 視覺化生成率" meta={`${stats.done} / ${stats.total} 標記`}>
              <div className="wb-kpi">
                <div className="wb-kpi-row">
                  <div className="wb-kpi-n tnum">
                    {stats.pct}
                    <span className="wb-kpi-u">%</span>
                  </div>
                  <div className="wb-kpi-side">
                    已生成 <b className="tnum">{stats.done}</b>
                    <br />
                    待生成 <b className="tnum warn">{stats.pending}</b>
                  </div>
                </div>
                <div className="wb-bar lg">
                  <i style={{ width: stats.pct + "%" }} />
                </div>
              </div>
            </Widget>
            <Widget span={6} title="寫作頻率 · 近 8 週" meta="每週更新筆記數">
              <div className="wb-spark" role="img" aria-label={now ? buckets.map((b) => `${b.label} 起 ${b.count} 篇`).join("，") : "載入中"}>
                {buckets.map((b, i) => (
                  <div key={i} className="wb-spark-col" title={b.label}>
                    <span className="wb-spark-v tnum">{b.count || ""}</span>
                    <span className="wb-spark-b" style={{ height: Math.round((b.count / maxWeek) * 100) + "%", opacity: i === buckets.length - 1 ? 1 : 0.6 }} />
                    <span className="wb-spark-x tnum">{i === 0 || i === buckets.length - 1 ? b.label : ""}</span>
                  </div>
                ))}
              </div>
            </Widget>

            <Widget
              span={8}
              title="最近更新"
              action={
                <a className="wb-sb-foot-a" style={{ padding: 0, fontSize: 11 }} href="/notes">
                  全部筆記 →
                </a>
              }
            >
              {rows.slice(0, 8).map((r) => (
                <NoteRow key={r.slug} row={r} dense selected={sel === r.slug} onSelect={onSelect} />
              ))}
            </Widget>
            <Widget span={4} title="系列進度" meta={`${series.filter((s) => s.chapters.length > 0).length} 個系列`}>
              <SeriesProgressWidget series={series} live={live} />
            </Widget>

            <Widget span={7} title="標籤分布" meta={`前 ${tags.length} 個 ・ 共 ${tagTotal} 個`}>
              <div className="wb-tagchart">
                {tags.map((t) => (
                  <a key={t.name} className="wb-tagrow" href={`/notes?tag=${encodeURIComponent(t.name)}`}>
                    <span className="wb-tagrow-n">{t.name}</span>
                    <span className="wb-tagrow-track">
                      <i style={{ width: (t.count / maxTag) * 100 + "%" }} />
                    </span>
                    <span className="wb-tagrow-v tnum">{t.count}</span>
                  </a>
                ))}
              </div>
            </Widget>
            <Widget span={5} title="待生成 @ai-visualize 標記" meta={`${stats.pending} 個 ・ ${stats.pendingRows.length} 篇`}>
              {stats.pendingRows.slice(0, 6).map((r) => (
                <div key={r.slug} className={"wb-row dense" + (sel === r.slug ? " sel" : "")}>
                  <button type="button" className="wb-row-main" data-wb-rowfocus aria-pressed={sel === r.slug} {...rowHandlers(r.slug, onSelect)}>
                    <span className="wb-dot warn" aria-hidden="true" />
                    <span className="wb-row-t">{r.title}</span>
                    <span className="wb-row-p">{r.folder.join("/") || "根目錄"}</span>
                    <Pill tone="warn">待生成 {markerCounts(r.markers).pending}</Pill>
                  </button>
                  <a className="wb-row-open" href={`/notes/${r.slug}`} aria-label={`開啟筆記：${r.title}`} onClick={(e) => e.stopPropagation()}>
                    →
                  </a>
                </div>
              ))}
              {stats.pendingRows.length === 0 ? <div className="wb-empty" style={{ padding: "22px 12px" }}>沒有待生成的標記</div> : null}
              <button type="button" className="wb-row-more" onClick={() => goTab("ai")}>
                查看完整 AI 佇列 →
              </button>
            </Widget>
          </div>
        </div>
      )}
      {sel ? (
        selRow ? (
          <NoteDrawer row={selRow} series={drawerSeries} workspaceLabel={workspaceLabel} isDev={isDev} onClose={() => setSel(null)} />
        ) : (
          <>
            <button type="button" className="wb-scrim" onClick={() => setSel(null)} aria-label="關閉預覽" tabIndex={-1} />
            <aside className="wb-drawer" role="dialog" aria-modal="true" aria-label="載入中">
              <div className="wb-dw-h">
                <span className="wb-crumb">載入中…</span>
              </div>
              <div className="wb-dw-body">
                <div className="wb-row wb-skel" aria-hidden="true" />
                <div className="wb-row wb-skel" aria-hidden="true" />
                <div className="wb-row wb-skel" aria-hidden="true" />
              </div>
            </aside>
          </>
        )
      ) : null}
    </>
  );
}
