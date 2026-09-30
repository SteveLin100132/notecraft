# Handoff：NoteCraft 工作台 — 首頁「更新月曆」頁籤

## Overview
這次改版把工作台首頁的「本週」頁籤改名為 **「更新月曆」**，並改成月曆形式呈現：每篇筆記依 **更新日期**（`updatedAt`）放進對應的日期格，顏色代表 **閱讀狀態**，配色與「總覽」頁籤寫作頻率柱狀圖相同。月曆有「月」和「週」兩種檢視：
- **月**：每篇筆記縮成一個小正方色塊。所有日期格一樣大，整個月在一個畫面內顯示完畢，不需要捲動。
- **週**：每篇筆記以卡片呈現，內容包含閱讀狀態、筆記標題、所屬系列、標籤（最多 2 個，其餘以 +N 表示）、AI 已生成數/總數。

在兩種檢視中點擊筆記，都會開啟既有的筆記資訊 Drawer（與首頁其他清單行為相同）。

頁籤順序：`總覽 ｜ 更新月曆 ｜ AI 佇列`。

## About the Design Files
本資料夾內的檔案是 **以 HTML 製作的設計參考**，用來展示預期的外觀與互動，**不是要直接上線的正式程式碼**。請在目標 codebase 既有的環境（React / Vue 等）中，依照既有的元件、樣式與資料層慣例重新實作。若專案還沒有前端環境，請自行選擇最合適的框架。

- `prototype/NoteCraft-Workbench-Update-Calendar.html`：單一檔案、可離線開啟的完整工作台 prototype。開啟後切到首頁的「更新月曆」頁籤即可檢視。
- `source/`：prototype 原始碼，可用來查精確數值與邏輯：
  - `pt-cal.jsx`：**本次新增**，包含 `PtCalendar`、`CalNote`（週卡片）、`CalDot`（月色塊）
  - `pt-cal.css`：**本次新增**，月曆樣式（前綴 `cal-`）
  - `pt-dash.jsx`：`PtDashboard`，依頁籤切換內容（`tab === "更新月曆"` → `PtCalendar`）
  - `pt-dash2.jsx`：`DV_RS` 閱讀狀態配色定義（月曆直接沿用），以及總覽儀表板
  - `pt-dash2.css`：沿用的共用樣式 `.dv-tag`、`.dv-ai`、`.dv-seg`、`.dv-legend`
  - `pt-data.jsx`：資料轉接層 `ptRows()`，提供 row 欄位

## Fidelity
**High-fidelity。** 顏色、字級、間距、圓角與互動都是最終版本，請依此精確還原，並使用 codebase 既有的元件庫與樣式寫法。

---

## Screen：首頁 › 更新月曆

### 整體版面
- 容器 `.cal-body`：`padding:14px 20px 20px; display:flex; flex-direction:column; gap:12px`，高度填滿頁面內容區（頁首與頁籤以下）。
- 上方是工具列 `.cal-bar`，下方是月曆格 `.cal-grid`，月曆格會延伸填滿剩餘高度（`flex:1 1 auto; min-height:0`）。

### 工具列 `.cal-bar`
`display:flex; align-items:center; gap:16px; flex-wrap:wrap`，由左至右：

1. **導覽按鈕** `.cal-nav`（gap 4px）
   - 「‹」上一頁、「›」下一頁：icon chevronLeft / chevronRight，16px
   - 「本週」：跳回包含「今天」的那一週（月檢視則跳到當月），字重 600，左側多 4px 間距
   - 按鈕樣式：高 28px、最小寬 28px、`padding:0 8px`、`border:1px solid #e1e6ee`、背景 `#fff`、文字 `#2b3546` 12px、圓角 6px；hover 時背景 `#f6f8fb`
2. **標題** `.cal-title`：17px / 700 / `#161c28`，數字使用 tabular nums
   - 月：`2026 年 9 月`
   - 週：`2026 年 9/20 – 9/26`（顯示該週日到週六）
   - 標題後方接副標：`共更新 N 篇`，12px / 400 / `#6b7688`（`--wb-ink-3`），與標題 baseline 對齊，間距 10px
   - N 的計算：月檢視只算 **當月** 的日期，不含前後月補位格；週檢視算 7 天
3. **右側群組** `.cal-right`（`margin-left:auto; gap:16px`）
   - **圖例** `.dv-legend`：依序顯示 已完成／閱讀中／待開始／未發佈，每項是「色塊 12×9 圓角 2px」＋文字（11.5px `--wb-ink-3`）＋數量（700、`#2b3546`）。數量是目前範圍內各狀態的篇數。圖例項目間距 `4px 14px`。
   - **檢視切換** `.dv-seg`：`週 ｜ 月` 分段按鈕，預設「月」。外框 1px `#e1e6ee`、圓角 6px；按鈕高 26px、`padding:0 10px`、12px；選中時背景 `#1b4f9c`、白字、700。

