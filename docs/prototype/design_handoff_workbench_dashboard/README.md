# Handoff：NoteCraft 工作台 — 總覽儀表板（Dashboard 改版）

## Overview
這份交付說明的是 NoteCraft 工作台「總覽」分頁的改版。改版後，儀表板在一個視窗高度內呈現下列資訊：筆記數量、本週更新、AI 待生成數量、寫作頻率、最近更新、系列進度、標籤分布，以及每週更新日誌。版面分成兩列：上列是 KPI 卡，下列是四張等高的內容卡，卡片內的內容可各自捲動。

## About the Design Files
本資料夾內的檔案是**以 HTML 製作的設計參考**，用來展示預期的外觀與互動，**不是要直接複製上線的正式程式碼**。請在目標 codebase 既有的環境（React / Vue 等）中，依照既有的元件、樣式與資料層慣例**重新實作**。若專案還沒有前端環境，請選擇最適合的框架。

- `prototype/NoteCraft-Workbench-Dashboard.html`：單一檔案、可離線開啟的完整工作台 prototype，開啟後即為「總覽」分頁。
- `source/`：儀表板的 prototype 原始碼，供查詢精確數值與邏輯：
  - `pt-dash2.jsx`：所有儀表板元件（`PtOverview` 與各卡片元件）
  - `pt-dash2.css`：儀表板樣式（前綴 `dv-`）
  - `pt-data.jsx`：資料轉接層（`ptRows()`、`FOLDER_COLOR`、`SERIES_COLOR`）

## Fidelity
**High-fidelity。** 顏色、字級、間距、圓角與互動都是最終版本，請依此精確還原，並使用 codebase 既有的元件庫與樣式寫法。

---

## Screen：總覽（Overview）

### 整體版面
- 外層容器 `.dv-body`：padding `16px 20px 20px`，`display:flex; flex-direction:column`；背景為 `--wb-bg`。
- `.dv-wrap`：`flex:1 0 auto; display:flex; flex-direction:column; gap:14px; min-height:100%`。**不設 max-width**，儀表板佔滿整個頁面寬度。
- 整頁高度填滿一個視窗；下列卡片會延伸到頁面底部，內容超出時在**卡片內捲動**，不讓整頁捲動。

**Row 1** `.dv-row1`：`grid-template-columns: repeat(3, minmax(150px,1fr)) minmax(0,2.6fr); gap:14px`
→ 筆記總數 ｜ 本週更新 ｜ AI 待生成 ｜ 寫作頻率（寬）

**Row 2** `.dv-row2`：`grid-template-columns: repeat(3, minmax(0,1fr)); grid-template-rows: minmax(0,1fr); gap:14px; flex:1 1 0; min-height:380px; align-items:stretch`
→ 最近更新 ｜ 中欄（系列 + 標籤分布，垂直堆疊 gap 14px）｜ 更新日誌
- 每張卡片都設 `min-height:0`，讓內部的清單能捲動。
- 中欄 `.dv-midcol`：系列卡 `flex:none; max-height:58%`，清單 `max-height:258px` 可捲動；標籤分布卡 `flex:1 1 0; min-height:0; overflow:hidden`，吃掉中欄剩下的高度。

### 響應式
| 斷點 | 行為 |
|---|---|
| ≤1180px | Row1 改為 3 欄，寫作頻率換行並橫跨整列（`grid-column:1/-1`） |
| ≤980px | Row2 改為 2 欄、高度 auto；更新日誌橫跨整列；清單取消內捲（日誌清單 `max-height:320px`）；中欄的系列卡取消高度上限；標籤分布圖改為固定高度 `220px` |
| ≤680px | 兩列都改為單欄，所有卡片垂直堆疊 |

### 卡片共通樣式 `.dv-card`
- 背景 `--wb-panel`（#fff）、邊框 `1px solid --wb-line`（#e1e6ee）、**圓角 8px、無陰影**
- padding `14px 16px`；`display:flex; flex-direction:column; gap:12px`
- 標頭 `.dv-card-h`：標題 h3 15px/700 `--wb-ink`；副標 p 12px `--wb-ink-3`，與標題間距 3px；右側放連結或分段控制
- 連結 `.dv-link`：12.5px/700，顏色 `--wb-blue-l`（#2c6ebb），hover 時變為 `--wb-blue`（#1b4f9c）；無底線、無背景
- 字型：Noto Sans TC / Noto Sans；數字使用 `.tnum`（tabular-nums）

### 捲動列
可捲動的清單（`.dv-tl-list` / `.dv-sl-list` / `.dv-log-list`）平時**隱藏捲動列**（`scrollbar-color: transparent`）；滑鼠移到該卡片上時才顯示**細、淺灰**的捲動列（`scrollbar-width:thin; scrollbar-color: --wb-line transparent`），並設 `scrollbar-gutter:stable`，避免出現捲動列時內容跳動。

