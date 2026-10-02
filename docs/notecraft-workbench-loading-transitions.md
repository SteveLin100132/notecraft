---
Project Name: NoteCraft Workbench — Loading 與轉場
文件類型: Design Document
文件版本: v0.2.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；轉場用瀏覽器原生的跨文件 View Transitions）
文件狀態: 已定案、待實作 —— §19 的 5 題已於 2026-10-02 逐題確認（紀錄見 §21）
文件作者: 建宇
建立日期: 2026-10-02
更新日期: 2026-10-02
依賴文件: docs/notecraft-workbench.md（§4 殼、§4.5 z-index／Escape）、docs/notecraft-workbench-note-tabs.md（§4.3 標題快照、§5 SSR、§7 捲動還原）、docs/notecraft-workbench-dashboard.md（§5 SSR 佔位）、docs/prototype/design_handoff_loading_transitions/README.md
分支: feat/loading-transitions
---

# NoteCraft Workbench — Loading 與轉場設計文件

現在有兩個空白瞬間：**第一次進站**時殼和內容畫出來之前的空白，以及**進入或切換筆記**時主區先空一下才出現。這份文件處理這兩件事：換頁時殼（Rail、Sidebar、頁籤列）不動，只有主區做 200–280ms 的淡入；等待超過 150ms 才出現骨架；SSR 的「—」佔位換成真值時不跳動。

> 視覺與時序的**像素級規格**以 [design_handoff_loading_transitions/README.md](prototype/design_handoff_loading_transitions/README.md)、`nc-loading.css` 與 `prototype/Loading-Transitions-Spec.html` 為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：handoff 的 `reference/` 程式碼假設了幾個 codebase 裡不存在的東西（`window.__NC_INDEX`、`nc.tabs.v1`、`.wb-sb.open`、深色模式，§1.1）；頁籤列是 React island，inline script 直接改它的 DOM 會造成 hydration mismatch（§6）；捲動還原發生在 hydrate 之後，會在轉場進行中跳一下（§7）；靜態站的空白其實多半來自阻塞渲染的樣式表，骨架未必有機會出現（§2）。
> **與設計稿不同之處一律以本文為準**，全部列在 §1.3。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 的 `nc-loading.css` 標明「正式版可直接使用」，`reference/` 四支檔案是起手程式碼。讀過 codebase 之後，有這幾類落差：

| 落差 | handoff 的假設 | codebase 實際 |
| :-- | :-- | :-- |
| **頁籤清單** | `localStorage["nc.tabs.v1"]`，標題從 `window.__NC_INDEX`（inline JSON 索引）解析 | key 是 `nc-tabs-v1:<workspaceLabel>`（依工作區分開），**已存標題快照**（note-tabs §4.3）；不存在 `__NC_INDEX`，索引是延遲載入的 `/wb-index.json`（77 KB，workbench §5.3 刻意不 inline） |
| **頁籤 DOM** | `<div role="tab" class="nt-tab">` 內含 `.nt-t` | 容器 `.nt-tab` 內並排 `<a class="nt-tab-main" role="tab" href>` 與 `<button class="nt-x">`（note-tabs Q2），還有固定圖示、icon、溢出遮罩、「全部頁籤」按鈕 |
| **頁籤列由誰畫** | inline script 寫 `innerHTML`，island hydrate 時「沿用同一份 DOM」 | `TabBar` 是 React 18 island（`client:load`），SSR 輸出 `tabs=null` 的空列。inline script 改了 island 內的 DOM，hydrate 時會 mismatch，React 丟掉 SSR 結果重畫（§6） |
| **閱讀進度** | `localStorage["nc.reading.v1"]`，值為 `"done"` | key 是 `nc-reading-progress-v1`，值是 `"reading" \| "done"`；系列 row 用 `data-wb-series` + `data-wb-refs`（JSON 陣列，含 `view:` 前綴），由 `SidebarLive`（`client:idle`）以 `seriesProgress()` 畫 |
| **手機抽屜** | `.wb-sb.open` | `body.wb-sb-open`，由 `SidebarLive` 切換；scrim 是 `.wb-sb-scrim[hidden]` |
| **路由** | `HUB` 正規式含 `/ai`、不含 `/series/<id>` | 沒有 `/ai` 頁（AI 佇列是 Dashboard 的 Tab）；`/series/<id>` 是系列詳情（列表）；`/plugins/folder/…`、`/tags` 也是列表；站可能部署在子路徑（`BASE`，npx viewer／GitHub Pages），比對前要 `stripBase` |
| **深色模式** | `.wb-dark` 一組 token | 工作台沒有深色模式（workbench.css 開頭第 3 點：已移除） |
| **token 命名** | 新增 `--nc-*` 時長 token | CLAUDE.md：樣式規則只引用 `--wb-*` token |
| **殼的 DOM** | `.wb-main > .nt-bar + .nc-main-pane > (Header#nc-hd + .nc-body-wrap)` | `bare` 頁（Dashboard、`/notes`、`/plugins`、`/settings`、系列）的 Header／Toolbar／Body 由 island 自己輸出；`.wb-main` 直接子元素還有 `.wb-mburger`、`#nt-count-slot`；`.wb-main>astro-island{display:contents}` 依賴直接子層關係 |
| **捲動還原** | 沒提 | `TabBar` 在 hydrate 後設 `#nc-scroll.scrollTop`（note-tabs §7.3）。新頁的 View Transition 快照在第一次繪製時就拍了（scrollTop 0），還原落在動畫進行中，內容會跳一下 |
| **生成元件佔位** | 「需要量測容器寬度、SSR 輸出空白」的元件包 `VizIsland`，`h` 由生成 skill 量測寫入 MDX | 77 支生成元件中，SSR 後會撐開或改變高度的需要逐一確認（初步盤點只有 `solution-architecture-comparison` 用 ResizeObserver 畫連線，§9.1）；`GeneratedFrame` 的樣式是 inline style（`--neutral-*`），不是 `--wb-*`；`data-nc-viz-body` 不可拿掉 |

### 1.2 目標

