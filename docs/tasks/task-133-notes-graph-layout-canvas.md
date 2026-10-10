# Task 133 — 佈局與靜態渲染：`wb-graph-layout.ts`、`GraphView`、畫布、平移縮放、token、窄畫面

> 規格 [notecraft-workbench-notes-graph.md](../notecraft-workbench-notes-graph.md) §3.1、§5、§7、§10、§12、§15；handoff H§1、H§4.1、H§4.2、H§4.4、H§5.1、H§5.6、H§6.4、H§7。Q8 定案（§20）。
> 前置：Task 131（佈局在哪裡算、是否 lazy）、Task 132（資料）。Task 134、135 靠它。

## 為什麼要有這一步

先讓文件模式的圖「畫得出來、可以平移縮放」：佈局純函式、SVG 結構、token 與 view 的接線都在這裡定下來。hover、浮層、標籤模式留給後面兩個 Task，這樣畫面結構有問題時不用連互動一起改。

## 範圍

### 1. `src/lib/wb-graph-layout.ts`（新增，純函式）

只能 `import type`、無 JSX、不碰 `window`。參數照 handoff H§5.6，不改數值。

```ts
export function mulberry32(seed: number): () => number;
export function layoutDoc(nodes, edges, groupOf, groups): { pos: Record<string, Pt>; clusters: Cluster[] };
export function layoutTag(nodes, hubs): { pos: Record<string, Pt>; hubs: Hub[] };   // 本 Task 先實作，Task 135 才接上畫面
export function fitView(points, width, height): { x: number; y: number; k: number };  // H§5.1
```

- 文件模式：亂數種子 11；有邊的節點力導向（> 150 節點用較緊的參數）、孤島依著色分組沿外圍排
- 標籤模式：亂數種子 5；樞紐等距排在圓上、筆記以黃金角螺旋圍著樞紐、120 次鬆弛
- 節點半徑、300 節點模式的 ×0.85 由 `wb-graph.ts` 的常數決定，佈局函式以參數接收

### 2. 數值常數與 token

- `wb-graph.ts` 匯出 `GR_R`、`GR_ZOOM`、`GR_DIM`、`GR_MOVE_MS`（JS 端需要的數值，H§7.1 末段）
- `workbench.css` 開頭的 `:root`（接在 `--wb-cal-*` 之後）加入 H§7.1 全部的 `--wb-gr-*`；**不搬 `.wb-dark` 覆寫**
- 規則裡不出現色碼字面值：handoff 的陰影收成 `--wb-gr-shadow-menu`／`-float`／`-tip`，其餘用既有的 `--wb-a-*`（規格 §12 的對照表）
- `gr-` 規則放在 860px 媒體規則之前

### 3. 元件

| 檔案 | 內容 |
| --- | --- |
| `wb/graph/GraphView.tsx` | 入口（依 Task 131 的結論決定是否 `React.lazy`）。輸出 `.wb-tb`（本 Task 只放右側的「N 篇」計數）與 `#nc-scroll.wb-body.flush.gr-body` |
| `wb/graph/GraphCanvas.tsx` | SVG：`g.gr-world` 內依序是邊、節點、標題；節點圓形、資料檔圓角方塊（H§4.1）；邊的四種線型與箭頭（`<path>` 三角形，不用 `<marker>`，H§4.2） |
| `wb/graph/useGraphViewport.ts` | 平移（pointer capture）、滾輪縮放（`passive:false`，以 `addEventListener` 掛）、符合視窗、360ms 滑動、reduced-motion 直接到位 |
| `wb/graph/GrStates.tsx` | 本 Task 只做骨架（H§6.1）；兩種空狀態在 Task 135 |
| `wb/GraphNarrow.tsx` | 窄畫面說明（H§6.4），**不放進 lazy chunk** |

渲染規則（規格 §7）：

- 平移縮放只改 `.gr-world` 的 `transform` 與 `--k`；標題字級寫成 `calc(11px / var(--k))`
- 標題顯示門檻以根元素的 `data-zoom` 切換（150%；> 150 節點時 240%），不逐一改節點
- 顏色用 class 或 `style` 寫 CSS 變數，不用 presentation attribute
- 選取環、focus 環只在該狀態時才渲染
- 節點 ≤ 150 在 render 內直接算佈局；> 150 先畫骨架、下一個 frame 再算；同一個 key 的結果放記憶體 Map
- 佈局改變時自動符合視窗：第一次無動畫，之後 360ms

