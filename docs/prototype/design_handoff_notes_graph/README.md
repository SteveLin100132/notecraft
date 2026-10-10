# Handoff：工作台 — 筆記頁（/notes）Graph 檢視

## Overview

在筆記頁（`/notes`）既有的 List／Board／Table／Timeline 之後，新增第五個檢視 **Graph**。目的是讓作者一眼看出筆記之間的結構：哪些筆記是樞紐、哪些是孤島、哪些主題聚在一起。點節點會開啟既有的 NoteDrawer 預覽，再決定要不要開啟筆記。

兩種關聯模式，同一批節點：

- **文件模式**：力導向圖。節點是筆記與資料檔，邊是四種有方向的關聯（定義引用、定義嵌入、站內連結、系列順序）。
- **標籤模式**：群聚圖。8 個標籤是樞紐，筆記圍著自己的標籤成團，多標籤筆記落在幾團之間。

前置交付：`design_handoff_workbench/`（外殼、Drawer、Palette）、`design_handoff_workbench_define_ref/`（define／include／:ref 與反向連結，本包的「定義引用／定義嵌入」邊即來自它的 build 期索引）。本包只描述新增與差異。

## About the Design Files

`source/` 與 `prototype/` 是 HTML＋瀏覽器端 React（Babel inline）做的**設計參考**，用來定稿視覺、文案與互動，**不是正式程式碼**。請在 NoteCraft codebase 用既有的工作台元件、`--wb-*` token 與資料管線重做；`source/` 只拿來對照結構、條件、class 名稱與數值。

## Fidelity

**High-fidelity。** 版面、間距、字級、顏色、文案、動態時序已定稿。顏色、字級、間距、圓角一律用既有 `--wb-*` token；Graph 專用的新值集中在 `pt-graph.css` 開頭，命名 `--wb-gr-*`（§7）。class 前綴 `gr-`。

## 怎麼看 Prototype

開 `prototype/NoteCraft-工作台-Graph-standalone.html`（自含單檔，可離線；等同專案根目錄的 `NoteCraft 工作台 Prototype.html`）。

- Sidebar「全部筆記」→ Header 頁籤 **Graph**。
- 右下 Tweaks →「Graph」區：
  - **Graph 狀態**：直接切到 14 個狀態畫面（見 §3）。選「自由操作」恢復一般互動。
  - **開啟 Graph 規格**：規格頁（狀態索引、節點／邊／文字／動態規格表、token 表、元件細部），內容與本 README 相同，可直接對照實際渲染。
  - **/notes 預設 view**：可設為 Graph。

示範資料：65 篇筆記（既有 13 篇＋請假系統 17 篇＋本包補的 35 篇）＋3 個資料檔；8 個標籤；3 個系列；約 13–15 篇孤島；3 個明顯樞紐（HTTP 基礎總覽、系統設計術語表、系統 Overview，各被 8 篇以上連入）。補充筆記在 `pt-graph-data.jsx` 的 `GR_EXTRA`，會併入 `window.NOTES`，所以 List／Board／Table 也看得到同一批資料。**正式版不需要這批假資料。**

---

## 1. 放在哪裡

殼不變：頁籤列 34、Rail 52、Sidebar 240、Header、Toolbar 40、Body。整頁不捲動。

| 區域 | 變更 |
|---|---|
| Header 頁籤 | `["List","Board","Table","Timeline","Graph"]`；窄畫面（< 860）為 `["List","Graph"]` |
| Toolbar（40px） | Graph 時換成 Graph 專用 Toolbar（§2）。List 的「分組」、AI 篩選 chip 在 Graph 不顯示 |
| Body | `.wb-body.flush.gr-body`：`overflow:hidden`，**Body 內不捲動**，改為畫布平移與縮放 |
| Sidebar 篩選 | 資料夾／子資料夾／系列／標籤照常作用：只畫符合的筆記；資料檔節點只在與可見筆記相連時出現 |
| NoteDrawer | 沿用既有 `PtDrawer`（480px，`position:absolute` 覆蓋主區右側＋scrim）。**圖不重排、不縮放**；若選取的節點落在 Drawer 底下，畫布整體平移到左側可見區（§5.4） |

Header 徽章「N 篇」沿用既有邏輯（套用篩選後的筆記數）。Graph 的搜尋**只高亮、不過濾**，所以 Graph 用的是「套用側欄篩選、但不套用搜尋」的 rows（prototype 的 `baseRows`）。

---

## 2. Toolbar

由左到右，`gap:10px`，群組之間用既有 `.wb-tb-div`（1×18px，`--wb-line`）分隔。Toolbar 本身沿用 `.wb-tb`（高 40、`overflow-x:auto`，窄時可橫捲）。

