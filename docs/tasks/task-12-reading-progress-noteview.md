# Task 12 — 筆記頁閱讀進度 + 升級版 SeriesNav

> 對應 PRD v1.5.0 §7.1「閱讀進度與系列彙總（Reading progress）」、核心目標 #18。
> 依賴 [Task 09](task-09-series-data-model.md)。

## 範圍

- 檢視頁 [[slug].astro](../../src/pages/notes/[slug].astro)：接入閱讀控制與升級導覽。
- 新 island：`ReadingControl.tsx`、`DonePrompt.tsx`。
- 升級既有 [SeriesNav.astro](../../src/components/SeriesNav.astro) → 含進度的版本（或改抽 island `SeriesNav.tsx`）。

## 實作步驟

### 1. `ReadingControl.tsx`（island，client:idle）

- Props：`slug`。
- 三段分段控制 `待開始 / 閱讀中 / 已完成`（pill 容器、選中段白底 pill + 語意色字 + xs 陰影）；點擊 `setReadingStatus`。
- 掛載讀 `readingStatus`、監聽 `nc-reading-changed`。
- 接入 `[slug].astro` 頂部 meta 列（與「以 VS Code 編輯」「收藏」等同列）。所有筆記皆顯示（不做可追蹤判定）。

### 2. 開啟即 `markReading`

- 可在 `ReadingControl` 的 `useEffect` 呼叫一次 `markReading(slug)`（`not-started → reading`，永不降級）。

### 3. `DonePrompt.tsx`（island，client:visible）

- 置於筆記內文底部（`SeriesNav` 之上）。
- 未完成 → 橘色「讀完這篇了嗎？」+「標記為已完成」（設 done + toast）；已完成 → 綠色「已標記為完成」+「標記為未完成」還原連結。

### 4. 升級版 `SeriesNav`

- 由 `seriesOf(slug)`（Task 09）取得 `{ series, index, total, chapters, prev, next }`。
- 顯示：系列 eyebrow/標題（→ `/series/[id]`）+「查看系列」+「第 i 章 · 共 N 章」+ 整體進度條（done 綠 / reading 半透藍）+ 百分比 + **逐章縮覽列**（圖示 + 序號 + 標題，目前章節 blue-50 底 + blue-200 邊高亮並標「閱讀中的章節」）+ 上一章/下一章卡片。
- **取代既有純 prev/next 的 SeriesNav.astro**（PRD §7.1 Q1 收斂）。進度部分需 client → 將含進度的區塊 island 化（`SeriesNav.tsx`），prev/next 卡片可留 astro。
- 動畫進度條 400ms；`prefers-reduced-motion` 尊重。

## 驗收（對應 PRD 驗收表）

- [ ] 開啟 not-started 筆記 → 自動轉 reading，ReadingControl 反映
- [ ] 文末標記完成 → 該筆記 done，且 SeriesNav / 系列卡 / 詳情頁進度即時更新
- [ ] 不屬系列的筆記不顯示 SeriesNav（含 prev/next）
- [ ] SeriesNav 縮覽列高亮目前章節、prev/next 正確
- [ ] `npx astro build` 通過、無 hydration 警告

## 風險 / 備註

- 多個 island（ReadingControl / DonePrompt / SeriesNav）共享進度 → 全部監聽 `nc-reading-changed` 即時同步。
- SSR 無 localStorage：初次以空進度渲染，effect 後修正。
- 升級 SeriesNav 取代舊版時，注意既有 [[slug].astro] 對 `seriesNav()` 的呼叫與 import 一併更新。
