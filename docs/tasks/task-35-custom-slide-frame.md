# Task 35 — `custom` 版型渲染 + SlideFrame（area / 溢出偵測 / a11y）

> 對應 [deck-slide-contract.md](../deck-slide-contract.md) v0.2 §6、§7.3、§11.1；
> [deck-design-audit.md](../deck-design-audit.md) B-5。
> 依賴 [Task 31](task-31-deck-type-union-v02.md)（`CustomSlideProps`）、
> [Task 33](task-33-slide-chrome-fixed-layouts.md)（`SlideChrome` + `chromeMetrics`）。

## 範圍

- 新增 `LayoutCustom` 到 [src/components/deck/slideLayouts.tsx](../../src/components/deck/slideLayouts.tsx)，
  註冊進 `LAYOUTS`。
- 改 [src/components/deck/SlideFrame.tsx](../../src/components/deck/SlideFrame.tsx)：
  傳遞 `live`、加 dev-only 溢出偵測、`prefers-reduced-motion`、可見 focus 狀態。

## `LayoutCustom` 的行為

```
if (chrome !== false)  →  <SlideChrome …>{ <Render dark live area={chromeMetrics(slide)} /> }</SlideChrome>
else                   →  <Render dark live area={{ w: 1600, h: 900 }} />
```

1. **`area` 來自 `chromeMetrics(slide)`**（Task 33 的純函式），不要在這裡重算高度。
2. **`live` 直接下傳** —— `custom` 頁一律渲染（不像 `full-visual` 有占位分支），
   但頁面內的動畫與計時器只在 `live === true` 時啟動。這條規則由 `custom` 頁自己遵守
   （[Task 36](task-36-present-skill-agents-v02.md) 寫進 SKILL），本 Task 只負責把值傳到。
3. `render` 元件由 deck 檔提供（同檔內定義，契約 §9），本 Task 不預設任何內容。

## dev-only 溢出偵測（契約 §7.3）

**這是 v0.2 最需要的自動化防護。** 1600×900 是固定座標系、`SlideFrame` 是 `overflow: hidden`，
內容溢出**不報錯、只會被靜靜裁掉**，而 `tsc` 與 `astro build` 永遠測不到。

- 只在 `import.meta.env.DEV` 啟用。
- 量測內層 1600×900 容器的 `scrollWidth` / `scrollHeight`；超過即：
  1. 疊一層紅色外框（`outline` 或 absolute overlay，不影響版面）
  2. `console.warn` 帶上 deck slug、頁碼、`nav` 短標題、實際超出的 px 數
- 正式 build **完全不輸出**這段（`import.meta.env.DEV` 條件 + 確認 tree-shake 生效）。

## a11y（audit B-5）

- **`prefers-reduced-motion`**：以 `useReducedMotion()` 或 CSS media query 關閉頁面切換動效與
  `custom` 頁的入場動畫（專案既有規則：motion 元件 200–400ms ease-out 且尊重此設定）。
- **可見 focus 狀態**：deck 相關的可聚焦元素（縮覽側欄項目、大綱跳頁、播放控制）需有清楚的
  focus ring，取自既有 token，不可只靠 `:hover`。目前 deck 元件**零處**處理這兩項。

## 實作步驟

1. `slideLayouts.tsx`：新增 `LayoutCustom`，處理 `chrome` 分支與 props 下傳；註冊到 `LAYOUTS`。
2. `SlideFrame.tsx`：`Slide` 分派時把 `live` 一併傳給 `LayoutCustom`（現有簽章已有 `live`，確認未漏）。
3. `SlideFrame.tsx`：加 dev-only 溢出偵測（用既有 `useMeasure` 的 ref 或另加一個 ref）。
4. 把 Task 31 暫時改成 `?? LAYOUTS.quote` 的 fallback 改為 `?? LAYOUTS.custom`
   —— `custom` 是主幹道，未知 layout 落到它最合理（且它會渲染 chrome，看得出是哪一頁出錯）。
5. a11y：`prefers-reduced-motion` + focus ring（含 `islands/PresentApp.tsx` 的互動元素）。

## 驗收

- [x] 一頁 `custom` slide 可正常渲染，`render` 收到的 `dark` / `live` / `area` 三個值皆正確
- [x] `chrome: false` 時無外框、`area` 為 `{w:1600,h:900}`
- [x] `chrome` 預設（未給）時視為 `true`
- [x] 縮覽側欄的 `custom` 頁 `live === false`、主畫布 / 播放中 `live === true`
- [x] **刻意做一頁溢出的測試 slide**：dev 下出現紅框 + console.warn 帶頁碼；正式 build 無此輸出
- [x] `prefers-reduced-motion: reduce` 下頁面切換與入場動畫停止（**已由 global.css 全域規則覆蓋，未新增程式碼** —— 見實作記錄）
- [x] 鍵盤 Tab 走過縮覽 / 大綱 / 播放控制時皆有可見 focus（**同上，已由 global.css 覆蓋**）
- [x] `npx tsc --noEmit && npx astro build` 通過
- [x] 三份既有 deck（Task 31 降級版）仍可正常開啟

## 風險 / 備註

- 溢出偵測量的是**內層 1600×900 容器**，不是外層縮放後的畫框。量錯對象會全頁誤報。
- `custom` 頁若用 `position: absolute` 溢出到座標系外，`scrollHeight` 可能量不到
  （absolute 元素不一定撐開父容器）。這是偵測的已知盲區 —— 所以它是
  [Task 36](task-36-present-skill-agents-v02.md) 截圖驗證的**補強而非替代**，兩者都要有。