### 閱讀狀態配色（沿用總覽寫作頻率柱狀圖，`DV_RS`）
| key | 標籤 | 填色 |
|---|---|---|
| `done` | 已完成 | 實色 `#1b4f9c` |
| `reading` | 閱讀中 | 斜紋 `repeating-linear-gradient(135deg, #ed9b26 0 1.6px, #fdf1de 1.6px 5px)` |
| `not-started` | 待開始 | 斜紋 `repeating-linear-gradient(135deg, #7fa6d8 0 1.6px, #eaf1fb 1.6px 5px)` |
| `unpublished` | 未發佈 | 斜紋 `repeating-linear-gradient(135deg, #c3cad6 0 1.6px, #f3f5f8 1.6px 5px)` |

閱讀狀態讀取自 `readingStatus(slug)`；找不到對應狀態時一律視為 `unpublished`。

### 月曆格 `.cal-grid`
- `display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:6px`
- 第一列是星期標題 `日 一 二 三 四 五 六`（`.cal-wd`：12px、`--wb-ink-3`、左右 padding 8px），**週日為一週的第一天**。這一列高度 auto，不要套用日期格的最小高度。
- **月檢視**：`grid-template-rows: auto repeat(週數, minmax(0,1fr))`。週數 = `ceil((當月 1 日的星期 + 當月天數) / 7)`，可能是 4、5 或 6 列。每列等高，平均分配剩餘高度，所以所有日期格一樣大。日期格 `min-height:64px; overflow:hidden`。月初之前、月底之後的補位格顯示前／後月的日期。
- **週檢視**：`grid-template-rows: auto minmax(320px, 1fr)`，7 個日期格高度填滿剩餘空間（最低 320px）。筆記多到超出格子時，只有該格內部可捲動（`overflow:auto`）。

### 日期格 `.cal-cell`
- 共通：`border:1px solid #eef1f6`、圓角 8px、`padding:8px`、`display:flex; flex-direction:column; gap:6px`、`min-width:0`
- 背景色：
  - 當月一般日期：`#f8fafc`
  - 前／後月補位格（`.out`，只出現在月檢視）：`#f4f7fb`；日期數字改為 `--wb-ink-3`、字重 500
  - **當週**（`.thiswk`，只在月檢視顯示）：`#e6eef9`，框線 `#d3e0f2`
  - 週檢視中所有日期格都用一般色 `#f8fafc`，**不顯示**當週淺藍色
- 格頭 `.cal-cell-h`：左邊是日期數字（13.5px / 700 / `#161c28`），右邊有筆記時顯示 `N 篇`（12px `--wb-ink-3`），兩者 baseline 對齊、間距 6px
  - 每月 1 日顯示 `M/D`（例 `10/1`）；週檢視的第一格也顯示 `M/D`；其餘只顯示日期數字
  - **今天**（`.today`）：日期數字放進藍色膠囊，背景 `#1b4f9c`、白字、高 22px、最小寬 22px、`padding:0 6px`、全圓角
- 內容區 `.cal-cell-b`：月檢視 `flex-direction:row; flex-wrap:wrap; gap:4px; align-content:flex-start`；週檢視 `flex-direction:column; gap:6px`

### 月檢視：筆記色塊 `CalDot` / `.cal-dot`
- 一篇筆記一個 14×14px 正方形，圓角 3px，無邊框。背景使用上表的閱讀狀態填色，另加 `box-shadow: inset 0 0 0 1px rgba(27,79,156,.12)`，讓淺色斜紋在格子背景上也看得清楚。
- 排列順序與資料順序相同（更新時間新 → 舊）。
- hover：`transform:scale(1.25)`，外圈加藍色描邊 `box-shadow: 0 0 0 2px #fff, 0 0 0 3px #1b4f9c`；transition `transform .12s`
- tooltip（原生 `title`）：`{筆記標題}・{系列標題}・{閱讀狀態}`，沒有系列時省略系列那一段
- `aria-label`：`{筆記標題}（{閱讀狀態}）`
- 月檢視不再有「還有 N 篇」的展開按鈕。

### 週檢視：筆記卡片 `CalNote` / `.cal-note`
- 卡片：背景 `#fff`、`border:1px solid #e1e6ee`、圓角 6px、`padding:7px 8px 8px`、`box-shadow:0 1px 2px rgba(27,79,156,.06)`、`display:flex; flex-direction:column; gap:4px`、文字靠左
- hover：`box-shadow:0 4px 12px rgba(27,79,156,.12)` 並上移 1px（`translateY(-1px)`），transition `.14s`
- 由上而下：
  1. **狀態列** `.cal-note-st`：34×8px 的全圓角狀態色條（閱讀狀態填色）＋狀態文字（10.5px `--wb-ink-3`），間距 6px
  2. **筆記標題** `.cal-note-t`：12.5px / 600 / `#161c28`，行高 1.4，最多 2 行，超出以省略號截斷
  3. **所屬系列** `.cal-note-sr`（有系列時才顯示）：bookOpen icon 11px ＋系列標題，11px `#1b4f9c`，單行省略
  4. **標籤與 AI 數量** `.cal-note-meta`（有標籤或有 AI 標記時才顯示），`flex-wrap:wrap; gap:4px`：
     - 標籤最多顯示 2 個 `.dv-tag`：高 18px、`padding:0 7px`、全圓角、背景 `#f6f8fb`、框線 `#eef1f6`、10.5px `#2b3546`
     - 超過 2 個時加上 `+N`（`.dv-tag.more`，文字 `--wb-ink-3`），N = 標籤總數 − 2
     - AI 數量 `.dv-ai`：sparkle icon 11px ＋ `{已生成}/{總數}`，10.5px，`margin-left:auto` 靠右。全部生成完是綠色 `#23855a`；還有未生成的是 `.warn` 橘色 `#b86e0e`。筆記沒有 AI 標記（總數 0）時不顯示。

