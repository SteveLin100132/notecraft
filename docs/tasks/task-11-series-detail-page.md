# Task 11 — 系列詳情頁面 `/series/[id]`

> 對應 PRD v1.5.0 §7.1「系列詳情頁面（Series detail）」、核心目標 #17。
> 依賴 [Task 09](task-09-series-data-model.md)。

## 範圍

- 新頁 `src/pages/series/[id].astro`（`getStaticPaths` 由 `SERIES` 產生）。
- 互動 island `src/components/islands/SeriesDetail.tsx`（Hero 進度帶 + 章節列表 + 重設進度）。

## 實作步驟

### 1. `series/[id].astro`

- `getStaticPaths`：`SERIES.map(s => ({ params: { id: s.id }, props: { … } }))`，props 帶該系列章節靜態資料（slug/title/description/markers 計數）。
- 「← 返回系列」連結回 `/series`。
- 其餘互動委派 island。

### 2. `SeriesDetail.tsx`（island，client:load）

- **Hero 卡**：上半 accent 漸層（icon 徽章 + eyebrow + 標題 + 描述）；下半進度帶（左大百分比 + 「已完成」、中分段進度條 + 狀態統計、右 CTA 群）。
  - 主 CTA：繼續/開始/重新閱讀 → `location.href = /notes/{next.slug}`。
  - 已開始時顯示「重設進度」（ghost + rotateCcw）：`window.confirm` 二次確認 → `resetSeriesProgress(series)` → toast（重用 [ToastHost](../../src/components/islands/ToastHost.tsx) 機制）。
- **章節列表**：逐列 `ChapterRow`（整列可點 → `/notes/{slug}`）：
  - 左序號徽章：done 顯示 check（success 底/綠字），否則兩位數序號 `01`/`02`（accent 底/字）。
  - 中：標題 + 描述（單行截斷）。
  - 右：AI 視覺化計數（有 marker 時 sparkle + `已生成/總數`）→ 閱讀狀態 [Badge](../../src/components/Badge.astro)（`readingMeta` tone/icon/label）→ chevronRight。
- 進度與狀態：掛載讀 `readingStatus`、監聽 `nc-reading-changed` 重算。
- 進度條動畫 `width 500ms cubic-bezier(0.16,1,0.3,1)`；`prefers-reduced-motion` 時關閉過渡。

### 3. 樣式

- 走 trendlink-design token（同 Task 10）；不硬編色碼。

## 驗收（對應 PRD 驗收表）

- [ ] 各列 Badge 與序號徽章（含 done 打勾）對應實際狀態
- [ ] 點章節列導向對應 `/notes/[slug]`
- [ ] 「重設進度」二次確認後全章歸零、進度帶歸零、toast
- [ ] 主 CTA 開 `next`
- [ ] 未開始時不顯示「重設進度」
- [ ] 不存在的 id 不產生頁面；`npx astro build` 通過

## 風險 / 備註

- 章節列同時要導頁與右側 Badge：Badge 純顯示、整列 `<a>` 即可，無巢狀互動衝突。
- 進度為 client 狀態 → island 化，SSR 先渲染空進度。
