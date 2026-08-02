// <Code> — 程式碼呈現原子（Task 38）。
//
// 出處：94 頁技術簡報盤點裡最大的單一缺口（36 頁，見 docs/deck-atoms-inventory.md §1.2）。
// 一個元件涵蓋四種圖例：
//   A1 行內註解碼塊（每行右側掛註解）      → CodeLine.note
//   A2 引線標註碼塊（左側標籤引到某段）    → labels
//   A3 逐步高亮碼塊（跨頁換高亮 + 淡化）   → highlight + startLine
//   A6 設定檔卡（檔名標頭）                → fileName / lang
//
// 語法上色與筆記內文**共用同一支 tokenizer**（@/lib/code-tokenize），
// 色彩由 codeTokens.ts 依明暗取（亮色逐項對齊筆記端的 .nc-cb__t--*）。
//
// 刻意不做的事：
//   - **沒有複製鈕**：投影片沒有「複製程式碼」這個使用情境，那是筆記內文的功能。
//   - **沒有捲軸**：投影片是 overflow:hidden 的靜態畫布，內容放不下就該切頁或縮字級，
//     不能靠捲動掩蓋（契約 §7）。
//   - **標記不可互動**：`(n)!` 在筆記端是可點的註解標記，在這裡只是靜態編號徽章。

import type { CodePart } from "@/lib/code-tokenize";
import { expandLineRanges, tokenizeLine } from "@/lib/code-tokenize";
import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS } from "../scale";
import { toneColor } from "../SlideChrome";
import { codeTone } from "./codeTokens";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface CodeLine {
  text: string;
  /** 行尾註解欄的文字（dataint p6–p11 那種右側淡框中文註解） */
  note?: string;
}

export interface CodeLabel {
  text: string;
  /** 引到哪個行區間（**顯示行號**，含 startLine 偏移；單行就給 [n, n]） */
  lines: [number, number];
  tone?: SeriesTone;
}

export interface CodeProps extends BlockBaseProps {
  /** 字串會自動以換行切開；要掛行尾註解時給 CodeLine[] */
  lines: string | CodeLine[];
  /** 語言標籤（顯示於標頭，如 "ts"）。純顯示用，不影響 tokenize */
  lang?: string;
  fileName?: string;
  /** 行號起算值。預設 1；tus p7–p10 那種「同一支檔案的下半段」給 28 / 60 */
  startLine?: number;
  /** 要強調的行（顯示行號）。給了之後其餘行自動淡化 */
  highlight?: (number | [number, number])[];
  /** 左側標籤 + 指向行區間 */
  labels?: CodeLabel[];
  /** 行尾註解欄寬（px @1600 座標系）。預設 300 */
  noteWidth?: number;
  /** 左側標籤欄寬（px @1600 座標系）。預設 190 */
  labelWidth?: number;
  /** 字級。預設 "sm"（DS.small）；行數多時用 "xs"（DS.micro） */
  size?: "sm" | "xs";
  showLineNumbers?: boolean;
}

/**
 * 建議行數上限 —— 實測值（Task 38）。
 *
 * 量法：`custom` 頁（含標題 + callout）的 `area` 實測為 1392×538，
 * 扣掉檔名標頭 34 + 上下內距 16 後剩 488px。除以行高得：
 *   size="sm"（lh 30）→ 16 行 ／ size="xs"（lh 25）→ 19 行
 * 沒有 callout / 註腳的頁 `area.h` 較大（約 640），可再多約 5 / 6 行 ——
 * 這裡取**較嚴的那組**當建議值，超過就該切頁。
 */
const LIMIT_LINES = { sm: 16, xs: 19 } as const;

/**
 * 單行字元數的警戒線。投影片沒有捲軸，超出的部分會被靜靜裁掉（只留右緣淡出當提示），
 * 所以要在 dev 就喊出來。
 *
 * 元件拿不到 `area.w`（那是 `custom` 頁的參數），故以標準內容頁寬 1392 為假設值，
 * 扣掉本次實際用到的欄寬再估算 —— 只用於警告，不影響渲染。
 */
const ASSUMED_AREA_W = 1392;
const MONO_CHAR_RATIO = 0.6;

/**
 * 過長行的右緣淡出（見 <code> 的 maskImage 註解）。
 * 這裡的 `#000` 是遮罩的 **alpha 通道**（不透明 = 保留），不是顏色 ——
 * 不受「禁硬編色碼」規則約束，換成任何不透明色結果都一樣。
 */
const FADE_MASK = "linear-gradient(to right, #000 calc(100% - 28px), transparent 100%)";

function toLines(src: string | CodeLine[]): CodeLine[] {
  return typeof src === "string" ? src.replace(/\n$/, "").split("\n").map((text) => ({ text })) : src;
}

function renderParts(parts: CodePart[], dark: boolean, accent: string) {
  const tone = codeTone(dark);
  return parts.map((p, i) => {
    if (p.kind === "space") return <span key={i}>{p.text}</span>;
    if (p.kind === "marker") {
      return (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.5em",
            height: "1.5em",
            margin: "0 .25em",
            borderRadius: "50%",
            background: accent,
            color: "var(--neutral-0)",
            fontSize: ".8em",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            verticalAlign: "middle",
          }}
        >
          {p.n}
        </span>
      );
    }
    return (
      <span key={i} style={tone[p.cat]}>
        {p.text}
      </span>
    );
  });
}