1. **找出空白的真正成因**再對症處理，不先假設是串流太慢（§2）
2. 換頁時 Rail、Sidebar、頁籤列**完全不動**；主區依情境（peer／drill／section）淡入，時長與 easing 照 handoff（§5）
3. 頁籤列與 Sidebar 系列進度在**第一次繪製**就是真值，不再有空列或 `0/N` 閃一下；頁籤 active 指示器跨頁滑動（§6、§8.2）
4. 捲動還原在第一次繪製前完成，轉場中不跳動（§7）
5. 骨架只在等待超過 150ms 時出現；`/notes` 首屏的「先藏主區」改成顯示骨架（§8）
6. SSR 空白的互動視覺化 hydrate 前後高度不變（§9）
7. SSR 的「—」換成真值時寬度不變、不做數字動畫（§10）
8. 尊重 `prefers-reduced-motion`；不支援跨文件 View Transitions 的瀏覽器（Firefox）行為與現在相同（§13）

### 1.3 非目標與刻意的偏離

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| 深色模式 | **不做**；`.wb-dark` 的 token 不搬 | 與 Dashboard §1.3、Calendar §1.3、note-tabs §1.3 同一決定 |
| token 命名 | 新 token 一律 `--wb-*`（`--wb-sk`、`--wb-dur-in`…，對照表見 §12.1） | CLAUDE.md 規則；handoff 的 `--nc-*` 只換名、不換值 |
| `nc-loading.css` 放哪 | 規則**併入 `workbench.css`** 末段（新區塊 `── Loading 與轉場 ──`）；首屏需要的最小子集另以 `<style is:inline>` 放 head（§4.2） | 工作台樣式集中一份；不另開 public 檔 |
| `reference/nc-vt.js` | 改寫為 layout 內的 `<script is:inline>`，分類函式來自 `src/lib/wb-nav.ts`（以 `Function.prototype.toString` 內嵌，§5.2） | 分類規則要能被 `check:wb` 斷言；也要處理 `BASE` |
| `reference/nc-shell-inline.js` 的頁籤列 | **不改 island 的 DOM**：inline script 畫在 island 旁邊的「預繪層」，hydrate 完成後移除（Q1，§6） | 避免 hydration mismatch |
| `window.__NC_INDEX` | **不做** | 頁籤已存標題快照（note-tabs §4.3），不需要再 inline 一份索引進每一頁 |
| 系列進度的預繪 | inline script 畫，邏輯與 `seriesProgress()` 一致；`SidebarLive` 保留（處理之後的變動） | 第一次繪製就是真值 |
| 啟動 splash／品牌動畫 | 照 handoff **不做** | 殼本身就是品牌 |
| 標題共享元素（`nc-title`） | 照 handoff D1 **不採用**；規則不移植 | 評估用 |
| Prototype 的 `.nc-boot` 覆蓋層、`.nc-ghost`／`.nc-mid-*`、`body.pt-mobile`／`pt-tablet`、`html.nc-rm` | **不移植** | Prototype 模擬與 Spec 截圖專用；響應式只靠 `@media` |
| 骨架的 shimmer 底色 | 新增 `--wb-sk`／`--wb-sk-hi`／`--wb-sk-frame`，值照 handoff 亮色 | 規則零色碼 |
| `GeneratedFrame` 改樣式 | **不改**（只在 `VizIsland` 佔位上對齊它的尺寸） | 超出範圍 |

---

## 2. 先量測：空白從哪裡來

handoff 的骨架設計假設「HTML 串流到一半」是常態。這是靜態站：筆記頁 HTML 100–230 KB、一次回應，Netlify CDN 上通常一兩個 RTT 就到齊。實際造成空白的候選，依可能性排序：

| # | 成因 | 影響 | 證據 |
| :-- | :-- | :-- | :-- |
| 1 | **Google Fonts 的 `<link rel="stylesheet">` 阻塞渲染** | 第一次進站：跨網域連線（DNS + TLS）完成、CSS 下載完之前**整頁不畫**，inline 骨架也一樣不畫 | layout head 第一個樣式表就是 `fonts.googleapis.com/css2`；`display=swap` 只管字型檔，不管這支 CSS |
| 2 | **Astro 打包的兩支 CSS（約 80 KB + 65 KB）阻塞渲染** | 第一次進站（未快取）時同上；換頁時已快取，影響小 | `dist/index.html` 的 `<link rel="stylesheet" href="/_astro/…css">` |
| 3 | **跨文件導覽本身** | 換頁時舊頁消失到新頁第一次繪製之間；Chrome 有 paint holding，但新頁在 head 阻塞資源或主執行緒忙時仍會出現白屏 | 主觀描述「內容頁會有一段時間是空白」 |
| 4 | **頁籤列 SSR 是空列**，`client:load` hydrate 後才有頁籤 | 每次換頁：34px 列先空、再出現；看起來像「殼也重畫了」 | `TabStrip` 的 `tabs: null` |
| 5 | **`/notes` 首屏的 `data-wb-filtering`** | 有 query 或偏好非預設時，主區先 `visibility:hidden`，island 掛載後才出現（最長 4 秒保險） | layout head 的 inline script |
| 6 | **Sidebar 系列進度 SSR 是 `0/N`**、`client:idle` 才換真值 | 每次換頁閃一下 | `Sidebar.astro`、`SidebarLive` |
| 7 | **`client:visible` 生成元件**在 SSR 時空白或高度不同 | 進入視窗時突然撐開、下方內容被推動 | 63 處 `client:visible` |
| 8 | **`astro dev`** 未打包、逐模組載入 | 只在本機 dev，比正式環境慢很多 | 作者多在 dev 使用 |

**Phase 0 先量**（Task 109 的第一步，結果回填 §21）：用 `astro build && astro preview`，Chrome DevTools Performance 面板以 Fast 4G、停用快取 各錄一次「第一次進站」與「切換筆記」，記下 FCP、LCP、Google Fonts CSS 與 `_astro/*.css` 的阻塞時間、頁籤列出現的時間點；`astro dev` 另錄一次對照。若 #1／#2 是主因，**樣式表非阻塞化比骨架更有效**（§4.3）；骨架照做，但它在多數情況下不會出現（這是預期的：骨架是慢速網路的保險，不是常態畫面）。

---

## 3. 現況盤點：哪些留、哪些改、哪些新增

