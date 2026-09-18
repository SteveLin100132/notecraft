# Claude Code Prompt — 實作 Plugin System 的前端畫面

把這份 prompt 連同 `design_handoff_plugin_system/README.md`、`uploads/context-ui.md` 一起交給 Claude Code。
設計原型：`NoteCraft.html`（`app/plugins.jsx` 是唯一的新檔，可直接對照）。

---

請在既有 NoteCraft（Astro + MDX）裡實作 Plugin System 的畫面層。渲染器與 build pipeline 已完成，這裡只做外框與導覽。

## 約束（不可違反）

- 只用既有 design token（`uploads/context-ui.md` §5），不新增任何色碼、字級、間距、圓角、陰影值
- icon 一律 `lucide-react`，禁用 emoji
- 介面文案繁體中文；plugin id、檔案路徑、副檔名保持原文
- 桌機單一寬度，不做 RWD 斷點
- 動畫 200–400ms、`--ease-out`，尊重 `prefers-reduced-motion`
- 不改側邊欄既有五項、不改 `/notes/<slug>` 筆記頁版型、不改 ER 渲染器本身

## 1. `/view/<path>` 資料檔檢視頁

沿用 `BaseLayout`（側邊欄不變），但**這條路由的內容區不套 `.nc-page-wrap` 也不套 `34px 40px 80px` padding** —— 資料檔頁就是滿版畫面。

1. **sticky 頁首列** — `position:sticky; top:0; z-index:5`、`--surface-card` 底、`border-bottom:1px --neutral-200`、`padding:13px clamp(16px,2.5vw,34px) 14px`，兩列：
   - 第一列（flex, gap 16）：返回鈕（lucide `ChevronLeft` ＋「資料檔」）→ 1px 垂直分隔 → 34×34 icon 方塊（`--orange-50` 底、`--orange-600` 色、`radius 5px`、lucide `Database` 18）→ 標題（`--text-md`/700）＋ `DATA FILE`（11.5px/700/`.05em`/`--orange-600`），標題下方單行截斷描述（13px/`--text-muted`）→ 右端 `meta.backTo` 的「回到來源筆記」與 dev-only 主按鈕「以 VS Code 編輯」。
   - 第二列（`padding-left:66px`、gap 18）：mono 原始檔路徑 ＋ lucide `FileJson`、plugin 膠囊（`--blue-50`/`--blue-700`、mono、lucide `Plug`）、lucide `Clock` ＋ 相對時間 · 絕對日期；dev 模式下右端 mono 顯示路由。
   標題與描述取自 JSON `meta`，缺值時退回檔名。
2. **渲染區** — `min-height: calc(100vh - 118px)`、`--surface-page` 底、`padding:18px clamp(12px,3vw,40px) 48px`，渲染器輸出直接放進去：**不要**外框卡片、不要 `GeneratedFrame`、不要 max-width。ER 渲染器自帶工具列、橫向捲動與「展開全寬」，外層不要再包一層放大檢視。
3. dev-only 元素（頁首那顆「以 VS Code 編輯」、路由標示）在正式環境完全不輸出，與既有 dev-only 元素同一條判斷。

## 2. 側邊欄第六項

在既有五項之後加 `資料 / Data`，lucide `Database`，href `/view`（清單頁）。項目結構與既有完全相同（icon ＋ 中文 `flex:1` ＋ 英文 11px/600/`.05em`/opacity .55）。
收合狀態：寬度 72px、隱藏 `.nc-sb-label`、按鈕改 `justify-content:center`、`title` 屬性帶「中文 英文」；頂部收合／展開鈕用 lucide `PanelLeft`。寬度轉場 `--duration-normal --ease-out`，同步更新 `--nc-sb`。

## 3. 資料檔清單頁

`PageHead`（eyebrow `DATA`、標題「所有資料檔」、副標「N 個資料檔 · 由 M 個 plugin 渲染 · 依檔案 mtime 倒序」）。
plugin 篩選：`plugins.length > 1` 才渲染整條 filter row（膠囊按鈕，選中 `--blue-50` 底 ＋ `--blue-500` 邊，帶筆數）。只裝一個 plugin 時不要渲染任何佔位。
每列是既有 list 卡片樣式（`padding:16px 20px`）：icon 方塊 → 標題 16.5/700 ＋ 單行截斷描述 → 右側 mono 路徑、plugin 膠囊、`Clock` ＋ 相對時間、`ChevronRight`。

## 4. `/notes` 混排卡片

