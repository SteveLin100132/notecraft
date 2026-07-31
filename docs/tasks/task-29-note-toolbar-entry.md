# Task 29 — 筆記頁功能列簡報入口 + 生成簡報鈕

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」§觸發與生成流程、待釐清 Q1（正式環境未生成→隱藏）。依賴 [Task 23](task-23-deck-data-model-resolution.md)。
> 權威來源：deck.jsx `DeckToolbarActions`、noteview.jsx；沿用範本 [RegenerateButton.tsx](../../src/components/islands/RegenerateButton.tsx)。

## 範圍

- 修改 [src/pages/notes/[...slug].astro](../../src/pages/notes/[...slug].astro)：在 meta / 動作列（現有「以 VS Code 編輯」那排，約 [第 105 行](../../src/pages/notes/[...slug].astro#L105)）**最前面**插入簡報入口。
- 新增 [src/components/islands/GenerateDeckButton.tsx](../../src/components/islands/GenerateDeckButton.tsx)：dev-only「生成簡報」鈕（複製提示詞 + toast）。

## 入口邏輯（README〈功能列入口〉狀態表）

| 狀態 | dev | 正式環境 |
|---|---|---|
| 已生成（`hasDeck`）| 顯示「簡報」→ `/present/<slug>` | 顯示「簡報」 |
| 未生成 | 顯示「生成簡報」（複製提示詞）| **完全不顯示任何簡報入口** |

- 於 `.astro` frontmatter 取 `const hasDeckForSlug = hasDeck(slug)`（Task 23）與既有 `const isDev = import.meta.env.DEV`。
- `hasDeckForSlug` → 純 Astro `<a class="… pill">`（DS secondary/navy 膠囊，左 Play icon）連 `/present/<slug>`。
- `!hasDeckForSlug && isDev` → `<GenerateDeckButton slug={slug} client:visible />`（outline pill、左 Sparkles）。
- `!hasDeckForSlug && !isDev` → 不 render。
- 排序：簡報入口在最前，其後才是既有「以 VS Code 編輯 / 在 Claude Code 重新生成」。

## GenerateDeckButton（複製提示詞）

- 照 [RegenerateButton.tsx](../../src/components/islands/RegenerateButton.tsx) 的樣式與 toast 機制：
  - 點擊 `navigator.clipboard.writeText(prompt)`；發 `window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "已複製生成簡報提示詞，貼到 Claude Code 即可", icon: "sparkle" } }))`。
  - 按鈕文字暫變「已複製提示詞」、icon 換 Check，1800ms 後還原（照 deck.jsx `DeckToolbarActions`）。
- 提示詞內容（路徑對齊本專案決策 `.deck.tsx`，**非** handoff 原型的 `src/content/decks/…`）：
  > 請把 `src/content/notes/<slug>.mdx` 轉成 16:9 簡報：套用 deck 版型庫（cover / section / bullets / media / full-visual / compare / quote / closing），沿用筆記中既有的 @ai-visualize 互動元件，輸出到 `src/components/generated/<slug>.deck.tsx`

## 驗收

- [ ] 已生成筆記：dev / 正式環境皆顯示「簡報」並連到 `/present/<slug>`
- [ ] 未生成筆記：dev 顯示「生成簡報」、點擊複製提示詞 + toast + 文字暫變「已複製提示詞」
- [ ] 未生成筆記：正式環境（`astro build` 後）**不顯示任何簡報入口**
- [ ] 入口排在既有 dev 按鈕之前，樣式對齊 DS
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 「簡報」入口正式環境亦顯示，僅在 `hasDeck` 為真時；因 `/present/<slug>` 只為有 deck 者產頁，不會連到死頁。
- 提示詞路徑務必對齊 `.deck.tsx`（勿沿用 handoff 原型 `copyPrompt` 內的 `src/content/decks/…`）。
