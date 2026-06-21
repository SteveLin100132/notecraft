# Task 17 — astro-expressive-code 底座 + Shiki 遷移

> 對應 PRD v1.7.0 §7.1「程式碼區塊增強（Code block enhancements）」。
> 本 Task 以 `astro-expressive-code`（EC）取代現有 `markdown.shikiConfig`，建立 Task 18 ~ 20 共用的引擎底座與主題。
> **Task 17 為 18 / 19 / 20 的基礎，先做。**

## 範圍

- 新增依賴 `astro-expressive-code`（build-time Astro 整合，需作者已同意）。
- 改 [astro.config.mjs](../../astro.config.mjs)：移除 / 收斂 `markdown.shikiConfig`，改掛 `astro-expressive-code` 整合。
- 建立 EC 設定（主題、`wordWrap`、frame / 複製鈕預設），主題色票對齊 trendlink-design token，**不硬編色碼**。

純內容渲染，dev 與正式環境行為一致。

## 實作步驟

### 1. 安裝 + 掛載

- `npm i astro-expressive-code`。
- `astro.config.mjs`：
  ```js
  import expressiveCode from "astro-expressive-code";
  // integrations: [ expressiveCode({ /* options */ }), mdx(), react(), ... ]
  ```
  - **EC 整合必須排在 `mdx()` 之前**（EC 需先註冊其 markdown 處理）。
  - 移除現有 `markdown.shikiConfig`（EC 接管程式碼渲染；`remarkPlugins` 維持不動）。

### 2. EC 設定（對齊現有行為 + 設計 token）

- 主題：沿用等效亮色（現為 `github-light`）；長行 `wordWrap: true`（對齊現有 `wrap`）。
- frame：保留檔名標題 frame 與**內建複製鈕**（預設開啟）。
- 主題色票連結 trendlink-design `styles.css` token（背景、邊框、frame 標題列、複製鈕、選取色），**不硬編色碼**；等寬字採設計系統 mono（無則沿用 EC 預設）。

### 3. 回歸檢查

- 既有筆記中**無 meta** 的程式碼區塊：高亮維持、外觀對齊 token、附複製鈕、內容不變。

## 驗收（對應 PRD 驗收表）

- [x] 既有無 meta 區塊遷移後維持語法高亮、外觀對齊 token、附複製鈕、內容不變
- [x] 點複製鈕可複製整段原始碼並給出已複製回饋
- [x] 長行 wrap 行為與遷移前一致
- [x] 正式環境（`astro build`）渲染一致，無執行時 API
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- EC 整合需排在 `mdx()` 前；移除 `shikiConfig` 後確認 `.md` / `.mdx` 程式碼皆由 EC 接管。
- EC 自帶極輕量複製鈕 JS（非 React island），符合無執行時 API 限制。
- 與 [AI 標記區塊](../../docs/notecraft-prd.md) 正交：不進 `generated/`、不經 Subagent。
