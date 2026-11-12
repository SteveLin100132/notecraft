# Task 152 — crow's foot marker、Diagram 的線、卡片徽章與圖例

> 規格 [notecraft-er-cardinality.md](../notecraft-er-cardinality.md) §5.1–§5.4、§5.6。
> 依賴 [Task 151](task-151-er-derive-cardinality.md)。

## 範圍

### 1. `markers.tsx`（新檔，Diagram 與 local diagram 共用）

- `ErMarkers({ uid })`：4 種形狀（`one`、`zero-or-one`、`one-or-many`、`zero-or-many`）× 4 種色調（`base`、`on`、`opt`、`local`）= 16 個 `<marker>`
- 共同屬性：`viewBox="0 0 16 12"`、`refX=16`、`refY=6`、`markerWidth=16`、`markerHeight=12`、`markerUnits="userSpaceOnUse"`、`orient="auto-start-reverse"`
- 形狀（線從左邊進來、x = 16 是卡片邊緣）：
  - `one`：直槓 x=10、x=13
  - `zero-or-one`：圓 cx=5 r=3、直槓 x=13
  - `one-or-many`：直槓 x=6；三叉 (9,6)→(16,1)、(16,6)、(16,11)
  - `zero-or-many`：圓 cx=4 r=3；三叉同上
- 子端 `one` 與父端 `one` 共用形狀；`zero-or-one` 亦同
- `markerId(uid, shape, tone)` helper；`uid` = `useId()` 去掉非英數字元
- 圓圈 `fill` 用畫布底色、`stroke` 用線色

### 2. Diagram 的線（§5.3）

- 移除 `erd-arrow`、`erd-arrow-on`
- 每條 edge：`markerStart` = 子端（`card.child`）、`markerEnd` = 父端（`card.parent`）；色調依 `edgeState`（`on` → `on`；hub 邊 → `opt`；其餘 → `base`）
- 複合 FK 一條線；聚焦時中點標籤是 `e.col`（已是 `cols.join(', ')`）
- 自我參照迴圈：`M x ay-14 C x+52 ay-14, x+52 ay+14, x ay+14`；標籤位置跟著調
- 同一對表多條 edge：依出現順序把兩端 y 錯開 6px（0、+6、−6、+12…）

### 3. 卡片（§5.6）

- FK 徽章：`D.fksOfColumn(t.name, c.name).length > 0`，不再看 `c.fk`；title 寫參照目標（複合時加「（複合 FK）」）
- PK 徽章：複合 PK 時 title「複合主鍵 (a, b)」
- UQ／IX 徽章只看欄位上的 `unique`／`index`；屬於複合唯一鍵的欄位不標
- 預設顯示欄：PK 欄位＋所有參與 FK 的欄位（`fksOfColumn`），再補一般欄位到 `defaultRows`

### 4. 圖例（§5.4）

- 畫布右下、縮放鈕旁加「圖例」按鈕（lucide 圖示＋文字，`aria-expanded`），點開小面板：四種形狀各一列（24px 短線＋說明），再一列「M:N 多對多（中間表已收合）」（Task 153 前先不顯示這列）
- 面板開著時 Esc 先關面板（接 `escapeRef`）；點畫布空白處也關
- 窄寬度照樣顯示（不受 `styles.ts:351` 影響）

### 5. 樣式（`styles.ts`）

- 刪 `.erd-root marker path { fill }`、`.erd-head--on`
- marker 的 path 用 `stroke`、`fill: none`；圓圈另一個 class 帶 `fill`
- 色調：`base` `--blue-300`、`on` `--orange-500`、`opt` `--neutral-300`、`local` `--blue-400`
- 圖例按鈕與面板
- **CSS 不可含 `< > & " '`**，規則以 `.erd-root` 起頭（`er-styles.mjs` 把關）

### 6. 實測後才定的事

`path` 的 `opacity`（`dim`／`off`）是否連 marker 一起淡化：Chrome、Safari、Firefox 各看一次。不行就把 `dim`／`off` 做成獨立色調，結果寫進實作記錄與規格 §15。

## 要改的既有檔案

新增 `plugins/er-diagram-renderer/markers.tsx`；改 `diagram.tsx`、`styles.ts`、`plugins/registry.json`（`files` 加 `markers.tsx`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 四種形狀 | v1.3 範例 | 看 Diagram | `contract → customer`：父端 `\|\|`、子端 `o<`；`contract.case_id`：父端 `o\|`；`customer_profile`：子端 `o\|`；`contract_item → contract`：子端 `\|<` |
| 方向 | — | 左右對調的兩張表（子在右、父在左） | 符號仍朝向正確的卡片 |
| 聚焦 | — | 聚焦 `contract` | 相關線與兩端 marker 都變橘色 |
| hub | — | hub 開關開啟 | hub 邊與 marker 都是灰色 |
| 自我參照 | — | 看 `department`、`option_item` | 兩端 marker 不重疊 |
| 複合 FK | — | 聚焦 `delivery` | 一條線、標籤 `contract_id, line_no` |
| 卡片 | — | 看 `delivery`、`option_item` 卡片 | `delivery` 兩欄都有 FK 徽章；`option_item.code` 沒有 UQ |
| 圖例 | — | 開關圖例；窄寬度；Esc | 正常顯示、Esc 先關圖例 |
| 縮放 | — | 縮到 20%、放到 250%；VizZoom 放大檢視 | marker 位置正確、大小跟畫布一起縮放 |
| 多個內嵌 | 同一篇筆記放兩個 ER | — | marker 互不干擾（各自的 `uid`） |
| v1.2 範例 | — | 對照 Task 150 截圖 | 除兩端 marker 外沒有差異 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 151。

## 實作記錄（2026-11-12）

- `markers.tsx`：`ErMarkers`、`markerUid`、`markerUrl`、`shapeOf`、`SHAPE_LABEL`；Diagram 用 `base`／`on`／`opt` 三種色調（12 個 marker），`local` 留給 Task 154
- marker 加 `overflow="visible"`，卡片邊緣（x = 16）上的筆畫才不會被切掉一半
- 樣式選擇器寫成 `.erd-root marker.erd-mk…`，特異度才壓得過 `.erd-local-svg path`
- **path 的 `opacity` 會連 marker 一起淡化**（Chrome 實測：在同一頁疊一張放大 5 倍的測試 SVG，對 path 設 opacity 0.12，兩端 marker 一起變淡），所以 `dim`／`off` 不另做色調。Safari、Firefox 未實測
- 形狀與方向：同一張測試 SVG 確認四種形狀正確、`auto-start-reverse` 讓起點端朝向子表卡片
- 圖例做成縮放列最左邊的「圖例」文字鈕（不另開浮動按鈕），面板開在縮放列上方；Esc、點畫布空白處都會關閉；按住面板不會開始平移
- 卡片 FK 徽章的 title 多一行參照目標（`→ contract_item.line_no（複合外鍵）`）
- 實作中踩到：`measure` 裡新加的計數變數取名 `k`，蓋掉了外層的縮放倍率 `k`，座標全變 Infinity。已改名為 `nth`
- 驗收用 fixture（不 commit）：`tmp/er-ws`（v1.3 範例、v1.2 範例、一篇內嵌兩次的筆記），dev server 以 `astro dev --root <worktree>`、`NOTECRAFT_NOTES_DIR=tmp/er-ws` 啟動
