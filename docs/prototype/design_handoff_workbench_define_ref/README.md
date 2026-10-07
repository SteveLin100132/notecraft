# Handoff：工作台 — 定義區塊（define）、嵌入（include）、行內引用（ref）與反向連結

## Overview

作者寫系統文件時，常在多篇筆記重複寫同一段說明（角色職責、術語），之後要同步改好幾處。這份交付把「只定義一次，到處引用」整合進**工作台**（Rail／Sidebar／Header／Body／Drawer／Palette）與筆記頁：

- **define**：來源筆記裡可被引用的一段內容，有全域唯一 id（`命名空間.名稱`）
- **include**：在其他筆記原樣嵌入一段 define
- **:ref**：行內引用，hover／focus／點擊時預覽定義
- **反向連結**：來源處看得到「被哪些筆記引用」，改之前能評估影響

語法已定案（不在本包範圍）：

```mdx
::::define{id="hr.role-admin"}
**管理員**：負責帳號審核、權限設定與稽核報表。
:::note
離職時要同步撤權。
:::
::::

::include{id="hr.role-admin"}
送出後由 :ref[管理員]{id="hr.role-admin"} 審核。
```

前提：錯誤（id 不存在、重複、循環嵌入、公開引用私密）一律 build 期失敗，**沒有斷掉的引用狀態**；全站靜態輸出，預覽內容 build 期備好，**沒有載入中狀態**。

前置交付：`design_handoff_workbench/`（外殼、Drawer、Palette）、`design_handoff_note_toc/`、`design_handoff_note_tabs/`、`design_handoff_workbench_dashboard/`、`design_handoff_update_calendar/`。本包只描述新增與差異。

## About the Design Files

`source/` 是 HTML＋瀏覽器端 React（Babel inline）做的**設計參考**，用來定稿視覺、文案與互動，不是正式程式碼。請在 NoteCraft codebase 用既有元件、樣式與 MDX 管線重做；`source/` 只拿來對照結構、條件、class 名稱與數值。

## Fidelity

**High-fidelity。** 版面、間距、字級、顏色、文案、時序已定稿。顏色一律用工作台 `--wb-*` token；新增的值集中在 `pt-ref.css` 開頭（§7）。

## 怎麼看 Prototype

開 `prototype/NoteCraft-工作台-定義與引用-standalone.html`（自含單檔，可離線；等同專案根目錄的 `NoteCraft 工作台 Prototype.html`）。新筆記在 Sidebar「請假系統」資料夾、筆記列表、Dashboard（更新日誌、更新月曆 2026 年 6 月）、Palette、頁籤都看得到。右下 Tweaks：

- **工作台**：介面尺寸（自動／電腦／平板／手機）、**主題（亮／暗）**
- **定義與引用**：`:ref` 點擊行為（固定預覽卡／直接前往來源，對照用）；前往四篇主要筆記；釘選「管理員」預覽卡；「年度額度：被 13 篇引用」popover；請假系統列表 → Drawer 摘要
- **環境 → Dev 模式**：include 來源列顯示 id、反向連結 popover 顯示「複製 include／ref 語法」

| 筆記 | 示範 |
|---|---|
| 請假系統/系統 Overview | 來源端；4 個 define（admin＋note、manager＋表格＋h3、employee＋清單、leave-status＋steps＋tabs）；頂端「被引用」→ Drawer |
| 請假系統/請假功能規格 | include manager（含 h3，進 TOC）；同段落 :ref×2＋一般連結＋:tip；include leave-status（steps＋tabs） |
| 請假系統/加班申請規格 | 連續 include employee、manager；:ref leave-status |
| 請假系統/帳號權限規格 | 只有 :ref；超長段落末尾的 :ref 用來測翻轉 |
| 請假系統/術語表 | `hr.term-quota`（程式碼區塊，**被 13 篇引用**）；`hr.term-carryover`（**0 篇**，示範「尚未被引用」） |
| 請假系統/規格附錄 01–12 | 各以 :ref 引用 `hr.term-quota` |

引用數：admin 2、manager 2、employee 2、leave-status 2、term-quota 13（12 篇附錄＋Overview 的 leave-status 特休分頁裡的 ref）、term-carryover 0。

> 註：`hr.term-carryover` 是為了示範 0 篇狀態額外加的；需求原文的術語表只有一個 define。

---

## 筆記頁：沿用既有 NoteView

新筆記和既有筆記用**同一個筆記頁**（`app/noteview.jsx` 的 `NoteView`）：返回列、標籤、h1、描述、閱讀進度、功能列、TOC、完成提示、頁尾都不變。差異只有三處：

