Project Name: NoteCraft Workbench — 定義區塊（define）、嵌入（include）、行內引用（ref）與反向連結
文件類型: Design Document
文件版本: v0.2.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧；語法沿用已啟用的 `remark-directive`，原則上不新增套件，見 Q2）
文件狀態: 已定案、待實作 —— §16 的 12 題已於 2026-10-07 逐題確認（紀錄見 §17），Q5、Q10 與建議不同
文件作者: 建宇
建立日期: 2026-10-07
更新日期: 2026-10-07
依賴文件: docs/notecraft-prd.md（§7.1 Markdown 擴充語法）、docs/notecraft-workbench.md（Drawer、Palette、Esc 堆疊）、docs/notecraft-workbench-note-tabs.md、docs/notecraft-workbench-loading-transitions.md（捲動還原、hash 讓位）、docs/notecraft-ignore-config.md、docs/prototype/design_handoff_workbench_define_ref/README.md
分支: feat/define-ref
---

# NoteCraft Workbench — 定義與引用設計文件

讓筆記內容可以「只定義一次，到處引用」：

- **define**：在某篇筆記裡把一段內容標成可被引用的定義，給它一個全域唯一的 id
- **include**：在其他筆記原樣嵌入那段定義
- **ref**：行文中以行內文字引用定義，hover／focus／點擊時預覽
- **反向連結**：在來源處看得到「被哪些筆記引用」，修改前能評估影響

視覺與互動以 handoff `design_handoff_workbench_define_ref/` 為準（以下簡稱 **handoff**，章節記為 H§n）。handoff 開頭寫「語法解析與 build 期錯誤檢查已另案處理」，但 codebase 裡**還沒有**這部分，所以本文件兩邊都處理：前半（§2–§6）是語法、build 期索引與 MDX 輸出，後半（§7–§11）是閱讀端與工作台。handoff 與 codebase 現況不一致的地方集中在 §12。

---

## 1. 這份文件要解決什麼

### 1.1 起點

作者寫系統文件時，常在多篇筆記重複寫同一段說明，之後要同步改好幾處。例如「系統 Overview」定義了角色與職責，各功能規格又各寫一次。

現有筆記也有同樣的症狀：`:tip` 的說明寫在 `content='…'` 裡，`:tip[Langfuse]` 出現 12 次，`trace`、`token` 各 9 次，`embedding` 8 次。

### 1.2 目標

1. 以 `define`／`include`／`:ref` 三個指令表達「定義、嵌入、引用」，引用只寫 id、不寫文件路徑
2. 所有錯誤在 build 期失敗，畫面上沒有斷掉的引用（H§0 前提）
3. 嵌入與預覽的內容和來源走**同一條 remark 管線**，渲染結果一致（admonition、`:tip`、tabs、steps、程式碼區塊等）
4. 反向連結在筆記頁、工作台 Drawer、Palette 都看得到
5. 全部是靜態輸出：預覽內容 build 期就在頁面上，沒有執行時請求

### 1.3 非目標

- `[[…]]` wiki-link 語法糖（之後可以做成 `:ref` 的別名）
- 在嵌入處與預覽卡渲染 define 內的 React 元件（含 `@ai-visualize` 生成元件）：來源頁照常渲染，嵌入處改顯示 placeholder（§2.5、Q5）
- 「定義總表」頁（H§4.3 沒採用）
- 暗色模式（app 本身沒有暗色主題，見 §12 D1）
- 把既有的 `:tip` 改寫成引用術語表（功能上線後由作者自行遷移）
- 簡報（deck）展開 include：`content-present` 讀的是 MDX 原始碼，暫不處理

---

## 2. 語法

### 2.1 三個指令

```mdx
::::define{id="hr.role-admin"}
**管理員**：負責帳號審核、權限設定與稽核報表。

:::note
離職時要同步撤權。
:::
::::

::include{id="hr.role-admin"}

送出後由 :ref[管理員]{id="hr.role-admin"} 審核。
送出後由 :ref{id="hr.role-admin"} 審核。      ← 沒有 [文字] 時顯示定義的 label
```

| 指令 | 種類 | 屬性 | 說明 |
| :-- | :-- | :-- | :-- |
| `define` | container（`:::` 以上） | `id`（必填）、`label`（選填，Q6） | 內含要被引用的內容。內部有巢狀容器時外層冒號要比內層多（remark-directive 規則） |
| `include` | leaf（`::`） | `id`（必填） | 在此處嵌入定義的內容 |
| `ref` | text（`:`） | `id`（必填） | 行內引用；`[文字]` 可省略 |

### 2.2 id 規則

- **全域唯一**（整個 notesDir），引用端只寫 id，不寫文件路徑。來源筆記搬移或改名時，引用不會斷
- 格式：`^[\p{L}\p{N}_-]+(\.[\p{L}\p{N}_-]+)*$`（字母、數字、`_`、`-`，以 `.` 分段，允許中文，Q4）
- 慣例：第一段當命名空間（`hr.role-admin`、`crm.role-admin`），不強制
- 比對區分大小寫

### 2.3 label

預覽卡標題、Drawer、Palette 用的顯示名稱，依序取：

1. `label` 屬性（Q6）
2. define 內第一個 `**粗體**` 的純文字（H§0.1）
3. id

### 2.4 define 內可以放什麼

段落、清單、表格、引言、程式碼區塊、圖片、連結，以及 NoteCraft 的擴充語法：admonition、`:tip`、`:badge`、`:::tabs`、`:::steps`、`:::annotate`。也可以 `::include` 別的定義，或寫 `:ref`。

