# Task 61 — 三欄殼：`WorkbenchLayout`、Rail、Sidebar、Header，全站換殼

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §4（全節）、§6（Rail 高亮規則）、§2.1；Q1、Q30 定案。
> 設計交付 README §3（外殼）；原始碼 `prototype/wb/pt-shell.jsx`（`PtRail`／`PtSidebar`／`PtHeader`）。
> 依賴 [Task 59](task-59-workbench-style-foundation.md)、[Task 60](task-60-workbench-index.md)。
> 對應實作階段 **P3**。**這是本批唯一必須全站同時切換的一步。**

## 為什麼這樣切

`BaseLayout.astro` 被 9 個頁面共用，無法半新半舊。所以本 Task 的目標刻意訂得很窄：
**殼換掉、各頁內容原樣搬進來、功能零退化**。各頁的改版留給後面的 Task。
出問題時才分得清是殼的問題還是頁面的問題。

## 範圍

### 1. `src/layouts/WorkbenchLayout.astro`（新增，取代 `BaseLayout.astro`）

props 與 slot 照規格 §4.2：

| 名稱 | 型別 | 說明 |
| --- | --- | --- |
| `title` | `string` | `<title>` 與頁首 `h1` |
| `description?` | `string` | `<meta name="description">` |
| `rail` | `"dashboard" \| "ai" \| "plugins" \| "settings" \| ""` | Rail 靜態高亮；`ai` 由 client 依 `?pending=1` 補判 |
| `crumbs` | `{ label: string; href?: string }[]` | 麵包屑 |
| `pills?` | `{ label: string; tone?: PillTone; href?: string }[]` | 標題旁的 pill |
| `back?` | `string` | 有值才顯示返回鍵 |
| `flush?` | `boolean` | Body 無 padding、白底（取代舊的 `bleed`） |
| `noHeader?` | `boolean` | 頁首由頁內 island 自己渲染時設為 true（`/notes`、Dashboard、`/plugins`） |
| slot `actions`／`tabs`／`toolbar` | | 靜態頁用 |

骨架（對應 README §3.1）：

```
<div class="wb-app">
  <Rail />  <Sidebar />
  <div class="wb-main">
    {!noHeader && <Header … />}
    <slot name="toolbar" />
    <div id="nc-scroll" class:list={["wb-body", { flush }]}><slot /></div>
  </div>
</div>
<ToastHost client:idle />
{isDev && <NewNoteModal client:idle />}
```

- `html, body { height:100% }`、`.wb-app { height:100%; overflow:hidden }` —— **整頁不捲動**，只有 Body、Sidebar 內部捲動
- **`id="nc-scroll"` 刻意保留**在新的捲動容器上。`Toc.tsx`（2 處）與 `notes/[...slug].astro` 的 inline script（2 處）靠它找捲動容器
- 匯入 `global.css` 與 `workbench.css`；加 `<link rel="icon" href="/favicon.svg">`
- Palette 由 [Task 65](task-65-command-palette.md) 加進來；本 Task 先讓 Rail 搜尋鈕 dispatch `nc-open-palette`，沒人接也不會壞

### 2. `src/components/wb/Rail.astro`

README §3.2。5 個按鈕：儀表板 `/`、搜尋（`<button>`，dispatch `nc-open-palette`）、AI 標記佇列 `/notes?pending=1`、
Plugin `/plugins`、設定 `/settings`。待生成 > 0 時 AI 鈕右上 6px 黃點。
`/plugins` 與 `/settings` 本 Task 還不存在 —— 先分別連到現有的 `/view` 與 `/about`，由 Task 70、73 改回來。

### 3. `src/components/wb/Sidebar.astro` + `SidebarLive.tsx`

README §3.3。四個區段順序固定：資料夾／系列／Plugin 資料檔／其他。

**靜態 `.astro` 畫的**（build 期全知道）：工作區頭（`workspaceLabel`）、資料夾樹（遞迴、不限層數，子層每層縮排 +14px）、
系列名稱與 swatch、資料檔夾、標籤數、底部「待生成標記」卡片。

