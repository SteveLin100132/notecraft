# Task 18 — 檔名標題 + 複製按鈕 + 行號

> 對應 PRD v1.7.0 §7.1「程式碼區塊增強」第 1～3 項。
> 依賴 [Task 17](task-17-expressive-code-foundation.md)（EC 底座）。

## 範圍

- 啟用 / 驗證 EC frame 的**檔名標題**（`title="…"`）與**複製按鈕**（多為 Task 17 預設，已開即驗收）。
- 新增依賴 `@expressive-code/plugin-line-numbers` 提供**行號**，以 fence meta `showLineNumbers` 逐區塊開關。
- 行號 / frame 樣式對齊 trendlink-design token，**不硬編色碼**。

## 語法

````mdx
```ts title="src/lib/auth.ts" showLineNumbers
export function auth() { /* … */ }
```

```ts showLineNumbers=10
// 從第 10 行起算
```
````

- `title="…"`：顯示檔名 / 標題列；省略則無標題（仍有複製鈕）。
- `showLineNumbers`（可選 `=N` 設定起始行號）：開啟行號；**全站預設關閉**，逐區塊選用。

## 實作步驟

1. `npm i @expressive-code/plugin-line-numbers`，在 `astro.config.mjs` 的 EC `plugins` 加入 `pluginLineNumbers()`。
2. EC 設定 `defaultProps`：確認 `showLineNumbers` 預設 `false`（逐區塊選用）。
3. 樣式：行號槽、frame 標題列、複製鈕色票 / 圓角 / 字級取 token（frame 圓角優先 `--radius-pill` / 卡片圓角）。
4. 寫一篇 / 一段示範驗證三項組合（`title` + `showLineNumbers`）。

## 驗收（對應 PRD 驗收表）

- [x] fence 帶 `title="src/app.ts"` → 區塊頂端顯示檔名標題列
- [x] 任一區塊點複製鈕 → 整段原始碼複製到剪貼簿 + 已複製回饋
- [x] fence 帶 `showLineNumbers` → 左側顯示行號；`=N` 起始行號生效
- [x] 未加 `showLineNumbers` 的區塊不顯示行號（預設關閉）
- [x] 正式環境渲染一致，無執行時 API
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- `showLineNumbers` 與長行 `wordWrap` 並用時，確認折行的行號對齊不錯位。
- 複製鈕內容應為**原始碼**（不含行號 / frame chrome）。
