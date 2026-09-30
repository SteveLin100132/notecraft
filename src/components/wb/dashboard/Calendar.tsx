// Dashboard「更新月曆」Body（規格 docs/notecraft-workbench-calendar.md §3、§4.4、§5、§6）。
// 不是獨立 island：由 DashboardWorkbench 渲染；now／live／readingVersion／sel 由它持有一份往下傳。
// 整個格區都靠「今天」（anchor），SSR 拿不到：anchor 在 now 為 null 時是 null → 只輸出工具列佔位（「—」）與星期列，
// **不輸出任何日期格**；now 到了才有 anchor。任何人把 new Date() 寫進初值就會 hydration mismatch。
// view／anchor 是元件 state，不進網址（Q3）；月曆的「週」是日曆週（週日→週六），與總覽 KPI 的滾動 7 天不同（Q1）。
//
//   #nc-scroll.wb-body.cal-body[data-wb-rows]     ← id 不可拿掉；data-wb-rows 給 ↑↓ 移焦
//     .cal-bar   ‹ › 本週 ｜ 標題 + 共更新 N 篇 ｜ .dv-legend ｜ .dv-seg 週/月
//     .cal-grid.mo|.wk   .cal-wd ×7 + CalCell ×(weeks×7 或 7)
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { readingStatus } from "@/lib/reading-progress";
import { calInMonth, calIso, calMonthGrid, calShift, calTitle, calWeekOf, groupByDay, type CalView } from "@/lib/wb-calendar";
import { countByStatus } from "@/lib/wb-dashboard";
import type { WbNoteRow } from "@/lib/wb-types";
import CalCell from "./CalCell";
import { DV_RS } from "./patterns";

const WD = ["日", "一", "二", "三", "四", "五", "六"];

export type CalendarProps = {
  rows: WbNoteRow[];
  /** null = 尚未 hydrate：工具列「—」、不輸出日期格 */
  now: Date | null;
  /** false = SSR／首次 render：閱讀狀態一律當作未開始、不讀 localStorage */
  live: boolean;
  /** 閱讀進度版本號；變動時重算色塊與圖例 */
  readingVersion: number;
  sel: string | null;
  onSelect: (slug: string) => void;
};

export default function Calendar({ rows, now, live, readingVersion, sel, onSelect }: CalendarProps) {
  const [view, setView] = useState<CalView>("month");
  // 伺服器與瀏覽器首次 render 的 now 都是 null → 兩邊都是 null，不會 mismatch；掛載時 now 已在（切 Tab 才會掛）就直接用
  const [anchor, setAnchor] = useState<string | null>(() => (now ? calIso(now) : null));
  useEffect(() => {
    if (now) setAnchor((a) => a ?? calIso(now));
  }, [now]);

  const today = now ? calIso(now) : null;
  const byDay = useMemo(() => groupByDay(rows), [rows]);

  const grid = anchor ? (view === "month" ? calMonthGrid(anchor) : null) : null;
  const days = anchor ? (grid ? grid.days : calWeekOf(anchor).days) : [];
  const inRange = useMemo(
    () => (anchor ? days.flatMap((d) => (view === "month" && !calInMonth(d, anchor) ? [] : (byDay[d] ?? []))) : []),
    // days 由 anchor／view 決定，不必再列
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchor, view, byDay],
  );
  const counts = useMemo(
    () => (live ? countByStatus(inRange.map((r) => readingStatus(r.slug))) : null),
    // readingVersion 是刻意的依賴：localStorage 變了 inRange 不會變
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inRange, live, readingVersion],
  );
  const thisWeek = today && view === "month" ? calWeekOf(today).days : null;

  const go = (dir: -1 | 1) => anchor && setAnchor(calShift(view, anchor, dir));
  const navLabel = (which: "prev" | "next") => (view === "month" ? (which === "prev" ? "上一個月" : "下一個月") : which === "prev" ? "上一週" : "下一週");

  return (
    <div id="nc-scroll" className="wb-body cal-body" data-wb-rows>
      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" aria-label={navLabel("prev")} disabled={!anchor} onClick={() => go(-1)}>
            <ChevronLeft size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button type="button" aria-label={navLabel("next")} disabled={!anchor} onClick={() => go(1)}>
            <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button type="button" className="cal-today" disabled={!today} onClick={() => today && setAnchor(today)}>
            本週
          </button>
        </div>
        <h2 className="cal-title tnum">
          {anchor ? calTitle(view, anchor) : "—"}
          <span>共更新 {anchor ? inRange.length : "—"} 篇</span>
        </h2>
        <div className="cal-right">
          <div className="dv-legend">
            {DV_RS.map((s) => (
              <span key={s.k}>
                <i className={s.cls} aria-hidden="true" />
                {s.l}
                <b className="tnum">{counts ? counts[s.k] : "—"}</b>
              </span>
            ))}
          </div>
          <div className="dv-seg">
            {(["week", "month"] as const).map((v) => (
              <button key={v} type="button" className={v === view ? "on" : ""} aria-pressed={v === view} disabled={!anchor} onClick={() => setView(v)}>
                {v === "week" ? "週" : "月"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={"cal-grid " + (view === "month" ? "mo" : "wk")} style={grid ? { gridTemplateRows: `auto repeat(${grid.weeks}, minmax(0,1fr))` } : undefined}>
        {WD.map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
        {anchor
          ? days.map((d, i) => (
              <CalCell
                key={d}
                iso={d}
                list={byDay[d] ?? []}
                view={view}
                out={view === "month" && !calInMonth(d, anchor)}
                today={d === today}
                thisWeek={!!thisWeek && thisWeek.includes(d)}
                firstCell={view === "week" && i === 0}
                live={live}
                sel={sel}
                onSelect={onSelect}
              />
            ))
          : null}
      </div>
    </div>
  );
}
