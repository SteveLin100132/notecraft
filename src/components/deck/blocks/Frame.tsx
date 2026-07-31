// <Frame> — 瀏覽器 / 視窗 / 對話框擬真框（Task 41）。
//
// 出處（docs/deck-atoms-inventory.md §2 E2–E4）：
//   mfe p4（中央瀏覽器框包住微前端組合）、mfe p8–p11（框內放 UI 線框）
//   tus p2（上傳中對話框 + 錯誤紅框）、tus p13/p14（兩個視窗截圖並排）
//
// **只畫外框，不管內容** —— 內容是 children（截圖 <img>、UI 線框、<Terminal>、任意 JSX）。
// E3「UI 線框稿」不做成元件：那就是幾個灰色 <div>，custom 頁自己寫比填 props 快。
//
// 擬真程度刻意克制：畫出「這是一個瀏覽器」就夠，不仿真實 Chrome 的分頁 / 書籤列 /
// 擴充功能圖示 —— 那些是雜訊，而且畫得太像會讓裡面的線框內容顯得廉價
// （mfe p8–p11 的處理就很節制，以它為標準）。

import type { ReactNode } from "react";
import type { SeriesTone, StatusTone } from "@/lib/decks";
import { DGAP, DS } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt } from "./shell";

export type FrameKind = "browser" | "window" | "dialog";

export interface FrameProps extends BlockBaseProps {
  /** 預設 "browser" */
  kind?: FrameKind;
  /** browser 的網址列文字 */
  url?: string;
  /** window / dialog 的標題 */
  title?: string;
  /**
   * dialog 的狀態框（tus p2 的錯誤紅框）。
   * 傳 StatusTone 時**會同時畫出 icon**（audit A-6：色彩不可單獨承載語意）。
   */
  tone?: SeriesTone | StatusTone;
  children: ReactNode;
}

/** 視窗控制鈕的三個圓點（不模仿任何特定 OS 的配色） */
function Dots({ color }: { color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, flex: "none" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 9, height: 9, borderRadius: "var(--radius-circle)", background: color }} />
      ))}
    </span>
  );
}

export function Frame({ dark, heading, style, kind = "browser", url, title, tone, children }: FrameProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  const accented = tone !== undefined;
  const statusIcon = isStatusTone(tone) ? STATUS_ICON[tone] : undefined;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          border: `${accented ? 2 : 1}px solid ${accented ? t.fg : c.border}`,
          background: c.slide,
          boxShadow: c.shadowLg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: DGAP.sm,
            padding: `${DGAP.xs}px ${DGAP.sm}px`,
            borderBottom: `1px solid ${c.borderSoft}`,
            background: accented ? t.soft : c.sunken,
          }}
        >
          {kind !== "dialog" && <Dots color={c.seriesMuted} />}

          {kind === "browser" && (
            <span
              style={{
                flex: 1,
                minWidth: 0,
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                background: c.slide,
                border: `1px solid ${c.borderSoft}`,
                fontFamily: "var(--font-mono)",
                fontSize: DS.micro,
                color: c.muted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {url ?? ""}
            </span>
          )}

          {kind !== "browser" && (
            <span
              style={{
                flex: 1,
                minWidth: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: DS.micro,
                fontWeight: 800,
                color: accented ? t.fg : c.body,
              }}
            >
              {/* 狀態框一律 icon + 文字並行，不讓顏色單獨承載語意 */}
              {statusIcon && <DeckIcon name={statusIcon} size={16} />}
              {title ?? ""}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
      </div>
    </BlockShell>
  );
}