| 檔案 | 處置 |
| :-- | :-- |
| `src/layouts/WorkbenchLayout.astro` | **改**：head 加首屏 critical CSS、`<link rel="expect">`、轉場 script；Google Fonts 改非阻塞（Q2）；主區包 `.nc-main-pane`；頁籤列預繪層與 inline script；Sidebar 後加系列進度 inline script；`.nc-main-pane` 結尾加捲動還原 inline script（§4、§6、§7、§8.2） |
| `src/styles/workbench.css` | **改**：開頭 token 區加 §12.1 的新 token；末段新增「Loading 與轉場」區塊（由 `nc-loading.css` 移植，去掉 prototype 專用規則）；`.nt-tab.on` 的 `box-shadow` 指示器改成 `.nt-ind` |
| `src/lib/wb-nav.ts` | **新增**：純函式 `navKind(pathname, base)` → `"hub" \| "leaf" \| "none"`、`vtType(from, to, base)` → `"peer" \| "drill" \| "section" \| null`；只能 `import type`、無 JSX |
| `scripts/checks/wb-nav.mjs` | **新增**：斷言（所有路由、BASE、尾斜線、CJK 百分比編碼、Present 頁）；`check:wb` 串上它 |
| `src/lib/wb-tabs-prepaint.ts` | **新增**：純函式 `prepaintTabs(raw, activeKey)` → 預繪要用的 `{ key, title, kind, pinned, on }[]`（解析快照、套用 `ensure` 的「目前頁補到最後」、過濾壞資料）；inline script 與 `check:wb` 共用（§6.2） |
| `src/components/wb/tabs/TabStrip.tsx` | **改**：active 頁籤加 `<i class="nt-ind" aria-hidden="true">`；掛載後通知 layout 移除預繪層（§6.3） |
| `src/components/wb/tabs/TabBar.tsx` | **改**：捲動還原若 inline script 已完成就不再設（看 `data-nc-restored`），其餘邏輯（hash 讓位、使用者已捲動就不搶、`load` 後補設）保留（§7） |
| `src/components/wb/NoteSkeleton.astro` | **新增**：由 `reference/NoteSkeleton.astro` 改寫，尺寸對齊實際筆記頁（`.wb-host` padding、TOC 是 container query 900px，不是 viewport 860px，§8.3） |
| `src/components/wb/ListSkeleton.astro`、`GridSkeleton.astro` | **新增**：`/notes` 列表與 Dashboard 的骨架（§8.4） |
| `src/components/islands/VizIsland.tsx` | **新增**：由 `reference/VizIsland.tsx` 改寫（§9） |
| `src/pages/notes/[...slug].astro`、`src/pages/view/[...path].astro` | **改**：主內容包 `.nc-content`、前面放 `NoteSkeleton` |
| `src/pages/notes/index.astro`、`src/pages/index.astro` | **改**：bare island 前放對應骨架；`/notes` 的 `data-wb-filtering` 改為「藏內容、顯示骨架」（§8.4） |
| `.claude/skills/content-visualize/SKILL.md`、`component-generator` | **改**（Q3）：SSR 空白型元件的判定與 `h` 的量測寫回 |
| `src/components/wb/SidebarLive.tsx` | **不改**（inline script 先畫一次，它之後照舊處理變動） |
| `src/layouts/PresentLayout.astro` | **不改**：不載入轉場規則，與工作台頁之間不做轉場（只有一邊 opt-in 時瀏覽器不轉場） |

---

## 4. 殼與 head

### 4.1 主區的 DOM

```
.wb-main#nc-main
├── <astro-island> TabBar                ← 不在 nc-main 快照內，換頁時不動
├── .nt-pre（頁籤列預繪層，§6）
├── button.wb-mburger / #nt-count-slot   ← 不動
└── .nc-main-pane                         ← view-transition-name: nc-main
    ├── （非 bare）Header ─ toolbar slot ─ #nc-scroll.wb-body
    │                     └── .nc-body-wrap ─ Skeleton ＋ .nc-content
    └── （bare）<slot/>：island 自己輸出 Header／Toolbar／Body；骨架放在 island 之前
```

- `.nc-main-pane`：`flex:1; min-height:0; display:flex; flex-direction:column; position:relative`。既有的 `.wb-main>astro-island{display:contents}` 要補一條 `.nc-main-pane>astro-island{display:contents}`，否則 bare 頁的直向排版會壞
- **`id="nc-scroll"` 位置不變**（仍是 Body 本身），`.nc-body-wrap` 放在 `#nc-scroll` 裡面而不是外面，`Toc` 與筆記頁 inline script 不受影響
- `view-transition-name` 會讓 `.nc-main-pane` 成為 stacking context。主區內的浮層（`MoreMenu`、Drawer、TabMenu 以外的 popover）若用 `position:fixed` + 全域 z-index 疊在頁籤列上方，要在 Task 110 逐一確認（§20 風險）

### 4.2 head 的順序

```html
<head>
  <meta charset> <meta viewport> <title>
  <style is:inline>/* critical：§12.1 的 sk token、.nc-sk、.nc-sk-root、.nc-body-sk-flow 與 :has() 規則（約 1.5 KB） */</style>
  <script is:inline>/* 既有：/notes 首屏判斷（§8.4 改寫）*/</script>
  <script is:inline>/* 轉場 type、舊頁進度線（§5.2、§11）*/</script>
  <link rel="expect" href="#nc-pane-end" blocking="render">
  <link rel="icon">
  <!-- Google Fonts：Q2 -->
  <!-- Astro 注入的 _astro/*.css（阻塞，維持） -->
</head>
```

### 4.3 樣式表非阻塞化（Q2）

- **Google Fonts**：改成 `<link rel="preload" as="style" href="…" onload="this.rel='stylesheet'">` + `<noscript>` 退回。字型本來就是 `display=swap`，第一次繪製用系統字型（PingFang TC／Microsoft JhengHei），字型到了再換
- 代價：第一次進站可能看到字型換一次（FOUT）。中文字型檔大，現在其實也常是先系統字型再換，只是**整頁晚畫**
- **Astro 的 CSS 維持阻塞**：它是殼的版面，非阻塞會 FOUC。是否改 `build.inlineStylesheets` 等 Phase 0 量完再說，不在本文範圍

### 4.4 render-blocking 的時間點

`<link rel="expect" href="#nc-pane-end" blocking="render">`：新頁在 `.nc-main-pane` 結尾的空元素 `<i id="nc-pane-end" hidden>` 解析完之前不做第一次繪製。

