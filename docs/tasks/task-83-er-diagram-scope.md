# Task 83 — Diagram：schema 範圍、跨範圍提示、開啟 Wiki、狀態提升

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §4.2、§6.1、§8.6；Q8 定案。
> 設計交付 README〈Diagram 分頁〉；prototype `er/er-diagram.jsx › ErDiagram`、`er/er-docs.jsx`（範圍 pill）。
> 依賴 [Task 80](task-80-er-shell-nav-routing.md)（可與 81、82 並行）。

## 範圍

### 1. 範圍（scope）

`ErDiagram` 新增 prop `scope: Set<string> | null`（範圍內的表名；`null` = 全部）：

- 只畫範圍內的表；`layout.columns` 中沒有範圍內表的 group、以及因此變空的整欄濾掉
- edge 只畫兩端都在範圍內的；跨範圍的數量顯示在提示列尾：「另有 N 條跨 schema 連線未顯示。」（`--orange-600`）
- 切換範圍時：重置 `touched`、重新 fit
- 範圍變動後 focus 不在新範圍內 → 清 focus
- hub 表不在範圍內時，「顯示 hub 連線」開關與圖例的 hub 項隱藏
- 搜尋只搜範圍內的表

### 2. bar 的範圍 pill（`renderer.tsx`）

- Diagram 分頁時取代 crumb；「範圍」+「全部」+ 每個 schema key（mono）
- pill 高 24px、padding 0 10px、11.5px；選中 `--blue-700` 底白字
- `role="radiogroup"`／`role="radio"`／`aria-checked`
- 點「全部」→ route=overview；點某 schema → route=該 schema 頁；皆清 focus
- **隱含模式不顯示**，crumb 位置留空

### 3. 聚焦列「開啟 Wiki」

在「取消聚焦（Esc）」左側加藍 pill + `BookOpen` icon「開啟 Wiki」→ 切到 Wiki、開該表。

### 4. 狀態提升（Q8）

- `query`（→ 外殼 `dgQuery`）與 `showHubEdges` 從 `diagram.tsx` 提升到 `renderer.tsx`，以 props 傳入；切換 Wiki／Diagram 後仍在
- 範圍變動時 `query` 保留，只在新範圍內重新比對
- `expanded`、`hover`、`tip`、視角**不保留**（Diagram 切走時卸載，不改 `display:none`）
- 兩者**不寫入 localStorage**

### 5. 畫布高度

| 情境 | 高度 |
| --- | --- |
| embed | **440**（外殼 580 扣 bar、工具列、提示列；實作時量實際值微調）；容器寬 ≤ 520px 時隨外殼縮 |
| page | `clamp(420px, calc(100vh - 250px), 1200px)` |
| 全寬覆蓋層 | 填滿 main |
| 有 `options.canvasHeight` | 一律以它為準 |

## 要改的既有檔案

`plugins/er-diagram-renderer/{diagram.tsx, renderer.tsx, styles.ts}`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 範圍過濾 | `er-v12.er.json` | Diagram，點 `crm` | 只剩 crm 的表；空欄消失；重新 fit |
| 跨範圍提示 | 同上 | 看提示列 | 「另有 N 條跨 schema 連線未顯示。」，N 與手算相符 |
| 範圍與 route | 同上 | 點 `sales` pill，再切 Wiki | Wiki 在 sales 的 Schema 頁 |
| 聚焦出範圍 | 聚焦 crm 某表 | 切到 `sales` | 聚焦解除 |
| 導覽點範圍外的表 | 範圍 `crm` | 導覽點 sales 的表 | 範圍切到 sales、聚焦該表 |
| 開啟 Wiki | 聚焦某表 | 點「開啟 Wiki」 | Wiki、該表頁 |
| 搜尋保留 | Diagram 搜尋 `customer` | 切 Wiki 再切回 | 搜尋字串還在；視角重新 fit；展開的欄位收回 |
| 搜尋限範圍 | 範圍 `core` | 搜尋 crm 才有的表名 | 0 命中（紅） |
| 隱含模式 | `schema-demo.er` | Diagram | 無範圍 pill；行為與 v1.1 相同 |
| 自訂高度 | 測試資料 `options.canvasHeight: 700` | page 與 embed | 畫布皆 700 |
| Diagram 無回歸 | — | Task 77 驗收表 | 全部相同 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 80。

## 實作記錄（2026-09-27）

- 沒有範圍時完全沿用 v1.1 的版面（連空的分群框也照畫），只有選了範圍才濾掉變空的分群／欄
- 畫布高度改為在 embed／全寬填滿剩餘高度（flex），不寫死 440；實測未聚焦 434px
- 實測 crm 範圍：5 張表、「另有 13 條跨 schema 連線」與 node 驗算一致；搜尋字串跨分頁保留
