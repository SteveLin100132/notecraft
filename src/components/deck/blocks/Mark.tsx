// <Mark> — 行內螢光筆（Task 41）。
//
// 出處：盤點的 5 份簡報**全都大量使用**，是本批出現頻率最高的視覺手法
// （docs/deck-atoms-inventory.md §2 F1 表 F4）。
//
// 這個元件只有一個 <span>，存在的理由不是省程式碼，而是**擋住硬編色碼** ——
// 不做的話 AI 一定會寫 `<span style={{background:"#ffe58f"}}>`，
// 那正是契約 §1.2 說 v0.2 把設計決策下移到原子層要防的退化。

import type { ReactNode } from "react";
import type { SeriesTone, StatusTone } from "@/lib/decks";
import { toneColor } from "../SlideChrome";
import { dkt } from "./shell";

export interface MarkProps {
  dark: boolean;
  /** 預設 "orange"（對齊實證頁的螢光筆色） */
  tone?: SeriesTone | StatusTone;
  children: ReactNode;
}

export function Mark({ dark, tone = "orange", children }: MarkProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  return (
    <span
      style={{
        // 底色 = tone 的前景色調 26% 疊在底上（`color-mix` 專案既有用法，見 global.css:34）。
        // **不用 `t.soft`** —— 那是 50 階（亮色 `orange-50` #fdf4e6），疊在白底上幾乎看不出來，
        // 實測畫出來只剩下緣那條線，讀起來不像螢光筆。
        background: `color-mix(in srgb, ${t.fg} 26%, transparent)`,
        // 下緣實線：純底色在暗色投影片上仍偏淡，加一條線才讀得出
        // 「這是被標記過的」而不是「這塊背景剛好不一樣」
        boxShadow: `inset 0 -2px 0 0 ${t.fg}`,
        padding: "0 .2em",
        borderRadius: "var(--radius-xs)",
        // 行內元素：不改變行高，否則整段文字會被撐開
        lineHeight: "inherit",
      }}
    >
      {children}
    </span>
  );
}

// 為什麼不在 theme.ts 另開 `markBg`（偏離 Task 41 原規劃）：
//   單一 `markBg` 會**失去 tone 支援**（`<Mark tone="critical">` 就標不出來），
//   而 6 個 tone × 明暗兩階 = 12 個新 token 只為一個 <span>，不划算。
//   改用 `color-mix` 從 tone 的前景色即時調底色，一行涵蓋所有 tone 與兩種主題。
//
// 實測對比（文字色 vs 螢光筆底）：
//   亮色（底 #ffffff、文字 ink）：orange 13.12:1、blue 11.05、muted 13.89、
//                                 good 12.84、warning 12.01、critical 11.92
//   暗色（底 #262e3d、文字 body）：orange 6.13:1、blue 6.85、muted 5.63、
//                                 good 6.51、warning 6.01、critical 6.90
//   螢光筆底與所在頁面底的亮度比則落在 1.23–1.93，足以看出「這裡被標記過」。