| 控制 | 元件 | 細節 |
|---|---|---|
| 關聯依據 | 既有 `.wb-setseg` 分段 | 標籤「關聯依據」（`.wb-tb-lbl` 11.5px `--wb-ink-3`）＋ `文件`｜`標籤`；`role=radiogroup` |
| 著色 | **自訂下拉 `GrColorMenu`**（不用原生 select） | 見 §2.1 |
| 邊（只在文件模式） | 4 個可勾選 chip `.gr-kind` | 高 26、圓角 pill、1px `--wb-line`；內含 12×12 勾選框（圓角 3，勾選時 `--wb-blue-l` 底＋白勾）、16px 線型樣本、短名稱「引用／嵌入／連結／系列」；`role=checkbox`，`title` 為完整說明 |
| 顯示孤島 | 開關 `.gr-sw` | 沿用 `.wb-switch` 縮小版 30×18、knob 12；`role=switch` |
| 搜尋（靠右） | 既有 `.wb-search` | 寬 170；placeholder「搜尋節點…」；有字時顯示清除鈕；Esc 清空 |
| 計數（靠右） | 既有 `.wb-count` | 「N 篇」（筆記數，不含資料檔） |

### 2.1 著色下拉（GrColorMenu）

- **按鈕** `.gr-dd`：高 26、pill、1px `--wb-line`、`--wb-panel` 底、12px `--wb-ink-2`、padding `0 9px 0 8px`、gap 7。內容：3 顆重疊色點預覽（8px，1.5px `--wb-panel` 描邊，彼此 −3px 重疊）＋目前選項名＋10px 下箭頭（`--wb-ink-3`）。hover 底 `--wb-bg`；展開時邊框 `--wb-blue-l`＋`0 0 0 3px rgba(44,110,187,.12)`，箭頭轉 180° 並變 `--wb-blue-l`；focus-visible 2px `--wb-gr-focus` 外框、offset 2。
- **選單** `.gr-dd-menu`：`position:fixed`（Toolbar 有 overflow，不能用 absolute），位於按鈕下方 6px、左緣對齊；寬 240、圓角 10、1px `--wb-line`、陰影 `0 12px 32px rgba(27,79,156,.16)`、padding 5。進場 140ms `--ease-out`：opacity 0→1、translateY(−4px)→0。
  - 標題列「節點著色依據」10.5px `--wb-ink-3`、letter-spacing .06em、padding `6px 9px 5px`。
  - 選項 `.gr-dd-opt`：padding `7px 9px`、圓角 7、gap 10；10px 色點預覽 ×3；名稱 12.5px 700 `--wb-ink`＋說明 11px `--wb-ink-3`；目前選項名稱變 `--wb-blue-l` 並在右側顯示 14px 勾。hover／鍵盤高亮底 `--wb-bg`。
  - 選項與說明：資料夾「依筆記所在資料夾」、系列「依所屬系列，未歸入者為灰」、標籤「依第一個標籤，未加標籤者為灰」、不著色「全部同色，只看結構」。
- **鍵盤**：按鈕上 ↑↓ 開啟；選單內 ↑↓／Home／End 移動、Enter／Space 選取並把 focus 還給按鈕、Esc 關閉並還 focus、Tab 關閉。點外面（透明 fixed scrim）關閉。`role=listbox`＋`aria-activedescendant`、選項 `role=option`＋`aria-selected`。
- 掛進既有 Esc 堆疊，優先級 35（介於 Modal 40 與浮層 30 之間）。
- reduced-motion：不做進場動畫。

---

## 3. 狀態畫面（Tweaks「Graph 狀態」可切換）

| # | 狀態 | 畫面 |
|---|---|---|
| 01 | 預設 | 文件模式、約 65 節點；孤島在外圍依著色依據成團，每團下方「孤島・分組名」 |
| 02 | hover 節點 | 該節點與直接相鄰的節點、邊保持原色，其餘淡出；提示框（標題、資料夾、連入／連出數） |
| 03 | 選取節點 | 選取環＋NoteDrawer 開啟；節點若被 Drawer 蓋住，圖平移到可見區 |
| 04 | hover 邊 | 提示框「A → B」＋「定義引用 ×3」（含線型樣本） |
| 05 | 搜尋中 | 輸入「React」：符合的節點全亮＋顯示粗體標題，其餘淡出；統計列附「符合 n」 |
| 06 | 標籤模式預設 | 標籤樞紐等距排在圓上，筆記圍著標籤成團，細線連回標籤 |
| 07 | 標籤模式 hover 樞紐 | 該團（樞紐＋成員＋細線）高亮，其餘淡出；提示框「前端／筆記 14・點一下只看這個標籤」 |
| 08 | 套用篩選 | 側欄「02-後端」：只畫該資料夾筆記與相連資料檔，重新佈局 |
| 09 | 載入中 | 畫布置中骨架：12 顆灰點＋7 條放射細線，脈動 1.4s；文字「正在計算筆記之間的關聯…」 |
| 10 | 空狀態 A | 篩選後沒有筆記（§6.2） |
| 11 | 空狀態 B | 有筆記但完全沒有關聯（§6.3） |
| 12 | 約 300 節點 | 文字全部隱藏，只留第 4 級（樞紐）標題；縮放 ≥ 240% 才全部顯示 |
| 13 | 鍵盤 focus | 節點虛線 focus 環＋提示框 |
| 14 | 寬度 < 860 | 不畫圖，改顯示說明與「改用清單檢視」（§6.4） |

