# Task 111 — 骨架、互動視覺化佔位、「—」換值

> 規格 [notecraft-workbench-loading-transitions.md](../notecraft-workbench-loading-transitions.md) §8.1、§8.3、§8.4、§9、§10；Q3 定案（§21）。
> 設計交付 README「B. 筆記內容頁骨架」「C. 互動視覺化佔位」「D. 『—』佔位 → 真值」「門檻」；參考 `reference/NoteSkeleton.astro`、`reference/VizIsland.tsx`、`prototype/wb/pt-load.jsx`（`NcNoteSk`、`NcListSk`、`NcIsland`）。
> 依賴 [Task 109](task-109-loading-measure-vt-foundation.md)（token、`.nc-main-pane`）。與 [Task 110](task-110-loading-tabs-prepaint-scroll.md) 沒有程式上的依賴，但**照順序做**：Task 110 的捲動還原會受 §2 的預留高度影響，先做 110 才量得出 `VizIsland` 的效果。

## 為什麼要有這一步

Task 109、110 處理了「換頁時」的空白；剩下的是慢速網路下主區內容晚到（骨架）、`/notes` 首屏整個主區被藏起來（§2 #5）、以及互動視覺化 hydrate 時撐開、把下方內容往下推。這三件事都會讓使用者看到「不是最終樣子」的畫面，差別只在要不要讓它看起來像正在載入。

## 範圍

### 1. 骨架樣式與 critical CSS（規格 §4.2、§8.1、§12.2）

- `workbench.css`「Loading 與轉場」區塊加：`.nc-sk`（含 `.r`、`.sq`）、`.nc-sk-root`（150ms 延遲 + `@starting-style`）、`@keyframes wbSkSweep`、`.nc-sk-note`／`-art`／`-lines`／`-meta`／`-code*`／`-fig*`／`-toc*`、`.nc-sk-row`、`.nc-sk-tb`、`.nc-body-wrap`、`.nc-body-sk-flow`、`:has()` 隱藏規則、`.nc-content` 淡入；reduced motion 規則
- layout head 的 `<style is:inline>` 放 critical 子集：sk token、`.nc-sk`、`.nc-sk-root`、`.nc-body-sk-flow`、`:has()` 規則（約 1.5 KB）
- `scripts/checks/wb-critical-css.mjs`（新增）：從 `WorkbenchLayout.astro` 抽出 inline `<style>` 內容，逐條規則確認在 `workbench.css` 中有相同字串；`check:wb` 串上

### 2. 筆記 Body 骨架（規格 §8.3）

- `src/components/wb/NoteSkeleton.astro`（新增）：由 `reference/NoteSkeleton.astro` 改寫
  - 外層 `.nc-body-sk-flow`（**不再帶 `wb-body`**，`#nc-scroll` 是外面那層），`aria-busy="true" aria-label="筆記載入中" data-pagefind-ignore`
  - 版面以實際筆記頁為準：`.wb-host` 的 padding 沿用現行規則（直接加 `wb-host` class）；兩欄用 `.nc-note-grid.has-toc` 同一個 container query（`wbhost` ≥ 900px），不是 viewport 860px —— 骨架加 `nc-note-grid has-toc` class 或另寫同條件的 `@container` 規則
  - prop `toc?: boolean`（資料檔頁傳 `false`）
- `notes/[...slug].astro`：`#nc-scroll` 內改為 `<div class="nc-body-wrap"><NoteSkeleton/><div class="nc-content">…原本的 .wb-host…</div></div>`。`#nc-scroll` 是 layout 輸出的，所以 `.nc-body-wrap` 放在 slot 內容的最外層即可
- `view/[...path].astro`：同上，`toc={false}`
- 用 DevTools「Slow 4G」＋停用快取驗：HTML 分段到達時骨架出現，內容開頭一到骨架消失、內容淡入。若 Phase 0 量測顯示 HTML 幾乎一次到齊、骨架完全看不到，仍保留（慢速網路保險），在實作記錄註明

### 3. `/notes` 首屏（規格 §8.4）

