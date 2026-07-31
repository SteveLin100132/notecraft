// Block 元件共用底座（Task 34）。
//
// 6 個 block 的共同職責：吃下設計工藝（DS 字級階梯、text-wrap: balance、tabular-nums、
// 狀態色 icon + 文字並行），讓 `custom` 頁 import 就自動達成，不必逐頁操心。
// 自己寫 JSX 的部分才要自己守（契約 §5.3）。

import type { CSSProperties, ReactNode } from "react";
import { DGAP, DS, DTRACK } from "../scale";
import type { DeckThemeTokens } from "../theme";
import { dkt } from "../theme";

export type { DeckThemeTokens };
export { dkt };

/** 所有 block 的共同 props */
export interface BlockBaseProps {
  /** 取色一律經 dkt(dark)，不硬編色碼 */
  dark: boolean;
  heading?: string;
  style?: CSSProperties;
}

/**
 * 超過建議上限時在 dev 提醒（契約 §7.1）。
 *
 * v0.2 已無型別層的密度保護 —— 上限改由 SKILL 規則、溢出偵測與截圖驗證把關，
 * 這裡只是最早的一道提示，不阻斷渲染。
 */
export function warnOverLimit(block: string, n: number, limit: number): void {
  if (import.meta.env.DEV && n > limit) {
    console.warn(`[deck/${block}] ${n} 項超過建議上限 ${limit} —— 建議切頁（契約 §7.1）`);
  }
}

/** 區塊標題。給了才渲染。 */
export function BlockHeading({ text, c }: { text?: string; c: DeckThemeTokens }) {
  if (!text) return null;
  return (
    <div
      style={{
        fontSize: DS.h3,
        fontWeight: 800,
        lineHeight: 1.3,
        letterSpacing: DTRACK.tight,
        color: c.ink,
        textWrap: "balance",
        marginBottom: DGAP.sm,
      }}
    >
      {text}
    </div>
  );
}

/** 區塊外殼：標題 + 內容，內容以 flex 撐滿剩餘高度 */
export function BlockShell({
  heading,
  c,
  style,
  children,
}: {
  heading?: string;
  c: DeckThemeTokens;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        // 預設在 flex 欄裡分享剩餘高度（custom 頁最常見的「填滿投影片」情境）。
        // 用 basis auto 而非 0：父層高度未定時仍以內容高度渲染，不會塌成 0 而消失。
        // 想固定為自然高度就傳 style={{ flex: "none" }}。非 flex 父層會忽略此值。
        flex: "1 1 auto",
        ...style,
      }}
    >
      <BlockHeading text={heading} c={c} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
