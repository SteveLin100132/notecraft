// <Ranking> — 排序榜（Task 44）。
//
// 構圖參考 dashi-ppt theme07「排名」頁：每列是 `名次 / 名稱 / 量條 / 數值` 的四欄格，
// 十列等高排滿。色票與字級改走本專案 token。
//
// 與 <Chart variant="bars"> 的分界：bars 是「一排完成度」，讀的是每條各自的百分比；
// Ranking 讀的是**順序**——名次本身是資訊，量條只是讓差距看得見。沒有排序語意就用 bars。
// 與 <Table> 的分界：Table 是多維交叉，Ranking 只有一個量值維度。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface RankItem {
  label: string;
  /** 排序與量條長度的依據 */
  value: number;
  /** 名稱下方的細註 */
  meta?: string;
  /**
   * 與前期的變化。**只以文字符號 + 數字呈現，不上狀態色** ——
   * 「上升」在不同題目裡可能是好事也可能是壞事，用綠紅會替讀者做掉判斷。
   */
  delta?: number;
}

export interface RankingProps extends BlockBaseProps {
  /** **呼叫端自己排好序**，元件不重排 —— 免得「畫面順序」與「資料順序」不一致時無從追查 */
  items: RankItem[];
  unit?: string;
  /** 前 N 名視為重點，量條與名次改用識別色。預設 0（不標） */
  highlightTop?: number;
  lead?: string;
  /** 右上口徑說明 */
  note?: string;
  tone?: SeriesTone;
}

const ITEM_LIMIT = 8;

const fmtDelta = (d: number) => `${d > 0 ? "▲" : d < 0 ? "▼" : "—"}${d === 0 ? "" : Math.abs(d)}`;

function Row({
  item,
  rank,
  max,
  on,
  c,
  t,
  unit,
}: {
  item: RankItem;
  rank: number;
  max: number;
  on: boolean;
  c: DeckThemeTokens;
  t: { fg: string; soft: string };
  unit?: string;
}) {
  const pct = max > 0 ? (item.value / max) * 100 : 0;
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "40px minmax(140px, 1.5fr) 3fr 96px",
        alignItems: "center",
        gap: DGAP.sm,
        borderBottom: `1px solid ${c.borderSoft}`,
      }}
    >
      <span
        style={{
          fontSize: DS.h4,
          fontWeight: 900,
          letterSpacing: DTRACK.tight,
          color: on ? t.fg : c.muted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(rank).padStart(2, "0")}
      </span>

      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: DS.body, fontWeight: on ? 800 : 700, color: c.ink, lineHeight: 1.3 }}>{item.label}</span>
        {item.meta && <span style={{ fontSize: DS.micro, color: c.muted, lineHeight: 1.3 }}>{item.meta}</span>}
      </span>

      <span style={{ height: 12, borderRadius: 999, background: c.sunken, overflow: "hidden", minWidth: 0 }}>
        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: on ? t.fg : c.seriesMuted }} />
      </span>

      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 6 }}>
        <span style={{ fontSize: DS.body, fontWeight: 800, color: c.ink, fontVariantNumeric: "tabular-nums" }}>
          {item.value}
          {unit && <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, marginLeft: 2 }}>{unit}</span>}
        </span>
        {item.delta !== undefined && (
          <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, fontVariantNumeric: "tabular-nums" }}>
            {fmtDelta(item.delta)}
          </span>
        )}
      </span>
    </div>
  );
}

export function Ranking({
  dark,
  heading,
  style,
  items,
  unit,
  highlightTop = 0,
  lead,
  note,
  tone = "blue",
}: RankingProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Ranking", items.length, ITEM_LIMIT);

  const max = Math.max(...items.map((i) => i.value), 0);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {(lead || note) && (
        <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: DGAP.lg, marginBottom: DGAP.sm }}>
          {lead && <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>}
          {note && <span style={{ flex: "none", fontSize: DS.micro, color: c.muted, textAlign: "right" }}>{note}</span>}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {items.map((item, i) => (
          <Row
            key={item.label}
            item={item}
            rank={i + 1}
            max={max}
            on={i < highlightTop}
            c={c}
            t={t}
            unit={unit}
          />
        ))}
      </div>
    </BlockShell>
  );
}