---

## 4. 視覺規格

### 4.1 節點

| 級距 | 被連入數 | 半徑 token | 值 | 標題 |
|---|---|---|---|---|
| 第 1 級 | 0–1 | `--wb-gr-r1` | 5px | 縮放 ≥ 150% 或 hover／focus／選取／符合搜尋時顯示 |
| 第 2 級 | 2–3 | `--wb-gr-r2` | 8px | 同上 |
| 第 3 級 | 4–7 | `--wb-gr-r3` | 12px | 預設顯示 |
| 第 4 級（樞紐） | 8 以上 | `--wb-gr-r4` | 17px | 預設顯示 |
| 標籤樞紐 | — | `--wb-gr-r-hub` | 15 + 2.6 × √(該團節點數) | 一律顯示（名稱 + 筆記數） |

- 被連入數＝**不同來源**的數量；同一對筆記多次關聯只算 1。資料檔的連入／連出也照算。
- 300 節點模式半徑 ×0.85。
- 筆記＝圓形；資料檔＝**圓角方塊**（邊長 = 2r，圓角 = r × 0.38）。形狀本身即可區分，不依賴顏色。
- 填色＝著色依據的分類色（§7.1）；描邊 1.6px `--wb-gr-halo`。最淺的兩階（c6、c8）改 1px `--wb-blue-l` 描邊，避免在白底消失。
- hover：描邊改 1.4px `--wb-ink`。
- 選取：r+3.5 的 2.4px 環 `--wb-gr-sel`（品牌橙，與藍色節點區隔）＋ r+8 的光暈 `--wb-gr-sel-halo`。
- 鍵盤 focus（`:focus-visible`）：r+4.5 的 2px 虛線環（3 / 2.4）`--wb-gr-focus`。
- 選取環、光暈、focus 環**只在該狀態時才渲染**（不要對每個節點都渲染再用 opacity 隱藏；300 節點時會拖慢）。

### 4.2 邊（文件模式）

| 種類 | 意義 | 線型 | 基本線寬 | 顏色 token |
|---|---|---|---|---|
| 定義引用 `ref` | 行內引用某篇筆記的定義（`:ref`） | 實線 | 1.4px | `--wb-gr-e-ref` #2c6ebb |
| 定義嵌入 `inc` | 把某篇筆記的定義整段嵌入（`::include`） | 虛線 7 / 3.5 | 1.8px | `--wb-gr-e-inc` #d4850f |
| 站內連結 `link` | 一般連到另一篇筆記的連結 | 點線 1.6 / 3.4 | 1.3px | `--wb-gr-e-link` #7f8ba0 |
| 系列順序 `seq` | 同一系列上一章 → 下一章 | 點劃線 9 / 3 / 2 / 3 | 1.5px | `--wb-gr-e-seq` #16917a |

- **有方向**：箭頭為長 7px、底寬 6.6px 的實心三角形（以 `<path>` 畫，不用 `<marker>`，不隨線寬放大），尖端落在目標節點邊緣外 2px；線段起點從來源節點邊緣外 1.5px 開始。
- **合併**：同一對（有序）筆記多次關聯合成一條邊。線寬 = 基本線寬 + (總次數 − 1) × 0.7px，上限 4.6px；線型與顏色取次數最多的種類（同數依 ref → inc → link → seq）；提示框列出各種類次數。
- 兩端節點太近（距離 < 兩半徑 + 4）時不畫。
- 邊的開關只影響顯示與統計，**不重新佈局**。開關依「主要種類」判斷。
- hover 熱區：沿邊的透明線，螢幕寬 10px（world 寬 = 10 / 縮放倍率），`pointer-events:stroke`。

### 4.3 標籤模式

