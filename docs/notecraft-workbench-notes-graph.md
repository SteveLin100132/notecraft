Project Name: NoteCraft Workbench — 筆記頁（/notes）Graph 檢視：文件關聯與標籤關聯
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；佈局為自寫的純函式，不使用 d3-force，見 §5.1）
文件狀態: 已定案、尚未實作 —— §19 的 12 題已於 2026-10-10 逐題確認（紀錄見 §20），Q10 與建議不同；Task 131–136 已建立、尚未動工
文件作者: 建宇
建立日期: 2026-10-10
更新日期: 2026-10-10
依賴文件: docs/notecraft-workbench.md（殼、/notes 的 view、Drawer、Esc 堆疊）、docs/notecraft-workbench-define-ref.md（§4 定義索引、§9 型別）、docs/notecraft-workbench-loading-transitions.md（骨架、`data-wb-filtering`）、docs/notecraft-plugin-system.md（資料檔、`meta.backTo`、`<PluginView>`）、docs/notecraft-ignore-config.md、docs/prototype/design_handoff_notes_graph/README.md
分支: feat/notes-graph
---

# NoteCraft Workbench — 筆記頁 Graph 檢視設計文件

在 `/notes` 既有的 List／Board／Table／Timeline 之後新增第五個檢視 **Graph**，讓作者一眼看出筆記之間的結構：哪些是樞紐、哪些是孤島、哪些主題聚在一起。同一批節點有兩種關聯模式：

- **文件模式**：力導向圖。邊是四種有方向的關聯：定義引用（`:ref`）、定義嵌入（`::include`）、站內連結、系列順序
- **標籤模式**：群聚圖。標籤是樞紐，筆記圍著自己的標籤成團

視覺與互動以 handoff `design_handoff_notes_graph/` 為準（以下簡稱 **handoff**，章節記為 H§n）。handoff 的像素規格（節點半徑、線型、淡出值、浮層尺寸、文案）本文件不重抄，只寫三件事：

1. handoff 沒有涵蓋的**資料層**：邊從哪裡來、怎麼算、怎麼送到瀏覽器（§4）
2. 放進這個 codebase 時的**架構**：元件切分、純函式、SSR、偏好、樣式位置（§3、§5–§13）
3. handoff 與 codebase 現況**不一致**的地方與處理（§14）

---

## 1. 這份文件要解決什麼

### 1.1 起點

v1.12.0 做完定義與引用之後，筆記之間第一次有了機器可讀的關聯（`DefIndex`）。但這份關聯只在「某個定義被誰引用」的清單裡看得到，看不到整體：哪幾篇是大家都引用的術語表、哪些筆記從來沒被連到。

目前 repo 的 25 篇筆記裡，站內連結有 `/notes/…` 6 處、`/view/…` 5 處，另有相對連結 2 處（`../project-requirement-document.md` 與不帶副檔名的 `./role-responsibility-rr`），這些連結沒有被任何索引收錄。

### 1.2 目標

1. `/notes` 多一個 Graph 檢視，文件與標籤兩種關聯模式可切換
2. 邊的資料在 **build 期**算好，隨頁面送出，沒有執行時請求
3. 一般站內連結也收成邊（作者 2026-10-10 確認），不只定義與引用
4. 佈局**算完即靜止**、同樣的輸入每次結果相同
5. 300 個節點時 hover 與搜尋不卡頓（H 的開場提示）
6. 沿用既有的 Sidebar 篩選、NoteDrawer、Esc 堆疊、`--wb-*` token

### 1.3 非目標

- 筆記頁上的「局部圖」（這篇往外一到兩層）：資料層這次會準備好，UI 之後另案
- 斷鏈檢查（連到不存在的筆記時 warn 或 build fail）：連結掃描器的輸出足以支援，這次不做
- 拖曳節點、手動固定位置、儲存佈局
- 暗色模式（app 沒有暗色主題，§14 D1）
- 把邊的種類、節點大小做成可設定
- 圖上的全文搜尋：Graph 的搜尋框只比對標題、資料夾、標籤（H§5.2）

---

## 2. 現況盤點

| 項目 | 現況 | 這次 |
| :-- | :-- | :-- |
| view 清單 | `lib/wb-prefs.ts` 的 `WB_VIEWS`：list／board／table／timeline；`?view=` 由 `isView` 驗證 | 加 `graph`；設定頁的「預設 view」因為直接讀 `WB_VIEWS`，會自動多一個選項 |
| `/notes` island | `NotesWorkbench.tsx` 輸出 Header、Toolbar、`#nc-scroll.wb-body`、Drawer，是同一份 state | Graph 時 Toolbar 與 Body 改由 `GraphView` 輸出；Header、Drawer、篩選 state 不動 |
| 窄畫面 | `useNarrow()`（`max-width: 860px`）一律強制 List，頁籤只剩 List | 頁籤變 List／Graph，Graph 顯示「需要較寬的畫面」（H§6.4） |
| 定義引用的資料 | `DefIndex.notes[slug].references`（每個 id 的 kinds）、`DefIndex.defs[id].slug` | 直接拿來算 `ref`／`inc` 邊，不重新掃描 |
| 站內連結 | 沒有索引。`remark-notecraft-notes-assets.ts` 只在 viewer 模式把相對 `.md` 連結改寫成 `/notes/…` | 新增連結掃描器（§4.3） |
| 系列 | `WbSeries.chapters[]`，`ref` 是 slug 或 `view:<routePath>` | 相鄰章節連成 `seq` 邊 |
| 資料檔 | `/notes` 不列資料檔（Q14）；`WbDataFile.routePath` | 只以節點出現在 Graph，且只有與可見筆記相連時才畫 |
| Esc | `lib/wb-escape.ts` 的 LIFO 堆疊，沒有優先級數字 | 沿用（§14 D2） |
| 讀取全部筆記原始碼 | `defs-state.mjs` 的 `getDefIndex()` 已經讀一次、以 mtime＋size 快取、dev 會失效 | 連結掃描搭這一次讀檔，不另外走訪 notesDir |

---

## 3. 架構

