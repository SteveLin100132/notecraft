# Task 22 — Markdown 擴充語法：Steps

> 對應 PRD v1.8.0 §7.1「Markdown 擴充語法：Steps」。
> 重用 [Task 14](task-14-markdown-directive-admonitions.md) 已引入的 `remark-directive` 底座，**Task 14 必須先做完**。
> 四項〈待釐清〉已於 2026-06-22 由作者拍板收斂（詳見 PRD §Steps）：① 預設 `vertical`；② **v1 支援 `status` 三態**；③ `< 640px` **強制降級為 vertical**；④ `:::step` **全支援巢狀 Markdown**。

## 範圍

- 擴充 [src/lib/remark-notecraft-directives.ts](../../src/lib/remark-notecraft-directives.ts)：處理 `containerDirective` 節點 `name === "steps"` / `name === "step"`。
- 新增 steps 全域 CSS（或 Tailwind `@layer components`）。
- 不需新增依賴；不需新增 Astro 設定。

樣式遵循 trendlink-design token，**不硬編色碼**；純 CSS / 漸進增強、零 JS，dev 與正式環境一致。

## 語法

```mdx
::::steps{layout="vertical"}
:::step{title="安裝依賴"}
執行 `npm install`，等待完成。
:::
:::step{title="設定環境變數" status="current"}
複製 `.env.example` 為 `.env` 並填入金鑰。
:::
:::step{title="啟動" status="todo"}
`npm run dev` 後開啟 `http://localhost:4321`。
:::
::::
```

- 外層 `steps`：`layout`（`vertical` 預設 / `horizontal`）、`start`（起始序號，預設 1）
- 內層 `step`：`title`（選用）、`status`（`done` / `current` / `todo`，預設 `todo`）
- 巢狀容器：外層 `::::` 比內層 `:::` 多一個（同 Content tabs）。

## 實作步驟

### 1. remark transform（steps / step 部分）

- 走訪 `containerDirective` 節點：
  - `name === "steps"`：
    - 取 `attributes.layout`（未在列舉 → `vertical` + warn）、`attributes.start`（parseInt，無效 → 1）。
    - 設 `data.hName = "ol"`、`data.hProperties = { className: ["nc-steps", "nc-steps--" + layout], start }`。
    - 走訪直接子節點，將非 `step` 容器者搬到容器底部並 warn（不丟棄、不錯位）。
  - `name === "step"`：
    - 取 `attributes.title`（可空）、`attributes.status`（未在列舉 → `todo` + warn）。
    - 設 `data.hName = "li"`、`data.hProperties = { className: ["nc-step", "nc-step--" + status] }`。
    - 在子節點最前插入「徽章 + 標題」的 hast 結構：
      ```html
      <span class="nc-step__badge" aria-hidden="true"><!-- 序號或 check icon --></span>
      <p class="nc-step__title">{title}</p>
      ```
      序號交由 CSS `counter-reset` / `counter-increment` 顯示（或在 transform 內依索引產出兩位數），與 `<ol start>` 配合。
- 共用既有的 directive 名稱分派 visitor。

### 2. 樣式（遵循 trendlink-design）

- 連結 trendlink-design `styles.css`；**不硬編色碼**。徽章對齊 [系列詳情頁面](../../docs/notecraft-prd.md) 章節序號徽章的語彙（accent 底、兩位數、`done` 顯示 check）。
- vertical：
  - `ol.nc-steps--vertical`：`display: grid; row-gap: 24px; padding-left: 0; list-style: none;`
  - `li.nc-step`：`display: grid; grid-template-columns: 40px 1fr; column-gap: 12px; position: relative;`
  - 連接線：以 `::before` 在徽章下方畫 `width: 2px`，最後一個 `li` 不畫。
- horizontal：
  - `ol.nc-steps--horizontal`：`display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; column-gap: 16px;`
  - 連接線：以 `::after` 在徽章右側畫橫向細線（最後一步不畫）。
  - 媒體查詢 `@media (max-width: 640px)`：強制 `grid-auto-flow: row;`、`grid-template-columns: 40px 1fr;`（**作者無法關閉**）。
- 狀態徽章：`done` 綠底打勾、`current` accent 實心、`todo` 空心灰邊框；色票全部取 token。
- 動效遵循 200–400ms ease-out，尊重 `prefers-reduced-motion`（若有展開動畫；目前純靜態可省）。

### 3. 驗證

- 範例筆記覆蓋：vertical（含三步驟）、horizontal（桌面）、horizontal 縮窄到 < 640px 自動降級、三種 status 徽章、`start` 自訂、step 內含 `:::note` admonition。
- `npx tsc --noEmit && npx astro build` 通過。
- 鍵盤 / 螢幕報讀器測試 `<ol>` 語意正確；徽章 `aria-hidden`。

## 驗收（對應 PRD 驗收表）

- [ ] 預設 vertical 渲染：三步驟 + 連接線，最後一步無下半線
- [ ] horizontal 渲染：桌面寬度橫向排列
- [ ] viewport < 640px 時 horizontal 自動降級為 vertical
- [ ] status 三態徽章樣式正確（done 打勾 / current 實心 / todo 空心）
- [ ] `start=3` 兩步驟序號為 `03` / `04`
- [ ] 步驟內容支援區塊（admonition / code / 清單），不錯位
- [ ] 非 `step` 子節點移到容器底部 + warn，不中斷 build
- [ ] 未知 `layout` / `status` 回退並 warn，build 不中斷
- [ ] 正式環境（`astro build`）渲染一致，無執行時 API
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- `<ol start>` 與 CSS counter 二擇一：選擇 CSS counter 可較自由控制兩位數格式與 `done` 打勾覆蓋；採此實作即可不依賴 `start` 屬性。
- horizontal 在內容長度差異大時可能高度不齊，建議 `align-items: start` 讓徽章對齊頂端。
- 與 [AI 標記區塊](../../docs/notecraft-prd.md) 正交：不進 `generated/`、不經 Subagent。
