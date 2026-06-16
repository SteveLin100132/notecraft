# Handoff：NoteCraft「系列（Series）」功能

## Overview
為 NoteCraft（AI 互動筆記系統）新增**系列**功能，讓讀者能從眾多筆記中沿著有順序的閱讀路徑找到想讀的內容，並追蹤每篇筆記的閱讀進度。包含三個面向：

1. **系列總覽頁** — 瀏覽所有系列、模糊查詢、依進度篩選/排序。
2. **閱讀進度** — 每篇筆記可設定 `待開始 / 閱讀中 / 已完成`（個人狀態，存本機）。
3. **系列彙總** — 系列卡與詳情頁顯示筆記數、各章閱讀狀態、整體進度條與百分比，並提供「繼續閱讀」直達下一篇未完成章節。

---

## About the Design Files
本資料夾內的檔案是**以 HTML 製作的設計參考稿（prototype）**，用來展示預期的外觀與行為，**不是要直接搬進產品的程式碼**。

- `prototype_NoteCraft_Series.html` — 可離線開啟、可互動的完整原型（已內嵌所有依賴）。直接用瀏覽器打開即可點擊操作：切換側邊欄「系列」、搜尋/篩選、進入詳情頁、開筆記改閱讀狀態、看進度彙總即時更新。
- `source_reference/` — 原型的真實原始碼（React + `React.createElement`，無 JSX 編譯設定）。這是**功能邏輯的權威來源**，請以此為準，而非憑螢幕截圖猜測。
  - `series.jsx` — 系列總覽頁 + 系列詳情頁 + 進度條/封面/章節列等元件。
  - `data.jsx` — 資料模型：`SERIES` 結構、閱讀進度 store（localStorage）、`seriesProgress()` 等彙總函式。
  - `noteview.jsx` — 筆記頁的「閱讀進度」切換控制、文末完成提示、升級版系列導覽（`SeriesNav`）。

**任務**：在目標 codebase 既有的環境（React / Vue / 既有設計系統…）中**重新實作這些設計**，沿用該專案既有的元件、樣式與資料層慣例。若專案尚無前端環境，再自行選擇最合適的框架實作。請勿直接出貨這些 HTML。

## Fidelity
**High-fidelity（hifi）**。原型已套用最終的品牌色、字體、間距與互動（TrendLink 設計系統）。請以既有設計系統的元件像素級還原 UI；下方〈Design Tokens〉列出所有用到的數值。

---

## 資料模型（Data Model）

> 權威來源：`source_reference/data.jsx`

### 1. Series 結構
一篇筆記**只屬於單一系列**（單系列歸屬）。系列為**有序**章節清單。

```js
{
  id: "frontend-internals",          // 唯一 id（路由用）
  title: "前端底層運作",
  eyebrow: "FRONTEND SERIES",         // 英文 overline（大寫、寬字距）
  description: "Event Loop、Fiber 渲染…",
  accent: "blue",                     // 封面色系："blue" | "orange" | "navy"
  icon: "code",                       // 線性 icon 名稱（見既有 icon set）
  slugs: ["js-event-loop", "react-rendering-fiber", "css-grid-guide", "typescript-generics"],
}
```
- `slugs` 的順序 = 章節順序（第 1 章、第 2 章…）。
- 既有後端 / 內容層需提供：以 `series.slugs` 對應到筆記物件（`noteBySlug(slug)`）。

### 2. 閱讀進度（個人狀態）
三種狀態，**屬於每篇筆記**（非系列）：`not-started`（待開始）｜ `reading`（閱讀中）｜ `done`（已完成）。

- **儲存**：本機持久化。原型用 `localStorage`，key = `nc-reading-progress-v1`，值為 `{ [slug]: "reading" | "done" }`（`not-started` 不寫入、以「無紀錄」表示）。產品中可改存使用者帳號 / 後端，但語意相同：這是**個人狀態**，與筆記內容的 `status`（`published / empty / coming-soon`）分開。
- **未發佈筆記不可追蹤**：當筆記 `status !== "published"`（即 `empty` 草稿或 `coming-soon`）時，`readingStatus()` 回傳 `"unpublished"`，且**不可被標記、不計入系列進度分母**（此為明確決策 H）。

核心 API（見 `data.jsx`）：
```js
readingStatus(slug)            // → "not-started" | "reading" | "done" | "unpublished"
setReadingStatus(slug, status) // 寫入 + 持久化 + 通知 UI 重繪；未發佈筆記則 no-op
markReading(slug)              // 輕量自動轉換：not-started → reading（永不降級）
readingMeta(status)            // → { key, label, tone, icon }；UI 徽章/圖示對照
```
`readingMeta` 對照表：

