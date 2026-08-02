// <Spectrum> — 一維取捨光譜（Task 45）。
//
// 把幾個東西擺在**兩極之間**的一條軸上。<Quadrant> 是兩個維度、Spectrum 只有一個 ——
// 硬把單維資料塞進象限圖會逼出一個假的第二軸，那比少一張圖更糟。
//
// 與 <Chart variant="bars"> 的分界：bars 的每列各自從 0 起算；Spectrum 的位置是
// **相對於兩極**的，0 與 1 都是有名字的立場（如「全自製 ↔ 全外購」），不是「沒有」與「全部」。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface SpectrumMark {
  label: string;
  /** 位置，0（最左）–1（最右）。超出會夾回區間 */
  at: number;
  /** 為什麼落在這裡 */
  note?: string;
  emphasis?: boolean;
}

export interface SpectrumProps extends BlockBaseProps {
  /** 左極的名字 */
  left: string;
  /** 右極的名字 */
  right: string;
  marks: SpectrumMark[];
  lead?: string;
  takeaway?: string;
  tone?: SeriesTone;
}

const MARK_LIMIT = 5;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function Pole({ text, align, c }: { text: string; align: "left" | "right"; c: DeckThemeTokens }) {
  return (
    <span
      style={{
        flex: "none",
        maxWidth: "22%",
        fontSize: DS.h4,
        fontWeight: 800,
        lineHeight: 1.3,
        color: c.ink,
        textAlign: align,
      }}
    >
      {text}
    </span>
  );
}

export function Spectrum({ dark, heading, style, left, right, marks, lead, takeaway, tone = "blue" }: SpectrumProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Spectrum", marks.length, MARK_LIMIT);

  // 交錯上下擺放，避免位置相近的標籤疊在一起
  const above = marks.filter((_, i) => i % 2 === 0);
  const below = marks.filter((_, i) => i % 2 === 1);

  const Card = ({ m, side }: { m: SpectrumMark; side: "above" | "below" }) => {
    const on = m.emphasis === true;
    return (
      <div
        style={{
          position: "absolute",
          left: `${clamp01(m.at) * 100}%`,
          // 位移量跟著 at 走（0 → 0%、0.5 → -50%、1 → -100%），兩端的卡片才會
          // 貼齊軸的端點而不是騎出版心 —— 固定 -50% 會讓 at=0/1 的卡各突出半個卡寬，
          // 雖然不到被裁掉的程度，但整頁左右邊界會跟其他頁對不齊。
          transform: `translateX(-${clamp01(m.at) * 100}%)`,
          [side === "above" ? "bottom" : "top"]: 0,
          width: 190,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          boxSizing: "border-box",
          padding: `${DGAP.xs}px ${DGAP.sm}px`,
          borderRadius: "var(--radius-md)",
          background: on ? t.soft : dark ? c.sunken : "var(--neutral-50)",
          border: on ? `2px solid ${t.fg}` : `1px solid ${c.borderSoft}`,
        }}
      >
        <span style={{ fontSize: DS.small, fontWeight: 800, lineHeight: 1.3, color: on ? t.fg : c.ink }}>{m.label}</span>
        {m.note && <span style={{ fontSize: DS.micro, lineHeight: 1.4, color: c.muted }}>{m.note}</span>}
      </div>
    );
  };

  const Ticks = ({ items }: { items: SpectrumMark[] }) => (
    <div style={{ position: "relative", height: "100%" }}>
      {items.map((m) => (
        <span
          key={m.label}
          style={{
            position: "absolute",
            left: `${clamp01(m.at) * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            transform: "translateX(-50%)",
            background: m.emphasis ? t.fg : c.border,
          }}
        />
      ))}
    </div>
  );

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.sm, minHeight: 0 }}>
        {lead && <p style={{ margin: 0, flex: "none", fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* 上方標籤 */}
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            {above.map((m) => (
              <Card key={m.label} m={m} side="above" />
            ))}
          </div>
          <div style={{ flex: "none", height: 14 }}>
            <Ticks items={above} />
          </div>

          {/* 軸 */}
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: DGAP.sm }}>
            <Pole text={left} align="left" c={c} />
            <span style={{ flex: 1, height: 3, borderRadius: 999, background: c.border }} />
            <Pole text={right} align="right" c={c} />
          </div>

          <div style={{ flex: "none", height: 14 }}>
            <Ticks items={below} />
          </div>
          {/* 下方標籤 */}
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            {below.map((m) => (
              <Card key={m.label} m={m} side="below" />
            ))}
          </div>
        </div>

        {takeaway && (
          <div
            style={{
              flex: "none",
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
      </div>
    </BlockShell>
  );
}