JSX 元件與 `{…}` 運算式**可以放**，但只在來源頁渲染，嵌入處與預覽卡改顯示 placeholder（§2.5）。所以 `@ai-visualize` 標記與生成元件也可以放在 define 內。MDX 註解 `{/* */}` 在嵌入時直接略過。

**不可以**（build 失敗）：

- define 內有 `import`／`export`（ESM 只能放在檔案最上層，和 MDX 本身的規則一致）
- 巢狀 define
- define 不在最上層（例如放在 tabs、admonition 裡）。落點捲動與 flash 需要 define 一定看得到，不能藏在未選取的分頁中（Q7）

### 2.5 元件 placeholder（Q5）

元件的 `import` 屬於來源檔，嵌入處沒有，所以 include 與預覽卡**不渲染**元件，改成 placeholder，請讀者回原文檢視：

| define 內的節點 | 嵌入處／預覽卡輸出 |
| :-- | :-- |
| 區塊 JSX（`mdxJsxFlowElement`，例：`<GeneratedFrame>…</GeneratedFrame>`、`<RrRaci />`）；以及**只含行內 JSX 的段落**（單行的 `<X>…</X>` 會被解析成段落裡的 `mdxJsxTextElement`，Task 125 實測） | 區塊 placeholder `div.nc-inc-ph`：元件 icon＋「此處有互動元件，請至原文檢視」＋「前往原文 ↗」（連到 `/notes/<slug>#def-<id>`） |
| 行內 JSX（`mdxJsxTextElement`）、`{…}` 運算式 | 行內 placeholder `span.nc-inc-ph-i`「〔元件〕」，`title` 為「請至原文檢視」 |
| 同一個 define 內連續多個區塊 JSX | 合併成一個 placeholder，避免一長串重複的提示 |

- 來源頁的 define **照常渲染**元件，不受影響
- placeholder 不顯示元件名稱：`RrRaci` 這類名稱是內部識別碼，對讀者沒有意義
- handoff 沒有 placeholder 的設計。樣式比照工作台的 `wb-empty` 單行字：1px dashed `--wb-line` 框、radius 8px、padding 12px 14px、13px `--wb-ink-3`，「前往原文」用 `--wb-blue-l`。預覽卡內縮成 12.5px
- 預覽卡的 label、反向連結計數都不受影響
- 掃描器把 placeholder 的數量記在 `DefEntry.components`，NoteDrawer 的「本篇定義」可以標示「含元件」（選做）

---

## 3. 錯誤與警示

### 3.1 build 失敗

**dev 也一樣丟錯**，交給 Vite error overlay 顯示，訊息帶相對路徑與行號，與 plugin 的「失敗一律 build fail」一致。訊息只印 notesDir 相對路徑。

| 錯誤 | 訊息要點 |
| :-- | :-- |
| 缺 `id` 或格式不符 | 檔案:行、收到的值 |
| id 重複 | 兩處定義的位置 |
| `include`／`ref` 找不到 id | 檔案:行、id；有相近 id 時附「是不是 …」（編輯距離 ≤2） |
| 循環嵌入（A include B、B include A） | 完整環路 |
| 嵌入深度超過 4 層 | 路徑 |
| define 內有 `import`／`export` | 檔案:行 |
| 巢狀 define、define 不在最上層 | 檔案:行 |
| `include` 自己這篇的 define | 檔案:行（同頁會出現兩份一樣的內容，沒有意義；`:ref` 自己的 define 可以） |

被 `.notecraft/ignore.json` 排除的筆記一律不讀（ignore-config 規則），所以它的 define **不存在**，引用它會落到「找不到 id」。不需要另外的「私密」判斷。

### 3.2 只印 warn

| 情況 | 理由 |
| :-- | :-- |
| 已追蹤的筆記引用了 git-ignored 筆記裡的 define（例：`private/`） | 本機 build 會過，推到 Netlify 後那篇不存在就會失敗。只在 git repo 內檢查，用 `git check-ignore` 批次比對（Q8） |
| define 沒有任何引用 | **不 warn**。「尚未被引用」是正常狀態（H§1），畫面上已有顯示 |

---

## 4. 架構

```
notesDir（walkNotes）
   │
   ▼
lib/defs-scan.ts（純函式：原始碼 → defines／includes／refs 的位置與 id）
   │
   ▼
lib/defs-state.mjs（globalThis 單例：DefIndex、反向連結、錯誤）
   │                                 │
   ▼                                 ▼
remark-notecraft-defs.ts          lib/workbench.ts → /wb-index.json
（define 包裝、include 嵌入、        （每篇 defines／references、
  ref 連結、預覽 template）            全站 defs 摘要）
   │                                 │
   ▼                                 ▼
筆記頁 HTML ──► RefLayer island    NoteDrawer、Palette、反向連結 Drawer
```

### 4.1 掃描器 `lib/defs-scan.ts`（純函式）

輸入一篇筆記的原始碼，輸出：

```ts
interface ScanResult {
  defines: { id: string; label: string; line: number; start: number; end: number }[];  // start/end：原始碼 offset
  includes: { id: string; line: number; inDefine: string | null }[];
  refs: { id: string; line: number; inDefine: string | null }[];
  errors: { line: number; message: string }[];   // 格式錯誤、巢狀 define、不在最上層、define 內有 import/export
}
```

