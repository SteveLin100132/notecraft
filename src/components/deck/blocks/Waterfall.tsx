// <Waterfall> — 累計貢獻拆解（Task 43）。
//
// 構圖參考 dashi-ppt theme07「瀑布」頁：頭條總計數字 + 帶連接線的累計柱 + 基準線。
// 色票與字級改走本專案 token；識別色只用 brand / accent / seriesMuted 三個。
//
// 與 <Chart variant="bar"> 的分界：長條圖比較的是**彼此獨立的類別**；瀑布圖的每一根
// 都疊在前一根的頂端，回答的是「總數是怎麼一段一段累出來的」。沒有累計語意就別用它。
//
// 沿用 <Chart> 的兩條硬規則：不用 ResponsiveContainer（縮覽側欄 display:none 會量到 0 寬）、
// 不做 tooltip（投影片沒有 hover，數值一律直接標在圖元上）。

import { DGAP, DS, DTRACK } from "../scale";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface WaterfallStep {
  label: string;
  /** 這一段的**增量**（不是累計值）。負值畫成向下的一段 */
  value: number;
}

export interface WaterfallProps extends BlockBaseProps {
  /** 建議 3–6 段 */
  steps: WaterfallStep[];
  /** 給了就在最後補一根從基準線起算的總計柱 */
  totalLabel?: string;
  /** 數值單位，如「億」。只出現在標籤，不進 SVG 幾何 */
  unit?: string;
  /** 右上頭條數字（通常是總計） */
  headline?: { value: string; label: string };
  /** 頭條左側的導言 */
  lead?: string;
  /** 底部結論句 */
  takeaway?: string;
  /** 這個 block 的總寬（px @1600 座標系），由呼叫端從 area 算好傳入 */
  width?: number;
  /** **含 heading / 頭條列 / 結論列的總高** —— 畫布高由元件自己扣（同 <Chart>） */
  height?: number;
}

const STEP_LIMIT = 6;
const HEADING_H = Math.round(DS.h3 * 1.3) + DGAP.sm + 4;
const TOPROW_H = 78;
const FOOT_H = 30;
/** 柱頂數值標 + 柱底類別標各自佔掉的畫布高 */
const PAD_TOP = 30;
const PAD_BOTTOM = 40;

const fmt = (v: number, unit?: string) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}${unit ?? ""}`;

export function Waterfall({
  dark,
  heading,
  style,
  steps,
  totalLabel,
  unit,
  headline,
  lead,
  takeaway,
  width = 1200,
  height = 420,
}: WaterfallProps) {
  const c = dkt(dark);
  warnOverLimit("Waterfall", steps.length, STEP_LIMIT);

  const topRow = Boolean(lead || headline);
  const canvasH = Math.max(120, height - (heading ? HEADING_H : 0) - (topRow ? TOPROW_H : 0) - (takeaway ? FOOT_H : 0));

  // 累計序列：cum[i] 是第 i 段開始前的高度，cum[n] 是總計
  const cum: number[] = [0];
  for (const s of steps) cum.push(cum[cum.length - 1] + s.value);
  const total = cum[cum.length - 1];

  const bars = totalLabel ? steps.length + 1 : steps.length;
  // 尺度取「累計軌跡的最高點」而非總計 —— 中途高於總計時（有負段）柱子才不會超出畫布
  const peak = Math.max(...cum.map(Math.abs), Math.abs(total)) || 1;

  const plotTop = PAD_TOP;
  const plotH = Math.max(40, canvasH - PAD_TOP - PAD_BOTTOM);
  const baseY = plotTop + plotH;
  const y = (v: number) => baseY - (v / peak) * plotH;

  const slotW = width / bars;
  const barW = Math.min(slotW * 0.54, 120);
  const cx = (i: number) => slotW * i + slotW / 2;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {topRow && (
        <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: DGAP.lg, height: TOPROW_H }}>
          {lead && (
            <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>
          )}
          {headline && (
            <div style={{ flex: "none", textAlign: "right" }}>
              <div
                style={{
                  fontSize: DS.hero,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: DTRACK.tight,
                  color: c.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {headline.value}
              </div>
              <div style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, marginTop: 4 }}>{headline.label}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <svg width={width} height={canvasH} viewBox={`0 0 ${width} ${canvasH}`} role="img" aria-label={heading ?? "累計貢獻拆解"}>
          {/* 基準線 */}
          <line x1={0} y1={baseY} x2={width} y2={baseY} stroke={c.border} strokeWidth={2} />

          {steps.map((s, i) => {
            const from = cum[i];
            const to = cum[i + 1];
            const top = Math.min(y(from), y(to));
            const h = Math.max(2, Math.abs(y(from) - y(to)));
            const up = s.value >= 0;
            const x = cx(i) - barW / 2;
            return (
              <g key={`${i}-${s.label}`}>
                <rect x={x} y={top} width={barW} height={h} rx={4} fill={up ? c.brand : c.seriesMuted} />
                {/* 連接線：把這一段的頂端牽到下一根的起點，瀑布的「累計」語意就靠它 */}
                {i < steps.length - 1 && (
                  <line
                    x1={x + barW}
                    y1={y(to)}
                    x2={cx(i + 1) - barW / 2}
                    y2={y(to)}
                    stroke={c.border}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                )}
                <text
                  x={cx(i)}
                  y={top - 8}
                  textAnchor="middle"
                  fontSize={DS.small}
                  fontWeight={700}
                  fill={c.ink}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(s.value, unit)}
                </text>
                <text x={cx(i)} y={baseY + 22} textAnchor="middle" fontSize={DS.micro} fontWeight={700} fill={c.muted}>
                  {s.label}
                </text>
              </g>
            );
          })}

          {totalLabel && (
            <g>
              {/* 總計柱從基準線起算、用 accent 與各段區隔；標籤同時寫明「合計」，不讓顏色單獨承載語意 */}
              <line
                x1={cx(steps.length - 1) + barW / 2}
                y1={y(total)}
                x2={cx(steps.length) - barW / 2}
                y2={y(total)}
                stroke={c.border}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <rect
                x={cx(steps.length) - barW / 2}
                y={y(total)}
                width={barW}
                height={Math.max(2, baseY - y(total))}
                rx={4}
                fill={c.accent}
              />
              <text
                x={cx(steps.length)}
                y={y(total) - 8}
                textAnchor="middle"
                fontSize={DS.small}
                fontWeight={800}
                fill={c.ink}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {`${total}${unit ?? ""}`}
              </text>
              <text x={cx(steps.length)} y={baseY + 22} textAnchor="middle" fontSize={DS.micro} fontWeight={800} fill={c.ink}>
                {totalLabel}
              </text>
            </g>
          )}
        </svg>
      </div>

      {takeaway && (
        <div
          style={{
            flex: "none",
            height: FOOT_H,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: DS.small,
            fontWeight: 700,
            color: c.ink,
          }}
        >
          <span style={{ flex: "none", width: 9, height: 9, borderRadius: 999, background: c.accent }} />
          {takeaway}
        </div>
      )}
    </BlockShell>
  );
}