- 樞紐：`--wb-panel` 底、2px 描邊（顏色＝該標籤在「標籤」著色下的分類色）；樞紐夠大（螢幕半徑 ≥ 11px）時圓內顯示筆記數，名稱在下方；不夠大時名稱與數字一起放下方。
- 「未加標籤」：虛線圓（4 / 3）`--wb-gr-c0` 描邊、`--wb-gr-canvas` 底；點擊無動作。
- 筆記—標籤細線：0.8px `--wb-gr-e-tag`，無箭頭。筆記與筆記之間不畫線。
- 點標籤樞紐 = 套用側欄標籤篩選（停留在 Graph）。

### 4.4 文字

- 節點標題 11px（**螢幕尺寸**；world 字級 = 11 / k），`--wb-ink-2`；hover／選取／符合搜尋時 700 `--wb-ink`。3px（螢幕）光暈描邊 `--wb-gr-halo`，`paint-order:stroke`。位於節點下方 `r + 1.25 × 字級`。
- 樞紐名稱 11.9px 700 `--wb-ink`，光暈 3.5px。
- 孤島群標「孤島・{分組}」10px `--wb-ink-3`（縮放 < 50% 時以 50% 計），位於群下緣 + 14。
- 何時顯示標題（任一成立）：hover／focus／選取；符合搜尋；hover 時的相鄰節點（縮放 ≥ 80% 或本身第 3 級以上，300 節點模式不顯示）；縮放 ≥ 150%（節點 > 150 時 ≥ 240%）；預設第 3 級以上（節點 > 150 時只有第 4 級）。

### 4.5 淡出

| 項目 | 值 | token |
|---|---|---|
| 邊・靜止 | 0.55 | `--wb-gr-edge-rest` |
| 邊・相關（hover／搜尋時） | 0.95 | — |
| 邊・淡出 | 0.06 | `--wb-gr-dim-edge` |
| 節點、標題、群標・淡出 | 0.16 | `--wb-gr-dim-node` |

淡出一律用 `fill-opacity`／`stroke-opacity`（prototype 以 CSS 變數 `--op` 傳到子元素），**不要對群組設 `opacity`**——300 節點時每個群組都會變成合成圖層，瀏覽器會卡住。轉場 220ms。

### 4.6 畫布上的浮層

- **統計列**（右上 12 / 14）：高 26 pill、`--wb-panel` 底、1px `--wb-line`、12px `--wb-ink-3`、tabular-nums；數字 700 `--wb-ink`；分隔「・」`--wb-line`。
  - 文件模式「N 篇筆記・M 條關聯・K 篇孤島」：N 不含資料檔；M 只計目前勾選且可見的邊；K 為無任何邊的筆記數（關掉「顯示孤島」仍顯示原數）。
  - 標籤模式「N 篇筆記・T 個標籤・U 篇未加標籤」。
  - 搜尋時附加「・符合 n」（`--wb-blue-l`）。
  - `role=status`。
- **縮放控制**（右下 14 / 14）：寬 32 直排，圓角 10、1px `--wb-line`、陰影 `0 4px 14px rgba(27,79,156,.1)`；三顆 32×32 按鈕「放大／縮小／符合視窗」（15px 線條 icon，按鈕間 1px `--wb-line-2`），下方倍率 10.5px `--wb-ink-3`（`aria-live=polite`）。hover 底 `--wb-bg`、icon `--wb-blue-l`；到上下限時對應按鈕 disabled（`--wb-line`）。
- **圖例**（左下 14 / 14，可收合）：寬 236、圓角 10、陰影同上；最大高 = 畫布高 − 80，內容區 `overflow-y:auto`。標題列 32px「圖例」12px 700＋右側 13px 箭頭（收合時轉 180°），`aria-expanded`。內容區 padding `2px 12px 12px`、區塊間距 10、上緣 1px `--wb-line-2`。
  - 區塊標題 10.5px `--wb-ink-3`、letter-spacing .06em。
  - 「著色依據：{名稱}」：**兩欄**格線，每列 10px 色點＋名稱（單行省略）＋節點數（11px `--wb-ink-3`）；只列畫面上有的分組。
  - 文件模式：「節點大小：被連入數」4 顆灰點（直徑 = 2r）＋「0–1／2–3／4–7／8+」；形狀列「● 筆記　■ 資料檔」；「邊：箭頭指向被參照的一方」4 列線型樣本（30px、含箭頭）＋名稱，關掉的種類 opacity .4；備註「線越粗，兩篇之間的關聯次數越多」。
  - 標籤模式：「結構」標籤樞紐・筆記數／未加標籤（虛線圓）／筆記屬於該標籤（細線）。
