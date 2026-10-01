# Handoff：筆記頁籤（多筆記同時開啟）

## Overview
在 NoteCraft 工作台主區最上方加入一條「頁籤列」，類似 VS Code 編輯器的檔案頁籤。讀者可同時開啟多篇筆記（`/notes/{slug}`）與 plugin 資料檔渲染頁（`/view/...`），在頁籤之間切換，不必回列表或 Sidebar 重找。

網站是 **Astro 靜態 MPA**：切換頁籤 = 整頁導覽。頁籤本質上是 **持久化在 localStorage 的已開啟清單**，每次換頁由 client island 重畫；切回頁籤時還原上次捲動位置。

## About the Design Files
`prototype/` 內的檔案是 **以 HTML/React（瀏覽器內 Babel）製作的設計參考**，用來呈現外觀與行為，**不是要直接搬進 production 的程式碼**。請在既有的 Astro 專案中，以專案現有的元件、樣式與 island 寫法重新實作。

- `prototype/NoteCraft-Workbench-Tabs.html` — 可操作的工作台 Prototype（已含頁籤功能）
- `prototype/Note-Tabs-Spec.html` — 設計規格頁，內嵌 Prototype 的各狀態畫面 + 待決問題
- 頁籤相關原始碼只有三處：`wb/pt-tabs.jsx`、`wb/pt-tabs.css`、`wb/pt-app.jsx`（整合部分，見下方 Files）

以本機靜態伺服器開啟（例如 `npx serve prototype`），直接用 `file://` 開會因載入 jsx 失敗。
示範狀態：在網址加 `?tabsDemo=normal | overflow | menu | all | list | empty | sheet`（使用種子資料，不寫入 localStorage）。

## Fidelity
**High-fidelity。** 顏色、尺寸、字級、狀態與互動均為最終值，沿用工作台既有 `--wb-*` token 與資料列語彙（row / pill / chip / mini button）。請依數值精確重建。

---

## Screens / Views

### 1. 桌面版頁籤列（>1100px）
- **位置**：`.wb-main` 的第一個子元素，位於 Header（`.wb-hd`）之上。Rail 52 + Sidebar 240 + 主區的殼完全不變；頁籤列只吃主區寬度。
- **Layout**：`display:flex; align-items:stretch; height:34px; flex:0 0 34px; background:var(--wb-bg) #f6f8fb; border-bottom:1px solid var(--wb-line) #e1e6ee; z-index:4`
  - 左：`.nt-scrollwrap`（flex:1, min-width:0, position:relative）內含 `.nt-scroll`（`role="tablist"`，水平捲動、隱藏捲軸）
  - 右：全部頁籤鈕 `.nt-all`
- **麵包屑**：保留不變。頁籤只顯示標題，「這篇在哪個資料夾」仍由 Header 麵包屑提供。

#### 單一頁籤 `.nt-tab`
| 屬性 | 值 |
|---|---|
| 尺寸 | height 34px（`margin-bottom:-1px` 蓋住列底線）、`flex:0 1 auto`、min-width **120px**、max-width **200px**；固定頁籤 max-width 150px |
| 內距 / 間距 | padding `0 6px 0 10px`、gap 6px、`border-right:1px solid #e1e6ee` |
| 字 | 12.5px Noto Sans TC，單行省略（`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`） |
| icon | 13px 線條 doc icon（Lucide 風格，stroke 1.7）。筆記：一般 `#6c798e`、active `#2c6ebb`；**資料檔一律 `--wb-gold #ed9b26`** |
| 一般 | 透明底、文字 `--wb-ink-3 #6c798e` |
| hover | 底 `rgba(27,79,156,.04)`、文字 `--wb-ink-2 #2b3546`、✕ 出現 |
| active | 底 `--wb-panel #fff`、文字 `--wb-ink #161c28` weight 500、`box-shadow: inset 0 2px 0 var(--wb-blue) #1b4f9c`（頂端 2px 藍線）、✕ 常駐 |
| focus-visible | `box-shadow: inset 0 0 0 2px #2c6ebb`（active 時與藍線疊加） |
| 拖曳中 | 來源 `opacity:.45`；落點 `box-shadow: inset 2px 0 0 #2c6ebb` |

