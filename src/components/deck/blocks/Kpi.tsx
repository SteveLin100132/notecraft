// <Kpi> — 數字帶 / stat tile（Task 34）。
// 出處：月會 P3（62/91 + 4 小格）、提案 P6（165,690 + 兩個副指標）。
// 欄位沿用契約 v0.1 §4.5。
//
// dataviz 的規則在此落地：「單一數字 → stat tile，不要做成單柱長條圖或 2 片圓餅」。
// tabular-nums 只加在會縱向對齊的小數字上；**emphasis 大數字不加** —— 等寬數字讓
// 顯示級字號下的 `121` 看起來鬆散（dataviz 反樣式）。

import type { SeriesTone, StatusTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: SeriesTone | StatusTone;
  /** true = 大數字卡（hero）。一組 KPI 帶內最多一個 */
  emphasis?: boolean;
}

export interface KpiProps extends BlockBaseProps {
  items: KpiItem[];
}

const LIMIT = 5;

export function Kpi({ dark, heading, style, items }: KpiProps) {
  const c = dkt(dark);
  warnOverLimit("Kpi", items.length, LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: DGAP.sm, minHeight: 0 }}>
        {items.map((it) => {
          const t = toneColor(it.tone, c);
          const statusIcon = isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined;
          return (
            <div
              key={it.label}
              style={{
                // emphasis 卡按內容取寬（大數字不可被裁），其餘均分剩餘寬度
                flex: it.emphasis ? "0 0 auto" : "1 1 0",
                minWidth: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 4,
                padding: `${DGAP.sm}px`,
                borderRadius: "var(--radius-md)",
                background: it.emphasis ? t.soft : dark ? c.sunken : "var(--neutral-50)",
                border: `1px solid ${it.emphasis ? t.fg : c.borderSoft}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: DGAP.xs,
                  fontSize: DS.micro,
                  fontWeight: 800,
                  letterSpacing: DTRACK.label,
                  color: c.muted,
                }}
              >
                {/* 狀態色一律 icon + 文字並行，不讓色彩單獨承載語意 */}
                {statusIcon && (
                  <span style={{ display: "inline-flex", color: t.fg }}>
                    <DeckIcon name={statusIcon} size={16} />
                  </span>
                )}
                {it.label}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    // 對齊參考簡報的 KPI 字級（提案 P6 45pt ≈ 50px、月會 P3 44pt ≈ 49px）——
                    // DS.hero(116) 是封面／章節編號的尺度，放進數字帶會裁字也失衡
                    fontSize: it.emphasis ? DS.h1 : DS.h2,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: DTRACK.tight,
                    color: it.emphasis ? t.fg : c.ink,
                    whiteSpace: "nowrap",
                    // emphasis 大數字用比例數字（proportional）；小數字才等寬對齊
                    fontVariantNumeric: it.emphasis ? "normal" : "tabular-nums",
                  }}
                >
                  {it.value}
                </span>
                {it.unit && <span style={{ fontSize: DS.body, fontWeight: 700, color: c.muted }}>{it.unit}</span>}
              </div>

              {it.sub && <div style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{it.sub}</div>}
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