1. **內文**：最上層標題仍走既有 h2／h3（同字級、同 id 規則 `h-<slug>`、同 TOC）。標題之間的連續區塊併成一個 `{ t: "rf", lv, blocks }`，交給 `RfBlocks` 渲染；外層 `.nc-flow.nc-in-note` 把字級、色彩、間距對齊 NoteBody：段落 `--text-md`、`--text-body`、行高 1.85、`margin:0 0 16px`；清單 `margin:0 0 18px; padding-left:22px`；嵌入的 h2／h3／h4 用 `--text-2xl`／`--text-xl`／`--text-lg`、`--text-strong`；表格、admonition、tabs、steps、圖片區塊間距 22px（同既有程式碼區塊）；程式碼區塊直接用既有 `CodeBlock`。define／include 區塊間距 26px，相鄰 define 34px、相鄰 include 18px；meta 列與來源列 12px。
2. **TOC**：含 define／include 的筆記改用 `rfToc` 產生項目（嵌入的標題帶 corner icon，id 為 `inc-<defId>-<slug>`）。TOC 不放「被引用」。
3. **頂端入口**：頁首「被引用 N」按鈕、meta 列「被 N 篇筆記引用」，兩者都開右側 Drawer（§4.1）。正文底部不加任何區塊。

暗色：既有 NoteView 用 `--text-strong`，工作台暗色沒有覆寫它；本包在 `.wb-dark` 補上 `--text-strong:var(--wb-ink)`，既有筆記暗色也一併修正。

## 0. 資料形狀

### 0.1 build 期索引

```ts
type DefId = string;                 // "hr.role-admin"
type NoteSlug = string;
type RefKind = "inc" | "ref";

type DefIndex = Record<DefId, {
  label: string;      // 預覽卡標題：define 內第一個 **粗體**；沒有就用 id
  src: NoteSlug;      // 所在筆記
  blocks: MdxAst;     // 已渲染內容（include、預覽卡共用）
  refs: { slug: NoteSlug; kinds: RefKind[] }[];   // 反向連結
}>;
```

規則：
- 同一篇多次引用同一 id 只算 1 篇，`kinds` 合併。
- 來源筆記引用自己的 define 不計入。
- define 內部的 `:ref` 計入**來源筆記**，不計入嵌入它的筆記（例：leave-status 的特休分頁 ref 了 term-quota → Overview 計入 term-quota 的反向連結；請假功能規格雖然嵌入了 leave-status，不計入）。
- 掃描範圍含 admonition、tabs、steps 內的巢狀內容。
- 反向連結排序：引用的 id 數多到少，同數依資料夾樹順序。

### 0.2 每篇筆記新增欄位（`window.NOTES` 既有形狀＋三個欄位）

```ts
interface Note {
  // 既有：slug, title, description, tags, category, createdAt, updatedAt, content, status?
  rf?: true;                                        // prototype 用：走新筆記頁渲染（正式版不需要）
  defines?: DefId[];                                // 本篇的 define id（文件順序）
  references?: { id: DefId; kinds: RefKind[] }[];   // 本篇引用的定義（不含自己的）
}
```

- 既有筆記不需改；缺欄位視為空陣列。
- 反向連結不存在筆記上，由 `DefIndex[id].refs` 推導（避免雙向資料不同步）。
- 新筆記 `category: "hr"` → 資料夾「請假系統」（`FOLDER_OF`／`FOLDER_COLOR` 新增一項，色 `#e37b24` = `--orange-500`），標籤統一「系統規格」。
- `updatedAt` 分散在 2026-06-01～06-14（prototype 的「今天」是 2026-06-12，月曆以最新一篇為基準），所以 Dashboard 更新日誌與月曆都看得到。
- `content`：最上層 h2／h3 照既有形狀；其餘併成 `{ t: "rf", lv, blocks, c }`（`c` 是純文字，供字數統計）。

prototype 對照：`source/wb/pt-ref-hr.jsx`（`RF_DEFS`、`RF_NOTES`、`rfOutgoing`、`RF_INDEX`、`rfBacklinks`、併入 `window.NOTES`）。

---

## 1. 來源端：define 區塊 `.nc-def`

**做法：無底色、無框。** 左側留白處一條細線括號＋上方一行 11.5px meta 列。和 admonition（有底色、有框、有標題列）明顯不同。

```
          # hr.role-admin  │  被 2 篇引用 ⌄          ← .nc-def-meta
  ┌       管理員：負責帳號審核……                     ← .nc-def-body（正文樣式不變）
  │       [NOTE 離職時要同步撤權。]
  └
  ↑ .nc-def::before（內文左緣外 18px）
```

