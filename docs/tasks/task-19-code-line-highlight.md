# Task 19 — 行 highlight / 標記

> 對應 PRD v1.7.0 §7.1「程式碼區塊增強」第 4 項。
> 依賴 [Task 17](task-17-expressive-code-foundation.md)（EC 底座）。

## 範圍

- 啟用 / 驗證 EC 的**行標記**（highlight）、**文字標記**與 **diff（ins/del）標記**，以 fence meta 表達。
- highlight 底色、diff 色、標記樣式對齊 trendlink-design 語意 token，**不硬編色碼**。

## 語法

````mdx
```ts {3,7-9}
// 第 3 與 7–9 行被強調
```

```ts "TODO" del={2} ins={3}
const a = 1
const b = 1   // 被標為刪除
const b = 2   // 被標為新增
```
````

- `{3,7-9}`：行 highlight（單行 + 範圍）。
- `"text"`：文字標記（標記符合字串）。
- `del={…}` / `ins={…}`：diff 標記。

## 實作步驟

1. EC 內建行 / 文字 / diff 標記，無需新依賴；確認 fence meta 解析正常。
2. 樣式：highlight 底色用設計系統強調 / 中性 token；diff 的新增 → 品牌綠、刪除 → 品牌紅（取最接近語意 token），**不硬編色碼**。
3. 與行號（Task 18）、檔名（Task 18）並用時的視覺驗證。
4. 示範一段含 `{1,3-5}` + `"keyword"` + diff 的區塊。

## 驗收（對應 PRD 驗收表）

- [x] fence 帶 `{3,7-9}` → 第 3 與 7–9 行以強調底色標記
- [x] `"text"` → 對應字串被標記
- [x] `del` / `ins` → diff 標記以語意色呈現
- [x] 行號越界 / 格式異常 → build log 警示且照常渲染，build 不中斷
- [x] 正式環境渲染一致，無執行時 API
- [x] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 行 highlight 與 `showLineNumbers` 同時啟用時，底色需涵蓋行號槽或明確對齊，避免錯位。
- meta 解析異常須優雅回退（忽略該標記、照常高亮），**不中斷 build**（PRD 卡控機制）。