- **提示框**：`--wb-panel` 底、1px `--wb-line`、圓角 8、陰影 `0 8px 24px rgba(22,28,40,.14)`、padding `8px 11px`、12px、行高 1.55、最寬 260、`pointer-events:none`、120ms 淡入、`role=tooltip`。
  - 節點：標題 12.5px 700 `--wb-ink`；「資料夾 {名稱}」（資料檔改「資料檔 {plugin}」）；「連入 n・連出 m」（孤島加「・孤島」）；標籤模式加「標籤 a、b」。標籤值 `--wb-ink-2` 500。
  - 邊：「A → B」（箭頭 `--wb-ink-3` 400），下方每種類一列：22px 線型樣本＋「定義引用 ×3」。
  - 位置：節點右側（節點螢幕半徑 + 10px）、頂端對齊節點 −20px；靠右緣 300px 內時翻到左側。邊的提示框以邊中點為錨。

---

## 5. 互動與行為

### 5.1 平移與縮放

- 拖曳畫布空白處平移（pointer capture；cursor `grab` / `grabbing`）。不提供拖曳節點。
- 滾輪縮放，以游標為中心：`k' = k × exp(−deltaY × 0.0016)`，範圍 25%–300%。wheel listener 要 `passive:false` 才能 `preventDefault`。
- 按鈕：放大 ×1.25、縮小 ×0.8（以畫布中心）、符合視窗。
- 符合視窗：取所有節點位置（每點外擴 26、下方多 14 留給標題）的外框，`k = min((W−80)/bw, (H−72)/bh)`，上限 160%、下限 25%，置中（y 再 +10）。
- 佈局改變時（模式、著色、孤島開關、篩選）自動符合視窗；第一次無動畫，之後 360ms 滑動。
- 縮放鈕、符合視窗、選取平移有 360ms `--ease-out` 動畫（對畫布 world 群組的 CSS transform 做 transition）；滾輪與拖曳不加動畫。
- 畫布底：`--wb-gr-canvas`＋點格（22px 間距、1px `--wb-gr-grid` 圓點）。

### 5.2 hover／focus

- hover 節點（文件）：高亮集合 = 該節點 + 所有相連節點；相關邊 0.95。
- hover 節點（標籤）：該筆記 + 它的標籤樞紐 + 對應細線。
- hover 樞紐：樞紐 + 成員 + 該樞紐的細線。
- hover 邊：兩端節點 + 該邊。
- 搜尋：比對 `標題 + 資料夾 + 全部標籤`（不分大小寫）。符合者全亮，兩端都符合的邊高亮。hover 優先於搜尋。
- 節點與樞紐是 `role=button`、`tabIndex=0` 的 SVG `<g>`；aria-label「筆記 {標題}，連入 n、連出 m」／「標籤 {名稱}，n 篇筆記」；focus 等同 hover（顯示提示框），Enter／Space 等同點擊。

### 5.3 點擊

- 筆記節點 → 開 NoteDrawer（再點同一個關閉；Drawer 的 scrim、Esc 照既有行為關閉）。
- 資料檔節點 → 直接進資料檔渲染頁（`/view/...`，同既有 Plugin 資料檔列表的點擊）。
- 標籤樞紐 → 套用標籤篩選。

### 5.4 選取與 Drawer

Drawer 寬 `min(480, 畫布寬)`。選取後若節點螢幕 x > 可見寬 − 40、x < 40，或 y 超出上下 40 → 平移（不縮放）使節點 x = `max(可見寬/2, min(可見寬−40, 280))`；y 超出時同時置中。360ms 滑動。

### 5.5 模式切換

兩種模式用同一批節點。切換時節點從目前位置**以 600ms ease-out（cubic，`1−(1−t)³`）移到新位置**；邊每一幀依目前位置重畫；標籤樞紐 600ms 淡入。同時畫布自動符合視窗（360ms）。

**prefers-reduced-motion**：模式切換直接換位、平移與符合視窗直接跳到定位、骨架不脈動、下拉不做進場動畫。

### 5.6 佈局（算完即靜止）

佈局在輸出前同步算完再顯示，**畫面上不持續晃動**。正式版建議在 build 期或 Web Worker 計算並快取（key＝可見節點集合＋模式＋著色依據＋孤島開關）。

**文件模式**（`grLayoutDoc`）：
1. 有邊的節點：初始位置依著色分組分配角度（組序 / 組數 × 2π ＋隨機 0–0.9 rad），半徑 60–240；固定亂數種子（mulberry32，seed 11）確保每次結果相同。
2. 迭代 380 次（節點 > 150 時 260 次），alpha 由 1 線性降到 0.03：
   - 斥力：`3200 / d²`（> 150 節點：1300），d² > 160000 略過
   - 彈簧：理想長度 `58 + rA + rB`（> 150 節點：40），係數 0.05
   - 向心力：−0.014 × 位置
   - 速度阻尼 0.55，每步位移上限 24
   - 後半段加碰撞：最小距離 `rA + rB + 7`
