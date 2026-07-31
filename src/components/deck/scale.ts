// Deck 排版原子（Task 32 — 契約 v0.2 §5.1）。
//
// 存在的理由：v0.2 起 `custom` 頁自由排版，若沒有可 import 的階梯，每頁字級都會不一樣。
// 這裡是「(b) 系統寫死」的落點下移一層 —— custom 頁的自由是「怎麼組合」，
// 不是「要不要遵守字級階梯」。
//
// 值皆為 1600×900 座標系下的 px：不用 rem、不做 RWD（等比縮放由 SlideFrame 的
// transform: scale 負責，字級不需要跟著視窗變）。

/**
 * 字級階梯。**就是這 10 個 key，不准加第 11 個** —— 要新字級是調整階梯本身，不是加特例。
 *
 * 階梯對齊對齊目標兩份簡報實測的字級分布（見 docs/deck-design-audit.md §1.2）。
 */
export const DS = {
  /** 章節頁的超大編號（月會簡報 195pt ≈ 216px @1600 座標系） */
  mega: 216,
  /** 單一 hero 數字、較收斂的章節頁編號 */
  hero: 116,
  /** 封面主標 */
  h1: 62,
  /** 內容頁主標 */
  h2: 40,
  /** 區塊標題 */
  h3: 30,
  /** 卡片標題 */
  h4: 24,
  /** 主述 */
  body: 20,
  /** 細描述 */
  small: 17,
  /** 註腳 / footer / legend */
  micro: 14,
  /** uppercase kicker */
  eyebrow: 13,
} as const;

/**
 * 字距。收斂自既有版型散落的 `.3em` / `.26em` / `.1em` 三種值（audit B-2）。
 * `tight` 給大字級標題、`label` 給 uppercase kicker。
 */
export const DTRACK = {
  tight: "-0.02em",
  label: ".26em",
} as const;

/** 間距階梯。custom 頁一律用 flex/grid + gap 排版，不用逐元素 margin。 */
export const DGAP = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
} as const;

export type DsStep = keyof typeof DS;
