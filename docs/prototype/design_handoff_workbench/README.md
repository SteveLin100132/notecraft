# Handoff: NoteCraft 工作台（Workbench）— 新版 UI 改版

> 給 **Claude Code** 的實作交付包。目標 codebase **已經有舊版 NoteCraft**（依 `design_handoff_notecraft/` 實作：左側 248px 導覽 + 卡片式頁面）。本包描述的是**取代舊版 shell 的新工作台 UI**，並標記所有**新增功能**與**舊版元件的去留**。
> 未參與設計討論的開發者，應能僅憑本文件 + `prototype/` 完成實作。

---

## 0. 先讀這段：這次改版改了什麼

| | 舊版（codebase 現況） | 新版工作台（本包） |
|---|---|---|
| **外殼** | 單一 248px 側邊欄（navy 漸層）＋滿版頁面 | **三欄**：52px 深色 Rail ＋ 240px 淺色 Sidebar（檔案樹）＋ 主區 |
| **頁面結構** | 每頁自帶大標 `PageHead` + 卡片 | 每頁統一 **壓縮頁首**（麵包屑／標題／狀態 pill／Tab／動作）＋ **工具列**（40px）＋ 內容 |
| **筆記列表** | 卡片 grid / 單欄清單 | **四種 view：List（分組）/ Board（看板，可拖曳改閱讀狀態）/ Table / Timeline** |
| **筆記選取** | 點卡片直接開啟 | **單擊＝右側 Drawer 預覽（480px），雙擊＝開啟** |
| **導覽粒度** | 五個頁面 | 資料夾樹（含子資料夾）、系列、Plugin 資料檔夾、標籤，全部可在 Sidebar 直接篩選 |
| **搜尋** | 列表頁搜尋列 | **⌘K 全域指令面板**（筆記／系列／標籤）+ 每頁工具列搜尋 |
| **Dashboard** | 4 KPI + 2 欄 | **12 欄 widget grid**（KPI、寫作頻率、最近更新、系列進度、標籤分布、AI 佇列）+ 「總覽 / 本週 / AI 佇列」三個 Tab |
| **系列 / 標籤 / Plugin / 設定** | 各自的卡片版面 | 全部改成同一套 **row + group header + stat strip** 資料列語彙 |
| **響應式** | 桌面為主 | **桌面 / 平板（≤1100，側欄變抽屜）/ 手機（≤860，單欄、底部 Tab bar、只保留 List）** |
| **密度／字級** | DS 預設（14–16px） | **工作台密度：基準 13px、列高 38px、圓角 6–8px** |

**沿用不變（只換外殼、內容照舊）**：筆記內文 `NoteView`（含 empty / coming-soon 狀態、程式碼塊、AI 標記塊、閱讀進度、SeriesNav）、`DataFileView`（plugin 渲染頁）、`PresentView` / `DeckLibrary`（轉簡報）、`NewNoteModal`、Toast。這些在新版中被放進 `.wb-host` 容器，**舊版自帶的 header 一律隱藏**（`.wb-viewhost header{display:none}`），由新頁首接手標題與動作。

**移除（新版不再有）**：舊 `Sidebar` / `Logo` / 大 `PageHead`、`sidebarStyle`（navy/white）、`listLayout`（grid/list）、`accent`、`radiusScale`、`sbCollapsed`、`navLabel`、`viewWidth` 等 Tweak 與對應 UI。

---

## 1. About the Design Files

`prototype/` 是 **HTML + 瀏覽器端 React（Babel inline）做的設計參考原型**，用來定稿視覺與互動，**不是要直接搬進正式專案的程式碼**。請在既有 codebase（Astro 5 + React islands + Tailwind，依 `design_handoff_notecraft/notecraft-prd.md`）**重建**這些畫面：像素級照抄外觀、照抄互動語意，資料與寫入一律走既有的 Content Collections / dev-only API。

## 2. Fidelity：**High-fidelity**

所有配色、字級、間距、列高、圓角、hover/選取態都已定稿，請像素級重現。唯一允許偏離：技術架構差異（見 §7）。

---

## 3. 外殼（Shell）

### 3.1 版面
```
┌──52──┬────240────┬──────────── main（flex:1, min-width:0）──────────────┐
│ Rail │ Sidebar   │ Header（麵包屑 + 標題列 + Tabs）            [actions]  │
│      │           │ Toolbar 40px（分組 / 篩選 chip / 搜尋 / 計數）          │
│      │           │ Body（flex:1, overflow:auto）               [Drawer 480]│
└──────┴───────────┴──────────────────────────────────────────────────────┘
```
`html,body,#root` 高度 100%；`.wb-app{display:flex;height:100%;overflow:hidden;font-size:13px}`。整個 app **不整頁捲動**，只有 Body、Sidebar 內部與 Drawer 捲動。

