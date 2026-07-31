// <Terminal> — 終端機 / CLI 輸出卡（Task 41）。
//
// 出處（docs/deck-atoms-inventory.md §2 A4 / A5）：
//   mfe p8–p11（`npx create-mf-app` 的互動問答，連用 4 頁）、dataint p32（`lb4 app`）
//   dataint p5/p33、tus p6/p11（npm 徽章 + 單行安裝指令）→ compact 模式
//
// 顏色一律取自 <Code> 的 `codeTone(dark)`，**不另配一套** ——
// 終端機與程式碼常出現在同一份簡報裡，色不一致會很明顯。
//
// 刻意不做：游標閃爍動畫。靜態畫面用不到，且縮覽頁掛十幾個計時器沒有意義。

import { DGAP, DS } from "../scale";
import { codeTone } from "./codeTokens";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

/**
 * 行的語意 —— 決定前綴與顏色：
 *   `cmd`    使用者輸入的指令（前綴 `>`）
 *   `prompt` CLI 的提問（前綴 `?`）
 *   `choice` 選項 / 被選中的值（縮排）
 *   `out`    一般輸出
 *   `dim`    次要輸出（版本號、路徑…）
 */
export type TermKind = "cmd" | "prompt" | "choice" | "out" | "dim";

export interface TermLine {
  text: string;
  kind?: TermKind;
}

export interface TerminalProps extends BlockBaseProps {
  /** 字串會自動以換行切開（全部視為 `out`）；要分語意時給 TermLine[] */
  lines: string | TermLine[];
  /** 視窗標題列（mfe p8 的「Host Application」） */
  title?: string;
  /** 單行安裝指令模式（A5）：無標題列、左側語言徽章 */
  compact?: boolean;
  /** compact 模式的徽章文字，如 "npm" */
  badge?: string;
}

/** 建議行數上限 —— 實測值，見 Task 41 實作記錄 */
const LIMIT_LINES = 18;

const PREFIX: Record<TermKind, string> = {
  cmd: ">",
  prompt: "?",
  choice: " ",
  out: " ",
  dim: " ",
};

function toLines(src: string | TermLine[]): TermLine[] {
  return typeof src === "string"
    ? src.replace(/\n$/, "").split("\n").map((text) => ({ text }))
    : src;
}

export function Terminal({ dark, heading, style, lines, title, compact = false, badge }: TerminalProps) {
  const c = dkt(dark);
  const tone = codeTone(dark);
  const items = toLines(lines);
  const lh = Math.round(DS.small * 1.7);

  // 各語意取 codeTone 的哪一格 —— 對齊 mfe p8–p11 的配色習慣
  const colorOf = (k: TermKind) =>
    k === "cmd"
      ? tone.string.color
      : k === "prompt"
        ? tone.keyword.color
        : k === "choice"
          ? tone.attr.color
          : k === "dim"
            ? tone.punct.color
            : tone.plain.color;

  if (!compact) warnOverLimit("Terminal", items.length, LIMIT_LINES);
  if (!items.length) return null;

  // ── compact：單行安裝指令（tus p6 / dataint p5 的樣子）─────────────────────
  if (compact) {
    return (
      <BlockShell heading={heading} c={c} style={{ flex: "none", ...style }}>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${c.border}`,
            background: c.codeSurface,
            overflow: "hidden",
          }}
        >
          {badge && (
            <span
              style={{
                flex: "none",
                display: "inline-flex",
                alignItems: "center",
                padding: `0 ${DGAP.sm}px`,
                background: c.codeHeader,
                borderRight: `1px solid ${c.borderSoft}`,
                fontFamily: "var(--font-mono)",
                fontSize: DS.micro,
                fontWeight: 800,
                letterSpacing: ".06em",
                color: c.muted,
              }}
            >
              {badge}
            </span>
          )}
          <code
            style={{
              flex: 1,
              minWidth: 0,
              padding: `${DGAP.xs}px ${DGAP.sm}px`,
              fontFamily: "var(--font-mono)",
              fontSize: DS.small,
              lineHeight: `${lh}px`,
              color: tone.plain.color,
              whiteSpace: "pre",
              overflow: "hidden",
            }}
          >
            {items.map((l) => l.text).join(" ")}
          </code>
        </div>
      </BlockShell>
    );
  }

  // ── 完整視窗 ─────────────────────────────────────────────────────────────
  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${c.border}`,
          background: c.codeSurface,
          overflow: "hidden",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: DGAP.xs,
              padding: `${DGAP.xs}px ${DGAP.sm}px`,
              borderBottom: `1px solid ${c.borderSoft}`,
              background: c.codeHeader,
              fontSize: DS.micro,
              fontWeight: 700,
              color: c.body,
            }}
          >
            {title}
          </div>
        )}
        <div style={{ padding: `${DGAP.xs}px ${DGAP.sm}px` }}>
          {items.map((l, i) => {
            const k = l.kind ?? "out";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  height: lh,
                  fontFamily: "var(--font-mono)",
                  fontSize: DS.small,
                  lineHeight: `${lh}px`,
                  paddingLeft: k === "choice" ? DGAP.md : 0,
                }}
              >
                <span style={{ flex: "none", width: 10, color: c.muted, userSelect: "none" }}>{PREFIX[k]}</span>
                <span style={{ flex: 1, minWidth: 0, color: colorOf(k), whiteSpace: "pre", overflow: "hidden" }}>
                  {l.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </BlockShell>
  );
}
