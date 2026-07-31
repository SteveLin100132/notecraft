# Task 26 — PresentApp island：檢視 / 播放 / 大綱 / 主題

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」§簡報模式。依賴 [Task 24](task-24-deck-theme-slide-layouts.md)、[Task 25](task-25-slide-frame-scaling.md)。
> 權威來源：present.jsx（`PresentView` / `ThumbRail` / `PlayMode` / `ThemeToggle` / `GhostBtn` / `PlayBtn`）。

## 範圍

- 新增 [src/components/islands/PresentApp.tsx](../../src/components/islands/PresentApp.tsx)：整個簡報互動層（單一 island，`client:only="react"`）。
- 涵蓋 README〈Screens〉2、3 全部行為：檢視模式、縮覽清單、播放全螢幕、進度列、底部控制列、首次提示、大綱跳頁浮層、主題切換。

## 組成（照 present.jsx）

- `PresentApp({ slug })`：以 `deckOf(slug)`（Task 23）取 deck；`deck` 為 null 時 render null（頁面層已 404，見 Task 27）。
- **檢視模式 `PresentView`**：`position: fixed; inset: 0`；頂列（返回筆記 / eyebrow+標題 / `16:9` chip / `i/N` / ThemeToggle / 版型庫鈕〔v1 隱藏或連 dev-only，見備註〕 / 「播放（全螢幕）」金色 CTA）+ 左側 `ThumbRail`（252px）+ 主區（`useMeasure` 算 `w = max(320, min(stageW-80, (stageH-80)*16/9))`，`SlideFrame … live`）+ 下方上一頁/nav/下一頁 + 左下 `deck.source`。
- **縮覽清單 `ThumbRail`**：寬 252、每列頁碼 + `SlideFrame width=190 live={false}` + nav 標題；選中 `--orange-400` 框 + brand 色。
- **播放模式 `PlayMode`**：`position: fixed; inset:0; z-index:800`；底色亮 `--blue-950` / 暗 `--neutral-900`；`w = min(vw-24,(vh-24)*16/9)`；左右 52×52 箭頭鈕（到頭尾 `opacity .25`）；貼底 4px 進度列（已讀段 `--gradient-accent`，280ms）；底部膠囊控制列（`NN / NN`、nav、「大綱 / 跳頁」、「結束播放」，`backdrop-filter: blur(10px)`）；首次提示膠囊 3200ms 後淡出；大綱浮層（遮罩 + 下滑面板 `auto-fill minmax(210px,1fr)` 縮覽網格，點選跳頁 / 點遮罩 / Esc 關）。
- **主題 `ThemeToggle`**：亮/暗 segmented pill；狀態存 `deckTheme`。

## 行為細節

- **鍵盤**（檢視）：←↑ 上一頁、→↓ 下一頁、Enter 進播放。
- **鍵盤**（播放）：←↑ 上一頁；→↓ Space 下一頁（`preventDefault`）；`O` 切大綱；`Esc` 大綱開→先關大綱、否則退播放（退出回寫 `cur`，檢視停同頁）。
- **Fullscreen API**：進播放時 `document.documentElement.requestFullscreen?.()`；退出時 `document.exitFullscreen?.()`；監聽 `fullscreenchange`，使用者按瀏覽器 Esc 退出全螢幕時同步關閉播放層。失敗（不支援 / 拒絕）優雅降級為視窗內全覆蓋、不報錯。
- **主題**：`deckTheme: "light" | "dark"`，初次依 `window.matchMedia("(prefers-color-scheme: dark)")`，使用者切換後存 `localStorage["nc-deck-theme"]`；檢視 / 播放 / （日後版型庫）共用。（若作者要「強制預設暗色」，把初值改為 `"dark"` 即可 —— 一行。）
- **URL 記頁**：把 `cur` 同步到 `#<n>`（或 `?p=`），重新整理 / 深連結不掉頁（README State Management）。
- **動效**：`ncFade`（檢視切頁 220ms）/ `ncSlideIn`（播放 280ms）/ `ncRiseUp`（大綱 280ms），`var(--ease-out)`；keyframes 由 [Task 30](task-30-keyframes-dashboard-stat.md) 加到 global.css。`prefers-reduced-motion` 全域已關動畫。

## 樣式 / icon

- 全程 CSS var token（沿用 tokens.css），icon 用 lucide-react；`nc-toast` 事件已由 [ToastHost.tsx](../../src/components/islands/ToastHost.tsx) 承接（本 island 一般不需發 toast）。
- island 內按鈕以 inline style（對齊既有 islands 如 [RegenerateButton.tsx](../../src/components/islands/RegenerateButton.tsx) 的作法），不依賴 `.astro` DS 元件。

## 驗收

- [ ] 檢視模式：縮覽清單 + 主畫布 + 頂列齊備，點縮覽 / ←→ / 下方箭頭皆可換頁
- [ ] 播放模式：全螢幕（Fullscreen API）+ 進度列 + 底部控制 + 首次提示 + 邊界箭頭變淡
- [ ] 大綱浮層：`O` 開合、縮覽網格點選跳頁、遮罩 / Esc 關閉
- [ ] Esc：大綱開→先關；否則退播放並回寫目前頁
- [ ] 主題切換即時、localStorage 記憶、初次跟隨系統
- [ ] 重新整理保留目前頁（URL 同步）
- [ ] `npx tsc --noEmit && npx astro build` 通過；瀏覽器實跑無 console 錯誤

## 風險 / 備註

- `client:only="react"`（非 `client:visible`）：整頁即簡報、需即時鍵盤與量測，且避免 SSR 抓不到 `window`/`ResizeObserver`。
- 版型庫鈕（`onLibrary`）v1 先隱藏或不接（decklib 延後）；保留 prop 供日後接上。
