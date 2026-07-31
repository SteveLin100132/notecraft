# Handoff：元件預覽畫布 Viewport（`full-visual` 版型）

## Overview
`full-visual` 版型原本用「2px 虛線圓角框 + 垂直置中」包住筆記裡既有的 AI 生成互動元件。那些元件是為**網頁內文**設計的（寬度吃滿版心、高度隨內容長、頁面可捲），放進固定 **1600×900 / `overflow:hidden`** 的簡報頁後，高元件下緣被靜靜裁掉、寬元件左右被切。

本次把該容器重新設計成一塊**藍圖畫布（blueprint viewport）**：元件躺在一張「紙」上、紙躺在點陣藍圖上，可縮放、可平移，超出畫布的部分被裁切並靠平移看見，且提供「還原置中」的單一出口。行為近似 n8n / Figma 的無限畫布，但視覺語彙完全轉譯成 TrendLink 設計系統，讀起來是簡報而不是開發者工具。

## About the Design Files
本資料夾的檔案是 **HTML / React 製作的設計參考（design reference）**，用來展示預期的外觀與互動行為，**不是要直接搬進產品的生產程式碼**。任務是在目標 codebase 既有環境（本專案規劃為 **Astro 5 + MDX + React island + TailwindCSS**）中，沿用既有元件、樣式與 token 慣例，把這塊畫布**重建**出來。`CanvasViewport.jsx` 是 prototype 實作，請改寫成你 codebase 慣用的 JSX / 樣式方案。

> 若你直接在 prototype 倉庫（單一 `NoteCraft.html` + `app/*.jsx`）上開發，本功能**已整合並可運作**，整合位置見〈整合位置〉。

## Fidelity
**High-fidelity（hifi）。** 尺寸、圓角、陰影、動畫時長與緩動皆為最終值。唯一刻意保留彈性處：圓角 token（NoteCraft 主站把 `--radius-md` 覆寫為 5px，prototype 用 TrendLink 預設值）。

---

## 檔案清單
| 檔案 | 說明 |
|---|---|
| `prototype.html` | **可直接雙擊開啟**的獨立原型。掛載真的 `rr-raci` / `rr-structure`，所有互動都能玩；HUD 可切換內容（RACI／權責結構／高架構圖／空狀態／雙畫布）、模式（檢視／播放）與主題。 |
| `spec-visuals.html` | 設計稿與標註 spec：light/dark 各狀態、控制列 1.9× 放大標註、藍圖網格規格、z 層序、轉場時長、縮覽圖降級。 |
| `CanvasViewport.jsx` | 畫布元件原始碼（與 prototype 倉庫 `app/canvasviewport.jsx` 逐字一致）。 |
| `PROMPT.md` | 給 Claude Code 的實作提示詞（可直接貼）。 |
| `README.md` | 本文件（完整規格）。 |

### 整合位置（prototype 倉庫）
- **畫布元件**：`app/canvasviewport.jsx` —— `window.CanvasViewport`。
- **版型**：`app/deck.jsx` 的 `LayoutFullVisual` 改用 `window.CanvasViewport`，並把 `play` / `scale` 透過 `Slide` / `SlideFrame` 傳下去。
- **播放模式**：`app/present.jsx` 全螢幕那支 `SlideFrame` 加上 `play` prop。
- **樣式**：`NoteCraft.html` 新增 `@keyframes cvBadgeIn`，並在 `app/deck.jsx` 之前載入 `app/canvasviewport.jsx`。

---

## 硬約束（既有實作事實，非偏好）
- **座標系**：一律 1600×900 座標系下的絕對 px。不用 rem、不做 RWD（整頁由外層 `transform: scale` 等比縮放）。
- **畫布可用區**：單畫布 **1392 × 658**（`full-visual` P6 的實際值：上距標題 24、下距頁碼列 74）；並排雙畫布各 **684 × 658**，間距 24。高度依該頁有無 title / legend / callout 落在 560–700。
- **色彩**：只能用語意 token（`stage / chrome / slide / border / borderSoft / ink / body / muted / brand / brandInk / brandSoft / accent / accentSoft / sunken / hover / shadow / shadowLg`），light / dark 各一套對映（見 `app/deck.jsx` 的 `DKT`）。網格點色由 `muted` 以 `color-mix` 取百分比，不新增色碼。
- **字級**：只能取自 `h3 30 / h4 24 / body 20 / small 17 / micro 14 / eyebrow 13`。（嵌入元件自身的字級沿用該元件原設計，不受此階梯約束。）
- **間距**：只能取自 `xs 8 / sm 16 / md 24 / lg 40 / xl 64`。
- **圓角**：`--radius-sm / md / lg / xl` 變數。
- **icon**：一律 lucide（本 prototype 為同風格 inline SVG），**禁用 emoji**。
- **動畫**：200–400ms ease-out，且必須尊重 `prefers-reduced-motion`。

---

