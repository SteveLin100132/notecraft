# Task 14 — Markdown directive 底座 + Admonitions

> 對應 PRD v1.6.0 §7.1「Markdown 擴充語法：Admonitions / Content tabs / Tooltips」。
> 本 Task 建立 `remark-directive` 底座（Task 15 / 16 共用）並實作 Admonitions（提示框 / 可收合框）。
> **Task 14 為 15、16 的基礎，先做。** 縮寫（abbreviations）已確認不做。

## 範圍

- 新增依賴 `remark-directive`（build-time remark 外掛，需作者已同意）。
- 新增自訂 remark transform：[src/lib/remark-notecraft-directives.ts](../../src/lib/remark-notecraft-directives.ts)（暫名）。
- 改 [astro.config.mjs](../../astro.config.mjs) 的 `markdown.remarkPlugins` 掛載。
- 新增 admonition 樣式（全域 CSS / Tailwind），套用於筆記檢視頁 prose 容器。

樣式遵循 trendlink-design token，**不硬編色碼**。純內容渲染，dev 與正式環境行為一致。

## 語法

```mdx
:::note
支援 **行內 Markdown** 與連結。
:::

:::warning{title="自訂標題"}
可自訂標題列文字。
:::

:::tip{collapsible}
帶 collapsible → 渲染為預設收起的 <details>；{collapsible open} 則預設展開。
:::
```

- 類型列舉（提示，非強制）：`note` / `tip` / `info` / `warning` / `danger` / `success`，各對應語意色 + icon（lucide-react 已在依賴，或 inline SVG）。未知類型回退 `note`。

## 實作步驟

### 1. 安裝 + 掛載

- `npm i remark-directive`。
- `astro.config.mjs`：
  ```js
  import remarkDirective from "remark-directive";
  import { remarkNotecraftDirectives } from "./src/lib/remark-notecraft-directives.ts";
  // markdown: { remarkPlugins: [remarkDirective, remarkNotecraftDirectives], ... }
  ```
  - `remark-directive` 必須排在自訂 transform **之前**（先解析出 directive 節點再轉換）。

### 2. remark transform（admonition 部分）

- 走訪 `containerDirective` 節點，`node.name` ∈ 類型列舉時：
  - 設 `data.hName = "aside"`（或 `div`），`data.hProperties` 加 class（如 `nc-admonition nc-admonition--${type}`）。
  - 標題列：取 `node.attributes.title` 或類型預設標籤（note→「提示」、warning→「警告」…）。標題以子節點注入（icon span + 標題文字 span）。
  - `collapsible` 屬性：改 `hName="details"`，標題包成 `<summary>`；`collapsible open` 時加 `open` 屬性。
  - 未知 `name` → 回退 `note` 並 `console.warn`（build log），**不中斷 build**。

### 3. 樣式（遵循 trendlink-design）

- 連結 trendlink-design `styles.css` 取得 token + webfonts；**不硬編色碼**，外觀對齊其 `components/Alert`。
- 全域 CSS（或 Tailwind `@layer`）定義 `.nc-admonition` 與各類型 modifier，色票取 token：navy 結構（`--blue-700`）、warning→`--orange-*`、danger→品牌紅、success→品牌綠、info/note→淡藍 / 中性；圓角用卡片圓角 token、陰影用 token 陰影、字體 Noto Sans TC。
- `<details>` 收合：`summary` 游標 / 箭頭樣式；展開動畫 200–400ms ease-out、尊重 `prefers-reduced-motion`。

## 驗收（對應 PRD 驗收表）

- [x] `:::warning` 渲染帶語意色 + icon 的框，內含行內 Markdown 正確
- [x] `:::tip{collapsible}` 渲染為預設收起 `<details>`，點擊展開 / 收合，無需 JS
- [x] `{title="…"}` 自訂標題生效
- [x] 未知類型（`:::unknown`）回退 `note` 樣式 + build log 警示，build 不中斷
- [x] 正式環境（`astro build`）渲染一致，無執行時 API
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- `remark-directive` 須在自訂 transform 之前掛載。
- transform 需處理「容器內無內容 / 無標題」邊界，避免產生空節點。
- 與 [AI 標記區塊](../../docs/notecraft-prd.md) 正交：不進 `generated/`、不經 Subagent。
