# Task 132 — 資料層：連結掃描器、`buildGraphEdges`、`WbIndex.graph`、`deriveGraph`、斷言

> 規格 [notecraft-workbench-notes-graph.md](../notecraft-workbench-notes-graph.md) §4、§6、§13；Q1、Q2、Q3、Q4 定案（§20）。
> 前置：無（與 Task 131 平行）。Task 133–136 靠它。

## 為什麼要有這一步

Graph 的邊有四種來源，其中站內連結目前沒有任何索引。先把「原始碼 → 連結」「全站資料 → 邊」「可見筆記 → 節點與衍生欄位」三段做成純函式並鎖上斷言，後面的 Task 只負責佈局與畫面。

## 範圍

### 1. `src/lib/links-scan.mjs`（新增）＋`.d.mts`

```js
/** @returns {{ url: string, line: number }[]} */
export function scanLinks(source) {}
```

- 只 import `./defs-scan.mjs` 的 `maskNonProse`；不碰 Node API（官網的瀏覽器示範會經 `defs-index.mjs` 載入它）
- 先遮掉 frontmatter、圍欄程式碼、MDX／HTML 註解、行內 code，再找四種寫法（規格 §4.3）：
  - 行內連結 `[文字](url)`；**不含**圖片 `![…](…)`。URL 可帶 `<…>` 包裹與標題（`"…"`）
  - reference 定義 `[label]: url`
  - JSX／HTML 的 `href="…"`／`href='…'`
  - `<PluginView src="…">`：回傳時在 url 前加固定前綴（例如 `pluginview:`）讓下游分辨，前綴定義成匯出的常數
- 只回傳原始 URL 與行號，不解析目標
- `:ref` 不在這裡（它是 directive，原始碼裡沒有 `](…)`）

### 2. `DefNote.links`

- `defs-index.mjs` 的 `buildDefIndex()` 在既有迴圈裡多呼叫一次 `scanLinks(f.source)`，結果放 `note.links`
- `defs-state.d.mts` 的 `DefNote` 加 `links: { url: string; line: number }[]`
- `defs-index.mjs` 仍然不碰 Node API；`check:defs` 既有的純度斷言把 `links-scan.mjs` 納入

### 3. `src/lib/wb-graph.ts`（新增，純函式）

只能 `import type`、無 JSX、不碰 `window`／`node:*`。

```ts
export type WbEdgeKind = "ref" | "inc" | "link" | "seq";   // 型別本體放 wb-types.ts，這裡 re-export
export const GR_KINDS: readonly WbEdgeKind[];              // 主要種類的同數順序：ref → inc → link → seq
export const GR_TIERS: readonly [number, number][];        // [[0,1],[2,3],[4,7],[8,Infinity]]

export function buildGraphEdges(input: GraphEdgeInput): WbGraphEdge[];
export function deriveGraph(rows, edges, dataNodes): { nodes: GraphNode[]; edges: GraphEdge[] };
export function pickTagHubs(tagStats, activeTag?): string[];
export function colorGroups(by, nodes, scope?): { key: string; color: string; count: number }[];
export function graphStats(mode, graph, kinds, query): GraphStats;
```

`buildGraphEdges`（規格 §4.2、§4.4）：

- `ref`／`inc`：每個不同的 id 算 1；同一個 id 兩種都有時各算 1
- `link`：每出現一次算 1。URL 解析照規格 §4.4 的表：
  - 有 scheme、`//host`、只有 `#hash` → 略過
  - `/notes/<x>`：去掉 query、hash、結尾 `/`，`decodeURIComponent`（失敗就用原字串），先以原字串比對 slug，對不到再逐段 slug 化比對
  - `/view/<x>` → `view:<routePath>`
  - 相對路徑且副檔名 `.md`／`.mdx`：以來源檔的 `rel` 解析成 notesDir 相對路徑，經 rel → slug 表取 slug（Q2：不分環境一律算）
  - 相對路徑、沒有副檔名：以 `/notes/<來源 slug>` 為基準照瀏覽器規則解析，結果落在 `/notes/…` 或 `/view/…` 才繼續
  - `<PluginView src>`：notesDir 相對路徑，比對資料檔的 `relPath`（Q1）
- `meta.backTo`：資料檔 → 筆記的 `link` 邊（Q1）；值經同一套 `/notes/<x>` 解析
- `seq`：每個系列相鄰兩章各一條；同一對出現在多個系列時累加
- 自己連自己不算；目標不存在的略過、不 warn
- 逐段 slug 化需要 `github-slugger`：由呼叫端注入 `slugify` 函式，`wb-graph.ts` 自己不 import 套件
- 輸出依 `s`、`t` 排序

`deriveGraph`（規格 §4.6）：

- 可見節點＝rows ＋ 與它們相連的資料檔；邊只留兩端都可見的
- 每條邊補上 `id`（`${s}>${t}`）、`kind`（次數最多者，同數依 `GR_KINDS`）、`n`（總次數）
- 節點補上 `inDeg`／`outDeg`（**不同**來源／目標的數量）、`tier`、`orphan`（以資料為準，與邊的開關無關）

`pickTagHubs`（Q3，規格 §6.2）：全站筆記數前 8 個（同數依名稱）；`activeTag` 不在其中時加入。

`colorGroups`（Q4，規格 §6.1）：四種著色依據的分組 key；超過 8 組時前 8 組（依全站節點數，同數依名稱）配 `--wb-gr-c1`～`c8`，其餘合併為「其他」配 `--wb-gr-c0`；資料檔配 `--wb-gr-c-data`。資料夾的層級規則與 `wb-filter.ts` 的 `groupRows` 相同（`scope` 往下一層）。