```
build 期（Node）
  defs-state.mjs ── 讀每篇原始碼 ──► buildDefIndex()
                                      ├─ scanDefs()     → defines / includes / refs   （既有）
                                      └─ scanLinks()    → links[]                    （新，§4.3）
  workbench.ts build()
      DefIndex ＋ series.chapters ＋ dataFiles
            └──► buildGraphEdges()（lib/wb-graph.ts，純函式，§4.4）
                    └──► WbIndex.graph.edges
  /notes 頁：island props 帶 edges ＋ dataNodes
  /wb-index.json：同一份 graph（給之後的局部圖用）

瀏覽器
  NotesWorkbench（既有）
    ├─ view !== graph → 既有四種 view
    └─ view === graph → <GraphView>（React.lazy，另一個 chunk）
          rows（已套用篩選、不套用搜尋）＋ edges ＋ dataNodes
            └─ deriveGraph()        可見節點、連入連出、級距、孤島   （lib/wb-graph.ts）
            └─ layoutDoc()／layoutTag()  座標                        （lib/wb-graph-layout.ts）
            └─ SVG 渲染、平移縮放、浮層
```

### 3.1 檔案

| 檔案 | 內容 | 限制 |
| :-- | :-- | :-- |
| `src/lib/links-scan.mjs` | 連結掃描器：原始碼 → `{ url, line }[]` | 只 import `defs-scan.mjs` 的 `maskNonProse`；不碰 Node API（官網示範也會經 `defs-index.mjs` 載入它） |
| `src/lib/wb-graph.ts` | `buildGraphEdges`、`deriveGraph`、著色分組、標籤樞紐選取、統計、標題顯示規則、數值常數 | 只能 `import type`、無 JSX、不碰 `window`；`scripts/checks/wb-graph.mjs` 直接載入斷言 |
| `src/lib/wb-graph-layout.ts` | `layoutDoc`、`layoutTag`、`mulberry32`、碰撞、`fitView` | 同上 |
| `src/lib/wb-graph-prefs.ts` | Graph 偏好的 localStorage 讀寫（§9） | client-safe |
| `src/components/wb/graph/GraphView.tsx` | lazy 入口：Toolbar＋Body＋浮層的 state | — |
| `src/components/wb/graph/GraphToolbar.tsx`、`GrColorMenu.tsx` | H§2 | — |
| `src/components/wb/graph/GraphCanvas.tsx`、`useGraphViewport.ts` | SVG、平移縮放、tween | — |
| `src/components/wb/graph/GrOverlays.tsx` | 統計列、縮放控制、圖例、提示框（H§4.6） | — |
| `src/components/wb/graph/GrStates.tsx` | 骨架、兩種空狀態 | — |
| `src/components/wb/GraphNarrow.tsx` | 窄畫面說明（H§6.4） | 不放進 lazy chunk：窄畫面不該為了一段說明下載整個 Graph |
| `scripts/checks/wb-graph.mjs` | 純函式斷言，併入 `check:wb` | — |
| `scripts/fixtures/notes-graph-sample.mjs` | 產生示範／規模工作區（§16.1） | 放 `fixtures/`，不放 `checks/` |

---

## 4. 資料層

### 4.1 節點

| 種類 | id | 來源 | 出現條件 |
| :-- | :-- | :-- | :-- |
| 筆記 | slug（`WbNoteRow.slug`） | `rows` | 通過目前篩選 |
| 資料檔 | `view:<routePath>` | `WbDataFile` | 至少有一條邊連到可見的筆記（H§1） |

資料檔的 id 與系列章節的識別碼（`dataRef(routePath)`）是同一個字串，`seq` 邊不需要轉換。

### 4.2 邊的四種來源

方向一律是「來源 → 被參照的一方」。

| kind | 來源資料 | 方向 | 一次算多少 |
| :-- | :-- | :-- | :-- |
| `ref` | `DefNote.references` 中 kinds 含 `ref` 的 id | 引用方 → 定義所在筆記 | 每個不同的 id 算 1 |
| `inc` | 同上，kinds 含 `inc` | 同上 | 每個不同的 id 算 1 |
| `link` | 連結掃描器（§4.3） | 寫連結的筆記 → 目標 | 每出現一次算 1 |
| `seq` | `WbSeries.chapters` 相鄰兩章 | 前一章 → 後一章 | 1（同一對出現在多個系列時累加） |

幾條規則：

- `ref`／`inc` 以「id」計而不以「出現次數」計（H§8.1）：同一個術語在一篇裡引用 12 次，仍只代表這兩篇共用一個定義。同一個 id 同時被 `ref` 與 `inc`，兩種各算 1
- `link` 以出現次數計：提示框的「站內連結 ×3」讀起來就是「連了 3 次」
- 自己連自己不算邊
- define 區塊裡寫的連結算在**來源筆記**（寫的那一篇）。嵌入這個定義的筆記不因此多一條 `link` 邊：它已經有一條 `inc` 邊
- 目標不存在（slug 對不到、資料檔不存在、被 `ignore.json` 排除）的連結直接略過，這次不 warn（§1.3）

### 4.3 連結掃描器 `lib/links-scan.mjs`

與 `defs-scan.mjs` 同一種做法：不用 AST，以 `maskNonProse()` 把 frontmatter、圍欄程式碼、註解、行內 code 遮掉後用正規表示式找，三種環境（Astro、dev-api、CLI）與官網示範都能載入。

```js
/** @returns {{ url: string, line: number }[]} */
export function scanLinks(source) {}
```

認得的寫法：

| 寫法 | 例 |
| :-- | :-- |
| 行內連結（不含圖片 `![…](…)`） | `[假單狀態](/notes/testing/define-ref/系統-overview)` |
| reference 定義 | `[overview]: /notes/…` |
| JSX／HTML 的 `href` | `<a href="/notes/…">` |
| `<PluginView src="…">`（Q1） | `<PluginView src="testing/openapi/orders.openapi.json" />` → 視為連到該資料檔 |

`:ref` 輸出的連結不在這裡：它是 directive，原始碼裡沒有 `](…)`。

掃描器只回傳原始 URL 與行號，**不解析目標**。解析在 `buildGraphEdges`（§4.4），因為要用到全站的 slug 表。

`buildDefIndex()` 在既有的迴圈裡多呼叫一次 `scanLinks(f.source)`，結果放在 `DefNote.links`。這樣連結與定義共用同一次讀檔、同一份 mtime 快取、同一套 dev 失效（`defs-integration.mjs`），不需要新的單例。`defs-index.mjs` 仍然不碰 Node API。

