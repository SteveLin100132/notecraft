# Handoff：NoteCraft Workbench — Loading 與轉場

## Overview
NoteCraft Workbench 是 **Astro 5 靜態多頁站（MPA）**，每次切換筆記都是瀏覽器整頁導覽。這份 handoff 處理兩個空白瞬間：

1. **第一次進站**：殼（Rail／Sidebar／頁籤列／Header）與內容還沒畫出來前的空白。
2. **進入或切換筆記**：主區內容先空一下才出現，以及互動視覺化（`client:visible` island）晚一拍才撐開。

設計方向：殼在換頁時**完全不動**，只有主區做 200–280ms 的淡入加少量位移；骨架只在等待超過 150ms 時出現，出現後至少停留 300ms；SSR 的「—」佔位換成真值時不改寬度。

## About the Design Files
`prototype/` 裡的檔案是 **用 HTML + 瀏覽器內 Babel 寫的設計參考**，展示預期的外觀與時序，**不是要直接搬進專案的程式碼**。請在 NoteCraft 既有的 Astro + React island 架構中重新實作，沿用專案現有的 layout、元件與 `--wb-*` token。

例外：
- **`nc-loading.css`** 是正式版可直接使用的樣式（token、骨架、佔位、跨文件 View Transitions、reduced-motion）。Prototype 載入的就是同一份。
- **`reference/`** 是給正式版的起手程式碼（Astro／React／inline script），可以直接改寫後放進專案。

Prototype 用 React state 模擬 MPA 換頁，並以 same-document `document.startViewTransition()` 套用**與正式版相同的** `::view-transition-*` 規則。正式版改用 cross-document View Transitions（`@view-transition { navigation: auto }`，已寫在 `nc-loading.css`）。

## Fidelity
**High-fidelity。** 時長、easing、位移量、骨架尺寸、色彩 token 都是最終值，請照數值實作。

## 怎麼看 Prototype
用本機 server 開 `prototype/NoteCraft-Loading-Transitions.html`（例如 `npx serve prototype`）。右下 Tweaks →「載入與轉場」：

| 控制 | 作用 |
|---|---|
| 模擬網路：快／一般／慢速／卡住 | 回應、Body、JS、island 的延遲（見下方時序表）。「卡住」停在骨架方便檢查 |
| 轉場：依情境／統一 | 依情境 = peer／drill／section 三種；統一 = 全部 peer |
| 標題共享元素（評估用） | 試看 D1 不採用的方案 |
| 模擬減少動態 | 套用 reduced-motion 規則 |
| 深色模式 | `.wb-dark` |
| 重播啟動載入 | 重看第一次進站 |

靜態狀態參數（Spec 頁用）：`?loadDemo=boot | note | viz | list | values | mid`，可加 `&dark=1`、`&vp=m`（手機）、`&vp=t`（平板）。`mid` 另可加 `&t=0|60|120|240` 取轉場分格。`boot` 可接 `#note/<slug>`。

`prototype/Loading-Transitions-Spec.html` 是完整規格頁（時序圖、各狀態 iframe、決策、token、命名表），與本 README 內容一致。

---

## 時序模型

一次換頁分四段：**舊頁等回應 → View Transition → 主區 Body → island hydrate**。

| 段落 | 觸發 | 使用者看到 |
|---|---|---|
| 1. 舊頁等回應 | 點站內連結 | 舊頁不變；>150ms 時主區頂端出現 2px 進度線 |
| 2. View Transition | 新頁 `#nc-hd`（Header）解析完 | 主區舊內容淡出、新內容淡入；殼不動 |
| 3. Body | HTML 串流 | 內容已到：直接顯示。未到且 >150ms：Body 骨架 |
| 4. Island | 元件進入視窗前 200px + JS 載完 | >150ms 時顯示 GeneratedFrame 佔位；>800ms 顯示「互動圖表載入中」 |

Prototype 的模擬延遲（ms）：

| 設定 | 回應 resp | Body | JS | island 進入視窗後 | 啟動 |
|---|---|---|---|---|---|
| 快 | 30 | 0 | 60 | 60 | 80 |
| 一般 | 140 | 100 | 260 | 140 | 300 |
| 慢速 | 650 | 1100 | 900 | 500 | 1800 |
| 卡住 | 250 | ∞ | ∞ | ∞ | ∞ |

