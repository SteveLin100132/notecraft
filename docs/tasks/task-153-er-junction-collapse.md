# Task 153 — Diagram 收合中間表

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §4.6、§5.5；Q8 定案。
> 依賴 [Task 152](task-152-er-crowfoot-markers.md)。

## 範圍

### 1. 開關與狀態

- 工具列加 checkbox「收合 N 張中間表」，與 hub 開關並排、同樣式；**目前範圍內有中間表時才顯示**（N 只算範圍內的）
- 狀態放在 `renderer.tsx`（與 `showHubEdges` 相同），prop `collapseJunctions`／`onCollapseJunctionsChange`；初始值 `opts.collapseJunctions`（預設 `false`，可由資料檔或 `plugins.json`、`<PluginView options>` 覆寫）
- 切到 Wiki 再切回來保留；不寫進 localStorage

### 2. 收合時的卡片

- 中間表卡片只剩標題列：表名、label、`M:N` 小標（`erd-card--junction`）；欄位清單與「展開全部」都不畫
- 搜尋命中中間表欄位時：小卡高亮並顯示命中數，**不自動展開**
- 點小卡 = 聚焦中間表（沿用既有聚焦）

### 3. 收合時的線

- 中間表 J 的兩條 FK 不畫（**聚焦 J 時例外**：照畫兩條真實 FK，不畫 M:N 線）
- 改畫 M:N 線 A —（經過 J）— B：
  - A 到 J 靠近 A 的那一側、J 到 B 各一段貝茲曲線，中間以直線在 J 底下相連（SVG 在卡片下方，被卡片蓋住）
  - A、B 在 J 的同一側時，進出點上下錯開 6px
  - B 端 marker = `edge(J→A).card.child`，A 端 = `edge(J→B).card.child`（§4.6）
  - 自我多對多（A = B）：從 A 出發經過 J 回到 A
- `edgeState`：A、B 或 J 任一是聚焦／hover 對象 → `on`；聚焦 A 時 B 與 J 算相關表、不淡化
- 聚焦列文字加「與 B 多對多（經由 J）」
- hub：A 或 B 是 hub 表時，M:N 線跟著 hub 開關、色調 `opt`
- scope：A、B、J 都在範圍內才畫；否則照原本兩條 FK 計入跨 scope 連線數
- `measure` 的 deps 加上收合狀態（小卡改變版面高度）

### 4. 圖例

Task 152 的圖例面板加上「M:N 多對多（中間表已收合）」那一列；只在收合時顯示。

### 5. 範圍外

Wiki、local diagram、總覽的外鍵數**不受開關影響**。

## 要改的既有檔案

`plugins/er-diagram-renderer/diagram.tsx`、`renderer.tsx`、`styles.ts`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 開關 | v1.3 範例 | 看工具列 | 「收合 1 張中間表」；v1.2 範例沒有這個開關 |
| 收合 | — | 勾選 | `case_member` 縮成標題列；`biz_case`—`employee` 之間一條線經過它，兩端 `o<` |
| 展開 | — | 取消勾選 | 回到 Task 152 的樣子，版面高度復原 |
| 聚焦端點 | 收合 | 聚焦 `biz_case` | M:N 線亮起、`employee` 與 `case_member` 不淡化、聚焦列有「與 employee 多對多（經由 case_member）」 |
| 聚焦中間表 | 收合 | 點 `case_member` 小卡 | 改畫兩條真實 FK |
| 搜尋 | 收合 | 搜尋 `role` | 小卡高亮、顯示命中數、不展開 |
| 預設收合 | `<PluginView options={{ collapseJunctions: true }}>` | 開頁 | 一開始就是收合 |
| scope | 收合 | 切到不含 `employee` 的 schema | 沒有 M:N 線；跨 schema 連線數含原本那條 FK |
| 切分頁 | 收合 | 切到 Wiki 再切回 Diagram | 仍是收合 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 152。
