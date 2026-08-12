# Handoff：視覺化元件「放大檢視」（Viz Zoom）

## Overview

筆記內文裡的 AI 生成互動元件（`src/components/generated/*.tsx`，由 `@ai-visualize` 標記生成）是為內文欄寬設計的，但有些元件內容量大 —— 並排雙欄結構圖、RACI 矩陣、寬表格 —— 在約 720px 的內文欄寬下會被擠壓、橫向溢出或需要在小框裡橫向捲動，讀起來很吃力。

這個功能替每個生成元件加上一個「放大檢視」入口：點下去進入**全螢幕覆蓋層**，元件被放進一塊**可拖曳平移、可縮放的藍圖畫布**（就是簡報 `full-visual` 版型那塊 `CanvasViewport`），並同時顯示元件的標題與說明文字，可匯出 PNG。元件本身的互動在放大後**完整保留**。

一次只檢視一個元件（不做上下切換 / 縮覽列）。

## About the Design Files

這個資料夾裡的檔案是**用 HTML/React 做的設計參考原型**，不是要直接搬進 production 的程式碼。任務是**在既有 codebase（Astro 5 + MDX + React island + TailwindCSS）的環境與慣例下重建這個設計**：用專案現有的元件、token、icon 方案，而不是複製這裡的 inline style。

`prototype.html` 可直接用瀏覽器開啟，請先跑一遍確認手感，再開始實作。

## Fidelity

**High-fidelity。** 顏色、字級、間距、圓角、動畫時間、互動細節都已定案，請照下面數值 1:1 重建（但一律換成 codebase 既有的 token / utility class）。

## 前置依賴

本功能建立在 `CanvasViewport` 之上。若專案尚未實作它，請先完成 `design_handoff_canvas_viewport/`（那份 handoff 是本功能的前置條件），本功能只是**新增一個呼叫端**，不應該修改 CanvasViewport 的行為。

本包附上 `CanvasViewport.jsx` 供對照，但**以 canvas_viewport handoff 的 README 為該元件的規格唯一來源**。

---

## Screens / Views

### 1. 內文圖框（Figure）— 觸發入口

**Purpose：** 讀者在內文中看到元件，知道「這個可以放大」。

**Layout：** 沿用既有 `Figure` 包裝（白底、1px `#e1e6ee` 邊框、`--radius-lg`、`0 2px 6px rgba(17,47,93,0.08)` 陰影、`overflow:hidden`，上下 margin 26px）。標題列高度由內容決定（padding `10px 16px`，下邊框 1px `#eef1f6`，底色 `#fbfcfe`）。

**新增元件：觸發按鈕**（`VizZoomButton`）
- 位置：標題列**最右側**，接在 `generated/<id>.tsx` 檔名膠囊之後，`margin-left: 12px`。常駐顯示（不是 hover 才浮現）。
- 尺寸：高 26px，padding `0 10px 0 8px`，`border-radius: 999px`。
- 內容：14px 展開 icon（`expand`，2.1px stroke）+ 文字「放大檢視」，`gap: 6px`。
- 文字：11.5px / 700 / `letter-spacing: 0` / `text-transform: none`（要**覆蓋**標題列的 uppercase + tracking，否則會被繼承）。
- 預設態：背景 `--neutral-0`、邊框 1px `--neutral-200`、文字 `--neutral-600`。
- Hover：背景 `--blue-50`、邊框 `--blue-300`、文字 `--blue-700`；transition `140ms var(--ease-out)`（background / color / border-color）。
- 無障礙：`aria-label="放大檢視"`、`title="放大檢視（可拖拉、可縮放）"`。

### 2. 放大檢視覆蓋層（VizZoomOverlay）

**Purpose：** 在最大可用面積下閱讀單一元件，能自由平移縮放，並讀到它的說明文字。

**Layout：** `position: fixed; inset: 0; z-index: 900`，透過 portal 掛在 `document.body`，底色 `--neutral-0`（**不透明、full-bleed，不是 modal，四周不留背景**）。垂直三段 flex column：

| 段 | 高度 | 說明 |
|---|---|---|
| 標題列 | 固定 **64px** | padding `0 20px 0 24px`，下邊框 1px `--neutral-200`，底色 `--neutral-0` |
| 畫布舞台 | `flex: 1 1 auto; min-height: 0` | padding **24px**，底色 `--neutral-50`，內容置中 |
| 說明列 | 內容高（約 78px） | padding `16px 28px 20px`，上邊框 1px `--neutral-200`，底色 `--neutral-0`；`caption` 為空時整段不渲染 |