| status | label | tone（語意色） | icon |
|---|---|---|---|
| `not-started` | 待開始 | neutral | circle（空心圓） |
| `reading` | 閱讀中 | blue | bookOpen |
| `done` | 已完成 | success（綠） | circleCheck |
| `unpublished` | 未發佈 | neutral | clock |

### 3. 系列進度彙總 `seriesProgress(series)`
回傳卡片 / 詳情頁 / 導覽所需的所有衍生值。**分母 `tracked` 只算已發佈章節**。

```js
{
  chapters,    // 章節筆記物件陣列（含未發佈）
  statuses,    // [{ note, status }]，依章節順序
  total,       // 章節總數（含未發佈，僅用於「X 篇」顯示）
  tracked,     // 可追蹤（已發佈）章節數 = 進度分母
  done,        // 已完成數
  reading,     // 閱讀中數
  notStarted,  // tracked - done - reading
  pct,         // round(done / tracked * 100)；tracked 為 0 時為 0
  completed,   // tracked>0 && done===tracked
  started,     // done + reading > 0
  next,        // 下一篇要讀的章節筆記：優先 reading，其次第一個 not-started；全完成則回首章供重讀
}
resetSeriesProgress(series)    // 清掉整個系列所有章節的進度（詳情頁「重設進度」用）
```

---

## Screens / Views

### A. 系列總覽頁（`SeriesView`）
**路由**：側邊欄第 3 項「系列 / Series」。**Purpose**：瀏覽所有系列、找到想讀的路徑。

**Layout**（置中內容區，max-width 1120px、左右 padding 40px，與其他頁一致）：
1. **頁首** `PageHead`：eyebrow `SERIES`（橘、寬字距）／標題「系列」／副標「把相關筆記串成有順序的閱讀路徑 · 共 N 個系列、M 篇筆記」。
2. **搜尋列 + 排序**（flex row, gap 12, margin-bottom 16）：
   - 搜尋框：高 46、白底、`1.5px solid neutral-200`、`border-radius: 999`（pill）、左側 search icon、右側清除 x（有輸入時）。placeholder：「搜尋系列，或系列內的筆記、標籤…」。**模糊查詢比對**：系列 `title` + `eyebrow` + `description` + 各章節 `title` + 各章節 `tags`（小寫 includes）。
   - 排序下拉 `SortMenu`：pill 按鈕「排序：{進度|章節數|名稱}」+ filter icon + chevronDown；點開為白色浮層選單（陰影、圓角），勾選項以 blue-50 底 + check。預設 `進度`。排序邏輯：進度 = `pct` 由高到低；章節數 = `total` 由多到少；名稱 = `localeCompare(zh-Hant)`。
3. **篩選 pills**（margin-bottom 24）：`全部 / 進行中 / 已完成 / 未開始`。選中 = blue-50 底、blue-500 邊、blue 字；未選 = 白底、neutral-200 邊。判定：完成 `completed`／進行中 `started && !completed`／未開始 `!started`。
4. **系列卡網格**：`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px`。空結果顯示置中 search icon + 「找不到符合的系列」。

**系列卡（`SeriesCard`）**（DS `Card`，`padding:0; overflow:hidden`，整卡可點 → 進詳情頁）：
- **封面 `Cover`**（高 132）：`accent` 對應的斜向漸層底（見 tokens）、右上兩個半透明白色圓形光暈裝飾、左上 46×46 圓角白色半透明 icon 徽章、右上「N 篇」chip（notes icon）、左下 eyebrow（10px、寬字距、白 78%）+ 系列標題（19px/900、白）。
- **內文**（padding 20, gap 14）：
  - 描述（13.5px、muted、2 行截斷 `-webkit-line-clamp:2`）。
  - **各章狀態圓點列**（`StatusDot`，每章一顆 9px 圓點）：已完成 = 實心 success 綠；閱讀中 = 白底 + 2.5px blue-500 圈；待開始 = 透明 + 1.5px neutral-300 圈；未發佈 = 透明 + 1.5px **虛線** neutral-300。
  - **進度列**：左為狀態統計 `ProgStat`（「N 已完成 · N 閱讀中 · N 待開始」，每段前綴對應小圓點，`white-space: nowrap`），右為百分比（mono、900、完成時綠 / 否則 accent.deep）。下方 **分段進度條 `ProgressBar`**（高 8、軌道 neutral-100、圓角 999）：先一段 success 綠寬 `done/tracked`，緊接一段 accent.solid 透明度 0.45 寬 `reading/tracked`；過渡 `width 500ms cubic-bezier(0.16,1,0.3,1)`。
  - **CTA 按鈕**（DS `Button`，size sm、pill）：未開始 `開始閱讀`／進行中 `繼續閱讀`／全完成 `重新閱讀`（secondary 變體 + rotateCcw icon，其餘 primary + play icon），文字接「：{next.title}」（超過 12 字截斷加 …）。**點擊 `stopPropagation`** 後直接開 `next` 章節筆記，不進詳情頁。