### 3.2 Rail（`wb/pt-shell.jsx` → `PtRail`）
- 52px 寬、背景 `#161c28`、上 10px 下 12px、項目垂直排列 gap 4。
- 頂端 Logo 28px（藍底方形 + 金色星芒 + 兩條白線，見 `NcLogo`；圓角 9）。
- 5 個 34×34 按鈕，圓角 8，icon 17px，顏色 `#8b98ab`；hover `rgba(255,255,255,.07)` + `#dfe5ee`；active `rgba(255,255,255,.12)` + `#fff`。
  1. 儀表板（home）→ `dashboard`
  2. 搜尋（⌘K）→ 開指令面板
  3. AI 標記佇列（sparkle）→ `ai`；**待生成 > 0 時右上 6px 黃點 `#e3a008`**
  4. Plugin 外掛（plug）→ `plugins`
  5. 設定與關於（gear）→ `about`
- Rail 高亮規則：`ai` / `plugins`（含 `view` 資料檔頁）/ `dashboard` / `about`；筆記、系列、標籤頁不高亮 Rail（由 Sidebar 高亮）。

### 3.3 Sidebar（`PtSidebar`）
- 240px、背景 `#f6f8fb`、右 1px `#e1e6ee`。
- **工作區頭**（padding 14）：標題「NoteCraft 工作台」17px/800 藍 `#1b4f9c`；下行等寬字 10.5px `~/notes/src/content/notes` 灰 `#6c798e`。整塊可點回儀表板。平板/手機時左側額外顯示 30px Logo。
- **區段標題** `.wb-sb-sec`：10.5px/700、字距 .1em、灰、padding 6 10 4；右側可放「全部」小連結（11px 藍）。
- **項目** `.wb-sb-item`：高 32、圓角 6、gap 7、padding-left 10（子層 24）；hover `rgba(27,79,156,.06)`；active `rgba(27,79,156,.1)` + label 700 藍 `#1b4f9c`。右側計數 11px 灰、tabular-nums。
- 四個區段（順序固定）：
  1. **資料夾**：「全部筆記」（layers icon）＋ 每個資料夾（folder icon 帶資料夾色，見 §8）；有子資料夾者顯示 11px caret（旋轉 90° 展開，140ms），子項 12.5px。預設展開 `01-前端`。
  2. **系列**（右上「全部」→ `/series`）：8px 色塊 swatch（圓角 3）＋名稱＋ **34×3px 迷你進度條**＋ `done/total`。
  3. **Plugin 資料檔**：「全部資料檔」＋每個資料檔夾（金色 folder icon `#ed9b26`）。
  4. **其他**：標籤（計數 = 標籤數）。
- **底部卡片** `.wb-sb-foot`（margin 8、padding 10、白底、1px 邊、圓角 8）：「待生成標記」標題 12px/700 `#8a6412` + sparkle icon；內文 11.5px 灰「**N** 個 @ai-visualize 標記待生成，分布於 M 篇筆記。」（N 黃 `#e3a008` 粗體）；「查看佇列 →」11.5px/700 藍連結 → `ai`。

### 3.4 Header（`PtHeader`）
- 白底、下 1px 邊；上列 `padding:10px 16px 8px`，`align-items:flex-end`。
- 左：**麵包屑** 11px 灰（可點段落 hover 變藍；分隔「 / 」）→ **標題列**：可選返回鍵（24px 方 icon 鈕）+ `h1` 20px/700 `#161c28`（單行省略）+ 若干 **狀態 pill**。
- 右：動作按鈕群（gap 8，`flex-wrap:wrap; justify-content:flex-end`）。
- **Tabs**（僅 >1 個時顯示）：`padding:0 16px`、高 36、13px/500 灰、active 700 藍 `#2c6ebb` + 2px 底線 `#1b4f9c`。
- **Pill** `.wb-pill`：高 20、padding 0 9、11px/500、全圓角。變體：預設 藍底 `rgba(27,79,156,.1)`/藍字；`ok` 綠底 `rgba(46,158,107,.14)`/`#1f7350`；`warn` 黃底 `rgba(227,160,8,.16)`/`#8a6412`；`muted` `#f6f8fb` 底 + 1px 邊/灰字；`danger` `rgba(210,74,67,.12)`/`#c0392f`。
- **按鈕**（皆高 30、全圓角、12.5px、gap 5）：`ghost` 白底 1px 邊 500 字重（hover 底 `#f6f8fb`）；`solid` 藍 `#1b4f9c` 白字 700（hover `#163f7d`）；`gold` 金 `#ed9b26` 白字 700（hover `#e37b24`）— 只用於「＋ 新增筆記」。

