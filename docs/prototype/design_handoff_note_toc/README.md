# Handoff: 筆記目錄（ToC）支援 H1–H3 三層

> 給 **Claude Code** 的實作交付包。目標 codebase 已依 `design_handoff_workbench/` 實作新版工作台；本包只描述**一個功能增量**：筆記閱讀頁右側目錄從「只列 H2」擴充為 **H1 › H2 › H3 三層樹**，並修正目錄在新工作台捲動容器內失效的問題。
> 未參與設計討論的開發者，應能僅憑本文件 + `prototype/` 完成實作。

---

## 0. 改了什麼（一眼看完）

| | 現況 | 本包 |
|---|---|---|
| 目錄涵蓋層級 | 只有 `h2` | **`h1` / `h2` / `h3`**，依文件順序建樹 |
| 目錄顯示 | 單層清單 | 三層縮排；H2 前置 4px 圓點、H3 前置 8px 短橫線 |
| 目前位置 | 該項橘色左緣 + 藍字 | 同上，**且其所有上層祖先同步變藍（600）** |
| 標頭 | 「目錄」 | 「目錄」＋ 右側各層數量 `H1×4 · H2×9 · H3×5` |
| 內文 `h1` 區塊 | 不支援 | 新增章標題樣式（品牌藍、底線） |
| 捲動偵測 / 點擊跳轉 | 寫死綁 `#nc-scroll`，在新工作台內無效 | **自動尋找最近可捲動祖先**，找不到則退回 `window` |
| 深連結 | 無 | `#note/<slug>` 直接開啟筆記（開發用，可選） |
| 範例內容 | — | 新筆記 `http-caching`（4 章 / 9 節 / 5 小節）供驗收 |

**沒有改動**：筆記頁其餘版面、閱讀進度、AI 標記塊、SeriesNav、工作台外殼。

---

## 1. About the Design Files

`prototype/` 是 **HTML + 瀏覽器端 React（Babel inline）的設計參考原型**，不是要搬進正式專案的程式碼。請在既有 codebase（Astro 5 + React islands + Tailwind）中**重建**。開啟 `prototype/NoteCraft-Workbench-ToC.html` 會直接落在範例筆記；也可從側欄「02-後端」開其他筆記比較舊筆記（僅 H2）的顯示。

原型中本功能的原始碼：
- `prototype/app/noteview.jsx` — `NoteView`：建樹、捲動偵測、跳轉、目錄渲染；`NoteBody`：`h1` 區塊。
- `prototype/app/data.jsx` — 範例筆記 `http-caching`（第一筆）。
- `prototype/wb/pt-app.jsx` — `#note/<slug>` 深連結（前兩行 state 初始化）。

## 2. Fidelity：**High-fidelity**

目錄的字級、縱距、縮排、色彩、狀態皆定稿；像素級重現。

---

## 3. 資料模型：從 MDX 取得標題

原型以 block 陣列模擬 MDX：`{ t: "h1"|"h2"|"h3", c: "標題文字" }`。正式實作請在建構階段（或 rehype plugin）從 MDX AST 抽出 `depth ≤ 3` 的標題，產出：

```ts
type TocItem = { id: string; label: string; lv: 1|2|3; kids: TocItem[]; parent: TocItem|null };
```

**建樹規則（與原型一致）**
1. 依文件順序逐一處理標題。
2. 每個標題的 parent ＝ **往前找到的第一個 `lv` 比它小的標題**；找不到就放頂層。因此 `h3` 直接接在 `h1` 後面時會掛在該 `h1` 下（跳層允許）；筆記若完全沒有 `h1`，`h2` 自然成為頂層。
3. `minLv` ＝ 全文出現的最小層級；渲染時的**相對深度** `depth = lv − minLv`（0/1/2）。舊筆記（只有 h2/h3）因此外觀完全不變。
4. `id`：`"h-" + label.replace(/[^\w\u4e00-\u9fff]+/g, "-")`（與現有 `hid()` 一致；正式版可改用 rehype-slug，但目錄與標題必須用同一函式）。
5. 同一層數量 `counts[lv]` 供標頭顯示。

> 筆記主標題（frontmatter `title`）維持渲染為頁面 `<h1>`，**不進目錄**。內文的 `# ` 標題語意是「章」；為了不與頁面主標題衝突，原型將內文 `h1` 區塊輸出為 `<h2 data-level="1">`（見 §4）。正式版若想保留語意 `<h1>`，請與團隊的 a11y 慣例對齊即可，目錄不受影響。

---

## 4. 內文標題樣式（NoteBody）

| Block | 元素 | 字級 | 顏色 | 間距 | 其他 |
|---|---|---|---|---|---|
| `h1` | `<h2 data-level="1">` | `var(--text-3xl)` | `var(--blue-700)` `#1b4f9c` | `margin: 48px 0 16px` | `padding-bottom: 10px; border-bottom: 1px solid var(--neutral-200)` |
| `h2` | `<h2>` | `var(--text-2xl)` | `var(--text-strong)` | `margin: 38px 0 14px` | （現況不變） |
| `h3` | `<h3>` | `var(--text-xl)` | `var(--text-strong)` | `margin: 28px 0 10px` | （現況不變） |

所有標題：`id = hid(label)`、`scroll-margin-top: 90px`、字重沿用 DS 標題 700。

---

## 5. 目錄（`<nav aria-label="目錄">`）