- `src/components/wb/ListSkeleton.astro`（新增）：照 handoff 列表骨架（列高 `var(--pt-row-h,38px)`…；≤860px 隱藏路徑與標籤）。**Toolbar 不畫骨架**
- `notes/index.astro`：island 前放 `<ListSkeleton/>`，預設 `hidden`
- `workbench.css` 既有的 `html[data-wb-filtering]` 規則改為：Header 標題列、麵包屑、`.wb-tabs` 照舊 `visibility:hidden`；`.wb-body` 的內容藏起來、顯示 `ListSkeleton`（定位在 Body 的位置，與 Body 同尺寸）。`.wb-tb` 是否要藏：現在藏，是因為篩選 chip 會變；改成顯示 Toolbar 骨架 `.nc-sk-tb`
- 4 秒保險、island 掛載後移除屬性的邏輯不變
- Dashboard 不加骨架（規格 §8.4）

### 4. 生成元件高度盤點（Q3，規格 §9.1）

- `scripts/fixtures/viz-height-audit.mjs`（新增，**不放 `scripts/checks/`**）：對 `astro preview` 的每篇筆記
  1. 停用 JS 載入，記錄每個 `[data-nc-viz-body]` 的 `offsetHeight`（SSR 高度）
  2. 啟用 JS 載入，逐一捲進視窗等 hydrate（`astro-island` 失去 `ssr` 屬性）後再量
  3. 輸出 `id`、筆記、SSR 高度、hydrate 後高度、差距；寬度 1400 與 375 各跑一次
- 用 Playwright：專案若沒有，**先徵詢作者**是否用 `npx playwright` 臨時跑（不加進 dependencies）；作者不同意就改用 Browser pane 手動量前 10 支有 `mounted`／`typeof window`／`ResizeObserver` 的元件（規格 §9.1 的清單）
- 結果（差距 > 8px 的清單）寫進規格 §22

### 5. `VizIsland`（規格 §9.2）

- `src/components/islands/VizIsland.tsx`（新增）：由 `reference/VizIsland.tsx` 改寫
  - props：`id?: string`、`h?: number`、`children?: ReactNode`（**不可有 required props**，CLAUDE.md）；`h` 缺省時不預留高度、不顯示佔位（等於直接渲染 children）
  - 常數 `DELAY = 150`、`MIN = 300`（與 `--wb-sk-delay` 同值，註解說明）
  - 佔位：放在 `[data-nc-viz-body]` **裡面**（`GeneratedFrame` 外框已存在），所以只畫內部的 shimmer 區塊與 800ms 的「互動圖表載入中」pill，**不畫第二層外框與 caption 列**；預留 `min-height: h`
  - 就緒後 200ms 淡入（只在佔位曾顯示時）；`useReducedMotion` 不需要，CSS 的 reduced-motion 規則處理
- MDX 寫法：`<VizIsland id="x" h={420} client:visible={{ rootMargin: "200px" }}><X /></VizIsland>`。注意：Astro island 的 children 是以 slot 傳入的靜態 HTML，**子元件不會被 hydrate**。改用「`VizIsland` 包在生成元件內部」或「生成元件自己接 `h` 並渲染佔位」—— 實作時先寫一個最小範例確認 Astro 的行為，兩者擇一並更新規格 §9.2
- 套用到 §4 盤點出的元件（逐一改 MDX，只動 import 與 JSX，不動 `@ai-visualize` 標記與 `status`）

### 6. Skill 與 Subagent（Q3）

- `.claude/skills/content-visualize/SKILL.md`：加一節「SSR 與 hydrate 高度」：元件應盡量 SSR 出最終高度；無法做到時（量測容器、`mounted` 後才畫）由 component-generator 在驗證階段量 hydrate 後高度，交給 mdx-writer 以 `VizIsland`（或 §5 選定的形式）寫入 `h`
- `.claude/agents/component-generator.md`：驗證步驟加「SSR 與 hydrate 後高度比對」，差距 > 8px 時在回報中附 `h`
- `.claude/agents/mdx-writer.md`：收到 `h` 時用 `VizIsland` 形式寫入
- 不重跑既有元件的生成

### 7. 「—」換值（規格 §10）

- 盤點主區 SSR 輸出「—」或空值的位置：Dashboard KPI「本週更新」、閱讀狀態圖例、`.wb-row-d` 相對日期、筆記頁 `ReadingControl`。grep `"—"` 於 `src/components/wb`、`src/components/islands`
- 每處確認槽位與真值同寬（`tabular-nums` + 固定寬）；不足的補 CSS
- 由 null 變成值時加 class `nc-swap-in`（`animation: wbVtFade var(--wb-dur-swap) var(--wb-ease)`），只加在第一次變值時；reduced motion 下 `animation:none`
- 不做數字滾動