與筆記卡片同節奏，三處不同：icon 方塊改橘系 `Database`；右上徽章列只有「資料檔」膠囊（`--orange-50` / `--orange-600`）＋ 時間；底部標籤列位置改成 `--surface-sunken` 底、`--radius-md` 的 mono 路徑列（左路徑、右 plugin id）。格狀與清單兩種檢視都要。
排序用 mtime，與筆記的 `updatedAt` 同軸；套用標籤篩選時資料檔不出現。

## 5. MDX 內嵌

沿用 `GeneratedFrame`（結構、間距、放大檢視都不動），只換標示：膠囊改 `--orange-50` / `--orange-600` ＋ lucide `Database` ＋「資料檔 · <plugin 顯示名>」；右側 mono 顯示真實資料檔路徑而非 `generated/<id>.tsx`；dev-only 按鈕由「複製提示詞」改「以 VS Code 編輯」，並加一顆「開啟完整檢視頁」連到 `/view/<path>`。放大檢視的標題列需支援自訂 mono 標籤與 icon。

## 6. 渲染錯誤狀態

渲染器在瀏覽器裡 throw 時，以 error boundary 只替換該區塊，頁面其他部分照常。
卡片：`1px --danger-300` 邊 / `--radius-lg` / 白底；38×38 `--danger-50` 底 `--danger-500` 色的 lucide `AlertTriangle`；標題「這份資料沒有畫出來」；正文明確說明筆記與資料檔都沒有壞、壞的是渲染程式；下方 `--surface-sunken` 區以 label/value 列出出錯的 plugin id、資料檔路徑、錯誤訊息（mono、訊息用 `--danger-500`）；dev 模式下加「以 VS Code 開啟渲染器」「重新載入此區塊」兩顆按鈕。
build 期錯誤（plugin 未安裝、JSON 壞、schema 不符）不做網頁畫面。

## 7. 系列（Series）整合：一章可以是資料檔頁

**資料模型**：章節識別碼從「筆記 slug」放寬為 slug 或 `view:<id>`，同一個 `slugs` 陣列混放兩種。加一個解析器把兩者解成同一種 entry：

```ts
type SeriesEntry =
  | { kind: 'note'; ref: string; id: string; title: string; description: string; note: Note }
  | { kind: 'data'; ref: string; id: string; title: string; description: string; file: DataFile }
```

`seriesOf(ref)`、`seriesProgress(series)` 全部改吃 entry：`chapters`、`statuses[].entry`、`next` 都是 entry，`prev/next` 也是。點擊時依 `kind` 決定 `/notes/<slug>` 或 `/view/<path>`。

**進度**：完全沿用現有三態機制（開頁 → 閱讀中；手動按 → 已完成；狀態存瀏覽器，key 用 entry 的 `ref`）。資料檔一律可追蹤並計入分母；筆記的「未發佈不計入分母」規則不變。因此系列卡進度條、詳情頁整體進度、章節狀態點三處的畫法與數字呈現**都不需要改**。

**章節列（系列詳情頁）** — 資料檔那一列與筆記同構：同樣的 34×34 序號方塊（用系列 accent 色、完成時轉 success）、同樣的狀態徽章、同樣的點擊面積與字級。型別差異只加兩個元素：
- 標題後一枚膠囊徽章：`--orange-50` 底 / `--orange-600` 色 / 11.5px / 700 / lucide `Database` 12 ＋「資料檔」
- 筆記那一格原本放 `@ai-visualize` 計數的位置，改放 mono 原始檔路徑（11.5px / `--text-muted` ＋ lucide `FileJson` 13）
不要縮小字級、不要降低對比、不要把它排到列尾 —— 它是正式的一章。

**筆記頁底部的系列導覽** — 章節縮覽混入資料檔項目（同一組狀態圖示、同一個 22px 序號欄）；資料檔項目在列尾加同一枚「資料檔」徽章（11px）。上一章／下一章卡片：方向標那行（「上一章」／「下一章」）後補「· 資料檔」＋ lucide `Database`（`--orange-600`/700），標題的字級與顏色處理不變，卡片下緣多一行 mono 路徑。

**資料檔頁自己的系列導覽** — `/view/<path>` 屬於某系列時：
- 頁首右側多一條連結「<系列名> 第 N 章」（lucide `Layers`）
- 頁尾接「標記為已完成」提示卡與同一組系列導覽，**包在 `max-width:1120px; margin:0 auto; padding:0 40px 72px` 的一般版心裡** —— 導覽不得跟著渲染區出血成橫跨整個螢幕的一條
- 此時渲染區不要再套 `min-height: calc(100vh - 頁首高)`，否則圖與導覽之間會出現一整屏空白

**文案**：系列相關字樣一律「章」而非「篇」（總覽頁副標、封面章節數 chip、詳情頁「共 N 章」）。封面本身（漸層＋icon 徽章＋chip）不動。