### 4.4 `buildGraphEdges()`（`lib/wb-graph.ts`，純函式）

```ts
export interface GraphEdgeInput {
  notes: { slug: string; rel: string; references: { slug: string; kinds: WbRefKind[] }[]; links: { url: string }[] }[];
  /** 每個系列的章節識別碼（已解析，筆記是 slug、資料檔是 view:<routePath>） */
  series: string[][];
  dataFiles: { routePath: string; relPath: string; backTo?: string }[];
}
export function buildGraphEdges(input: GraphEdgeInput): WbGraphEdge[];
```

URL → 節點 id 的解析順序：

| URL 的樣子 | 解析 |
| :-- | :-- |
| 有 scheme（`http:`、`mailto:`…）、`//host`、只有 `#hash` | 略過 |
| `/notes/<x>`（可帶 `?…`、`#…`、結尾 `/`） | `decodeURIComponent` 後先以原字串比對 slug；對不到再逐段 slug 化比對一次（作者可能照檔名大小寫寫） |
| `/view/<x>` | 比對 `routePath` → `view:<routePath>` |
| 相對路徑且副檔名是 `.md`／`.mdx`（Q2） | 以來源檔的 `rel` 解析成 notesDir 相對路徑，再經「rel → slug」表取得 slug。**不經過 `/notes/<路徑>` 的字串轉換**：檔名含空白或大寫時 slug 與路徑不同 |
| 相對路徑、沒有副檔名（例：`./role-responsibility-rr`） | 照瀏覽器的規則，以來源筆記的網址 `/notes/<slug>` 為基準解析；結果落在 `/notes/…` 或 `/view/…` 才繼續比對 |
| `<PluginView src>` 的值（Q1） | notesDir 相對路徑，比對 `relPath` |
| 其他（`/series/…`、`/tags`、附件、圖片） | 略過 |

另外一種邊來自資料檔本身：`meta.backTo`（「回到來源筆記」）指向筆記時，加一條 **資料檔 → 筆記** 的 `link` 邊（Q1）。

同一對（有序）節點的所有關聯合成一條：

```ts
export type WbEdgeKind = "ref" | "inc" | "link" | "seq";
export interface WbGraphEdge {
  s: string;                                    // 來源節點 id
  t: string;                                    // 被參照的節點 id
  kinds: Partial<Record<WbEdgeKind, number>>;   // 各種類的次數
}
```

輸出依 `s`、`t` 排序，build 結果穩定。主要種類（次數最多者，同數依 ref → inc → link → seq）、總次數、`id`（`${s}>${t}`）由前端的 `deriveGraph` 推導，不進 JSON。

### 4.5 型別與輸出

```ts
// wb-types.ts
export interface WbIndex {
  // …既有欄位
  graph: { edges: WbGraphEdge[] };
}
```

- `/wb-index.json` 因為 `publicIndex()` 是整包輸出，會自動帶 `graph`。邊只含 slug 與 routePath，不含路徑，`assertNoAbsolutePath` 與 `ignore-guard` 都不受影響
- `/notes` 頁的 island props 新增兩個：`edges`（即 `index.graph.edges`）與 `dataNodes`（只列出現在任何一條邊裡的資料檔：`{ id, title, pluginId, href }`）
- 以 25 篇筆記估計不到 2 KB；1,000 篇、每篇 5 條邊約 200 KB 的 JSON（Astro props 編碼後約 3 倍）。超過這個規模時改為進 Graph 才抓 `/wb-index.json`，這次不做

### 4.6 前端衍生 `deriveGraph()`

輸入：通過篩選的 rows、全部的 edges、dataNodes。輸出照 H§8.1 的 `GraphNode`／`GraphEdge`，另加衍生欄位：

- 可見節點＝rows ＋ 與它們相連的資料檔；邊只留兩端都可見的
- `inDeg`／`outDeg`＝**不同**來源／目標的數量（H§4.1）
- `tier`：0–1、2–3、4–7、8 以上
- `orphan`：在可見的邊裡沒有任何一條。**以資料為準，與邊的開關無關**（H§4.2：開關不重新佈局）

---

## 5. 佈局

### 5.1 不用 d3-force

`d3` 在白名單內，但佈局照 handoff 的參數自己寫（H§5.6），理由：

- handoff 已經把每個參數定稿（斥力、彈簧長度、阻尼、迭代次數、孤島的外圍排法），用 d3-force 反而要反推一組等效設定
- 純函式、固定亂數種子（mulberry32），`check:wb` 可以直接斷言
- Graph chunk 不必帶 d3

`lib/wb-graph-layout.ts`：

```ts
export function layoutDoc(nodes, edges, groupOf, groups): { pos: Record<string, Pt>; clusters: Cluster[] };
export function layoutTag(nodes, hubs): { pos: Record<string, Pt>; hubs: Hub[] };
export function fitView(points, width, height): { x: number; y: number; k: number };
```

`check:wb` 斷言的是性質，不是座標快照（不同 Node 版本的浮點結果可能有末位差異）：同一輸入連跑兩次結果完全相同、沒有 NaN、節點兩兩不重疊（容許 1px）、孤島都在主圖最大半徑之外、標籤樞紐等距排在圓上。

### 5.2 在哪裡算（Q8）

在瀏覽器主執行緒同步算。不在 build 期預算：佈局取決於「可見節點集合 × 模式 × 著色依據 × 孤島開關」，篩選是任意組合，無法窮舉。

- 節點 ≤ 150：在 render 內直接算（`useMemo`）
- 節點 > 150：先畫骨架（H§6.1），下一個 frame 再算，避免切到 Graph 時畫面凍住
- 同一個 key（可見節點 id、模式、著色依據、孤島開關）的結果放在記憶體的 Map，切回去不重算；不寫 localStorage
- 斥力是 O(n²)。300 節點 × 260 次迭代約 1,200 萬次配對運算，1,000 節點約 1.3 億次。Task 131 的 spike 實測 300／600／1,000 節點的耗時；1,000 節點超過 500ms 才改成 Web Worker（H 的建議），否則維持同步

### 5.3 模式切換的動畫

600ms、`1−(1−t)³`（H§5.5）。tween 期間**不經過 React**：以 ref 直接改節點的 `transform` 與邊的 `d`，結束時才把最終座標寫回 state。每一幀讓 React 重繪 300 個節點加上所有邊會掉幀。