- **關閉 ✕ `.nt-x`**：18×18、radius 4、icon 12px stroke 2、色 `#6c798e`；hover 底 `rgba(22,28,40,.08)`、色 `#161c28`。**隱藏時用 `opacity:0` 保留佔位**（hover 不跳動）。顯示條件：active、hover、focus-visible、`@media (pointer:coarse)` 一律顯示。`tabindex=-1`。
- **固定頁籤**：✕ 位置換成 12px 圖釘 icon（`#6c798e`，active 時 `#2c6ebb`），不可關閉。固定區永遠排在最左；固定與一般之間插入 `2px` 寬 `#e1e6ee` 分隔條 `.nt-sep`。
- **Tooltip（title）**：`{標題}\n{路徑}` ＋ 若有待生成 AI 標記則 `\n待生成 AI 標記 {n}`。

#### 溢出
- 頁籤先縮到 120px，之後 `.nt-scroll` 水平捲動（`overflow-x:auto; scrollbar-width:none`）。
- 左右漸層遮罩：`.nt-scrollwrap::before/::after`，寬 28px，`linear-gradient(90deg / 270deg, #f6f8fb, transparent)`；有可捲內容時 `opacity:1`（transition .14s），由 scroll 事件計算 `scrollLeft > 2` / `scrollLeft + clientWidth < scrollWidth - 2`。
- 滑鼠滾輪的 `deltaY` 轉為水平捲動。
- active 改變時把 active 頁籤捲進可視區（左右保留 24px），**不要用 `scrollIntoView`**，直接算 `offsetLeft` 設 `scrollLeft`。
- 未固定頁籤上限 **20**：開第 21 個時關閉 `at`（最後聚焦時間）最舊的未固定、非新開頁籤，放進「最近關閉」堆疊，toast：`已達 20 個頁籤上限，關閉最久未用的「{標題}」`。

#### 全部頁籤鈕 `.nt-all`
- height 24、pill（radius 999）、padding `0 6px 0 8px`、margin `0 8px 0 6px`、`border:1px solid #e1e6ee`、底 `#fff`、11.5px bold `#2b3546`，內容：數字（tabular-nums）＋ 12px chevron-down。hover / 展開：邊框與字 `#2c6ebb`。有 ≥1 個頁籤就常駐。
- `aria-haspopup="menu"`、`aria-expanded`。

### 2. 全部頁籤下拉 `PtTabAll`
- 從 `.nt-all` 右下對齊展開，寬 340。容器：`#fff`、`1px #e1e6ee`、radius 8、padding 4、`box-shadow: 0 12px 32px rgba(22,28,40,.18)`、fade 120ms。
- 頂部篩選輸入（高 34，placeholder `在 {N} 個頁籤中篩選…`，autofocus，Enter 開第一筆）。
- 清單 max-height 340、可捲；分區標題 `已固定` / `頁籤`（10.5px bold、letter-spacing .1em、`#6c798e`）。
- 列：高 32、radius 5、gap 8；icon 13 → 標題 12.5px（max-width 60%）→ 路徑 10.5px `#6c798e` → ✕（常駐）或圖釘。hover `rgba(27,79,156,.06)`；目前頁籤 `rgba(27,79,156,.1)` + 標題 `#2c6ebb` bold。
- 底部：`重開剛關閉的 ⌥⇧T`（mini button，無可重開時 disabled）、`全部關閉`（mini danger，不含固定）。

### 3. 右鍵選單 `PtTabMenu`
- 觸發：右鍵、鍵盤 `⇧F10` / ContextMenu 鍵。寬 232，容器樣式同下拉。
- 頂端標題列（11px `#6c798e`，下方 1px `#eef1f6`）顯示該頁籤標題。
- 項目（高 30、12.5px `#2b3546`、14px icon 欄、右側快捷鍵帽）：
  1. 關閉 `⌥W`（固定頁籤 disabled）
  2. 關閉其他（不含固定）
  3. 關閉右側（不含固定）
  4. 全部關閉（不含固定）
  — 分隔 —
  5. 固定頁籤 / 取消固定
  — 分隔 —
  6. 複製連結（`location.origin + /notes/{slug}` 或 `/view/{path}`，toast `已複製連結 …`）
  7. 在新視窗開啟（`window.open(url, "_blank")`）
