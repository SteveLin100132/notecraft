# Task 110 — 殼的預繪：頁籤列、頁籤指示器、系列進度、捲動還原提前

> 規格 [notecraft-workbench-loading-transitions.md](../notecraft-workbench-loading-transitions.md) §4.4、§5.3、§6、§7、§8.2；Q1、Q4 定案（§21）。
> 設計交付 README「E. 切換筆記的轉場」的頁籤指示器、「D. 『—』佔位 → 真值」的殼內層級；參考 `reference/nc-shell-inline.js`（**key、DOM、資料來源都要依規格 §1.1 改寫，不可照抄**）。
> 依賴 [Task 109](task-109-loading-measure-vt-foundation.md)（`.nc-main-pane`、`#nc-pane-end`、轉場規則）。

## 為什麼要有這一步

Task 109 之後主區會淡入，但頁籤列和 Sidebar 系列進度仍是 hydrate 後才有真值：換頁時這兩處會先空、先 `0/N`，看起來「殼也重畫了」，正好抵銷了「殼不動」的設計。頁籤指示器要跨頁滑動，前提是新頁的快照裡已經有頁籤。

捲動還原在 hydrate 後才設，加上轉場後，淡入到一半畫面會跳一下（規格 §7）。

這三件事都只能靠 inline script 在第一次繪製前做；頁籤列又是 React island，不能直接改它的 DOM（規格 §6.1），所以畫在島外的預繪層。

## 範圍

### 1. `src/lib/wb-tabs-prepaint.ts`（新增，純函式，規格 §6.2）

```ts
export interface PrepaintTab { key: string; kind: "note" | "view"; title: string; href: string; pinned: boolean; on: boolean }
export function prepaintTabs(raw: string | null, self: { key: string; kind: "note" | "view"; title: string; href: string } | null): PrepaintTab[];
```

- 解析 `nc-tabs-v1:<ws>` 的原字串：壞 JSON、`v !== 1`、`tabs` 非陣列 → `[]`；逐筆濾掉欄位型別不對的
- 固定排前（穩定排序）；`self` 不在清單 → 插在 **`at` 最大者右側**（清單空放最後），與 `wb-tabs.ts` 的 `ensure` 規則相同；`self` 標 `on`
- 不做 LRU 淘汰（超過 20 個時多畫一個也無妨，island 接手後會修正）
- `href` 由呼叫端傳 `BASE` 組好；清單內的頁籤 `href` 依 `kind` 組（`/notes/<id>`、`/view/<id>`，與 `hrefOf` 相同，再加 base）—— 函式多收一個 `base` 參數
- **自足**（會以 `toString()` 內嵌）：不能呼叫 `wb-tabs.ts` 的函式，規則要自己寫一份
- 只能 `import type`、無 JSX、不碰 `window`

### 2. `scripts/checks/wb-tabs-prepaint.mjs`（新增；或併入 `wb-tabs.mjs`，擇一）

| 斷言 | 內容 |
| --- | --- |
| 與 `ensure` 一致 | 隨機產生 50 組 store（含固定、`at` 亂序、self 在／不在清單），`prepaintTabs` 的 key 順序與 `ensure(...).store.tabs` 的 key 順序相同（不超過 20 個未固定的情況） |
| active | 只有 self 標 `on`；self 為 `null` 時沒有 `on` |
| 壞資料 | `null`、`"{"`、`'{"v":2}'` → `[]`；缺 `title` 的項目被濾掉 |
| href | CJK id 原樣；base `/x` → `/x/notes/…` |
| 可內嵌 | `new Function` 重建後結果相同 |

### 3. 頁籤列預繪層（規格 §6.2、§6.3）

- `WorkbenchLayout.astro`：`TabBar` island 之後輸出 `<div class="nt-pre" id="nt-pre" aria-hidden="true" data-pagefind-ignore></div>`，緊接 inline script：
  - `define:vars`：`base`、`workspace`（`index.workspaceLabel`）、`self`（由 `tab` prop 組 `{ key, kind, title, href }`，非頁籤頁為 `null`）
  - 讀 `localStorage.getItem("nc-tabs-v1:" + workspace)`（try/catch，失敗就 return，預繪層留空）
  - `prepaintTabs(...)` → 產生與 `TabStrip` 相同 class 的 DOM：`.nt-bar > .nt-scrollwrap > .nt-scroll > .nt-tab[.on][.pinned] > a.nt-tab-main[href] > (span.nt-ic > svg) + span.nt-t`；active 頁籤加 `<i class="nt-ind">`；固定頁籤加 `Pin` 圖示（對照 `TabStrip` 的實際結構與 class，**以 `TabStrip.tsx` 為準**，不要照 handoff 的 `.nt-t`）
  - icon 用 inline SVG 字串（lucide `FileText`、`Pin` 的 path，size 13、stroke 1.7），顏色規則與 `TabIcon` 相同
  - 溢出時把 active 捲進可視區（左右 24px）
  - 全部頁籤按鈕、溢出遮罩的外觀也要畫（只有外觀，不接事件），否則 hydrate 時右側會多出一顆按鈕
