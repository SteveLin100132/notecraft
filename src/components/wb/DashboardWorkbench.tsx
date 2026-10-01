// Dashboard：三個 Tab 是同一份資料的三種投影，做成同一個 island（workbench §8.1）。
// 「總覽」Body 由 ./dashboard/Overview 渲染（docs/notecraft-workbench-dashboard.md）、「更新月曆」由 ./dashboard/Calendar
// 渲染（docs/notecraft-workbench-calendar.md）；「AI 佇列」在這裡。
// 兩個瀏覽器端資料來源只在這裡各持有一份往下傳：now（hydrate 後才有，SSR 以「—」佔位）與閱讀進度版本號（live）。
// 完整的 WbNoteRow（Drawer 要用）走 useWbIndex() 延遲載入；inline 的 props 只有精簡列。
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { WbIndex, WbNoteRow, WbSeries, WbTagStat } from "@/lib/wb-types";
import { markerCounts } from "@/lib/wb-types";
import { READING_EVENT } from "@/lib/reading-progress";
import WbHeader from "./WbHeader";
import NoteDrawer from "./NoteDrawer";
import Overview from "./dashboard/Overview";
import Calendar from "./dashboard/Calendar";
import EmptyState from "./EmptyState";
import { Ic, Pill } from "./ui";
import { useWbIndex } from "./useWbIndex";
import { withBase } from "@/lib/base";

type Tab = "overview" | "calendar" | "ai";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "總覽" },
  { key: "calendar", label: "更新月曆" },
  { key: "ai", label: "AI 佇列" },
];

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

export default function DashboardWorkbench({
  rows = [],
  series = [],
  tags = [],
  tagTotal = 0,
  tagUseTotal = 0,
  pending = { markers: 0, notes: 0 },
  workspaceLabel = "",
  isDev = false,
}: {
  /** 精簡列：標記沒有 prompt；description 只有最新 7 篇有（總覽的時間軸要顯示） */
  rows?: WbNoteRow[];
  series?: WbSeries[];
  /** 前 11 名（標籤分布馬賽克） */
  tags?: WbTagStat[];
  tagTotal?: number;
  /** 全站標記次數（馬賽克「其他」與百分比的分母） */
  tagUseTotal?: number;
  pending?: WbIndex["pending"];
  workspaceLabel?: string;
  isDev?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [now, setNow] = useState<Date | null>(null); // null = 尚未 hydrate，相對量以「—」佔位
  const [sel, setSel] = useState<string | null>(null);
  const readingVersion = useReadingVersion();
  const live = readingVersion > 0;
  const { index, load } = useWbIndex();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // ?tab=week 是 v1.4 以前「本週」Tab 的網址，視同更新月曆（規格 §8）
    if (t === "calendar" || t === "week") setTab("calendar");
    else if (t === "ai") setTab("ai");
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

  // 「AI 佇列」Tab 用；總覽的 AI 卡改吃 build 期算好的 pending prop
  const stats = useMemo(() => {
    let pendingMarkers = 0;
    const pendingRows: WbNoteRow[] = [];
    for (const r of rows) {
      const c = markerCounts(r.markers);
      pendingMarkers += c.pending;
      if (c.pending > 0) pendingRows.push(r);
    }
    return { pending: pendingMarkers, pendingRows };
  }, [rows]);

  const selRow = sel ? (index?.notes.find((r) => r.slug === sel) ?? null) : null;
  const drawerSeries = selRow?.series ? (index?.series.find((s) => s.id === selRow.series!.id) ?? null) : null;

  return (
    <>
      <WbHeader
        title="儀表板"
        crumbs={[{ label: "NoteCraft", href: withBase("/") }, { label: "工作區" }]}
        pills={[{ label: `${rows.length} 篇筆記`, tone: "muted" }, ...(stats.pending ? [{ label: `${stats.pending} 待生成`, tone: "warn" as const }] : [])]}
        tabs={TABS}
        activeTab={tab}
        onTab={goTab}
        isDev={isDev}
      />
      {tab === "calendar" ? (
        <Calendar rows={rows} now={now} live={live} readingVersion={readingVersion} sel={sel} onSelect={onSelect} />
      ) : tab === "ai" ? (
        <div id="nc-scroll" className="wb-body flush" data-wb-rows>
          {stats.pendingRows.length === 0 ? (
            <EmptyState
              kind="ai"
              title="AI 佇列已清空"
              sub="所有 @ai-visualize 標記都已生成完成。新增標記後會出現在這裡。"
              action={
                <a className="pt-empty-btn" href={withBase("/notes")}>
                  前往筆記
                </a>
              }
            />
          ) : (
            stats.pendingRows.map((r) => (
              <section key={r.slug} aria-label={r.title}>
                <a className="wb-gh wb-gc-warn" href={withBase(`/notes/${r.slug}`)}>
                  <span className="wb-sp11" />
                  <Ic icon={FileText} size={13} />
                  <span className="wb-gh-n">{r.title}</span>
                  <span className="wb-gh-c tnum">{markerCounts(r.markers).pending}</span>
                  <span className="wb-gh-stats tnum">{r.path}</span>
                </a>
                {r.markers
                  .filter((m) => m.status !== "generated")
                  .map((m) => (
                    <a key={m.id} className="wb-row" href={withBase(`/notes/${r.slug}`)}>
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
        <Overview
          rows={rows}
          series={series}
          tags={tags}
          tagTotal={tagTotal}
          tagUseTotal={tagUseTotal}
          pending={pending}
          now={now}
          live={live}
          readingVersion={readingVersion}
          sel={sel}
          onSelect={onSelect}
        />
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