### 3.5 Toolbar（`PtToolbar` 及各頁自組 `.wb-tb`）
- 高 40、白底、下 1px 邊、padding 0 16、gap 10；內容過寬時**橫向捲動且隱藏 scrollbar**。
- 左：說明文字 11.5px 灰 或 「分組」segmented（`.wb-seg` 高 24、12px、全圓角；active 藍底 `rgba(27,79,156,.1)` 藍字 700）＋ 1×18 分隔線 ＋ **篩選 chip**（`.wb-chip` 高 26、1px 邊、全圓角、12px；active 邊/字藍 `#2c6ebb` 底 `rgba(44,110,187,.08)`）。
- 右（`margin-left:auto`）：**搜尋框** 230px×28、圓角 6、1px 邊，focus 藍邊 + `0 0 0 3px rgba(44,110,187,.12)`；計數 12px 灰。

### 3.6 Body
- `.wb-body`：`padding:14px 16px 20px`、背景 `#f6f8fb`（Dashboard widget grid 用）。
- `.wb-body.flush`：無 padding、白底（List / Table / 資料列頁用）。

---

## 4. 共用資料列語彙（所有列表頁共用）

- **Row** `.wb-row`：高 38（Dashboard widget 內 `.dense` 34）、padding 0 16、gap 9、下 1px `#eef1f6`；hover `#f6f8fb`；選取 `.sel` `rgba(27,79,156,.08)`。
  - 內容順序：13px icon → 標題 `.wb-row-t` 13px/500 單行省略（max 340px）→ 路徑 `.wb-row-p` 11px 灰 tabular（flex:1）→ 標籤欄 158px（最多 2 個 chip + `+N`）→ 狀態 pill（固定 86px 置中）→ 日期 46px 11.5px 灰。
  - **AI pill 規則**（`PtAiPill`）：無 frontmatter → muted「無 frontmatter」；待生成 > 0 → warn「待生成 N」；否則已生成 > 0 → ok「已生成 N」；否則 muted「無標記」。
- **Tag chip** `.wb-tagchip`：高 20、padding 0 8、11px、底 `#f6f8fb`、1px 邊。
- **Group header** `.wb-gh`：高 32、底 `#f6f8fb`、上下 1px 邊、padding 0 16；caret + icon（顏色 = 群組色 `--gc`）+ 名稱 12.5px/700 + 計數膠囊（11px/700、白底 1px 邊）+ 右側統計 11px 灰「已生成 x ・ 待生成 y ・ 最後更新 m/d」。可點收合。
- **Stat strip** `.wb-sum`：白底、下 1px 邊、padding 12 18、gap 28；每格 = 11px 灰 label + 17px/700 值（可指定色，如綠 `#2e9e6b`、黃 `#e3a008`）。
- **Progress** `.wb-prog`：96×5（`.wide` 220×6）、全圓角、軌 `#e1e6ee`、填色 `--gc`。
- **Mini button** `.wb-mini`：高 24、全圓角、1px 邊、11.5px；hover 藍邊藍字；`.danger` hover 紅 `#d64545`。
- **Empty** `.wb-empty`：padding 56 16、置中、13px 灰。

---

## 5. Screens / Views