### 門檻（避免骨架閃一下）
| 門檻 | 值 | 套用 | 實作 |
|---|---|---|---|
| 出現延遲 | **150ms** | 所有骨架、island 佔位、進度線 | 純 CSS：`opacity:1; transition: opacity 200ms var(--nc-ease) var(--nc-sk-delay)` + `@starting-style { opacity:0 }`。串流 HTML 也適用，不需要 JS |
| 最短顯示 | **300ms** | 由 JS 控制替換的佔位（`VizIsland`） | 內容在 150ms 內就緒 → 直接換，骨架完全不出現；超過 150ms → 等到「出現後滿 300ms」再換。公式：`hold = elapsed < 150 ? 0 : max(0, 450 - elapsed)` |
| 提示文字 | **800ms** | 佔位內的「互動圖表載入中」 | 同上 CSS 手法，delay 改 `--nc-sk-label-delay` |
| VT 起點 | 新頁 Header | 跨文件 VT 快照時機 | `<link rel="expect" href="#nc-hd" blocking="render">` |

純 CSS 骨架（串流中的 Body）沒有最短顯示，改靠內容 200ms 淡入（`.nc-body-wrap > .nc-content`）讓替換不生硬。

---

## Screens / States

殼尺寸（既有，不變）：Rail 52px（深底 `--wb-rail`）＋ Sidebar 240px（`--wb-bg`，右框 1px `--wb-line`）＋ 主區（頁籤列 34px／Header／Toolbar 40px／Body）。整頁不捲動，只有主區 Body 與 Sidebar 內部捲動。≤860px：Rail 變底部 54px tab bar、Sidebar 變 272px 抽屜、頁籤列換成 Header 右上 32×32 計數鈕。861–1100px：Sidebar 變抽屜，頁籤列保留。

### A. 啟動 Loading（第一次進站）
- **不做 splash，不加額外品牌元素。** Rail 上 28px 標誌與 Sidebar 標題「NoteCraft 工作台」＋路徑 `~/notes/src/content/notes` 本來就是殼，**隨第一個位元組以真值輸出**，網路快時看到的就是正式畫面。
- 真值輸出（不做骨架）：Rail 全部 icon 與 AI 待生成小點、Sidebar 工作區標題、Sidebar 區段標題（「資料夾」「系列」「Plugin 資料檔」）、頁籤列（由 inline script 從 localStorage 同步畫出，見「State Management」）。
- 骨架：Sidebar 項目列、Sidebar 底部卡、Header、Body。
- **Sidebar 項目骨架**（每列沿用 `.wb-sb-item` 高 32px、padding-left 10px）：11px 空格 → icon 方塊 14×12（系列為 8×8 色塊）radius 3 → 標籤條寬 60–112px 高 9 → flex 空白 → （系列）34×3 進度條 pill → 計數條 14（系列 22）×9。資料夾 5 列、系列 3 列、Plugin 2 列。
- **Header 骨架**：麵包屑條 150×9；下方一列：標題條 `min(300px, 50%)`×20、pill 64×20、pill 52×20（radius 999），gap 8；欄間 gap 8。
- **換成內容**：正式版不用覆蓋層。每個區域把骨架放在內容之前，`:has()` 一看到內容開頭就藏骨架，殼與內容依串流順序各自出現。Prototype 用同排版的覆蓋層 200ms 淡出模擬。
- 原始 HTML 的 `<div id="root">` 內也放了一份純 HTML 骨架（見 Prototype HTML），對應正式版第一個回應內的 inline 骨架。

### B. 筆記內容頁骨架（`reference/NoteSkeleton.astro`）
容器：`.wb-host` padding `26px 32px 60px`，背景 `--wb-bg`；格線 `minmax(0,1fr) 220px`、gap 40px；≤860px 單欄並隱藏目錄。