- 先用 `note-text.ts` 的 `stripNonProse` 同一套規則排除圍欄程式碼與 MDX 註解，行內 code span 內的 `:ref` 也不算
- 只依賴 `import type`，`scripts/checks/defs-scan.mjs` 直接載入斷言（比照 `check:wb`）
- 為什麼不用 AST：workbench、dev-api、remark plugin 三處都要數引用，掃描器不需要 remark 處理器，三種環境都能用。AST 只在 remark plugin 裡、而且只對 define 的原始碼片段使用（§4.3）。兩者對同一篇的結果要一致，由 check 的 fixture 對照

### 4.2 索引 `lib/defs-state.mjs`（globalThis 單例）

比照 `notes-ignore-state.mjs`：astro.config 載入的模組與 Vite SSR 模組圖各有一份模組實例，所以掛在 `globalThis[Symbol.for("notecraft.defs")]`，否則會掃兩次、錯誤印兩次。

```ts
interface DefEntry {
  id: string;
  label: string;
  file: string;          // notesDir 相對路徑（真實檔案路徑）
  slug: string;          // 與 Content Layer entry.id 同一套規則
  source: string;        // define 內的原始碼片段（給 remark plugin 解析）
  components: number;    // 區塊 JSX 的數量（嵌入時成為 placeholder，§2.5）
  refs: { slug: string; kinds: ("inc" | "ref")[] }[];   // 反向連結
}
```

反向連結的計算規則（H§0.1）：

- 同一篇多次引用同一個 id 只算 1 篇，`kinds` 合併
- 來源筆記引用自己的 define 不計入
- define 內的 `:ref`／`::include` 計入**來源筆記**，不計入嵌入它的筆記
- 掃描範圍含 admonition、tabs、steps 內的巢狀內容
- 排序：引用的 id 數由多到少，相同時依資料夾樹順序

快取以「各檔 mtime＋大小」當鍵；dev 期間由 integration 在檔案變動時 reset（§4.4）。

**slug**：`href` 要用來源筆記的 `entry.id`，必須和 Content Layer 預設 `generateId` 同一套規則（Task 125 確認於 `astro/dist/content/loaders/glob.js`）：frontmatter 有 `slug` 就用它；否則去副檔名、以 `/` 分段、每段 `github-slugger` 的 `slug()`、去掉結尾 `/index`。`github-slugger` 已是直接相依。現有 33 篇全部一致。

### 4.3 remark plugin `remark-notecraft-defs.ts`

排在 `remarkDirective` **之後、`remarkNotecraftDirectives` 之前**：先把 include 的子樹搬進來，後面的 directives、codeblock、notes-assets、base 才會一併處理嵌入的內容，渲染結果與來源相同。

```js
remarkPlugins: [remarkDirective, remarkNotecraftDefs, remarkNotecraftDirectives, remarkNotecraftCodeblock, remarkNotecraftNotesAssets, remarkNotecraftBase]
```

工作內容：

1. **define** → `section.nc-def#def-<id>`，內含 `.nc-def-meta`（id 按鈕、引用數）與 `.nc-def-body`（§5.1）
2. **include** → 從 `DefEntry.source` 解析出子樹，深複製後換成 `.nc-inc`（§5.2）。每處嵌入各自複製一次，後續 directives 的計數器（tip、tabs 的 id）就不會重複
3. **ref** → mdast `link` 節點（`url` 為 `/notes/<slug>#def-<id>`），加上 `nc-ref` class 與 `data-def`。用 `link` 節點是為了讓 `remarkNotecraftBase` 自動補 `NOTECRAFT_BASE` 前綴
4. **預覽 template**：本篇（含嵌入進來的內容）用到的每個 ref id，在文末各輸出一個 `<template data-nc-def="<id>">`，外層 `div[hidden][data-pagefind-ignore]`。內容同樣走後續管線；標題改輸出成 `div.nc-pv-h`，不會被 Astro 收進 `headings`，也不產生錨點（§6）
5. **嵌入內容的相對路徑**：圖片、連結的相對 URL 以**來源筆記**的位置解析，再改寫成相對於目前筆記的路徑，後面 notes-assets（viewer）與 Astro 圖片處理才找得到檔
6. **元件 placeholder**：子樹裡的 JSX 與運算式換成 placeholder（§2.5），嵌入處因此不需要任何 import
7. **標題層級相對化**（H§2）：define 內最高的標題，嵌入後變成「嵌入處前一個標題的下一級」，上限 h4

**define 子樹怎麼解析**：首選在 plugin 裡呼叫 `this.parse(source)`。它沿用 MDX 處理器已掛好的語法擴充（gfm、directive、mdx），解析結果和 Astro 的一致，也不需要新增相依。Task 125 的 spike 先驗證；行不通才改成直接依賴 `unified`／`remark-parse`／`remark-gfm`／`remark-mdx`（Q2）。

### 4.4 dev 期間的失效

Astro 只會重新渲染**改了的那篇**。改了 Overview 的 define，嵌入它的「請假功能規格」不會更新，這是跨檔依賴的問題。

做法：新增 `lib/defs-integration.mjs`，在 `astro:server:setup` 監看 notesDir：

1. 任何 `.md`／`.mdx` 變動 → reset 索引
2. 比對變動前後的 `DefEntry.source`，找出內容變了的 id
3. 找出引用這些 id 的筆記（`kinds` 含 `inc`，或文末有該 id 的 template，也就是含 `ref`），在 Vite module graph 讓它們失效，再送 full-reload