- hover / focus：`rgba(27,79,156,.08)`；disabled：opacity .55。
- 鍵帽 `.nt-kbd`：mono 10.5px、`1px #e1e6ee`、radius 4、padding `0 4px`、line-height 16、底 `#f6f8fb`。
- Esc、點外部、外部右鍵皆關閉。選單位置需夾在視窗內 8px。

### 4. 非筆記頁（Dashboard、`/notes`、系列、標籤、Plugin、設定）
- 頁籤列**一律顯示**，沒有任何頁籤為 active（全部一般態）。
- 這些頁面本身不開頁籤。

### 5. 空狀態
- 頁籤列保留 34px，內容改為一行提示 `.nt-empty`：13px doc icon + `尚未開啟任何筆記。在列表雙擊一列，或按列上的「開啟」，筆記會在這裡留下頁籤。`（12px `#6c798e`、padding `0 14px`、單行省略）。不顯示 `.nt-all`。
- 理由：高度與 SSR 佔位一致，第一次開筆記不會位移。

### 6. 平板（861–1100px）
- 頁籤列照常顯示。Sidebar 為抽屜；漢堡鈕 `.wb-mburger` 從 `top:9px` 下移到 **`top:43px`**（34 + 9），落在 Header 區。

### 7. 手機（≤860px）
- 隱藏 `.nt-bar`。Header 右上角顯示計數鈕 `.nt-count`：absolute `top:9px; right:12px`、32×32、`1px #e1e6ee`、radius 6、白底；內部數字框 min-width 18、高 18、`1.5px solid #2b3546`、radius 4、11px bold tabular-nums。目前頁面是頁籤之一時框與字改 `#2c6ebb`。Header 上排加 `padding-right:54px` 讓位。
- 點擊開底部抽屜 `PtTabSheet`：
  - 覆蓋整個 app（含底部 Tab bar），scrim `rgba(18,24,34,.44)`。
  - 抽屜：白底、上圓角 14、max-height 72%、`box-shadow: 0 -10px 30px rgba(20,28,42,.18)`、進場 `translateY(28px)→0` 220ms `cubic-bezier(.22,.7,.3,1)`。
  - 拉柄 36×4 `#e1e6ee`；標題列 `已開啟的頁籤`（15px bold）+ `{N} 個` + 關閉鈕。
  - 列：min-height 52、padding `6px 6px 6px 16px`、icon 15 → 標題 14px/500 + 路徑 11px 兩行 → 44×44 關閉鈕（或圖釘）。目前頁籤：底 `rgba(27,79,156,.07)` + `inset 3px 0 0 #1b4f9c` + 標題 `#2c6ebb` bold。
  - 底部：`重開剛關閉的`、`全部關閉`（ghost pill，高 40），底部加 `env(safe-area-inset-bottom)`。
  - 手機不提供拖曳排序。

---

## Interactions & Behavior

### 開啟 / 聚焦
- 所有開啟入口（列表雙擊、列上「開啟」圖示、Drawer「開啟筆記」、Sidebar、⌘K、Dashboard 列、資料檔列、筆記內連結）在**目標頁面載入後**由頁籤 island 呼叫 `ensure(kind, id)`：
  - 清單已有同 key → 只更新 `at`（聚焦）。
  - 否則新增，插在「上一個 active 頁籤」右側；沒有則加在最後。之後重排使固定頁籤在前。
- key：`note:{slug}`、`view:{dataFileId}`。系列、標籤、Dashboard、列表、Plugin 列表、設定**不開頁籤**。
- **不做預覽頁籤**：單擊列 = 開 Drawer 預覽（既有行為），開啟 = 一般頁籤。

### 關閉
- ✕、中鍵（`auxclick` button 1）、`⌥W`、Delete 鍵（焦點在頁籤上）、右鍵選單。
- 關閉 active：導覽到右鄰未關閉頁籤，否則左鄰；都沒有 → `/notes`。
- 關閉的頁籤（連同 `scroll`）推入 `closed` 堆疊（最多 10）。`⌥⇧T` 取出第一筆仍存在且未開啟者，加回清單並導覽。
- 固定頁籤不可被 ✕ / ⌥W / 「關閉其他/右側/全部」關閉。

