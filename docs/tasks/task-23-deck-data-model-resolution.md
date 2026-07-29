# Task 23 — Deck 資料模型 + 兩模式列舉解析（基礎）

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」與〈封裝相容性與實作備註〉。
> **本 Task 為 24～30 的基礎，先做。** 內含唯一的技術 spike（跨主專案 / viewer 兩模式列舉 deck）。
> 設計交接權威來源：`~/Downloads/design_handoff_note_to_deck/source_reference/deck.jsx`（資料結構 `DECKS`）。
> 作者已拍板（2026-07-29）：deck 產物採 **`.tsx` 模組**、`full-visual` **直接 import 生成元件**（不建全域 registry）。

## 範圍

- 新增 [src/lib/decks.ts](../../src/lib/decks.ts)：`Deck` / `Slide` TS 型別 + `deckOf(slug)` / `hasDeck(slug)` / `allDeckSlugs()`。
- 確認 deck 模組能在 **`astro dev`（主專案）** 與 **`npx notecraftapp view`（viewer）** 兩模式都被 build-time 列舉到。
- 不改既有 `@ai-visualize` 管線；不新增外部依賴。

## Deck 產物形式（決策）

- 一篇筆記至多一份 deck，產物為 `.tsx` 模組：
  - 主專案模式：`src/components/generated/<slug>.deck.tsx`
  - viewer 模式：`.notecraft/components/<slug>.deck.tsx`（**攤平兩層**，符合 watcher `isWatchedFile`，見 [bin/notecraftapp.mjs](../../bin/notecraftapp.mjs) `parts.length === 2`）
- 模組 `export default` 一個 `Deck` 物件。`full-visual` 版型的 slide **直接 import 對應生成元件**、以 component 參照放進 `viz` 欄位（取代 handoff 原型的 `vizId` 字串 + `window.GENERATED` registry）：

```tsx
// src/components/generated/role-responsibility-rr.deck.tsx
import RrRaci from "@/components/generated/rr-raci";
import type { Deck } from "@/lib/decks";
const deck: Deck = {
  slug: "role-responsibility-rr",
  title: "角色與職責 R&R",
  eyebrow: "PRODUCT MANAGEMENT",
  generatedAt: "2026-06-14",
  source: "src/content/notes/role-responsibility-rr.mdx",
  slides: [
    /* … */
    { layout: "full-visual", nav: "RACI 互動矩陣", eyebrow: "INTERACTIVE",
      title: "RACI Matrix — 播放時仍可點選操作",
      viz: RrRaci, vizLabel: "@ai-visualize · rr-raci",
      vizHint: "沿用筆記中已生成的互動元件，播放時可直接點選。" },
  ],
};
export default deck;
```

> viewer 模式下 mdx-writer 慣例把 `@/components/generated/` 改寫為 `@notes/components/`（`scripts/sync-skill-template.mjs` SUBSTITUTIONS）；deck 模組沿用同一慣例，故兩模式的 import 都能解析。

## TS 型別

```ts
export type SlideLayout = "cover" | "section" | "bullets" | "media"
  | "compare" | "full-visual" | "quote" | "closing";

export interface CompareSide { tag: string; name: string; tone: "blue" | "orange"; rows: [string, string][]; }

export interface Slide {
  layout: SlideLayout;
  nav: string;                 // 縮覽 / 大綱短標
  eyebrow?: string;
  title?: string; subtitle?: string; lead?: string; body?: string;
  num?: string; meta?: string[]; points?: string[];
  items?: Array<{ k: string; v: string; tone?: "blue" | "orange" | "muted" }
              | { n: string; k: string; v: string }>;
  left?: CompareSide; right?: CompareSide;
  mediaLabel?: string; mediaHint?: string;
  viz?: React.ComponentType;   // full-visual：直接持有生成元件（非字串 id）
  vizLabel?: string; vizHint?: string;
  quote?: string; by?: string; byMeta?: string;
  cta?: string; ctaMeta?: string;
}

export interface Deck {
  slug: string; title: string; eyebrow: string;
  generatedAt: string; source: string; slides: Slide[];
}
```

## 兩模式列舉（唯一 spike）

於 `decks.ts` 用 `import.meta.glob` **同時 glob 兩個 alias**、合併結果（compile-time 靜態字串；各模式各自命中一邊，另一邊回空）：

```ts
const mods = {
  ...import.meta.glob("@/components/generated/*.deck.tsx", { eager: true }),
  ...import.meta.glob("@notes/components/*.deck.tsx", { eager: true }),
} as Record<string, { default: Deck }>;

const bySlug = new Map<string, Deck>();
for (const m of Object.values(mods)) if (m.default?.slug) bySlug.set(m.default.slug, m.default);

export const allDeckSlugs = () => [...bySlug.keys()];
export const deckOf = (slug: string): Deck | null => bySlug.get(slug) ?? null;
export const hasDeck = (slug: string): boolean => bySlug.has(slug);
```

- **先驗證**：主專案放一個測試 `*.deck.tsx`、`astro dev` 確認 `allDeckSlugs()` 拿得到；再 `npx notecraftapp view` 指向一個含 `.notecraft/components/*.deck.tsx` 的資料夾確認同樣拿得到。
- 若 `@notes` alias 在 `import.meta.glob` 無法解析（Vite 版本限制），退路：改以相對路徑 glob，或在 `astro.config.mjs` 用 env（`NOTECRAFT_USER_CWD`）於 build 時注入 deck 目錄、getStaticPaths 端以 Node `fs` 列舉 + 動態 `import()`。**此退路須在本 Task 一併定案，勿留到後面。**

## 驗收

- [ ] `Deck` / `Slide` 型別可被 deck 模組與後續元件 import，無 `any`
- [ ] `allDeckSlugs()` / `deckOf()` / `hasDeck()` 在 `astro dev` 正確回傳
- [ ] `npx notecraftapp view <含 .notecraft/components/*.deck.tsx 的資料夾>` 亦能列舉到 deck（spike 通過或退路落地）
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 唯一風險是 `import.meta.glob` 對 `@notes` alias 的支援；本 Task 的核心產出就是「兩模式都能列舉」被驗證。
- 與 `@ai-visualize` 正交：deck 模組雖放 `generated/`，但不經四個既有 Subagent，不影響 content-visualize。