失效方式（Task 125 實測）：以 `server.moduleGraph.getModulesByFile(<引用筆記的絕對路徑>)` 取得模組（會有兩個：`x.mdx` 與 `x.mdx?astroPropagatedAssets`），逐一 `invalidateModule()`，再 `server.ws.send({ type: "full-reload" })`。對照組：不做這一步時，引用筆記停在舊內容。

CLI `serve` 的背景 rebuild 每次都是完整 build，沒有這個問題。

---

## 5. 輸出的 HTML 結構

class 名稱沿用 handoff。

### 5.1 define（H§1）

```html
<section class="nc-def" id="def-hr.role-admin" tabindex="-1" aria-label="定義：管理員" data-def="hr.role-admin">
  <div class="nc-def-meta">
    <button class="nc-def-id" type="button" data-nc-copy="/notes/<slug>#def-hr.role-admin"># hr.role-admin</button>
    <span class="nc-def-sep" aria-hidden="true"></span>
    <button class="nc-def-cnt" type="button" aria-haspopup="dialog" aria-expanded="false">被 <b>2</b> 篇引用</button>
    <!-- 0 篇：<span class="nc-def-cnt zero">尚未被引用</span> -->
  </div>
  <div class="nc-def-body">…</div>
</section>
```

引用數在 build 期就寫進 HTML（來自索引），SSR 不需要佔位。「被 N 篇引用」的 popover 由 `RefLayer` 接手（§7）。反向連結清單不放在 HTML 裡，popover 開啟時從 `/wb-index.json` 取（Palette 已經在延遲載入它）。

### 5.2 include（H§2）

```html
<div class="nc-inc" role="group" aria-label="嵌入內容：主管，來自 系統 Overview" data-pagefind-ignore>
  <div class="nc-inc-src">
    <svg …/> 嵌入自 <span class="nc-inc-t">系統 Overview</span>
    <span class="nc-inc-id">· hr.role-manager</span>          <!-- 只在 dev 顯示（§10） -->
    <a class="nc-inc-go" href="/notes/<slug>#def-hr.role-manager">前往來源 ↗</a>
  </div>
  <div class="nc-inc-body">…</div>
</div>
```

`data-pagefind-ignore`：搜尋時只命中來源，不在每個嵌入處各命中一次（Q9）。

### 5.3 ref（H§3.1）

```html
<a class="nc-ref" href="/notes/<slug>#def-hr.role-admin" data-def="hr.role-admin"
   aria-haspopup="dialog" aria-expanded="false">管理員</a>
```

沒有 JS 時就是一般連結，點了會前往來源。預覽卡裡的 ref 加上 `.is-static`，不再開第二層卡。

### 5.4 預覽 template

```html
<div hidden data-pagefind-ignore data-nc-def-templates>
  <template data-nc-def="hr.role-admin" data-label="管理員" data-src-title="系統 Overview" data-src-folder="請假系統" data-href="/notes/…#def-hr.role-admin">
    …已渲染的定義內容…
  </template>
</div>
```

每篇只放本篇用到的 id。`hr.term-quota` 被 13 篇引用，就是 13 篇各放一份，不是每頁放全部。

---

## 6. 元素 id 與錨點（H§10）

| 渲染處 | 標題 id | 其他 id（tabs、tip、aria） |
| :-- | :-- | :-- |
| 來源頁 define | Astro 一般規則；section 為 `def-<id>` | 一般規則 |
| include | `inc-<defId>-<slug>`；同頁第 2 次起加 `-2`、`-3` | 每處嵌入各自複製子樹，directives 的計數器自然不重複 |
| 預覽 template | 不輸出 id，標題改 `div.nc-pv-h` | tabs 的 `aria-controls` 指向 template 內的 id；複製進卡片時由 `RefLayer` 換上卡片專用前綴 |

- `#def-<id>` 只出現在來源頁，include 不加 `def-` id
- include 的標題要讓 Astro 保留預先指定的 `id`（`inc-…`），而不是重新 slug。Task 125 spike 要驗證 `headings` 回傳的 slug 就是這個 id
- 頁籤列不是 keep-alive（每頁是獨立文件），不會跨頁籤重複
- 反向連結點列只導到筆記頂端（H§10）

### 6.1 TOC（H§2）

- 嵌入的標題**計入 TOC**，在 `[...slug].astro` 依 id 前綴 `inc-` 標記 `inc: true`，`Toc.tsx` 在前面加 corner icon（`title="嵌入的內容"`）
- TOC 只收 h1–h3（現行規則），相對化後變 h4 的不進 TOC
- TOC 不放「被引用」

---

## 7. 閱讀端互動：`RefLayer` island

筆記頁新增 `islands/RefLayer.tsx`（`client:idle`），只在頁面上有 `.nc-ref`、`.nc-def` 或 `.nc-inc` 時掛載（由 `[...slug].astro` 以索引判斷）。它負責：

| 功能 | 規格 |
| :-- | :-- |
| ref 預覽卡 | H§3.2–3.3：hover 300ms／focus 150ms 開卡、150ms 關閉寬限、點擊或 Enter 固定、修飾鍵點擊走原生、捲動時重新定位、截斷 320px＋「看完整內容」、翻轉與夾邊、ResizeObserver |
| 手機 sheet | H§3.4：≤860px 或 `(hover: none)` |
| define 的「被 N 篇引用」popover | H§1：360px，≥10 篇時加篩選框；清單從 `/wb-index.json` 取；dev 底部「複製 include／ref 語法」 |
| define id 複製 | 複製 `/notes/<slug>#def-<id>`（含 base），走 `lib/clipboard.ts`＋toast |
| 落點 flash | 網址 hash 是 `#def-…` 時：等捲動還原讓位（現行規則：遇到 hash 不還原）後捲到 define、上留 32px、`focus({preventScroll:true})`、加 `.flash` |