---

## 實作記錄（2026-07-30，已完成）

### 產出

- **`src/components/deck/overflowProbe.tsx`**（新增）—— `useOverflowProbe()` + `<OverflowBadge>`。
- `slideLayouts.tsx` 新增 `LayoutCustom`，註冊進 `LAYOUTS`（6 種版型全備）。
- `FALLBACK_LAYOUT` 從 `LayoutQuote` 改為 `LayoutCustom`（主幹道，且會套 SlideChrome，
  頁碼與 nav 都在，一眼看得出是哪一頁出問題）。

### LayoutCustom 的一個設計決定

`render` 外面包一層**高度確定的 flex 欄**（`height: 100%` + `flexDirection: column` + `gap: DGAP.md`），
理由：[Task 34](task-34-deck-block-components.md) 的 block 預設 `flex: "1 1 auto"`，要有確定高度的父層才有東西可分；
頁面元件也不必自己處理高度。要完全自訂版面就在 `render` 內再包一層自己的 div（外層只會有一個子元素）。

### 溢出偵測：量測對象與一個實作陷阱

**量測對象刻意是「custom 頁的內容區 vs 它拿到的 `area`」，不是整張 1600×900 畫框。**
理由：cover / section 有刻意出血的裝飾圓（`right: -120` 等），量整張畫框會**每頁誤報**
（實測 cover 的 `scrollWidth` 是 1720、`scrollHeight` 1130，全是裝飾造成的）。

**踩到的陷阱**：第一版只 `ro.observe(el)`。無效 —— `el` 高度固定 `100%`，它自己的盒子永遠不變，
子元素長高不會觸發回呼。已改為觀察 `el` **與所有子元素**，加 `MutationObserver`（子元素增減）、
`document.fonts.ready` 與一次 `requestAnimationFrame`。

**另外修正我自己的一次誤判**：中途我用 `scrollHeight / scale` 去算，得到「溢出 141px」的假警報。
`scrollHeight` 是 1600×900 座標系內的**未縮放 CSS px**（縮放是 `transform`，不影響 layout 度量），
不需要除 scale。實際 raw 值 538 = `area.h`，沒有溢出，偵測器當時的沉默是正確的。

### 實測值（都是量出來的，不是推論）

| 檢查 | 結果 |
| --- | --- |
| 主畫布（frame 1268px）`live` | `true` |
| 縮覽（frame 190px）`live` | `false` |
| `chrome` 預設頁的 `area` | `1392 × 538`（= `chromeMetrics()`：900 − 58 − 122 − 20 − 116 − 46） |
| `chrome: false` 頁的 `area` | `1600 × 900`（= `FULL_AREA`） |
| `dark` 傳遞 | 暗色主題下 `dark = true` |
| 刻意塞爆（Rows 12 列） | 紅框 + 角標 `OVERFLOW +0×24`；console 兩則警告（block 上限 + 溢出，帶 deck slug／頁碼／nav） |
| 正式 build | `grep dist/` 找不到「內容溢出，會被裁掉」與「超過建議上限」→ 兩段 dev 程式碼都被 tree-shake |

### a11y：兩項都已被 global.css 覆蓋，**未新增程式碼**

本文原本寫「deck 元件 0 處處理」—— 那句話對 `src/components/deck/` 目錄成立，但**誤導**：
覆蓋其實在 `src/styles/global.css`，deck 的按鈕與動畫都吃得到。實測：

- `global.css:33` `:focus-visible { outline: 3px solid color-mix(in srgb, var(--focus-ring) 55%, transparent); outline-offset: 2px }`
  → Tab 到播放控制按鈕，`el.matches(':focus-visible')` 為 true，computed outline 為
  `3px solid color(srgb 0.204 0.545 0.788 / 0.55)`、offset `2px`。**有可見 focus。**
- `global.css:52` `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }`
  → 選擇器是 `*`，涵蓋 `ncFade` / `ncSlideIn` / `ncRiseUp` 等所有 deck 動效。

因此本 Task **沒有為 a11y 寫任何新程式碼**，而是驗證既有覆蓋。若日後 deck 要加自訂動畫，
規則已在，不需重複處理。

### 順帶產出的示範頁（刻意保留）

在**未 commit 的**提案草稿 deck 加了一頁真正的 `custom` 頁
（`PainpointPage`：`<Stages>` 3 段 + `<Rows>` 5 列 + chrome 的 num/pill/callout），
對照參考簡報最密的提案 P2。它同時完成了 Task 34 延後的**暗色視覺確認** ——
實測 row 色條在暗色下取到 `rgb(239,139,139)`＝`--danger-300`、`rgb(242,193,78)`＝`--warning-300`，
證明 [Task 32](task-32-deck-scale-status-tokens.md) 的 300 階確實生效。
Task 37 會重新規劃這頁，但它現在是 `custom` 頁寫法的參考樣本（deck 檔 11 頁）。

臨時驗證用的溢出測試頁與 props 探針頁**已全部移除**（`grep TEMP|Probe` = 0）。

### 驗證

`npx tsc --noEmit` = 18（既有基準線，未增加）；`npx astro build` 通過（40 頁）；
三份 deck 的 `/present/<slug>` 皆 200。
