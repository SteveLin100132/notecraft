# Task 109 — Loading 與轉場地基：量測、字型非阻塞、主區包裝、跨文件轉場、進度線

> 規格 [notecraft-workbench-loading-transitions.md](../notecraft-workbench-loading-transitions.md) §2、§4、§5（§5.3 除外）、§11、§12、§13、§17；Q2、Q5 定案（§21）。
> 設計交付 [design_handoff_loading_transitions](../prototype/design_handoff_loading_transitions/) README「時序模型」「E. 切換筆記的轉場」「F. 其他頁面」「Reduced motion」「Design Tokens」；樣式來源 `nc-loading.css`，行為來源 `reference/nc-vt.js`。
> 無前置依賴，**本批第一個做**；Task 110、111、112 都靠它。

## 為什麼要有這一步

使用者說的「空白」有好幾個來源（規格 §2 表），沒量就動手，很可能把力氣花在骨架上，結果骨架在正式環境根本看不到。所以先量，再把確定有效的兩件事做掉：Google Fonts 不再阻塞第一次繪製，換頁時主區淡入、殼不動。

主區包裝（`.nc-main-pane`）與轉場 type 分類是後面三個 Task 的共同地基：頁籤指示器、捲動還原、骨架都掛在這個結構上。

## 範圍

### 1. Phase 0 量測（先做，結果回填規格 §22）

- `npx astro build && npx astro preview`，Chrome DevTools Performance：
  - 「第一次進站」：停用快取、Fast 4G，開 `/` 與一篇長筆記（`dist/notes/` 最大的那篇）各一次
  - 「切換筆記」：啟用快取、無節流，從筆記 A 點頁籤到筆記 B；再用 Fast 4G 錄一次
- 每次記下：FCP、LCP、Google Fonts CSS 的阻塞時間、`_astro/*.css` 的阻塞時間、HTML 下載完成時間、頁籤列出現的時間點（`TabStrip` 第一次畫出頁籤）、Sidebar 系列進度從 `0/N` 變成真值的時間點
- `astro dev` 下錄一次「切換筆記」對照
- 量完在規格 §22 寫一張表，並判斷規格 §2 的 #1–#8 哪些成立。**若結論和規格假設差很多**（例如主因其實是 dev 的 Vite 載入），先停下來跟作者確認後續 Task 的優先順序

### 2. Google Fonts 非阻塞（Q2，規格 §4.3）

`WorkbenchLayout.astro` head：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href={FONTS} onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href={FONTS} /></noscript>
```

- `FONTS` 是現在那條 URL（含 `display=swap`），不改字重
- `PresentLayout.astro` 若也引用同一條 URL，同步改（簡報頁沒有骨架，但同樣受惠於不阻塞）
- 量一次改前改後的 FCP（同條件），填進規格 §22

### 3. Token 與樣式（規格 §12）

- `workbench.css` 開頭 `:root` 加規格 §12.1 的 17 個 token（`--wb-sk`…`--wb-rise-drill`），附一行註解指向規格
- 末段新增區塊 `/* ── Loading 與轉場（規格 docs/notecraft-workbench-loading-transitions.md）── */`，本 Task 只放：
  - `.nc-main-pane`、`.nc-main-pane>astro-island{display:contents}`
  - `@view-transition`、`::view-transition-*(root|nc-main)`、三種 type 的選擇器（`:active-view-transition-type(x)` 與 `html[data-nc-vt="x"]` 兩種都寫）、`@keyframes`（改名 `wbVtOut`／`wbVtIn`／`wbVtInDrill`／`wbVtFade`，避免與既有 `wbFade` 混淆前先 grep）
  - `.nc-progress` 與 `@keyframes`
  - `nc-drawer`／`nc-scrim` 命名（`@media(max-width:1100px)`，scrim 只在 `:not([hidden])`）
  - reduced-motion 區塊中與上述相關的規則
- 規則裡的 `--nc-*` 全換成 `--wb-*`；不搬 `.wb-dark`、`body.pt-*`、`html.nc-rm`、`.nc-boot`、`.nc-ghost`、`.nc-mid-*`、`nc-title`
- 既有 `.wb-drawer`、`.nt-sheet` 的 `cubic-bezier(.22,.7,.3,1)` 字面值改用 `var(--wb-ease)`

### 4. 主區包裝（規格 §4.1）

- `WorkbenchLayout.astro`：`.wb-main` 內 `TabBar`、`.wb-mburger`、`#nt-count-slot` 之後，把原本的 `bare ? <slot/> : (Header … Body)` 整段包進 `<div class="nc-main-pane">`，結尾加 `<i id="nc-pane-end" hidden></i>`
- `#nc-scroll` 位置與 class 不動
- 檢查每一種頁的排版不變：Dashboard（含 `?tab=calendar`）、`/notes` 四種 view、`/plugins`、`/plugins/folder/…`、`/settings`、`/series`、`/series/<id>`、`/tags`、筆記頁、`/view/…`（ER、OpenAPI）
- **stacking context 檢查**（規格 §20）：在筆記頁打開 `MoreMenu`、`VizZoom`、DeckAction 的選單；在 `/notes` 打開 Drawer；確認都不被頁籤列（z-index 4）或 Sidebar 蓋住。被蓋的列進本 Task 實作記錄並修（優先 portal 到 body）

### 5. `src/lib/wb-nav.ts`（新增，純函式，規格 §5.2）

```ts
export type NavKind = "hub" | "leaf" | "none";
export type VtType = "peer" | "drill" | "section";
export function navKind(pathname: string, base: string): NavKind;
export function vtType(from: string | null, to: string, base: string): VtType | null;
```