- 手機（≤860px）：預繪 `#nt-count-slot` 內的計數框（只有數字），外觀對照 `TabBar` portal 出來的按鈕；目前頁是頁籤時用 `--wb-blue-l`
- 樣式：`.nt-pre{position:absolute;top:0;left:0;right:0;height:34px;z-index:5}`（≤860px `display:none`），放進 Task 109 的「Loading 與轉場」區塊
- **交接**：`TabStrip` 在 `tabs !== null` 後的第一個 `useLayoutEffect` 移除 `#nt-pre` 與計數框預繪；`TabBar` 另設 4 秒 timeout 保險（JS 壞掉時不能永遠蓋著真的列 —— 但 JS 壞掉時 timeout 也不會跑，所以保險改放在 inline script：`setTimeout(remove, 4000)`，island 已移除時 no-op）

### 4. 頁籤指示器 `.nt-ind`（規格 §5.3）

- `TabStrip.tsx`：active 頁籤（`.nt-tab.on`）內加 `<i className="nt-ind" aria-hidden="true" />`
- `workbench.css`：`.nt-tab.on` 拿掉 `inset 0 2px 0 var(--wb-blue)`；`.nt-tab.on:has(.nt-tab-main:focus-visible)` 只留 focus ring；新增 `.nt-ind{position:absolute;left:0;right:0;top:0;height:2px;background:var(--wb-blue);view-transition-name:nc-tab-ind;pointer-events:none}`
- 轉場規則：`::view-transition-group(nc-tab-ind)` 240ms `--wb-ease`；`::view-transition-old(nc-tab-ind){display:none}`；`new` 無動畫；reduced motion 下 group duration 0
- **唯一性**：預繪層與 island 不可同時帶 `.nt-ind`。island 首輪 `tabs=null` 不畫頁籤 → 第一次畫出頁籤的同一個 commit 移除預繪層（§3 的 `useLayoutEffect`），所以不會重疊。dev 下在 `pagereveal` 後檢查 `document.querySelectorAll(".nt-ind").length > 1` 就 `console.warn`

### 5. Sidebar 系列進度預繪（規格 §8.2）

- `Sidebar.astro` 結尾（或 layout 在 `<Sidebar>` 之後）加 inline script：讀 `nc-reading-progress-v1`，對每個 `#wb-sb [data-wb-series]` 解析 `data-wb-refs`，計算 `done` 數 → 寫 `.wb-sb-prog i` 寬度、`[data-wb-series-n]` 文字 `done/total`
- 計算規則必須與 `reading-progress.ts` 的 `seriesProgress()` 相同（只有值為 `"done"` 才計入、`refs` 用原字串含 `view:`）。把計算抽成自足的純函式 `seriesDone(map, refs)` 放 `reading-progress.ts` 旁的新檔 `src/lib/series-progress-pure.ts`（只能 `import type`），`seriesProgress()` 與 inline script 都用它；`check:wb` 加斷言
- `SidebarLive` 不改（它在 idle 時再畫一次，值相同，不會閃）

### 6. 捲動還原提前（Q4，規格 §7）

- layout 在 `.nc-main-pane` 結尾、`#nc-pane-end` 之前加 inline script（只有 `tab` prop 存在時輸出）：
  - 條件照 note-tabs §7.2：`location.hash` 為空；`performance.getEntriesByType("navigation")[0]?.type` 不是 `back_forward` 時才做（bfcache 不會執行 inline script，但非 bfcache 的上一頁會 —— 照現行 `TabBar` 的判斷，**以 `TabBar.tsx` 現有條件為準**逐條對照）
  - 從 store 找 self 的 `scroll`，`> 0` 就設 `#nc-scroll.scrollTop`；實際設到（`Math.abs(el.scrollTop - target) < 2`）才加 `data-nc-restored`
- `TabBar.tsx` 的還原 effect：`#nc-scroll` 已有 `data-nc-restored` → 不再於 hydrate 時設、也不在下一個 rAF 設；**保留** `load` 後 `scrollHeight` 不足時的補設與「使用者已捲動就取消」；沒有該屬性時完全照舊
- 捲動**記錄**不動

### 7. render-blocking（規格 §4.4）

- head 加 `<link rel="expect" href="#nc-pane-end" blocking="render">`
- 用 Task 109 的量測條件再錄一次「切換筆記」，比較 FCP；變差超過 50ms 就改用規格 §20 的備案（`#nc-hd`），並在實作記錄說明

## 要改的既有檔案