- handoff 用 `#nc-hd`（Header）。但 bare 頁的 Header 在 island 的 SSR HTML 裡，layout 無法統一加 id；而且靜態站的主區 HTML 幾乎和 Header 同時到，等到主區結尾的成本很小
- 好處：新頁快照**一定**含完整主區與頁籤預繪、捲動還原也已完成（§7），轉場不會淡入半張頁面或骨架
- 主區 HTML 真的很慢（慢速網路）時，瀏覽器在整份文件解析完前就會解除阻塞（規格上 `expect` 找不到元素時以文件解析完為界），所以骨架仍有機會出現在**第一次進站**
- 不支援 `rel=expect` 的瀏覽器忽略它

---

## 5. 跨文件 View Transitions

### 5.1 啟用

`workbench.css` 加 `@view-transition { navigation: auto; }`，`::view-transition-*(root)` 為 `animation:none`，`nc-main` 依 type 套動畫（數值照 handoff）。只有 `WorkbenchLayout` 載入 `workbench.css`，Present 頁不 opt-in。

### 5.2 轉場 type

`src/lib/wb-nav.ts`：

| 路徑（去 `BASE`、去尾斜線、`decodeURI`） | `navKind` |
| :-- | :-- |
| `/`、`/notes`、`/plugins`、`/plugins/folder/…`、`/settings`、`/series`、`/series/<id>`、`/tags` | `hub` |
| `/notes/<slug>`、`/view/<path>` | `leaf` |
| `/present/…`、其他 | `none`（不轉場，`skipTransition()`） |

| from → to | `vtType` |
| :-- | :-- |
| 任何 → `hub` | `section`（純淡入 200ms） |
| `hub` → `leaf` | `drill`（8px／280ms） |
| `leaf` → `leaf` | `peer`（4px／240ms） |
| 任一端 `none`、reload、沒有來源 | `null` → `skipTransition()` |

- 來源網址：`navigation.activation.from.url`（Chrome 123+）；沒有 Navigation API 的瀏覽器（Safari）退回 `document.referrer`（同源導覽一定帶）。兩者都沒有就 `skipTransition()`
- 寫法：`pagereveal` 裡 `e.viewTransition.types.add(type)`（View Transition Types，Chrome 125+、Safari 18.2+），CSS 用 `:active-view-transition-type(drill)`。不支援 `types` 時退回 handoff 的 `<html data-nc-vt>`，`finished` 後移除。規則兩種選擇器都寫
- 同頁 hash 變化（目錄錨點、OpenAPI `#op/…`）不是跨文件導覽，不會觸發
- inline script 無法 `import`：layout 以 `set:html={`(${navKindSrc})`}` 把 `wb-nav.ts` 匯出的函式原始碼內嵌（`navKind.toString()`）。函式必須自足（不引用外部識別碼），`check:wb` 斷言 `new Function` 重建後結果相同

### 5.3 頁籤指示器（`nc-tab-ind`）

- `.nt-tab.on` 的 `box-shadow: inset 0 2px 0 var(--wb-blue)` 改成獨立元素 `<i class="nt-ind">`（absolute、top 0、高 2px），`view-transition-name: nc-tab-ind`。focus 樣式 `.nt-tab.on:has(.nt-tab-main:focus-visible)` 只留 focus ring
- **名稱在同一份文件必須唯一**：預繪層與 island 同時存在的瞬間，只有預繪層帶 `.nt-ind`（island 首輪 `tabs=null` 不畫頁籤）；island 第一次畫出頁籤的同一個 commit 移除預繪層（§6.3）
- 舊頁快照：island 已 hydrate，`.nt-ind` 在 island 裡；新頁快照：在預繪層裡。兩邊都有 → group 補間位置與寬度 240ms
- 來源頁沒有 active 頁籤（從 Dashboard 進筆記）：只有 new，淡入；目的頁沒有（筆記 → Dashboard）：只有 old，handoff 設 `display:none`，直接消失
- 新頁籤插到最右、頁籤列溢出要捲動時：預繪層要先把 active 捲進可視區（§6.2），否則快照裡的指示器位置不對

### 5.4 手機與平板抽屜

handoff 的規則改用實際 class：`@media (max-width:1100px)` 下 `.wb-sb` 命名 `nc-drawer`、`.wb-sb-scrim:not([hidden])` 命名 `nc-scrim`。點抽屜裡的連結時，inline script 在 click capture 階段移除 `body.wb-sb-open`（現在是導覽後才關），讓既有的 220ms 滑出先開始。

### 5.5 bfcache 與 reload

- reload：`skipTransition()`
- bfcache 還原（上一頁）：不觸發 `pagereveal` 的轉場，頁面原樣回來；`pageshow(persisted)` 清掉殘留的進度線（§11）。TabBar 的 bfcache 重畫邏輯（note-tabs §7.2）不變

---

## 6. 頁籤列預繪（Q1）

### 6.1 問題

頁籤列每頁都有，SSR 只能畫空列（清單在 localStorage）。要在第一次繪製就有頁籤，只能靠 inline script；但 inline script 寫進 island 的 DOM，React 18 `hydrateRoot` 比對時發現與 `tabs=null` 的 SSR 結果不同，會丟出 recoverable error 並整棵重畫，還可能閃一下。

### 6.2 做法：島外的預繪層

```html
<astro-island …>  <!-- TabBar：SSR 空列 .nt-bar -->
<div class="nt-pre" aria-hidden="true" id="nt-pre"></div>
<script is:inline>/* 讀 nc-tabs-v1:<ws>，用 prepaintTabs() 的原始碼產生頁籤，寫進 #nt-pre */</script>
```

- `.nt-pre`：`position:absolute; top:0; left:0; right:0; height:34px; z-index:5`（蓋在 island 的空列上），內部沿用 `.nt-bar`／`.nt-scrollwrap`／`.nt-tab`／`.nt-tab-main`／`.nt-ic` 等 class，**外觀與 island 畫出來的完全一樣**，但：
  - 頁籤是 `<a class="nt-tab-main" href>`（沒有 ✕、沒有 `role`，`aria-hidden` 整層）；hydrate 前點得到、能導覽
  - icon 用 inline SVG（lucide `FileText`，與 `TabIcon` 同尺寸同色）；固定頁籤的 `Pin` 同理
  - 溢出時先把 active 捲進可視區（左右留 24px，與 `TabStrip` 相同）