- 節點 > 150 時不做移動動畫，直接換位（Q8）
- `prefers-reduced-motion`：直接換位；平移與符合視窗直接到位；骨架不脈動

---

## 6. 著色與標籤樞紐：handoff 用示範資料寫死的部分

handoff 的資料夾、標籤、順序都是寫死的陣列（`GR_TAGS`、`grGroups`）。真實資料的規則如下。

### 6.1 著色分組（Q4）

| 著色依據 | 分組 key | 與既有規則的關係 |
| :-- | :-- | :-- |
| 資料夾 | 目前資料夾篩選往下一層；沒有篩選時是頂層資料夾，根目錄的筆記是「根目錄」 | 與 List 的「依資料夾分組」同一條（`groupRows` 的 `scope`） |
| 系列 | 系列標題；沒有的是「未歸入系列」 | `WbNoteRow.series` |
| 標籤 | 第一個屬於樞紐集合的標籤；沒有的是「未加標籤」或「其他標籤」 | §6.2 |
| 不著色 | 全部同一組 | — |

色盤只有 8 階（H§7.1）。分組超過 8 個時：依節點數多到少取前 8 組配 c1–c8（同數依名稱），其餘合併為灰色的「其他」。prototype 是 `i % 8` 循環，會讓兩個不相干的資料夾同色。未分類的組（未歸入系列、未加標籤、根目錄以外的中性組）用 c0，資料檔用 c-data。

配色順序以**全站**的節點數決定，不隨篩選變動：同一個資料夾在篩選前後維持同一個顏色。

### 6.2 標籤樞紐（Q3）

目前 repo 有 19 個標籤，其中 13 個只用過一次。全部當樞紐會是 19 個圓排一圈。

- 樞紐＝全站筆記數最多的 8 個標籤（同數依名稱），依數量由多到少排在圓上
- 目前有 `?tag=X` 篩選而 X 不在前 8：X 也成為樞紐
- 筆記只帶非樞紐標籤 → 歸到「其他標籤」團；完全沒有標籤 → 「未加標籤」團。兩團都是虛線圓、不可點（H§4.3 的未加標籤樣式）
- 筆記同時帶樞紐與非樞紐標籤 → 只看樞紐標籤
- 資料檔沒有標籤 → 「未加標籤」團（H§5.6）

---

## 7. 渲染與效能

SVG＋React，不用 canvas：300 節點在 SVG 的能力範圍內，而且節點要能聚焦、有 `aria-label`。

```
div#nc-scroll.wb-body.flush.gr-body          ← id 不可拿掉
  div.gr-canvas                              ← pointer／wheel 事件、點格底
    svg
      g.gr-world  style="--k: <縮放倍率>"     ← 平移縮放只改這一個元素的 transform
        g.gr-edges
        g.gr-nodes
        g.gr-labels
  GrStats／GrZoom／GrLegend／GrTip            ← HTML 浮層，DOM 順序在 svg 之前（§8.4）
```

handoff 的效能要求（H§4.1、§4.5）之外，再加四條：

1. **縮放不重繪節點**。標題字級、邊的熱區寬度都是「螢幕尺寸」，寫成 `calc(11px / var(--k))`，縮放時只更新 `.gr-world` 上的 `--k`
2. **標題的顯示門檻用 class 切換**。縮放跨過 150%／240% 時在根元素切 `data-zoom`，CSS 決定哪一級的標題顯示，不逐一改節點
3. **淡出用根元素的 class**。hover 時根元素加 `.is-dimming`，只有高亮集合的節點與邊加 `.hot`，規則寫成 `.is-dimming .gr-n:not(.hot)`。這樣 hover 時 React 只更新相鄰的幾個節點，不是全部
4. **顏色用 class 或 `style` 寫 CSS 變數**，不用 `fill="var(--…)"` 這種 presentation attribute（部分瀏覽器不解析，空狀態插圖已經踩過）

wheel 事件要 `passive: false`（H§5.1），所以用 `addEventListener` 掛，不用 React 的 `onWheel`。

---

## 8. 互動：handoff 沒講、或與 codebase 有出入的部分

沒列在這裡的互動（hover 高亮集合、提示框位置、縮放公式、符合視窗的算法）一律照 H§5。

### 8.1 篩選

Graph 用的 rows 是「套用網址上的篩選、**不套用搜尋字串**」（H§1 的 `baseRows`）。`NotesWorkbench` 另算一份 `applyFilters(rows, query, { favorites })` 傳給 `GraphView`；搜尋字串在 Graph 內部自己持有，只用來高亮。

handoff 說 Graph 不顯示「含 AI 標記／待生成／無 frontmatter／收藏」這排 chip。但這些旗標可能已經在網址上（例如從 Rail 的 AI 佇列進來是 `?pending=1`）。處理方式（Q5）：**照常套用**，並在 Toolbar 最左側顯示一顆「已篩選 ✕」chip，點了清掉這四個旗標。否則使用者會看到節點變少卻找不到原因。

### 8.2 點擊

| 目標 | 行為 | DOM |
| :-- | :-- | :-- |
| 筆記節點 | 開／關 NoteDrawer（沿用 `sel` state） | SVG `<g role="button" tabindex="0">`，事件走既有的 `rowHandlers`（與 treemap 方塊、月曆色塊同一種「格狀小目標」例外：沒有常駐的開啟連結，由 Drawer 提供） |
| 資料檔節點 | 前往 `/view/<routePath>` | SVG `<a href>`：單擊即導覽的目標是連結 |
| 標籤樞紐（Q7） | 套用該標籤的篩選並留在 Graph | SVG `<a href="/notes?tag=…&view=graph">` |
| 「其他標籤」「未加標籤」 | 無 | 不可聚焦 |
| 空狀態 A 的「清除篩選」 | 回到全部筆記的 Graph | `<a href="/notes?view=graph">` |

標籤樞紐與「清除篩選」用真的連結換頁，而不是 `history.replaceState`：Sidebar 的目前項目高亮是載入時由 inline script 畫的，island 內改網址不會更新它。換頁有既有的 View Transition 承接，也能中鍵開新分頁。

### 8.3 選取與 Drawer

