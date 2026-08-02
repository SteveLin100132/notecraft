// <Quadrant> — 兩軸四象限定位矩陣（Task 43）。
//
// 構圖參考 dashi-ppt theme07「象限」頁的三個決定：左欄承載敘述與軸義、右側純矩陣、
// **一張圖只強調一格**。色票、字級、圓角一律改走本專案的 DS / DGAP / dkt，不沿用其視覺。
//
// 與 <Table> 的分界：Table 是「多欄多列的交叉對照」，格子的位置只是排列順序；
// Quadrant 的**位置本身就是資訊**（右上 = 兩軸皆高），四格不可增減、不可重排。
// 只有兩個維度、且都是連續量（高↔低）時才用它 —— 離散類別請用 <Table>。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface QuadrantCell {
  /** 這個處境的名字，如「明星兌現」 */
  title: string;
  /** 一句話說明它為什麼會落在這一格 */
  desc?: string;
  /** 落在這一格的實例（短詞） */
  items?: string[];
  /**
   * 是否為重點象限。**一張圖只該有一個 true** ——
   * 全部都強調等於都沒強調（SKILL「編號必須編碼真實資訊」的同一個道理）。
   */
  emphasis?: boolean;
}

export interface QuadrantProps extends BlockBaseProps {
  /** 橫軸名，如「商業兌現度」 */
  xAxis: string;
  /** 縱軸名，如「資本熱度」 */
  yAxis: string;
  /** 橫軸兩端，預設 ["低", "高"] */
  xRange?: [string, string];
  /** 縱軸兩端，預設 ["低", "高"] */
  yRange?: [string, string];
  /** 軸義補述（左欄顯示），如「以融資額與輪次衡量」 */
  xNote?: string;
  yNote?: string;
  /** **順序固定：左上、右上、左下、右下**（讀圖順序，不是重要性順序） */
  cells: [QuadrantCell, QuadrantCell, QuadrantCell, QuadrantCell];
  /** 左欄導言。給了 lead 或 takeaway 才會出現左欄，否則矩陣佔滿整塊 */
  lead?: string;
  /** 左欄底部的結論句 */
  takeaway?: string;
  /** 強調格的識別色，預設 "blue" */
  tone?: SeriesTone;
}

const ITEM_LIMIT = 4;

function Cell({
  cell,
  c,
  dark,
  t,
}: {
  cell: QuadrantCell;
  c: DeckThemeTokens;
  dark: boolean;
  t: { fg: string; soft: string };
}) {
  const on = cell.emphasis === true;
  warnOverLimit("Quadrant(格內項)", cell.items?.length ?? 0, ITEM_LIMIT);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
        minHeight: 0,
        boxSizing: "border-box",
        padding: DGAP.sm,
        borderRadius: "var(--radius-lg)",
        background: on ? t.soft : dark ? c.sunken : "var(--neutral-50)",
        // 強調格用 2px 實線描邊 —— 與底色兩個通道同時標示，不讓顏色單獨承載「這格是重點」
        border: on ? `2px solid ${t.fg}` : `1px solid ${c.borderSoft}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {on && <span style={{ flex: "none", width: 8, height: 8, borderRadius: 2, background: t.fg }} />}
        <span
          style={{
            fontSize: DS.h4,
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: DTRACK.tight,
            color: on ? t.fg : c.ink,
            textWrap: "balance",
          }}
        >
          {cell.title}
        </span>
      </div>

      {cell.desc && <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{cell.desc}</span>}

      {cell.items?.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto" }}>
          {cell.items.slice(0, ITEM_LIMIT).map((label) => (
            <span
              key={label}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: DS.micro,
                fontWeight: 700,
                color: on ? t.fg : c.muted,
                background: on ? c.slide : c.hover,
                border: `1px solid ${c.borderSoft}`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AxisNote({ kind, name, note, c }: { kind: string; name: string; note?: string; c: DeckThemeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.ink }}>
        <span style={{ color: c.muted, letterSpacing: DTRACK.label }}>{kind} · </span>
        {name}
      </span>
      {note && <span style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.muted }}>{note}</span>}
    </div>
  );
}

export function Quadrant({
  dark,
  heading,
  style,
  xAxis,
  yAxis,
  xRange = ["低", "高"],
  yRange = ["低", "高"],
  xNote,
  yNote,
  cells,
  lead,
  takeaway,
  tone = "blue",
}: QuadrantProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  const aside = Boolean(lead || takeaway);

  const axisLabel = (name: string, range: [string, string]) => `${name} ${range[0]} → ${range[1]}`;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", gap: DGAP.md, minHeight: 0 }}>
        {aside && (
          <div style={{ flex: "none", width: "31%", display: "flex", flexDirection: "column", gap: DGAP.sm, minWidth: 0 }}>
            {lead && <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: DGAP.xs }}>
              <AxisNote kind="縱軸" name={yAxis} note={yNote} c={c} />
              <AxisNote kind="橫軸" name={xAxis} note={xNote} c={c} />
            </div>

            {takeaway && (
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: DS.small,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  color: c.ink,
                }}
              >
                <span style={{ flex: "none", width: 9, height: 9, borderRadius: 999, background: c.accent, marginTop: 6 }} />
                {takeaway}
              </div>
            )}
          </div>
        )}

        {/* 矩陣本體：左側縱軸標 + （四格 / 底部橫軸標） */}
        <div style={{ flex: 1, display: "flex", minWidth: 0, minHeight: 0 }}>
          <div style={{ flex: "none", width: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                whiteSpace: "nowrap",
                fontSize: DS.micro,
                fontWeight: 700,
                letterSpacing: DTRACK.label,
                color: c.muted,
              }}
            >
              {axisLabel(yAxis, yRange)}
            </span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: DGAP.xs,
                minHeight: 0,
                paddingLeft: DGAP.xs,
                paddingBottom: DGAP.xs,
                // 兩條軸線就是格線本身，不另外畫框 —— 少一層 chrome
                borderLeft: `2px solid ${c.border}`,
                borderBottom: `2px solid ${c.border}`,
              }}
            >
              {cells.map((cell, i) => (
                <Cell key={`${i}-${cell.title}`} cell={cell} c={c} dark={dark} t={t} />
              ))}
            </div>

            <div
              style={{
                flex: "none",
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: DS.micro,
                fontWeight: 700,
                letterSpacing: DTRACK.label,
                color: c.muted,
              }}
            >
              {axisLabel(xAxis, xRange)}
            </div>
          </div>
        </div>
      </div>
    </BlockShell>
  );
}