### B. 系列詳情頁（`SeriesDetail`）
**路由**：由總覽卡或筆記頁系列導覽進入（原型用 `series-detail` + `openSeriesId`）。

**Layout**：
1. 返回鍵「← 返回系列」（chevronLeft、muted、13.5px）。
2. **Hero 卡**（DS `Card`，`padding:0; overflow:hidden`，margin-bottom 22）：
   - 上半：`accent` 漸層底（padding 30/30/28）+ 光暈裝飾 + 56×56 icon 徽章 + eyebrow + 標題（`--text-3xl`/900/白）+ 描述（14.5px、白 88%、max-width 620）。
   - 下半「進度帶」（padding 20/30，flex、wrap、gap 26）：左大百分比（36px/900、mono、完成綠）+「已完成」小字；中間 `ProgressBar`（高 10）+ `ProgStat`；右側按鈕群：主 CTA（繼續/開始/重新閱讀 → 開 `next`）+（已開始時）`重設進度`（ghost + rotateCcw，`window.confirm` 二次確認後 `resetSeriesProgress` + toast）。
3. **章節區標題**：layers icon + 「章節」+「共 N 章」（`white-space: nowrap`）。
4. **章節列表**（DS `Card`，`padding:0`）：逐列 `ChapterRow`。

**章節列（`ChapterRow`）**（整列可點 → 開該章筆記，hover 變 neutral-50 底，列間 1px neutral-100 分隔）：
- 左 34×34 圓角序號徽章：已完成顯示 check（success-50 底/綠字），否則顯示兩位數章節序號（`01`、`02`…，mono/800，accent.soft 底/accent.deep 字）。
- 中：標題（15.5px/700）+ 描述（12.5px/muted，單行截斷）。
- 右：AI 視覺化計數（若有 marker，sparkle + `已生成數/總數`）→ 閱讀狀態 `Badge`（`readingMeta` 的 tone/icon/label）→ chevronRight。

### C. 既有頁面的串接
- **筆記頁（`noteview.jsx`）**
  - **頂部 meta 列**新增「閱讀進度」分段控制 `ReadingControl`：pill 容器（neutral-100 底）內三段 `待開始 / 閱讀中 / 已完成`，選中段為白底 pill + 對應語意色字 + xs 陰影。點擊即 `setReadingStatus`。**手動為主**。
  - **開啟筆記時**（已發佈者）呼叫一次 `markReading(slug)`：`not-started → reading` 的輕量自動轉換（永不降級；不影響已是 reading/done 者）。
  - **文末 `DonePrompt`**：未完成 → 橘色提示條「讀完這篇了嗎？」+「標記為已完成」按鈕（設 done + toast）；已完成 → 綠色「已標記為完成」+「標記為未完成」還原連結。
  - **升級版系列導覽 `SeriesNav`**（取代原本只有上一章/下一章的版本）：系列 eyebrow/標題（可點 → 詳情頁）+「查看系列」連結 + 「第 i 章 · 共 N 章」+ 整體進度條（done 綠 / reading 半透藍）+ 百分比 + **逐章縮覽列**（圖示+序號+標題，目前章節以 blue-50 底 + blue-200 邊高亮並標「閱讀中的章節」）+ 上一章/下一章卡片。
- **筆記列表卡（`views.jsx` 的 `NoteCard`）**：meta 區新增閱讀狀態 `Badge`（僅當可追蹤且非 `not-started` 時顯示，避免雜訊）。
- **Dashboard（`dashboard.jsx`）**：右欄頂部新增「繼續閱讀」卡 — 列出進行中（`started && !completed`）系列（最多 2 個，按 pct 排序；若無則顯示尚未開始的系列、標題改「開始一個系列」）。每項：系列名 + pct + 迷你分段進度條 + 「繼續/開始：{next.title}」連結（→ 開 `next`）。「全部」連結 → 系列總覽頁。

---

## Interactions & Behavior
- **導覽**：總覽卡整卡點擊 → 詳情頁；卡上 CTA / Dashboard 連結 / 詳情頁 CTA → 直接開 `next` 章節筆記（跳過詳情頁）。
- **狀態變更即時彙總**：任一處改 `setReadingStatus` 後，所有顯示進度的畫面（系列卡、詳情頁、Dashboard、SeriesNav、筆記卡徽章）即時更新。原型靠一個訂閱機制（`ncSubscribe/ncEmit`）通知 React 重繪；產品中以你的狀態管理（store / query 失效）達成相同效果。
- **自動轉換（手動為主）**：僅「開啟已發佈筆記 → 若 not-started 則升為 reading」這一條，且永不降級。其餘一律手動。
- **重設進度**：詳情頁，`window.confirm` 二次確認 → 清空該系列所有章節進度 → toast。
- **動畫**：進度條 `width 500ms cubic-bezier(0.16,1,0.3,1)`（詳情頁）/ `400ms`（SeriesNav）；卡片 hover 抬升 + 陰影（沿用 DS `Card hoverable`）；按鈕 hover 變深、按下 `scale(0.97)`（DS `Button`）。皆克制、無彈跳、無循環裝飾動畫。
- **空狀態**：搜尋/篩選無結果 → 置中 search icon + 文案。

