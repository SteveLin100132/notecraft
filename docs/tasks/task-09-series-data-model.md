# Task 09 — 系列資料模型 + 閱讀進度狀態層（foundational）

> 對應 PRD v1.5.0 §7.1「系列資料模型（Series data model）」、核心目標 #17～#18。
> 本 Task 是 Task 10～13 的共用基礎：集中式系列登錄（build 階段預計算）＋ 閱讀進度 client lib（localStorage）。**不含頁面 UI**。
>
> **已收斂決策（2026-06-16）**：① registry `slugs` 為章節順序唯一權威，舊 `series`/`order` 不再驅動 UI；② 不做「可追蹤 / 未發佈」判定，所有筆記皆可追蹤、`tracked` = `total`；③ 升級版 `SeriesNav` 取代舊 prev/next（見 Task 12）。

## 範圍

- 系列登錄資料來源（registry）＋ build 階段彙總（`src/lib/series.ts`）。
- 閱讀進度 client-only lib（`src/lib/reading-progress.ts`）。
- 既有 [src/lib/notes.ts](../../src/lib/notes.ts) 的 `seriesNav` 對接（見 §待釐清 Q1 收斂）。

## 實作步驟

### 1. 系列登錄（registry）

建議用 TS data 檔（最直接，免新增 collection schema）：`src/data/series.ts`

```ts
export type SeriesAccent = "blue" | "orange" | "navy";
export type SeriesDef = {
  id: string;            // 路由用，唯一
  title: string;
  eyebrow: string;       // 英文 overline
  description: string;
  accent: SeriesAccent;
  icon: string;          // 對應 Icon.astro 既有 icon 名
  slugs: string[];       // 章節順序 = 閱讀順序
};

export const SERIES: SeriesDef[] = [ /* … 由作者維護 … */ ];
```

> 替代方案：Content Collection `series`（每系列一個 `.json`，於 `src/content/config.ts` 加 `defineCollection`）。若希望系列也走 Content Collections 型別校驗再採此法；本 Task 預設用 `src/data/series.ts`。

### 2. 系列彙總 lib（build 階段，server 端）

`src/lib/series.ts`：以 `getAllNotes()` + `SERIES` 推導純資料（**不依賴 localStorage**，故 `seriesProgress` 的進度部分需在 client 計算，見步驟 4）：

- `seriesById(id)`、`noteBySlug(notes, slug)`。
- `seriesChapters(notes, series)` → 依 `slugs` 對應的 `Note[]`（過濾不存在者，build log 警示）。
- `seriesOf(notes, slug)` → `{ series, index, total, chapters, prev, next }`，**取代 notes.ts 既有 `seriesNav`**（prev/next 改由此推導）。原 `series`/`order` schema 欄位與 `seriesNav` 可一併移除（由作者定奪）。
- 卡控：同一 slug 出現在多個系列 → build log 警示、以首見為準。

### 3. 閱讀進度 client lib

`src/lib/reading-progress.ts`（**client-only**，比照 [favorites.ts](../../src/lib/favorites.ts) 的 try/catch + 事件派發）：

```ts
const KEY = "nc-reading-progress-v1";
export type ReadingStatus = "not-started" | "reading" | "done";

export function readingStatus(slug: string): ReadingStatus
export function setReadingStatus(slug: string, s: ReadingStatus): void
export function markReading(slug: string): void                 // not-started → reading，永不降級
export function readingMeta(s: ReadingStatus): { key; label; tone; icon }
```

- 寫入後 `localStorage.setItem` + `window.dispatchEvent(new CustomEvent("nc-reading-changed"))`；跨分頁可另聽 `storage`。
- **不做「可追蹤 / 未發佈」判定**：所有筆記皆可追蹤。

### 4. 進度彙總（client 端）

`seriesProgress(series, statusOf)`：吃一個 `statusOf(slug) → ReadingStatus` 取得即時狀態，回傳 PRD 列出的衍生值（`total`/`done`/`reading`/`notStarted`/`pct`/`completed`/`started`/`next`）。`resetSeriesProgress(series)` 清掉該系列所有章節進度。**分母 `tracked` = `total`（全部章節）。**

## 驗收（對應 PRD 驗收表）

- [ ] `tracked` = `total`（全部章節計入分母）
- [ ] `markReading` 對 `done` 章節不降級
- [ ] `next` 優先 reading → 第一個 not-started → 全完成回首章
- [ ] `resetSeriesProgress` 後全章 not-started、pct = 0
- [ ] registry slug 找不到筆記 → build log 警示、不中斷 build
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 進度為 localStorage：SSR 無法預知，**所有顯示進度的元件必須是 client island**，初次 render 視為空進度，`useEffect` 後修正（避免 hydration mismatch）。
- registry `slugs` 為章節順序唯一權威；移除 `notes.ts` 的 `seriesNav` 與 schema 的 `series`/`order` 時，注意一併更新 [[slug].astro] 的呼叫（見 Task 12）。
