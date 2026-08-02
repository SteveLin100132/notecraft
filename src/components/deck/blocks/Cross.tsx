// <Cross> — 兩個面向交叉推出結論（Task 45）。
//
// 構圖參考 dashi-ppt theme07「方法」頁：左欄導言 + 一列「A × B = C」的符號塊，右欄三張說明卡。
//
// 與 <Quadrant> 的分界 —— 兩者都吃兩個維度，但問的問題不同：
//   Quadrant 是**地圖**（把很多東西擺到兩軸上，看誰落在哪一格）
//   Cross 是**公式**（把兩個看事情的角度疊起來，推出一個新的看法）
// 一個有很多項目、一個只有一個結論。搞混會讓讀者以為右邊還有格子沒畫。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface CrossNote {
  label: string;
  desc: string;
}

export interface CrossProps extends BlockBaseProps {
  /** 第一個面向 */
  a: string;
  /** 第二個面向 */
  b: string;
  /** 交叉之後得到什麼 */
  result: string;
  /** 中間的運算符號，預設 "×" */
  operator?: string;
  lead?: string;
  /** 右欄說明卡，2–3 張 */
  notes?: CrossNote[];
  takeaway?: string;
  tone?: SeriesTone;
}

const NOTE_LIMIT = 3;

function Term({ text, c, fg, bg, strong }: { text: string; c: DeckThemeTokens; fg: string; bg: string; strong?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${DGAP.xs}px ${DGAP.sm}px`,
        borderRadius: "var(--radius-md)",
        background: bg,
        border: `${strong ? 2 : 1}px solid ${strong ? fg : c.borderSoft}`,
        color: fg,
        fontSize: DS.h4,
        fontWeight: 800,
        lineHeight: 1.25,
        textAlign: "center",
      }}
    >
      {text}
    </span>
  );
}

export function Cross({
  dark,
  heading,
  style,
  a,
  b,
  result,
  operator = "×",
  lead,
  notes,
  takeaway,
  tone = "blue",
}: CrossProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  const acc = toneColor("orange", c);
  warnOverLimit("Cross(說明卡)", notes?.length ?? 0, NOTE_LIMIT);

  const sym = (s: string) => (
    <span style={{ fontSize: DS.h3, fontWeight: 900, color: c.muted, lineHeight: 1 }}>{s}</span>
  );

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", gap: DGAP.xl, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.md, minWidth: 0 }}>
          {lead && <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>}

          {/* 公式列：A × B = C */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: DGAP.xs }}>
            <Term text={a} c={c} fg={t.fg} bg={t.soft} />
            {sym(operator)}
            <Term text={b} c={c} fg={t.fg} bg={t.soft} />
            {sym("=")}
            <Term text={result} c={c} fg={acc.fg} bg={acc.soft} strong />
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

        {notes?.length ? (
          <div style={{ flex: "none", width: "44%", display: "flex", flexDirection: "column", gap: DGAP.sm, minWidth: 0 }}>
            {notes.slice(0, NOTE_LIMIT).map((n) => (
              <div
                key={n.label}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 4,
                  boxSizing: "border-box",
                  padding: DGAP.sm,
                  borderRadius: "var(--radius-lg)",
                  background: dark ? c.sunken : "var(--neutral-50)",
                  border: `1px solid ${c.borderSoft}`,
                }}
              >
                <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>
                  {n.label}
                </span>
                <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{n.desc}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </BlockShell>
  );
}