### 7.1 卡片內容

卡片內容從 `<template>` `cloneNode` 而來，所以卡片內的 tabs、`:tip` 也要能動。現在兩者的初始化寫在 `[...slug].astro` 的 inline script（`initTabs`、`positionTip`）。這次要抽成 `lib/nc-tabs.ts`、`lib/nc-tip.ts`，提供 `init(root)`，頁面與 `RefLayer` 共用。

### 7.2 與 hydration 的關係

`RefLayer` 不改 MDX 輸出的 DOM 結構，只以事件委派監聽 `.nc-ref`、`.nc-def-cnt`，並切換 `aria-expanded`、`.on`、`.flash` 這些屬性與 class。卡片以 portal 掛在 `#nc-main`（與 `UpdateHost` 的 Drawer 同一個位置），定位用 `position: fixed`。

---

## 8. 反向連結

### 8.1 筆記頁入口與 Drawer（H§4.1）

本篇**任一** define 被引用時才出現入口：

- 頁首 `actions` slot：`RefBacklinks` island（`client:idle`），渲染「被引用 N」按鈕，並負責 Drawer
- meta 列（更新日期、閱讀進度之後）：SSR 輸出 `<button class="rf-bl-meta" data-nc-bl-open>`，點擊時發出 `nc-backlinks-open` 事件，由 `RefBacklinks` 接收。數字在 build 期就確定，不需要 island 也能正確 SSR

Drawer 沿用 `DrawerShell`（Esc、焦點、scrim、寬度都沿用），內容與文案照 H§4.1：標題、「K 個定義被引用」、說明、≥2 個定義時才有篩選 chips、清單、圖例。點列時關閉 Drawer 並前往該筆記。

正文底部**不放**反向連結區塊（H§4.1 已改掉原方案）。

### 8.2 工作台 NoteDrawer（H§4.2）

在 `NoteDrawer.tsx` 的「摘要」之後加三段，三段都沒資料時 Drawer 和現在一樣：

1. **被引用 N**：前 3 筆；超過 3 篇時顯示「開啟筆記看全部 N 篇 ↗」→ 前往筆記並帶 `?backlinks=1`，由 `RefBacklinks` 打開 Drawer，然後以 `replaceState` 移除這個參數
2. **本篇定義 N**：點擊前往 `#def-<id>`
3. **引用的定義 N**：顯示來源筆記標題，點擊前往來源 define

### 8.3 Palette（H§4.3）

有輸入時最上方加「定義」群組（最多 6 筆），比對 id 的任一段或 label。Enter 優先前往第一個定義。空查詢時顯示提示文案。資料來自 `/wb-index.json` 的 `defs`。

---

## 9. 型別與 `/wb-index.json`

```ts
// wb-types.ts
export type WbRefKind = "inc" | "ref";

export interface WbDef {
  id: string;
  label: string;
  slug: string;                                     // 來源筆記
  refs: { slug: string; kinds: WbRefKind[] }[];     // 已排序（§4.2）
}

export interface WbNoteRow {
  // …既有欄位
  /** 本篇 define 的 id（文件順序）；沒有就是 [] */
  defines: string[];
  /** 本篇引用的定義（不含自己的） */
  references: { id: string; kinds: WbRefKind[] }[];
}

export interface WbIndex {
  // …既有欄位
  defs: WbDef[];
}
```

- 反向連結只存在 `WbDef.refs`，筆記列上不另存，避免雙向資料不同步（H§0.2）
- 不含原始碼與渲染後內容：預覽內容在頁面的 template 裡，`/wb-index.json` 只放摘要
- 不含 `file`（路徑）：顯示用的資料夾取自 `notes` 的 `path`／`folder`

---

## 10. dev／正式、viewer、base

| 項目 | 規則 |
| :-- | :-- |
| include 來源列的 id | 只在 dev 顯示：HTML 一律輸出 `.nc-inc-id`，以 layout 的 dev 旗標控制顯示 |
| popover「複製 include／ref 語法」 | 只在 dev（`RefLayer` 的 `isDev` prop） |
| 反向連結、預覽卡、Palette 定義群組 | dev 與正式都有 |
| viewer（npx） | 同一套；notesDir 由 `resolveNotesDir` 決定，掃描走 `walkNotes()` |
| `NOTECRAFT_BASE` | ref 是 `link` 節點，由 `remarkNotecraftBase` 補前綴；include 的「前往來源」、template 的 `data-href` 由 plugin 以 `withBase` 同一套邏輯產生 |
| 本機路徑 | 錯誤訊息、索引、HTML 都只用 notesDir 相對路徑；`no-local-path-integration` 兜底 |
| ignore | 被排除的筆記不掃描，它的 define 不存在（§3.1） |

---

## 11. 樣式