## 結構與 z 順序
| z | 層 | 規格 |
|---|---|---|
| 0 | 畫布容器 | 1392×658 · `radius-xl 24` · 1px `border`（**不用虛線**）· 底 light `sunken` / dark `stage` · `overflow:hidden` · 內凹陰影 light `inset 0 1px 3px rgba(17,47,93,.07)` / dark `inset 0 1px 0 rgba(255,255,255,.04)` |
| 1 | 點陣藍圖 | 兩層 radial-gradient · `pointer-events:none` |
| 2 | 紙張（元件） | 底 `neutral-0`（**兩主題皆白**）· 1px `borderSoft` · `radius-lg 16` · padding `md 24` · light `shadow` / dark `shadowLg` · `transform: translate(x,y) scale(z)`，`transform-origin:center` |
| 3 | 邊緣遮罩 ×4 | 40px · `linear-gradient(畫布底色 → transparent)` · `pointer-events:none` · opacity 0/1 |
| 4 | Chrome | 控制列（右下 16）· 偏移徽章（左上 16）· 一次性操作提示（左下 16）· 皆 `chrome` 底 + 1px `border` + `shadow` + pill |

### 藍圖背景（點陣，非十字）
| 項目 | Light | Dark |
|---|---|---|
| 細點 | 間距 24（`md`）· 徑 2.2px · `muted` @ 34% | 24 · 2.2px · `muted` @ 30% |
| 主點 | 間距 96（4×24）· 徑 3.4px · `muted` @ 60% | 96 · 3.4px · `muted` @ 55% |
| 縮放連動 | `background-size: calc(24px*z)` / `calc(96px*z)`，`background-position:center`（與紙張同錨點）| 同 |
| 降級 | z < 0.5 只畫 96 主點；z > 2 只畫 24 細點 | 同 |

十字線在投影機上會鋸齒／摩爾紋，故採點陣。網格**跟著縮放**——不跟著會讓縮放看起來像「圖片變大」而非「鏡頭推近」。

### 紙張與 dark 模式
許多既有元件為亮底設計，dark 模式必須在元件外包白底圓角卡片。層次靠**陰影**建立（dark 用 `shadowLg`），不要加亮色描邊：白紙已是畫面最亮的物件，再描邊會變成「貼上去的圖片」。

---

## 控制列
- 位置：畫布內右下角，距邊 `sm 16`。單畫布 48px 高、並排雙畫布 40px 高、縮覽圖不渲染。
- 容器：`radius-pill` · padding `0 8` · gap `8` · 底 `chrome` · `backdrop-filter: blur(10px) saturate(1.1)` · 1px `border` · `shadow`。毛玻璃**僅此一處**。
- 內容順序：`－` ／ 縮放百分比（寬 78 固定、mono `small 17` / 700 / `ink`，**點擊＝回 100%**）／ `＋` ／ 1px×24 分隔線 ／ fit 置中（lucide `scan`）。
- icon button：36×36 · pill · 透明底 · icon 20px `body`；hover 底 `hover` / icon `brandInk`；press `scale(.97)`；到達上下限 opacity 0.35。
- 可見度（**常駐，不是 hover-only**）：檢視模式 idle **0.5**、播放模式 idle **0.32**；指標進入畫布或任何操作 → 200ms 升至 1；停止操作 3s 回落。
  理由：投影機／觸控筆沒有可靠 hover；講者需要不摸索就知道能操作；觀眾看到百分比才理解畫面被縮放過。

## 互動（不得佔用簡報鍵位）
簡報已綁 `←` `→` `↑` `↓` `Space`（翻頁）、`Esc`（退出）、`O`（大綱）。畫布**完全不註冊**這些鍵。

| 動作 | 檢視模式 | 播放模式 |
|---|---|---|
| 縮放（滾輪） | `⌘/Ctrl` + 滾輪，指標為錨點 | 純滾輪即縮放 |
| 縮放（觸控板） | 兩指捏合（瀏覽器送 `ctrl+wheel`）| 同 |
| 平移 | 左鍵直接拖畫布空白處（`grab` → `grabbing`）| 同 |
| 在元件上平移 | 元件互動優先（RACI 格子仍可點）；按住 `Alt/⌥` 可從元件上起手 | 同 |
| 水平平移 | `Shift` + 滾輪 | 同 |
| 鍵盤 | 指標位於畫布上時 `+` `-` `0` | 同 |
| 雙擊 | 空白處雙擊＝fit 還原 | 同 |

**邊界行為（硬規則）**：只有在「確實發生縮放或平移」的那一刻才 `preventDefault()` + `stopPropagation()`；未消化的滾輪事件原封不動冒泡給外層頁面捲動；已達 25% / 300% 上下限時同樣放行。
**實作陷阱**：React 的 `onWheel` 是 passive listener，`preventDefault` 無效 —— 必須用 ref + `addEventListener('wheel', h, { passive: false })` 原生掛載。

### 縮放參數
- fit 比例：`min(1, (w-48)/元件寬, (h-48)/元件高)` —— 四周留 `md 24` 呼吸，不放大超過 100%。
- 範圍 25%–300%；按鈕級距 ×1.2 / ÷1.2；滾輪連續 `z * 1.0015^(-deltaY)`，指標為錨點。
- 平移邊界：橡皮筋阻尼（紙張任一邊被拖離畫布超過 25% 時阻力遞增，鬆手回彈 260ms）。*prototype 尚未實作，實作時補上。*