- 手機（≤860px）不畫頁籤列，預繪 `#nt-count-slot` 的計數（只有數字框，沒有 portal 的按鈕行為）
- 資料：`nc-tabs-v1:<workspaceLabel>` 的快照（`title`／`kind`／`pinned`）；目前頁面若不在清單，**補在最後並標 active**，與 `ensure` 的結果一致（LRU 淘汰、toast 由 island 處理，預繪不管）
- 工作區名稱由 layout 以 `define:vars` 傳入（與 `TabBar` 的 `workspace` 同值）
- 讀不到 localStorage、JSON 壞掉：預繪層留空，等 island（等於現況）

### 6.3 交接

- `TabStrip` 在 `tabs !== null` 的第一次 layout effect 裡移除 `#nt-pre`（同一個 frame，不會兩層同時可見地錯開）
- 保險：`astro:hydrate` 之外再設一個 4 秒 timeout 移除，避免 JS 壞掉時預繪層永遠蓋住真的頁籤列（真的列可能已因關閉頁籤而不同）
- `check:wb` 斷言 `prepaintTabs()` 與 `ensure()` 對同一份 store 產生相同的順序與 active

---

## 7. 捲動還原提前（Q4）

note-tabs §7.3 的還原在 `TabBar` hydrate 後。加上轉場後，新頁快照是 `scrollTop=0` 的樣子，還原落在 240ms 動畫進行中，看起來是淡入到一半突然跳到別處。

改成兩段：

1. **`.nc-main-pane` 結尾、`#nc-pane-end` 之前的 inline script**：條件與 note-tabs §7.2 相同（無 hash、非 bfcache、store 有 `scroll`），同步設 `#nc-scroll.scrollTop`，成功就在 `#nc-scroll` 加 `data-nc-restored`
2. **`TabBar` 原本的還原**：看到 `data-nc-restored` 就只保留「`load` 後若 `scrollHeight` 不足再補設一次」與「使用者已自己捲動就不搶」；沒看到（舊頁面、inline script 失敗）就照舊

`client:visible` 元件與圖片在第一次繪製時尚未撐開，`scrollHeight` 可能不夠 → 第 1 段設不到目標值，由 `load` 後的補設處理。§9 的 `VizIsland` 以 `min-height` 預留高度，可以減少這種情況。

---

## 8. 骨架

### 8.1 共通

- class、尺寸、shimmer 照 handoff（`.nc-sk`、`.r`、`.sq`、`.nc-sk-root`）
- 出現延遲 150ms：純 CSS（`transition-delay` + `@starting-style`）。`@starting-style` 不支援的瀏覽器（Safari 17.4 以前）骨架會立刻出現，可接受
- 骨架整層 `aria-hidden="true"`，容器 `aria-busy="true"`、`aria-label="載入中"`
- 骨架只在**慢**的時候才看得到；正式環境快取命中時預期完全看不到

### 8.2 啟動（第一次進站）

- Rail、Sidebar 是 SSR 真值、隨 HTML 一起到，**不做骨架**（handoff 的 Sidebar 項目骨架只在 HTML 分段到達時才有意義，靜態站不採用）
- **系列進度**：`Sidebar.astro` 之後的 inline script，邏輯與 `seriesProgress()` 一致（讀 `nc-reading-progress-v1`、`refs` 為 `data-wb-refs` 的 JSON、`done` 才計入），寫 `.wb-sb-prog i` 寬度與 `[data-wb-series-n]` 文字
- 第一次進站真正的空白在 §2 #1／#2，由 §4.3 處理

### 8.3 筆記 Body 骨架（`NoteSkeleton.astro`）

- 放在 `#nc-scroll` 內、`.nc-content` 之前；`.nc-body-wrap:has(>.nc-content)>.nc-body-sk-flow{display:none}`，內容開頭一到就藏
- 尺寸以實際筆記頁為準（不是 handoff 的 NoteView）：`.wb-host` padding 照現行（桌面 `26px 32px 60px`，≤860px `16px 4px 48px`）；TOC 欄用與 `.nc-note-grid.has-toc` **同一個 container query**（`wbhost` ≥ 900px 才兩欄），不用 viewport 860px
- 資料檔頁（`/view/…`）共用同一支骨架但隱藏 TOC 欄（plugin 版面差異大，骨架只示意）
- 骨架本身不會被 Pagefind 索引：加 `data-pagefind-ignore`

### 8.4 `/notes` 與 Dashboard（bare 頁）

- `/notes` 現在有 query 或偏好非預設時整個主區 `visibility:hidden`（§2 #5）。改成：`data-wb-filtering` 時藏 `.wb-tb`、`.wb-body` 的**內容**，顯示 `ListSkeleton`（Toolbar 是真值 40px，在骨架上方）；保險 timeout 4 秒不變
- 預設狀態（無 query、預設偏好）的 SSR 本身就是正確畫面，不顯示骨架
- Dashboard：SSR 已有真實卡片與「—」佔位，**不加 `GridSkeleton`**，handoff 的 Dashboard 骨架只在 bare island 的 HTML 慢到時才有意義，先不做（Phase 0 若量到再補）

---

## 9. 互動視覺化佔位（Q3）

### 9.1 哪些元件需要

| 類型 | 判定 | 處理 |
| :-- | :-- | :-- |
| SSR 有完整 HTML、hydrate 後高度不變 | 多數 | **不處理**。hydrate 前互動控制若點了沒反應，在元件內以 `disabled` + `data-hydrated` 處理（逐支看，不強制） |
| SSR 有 HTML、但 hydrate 後高度或版面改變（量測寬度後重排、`mounted` 後才畫圖） | 需盤點 | 包 `VizIsland`，以 `min-height` 預留 hydrate 後的高度 |
| SSR 完全空白 | 需盤點 | 同上，並顯示佔位 |

Task 111 第一步：`astro build` 後對每篇筆記比對「SSR HTML 中每個 `[data-nc-viz-body]` 的高度」與「hydrate 後的高度」（Playwright 腳本放 `scripts/fixtures/`，不放 `scripts/checks/`），差距 > 8px 的列成清單。初步 grep 只找到 `solution-architecture-comparison` 用 ResizeObserver；有 `mounted`／`typeof window` 字樣的 10 支要實測。

### 9.2 `VizIsland`