---

### 1. KPI 卡：筆記總數／本週更新（`DvStatKpi`）
- 標籤 `.dv-kpi-l`：12.5px/600 `--wb-ink-2`
- 主體 `.dv-kpi-body`：高度 84px，左側為大數字，右側為環形圖
  - 大數字 `.dv-kpi-n`：46px/700、line-height 1、letter-spacing -.02em
  - 環形圖 `DvRing`：84×84，半徑 = 84/2 − 8，stroke-width 12，底環顏色 `--wb-line-2`；各段之間留 2px 間隙，從 12 點鐘方向開始
- 底部圖例 `.dv-kpi-rs`：11px `--wb-ink-3`；色塊 9×9、圓角 2px；數字 700 `--wb-ink-2`。「未發佈」數量為 0 時不顯示。
- 資料依**閱讀狀態**分成 4 段（見下方 Tokens「閱讀狀態色」）
- 本週更新：以最新一筆 `updated` 日期往前算 7 天（不含第 7 天當天）

### 2. KPI 卡：AI 待生成
- 標頭 `.dv-kpi-hd`：左側「AI 待生成」，**右上角**為「前往佇列」連結（路由至 `ai`）
- 大數字顏色 `#c47a12`（`.warn`）；數值為所有 marker 中 `status !== "generated"` 的數量
- 底部文字：「分布於 **N** 篇筆記」（N = 有待生成 marker 的筆記數）
- 背景裝飾 `.dv-spark`：絕對定位於右下，寬 78%、高 58%、`pointer-events:none`
  - 金色曲線 `#ed9b26`，不透明度 .45、線寬 2；下方填入由上往下漸層（不透明度 .22 → 0）
  - 虛線格線（dash 3 3、顏色 `--wb-line`）加上遮罩，**越往左越淡**，讓左側的內容區保持乾淨（遮罩漸層：0 → .25 @45% → 1）
  - 完整的 SVG path 請參考 `pt-dash2.jsx` 的 `PtOverview`

### 3. 寫作頻率（`DvFreq`）
- 右上角為分段控制 `DvSeg`：`8 週｜12 週｜16 週`（預設 12 週）
  - 按鈕高 26px、padding 0 10px、12px；選中狀態為 `--wb-blue` 底、白字 700；外框 1px、圓角 6px
- 圖例：4 種閱讀狀態，色塊 12×9
- 圖表：每週一根**堆疊長條**，最寬 20px（`min(20px,70%)`），頂端圓角 3px，各段間距 1px，每段最小高度 2px
  - Y 軸刻度為 top / top/2 / 0，其中 top = max(2, 單週最大值)；虛線格線在 0/50/100% 位置
  - **日期標籤放在基準線下方**（基準線為 1px `--wb-line`，距底部 18px），避免與長條重疊；每隔 `ceil(n/6)` 週顯示一個日期，格式為 `M/D`（當週的結束日）
  - 進場動畫 `ncGrow`：scaleY 0→1、420ms ease-out，以底部為原點
  - hover 某一欄：該欄長條 `brightness(.92)`；tooltip 內容為「M/D 當週更新 N 篇：已完成 x、閱讀中 y…」

### 4. 最近更新（`DvTimeline`）
- 副標「最新 7 篇」，右上角「查看全部」→ 路由 `notes`
- 垂直時間軸：左側 1px 線 `--wb-line`，節點為 9px 圓點（白底、2px 邊框，顏色取自所屬資料夾，見 `FOLDER_COLOR`）
- 每個節點 `.dv-tl-node`（整塊可點擊 → 選取該筆記；hover 背景 `--wb-bg`，圓角 6px）：
  1. 標題 13px/600，單行，超出顯示省略號
  2. 路徑（mono 10.5px `--wb-ink-3`）＋ 日期 `M/D`（11px）
  3. 描述 12px `--wb-ink-2`，限 1 行
  4. Meta：最多顯示 2 個標籤 pill（18px 高、10.5px），其餘顯示為 `+N`；最右側為 `AI 已生成/總數`（綠色 `#23855a`；若有待生成則為橘色 `#b86e0e`）

### 5. 系列（`DvSeries`）
- 副標「共 N 個系列」，右上角「查看全部」→ `series`；最多 3 個系列
- 每一列：
  - 系列名稱（13.5px/700，前方 8px 色塊，顏色依 accent：orange #ed9b26 / blue #2c6ebb / navy #163f7d / green #2e9e6b）＋ 右側「**done**／tracked 篇」
  - 進度條 6px 高、全圓角、底色 `--wb-line-2`：已完成為實心系列色，閱讀中為**金色斜紋**
  - 底部：「下一篇 {標題}」＋ 按鈕「開始閱讀／繼續閱讀 ›」（`.dv-btn` 26px 高、1px 外框、圓角 6px、藍字 700；hover 時邊框為 #9dbde6）；若全部讀完，改為綠色勾勾加「已全部閱讀」
