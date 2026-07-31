// <Cards> — N 欄卡片，可分組帶色帶（Task 34）。
// 出處：月會 P6 四張 workstream 卡、P8 五步驟、P9 八場會議、提案 P4 共同基礎三卡。
// 欄位沿用契約 v0.1 §4.3。

import type { IconName, SeriesTone, StatusTone } from "@/lib/decks";
import { DGAP, DS, DTRACK } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface CardItem {
  /** 卡片編號。**只在內容真的是序列時才給**（流程步驟、時序）；平行清單不給 */
  n?: string;
  icon?: IconName;
  title: string;
  desc?: string;
  /** 卡內 bullet */
  points?: string[];
  /** 卡底小字，如「至少一次 · 外包前」 */
  meta?: string;
  /** owner chip，如「工程師團隊」 */
  chips?: string[];
  /** 右上角徽章，如「建議」 */
  badge?: string;
  /** 卡片頂線色 */
  tone?: SeriesTone | StatusTone;
}

/** 欄群組色帶，如「外包前 3 欄 / 外包中 1 欄 / 外包後 4 欄」 */
export interface CardGroup {
  label: string;
  tone?: SeriesTone | StatusTone;
  span: number;
}

export interface CardsProps extends BlockBaseProps {
  columns?: 2 | 3 | 4 | 5 | 6;
  groups?: CardGroup[];
  items: CardItem[];
}

const LIMIT = 6;

export function Cards({ dark, heading, style, columns, groups, items }: CardsProps) {
  const c = dkt(dark);
  warnOverLimit("Cards", items.length, LIMIT);
  const cols = columns ?? (Math.min(items.length, LIMIT) as NonNullable<CardsProps["columns"]>);
  const grid = `repeat(${cols}, 1fr)`;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {groups?.length ? (
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: DGAP.sm, marginBottom: DGAP.xs }}>
          {groups.map((g) => {
            const t = toneColor(g.tone, c);
            return (
              <div
                key={g.label}
                style={{
                  gridColumn: `span ${g.span}`,
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: t.soft,
                  color: t.fg,
                  fontSize: DS.micro,
                  fontWeight: 800,
                  letterSpacing: DTRACK.label,
                  textAlign: "center",
                }}
              >
                {g.label}
              </div>
            );
          })}
        </div>
      ) : null}

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: grid, gap: DGAP.sm, minHeight: 0 }}>
        {items.map((it) => {
          const t = toneColor(it.tone, c);
          const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
          return (
            <div
              key={it.title}
              style={{
                boxSizing: "border-box",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: DGAP.xs,
                padding: `${DGAP.sm}px`,
                borderRadius: "var(--radius-md)",
                background: dark ? c.sunken : "var(--neutral-50)",
                border: `1px solid ${c.borderSoft}`,
                borderTop: `3px solid ${t.fg}`,
              }}
            >
              {it.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: DGAP.xs,
                    right: DGAP.xs,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: t.soft,
                    color: t.fg,
                    fontSize: DS.micro,
                    fontWeight: 800,
                  }}
                >
                  {it.badge}
                </span>
              )}

              {(it.n || icon) && (
                <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs }}>
                  {it.n && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: DS.h4,
                        fontWeight: 900,
                        color: t.fg,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {it.n}
                    </span>
                  )}
                  {icon && (
                    <span style={{ display: "inline-flex", color: t.fg }}>
                      <DeckIcon name={icon} size={22} />
                    </span>
                  )}
                </div>
              )}

              <div style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
                {it.title}
              </div>
              {it.desc && <div style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{it.desc}</div>}

              {it.points?.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 2 }}>
                  {it.points.map((p) => (
                    <li key={p} style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}

              {it.chips?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>
                  {it.chips.map((ch) => (
                    <span
                      key={ch}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: c.slide,
                        border: `1px solid ${c.border}`,
                        fontSize: DS.micro,
                        color: c.body,
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              ) : null}

              {it.meta && (
                <div style={{ fontSize: DS.micro, color: c.muted, marginTop: it.chips?.length ? 0 : "auto" }}>{it.meta}</div>
              )}
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