## 要改的既有檔案

`src/layouts/WorkbenchLayout.astro`、`src/pages/notes/[...slug].astro`、`src/pages/view/[...path].astro`、`src/pages/notes/index.astro`、`src/styles/workbench.css`、`package.json`（`check:wb`）、§4 盤點到的 MDX 筆記、§7 盤點到的元件、`.claude/skills/content-visualize/SKILL.md`、`.claude/agents/component-generator.md`、`.claude/agents/mdx-writer.md`。新增 `src/components/wb/NoteSkeleton.astro`、`src/components/wb/ListSkeleton.astro`、`src/components/islands/VizIsland.tsx`、`scripts/checks/wb-critical-css.mjs`、`scripts/fixtures/viz-height-audit.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 骨架不閃 | `astro preview`，無節流 | 切換筆記 20 次 | 一次都沒看到骨架 |
| 骨架出現 | Slow 4G、停用快取 | 開長筆記 | 約 150ms 後骨架淡入；內容到了骨架消失、內容 200ms 淡入；無版面跳動 |
| 骨架版面 | 1400／1000／375 | 骨架與內容各截一張 | 兩欄／單欄的切換點相同（container query）；TOC 位置對齊 |
| Pagefind | — | `astro build` 後搜「載入中」 | 無結果 |
| `/notes` 首屏 | 帶 `?view=board` | 重新整理 | 主區不是空白，而是 Toolbar 骨架與列表骨架，island 掛載後換成看板 |
| `/notes` 預設 | 無 query、預設偏好 | 重新整理 | 不出現骨架 |
| 高度盤點 | — | 跑 §4 | 規格 §22 有清單 |
| VizIsland | 盤點清單中的任一元件 | 從上方捲到它 | 捲動過程中下方內容不被推動；佔位 → 元件 200ms 淡入 |
| 放大檢視 | 同上 | 點放大 | `VizZoom` 正常搬移 `data-nc-viz-body` |
| 「—」 | Dashboard | 重新整理 | KPI 數字由「—」淡入真值，寬度不變 |
| critical CSS | — | `npm run check:wb` | 含 `wb-critical-css` 的斷言全綠 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

[Task 109](task-109-loading-measure-vt-foundation.md)；建議在 [Task 110](task-110-loading-tabs-prepaint-scroll.md) 之後。

## 實作記錄（2026-10-02）

- **筆記骨架** `src/components/wb/NoteSkeleton.astro`：依實際筆記頁調整——標題在 Header，所以內文骨架從標籤列開始（拿掉 handoff 的返回連結與標題條），meta 列是「更新於」＋閱讀狀態 pill。外層用 `.nc-sk-host` 而非 `.wb-host`（`Toc.tsx` 以 `querySelector(".wb-host")` 量寬度，被骨架搶先會讓目錄誤判成窄版收合——截圖回歸抓到的）。`.nc-body-wrap` 為 `display:contents`
- **critical CSS** 只放 `@view-transition`；`scripts/checks/wb-critical-css.mjs` 斷言與 `workbench.css` 一致
- **不做內容淡入**：每次載入都會播、還會與主區轉場疊加
- **`/notes` 首屏**：`data-wb-filtering` 時 Body 的 `::before` 以漸層畫列表骨架（150ms 延遲淡入），Toolbar 照舊隱藏
- **高度盤點** `scripts/fixtures/viz-height-audit.mjs`（Playwright 以 `PLAYWRIGHT_MODULE` 指向臨時安裝，不進 dependencies；`REDUCE=1` 以減少動態量）：一般設定只有 `proposal-summary` 超標，改元件本身後為 0；減少動態時另有 3 支刻意全部展開，記為已知限制
- **不建 `VizIsland`**：沒有需要它的元件；改在 `content-visualize/SKILL.md` 與 `component-generator.md` 加「SSR 輸出最終高度」規則，`npm run sync-skill` 同步到 `skill-template/`
- **「—」淡入**：`KpiCard`、`FreqChart`、`Calendar` 第一次換成真值時加 `.nc-swap-in`
- 驗證：截斷 HTML 時骨架出現且版面與內容對齊（1400／375）；正常載入時骨架從未顯示；`main` 對照截圖除排序換位外一致；各頁 console 無錯誤；tsc 錯誤數 49；`check:wb` 全綠