- 列與列之間以 1px `--wb-line-2` 分隔，每列上下 padding 12px

### 6. 標籤分布（`DvTags`）— 馬賽克（treemap）
- 副標「N 個標籤・共標記 M 次」，右上角「查看全部」→ `tags`
- 取使用次數**前 11 名**的標籤；其餘合併成一塊「其他 N 個」（背景 `--wb-bg`、文字 `--wb-ink-3`，點擊 → `tags`）
- 版面演算法：遞迴二分的 treemap（`dvTreemap`）。依累計值把項目切成約各佔一半的兩組，較寬的方向優先切。每塊面積與筆記數**成正比**；座標以 % 計算，因此會隨容器縮放。
- 方塊：`position:absolute`，2px 白色邊框（`--wb-panel`，形成方塊間的間隙），圓角 6px，padding 6px 8px
- 配色依排名套用 `DV_TILE`（第 1–3 名固定，之後在第 4–6 種之間輪替）：
  1. `#1b4f9c` / 白字 2. `#2c6ebb` / 白字 3. 金色斜紋（#ed9b26 on #fdf1de）/ `#7a4a08`
  4. `#eaf1fb` / `#1b4f9c` 5. 淺藍斜紋（#9dbde6 on #f3f7fd）/ `#163f7d` 6. `#fdf1de` / `#8a560c`
- **自適應文字**：依方塊的**實際像素大小**決定顯示內容（以 ResizeObserver 加 window resize 量測容器）：
  - ≥120×84px：`big`，名稱 13px ＋ 數字 26px/700
  - ≥60×42px：名稱 11.5px/600（單行、超出顯示省略號）＋ 數字 15px/700
  - ≥24×22px：只顯示數字（12px、置中）
  - 更小的方塊：不顯示文字
- **Tooltip**（所有方塊都有，不論有沒有顯示文字）：跟隨滑鼠，位置為游標右下（+12, +14），並限制在視窗內；深色底 `#132033`、白字、圓角 6px、陰影 `0 4px 12px rgba(19,32,51,.18)`；第一行為 `#標籤名`（粗體），第二行為「N 篇・P%」（`#b9c6d8`、11px）
- hover：其他方塊的不透明度降到 .45，目前方塊 `brightness(.95)`；transition 160ms
- 點擊 → 以該標籤篩選（`onTag(name)`）

### 7. 更新日誌（`DvLog`）
- 副標「本週共更新 N 篇筆記」（切換到過去的週時改為「該週」）
- 週導覽 `.dv-week-nav`：32px 高、背景 `--wb-bg`、圓角 6px；左右箭頭按鈕 26×26；中間文字為「**7 天**・M/D – M/D」；目前這週時「下一週」按鈕停用（不透明度 .3）
- 日期列 `.dv-days`：7 欄 grid，每格顯示日期（2 位數 13px/600）＋ 星期（10.5px）
  - 當天有更新：文字改為 `--wb-ink`，右上角加 4px 金色圓點
  - 點擊某天會切換篩選；選中狀態背景 `#e6effa`、文字 `--wb-blue-l`
- 清單 `.dv-log-list`：可捲動，卡片間距 6px。每張卡片 `.dv-ev`（1px 邊框、圓角 6px、padding 9px 10px；hover 時背景 `--wb-bg`、邊框 #9dbde6）包含：
  - 第一行：7px 資料夾色圓點 ＋ 標題 12.5px/600（單行、省略號）
  - 第二行（11px `--wb-ink-3`，左側縮排 14px）：`M/D`｜**系列名稱**（藍色 `--wb-blue-l`，前方加 bookOpen 圖示，超出省略；沒有系列就不顯示）｜標籤數（tag 圖示）｜AI x/y（sparkle 圖示）
  - 沒有資料時顯示：「這段期間沒有更新的筆記」
- 底部按鈕 `.dv-full`：「查看全部筆記」，34px 高、滿寬、1px 邊框、圓角 6px、13px/700 → `notes`

---