| 部位 | 規格 |
|---|---|
| `section.nc-def` | `position:relative; margin:1.75em 0`；相鄰兩個 define `margin-top:2.25em`；`scroll-margin-top:28px`；`id="def-<id>"`、`tabindex="-1"`（導覽落點） |
| 括號 `::before` | `left:-18px; top:2px; bottom:2px; width:6px`；`1px solid var(--nc-def-rule)`，無右邊，`border-radius:3px 0 0 3px`。hover／focus-within／popover 開啟／flash 時 `--nc-def-rule-on`，160ms ease-out |
| `.nc-def-meta` | 高 20px，`gap:10px`，`margin-bottom:6px`，11.5px `--wb-ink-3` |
| `.nc-def-id` | `<button>`：hash icon 12px＋id（`--font-mono` 11.5px）；點擊複製 `/notes/<src>#def-<id>`，toast。hover 底 `--wb-bg`、字 `--wb-ink-2`、radius 4px |
| `.nc-def-sep` | 1×10px `--wb-line` |
| `.nc-def-cnt` | `<button aria-haspopup="dialog" aria-expanded>`：「被 **N** 篇引用」＋chevron 11px。N 700 `--wb-ink-2` tabular-nums；hover／展開時底 `--wb-bg`、字 `--wb-blue-l` |

**引用數狀態**

| 狀態 | 呈現 | 範例 |
|---|---|---|
| 0 篇 | 「尚未被引用」純文字（`.nc-def-cnt.zero`），不可點 | `hr.term-carryover` |
| 1–9 篇 | 點擊開反向連結 popover，全部列出 | Overview 的四個 define |
| ≥10 篇 | popover 頂端加篩選框「篩選 N 篇筆記…」；清單 `max-height:280px` 內捲 | `hr.term-quota` |

**反向連結 popover**（`.nc-pop.nc-bl-pop`，寬 360px，共用 §3 的殼）：標題「被 N 篇筆記引用」＋`# id`；列 `.nc-bl-pi` min-height 40px（sheet 48px）：doc icon 14px、標題 13px／500、資料夾 11px、右側 kind pill（嵌入＝corner icon／行內＝hash icon，18px 高、1px `--wb-line` 框）。點列 → 開該筆記頂端。Dev 模式底部 `.nc-pop-acts`「複製 include 語法」「複製 ref 語法」。篩選無結果：「沒有符合「q」的筆記」。

**導覽落點**（include「前往來源」、預覽卡「開啟來源」、Palette、Drawer）：
1. 開來源筆記（新頁籤或切到既有頁籤），捲到 `#def-<id>`，上留 32px
2. `section.focus({preventScroll:true})`
3. 加 `.flash`：`::after` `inset:-8px -12px`、radius 8px、`--nc-def-flash` 底，保持 1.2s 後 400ms 淡出（`ncDefFlash 1600ms`，0–75% 不透明）；括號同時亮起
4. reduced-motion：不淡出，改 2px `--nc-def-rule-on` 外框 1.6s 後移除

工作台實作注意：頁籤切換會還原捲動位置（rAF），落點捲動要排在它之後（prototype 用 90ms timeout）。

---

## 2. 引用端：include 區塊 `.nc-inc`

**做法：2px 左線＋頂端來源列，無底色、無外框。** 內文字級、行高、色彩和正文相同。

```
│ ↳ 嵌入自 系統 Overview · hr.role-manager            前往來源 ↗
│ 主管：部門的第一線簽核者……
│ 主管職責（標題層級相對化）
│ [表格]
```

| 部位 | 規格 |
|---|---|
| `.nc-inc` | `margin:1.75em 0; padding-left:16px; border-left:2px solid var(--nc-inc-rule)`；`role="group" aria-label="嵌入內容：主管，來自 系統 Overview"` |
| `.nc-inc-src` | min-height 20px，`gap:6px`，`margin-bottom:6px`，11.5px `--wb-ink-3`：corner icon 12px、「嵌入自」、來源標題（`--wb-ink-2`／500，省略號）、Dev 模式才顯示「· id」（mono） |
| `.nc-inc-go` | 「前往來源 ↗」靠右，20px 高，hover 底 `--wb-bg` 字 `--wb-blue-l`；真的 `<a href>`，可新分頁 |
| `.nc-inc-body` | 第一個／最後一個子元素 margin 歸零 |

不用底色或框的理由：admonition、表格、程式碼、tabs 本身就是有框的盒子，include 常包著它們，再加框會變成盒中盒。左線 2px，和 blockquote（4px 橘線＋橘底）也分得開。

**各種內容**：段落、清單、表格（`.nc-tablewrap` 1px 框 radius 8px）、admonition、tabs、steps、程式碼、圖片都沿用正文樣式。

**steps**（`ol.nc-steps`，本包補上的既有擴充語法樣式）：每步 `grid 1.6em 1fr`，column-gap .75em，步距 .85em；圓形序號 `1.95em`（字 .8em／800），1.5px `--wb-blue-l` 框、`--wb-panel` 底；步驟間 1px `--wb-line` 連接線（`left:.8em`）；步驟名 700 `--wb-ink`，說明 .92em。

**連續嵌入**（加班申請規格）：相鄰 `.nc-inc` `margin-top:1.25em`（一般 1.75em 的約 70%），各自保留左線與來源列，線在中間斷開。不合併：來源可能不同，「前往來源」要能分別點。