### 5.1 容器
- 兩欄 grid：`grid-template-columns: 1fr 220px; gap: 40px; align-items: start`；沒有任何標題時只渲染單欄。
- `nav`：`position: sticky; top: 8px; align-self: start; max-height: calc(100vh − 120px); overflow-y: auto; padding-right: 4px`（目錄過長時自身捲動，不撐開頁面）。
- 標頭列：`display:flex; align-items:baseline; justify-content:space-between; margin-bottom:12px`
  - 左「目錄」：11.5px / 700 / `letter-spacing: .1em` / uppercase / `var(--text-muted)`
  - 右數量：11px / `var(--text-muted)` / `font-variant-numeric: tabular-nums`，格式 `H1×4 · H2×9 · H3×5`（數量為 0 的層級省略）。
- 清單：`display:flex; flex-direction:column; gap:1px; border-left: 2px solid var(--neutral-200)`。**扁平渲染**（`flat` 順序），用縮排表現層級，不需巢狀 DOM。

### 5.2 每一項 `<a href="#id">`

| depth | 字級 | 左 padding | 上下 padding | 前置符號 | 預設色 | 預設字重 |
|---|---|---|---|---|---|---|
| 0 | 13.5px | 14px | 5px | 無 | `var(--text-muted)` | 600 |
| 1 | 12.5px | 26px | 3px | 圓點 4×4，`border-radius: 999px`，`var(--neutral-300)` | `var(--text-body)` | 400 |
| 2 | 12px | 38px | 3px | 短橫線 8×1.5px，`var(--neutral-300)` | `var(--text-muted)`，`opacity: .85` | 400 |

共同：`display:flex; align-items:center; gap:7px; padding-right:10px; margin-left:-2px; border-left: 2px solid transparent; line-height:1.5; text-decoration:none; transition: color 140ms, border-color 140ms`。左 padding 公式 `14 + depth × 12`。

### 5.3 狀態

| 狀態 | 條件 | 樣式 |
|---|---|---|
| **active** | `id === activeId` | 左緣 `2px solid var(--orange-500)` `#e37b24`；文字 `var(--blue-700)` / 700；前置符號改 `var(--orange-500)`；opacity 1 |
| **in trail** | 是 active 的祖先 | 文字 `var(--blue-700)` / 600；左緣仍透明 |
| hover | — | 沿用 DS 連結 hover（顏色轉深藍），無其他效果 |
| 預設 | — | 見 5.2 |

### 5.4 目前位置偵測
- 捲動容器：從 `NoteView` 根節點往上找第一個 `overflow-y: auto|scroll` 且 `scrollHeight > clientHeight` 的祖先（工作台內是 `.wb-body`）；找不到用 `window`。
- 監聽該容器 `scroll`；每次計算：對 `flat` 依序取 `getBoundingClientRect().top`，**最後一個** `top < containerTop + 140` 的標題為 active；全部都在下方時 active = null。掛載時先跑一次。
- 頻率：原型直接在 scroll 事件計算；正式版可 `requestAnimationFrame` 節流，或改用 `IntersectionObserver`（`rootMargin: "-140px 0px -60% 0px"`）——行為需等價。

### 5.5 點擊跳轉
- `preventDefault()`；目標 `top = el.top − container.top + container.scrollTop − 24`，`scrollTo({ top, behavior: "smooth" })`；退回 `window` 時用 `el.top + scrollY − 90`。
- 不更新 URL hash（工作台以 hash 做路由，避免衝突）。
- `prefers-reduced-motion: reduce` 時改 `behavior: "auto"`（原型未做，正式版請補）。

---

## 6. 深連結（可選，開發便利）
`location.hash` 符合 `^#note\/([\w-]+)` 時，初始 route = `note`、`openSlug` = 該 slug。原型只在初始化讀一次；正式版若已有路由方案，以既有方案為準。

---

## 7. 驗收清單
1. 開啟 `http-caching`：目錄顯示 `H1×4 · H2×9 · H3×5`，三層縮排與符號正確。
2. 捲動至「ETag 與 If-None-Match」→ 該項橘緣藍字 700；其父「驗證：過期後如何便宜地確認」藍字 600；其他章保持灰。
3. 捲到 H3「stale-if-error」→ H3 active，H2「CDN 的 stale-while-revalidate」與 H1「分層…」同時進 trail。
4. 點任一項平滑捲到標題（標題上方留 ~24px），工作台 `.wb-body` 內與獨立頁面皆可。
5. 開只含 H2/H3 的舊筆記（如 `oauth-pkce`）：H2 為頂層、外觀與改版前一致；只含 H2 的筆記不顯示圓點／短線。
6. 沒有任何標題的筆記不渲染目錄，內文佔滿單欄。
7. 目錄超過視窗高度時只有目錄自己捲動。

---

## 8. Design Tokens（本功能用到）
- 色：`--blue-700 #1b4f9c`、`--orange-500 #e37b24`、`--neutral-200`、`--neutral-300`、`--text-strong`、`--text-body`、`--text-muted`
- 字級：`--text-3xl`（h1）、`--text-2xl`（h2）、`--text-xl`（h3）；目錄 13.5 / 12.5 / 12 / 11.5 / 11px
- 間距：縮排 14 / 26 / 38px；列 gap 1px；標頭 margin-bottom 12px
- 動效：`140ms` 顏色過渡；捲動 `smooth`

## 9. Files
- `prototype/NoteCraft-Workbench-ToC.html` — 入口（自動開啟範例筆記）
- `prototype/app/noteview.jsx`、`prototype/app/data.jsx`、`prototype/wb/pt-app.jsx` — 本功能改動的檔案
- 其餘 `prototype/app/*`、`prototype/wb/*`、`prototype/_ds/*` — 原型執行所需，未改動