| 連結 | 目的地 |
| --- | --- |
| 全部筆記 | `/notes` |
| 資料夾 | `/notes?folder=<真實路徑>`（`encodeURIComponent`） |
| 系列 | `/series/<id>` |
| 全部資料檔／資料檔夾 | 本 Task 先連 `/view`；Task 70 改為 `/plugins`、`/plugins/folder/<dir>` |
| 標籤 | `/tags` |
| 查看佇列 → | `/notes?pending=1` |

**資料夾一律用 `--wb-blue-l`，根目錄用 `--wb-mute`**（Q6 定案不分色）。系列 swatch 依 `accent` 取色。
專案沒有系列／沒有資料檔時，對應區段整段不渲染。

**小 island `SidebarLive.tsx`**（`client:idle`）只負責三件靠 client 才知道的事：

1. 系列的迷你進度條與 `done/total`（`seriesProgress()` 讀 localStorage；SSR 以 `live=false` 輸出）
2. 依 `location` 標出目前項目（`?folder=`、`/series/<id>`、`/tags`…）。靜態站 build 期看不到 query
3. 平板／手機的抽屜開合（漢堡鈕、scrim、`Escape`）—— 先做出開合，細節留給 [Task 74](task-74-responsive-a11y.md)

island 以 DOM 查詢去增強靜態 HTML（加 class、填寬度），**不重新渲染整棵樹**。

### 4. 跨頁狀態（規格 §4.4）

`<head>` 的 pre-paint inline script，於首次繪製前執行：

- 讀 `localStorage["nc-wb-sidebar-v1"]`（展開的資料夾路徑陣列）寫到 `<html data-wb-open="…">`，CSS 依此決定子樹顯示，避免重整閃動
- 還原 Sidebar 捲動位置（`sessionStorage`）
- **移除**舊的 `nc:sidebar`／`data-sidebar`／`data-drawer` 邏輯：新 Sidebar 沒有「細條」模式

預設展開：第一層全部收合，但目前所在資料夾的祖先鏈展開。

### 5. `src/components/wb/Header.astro`

README §3.4：麵包屑、返回鍵、`h1`（單行省略，`title` 屬性帶全文）、pill、右側 `actions` slot、`tabs` slot（連結型 Tab，>1 個才顯示）。
另在 `src/components/wb/WbHeader.tsx` 做一份 **React 版**，給 island 頁用。兩份共用 `workbench.css` 的 class，DOM 結構必須一致。

### 6. 「＋ 新增筆記」

dev-only、gold 按鈕。現行 `NewNoteModal` 靠 `document.getElementById("nc-new-note")` 綁 click ——
island 渲染的頁首裡，按鈕可能**晚於** Modal 的 effect 才掛載，會綁不到。改為 Modal 監聽 `window` 的 `nc-open-new-note` 事件，
按鈕（不論 `.astro` 或 React）都只 dispatch 事件。`NewNoteModal` 從各頁移到 layout，全站只掛一次。

### 7. 九個頁面原樣搬家

`index`、`notes/index`、`notes/[...slug]`、`series/index`、`series/[id]`、`tags`、`view/index`、`view/[...path]`、`about`：

- `BaseLayout` → `WorkbenchLayout`，傳入 `crumbs`／`title`／`pills`
- 頁內的 `<PageHead>` 移除（標題已在頁首）；其 `sub` 文字放進 `toolbar` slot 的 `.wb-tb-lbl`；`action` slot 的按鈕移到 `actions` slot
- 頁內 island 與內容**一律不動**，包在 `<div class="wb-host">` 裡維持原本的閱讀寬度
- `view/[...path]` 原本的 `bleed` → `flush`

完成後刪除 `BaseLayout.astro`、`Sidebar.astro`、`PageHead.astro`。

### 8. `Escape` 的關閉順序

規格 §4.5：Palette → Modal → Drawer → Sidebar 抽屜。現階段只有 Modal 與抽屜；先建立
`src/lib/wb-escape.ts`（一個簡單的堆疊：`push(close)` 回傳 `pop`），之後各浮層都走它，不要各自掛 `keydown`。