**嵌入內容的標題與 TOC（建議）**
- **層級相對化**：define 裡最高的標題，嵌入時變成「嵌入處最近一個標題的下一級」，上限 h4。例：manager 的 `### 主管職責` 嵌在 `## 簽核角色` 下 → h3；嵌在 h3 下 → h4。
- **計入 TOC**，前面加 corner icon 11px `--wb-ink-3`，`title="嵌入的內容"`。理由：嵌入的段落常是讀者要找的內容，icon 提示編輯處在別篇。
- 沒採用：保留原始層級（大綱可能倒置）；不計入 TOC（讀者找不到）。
- 來源筆記本身的 define 標題照一般標題處理，不加 icon。

---

## 3. 行內引用 `:ref` 與預覽卡

### 3.1 三種行內樣式並存

| | 文字色 | 底 | 底線 | 游標 |
|---|---|---|---|---|
| 一般連結 `a.nc-a` | `--wb-blue-l` | 無 | 1px `--nc-a-line`，offset 3px；hover 實色 | pointer |
| 既有 `:tip` `.nc-tip` | 繼承正文 | 無 | 1px **dotted** `--wb-ink-3` | help |
| **`:ref` `a.nc-ref`** | `--wb-ink` | `--nc-ref-bg` | **1.5px solid** `--nc-ref-line`（border-bottom） | pointer |

- `a.nc-ref`：`padding:0 .18em; border-radius:3px 3px 0 0; box-decoration-break:clone`；hover／卡片開啟（`.on`）底換 `--nc-ref-bg-on`，160ms ease-out；focus-visible 2px `--wb-blue-l` outline offset 2px。
- 顏色 × 底色 × 線型三維度區分，色弱也能從底色與線型分辨。

### 3.2 桌機互動（有 hover 的裝置）

| 觸發 | 行為 |
|---|---|
| 滑鼠移入 | 300ms 後開卡；移出 ref 與卡片 150ms 後關，中途移入卡片取消 |
| 鍵盤 focus-visible | 150ms 後開卡，焦點留在 ref |
| **點擊／Enter** | **固定卡片**，焦點移進卡片；再點同一 ref 關閉 |
| 在 hover 卡上按下滑鼠 | 轉為固定 |
| ⌘／Ctrl／Shift＋點擊 | 原生：新分頁開來源（`<a href="/notes/<src>#def-<id>">`） |
| 已固定時 hover 其他 ref | 不換卡 |
| 點卡片外 | 關閉固定卡 |
| 捲動 | 跟著 ref 重新定位；未固定且 ref 捲出視窗時關閉 |

**點擊 ref（建議：固定預覽卡）**
1. ref 的用途是不離開本篇就看懂一個詞；直接導覽會打斷閱讀。
2. hover 卡片移開就消失；選字、捲動長內容、觸控板操作需要固定。
3. 手機一定是點擊開預覽，桌機一致。
4. 導覽仍很近：卡片「開啟來源」、修飾鍵開新分頁。
- 沒採用：點擊直接導覽（維基百科式）。ref 外觀已和連結不同，不必沿用跳頁預期。Tweaks 可切換對照。

### 3.3 預覽卡 `.nc-pop`（`role="dialog"`、`id="rf-pop"`）

```
┌─────────────────────────────── 400px ┐
│ 管理員                             ✕ │ .nc-pop-h（✕ 只在固定時）
│ # hr.role-admin                      │
├──────────────────────────────────────┤
│ 內容 13.5px，max-height 320px          │ .nc-pv-b
│ ░░ 漸層遮罩 56px ░░  ⌄ 看完整內容        │ .clip / .nc-pv-more
├──────────────────────────────────────┤
│ 來自 系統 Overview · 請假系統   開啟來源 ↗ │ .nc-pop-f
└──────────────────────────────────────┘
```

| 部位 | 規格 |
|---|---|
| 外框 | `width:400px`、`max-width:calc(100vw - 24px)`；`--wb-panel` 底、1px `--wb-line`、radius 10px、`--nc-pop-shadow`；`position:fixed; z-index:50` |
| 標頭 | padding `11px 10px 9px 14px`；標題 14px／800；id 行 mono 11px `--wb-ink-3`；底線 1px `--wb-line-2` |
| 內容 | padding 12px 14px；`--nc-fs:13.5px`、行高 1.75；內文間距皆 em；admonition、表格、程式碼、tabs、steps、圖片間距 .9em；圖片高 ×0.72；標題一律 1.06em 且用 `<div>` |
| 過長 | 預設 `max-height:320px; overflow:hidden`；超出時 56px 漸層遮罩＋「看完整內容」（12px／700 `--wb-blue-l`）→ `max-height:min(60vh,520px)` 內捲、`overscroll-behavior:contain` |
| 頁尾 | min-height 38px；左「來自 **標題** · 資料夾」省略；右「開啟來源 ↗」12px／700 |
| 卡片裡的 ref | 只顯示樣式（`.nc-ref.is-static`），不開第二層卡 |

