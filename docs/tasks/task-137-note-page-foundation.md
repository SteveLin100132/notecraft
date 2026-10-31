# Task 137 — 基礎：版面、主題 class、`--md-fs`、偏好與預繪、設定頁、文內標頭

> 規格 [notecraft-workbench-note-page.md](../notecraft-workbench-note-page.md) §3、§4、§10；Q3、Q8、Q10 定案（§14）。
> 前置：無。Task 138–143 都靠它。

## 為什麼要有這一步

後面每個 Task 都要寫成「`.np-d`／`.np-o` 前綴 ＋ em 單位」的樣式。先把容器、主題 class、字級變數、偏好與預繪、頁面殼的版面搭好，後面只管元件外觀。

## 範圍

### 1. 版面（規格 §3.1）

- `[...slug].astro`：`.wb-host.nc-content > .nc-note-grid` 換成 `.np-page > article.md-art ＋ nav 目錄欄`
- 捲動容器 `#nc-scroll` 加 `flush np-scroll np-d`，SSR 一律品牌、倍率 1；`id="nc-scroll"` 不可拿掉
- `.np-page`：`padding 28px 40px 140px`（品牌 `padding-top 24px`）、grid `minmax(0,1fr) 220px` gap 48px、不限寬度；經典主題頁面背景 `--wb-bg`、品牌 `--wb-panel`
- 斷點**沿用 container query**（規格 §3.3），門檻在本 Task 先以 handoff 三種介面尺寸截圖對齊後定值；目錄欄寬與單欄切換的細節在 Task 143
- `NoteSkeleton` 換成新版面的骨架；骨架外層不用 `.wb-host` class（`Toc.tsx` 以它量寬度，Task 143 會改掉這個依賴）
- 頁內 `<style is:global>` 的版面、grid、目錄樣式搬到 `workbench.css`（目錄樣式可先原樣搬，Task 143 再改）

### 2. 文內標頭 `.md-head`（Q3、Q8）

- 順序：標籤（`TagEditor`，dev 編輯 UI 保留）→ `h1.md-h1` → `p.md-desc` → `.md-meta`
- 資訊列**照目前順序**保留「更新於」、`ReadingControl`、「被 N 篇引用」，並新增 handoff 的資料夾（資料夾色 icon）、閱讀時間（字數 ÷ 450 四捨五入，至少 1，build 期算）、系列「名稱 · n/N」（可點）；新欄位插入位置以截圖確認後寫回規格 §14 Q8
- 描述、資訊列改用 class，移除 inline style
- 殼 Header 的標題：筆記頁平常隱藏，**捲過 `.md-h1` 後淡入**（IntersectionObserver，root 是 `#nc-scroll`）；SSR 隱藏、`<noscript>` 顯示；reduced-motion 直接切換。頁籤標題與 `pagefindTitle` 不受影響

### 3. 主題與字級（規格 §4）

- `lib/wb-prefs.ts` 加 `noteTheme: "brand" | "classic"`（預設 brand）、`noteFontScale`（只接受 0.9／1／1.1／1.2／1.25，其他值退回 1）
- `lib/note-theme-prepaint.ts`（新增）：自足函式，`toString()` 內嵌在 `#nc-scroll` 開頭的 inline script，第一次繪製前換 `np-d`／`np-o` 並寫 `--md-fs`；必須在主區結尾的捲動還原之前執行
- 筆記頁監聽 `nc-prefs-changed` 與 `storage`，即時套用
- `--md-*` 變數依規格 §4.1；`--md-fs` 寫在捲動容器 style

### 4. 設定頁

`SettingsView` 的「筆記」區塊新增「頁面主題」（品牌（新）／經典（舊））與「字級」（5 段切換）。

### 5. 斷言

`scripts/checks/` 既有的 prepaint 自足斷言（`check:wb`）納入 `note-theme-prepaint.ts`；`wb-prefs` 的夾值各一例。

## 要改的既有檔案

`src/pages/notes/[...slug].astro`、`src/layouts/WorkbenchLayout.astro`（Header 標題 class）、`src/components/wb/Header.astro`、`src/components/wb/NoteSkeleton*`、`src/components/wb/SettingsView.tsx`、`src/lib/wb-prefs.ts`、`src/styles/workbench.css`、`scripts/checks/*`。新增 `src/lib/note-theme-prepaint.ts`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 預設 | 無偏好 | 開任一筆記 | 品牌版面、文內 H1、Header 標題隱藏 |
| 捲動 | 同上 | 捲過 H1 | Header 標題淡入；捲回隱藏 |
| 經典無閃爍 | 偏好 classic | 重新整理 | 第一次繪製即為 `np-o`、灰底 |
| 字級 | 設定 1.25 | 開筆記 | `--md-fs: 20px`；捲動還原位置正確 |
| 跨分頁 | 兩個分頁 | 設定頁切換主題 | 筆記分頁即時換主題 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check:wb` | 通過；tsc 錯誤數不增加 |

## 依賴

無。

## 實作記錄（2026-10-31）

- 版面改為 `.np-host`＞`.np-page`，門檻 900／720（container query）；頁首標題隱藏時連寬度一起收起；閱讀時間在 `lib/note-text.ts` 的 `readingMinutes`（CJK 字＋單字，程式碼與 import 不算）；預繪與 `wb-prefs` 的夾值由 `scripts/checks/note-theme-prepaint.mjs` 對照
- 詳見規格 §15
