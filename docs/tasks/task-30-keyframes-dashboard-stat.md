# Task 30 — 動效 keyframes + Dashboard「已生成簡報」統計

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」§Dashboard 統計、§Interactions。依賴 [Task 23](task-23-deck-data-model-resolution.md)、[Task 26](task-26-present-app-island.md)。

## 範圍

- 修改 [src/styles/global.css](../../src/styles/global.css)：新增 `@keyframes ncFade` / `ncSlideIn` / `ncRiseUp`（PresentApp 用）。
- Dashboard 新增「已生成簡報」統計（含簡報的筆記數 / 佔比），build-time 預計算、無執行時 API。

## 實作

### 1. keyframes（global.css）

```css
@keyframes ncFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes ncSlideIn { from { opacity: 0; transform: translateX(22px) } to { opacity: 1; transform: none } }
@keyframes ncRiseUp { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: none } }
```

- `prefers-reduced-motion: reduce` 全域關動畫規則已存在（確認涵蓋這三個；否則補 `* { animation: none !important }`）。

### 2. Dashboard 統計

- 於 [src/lib/notes.ts](../../src/lib/notes.ts)（或 Dashboard 資料彙總處）以 `allDeckSlugs()` / `hasDeck()`（Task 23）計算：`decksGenerated = 含 deck 的筆記數`、`decksTotalNotes = 筆記總數`、佔比。
- 於 [src/pages/index.astro](../../src/pages/index.astro) 統計區塊新增一格「已生成簡報 N / M」，樣式對齊既有「含 AI 標記數量」統計卡。
- 純 build-time 計算（Content Collections + `import.meta.glob` deck 列舉），無 runtime API。

## 驗收

- [ ] PresentApp 的切頁 / 播放 / 大綱動效正常，`prefers-reduced-motion` 下無動畫
- [ ] Dashboard 顯示「已生成簡報」數 / 佔比，數字反映實際 deck 檔
- [ ] 新增 / 移除一個 `*.deck.tsx` 後重新 build，統計即時反映
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 統計與 deck 列舉共用 [Task 23](task-23-deck-data-model-resolution.md) 的 `decks.ts`，勿另寫一份列舉邏輯。