本 Task 的節點**還不能點、沒有 hover**，只是看得到的靜態圖。著色固定依資料夾、四種邊全開、顯示孤島。

### 4. 接上 `/notes`

- `lib/wb-prefs.ts`：`WbView` 加 `"graph"`、`WB_VIEWS` 加一項、`VIEW_LABEL.graph = "Graph"`。設定頁的「預設 view」會自動多一個選項，不用改 `SettingsView.tsx`
- `NotesWorkbench.tsx`：
  - 頁籤：一般是五個；窄畫面是 List／Graph
  - `view` 的規則：窄畫面時 `graph` 維持 `graph`（顯示 `GraphNarrow`），其他一律 List
  - 另算一份 Graph 用的 rows：`applyFilters(rows, query, { favorites })`，不帶搜尋字串
  - `view === "graph"` 時不輸出自己的 Toolbar 與 Body，改渲染 `GraphView`（或窄畫面的 `GraphNarrow`）
  - `sel` 的「不在篩選結果裡就關 Drawer」effect，Graph 時改看 Graph 用的 rows
- 確認 `WorkbenchLayout` 的 pre-paint script 不用改：`defaultView !== "list"` 已經會先藏主區

### 5. 斷言

`scripts/checks/wb-graph.mjs` 補上佈局的性質斷言（不是座標快照）：

| 斷言 | 內容 |
| --- | --- |
| 確定性 | 同一輸入連跑兩次，座標完全相同 |
| 合法 | 沒有 NaN、Infinity |
| 不重疊 | 節點兩兩距離 ≥ 半徑和 − 1px |
| 孤島 | 都在主圖最大半徑之外；同組的孤島相鄰 |
| 標籤 | 樞紐等距、自 −90° 起；單標籤筆記離自己的樞紐最近 |
| 符合視窗 | 所有點落在視窗內；倍率在 25%–160% |
| token 同步 | `workbench.css` 的 `--wb-gr-r1`～`r4`、縮放門檻、淡出值、`--wb-gr-dur-move` 與 `wb-graph.ts` 的常數相同 |
| 純度 | `wb-graph-layout.ts` 不含非 `import type` 的 import |

## 要改的既有檔案

`src/lib/wb-prefs.ts`、`src/lib/wb-graph.ts`、`src/components/wb/NotesWorkbench.tsx`、`src/styles/workbench.css`、`scripts/checks/wb-graph.mjs`。新增 `src/lib/wb-graph-layout.ts`、`src/components/wb/graph/GraphView.tsx`、`GraphCanvas.tsx`、`useGraphViewport.ts`、`GrStates.tsx`、`src/components/wb/GraphNarrow.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 狀態 01 | 主專案 | 開 `/notes?view=graph` | 文件模式的圖；孤島在外圍成團並有群標；重新整理後佈局相同 |
| 邊 | 範例筆記 | 看請假功能規格 → 系統 Overview | 有箭頭、線型與顏色符合主要種類、多次關聯較粗 |
| 資料檔 | — | 看圖 | 資料檔是圓角方塊，只有與可見筆記相連的才出現 |
| 平移縮放 | — | 拖曳、滾輪 | 以游標為中心縮放，範圍 25%–300%；標題字級不隨縮放變大 |
| 狀態 08 | — | 點 Sidebar 的資料夾 | 只畫該資料夾，重新佈局並符合視窗 |
| 狀態 14 | 寬度 ≤ 860 | 開 `/notes?view=graph` | 頁籤只有 List／Graph；顯示說明；「改用清單檢視」回到 List |
| 設定 | 設定頁 | 把預設 view 設為 Graph | `/notes` 直接進 Graph，不先閃 List |
| SSR | — | 看 `/notes` 的 HTML 原始碼 | 沒有任何節點；`#nc-scroll` 存在 |
| reduced-motion | 系統設定開啟 | 縮放、符合視窗 | 直接到位，骨架不脈動 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 131、132。
