// <Table> — 表格 / 對照矩陣（Task 34）。
// 出處：提案 P3 模組×選型矩陣、月會 P10 交付物×時間點。
// 欄位沿用契約 v0.1 §4.6：普通表格與狀態矩陣是同一個元件，由 cell 的欄位決定長相。
//
// dataviz 的規則在此落地：
//   - 熱度 / 支援程度矩陣用**單色階**（tone 一律 blue，靠 emphasis 與 icon 區分），
//     不要綠黃紅混色 —— 混色會把識別色與狀態色混用（見 decks.ts 的 StatusTone 註解）
//   - 整張表加 tabular-nums：數字要能縱向對齊（CJK 文字不受影響）

import { Fragment } from "react";
import type { IconName, SeriesTone, StatusTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface TableCell {
  text?: string;
  /** 狀態圖示（✓ / ! / – 之類），與 text 可並存 */
  icon?: IconName;
  /** 格內小字，如「採用」 */
  note?: string;
  tone?: SeriesTone | StatusTone;
  /** 格線加粗強調（如「採用」的橘框） */
  emphasis?: boolean;
}

export interface TableProps extends BlockBaseProps {
  /** 左上角斜線標題，如「服務選型 ／ 模組」 */
  corner?: string;
  head: string[];
  rowHeads?: string[];
  rows: TableCell[][];
  /** 整欄 highlight（0-based，對應 head 的索引） */
  highlightCol?: number;
}

const COL_LIMIT = 6;
const ROW_LIMIT = 6;

export function Table({ dark, heading, style, corner, head, rowHeads, rows, highlightCol }: TableProps) {
  const c = dkt(dark);
  warnOverLimit("Table(欄)", head.length, COL_LIMIT);
  warnOverLimit("Table(列)", rows.length, ROW_LIMIT);

  const hasRowHead = Boolean(rowHeads?.length);
  const gridCols = `${hasRowHead ? "minmax(160px, 1.2fr) " : ""}repeat(${head.length}, 1fr)`;

  const headCellStyle = (i: number) => ({
    boxSizing: "border-box" as const,
    padding: `${DGAP.xs}px ${DGAP.xs}px`,
    borderRadius: "var(--radius-sm)",
    background: i === highlightCol ? c.brandSoft : dark ? c.sunken : "var(--neutral-100)",
    color: i === highlightCol ? c.brandInk : c.body,
    fontSize: DS.micro,
    fontWeight: 800,
    letterSpacing: DTRACK.label,
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: gridCols,
          gridAutoRows: "1fr",
          gap: 2,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {/* 表頭 */}
        {hasRowHead && (
          <div style={{ ...headCellStyle(-1), justifyContent: "flex-start", textAlign: "left", letterSpacing: "normal" }}>
            {corner ?? ""}
          </div>
        )}
        {head.map((h, i) => (
          <div key={`h-${h}-${i}`} style={headCellStyle(i)}>
            {h}
          </div>
        ))}

        {/* 資料列 */}
        {rows.map((row, r) => (
          <Fragment key={`row-${r}`}>
            {hasRowHead && (
              <div
                style={{
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  padding: `${DGAP.xs}px`,
                  borderRadius: "var(--radius-sm)",
                  background: dark ? c.sunken : "var(--neutral-50)",
                  fontSize: DS.small,
                  fontWeight: 700,
                  color: c.ink,
                }}
              >
                {rowHeads![r]}
              </div>
            )}
            {row.map((cell, i) => {
              const t = toneColor(cell.tone, c);
              const icon = cell.icon ?? (isStatusTone(cell.tone) ? STATUS_ICON[cell.tone] : undefined);
              const colHi = i === highlightCol;
              return (
                <div
                  key={`c-${r}-${i}`}
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: `${DGAP.xs}px 6px`,
                    borderRadius: "var(--radius-sm)",
                    background: cell.tone ? t.soft : colHi ? c.brandSoft : dark ? c.sunken : "var(--neutral-50)",
                    border: cell.emphasis ? `2px solid ${t.fg}` : `1px solid ${c.borderSoft}`,
                    textAlign: "center",
                  }}
                >
                  {icon && (
                    <span style={{ display: "inline-flex", color: t.fg }}>
                      <DeckIcon name={icon} size={20} />
                    </span>
                  )}
                  {cell.text && (
                    <span style={{ fontSize: DS.small, fontWeight: cell.emphasis ? 800 : 600, lineHeight: 1.35, color: c.ink }}>
                      {cell.text}
                    </span>
                  )}
                  {cell.note && <span style={{ fontSize: DS.micro, color: c.muted, lineHeight: 1.3 }}>{cell.note}</span>}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </BlockShell>
  );
}
