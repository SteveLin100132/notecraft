// <Share> — 分段佔比條（Task 45）。
//
// 構圖參考 dashi-ppt theme07「集中度」頁下半：一條分層佔比條 + 底下的刻度標籤列。
//
// 存在的理由是補 <Chart variant="donut"> 的 3 片硬上限。**這不是放寬那條規則** ——
// donut 限 3 片是因為圓弧角度難比較，色票也只有 3 個識別色；一條線性條沒有這個問題：
// 長度可以直接比、而且每段都在自己下方標了名字與百分比，**顏色不承載身分**。
// 所以這裡最多 6 段，但只有 emphasis 段用識別色，其餘一律 seriesMuted，靠交替明度區隔相鄰段。
//
// 與 <Chart variant="bars"> 的分界：bars 是各自獨立的完成度（加起來不必是 100%）；
// Share 的各段**必然構成一個整體**，回答的是「這 100% 是怎麼分掉的」。

import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface ShareSegment {
  label: string;
  /** 相對量，元件自行換算成百分比（不必自己先算成 100） */
  value: number;
  /** 重點段。建議只標一段 */
  emphasis?: boolean;
}

export interface ShareProps extends BlockBaseProps {
  segments: ShareSegment[];
  lead?: string;
  /** 條的上方小標，如「融資額份額 · 按機構排名分層」 */
  axisLabel?: string;
  takeaway?: string;
  tone?: SeriesTone;
}

const SEG_LIMIT = 6;
const BAR_H = 54;

export function Share({ dark, heading, style, segments, lead, axisLabel, takeaway, tone = "blue" }: ShareProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Share", segments.length, SEG_LIMIT);

  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const pct = (v: number) => (v / total) * 100;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.md, minHeight: 0 }}>
        {lead && <p style={{ margin: 0, flex: "none", fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>}

        <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: DGAP.xs }}>
          {axisLabel && (
            <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>
              {axisLabel}
            </span>
          )}

          <div style={{ display: "flex", height: BAR_H, borderRadius: "var(--radius-md)", overflow: "hidden", gap: 2 }}>
            {segments.map((s, i) => (
              <div
                key={s.label}
                style={{
                  width: `${pct(s.value)}%`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 0,
                  // 非重點段交替明度，讓相鄰兩段分得開 —— 不是第 4、5 個識別色
                  background: s.emphasis ? t.fg : c.seriesMuted,
                  opacity: s.emphasis ? 1 : i % 2 === 0 ? 1 : 0.62,
                }}
              >
                <span
                  style={{
                    fontSize: DS.small,
                    fontWeight: 800,
                    color: s.emphasis ? c.slide : c.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.round(pct(s.value))}%
                </span>
              </div>
            ))}
          </div>

          {/* 標籤列：寬度與各段對齊，身分由文字承載而非顏色 */}
          <div style={{ display: "flex", gap: 2 }}>
            {segments.map((s) => (
              <span
                key={s.label}
                style={{
                  width: `${pct(s.value)}%`,
                  minWidth: 0,
                  paddingTop: 2,
                  borderTop: `2px solid ${s.emphasis ? t.fg : c.borderSoft}`,
                  fontSize: DS.micro,
                  fontWeight: s.emphasis ? 800 : 700,
                  color: s.emphasis ? c.ink : c.muted,
                  lineHeight: 1.35,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {takeaway && (
          <div
            style={{
              marginTop: "auto",
              flex: "none",
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
    </BlockShell>
  );
}
