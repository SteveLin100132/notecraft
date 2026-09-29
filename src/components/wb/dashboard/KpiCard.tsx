// Row 1 的三張 KPI 卡（規格 §6.1）。
// 「筆記總數」「本週更新」：大數字 + 依閱讀狀態分三段的環 + 圖例。閱讀狀態在 localStorage、本週靠今天，
// 兩者 SSR 都算不出來：value 為 null → 「—」；live 為 false → 只畫底環、圖例數字「—」。
// 「AI 待生成」：全是 build 期值，SSR 完整畫；右上「前往佇列」是真連結。
import { useMemo } from "react";
import { readingStatus } from "@/lib/reading-progress";
import { ROUTES } from "@/lib/wb-routes";
import { countByStatus } from "@/lib/wb-dashboard";
import type { WbNoteRow } from "@/lib/wb-types";
import DvCard from "./DvCard";
import Ring, { type RingPart } from "./Ring";
import { DV_RS } from "./patterns";

/** 依閱讀狀態把一組筆記分成三段；live 為 false 時全部為 0（不讀 localStorage）。readingVersion 只是讓 memo 在進度變動時重算。 */
export function useReadingParts(rows: WbNoteRow[], live: boolean, readingVersion: number): RingPart[] {
  return useMemo(() => {
    if (!live) return DV_RS.map((s) => ({ ...s, v: 0 }));
    const c = countByStatus(rows.map((r) => readingStatus(r.slug)));
    return DV_RS.map((s) => ({ ...s, v: c[s.k] }));
    // readingVersion 是刻意的依賴：localStorage 變了 rows 不會變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, live, readingVersion]);
}

export function StatKpi({
  label,
  value,
  rows,
  live,
  readingVersion,
}: {
  label: string;
  /** null = 尚未 hydrate（本週更新） */
  value: number | null;
  rows: WbNoteRow[];
  live: boolean;
  readingVersion: number;
}) {
  const parts = useReadingParts(rows, live, readingVersion);
  return (
    <DvCard cls="dv-kpi" label={label}>
      <div className="dv-kpi-l">{label}</div>
      <div className="dv-kpi-body">
        <span className="dv-kpi-n tnum">{value === null ? "—" : value}</span>
        <Ring parts={parts} />
      </div>
      <div className="dv-kpi-rs">
        {parts.map((p) => (
          <span key={p.k} title={p.l}>
            <i className={p.cls} aria-hidden="true" />
            {p.l}
            <b className="tnum">{live ? p.v : "—"}</b>
          </span>
        ))}
      </div>
    </DvCard>
  );
}

/** AI 卡右下的金色曲線與淡出的虛線格線（pt-dash2.jsx PtOverview 原樣；顏色一律 style／CSS 變數）。 */
function Spark() {
  return (
    <svg className="dv-spark" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="dvg-ai" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--wb-gold)", stopOpacity: 0.22 }} />
          <stop offset="1" style={{ stopColor: "var(--wb-gold)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="dvg-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--wb-panel)", stopOpacity: 0 }} />
          <stop offset=".45" style={{ stopColor: "var(--wb-panel)", stopOpacity: 0.25 }} />
          <stop offset="1" style={{ stopColor: "var(--wb-panel)", stopOpacity: 1 }} />
        </linearGradient>
        <mask id="dvm-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="80">
          <rect width="200" height="80" fill="url(#dvg-fade)" />
        </mask>
      </defs>
      <g mask="url(#dvm-fade)" style={{ stroke: "var(--wb-line)" }} strokeWidth="1">
        {[16, 32, 48, 64].map((y) => (
          <line key={"h" + y} x1="0" x2="200" y1={y} y2={y} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ))}
        {[40, 80, 120, 160].map((x) => (
          <line key={"v" + x} x1={x} x2={x} y1="0" y2="80" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <path d="M0 62 C18 58 26 44 42 48 S66 64 82 52 S108 26 124 34 S150 50 164 30 S188 14 200 18 L200 80 L0 80 Z" fill="url(#dvg-ai)" />
      <path
        d="M0 62 C18 58 26 44 42 48 S66 64 82 52 S108 26 124 34 S150 50 164 30 S188 14 200 18"
        fill="none"
        style={{ stroke: "var(--wb-gold)" }}
        strokeOpacity=".45"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function AiKpi({ markers, notes }: { markers: number; notes: number }) {
  return (
    <DvCard cls="dv-kpi dv-kpi-ai" label="AI 待生成">
      <Spark />
      <div className="dv-kpi-hd">
        <span className="dv-kpi-l">AI 待生成</span>
        <a className="dv-link" href={ROUTES.aiQueue}>
          前往佇列
        </a>
      </div>
      <div className="dv-kpi-body">
        <span className="dv-kpi-n tnum warn">{markers}</span>
      </div>
      <div className="dv-kpi-rs">
        <span>
          分布於 <b className="tnum">{notes}</b> 篇筆記
        </span>
      </div>
    </DvCard>
  );
}
