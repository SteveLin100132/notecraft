# Task 10 — 系列總覽頁面 `/series`

> 對應 PRD v1.5.0 §7.1「系列總覽頁面（Series overview）」、核心目標 #17。
> 依賴 [Task 09](task-09-series-data-model.md)（series.ts / reading-progress.ts）。

## 範圍

- 新頁 `src/pages/series/index.astro`（靜態殼 + 注入系列資料）。
- 互動 island `src/components/islands/SeriesOverview.tsx`（搜尋 / 篩選 / 排序 / 進度即時）。
- [Sidebar.astro](../../src/components/Sidebar.astro) 新增「系列 / Series」導覽項（建議第 3 項）。

## 實作步驟

### 1. 頁面殼 `series/index.astro`

- `getAllNotes()` + `SERIES` → 預計算每系列的靜態資料（chapters 的 slug/title/tags/markers 計數），序列化傳給 island（進度部分留待 client 算）。
- 用 [PageHead.astro](../../src/components/PageHead.astro)：eyebrow `SERIES`、標題「系列」、副標「… 共 N 個系列、M 篇筆記」。

### 2. `SeriesOverview.tsx`（island，client:load）

- 本地 UI 狀態：`q`（搜尋）、`filter`（全部/進行中/已完成/未開始）、`sort`（進度/章節數/名稱）、排序選單開合。
- 進度：掛載讀 `readingStatus`，監聽 `nc-reading-changed` 重算；以 `seriesProgress` 得各系列衍生值。
- **模糊查詢**：比對系列 `title`+`eyebrow`+`description`+各章 `title`+各章 `tags`（小寫 includes）。
- **排序**：進度 = pct 高→低（預設）；章節數 = total 多→少；名稱 = `localeCompare("zh-Hant")`。
- **篩選**：完成 `completed`／進行中 `started && !completed`／未開始 `!started`。
- **系列卡**（重用 [Card.astro] 的視覺，但卡內互動需在 island → 用 React 重繪該卡或抽 `SeriesCard.tsx`）：
  - 封面（高 132）：`accent` 漸層、icon 徽章、「N 篇」chip、eyebrow + 標題。
  - 狀態圓點列（已完成實心綠／閱讀中白底藍圈／待開始空心灰圈）。
  - 進度列（狀態統計 + 百分比）+ 分段進度條（done 綠 + reading accent 0.45）。
  - CTA（[Button] sm pill）：未開始「開始閱讀」／進行中「繼續閱讀」／全完成「重新閱讀」＋「：{next.title}」（>12 字截斷）。**`stopPropagation` 後直接 `location.href = /notes/{next.slug}`，不進詳情頁。**
  - 整卡點擊 → `/series/{id}`。
- 空結果：置中 search icon +「找不到符合的系列」。

### 3. 樣式

- 一律走 [trendlink-design](../../README.md) token（accent 漸層 125°、success/blue/orange/neutral 色票、pill 999、shadow-xs/sm/md）；**不硬編色碼**。色票對照見 `docs/prototype/001-series/README.md`〈Design Tokens〉。

### 4. 側邊欄

- [Sidebar.astro] 加「系列」項（icon `layers` 或 `bookOpen`），高亮邏輯比照既有項。

## 驗收（對應 PRD 驗收表）

- [ ] 預設依 pct 由高到低排序
- [ ] 模糊查詢命中章節標題 → 其所屬系列卡出現
- [ ] 篩選「進行中」只顯示 started 且未完成
- [ ] CTA 直開 next（不進詳情頁）；整卡點擊進 `/series/[id]`
- [ ] 進度即時：在他頁改狀態回來（或同頁）進度條更新
- [ ] 空狀態正確；`npx astro build` 通過、無 hydration 警告

## 風險 / 備註

- 卡片同時要「整卡導頁」與「CTA 另開 next」→ CTA 務必 `preventDefault` + `stopPropagation`。
- 進度為 client 狀態 → 卡片 island 化，SSR 先渲染空進度再修正。
