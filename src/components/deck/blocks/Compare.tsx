// <Compare> — 左右對比（Task 34）。
// 出處：提案 P4 方案取捨、P5 架構對照。
// 欄位沿用契約 v0.1 §4.8，唯一改動：移除 `blocks?: LeafBlock[]`（v0.2 已無 LeafBlock 聯集；
// 要在對比欄內放任意內容，由 `custom` 頁自己寫 JSX 或用 `children` 版面即可）。
//
// 與「單純左右分欄」的差別：Compare 有**對比語意** —— tag/name 表頭、中央 VS 軸、
// 建議徽章、pros/cons。只要版面分欄請直接寫 flex（契約 §5.3.1）。

import type { SeriesTone } from "@/lib/decks";
import { Check, X } from "lucide-react";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";
import type { DeckThemeTokens } from "./shell";

export interface CompareSide {
  /** 如「方案 A」 */
  tag: string;
  /** 如「整合 BizForm，借力現成簽核」 */
  name: string;
  /** 左 blue、右 orange 是慣例 */
  tone: SeriesTone;
  /** 如「建議」。用文字而非只有顏色標示推薦（audit A-6 的同一個道理） */
  badge?: string;
  /** k-v 對比列 */
  rows?: [string, string][];
  pros?: string[];
  cons?: string[];
}

export interface CompareProps extends BlockBaseProps {
  left: CompareSide;
  right: CompareSide;
  /** 中央軸文字，預設 "VS" */
  axis?: string;
}

const ROW_LIMIT = 6;

function ProsCons({ items, kind, c }: { items: string[]; kind: "pro" | "con"; c: DeckThemeTokens }) {
  const color = kind === "pro" ? c.good : c.critical;
  const Icon = kind === "pro" ? Check : X;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {items.map((t) => (
        <span key={t} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
          <span style={{ flex: "none", display: "inline-flex", color, marginTop: 2 }}>
            <Icon size={16} />
          </span>
          {t}
        </span>
      ))}
    </div>
  );
}

function Side({ side, c, dark }: { side: CompareSide; c: DeckThemeTokens; dark: boolean }) {
  const t = toneColor(side.tone, c);
  warnOverLimit("Compare(列)", side.rows?.length ?? 0, ROW_LIMIT);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: DGAP.xs,
        padding: `${DGAP.sm}px`,
        borderRadius: "var(--radius-lg)",
        background: dark ? c.sunken : "var(--neutral-50)",
        border: `1px solid ${c.borderSoft}`,
        borderTop: `3px solid ${t.fg}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs }}>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "var(--radius-sm)",
            background: t.soft,
            color: t.fg,
            fontSize: DS.micro,
            fontWeight: 800,
            letterSpacing: DTRACK.label,
          }}
        >
          {side.tag}
        </span>
        {side.badge && (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 999,
              background: c.goodSoft,
              color: c.good,
              fontSize: DS.micro,
              fontWeight: 800,
            }}
          >
            <Check size={14} />
            {side.badge}
          </span>
        )}
      </div>

      <div style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>{side.name}</div>

      {side.rows?.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {side.rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: DGAP.xs, alignItems: "baseline" }}>
              {/* 128px 容得下 8 個 CJK 字（如「派案／諮詢／報價」）—— 原本 108px 會斷在詞中間 */}
              <span style={{ flex: "none", width: 128, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>{k}</span>
              <span style={{ flex: 1, fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{v}</span>
            </div>
          ))}
        </div>
      ) : null}

      {side.pros?.length ? <ProsCons items={side.pros} kind="pro" c={c} /> : null}
      {side.cons?.length ? <ProsCons items={side.cons} kind="con" c={c} /> : null}
    </div>
  );
}

export function Compare({ dark, heading, style, left, right, axis = "VS" }: CompareProps) {
  const c = dkt(dark);
  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: DGAP.xs, minHeight: 0 }}>
        <Side side={left} c={c} dark={dark} />
        <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 64 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 46,
              height: 46,
              borderRadius: 999,
              background: c.slide,
              border: `1px solid ${c.border}`,
              fontSize: DS.micro,
              fontWeight: 900,
              letterSpacing: DTRACK.label,
              color: c.muted,
            }}
          >
            {axis}
          </span>
        </div>
        <Side side={right} c={c} dark={dark} />
      </div>
    </BlockShell>
  );
}
