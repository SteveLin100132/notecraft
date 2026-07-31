// <Rows> — N 列清單，每列可帶右欄註記（Task 34）。
// 出處：提案 P2 Notion 五大痛點、月會 P3 剩餘 Issue 類型。
// 欄位沿用契約 v0.1 §4.2（已通過 17 頁驗證），僅 tone 改為 SeriesTone | StatusTone。

import type { IconName, SeriesTone, StatusTone } from "@/lib/decks";
import { DGAP, DS } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface RowItem {
  /** 列編號。**只在內容真的是序列時才給** —— 不給就不渲染，元件不會自動補 01/02/03 */
  n?: string;
  icon?: IconName;
  /** 粗標，如「資料分散」 */
  k: string;
  /** 主述，如「跨 DB 關聯，無法像 RDB 做複雜查詢」 */
  v?: string;
  /** 細描述（小字） */
  desc?: string;
  /** 右欄標籤，如「影響」 */
  noteLabel?: string;
  /** 右欄內容 */
  note?: string;
  /** 左側色條 */
  tone?: SeriesTone | StatusTone;
}

export interface RowsProps extends BlockBaseProps {
  items: RowItem[];
  /** 右欄寬度（px @1600 座標系）。預設 380 */
  noteWidth?: number;
  /**
   * `k` 的呈現方式（Task 42）。預設 `"plain"`（= Task 34 的原始外觀，不給時完全不變）。
   * `"chip"` 把 `k` 畫成彩色標籤 —— 出處 nifi p3 的痛點列、tus p5 的困難點列、
   * bullmq p5 的特色列（docs/deck-atoms-inventory.md §2 F2）。
   */
  variant?: "plain" | "chip";
  /** chip 欄寬（px @1600 座標系）。預設 200 */
  chipWidth?: number;
}

const LIMIT = 6;

export function Rows({ dark, heading, style, items, noteWidth = 380, variant = "plain", chipWidth = 200 }: RowsProps) {
  const c = dkt(dark);
  warnOverLimit("Rows", items.length, LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
        {items.map((it) => {
          const t = toneColor(it.tone, c);
          const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
          return (
            <div
              key={it.k}
              style={{
                flex: 1,
                minHeight: 0,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: DGAP.sm,
                padding: `${DGAP.xs}px ${DGAP.sm}px`,
                borderRadius: "var(--radius-md)",
                background: dark ? c.sunken : "var(--neutral-50)",
                borderLeft: `4px solid ${t.fg}`,
              }}
            >
              {it.n && (
                <span
                  style={{
                    flex: "none",
                    width: 26,
                    fontFamily: "var(--font-mono)",
                    fontSize: DS.small,
                    fontWeight: 900,
                    color: c.muted,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {it.n}
                </span>
              )}
              {icon && (
                <span style={{ flex: "none", display: "inline-flex", color: t.fg }}>
                  <DeckIcon name={icon} size={22} />
                </span>
              )}

              {variant === "chip" ? (
                <div style={{ flex: "none", width: chipWidth }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: t.soft,
                      color: t.fg,
                      border: `1px solid ${t.fg}`,
                      fontSize: DS.small,
                      fontWeight: 800,
                      lineHeight: 1.35,
                      textWrap: "balance",
                    }}
                  >
                    {it.k}
                  </span>
                </div>
              ) : (
                <div style={{ flex: "none", width: 150 }}>
                  <div style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
                    {it.k}
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                {it.v && <div style={{ fontSize: DS.body, lineHeight: 1.5, color: c.body }}>{it.v}</div>}
                {it.desc && <div style={{ fontSize: DS.small, lineHeight: 1.5, color: c.muted, marginTop: 2 }}>{it.desc}</div>}
              </div>

              {(it.noteLabel || it.note) && (
                <div style={{ flex: "none", width: noteWidth, display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
                  {it.noteLabel && (
                    <span
                      style={{
                        flex: "none",
                        padding: "3px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: t.soft,
                        color: t.fg,
                        fontSize: DS.micro,
                        fontWeight: 800,
                      }}
                    >
                      {it.noteLabel}
                    </span>
                  )}
                  {it.note && <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{it.note}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