由上而下（寬 × 高，radius 4 除非註明）：
| 區塊 | 骨架 |
|---|---|
| 返回連結 | 96×12，margin-bottom 22 |
| 標籤 | pill 56／68／46 × 22（radius 999），gap 6，margin-bottom 18 |
| 標題 | 62%×30，margin-bottom 10；34%×30，margin-bottom 20 |
| 描述 | 88%×14、64%×14，gap 11，margin-bottom 20 |
| meta 列 | pill 168×26（閱讀進度）、111×11（日期）、124×11（視覺化數）、flex、pill 86×26（動作）；gap 14；padding-bottom 18；底線 1px `--wb-line` |
| H2 | 38%×20，margin `34px 0 16px` |
| 段落 | 100／97／99／58% × 12，gap 11，margin-bottom 18 |
| 程式碼區塊 | 外框 1px `--wb-line`、radius 8、底 `--wb-sk-frame`、margin 22px 0；標題列 34px（底 `--wb-panel`、底線 `--wb-line-2`）：52×9、flex、40×9；內容 padding 14/16、gap 9，6 行寬 46/62/38/70/52/28%、高 9、縮排 0/18/18/36/18/0px |
| 視覺化框 | 同 GeneratedFrame：外框 1px、radius 8、margin 26px 0、高 300；caption 列 39px（底 `--wb-panel`）：14×14 方塊、72×9、flex、140×9；內部 inset 14px 的 shimmer 區塊 opacity .55、radius 6 |
| 目錄 | sticky top 8；標頭 34×10 ↔ 64×9；左線 2px `--wb-line`，7 行 gap 12，寬 120/96/132/104/88/72/112，H1 高 11、H2/H3 高 9，margin-left 14 + 深度×12 |

`/notes` 列表骨架：列高 `var(--pt-row-h, 38px)`、padding 0 16、gap 9、底線 `--wb-line-2`；icon 13×13 → 標題 140–244 × 10 → 路徑（標題寬 × .6）× 8、opacity .7 → 標籤 pill 44／52 × 18 → AI pill 64×18 → 日期 32×9。≤860px 隱藏路徑與標籤，列改 min-height 46、可換行。Toolbar 是真值（在骨架上方 40px）。
Dashboard 骨架：`.wb-grid` 12 欄 gap 12；KPI ×4（span 3、min-height 112：72×10 標題列，70×34 數字＋70%×9）；span 8 與 span 4 的清單卡（min-height 220，5 列 34px）。

### C. 互動視覺化佔位（`reference/VizIsland.tsx`）
- 現況問題：`client:visible` 元件先空一塊，再突然撐開。
- **能 SSR 的生成元件**：Astro 本來就會輸出 SSR HTML，**不需要佔位**；hydrate 前把互動按鈕設 `disabled`，hydrate 後加 `data-hydrated`。
- **需要量測容器寬度、SSR 輸出空白的元件**（使用 ResizeObserver 的那些）：包一層 `VizIsland`：
  - 外框與 GeneratedFrame 完全相同（1px `--wb-line`、radius 8、caption 列 39px、margin 26px 0）。
  - caption 右側 `generated/{id}.tsx` 是 SSR 真值（mono 11px `--wb-ink-3`）；左側 sparkle icon 14px `--wb-gold` ＋ 76×9 骨架。
  - 高度：生成 skill 驗證元件時量測，寫進 MDX 的 `h`；佔位以 `min-height: h + 52px` 預留。**hydrate 前後高度不變。**
  - 內部：inset 14px 的低對比 shimmer 區塊；800ms 後中央出現 pill「互動圖表載入中」（12px `--wb-ink-3`，底 `--wb-sk-frame`，padding 3/10）。
  - 就緒：真實元件 200ms 淡入（只有佔位曾顯示時才淡入）。
  - `client:visible={{ rootMargin: "200px" }}`：提前 200px 開始 hydrate。

### D. 「—」佔位 → 真值
| 層級 | 位置 | 做法 |
|---|---|---|
| 殼內 | Sidebar 系列進度（`3/5`、進度條）、頁籤列、手機頁籤計數 | `reference/nc-shell-inline.js`：在元素後面用 `<script is:inline>` 同步讀 localStorage 寫入，且放在 `#nc-hd` 之前，讓新頁快照已經是真值。**換頁時這些值永遠不會出現「—」** |
| 主區 | Dashboard「本週更新」與閱讀狀態圖例、列表相對日期欄（`.wb-row-d`）、筆記 meta 的閱讀進度 | SSR 輸出「—」（`--wb-ink-3`、`font-weight:400`），放在與真值**同寬**的槽位（`tabular-nums`＋固定寬，例如 `.wb-row-d` 46px）。hydrate 後換字，200ms opacity 淡入，**不做數字滾動或寬度動畫** |