照 H§5.4，兩點調整：

- Drawer 寬度從 DOM 量（`.wb-drawer` 的 `offsetWidth`），不寫死 480：861–1100px 時既有樣式是 420px
- 既有的「選取的列不在篩選結果裡就關 Drawer」effect 照舊，判斷對象改成 Graph 用的那份 rows

### 8.4 鍵盤（Q9）

- 節點與樞紐可聚焦，focus 等同 hover，Enter／Space 等同點擊（H§5.2）。聚焦的節點在可視範圍外時，畫布平移讓它進來（同 §8.3 的規則）
- 縮放控制、圖例、統計列在 DOM 裡排在 `<svg>` **之前**：否則鍵盤使用者要 Tab 過所有節點才碰得到
- 搜尋框按 Esc：有字時清空並 `preventDefault`（`wb-escape` 的 window listener 會看 `defaultPrevented`，不會同時關掉 Drawer）
- 著色下拉用 `pushEscape` 登記（§14 D2）

---

## 9. 路由、state 與偏好（Q6）

| 狀態 | 放哪裡 | 理由 |
| :-- | :-- | :-- |
| 是否在 Graph | 網址 `?view=graph`（既有機制） | 與其他 view 一致，可分享 |
| 篩選 | 網址（既有） | — |
| `mode`、`colorBy`、`kinds`、`showOrphans`、`legendOpen` | localStorage `nc-graph-prefs-v1` | 與「分組」同性質：是偏好，不進網址（workbench 規格）。點標籤樞紐會換頁，不存下來的話換頁後會跳回文件模式 |
| 搜尋字串、hover、平移縮放 | 元件內，不保存 | — |
| 選取 | `NotesWorkbench` 既有的 `sel` | — |

讀不到或值無效時回預設（文件模式、依資料夾著色、四種邊全開、顯示孤島、圖例展開）。

---

## 10. SSR、載入與 hydration

- `output: 'static'` 下 build 期看不到 query，SSR 畫的永遠是 List（既有行為）。Graph 一定是 hydration 之後、effect 讀到 `?view=graph` 或偏好才出現，**SSR 不輸出任何節點**，沒有 hydration mismatch 的問題
- `WorkbenchLayout` 的 pre-paint script 在網址有 query 或 `defaultView !== "list"` 時已經會把主區藏起來（`data-wb-filtering`）並畫骨架，Graph 直接受惠，不用改
- `GraphView` 用 `React.lazy` 載入，`Suspense` 的 fallback 是空的 `.wb-tb` 加上 H§6.1 的骨架。用不到 Graph 的人不下載這段程式
- 骨架出現的兩個時機：chunk 還在下載、節點 > 150 的佈局還沒算完（§5.2）。兩者都帶 `aria-busy="true"`
- `React.lazy` 在 Astro island 與 npx viewer 的 build 下是否正常分出 chunk，由 Task 131 的 spike 確認；不行就改成靜態 import（代價是 `/notes` 的 JS 變大）

---

## 11. 空狀態與窄畫面

| 狀態 | 條件 | 與 handoff 的出入 |
| :-- | :-- | :-- |
| A：沒有筆記（H§6.2） | 篩選後 rows 為空 | 「清除篩選」是連結（§8.2）。篩選名稱用既有的 `scopeLabel` |
| B：沒有任何關聯（H§6.3） | 文件模式、rows > 0、可見的邊為 0（以資料為準，與邊的開關無關） | 見下方兩點 |
| 窄畫面（H§6.4） | `useNarrow()` | 既有斷點是 `max-width: 860px`（含 860），handoff 寫「< 860」，以既有的為準 |

空狀態 B 的 2×2 方式卡有兩處要改：

1. **語法與做法要寫對**。handoff 的 `:ref[hr.term-quota]` 不是合法寫法，「在 frontmatter 加上 `series`」也不是這個專案定義系列的方式：

   | 方式 | 說明（定稿文案） |
   | :-- | :-- |
   | 行內引用定義 | 在內文寫 `:ref[文字]{id="…"}`，引用另一篇筆記裡的定義。 |
   | 嵌入定義 | 用 `::include{id="…"}` 把定義整段嵌入。 |
   | 站內連結 | 用 `[文字](/notes/slug)` 連到另一篇筆記。 |
   | 加入系列 | 在 `.notecraft/series.json` 把筆記列進同一個系列，章節之間會依序相連。 |

2. **方式卡在 dev 與正式環境都顯示**（Q10 定案，與原建議不同）。npx viewer 的 `serve`／`build` 也是正式模式，用 viewer 看自己筆記的作者同樣需要這些寫法提示。四張卡只有寫法說明，不含 `npx` 指令；這是 Plugin 頁「正式環境不出現設定提示」原則的刻意例外

這兩個空狀態沿用 handoff 的 `gr-` 版面，不用 `wb/EmptyState.tsx`（那個元件只給有插圖的空狀態）。

---

## 12. 樣式與 token

- 新 token 全部 `--wb-gr-*`，放 `workbench.css` 開頭的 `:root`（接在 `--wb-cal-*` 之後），值照 H§7.1；**不搬 `.wb-dark` 的覆寫**（§14 D1）
- 規則裡不出現色碼字面值。handoff 規則裡的四個陰影與 focus 光暈要收成 token：

  | handoff 寫法 | token |
  | :-- | :-- |
  | `0 12px 32px rgba(27,79,156,.16)`（下拉選單） | `--wb-gr-shadow-menu` |
  | `0 4px 14px rgba(27,79,156,.1)`（縮放控制、圖例） | `--wb-gr-shadow-float` |
  | `0 8px 24px rgba(22,28,40,.14)`（提示框） | `--wb-gr-shadow-tip` |
  | `0 0 0 3px rgba(44,110,187,.12)`（下拉展開） | 既有的 `--wb-a-bluel-12` |
  | `rgba(44,110,187,.08)`（空狀態 icon 底） | 既有的 `--wb-a-bluel-08` |

