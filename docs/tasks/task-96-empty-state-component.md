# Task 96 — 空狀態插圖：`EmptyState` 元件與兩處接入

> 規格 [notecraft-workbench-empty-states.md](../notecraft-workbench-empty-states.md) §2–§8；Q1、Q2、Q3 定案（§14）。
> 設計交付 [design_handoff_empty_states](../prototype/design_handoff_empty_states/) README；插圖 path 以 `source/pt-dash.jsx` 的 `PtEmptyArt` 為準。
> 無前置依賴，**本批第一個做**；Task 97 靠它。

## 為什麼要有這一步

更新日誌卡片與 AI 佇列分頁在沒資料時只有一行 12.5px 灰字，看起來像壞掉。兩處共用同一個插圖式空狀態元件，一次到位；資料與 state 都不動。

## 範圍

### 1. `src/components/wb/EmptyState.tsx`（新增）

- `export function EmptyArt({ kind = "log" })`：兩張 132×104 inline SVG，逐 path 照 `PtEmptyArt`
- `export default function EmptyState({ kind = "log", title = "", sub, action })`：`.pt-empty` > svg + `.pt-empty-t` + （`sub` 才有）`.pt-empty-s` + （`action` 才有）呼叫端傳入的元素
- **顏色一律 `style={{ fill/stroke: "var(--wb-…)" }}`**（`patterns.tsx:3`：presentation attribute 在部分瀏覽器不解析 CSS 變數）；非顏色屬性（`strokeWidth`、`opacity`、`transform`…）照 JSX attribute
- 對映（規格 §3.3）：藍 `--wb-blue-l`、橘 `--wb-gold`、線 `--wb-line`、底 `--wb-panel`、白勾 `--wb-on`
- svg `aria-hidden="true" focusable="false"`；全部 props 有預設值；無 state、無 effect；**檔內零色碼**

### 2. `src/styles/workbench.css`

- `.wb-empty` 之後追加 `.pt-empty`、`.wb-body .pt-empty`、`.pt-empty svg`、`.pt-empty-t`、`.pt-empty-s`、`.pt-empty-btn`（含 `<a>` 用的 `display:inline-flex;align-items:center;text-decoration:none`）、`.pt-empty-btn:hover`（邊框 `--wb-dv-hover-line`）
- `.dv-empty` 之後追加 `.dv-log-list.is-empty`、`.dv-log-list.is-empty .pt-empty`、`.dv-log-list.is-empty .pt-empty svg`
- `--wb-dv-hover-line` 的註解補「空狀態按鈕」；**`:root` 不新增 token**；`.dv-empty`／`.wb-empty` 保留（仍有別處在用）

### 3. `src/components/wb/dashboard/UpdateLog.tsx`

- `win` 存在時清單容器 `className={"dv-log-list" + (list.length ? "" : " is-empty")}`
- `dv-empty` 那行換成 `<EmptyState kind="log" title={…} sub={…} />`，文案（Q1）：

| 情境 | 標題 | 說明 |
| --- | --- | --- |
| 選了日期（`pick`）且整週有更新（`inWeek.length > 0`） | 這一天沒有更新的筆記 | 點選有圓點的日期，或再點一次回到整週。 |
| 未選、`off === 0` | 這段期間沒有更新的筆記 | 本週還沒有動靜，寫下第一篇吧。 |
| 未選、`off > 0` | 這段期間沒有更新的筆記 | 切換到其他週看看，或回到本週。 |

- SSR／未 hydrate（`win === null`）分支不動

### 4. `src/components/wb/DashboardWorkbench.tsx`

AI 佇列 `wb-empty` 那行換成：

```tsx
<EmptyState kind="ai" title="AI 佇列已清空" sub="所有 @ai-visualize 標記都已生成完成。新增標記後會出現在這裡。"
  action={<a className="pt-empty-btn" href="/notes">前往筆記</a>} />
```

`id="nc-scroll"`、`data-wb-rows` 保留。

### 5. 最矮卡片量測（Q3）

Row 2 觸底（`min-height:380px`）時量 `.dv-log-list.is-empty` 的 `clientHeight` 與 `.pt-empty` 的 `scrollHeight`。**有裁切才**加一條 `@media(max-height:…)`，在 `.dv-log-list.is-empty` 內把 svg 縮成 99×78（CSS 覆寫 `width`／`height`，`viewBox` 不變）；量測結果回填規格 §15。

## 不做

- 其他 `wb-empty`／`dv-empty`／`dv-sl-empty`（Q2）；深色模式；Tweaks 的「AI 佇列清空」開關

## 驗收

- [x] 兩張插圖逐 path 照 `PtEmptyArt` 移植、computed style 對過 handoff 色值與尺寸（含「前往筆記」hover）；未開 prototype HTML 並排截圖
- [x] `grep -nE '#[0-9a-fA-F]{3,6}\b' src/components/wb/EmptyState.tsx` 0 筆；新增的 CSS 規則零色碼
- [x] 更新日誌：切到空週、點沒有圓點的日期，三種文案各出現在對的情境；卡片高度不變、無捲軸；說明文字沒被裁（或已加矮視窗規則）
- [x] AI 佇列空狀態（以 DOM 或 viewer 無標記專案驗）「前往筆記」導到 `/notes`
- [x] dev console 零 hydration warning
- [x] `npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-09-30，commit 37dc7f1）

- 最矮卡片實測清單只有 143px（規格估 174），矮視窗規則除了縮圖 0.75 還拿掉上下 padding；`@media(min-width:981px) and (max-height:820px)`
- Q1 條件收窄為 `pick && inWeek.length > 0`（整週 0 篇時「點選有圓點的日期」會指向不存在的圓點）
- `.pt-empty-btn:hover` 明寫字色，否則全站 `a:hover` 蓋成 `--wb-blue`
- 量測數字見規格 §15
