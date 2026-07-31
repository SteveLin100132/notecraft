// <Stages> — 水平流程段（Task 34）。
// 出處：提案 P2 的 PAST → NOW → FUTURE、月會 P8 底部的外包前/中/後三色帶。
// 欄位沿用契約 v0.1 §4.4。

import type { IconName, SeriesTone, StatusTone } from "@/lib/decks";
import { ChevronRight } from "lucide-react";
import { DGAP, DS, DTRACK } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface StageItem {
  /** 段落標籤，如 "PAST · 過去" */
  tag?: string;
  icon?: IconName;
  title: string;
  desc?: string;
  tone?: SeriesTone | StatusTone;
  /** active = 當前段（實心強調）、dashed = 未來段（虛線） */
  variant?: "plain" | "active" | "dashed";
}

export interface StagesProps extends BlockBaseProps {
  items: StageItem[];
  /** 段與段之間是否畫箭頭。預設 true */
  arrows?: boolean;
}

const LIMIT = 5;

export function Stages({ dark, heading, style, items, arrows = true }: StagesProps) {
  const c = dkt(dark);
  warnOverLimit("Stages", items.length, LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: DGAP.xs, minHeight: 0 }}>
        {items.map((it, i) => {
          const t = toneColor(it.tone, c);
          const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
          const variant = it.variant ?? "plain";
          const active = variant === "active";
          const dashed = variant === "dashed";
          return (
            <div key={it.title} style={{ flex: 1, display: "flex", alignItems: "center", gap: DGAP.xs, minWidth: 0 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: `${DGAP.sm}px`,
                  borderRadius: "var(--radius-md)",
                  background: active ? t.soft : dark ? c.sunken : "var(--neutral-50)",
                  border: `${active ? 2 : 1}px ${dashed ? "dashed" : "solid"} ${active ? t.fg : c.border}`,
                }}
              >
                {(it.tag || icon) && (
                  <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs }}>
                    {icon && (
                      <span style={{ display: "inline-flex", color: t.fg }}>
                        <DeckIcon name={icon} size={20} />
                      </span>
                    )}
                    {it.tag && (
                      <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: t.fg }}>
                        {it.tag}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
                  {it.title}
                </div>
                {it.desc && <div style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{it.desc}</div>}
              </div>

              {arrows && i < items.length - 1 && (
                <span style={{ flex: "none", display: "inline-flex", color: c.muted }}>
                  <ChevronRight size={26} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