### E. 切換筆記的轉場
只有 `.nc-main-pane`（Header＋Toolbar＋Body）有 `view-transition-name: nc-main`。`::view-transition-old/new(root)` 為 `animation:none`，所以 Rail、Sidebar、頁籤列直接換成新頁的樣子，不淡入淡出。

| 情境 | 例子 | `data-nc-vt` | 舊主區 | 新主區 |
|---|---|---|---|---|
| 筆記之間 | 點頁籤、⌘K、系列上一章／下一章、內文連結、⌥ , ／ ⌥ . | `peer` | opacity 1→0，120ms | opacity 0→1、translateY 4px→0，240ms |
| 從列表進入 | Dashboard、`/notes`、系列詳情、AI 佇列 → 筆記或資料檔 | `drill` | 同上 | opacity 0→1、translateY 8px→0，280ms |
| 頂層頁面、返回列表 | Dashboard ↔ `/notes` ↔ `/plugins` ↔ `/settings`；筆記 → 列表 | `section` | 同上 | opacity 0→1，200ms，無位移 |
| 重新整理 | `navigationType === "reload"` | — | `skipTransition()` | — |

Easing 一律 `cubic-bezier(.22,.7,.3,1)`（ease-out，與既有 Drawer 相同）。

分格（peer，頁籤切換）：
| t | 舊主區 | 新主區 | 頁籤指示器 |
|---|---|---|---|
| 0ms | 100% | 0% | 在舊頁籤 |
| 60ms | ≈17% | ≈53%、上移剩 1.9px | 走到約 53% |
| 120ms | 0% | ≈83%、剩 0.7px | ≈83% |
| 240ms | — | 100% | 在新頁籤 |

**頁籤指示器**：active 頁籤頂端 2px `--wb-blue` 線從 `box-shadow: inset 0 2px 0` 改成獨立元素 `<i class="nt-ind">`（absolute、top 0、left/right 0、height 2px），只有 active 頁籤有，`view-transition-name: nc-tab-ind`。group 補間位置與寬度 240ms；`::view-transition-old(nc-tab-ind)` 隱藏。來源頁沒有 active 頁籤時淡入。新頁籤插入時頁籤列直接換成新排列，只有藍線在動。**前提**：頁籤列必須在快照前畫好（inline script），否則新頁快照裡是空的頁籤列。

**手機抽屜**：點抽屜項目時立即移除 `.wb-sb.open`（既有 220ms transform 滑出），再讓瀏覽器導覽。≤1100px 時 `.wb-sb` 命名 `nc-drawer`、`.wb-sb-scrim` 命名 `nc-scrim`：新頁若在抽屜關完前就到，抽屜從快照位置繼續滑出（group 220ms），scrim 淡出 220ms。

**舊頁進度線**（`reference/nc-vt.js`）：攔截站內連結 click，在 `.nc-main-pane` 頂端插入 `<i class="nc-progress">`：absolute、top 0、height 2px、`--wb-progress`，150ms 後出現，2.4s 內 scaleX .06→.85（ease-out）。舊內容不變暗。`pageswap`、bfcache `pageshow(persisted)` 時移除。

### F. 其他頁面
Dashboard、`/notes`、`/plugins`、`/settings`、系列、標籤之間用同一套機制，type 為 `section`。Rail 選中狀態直接切換、不做動畫。Present（全螢幕簡報）與版型庫不帶殼，不套用。

### 決策
- **D1 標題共享元素：不採用。** 來源有頁籤（12.5px）、列表列（13px）、Dashboard 卡片、⌘K 四種，與 20px 標題的比例約 1:1.6，快照放大後文字糊；頁籤在 Header 上方，標題會往下飛過整個 Header；一天切幾十次會干擾。連續性由頁籤指示器提供。
- **D2 頁籤指示器：獨立元素 + 跨頁補間。**
- **D3 列表進入 vs 筆記之間：區分但差異小**（8px／280ms vs 4px／240ms）。
- **D4 頂層頁面：同一機制，`section`（純淡入）。**
- **D5 慢回應：舊頁顯示進度線，不變暗。**

---