- 去 `base` 前綴、去尾斜線、`decodeURI`（失敗就用原字串）後比對；路由表照規格 §5.2
- **兩個函式必須自足**：不引用模組內其他識別碼（`vtType` 內部要自己帶一份 `navKind` 的邏輯，或把 `navKind` 寫成 `vtType` 的內部函式再另外匯出一個薄包裝）—— 它們會以 `toString()` 內嵌進 inline script
- 只能 `import type`、無 JSX、不碰 `window`

### 6. `scripts/checks/wb-nav.mjs`（新增）

比照 `wb-tabs.mjs` 骨架；`package.json` 的 `check:wb` 串上它。

| 斷言 | 內容 |
| --- | --- |
| hub | `/`、`/notes`、`/notes/`、`/plugins`、`/plugins/folder/api`、`/settings`、`/series`、`/series/rr`、`/tags` |
| leaf | `/notes/a/b`、`/notes/%E4%B8%AD%E6%96%87`（CJK 編碼）、`/view/api/orders.openapi` |
| none | `/present/x`、`/wb-index.json`、`/foo` |
| BASE | base `/notecraft/demo`：`/notecraft/demo/notes/x` → leaf；`/notecraft/demo` → hub；不帶前綴的 `/notes/x` 仍判得出（冪等，與 `stripBase` 一致） |
| vtType | hub→leaf `drill`；leaf→leaf `peer`；leaf→hub、hub→hub `section`；任一端 none → `null`；`from` 為 `null` → `null` |
| 可內嵌 | `new Function("return " + vtType.toString())()` 重建後，對上面所有輸入結果相同 |

### 7. 轉場與進度線的 inline script（規格 §5.2、§5.4、§5.5、§11）

layout head 加一支 `<script is:inline define:vars={{ base: BASE }}>`，內容由 `reference/nc-vt.js` 改寫：

- 開頭 `var vtType = (${vtType.toString()});`（layout frontmatter 以 `set:html` 組字串；或 `define:vars` 傳字串後 `new Function`，擇一並在實作記錄說明）
- `pagereveal`：無 `e.viewTransition` 直接 return；`reload` → `skipTransition()`；來源 = `navigation?.activation?.from?.url ?? document.referrer`；`vtType(from, location.href, base)` 為 `null` → `skipTransition()`；否則 `types.add(type)`（有 `types` 時）並設 `<html data-nc-vt>`，`finished` 後刪除
- click capture：條件照 `nc-vt.js`，另排除 `vscode:`、`a.protocol` 非 http(s)；插入 `.nc-progress` 到 `.nc-main-pane`；若 `body.wb-sb-open` 且連結在 `#wb-sb` 內 → 移除 `wb-sb-open`（不是 `.wb-sb.open`）並同步 scrim 的 `hidden` 與 `#wb-mburger` 的 `aria-expanded`（對照 `SidebarLive` 的關閉函式，邏輯要一致）
- `pageswap`、`pageshow(persisted)` 清進度線
- 不加 `<link rel="expect">`：它要等 Task 110 頁籤預繪與捲動還原就位後才有意義（規格 §4.4），在 Task 110 加

## 要改的既有檔案

`src/layouts/WorkbenchLayout.astro`、`src/layouts/PresentLayout.astro`（若引用字型）、`src/styles/workbench.css`、`package.json`（`check:wb`）。新增 `src/lib/wb-nav.ts`、`scripts/checks/wb-nav.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 量測 | — | 完成 §1 | 規格 §22 有量測表與結論 |
| 斷言 | — | `npm run check:wb` | 四支（dashboard、calendar、tabs、nav）都綠 |
| 純度 | — | `grep -n "^import" src/lib/wb-nav.ts` | 只有 `import type`（或無） |
| 字型 | Chrome，停用快取 | 開首頁 | Network 中 Google Fonts CSS 不在 render-blocking；第一次繪製用系統字型，之後換成 Noto Sans TC |
| peer | `astro preview`，Chrome 126+ | 筆記 A → 頁籤上的筆記 B | Rail、Sidebar、頁籤列不動；主區舊內容 120ms 淡出、新內容 240ms 淡入上移 4px |
| drill | 同上 | `/notes` 點一篇 | 新內容 280ms、上移 8px |
| section | 同上 | 筆記 → Rail 的 Dashboard | 純淡入 200ms、無位移 |
| reload | 同上 | 筆記頁按 ⌘R | 無轉場 |
| Present | 同上 | 筆記 → 簡報 | 無轉場（Present 頁不 opt-in） |
| Firefox | Firefox | 同 peer | 與現況相同（直接整頁切換），無 console 錯誤 |
| reduced motion | DevTools 模擬 `prefers-reduced-motion: reduce` | 同 peer | 主區只有 100ms linear 淡入；進度線靜態 |
| 進度線 | DevTools 節流 Slow 4G | 點另一篇筆記 | 約 150ms 後主區頂端出現 2px 藍線；新頁出現後消失；按上一頁（bfcache）回來沒有殘留 |
| 抽屜 | 視窗 1000px | 開 Sidebar 抽屜點一篇筆記 | 抽屜立刻開始滑出，不是新頁出現後才關 |
| BASE | `NOTECRAFT_BASE=/notecraft/demo npx astro build && npx astro preview` | 同 peer／drill | type 判斷正確 |
| 排版 | 所有頁（§4 的清單） | 1400／1000／375 寬 | 與 `main` 截圖對照無差異 |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

無。
