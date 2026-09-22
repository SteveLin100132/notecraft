# Task 59 — 工作台樣式地基：`workbench.css`、token、圖示、Logo

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §7（樣式與 token）、§4.5（z-index）、Q28 定案；
> 設計交付 [design_handoff_workbench](../prototype/design_handoff_workbench/) README §3–§4、§8、§9，
> 視覺定稿以 `prototype/wb/pt.css` 為準。
> 對應實作階段 **P1**。無前置依賴，**本批第一個做**。

## 為什麼要有這一步

後面 16 個 Task 全部共用同一套 class（`.wb-row`、`.wb-pill`、`.wb-gh`…）。先把樣式一次移植完、
用一張樣式頁對照 prototype 驗過，之後各頁只管結構與資料，不必邊做邊補 CSS。

## 範圍

### 1. `src/styles/workbench.css`（新增）

把 `prototype/wb/pt.css`（441 行）移植過來，README §2 要求像素級重現，**數值不要自行調整**。但做四件事：

| 要做的事 | 說明 |
| --- | --- |
| **token 區塊放最前面** | 見下方 §2。樣式規則裡**不出現任何 hex 或裸 `rgba()`**，一律引用 token（CLAUDE.md「不硬編碼色碼」） |
| **13px 基準不外洩** | `font-size:13px` 只寫在 `.wb-app` 與 `.wb-pal`（Palette 掛在 `.wb-app` 之外）。不碰 `html`／`body`；`.nc-prose` 用 `rem`，不受影響 |
| **刪掉只為原型預覽存在的規則** | `.wb-dark` 整段；`body.pt-mobile`（49 條）、`body.pt-tablet`（10 條）、`body.pt-desktop`（3 條）。響應式只留 `@media`。刪之前逐條確認對應的 `@media` 規則確實存在且等價 —— `pt-mobile` 那批有些規則**只**寫在 body class 版本裡，要搬進 `@media(max-width:860px)` |
| **`.wb-viewhost header{display:none}` 不搬** | 那是 prototype 用來藏舊元件 header 的 hack；正式版的舊 header 由 [Task 72](task-72-view-page-header.md) 直接移除 |

由 `WorkbenchLayout`（[Task 61](task-61-workbench-shell.md)）匯入；本 Task 先由樣式頁匯入。

### 2. token

`workbench.css` 開頭的 `:root` 區塊。**能對映 DS 的一律用 `var()` 指過去**，對映表見規格 §7.2：

```css
:root {
  /* 對映 TrendLink DS */
  --wb-blue: var(--blue-700);   --wb-blue-d: var(--blue-800);   --wb-blue-l: var(--blue-500);
  --wb-gold: var(--orange-400); --wb-gold-h: var(--orange-500);
  --wb-bg: var(--neutral-50);   --wb-panel: var(--neutral-0);
  --wb-line: var(--neutral-200); --wb-line-2: var(--neutral-100);
  --wb-ink: var(--neutral-900); --wb-ink-3: var(--neutral-500); --wb-rail: var(--neutral-900);
  --wb-ok: var(--success-500);  --wb-warn: var(--warning-500);  --wb-danger: var(--danger-500);

  /* 工作台專用、DS 無對應（Q28 定案：照 prototype 原值） */
  --wb-ink-2: #2b3546;          /* 次要文字 */
  --wb-mute: #8b9aad;           /* 根目錄群組 */
  --wb-warn-ink: #8a6412;       /* warn pill 文字；DS 的 --warning-700 是 #9a6600，不採用 */
  --wb-ok-ink: #1f7350;         /* ok pill 文字 */
  --wb-danger-ink: #c0392f;     /* danger pill 文字 */
  --wb-rail-ic: #8b98ab;        /* Rail 圖示 */
  --wb-rail-ic-hover: #dfe5ee;
}
```

半透明色（pill 底、hover 底、選取底、scrim、陰影）同樣收成 token，命名 `--wb-a-<用途>`，
例如 `--wb-a-blue-10: rgba(27,79,156,.1)`。`pt.css` 裡實際出現的 rgba 值先用 grep 列清單再命名，
不要憑印象。

z-index 也收成 token（規格 §4.5）：`--wb-z-sidebar:500`、`--wb-z-drawer:600`、`--wb-z-tabbar:650`；
900（`VizZoom`）與 1000（Modal／Toast／Palette）沿用既有值。

### 3. 圖示

- **`.astro` 靜態區塊**用既有 [Icon.astro](../../src/components/Icon.astro)。缺的補進去：
  `home`、`settings`、`arrowLeft`、`presentation`、`filter`、`more`（水平三點）。
  既有的 `search`、`sparkle`、`plug`、`folder`、`chevronRight`、`layers`、`notes`（=file-text）、`plus`、`x`、`tag`、`arrowRight` 直接用