## Interactions & Behavior
- 路由回呼：`onRoute(key)`，key 為 `notes` / `series` / `tags` / `ai`；`onSel(slug)` 選取筆記；`onOpen(ref)` 開啟筆記；`onSeries(id)` 開啟系列；`onTag(name)` 以標籤篩選
- 資料變動（標籤、閱讀進度等）時，透過 `ncSubscribe` 訂閱後重新渲染；實作時請改為使用 codebase 的 store 或 query 機制
- Hover：連結顏色加深；按鈕與卡片列的背景改為 `--wb-bg`；圖表元素降低亮度或讓其他元素變淡
- 動畫：僅寫作頻率長條的 `ncGrow`（420ms ease-out）；`prefers-reduced-motion` 時關閉所有動畫
- 深色模式：`.wb-dark` 會覆寫 `--wb-*` 變數（見 Tokens）；日誌選中日期的背景改為 `#1f2b3e`

## State Management
| 元件 | State | 說明 |
|---|---|---|
| DvFreq | `range` | `"8 週" \| "12 週" \| "16 週"`，預設 12 週 |
| DvTags | `hov`、`tip`、`sz` | hover 中的方塊、tooltip 位置與內容、容器像素尺寸 |
| DvLog | `off`、`pick` | 週位移（0 = 本週，數字越大越往前）、選中的日期（ISO 格式，null 表示全部）；切換週時清除 pick |

**資料需求**（每筆筆記，參考 `ptRow()`）：`slug, title, folder, path, tags[], markers[]（含 status）, ai:[已生成, 待生成], updated (YYYY-MM-DD), series?, description`
另外還需要：`readingStatus(slug)` → `done | reading | not-started | unpublished`；`seriesProgress(series)` → `{tracked, done, reading, notStarted, started, completed, next}`；`tagStats()` → `[{name, count}]`。
「最新日期」一律以資料中最大的 `updated` 值為基準，不使用系統今天日期。

## Design Tokens
**工作台變數（淺色 / 深色）**
| Token | Light | Dark |
|---|---|---|
| `--wb-blue` | #1b4f9c | — |
| `--wb-blue-d` | #163f7d | — |
| `--wb-blue-l` | #2c6ebb | — |
| `--wb-gold` | #ed9b26 | — |
| `--wb-bg` | #f6f8fb | #12161f |
| `--wb-panel` | #ffffff | #1a202b |
| `--wb-line` | #e1e6ee | #2a323f |
| `--wb-line-2` | #eef1f6 | #232a36 |
| `--wb-ink` | #161c28 | #eef2f7 |
| `--wb-ink-2` | #2b3546 | #c3ccd8 |
| `--wb-ink-3` | #6c798e | #8b98ab |

**閱讀狀態色**（寫作頻率、KPI 環形圖、圖例共用）
- 已完成：實心 `#1b4f9c`
- 閱讀中：斜紋 `#ed9b26` on `#fdf1de`
- 待開始：斜紋 `#7fa6d8` on `#eaf1fb`
- 未發佈：斜紋 `#c3cad6` on `#f3f5f8`
- 斜紋寫法：`repeating-linear-gradient(135deg, FG 0 1.6px, BG 1.6px 5px)`；在 SVG 中使用 `<pattern>`，寬 5、旋轉 45°、線寬 1.6

**資料夾色** `FOLDER_COLOR`：01-前端 #2c6ebb · 02-後端 #163f7d · 03-產品管理 #ed9b26 · 04-資安 #6c798e · 05-網路 #1b4f9c · 根目錄 #8b9aad

**其他**：警示數字 #c47a12；AI 完成 #23855a；AI 待生成 #b86e0e；hover 邊框 #9dbde6；tooltip 底色 #132033

**圓角**：卡片 8px；按鈕、分段控制、清單卡片與方塊 6px；色塊 2px；pill 999px
**間距**：卡片間距 14px；卡片 padding 14×16；頁面 padding 16/20/20
**字級**：46（KPI 數字）· 26（大方塊數字）· 15（卡片標題）· 13.5 / 13 / 12.5 / 12 / 11.5 / 11 / 10.5
**陰影**：卡片無陰影；只有 tooltip 有陰影

品牌來源為 TrendLink 聯和趨動 Design System（字型 Noto Sans TC）。若 codebase 已有品牌 token，請對應使用。

## Assets
- 圖示：Lucide 風格的線條圖示（`sparkle`、`tag`、`bookOpen`、`check`、`chevronLeft`、`chevronRight`），2px 線寬；請使用 codebase 既有的 icon 套件（例如 `lucide-react`）
- 沒有點陣圖片；AI 卡片的曲線與所有圖表都以 SVG 或 CSS 繪製

## Files
- `prototype/NoteCraft-Workbench-Dashboard.html`：完整 prototype（單一檔案，可直接用瀏覽器開啟）
- `source/pt-dash2.jsx`：儀表板元件與 treemap 演算法
- `source/pt-dash2.css`：儀表板樣式
- `source/pt-data.jsx`：筆記列資料轉接與色彩對照
