# Task 25 — SlideFrame：16:9 等比縮放畫框

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」§畫布與縮放。依賴 [Task 24](task-24-deck-theme-slide-layouts.md)。
> 權威來源：deck.jsx `Slide` / `SlideFrame`、present.jsx `useMeasure`。

## 範圍

- 新增 [src/components/deck/SlideFrame.tsx](../../src/components/deck/SlideFrame.tsx)：`Slide`（依 layout 分派）、`SlideFrame`（等比縮放畫框）、`useMeasure`（ResizeObserver 量測 hook）。
- 讓縮覽圖、主畫布、播放全螢幕**共用同一份版型元件**、字級不需 RWD。

## 實作重點（照 deck.jsx / present.jsx）

- `Slide({ slide, dark, live })`：`const L = LAYOUTS[slide.layout] ?? LayoutBullets; return <L s={slide} dark={dark} live={live} … />`（`LAYOUTS` 來自 Task 24）。
- `SlideFrame({ slide, dark, live, width, radius, border, shadow, style, … })`：
  - 外層 `div`：`width`、`height = round(width * 9 / 16)`、`position: relative`、`overflow: hidden`、`borderRadius`、`border`、`boxShadow`、`background: dkt(dark).slide`、外加 `style`。
  - 內層 `div`：`position: absolute; top:0; left:0; width:1600; height:900; transformOrigin:"top left"; transform: scale(width/1600)`，內放 `<Slide … />`。
- `useMeasure()`：`ref` + `ResizeObserver`，回傳 `[ref, { w, h }]`；`typeof ResizeObserver === "undefined"` 時安全跳過（SSR）。
- `live` 旗標往下傳給 `Slide`→`full-visual`（縮覽用 `live=false` 顯示占位、主畫布 / 播放用 `live=true` 掛真元件，避免縮覽也 hydrate 互動元件）。

## 驗收

- [ ] 任一 `width` 下版面等比縮放、比例固定 16:9、字級不變形
- [ ] `useMeasure` 於視窗 resize 正確更新；SSR 無 `ResizeObserver` 不報錯
- [ ] 縮覽（`live=false`）顯示 full-visual 占位、主畫布（`live=true`）顯示真元件
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- `SlideFrame` 會在同頁被大量渲染（縮覽清單 + 大綱網格）；縮覽一律 `live=false`，避免重複 hydrate 互動元件造成效能 / 狀態問題。