3. 孤島：依著色分組成團，沿主圖外圍一圈（主圖最大半徑 + 46）放置；每團分到的角度 ∝ √團數 + 1.2，自 −90° 起順時針；團內以黃金角螺旋（間距 10.5 × √(i+0.5)）緊密排列；群標在團下緣。

**標籤模式**（`grLayoutTag`）：
1. 槽位：8 個標籤 + 未加標籤（只放有節點的），順序「前端・效能・網路・資安・後端・系統設計・系統規格・產品管理・未加標籤」讓相關主題相鄰；等距排在半徑 `max(140, 槽數 × 26 + √節點數 × 10)` 的圓上，自 −90° 起。
2. 單標籤節點：圍著樞紐黃金角螺旋，起始半徑 = 樞紐半徑 + 12。多標籤節點：各樞紐座標平均 ± 7 隨機。無標籤與資料檔：未加標籤槽。
3. 120 次鬆弛：每次朝目標點拉 6%，再做碰撞（最小距離 `rA + rB + 3.5`，樞紐固定）。

只有 8 個指定標籤（`GR_TAGS`）會成為樞紐；正式版建議改成「依筆記數取前 8 個，其餘併入未加標籤或另一個『其他』團」並與產品確認。

---

## 6. 狀態細節

### 6.1 載入中

頁面初次輸出時還沒有圖：Toolbar 照常顯示，畫布置中骨架（320×220：12 顆 `--wb-line` 灰點、7 條 1.5px `--wb-line-2` 放射線，脈動 opacity .45↔1、1.4s、每點延遲 90ms），下方「正在計算筆記之間的關聯…」12px `--wb-ink-3`。`aria-busy=true`。Prototype 以 700ms 模擬，一個 session 只出現一次。

### 6.2 空狀態 A：篩選後沒有筆記

置中，最寬 420：44px 圓形 icon 底（`rgba(44,110,187,.08)`、icon `--wb-blue-l`，filter icon）；標題「沒有符合篩選條件的筆記」15px 700；說明「目前篩選「{篩選名稱}」底下沒有任何筆記，Graph 沒有東西可以畫。清除篩選後會回到全部筆記。」12.5px 行高 1.8 `--wb-ink-3`；主按鈕「清除篩選」（`.wb-btn-solid`）。

### 6.3 空狀態 B：有筆記但沒有任何關聯（文件模式）

判斷：文件模式、筆記 > 0、資料中**完全沒有邊**（與邊的開關無關；只是全部關掉不算）。最寬 520：link icon；標題「這 {N} 篇筆記之間還沒有任何關聯」；說明「文件模式只畫引用、嵌入、連結與系列順序。用下面任一種方式建立關聯後，這裡就會出現 Graph；也可以先用標籤看筆記怎麼分群。」；2×2 方式卡（1px `--wb-line`、圓角 8、padding `9px 11px`；名稱 12px 700＋說明 11.5px，語法以 `--font-mono` 11px 在 `--wb-bg` 底）：

| 方式 | 說明 |
|---|---|
| 行內引用定義 | 在內文寫 `:ref[hr.term-quota]`，引用另一篇筆記裡的定義。 |
| 嵌入定義 | 用 `::include{id=…}` 把定義整段嵌入。 |
| 站內連結 | 用 `[文字](/notes/slug)` 連到另一篇筆記。 |
| 加入系列 | 在 frontmatter 加上 `series`，章節之間會依序相連。 |

主按鈕「改用標籤模式」（tag icon）→ 切到標籤模式。

### 6.4 寬度 < 860

Header 頁籤只剩 List／Graph；選 Graph 時 Toolbar 只顯示「Graph 在窄畫面不顯示」，Body 置中：icon（寬螢幕示意）、標題「Graph 需要較寬的畫面」、說明「Graph 要能平移、縮放並同時看到圖例，視窗寬度 860px 以上才會顯示。目前畫面較窄，請改用清單檢視，或把視窗拉寬。」、主按鈕「改用清單檢視」→ 切回 List。判斷沿用既有 `useNarrow(860)`。

### 6.5 約 300 個節點

只有第 4 級顯示標題、hover 時不顯示相鄰節點標題、縮放 ≥ 240% 才全部顯示；斥力與彈簧改用較緊的參數（§5.6）。點擊示範資料只跳 toast，正式版照一般節點處理。

---

## 7. Design Tokens

### 7.1 新 token（`--wb-gr-*`，淺色主題）

**分類色盤：品牌藍單色系 8 階明度。** 依分組順序取 c1→c8，相鄰分組明度至少差 2 階；未分類（未加標籤、未歸入系列、不著色）用 c0 灰，資料檔用 c-data 灰。