## State Management
需要的狀態：
- **路由**：目前頁（`series` 總覽 / `series-detail` 詳情）、`openSeriesId`、`openSlug`（開哪篇筆記）。
- **總覽頁本地 UI 狀態**：搜尋字串 `q`、篩選 `filter`、排序 `sort`、排序選單開合。
- **全域閱讀進度**：`{ [slug]: status }`，持久化於 localStorage（或使用者後端）。變更需觸發相關畫面重繪。
- **資料來源**：`SERIES` 清單、`noteBySlug`、各筆記 `status`（判定可否追蹤）。無遠端 fetch 需求（原型為靜態資料；產品中依實際內容層接）。

## Design Tokens
全部對應 TrendLink 設計系統 CSS 變數（`_ds/.../tokens/colors.css`）。

**品牌色**
- blue：`--blue-50 #eef4fb`、`-100 #d6e4f5`、`-200 #adc8e8`、`-500 #2c6ebb`、`-600 #1f5aa6`、`-700 #1b4f9c`、`-900 #112f5d`
- orange：`--orange-50 #fdf4e6`、`-100 #fbe7c6`、`-300 #f2b955`、`-400 #ed9b26`、`-500 #e37b24`、`-600 #c7641a`
- neutral：`-50 #f6f8fb`、`-100 #eef1f6`、`-200 #e1e6ee`、`-300 #cbd3df`、`-400 #9aa6b8`、`-500 #6c798e`、`-700 #3a4456`、`-900 #161c28`
- semantic：`--success-500 #2e9e6b`、`--success-50 #e7f6ee`

**封面 accent 漸層（125°）**
- blue：`linear-gradient(125deg, var(--blue-700) 0%, var(--blue-500) 100%)`
- orange：`linear-gradient(125deg, var(--orange-500) 0%, var(--orange-300) 100%)`
- navy：`linear-gradient(125deg, var(--blue-900) 0%, var(--blue-600) 100%)`
- 進度條：done 段 = `success-500`；reading 段 = accent.solid（blue→blue-500 / orange→orange-400 / navy→blue-700）透明度 0.45。

**字級 / 字重**：標題 900；section 標題 16–17px/700；卡標題 15.5–19px/700–900；body 13.5–14.5px；eyebrow 10–11px、`letter-spacing ~.18em`、大寫。百分比與序號用 mono 字體（`--font-mono`）。

**圓角**：卡片/封面圓角繼承容器；徽章 `--radius-md`、`--radius-lg`；pill 控制項與按鈕 `border-radius: 999`。（注意：本專案在 `NoteCraft.html` 把 `--radius-*` 調小，pill 仍走 999。）

**陰影**：`--shadow-xs`（選中 pill）、`--shadow-sm`（卡 hover）、`--shadow-md`（下拉浮層）。皆為冷色調、淺。

**間距**：4px 基準；卡內 padding 20–30；網格 gap 18–20；section margin-bottom 16–24。

## Assets / Icons
無圖片資產 —— 封面採「**漸層色塊 + 線性 icon**」（明確決策）。所用 icon 皆為 ~2px stroke 的 Lucide 風格內嵌 SVG（見既有 icon set）。本功能新增：`circle`、`circleCheck`、`bookOpen`、`rotateCcw`、`play`、`filter`、`chevronDown`（定義見原型 `icons.jsx`，本 README〈readingMeta〉與各 View 已標明用途）。產品中請改用該 codebase 既有的 icon 套件對應同義圖示。

## Files（本資料夾）
- `prototype_NoteCraft_Series.html` — 可離線互動的完整原型。
- `source_reference/series.jsx` — 系列總覽頁 + 詳情頁 + 元件（封面、進度條、狀態圓點、章節列、排序選單）。
- `source_reference/data.jsx` — `SERIES` 資料、閱讀進度 store、`seriesProgress` / `readingStatus` / `readingMeta` 等。
- `source_reference/noteview.jsx` — `ReadingControl`、`DonePrompt`、升級版 `SeriesNav`。
- `README.md` — 本文件（自足，未參與本次對話的開發者可僅憑此實作）。