- 新規則放 `src/styles/global.css`（筆記內文的擴充語法樣式都在這裡），工作台相關（Drawer 摘要、Palette 群組、頁首按鈕）放 `workbench.css`
- **token 命名改成 `--wb-*`**（CLAUDE.md：新 token 一律 `--wb-*`），handoff 的 `--nc-*` 逐一對應：`--nc-ref-bg` → `--wb-ref-bg`、`--nc-def-rule` → `--wb-def-rule`、`--nc-inc-rule` → `--wb-inc-rule`、`--nc-pop-shadow` → `--wb-pop-shadow`，依此類推
- 只做亮色值（§12 D1）
- 每條動畫都要有 reduced-motion 對應（H§5）
- 斷點：860px 與工作台一致；`cal-` 規則必須在 860px 媒體規則之前的限制與本功能無關，但新規則同樣放在 860px 媒體規則之前

---

## 12. 與 handoff 的差異

| # | handoff | 本文件 | 理由 |
| :-- | :-- | :-- | :-- |
| D1 | 亮暗兩套、`.wb-dark` 覆寫、修正 `--text-strong` 暗色 | **只做亮色** | app 沒有暗色主題（`workbench.css` 註明「`.wb-dark` 不搬」）。暗色值保留在 handoff，之後做主題時再用 |
| D2 | §6：Esc 改成分層優先序（50／40／30／20／10），並把 `PtUpdDrawer` 納入 | **沿用現有 `lib/wb-escape.ts` 的 LIFO 堆疊**，新浮層用 `pushEscape` 登記 | codebase 已有共用堆疊，檢查更新的 Drawer 也已經走 `DrawerShell`。在實際的開啟順序下 LIFO 與分層結果相同（Q3） |
| D3 | `ol.nc-steps` 是「本包補上的樣式」 | **不改既有 steps 樣式** | `global.css` 已有 `nc-steps` 的完整樣式，handoff 的 prototype 原本沒有 |
| D4 | 標題 id `h-<slug>` | Astro 原生 slug；嵌入的標題用 `inc-<defId>-<slug>` | `h-` 前綴是 prototype 的規則 |
| D5 | Tweaks：ref 點擊行為切換、「筆記字級」`--nc-fs-scale` | 不做 | prototype 用來對照；點擊行為定案為「固定預覽卡」 |
| D6 | token `--nc-*` | `--wb-*` | CLAUDE.md 命名空間規則 |
| D7 | 語法解析與錯誤檢查「已另案處理」 | 本文件 §2–§6 一併處理 | codebase 尚未實作 |
| D8 | 新資料夾色 `#e37b24`（`FOLDER_COLOR`） | 不需要 | app 的資料夾不分色（`WbFolderNode` 註解 Q6） |
| D9 | 範例筆記放進 prototype 的 `window.NOTES`（5 篇＋12 篇附錄） | 3 篇真實 MDX 放 `src/content/notes/testing/define-ref/`；≥10 篇引用的狀態改用 fixture 產生器驗證（§14.1、Q10） | 驗收要用真實 build；作者不希望範例筆記太多 |
| D10 | 未提及 define 內的元件 | 嵌入處與預覽卡顯示 placeholder（§2.5、Q5） | 元件的 import 屬於來源檔 |

---

## 13. 對既有功能的影響

| 功能 | 影響與處理 |
| :-- | :-- |
| TOC | 嵌入的標題計入並帶 icon（§6.1） |
| pagefind | include 與 template 加 `data-pagefind-ignore`（Q9） |
| tabs／tip 的 inline script | 抽成 `init(root)` 供預覽卡共用（§7.1） |
| 捲動還原 | `#def-…` 屬於 hash，現有規則是讓位；flash 排在還原的 inline script 之後 |
| 頁籤 | 從預覽卡、Drawer 前往其他筆記時照一般導覽，`TabBar` 照常加入頁籤 |
| `@ai-visualize` | 標記與生成元件可以放在 define 內：來源頁照常渲染，嵌入處顯示 placeholder（§2.5）。mdx-writer 寫回的 `import` 照常放在檔案頂端；note-scanner、mdx-writer 的說明補一句（Task 130） |
| dev-api 刪除筆記 | `GET /api/notes/:slug/delete-plan` 的回應加上 `referencedBy`。被別篇引用時刪除對話框列出這些筆記，並提醒刪除後 build 會失敗（Q11） |
| 系列、閱讀進度、收藏 | 無影響 |
| 簡報（deck） | 不展開 include（§1.3） |
| 官網 `/docs` | `writing/` 目前沒有擴充語法總頁，新增 `writing/define-ref.mdx`（Task 130） |

---

## 14. 實作階段

各 Task 的完整範圍與驗收見 `docs/tasks/task-125`～`task-130`。

| Task | 內容 | 驗證 |
| :-- | :-- | :-- |
| [125](tasks/task-125-define-ref-spike.md) | **spike**：`this.parse()` 解析 define 片段（§4.3）、Astro 是否保留預先指定的標題 id（§6）、dev 跨檔失效（§4.4）、slug 規則對照。結論回填本文件 | spike 報告；不通過時調整 §4 |
| [126](tasks/task-126-define-ref-scan-index.md) | `defs-scan.ts`、`defs-state.mjs`、錯誤與 warn（§3）、`scripts/checks/defs-scan.mjs`（新 `check:defs`，併入 `check-plugins`）、範例筆記 3 篇（§14.1） | `npm run check:defs`；故意寫錯的 fixture 讓 build 失敗 |
| [127](tasks/task-127-define-ref-remark-output.md) | `remark-notecraft-defs.ts`：define、include（相對化、路徑改寫、元件 placeholder）、ref、template；dev 失效 integration；TOC icon | `npx astro build`；範例筆記 HTML 斷言（id 不重複、pagefind ignore） |
| [128](tasks/task-128-define-ref-reflayer.md) | `RefLayer`：預覽卡、sheet、define popover、flash、id 複製；`nc-tabs`／`nc-tip` 抽出；樣式與 token | §15 前 8 項 |
| [129](tasks/task-129-define-ref-backlinks.md) | 反向連結：`RefBacklinks`＋Drawer、NoteDrawer 三段、Palette 定義群組、`wb-index` 型別 | §15 其餘項目 |
| [130](tasks/task-130-define-ref-fixture-docs-release.md) | 收尾：dev-api 刪除計畫、note-scanner 說明、CHANGELOG `1.12.0`、版號、CLAUDE.md、PRD §7.1、官網 `/docs`、本文件 §18 回填 | `npx tsc --noEmit`（不新增錯誤）、`npx astro build`、`npm run check-plugins` |