| Token | 值 | 用途 |
|---|---|---|
| `--wb-gr-c1` | `#1b4f9c` | 分類 1・品牌藍 700 |
| `--wb-gr-c2` | `#7aa8e0` | 分類 2・淺藍 |
| `--wb-gr-c3` | `#0f2f5e` | 分類 3・最深藍 |
| `--wb-gr-c4` | `#4f8bd0` | 分類 4・中淺藍 |
| `--wb-gr-c5` | `#163f7d` | 分類 5・深藍 |
| `--wb-gr-c6` | `#a6c5ec` | 分類 6・更淺藍（加 1px `--wb-blue-l` 描邊） |
| `--wb-gr-c7` | `#2c6ebb` | 分類 7・品牌藍 500；「不著色」也用這色 |
| `--wb-gr-c8` | `#cddff5` | 分類 8・最淺藍（加 1px `--wb-blue-l` 描邊） |
| `--wb-gr-c0` | `#aab4c3` | 未分類 |
| `--wb-gr-c-data` | `#8592a6` | 資料檔節點 |
| `--wb-gr-e-ref` | `#2c6ebb` | 定義引用 |
| `--wb-gr-e-inc` | `#d4850f` | 定義嵌入 |
| `--wb-gr-e-link` | `#7f8ba0` | 站內連結 |
| `--wb-gr-e-seq` | `#16917a` | 系列順序 |
| `--wb-gr-e-tag` | `#c3ccd8` | 筆記—標籤細線 |
| `--wb-gr-dash-ref` | `none` | 實線 |
| `--wb-gr-dash-inc` | `7 3.5` | 虛線 |
| `--wb-gr-dash-link` | `1.6 3.4` | 點線 |
| `--wb-gr-dash-seq` | `9 3 2 3` | 點劃線 |
| `--wb-gr-w-ref` / `-inc` / `-link` / `-seq` | `1.4px` / `1.8px` / `1.3px` / `1.5px` | 基本線寬 |
| `--wb-gr-w-tag` | `.8px` | 細線 |
| `--wb-gr-w-step` | `.7px` | 每多一次關聯加粗 |
| `--wb-gr-w-max` | `4.6px` | 線寬上限 |
| `--wb-gr-r1`–`r4` | `5px` `8px` `12px` `17px` | 節點級距半徑 |
| `--wb-gr-r-hub` | `15px` | 標籤樞紐最小半徑 |
| `--wb-gr-edge-rest` | `.55` | 邊靜止不透明度 |
| `--wb-gr-dim-node` | `.16` | 淡出節點／文字 |
| `--wb-gr-dim-edge` | `.06` | 淡出邊 |
| `--wb-gr-canvas` | `#fbfcfe` | 畫布底 |
| `--wb-gr-grid` | `#e8ecf2` | 點格 |
| `--wb-gr-halo` | `#fff` | 節點描邊、文字光暈 |
| `--wb-gr-sel` | `var(--wb-gold)` | 選取環（#ed9b26） |
| `--wb-gr-sel-halo` | `rgba(237,155,38,.18)` | 選取光暈 |
| `--wb-gr-focus` | `var(--wb-blue-l)` | focus 環 |
| `--wb-gr-zoom-label` | `1.5` | 全部標題出現的縮放 |
| `--wb-gr-zoom-label-dense` | `2.4` | 節點 > 150 時 |
| `--wb-gr-zoom-min` / `-max` | `.25` / `3` | 縮放範圍 |
| `--wb-gr-dur-move` | `600ms` | 模式切換移動 |
| `--wb-gr-dur-fade` | `var(--duration-normal)` 220ms | 淡出／淡入 |
| `--wb-gr-dur-glide` | `var(--duration-slow)` 360ms | 縮放鈕、符合視窗、選取平移 |
| `--wb-gr-ease` | `var(--ease-out)` `cubic-bezier(.16,1,.3,1)` | 緩動 |

暗色（`.wb-dark`）只覆寫：`--wb-gr-canvas:#151a23`、`--wb-gr-grid:#232a36`、`--wb-gr-halo:#151a23`、`--wb-gr-e-tag:#3a4352`、`--wb-gr-c3:#dbe7f8`、`--wb-gr-c5:#b9d0f0`（最深兩階翻成最淺，避免與暗底融在一起）、`--wb-gr-c0:#5f6b7d`。

JS 端需要數值的部分（半徑、縮放門檻、淡出值、動畫時長）在 `pt-graph.jsx` 開頭以常數鏡像（`GR_R`、`GR_ZOOM`、`GR_DIM`、`GR_MOVE_MS`）；正式版請從同一份來源產生，避免兩邊不同步。

