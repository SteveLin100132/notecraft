# Task 84 — 響應式（container query）、無障礙、Esc 逐層退

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §7（動態）、§8.1（窄 bar）、§8.7、§9、§10。
> 依賴 [Task 81](task-81-er-wiki-pages.md)、[Task 82](task-82-er-local-diagram.md)、[Task 83](task-83-er-diagram-scope.md)。

## 範圍

### 1. container query 取代 media query

Handoff 用 `@media (max-width:760px)`，但**筆記內文欄就是 760px** —— 桌面上的內嵌永遠吃不到、手機上的 page 反而吃得到。判斷依據改為外殼自己的寬度：

- 外殼 `container-type: inline-size; container-name: erd`
- 斷點：

  | 容器寬 | 行為 |
  | --- | --- |
  | ≤ 760 | nav 改覆蓋（absolute、`--shadow-lg`）；頁面 padding 20px 18px |
  | ≤ 560 | 局部關聯圖改直向（Task 82 若用 JS 切換，這裡改為 CSS 驅動或保留 JS，擇一並刪掉另一套） |
  | ≤ 520 | bar 精簡：Tabs 只留 icon（文字進 `aria-label`）、crumb 隱藏、範圍 pill 水平捲動；embed 高度 `min(580px, 75vh)`（Task 80 已做，確認一致） |

- 結果：桌面上的內嵌也用覆蓋式導覽 —— 符合 handoff「embed 導覽預設收」的意圖
- `GeneratedFrame` 的放大檢視（`VizZoom`）把內容搬進全螢幕後，容器變寬、自動切回寬版（不需特別處理，驗收時確認）

### 2. 無障礙

- Tabs：`role="tablist"`／`role="tab"`／`aria-selected`、`aria-controls` → main；←／→ 切換
- 導覽：`<nav aria-label="Schema 與資料表">`；caret `aria-expanded`；目前節點 `aria-current="page"`
- 範圍 pill：Task 83 已做 radiogroup，←／→ 移動選取
- 全寬覆蓋層：`role="dialog" aria-modal="true" aria-label="<title>（全寬檢視）"`；**開啟時焦點移進覆蓋層、關閉時還給「展開全寬」按鈕**（v1.1 沒做）
- 覆蓋式導覽（≤760）開啟時焦點移到篩選框，關閉時還給導覽開關
- 動態：hover 上移 1px、press `scale(.97)` 在 `prefers-reduced-motion: reduce` 下取消位移

### 3. Esc

沿用 v1.1 逐層退，補兩條防護：

1. `e.defaultPrevented` → 不處理（工作台 `wb-escape` 的 Palette／Drawer 已處理過的 Esc）
2. 焦點不在本外殼內、且不在全寬 → 不處理（同一篇筆記兩個內嵌時，不會兩張圖同時反應）
3. 順序：tooltip／focus（僅 Diagram 分頁）→ 覆蓋式導覽（≤760）→ 全寬
4. 真的處理了才 `preventDefault()`

**需驗證**：`VizZoom` 的 Esc 監聽在 capture 階段（[VizZoom.tsx:115-119](../../src/components/islands/VizZoom.tsx)）。在 VizZoom 放大檢視中聚焦一張表按 Esc，若 VizZoom 先關掉就違反逐層退。
先實測；若確實如此，plugin 也改在 capture 階段監聽、僅在「確實有東西可退」時 `stopPropagation()`。結論寫進設計文件 §17。

## 要改的既有檔案

`plugins/er-diagram-renderer/{styles.ts, renderer.tsx, nav.tsx, diagram.tsx, local-diagram.tsx}`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 桌面內嵌 | 1440 寬，「資料檔內嵌測試」 | 開導覽 | 覆蓋在內容上 |
| 桌面 page | 1440 寬，`/view/…` | 看導覽 | 並排、不覆蓋 |
| 手機 page | 375 寬 | 開導覽 | 覆蓋；bar 精簡 |
| VizZoom 放大 | 內嵌 → 放大檢視 | 看外殼 | 寬版（導覽並排） |
| 鍵盤走訪 | — | 只用 Tab／←→／Enter | 能切分頁、走導覽、開表、切範圍 |
| 焦點歸還 | embed | 展開全寬 → Esc | 焦點回到「展開全寬」 |
| Esc 逐層 | 全寬 + 聚焦 | Esc × 2 | 先取消聚焦、再回到本文 |
| Esc 不越權 | `/view` 頁開 Palette（⌘K） | Esc | 只關 Palette，Diagram 聚焦不變 |
| 兩個內嵌 | 同篇兩張圖都聚焦 | 焦點在第一張、按 Esc | 只有第一張取消聚焦 |
| VizZoom + Esc | VizZoom 放大中聚焦一張表 | Esc | 先取消聚焦（依實測結論處理後） |
| reduced motion | 系統開啟減少動態 | hover 卡片 | 不位移 |
| 護欄 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過 |

## 依賴

Task 81、82、83。

## 實作記錄（2026-09-27）

- **VizZoom 確實會吃掉 Esc**（capture + stopPropagation）。plugin 改掛 capture、先於 VizZoom 執行，有東西可退才 `stopImmediatePropagation`；實測放大中先取消聚焦、再關放大
- page 模式的 sticky 規則權重較高、蓋掉窄版的 absolute，窄版規則補上 `position: absolute`
- 覆蓋式導覽加背板；embed 的提示列限一行、聚焦列關聯文字限兩行
- 測試環境：Browser pane 未繪製時 ResizeObserver／IntersectionObserver 不觸發，截圖讓頁面繪製後即正常