- 由 `reference/VizIsland.tsx` 改寫：佔位外框對齊 `GeneratedFrame`（margin 22px 0、caption 列高、radius `--radius-lg`），**不是**包在 `GeneratedFrame` 外面再畫一個框 —— 佔位放在 `[data-nc-viz-body]` 裡面，`VizZoom` 的搬移目標不動
- 預留高度 `h`：MDX 上的 prop。由 component-generator 驗證時量測、mdx-writer 寫回（Q3）
- `client:visible={{ rootMargin: "200px" }}`：Astro 5 支援 `client:visible` 的 `rootMargin` 選項，提前 200px hydrate
- **handoff 的寫法有問題**：`<VizIsland client:visible><X /></VizIsland>` 中，Astro 把 `<X />` 當成 slot 的靜態 HTML 傳進 island，**`X` 本身不會被 hydrate**，互動會全部失效。可行的形式是「生成元件內部使用 `VizIsland`」或「生成元件自己接 `h` 並渲染佔位」，由 Task 111 先寫最小範例確認後擇一，再回填本節
- 「互動圖表載入中」800ms 後出現；最短顯示 300ms（`hold = elapsed < 150 ? 0 : max(0, 450 - elapsed)`）照 handoff

---

## 10. 「—」佔位 → 真值

- 殼內（頁籤、系列進度）：§6、§8.2，第一次繪製就是真值，不會有「—」
- 主區（Dashboard「本週更新」、閱讀狀態圖例、列表 `.wb-row-d` 相對日期、筆記的 `ReadingControl`）：現行 SSR 已輸出「—」或空。補兩件事：
  1. 「—」所在的槽位與真值**同寬**（`tabular-nums` + 固定寬；`.wb-row-d` 46px 等），逐一確認現行 CSS，不足的補
  2. 換成真值時 200ms opacity 淡入（`--wb-dur-swap`），不做數字滾動
- handoff 的 `.nc-pending`／`.nc-hyd` 以 `::after` 偽造「—」的做法**不採用**：現行元件 SSR 本來就輸出「—」，不需要 CSS 偽造；淡入改由元件在 `now`／`live` 從 null 變成值時加 class

---

## 11. 舊頁進度線（Q5）

- 照 handoff：攔站內連結 click（capture），150ms 後在 `.nc-main-pane` 頂端出現 2px `--wb-progress` 進度線，2.4s 內 scaleX .06→.85；`pageswap`、`pageshow(persisted)` 時移除
- 排除：修飾鍵、`target`、`download`、跨源、同頁 hash、`vscode://`、`href` 指向 Present 頁以外的非工作台頁（`navKind === "none"` 照樣顯示，因為等待是真的）
- 頁籤的中鍵關閉（`auxclick`）不是 `click`，不受影響

---

## 12. 樣式與 token

### 12.1 新 token（`workbench.css` 開頭）

| 名稱 | 值 | handoff 原名 |
| :-- | :-- | :-- |
| `--wb-sk` | `#e8ecf2` | 同 |
| `--wb-sk-hi` | `#f4f6f9` | 同 |
| `--wb-sk-frame` | `#fbfcfe` | 同 |
| `--wb-progress` | `var(--wb-blue-l)` | 同 |
| `--wb-sk-delay` | 150ms | `--nc-sk-delay` |
| `--wb-sk-label-delay` | 800ms | `--nc-sk-label-delay` |
| `--wb-sk-period` | 2.4s | `--nc-sk-period` |
| `--wb-ease` | `cubic-bezier(.22,.7,.3,1)` | `--nc-ease` |
| `--wb-dur-out` | 120ms | `--nc-dur-out` |
| `--wb-dur-in` | 240ms | `--nc-dur-in` |
| `--wb-dur-drill` | 280ms | `--nc-dur-drill` |
| `--wb-dur-section` | 200ms | `--nc-dur-section` |
| `--wb-dur-ind` | 240ms | `--nc-dur-ind` |
| `--wb-dur-swap` | 200ms | `--nc-dur-swap` |
| `--wb-dur-drawer` | 220ms | `--nc-dur-drawer` |
| `--wb-rise` | 4px | `--nc-rise` |
| `--wb-rise-drill` | 8px | `--nc-rise-drill` |

- `--nc-sk-min`（300ms）只在 JS 用，改成 `VizIsland.tsx` 內的常數，不設 CSS token
- 既有 Drawer、`.nt-sheet` 的 `cubic-bezier(.22,.7,.3,1)` 字面值順手改用 `--wb-ease`（同值）

### 12.2 規則放置

- 「Loading 與轉場」區塊放在 `workbench.css` 末段、860px 媒體規則**之後**（與 `cal-` 必須在 860px 之前相反：這裡的 `@media` 是自己的，不需要被覆蓋）
- critical 子集（§4.2）是 `workbench.css` 中同名規則的**複本**；`check:wb` 加一條：inline 子集的每條規則都能在 `workbench.css` 找到相同字串，避免兩邊漂移

---

## 13. Reduced motion 與瀏覽器支援

- reduced motion：照 handoff 表（主區只留 100ms linear 淡入、指示器與抽屜直接跳、骨架無 shimmer 但 150ms 延遲照留、進度線靜態 .55）
- 支援度：

| 功能 | Chrome | Safari | Firefox |
| :-- | :-- | :-- | :-- |
| 跨文件 View Transitions | 126+ | 18.2+ | ✗ → 直接整頁切換（現況） |
| View Transition Types | 125+ | 18.2+ | ✗ |
| `pagereveal`／`pageswap` | 123+ | 18.2+ | ✗ |
| `navigation.activation` | 123+ | ✗ → `document.referrer` | ✗ |
| `rel=expect blocking=render` | 124+ | ✗（忽略） | ✗ |
| `@starting-style` | 117+ | 17.5+ | 129+ |

---

## 14. 響應式

- 861–1100px：Sidebar 是抽屜（§5.4），頁籤列保留，預繪照做
- ≤860px：頁籤列隱藏，預繪計數框（§6.2）；筆記骨架單欄（TOC 由 container query 自然隱藏）
- 進度線與主區轉場在所有寬度相同

---

## 15. 無障礙

- 轉場不影響焦點：跨文件導覽後焦點本來就回到文件開頭（`.wb-skip` 跳到主要內容不變）
- 預繪層 `aria-hidden`，hydrate 前用鍵盤 Tab 進頁籤列會跳過它（頁籤的鍵盤操作要等 island，與現況相同）
- 骨架 `aria-busy`，內容到了移除；`VizIsland` 佔位 `aria-busy` 隨 `ready` 變化