- class 前綴 `gr-`。`gr-` 規則放在 860px 媒體規則之前（與 `cal-` 同一個限制）
- 每條動畫都要有 `prefers-reduced-motion` 對應
- 浮層的 z-index 用既有的 `--wb-z-tip`（在 `.wb-main` 內、低於 Drawer）；著色下拉是 `position: fixed`，用 `--wb-z-overlay`
- **JS 與 CSS 的數值同步**（H§7.1 末段）：節點半徑、縮放門檻、淡出值、動畫時長在 JS 也要用。`wb-graph.ts` 匯出常數（`GR_R`、`GR_ZOOM`、`GR_DIM`、`GR_MOVE_MS`），`scripts/checks/wb-graph.mjs` 讀 `workbench.css` 斷言對應的 `--wb-gr-*` 值與常數相同（與 `wb-critical-css.mjs` 對照 inline style 是同一種做法）

---

## 13. dev／正式、viewer、ignore、base

| 項目 | 規則 |
| :-- | :-- |
| Graph 本身 | dev 與正式都有，沒有 dev-only 的部分 |
| 空狀態 B 的方式卡 | dev 與正式都顯示（§11、Q10） |
| viewer（npx） | 同一套。相對 `.md` 連結是 viewer 使用者最常見的寫法，由 §4.4 的 rel → slug 表解析 |
| `NOTECRAFT_BASE` | 原始碼裡的連結不帶 base，掃描不受影響；Graph 產生的 `href` 一律經 `withBase` |
| ignore | 被排除的筆記不會被 `walkNotes()` 讀到，不是節點，連到它的連結因目標不存在而略過 |
| 本機路徑 | 邊只含 slug 與 routePath；`no-local-path-integration` 兜底 |
| dev 熱更新 | 連結掃描搭 `getDefIndex()` 的 mtime 檢查，改了筆記重新整理就看得到新的邊。改 `links-scan.mjs` 本身要重啟 dev server（與 remark plugin 同理） |

---

## 14. 與 handoff 的差異

| # | handoff | 本文件 | 理由 |
| :-- | :-- | :-- | :-- |
| D1 | `.wb-dark` 覆寫 7 個 token | 不搬 | app 沒有暗色主題（define-ref D1 同） |
| D2 | 著色下拉掛 Esc 堆疊「優先級 35」 | 用 `pushEscape` 登記到 LIFO 堆疊 | codebase 的堆疊沒有優先級；下拉開著時一定在最上層，結果相同 |
| D3 | 資料夾、標籤、順序是寫死的陣列；超過 8 組時顏色循環 | §6 的規則：前 8 組配色、其餘「其他」；標籤樞紐取前 8 | 真實資料有 19 個標籤、巢狀資料夾 |
| D4 | 標籤樞紐點擊「套用側欄標籤篩選」 | 以連結換頁到 `?tag=…&view=graph` | Sidebar 高亮是載入時畫的（§8.2） |
| D5 | 空狀態 B 的語法範例與「frontmatter 加 `series`」 | 改成正確語法與 `.notecraft/series.json`；方式卡照 handoff 在 dev 與正式都顯示 | 原文案與專案實際做法不符（§11） |
| D6 | Drawer 寬 `min(480, 畫布寬)` | 量 DOM | 861–1100px 是 420px |
| D7 | 「< 860」 | 既有的 `max-width: 860px` | 全站同一個斷點 |
| D8 | 佈局「建議在 build 期或 Web Worker」 | 主執行緒同步，大圖延後一個 frame；Worker 視 spike 結果 | build 期無法窮舉篩選組合（§5.2） |
| D9 | tween 每幀 setState | 以 ref 直接改 DOM；> 150 節點不做移動動畫 | 300 節點每幀重繪會掉幀 |
| D10 | Graph 不顯示 AI 篩選 chip | 不顯示那排 chip，但旗標照常套用，並給一顆「已篩選 ✕」 | 旗標可能已在網址上（§8.1） |
| D11 | 載入中「以 700ms 模擬」 | 真實的兩個時機：chunk 下載、大圖佈局 | §10 |
| D12 | 300 節點示範資料點了只跳 toast | 照一般節點處理 | H§6.5 自己註明 |
| D13 | 規格頁、Tweaks、`GR_EXTRA`、`grBig()` | 不移植 | H§9 |
| D14 | 圖示為 inline SVG | 用 `lucide-react`（`ZoomIn`、`ZoomOut`、`Maximize`、`ChevronDown`、`Link2`、`List`、`Monitor`、`Filter`、`Tag`） | 既有 UI 的圖示來源；線型樣本仍是 inline SVG |
| D15 | 邊的資料「建議 build 期產生」，`link` 來源只提 `/notes/<slug>` | §4：另含相對 `.md` 連結、`<PluginView>`、`meta.backTo` | viewer 使用者多半寫相對連結；後兩者是資料檔與筆記之間實際存在的關聯 |

---

## 15. 對既有功能的影響

| 功能 | 影響與處理 |
| :-- | :-- |
| `WbView` | 加 `"graph"`；`VIEW_LABEL.graph = "Graph"`。設定頁「預設 view」多一個選項；窄畫面預設為 Graph 時顯示窄畫面說明，不強制跳回 List（使用者自己選的） |
| `NotesWorkbench` | 頁籤清單、`view` 的窄畫面規則、Graph 用的 rows、把 `edges`／`dataNodes` 往下傳；Graph 時不輸出自己的 Toolbar 與 Body |
| `/notes` 頁 | island props 多 `edges`、`dataNodes` |
| `defs-index.mjs`／`DefNote` | 多一個 `links` 欄位。官網的瀏覽器示範也會載入 `links-scan.mjs`，所以它不能碰 Node API；`check:defs` 既有的「不含 Node API」斷言把新檔納入 |
| `/wb-index.json` | 多 `graph`。Palette、Dashboard Drawer 不讀它，無影響 |
| NoteDrawer | 不改。Graph 開的就是同一個 Drawer |
| 筆記頁籤、閱讀進度、收藏、系列頁 | 無影響 |
| pagefind | 無影響（Graph 沒有 SSR 內容） |
| View Transitions | 無影響：`.nc-main-pane` 照舊；`#nc-scroll` 保留 |
| dev-api | 不新增 endpoint。刪除筆記後重新整理，邊自然消失 |
| `check-plugins` | `check:wb` 多一支 `wb-graph.mjs`；`check:defs` 多連結掃描的斷言 |
| 官網 `/docs` | 新增一頁說明 Graph 與「哪些寫法會變成邊」（收尾 Task） |

---

## 16. 實作階段

