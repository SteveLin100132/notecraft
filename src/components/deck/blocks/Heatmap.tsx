// <Heatmap> — 單色階強度矩陣（Task 44）。
//
// SKILL 的圖表選型表早就寫了「量級 / 支援程度 / 熱度矩陣 → **單色階**（blue 由淺到深）+ icon」，
// 但原子層一直沒有對應元件，只能拿 <Table> 硬湊成文字表。這一支補上那格。
//
// 與 <Table> 的分界：Table 的格子是**文字**，讀者逐格閱讀；Heatmap 的格子是**強度**，
// 讀者先看整片深淺分布、再回頭讀數字。同一份資料若沒有「哪裡深哪裡淺」的訊息，就用 Table。
//
// 三個通道同時編碼強度（底色淡染 + 底部量條 + 數值文字）——
// 單靠底色深淺會踩到「色彩單獨承載語意」，而且深色底上的文字必然失去對比。
// 所以底色最深只染到 MAX_TINT，剩下的強度差由量條長度補足。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface HeatCell {
  /** 強度，0–1。超出範圍會夾回區間 */
  v: number;
  /** 覆寫格內顯示文字。不給就用 `format(v)` */
  text?: string;
}

export interface HeatRow {
  label: string;
  /** 長度必須等於 `columns` */
  cells: (number | HeatCell)[];
}

export interface HeatmapProps extends BlockBaseProps {
  columns: string[];
  rows: HeatRow[];
  /** 強度 → 格內文字。預設顯示百分比 */
  format?: (v: number) => string;
  /** 圖例兩端字，預設 ["低", "高"] */
  scale?: [string, string];
  /** 圖例右側的口徑說明 */
  note?: string;
  /** 色階基色，預設 "blue" */
  tone?: SeriesTone;
}

const ROW_LIMIT = 6;
const COL_LIMIT = 6;
/** 底色最深只染到這個比例 —— 再深就壓不住格內文字的對比 */
const MAX_TINT = 26;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const norm = (c: number | HeatCell): HeatCell => (typeof c === "number" ? { v: c } : c);

function Cell({ cell, c, t, format }: { cell: HeatCell; c: DeckThemeTokens; t: { fg: string }; format: (v: number) => string }) {
  const v = clamp01(cell.v);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        minWidth: 0,
        borderRadius: "var(--radius-md)",
        background: `color-mix(in srgb, ${t.fg} ${(v * MAX_TINT).toFixed(1)}%, transparent)`,
        border: `1px solid ${c.borderSoft}`,
        padding: `${DGAP.xs}px 4px`,
      }}
    >
      <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink, fontVariantNumeric: "tabular-nums" }}>
        {cell.text ?? format(v)}
      </span>
      {/* 量條：強度的第三個通道，也是深淺差被 MAX_TINT 壓平後的補償 */}
      <span style={{ width: "72%", height: 4, borderRadius: 999, background: c.borderSoft, overflow: "hidden" }}>
        <span style={{ display: "block", width: `${v * 100}%`, height: "100%", background: t.fg }} />
      </span>
    </div>
  );
}

export function Heatmap({
  dark,
  heading,
  style,
  columns,
  rows,
  format = (v) => `${Math.round(v * 100)}%`,
  scale = ["低", "高"],
  note,
  tone = "blue",
}: HeatmapProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Heatmap(列)", rows.length, ROW_LIMIT);
  warnOverLimit("Heatmap(欄)", columns.length, COL_LIMIT);

  // 首欄放列標題，其餘等分
  const grid = `minmax(120px, 1.4fr) repeat(${columns.length}, 1fr)`;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
        {/* 欄標 */}
        <div style={{ flex: "none", display: "grid", gridTemplateColumns: grid, gap: DGAP.xs }}>
          <span />
          {columns.map((col) => (
            <span
              key={col}
              style={{
                fontSize: DS.micro,
                fontWeight: 800,
                letterSpacing: DTRACK.label,
                color: c.muted,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {col}
            </span>
          ))}
        </div>

        {/* 資料列 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ flex: 1, display: "grid", gridTemplateColumns: grid, gap: DGAP.xs, minHeight: 0 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: DS.small,
                  fontWeight: 700,
                  color: c.ink,
                  lineHeight: 1.35,
                  minWidth: 0,
                }}
              >
                {row.label}
              </span>
              {columns.map((col, i) => (
                <Cell key={col} cell={norm(row.cells[i] ?? 0)} c={c} t={t} format={format} />
              ))}
            </div>
          ))}
        </div>

        {/* 色階圖例 */}
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: DGAP.xs, fontSize: DS.micro, color: c.muted }}>
          <span style={{ fontWeight: 700 }}>{scale[0]}</span>
          <span style={{ display: "flex", gap: 2 }}>
            {[0.15, 0.35, 0.6, 0.85, 1].map((v) => (
              <span
                key={v}
                style={{
                  width: 26,
                  height: 10,
                  borderRadius: 2,
                  background: `color-mix(in srgb, ${t.fg} ${(v * MAX_TINT).toFixed(1)}%, transparent)`,
                  border: `1px solid ${c.borderSoft}`,
                }}
              />
            ))}
          </span>
          <span style={{ fontWeight: 700 }}>{scale[1]}</span>
          {note && <span style={{ marginLeft: "auto" }}>{note}</span>}
        </div>
      </div>
    </BlockShell>
  );
}