範例：管理員（段落＋note）完整顯示；假單狀態（steps＋tabs）超過 320px → 出現「看完整內容」。

**定位與翻轉**（以 ref 的 client rects）
1. 預設在 ref 下方 8px；左緣 = ref 左緣 − 14px（卡片內文與 ref 對齊）。
2. 下方（扣 12px 邊距）放不下且上方較大 → 翻到上方（`.up`，動畫方向相反）。
3. 上下都放不下 → 夾在視窗 12px 邊距內。
4. 水平夾在 `[12, 視窗寬 − 卡寬 − 12]`。
5. ref 斷行：下方用最後一段 rect，上方用第一段 rect。
6. 尺寸變動（展開、切 tab）用 ResizeObserver 重新定位。

測試：帳號權限規格「權限異動」超長段落末尾的「管理員」，捲到視窗下緣時卡片翻到上方。

### 3.4 手機與觸控：底部 sheet

條件：介面 ≤860px，或 `(hover: none)`。
- 點 ref → `.nc-sheet`：`max-height:78%`、上圓角 14px、抓手 36×4px、scrim `rgba(18,24,34,.44)`。
- 內容 15px，**不截斷**，sheet 內捲。
- 「開啟來源」改實心 pill，40px 高（含 padding 觸控區 ≥44px），`--wb-blue` 底（暗色 `--wb-blue-l`）。
- 關閉：scrim、✕、Esc。反向連結 popover 在手機也是 sheet，列高 48px。
- 沒採用：原地展開（定義含表格、tabs，會把句子拆開，收合後找不回位置）；直接導覽（手機返回成本更高）。

---

## 4. 反向連結

### 4.1 筆記頁「被引用」：頂端入口＋Drawer

**不放在正文底部。** 長篇筆記讀到底已經很吃力，反向連結是「改定義前」才需要的資訊，不該佔正文篇幅。入口放在頂端，內容用右側 Drawer。

**入口（本篇沒有任何 define 被引用時都不出現；TOC 不放「被引用」，TOC 只列正文標題）**
| 位置 | 樣式 |
|---|---|
| 頁首動作列（`.rf-bl-trig`，版型庫左邊） | `.wb-btn-ghost`：corner icon 14px＋「被引用 **N**」（N 700 `--wb-blue-l`）；Drawer 開啟時 `.on`：底 `--wb-bg`、框 `--wb-blue-l`。`aria-haspopup="dialog"`、`aria-expanded`；再按一次關閉 |
| 筆記 meta 列（閱讀進度、更新日期之後，`.rf-bl-meta`） | 13px `--text-muted`：corner icon＋「被 **N** 篇筆記引用」；28px 高、hover 底 `--neutral-100` |

**Drawer `.wb-drawer.rf-bl-dw`**（沿用工作台 Drawer 殼：桌機 480／平板 420／手機滿寬；scrim、滑入動畫同既有）
- 標頭 crumb「<筆記標題> ・ 反向連結」＋✕
- 標題 `.wb-dw-t`「被 N 篇筆記引用」；pill「K 個定義被引用」
- 說明「這些筆記引用了本篇的定義。修改定義前，先確認它們的文意仍然成立。」
- 篩選 chips（≥2 個被引用的 define 才顯示）：「全部 N」＋每個 id＋數字，單選 `aria-pressed`
- 清單 `.nc-bl-list`：全部列出，Drawer 本身捲動（不做「顯示其餘」收合）；列規格同下
- 圖例：corner＝嵌入、hash＝行內引用
- 點列：關閉 Drawer、開該筆記（新頁籤）
- 焦點：開啟時移到 Drawer（`tabindex="-1"`）；Esc／✕ 關閉後還給觸發按鈕；點列導覽不還
- 換筆記或離開筆記頁時自動關閉
- Esc 堆疊第 20 層（與工作台 Drawer 同層）

**清單列** `.nc-bl-row`：grid `1fr auto`，min-height 48px，padding 8px 14px；左標題 13.5px／600＋資料夾 11px；右 id chips（22px、mono 11px、前置 kind icon）。≤860px 單欄，chips 換到標題下方。**Drawer 內一律單欄**（`.nc-bl.in-dw`：標題可換行，id chips 在標題下方靠左，gap 6px），因為 480px 寬放不下多個 mono chip。

**考慮過但沒採用**
- 放在正文底部（原方案）：長文時要捲到底才看得到，且把閱讀內容拉長。
- 放進「⋯」功能選單：選單裡的項目看不到數量，作者不會知道「這篇有沒有被引用」；而數量本身就是修改前最重要的提醒。選單維持放「以 VS Code 編輯」「刪除筆記」這類動作。
- 頁首下方展開的面板：會把正文往下推，關閉時版面跳動。
- 每個 define 旁的「被 N 篇引用」popover 保留（§1）：那是單一定義的影響範圍，Drawer 是整篇的總覽，兩者互補。