### 5.1 Dashboard `/`（`wb/pt-dash.jsx`）— **改版**
- Header：麵包屑 `NoteCraft / 工作區`，標題「儀表板」，pill「N 篇筆記」muted +「N 待生成」warn；Tabs **總覽 / 本週 / AI 佇列**；dev-only「＋ 新增筆記」gold。
- **總覽**：`.wb-grid` 12 欄、gap 12；widget `.wb-wg` 白底 1px 邊圓角 8，header 32px（12.5px/700 標題 + 11px 灰 meta 或右側連結）。
  - `span 3` 筆記總數：40px/900 數字；下行 11.5px「近 7 日更新 **N**（綠）・ 近 30 日 **N**」。
  - `span 3` AI 視覺化生成率：`NN%`（% 為 18px）+ 右側「已生成 N / 待生成 N（黃）」+ 7px 進度條。
  - `span 6` 寫作頻率・近 8 週：長條圖（每欄 max 34px 寬、藍 `#2c6ebb`、非最後一週 opacity .6、頂端數值 10.5px、首尾顯示 m/d）。
  - `span 8` 最近更新：8 列 dense row；右上「全部筆記 →」。
  - `span 4` 系列進度：每系列 swatch + 名稱 + `done/total` + 5px 進度條 + 「繼續讀：下一章標題」。
  - `span 7` 標籤分布：前 10 個，78px 右對齊名稱 + 9px 軌長條 + 計數。
  - `span 5` 待生成 @ai-visualize 標記：前 6 篇 dense row（黃點 + 標題 + 資料夾 + warn pill）+ 「查看完整 AI 佇列 →」。
  - 響應式：≤1180 每 widget `span 6`；≤800 `span 12`。
- **本週**：flush 列表（近 7 日更新的筆記 row）。
- **AI 佇列**：每篇一個黃色 group header（`--gc:#e3a008`，計數 = 待生成數，右側路徑），下方每個待生成標記一列（黃點 + marker id + prompt + type pill + 「待生成」）。
- **正式版**：統計於 build 期計算（同舊版）；「本週」「AI 佇列」只是同一份資料的不同投影。

### 5.2 筆記列表 `/notes`、AI 佇列 `/notes?pending=1`（`wb/pt-views.jsx`）— **改版 + 新增**
- Header：麵包屑 `NoteCraft / 筆記 / {篩選名}`；標題 = 目前篩選（全部筆記 / 資料夾 / 子資料夾 / 系列名 / AI 標記佇列）；pill「N 篇」+「待生成 N」；**Tabs：List / Board / Table / Timeline**（手機只剩 List）；dev-only 新增筆記。
- Toolbar：分組 segmented（**資料夾 / 系列 / 標籤 / 月份**，只在 List 顯示）｜chip：**含 AI 標記**、**待生成 N**、**無 frontmatter N**｜搜尋（標題、路徑、標籤）｜「N 篇」。
- **List**：依分組出 group header + rows；群組色：資料夾用資料夾色、系列用系列色、其他 `#6c798e`；`根目錄` 永遠排最前。**單擊選取（開 Drawer）、雙擊開啟筆記**。
- **Board**（新）：四欄 **未開始 `#6c798e` / 閱讀中 `#2c6ebb` / 已完成 `#2e9e6b` / 未發佈 `#8b9aad`**，欄 `min-width 232`、底 `#f6f8fb`、圓角 8；卡片白底 1px 邊圓角 8 padding 9 10：標題 12.5px/700、系列 chip（系列色描邊「系列名 #序」）+ 前 2 個標籤、AI pill + 日期。**卡片可拖曳到其他欄 → 直接改閱讀狀態**（`setReadingStatus`）；拖曳中卡片 opacity .45 虛線邊、目標欄藍虛線底 `rgba(44,110,187,.07)`。「未發佈」欄卡片為斜紋底、不可拖。欄底 11px 說明（「待生成 N 個標記」/「標記皆已生成」/「草稿與規劃中，不計入進度」）。
- **Table**（新）：欄位 標題 / 資料夾 / 系列 / 標籤 / AI 標記 / 字數 / 更新日；th sticky、30px、11px/700 灰；td 38px、12.5px、單行省略 max 280；數字欄右對齊 tabular。
- **Timeline**（新）：依月份分段（12.5px/700 月 + 「N 篇」+ 分隔線）；每列 44px 日期 + 13px 垂直軸（1px 線 + 7px 藍圓點）+ 標題 + 路徑 + 標籤 + AI pill。
- **Drawer**（新，`PtDrawer`）：右側 480px（平板 420、手機滿版）、白底、左 1px 邊、陰影 `-10px 0 28px rgba(27,79,156,.14)`、滑入 200ms；scrim `rgba(22,28,40,.18)` 160ms。
  - 38px 頂列：完整路徑 11px 灰 + 關閉鈕。
  - 內容 padding 16：標題 19px/700；pill 列（AI 狀態、系列「名 #序」、筆記狀態）；動作「開啟筆記」solid、「轉簡報」ghost、待生成時「生成 N 個標記」ghost；摘要段（13px/1.8）；**Metadata 表**（路徑 / 資料夾 / 系列 / 字數 / 建立 / 更新 / 標籤 chip 可點）；**@ai-visualize 標記列表**（綠/黃點 + id + `type ・ 狀態`）；**同系列章節**（序號方塊 + 標題，當前粗體；資料檔章節標「資料檔」；右上「系列總覽 →」）。
  - Esc 或點 scrim 關閉。