---

## 16. dev／正式環境差異

- 沒有 dev-only UI
- `astro dev` 下 CSS 由 Vite 以 `<style>` 注入、模組逐支載入，骨架與進度線出現的機會比正式環境高很多；**驗收以 `astro preview` 為準**
- dev 的 HMR 不受 `@view-transition` 影響（同文件更新）

---

## 17. npx viewer 相容性

- `navKind` 先 `stripBase`；BASE 由 layout 以 `define:vars` 傳入 inline script
- 頁籤預繪的 key 依 `workspaceLabel` 分開，與 `TabBar` 相同
- viewer 換工作區是整頁導覽到另一個 origin／路徑時，`vtType` 判不出 → 不轉場

---

## 18. 實作階段

| Task | 內容 | 驗收 |
| :-- | :-- | :-- |
| 109 | Phase 0 量測（§2，結果回填 §21）；Google Fonts 非阻塞（Q2）；token 與 critical CSS；`.nc-main-pane` 包裝；`wb-nav.ts` + `check:wb`；`@view-transition` 與三種 type；進度線；抽屜提早關閉 | 各路由的 type 符合 §5.2 表；bare／非 bare 頁排版不變；Firefox 行為與現況相同 |
| 110 | 頁籤預繪（§6）與 `.nt-ind`；系列進度預繪（§8.2）；捲動還原提前（§7）；主區浮層 stacking context 檢查 | 換頁時頁籤列與 Sidebar 零閃動；指示器跨頁滑動；無 hydration 警告；有捲動位置的頁籤切回時不跳 |
| 111 | `NoteSkeleton`、`/notes` 骨架；生成元件高度盤點；`VizIsland` 與 skill／subagent 的 `h` 流程（Q3）；「—」槽位同寬與淡入（§10） | DevTools 節流 Slow 4G 時骨架出現且不閃；快時看不到；盤點清單中的元件 hydrate 前後高度差 ≤ 8px |
| 112 | reduced motion、響應式、CLAUDE.md 與 workbench.md 更新、PRD bump（app v1.8.0）、§21 回填 | `npx tsc --noEmit` 無新增錯誤、`astro build`、`npm run check-plugins` 通過 |

---

## 19. 待釐清問題

### Q1. 頁籤列預繪的做法（已定案：A）

- **A（建議）島外預繪層**：inline script 畫在 island 旁的覆蓋層，island 畫好後移除（§6）。第一次繪製就有頁籤、指示器能跨頁滑動、不碰 hydration
- B 照 handoff 改 island 內的 DOM：會 hydration mismatch，React 整棵重畫
- C 不預繪：頁籤列照舊先空再出現；指示器無法跨頁滑動（新頁快照沒有頁籤），只能淡入

### Q2. Google Fonts 改非阻塞載入（已定案：A）

- **A（建議）改非阻塞**（§4.3）：第一次進站最大的空白來源之一；代價是可能看到字型換一次
- B 維持現狀：只做轉場與骨架，第一次進站的空白改善有限

### Q3. 互動視覺化佔位的範圍（已定案：A）

- **A（建議）先盤點再包**：只有實測 hydrate 前後高度差 > 8px 的元件包 `VizIsland`；`h` 由 component-generator 量測、mdx-writer 寫回，skill 補一條規則
- B 全部生成元件都包：MDX 改動量大（63 處），多數元件不需要
- C 不做：只做頁面層的轉場與骨架

### Q4. 捲動還原提前到 inline script（已定案：A）

- **A（建議）提前**（§7）：轉場中不跳動
- B 維持 hydrate 後還原：轉場進行到一半會跳

### Q5. 舊頁進度線（已定案：A）

- **A（建議）做**：慢回應時舊頁有回饋，不變暗、不擋操作
- B 不做：靠瀏覽器自己的載入指示

---

## 20. 風險

| 風險 | 緩解 |
| :-- | :-- |
| `.nc-main-pane` 成為 stacking context，主區內浮層被頁籤列（z-index 4）蓋住 | Task 110 逐一檢查 `MoreMenu`、Drawer、`VizZoom`、Toast；必要時浮層 portal 到 body |
| `rel=expect` 讓第一次繪製等到主區結尾，超長筆記在慢速網路下首屏變晚 | 靜態 HTML 通常一次到齊；Phase 0 量 FCP 前後對照，變差就改回 handoff 的 `#nc-hd` 方案（layout 與 bare island 各加 id） |
| 預繪層與 island 外觀不一致（字重、溢出遮罩） | 預繪沿用同一組 class；Task 110 截圖對照 hydrate 前後 |
| inline script 內嵌 `Function.toString()`，打包或壓縮改變函式本體 | 原始碼來自 `.ts` 經 Vite 轉換後的字串；`check:wb` 斷言重建後行為相同 |
| `view-transition-name` 重複（預繪與 island 都有 `.nt-ind`）導致整個轉場被跳過 | §6.3 同 commit 移除；dev 下 `pagereveal` 偵測 `viewTransition` 被 skip 時 console.warn |

---

## 21. 定案紀錄

2026-10-02 與作者逐題確認，全部採建議選項：

| 題號 | 定案 | 影響章節 |
| :-- | :-- | :-- |
| Q1 | A 島外預繪層 | §5.3、§6 |
| Q2 | A Google Fonts 改非阻塞 | §4.2、§4.3 |
| Q3 | A 先盤點（hydrate 前後高度差 > 8px）再包 `VizIsland`；`h` 由 component-generator 量測、mdx-writer 寫回 | §9 |
| Q4 | A 捲動還原提前到 inline script | §7 |
| Q5 | A 做舊頁進度線 | §11 |

## 22. 實作後回填

### Phase 0 量測（Task 109，2026-10-02）

`astro build && astro preview`，Playwright 驅動本機 Chrome（headless；Browser pane 隱藏時不繪製，量不到 paint）。「Fast 4G」= CDP 節流 RTT 150ms、下行 4 Mbps；冷啟動停用快取。單位 ms，取兩次的代表值。

