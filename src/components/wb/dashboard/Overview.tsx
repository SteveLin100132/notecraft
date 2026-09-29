// Dashboard「總覽」Body（規格 docs/notecraft-workbench-dashboard.md §3、§6）。
// 不是獨立 island：由 DashboardWorkbench 渲染；now／live／sel 由它持有一份往下傳，各卡片不自己 new Date()、不自己監聽 READING_EVENT。
//
//   #nc-scroll.wb-body.dv-body          ← id 不可拿掉（Toc 與筆記頁 script 靠它）
//     DvPatterns
//     .dv-wrap
//       .dv-row1  KPI ｜ KPI ｜ KPI(AI) ｜ 寫作頻率
//       .dv-row2  最近更新 ｜ .dv-midcol[系列 / 標籤分布] ｜ 更新日誌
import type { WbIndex, WbNoteRow, WbSeries, WbTagStat } from "@/lib/wb-types";
import { withinDays } from "@/lib/wb-time";
import FreqChart from "./FreqChart";
import { AiKpi, StatKpi } from "./KpiCard";
import { DvPatterns } from "./patterns";
import SeriesCard from "./SeriesCard";
import TagTreemap from "./TagTreemap";
import Timeline from "./Timeline";
import UpdateLog from "./UpdateLog";

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

export default function Overview({ rows, series, tags, tagTotal, tagUseTotal, pending, now, live, readingVersion, sel, onSelect }: OverviewProps) {
  // 「本週」＝今天與前 6 天（與「本週」Tab 同一個定義；Q2）
  const week = now ? rows.filter((r) => withinDays(r.updatedAt, 7, now)) : null;
  return (
    <div id="nc-scroll" className="wb-body dv-body" data-wb-rows>
      <DvPatterns />
      <div className="dv-wrap">
        <div className="dv-row1">
          <StatKpi label="筆記總數" value={rows.length} rows={rows} live={live} readingVersion={readingVersion} />
          <StatKpi label="本週更新" value={week ? week.length : null} rows={week ?? []} live={live && week !== null} readingVersion={readingVersion} />
          <AiKpi markers={pending.markers} notes={pending.notes} />
          <FreqChart rows={rows} now={now} live={live} readingVersion={readingVersion} />
        </div>
        <div className="dv-row2">
          <Timeline rows={rows} sel={sel} onSelect={onSelect} />
          <div className="dv-midcol">
            <SeriesCard series={series} live={live} readingVersion={readingVersion} />
            <TagTreemap tags={tags} tagTotal={tagTotal} tagUseTotal={tagUseTotal} />
          </div>
          <UpdateLog rows={rows} now={now} sel={sel} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