- 區段標題 `.wb-dw-sec`：10.5px/700 字距 .1em 灰，padding 16 0 7。

### 5.3 筆記內文 `/notes/[slug]` — **沿用 + 新頁首**
- Header：返回鍵、麵包屑 `NoteCraft / 筆記 / {資料夾}`，標題 = 筆記標題，pill = AI 狀態 + 「N 字」muted；動作「版型庫」ghost、「轉簡報」solid。
- Body：`.wb-body`（灰底）內 `.wb-host{padding:26px 32px 60px}` 放**舊版 `NoteView` 原樣**（含 empty / coming-soon 分流、TOC、標籤編輯、閱讀進度、程式碼塊、AI 標記塊、SeriesNav、DonePrompt）。**隱藏 NoteView 自帶 header**。

### 5.4 系列 `/series`（`wb/pt-views2.jsx` → `PtSeriesList`）— **改版**
- Header：標題「系列」+ pill「N 個系列」；Toolbar：說明「依閱讀進度追蹤的章節集合，點一列進入詳情」+ 搜尋 + 計數。
- Body flush：**Stat strip**（系列 / 章節總數 / 已完成（綠）/ 整體進度 %）→ group header「全部系列」→ 每系列一列：swatch + 名稱 + 「N 章 ・ 已完成 M」+ 96px 進度條（系列色）+ `NN%`（38px）+ 狀態 pill 54px（已讀完 ok / 進行中 default / 未開始 muted）。
- 舊版的封面色塊卡片 grid、排序下拉、狀態 pills **移除**。

### 5.5 系列詳情 `/series/[id]`（`PtSeriesDetail`）— **改版**
- Header：返回、麵包屑 `NoteCraft / 系列 / {名}`、pill「done/total 已讀」muted + `NN%` ok；動作「在筆記列表中篩選」ghost（→ `/notes?series=id`）。
- Body flush：Stat strip（章節 / 已完成 / 閱讀中 / 未開始 / 進度）→ **進度帶** `.wb-sumbar`（220×6 進度條 + 「下一章：…」+ 「重設進度」ghost）→ group header「章節」（右側說明「資料檔頁與筆記一視同仁，都計入進度」）→ 每章一列：序號 20px 右對齊 + doc icon（資料檔為金色）+ 標題 + 路徑 + 「資料檔」chip（若是）+ 狀態 pill 54px（未開始 muted / 閱讀中 default / 已完成 ok）+ **單鍵推進 mini button**（開始閱讀 → 標記完成 → 重設）。
- 舊版 hero 色塊 **移除**。

### 5.6 標籤 `/tags`（`PtTagsView`）— **改版**
- Toolbar：排序 segmented（使用次數 / 最近使用 / 字母序）+ 搜尋 + 計數。
- Body flush：Stat strip（標籤 / 標記次數 / 平均每篇）→ group header「全部標籤」→ 每標籤一列：tag icon + 名稱（**inline 改名時換成 200px 藍邊輸入框**，Enter/blur 提交、Esc 取消）+「最後使用 y/m/d」+ 96px 使用率條 + 「N 篇」+ dev-only「重新命名」「刪除」mini buttons。
- ⚠ Prototype 的刪除用原生 `confirm`；**正式版沿用舊版的 ConfirmDialog（改名影響範圍 / 合併 / 刪除二次確認）語意**，只是觸發點換成這裡的 mini button。