| 情境 | 改前 FCP | 改後 FCP（字型非阻塞） | 頁籤列出現 | 備註 |
| :-- | --: | --: | --: | :-- |
| 冷啟動 `/`，Fast 4G | 712 | ≈ 410–460 | —（非頁籤頁） | 改前 Google Fonts CSS 阻塞到 633ms，`_astro/*.css` 在 379ms 就到了 |
| 冷啟動長筆記（230 KB），Fast 4G | 368 | ≈ 390 | 1266–1440 | 頁籤列比內容晚約 **0.9–1 秒** |
| 切換筆記（快取），Fast 4G | 392 | ≈ 405 | 1164–1318 | 同上 |
| 切換筆記，無節流 | 204 | ≈ 230 | 216–240 | 本機幾乎同時 |
| 冷啟動，無節流，封鎖 Google Fonts 對照 | 176–272 → 64–116 | | | 字型 CSS 本身約多 100–200ms |

結論（對照 §2）：

- **#1 成立**：Google Fonts 是第一次進站最大的阻塞來源，非阻塞後冷啟動 FCP 少約 250ms
- **#2 不明顯**：兩支 `_astro/*.css` 在 Fast 4G 也比字型 CSS 早到
- **#3**：切換筆記時 Chrome 的 paint holding 讓舊頁停留到新頁第一次繪製，**沒有白屏**；「空白」主要是 #4
- **#4 成立，而且是換頁時最明顯的空白**：頁籤列在節流下比內容晚 0.9 秒以上 → Task 110 的預繪是重點
- **#5–#7** 未在此量測，見 Task 110／111
- HTML 在 Fast 4G 下 190–290ms 內就完整到達，主區骨架在一般網路下不太會出現（符合 §8.1 的預期）

### 實作中新增的決定

- **`@view-transition` 必須寫在 head 的 inline `<style>`**（Task 109）：只寫在外部樣式表時，新頁很快就緒（約 40ms 內，Dashboard、`/notes`、`/plugins`、`/settings`、`/tags`、資料檔頁）的導覽會被 Chrome 以「Transition was aborted because of invalid state. ViewTransition opt-in disabled」中止，筆記頁（約 100ms）才正常。改成 inline 後全部正常。`workbench.css` 保留同一條規則，由 critical CSS 斷言確認兩邊一致
- **`.nc-main-pane` 不設 `position`**（Task 109）：設了之後 `/notes` 的 Drawer（absolute）改以它為定位基準，變成從頁籤列下方開始，與原本「從頂端蓋住頁籤列」不同。改成不設 position；Drawer 開著時以 `:has(.wb-drawer)` 給 `z-index:7`（view-transition-name 讓它成為 stacking context，否則會在頁籤列〔4〕與漢堡鈕〔6〕之下）。進度線改成主區第一個子元素、`position:relative` + `margin-bottom:-2px`，不佔高度
- **`rel=expect` 移到 Task 110 再評估**：先放 `#nc-pane-end` 量到切換筆記的 FCP 在 Fast 4G 晚約 135ms（405 → 540），超過 §20 的 50ms 門檻
- **`rel=expect` 只在需要還原捲動時才加**（Task 110）：頁籤預繪不需要它（實測預繪 script 一定早於第一次繪製）；只有目前頁有捲動位置要還原、且無 hash 時，head 的 inline script 以 `document.write` 加上 `#nc-pane-end`，其餘頁面不付約 130ms 的成本
- **預繪層的保險**（Task 110）：不是固定 4 秒移除，而是 island 已 hydrate 卻還在時 1 秒後移除；JS 失敗時保留（連結仍可用）
- **生成元件高度盤點**（Task 111，`scripts/fixtures/viz-height-audit.mjs`，1400／375 兩種寬度、共 142 個）：一般設定下只有 `proposal-summary` 超過 8px（1400 寬 +42），原因是流程卡片寫成 `pipelineInView && <StageCard/>`，SSR 時那一列是空的。**改元件本身**（卡片一律 render，只把進場動畫綁在 `useInView`）後為 0 個
- **不做 `VizIsland`**（Task 111）：修完上面那支之後沒有任何元件需要預留高度；而且同一支元件在不同寬度的差距不同（+42／+157），單一個 `h` 本來就處理不了；handoff 的包法還會讓子元件不被 hydrate（§9.2）。改成在 content-visualize skill 與 component-generator 加一條規則：SSR 要輸出最終高度、不要用 `inView &&`／`mounted &&` 讓內容晚出現、`useReducedMotion()` 只切動畫參數不切內容
- 已知限制：`pm-change-request`、`pm-learning-map`、`proposal-summary`（375 寬）在**減少動態**時會刻意改成全部展開，高度與 SSR 不同。伺服器端無法得知偏好，屬於元件的設計取捨，不改
- **critical CSS 只放 `@view-transition`**（Task 111）：骨架規則都在 render-blocking 的 `workbench.css`，在它載入前什麼都不會畫，inline 一份沒有效果。`scripts/checks/wb-critical-css.mjs` 斷言 inline 規則與 `workbench.css` 一字不差
- **內容不做 200ms 淡入**（Task 111）：handoff 的 `.nc-content` 淡入在每次載入都會播（骨架多半根本沒出現），還會和主區轉場疊加成兩次淡入
- **骨架外層不用 `.wb-host` class**（Task 111）：`Toc.tsx` 以 `querySelector(".wb-host")` 量主區寬度，骨架排在前面會先被找到（`display:none`，寬 0），目錄被誤判成窄版而收合。改用 `.nc-sk-host`（同內距、同 container 名稱）
- **`.nc-body-wrap` 是 `display:contents`**（Task 111）：資料檔頁的舞台靠 `min-height:100%`，多一層盒子會壞；`:has()` 看的是 DOM，不受影響
- **`/notes` 首屏骨架用 Body 的 `::before`**（Task 111）：Body 由 island 輸出，layout 插不進 DOM。每 38px 一列的底線與三段條以漸層畫出（條的兩端是直角）；Toolbar 照舊隱藏、不畫骨架
- 「—」淡入的位置（Task 111）：Dashboard KPI 數字與閱讀狀態圖例、頻率圖 Y 軸、月曆標題與底部計數。列表的 `.wb-row-d` 是絕對日期，SSR 就是真值，不需要
- 預先存在、與本批無關的問題：`/tags` 每次載入有 React hydration 錯誤（#418／#425／#423），`main` 上同樣存在，另開工作處理

