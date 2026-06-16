# Task 16 — Tooltips（行內提示文字）

> 對應 PRD v1.6.0 §7.1「Markdown 擴充語法」。**依賴 Task 14 的 directive 底座。**
> 純 CSS / 原生語意，**零 JS**。全域縮寫（abbreviations）已確認**不做**。

## 範圍

- 擴充 [src/lib/remark-notecraft-directives.ts](../../src/lib/remark-notecraft-directives.ts)（Task 14 建立）處理行內 `tip` 指令。
- 新增 tooltip 樣式（全域 CSS / Tailwind）。

樣式遵循 trendlink-design token。dev 與正式環境行為一致。

## 語法

```mdx
這段用到 :tip[OAuth]{content="一種授權框架"} 的概念。
```

## 實作步驟

### 1. remark transform（tip 部分）

- `textDirective`（行內）`name === "tip"`：
  - 渲染為 `<span class="nc-tip" tabindex="0" aria-describedby="…">` 包住可見文字（directive 的子節點），或 `<abbr title="…">`。
  - 提示內容取 `attributes.content`；缺 `content` → 不套提示、原樣輸出文字 + build log 警示。
  - 採 `<span>` + 隱藏的 `<span role="tooltip" id>` 方案以支援鍵盤 focus 與螢幕報讀（`aria-describedby` 指向提示內容）。

### 2. 樣式（遵循 trendlink-design）

- 連結 trendlink-design `styles.css`；**不硬編色碼**，氣泡配色 / 圓角 / 陰影取 token（navy 底或深色氣泡 + 白字屬常見作法，對齊品牌語彙），字體 Noto Sans TC。
- 可見詞：虛線底線 + `cursor: help`。
- 提示氣泡：`hover` / `focus-within` 顯示，純 CSS（`position` + `opacity`/`visibility` 過渡），圓角用卡片圓角 token。
- 動畫尊重 `prefers-reduced-motion`；氣泡需避免溢出視窗（基本邊界處理）。

## 驗收（對應 PRD 驗收表）

- [x] `:tip[term]{content="…"}` 在 hover / focus 時顯示提示氣泡
- [x] 可鍵盤聚焦（`tabindex`）、可被螢幕報讀（`aria-describedby`）
- [x] 缺 `content` 時原樣輸出文字 + build log 警示，build 不中斷
- [x] 純 CSS，無 JS、無執行時 API；正式環境一致
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- a11y：tooltip 需鍵盤可達且可被報讀，勿只靠 `:hover`。
- 提示內容含特殊字元 / 引號時的屬性轉義。
- 不實作全域縮寫（`*[HTML]: …`）；如日後需要再評估 `remark-abbr`（PRD §Q3）。