## Reduced motion（`prefers-reduced-motion: reduce`）
| 項目 | 一般 | 減少動態 |
|---|---|---|
| 主區換頁 | 淡出＋淡入＋位移 | 舊頁直接消失；新頁 **100ms linear 淡入**，無位移 |
| 頁籤指示器、抽屜 | 補間 | 直接跳到新位置（group duration 0） |
| 骨架 | 150ms 後 200ms 淡入；shimmer | 150ms 後**直接出現**；無 shimmer（`background-image:none`） |
| 進度線 | 增長動畫 | 靜態滿版、opacity .55 |
| 骨架／佔位／「—」換內容 | 200ms 淡入 | 直接替換 |

出現延遲（150ms）與最短顯示（300ms）在減少動態下**照樣保留**，它們是防閃爍，不是動畫。

---

## State Management
- **Prototype 狀態**（僅供理解；正式版由瀏覽器導覽取代）：`phase: "skeleton" | "content" | "hydrated"`、`pendingNav`、`boot: "on" | "out" | "off"`；`nav(to, apply)` 依序執行「等回應 → `ncRunVT(type, apply)` → 骨架 → 內容 → hydrate」。見 `prototype/wb/pt-app-load.jsx` 的 `nav`。
- **正式版需要的資料**：
  - `localStorage["nc.tabs.v1"]`（既有）：頁籤清單。inline script 用 build 產出的 inline JSON 索引 `window.__NC_INDEX`（`"note:slug" → { title, path, data }`）解析標題，同步渲染頁籤列。
  - `localStorage["nc.reading.v1"]`（既有閱讀狀態）：Sidebar 系列進度。
  - `<body data-tab-key="note:{slug}">`：目前頁是否為頁籤頁。
  - 轉場 type：新頁 `pagereveal` 依 `navigation.activation.from.url` 與 `location` 計算，寫入 `<html data-nc-vt>`，`finished` 後移除。
- **Astro layout 骨架**（摘要；完整見 Spec 頁 §09）：
  ```html
  <head>
    <style is:inline>/* nc-loading.css 的 token + .nc-sk + .nc-sk-root（約 1.5KB），第一個回應就能畫骨架 */</style>
    <link rel="stylesheet" href="/nc-loading.css">
    <link rel="expect" href="#nc-hd" blocking="render">
    <script is:inline src="/nc-vt.js"></script>
  </head>
  <body data-tab-key="…">
    <div class="wb-app">
      <Rail /> <Sidebar /> <script is:inline>/* 系列進度 */</script>
      <main class="wb-main has-tabs">
        <div class="nt-bar" id="nc-tabs"></div><script is:inline>/* 頁籤列 */</script>
        <div class="nc-main-pane">
          <Header id="nc-hd" />
          <div class="nc-body-wrap">
            <NoteSkeleton />                         <!-- .nc-body-sk-flow -->
            <article class="nc-content"><slot /></article>
          </div>
        </div>
      </main>
    </div>
  </body>
  ```
- 頁籤 island（`client:load`）hydrate 時必須沿用 inline script 產生的同一份 DOM 結構（含 `.nt-ind`），不可先清空再重畫。
- 不支援跨文件 VT 的瀏覽器（目前 Firefox）：直接整頁切換。殼位置固定，所以視覺上只有主區換內容。

---

## Design Tokens
既有 token（`wb/pt.css`，不變）：`--wb-blue #1b4f9c`、`--wb-blue-d #163f7d`、`--wb-blue-l #2c6ebb`、`--wb-gold #ed9b26`、`--wb-bg #f6f8fb`、`--wb-panel #fff`、`--wb-line #e1e6ee`、`--wb-line-2 #eef1f6`、`--wb-ink #161c28`、`--wb-ink-2 #2b3546`、`--wb-ink-3 #6c798e`、`--wb-rail #161c28`。深色（`.wb-dark`）：bg `#12161f`、panel `#1a202b`、line `#2a323f`、line-2 `#232a36`、ink `#eef2f7`、ink-2 `#c3ccd8`、ink-3 `#8b98ab`、rail `#0d1117`。

**新增 token**（定義在 `nc-loading.css` 的 `:root` 與 `.wb-dark`，規則內不寫死色碼）：