### 7.2 沿用的既有 token

`--wb-blue` #1b4f9c、`--wb-blue-d` #163f7d、`--wb-blue-l` #2c6ebb、`--wb-gold` #ed9b26、`--wb-bg` #f6f8fb、`--wb-panel` #fff、`--wb-line` #e1e6ee、`--wb-line-2` #eef1f6、`--wb-ink` #161c28、`--wb-ink-2` #2b3546、`--wb-ink-3` #6c798e；`--duration-fast` 140ms、`--duration-normal` 220ms、`--duration-slow` 360ms、`--ease-out`；字體 Noto Sans TC / Noto Sans，數字 `font-variant-numeric:tabular-nums`。

---

## 8. State Management

```ts
// /notes 頁（既有）新增
tab: "List" | "Board" | "Table" | "Timeline" | "Graph";

// Graph 元件內部
mode: "doc" | "tag";
colorBy: "folder" | "series" | "tag" | "none";
kinds: { ref: boolean; inc: boolean; link: boolean; seq: boolean };   // 預設全開
showOrphans: boolean;                // 預設 true
query: string;                       // 只高亮，不過濾
hover: NodeId | `tag:${string}` | null;
hoverEdge: EdgeId | null;
legendOpen: boolean;                 // 預設 true
view: { x: number; y: number; k: number };
```

是否把 `mode`、`colorBy`、`kinds`、`showOrphans`、`legendOpen` 存到 localStorage／URL，請與產品確認（prototype 不保存）。選取（`sel`）沿用 /notes 既有的 Drawer state。

### 8.1 資料形狀（建議 build 期產生）

```ts
type EdgeKind = "ref" | "inc" | "link" | "seq";
interface GraphNode {
  id: string;            // 筆記 slug；資料檔為 "view:<id>"
  title: string;
  folder: string;        // 資料檔為 "資料檔"
  series: string | null;
  tags: string[];
  data: boolean;
  plugin?: string;       // 資料檔
}
interface GraphEdge {
  id: string;            // `${s}>${t}`
  s: string; t: string;  // 方向：來源 → 被參照者
  kinds: Partial<Record<EdgeKind, number>>;   // 各種類次數
  kind: EdgeKind;        // 次數最多者
  n: number;             // 總次數
}
```

來源：
- `ref`／`inc`：define／include／:ref 的 build 期索引（`design_handoff_workbench_define_ref` §0.1 的 `DefIndex.refs`）：引用方 → 定義所在筆記，每個 id 計一次。
- `link`：MDX 內 `/notes/<slug>` 連結；連到資料檔頁 `/view/...` 者連到資料檔節點。
- `seq`：系列 frontmatter 依章節順序，前一章 → 後一章（含資料檔章節）。
- 衍生欄位 `inDeg`／`outDeg`（不同來源／目標數）、`tier`、`orphan` 於前端依可見節點計算。

---

## 9. Files

| 檔案 | 內容 |
|---|---|
| `prototype/NoteCraft-工作台-Graph-standalone.html` | 自含單檔 prototype（含整個工作台） |
| `source/wb/pt-graph.css` | `--wb-gr-*` token、所有 `gr-` 樣式（Toolbar、下拉、畫布、浮層、狀態、規格頁） |
| `source/wb/pt-graph.jsx` | `PtGraph` 主元件；`GrColorMenu`、`GrStats`、`GrZoom`、`GrLegend`、`GrTipNode`／`GrTipEdge`、`GrSkeleton`、`GrEmptyFilter`、`GrEmptyLinks`、`GrNarrow`；tween 與平移縮放 |
| `source/wb/pt-graph-data.jsx` | 示範筆記與連結（`GR_EXTRA`、`GR_LINKS`）、`grAllEdges`（含系列與 define/ref 推導）、`grBuild`、300 節點資料、`grLayoutDoc`／`grLayoutTag`、著色 `grColorKey`／`grGroups`／`grColor` |
| `source/wb/pt-graph-spec.jsx` | prototype 內的規格頁（狀態索引、規格表、token 表、元件細部） |
| `source/wb/pt-app.jsx` | 接線參考：搜尋「Graph」看頁籤、`baseRows`、`PtGraph` props、Tweaks「Graph 狀態」示範切換 |

不需移植：`GR_EXTRA` 假資料、`grBig()` 壓力測試資料、Tweaks 示範切換、規格頁。

## Assets

沒有圖片。Icon 為 inline SVG 線條（24 格、1.8px、圓端），風格同既有工作台 `Ic`：放大（+）、縮小（−）、符合視窗（四角）、圖例箭頭、連結、清單、寬螢幕。請改用 codebase 既有 icon 元件。
