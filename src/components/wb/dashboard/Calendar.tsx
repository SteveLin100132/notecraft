// Dashboard「更新月曆」Body（規格 docs/notecraft-workbench-calendar.md §3、§4.4、§5、§6）。
// 不是獨立 island：由 DashboardWorkbench 渲染；now／live／readingVersion／sel 由它持有一份往下傳。
// 整個格區都靠「今天」（anchor），SSR 拿不到：anchor 初值 null → 只輸出工具列佔位（「—」）與星期列，**不輸出任何日期格**；
// now 到了才在 effect 裡設 anchor。任何人把 new Date() 寫進初值就會 hydration mismatch。
//
//   #nc-scroll.wb-body.cal-body[data-wb-rows]     ← id 不可拿掉；data-wb-rows 給 ↑↓ 移焦
//     .cal-bar   ‹ › 本週 ｜ 標題 + 共更新 N 篇 ｜ .dv-legend ｜ .dv-seg 週/月
//     .cal-grid.mo|.wk   .cal-wd ×7 + CalCell ×(weeks×7 或 7)
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WbNoteRow } from "@/lib/wb-types";
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

export default function Calendar(_props: CalendarProps) {
  // Task 92：空殼（SSR 佔位）。state、日期格、色塊與卡片在 Task 93／94 接上。
  return (
    <div id="nc-scroll" className="wb-body cal-body" data-wb-rows>
      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" aria-label="上一個月" disabled>
            <ChevronLeft size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button type="button" aria-label="下一個月" disabled>
            <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button type="button" className="cal-today" disabled>
            本週
          </button>
        </div>
        <h2 className="cal-title tnum">
          —<span>共更新 — 篇</span>
        </h2>
        <div className="cal-right">
          <div className="dv-legend">
            {DV_RS.map((s) => (
              <span key={s.k}>
                <i className={s.cls} aria-hidden="true" />
                {s.l}
                <b className="tnum">—</b>
              </span>
            ))}
          </div>
          <div className="dv-seg">
            <button type="button" aria-pressed={false} disabled>
              週
            </button>
            <button type="button" className="on" aria-pressed disabled>
              月
            </button>
          </div>
        </div>
      </div>
      <div className="cal-grid mo">
        {WD.map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
      </div>
    </div>
  );
}
