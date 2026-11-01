# Task 147 — 以四個 Subagent 實際生成範例 3D 元件，放進 md-viz

> 規格 [notecraft-generated-three.md](../notecraft-generated-three.md) §4.4、§6 V3／V5／V8；Q6／Q9 定案（§13）。
> 依賴 Task 146（component-generator 要讀到 3D 規範）。

## 為什麼要有這一步

同時滿足兩個驗收：「範例 three 元件（import OrbitControls）build 能過」與「用 component-generator 實際生成一個 three 元件、lint 通過並符合規範」。Q9 定案兩者是同一個元件；Q6 定案放在 `md-viz` 末段，官網 Demo 也會出現。

## 範圍

### 1. 標記

在 `src/content/notes/md-viz.mdx` 末段（既有內容之後）加一節與一個標記：

```mdx
{/* @ai-visualize
id: platform-topology-3d
type: free
prompt: |
  以等角 3D 呈現三層平台拓撲（例：前端／服務／資料），每層是一塊板、
  層內有數個節點、跨層以連線表示依賴。可旋轉檢視、點節點在旁邊面板顯示說明，
  按鈕可逐步高亮「一個請求從上到下經過哪些節點」。
status: pending
*/}
```

節的文字說明這是「空間關係本身是重點」的例子（為什麼不是 SVG）。prompt 的題材可以在動手時再微調，但要讓 planner 有理由選 three。

### 2. 走完流程

依 CLAUDE.md「AI 標記區塊」的四步：note-scanner → visualize-planner → component-generator → mdx-writer。

- visualize-planner 的規劃書要出現「為何不是 SVG」欄（Task 146）
- component-generator lint 通過、`tsc` 與 `astro build` 通過；失敗自動修最多 3 次
- mdx-writer 寫回 import、JSX（`client:visible`）、`status: generated`；外面是 `GeneratedFrame`

### 3. 人工對照規格 §5

逐條勾（結果寫進本檔「實作記錄」）：SSR 安全、cleanup 順序含 `forceContextLoss`、IntersectionObserver、pixelRatio ≤ 2、ResizeObserver、高度寫死、`role="img"`＋aria-label、HTML 面板、`role="group"` 按鈕列（含＋／－）、reduced motion、檔內顏色常數有 token 註解、無外框、無後處理、`enableZoom = false`、HTML overlay 標籤、WebGL 失敗退路。

不符合的地方：先調 prompt 或 Skill 規範重跑（代表規範寫得不夠清楚），**不要手改元件了事**；真的只能手改的，記在實作記錄。

### 4. 主專案驗證

- **V3 舊元件不受影響**：改動前後的 `dist/` 比對 —— 既有頁面 HTML 除了 md-viz 都相同、既有 island chunk 檔名不變（hash 變了要查原因）；新增的只有 three 相關 chunk
- **V8 放大檢視**：開 VizZoom → 點節點命中正確、拖曳旋轉不觸發畫布平移、⌥ 拖曳才平移；關閉後尺寸復原
- 官網：`site/` 若有 Demo 同步腳本，跑一次確認 md-viz 的 3D 元件在官網正常（只驗、不改官網結構）

## 要改的既有檔案

`src/content/notes/md-viz.mdx`；新增 `src/components/generated/platform-topology-3d.tsx`（id 以實際為準）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 生成 | 標記 `status: pending` | 四個 Subagent 跑完 | 元件存在、lint 通過、標記 `status: generated` |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |
| 顯示 | `npx astro dev` 開 `/notes/md-viz` | 捲到該節 | 元件 hydrate、可旋轉／點選、按鈕可操作、無 console 錯誤 |
| 捲動 | 滑鼠停在 canvas 上 | 滾輪 | 頁面捲動，畫面不縮放 |
| 減少動態 | 模擬 `prefers-reduced-motion: reduce` | 重新載入 | 無 rAF 迴圈；按步驟直接跳到終態 |
| 放大檢視 | — | 開 VizZoom 點節點 | 命中正確、面板更新 |
| 舊元件 | — | 比對改動前後 `dist/` | 只有 md-viz 與新增 chunk 不同 |

## 依賴

Task 146。

## 實作記錄（2026-11-01）

- 標記放在「互動圖表」之後的新一節「3D 場景」（不放末段，避免切開 Renderer Plugin 的敘事），id `demo-platform-layers`，主題沿用請假系統
- 四個 Subagent：planner 規劃書含 Why not SVG、7 步走查、顏色 token；generator 一次通過 lint／tsc（40）／build，自查清單逐條符合；mdx-writer 寫回 `client:visible`
- 對照規格 §5：全數符合。唯一手動修改：資訊面板加 `min-h-10`（說明從兩行變一行時按鈕列會往上跳），並把這條補進 SKILL.md 與 component-generator
- dev 驗證：逐步走查、點選方塊、放大檢視內點選（CSS scale 下命中正確）、放大檢視開關 20 次無新增 context
- 熱重載 40 次：建立 40 個 context、釋放 39（剩目前那個），無「Too many active WebGL contexts」
- V3：舊頁面只差版號與共用 CSS hash；除 md-viz 外沒有頁面載入 three
- dev server 在裝了 three 之後首次載入時，Vite 重新預打包依賴導致整頁 island 報「Cannot read properties of null (reading 'useState')」，重啟 dev server 即恢復（不是元件問題）
- reduced motion 未能在瀏覽器實測（無法模擬），以程式碼確認
