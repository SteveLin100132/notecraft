// Deck 資料模型 + 兩模式列舉解析（Task 23）。
//
// 一篇筆記至多對應一份 deck，產物為 `.tsx` 模組（default export 一個 Deck）：
//   - 主專案模式：src/components/generated/<slug>.deck.tsx
//   - viewer 模式：<userCwd>/.notecraft/components/<slug>.deck.tsx（@notes alias）
//
// `full-visual` 版型的 slide 直接 import 對應的 @ai-visualize 生成元件、以 component
// 參照放進 `viz` 欄位（不建全域 registry）。兩模式的 import 別名由 sync-skill-template
// 的 SUBSTITUTIONS 對映（@/components/generated/ ↔ @notes/components/）。

import type { ComponentType } from "react";

export type SlideLayout =
  | "cover"
  | "section"
  | "bullets"
  | "media"
  | "compare"
  | "full-visual"
  | "quote"
  | "closing";

export interface CompareSide {
  tag: string;
  name: string;
  tone: "blue" | "orange";
  rows: [string, string][];
}

/** bullets 版型的條列項 */
export interface BulletItem {
  k: string;
  v: string;
  tone?: "blue" | "orange" | "muted";
}

/** closing 版型的回顧項 */
export interface RecapItem {
  n: string;
  k: string;
  v: string;
}

export interface Slide {
  layout: SlideLayout;
  /** 縮覽清單 / 大綱面板顯示的短標題 */
  nav: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  lead?: string;
  body?: string;
  num?: string;
  meta?: string[];
  points?: string[];
  items?: Array<BulletItem | RecapItem>;
  left?: CompareSide;
  right?: CompareSide;
  mediaLabel?: string;
  mediaHint?: string;
  /** full-visual：直接持有筆記既有的生成元件（非字串 id），播放時可互動 */
  viz?: ComponentType;
  vizLabel?: string;
  vizHint?: string;
  quote?: string;
  by?: string;
  byMeta?: string;
  cta?: string;
  ctaMeta?: string;
}

export interface Deck {
  /** = 筆記 slug，決定 /present/<slug> */
  slug: string;
  title: string;
  eyebrow: string;
  generatedAt: string;
  /** 來源 MDX 路徑，顯示於檢視模式左下 */
  source: string;
  slides: Slide[];
}

// 兩模式合併 glob（compile-time 靜態字串；各模式各自命中一邊、另一邊回空）：
//   - 主專案：/src/components/generated/*.deck.tsx（root-relative，恆有效）
//   - viewer：@notes/components/*.deck.tsx（@notes alias 由 astro.config 恆定義）
const modules: Record<string, { default?: Deck }> = {
  ...import.meta.glob<{ default?: Deck }>("/src/components/generated/*.deck.tsx", {
    eager: true,
  }),
  ...import.meta.glob<{ default?: Deck }>("@notes/components/*.deck.tsx", {
    eager: true,
  }),
};

const bySlug = new Map<string, Deck>();
for (const mod of Object.values(modules)) {
  const deck = mod?.default;
  if (deck?.slug) bySlug.set(deck.slug, deck);
}

/** 所有已生成簡報的筆記 slug（供 getStaticPaths、Dashboard 統計） */
export function allDeckSlugs(): string[] {
  return [...bySlug.keys()];
}

/** 取某 slug 的 deck；不存在回 null */
export function deckOf(slug: string): Deck | null {
  return bySlug.get(slug) ?? null;
}

/** 該筆記是否已生成簡報（驅動功能列入口 / 路由 / 統計） */
export function hasDeck(slug: string): boolean {
  return bySlug.has(slug);
}