### 14.1 範例筆記與規模 fixture（Q10）

範例筆記只放 3 篇，在 `src/content/notes/testing/define-ref/`，標籤「系統規格」，把 handoff 5 篇的示範情境收進來：

| 筆記 | 示範 |
| :-- | :-- |
| `系統-overview.mdx` | 來源端：`hr.role-admin`（段落＋note）、`hr.role-manager`（表格＋`###` 標題）、`hr.role-employee`（清單）、`hr.leave-status`（steps＋tabs，特休分頁內 `:ref` `hr.term-quota`）、`hr.term-quota`（程式碼區塊）、`hr.term-carryover`（0 篇引用）、`hr.leave-chart`（內含一個既有的生成元件，示範 placeholder） |
| `請假功能規格.mdx` | include manager（嵌入的標題進 TOC）；同段落 `:ref`×2＋一般連結＋`:tip`；include leave-status（steps＋tabs）；連續 include employee、admin；include leave-chart（placeholder） |
| `帳號權限規格.mdx` | 只有 `:ref`；超長段落末尾的 `:ref` 測翻轉；`:ref` `hr.term-quota`、無 `[文字]` 的 `:ref{id=…}` |

3 篇之下，單一定義最多只有 2 篇引用，**≥10 篇的狀態**（篩選框、清單內捲、NoteDrawer「開啟筆記看全部」）與「同頁嵌入兩次的 id `-2`」改由 `scripts/fixtures/define-ref-scale.mjs` 驗證：在暫存 viewer 工作區產生 1 篇來源＋12 篇引用筆記（其中一篇同頁 include 同一個 define 兩次），build 後斷言 HTML 與 `/wb-index.json`，並印出 `serve` 指令供瀏覽器檢查。放 `fixtures/` 不放 `checks/`，不併入 `check-plugins`。

---

## 15. 驗收清單

以範例筆記（§14.1）驗收，對照 H§12，扣除 §12 的差異：

- [ ] 同一段落中的一般連結、`:tip`、`:ref` 可以分辨
- [ ] hover ref 300ms 出卡、移到卡上不消失、移開 150ms 關閉；Tab 到 ref 150ms 出卡且焦點留在 ref；Enter 固定並移入焦點
- [ ] 固定的卡片：Esc 關閉並還焦點；點外面關閉；Tab 出界關閉
- [ ] 長段落末尾的 ref 在視窗下緣時，卡片翻到上方；左右夾在 12px 內
- [ ] 「假單狀態」預覽出現「看完整內容」並可展開捲動；卡片內的 tabs 可切換、`:tip` 可顯示；卡片內的 ref 不再開卡
- [ ] 手機寬度點 ref 出 sheet，「開啟來源」觸控區 ≥44px
- [ ] include「前往來源」→ 開啟來源筆記、define 捲到上方、括號亮起、底色 1.2s 後淡出；reduced-motion 下改成外框
- [ ] 兩個連續 include 間距 1.25em、左線斷開
- [ ] TOC 有嵌入的標題並帶 icon；DOM id 為 `inc-<defId>-<slug>`；同頁嵌入兩次時第二份加 `-2`
- [ ] 0 篇引用顯示「尚未被引用」且不可點；≥10 篇的 popover 有篩選框、清單內捲（規模 fixture）
- [ ] 含元件的 define：來源頁照常渲染元件；嵌入處與預覽卡顯示 placeholder，「前往原文」落點正確；嵌入的筆記沒有多出任何 import 或 client chunk
- [ ] 被引用的筆記頁首與 meta 列有入口，點擊開 Drawer、chips 可篩選；正文底部沒有反向連結；沒被引用的筆記沒有入口
- [ ] NoteDrawer 三段摘要正確；「開啟筆記看全部」開筆記並打開 Drawer，網址的 `?backlinks=1` 隨即移除
- [ ] Palette 輸入 `hr.` 出現定義群組，Enter 前往並 flash
- [ ] Esc 每次只關一層：Palette → Modal → 浮層 → Drawer → Sidebar 抽屜
- [ ] 頁面上沒有重複的元素 id（build 後以腳本掃範例筆記的 HTML）
- [ ] pagefind 搜尋 define 內的字只命中來源筆記
- [ ] dev：改來源 define，嵌入它的筆記自動更新（或照 Task 125 的結論需要重新整理）
- [ ] 錯誤 fixture（§3.1 每一種）都讓 build 失敗，訊息含相對路徑與行號、不含本機絕對路徑
- [ ] `NOTECRAFT_BASE=/x` build 後，ref、前往來源、複製的網址都帶前綴
- [ ] viewer（`npm pack` 後以 `NOTECRAFTAPP_DEV=1` 執行）行為一致