### 刪除 / 失效
- dev-only 刪除筆記成功 → 關閉對應頁籤。
- 每次渲染時，解析不到（筆記索引中不存在）的頁籤會被移除，toast：`筆記已不存在，對應頁籤已關閉`（多筆：`{n} 篇筆記已不存在，對應頁籤已關閉`）。

### 捲動還原
- 主區 Body（`.wb-main > .wb-body`）scroll 時 debounce **220ms** 寫入目前頁籤的 `scroll`；production 另在 `pagehide` 補寫一次。
- 新頁面 hydrate 後先設 `scrollTop`，再於下一個 `requestAnimationFrame` 再設一次（等 MDX 圖表撐開高度）。

### 拖曳排序
- 只在 `matchMedia("(pointer:fine)")` 時 `draggable=true`（HTML5 DnD），與 Board 規則一致。
- 固定區與一般區各自排序，不能跨區。

### ⌘K Palette
- 最上方新增分區 `已開啟的頁籤`：無查詢時列 6 筆、有查詢時最多 4 筆相符（比對標題 + 路徑）。目前頁面右側 pill `目前`，固定頁籤 muted pill `已固定`。資料檔 icon 為金色。
- 其後分區標題 `筆記`，接原有結果。Enter 優先開第一筆頁籤結果。

### 鍵盤快捷鍵（避開 ⌘W / ⌘T / ⌘數字 / ⌃Tab）
| 動作 | 鍵 | 備註 |
|---|---|---|
| 下一個頁籤 | `⌥ .`（Alt+.） | 循環；不在頁籤頁時回到最後 active 的頁籤 |
| 上一個頁籤 | `⌥ ,`（Alt+,） | 同上 |
| 關閉目前 | `⌥ W` | 固定頁籤無作用 |
| 重開剛關閉 | `⌥ ⇧ T` | |
- 比對 **`event.code`**（`Comma`、`Period`、`KeyW`、`KeyT`），不要用 `event.key`（macOS Option 會改字元）。要求 `altKey && !metaKey && !ctrlKey`。焦點在 input/textarea 時不攔截（Prototype 未做此判斷，production 請加上）。

### 無障礙
- `.nt-scroll`：`role="tablist"`、`aria-label="已開啟的頁籤"`。每個頁籤 `role="tab"`、`aria-selected`（目前頁面為 true），主區 Body 視為 tabpanel。
- Roving tabindex：只有一個頁籤 `tabindex=0`（優先 active，否則第一個）。`←/→` 移動焦點（循環）、`Home/End`、`Enter/Space` 開啟、`Delete/Backspace` 關閉、`⇧F10`/ContextMenu 開選單。
- ✕ 為 `tabindex=-1`、`aria-label="關閉 {標題}"`。

### 動畫
- 選單 / 下拉：opacity fade 120ms ease-out。漸層遮罩 opacity .14s。抽屜 220ms `cubic-bezier(.22,.7,.3,1)`、scrim fade 160ms。`prefers-reduced-motion` 時全部關閉。

---

## State Management

```ts
// localStorage key: "nc.tabs.v1"
type TabEntry = {
  kind: "note" | "view";
  id: string;          // slug 或 data file id
  key: string;         // `${kind}:${id}`
  pinned: boolean;
  scroll: number;      // 上次 scrollTop
  at: number;          // 最後聚焦時間（LRU 用）
};
type TabStore = { tabs: TabEntry[]; closed: TabEntry[] /* max 10 */ };
```
- **標題、路徑不存 localStorage**，渲染時從 build 產生的筆記 / 資料檔索引解析（改名後不會顯示舊標題；解析不到即視為失效）。
- 解析後欄位：`title`、`path`、`data`（是否資料檔）、`pending`（待生成 AI 標記數）、`read`（閱讀狀態）。
- 操作：`ensure(kind,id,afterKey)`、`close(keys[])`、`pin(key)`（toggle）、`move(fromKey,toKey)`、`popClosed()`、`setScroll(key,y)`。
- 目前 active key 由**目前網址**推導，不存。
- 多分頁同步：監聽 `window` 的 `storage` 事件重新讀取（Prototype 未實作）。

### Astro 落地
- Layout SSR 輸出空的 `<div class="nt-bar" style="height:34px">`（手機寬度 `display:none`），頁籤 island 用 `client:load` 讀 localStorage 後補內容 → hydrate 前後零位移。
- 手機計數鈕同樣由 island 渲染；SSR 可先輸出 32×32 空鈕佔位。
- Present（全螢幕簡報）與版型庫頁不顯示頁籤列。