### 5.7 Plugin 資料檔 `/plugins`（`PtDataAll` / `PtInstalledPlugins`，`wb/pt-plugins.jsx`）— **新增頁面**
- Header：標題「Plugin 資料檔」、pill「N 個資料檔」muted +「已裝 N 個外掛」；**Tabs：資料檔 / 已安裝外掛**。
- **資料檔**：Toolbar 說明 + 搜尋；Body flush 依資料夾分組（金色 group header `#ed9b26`，右側「N 個 plugin ・ 最後更新」），每列 金色 doc icon + 標題 + 路徑 + 等寬字 plugin id chip（168px 欄）+ 日期。**單擊直接進渲染頁**（沒有 Drawer）。
- **已安裝外掛**：Stat strip（已安裝 / 啟用中（綠）/ 映射資料檔 / 不相容（黃）/ notecraftapp 版本）→ group header → 每外掛一列：plug icon（啟用金色、停用灰）+ 名稱 + id + `vX.Y.Z` chip + 「渲染錯誤」danger 或「不相容」warn pill + 「N 檔」+ 啟用/停用 pill 44px + **Switch**（38×22，on 藍 `#1b4f9c`）。停用列 opacity .62 底灰。底部 **callout**（藍底 7% 圓角 8）：「安裝新外掛：執行 `npx notecraftapp install-plugin <id>` …」。
- **Plugin Drawer**（點列）：標題、狀態 pills、描述、「停用/啟用此外掛」+「homepage ↗」、不相容警告框（黃）、Manifest 表（id / 版本 / 作者 / 來源 / 引擎需求 / data schema / 範例資料）、映射規則 glob（`.wb-code` 等寬藍字膠囊）、命中的資料檔（可點）、設定覆寫 JSON `<pre>`、外掛檔案列表。
- 資料模型對齊 `.notecraft/plugins.json` 與 `plugins/<id>/notecraft-plugin.json`（見 `design_handoff_plugin_system/`）。glob 比對 + semver 判斷邏輯見 `ptGlobMatch` / `ptSemverOk`。

### 5.8 資料檔夾 `/plugins/folder/[dir]`（`PtDataList`）— **新增**
- 由 Sidebar「Plugin 資料檔」區段進入；Header 麵包屑 `NoteCraft / Plugin / {dir}`、pill「N 個資料檔」+「N 個 plugin」；Toolbar 說明 + 搜尋；平列（無分組），單擊進渲染頁。

### 5.9 資料檔渲染頁 `/plugins/view/[id]` — **沿用 + 新頁首**
- Header：返回、麵包屑 `NoteCraft / Plugin / {path}`、標題、pill = plugin id + 「N 天前更新」；動作「回到來源筆記」ghost（若有 `backTo`）+ dev-only「以 VS Code 編輯」。
- Body：`.wb-body.flush.wb-viewhost` 放**舊版 `DataFileView`**（`viewWidth="bleed"`），隱藏其自帶 header。

### 5.10 設定與關於 `/settings`（`PtSettings`）— **新增（取代舊 About）**
- Tabs **設定 / 關於**。
- **設定**：group header「工作台」→ 設定列 `.wb-set`（左 label 13px/500 + 說明 11.5px 灰，右控制項）：「預設 view」segmented（List/Board/Table/Timeline）、「List 預設分組」segmented。**設定值持久化到 localStorage**（prototype 用 Tweaks 存）。
- **關於**：Stat strip（筆記 / 系列 / 資料檔 / 待生成標記（黃））→ group header「工作區」+ metadata 列（名稱 / 工作區路徑 / 筆記 / 系列 / 標籤 / 資料檔 / 部署）→ group header「一份筆記的生命週期」+ **流程列** `.wb-flow`（6 步橫向：節點 22px 圓、階段 eyebrow 10px 字距 .14em 大寫、步驟名 13.5px/700 + icon、說明 11.5px、地點膠囊；階段色 作者 `#2c6ebb` / AI `#ed9b26` / 發佈 `#163f7d`；≤860 改縱向）→ group header「技術選型」+ chip 列。文案見 `PT_FLOW` / `PT_STACK`，照抄。

### 5.11 指令面板 ⌘K（`PtPalette`，`wb/pt-app.jsx`）— **新增**
- 全螢幕 scrim `rgba(22,28,40,.32)`，面板 560px（max 92vw）、頂部 14vh、圓角 12、陰影 `0 20px 50px rgba(22,28,40,.28)`。
- 46px 輸入列（search icon + 14px input + 「Esc 關閉」提示）；結果區 max 320px 捲動，沿用 `.wb-row`：筆記最多 7（doc icon + 標題 + 路徑 + AI pill）、系列最多 3（swatch + 名稱 + 「系列 ・ N 章」+ `NN%` pill）、標籤最多 4（僅有輸入時；tag icon + 名稱 + 「N 篇」pill）。Enter 開第一筆筆記、Esc / 點 scrim 關閉。空結果「找不到相符的項目」。

### 5.12 轉簡報 `PresentView` / `DeckLibrary` — **沿用**
全螢幕接管（不在三欄殼內），行為與 `design_handoff_note_to_deck/` 相同；入口改為筆記頁首「轉簡報」「版型庫」與 Drawer「轉簡報」。

---

