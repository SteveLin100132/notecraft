// Dashboard「總覽」Body（規格 docs/notecraft-workbench-dashboard.md §3、§6）。
// 不是獨立 island：由 DashboardWorkbench 渲染；now／live／sel 由它持有一份往下傳，各卡片不自己 new Date()、不自己監聽 READING_EVENT。
//
//   #nc-scroll.wb-body.dv-body          ← id 不可拿掉（Toc 與筆記頁 script 靠它）
//     DvPatterns
//     .dv-wrap
//       .dv-row1  KPI ｜ KPI ｜ KPI(AI) ｜ 寫作頻率
//       .dv-row2  最近更新 ｜ .dv-midcol[系列 / 標籤分布] ｜ 更新日誌
import type { WbIndex, WbNoteRow, WbSeries, WbTagStat } from "@/lib/wb-types";
import DvCard from "./DvCard";
import { DvPatterns } from "./patterns";

export type OverviewProps = {
  rows: WbNoteRow[];
  series: WbSeries[];
  tags: WbTagStat[];
  tagTotal: number;
  tagUseTotal: number;
  pending: WbIndex["pending"];
  /** null = 尚未 hydrate：相對量以「—」佔位、不畫長條、不輸出日誌清單 */
  now: Date | null;
  /** false = SSR／首次 render：閱讀狀態一律當作未開始、不讀 localStorage */
  live: boolean;
  /** 閱讀進度版本號；變動時重算依賴 readingStatus() 的卡片 */
  readingVersion: number;
  sel: string | null;
  onSelect: (slug: string) => void;
};

export default function Overview(_props: OverviewProps) {
  return (
    <div id="nc-scroll" className="wb-body dv-body" data-wb-rows>
      <DvPatterns />
      <div className="dv-wrap">
        <div className="dv-row1">
          <DvCard cls="dv-kpi" label="筆記總數" />
          <DvCard cls="dv-kpi" label="本週更新" />
          <DvCard cls="dv-kpi dv-kpi-ai" label="AI 待生成" />
          <DvCard cls="dv-freq" title="寫作頻率" />
        </div>
        <div className="dv-row2">
          <DvCard cls="dv-tl" title="最近更新" />
          <div className="dv-midcol">
            <DvCard cls="dv-sl" title="系列" />
            <DvCard cls="dv-tags" title="標籤分布" />
          </div>
          <DvCard cls="dv-log" title="更新日誌" />
        </div>
      </div>
    </div>
  );
}
