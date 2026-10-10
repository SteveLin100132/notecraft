# Task 134 — 互動與浮層：Toolbar、著色下拉、hover／搜尋高亮、提示框、圖例、統計列、縮放控制、選取、偏好

> 規格 [notecraft-workbench-notes-graph.md](../notecraft-workbench-notes-graph.md) §6.1、§7、§8、§9、§12；handoff H§2、H§4.5、H§4.6、H§5.2–H§5.4。Q4、Q5、Q6、Q9 定案（§20）。
> 前置：Task 133。Task 135 靠它。

## 為什麼要有這一步

Task 133 之後圖畫得出來但不能操作。這個 Task 補上文件模式的全部互動：Toolbar 的控制、hover 與搜尋的高亮、畫布上的四個浮層、點節點開 Drawer，以及偏好的保存。

## 範圍

### 1. `src/lib/wb-graph-prefs.ts`（新增，client-safe）

localStorage `nc-graph-prefs-v1`（Q6）：

```ts
export interface GraphPrefs {
  mode: "doc" | "tag";
  colorBy: "folder" | "series" | "tag" | "none";
  kinds: Record<WbEdgeKind, boolean>;
  showOrphans: boolean;
  legendOpen: boolean;
}
export const DEFAULT_GRAPH_PREFS: GraphPrefs;   // doc、folder、四種全開、true、true
export function readGraphPrefs(): GraphPrefs;   // 讀不到或值無效 → 預設
export function writeGraphPrefs(patch: Partial<GraphPrefs>): GraphPrefs;
```

`GraphView` 首次 render 用預設值，effect 裡才讀偏好。搜尋字串、hover、平移縮放不保存。

### 2. `wb/graph/GraphToolbar.tsx`（H§2）

由左到右，群組之間用既有的 `.wb-tb-div`：

| 控制 | 做法 |
| --- | --- |
| 已篩選 ✕（Q5） | 網址上有 `pending`／`hasAi`／`nofm`／`fav` 任一個時才出現；點了以 `patch` 清掉這四個旗標（留在 Graph）。沿用 `Chip` |
| 關聯依據 | 既有的 `Seg`（`.wb-setseg` 樣式）；本 Task 切到「標籤」時畫面先不變，Task 135 接上 |
| 著色 | `GrColorMenu`（見下） |
| 邊 | 4 個 `.gr-kind`，`role="checkbox"`；只在文件模式 |
| 顯示孤島 | `.gr-sw`（`.wb-switch` 縮小版），`role="switch"` |
| 搜尋 | 既有的 `SearchBox`，寬 170；有字時顯示清除鈕；Esc 清空並 `preventDefault` |
| 計數 | 既有的 `.wb-count`「N 篇」（筆記數，不含資料檔） |

`SearchBox` 目前沒有清除鈕與 Esc 處理：以選填 props 加上，不影響其他頁的用法。

### 3. `wb/graph/GrColorMenu.tsx`（H§2.1）

- 自訂下拉，不用原生 `<select>`；選單 `position: fixed`、z-index 用 `--wb-z-overlay`
- `role="listbox"`＋`aria-activedescendant`；鍵盤操作照 H§2.1
- Esc 以 `pushEscape` 登記（規格 §14 D2，不做優先級）；點外面關閉
- reduced-motion 不做進場動畫

### 4. 高亮（H§4.5、H§5.2）

- 根元素加 `.is-dimming`，只有高亮集合的節點與邊加 `.hot`；淡出規則寫成 `.is-dimming .gr-n:not(.hot)` 這類選擇器，用 `fill-opacity`／`stroke-opacity`，**不對群組設 `opacity`**
- 高亮集合：hover 節點＝本身＋相連節點＋相關邊；hover 邊＝兩端＋該邊；搜尋＝符合的節點＋兩端都符合的邊。hover 優先於搜尋
- 搜尋比對 `標題 + 資料夾 + 全部標籤`，不分大小寫；只高亮、不過濾
- 邊的熱區：透明線，寬 `calc(10px / var(--k))`，`pointer-events: stroke`
- 邊的開關只影響顯示與統計，**節點位置不動**

### 5. 浮層 `wb/graph/GrOverlays.tsx`（H§4.6）

| 浮層 | 重點 |
| --- | --- |
| 統計列 `GrStats` | 文件模式「N 篇筆記・M 條關聯・K 篇孤島」；搜尋時附「・符合 n」；`role="status"` |
| 縮放控制 `GrZoom` | 放大 ×1.25、縮小 ×0.8、符合視窗；到上下限時 disabled；倍率 `aria-live="polite"` |
| 圖例 `GrLegend` | 可收合、`aria-expanded`；著色分組（兩欄，只列畫面上有的，含 Q4 的「其他」）、節點大小、形狀、四種線型（關掉的 opacity .4） |
| 提示框 `GrTipNode`／`GrTipEdge` | 位置與翻邊照 H§4.6；`role="tooltip"`、`pointer-events:none` |