## 6. 響應式（新增）

| 斷點 | 行為 |
|---|---|
| **桌面 >1100** | 三欄常駐 |
| **平板 861–1100** | Sidebar 變抽屜（左側從 Rail 右邊滑出，scrim `rgba(18,24,34,.4)`），頁首左側出現 32px 漢堡鈕（`.wb-mburger`，`.wb-hd-top` 左 padding 54）；標籤欄縮 110px；Drawer 420px；四種 view 保留 |
| **手機 ≤860** | `.wb-app` 縱向：**Rail 變底部 54px Tab bar**（sticky bottom，5 鈕 44×44、Logo 隱藏）；Sidebar 272px 抽屜；Drawer 滿版；**只提供 List**；row 改多行（標題換行、隱藏標籤欄與 group 統計）；Dashboard 單欄；流程列縱向；設定列上下堆疊 |

Prototype 的 Tweak「介面尺寸」只是強制預覽三種狀態（`body.pt-mobile/.pt-tablet/.pt-desktop`），正式版用 media query 即可。

---

## 7. 技術對照（prototype → 正式版）

沿用 `design_handoff_notecraft/README.md §3` 全部規則，另加：

| 概念 | Prototype | 正式版 |
|---|---|---|
| **路由** | `useState(route)`；`filter` 物件（folder / sub / series / tag / datafolder） | Astro 檔案式路由 + query：`/notes?folder=01-前端`、`?sub=react`、`?series=id`、`?tag=x`、`?pending=1`（AI 佇列）；`/plugins`、`/plugins/folder/[dir]`、`/plugins/view/[id]`、`/settings` |
| **資料夾 / 子資料夾** | `wb/pt-data.jsx` 由 `category` / `tags` 對映假造 | **直接用 MDX 檔案路徑**（`src/content/notes/<folder>/<sub>/<slug>.mdx`），build 期產生樹 |
| **List view / 分組 / 篩選 / 四種 view** | 前端過濾 | 全部在 client island 對 build 期 JSON 做，資料量小；搜尋框走 pagefind 或 title/path/tags 字串比對皆可 |
| **Board 拖曳改狀態** | HTML5 DnD + `setReadingStatus` | 同（閱讀進度仍是 localStorage 客戶端狀態，見舊 handoff） |
| **選取 / Drawer** | `sel` state | client state；Drawer 內容全部來自 build JSON |
| **⌘K** | 全域 keydown | 同；`Escape` 同時關 Drawer |
| **設定（預設 view / 分組）** | Tweaks（localStorage） | localStorage key 自訂（例 `nc-workbench-prefs-v1`），Sidebar/列表讀取 |
| **Plugin 啟用 / 停用 Switch** | 純 client state | dev-only：寫回 `.notecraft/plugins.json`（`enabled`）；正式環境唯讀 |
| **「以 VS Code 編輯」「新增筆記」「重新命名 / 刪除標籤」** | 假動作 | 照舊 handoff：dev-only API；正式環境隱藏 |
| **字數** | 內文字元加總 | build 期由 MDX 原始碼計算 |
| **`daysAgo` 基準日** | 寫死 `2026-06-12` | `Date.now()` |

---

## 8. Design Tokens（工作台專用，疊在 TrendLink DS 上）

`wb/pt.css` `:root`：
- 藍 `--wb-blue #1b4f9c` / 深 `--wb-blue-d #163f7d` / 亮 `--wb-blue-l #2c6ebb`；金 `--wb-gold #ed9b26`（hover `#e37b24`）
- 背景 `--wb-bg #f6f8fb`、面板 `#fff`、邊線 `--wb-line #e1e6ee`、次邊線 `--wb-line-2 #eef1f6`
- 文字 `--wb-ink #161c28` / `--wb-ink-2 #2b3546` / `--wb-ink-3 #6c798e`；Rail `#161c28`
- 語意 ok `#2e9e6b`、warn `#e3a008`（文字用 `#8a6412`）、danger `#d64545`
- 資料夾色：`01-前端 #2c6ebb`、`02-後端 #163f7d`、`03-產品管理 #ed9b26`、`04-資安 #6c798e`、`05-網路 #1b4f9c`、根目錄 `#8b9aad`
- 系列色（by accent）：orange `#ed9b26`、blue `#2c6ebb`、navy `#163f7d`、green `#2e9e6b`
- 字體：Noto Sans TC / Noto Sans；等寬 `var(--font-mono)`（DS）。基準 **13px**；標題 20；Drawer 標題 19；KPI 40/900；小字 11–12.5。數字一律 `font-variant-numeric: tabular-nums`（`.tnum`）。
- 圓角：列/卡/widget 8、按鈕群 6、pill/chip/按鈕 999。（舊版 DS 圓角覆寫 `--radius-*` 仍在 HTML `:root`，供沿用的 NoteView 使用。）
- 陰影：Drawer `-10px 0 28px rgba(27,79,156,.14)`；卡片 hover `0 2px 8px rgba(27,79,156,.08)`；面板 `0 20px 50px rgba(22,28,40,.28)`。
- 動效：Drawer 滑入 200ms `cubic-bezier(.22,.7,.3,1)`、scrim 淡入 160ms、caret 旋轉 140ms、Switch 160ms、側欄抽屜 220ms ease。`prefers-reduced-motion` 全部關閉。
- 深色模式：`pt.css` 含 `.wb-dark` token 但**本版不啟用**（程式強制移除 class），暫不實作。