### 4. 型別與輸出

- `wb-types.ts`：新增 `WbEdgeKind`、`WbGraphEdge`；`WbIndex` 加 `graph: { edges: WbGraphEdge[] }`
- `workbench.ts` 的 `build()`：組出 `GraphEdgeInput` 呼叫 `buildGraphEdges`。`backTo` 取自 `ResolvedDataFile`（已經過 `plugin-meta.ts` 驗證的值）
- `src/pages/notes/index.astro`：`NotesWorkbench` 多兩個 props：`edges`、`dataNodes`（只列出現在任何一條邊裡的資料檔：`{ id, title, pluginId, href }`，`href` 經 `withBase`）
- `NotesWorkbench.tsx`：只加 props 定義與預設值，**先不使用**

### 5. 斷言

`scripts/checks/wb-graph.mjs`（新增，併入 `check:wb`）：

| 斷言 | 內容 |
| --- | --- |
| 四種邊 | 各一組最小輸入，方向與次數正確 |
| ref／inc 計數 | 同一個 id 引用多次只算 1；同 id 兩種都有時各 1 |
| 合併 | 同一對節點多種關聯合成一條；主要種類與同數順序 |
| URL 解析 | 規格 §4.4 的表每一列各一例，含中文 slug、URL 編碼、結尾 `/`、帶 hash |
| 相對連結 | `../a/b.md`、`./c`、檔名含空白與大寫（slug 與路徑不同） |
| 略過 | 外部網址、純 hash、圖片、不存在的目標、自己連自己 |
| 資料檔 | `/view/…`、`<PluginView>`、`backTo` 三種都連到同一個 `view:` 節點 |
| 衍生 | 連入數以不同來源計；級距邊界 1／2、3／4、7／8；孤島不受邊的開關影響 |
| 可見性 | 篩掉一端後邊消失；資料檔只在與可見筆記相連時出現 |
| 標籤樞紐 | 前 8 個、同數依名稱、篩選中的標籤被加入 |
| 著色分組 | 9 組時第 9 組歸「其他」；資料夾跟著 scope 往下一層 |
| 純度 | 原始碼不含非 `import type` 的 import、不含 `node:` |

`scripts/checks/defs.mjs`（既有，補連結掃描）：四種寫法各一例；圍欄程式碼、行內 code、註解裡的連結不算；圖片不算；以 repo 現有筆記的連結逐條對照（`/notes/…` 6 處、`/view/…` 5 處、相對連結 2 處）。

## 要改的既有檔案

`src/lib/defs-index.mjs`、`src/lib/defs-state.d.mts`、`src/lib/wb-types.ts`、`src/lib/workbench.ts`、`src/pages/notes/index.astro`、`src/components/wb/NotesWorkbench.tsx`（只加 props）、`scripts/checks/defs.mjs`、`package.json`（`check:wb`）。新增 `src/lib/links-scan.mjs`＋`.d.mts`、`src/lib/wb-graph.ts`、`scripts/checks/wb-graph.mjs`。

**本 Task 不改畫面**：`/notes` 的行為沒有變化，只有 `/wb-index.json` 與 island props 多了資料。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | Node 22.6+ | `npm run check:wb && npm run check:defs` | 全綠 |
| 真實資料 | 主專案 | `npx astro build` 後讀 `dist/wb-index.json` | `graph.edges` 與 repo 內的連結、定義引用、系列章節逐條對得上 |
| 範例筆記 | `testing/define-ref/` 三篇 | 同上 | 請假功能規格 → 系統 Overview 同時有 `inc` 與 `ref` |
| 資料檔 | `openapi-內嵌測試.mdx`、`schema-demo.er.json` | 同上 | `<PluginView>` 與 `backTo` 都產生 `link` 邊 |
| 隱私 | — | build | `/wb-index.json` 不含本機路徑；`ignore-guard` 通過 |
| 排除 | `ignore.json` 排除一篇被連到的筆記 | build | 該篇不在任何邊裡 |
| 全套 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 通過；tsc 錯誤數不增加 |

## 依賴

無。

## 實作記錄（2026-10-10）

- `scanLinks` 回傳 `{ url, line, via }`，`via` 是 `"link"` 或 `"pluginview"`；沒有採用「在 url 前加前綴」的做法
- `buildGraphEdges` 的 `references` 由 `workbench.ts` 先把定義 id 換成來源筆記的 slug 再傳入；`slugify` 由呼叫端注入 `github-slugger`
- 另外放進 `wb-graph.ts` 的純函式：`mainKind`、`tierOf`、`tagSlots`、`tagLines`、`matchNodes`、`highlightOf`（高亮集合，規格 §8 的 hover／搜尋規則），以及 `colorScheme`（規格寫的 `colorGroups`，回傳 `keyOf`／`order`／`colorOf`／`labelOf`）
- `/notes` 的 island props 多了規格沒列的 `tagStats`（全站標籤統計，標籤樞紐要用）
- 主專案 build 出 25 條邊，與 repo 內的連結、定義引用、系列章節逐條對得上；`../project-requirement-document.md` 那條相對連結因目標不在 notesDir 內，沒有產生邊
- **順手修掉**：`defs-scan.mjs` 的 H1 規則不認 CRLF，在 Windows 的 `autocrlf` checkout 下 `check:defs` 的「真實筆記」一項會失敗
- `scripts/checks/wb-graph.mjs` 21 項（Task 133 再加佈局的 14 項）、`scripts/checks/defs.mjs` 多 3 項
- tsc 錯誤數 40 不變
