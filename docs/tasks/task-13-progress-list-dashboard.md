# Task 13 — 列表卡閱讀徽章 + Dashboard「繼續閱讀」卡

> 對應 PRD v1.5.0 §7.1「閱讀進度與系列彙總（Reading progress）」、核心目標 #18。
> 依賴 [Task 09](task-09-series-data-model.md)。串接收尾。

## 範圍

- [NotesList.tsx](../../src/components/islands/NotesList.tsx)：卡片 meta 區加閱讀狀態 Badge。
- Dashboard [index.astro](../../src/pages/index.astro)：右欄頂部「繼續閱讀」卡（建議抽 island `ContinueReading.tsx`）。

## 實作步驟

### 1. NotesList 閱讀 Badge

- 既有 NotesList 已是 island；掛載讀 `readingStatus`、監聽 `nc-reading-changed`。
- 在卡片 meta 區加閱讀狀態 Badge，**僅當狀態非 `not-started` 時顯示**（`reading` / `done`），避免雜訊。
- 用 `readingMeta` 對照 tone/icon/label；樣式比照既有 Badge。

### 2. Dashboard「繼續閱讀」卡

- 新 island `src/components/islands/ContinueReading.tsx`（client:idle），接 `index.astro` 預計算的系列靜態資料。
- 掛載讀進度、監聽 `nc-reading-changed`，以 `seriesProgress` 算各系列衍生值。
- 內容：列出進行中（`started && !completed`）系列，最多 2 個、按 pct 排序；若無進行中則顯示尚未開始的系列、標題改「開始一個系列」。
- 每項：系列名 + pct + 迷你分段進度條 +「繼續/開始：{next.title}」連結（→ `/notes/{next.slug}`）。
- 卡片標題列「全部」連結 → `/series`。
- 無任何系列時整卡不渲染。

## 驗收（對應 PRD 驗收表）

- [ ] 列表卡僅在有進度（reading/done）時顯示徽章
- [ ] Dashboard 列出進行中系列 + 迷你進度條 + 連結直開 next
- [ ] 無進行中系列時改顯示「開始一個系列」
- [ ] 「全部」→ `/series`
- [ ] 改任一筆記狀態後，列表徽章與 Dashboard 卡即時更新
- [ ] `npx astro build` 通過、無 hydration 警告

## 風險 / 備註

- 與 [Task 08 收藏] 同為 NotesList 上的 client 狀態，注意兩者 effect 不互相覆寫。
- SSR 先渲染空進度，effect 後修正（hydration mismatch）。