### 4.2 工作台 Drawer（`PtDrawer`，在「摘要」之後插入）

1. **被引用 N**：前 3 筆（`.wb-marker.link`，min-height 44px）：標題＋最多 2 個 id chip（20px、10.5px），多的「+N」；>3 篇時「開啟筆記看全部 N 篇 ↗」→ 開筆記並打開被引用 Drawer。
2. **本篇定義 N**：hash icon、label＋id（mono）、右側「被 N 篇引用」／「尚未被引用」；點擊 → 前往 define（flash）。
3. **引用的定義 N**：kind icon、label＋id、右側來源筆記標題；點擊 → 前往來源 define。
- 三段都沒資料時 Drawer 和現行一樣；既有的 Metadata、@ai-visualize、同系列章節不動。

### 4.3 Palette：以 id 搜尋定義（建議放進來）

- 有輸入時，最上方「定義」群組（最多 6 筆）：hash icon（`--wb-blue-l`）、id（mono 12.5px）、「label · 來源筆記」、muted pill「被 N 篇引用」／「未被引用」。比對 id 任一段或 label。
- Enter：有定義命中時優先前往第一個定義（flash），否則沿用既有順序（頁籤 → 筆記 → 指令）。
- 空查詢時底部提示「輸入 id 的任一段（hr.、role-admin）或定義名稱，可直接跳到定義所在處。」
- 理由：作者寫 `::include{id="…"}` 前要確認 id 存在、看內容；索引 build 期已有，成本低。
- 沒採用：獨立「定義總表」頁。目前 Palette＋Drawer 足夠。
- 後續建議：既有 Palette 尚無 ↑↓ 選取；若要加，用 `role="combobox"`＋`aria-activedescendant`、選中列 `inset 2px 0 0 var(--wb-blue-l)`。

---

## 5. 互動時序與動畫

全部 ease-out，每一條都有 reduced-motion 對應。

| 動畫 | 時長／曲線 | reduced-motion |
|---|---|---|
| 預覽卡、反向連結 popover 出現 | 200ms：opacity 0→1、translateY(4px)→0（`.up` −4px） | 無動畫 |
| 開卡延遲 | hover 300ms／focus 150ms | 同（非動畫） |
| 關閉寬限 | 150ms | 同 |
| 手機 sheet | 280ms `cubic-bezier(.22,.7,.3,1)` translateY(100%)→0；scrim 280ms 淡入 | 無動畫 |
| ref 底色、define 括號 | 160ms ease-out | 無 transition |
| define 落點 flash | 保持 1.2s，淡出 400ms | 2px 外框 1.6s，無淡出 |
| :tip 氣泡 | 200ms | 無動畫 |
| TOC 跳轉 | smooth scroll | `behavior:auto` |

## 6. Esc 堆疊與焦點

工作台原本的 Esc 是一次關掉 Palette 與 Drawer；改為共用堆疊，每次只關最上層：

**Palette（50）→ Modal（40）→ 浮層（30：預覽卡、反向連結 popover、手機 sheet、頁籤選單／全部頁籤／頁籤 sheet）→ Drawer（20）→ Sidebar 抽屜（10）**，同層後開的先關。prototype：`useEscLayer(active, pri, close)`（`pt-ref.jsx`），在 window capture 階段攔 Escape。

- 浮層以 Esc／✕／scrim 關閉 → 焦點還給觸發元素；此次程式化 focus 不可再觸發 focus 預覽（`suppress`）。
- 點外面、點列導覽 → 不還焦點。
- 固定卡片內 Tab 到最後一個再 Tab、或第一個 Shift+Tab → 關閉並還焦點給 ref。非 modal，不鎖焦點。
- hover／focus 預覽不移動焦點。
- 已知限制：檢查更新的 Drawer（`PtUpdDrawer`）仍用自己的 Esc 監聽，正式版應一起納入第 20 層。

## 7. 新增 token（`pt-ref.css` 開頭，`:root`／`.wb-dark`）