各 Task 的完整範圍與驗收見 `docs/tasks/task-131`～`task-136`（編號接續 130）。

| Task | 內容 | 驗證 |
| :-- | :-- | :-- |
| [131](tasks/task-131-notes-graph-spike.md) | **spike**：佈局純函式在 300／600／1,000 節點的耗時；`React.lazy` 在 Astro island 與 viewer build 的分塊；tween 直接改 DOM 的幀率。結論回填本文件 | spike 報告；不通過時調整 §5.2、§10 |
| [132](tasks/task-132-notes-graph-data-layer.md) | 資料層：`links-scan.mjs`、`DefNote.links`、`buildGraphEdges`、`WbIndex.graph`、`/notes` props；`deriveGraph`；`check:wb`／`check:defs` 斷言 | `npm run check:wb`、`npm run check:defs`；build 後 `/wb-index.json` 的邊與 repo 內的連結逐條對得上 |
| [133](tasks/task-133-notes-graph-layout-canvas.md) | 佈局與靜態渲染：`wb-graph-layout.ts`、`GraphView`／`GraphCanvas`、節點與邊的樣式、token、平移縮放、符合視窗、`WbView` 加 graph、窄畫面說明 | §17 的狀態 01、08、12、14 |
| [134](tasks/task-134-notes-graph-interactions.md) | 互動與浮層：Toolbar、著色下拉、hover／focus／搜尋高亮、提示框、圖例、統計列、縮放控制、選取與 Drawer 平移、偏好 | §17 的狀態 02–05、13 |
| [135](tasks/task-135-notes-graph-tag-mode-states.md) | 標籤模式、模式切換動畫、兩種空狀態、骨架、reduced-motion | §17 的狀態 06、07、09–11 |
| [136](tasks/task-136-notes-graph-fixture-docs-release.md) | 收尾：示範／規模 fixture、CHANGELOG `1.13.0`、版號、CLAUDE.md、workbench 規格、官網 `/docs`、本文件 §21 回填 | `npx tsc --noEmit`（不新增錯誤）、`npx astro build`、`npm run check-plugins` |

### 16.1 示範資料與規模 fixture（Q11）

repo 目前 25 篇筆記的邊不多，看不到 handoff 的大部分狀態（第 4 級樞紐需要被 8 篇以上連入）。不在 `src/content/notes/` 新增示範筆記，改用 `scripts/fixtures/notes-graph-sample.mjs` 在暫存的 viewer 工作區產生：

- 預設：約 65 篇、5 個資料夾、3 個系列、12 個標籤、3 個資料檔、約 15 篇孤島、3 個樞紐，四種邊都有，連結寫法涵蓋 `/notes/…`、相對 `.md`、不帶副檔名的相對連結、`<PluginView>`、`meta.backTo`
- `--n 300`、`--n 1000`：規模測試，印出 build 時間與邊數
- `--build` 後斷言 `/wb-index.json` 的邊數與產生器預期的一致，並印出 `serve` 指令供瀏覽器檢查

---

## 17. 驗收清單

以 §16.1 的示範工作區驗收，逐一對照 H§3 的 14 個狀態，扣除 §14 的差異：

- [ ] 01 預設：文件模式；孤島在外圍依著色依據成團，每團下方有群標；重新整理後佈局完全相同
- [ ] 02 hover 節點：相鄰節點與邊保持原色、其餘淡出；提示框內容與翻邊正確
- [ ] 03 選取：選取環、NoteDrawer 開啟；節點落在 Drawer 底下時畫布平移、不縮放
- [ ] 04 hover 邊：提示框列出各種類次數與線型樣本
- [ ] 05 搜尋：符合的節點全亮並顯示標題，統計列附「符合 n」；Esc 清空且不關 Drawer
- [ ] 06 標籤模式：樞紐等距排在圓上；多標籤筆記落在幾團之間；筆記之間沒有線
- [ ] 07 hover 樞紐：該團高亮；點擊後網址是 `?tag=…&view=graph`，Sidebar 的標籤高亮正確，仍在標籤模式
- [ ] 08 套用篩選：只畫符合的筆記與相連的資料檔，重新佈局並符合視窗
- [ ] 09 載入中：chunk 下載中與大圖佈局中都看得到骨架；`aria-busy`
- [ ] 10 空狀態 A；11 空狀態 B（dev 與正式都有方式卡；文案是 §11 的版本）
- [ ] 12 300 節點：只有第 4 級顯示標題；hover 與搜尋沒有可見的延遲；縮放時不掉幀
- [ ] 13 鍵盤：Tab 先到縮放控制與圖例再到節點；focus 環、提示框；Enter 開 Drawer；著色下拉的鍵盤操作（H§2.1）
- [ ] 14 寬度 ≤ 860：頁籤只有 List／Graph，Graph 顯示說明與「改用清單檢視」；沒有下載 Graph chunk
- [ ] 邊：repo 內每一種連結寫法（`/notes/…`、`/view/…`、相對 `.md`、`<PluginView>`、`meta.backTo`）都產生預期的邊；程式碼區塊裡的連結不算
- [ ] 邊的開關只影響顯示與統計，節點位置不動
- [ ] 模式切換：≤ 150 節點有 600ms 移動；> 150 節點與 reduced-motion 直接換位
- [ ] 偏好：模式、著色、邊的開關、孤島、圖例收合在重新整理後保留
- [ ] 設定頁可以把預設 view 設為 Graph
- [ ] `?pending=1&view=graph`：只畫待生成的筆記，Toolbar 有「已篩選 ✕」
- [ ] 被 `ignore.json` 排除的筆記不是節點，連到它的連結沒有邊
- [ ] `NOTECRAFT_BASE=/x` build 後，資料檔節點、標籤樞紐、清除篩選的連結都帶前綴
- [ ] `/wb-index.json` 與 `/notes` 的 HTML 不含本機路徑
- [ ] viewer（`npm pack` 後以 `NOTECRAFTAPP_DEV=1` 執行）行為一致

---

## 18. 風險

