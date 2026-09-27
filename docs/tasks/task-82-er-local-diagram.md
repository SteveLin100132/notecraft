# Task 82 — Table 頁的局部關聯圖

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §8.4；Q5 定案。
> 設計交付 README〈Wiki：Table 頁〉第 6 點；prototype `er/er-diagram.jsx › ErLocalDiagram`。
> 依賴 [Task 81](task-81-er-wiki-pages.md)。

## 範圍

新增 `local-diagram.tsx`，填入 Task 81 留的佔位。

### 1. 版面

- 三欄 grid `1fr auto 1fr`、gap 72px、padding 16px 18px，點陣背景（同 Diagram 畫布）
- 欄頭：「父表 N」｜「本表」｜「子表 N」—— N 為 `parentTables`／`childTables` 的長度（去重、排除自我參照）
- 節點：小卡（name mono 12px 藍 + label 11px），**可點 → 該表 Wiki**
- 本表節點：`--gradient-accent` 底、`--shadow-accent`、字 `--blue-950`；有自我參照時下方註記「自我參照」（**不佔名額**）

### 2. 上限（Q5）

- 父、子各最多 **8 張**，依 `tables[]` 原順序
- 超過時欄尾放「另有 N 張」chip → `scrollIntoView` 到下方「參照」／「被參照」清單（清單永遠列全部）
- 不區分是否為 hub 表

### 3. 連線

- SVG 貝茲曲線 1.3px `--blue-300`，**箭頭指向父表**（同 FK 方向：子 → 本表 → 父）
- 量測 DOM 後繪製：`useLayoutEffect` + `ResizeObserver`（觀察容器）
- `document.fonts.ready` 後再量一次（Noto Sans TC 晚到，首量會偏）
- 「另有 N 張」chip 不連線

### 4. 窄寬度

容器寬 < 560px：改上下三列（父 → 本表 → 子），連線改垂直貝茲。以 Task 84 的 container query 為準；本 Task 先用 `ResizeObserver` 量到的寬度切換版面，Task 84 若改純 CSS 再調整。

## 要改的既有檔案

新增 `plugins/er-diagram-renderer/local-diagram.tsx`；改 `wiki.tsx`、`styles.ts`、`plugins/registry.json`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 箭頭方向 | v1.2 範例某張有父有子的表 | 看局部圖 | 左側父表、右側子表；箭頭都指向父方向 |
| 自我參照 | 有自我參照 fk 的表 | 看局部圖 | 本表下方「自我參照」，父欄不多出自己 |
| 上限 | `schema-demo.er` 的 `option_item`（被 20+ 張表指向） | 看局部圖 | 子欄 8 張 +「另有 N 張」；點 chip 捲到「被參照」清單，清單列全部 |
| 節點可點 | — | 點某父表節點 | 開該表 Wiki、捲回頂端 |
| 視窗縮放重算 | — | 拖動視窗寬度 | 連線跟著節點位置更新，無錯位 |
| 字型晚到 | 清快取 reload | 看連線 | 端點對準節點（`fonts.ready` 後重量） |
| 窄寬度 | 容器 < 560px | 看局部圖 | 上下三列、垂直連線 |
| 沒有關聯 | 無 fk、無子表的表 | 看局部圖 | 只有本表節點，無連線、無錯誤 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 81。

## 實作記錄（2026-09-27）

- 「另有 N 張」以 `data-erd-rel` 屬性找目標清單（同頁多個內嵌時 id 會重複）
- 實測 `option_item`（16 張子表）：畫 8 張 + 「另有 8 張」；容器 < 560px 自動改直向