---

## Design Tokens（沿用工作台）
| Token | 值 | 用途 |
|---|---|---|
| `--wb-blue` | `#1b4f9c` | active 頂線、手機目前列左線 |
| `--wb-blue-l` | `#2c6ebb` | active icon、focus、拖曳落點、hover 邊框 |
| `--wb-gold` | `#ed9b26` | 資料檔 icon |
| `--wb-bg` | `#f6f8fb` | 頁籤列底、遮罩、鍵帽底 |
| `--wb-panel` | `#ffffff` | active 頁籤、選單 |
| `--wb-line` | `#e1e6ee` | 列底線、頁籤分隔、外框 |
| `--wb-line-2` | `#eef1f6` | 選單內分隔、清單列分隔 |
| `--wb-ink` | `#161c28` | active 文字 |
| `--wb-ink-2` | `#2b3546` | hover 文字、選單項目 |
| `--wb-ink-3` | `#6c798e` | 一般文字、icon、說明 |
| `--wb-warn` | `#e3a008` | （選用）AI 待生成點 |
| `--wb-ok` | `#2e9e6b` | （選用）已完成點 |
- 字：Noto Sans TC / Noto Sans；基準 13px，頁籤 12.5px，數字 `font-variant-numeric: tabular-nums`；鍵帽 `var(--font-mono)`。
- 圓角：頁籤 0、✕ 4、選單 8、列 5、pill 999、抽屜 14。
- 陰影：選單 `0 12px 32px rgba(22,28,40,.18)`、抽屜 `0 -10px 30px rgba(20,28,42,.18)`。

## 狀態小點（選用，預設關）
Prototype Tweaks「頁籤狀態點」可切換：`off`（預設，資訊放 tooltip）、`ai`（待生成 > 0 顯示 6px `#e3a008` 點）、`read`（閱讀中 `#2c6ebb`、已完成 `#2e9e6b`、未開始 `#6c798e` 55%）。點位於標題與 ✕ 之間。

## 待決問題（建議選項為粗體）
1. 頁籤狀態小點：**不顯示，放 tooltip** ／ 只顯示 AI 待生成。
2. 未固定頁籤上限：**20，自動關最舊** ／ 不設上限。
3. 快捷鍵：**⌥, ／ ⌥.** ／ ⌥[ ／ ⌥]；是否加 ⌥1–9（Linux Firefox 會攔 Alt+數字）。
4. 新頁籤插入位置：**active 右側** ／ 一律最後。
5. 系列詳情頁是否開頁籤：**暫不開**。
6. Present／版型庫是否顯示頁籤列：**不顯示**。

## Assets
- 無點陣圖。icon 皆為內聯 24px 線條 SVG（Lucide 風格，stroke 1.7–2，round cap/join）：doc、close、pin、chevron-down、link、external、undo、search。路徑定義見 `wb/pt-shell.jsx` 的 `PT_ICONS` 與 `wb/pt-tabs.jsx` 的 `NT_PATHS`；若專案已有 Lucide，可直接用 `file`、`x`、`pin`、`chevron-down`、`link`、`external-link`、`undo-2`、`search`。

## Files
- `prototype/wb/pt-tabs.jsx` — 頁籤全部元件與狀態：`usePtTabs`（store + LRU + 失效清理）、`PtTabStrip`（列、roving tabindex、溢出、拖曳）、`PtTabMenu`、`PtTabAll`、`PtTabCount`、`PtTabSheet`
- `prototype/wb/pt-tabs.css` — 所有頁籤樣式與 RWD 規則（`.nt-*`）
- `prototype/wb/pt-app.jsx` — 整合：`activeKey` 推導、`ensure` effect、捲動記錄/還原、關閉後導覽、快捷鍵、⌘K「已開啟的頁籤」分區、demo 參數、Tweaks
- `prototype/wb/pt-shell.jsx`、`prototype/wb/pt.css` — 既有殼（Rail / Sidebar / Header / Toolbar），**未修改**，供對照
- `prototype/Note-Tabs-Spec.html` — 規格頁與各狀態畫面
- 其餘 `app/`、`er/`、`_ds/` 為 Prototype 執行所需的既有檔案