### 響應式
- ≤900px：`grid-template-columns: repeat(7, minmax(96px,1fr))`，月曆格改為可以橫向捲動。

---

## Interactions & Behavior
| 動作 | 行為 |
|---|---|
| 單擊色塊或卡片 | 開啟筆記資訊 Drawer（`onSel(slug)`）；再點同一篇會關閉 Drawer（沿用首頁既有的 toggle） |
| 雙擊色塊或卡片 | 直接開啟筆記頁（`onOpen(slug)`） |
| ‹ / › | 月檢視：上／下一個月（anchor 設為該月 1 日）。週檢視：前／後 7 天 |
| 本週 | anchor 回到「今天」 |
| 週／月切換 | 保留目前的 anchor，只改變檢視 |
| 閱讀狀態變更 | 其他地方（Drawer、看板）改了閱讀狀態後，月曆要即時重繪色塊、卡片與圖例數量（prototype 透過 `ncSubscribe` 訂閱資料變動） |

- **「今天」的定義**：prototype 以所有筆記中最新的 `updatedAt` 當作今天，方便展示假資料。正式版請改用系統當日日期。

## State Management
- `view: "月" | "週"`，預設 `"月"`
- `anchor: Date`：目前檢視的基準日，初始為今天
- 衍生資料（每次 render 計算即可）：
  - `byDay: Record<"YYYY-MM-DD", Row[]>`：依 `updated` 分組
  - `days: Date[]`：月檢視是從當月 1 日所在週的週日開始，共 `週數×7` 天；週檢視是 anchor 所在週的週日到週六
  - `inRange`：範圍內的筆記（月檢視排除補位格），用於副標總數與圖例數量
  - `thisWeek`：今天所在週的週日到週六，用於 `.thiswk`
- 使用的 row 欄位（見 `pt-data.jsx` 的 `ptRow`）：`slug`、`title`、`updated`（YYYY-MM-DD）、`series?.title`、`tags: string[]`、`markers`（AI 標記陣列，長度 = 總數）、`ai: [已生成, 未生成]`
- 日期一律用本地時區的 `YYYY-MM-DD` 字串比對，避免 UTC 位移造成日期錯位。

## Design Tokens
| Token | 值 |
|---|---|
| `--wb-blue` | `#1b4f9c` |
| `--wb-bg` | `#f6f8fb` |
| `--wb-panel` | `#fff` |
| `--wb-line` | `#e1e6ee` |
| `--wb-line-2` | `#eef1f6` |
| `--wb-ink` | `#161c28` |
| `--wb-ink-2` | `#2b3546` |
| `--wb-ink-3` | 見 `wb/pt.css`（次要文字灰） |
| 日期格一般 | `#f8fafc` |
| 日期格補位 | `#f4f7fb` |
| 當週（月檢視） | `#e6eef9`，框線 `#d3e0f2` |
| AI 完成 / 未完成 | `#23855a` / `#b86e0e` |

- 字體：Noto Sans TC / Noto Sans；數字使用 `font-variant-numeric: tabular-nums`（`.tnum`）
- 圓角：日期格 8px、卡片與按鈕 6px、色塊 3px、標籤與今天膠囊全圓角
- 間距：月曆格 gap 6px、日期格 padding 8px、色塊間距 4px、卡片間距 6px
- 深色模式：所有 `--wb-*` 變數在 `.wb-dark` 下有對應值；日期格的三個固定底色（`#f8fafc` / `#f4f7fb` / `#e6eef9`）正式版請改用 token，並提供深色值

## Assets
- Icons：`chevronLeft`、`chevronRight`、`bookOpen`、`sparkle`，Lucide 風格線條 icon（2px stroke），prototype 內以 inline SVG 繪製（`Ic` 元件）
- 沒有使用圖片

## Files
- `prototype/NoteCraft-Workbench-Update-Calendar.html`：可離線開啟的完整 prototype
- `source/pt-cal.jsx`、`source/pt-cal.css`：更新月曆（本次重點）
- `source/pt-dash.jsx`：頁籤路由
- `source/pt-dash2.jsx`、`source/pt-dash2.css`：`DV_RS` 配色與共用 `dv-` 樣式
- `source/pt-data.jsx`：資料欄位
