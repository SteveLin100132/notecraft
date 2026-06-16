# Task 15 — Content tabs（內容分頁）

> 對應 PRD v1.6.0 §7.1「Markdown 擴充語法」。**依賴 Task 14 的 directive 底座。**
> 切換以**框架無關 vanilla JS** 實作（同 Task 07 側邊欄收合模式），不引入 React island。

## 範圍

- 擴充 [src/lib/remark-notecraft-directives.ts](../../src/lib/remark-notecraft-directives.ts)（Task 14 建立）處理 `tabs` / `tab`。
- 新增 tab 樣式（全域 CSS / Tailwind）+ 一段框架無關行為 script（放共用 layout 或筆記檢視頁）。

樣式遵循 trendlink-design token。dev 與正式環境行為一致。

## 語法

```mdx
::::tabs
:::tab{label="npm"}
`npm install`
:::
:::tab{label="pnpm"}
`pnpm add`
:::
::::
```

> 巢狀容器規則：外層 `tabs` 要比內層 `tab` **多一個冒號**（`::::tabs` 包 `:::tab`），remark-directive 才能正確區分層級。

## 實作步驟

### 1. remark transform（tabs 部分）

- `containerDirective` `name === "tabs"`：
  - 容器 → `<div class="nc-tabs" data-nc-tabs>`。
  - 子 `tab` directive → 產生兩組節點：
    - **tab 按鈕列**（`role="tablist"`）：每個 `<button role="tab" aria-selected aria-controls id>`，文字取 `attributes.label`（缺 → 以序號 `分頁 N` 命名 + build log 警示）。
    - **面板**：每個 `<div role="tabpanel" aria-labelledby hidden?>`，內含該 tab 內容。
  - 第一個 tab 預設 `aria-selected="true"`、面板顯示；其餘 `hidden`。
  - id 以容器索引 + tab 索引組合，確保同頁多組 tabs 不衝突。

### 2. 行為 script（vanilla JS）

- 對每個 `[data-nc-tabs]`：
  - 點 tab 按鈕 → 切換 `aria-selected`、對應面板 `hidden`。
  - 鍵盤左右方向鍵在 tablist 內移動焦點並切換（`Home`/`End` 可選）。
- **漸進增強**：JS 未載入時，CSS 預設讓所有面板可見（移除 `hidden` 的視覺隱藏前提 → 改用 JS 加上 `hidden`，或 CSS `:not([data-enhanced]) [role=tabpanel]{display:block}`），確保無 JS 仍讀得到全部內容。

### 3. 樣式（遵循 trendlink-design）

- 連結 trendlink-design `styles.css`；外觀對齊其 `components/Tabs` 與 `Badge`/`Tag`，**不硬編色碼**。
- tablist：底線 / pill 樣式（pill 用簽名 `--radius-pill`），選中態用金色強調（`--orange-400`）或品牌強調 token；字體 Noto Sans TC。
- 切換若有動畫，200–400ms ease-out，`@media (prefers-reduced-motion: reduce)` 關閉。

## 驗收（對應 PRD 驗收表）

- [x] 兩個 `:::tab` 渲染為按鈕列 + 面板；點第二個顯示第二面板、隱藏第一個
- [x] `aria-selected` 正確；方向鍵可切換
- [x] 停用 JS 時所有面板內容仍可讀（漸進增強，不遺失內容）
- [x] 缺 `label` 的 tab 以序號命名 + build log 警示，build 不中斷
- [x] 同頁多組 tabs 互不干擾（id 不衝突）
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- a11y：tablist / tab / tabpanel 的 ARIA 與鍵盤操作需完整。
- 漸進增強務必驗證「無 JS 不遺失內容」。
- script 對「同頁多組 / 動態載入」要以容器為單位綁定，勿用全域單例。
