# Task 27 — /present/[...slug] 路由 + 無側邊欄外殼

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」§簡報模式 + 〈封裝相容性與實作備註〉實作約束 2。依賴 [Task 23](task-23-deck-data-model-resolution.md)、[Task 26](task-26-present-app-island.md)。

## 範圍

- 新增 [src/pages/present/[...slug].astro](../../src/pages/present/[...slug].astro)：簡報頁路由。
- 新增 [src/layouts/PresentLayout.astro](../../src/layouts/PresentLayout.astro)：**無側邊欄**的極簡外殼（載 global.css + ToastHost + `<slot />`）。
- URL 為 `/present/<slug>`；**不採 `/notes/[slug]/present`**（筆記頁為 catch-all `notes/[...slug].astro` rest route，Astro 無法接子路由）。

## 實作

### 路由 `present/[...slug].astro`

```astro
---
import PresentLayout from "@/layouts/PresentLayout.astro";
import PresentApp from "@/components/islands/PresentApp.tsx";
import { allDeckSlugs, deckOf } from "@/lib/decks";

export function getStaticPaths() {
  return allDeckSlugs().map((slug) => ({ params: { slug } }));
}
const { slug } = Astro.params;
const deck = deckOf(slug!);
if (!deck) return Astro.redirect("/404");   // 僅為有 deck 的 slug 產頁；防呆
---
<PresentLayout title={`簡報 · ${deck.title}`}>
  <PresentApp slug={deck.slug} client:only="react" />
</PresentLayout>
```

- `getStaticPaths` 只列 `allDeckSlugs()` → 未生成簡報的筆記**不會**產生 `/present/<slug>` 頁（等同 404）。
- `[...slug]` 用 rest param 以相容巢狀 slug（與 `notes/[...slug].astro` 一致）；`allDeckSlugs()` 回傳的 slug 直接作 param。

### 外殼 `PresentLayout.astro`

- 僅 `<html><head>`（載 `@/styles/global.css`、title、meta）`<body>`：一個 `<slot />` + `<ToastHost client:load />`。
- **不含** Sidebar / BaseLayout 的頁面框（簡報是 `position: fixed; inset:0` 佔滿視窗）。
- 背景與 `prefers-color-scheme` 無關（主題由 island 的 `deckTheme` 控制）；`body { margin:0 }`、避免捲軸。

## 驗收

- [ ] `/present/<有 deck 的 slug>` 正確顯示檢視模式，無網站側邊欄
- [ ] 未生成簡報的 slug 無對應頁面（build 不產出 / 導向 404）
- [ ] 巢狀 slug（若有）路由正常
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- `client:only="react"`：確保 island 不在 SSR 階段執行（需 `window` / `ResizeObserver` / Fullscreen）。
- 若 Task 23 spike 走「fs 列舉退路」，`getStaticPaths` 改用該 helper 列 slug、頁面以動態 import 取 deck；介面 `allDeckSlugs()` / `deckOf()` 不變。
