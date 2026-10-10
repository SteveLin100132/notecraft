# Task 135 — 標籤模式、模式切換動畫、兩種空狀態、reduced-motion

> 規格 [notecraft-workbench-notes-graph.md](../notecraft-workbench-notes-graph.md) §5.3、§6.2、§8.2、§11；handoff H§4.3、H§5.5、H§6.2、H§6.3。Q3、Q7、Q8、Q10 定案（§20）。
> 前置：Task 134。Task 136 靠它。

## 為什麼要有這一步

補上第二種關聯模式與剩下的狀態畫面。標籤模式的佈局函式在 Task 133 已經寫好並有斷言，這裡接上畫面、樞紐的互動與兩種模式之間的移動動畫。

## 範圍

### 1. 標籤模式的畫面（H§4.3）

- 樞紐由 `pickTagHubs`（Task 132）決定：全站前 8 個，篩選中的標籤一律是樞紐；依數量由多到少排在圓上（Q3）
- 另有「其他標籤」（只帶非樞紐標籤的筆記）與「未加標籤」（沒有標籤的筆記、資料檔）兩團：虛線圓、`--wb-gr-c0` 描邊、不可點、不可聚焦
- 樞紐：`--wb-panel` 底、2px 描邊（顏色＝該標籤在「標籤」著色下的分類色）；螢幕半徑 ≥ 11px 時圓內顯示筆記數、名稱在下方
- 筆記—樞紐的細線：0.8px `--wb-gr-e-tag`、無箭頭；筆記之間不畫線
- Toolbar：標籤模式不顯示「邊」的四個開關
- 統計列：「N 篇筆記・T 個標籤・U 篇未加標籤」
- 圖例：「結構」區塊（樞紐、未加標籤、細線）

### 2. 樞紐的互動（Q7，規格 §8.2）

- 樞紐是 SVG `<a href>`，連到 `/notes?tag=<標籤>&view=graph`（以 `toSearch({ ...EMPTY_QUERY, tag, view: "graph" })` 產生，經 `withBase`）。**真的換頁**，不用 `replaceState`
- `aria-label`「標籤 {名稱}，n 篇筆記」
- hover／focus 樞紐：樞紐＋成員＋該樞紐的細線高亮；提示框「{名稱}／筆記 n・點一下只看這個標籤」
- hover 筆記：該筆記＋它的樞紐＋對應細線；提示框多一行「標籤 a、b」
- 換頁後因為偏好已保存（Task 134），仍停在標籤模式

### 3. 模式切換動畫（H§5.5，規格 §5.3）

- 節點從目前位置以 600ms、`1−(1−t)³` 移到新位置；邊每一幀依目前位置重畫；樞紐 600ms 淡入；同時畫布符合視窗（360ms）
- tween **不經過 React**：以 ref 直接改節點的 `transform` 與邊的 `d`，結束時才把最終座標寫回 state（做法依 Task 131 的結論）
- 節點 > 150：不做移動動畫，直接換位（Q8）
- `prefers-reduced-motion`：直接換位
- tween 進行中再切一次模式：以目前的中間位置為起點重新開始，不跳回

### 4. 空狀態（規格 §11）

`wb/graph/GrStates.tsx` 補兩個元件，版面照 handoff 的 `gr-` 樣式，不用 `wb/EmptyState.tsx`。

**A：沒有筆記**（H§6.2）

- 條件：Graph 用的 rows 為空
- 「清除篩選」是 `<a href="/notes?view=graph">`（經 `withBase`），不是按鈕
- 說明裡的篩選名稱用 `NotesWorkbench` 既有的 `scopeLabel`

**B：沒有任何關聯**（H§6.3）

- 條件：文件模式、rows > 0、可見的邊為 0（以資料為準，與邊的開關無關）
- 2×2 方式卡在 **dev 與正式環境都顯示**（Q10），文案用規格 §11 的版本，不是 handoff 的：

  | 方式 | 說明 |
  | --- | --- |
  | 行內引用定義 | 在內文寫 `:ref[文字]{id="…"}`，引用另一篇筆記裡的定義。 |
  | 嵌入定義 | 用 `::include{id="…"}` 把定義整段嵌入。 |
  | 站內連結 | 用 `[文字](/notes/slug)` 連到另一篇筆記。 |
  | 加入系列 | 在 `.notecraft/series.json` 把筆記列進同一個系列，章節之間會依序相連。 |