## 邊界提示
- **採用**：方向性邊緣遮罩（哪一側超出，該側浮出 40px 漸層，四側獨立判定）+ 左上偏移徽章「已偏移 · 68%／還原」（只要 `z ≠ fit` 或 `pan ≠ 0` 才出現）。
- **不採用**：minimap（開發者工具語彙、會變成第二焦點）。若日後需要，僅限檢視模式且元件面積 > 畫布 2.5 倍。

## 三種呈現情境
| 情境 | 互動 | 控制列 | 邊界提示 | 網格 |
|---|---|---|---|---|
| 檢視模式（單頁大圖）| 完整（⌘+滾輪）| 48px · idle 0.5 | 遮罩 + 徽章 | 隨 z 縮放 |
| 播放模式（全螢幕）| 完整（純滾輪）| 48px · idle 0.32 · 3s 回落 | 遮罩 + 徽章 | 隨 z 縮放 |
| 縮覽圖（210px ≈ 0.13×，不掛真元件）| 無（純靜態）| 不渲染 | 不渲染 | **固定 6px 點距**（不乘 z）|

縮覽圖其餘降級：圓角 `radius-xl 24` → `radius-xs 4`；紙張改為白色矩形 + 3 條骨架線（首行 `blue-200`）。

## 動態
| 轉場 | 時長 / easing |
|---|---|
| 按鈕 / 雙擊 / 鍵盤觸發的 zoom · fit | 260ms `--ease-out`（紙張 transform 與網格 background-size 同時）|
| 滾輪縮放 · 拖曳平移 | 0ms（跟手，不可有過渡）|
| 控制列 idle ↔ active | 200ms `--ease-out`（僅 opacity）|
| 邊緣遮罩 | 200ms `--ease-out`（僅 opacity）|
| 偏移徽章進場 | 240ms `--ease-out`（opacity + `translateY(-4px)→0`）；離場 200ms |
| icon button hover / press | 140ms `--ease-out` / `scale(.97)` |
| `prefers-reduced-motion` | 全部 0ms（直接跳位）|

## 空狀態（尚未綁定元件）
虛線紙張輪廓（**唯一使用虛線之處**）：760×340 · 1px dashed `border` · `radius-lg` · dark 底 `sunken`；內容 lucide `frame` icon 56px（`brand`）+「尚未綁定視覺化元件」(`h4 24`) + `@ai-visualize · <id>`（`micro 14` mono）+ 說明（`small 17` `muted`）。網格照舊、控制列以 35% 不透明度 disabled，讓「這是畫布」在空狀態就先被理解。

---

## 元件 API（prototype）
```jsx
<CanvasViewport
  content={<RRRaci />}   // 元件節點；縮覽圖時傳骨架
  natural={860}          // 紙張內容寬度（元件原設計版心）
  w={1392} h={658}
  mode="view"            // "view" | "play" | "thumb"
  dark={false}
  compact={false}        // 並排雙畫布：40px 控制列、隱藏百分比
  outerScale={scale}     // 外層 transform: scale，平移量需除以它才跟手
  empty={false} emptyId="rr-structure"
  fitRef={ref}           // 外部觸發 fit（雙畫布同步還原）
/>
```

## 重建檢查清單（Acceptance）
- [ ] 元件初始水平＋垂直置中且 fit 到畫布（四周 24px 呼吸），不放大超過 100%。
- [ ] 滾輪／捏合縮放（指標錨點）、左鍵拖曳平移、雙擊與 fit 按鈕還原皆正確。
- [ ] `⌘/Ctrl` 規則正確：檢視模式純滾輪捲頁、⌘+滾輪縮放；播放模式純滾輪縮放；未消化事件冒泡（用原生 non-passive listener）。
- [ ] 不佔用 `←` `→` `↑` `↓` `Space` `Esc` `O`；`+` `-` `0` 僅在指標位於畫布上時生效。
- [ ] 元件內部互動（RACI 點選 legend / 列）在任何倍率下仍可用；`⌥` 拖曳可從元件上平移。
- [ ] 點陣網格隨縮放、含 z<0.5 / z>2 降級；light / dark 兩套點色正確。
- [ ] 偏移徽章只在偏移時出現，「還原」＝控制列 fit；邊緣遮罩四側獨立判定。
- [ ] 控制列 idle 0.5 / 播放 0.32 → 1，3s 回落；並排雙畫布為 40px 精簡版。
- [ ] 210px 縮覽圖：無 chrome、無遮罩、固定 6px 點距、骨架紙張、圓角降級。
- [ ] 空狀態：虛線紙張輪廓 + 元件 id + disabled 控制列。
- [ ] `prefers-reduced-motion` 下所有轉場為 0ms 且內容完整可讀。
- [ ] 顏色 / 字級 / 間距 / 圓角全部對應既有 token，未新增任何值。