| token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--nc-ref-bg` | `--wb-blue-l` 9% | 18% | ref 底 |
| `--nc-ref-bg-on` | 17% | 28% | ref hover／開卡 |
| `--nc-ref-line` | `--wb-blue-l` 55% | 75% 混 `--wb-ink` | ref 底線 |
| `--nc-a-line` | `--wb-blue-l` 40% | 60% | 一般連結底線 |
| `--nc-def-rule` | `--wb-line` | 同 | define 括號 |
| `--nc-def-rule-on` | `--wb-blue-l` | 同 | 括號亮起 |
| `--nc-def-flash` | `--wb-gold` 14% | 18% | 落點底色 |
| `--nc-inc-rule` | `--wb-blue-l` 34% 混 `--wb-line` | 50% | include 左線 |
| `--nc-pop-shadow` | `0 12px 32px rgba(22,28,40,.16), 0 1px 3px rgba(22,28,40,.08)` | `0 14px 36px rgba(0,0,0,.5), 0 0 0 1px var(--wb-line)` | 浮層陰影（工作台既有陰影色） |
| `--nc-pop-w` | 400px | | 預覽卡寬（反向連結 360px） |
| `--nc-pop-maxh` / `-x` | 320px / `min(60vh,520px)` | | 截斷／展開高度 |
| `--nc-dur-pop` / `-sheet` / `-flash` | 200 / 280 / 400ms | | 動畫 |
| `--nc-delay-hover` / `-focus` / `--nc-grace` | 300 / 150 / 150ms | | 預覽時序 |
| `--nc-fs` | 16px（≤860px 15.5px；卡片 13.5px；sheet 15px） | | 內文基準，元件間距用 em |
| `--nc-fs-scale` | 1（Tweaks「筆記字級」0.9–1.25） | | 筆記頁正文縮放（`pt-ref-wb.css`） |

暗色另修（只在新內容範圍）：`.wb-btn-solid` 暗色改 `--wb-blue-l`；Sidebar 選中項與工作區名改 `--wb-ink`／淡藍；`.nc-step-n`、`.nc-adm-t` 暗色提高亮度以保持對比。
新資料夾色 `#e37b24` 直接取自設計系統 `--orange-500`（`FOLDER_COLOR` 既有欄位是色碼表）。

## 8. a11y

- ref：`<a href>`、`aria-haspopup="dialog"`、`aria-expanded`、開啟時 `aria-controls="rf-pop"`。
- 預覽卡：`role="dialog" aria-modal="false" aria-labelledby` 指向標題、`tabindex="-1"`；sheet `aria-modal="true"`。展開後內容區 `tabindex="0"` 可鍵盤捲動。
- 「被 N 篇引用」：`aria-haspopup="dialog"`、`aria-expanded`。
- define：`<section aria-label="定義：管理員">`；include：`role="group" aria-label="嵌入內容：…，來自 …"`。
- 反向連結：`<section aria-labelledby>`＋`<ul>`；chips `role="group"`＋`aria-pressed`。
- :tip：`tabindex="0"`、`aria-describedby` → `role="tooltip"`。
- tabs：`tablist/tab/tabpanel`、←→ 切換、roving tabindex。steps：`<ol>`，序號 `aria-hidden`（清單本身有序）。
- 對比：ref 字色用 `--wb-ink`，底色只是輔助。

## 9. 響應式

| 寬度 | 版面 |
|---|---|
| >1100px | 三欄（Rail 52＋Sidebar 240＋主區）；筆記頁 `grid 1fr 220px`、gap 48px、max-width 1120px、padding 28px 40px 88px |
| 861–1100px（平板） | Sidebar 抽屜；**TOC 隱藏**，正文單欄 max-width 820px；仍為 hover 預覽（`hover:none` 時走 sheet） |
| ≤860px（手機） | 單欄＋底部 Rail；padding 20px 20px 72px；h1 24px；`--nc-fs:15.5px`；括號 `left:-12px; width:5px`；include `padding-left:12px`、來源列隱藏 id；反向連結列單欄；ref 與反向連結一律 sheet |
| Drawer | 桌機 480、平板 420、手機滿寬（沿用） |

## 10. 元素 id 與錨點重複（實作時必看）

同一個 define 可能同時出現在：來源頁、include（可能同頁多次）、預覽卡、sheet。

| 渲染處 | 標題 id | 其他 id（tabs、footnote、aria 參照） |
|---|---|---|
| 來源頁 define | `h-<slug>`；section `def-<id>` | 一般規則 |
| include | `inc-<defId>-<slug>`；同頁第 2 次起加 `-2`、`-3` | `useId()` 或同前綴，不可沿用來源頁 id |
| 預覽卡／sheet | **不輸出 id**；標題用 `<div>`，不進大綱 | tabs 的 `id`、`aria-controls` 省略，只留 `aria-selected` |
| define 內 footnote | include 時改區塊內本地編號，回連結指向 `inc-` 前綴 | 預覽卡內 footnote 不可點 |

- `#def-<id>` 只存在來源頁；include 不加 `def-` id。
- 工作台頁籤：多個筆記頁籤同時掛載時（若實作為 keep-alive），`def-`／`h-` id 會跨頁籤重複 → 只有作用中頁籤輸出 id，或以頁籤 key 加前綴。prototype 只掛載作用中頁籤。
- 反向連結點列只導到筆記頂端（一篇可能引用多次，沒有唯一落點）；之後要精準定位可在 build 期給每個引用處 `ref-<id>-<n>`。
- 卡片裡的 ref 不開卡，不會出現兩張卡、兩組相同 id。
- 預覽卡 `id="rf-pop"` 全域唯一（同時只開一張）。