## 要改的既有檔案

9 個頁面、`NewNoteModal.tsx`（觸發方式）。刪除 `BaseLayout.astro`、`Sidebar.astro`、`PageHead.astro`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 整頁不捲動 | 任一長頁 | 捲動 | 只有 `#nc-scroll` 在捲；Rail、Sidebar、頁首固定 |
| 目錄仍會跟著亮 | 有 TOC 的筆記 | 在內文捲動 | TOC 的 scroll spy 正常、點項目會捲到該節 |
| 放大檢視正常 | 含 `GeneratedFrame` 的筆記 | 點放大 | `VizZoom` 蓋過 Rail 與 Sidebar、關閉後還原 |
| `client:visible` 會觸發 | 筆記頁捲到文末 | — | `DonePrompt`、`SeriesNav` 正常 hydrate（捲動容器換了，IntersectionObserver 仍要有效） |
| Sidebar 不閃 | 展開某資料夾後換頁 | 重整 | 首次繪製就是展開狀態 |
| 目前項目會亮 | 開 `/notes?folder=private` | — | Sidebar 的 `private` 為 active；Rail 不高亮 |
| AI 佇列亮 Rail | 開 `/notes?pending=1` | — | Rail 的 sparkle 為 active |
| 新增筆記 | dev | 在任一頁按「＋ 新增筆記」 | Modal 開啟；建立後導到新筆記 |
| 正式環境 | `astro build` | 檢查任一頁 HTML | 沒有新增筆記按鈕、沒有 `NewNoteModal` |
| 簡報不受影響 | `/present/<slug>` | — | 仍是全螢幕、沒有三欄殼 |
| 既有功能零退化 | 逐頁走一遍 | 標籤編輯、收藏、刪除筆記、系列進度、資料檔渲染 | 全部照舊 |

完成後跑 `npx tsc --noEmit && npx astro build`。

## 依賴

Task 59、Task 60。

## 注意

- **驗畫面前先確認 Browser pane 是可見的**。pane 隱藏時 `client:visible` 的 island 全部不會 hydrate，很容易誤判成殼把功能弄壞了
- 本 Task 結束時畫面會是「新殼 + 舊卡片版面」，視覺不一致是預期中的中間態（Q30 定案：全部完成才併回 main）
- 筆記頁 TOC 的斷點現在是 1024，以視窗寬計。主區變窄了 292px，TOC 可能在不夠寬時就出現 —— 先不改，記下實際觀感，交給 [Task 74](task-74-responsive-a11y.md)

## 實作記錄（2026-09-22）

- 多了 `bare` 模式（頁首／Toolbar／Body 全由 island 輸出），比規格的 `noHeader` 更直白：island 必須自己輸出 `#nc-scroll.wb-body`；Task 68 再加 `bareBody`
- Sidebar 的展開狀態、目前項目高亮與捲動位置由**緊接在 Sidebar 後的 inline script** 做，不是 `<head>` 的 pre-paint script —— 要查 DOM 才能標，放 head 找不到節點；同步執行仍在首次繪製前
- Sidebar 的列是容器：caret 是 `<button aria-expanded>`、名稱是 `<a>`，兩個獨立的可聚焦元素（prototype 把 caret 塞在按鈕裡）
- `.wb-main>astro-island{display:contents}`：`bare` 頁的 island 外層 `<astro-island>` 不能成為 flex 子項，否則直向排版壞掉
- 回歸實測：TOC scroll spy、`client:visible` 的 `DonePrompt`／`SeriesNav`、`VizZoom` 全螢幕（蓋過 Rail 與 Sidebar）、新增筆記 Modal 皆正常；正式 build 26 頁無新增筆記按鈕、無 `NewNoteModal`、無絕對路徑
- `NewNoteModal` z-index 600 → 1000（與 Drawer 同層會被蓋）；`DeleteNoteButton` 的對話框同樣提到 1000