| token | 亮色 | 深色 | 用途 |
|---|---|---|---|
| `--wb-sk` | `#e8ecf2` | `#222935` | 骨架底色 |
| `--wb-sk-hi` | `#f4f6f9` | `#29313d` | shimmer 高光（與底色差約 4%） |
| `--wb-sk-frame` | `#fbfcfe` | `#1d2430` | 程式碼、視覺化佔位框內底色 |
| `--wb-progress` | `var(--wb-blue-l)` | 同 | 舊頁進度線 |
| `--nc-sk-delay` | 150ms | | 骨架、進度線出現延遲 |
| `--nc-sk-min` | 300ms | | JS 控制骨架最短顯示（JS 端同值常數） |
| `--nc-sk-label-delay` | 800ms | | 佔位提示文字 |
| `--nc-sk-period` | 2.4s | | shimmer 週期 |
| `--nc-ease` | `cubic-bezier(.22,.7,.3,1)` | | 所有轉場 |
| `--nc-dur-out` | 120ms | | 舊主區淡出 |
| `--nc-dur-in` | 240ms | | peer 進場 |
| `--nc-dur-drill` | 280ms | | drill 進場 |
| `--nc-dur-section` | 200ms | | section 進場 |
| `--nc-dur-ind` | 240ms | | 頁籤指示器 |
| `--nc-dur-swap` | 200ms | | 骨架／佔位／「—」換成內容 |
| `--nc-dur-drawer` | 220ms | | 手機抽屜 |
| `--nc-rise` | 4px | | peer 位移 |
| `--nc-rise-drill` | 8px | | drill 位移 |

**Shimmer**：`linear-gradient(100deg, transparent 38%, var(--wb-sk-hi) 50%, transparent 62%) 0 0/200vw 100% fixed var(--wb-sk)`，`background-position` 0→200vw，2.4s linear infinite。`background-attachment: fixed` 讓全頁所有骨架共用同一道光，不會各自閃。

骨架圓角：一般條 4px、pill 999px、icon 方塊 3px；框（程式碼、視覺化）沿用 `--radius-lg` 8px。無陰影。

## view-transition-name
| 名稱 | 元素 | 條件 | 動畫 |
|---|---|---|---|
| `root` | 整頁 | — | none |
| `nc-main` | `.nc-main-pane` | 每頁一個 | 依 `data-nc-vt` |
| `nc-tab-ind` | `.nt-ind` | 只有 active 頁籤 | group 240ms；old 隱藏 |
| `nc-drawer` | `.wb-sb` | ≤1100px | group 220ms |
| `nc-scrim` | `.wb-sb-scrim` | 抽屜開啟 | old 淡出 220ms |
| `nc-title` | — | **不採用**（評估用） | — |

名稱在同一份文件中必須唯一。

## Assets
沒有新圖片或 icon。沿用既有 NoteCraft 標誌 SVG（`wb/pt-shell.jsx` 的 `NcLogo`）、PT_ICONS 線條 icon（sparkle 用於視覺化佔位 caption）。字型沿用 Noto Sans TC 與 `--font-mono`。

## Files
**正式版直接用**
- `nc-loading.css`：全部樣式與 token
- `reference/nc-vt.js`：pagereveal 轉場 type、舊頁進度線、手機抽屜關閉
- `reference/nc-shell-inline.js`：頁籤列與 Sidebar 系列進度的同步寫入
- `reference/NoteSkeleton.astro`：筆記 Body 骨架（純 HTML/CSS）
- `reference/VizIsland.tsx`：SSR 空白型生成元件的佔位包裝

**設計參考（`prototype/`）**
- `NoteCraft-Loading-Transitions.html`：可互動 Prototype（入口）
- `Loading-Transitions-Spec.html`：規格頁（時序圖、各狀態、決策、token）
- `wb/pt-load.jsx`：骨架元件（`NcSbSk`、`NcHeadSk`、`NcNoteSk`、`NcListSk`、`NcGridSk`）、`NcIsland`、`NcBoot`、`ncRunVT`、`ncVtType`、`ncHold`、`NC_SPEED`
- `wb/pt-app-load.jsx`：Workbench App，含換頁時序 `nav()` 與 Tweaks（由既有 `pt-app.jsx` 衍生）
- `wb/pt-tabs.jsx`：active 頁籤加 `<i class="nt-ind">`
- `app/noteview.jsx`：`viz` 區塊包 `NcIsland`
- 其餘 `app/`、`wb/`、`er/`、`_ds/`、`tweaks-panel.jsx`：既有 Workbench Prototype 的相依檔，未修改