## 11. 建議項總整理

| 題目 | 選擇 | 理由 | 沒採用 |
|---|---|---|---|
| define 外觀 | 左側細線括號＋meta 列，無底無框 | 不搶正文、不像 admonition | 淡底色框（像 admonition）；右側固定標籤（窄螢幕沒位置） |
| include 外觀 | 2px 左線＋來源列 | 內容常有框，避免盒中盒 | 底色卡片；上下分隔線 |
| 嵌入標題 | 相對層級＋計入 TOC（icon） | 大綱正確、找得到 | 原始層級；不計入 TOC |
| 連續嵌入 | 1.25em 間距，各自保留來源列 | 來源可能不同、要分別前往 | 合併成一塊 |
| 預覽過長 | 截斷 320px＋「看完整內容」→ 內捲 | 預設輕量；hover 時滾輪不被卡片吃掉 | 一開始就內捲 |
| 手機 | 底部 sheet | 放得下表格、tabs，不拆段落 | 原地展開；直接導覽 |
| 點擊 ref | 固定預覽卡 | 不打斷閱讀；hover 不穩；與手機一致 | 直接導覽（Tweaks 對照） |
| Palette 搜 id | 放進來 | 作者最常見查詢、成本低 | 定義總表頁 |

## 12. 驗收清單

- [ ] Sidebar 出現「請假系統」資料夾（17 篇），列表、Dashboard、月曆（2026/06）、Palette、頁籤都看得到新筆記
- [ ] 請假功能規格同一段落中，連結、:tip、:ref 在亮暗模式都能分辨
- [ ] hover ref 300ms 出卡、移到卡上不消失、移開 150ms 關閉；Tab 到 ref 150ms 出卡，焦點仍在 ref；Enter 固定並移入焦點
- [ ] 固定卡：Esc 關閉並還焦點；點外面關閉；Tab 出界關閉
- [ ] 帳號權限規格的長段落 ref 在視窗下緣時卡片翻到上方；左右夾在 12px 內
- [ ] 假單狀態預覽出現「看完整內容」並可展開捲動；卡片內的 ref 不再開卡
- [ ] 手機寬度點 ref 出 sheet，「開啟來源」≥44px 觸控區
- [ ] include「前往來源」→ 開 Overview 頁籤、define 捲到上方、括號亮起、底色 1.2s 後淡出
- [ ] 加班申請規格兩個連續 include 間距 1.25em、左線斷開
- [ ] 請假功能規格 TOC 有「主管職責」並帶嵌入 icon；DOM id 為 `inc-hr.role-manager-主管職責`
- [ ] 術語表：特休遞延「尚未被引用」不可點；年度額度 popover 有篩選框、清單內捲
- [ ] 被引用的筆記頂端出現「被引用 N」（頁首、meta 列；TOC 沒有），點擊開右側 Drawer；chips 篩選；正文底部沒有反向連結區塊；請假功能規格沒有入口
- [ ] 列表 Drawer 三段摘要正確；「開啟筆記看全部」開筆記並打開被引用 Drawer
- [ ] Palette 輸入 `hr.` 出現 6 個定義，Enter 前往並 flash
- [ ] Esc 順序：Palette → Modal → 浮層 → Drawer → Sidebar 抽屜，每次只關一層
- [ ] `prefers-reduced-motion` 下所有出現動畫、flash 淡出、sheet 滑入都關閉
- [ ] 頁面上沒有重複元素 id

## 13. 檔案

- `CLAUDE_CODE_PROMPT.md` — Claude Code 起手指示
- `prototype/NoteCraft-工作台-定義與引用-standalone.html` — 自含單檔 prototype

`source/` 為 prototype 對照檔（`NoteCraft 工作台 Prototype.html` 載入的版本）：
- `wb/pt-ref-hr.jsx` — 請假系統範例資料、build 期索引、併入 `window.NOTES`（§0）
- `wb/pt-ref.jsx` — define／include／ref／steps、預覽卡控制器 `useRfPop`、定位 `RfPopLayer.place`、反向連結、Esc 堆疊 `useEscLayer`、TOC 計算 `rfToc`
- `wb/pt-ref-wb.jsx` — Drawer 摘要 `RfDrawerSummary`、Palette 定義群組
- `wb/pt-ref.css`、`wb/pt-ref-wb.css` — 樣式與新增 token
- 修改的既有檔：`app/noteview.jsx`（NoteBody 新增 `rf` 區塊、TOC 來源、被引用區塊；匯出 `NcCodeBlock`）、`wb/pt-app.jsx`（主題 Tweak、Esc 堆疊、Palette、Tweaks）、`wb/pt-data.jsx`（`hr` 資料夾）、`wb/pt-views.jsx`（Drawer 插入摘要）