export function Code({
  dark,
  heading,
  style,
  lines,
  lang,
  fileName,
  startLine = 1,
  highlight,
  labels,
  noteWidth = 300,
  labelWidth = 190,
  size = "sm",
  showLineNumbers = true,
}: CodeProps) {
  const c = dkt(dark);
  const items = toLines(lines);
  const fontSize = size === "xs" ? DS.micro : DS.small;
  // 行高寫死成 px（不是倍數）—— 左側標籤欄靠 top/height 對齊行，
  // 兩邊必須是同一個常數，否則標籤會慢慢跑掉。
  const lh = Math.round(fontSize * 1.75);

  const hl = highlight?.length ? expandLineRanges(highlight) : null;
  const hasNotes = items.some((it) => it.note);
  const accent = toneColor("orange", c).fg;

  warnOverLimit("Code", items.length, LIMIT_LINES[size]);
  if (import.meta.env.DEV && items.length) {
    const codeW =
      ASSUMED_AREA_W -
      (labels?.length ? labelWidth : 0) -
      (hasNotes ? noteWidth + DGAP.sm : 0) -
      (showLineNumbers ? 52 : 0) -
      DGAP.sm * 2;
    const maxChars = Math.floor(codeW / (fontSize * MONO_CHAR_RATIO));
    const longest = items.reduce((m, it) => Math.max(m, it.text.length), 0);
    if (longest > maxChars) {
      console.warn(`[deck/Code] 最長行 ${longest} 字元，估計可容 ${maxChars} —— 投影片無捲軸，超出部分會被裁掉`);
    }
  }

  // 沒有內容就什麼都不畫 —— 空的檔名標頭 + 空框只是雜訊，
  // 而且會讓「資料忘了填」看起來像「這裡本來就長這樣」。
  if (!items.length) return null;

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
        {(fileName || lang) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: DGAP.sm,
              padding: `${DGAP.xs}px ${DGAP.sm}px`,
              borderBottom: `1px solid ${c.borderSoft}`,
              background: c.codeHeader,
            }}
          >
            {lang && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: DS.micro,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  color: c.muted,
                }}
              >
                {lang.toUpperCase()}
              </span>
            )}
            {fileName && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: DS.micro, color: c.body }}>{fileName}</span>
            )}
          </div>
        )}

        <div style={{ display: "flex", padding: `${DGAP.xs}px 0` }}>
          {/* 左側標籤欄：以 top/height 定位，與行號共用同一個 lh */}
          {labels?.length ? (
            <div style={{ flex: "none", width: labelWidth, position: "relative" }}>
              {labels.map((lb) => {
                const t = toneColor(lb.tone ?? "blue", c);
                const from = Math.min(...lb.lines);
                const to = Math.max(...lb.lines);
                const top = (from - startLine) * lh;
                const height = (to - from + 1) * lh;
                return (
                  <div
                    key={`${lb.text}-${from}`}
                    style={{
                      position: "absolute",
                      top,
                      height,
                      left: 0,
                      right: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      paddingLeft: DGAP.sm,
                    }}
                  >
                    <span
                      style={{
                        flex: "none",
                        maxWidth: labelWidth - 46,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: t.soft,
                        color: t.fg,
                        border: `1px solid ${t.fg}`,
                        fontSize: DS.micro,
                        fontWeight: 800,
                        lineHeight: 1.4,
                      }}
                    >
                      {lb.text}
                    </span>
                    <span style={{ flex: 1, height: 1, borderTop: `1px dashed ${t.fg}`, opacity: 0.7 }} />
                    {/* 跨多行時畫 `[` 括號把整段框住；單行只留虛線 */}
                    {to > from && (
                      <span
                        style={{
                          flex: "none",
                          width: 8,
                          height: height - 6,
                          borderLeft: `2px solid ${t.fg}`,
                          borderTop: `2px solid ${t.fg}`,
                          borderBottom: `2px solid ${t.fg}`,
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div style={{ flex: 1, minWidth: 0 }}>
            {items.map((it, i) => {
              const no = startLine + i;
              const on = !hl || hl.has(no);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    height: lh,
                    background: hl?.has(no) ? c.accentSoft : undefined,
                    opacity: on ? 1 : 0.34,
                  }}
                >
                  {showLineNumbers && (
                    <span
                      style={{
                        flex: "none",
                        width: 52,
                        paddingRight: DGAP.xs,
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontSize,
                        lineHeight: `${lh}px`,
                        color: c.muted,
                        fontVariantNumeric: "tabular-nums",
                        userSelect: "none",
                      }}
                    >
                      {no}
                    </span>
                  )}
                  <code
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize,
                      lineHeight: `${lh}px`,
                      whiteSpace: "pre",
                      overflow: "hidden",
                      color: codeTone(dark).plain.color,
                      // 右緣淡出：投影片無捲軸，過長的行一定會被裁。硬切看起來像「就這麼長」，
                      // 淡出至少讀得出「後面還有」。短行碰不到淡出區，等於沒有作用。
                      maskImage: FADE_MASK,
                      WebkitMaskImage: FADE_MASK,
                    }}
                  >
                    {renderParts(tokenizeLine(it.text), dark, accent)}
                  </code>
                  {hasNotes && (
                    <span
                      style={{
                        flex: "none",
                        width: noteWidth,
                        marginLeft: DGAP.sm,
                        paddingRight: DGAP.sm,
                        fontSize: DS.micro,
                        lineHeight: `${lh}px`,
                        color: c.body,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {it.note && (
                        <span
                          style={{
                            padding: "1px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: c.codeHeader,
                            border: `1px solid ${c.borderSoft}`,
                          }}
                        >
                          {it.note}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BlockShell>
  );
}