- **React island** 直接 `import { … } from "lucide-react"`（白名單內）
- prototype 的 `PT_ICONS` 是 24 grid／1.7 stroke；lucide 預設 2。統一傳 `strokeWidth={1.7}`，
  在 `src/components/wb/ui.tsx` 包一個 `<Ic>` 讓 17px／1.7 成為預設值

### 4. Logo

`src/components/wb/Logo.astro`：照 `prototype/wb/pt-shell.jsx` 的 `NcLogo` —— 藍底圓角方形（rx 9）+ 金色四芒星 + 兩條白線，
接受 `size` prop（Rail 28、平板／手機的 Sidebar 頭 30）。填色用 token。

favicon：專案目前**沒有** favicon（`public/` 只有 `downloads/`）。新增 `public/favicon.svg`（同款），
`<link rel="icon">` 由 Task 61 的 layout 加。

### 5. 共用 React 小元件 `src/components/wb/ui.tsx`

純展示、無 state，後面各頁共用：`Pill`（tone: default／ok／warn／muted／danger）、`TagChips`（最多 N 個 + `+N`）、
`GroupHeader`、`StatStrip`、`Progress`、`MiniButton`、`Seg`（segmented）、`Switch`、`Ic`。
props 形狀照 `prototype/wb/pt-views.jsx`、`pt-views2.jsx` 的同名元件，全部 TypeScript、無 required props 以外的 `any`。

### 6. `package.json` 的 `files`

本批新增的元件放在 **`src/components/wb/`**。現有 `files` 只涵蓋 `src/components/*.astro`（頂層）、
`islands/`、`deck/`，**不含子目錄 `wb/`** —— 現在就補一條 `"src/components/wb/"`，
否則發佈到 npm 後 viewer 缺檔。[Task 75](task-75-cleanup-docs-release.md) 會用 `npm pack --dry-run` 再驗一次。

### 7. 樣式頁（僅 dev）

`src/pages/dev/[wb].astro`，`getStaticPaths()` 在 `import.meta.env.DEV` 為 false 時回傳空陣列，
**正式 build 不產生這一頁**。內容：把 §4 資料列語彙的每個元件、每個 pill 變體、三種按鈕、segmented、chip、
搜尋框、Switch、stat strip、progress 各擺一個，用來與 `NoteCraft-Workbench-standalone.html` 並排比對。

## 要改的既有檔案

`src/components/Icon.astro`（加 6 個圖示）、`package.json`（`files`）。其餘皆新增。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 沒有硬編碼色碼 | `workbench.css` | `grep -nE "#[0-9a-fA-F]{3,8}\|rgba?\(" ` 排除 `:root` 區塊 | 0 筆 |
| 原型專用規則已清 | 同上 | grep `pt-mobile\|pt-tablet\|pt-desktop\|wb-dark` | 0 筆 |
| 基準字級不外洩 | 任一筆記頁 | 量 `.nc-prose` 的 computed font-size | 與改動前相同 |
| 視覺對得上 | dev 樣式頁與 standalone prototype 並排 | 逐項比對列高 38、pill 高 20、按鈕高 30、chip 高 26、Switch 38×22 | 數值一致 |
| 正式 build 無樣式頁 | `astro build` | 檢查 `dist/dev/` | 不存在 |
| 發佈不缺檔 | `npm pack --dry-run` | 找 `src/components/wb/` | 檔案在清單內 |

## 依賴

無。

## 注意

- `pt.css` 裡有幾處 `!important`（widget 的 `grid-column`）是為了蓋過 inline style。
  正式版 widget 的 span 用 class 不用 inline style，這些 `!important` 應該可以拿掉 —— 拿掉後以樣式頁確認
- 不要順手「整理」prototype 的 class 命名。後面每個 Task 都會拿 prototype 原始碼對照，名稱一改就對不上

## 實作記錄（2026-09-22）

`workbench.css` 由 `pt.css` 以腳本逐行移植：先 grep 出全部 21 個 rgba 與 9 個 hex 命名成 token 再替換，
`body.pt-*` 規則逐條與 `@media` 版比對後刪除（只有 `.wb-sb-ws-mark{display:flex}` 是 body class 版獨有，已搬進 `@media(max-width:1100px)`）。

- 規格 §8.2.1 的列結構（`.wb-row-main`／`.wb-row-open`）、系列 accent 與 `--gc` 具名色、z-index token 是 prototype 沒有的，補在檔尾並註明
- widget 的 `!important` 全拿掉，span 改用 `.wb-span-N` class
- 樣式頁 `/dev/wb` 實測：列 38、pill 20、按鈕 30、chip 26、Switch 38×22，與 prototype 一致
- 順手加 `public/favicon.svg` 進 `package.json` 的 `files`
