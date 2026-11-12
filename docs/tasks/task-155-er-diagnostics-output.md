# Task 155 — 診斷輸出：dev console 與 build log

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §4.8；Q10 定案。
> 依賴 [Task 151](task-151-er-derive-cardinality.md)；可與 Task 152–154 並行。

## 範圍

### 1. 格式化（純函式）

`derive.ts` 加 `formatDiagnostics(filePath, diagnostics)` 回傳字串（或 `null`）：

```
[er-diagram-renderer] erd/sales.er.json：3 個資料問題
- contract.case_id → biz_cases：父表不存在，這條外鍵不畫（fk-missing-table）
- delivery (contract_id, line_no) → contract_item (id)：欄數不同（fk-arity）
- case_member：標了 junction: true，但有 3 條外鍵，不當中間表處理（junction-invalid）
```

- 依代碼分組，每組最多 10 筆，其餘寫「另有 N 筆」
- 訊息用通用的資料庫用語，不出現任何 ORM 名詞

### 2. 輸出時機（`renderer.tsx`）

| 時機 | 行為 |
| --- | --- |
| 瀏覽器、dev | 沿用 `renderer.tsx:74-90` 的 `useEffect` 與模組層 `warned` Set（每個 `file.path` 一次）；與既有的 orphan group／未分群警告並存 |
| SSR（build 與 dev 的伺服器端） | `typeof window === 'undefined'` 時，以另一個模組層 Set（`warnedServer`）每個 `file.path` 印一次，比照 `plugins/openapi-renderer/renderer.tsx` 對 Swagger 2.0 的做法 |
| 正式環境的瀏覽器 | 不印 |

**不 throw、不讓 build 失敗。**

### 3. 斷言

`scripts/checks/er-derive.mjs` 加：`formatDiagnostics` 對空陣列回 `null`；超過 10 筆時的「另有 N 筆」；v1.3 範例回 `null`。

## 要改的既有檔案

`plugins/er-diagram-renderer/derive.ts`、`renderer.tsx`；`scripts/checks/er-derive.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| build log | 一份含 3 種錯誤的測試資料 | `npx astro build` | build 成功；log 出現一則分組訊息 |
| dev console | 同上 | dev 開 `/view` 頁、HMR 存檔一次 | 瀏覽器 console 只有一則 |
| 官方範例 | v1.1、v1.2、v1.3 範例 | `npm run check-plugins` | build log 沒有 er-diagram-renderer 的診斷 |
| 正式環境 | 同測試資料 | `npm run build && npm run preview` 開頁 | 瀏覽器 console 沒有 |
| 多處內嵌 | 同一檔被內嵌兩次 | build | 只印一次 |

> 注意：v1.2 範例的 `option_item.type_code`（`fk: "option_type"`）會被解讀成參照 `option_type.id`。這在推導上合法、不會產生診斷，錯在語意（資料本身看不出來），所以 v1.2 範例仍應是零診斷。
> v1.1、v1.2 範例只要出現任何診斷，就代表 Task 151 的規則過嚴或有 bug，要回頭修，不能當成預期結果。

## 依賴

Task 151。

## 實作記錄（2026-11-12）

- `derive.ts` 新增 `formatDiagnostics(filePath, diagnostics, perCode = 10)`；`er-derive.mjs` 加 ㉑
- SSR 那則前面多一個換行：Astro 的進度輸出（`└─ /notes/…`）不換行，直接接上去會黏成一行
- 實測（`tmp/er-ws` 放一份刻意寫壞的資料、一篇筆記內嵌它兩次）：
  - `astro build` 成功，build log 只出現一則「4 個資料問題」（fk-missing-table、ref-missing-column、fk-arity、junction-invalid）。同一檔在兩個內嵌與 `/view` 頁都有渲染，只印一次
  - dev 瀏覽器 console 印出同一則
- `npm run check-plugins` 的 build log 沒有任何 er-diagram-renderer 的資料問題（三份官方範例都是零診斷）