| 風險 | 影響 | 對策 |
| :-- | :-- | :-- |
| 佈局 O(n²)，上千篇筆記時主執行緒卡住 | 切到 Graph 時畫面凍結 | Task 131 實測；骨架先畫；超標改 Worker（§5.2） |
| 連結掃描用正規表示式，與 remark 的解析結果不完全一致 | 少數寫法漏掉或多算（例如 URL 內含括號） | 與 `defs-scan` 同樣的取捨；`check:defs` 以 repo 現有筆記的連結逐條斷言 |
| 邊很稀疏時整張圖幾乎都是孤島 | 文件模式看起來是一圈一圈的點 | 孤島依著色依據成團本身就有資訊；空狀態 B 引導到標籤模式 |
| island props 隨筆記數成長 | `/notes` 的 HTML 變大 | §4.5 的門檻；超過時改延遲抓 `/wb-index.json` |
| 每個節點都是 tab stop | 鍵盤使用者要按很多次 Tab | 浮層排在節點之前（§8.4）；roving tabindex 留待之後（Q9） |
| 主專案模式下相對 `.md` 連結不會被改寫（`remark-notecraft-notes-assets` 只在 viewer 模式作用） | 圖上有邊，但點連結是 404 | 屬於既有行為，不在這次範圍；Q2 決定圖上要不要算 |

---

## 19. 待釐清問題

| # | 問題 | 建議 | 理由 |
| :-- | :-- | :-- | :-- |
| Q1 | `<PluginView src>`（筆記內嵌資料檔）與資料檔的 `meta.backTo` 要不要算成邊？ | **都算，種類是 `link`** | 這是筆記與資料檔之間最常見的實際關聯；只認 `/view/…` 連結的話，多數資料檔節點不會出現 |
| Q2 | 相對 `.md`／`.mdx` 連結在主專案模式下不會被改寫成站內連結，圖上要算嗎？ | **算** | 規則與環境無關才好測；作者的意圖很明確。連結本身在主專案 404 是另一個既有問題 |
| Q3 | 標籤樞紐怎麼選？ | **全站前 8 個＋「其他標籤」＋「未加標籤」；篩選中的標籤一律是樞紐** | 19 個標籤全當樞紐太擠；以全站計數才不會一篩選順序就變 |
| Q4 | 著色分組超過 8 組時？ | **前 8 組配色，其餘合併為灰色「其他」**；資料夾的分組層級與 List 分組相同 | 循環用色會讓不相干的組同色 |
| Q5 | 網址上已有 `pending`／`hasAi`／`nofm`／`fav` 時，Graph 要不要套用？ | **套用，並顯示一顆「已篩選 ✕」** | 不套用的話頁首「N 篇」與圖對不上；不提示的話找不到節點變少的原因 |
| Q6 | 模式、著色、邊的開關、孤島、圖例收合要保存嗎？ | **存 localStorage `nc-graph-prefs-v1`，不進網址** | 與「分組」同性質；點樞紐會換頁，不存會跳回預設 |
| Q7 | 點標籤樞紐：換頁還是原地更新？ | **換頁（真的連結）** | Sidebar 高亮才會對；可中鍵開新分頁。代價是換頁後重新佈局，沒有節點移動的動畫 |
| Q8 | 佈局在哪裡算？超過 150 節點的模式切換要動畫嗎？ | **主執行緒同步；> 150 先畫骨架、切換不做移動動畫；Worker 視 spike 結果** | 先用最簡單的做法，數字不行再加複雜度 |
| Q9 | 鍵盤：每個節點都是 tab stop（handoff），還是 roving tabindex＋方向鍵？ | **這版照 handoff**，浮層排在節點之前 | roving 要定義「方向鍵到哪個鄰居」，值得另案設計 |
| Q10 | 空狀態 B 的「如何建立關聯」方式卡在正式環境要顯示嗎？ | **只在 dev 顯示** | 部署站的訪客不能編輯筆記 |
| Q11 | 示範資料放哪裡？ | **fixture 產生器，不進 `src/content/notes/`** | 65 篇示範筆記會淹沒真實筆記，也會進 Dashboard 與搜尋 |
| Q12 | 版號 | **`1.13.0`** | 新功能，minor |

### 優先順序

會影響資料層、要先定的：Q1、Q2、Q3、Q4。影響互動的：Q5、Q6、Q7。可以等 spike 的：Q8。其餘採建議即可開工。

---

## 20. 定案紀錄

2026-10-10 與作者逐題確認。11 題採建議，**Q10 與建議不同**：

| # | 決定 |
| :-- | :-- |
| Q1 | 採建議：`<PluginView src>`（筆記 → 資料檔）與 `meta.backTo`（資料檔 → 筆記）都算成 `link` 邊（§4.3、§4.4） |
| Q2 | 採建議：相對連結一律算成邊，規則不依環境分支（§4.4）。主專案模式不改寫相對 `.md` 連結是既有行為，不在這次範圍（§18） |
| Q3 | 採建議：標籤樞紐取全站筆記數前 8 個，另有「其他標籤」「未加標籤」兩團；篩選中的標籤一律是樞紐（§6.2） |
| Q4 | 採建議：著色分組依節點數取前 8 組配 c1–c8，其餘合併為灰色「其他」；資料夾的分組層級與 List 分組相同（§6.1） |
| Q5 | 採建議：`pending`／`hasAi`／`nofm`／`fav` 在 Graph 照常套用，Toolbar 最左側顯示一顆「已篩選 ✕」可清掉這四個旗標（§8.1） |
| Q6 | 採建議：模式、著色、邊的開關、孤島、圖例收合存 localStorage `nc-graph-prefs-v1`，不進網址（§9） |
| Q7 | 採建議：標籤樞紐與「清除篩選」是真的連結，換頁到 `?tag=…&view=graph`／`?view=graph`（§8.2） |
| Q8 | 採建議：佈局在主執行緒同步算；> 150 節點先畫骨架、模式切換直接換位；Task 131 實測 1,000 節點超過 500ms 才改 Web Worker（§5.2、§5.3） |
| Q9 | 採建議：每個節點與樞紐都是 tab stop（照 handoff），浮層在 DOM 裡排在節點之前；方向鍵導覽之後另案（§8.4） |
| Q10 | **與建議不同**：空狀態 B 的方式卡在 dev 與正式環境都顯示（§11） |
| Q11 | 採建議：示範與規模資料由 `scripts/fixtures/notes-graph-sample.mjs` 產生，不進 `src/content/notes/`（§16.1） |
| Q12 | 版號 `1.13.0` |

---

## 21. 實作後回填

（實作後填寫）