**標題列由左至右：**
1. sparkle icon 18px，色 `--orange-500`
2. 元件類型（`kind`，例如「互動結構對照 · Interactive」）：16px / 800 / `--blue-700`
3. 檔名 `generated/<id>.tsx`：mono 12.5px / `--neutral-500`
4. `margin-left: auto` 後接右側群組，`gap: 8px`：
   - **操作提示膠囊**（靜態、非按鈕）：高 28px、padding `0 12px`、`border-radius: 999px`、底 `--neutral-100`、字 12.5px / 600 / `--neutral-500`；內容為 hand icon 14px +「拖曳平移」+ 半透明「·」+ mouse icon 14px +「滾輪縮放」
   - **匯出 PNG**：高 36px、padding `0 15px`、`border-radius: 999px`、邊框 1px `--neutral-200`、底 `--neutral-0`、字 13.5px / 700 / `--blue-700`；icon 16px。忙碌中文字改「匯出中…」、icon 換 spinner、文字色降為 `--neutral-500`、`cursor: default`、`disabled`
   - **關閉**：36×36 圓形、底 `--neutral-100`、無邊框、close icon 18px、色 `--neutral-700`；`title="關閉（Esc）"`、`aria-label="關閉"`

**畫布舞台：** 直接渲染 `CanvasViewport`，props：

```
content = 元件本身（與內文同一份 element）
natural = 880          // 紙張內容寬度（px）
w = window.innerWidth - 48
h = window.innerHeight - 64 - <說明列實際高度> - 48
mode = "play"          // 全螢幕情境：純滾輪即縮放，不需 ⌘/Ctrl
```

`w` / `h` 隨 `resize` 重算；說明列高度用 ref 量 `offsetHeight` 後回填（不要寫死 78）。`mode="play"` 讓純滾輪就能縮放 —— 覆蓋層背後沒有頁面捲動需要保護。`outerScale` 保持預設 1（覆蓋層沒有外層 transform scale）。

**說明列：** `caption` 文字，`max-width: 980px`、`margin: 0 auto`、14.5px / `line-height: 1.8` / `--neutral-700` / `text-wrap: pretty`。

**進場：** `animation: ncFade 180ms var(--ease-out)`（淡入，不做縮放彈跳）。

---

## Interactions & Behavior

- **開啟：** 點標題列「放大檢視」→ `zoom = true`。狀態屬於**單一 Figure**（每個圖框自己管自己的覆蓋層），不是全域 store。
- **關閉：** 點關閉鈕，或按 **Esc**。Esc 用 `window.addEventListener("keydown", handler, true)`（capture 階段）並 `stopPropagation`，避免同頁其他 Esc handler（簡報 / modal）搶走。
- **平移 / 縮放 / fit / 邊界遮罩 / 偏移提示徽章：** 全部由 `CanvasViewport` 既有行為提供，不要另外實作。重點提醒（詳見 canvas_viewport handoff）：
  - 指標在元件內容上時，事件交給元件自己處理（RACI 格子、模擬播放按鈕在任何倍率下都要可點）；按 Alt/⌥ 才能從元件上起手拖曳。
  - 雙擊畫布空白處 = fit 還原。
  - 指標位於畫布上時 `+` / `−` / `0` 生效。
  - 滾輪必須用原生 non-passive listener（React `onWheel` 是 passive，`preventDefault` 無效）。
- **捲動鎖定：** 開啟時 `document.body.style.overflow = "hidden"`，關閉時**還原成先前的值**（不要直接清成空字串）。
- **互動狀態不共用：** 覆蓋層裡的元件是同一份 element 在 portal 中的另一個 instance，state 從初始值開始（RACI 的選取、模擬的播放進度不會從內文帶過去）。這是預期行為。
- **匯出 PNG：**
  - 來源**不是**畫布上那份（有 transform，會連縮放與裁切一起截）。而是一份**離屏乾淨副本**：`position: fixed; left: -99999px; top: 0; opacity: 0; pointer-events: none; aria-hidden="true"`，內層 `width: <natural>px; padding: 24px; background: #fff`，渲染同一份 content。
  - 用 `html-to-image` 的 `toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff" })`，檔名 `<id>.png`。
  - 函式庫**首次點擊時才動態載入**（原型是插 `<script>` 標籤；在 codebase 裡請改成 `await import("html-to-image")` 的動態 import，讓它進獨立 chunk，不要進 initial bundle）。
  - 進行中 `busy = true`，按鈕 disabled；成功發出 toast「已匯出 PNG」，失敗 toast「PNG 匯出失敗，請稍後再試」。原型用 `nc-toast` CustomEvent，請改接專案既有的 toast 機制。
- **prefers-reduced-motion：** 所有動畫降為 0ms（`CanvasViewport` 已自行處理，覆蓋層的淡入也要遵守）。

