// <Summary> — 開場濃縮（Task 45）。
//
// 構圖參考 dashi-ppt theme07「摘要」頁：左側大段論點壓頂、右側補充要點、底部一排統計卡。
//
// 與 <Kpi> 的分界：Kpi 只有數字，沒有把數字綁回論點的那段話；Summary 的重心是**論點**，
// 統計卡是它的證據。與 closing 版型的分界：closing 是回顧（講完了），Summary 是開場（要開始講）。
// 一份 deck 最多用一次 —— 用兩次就代表主線沒收斂。

import { DGAP, DS, DTRACK } from "../scale";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface SummaryStat {
  /** 數值，如 "1020" */
  v: string;
  /** 這個數字是什麼 */
  k: string;
  /** 口徑補述 */
  note?: string;
}

export interface SummaryPoint {
  label: string;
  desc?: string;
}

export interface SummaryProps extends BlockBaseProps {
  /** 主論點。**這是整頁的重心**，寫成能唸出來的 2–4 行 */
  lead: string;
  /** 結論句 */
  takeaway?: string;
  /** 右欄補充要點，2–4 條 */
  points?: SummaryPoint[];
  /** 底部統計卡，3–4 格 */
  stats?: SummaryStat[];
}

const POINT_LIMIT = 4;
const STAT_LIMIT = 4;

function Stat({ stat, c, dark }: { stat: SummaryStat; c: DeckThemeTokens; dark: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        justifyContent: "center",
        minWidth: 0,
        boxSizing: "border-box",
        padding: DGAP.sm,
        borderRadius: "var(--radius-lg)",
        background: dark ? c.sunken : "var(--neutral-50)",
        border: `1px solid ${c.borderSoft}`,
      }}
    >
      <span
        style={{
          fontSize: DS.h2,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: DTRACK.tight,
          color: c.ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {stat.v}
      </span>
      <span style={{ fontSize: DS.small, fontWeight: 700, color: c.body, lineHeight: 1.35 }}>{stat.k}</span>
      {stat.note && <span style={{ fontSize: DS.micro, color: c.muted, lineHeight: 1.35 }}>{stat.note}</span>}
    </div>
  );
}

export function Summary({ dark, heading, style, lead, takeaway, points, stats }: SummaryProps) {
  const c = dkt(dark);
  warnOverLimit("Summary(要點)", points?.length ?? 0, POINT_LIMIT);
  warnOverLimit("Summary(統計)", stats?.length ?? 0, STAT_LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.md, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", gap: DGAP.xl, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.sm, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: DS.h3, fontWeight: 500, lineHeight: 1.55, color: c.ink, textWrap: "balance" }}>
              {lead}
            </p>
            {takeaway && (
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: DS.body,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  color: c.ink,
                }}
              >
                <span style={{ flex: "none", width: 10, height: 10, borderRadius: 999, background: c.accent, marginTop: 7 }} />
                {takeaway}
              </div>
            )}
          </div>

          {points?.length ? (
            <div style={{ flex: "none", width: "38%", display: "flex", flexDirection: "column", gap: DGAP.sm, minWidth: 0 }}>
              {points.slice(0, POINT_LIMIT).map((p) => (
                <div key={p.label} style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: DGAP.sm, borderLeft: `3px solid ${c.border}` }}>
                  <span style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink }}>{p.label}</span>
                  {p.desc && <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{p.desc}</span>}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {stats?.length ? (
          <div
            style={{
              flex: "none",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(stats.length, STAT_LIMIT)}, 1fr)`,
              gap: DGAP.sm,
            }}
          >
            {stats.slice(0, STAT_LIMIT).map((s) => (
              <Stat key={s.k} stat={s} c={c} dark={dark} />
            ))}
          </div>
        ) : null}
      </div>
    </BlockShell>
  );
}