## 9. Assets
- Logo：`NcLogo` inline SVG（藍底方形 + 金色四芒星 + 兩條白線），見 `wb/pt-shell.jsx`；favicon 同款。
- Icon：`PT_ICONS` 17 個 line icon（24 grid、1.7 stroke），正式版換 `lucide-react` 對應：home, search, sparkles, plug, settings, moon, sun, folder, chevron-right, layers, file-text, plus, filter, presentation, x, tag, arrow-left。
- 無外部圖片。

## 10. Files in this bundle（`prototype/`）
- `NoteCraft-Workbench-standalone.html` — **自含單檔，離線可開**，看設計與互動請開這份（右下 Tweaks 可切 dev 模式、view、介面尺寸、plugin 數、渲染錯誤等）。
- `NoteCraft-Workbench.html` — 載入器（需專案 `_ds/`）。
- `wb/pt.css` — **工作台全部樣式（本次改版的視覺定稿都在這）**。
- `wb/pt-app.jsx` — 殼、路由、篩選、⌘K 面板、Tweaks。
- `wb/pt-shell.jsx` — Rail / Sidebar / Header / Toolbar / Logo / icons / `useNarrow`。
- `wb/pt-views.jsx` — List / Board / Table / Timeline / Drawer / 資料檔平列。
- `wb/pt-views2.jsx` — Stat strip、系列總覽與詳情、標籤、設定與關於。
- `wb/pt-dash.jsx` — Dashboard widgets。
- `wb/pt-plugins.jsx` — 已安裝外掛列表 + Plugin Drawer + 假 manifest 資料。
- `wb/pt-data.jsx` — 資料轉接層（資料夾樹、系列統計、週統計、分組 key）。
- `app/*.jsx` — **舊版沿用元件**（NoteView、DataFileView、Present/DeckLibrary、Modal、data store 等），codebase 應已有對應實作，僅供對照。
- `tweaks-panel.jsx` — Tweaks 面板（僅原型用）。

相關既有交付：`design_handoff_notecraft/`（基礎 + PRD）、`design_handoff_series/`、`design_handoff_plugin_system/`、`design_handoff_note_to_deck/`、`design_handoff_canvas_viewport/`、`design_handoff_viz_zoom/`、`design_handoff_mdx_codeblock/`。

## 11. 建議給 Claude Code 的起手 prompt

> 「`design_handoff_workbench/` 是 NoteCraft **新版工作台 UI** 的設計定稿與交付說明。現有 codebase 是依 `design_handoff_notecraft/` 做的舊版。請依 README §0 的對照表**把 app shell 換成三欄工作台**（Rail + Sidebar 檔案樹 + 壓縮頁首/工具列），並**新增**：筆記列表四種 view（List 分組 / Board 拖曳改閱讀狀態 / Table / Timeline）、單擊 Drawer 預覽、⌘K 指令面板、Dashboard widget grid 與三個 Tab、Plugin 資料檔頁與已安裝外掛頁、設定頁、平板/手機響應式。系列、系列詳情、標籤頁改成 README §5 的資料列版面。**沿用**既有 NoteView、DataFileView、轉簡報、NewNoteModal、閱讀進度、ConfirmDialog，只換外殼並隱藏它們自帶的 header。視覺以 `prototype/wb/pt.css` 為準像素級重現，token 見 §8；技術架構與資料來源照 §7 與舊 README §3。先做殼與路由，再做 /notes 四 view + Drawer，再補 Dashboard、Plugin、設定與響應式。」