- 主按鈕「改用標籤模式」→ 切到標籤模式並寫入偏好
- 空狀態 B 出現時 Toolbar 照常顯示（要能切模式）

### 5. reduced-motion 總檢查

逐條確認本批新增的動畫都有對應：模式切換、平移與符合視窗、骨架脈動、著色下拉進場、提示框淡入、淡出轉場。寫在 `workbench.css` 既有的 `prefers-reduced-motion` 區塊。

## 要改的既有檔案

`src/components/wb/graph/GraphView.tsx`、`GraphCanvas.tsx`、`GraphToolbar.tsx`、`GrOverlays.tsx`、`GrStates.tsx`、`src/styles/workbench.css`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 狀態 06 | — | 切到「標籤」 | 樞紐等距排在圓上；多標籤筆記落在幾團之間；筆記之間沒有線；沒有「邊」的開關 |
| 其他標籤 | 主專案（19 個標籤） | 標籤模式 | 8 個樞紐＋「其他標籤」＋「未加標籤」；單次使用的標籤不是樞紐 |
| 狀態 07 | — | hover 樞紐 | 該團高亮、提示框正確 |
| 點樞紐 | — | 點擊 | 網址是 `?tag=…&view=graph`；Sidebar 的標籤高亮正確；仍在標籤模式；可中鍵開新分頁 |
| 篩選中的標籤 | `?tag=<不在前 8 的標籤>&view=graph` | 標籤模式 | 該標籤是樞紐 |
| 切換動畫 | ≤ 150 節點 | 文件 ↔ 標籤 | 節點 600ms 移動、邊跟著動、樞紐淡入；沒有可見的掉幀 |
| 大圖 | > 150 節點 | 切換 | 直接換位 |
| 連續切換 | 動畫進行中 | 再切一次 | 從中間位置接續，不跳動 |
| 狀態 10 | 篩選到沒有筆記 | — | 空狀態 A；「清除篩選」回到全部筆記的 Graph |
| 狀態 11 | 沒有任何邊的工作區 | 文件模式 | 空狀態 B；dev 與正式 build 都有四張方式卡；文案是規格 §11 的版本；「改用標籤模式」有效 |
| 邊全關 | 有邊的工作區 | 把四種邊都關掉 | **不是**空狀態 B，節點照畫 |
| reduced-motion | 系統設定開啟 | 切換模式、開下拉、看骨架 | 都沒有動畫 |
| base | `NOTECRAFT_BASE=/x` | build | 樞紐與「清除篩選」的連結帶前綴 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

Task 134。

## 實作記錄（2026-10-10）

- 與 Task 133、134 合併成一筆 commit
- 主專案（19 個標籤）的標籤模式：8 個樞紐＋「其他標籤」（3 篇）＋「未加標籤」（2 篇）；`?tag=Plugin&view=graph` 換頁後仍在標籤模式
- 模式切換的動畫以 `data-n`／`data-l`／`data-e`／`data-tl` 找元素直接改屬性；結束時 DOM 等於 React 畫的最終位置。加了計時器保底（`GR_MOVE_MS + 80` 後直接套用終點）：分頁在背景時 `requestAnimationFrame` 不觸發，節點會停在起點
- 節點沒變、只換模式或著色時，新的佈局算好之前先留著舊的畫面（大圖走 Worker 時不閃骨架）
- 兩種空狀態以 `?tag=nope`（A）與 `?folder=private`（B，1 篇筆記）確認；方式卡的文案是規格 §11 的版本，dev 與正式都顯示（Q10）
- **沒有實測**：動畫的幀率、`prefers-reduced-motion` 開啟時的畫面（只有程式碼路徑與 CSS 規則）