---

## 16. 待釐清問題

| # | 問題 | 建議 | 理由 |
| :-- | :-- | :-- | :-- |
| Q1 | 暗色模式要不要這次一起做？ | **不做，只做亮色** | app 沒有暗色主題，單獨為這個功能做暗色沒有地方切換 |
| Q2 | define 片段解析：`this.parse()`，還是直接依賴 `unified`／`remark-*`？ | **先 `this.parse()`，spike 不通過才加相依** | 零新相依，且與 Astro 的解析一致；這幾個套件已是 `@astrojs/mdx` 的間接相依，真要加也只是寫進 `package.json` |
| Q3 | Esc 要照 handoff 改成分層優先序，還是沿用 LIFO？ | **沿用 LIFO** | 現有堆疊已涵蓋所有浮層；新浮層開啟時都在最上層，LIFO 結果與分層相同。真的遇到反例再加 priority 參數 |
| Q4 | id 允許中文嗎？ | **允許**（字母、數字、`_`、`-`、`.`） | 作者以中文寫作；slug 也保留 CJK，不該比既有規則嚴格 |
| Q5 | define 內的 JSX 元件怎麼處理？ | 初版禁止（build 失敗） | import 的範圍屬於來源檔，要支援就得自動把 import 帶進每個引用處，複雜度高 |
| Q6 | 新增選填的 `label` 屬性？ | **加** | 「第一個粗體」不一定是想要的名稱（例如 define 以句子開頭）；選填，不影響已定案的語法 |
| Q7 | define 只能放在最上層？ | **是** | 放在 tabs、admonition 裡時，前往來源可能落在沒被選取的分頁，flash 看不到 |
| Q8 | 引用 git-ignored 筆記的 define 時 warn？ | **warn** | 防止「本機過、Netlify 失敗」；只在 git repo 內檢查，viewer 工作區沒有 git 就略過 |
| Q9 | include 的內容要不要被 pagefind 索引？ | **不索引** | 搜尋只命中來源，符合 SSoT；否則一個術語在 13 篇各命中一次 |
| Q10 | 範例筆記要放哪裡、幾篇？ | `src/content/notes/testing/define-ref/`，5 篇＋10 篇附錄 | `testing/` 已是測試用筆記的位置；會進 git，也能當回歸 fixture |
| Q11 | 刪除被引用的筆記時要擋下嗎？ | **不擋，在對話框列出引用處並提醒** | 專案「不做軟刪除、依靠 git 復原」；擋下會讓作者無法先刪再修。刪除後 build 會失敗，訊息會指出要改哪裡 |
| Q12 | 版號 | **`1.12.0`** | 新功能，minor |

---

## 17. 定案紀錄

2026-10-07 與作者逐題確認。10 題採建議，**Q5、Q10 與建議不同**：

| # | 決定 |
| :-- | :-- |
| Q1 | 只做亮色（§12 D1） |
| Q2 | 先用 `this.parse()`，Task 125 spike 不通過才直接依賴 remark 套件 |
| Q3 | Esc 沿用 `lib/wb-escape.ts` 的 LIFO 堆疊（§12 D2） |
| Q4 | id 允許中文（§2.2） |
| Q5 | **不禁止 JSX**：define 內可放元件，來源頁照常渲染；嵌入處與預覽卡顯示 placeholder，請讀者回原文檢視（§2.5）。只有 `import`／`export` 仍是錯誤 |
| Q6 | 新增選填的 `label` 屬性（§2.3） |
| Q7 | define 只能放在最上層（§2.4） |
| Q8 | 引用 git-ignored 筆記的 define 時印 warn（§3.2） |
| Q9 | include 與預覽 template 不進 pagefind 索引（§5.2） |
| Q10 | **範例筆記 3 篇**，放 `testing/define-ref/`（§14.1）；≥10 篇引用改用規模 fixture 驗證 |
| Q11 | 刪除被引用的筆記不擋，對話框列出引用處（§13） |
| Q12 | 版號 `1.12.0` |

---

## 18. 實作後回填

### Task 125 spike（2026-10-07）

四項全部通過，§4 的架構不需要調整，Q2 維持 `this.parse()`、不新增相依。

| 項目 | 結論 |
| :-- | :-- |
| `this.parse()` | 在掛在 `remarkDirective` 之後的 plugin 裡解析另一篇的片段：GFM 表格是 `table`、`:::note`／`:tip` 是 directive 節點、JSX 是 `mdxJsx*`；接進目前的 tree 後，`remarkNotecraftDirectives` 照常處理，輸出 `.nc-adm`、`.nc-tip`、`<table>` |
| 單行 JSX | `<GeneratedFrame title="x">hi</GeneratedFrame>` 寫成一行時是「段落＞`mdxJsxTextElement`」，不是 `mdxJsxFlowElement`。placeholder 要把「只含行內 JSX 的段落」當成區塊處理（§2.5 已補） |
| 標題 id | heading 設 `data.hProperties.id` 後，HTML 的 id 與 `render()` 的 `headings[].slug` 都是指定值（中文、含 `.` 都保留），TOC 的 `href` 也對得上 |
| dev 跨檔失效 | `getModulesByFile()`＋`invalidateModule()`＋`full-reload` 有效；不做時引用筆記停在舊內容（對照組）。Content Layer 的 digest 沒有擋住重新渲染 |
| slug | Astro 預設規則見 §4.2；以現有 33 篇對照 `/wb-index.json`，0 筆差異 |