`src/layouts/WorkbenchLayout.astro`、`src/components/wb/Sidebar.astro`（或 layout）、`src/components/wb/tabs/TabStrip.tsx`、`src/components/wb/tabs/TabBar.tsx`、`src/lib/reading-progress.ts`、`src/styles/workbench.css`、`package.json`（`check:wb`）。新增 `src/lib/wb-tabs-prepaint.ts`、`src/lib/series-progress-pure.ts`、`scripts/checks/wb-tabs-prepaint.mjs`（或併入既有）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | — | `npm run check:wb` | 全綠，含 prepaint 與 seriesDone |
| 頁籤零閃動 | `astro preview`，開著 5 個頁籤 | 在頁籤間切換 10 次，DevTools Performance 錄影 | 每一格的頁籤列都有頁籤；沒有空列的 frame |
| 預繪與 island 一致 | 同上 | 截圖 hydrate 前（停用 JS 或在 inline script 後設中斷點）與 hydrate 後 | 頁籤位置、寬度、字重、icon、active 底色一致 |
| 無 hydration 警告 | dev | 任一頁 | console 無 hydration mismatch／recoverable error |
| 指示器滑動 | Chrome 126+ | 點相隔 3 個的頁籤 | 藍線從舊頁籤滑到新頁籤（240ms），主區同時淡入 |
| 指示器淡入 | 同上 | Dashboard → 筆記 | 藍線直接出現在新頁籤（無來源可補間） |
| 新頁籤 | 15 個頁籤溢出 | 從 `/notes` 開一篇沒開過的 | 預繪層已把新頁籤捲進可視區；指示器位置正確 |
| 系列進度 | 某系列已完成 2/5 | 換頁 | Sidebar 一直是 `2/5`，沒有 `0/5` 的 frame |
| 捲動還原 | 長筆記捲到中段，切到別的頁籤再切回 | 錄影 | 轉場淡入時已在中段，沒有跳動 |
| hash 讓位 | 網址帶 `#某標題` | 開啟 | 停在該標題，不還原 |
| 保險 | 在 `TabBar` 丟例外（臨時） | 開任一頁 | 4 秒後預繪層移除 |
| 無 localStorage | 隱私模式（或讓 `getItem` 丟例外） | 開任一頁 | 預繪層空；island 照舊畫空列；無錯誤 |
| 手機 | 375 寬 | 換頁 | 計數框一直有數字 |
| viewer | `viewer-poc` 與另一個工作區 | 各開幾個頁籤 | 預繪讀的是各自的 key |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

[Task 109](task-109-loading-measure-vt-foundation.md)。

## 實作記錄（2026-10-02）

- **預繪層**：`src/lib/wb-tabs-prepaint.ts` 的 `prepaintTabs`（排序）與 `prepaintHtml`（DOM）以 `toString()` 內嵌；lucide 圖示在 layout frontmatter 用 `renderToStaticMarkup` 產生，與 `TabStrip` 同尺寸同線寬。預繪層裡的 ✕ 與「全部頁籤」是 `<span>`（只有外觀），連結 `tabindex=-1`
- **交接改由 `TabBar` 負責**（不是 `TabStrip`）：清單已含目前頁面時才移除 `#nt-pre`，否則 ensure 前的一輪會讓 active 閃一下；手機計數框等 portal 的 slot 就位才移除
- **保險邏輯改了**：不是固定 4 秒移除，而是 island 已 hydrate（`astro-island` 沒有 `ssr` 屬性）卻 1 秒後還在才移除；island 一直沒 hydrate（JS 失敗）時保留，預繪層的連結仍可導覽
- **`rel=expect` 只在需要還原捲動時才加**：固定加 `#nc-pane-end`（或頁籤預繪後的標記）在 Fast 4G 下讓切換筆記的 FCP 晚約 130ms；實測不加時預繪 script 也一定在第一次繪製前執行（`performance.mark("nc-tabs-prepaint")` 早於 FCP 2–90ms）。改成 head 的 inline script 讀 store，目前頁有 `scroll > 0` 且無 hash 時才 `document.write` 一條 `<link rel="expect" href="#nc-pane-end" blocking="render">`（parser-inserted 才會阻塞）
- **捲動還原**：主區結尾 inline script 設 `scrollTop` 並寫 `data-nc-restored="<實際值>"`；`TabBar` 看到屬性時不再於 hydrate 時設，位置已不同（使用者捲過）就不搶回，否則照舊等 `load` 補設
- 系列進度的計算抽成 `src/lib/series-progress-pure.ts` 的 `seriesDone`，`seriesProgress()` 也改用它
- 驗證（Playwright + 本機 Chrome，`astro preview`）：預繪層與 island 的頁籤列截圖在 1400／1000／375 寬度差異 0 像素；切回捲到 1800px 的頁籤，從第一個 frame 起都是 1800（含 Fast 4G）；網址帶 hash 時不還原；系列進度在每個繪製的 frame 都是真值（`2/8`）；指示器轉場有 `::view-transition-group(nc-tab-ind)` 240ms；各頁無 console 錯誤；tsc 錯誤數 49（不變）