## State Management

單一 Figure 內的 local state，不需要 global store：

| 變數 | 型別 | 用途 |
|---|---|---|
| `zoom` | boolean | 覆蓋層開關（在 `Figure` 裡） |
| `area` | `{w, h}` | 畫布尺寸，由 `resize` 與說明列高度推導 |
| `footH` | number | 說明列量測高度 |
| `busy` | boolean | PNG 匯出中 |

無資料抓取。

## Design Tokens

只用既有 token，**不要新增任何色碼、字級或間距值**。

- **色：** `--neutral-0` / `--neutral-50` / `--neutral-100` / `--neutral-200` / `--neutral-500` / `--neutral-600` / `--neutral-700` / `--blue-50` / `--blue-300` / `--blue-700` / `--orange-500`；PNG 輸出底色 `#ffffff`。
- **語意層：** 覆蓋層透過 `dkt(false)` 取 light 語意 token（`border` / `body` / `muted`），與簡報端共用同一組定義（見 `app/deck.jsx` 的 `DKT`）。
- **字級：** 16 / 14.5 / 13.5 / 12.5 / 11.5，mono 12.5；字重 600 / 700 / 800。
- **間距：** 6 / 8 / 12 / 16 / 20 / 24 / 28。
- **圓角：** `999px`（膠囊、圓鈕）、`--radius-lg`（圖框）。
- **動畫：** 淡入 180ms、按鈕狀態 140ms，皆 `var(--ease-out)`。
- **z-index：** 覆蓋層 900。

## Assets

- Icon 全部是 2px stroke 線性 icon（Lucide 風格）：`expand` / `close`（x）/ `image` / `hand` / `mouse` / `spinner`、以及既有的 `sparkle`。**在 codebase 請一律改用 `lucide-react`**（`Maximize2` / `X` / `Image` / `Hand` / `MousePointer` / `Loader2` / `Sparkles`），禁用 emoji。
- 外部依賴：`html-to-image`（僅 PNG 匯出用，動態載入）。
- 無圖片資產。

## Files

| 檔案 | 說明 |
|---|---|
| `prototype.html` | **可直接開啟的互動原型**（自帶所有依賴）。三個真實生成元件 + 放大檢視。 |
| `prototype-src.html` | 原型的未打包版本（需搭配專案的 `_ds/` 資料夾） |
| `VizZoomOverlay.jsx` | 本功能的實作：`VizZoomButton` + `VizZoomOverlay`（原型碼，僅供參考） |
| `Figure-integration.jsx` | 觸發按鈕與覆蓋層如何接進既有 `Figure` 包裝的 diff 註解版 |
| `CanvasViewport.jsx` | 前置依賴，對照用（規格見 `design_handoff_canvas_viewport/`） |
| `generated-samples.jsx` | 原型用的三個真實生成元件（含 `Figure` 包裝） |
| `icons.jsx` | 原型用的 icon set |

專案內對應檔案：`app/vizzoom.jsx`（新增）、`app/generated.jsx` 的 `Figure`（修改）、`app/canvasviewport.jsx`（未動）。

---

## 重建檢查清單

- [ ] 每個生成元件的圖框標題列右側都有常駐「放大檢視」按鈕，文字未被標題列的 uppercase / tracking 汙染
- [ ] 點下去進入 full-bleed 覆蓋層（不是 modal，四周不露背景），淡入 180ms
- [ ] 標題列 64px：類型 + 檔名 + 操作提示 + 匯出 PNG + 關閉，齊右群組 gap 8
- [ ] 畫布尺寸 = 視窗減去 64（標題）、說明列實際高度、48（padding），且 resize 後正確重算
- [ ] `mode="play"`：純滾輪即縮放；拖曳空白處平移；雙擊空白處 fit；`+ − 0` 生效
- [ ] 元件互動在放大後完整可用（RACI 格子可點、模擬可播放），且元件上起手拖曳不會誤觸平移
- [ ] Esc 關閉，且不會誤觸背後頁面的其他 Esc handler
- [ ] 開啟時鎖 body 捲動，關閉後還原原本的 overflow 值
- [ ] 匯出 PNG 為 100% 原尺寸、白底、2x，檔名 `<id>.png`，且**不受目前縮放與平移影響**
- [ ] `html-to-image` 只在首次匯出時載入，不進 initial bundle；失敗有 toast
- [ ] `prefers-reduced-motion` 下無動畫且內容完整可讀
- [ ] 未新增任何色碼、字級、間距值；icon 全部走 lucide-react
- [ ] 未修改 `CanvasViewport` 的行為，也未動筆記內文的其他渲染