- 浮層在 DOM 裡排在 `<svg>` **之前**（Q9）
- z-index 用 `--wb-z-tip`
- 圖示用 `lucide-react`（規格 §14 D14）；線型樣本是 inline SVG

### 6. 點擊、選取與鍵盤（規格 §8.2–§8.4）

- 筆記節點：`<g role="button" tabindex="0">`，事件走 `NoteRow.tsx` 的 `rowHandlers`；`aria-label`「筆記 {標題}，連入 n、連出 m」
- 資料檔節點：SVG `<a href>` 前往 `/view/<routePath>`
- 選取環、光暈；Drawer 開啟後若節點被蓋住，畫布平移、不縮放（H§5.4）。Drawer 寬度量 `.wb-drawer` 的 `offsetWidth`
- focus 等同 hover（顯示提示框）；聚焦的節點在可視範圍外時畫布平移讓它進來
- 著色、顯示孤島改變時重新佈局並符合視窗

## 要改的既有檔案

`src/components/wb/graph/GraphView.tsx`、`GraphCanvas.tsx`、`src/components/wb/ui.tsx`（`SearchBox` 的選填 props）、`src/components/wb/NotesWorkbench.tsx`（把 `patch`、`query` 傳給 `GraphView`）、`src/styles/workbench.css`。新增 `src/lib/wb-graph-prefs.ts`、`src/components/wb/graph/GraphToolbar.tsx`、`GrColorMenu.tsx`、`GrOverlays.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 狀態 02 | 文件模式 | hover 節點 | 相鄰節點與邊保持原色、其餘淡出；提示框靠右緣時翻到左側 |
| 狀態 03 | — | 點節點 | 選取環、NoteDrawer 開啟；節點在 Drawer 底下時畫布平移；再點一次關閉 |
| 狀態 04 | — | hover 邊 | 提示框「A → B」與各種類次數、線型樣本 |
| 狀態 05 | — | 搜尋「React」 | 符合的全亮並顯示標題；統計列附「符合 n」；Esc 清空且不關 Drawer |
| 狀態 13 | — | Tab | 先到縮放控制與圖例，再到節點；虛線 focus 環＋提示框；Enter 開 Drawer |
| 著色下拉 | — | 鍵盤操作 | ↑↓／Home／End／Enter／Esc／Tab 都照 H§2.1；選完 focus 回按鈕 |
| 著色分組 | 分組超過 8 個的工作區 | 著色依資料夾 | 前 8 組有顏色，其餘是灰色「其他」；圖例列出 |
| 邊的開關 | — | 關掉「連結」 | 該種邊消失、統計的 M 變少；節點位置不動 |
| 顯示孤島 | — | 關掉 | 孤島消失、重新佈局並符合視窗；統計的 K 維持原數 |
| 已篩選 | `?pending=1&view=graph` | 載入 | 只畫待生成的筆記；Toolbar 有「已篩選 ✕」，點了恢復全部 |
| 偏好 | 改著色、關兩種邊、收合圖例 | 重新整理 | 全部保留 |
| 資料檔節點 | — | 點擊 | 前往 `/view/…`；可中鍵開新分頁 |
| Esc | Drawer 開著、著色下拉開著 | 按 Esc | 一次只關一層 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 133。

## 實作記錄（2026-10-10）

- 與 Task 133、135 合併成一筆 commit
- **沒有改 `SearchBox`**：Graph 的搜尋框直接寫在 `GraphToolbar`（沿用 `.wb-search`），清除鈕與 Esc 都在那裡處理
- 鍵盤：Enter／Space 等同單擊（開 Drawer），沒有走 `rowHandlers` 的 Enter（那是「開啟筆記」）；單擊、`⌘`／`Ctrl`＋單擊、中鍵、雙擊走 `rowHandlers`
- hover／focus／click 委派在 `.gr-world` 上一份；在同一個元素的子節點之間移動不重複觸發
- 「不著色」用 c0（灰），著色下拉的預覽色點同步用 c0（handoff 的表與內文不一致，採內文與 prototype 的做法）
- 以 dev server 實測：hover 淡出與提示框、點節點開 Drawer 並出現選取環、搜尋「define」符合 3 個且 Esc 清空、關掉系列邊後邊數 25 → 12 而節點不動、隱藏孤島、著色下拉的 ↑↓／Enter／Esc 與焦點歸還、`?pending=1` 的「已篩選」、偏好寫入 localStorage
- 焦點環（`:focus-visible`）只以合成事件確認了提示框；真實鍵盤的 Tab 順序以 DOM 順序確認（縮放控制、圖例在節點之前）
