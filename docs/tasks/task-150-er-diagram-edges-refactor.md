# Task 150 — Diagram 改用 `D.edges`（純重構、零行為變更）

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §1.2（「edge 有兩份推導」）、§12。
> 依賴 [Task 149](task-149-er-schema-v13-examples.md)。

## 為什麼要獨立一個 Task

`diagram.tsx` 沒有用 `derive.ts` 的結果，而是自己由 `c.fk` 重算 edge（`diagram.tsx:101-115`）與跨 scope 連線數（`:85-92`）。
Task 151 改推導、Task 152 起改畫法，如果這兩份推導不先收斂，新語意就只會出現在 Wiki，Diagram 不會跟著變。

Diagram 的縮放、fit、量測是 v1.1 花最多時間調的部分。**先在推導還是 v1.2 語意時把來源換掉，確認畫面一模一樣**，
之後的 diff 才看得出問題出在推導還是畫法。

## 範圍

1. `renderer.tsx` 把已算好的 `D`（`erDerive(data)`）以 prop 傳給 `ErDiagram`（新增 `D: ErDerived`）
2. `diagram.tsx`：
   - `edges`：改為 `D.edges.filter(e => byName.has(e.child) && byName.has(e.parent))`（`byName` 是範圍內的表），取代 `:101-115`
   - `crossEdges`：改為 `D.edges.filter(e => scope.has(e.child) !== scope.has(e.parent)).length`（沒有 scope 時為 0），取代 `:85-92`
   - 其他讀 `c.fk` 的地方（卡片預設顯示欄 `:136-137`、FK 徽章 `:777`）**本 Task 不動**，留給 Task 152
3. 不改任何樣式、文案、互動

## 要改的既有檔案

`plugins/er-diagram-renderer/diagram.tsx`、`renderer.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 型別與 build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |
| 護欄 | — | `npm run check-plugins` | 通過 |
| 並排比對 | v1.1、v1.2 範例；`src/content/notes/` 底下既有的 ER 資料檔 | 改動前後各截一張 Diagram（全部、各 schema 範圍、聚焦一張表、hub 開關開／關） | 線條數量、位置完全相同 |
| 跨 scope 計數 | v1.2 範例切到每個 schema | 看「另有 N 條跨 schema 連線」 | 數字與改動前相同 |
| 搜尋與聚焦 | — | 搜尋 `customer`、聚焦 `contract` | 高亮的線與改動前相同 |

## 依賴

Task 149。

## 實作記錄（2026-11-12）

- `ErDiagram` 新增 `D` prop（renderer 已算好的 `erDerive(data)`）；`edges` 改為 `D.edges` 中兩端都在範圍內的，`crossEdges` 改由 `D.edges` 計算
- 等價性以腳本驗證，沒有用截圖：舊算法與新算法在 3 份範例＋`src/content/notes` 底下全部 `.er.json`、每個 schema 範圍（共 16 組）上，edge 清單（含順序）與跨範圍連線數完全相同
- tsc 錯誤數維持 40；`astro build`、`check-plugins --skip-build` 通過
