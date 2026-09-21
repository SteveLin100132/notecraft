---
Project Name: NoteCraft Workbench
文件類型: Design Document
文件版本: v0.2.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件）
文件狀態: 已定案 —— §15 的 30 題已於 2026-09-21 逐題確認（紀錄見 §16），本文即實作依據；尚未實作
文件作者: 建宇
建立日期: 2026-09-21
更新日期: 2026-09-21
依賴文件: docs/notecraft-prd.md、docs/notecraft-plugin-system.md、docs/notecraft-npx-viewer-v2.md、docs/prototype/design_handoff_workbench/README.md
---

# NoteCraft Workbench — 設計文件

把 NoteCraft 的外殼從「248px navy 側邊欄 + 卡片式頁面」換成**三欄工作台**（Rail + 檔案樹 Sidebar + 壓縮頁首／工具列／內容），並新增筆記列表四種 view、Drawer 預覽、⌘K 指令面板、Dashboard widget grid、Plugin 管理頁、設定頁與平板／手機響應式。

> 視覺與互動的**像素級規格**以 [design_handoff_workbench/README.md](prototype/design_handoff_workbench/README.md) 與 `prototype/wb/pt.css` 為準，本文不重抄。
> 本文負責 handoff 沒有回答的事：**prototype 是單頁 React app，codebase 是 Astro 多頁靜態站**，兩者之間的落差要怎麼接；既有功能哪些留、哪些走；以及動工前必須先問清楚的問題（§15）。
> v0.1.0 是問題清單，v0.2.0 已逐題定案（§16），本文即實作依據。**與設計稿不同之處一律以本文為準** —— 共有十餘處刻意的偏離（Board 三欄、字數與版型庫不做、資料檔移出筆記列表、收藏保留、常駐的「開啟」圖示等），都記在 §1.3 與各節。

---

## 1. 這份文件要解決什麼

### 1.1 起點

Handoff 包假設「照 README 重建畫面」就能完成。實際讀過 codebase 之後，有四類落差是 README 沒處理的：

| 落差 | 說明 |
| :-- | :-- |
| **架構** | Prototype 用 `useState(route)` 在單一 React tree 裡切頁；Sidebar 展開狀態、⌘K、Drawer 都活在同一份 state。Codebase 是 `output: 'static'` 的 Astro MPA，每次換頁都是整頁重載、island 各自 hydrate |
| **資料** | Prototype 的資料夾樹是用 `category` 與 `tags` **假造**的（`pt-data.jsx` 的 `FOLDER_OF` / `SUB_OF`）。README §7 說正式版「直接用 MDX 檔案路徑」，但現有 59 篇筆記幾乎全在根目錄，只有一個 `private/` 子資料夾 |
| **既有功能** | README 的「沿用／移除」清單沒提到收藏、全文搜尋（pagefind）、刪除筆記、重新生成提示、資料檔混入 `/notes` 列表等現役功能 |
| **既有決策** | Board 的「未發佈」欄需要筆記層級的 `status` frontmatter，但 PRD 已於 2026-06-16 定案「不引入未發佈判定」（→ Q7 定案：維持 PRD、Board 三欄）；資料檔路由 `/plugins/view/[id]` 與 plugin 設計文件 Q4 定案的 `/view/<路徑>` 衝突 |

### 1.2 目標

1. **殼整個換掉** —— Rail 52 + Sidebar 240 + 主區（Header／Toolbar 40／Body），整個 app 不整頁捲動
2. **所有列表頁共用一套資料列語彙** —— row／group header／stat strip／pill／chip／mini button（README §4）
3. **`/notes` 四種 view + Drawer** —— List（分組）、Board（拖曳改閱讀狀態）、Table、Timeline；單擊預覽、雙擊開啟
4. **全域導覽** —— Sidebar 檔案樹直接篩選、⌘K 指令面板
5. **新頁面** —— `/plugins`（資料檔／已安裝外掛）、`/settings`（設定／關於）
6. **三段響應式** —— 桌面 >1100、平板 861–1100、手機 ≤860
7. **沿用不重寫** —— 筆記內文渲染、`DataFileView`（`PluginHost`）、簡報、`NewNoteModal`、閱讀進度、`ConfirmDialog`、Toast
8. **npx viewer 不退化** —— `npx notecraftapp view ./docs` 指向任意資料夾時，工作台要照常運作

### 1.3 非目標（本次明確不做）

| 項目 | 原因 |
| :-- | :-- |
| 深色模式 | `pt.css` 有 `.wb-dark` token，但 README §8 明說本版不啟用 |
| **字數** | Q9 定案拿掉。設計稿有三處顯示字數（筆記頁首 pill、Drawer Metadata、Table 欄位），全部不做。它不參與任何篩選或邏輯、現況本來就沒有，拿掉可省去一整套計算規則與建索引時的內文處理 |
| 把整站改成 SPA | 見 §4.1；Astro MPA 是 PRD 的技術選型，靜態部署與 pagefind 都建立在它上面 |
| 筆記內文（`.nc-prose`）、程式碼塊、`GeneratedFrame`、`VizZoom`、deck 的任何視覺調整 | 沿用。只換它們外面那層殼 |
| 新增執行時 API | 正式環境仍是純靜態。只有 dev-only API 會新增（§11） |
| 新增 npm 依賴 | 拖曳用 HTML5 DnD、icon 用既有 `lucide-react`、glob／semver 沿用既有實作 |
| 外掛列表的「不相容」pill 與相關統計、警告框 | Q24 定案不做。版本相容性維持只在安裝時檢查；已知在「用舊版 app 開新專案」「手動複製外掛」「app 升大版號」三種情況下不會有任何提示，接受 |
| 外掛列表的「渲染錯誤」pill | Q23 定案首版不做。執行期錯誤 build 期無從得知；用 localStorage 記錄只反映單一瀏覽器、不可靠。錯誤由該頁的 `PluginErrorCard` 呈現 |
| 筆記頁首的「版型庫」按鈕、`DeckLibrary` 頁 | Q16 定案不放。設計稿中它是簡報系統的規格展示頁，codebase 無此頁；`/present/atoms` 是開發用的驗證 deck、不隨 npm 發佈 |
| Prototype 的 Tweaks 面板 | 僅原型用。其中只有「預設 view」「List 預設分組」進設定頁；「列高」「筆記字級」不做（Q29 已定案） |
| 觸控裝置的 Board 拖曳、Drawer 內的閱讀狀態控制 | Q26 定案皆不做。改狀態請進筆記頁；觸控裝置上只隱藏拖曳提示 |

---

## 2. 現況盤點：哪些留、哪些改、哪些走

### 2.1 Layout 與殼

| 現有檔案 | 去向 |
| :-- | :-- |
| `src/layouts/BaseLayout.astro` | **由 `WorkbenchLayout.astro` 取代**。全部頁面都用它，不做新舊並存（Q30 已定案） |
| `src/components/Sidebar.astro` | 刪除。由 `wb/Rail.astro` + `wb/Sidebar.astro` 取代 |
| `src/components/PageHead.astro` | 刪除。由 `wb/Header.astro` 取代 |
| `src/components/Card.astro`、`Badge.astro`、`Button.astro` | 筆記頁內文仍在用的保留；殼與列表頁不再用 |
| `localStorage["nc:sidebar"]`（完整／細條）與對應的 pre-paint script | 移除。新 Sidebar 沒有「細條」模式 |
| `src/layouts/PresentLayout.astro` | 不動。簡報維持全螢幕接管、不在三欄殼內 |

### 2.2 頁面

| 路由 | 現況 | 新版 |
| :-- | :-- | :-- |
| `/` | 5 個 KPI 卡 + 繼續閱讀 + 最近更新 + 標籤 | 12 欄 widget grid + 三個 Tab（§8.1） |
| `/notes` | `NotesList` island：grid／list、多標籤篩選、排序、只看收藏、資料檔混排 | 四種 view + Toolbar + Drawer（§8.2）。**island 重寫**；只列筆記，資料檔移出（Q14） |
| `/notes/[...slug]` | 頁內自帶返回連結、標籤編輯、h1、描述、meta 列、動作列 | 新頁首接手標題與全部動作（dev-only 動作收進「⋯」選單）；內文保留標籤、描述、資訊列（§8.3，Q12 已定案） |
| `/series`、`/series/[id]` | 封面色塊卡片 grid、hero 色塊 | row + stat strip（§8.4） |
| `/tags` | `TagsManager` island | row + inline 改名；`ConfirmDialog` 語意沿用（§8.5） |
| `/view`（資料檔列表） | `DataFilesList` island | 併入 `/plugins`，舊網址轉址（Q19 已定案；轉址做法見 Q20） |
| `/view/[...path]` | `BaseLayout bleed` + `PluginHost` | 沿用，只換頁首（§8.7） |
| `/about` | 靜態說明頁 | 併入 `/settings` 的「關於」Tab；舊網址靜態轉址（Q20 已定案） |
| `/plugins`、`/plugins/folder/[dir]`、`/settings` | 不存在 | **新增** |
| `/present/[...slug]` | 全螢幕簡報 | 不動 |

### 2.3 Island 與 lib

| 檔案 | 去向 |
| :-- | :-- |
| `NotesList.tsx`（832 行） | 由 `wb/NotesWorkbench.tsx` 取代。收藏與閱讀進度的訂閱邏輯搬過去 |
| `SeriesOverview.tsx`、`SeriesDetail.tsx`、`TagsManager.tsx`、`DataFilesList.tsx` | 依新版面重寫；資料 props 形狀盡量不變 |
| `ContinueReading.tsx` | **刪除**。由 Dashboard「系列進度」widget 吸收，每個系列補一顆「繼續閱讀」按鈕（Q15a 已定案，§8.1） |
| `PagefindSearch.tsx` | **刪除**。全文搜尋併入 Palette 的「內文」組（Q13 已定案，§8.9） |
| `FavoriteButton.tsx` | **保留**（Q11 已定案）：移到 Drawer 標題旁與筆記頁首，樣式改為 icon 鈕 |
| `DeleteNoteButton.tsx`、`RegenerateButton.tsx` | 邏輯保留、外觀改掉：收進筆記頁首的「⋯」選單（Q12 已定案，§8.3） |
| `ReadingControl.tsx` | **不動**，留在筆記內文的資訊列（Q12） |
| `GenerateDeckButton.tsx` | **保留邏輯**，外觀改為工作台的 ghost 按鈕；用於筆記頁首與 Drawer（Q17 已定案，§8.3） |
| `TagEditor`、`Toc`、`DonePrompt`、`SeriesNav`、`VizZoom`、`PluginHost`、`PluginErrorCard`、`NewNoteModal`、`ToastHost`、`PresentApp` | **不動** |
| `src/lib/reading-progress.ts`、`favorites.ts`、`series.ts`、`plugins.ts`、`decks.ts` | 不動，兩個例外：`plugins.ts` 為 Q22（`disabled`）與 Q21（`backTo` 檢查）小幅擴充；`reading-progress.ts` 依 Q7 把首態文案改為「未開始」 |
| `src/lib/notes.ts` | 擴充：`buildDashboardStats` 換成新的工作台索引（§5） |

---

## 3. 名詞

| 名詞 | 意義 |
| :-- | :-- |
| **工作台（Workbench）** | 新版 UI 的總稱；CSS 前綴 `wb-` |
| **Rail** | 最左 52px 深色圖示列 |
| **Sidebar** | 240px 淺色檔案樹：資料夾／系列／Plugin 資料檔／其他 |
| **Header** | 壓縮頁首：麵包屑 + 標題列 + pill + Tabs + 動作 |
| **Toolbar** | Header 下方 40px 工具列：分組／篩選 chip／搜尋／計數 |
| **Body** | 唯一會捲動的主內容區（`.wb-body`） |
| **Drawer** | 右側 480px 預覽抽屜 |
| **Palette** | ⌘K 指令面板 |
| **工作台索引** | build 期算出的全站筆記／系列／標籤／資料檔摘要 JSON（§5） |
| **資料列語彙** | README §4 的 row／group header／stat strip／pill／chip／mini button |

---

## 4. 架構：三欄殼怎麼在 Astro MPA 裡成立

### 4.1 導覽模型：維持 MPA（Q1 已定案）

Prototype 是一棵 React tree，但正式版**不照搬成 SPA**。理由：

- 筆記頁是 `astro:content` 的 `render()` 產物，MDX 內的生成元件各自是 island。塞進 SPA 等於放棄 Astro 的 MDX 管線
- pagefind 靠每篇筆記有獨立 HTML 才能索引
- 簡報、`/view`、`PluginHost` 都已經是「一頁一個 HTML」的形狀

代價是換頁會整頁重載，Sidebar 的展開狀態與捲動位置必須自己保存（§4.4）。

### 4.2 `WorkbenchLayout.astro`

取代 `BaseLayout.astro`，由各頁傳入頁首資料：

```astro
<WorkbenchLayout
  title="全部筆記"
  rail="notes"                          // Rail 高亮：dashboard | ai | plugins | settings | ""
  crumbs={[{ label: "NoteCraft", href: "/" }, { label: "筆記" }]}
  pills={[{ label: "59 篇", tone: "muted" }]}
  back="/notes"                         // 可選：返回鍵
  flush                                 // Body 無 padding、白底
>
  <Fragment slot="actions">…</Fragment>   // 頁首右側按鈕
  <Fragment slot="tabs">…</Fragment>      // 靜態 Tab（連結型）
  <Fragment slot="toolbar">…</Fragment>   // 靜態 Toolbar
  …Body…
</WorkbenchLayout>
```

骨架（對應 README §3.1）：

```
<div class="wb-app">
  <Rail />                      靜態 .astro
  <Sidebar />                   靜態 .astro + 一個小 island
  <div class="wb-main">
    <Header />                  靜態 .astro（互動型 Tab 例外，見 §4.3）
    <slot name="toolbar" />
    <div id="nc-scroll" class="wb-body"> <slot /> </div>
  </div>
</div>
<Palette client:idle />  <ToastHost client:idle />  {isDev && <NewNoteModal client:idle />}
```

`id="nc-scroll"` **刻意保留**在新的捲動容器上：`Toc.tsx` 與 `notes/[...slug].astro` 的 inline script 共 4 處靠它找捲動容器，保留 id 就不必改它們。

### 4.3 靜態與 island 的切分

原則：**能在 build 期畫完的就用 `.astro`，只有需要 client state 的才是 island。**

| 區塊 | 形式 | 為什麼 |
| :-- | :-- | :-- |
| Rail | `.astro` + inline script | 5 個連結；⌘K 按鈕只 dispatch `nc-open-palette` 事件 |
| Sidebar 樹（資料夾／資料檔夾／標籤計數） | `.astro` | 全是 build 期已知的資料；每頁 HTML 直接帶 |
| Sidebar 系列進度條、目前篩選高亮、平板抽屜開合 | 小 island `wb/SidebarLive.tsx` | 進度在 localStorage；篩選在 query string，靜態站 build 期看不到 |
| Header（麵包屑／標題／pill／連結型 Tab） | `.astro` | |
| `/notes`、Dashboard、`/plugins` 的 Header Tab + Toolbar + Body + Drawer | **同一個 island** | Tab 切換、篩選、選取是同一份 state；拆開就要跨 island 同步 |
| Palette | island，`client:idle` | 每頁都要有；資料延遲載入（§5.3） |

因此 `/notes` 這類頁面的 Header 會由 island 自己渲染（island 內含一份 React 版 `WbHeader`），`.astro` 版與 React 版共用同一份 CSS class，視覺一致由 `workbench.css` 保證。

### 4.4 跨頁狀態

| 狀態 | 存哪 | 備註 |
| :-- | :-- | :-- |
| Sidebar 資料夾展開 | `localStorage["nc-wb-sidebar-v1"]` | pre-paint inline script 在首次繪製前套用，沿用現行 `nc:sidebar` 防閃動的做法 |
| Sidebar 捲動位置 | `sessionStorage` | 換頁後還原 |
| 預設 view／預設分組 | `localStorage["nc-workbench-prefs-v1"]` | 設定頁寫、`/notes` 讀 |
| 目前篩選 | URL query | §7 |
| 目前 view Tab | URL query `?view=`（Q3 已定案） | 切換時 `history.replaceState`，不堆疊上一頁紀錄 |
| Drawer 選取 | island state，不進 URL | 換頁即關 |
| 閱讀進度、收藏 | 既有 key 不動 | `nc-reading-progress-v1`、`nc:favorites` |

### 4.5 z-index 階梯

現況：舊 Sidebar 500、`VizZoom` 900、`global.css` 的浮層 1000。新增元件排進去：

| 層 | z-index |
| :-- | --: |
| Sidebar 抽屜（平板／手機）與其 scrim | 500 / 490 |
| Drawer 與其 scrim | 600 / 590 |
| 手機底部 Tab bar | 650 |
| `VizZoom` 放大檢視（既有） | 900 |
| Palette、`NewNoteModal`、`ConfirmDialog`、Toast（既有 1000 級） | 1000 |

`Escape` 的關閉順序由上而下：Palette → Modal → Drawer → Sidebar 抽屜。

---

## 5. 資料層：工作台索引

### 5.1 `src/lib/workbench.ts`（新增，build 期）

把現在散在 `index.astro`、`notes/index.astro`、`BaseLayout.astro` 各算一次的東西收成一份：

```ts
export interface WbNoteRow {
  slug: string;
  title: string;
  description: string;        // Drawer 摘要
  path: string;               // 真實檔案相對 notesDir 的路徑，含副檔名（§5.2.2）；不是 slug
  folder: string[];           // path 的資料夾分段（真實名稱，非 slug）；根目錄為 []
  tags: string[];
  markers: { id: string; type: string; status: AiMarker["status"]; prompt: string }[];
  createdAt: string;
  updatedAt: string;
  series: { id: string; title: string; accent: string; index: number; total: number } | null;
  hasFrontmatter: boolean;    // §5.2.1
  hasDeck: boolean;
  promptPath: string;         // 給 Claude Code 對話範本用、相對專案根的檔案路徑（§8.2，Q18）；僅 dev 輸出
}
export interface WbFolderNode { name: string; path: string; count: number; children: WbFolderNode[] }   // 不帶 color，見 Q6
export interface WbIndex {
  notes: WbNoteRow[];
  folders: WbFolderNode[];
  series: WbSeries[];         // 含 chapters（筆記與 view: 資料檔一視同仁）
  tags: TagStat[];
  dataFiles: WbDataFile[];
  plugins: WbPlugin[];        // §8.6
  pending: { markers: number; notes: number };
  workspaceLabel: string;     // §5.2.2；不含本機絕對路徑
}
export async function getWorkbenchIndex(): Promise<WbIndex>   // 模組層快取，一次 build 只算一次
```

`BaseLayout` 目前每頁都重跑一次 `getAllNotes()` + `parseMarkers()` 來算待生成數；收進快取後這個成本消失。

### 5.2 資料夾樹

- 由筆記**真實檔案路徑**（相對 notesDir）切段產生，不是由 entry id —— id 會被 slug 化，見 §5.2.2。**不限層數**（Q4 已定案）。Sidebar 的樹同樣不限層數，子層每層多縮排 14px
- **舊版現況**：沒有任何資料夾篩選，唯一的篩選參數是 `?tag=`（hydrate 後由 client 讀取，新版原樣保留）。資料夾只存在於 slug 中 —— 筆記頁路由 `[...slug]` 與 dev API 的刪除／標籤寫入本來就支援任意層數的巢狀 slug，所以不限深度是延續現況、不是新能力
- **連帶待辦**：`GET /api/folders`（新增筆記的資料夾下拉）目前只列 notesDir 的**第一層**。樹不限層數之後，這支 API 要改成遞迴列出，否則無法從 UI 在子資料夾建立筆記
- 根目錄的筆記歸入「根目錄」群組，List 分組時永遠排最前（README §5.2）
- **資料夾不分色**（Q6 已定案）：所有資料夾一律用 `--wb-blue-l`（`#2c6ebb`，即 DS 的 `--blue-500`，也是 prototype 第一個資料夾的顏色）；「根目錄」用灰 `#8b9aad`。Prototype 寫死的 `01-前端` 等五個名稱與五種顏色不採用
- 影響範圍：Sidebar 的 folder 圖示、List 以資料夾分組時的 group header（`--gc`）。**系列色不受影響**，仍依 `accent` 取 orange／blue／navy／green；以系列分組時 group header 照樣有顏色區分
- 索引因此不必帶顏色欄位，顏色完全由 CSS 決定
- **資料夾只認檔案路徑**（Q5 已定案）。`category` frontmatter 維持現狀：schema 保留、UI 不使用，不拿來當虛擬資料夾
- 主專案現況因此是「根目錄」一組加 `private/`。`private/` 在 `.gitignore` 裡，**Netlify 正式站上不存在**，正式站的 Sidebar「資料夾」區段只會有「全部筆記」與根目錄
- 日後要分類就搬檔案。搬檔會改 slug，連帶影響 `series.json` 的章節識別碼、閱讀進度與收藏的 localStorage key、`<slug>.deck.tsx` 檔名、對外網址。**搬遷腳本不在本次範圍**，需要時另開任務

### 5.2.1 `hasFrontmatter` 的判定（Q8 已定案）

- **規則：檔案開頭沒有 `---` 區塊即為「無 frontmatter」**。以 `entry.filePath` 讀原始檔頭，比對 `/^\uFEFF?---\r?\n/`（容忍 BOM 與 CRLF）
- 有區塊但內容是空的、或只是沒寫 `title`，都**算有** frontmatter —— chip 的文字說的是「有沒有」，不是「齊不齊」
- 必須讀原始檔判斷：`enrichNote()` 補完 `title`／`createdAt`／`updatedAt` 的預設值之後，已無從分辨哪些是作者寫的
- 讀不到檔（不該發生）時視為有 frontmatter，不讓一次 I/O 失敗把筆記誤標
- 用途兩處：Toolbar 的「無 frontmatter N」chip、AI pill 的第一優先狀態（README §4）
- 計數為 0 時 **chip 不顯示**。主專案的筆記全都有 frontmatter，一顆永遠是 0 的 chip 只是雜訊；這個狀態是為 viewer 使用者的一般 Markdown 資料夾準備的

### 5.2.2 路徑的顯示規則（Q25 已定案）

**本機絕對路徑不得出現在任何輸出的 HTML 或 JSON 裡**，dev 與正式環境顯示相同。正式站是公開網頁，絕對路徑含使用者名稱與本機目錄結構。

兩個字串，都在 build 期由 `src/lib/workbench.ts` 算好：

| 名稱 | 定義 | 主專案 | viewer（`npx notecraftapp view ./docs`，於 `~/work/trendmile`） |
| :-- | :-- | :-- | :-- |
| `workspaceLabel` | notesDir 相對於專案根的路徑；viewer 再前綴專案資料夾名 | `src/content/notes` | `trendmile/docs` |
| `WbNoteRow.path` | 筆記相對於 **notesDir** 的路徑，含副檔名 | `private/xxx.mdx` | `planning/spec.md` |

- 專案根 = `NOTECRAFT_USER_CWD`，沒有則 `process.cwd()`；notesDir = `NOTECRAFT_NOTES_DIR`，沒有則 `src/content/notes`
- notesDir 不在專案根底下時（相對路徑以 `..` 開頭），`workspaceLabel` 退回只顯示 notesDir 的資料夾名，不輸出 `../`
- `WbNoteRow.path` = `path.relative(notesDir, path.resolve(process.cwd(), entry.filePath))`，統一成正斜線。**不直接顯示 `entry.filePath`**：它是相對於 app 根目錄的路徑，viewer 模式下 app 位於 `~/.notecraft/app-<版本>/`，推測會變成一長串 `../` 開頭的字串（**未實測，P2 驗證**）
- **也不能用 entry id 反推路徑**：Astro glob loader 預設會把 id slug 化（轉小寫、空白變連字號），`My Notes/ER Diagram.md` 的 id 是 `my-notes/er-diagram`。主專案的檔名本來就是 slug 形式所以看不出差別，viewer 使用者的資料夾就會對不上。**§5.2 的資料夾樹同樣要從真實相對路徑切段**，顯示真實的資料夾名；`?folder=` 的值也用真實路徑。slug（entry id）只用於 `/notes/<slug>` 網址與 localStorage key

各處顯示什麼：

| 位置 | 顯示 |
| :-- | :-- |
| Sidebar 頭第二行、關於頁「工作區」列 | `workspaceLabel` |
| Drawer 頂列 | `workspaceLabel` + `/` + `path`（完整脈絡只在這裡出現一次） |
| Drawer Metadata「路徑」、List 的路徑欄、Table、Timeline、Palette | `path` |
| 筆記頁底部（現況顯示 `note.filePath`） | 改為 `path`，順手修掉 viewer 模式下的 `../` 問題 |
| `PluginErrorCard` 的檔案路徑 | 已是相對 notesDir，不動 |

例外：dev-only 的「以 VS Code 編輯」需要絕對路徑組 `vscode://file/…`。它只在 `import.meta.env.DEV` 為真時才被渲染，正式 build 的 HTML 裡不存在，維持現狀。

### 5.3 交付方式（Q2 已定案）

採**混合式**：

| 消費者 | 方式 |
| :-- | :-- |
| Sidebar | build 期直接畫成 HTML，不帶 JSON |
| `/notes`、Dashboard、`/series`、`/tags`、`/plugins` 的 island | 該頁需要的切片 inline 成 props（與現況相同，首屏有內容、無閃爍） |
| Palette、Dashboard 上的 Drawer | 第一次開啟時 `fetch("/wb-index.json")`，瀏覽器快取 |

`/wb-index.json` 由 `src/pages/wb-index.json.ts` 靜態端點在 build 期輸出，**不是執行時 API**。Palette 每頁都在，若把全站筆記清單 inline 進每一頁，N 篇筆記就是 N 倍重複；viewer 使用者的資料夾可能有上千篇。

### 5.4 時間基準（Q10 已定案）

`src/pages/index.astro` 目前寫死 `const TODAY = "2026-06-12"`，「本週新增」早已失真。新版：

| 類別 | 項目 | 何時算 |
| :-- | :-- | :-- |
| **絕對量** | 筆記總數、AI 生成率、已生成／待生成數、標籤分布、系列章節數 | build 期 |
| **相對量** | 近 7 日／近 30 日更新數、近 8 週長條圖、「N 天前更新」、Dashboard「本週」Tab、Timeline 以外任何以「今天」為基準者 | **瀏覽器端，以 `Date.now()` 計算** |

- build 期只輸出每篇筆記的日期字串（`YYYY-MM-DD`）；靜態站即使很久沒重新部署，相對量也永遠正確
- **首次繪製時相對量以「—」佔位**，hydrate 後才填入。伺服器沒有「今天」，硬算會與瀏覽器結果不同而觸發 hydration mismatch（與 `seriesProgress(slugs, live=false)` 同一個理由）
- 日期一律以**瀏覽器當地時區**的日界線比較（`new Date(y, m-1, d)`），不用 UTC，否則台灣時間早上八點前「今天」會算成昨天
- **長條圖的週窗**：以今天為最後一天，每 7 天一格、往回 8 格（第 8 格 = 今天往回 6 天到今天）。不採用 prototype「以最新一篇筆記的日期為基準」的做法 —— 那會讓很久沒寫的時候看起來仍像最近很活躍
- **一律以 `updatedAt` 為準**，文案寫「更新」而非「新增」。現況 Dashboard 的「本週新增／本月新增」（以 `createdAt` 計）隨之取消
- 已知副作用：批次改名或刪除標籤會改寫所有受影響筆記的 `updatedAt`（dev API 的既有規定），當週的長條會因此衝高。接受，不另做排除
- `src/lib/dates.ts` 的 `daysAgo()` 本來就在未帶基準日時取當下時間，但它用 `toISOString()` 取日期，那是 **UTC**；改成取當地日期。`index.astro` 傳入寫死 `TODAY` 的呼叫點一併清掉

---

## 6. 路由

`output: 'static'` 下 query string 在 build 期不可見，**所有篩選都由 client 讀 `location.search`**。

**網址更新規則**（Q3 已定案，適用於所有 Tab 與篩選）：island 內切換 Tab、切換篩選 chip 時用 `history.replaceState` 改寫網址，不產生新的歷史紀錄 —— 從列表按瀏覽器上一頁會直接離開列表，而不是倒帶每一次 Tab 切換。從 Sidebar 點資料夾／系列是真正的連結導覽，會產生歷史紀錄。List 的**分組方式與搜尋字串不進網址**：分組是偏好（存 `nc-workbench-prefs-v1`），搜尋是暫時狀態。

| 路由 | 說明 |
| :-- | :-- |
| `/` | Dashboard；Tab 用 `?tab=week`、`?tab=ai` |
| `/notes` | 全部筆記 |
| `/notes?folder=<路徑>` | 資料夾篩選，單一參數放完整路徑（例 `?folder=01-前端/react`），以路徑前綴比對、含所有子孫；不使用 README 的 `&sub=`（Q4 已定案） |
| `/notes?series=<id>`、`?tag=<名稱>` | 系列／標籤篩選 |
| `/notes?pending=1` | AI 標記佇列（Rail 的 sparkle） |
| `/notes?fav=1`、`?hasAi=1`、`?nofm=1` | 其餘篩選 chip：只看收藏（Q11）、含 AI 標記、無 frontmatter。可彼此組合，也可與 `folder`／`series`／`tag` 組合 |
| `/notes?view=list\|board\|table\|timeline` | view Tab（Q3 已定案）。值一律小寫；未帶或值無效時用設定頁的預設 view；手機忽略此參數、一律 List。可與篩選參數組合，例 `?folder=a/b&view=table` |
| `/notes/<slug>` | 筆記內文（不變） |
| `/series`、`/series/<id>` | 不變 |
| `/tags` | 不變 |
| `/plugins`、`/plugins?tab=installed` | **新增** |
| `/plugins/folder/<dir>` | **新增**。`<dir>` 可含 `/`，用 `[...dir].astro` |
| `/view/<路徑>` | 資料檔渲染頁，**維持現行路由**，不採用 README 的 `/plugins/view/[id]`（Q19 已定案）。麵包屑仍顯示 `NoteCraft / Plugin / <路徑>`，Rail 仍高亮 Plugin |
| `/settings`、`/settings?tab=about` | **新增** |
| `/about`、`/view` | 靜態轉址到 `/settings?tab=about`、`/plugins`（Q20 已定案，見下） |
| `/present/<slug>` | 不變 |

**舊網址轉址**（Q20 已定案）：用 Astro 內建的 `redirects` 設定，build 時替每個舊網址產生一個只含 meta refresh 的極小 HTML。

```js
// astro.config.mjs
redirects: {
  "/about": "/settings?tab=about",
  "/view": "/plugins",
},
```

- 不綁平台：Netlify、viewer 的 `serve` 模式、任何靜態主機都有效；`astro dev` 下也會轉。**不另外在 `netlify.toml` 寫 301 規則**，避免同一件事維護兩份設定
- 它不是真正的 301 狀態碼。個人筆記站不在意搜尋權重轉移，接受
- `src/pages/about.astro` 與 `src/pages/view/index.astro` 刪除。**只影響 `/view` 列表頁本身**；`/view/<路徑>` 資料檔渲染頁依 Q19 維持原網址，不轉址
- **P11 要驗證的一點**：`src/pages/view/[...path].astro` 是 rest 參數路由，理論上也能匹配空路徑 `/view`。目前由 `view/index.astro` 佔住這個位置；刪掉它之後，要確認 `/view` 確實落到 redirect 而不是被 `[...path]` 接走（`getStaticPaths` 不回傳空路徑即可，實際 build 後檢查 `dist/view/index.html` 的內容）
- 帶 query 的目的地（`/settings?tab=about`）同樣在 P11 實測一次

Rail 高亮規則（README §3.2）：`/` → 儀表板；`/notes?pending=1` → AI；`/plugins*` 與 `/view/*` → Plugin；`/settings` → 設定；其餘不高亮，改由 Sidebar 高亮。`?pending=1` 的判斷在 client 做。

---

## 7. 樣式與 token

### 7.1 `src/styles/workbench.css`

把 `prototype/wb/pt.css` 幾乎逐行移植（README §2 要求像素級重現），但做三件事：

1. **所有樣式收在 `.wb-app` 底下**。13px 基準字級寫在 `.wb-app`，不碰 `html`／`body`；`.nc-prose` 用 `rem`，不受影響
2. **色碼改指向 DS token**（§7.2）。CLAUDE.md 規定不硬編碼色碼
3. 移除 `.wb-dark`、`body.pt-mobile/.pt-tablet/.pt-desktop` 這些只為原型預覽而存在的規則，響應式改用 media query

殼與列表頁**不用 Tailwind utility**，與現有程式碼（inline style + `global.css`）的風格一致，也避免 viewer 模式下 Tailwind content 掃描範圍的問題再多一個變數。

### 7.2 token 對映

Prototype 的色碼絕大多數**本來就是 DS 的值**，只是寫成了 hex：

| `--wb-*` | 值 | 對映 DS token |
| :-- | :-- | :-- |
| `--wb-blue` / `-d` / `-l` | `#1b4f9c` / `#163f7d` / `#2c6ebb` | `--blue-700` / `--blue-800` / `--blue-500` |
| `--wb-gold` / hover | `#ed9b26` / `#e37b24` | `--orange-400` / `--orange-500` |
| `--wb-bg` | `#f6f8fb` | `--neutral-50` |
| `--wb-line` / `--wb-line-2` | `#e1e6ee` / `#eef1f6` | `--neutral-200` / `--neutral-100` |
| `--wb-ink` / `--wb-ink-3` | `#161c28` / `#6c798e` | `--neutral-900` / `--neutral-500` |
| ok / warn / danger | `#2e9e6b` / `#e3a008` / `#d64545` | `--success-500` / `--warning-500` / `--danger-500` |

**DS 沒有的七個值**照 prototype 原樣保留，新增為工作台專用 token（Q28 已定案）。集中定義在 `workbench.css` 開頭並註明「工作台專用、DS 無對應」；元件與樣式規則裡**一律引用 token、不出現 hex**，以此符合 CLAUDE.md「不硬編碼色碼」的規定：

| 新 token | 值 | 用途 | 備註 |
| :-- | :-- | :-- | :-- |
| `--wb-ink-2` | `#2b3546` | 次要文字 | prototype 已有此 token 名 |
| `--wb-mute` | `#8b9aad` | 根目錄群組 | prototype 寫在 JS 常數裡，不在 `pt.css`。原本也用於 Board「未發佈」欄，該欄已依 Q7 取消 |
| `--wb-warn-ink` | `#8a6412` | warn pill 文字、Sidebar 底部卡片標題 | DS 的 `--warning-700` 是 `#9a6600`，不採用 |
| `--wb-ok-ink` | `#1f7350` | ok pill 文字 | DS 沒有 success 的深色階 |
| `--wb-danger-ink` | `#c0392f` | danger pill 文字 | DS 沒有 danger 的深色階 |
| `--wb-rail-ic` | `#8b98ab` | Rail 圖示預設色 | |
| `--wb-rail-ic-hover` | `#dfe5ee` | Rail 圖示 hover 色 | |

`rgba(...)` 形式的半透明底色（pill 底、hover 底、scrim、陰影）同樣收成 token，以 DS 色的 RGB 分量組成，不另列。

### 7.3 Icon

沿用白名單內的 `lucide-react`，對映見 README §9。`.astro` 靜態區塊用既有的 `Icon.astro`，缺的圖示補進去。Logo 是 inline SVG（`NcLogo`），favicon 同款。

---

## 8. 各頁設計

每節只寫 README 沒講、或與 codebase 現況有出入的部分。

### 8.1 Dashboard `/`

- 三個 Tab 是同一份資料的三種投影，做成同一個 island，Tab 寫進 `?tab=`
- 「最近更新」與「待生成標記」的列可單擊開 Drawer（prototype 的 `onSel`），Drawer 資料走 §5.3 的延遲載入
- **「系列進度」widget 吸收現有的 `ContinueReading` 卡，並在每個系列補一顆「繼續閱讀」小按鈕**（Q15a 已定案，作者提出）：

```
┌ 系列進度                      3 個系列 ┐
│ ■ AI 顧問陪跑筆記系列             2/5   │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ 繼續讀：Workshop 0625       (繼續閱讀)   │
│ ───────────────────────────────────── │
│ ■ 規格書撰寫                       0/3   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ 第一章：What 寫什麼          (開始閱讀)   │
│ ───────────────────────────────────── │
│ ■ 專案管理系列                     7/7   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│ 已全部讀完                               │
└────────────────────────────────────────┘
```

  | 系列狀態 | 第三行左側文字 | 右側按鈕 |
  | :-- | :-- | :-- |
  | 進行中 | 「繼續讀：<下一章標題>」 | `.wb-mini`「繼續閱讀」 |
  | 未開始 | 「第一章：<首章標題>」 | `.wb-mini`「開始閱讀」 |
  | 已全部讀完 | 「已全部讀完」 | 不顯示 |

  - 按鈕是 `<a>`，直接連到下一章（`seriesProgress().nextSlug` 對應的 `href`；下一章是資料檔時連到 `/view/…`）。樣式沿用設計稿既有的 `.wb-mini`（高 24、全圓角、hover 藍邊藍字），不新增元件
  - 點系列的其他區域（名稱、進度條）仍進 `/series/<id>`，照設計稿
  - **DOM 結構同 §8.2.1**：連結不可包在按鈕裡。每個系列是容器，內含並排的主區域按鈕與「繼續閱讀」連結
  - 左側文字過長時單行省略，按鈕不被擠壓（`flex:none`）
  - 排序：**進行中 → 未開始 → 已讀完**，同組內進行中者依完成度高到低，其餘依 `series.json` 順序。設計稿是純依設定檔順序；改成這樣是為了讓正在讀的排最上面，延續現有卡片的挑選邏輯
  - 進度在 localStorage：首次繪製以 `seriesProgress(slugs, live=false)` 輸出（全部未開始、不顯示按鈕），hydrate 後才套用真實進度與排序。與現有 `ContinueReading` 的做法相同
  - `ContinueReading.tsx` 刪除
- **「已生成簡報 N / 總數」不再顯示**（Q15b 已定案：拿掉）。不搬到關於頁、也不併入其他 widget；有沒有簡報由筆記頁首與 Drawer 的簡報按鈕呈現（Q17）。`index.astro` 對 `allDeckSlugs()` 的引用一併移除
- 「寫作頻率」「近 7 日／30 日」「本週」Tab 一律以**更新日**計、於瀏覽器端計算；現況以建立日計的「本週新增／本月新增」KPI 取消（Q10 已定案，細節見 §5.4）

### 8.2 `/notes`

- 一個 island 管 Header Tab、Toolbar、四種 view、Drawer
- **Board 只有三欄**（Q7 已定案）：未開始 `--neutral-500`／閱讀中 `--blue-500`／已完成 `--success-500`，**所有筆記皆可拖曳**。設計稿的第四欄「未發佈」、斜紋底的不可拖卡片、欄底「草稿與規劃中，不計入進度」說明一律不做；PRD 2026-06-16「不引入未發佈判定」的定案維持，`reading-progress.ts` 與 `seriesProgress()` 的分母不動，frontmatter 不新增 `status`
- 三欄的版面：欄仍是 `min-width:232px`、`flex:1` 均分，寬螢幕上每欄會比設計稿寬一些，卡片樣式不變
- Drawer pill 列的「筆記狀態」pill（設計稿用來顯示草稿／即將登場）一併拿掉，只留 AI 狀態與系列
- 欄名與狀態 pill 的文案以 `readingMeta()` 為單一來源。現況首態叫「待開始」，設計稿全站寫「未開始」（Board 欄名、系列詳情的 pill、stat strip）；**統一改為「未開始」**，只需改 `reading-progress.ts` 一處
- Board 拖曳寫入 `setReadingStatus()`，其他 view 透過既有的 `READING_EVENT` 同步
- **拖曳只在有精確指標的裝置上提供**（Q26 已定案）。HTML5 拖放在觸控螢幕上不會觸發；**不做觸控拖曳、Drawer 也不加閱讀狀態控制**，Drawer 完全照設計稿
  - 判斷：`window.matchMedia("(pointer: fine)").matches`。為假時卡片 `draggable={false}`、不帶「拖曳可改變閱讀狀態」的 `title`、游標不變抓取手勢（CSS 以 `@media (pointer: coarse)` 處理）。觸控筆電的主要指標是滑鼠，仍可拖
  - 首次 render 一律視為不可拖（SSR 沒有 `matchMedia`），hydrate 後才開啟，避免 mismatch
  - 觸控裝置上 Board 是**純總覽**：看哪些未開始／閱讀中／已完成，點卡片開 Drawer、雙擊開筆記
  - 改閱讀狀態的路徑（全裝置、鍵盤皆可用）：筆記頁的 `ReadingControl` 三段切換、文末 `DonePrompt`、系列詳情頁每章的單鍵推進按鈕。加上「開啟筆記即自動轉為閱讀中」，正常閱讀流程下本來就很少需要手動改
  - 已知取捨：只用鍵盤的使用者無法在 Board 上改狀態，須進筆記頁。個人筆記工具，接受
- List 分組「標籤」以**第一個標籤**為 key（prototype 如此），一篇筆記只會出現在一組
- 搜尋框是標題／路徑／標籤的字串比對，只過濾當頁列表；全文搜尋在 Palette（Q13 已定案，§8.9）
- **收藏保留，放在 Toolbar 的篩選 chip**（Q11 已定案）。Toolbar 由左到右是：「分組」segmented（只在 List 出現）→ 分隔線 → **篩選 chip 列**（四種 view 都有）→ 右側搜尋框與計數。「收藏 N」chip 排在「含 AI 標記」「待生成 N」「無 frontmatter N」之後，樣式相同，語意等同現有的「只看收藏」
  - **不放進「分組」**：分組是把全部筆記切成幾堆、只在 List 可用、且會被記成偏好；收藏是布林篩選，要在四種 view 都能用、也要能與任一種分組疊加
  - 收藏數為 0 時 chip 不顯示。收藏存在 localStorage，SSR 階段一律視為 0，hydrate 後才出現（與現行 `NotesList` 的處理相同）
  - 網址參數 `?fav=1`，規則同其他 chip（`replaceState`）
  - 星號按鈕兩處：**Drawer 標題右側**、**筆記頁首**（重用 `FavoriteButton`，樣式改為 24px 方形 icon 鈕）。List／Table／Board 的列與卡片上**不放星號**，維持設計稿的列結構
  - `src/lib/favorites.ts` 與 localStorage key `nc:favorites` 原封不動，既有收藏資料直接沿用
- **資料檔移出筆記列表**（Q14 已定案）。`/notes` 在任何情況下都只列筆記 —— 包含以系列篩選、List 依系列分組時。四種 view 都不必為資料檔設計列、卡片或欄位。此決定**修訂 plugin 設計文件 Q6「`/notes` 列表：進」**，P13 回頭在該文件記一筆
  - **混合顯示保留在「系列」這條線上**，全部照舊一視同仁、計入進度：系列詳情頁的章節列表、系列總覽、Sidebar 與 Dashboard 的系列進度、筆記頁底部的 `SeriesNav`、Drawer 的「同系列章節」
  - 以系列篩選（`/notes?series=<id>`）時，列表筆數會少於該系列的章節數。頁首在「N 篇」pill 旁加一顆 muted pill「僅筆記」，Toolbar 左側說明文字寫「此系列另有 M 個資料檔章節」並附「系列總覽 →」連回 `/series/<id>`；M 為 0 時兩者都不顯示
  - 資料檔的入口：Rail 的 Plugin、Sidebar「Plugin 資料檔」區段、`/plugins`、系列相關頁面、Palette
- 現有的多標籤篩選、排序欄位／方向，新設計都沒有（多標籤與排序不保留，單一標籤篩選改由 `?tag=` 承接，排序在 Table 以外固定為更新日倒序）
- **Table 為六欄**：標題／資料夾／系列／標籤／AI 標記／更新日，外加 §8.2.1 的「開啟」圖示欄。設計稿的「字數」欄不做（Q9），空出的寬度由標題欄吸收
- **Drawer 的動作列**（由左到右）：「開啟筆記」solid → 簡報（三段式，Q17）→「**複製生成提示**」ghost（Q18 已定案）→ 收藏星號（Q11，靠右）
  - 「複製生成提示」**僅 dev、且該筆記有待生成標記時**顯示。網頁是純靜態站、無法當場生成；AI 視覺化由作者在 Claude Code 對話中觸發，所以這顆按鈕做的事是把對話範本複製到剪貼簿 + Toast「已複製，貼到 Claude Code 即可」，點擊後短暫顯示「已複製」
  - 文字用「複製生成提示」，不用設計稿的「生成 N 個標記」—— 後者暗示按了就會生成。待生成的數量在 Drawer 的 AI pill 與標記列表已經看得到
  - Prototype 裡這顆按鈕只是 `onOpen(slug)`，與旁邊的「開啟筆記」做同一件事；不照抄
  - 與筆記頁首「⋯」選單的「重新生成提示」（Q12）**共用同一個函式** `buildRegeneratePrompt()`，放在 `src/lib/prompts.ts`；`RegenerateButton.tsx` 的範本字串搬過去
  - **順手修掉既有問題**：現行範本把路徑寫死成 `src/content/notes/${slug}.mdx`，對子資料夾、`.md` 副檔名、viewer 使用者的資料夾都是錯的。改用 `promptPath` = notesDir 相對專案根的路徑 + `/` + `WbNoteRow.path`（notesDir 不在專案根底下時只用 `path`）。這是 Claude Code 從專案根執行時能直接找到檔案的路徑。注意它與 §5.2.2 的 `workspaceLabel` 不同 —— 後者在 viewer 會前綴專案資料夾名，是給人看的
  - `GenerateDeckButton` 的 `notePath` 目前傳的是 `note.filePath`，同樣改用 `promptPath`
- **Drawer 的 Metadata 表**：路徑／資料夾／系列／建立／更新／標籤，沒有「字數」列（Q9）
- 手機只有 List；`?view=board` 在手機上被忽略

#### 8.2.1 列的點擊語意與「開啟」圖示（Q27 已定案）

設計稿規定「單擊開 Drawer、雙擊開筆記」，但列不是連結，少了開新分頁、複製連結網址、鍵盤開啟這些網頁原生行為。定案：**整列維持按鈕語意並補齊鍵盤與組合鍵，另加一顆常駐的「開啟」圖示，它是真正的連結。**

| 操作 | 結果 |
| :-- | :-- |
| 單擊列 | 切換 Drawer（再點同一列關閉），照設計稿 |
| 雙擊列 | 開啟筆記，照設計稿 |
| `⌘`／`Ctrl` + 單擊列、滑鼠中鍵 | 新分頁開啟筆記，不開 Drawer |
| `Enter`（焦點在列上） | 開啟筆記 |
| `Space` | 切換 Drawer |
| `↑` `↓` | 在列之間移動焦點（跨群組連續；收合的群組跳過） |
| 點「開啟」圖示 | 開啟筆記。它是 `<a href="/notes/<slug>">`，所以右鍵複製連結、`⌘` 點擊、移入顯示網址全部原生可用 |
| 手機單點列 | 開滿版 Drawer（照 README）；點圖示則直接進筆記，少一步 |

**「開啟」圖示**：

- **常駐**，不是滑鼠移入才顯示。觸控裝置沒有移入；常駐也讓版面不跳動、讓不知道要雙擊的人有看得見的入口
- 24×24 點擊區、圓角 6、lucide `arrow-right` 14px。平常 `--wb-ink-3` 且 `opacity:.55`，掃視時不搶眼；移到圖示上變 `--wb-blue-l`、底 `rgba(27,79,156,.06)`；鍵盤聚焦時顯示 focus ring
- 不用「外部連結」圖示，那暗示會開新分頁；這裡預設同分頁開啟
- `aria-label="開啟筆記：<標題>"`
- **凡是單擊會開 Drawer 的地方都放**，共五種：

| 位置 | 圖示放哪 |
| :-- | :-- |
| List 的列 | 列尾，日期欄之後；固定佔 24px，所有列對齊 |
| Table 的列 | 新增最末一欄（無表頭文字、寬 32px） |
| Timeline 的列 | 列尾，AI pill 之後 |
| Board 卡片 | 底部那一行的最右邊，日期之後。拖曳卡片時圖示不作為拖曳把手 |
| Dashboard「最近更新」「待生成標記」的 dense 列 | 列尾 |

- **不放**的地方：Palette 的列（單擊本來就直接開啟）、`/plugins` 資料檔列（單擊直接進渲染頁、沒有 Drawer）、系列與標籤的列（單擊即導覽）

**DOM 結構**：連結不可以包在按鈕裡（互動元素巢狀，HTML 不合法、輔助科技也會混亂）。列做成容器，裡面是並排的兩個互動元素：

```html
<div class="wb-row">
  <button class="wb-row-main">…icon、標題、路徑、標籤、pill、日期…</button>
  <a class="wb-row-open" href="/notes/…" aria-label="開啟筆記：…">→</a>
</div>
```

`.wb-row-main` 撐滿剩餘寬度並承接單擊、雙擊、鍵盤；hover 與選取的底色畫在外層 `.wb-row` 上，視覺與設計稿的單一列無異。Table 同理：`<tr>` 掛點擊處理，標題格內的按鈕承接鍵盤焦點，連結在末欄。

### 8.3 筆記內文 `/notes/[...slug]`（Q12 已定案）

README §5.3 說「隱藏 NoteView 自帶 header」，但 prototype 的 CSS 實際只對 `.wb-viewhost`（資料檔頁）做了 `header{display:none}`；筆記頁的標籤編輯、h1、描述、meta 列、動作列在 prototype 裡全部都還在，標題因此出現兩次。Codebase 的筆記頁也沒有 `<header>` 元素，這些東西直接寫在 `.astro` 裡。定案：**頁首接手「標題 + 動作」，其餘留在內文**。

```
┌─ 頁首 ──────────────────────────────────────────────┐
│ NoteCraft / 筆記 / 根目錄                             │
│ ← 專案 vs 產品  (已生成 2)                            │
│                             [▶ 簡報] [☆] [⋯]          │
├─ 內文 ──────────────────────────────────────────────┤
│ (專案管理) (PM) +                 ← 標籤編輯          │
│ 描述文字……                                           │
│ ◷ 更新於 2026/09/18   [未開始|閱讀中|已完成]           │
│ ──────────────────────────────────────────────────  │
│ 內文……                                     目錄      │
└─────────────────────────────────────────────────────┘
```

| 現有區塊 | 去向 |
| :-- | :-- |
| 「返回筆記列表」連結 | **移除**，頁首返回鍵接手 |
| 內文大標題 `h1.nc-note-title` | **移除**。頁首的 `h1` 成為該頁唯一的 h1 |
| 標籤編輯 `TagEditor` | 留在內文最上方 |
| 描述 | 留 |
| 資訊列：更新日、`ReadingControl` | 留 |
| 資訊列：「N/M 視覺化已生成」 | **移除**，與頁首的 AI pill 重複 |
| 動作列（整列） | **移除**，全部上移到頁首 |
| 待生成標記卡片、內文、`DonePrompt`、頁尾（建立日＋檔案路徑）、`SeriesNav`、`Toc` | 不動 |

頁首右側的動作，由左到右（設計稿的「版型庫」按鈕**不放**，見本節末的說明；Q16 已定案）：

| 動作 | 樣式 | 顯示條件 |
| :-- | :-- | :-- |
| 簡報 | 三段式，見下 | Q17 已定案 |
| 收藏 ☆ | 24px 方形 icon 鈕 | 一律（Q11） |
| ⋯ 更多 | 24px 方形 icon 鈕 | **僅 dev**。選單內三項全是 dev-only，正式環境整顆不渲染 |

**「版型庫」不放**（Q16 已定案：完全不放，任何地方都不加入口）：

- 設計稿的 `DeckLibrary` 是**簡報系統的規格展示頁**（版型一覽 + 功能列各狀態的規格），給做簡報系統的人看，不是讀者功能；prototype 裡它的另一個入口是 Tweaks 除錯面板
- Codebase **沒有**這個頁面。最接近的是 `/present/atoms` —— 手寫維護的原子層驗證基準 deck，用於逐頁截圖迴歸；它不在 `package.json` 的 `files` 內、不隨 npm 發佈，viewer 使用者那邊不存在
- 它與「當前這篇筆記」無關，放在每篇筆記的頁首不合理。要看就直接輸入網址 `/present/atoms`，與現況相同
- 若日後要做真正的版型庫頁，屬於簡報那條線的新功能，另開任務

**簡報按鈕的三段式**（Q17 已定案，沿用現行語意；筆記頁首與 Drawer 同一套規則）：

| 情況 | 顯示 | 行為 |
| :-- | :-- | :-- |
| `hasDeck` 為真 | solid「▶ 簡報」 | 連到 `/present/<slug>`（slug 需 `normalize("NFC")`，同現行） |
| 沒有 deck，dev | ghost「生成簡報」 | 同現有 `GenerateDeckButton`：複製提示詞到剪貼簿 + Toast；點擊後短暫顯示「已複製提示詞」 |
| 沒有 deck，正式環境 | **不顯示** | 訪客無從讓它變成可按，不放停用按鈕 |

- 文字用「**簡報**」，不用設計稿的「轉簡報」：點下去是觀看既有簡報、不是當場轉換，也避免與 dev 的「生成簡報」語意混淆
- Prototype 任何筆記按下去都會開簡報，是因為 `deckSlug()` 在找不到時退回示範簡報；正式版沒有這條退路
- `hasDeck` 已在工作台索引的 `WbNoteRow` 裡（§5.1），Drawer 不必另外查
- `GenerateDeckButton.tsx` 保留邏輯、外觀改為 `.wb-btn-ghost`

**「⋯」選單**（新 island `MoreMenu.tsx`）：

- 「以 VS Code 編輯」—— `vscode://file/…` 連結
- 「重新生成提示」—— 僅在有待生成標記時出現；行為同現有 `RegenerateButton`（複製對話範本 + Toast）
- 「刪除筆記」—— danger 樣式、與上兩項以分隔線隔開；點擊後沿用 `DeleteNoteButton` 既有的確認對話框與孤兒元件提示，不簡化
- `role="menu"`、方向鍵移動、`Escape` 或點外面關閉；關閉後 focus 回到觸發鈕
- `DeleteNoteButton`、`RegenerateButton` 的邏輯抽成 hook 或純函式供選單呼叫，原本的按鈕外觀不再使用

其他確定的部分：

- 麵包屑第三段 = 筆記所在資料夾，連到 `/notes?folder=…`；根目錄的筆記顯示「根目錄」、連到 `/notes`
- pill 只有 AI 狀態。設計稿的「N 字」pill 不做（Q9 已定案：字數功能整個拿掉）
- 內文容器 `.wb-host{padding:26px 32px 60px}`；`Toc` 的 sticky 以 `#nc-scroll` 為基準，保留 id 即可
- `data-pagefind-body` 仍只標在 `.nc-prose`，新殼的 Sidebar 文字不會進索引
- **pagefind 的標題來源**：內文 h1 移除後，頁首 h1 位在 `data-pagefind-body` 之外。在頁首 h1 加 `data-pagefind-meta="title"` 明確指定，P9 以實際搜尋結果驗證標題沒有變成網址或空白
- **長標題**：README 規定頁首標題單行省略，但筆記頁少了內文大標題之後，被截斷的標題就沒有別處看得到全文。**僅筆記頁**放寬為最多兩行（`-webkit-line-clamp:2`），其餘頁面維持單行；`title` 屬性帶完整標題

### 8.4 系列

- 「單鍵推進」mini button：未開始 → 閱讀中 → 已完成 → 重設，直接呼叫 `setReadingStatus()`
- 資料檔章節（`view:` 前綴）與筆記一視同仁，延續 plugin 設計文件 §7.6 的定案
- 「在筆記列表中篩選」→ `/notes?series=<id>`。`/notes` 只列筆記（Q14 已定案），資料檔章節不會出現在篩選結果裡；筆數差異的提示方式見 §8.2。**本頁的章節列表則完整混合顯示筆記與資料檔**，這是作者明確要求保留的

### 8.5 標籤

- inline 改名、刪除的觸發點換成列上的 mini button；**確認流程沿用既有 `ConfirmDialog`**（影響範圍、合併、二次確認），不用 prototype 的原生 `confirm`
- 寫入走既有 `PUT /api/tags/:old`、`DELETE /api/tags/:tag`，不新增 API
- 點列 → `/notes?tag=<名稱>`

### 8.6 Plugin `/plugins`

資料來源全是 build 期已知的：`getPlugins()`（manifest）、`.notecraft/plugins.json`（映射與 options）、`getDataFiles()`（命中的檔）、`.installed.json`（來源與 commit）、plugin 資料夾的檔案清單。

| Prototype 欄位 | 正式版來源 |
| :-- | :-- |
| 標題／版本／作者／描述／homepage／engines／dataSchema／example | `notecraft-plugin.json` |
| 來源（本機／npm／git） | `.installed.json`；主 repo 的官方 store 沒有這個檔 → 顯示「內建」 |
| 映射規則 glob、設定覆寫 JSON | `plugins.json` 裡所有指向該 plugin 的 mapping（可能不只一條） |
| 命中的資料檔 | `getDataFiles()` 依 `pluginId` 過濾。不在 client 重算 glob |
| 外掛檔案列表 | build 期 `fs.readdirSync` |
| 「不相容」pill、stat strip 的「不相容 N」、Drawer 的黃色警告框 | **不做**（Q24 已定案）。`engines` 維持只在 `install-plugin` 安裝時檢查，build 期不重比；`checkSemverRange()` 留在 `bin/install-plugin.mjs` 不搬動。Drawer 的 Manifest 表仍列出「引擎需求」原字串，供人工判斷 |
| 「渲染錯誤」pill | **首版不做**（Q23 已定案）。renderer 的錯誤只會在瀏覽器執行時發生，build 期產生的列表頁無從得知；build 期查得到的問題（未安裝、JSON 壞、schema 不符）依現行規則直接 build fail，根本不會有頁面。錯誤由出錯那一頁既有的 `PluginErrorCard` 呈現。列表與 Plugin Drawer 都不顯示此狀態；README §5.7 的 danger pill 與 prototype 的 `vizError` Tweak 不實作 |
| 啟用／停用 Switch | `plugins.json` 頂層的 `disabled` 陣列（Q22 已定案，§8.6.1） |
| `notecraftapp` 版本 | `package.json` 的 `version` |

「已安裝外掛」Tab 的 **stat strip 為四格**：已安裝／啟用中（綠）／映射資料檔／`notecraftapp` 版本。設計稿的第四格「不相容（黃）」依 Q24 取消。

列上的狀態因此只剩一種：啟用／停用（Q22）。設計稿另外兩種狀態 pill ——「渲染錯誤」（Q23）與「不相容」（Q24）—— 都不做。

#### 8.6.1 啟用／停用（Q22 已定案）

`plugins.json` 是「映射規則的陣列」，同一個 plugin 可以出現在多條規則裡，沒有現成的位置存「每個 plugin 一個開關」。定案：**頂層加 `disabled` 陣列**，規則本身原封不動。

```jsonc
{
  "$schema": "…/plugins.schema.json",
  "disabled": ["timeline-renderer"],          // 新增；省略或空陣列 = 全部啟用
  "plugins": [
    { "plugin": "er-diagram-renderer", "files": ["planning/schema.json"] },
    { "plugin": "er-diagram-renderer", "files": ["specs/**/*.er.json"] },
    { "plugin": "timeline-renderer",   "files": ["planning/roadmap.json"] }   // 規則不動
  ]
}
```

**build 期語意**（`src/lib/plugins.ts`）：

| 情況 | 行為 |
| :-- | :-- |
| plugin 在 `disabled` 裡 | 它的**所有**映射規則在比對前就略過，等同不存在；命中的資料檔不產頁、不進 Sidebar、不進 `/plugins` 的資料檔 Tab、不進 Palette |
| 一檔同時被「已停用」與「啟用中」的規則命中 | 啟用中的那條勝。停用的規則既然視為不存在，就不參與「第一條勝」的排序，也不印多重命中的 warn |
| 已停用的 plugin 根本沒安裝 | **不 build fail**。規則在「是否已安裝」的檢查之前就被略過。這順便給了一條退路：某個 plugin 壞掉時先停用，站還是 build 得出來 |
| `disabled` 裡的 id 既沒安裝、也沒被任何規則引用 | warn（多半是打錯字） |
| `disabled` 不是字串陣列 | build fail，與其他 `plugins.json` 格式錯誤一致 |
| 系列章節 `view:<路徑>` 指向已停用 plugin 的資料檔 | **warn、跳過該章節，不 build fail**。訊息要與既有三種情況區分：「資料檔存在，但負責渲染它的 plugin `<id>` 已停用」。該章節不計入系列進度分母（它沒有頁面可讀） |

**「已安裝外掛」列表要看得到停用中的 plugin**，因此解析器要多回傳一份資料：

- `getPlugins()` 不受 `disabled` 影響，照舊回傳所有已安裝的 plugin
- 新增 `getInactiveMatches(): { pluginId, relPath }[]` —— 已停用 plugin 的規則「若啟用會命中」的檔案。只供列表的「N 檔」與 Plugin Drawer 的「命中的資料檔」顯示（灰字、不可點），不產頁
- 停用的 plugin 其 `renderer.tsx` 仍會被 `PluginHost` 的 eager glob 打包進 client chunk。停用不是解除安裝；要讓它離開 bundle 得用 `install-plugin --remove`

**dev-only API**：`PUT /api/plugins/:id`，body `{ "enabled": boolean }`

- 放在 `src/dev-api/handlers.mjs`，僅綁 `localhost`，與既有 endpoint 同規格；CLI 的 `view` 模式自動共用
- 驗證：id 符合 manifest 的 id 樣式；必須是已安裝或被某條規則引用的 plugin，否則 404
- 寫檔：只增刪 `disabled` 陣列的元素，其餘內容不動；鍵順序固定為 `$schema` → `disabled` → `plugins`；`disabled` 變空時整個鍵移除；2 空格縮排、檔尾換行
- `plugins.json` 不存在時回 409，不代為建立（建立映射是作者的事，同 plugin 設計文件 Q14 的立場）

**UI**：

- dev：Switch 可切換，樂觀更新 + Toast；API 失敗時還原並提示
- **正式環境：不渲染 Switch，只留「啟用／停用」pill**。一顆永遠不能按的開關對訪客沒有意義（同 Q17 不放停用按鈕的理由）
- 停用列 `opacity:.62`、灰底，照 README §5.7

**相容性與配套**：

- `plugins/plugins.schema.json` 加上 `disabled`（字串陣列、`uniqueItems`、同 `plugin` 欄位的 id pattern）。這份 schema 只供編輯器補全 —— build 期的檢查是 `readConfig()` 手寫的，**舊版 app 讀到 `disabled` 不會失敗，只會忽略它**（停用不生效）
- `install-plugin --remove <id>`：連帶檢查 `disabled` 裡是否殘留該 id，有就警告、不自動清（沿用「只警告不自動清」的既有做法）
- `npm run check-plugins` 不受影響
- **風險**：`plugins.ts` 以模組層變數快取解析結果，`astro dev` 下改 `plugins.json` 會不會即時反映尚未實測（plugin 設計文件 Q19 的遺留項）。P10 先實測；不反映就讓 API 成功後由 client 觸發整頁重載，並在 dev integration 裡清掉該快取

### 8.7 資料檔渲染頁 `/view/<路徑>`

沿用 `PluginHost`，Body 用 `.wb-body.flush`。現有 `src/pages/view/[...path].astro` 自己畫的 `<header class="nc-dv-head">`（返回連結、icon、標題、DATA FILE 標記、描述、動作按鈕）整塊移除，內容分配到新殼：

| 現有頁內元素 | 去向 |
| :-- | :-- |
| 「← 資料檔」返回連結 | 頁首返回鍵，連到 `/plugins` |
| 標題 | 頁首 `h1` |
| 描述 `meta.description` | **Toolbar 左側的說明文字**（README §3.5 的 `.wb-tb-lbl`）。新頁首沒有描述的位置，而這頁的 Toolbar 本來是空的 |
| 「DATA FILE」標記、database icon | 移除；頁首 pill 顯示 plugin id 已足以辨識 |
| 「<系列名> 第 N 章」按鈕 | 頁首 pill「<系列名> #N」，系列色、可點、連到 `/series/<id>`（與 Drawer 的系列 pill 同一個樣式） |
| 「回到來源筆記」 | 頁首動作 ghost（見下） |
| 「以 VS Code 編輯」（dev） | 頁首動作 ghost |
| 頁尾的 `ReadingControl`、`DonePrompt`、`SeriesNav`（僅系列章節才有） | **不動** |

頁首 pill：plugin id（預設樣式）+「N 天前更新」muted（瀏覽器端計算，Q10）+ 系列 pill（若屬於某系列）。

**「回到來源筆記」與 `meta.backTo`**（Q21 已定案）：

- 現況：app **已經**在讀資料檔的 `meta.backTo` 並顯示這顆按鈕（`view/[...path].astro:30`），但 plugin 設計文件 §8.2 寫的是「其餘欄位（含 `meta.backTo`）由 plugin 自行解讀，app 不碰」—— 實作當時已超出文件的約定
- 定案：**`meta.backTo` 正式升格為 app 層約定的第三個 meta 欄位**，與 `meta.title`、`meta.description` 並列；任何 plugin 的資料檔都能用，plugin 的 schema 不需要特別宣告它
- **新增限制：只接受站內路徑**。值必須以單一 `/` 開頭（`/^\/(?!\/)/`），排除 `//host`、`http(s):`、`javascript:` 等。不符者**忽略該值、不顯示按鈕，並在 build 期印 warn**（指出檔案與值）。不 build fail —— 它不影響頁面能否渲染
  - 理由：現有程式把值原封不動放進 `href`，`javascript:` 開頭的字串點下去會執行。資料檔是作者自己寫的、風險低，但檢查只要一行
  - 按鈕文字寫的是「回到來源**筆記**」，連到站外本來就文不對題
- 檢查放在 `src/lib/plugins.ts` 解析資料檔時做，`ResolvedDataFile` 多一個已驗證的 `backTo?: string` 欄位，頁面不再自己去挖 `file.data.meta`
- P13：plugin 設計文件 §8.2 補一筆修訂

**pagefind**：這裡要更正本文先前版本的一個錯誤 —— plugin 設計文件 §15 把「`/view` 頁只索引標題與描述」列為未做，但**程式其實已經做了**：`data-pagefind-body` 標在現有的 `<header class="nc-dv-head">` 上（`view/[...path].astro:62`），渲染出來的上千個欄位名本來就不進索引。真正要注意的是相反的風險：

- 這個 `<header>` 整塊移除後，`data-pagefind-body` 會跟著消失。pagefind 目前處於「只索引有標記的區塊」模式（因為筆記頁用了它），**沒有標記的頁面整頁不進索引** —— 資料檔頁會從全文搜尋裡消失
- 做法：`WorkbenchLayout` 加一個 `indexHeader` prop，為真時在頁首標題元素與 Toolbar 說明文字上各標 `data-pagefind-body`（pagefind 允許同頁多個）。只有 `/view/*` 傳這個 prop
- P13：plugin 設計文件 §15「仍未做的」清單把這一項劃掉

### 8.8 設定與關於 `/settings`

- **設定只有兩項**（Q29 已定案，照 README）：

  | 項目 | 選項 | 預設 | 作用 |
  | :-- | :-- | :-- | :-- |
  | 預設 view | List／Board／Table／Timeline | List | 進 `/notes` 且網址沒帶 `?view=` 時用哪一種（Q3）；手機一律 List |
  | List 預設分組 | 資料夾／系列／標籤／月份 | 資料夾 | List 一開始的分組方式。在 Toolbar 切換分組時也會回寫這個值（prototype 如此） |

- 寫入 `localStorage["nc-workbench-prefs-v1"]`，形狀 `{ defaultView, groupBy }`；讀不到或值無效時用預設值。正式環境同樣可用
- Prototype Tweaks 面板的另外兩項**不做**：「列高」在 prototype 裡其實沒接上（JS 寫了 `--pt-row-h`，但 `pt.css` 沒有任何規則讀它），等於設計稿沒有這個功能；「筆記字級」現況沒有、可用瀏覽器內建縮放達成。日後要加，列結構（`.wb-set`）與儲存格式都能直接擴充
- 「關於」的工作區路徑顯示 `workspaceLabel`，不出現本機絕對路徑（Q25 已定案，§5.2.2）
- 流程列與技術選型文案照抄 `PT_FLOW`／`PT_STACK`

### 8.9 Palette ⌘K（Q13 已定案）

新設計有**兩個**搜尋入口，職責不同：

| 入口 | 位置 | 範圍 | 比對方式 |
| :-- | :-- | :-- | :-- |
| Toolbar 搜尋框 | 各列表頁工具列右側 | 只過濾**當頁列表** | 標題／路徑／標籤的字串比對，同步、dev 與正式環境結果一致 |
| Palette | 每一頁，`⌘K`／`Ctrl+K` 或 Rail 搜尋鈕 | **全站跳轉** | 筆記／系列／標籤用字串比對，**另加一組 pagefind 全文結果** |

Palette 的結果分組（前三組照 README §5.11）：

| 組 | 上限 | 來源 | 列的內容 |
| :-- | --: | :-- | :-- |
| 筆記 | 7 | `/wb-index.json` | doc icon + 標題 + 路徑 + AI pill |
| 系列 | 3 | 同上 | swatch + 名稱 + 「系列 ・ N 章」+ `NN%` pill |
| 標籤 | 4（僅有輸入時） | 同上 | tag icon + 名稱 + 「N 篇」pill |
| 資料檔 | 3（僅有輸入時） | 同上 | 金色 doc icon + 標題 + 路徑 + plugin id chip；開啟 `/view/<路徑>`。README 的 Palette 沒有這一組，因資料檔已移出筆記列表（Q14）而補上，避免它們只能靠導覽找到 |
| **內文** | **5（僅有輸入時）** | **pagefind** | doc icon + 標題 + 一行摘要（命中詞以粗體標示） |

「內文」組的規則：

- 取代現有的 `PagefindSearch.tsx`（列表頁上方那個獨立搜尋框），該 island 刪除。全文搜尋從「只有列表頁能用」變成「每一頁都能用」
- pagefind 在**第一次打開 Palette 時**才動態載入（沿用現行 `import(/* @vite-ignore */ "/pagefind/pagefind.js")` 的寫法），不拖慢任何頁面的首屏
- 索引只存在於正式 build。**dev 環境載入失敗時整組不顯示、不報錯**，與現況行為相同
- 已出現在「筆記」組的筆記，不在「內文」組重複列出（以 URL 對回 slug 去重）
- 輸入 debounce 150ms；較晚回來的舊查詢結果要丟棄
- 摘要用 pagefind 回傳的 `excerpt`，其中的 `<mark>` 轉成粗體；**不用 `dangerouslySetInnerHTML`**，以字串切段後用 React 節點組回
- 資料檔頁（`/view/*`）現況已經只索引標題與描述（`data-pagefind-body` 標在頁內的 `<header>` 上），上千個欄位名不會出現在「內文」組。換殼時這個標記要搬到新頁首，否則資料檔頁會整頁掉出索引，見 §8.7

鍵盤：

- `⌘K`／`Ctrl+K` 與 Rail 搜尋鈕都能開
- 上下鍵在所有組之間連續移動選取，`Enter` 開啟選取項；未移動時 `Enter` 開第一筆（照 README）。Prototype 沒做上下鍵，正式版補上
- `Escape` 或點 scrim 關閉

---

## 9. 響應式

斷點照 README §6：>1100／861–1100／≤860，另有 Dashboard 的 1180 與 800、窄手機 560。

| 注意事項 | 說明 |
| :-- | :-- |
| 現行斷點是 1024 | `BaseLayout`、筆記頁的 TOC 都用 1024。筆記頁的 TOC 斷點不跟著改：主區寬度 = 視窗 − 292，TOC 要在主區夠寬時才出現，需實測後另訂 |
| 手機底部 Tab bar | `.wb-app` 改縱向、Rail `position:sticky;bottom:0`。Body 要留出 54px，否則最後一列被遮 |
| 手機 Drawer 滿版 | 與 `VizZoom`、`CanvasViewport` 的全螢幕層不衝突（z-index 見 §4.5） |
| 觸控 | Board 在觸控裝置上不可拖、為純總覽；不做觸控拖曳（Q26 已定案，§8.2） |

---

## 10. 無障礙與鍵盤

Prototype 在這塊著墨很少，正式版的底線：

- 列的鍵盤與組合鍵行為、常駐的「開啟」連結：Q27 已定案，完整規格見 §8.2.1
- Drawer 與 Palette 開啟時 focus 移入、關閉時還原；`aria-modal`、`Escape` 關閉
- Board 拖曳**沒有**在 Board 上的等價操作（Q26 已定案的取捨）；等價路徑在筆記頁與系列詳情頁，見 §8.2
- Switch 用 `role="switch"` + `aria-checked`
- `prefers-reduced-motion` 關閉所有過場（README §8）；island 內用 `useReducedMotion()`

---

## 11. dev／正式環境差異

判定方式沿用現況：`import.meta.env.DEV`。CLAUDE.md 提到的 `LOCAL_EDIT=1` build 旗標**目前程式碼裡並不存在**（全 repo 搜不到），本次不順手補；新元件一律透過同一個 `isDev` 判斷，日後要加旗標只需改一處。

| 功能 | 正式環境 |
| :-- | :-- |
| 「＋ 新增筆記」（gold 按鈕，每頁頁首） | 隱藏 |
| 標籤列的「重新命名」「刪除」mini button | 隱藏 |
| 「以 VS Code 編輯」（筆記頁、資料檔頁） | 隱藏 |
| Drawer 的「複製生成提示」、筆記頁「⋯」選單的重新生成提示 | 隱藏（Q18 已定案） |
| Plugin Switch | **不渲染**，只留「啟用／停用」pill（Q22 已定案） |
| 閱讀進度、收藏、Board 拖曳、設定 | **可用**（純 localStorage） |

新增的 dev-only API（Q22 已定案）：

- `PUT /api/plugins/:id` body `{ enabled: boolean }` —— 增刪 `.notecraft/plugins.json` 頂層 `disabled` 陣列的元素。規格見 §8.6.1

---

## 12. npx viewer 相容性

`notecraftapp` 同時是發佈到 npm 的 viewer，工作台改版會直接影響所有使用者。

| 項目 | 處理 |
| :-- | :-- |
| `package.json` 的 `files` | 新檔案要落在既有 glob 內：`src/components/islands/`、`src/components/*.astro`、`src/layouts/`、`src/lib/`、`src/pages/`、`src/styles/`。**若新增 `src/components/wb/` 子目錄，`files` 必須加一條**，否則發佈後缺檔 |
| 任意資料夾結構 | 資料夾樹不可假設深度與命名；資料夾不分色（Q6），不存在依名稱配色的問題 |
| 沒有 frontmatter 的 md | viewer 的常態。「無 frontmatter」chip 在這裡才真的有用；判定規則見 §5.2.1 |
| 筆記量 | 上千篇時 List 不做虛擬捲動會卡。首版先不做，但 row 要保持輕量（不在每列掛 island） |
| 工作區名稱與路徑 | 一律相對路徑；viewer 顯示「專案資料夾名／相對 notesDir」（Q25 已定案，§5.2.2） |
| `serve` 模式 | 是 build 產物（`import.meta.env.DEV` 為 false），dev-only UI 一律隱藏，行為與現況相同 |
| 版號 | 暫定 **v0.7.0**（外殼全換屬 minor 以上） |

---

## 13. 實作階段

| Phase | 目標 | 前置 | 交付 |
| :-- | :-- | :-- | :-- |
| **P1** | 樣式地基：`workbench.css` 移植、`--wb-*` token 對映、`Icon.astro` 補圖示、Logo | Q28 | 靜態樣式頁可對照 prototype |
| **P2** | 工作台索引：`src/lib/workbench.ts`、資料夾樹、`/wb-index.json` | Q2 Q4 Q5 Q6 Q8 | 型別 + 單一資料來源 |
| **P3** | 殼：`WorkbenchLayout`、Rail、Sidebar（含 `SidebarLive`）、Header、pre-paint script；**所有既有頁面先原樣搬進新殼** | P1 P2、Q1 Q30 | 全站換殼、功能不退化 |
| **P4** | `/notes`：List + Toolbar + 篩選 query + Drawer | P3、Q3 Q11 Q14 Q27 | |
| **P5** | `/notes`：Board、Table、Timeline | P4、Q7 Q26 | |
| **P6** | Palette ⌘K | P2、Q13 | |
| **P7** | Dashboard widget grid + 三 Tab | P3、Q10 Q15 | |
| **P8** | 系列、系列詳情、標籤改版 | P3 | |
| **P9** | 筆記內文頁首與動作整併 | P3、Q12 Q16 Q17 Q18 | |
| **P10** | `/plugins`、`/plugins/folder/*`、Plugin Drawer、`/view` 頁首、Switch 與 dev API | P3、Q19 Q21–Q24 | |
| **P11** | `/settings`（設定／關於）、`/about` 與 `/view` 轉址 | P3、Q20 Q25 Q29 | |
| **P12** | 響應式三段 + 無障礙收尾 | P4–P11 | |
| **P13** | 清理：刪舊元件、更新 CLAUDE.md／PRD／README、plugin 設計文件補三筆修訂（Q6「`/notes` 列表：進」→ 移出，見 Q14；§8.2 `meta.backTo` 升格為 app 層約定，見 Q21；§15 pagefind 一項實際已完成，見 §8.7）、`package.json` `files`、viewer 端對端實測、pre-push build | 全部 | v0.7.0 |

**交付節奏（Q30 已定案）**：全程在 `feat/workbench-redesign` 單一分支上進行，依上表分 Phase 逐步 commit，**P13 完成後才併回 main**，期間正式站不受影響。每個 commit 都必須能通過 `astro build`（pre-push hook 本來就會擋）。Task 文件接續既有編號，自 **Task 59** 起，原則上一個 Phase 對應一份 `docs/tasks/task-NN-*.md`。不做新舊 layout 並存、不以旗標切換。

P3 刻意安排成「先換殼、內容原樣」：這是唯一一個必須全站同時切換的步驟，把它與各頁改版拆開，出問題時才分得清是殼的問題還是頁面的問題。

---

## 14. 風險

| 風險 | 說明 | 對策 |
| :-- | :-- | :-- |
| **捲動容器改變** | 從 `#nc-scroll`（整個右半邊）變成 `.wb-body`。`Toc` 的 scroll spy、筆記頁 inline script、`client:visible` 的觸發、`VizZoom` 的定位都可能受影響 | 保留 `id="nc-scroll"`；P3 完成後逐項回歸 |
| **`client:visible` 在隱藏的 Browser pane 不 hydrate** | 已知的環境特性（見專案記憶），驗證新殼時容易誤判成功能壞掉 | 驗畫面前先確認 pane 可見 |
| **query 篩選的首屏閃動** | 靜態 HTML 畫的是「全部筆記」，hydrate 後才套 `?folder=` | pre-paint script 先把 `data-wb-filter` 寫到 `<html>`，未 hydrate 前以 CSS 隱藏列表骨架 |
| **Sidebar 每頁重繪** | MPA 換頁時 Sidebar 會重新繪製，展開狀態靠 pre-paint 還原；仍可能有一瞬間的視覺跳動 | 先接受；若體感差再評估 Q1 的 View Transitions |
| **全站同時切換** | `BaseLayout` 被所有頁面共用，沒有漸進上線的路 | 全程在 feature branch 上做，P3 先原樣搬家 |
| **發佈缺檔** | 新目錄沒進 `package.json` `files` | P13 檢查項；`npm pack --dry-run` 驗證 |
| **大量筆記的效能** | 四種 view 都在 client 過濾與分組 | row 保持純 DOM；超過門檻再談虛擬捲動 |

---

## 15. 待釐清問題

**30 題已於 2026-09-21 全數定案**，每題標題後標有結果，彙整見 §16。以下保留當時的選項與理由，供日後追溯「為什麼這樣決定」；各題的完整規格已寫進前面對應的章節，實作時以那些章節為準，不是這裡的選項文字。

每題第一個選項是當時的**建議**。標 🔴 者卡 P1–P3；🟡 卡對應 Phase；⚪ 可邊做邊定。結果與當時建議不同的有 5 題：Q6（不分色）、Q9（字數整個拿掉）、Q15b（簡報數拿掉）、Q16（版型庫完全不放）、Q24（不相容不做）。另有 5 題是作者先提出想法、經討論後重新設題才定案：Q11、Q14、Q15a、Q26、Q27；其中 Q15a、Q26、Q27 的最終做法來自作者的提議。

### A. 架構

**Q1 🔴 導覽模型** —— ✅ 已定案：A（2026-09-21）
- **A（建議）維持 Astro MPA**，Sidebar 狀態用 localStorage + pre-paint script 還原。理由見 §4.1；不動現有 island 與 inline script 的生命週期假設
- B 加 Astro `<ClientRouter />`（View Transitions），讓 Rail／Sidebar `transition:persist`。換頁不重繪殼、體感最接近 prototype；代價是筆記頁那些靠 `DOMContentLoaded` 的 inline script 全部要改成 `astro:page-load`，`VizZoom`、deck 都要回歸
- C 整站改單一 React SPA。放棄 MDX 管線與 pagefind，不建議

**Q2 🔴 工作台索引怎麼送到瀏覽器** —— ✅ 已定案：A（2026-09-21）
- **A（建議）混合式**：各頁 inline 自己要的切片，Palette／Dashboard Drawer 延遲 fetch `/wb-index.json`（§5.3）
- B 全部 inline 進每一頁。最單純，但 Palette 讓每頁 HTML 都背一份全站清單
- C 全部 fetch。HTML 最小，但 `/notes` 首屏沒有內容、會閃

**Q3 🟡 view Tab 要不要進 URL** —— ✅ 已定案：A（2026-09-21）
- **A（建議）要**，`/notes?view=board`；沒帶參數時用設定頁的預設值。可分享、可回上一頁、重整不跳回 List
- B 不進 URL，只存 localStorage（README 的寫法只列了篩選參數）

**Q4 🔴 子資料夾的 query 形狀** —— ✅ 已定案：A（2026-09-21）
- **A（建議）單一參數 `?folder=a/b/c`**，以路徑前綴比對、不限深度。真實專案的資料夾深度不可預期
- B 照 README `?folder=…&sub=…`。只支援兩層，第三層起無法表達

### B. 資料模型

**Q5 🔴 資料夾的來源**（現有 59 篇筆記幾乎全在根目錄） —— ✅ 已定案：A（2026-09-21）
- **A（建議）只認檔案路徑**。與 viewer 使用者的真實資料夾一致、單一真相；主專案現況就是「根目錄」一組，日後要分類就搬檔案。搬檔會改 slug，連帶影響 `series.json`、閱讀進度 key、收藏、`<slug>.deck.tsx`、對外網址，需另寫一支搬遷腳本（不在本次範圍）
- B 用既有但閒置的 `category` frontmatter 當虛擬資料夾。不動 slug，但 viewer 使用者的真實資料夾反而被忽略，且只有一層
- C 路徑優先、位於根目錄者退回 `category`。兩套規則並存，Sidebar 上看不出某個「資料夾」是真是假

**Q6 🔴 資料夾顏色**（prototype 寫死五個資料夾名） —— ✅ 已定案：不分色（作者於 A／B／C 之外另選，2026-09-21）
- **A（建議）依頂層資料夾的排序位置，從固定色盤循環指派**；子資料夾繼承父色。零設定、結果穩定
- B 同 A，另允許在 `.notecraft/workbench.json` 覆寫個別資料夾顏色
- C 依名稱 hash 取色。新增資料夾不會讓其他資料夾變色，但顏色分布不可控

**Q7 🟡 Board 的「未發佈」欄**（與 PRD 2026-06-16 定案衝突） —— ✅ 已定案：A（2026-09-21）
- **A（建議）維持 PRD 定案，Board 只有三欄**（未開始／閱讀中／已完成）。現況「趕工中」是靠 MDX 內放 `<ComingSoon />` 元件表達的，不是 frontmatter；引入 `status` 會連帶改動 `seriesProgress()` 的分母
- B 翻案：frontmatter 新增 `status: published | empty | coming-soon`，非 `published` 進「未發佈」欄、不可拖、不計入系列進度。需同步修訂 PRD §7.1 與 `reading-progress.ts`
- C 折衷：四欄照畫，但「未發佈」以「內文含 `<ComingSoon`」推斷，不新增欄位。規則隱晦，不建議

**Q8 🟡 「無 frontmatter」怎麼判定** —— ✅ 已定案：A（2026-09-21）
- **A（建議）檔案開頭沒有 `---` 區塊**。語意與 chip 文字一致；需在索引時讀原始檔頭判斷（`enrichNote()` 補完預設值後已無從分辨）
- B 缺 `title` 即算。較寬鬆，但有 frontmatter 只是沒寫 title 的筆記會被誤標

**Q9 ⚪ 字數計算規則** —— ✅ 已定案：作者決定整個拿掉字數，以下選項不適用（2026-09-21）
- **A（建議）CJK 逐字計、拉丁文以詞計**；先剝除 frontmatter、import、`@ai-visualize` 註解、JSX 標籤、程式碼塊（沿用 `excerpt()` 的剝除規則）
- B 原始字元數。最簡單，但一篇貼了大段程式碼的筆記會顯得很長

**Q10 🟡 時間相關統計** —— ✅ 已定案：(a) 瀏覽器端計算、(b) 以 `updatedAt` 為準（2026-09-21）
- (a) 相對量何時算 —— **建議 client 端以 `Date.now()` 計算**（§5.4），而非 build 期
- (b) 「寫作頻率」「近 7 日」以哪個日期為準 —— **建議照 prototype 用 `updatedAt`**，並把 widget 文案寫明是「更新」。現況 Dashboard 用 `createdAt`（本週「新增」），語意會變

### C. 既有功能的去留（README 未交代）

**Q11 🟡 收藏**（`FavoriteButton`、列表的「只看收藏」） —— ✅ 已定案：保留，放篩選 chip（2026-09-21）
- **A（建議）保留**：Toolbar 加一顆「收藏」chip、Drawer 與筆記頁首各放一顆星。純 localStorage 功能，移除會讓使用者既有的收藏資料變成孤兒
- B 依新設計移除

**Q12 🟡 筆記頁既有的頁內區塊**（prototype 其實沒隱藏它們，見 §8.3） —— ✅ 已定案：A（2026-09-21）
- **A（建議）頁首只接手「標題 + 主要動作」，其餘留在內文**：移除內文 h1 與返回連結；保留標籤編輯、描述、meta 列（更新日、`ReadingControl`）；動作重新分配 —— 頁首放「版型庫」「簡報」「收藏」，dev-only 的「以 VS Code 編輯」「重新生成」「刪除筆記」收進頁首的「⋯」選單
- B 照 prototype 原樣，內文區完全不動。標題重複顯示兩次
- C 動作全部上移到頁首，內文只留標籤與描述。頁首在窄螢幕會很擠

**Q13 🟡 全文搜尋**（現有 `PagefindSearch`） —— ✅ 已定案：A（2026-09-21）
- **A（建議）併入 Palette**：輸入後多一組「全文」結果，pagefind 延遲載入；dev 環境沒有索引時該組不顯示（與現況相同）。Toolbar 搜尋框維持字串比對
- B 移除全文搜尋，只留標題／路徑／標籤比對
- C `/notes` Toolbar 搜尋框直接接 pagefind。結果要映射回 row 才能套四種 view，複雜度高

**Q14 🟡 資料檔還要不要混進 `/notes` 列表**（plugin 設計文件 Q6 定案「進」） —— ✅ 已定案：A，並明確保留系列線上的混合顯示（2026-09-21）
- **A（建議）依新設計移出**，資料檔統一由 `/plugins` 與 Sidebar 的「Plugin 資料檔」進入；同步在 plugin 設計文件記一筆修訂。連帶影響：`/notes?series=<id>` 的結果會比系列章節數少（資料檔章節不在其中），標題旁要註明「僅筆記」
- B 維持混排。四種 view 都要為資料檔設計一種 row／card／欄位，Board 還得決定它落在哪一欄

**Q15 ⚪ Dashboard 的取捨** —— ✅ 已定案：(a) widget 吸收並每個系列加「繼續閱讀」按鈕（作者提出）、(b) 簡報數拿掉（2026-09-21）
- **A（建議）照新設計**：`ContinueReading` 由「系列進度」widget 吸收；「已生成簡報」KPI 移到 `/settings` 關於頁的 stat strip
- B 在 grid 裡多留一個簡報 widget

**Q16 ⚪ 「版型庫」按鈕連到哪** —— ✅ 已定案：完全不放（2026-09-21）。查證後原建議 A 已不成立，理由見 §8.3
- **A（建議）連到既有的版型庫簡報**（`src/components/generated/atoms.deck.tsx` 對應的 `/present/` 頁），不存在時隱藏按鈕。需確認這就是設計稿所指的 `DeckLibrary`
- B 本次不放，待簡報那條線另行處理

**Q17 🟡 「轉簡報」按鈕在沒有 deck 時** —— ✅ 已定案：A（2026-09-21）
- **A（建議）沿用現行語意**：有 deck → solid「簡報」連到 `/present/<slug>`；沒有 deck 且 dev → ghost「生成簡報」（複製 Claude Code 提示詞，即現有 `GenerateDeckButton`）；沒有 deck 且正式環境 → 隱藏。Drawer 同規則
- B 一律顯示，沒有 deck 時 disabled 並附說明

**Q18 ⚪ Drawer 的「生成 N 個標記」**（prototype 只是開啟筆記） —— ✅ 已定案：A，文字改為「複製生成提示」（2026-09-21）
- **A（建議）dev-only，行為同現有 `RegenerateButton`**：複製對話範本到剪貼簿並跳 Toast。正式環境隱藏
- B 照 prototype，只是開啟筆記

### D. 路由

**Q19 🔴 資料檔渲染頁的路由** —— ✅ 已定案：A（2026-09-21）
- **A（建議）維持 `/view/<路徑>`**。plugin 設計文件 Q4 的定案理由仍成立（不洩漏 plugin、不與 notes 撞路徑），系列識別碼 `view:<路徑>` 與它同形，ER 資料檔的 `meta.backTo` 與既有書籤也都指向它。麵包屑照樣顯示 `NoteCraft / Plugin / <路徑>`。原 `/view` 列表頁轉址到 `/plugins`
- B 照 README 改 `/plugins/view/[id]`。要重新定義 `id`、改系列識別碼的換算、處理舊網址

**Q20 ⚪ `/about` 與 `/view` 舊網址** —— ✅ 已定案：A（2026-09-21）
- **A（建議）用 Astro `redirects` 設定產生靜態轉址頁**，零執行時成本
- B 直接移除，舊連結 404

**Q21 ⚪ 「回到來源筆記」**（讀資料檔的 `meta.backTo`） —— ✅ 已定案：A，並加上站內路徑限制（2026-09-21）
- **A（建議）把 `meta.backTo` 升格為 app 層約定的第三個 meta 欄位**（與 `title`、`description` 並列），並更新 plugin 設計文件 §8.2 那句「其餘欄位 app 不碰」
- B 維持由 renderer 自己處理，頁首不放這顆按鈕

### E. Plugin

**Q22 🟡 啟用／停用的資料形狀** —— ✅ 已定案：A（2026-09-21）

背景：（`plugins.json` 是 mapping 陣列，同一個 plugin 可能出現多條；schema 目前 `additionalProperties: false`）
- **A（建議）頂層加 `"disabled": ["<plugin-id>"]`**。一顆 Switch 對應一個值，不必動 mapping；舊檔案沒有這個欄位就等於全部啟用。語意：停用的 plugin 其 mapping 全部略過、不產頁；系列裡指向這些資料檔的 `view:` 章節降為 warn、不 build fail。需改 `plugins.schema.json`、`plugins.ts`、新增 dev API
- B 每條 mapping 各自帶 `enabled`。Switch 要一次改多條，且「部分啟用」的狀態 UI 表達不了
- C 首版 Switch 不做，只顯示狀態 pill。設計稿的一個主要互動落空

**Q23 ⚪ 「渲染錯誤」pill** —— ✅ 已定案：A（2026-09-21）

背景：（renderer 在瀏覽器 throw，build 期不可能知道）
- **A（建議）首版不做**。錯誤已由該頁的 `PluginErrorCard` 呈現；列表上這顆 pill 在正常情況下永遠不會出現
- B `PluginErrorCard` 掛載時寫一筆 localStorage，列表讀它；成功渲染時清除。要處理過期旗標

**Q24 ⚪ 「不相容」判定** —— ✅ 已定案：B，不做（2026-09-21）

背景：（現況 `engines` 只在安裝時檢查）
- **A（建議）build 期再比一次**，把 `bin/install-plugin.mjs` 的 `checkSemverRange()` 抽到共用模組。結果只影響 pill 與 stat strip，**不**讓 build fail（能裝得進來代表當時相容）
- B 不顯示這個狀態

### F. 互動與無障礙

**Q25 🟡 工作區路徑顯示** —— ✅ 已定案：A（2026-09-21）

背景：（Sidebar 頭、Drawer 路徑列、關於頁；prototype 寫 `~/notes/src/content/notes`）
- **A（建議）一律顯示相對路徑**：主專案顯示 `src/content/notes`；viewer 顯示「專案資料夾名／相對 notesDir」。正式站是公開網頁，不該把本機絕對路徑（含使用者名稱）烤進 HTML
- B dev 顯示絕對路徑、正式環境顯示相對路徑

**Q26 🟡 Board 在觸控裝置** —— ✅ 已定案：作者另提方案，皆不做（2026-09-21）

背景：（HTML5 DnD 不支援 touch，而平板斷點保留了 Board）
- **A（建議）Drawer 內加閱讀狀態三段控制**（重用 `ReadingControl`），拖曳只是桌面的捷徑。同時滿足鍵盤使用者
- B 引入觸控拖曳實作。需要白名單外的套件或自寫 pointer 事件，成本高
- C 平板也拿掉 Board

**Q27 🟡 單擊選取、雙擊開啟的鍵盤與連結語意** —— ✅ 已定案：C 的變體（圖示常駐、五處皆放）（2026-09-21）
- **A（建議）row 為可聚焦按鈕**：單擊／`Space` 切換 Drawer、雙擊／`Enter` 開啟、`⌘/Ctrl + 點擊` 開新分頁；手機單點開滿版 Drawer（照 README）
- B 標題文字做成真連結（點標題直接開、點列其他處才是選取）。保住瀏覽器原生的連結行為，但與設計稿的互動不一致

### G. 樣式與流程

**Q28 🔴 DS 沒有的七個色值**（§7.2） —— ✅ 已定案：A（2026-09-21）
- **A（建議）照 prototype 的值新增為 `--wb-*` token**，集中在 `workbench.css` 開頭並註明「工作台專用、DS 無對應」。像素級重現優先
- B 一律吸附到最近的 DS token（例：warn 文字改用 `--warning-700`）。更守規矩，但與設計稿有肉眼可見的色差

**Q29 ⚪ 設定頁的項目** —— ✅ 已定案：A（2026-09-21）

背景：（prototype 的 Tweaks 另有「列高」「筆記字級」）
- **A（建議）只做 README 列的兩項**（預設 view、預設分組）
- B 加上列高與筆記字級

**Q30 🔴 切換策略與交付節奏** —— ✅ 已定案：A（2026-09-21）
- **A（建議）單一 feature branch、依 §13 分 Phase 逐步 commit，全部完成才併回 main**；P3 先讓所有既有頁面原樣搬進新殼，確保每個 commit 都能 build。Task 編號接續 Task 59 起
- B 新舊 layout 並存於 main、以旗標切換。兩套殼要同時維護，且正式站會看到半成品

### 優先順序一覽（當時的提問順序，全數已定案）

| 先問（🔴 卡 P1–P3） | 再問（🟡） | 可邊做邊定（⚪） |
| :-- | :-- | :-- |
| Q1 Q2 Q4 Q5 Q6 Q19 Q28 Q30 | Q3 Q7 Q8 Q10 Q11 Q12 Q13 Q14 Q17 Q22 Q25 Q26 Q27 | Q9 Q15 Q16 Q18 Q20 Q21 Q23 Q24 Q29 |

---

## 16. 定案紀錄

逐題確認中，格式同 plugin 設計文件 §14。

| # | 議題 | 決議 | 定案日 |
| :-- | :-- | :-- | :-- |
| Q1 | 導覽模型 | 維持 Astro MPA。Sidebar 展開狀態以 localStorage + pre-paint script 還原；不引入 `<ClientRouter />`，既有 island 與筆記頁 inline script 的生命週期不動 | 2026-09-21 |
| Q2 | 工作台索引的交付 | 混合式：Sidebar 於 build 期直接畫成 HTML；各列表頁 inline 自己需要的切片；Palette 與 Dashboard 上的 Drawer 於首次開啟時 fetch build 期輸出的靜態 `/wb-index.json`。不做依筆記數切換的門檻分支 | 2026-09-21 |
| Q3 | view Tab 要不要進 URL | 要。`/notes?view=list\|board\|table\|timeline`，切換用 `history.replaceState`（不堆疊歷史）；未帶參數時用設定頁的預設 view；手機忽略。同一規則適用 Dashboard／Plugin／設定頁的 `?tab=`。分組方式與搜尋字串不進網址 | 2026-09-21 |
| Q4 | 子資料夾的 query 形狀 | 單一參數 `?folder=a/b/c`，路徑前綴比對、不限深度；Sidebar 樹同樣不限層數。不採用 README 的 `?folder=&sub=`。舊版無資料夾篩選（只有 `?tag=`），底層巢狀 slug 本就不限深度。連帶：`GET /api/folders` 改為遞迴列出 | 2026-09-21 |
| Q5 | 資料夾的來源 | 只認檔案路徑，單一真相。`category` frontmatter 保留但 UI 不使用。主專案現況為「根目錄」加 `private/`（後者被 gitignore，正式站不存在）。搬檔改 slug 的搬遷腳本不在本次範圍 | 2026-09-21 |
| Q6 | 資料夾顏色 | **不分色**：所有資料夾同一個品牌藍 `--wb-blue-l`，根目錄用灰 `#8b9aad`。未採用建議的「依排序循環指派」—— 取其最單純、永不撞色或跳色。代價是以資料夾分組時 group header 失去顏色線索；系列色不受影響 | 2026-09-21 |
| Q7 | Board 的「未發佈」欄 | 維持 PRD 2026-06-16 定案，**Board 三欄**、所有筆記皆可拖曳；不新增 `status` frontmatter，系列進度分母不動。Drawer 的「筆記狀態」pill 一併取消。首態文案統一為設計稿的「未開始」（改 `readingMeta()` 一處） | 2026-09-21 |
| Q8 | 「無 frontmatter」的判定 | 檔案開頭沒有 `---` 區塊才算；有區塊但缺欄位仍算有。建索引時讀原始檔頭判斷（容忍 BOM／CRLF），讀檔失敗視為有。計數為 0 時 chip 不顯示 | 2026-09-21 |
| Q9 | 字數 | **作者決定整個拿掉**，不採用任何計算規則。筆記頁首的「N 字」pill、Drawer Metadata 的字數列、Table 的字數欄三處皆不做；索引不帶 `words` 欄位。Table 為六欄，不補其他欄位 | 2026-09-21 |
| Q10 | 時間相關統計 | (a) 相對量（近 7／30 日、近 8 週、N 天前、「本週」Tab）於**瀏覽器端以 `Date.now()` 計算**，首繪以「—」佔位、當地時區日界線；絕對量仍在 build 期。長條圖週窗以今天為終點，不採 prototype 的「最新一篇」基準。(b) 一律以 **`updatedAt`** 為準、文案寫「更新」；現況以 `createdAt` 計的「本週／本月新增」取消。寫死的 `TODAY` 移除 | 2026-09-21 |
| Q11 | 收藏 | **保留**。Toolbar 篩選 chip 列加「收藏 N」（四種 view 皆可用、可與分組疊加、0 時不顯示、參數 `?fav=1`）；作者曾考慮放進「分組」，因分組只在 List 可用且語意是切堆而非篩選，未採用。星號按鈕放 Drawer 標題旁與筆記頁首，列與卡片上不放。`favorites.ts` 與既有 localStorage 資料沿用 | 2026-09-21 |
| Q12 | 筆記頁既有的頁內區塊 | 頁首接手標題與全部動作：簡報、收藏、dev-only 的「⋯」選單（VS Code 編輯／重新生成提示／刪除筆記）。內文移除返回連結、大標題、動作列與重複的「視覺化已生成」；保留標籤編輯、描述、更新日與 `ReadingControl`。頁首 h1 加 `data-pagefind-meta="title"`；僅筆記頁的標題放寬為兩行（「版型庫」後依 Q16 取消） | 2026-09-21 |
| Q13 | 全文搜尋 | 併入 Palette：在筆記／系列／標籤之後加「內文」組（pagefind，最多 5 筆、附一行摘要、與筆記組去重）。pagefind 於首次開啟 Palette 時才載入；dev 無索引時整組不顯示。Toolbar 搜尋框維持字串比對、只過濾當頁。`PagefindSearch.tsx` 刪除 | 2026-09-21 |
| Q14 | 資料檔是否混進 `/notes` 列表 | **移出**。`/notes` 一律只列筆記（含以系列篩選或分組時）；修訂 plugin 設計文件 Q6。作者要求的「系列中保留混合顯示」經確認範圍為系列相關頁面：系列詳情／總覽、Sidebar 與 Dashboard 的系列進度、`SeriesNav`、Drawer 同系列章節 —— 這些照舊混合並計入進度。以系列篩選時頁首標「僅筆記」並連回系列詳情。Palette 補一組「資料檔」 | 2026-09-21 |
| Q15 | Dashboard 的取捨 | (a) `ContinueReading` 卡刪除，由「系列進度」widget 吸收；**作者提出在 widget 補「繼續閱讀」按鈕**，定為每個系列各一顆 `.wb-mini` 連結（未開始顯示「開始閱讀」、讀完不顯示），直達下一章；系列依進行中 → 未開始 → 已讀完排序。(b) 「已生成簡報」數字**拿掉**，不搬到別處（未採用建議的「移到關於頁」） | 2026-09-21 |
| Q16 | 「版型庫」按鈕 | **完全不放**，任何地方都不加入口。查證：設計稿的 `DeckLibrary` 是簡報系統的規格展示頁，codebase 無此頁；最接近的 `/present/atoms` 是開發用驗證 deck、不隨 npm 發佈、與當前筆記無關。原建議「連到 atoms deck」經查證後撤回。要看就直接輸入網址 | 2026-09-21 |
| Q17 | 簡報按鈕在沒有 deck 時 | 沿用現行三段式：有 deck → solid「簡報」連到 `/present/<slug>`；無 deck 且 dev → ghost「生成簡報」（複製提示詞 + Toast）；無 deck 且正式環境 → 不顯示。筆記頁首與 Drawer 同規則。文字用「簡報」而非設計稿的「轉簡報」 | 2026-09-21 |
| Q18 | Drawer 的「生成 N 個標記」 | **dev 專用、複製對話範本**到剪貼簿 + Toast，與筆記頁「⋯」選單共用 `buildRegeneratePrompt()`；正式環境不顯示。文字改為「複製生成提示」。順手修正範本寫死 `src/content/notes/<slug>.mdx` 的既有問題，改用相對專案根的 `promptPath`；`GenerateDeckButton` 同步改用 | 2026-09-21 |
| Q19 | 資料檔渲染頁的路由 | 維持 `/view/<路徑去副檔名>`，延續 plugin 設計文件 Q4 的定案；系列識別碼 `view:<路徑>`、`meta.backTo`、既有書籤都不必動。README 的 `/plugins/view/[id]` 不採用。原 `/view` 列表頁併入 `/plugins` | 2026-09-21 |
| Q20 | `/about` 與 `/view` 舊網址 | 用 Astro `redirects` 產生靜態轉址頁：`/about` → `/settings?tab=about`、`/view` → `/plugins`。不綁平台，不另寫 Netlify 301 規則。`/view/<路徑>` 渲染頁不受影響。P11 驗證 `/view` 不被 `[...path]` rest 路由接走 | 2026-09-21 |
| Q21 | 「回到來源筆記」與 `meta.backTo` | 查證：app 現況已在讀 `meta.backTo`，與 plugin 設計文件 §8.2「app 不碰」不符。定案**正式升格為 app 層約定的第三個 meta 欄位**，並**限制為站內路徑**（單一 `/` 開頭）；不符者忽略並 build 期 warn，堵住 `javascript:` 可執行的缺口。檢查集中在 `plugins.ts`。plugin 設計文件於 P13 補修訂 | 2026-09-21 |
| Q22 | Plugin 啟用／停用的資料形狀 | `plugins.json` 頂層加 **`disabled: string[]`**，映射規則不動；省略即全部啟用。停用的 plugin 其規則於比對前略過、不產頁，未安裝也不 build fail；系列章節指向其資料檔時 warn 並跳過。新增 `PUT /api/plugins/:id`（dev-only）。正式環境不渲染 Switch、只留 pill。細節見 §8.6.1 | 2026-09-21 |
| Q23 | 外掛列表的「渲染錯誤」pill | **首版不做**。renderer 的錯誤是瀏覽器執行期才發生，build 期的列表頁無從得知；以 localStorage 記錄只反映單一瀏覽器。列表與 Plugin Drawer 皆不顯示此狀態，錯誤由該資料檔頁既有的 `PluginErrorCard` 呈現 | 2026-09-21 |
| Q24 | 外掛的「不相容」狀態 | **不做**（未採用建議的「build 期再比一次、只顯示」）。`engines` 維持只在安裝時檢查，`checkSemverRange()` 不搬動。列表不顯示「不相容」pill、stat strip 為四格、Drawer 無警告框；Manifest 表仍列「引擎需求」原字串。接受三種落差情境下不會有提示 | 2026-09-21 |
| Q25 | 路徑顯示 | **一律相對路徑**，dev 與正式環境相同，本機絕對路徑不進任何輸出。工作區標籤：主專案 `src/content/notes`、viewer「專案資料夾名／相對 notesDir」；個別筆記用真實檔案相對 notesDir 的路徑（由 `entry.filePath` 換算；不直接顯示它，也不用會被 slug 化的 entry id 反推），資料夾樹同此來源。Drawer 頂列是唯一串接兩者之處。筆記頁底部一併改用。細節見 §5.2.2 | 2026-09-21 |
| Q26 | Board 在觸控裝置 | **作者另提方案**：觸控裝置不做拖曳，Drawer 也不加閱讀狀態控制（未採用建議的「Drawer 加三段切換」），Drawer 完全照設計稿。僅以 `(pointer: fine)` 判斷，在觸控裝置上把卡片設為不可拖並隱藏拖曳提示，Board 成為純總覽。改狀態的路徑：筆記頁 `ReadingControl`、`DonePrompt`、系列詳情頁的單鍵推進。接受鍵盤使用者無法在 Board 上改狀態 | 2026-09-21 |
| Q27 | 單擊／雙擊的鍵盤與連結語意 | 整列維持按鈕語意，補上 `Enter` 開啟、`Space` 切換 Drawer、`↑↓` 移動、`⌘/Ctrl`+點擊與中鍵開新分頁。另加**常駐**的「開啟」圖示（真連結，`arrow-right`，平常淡灰）—— 作者指定常駐而非移入才顯示。List／Table／Timeline／Board 卡片／Dashboard dense 列五處皆放。列的 DOM 為容器內並排的 `<button>` 與 `<a>`，不巢狀。細節見 §8.2.1 | 2026-09-21 |
| Q28 | DS 沒有的七個色值 | 照 prototype 原值新增為 `--wb-*` token（`--wb-ink-2`、`--wb-mute`、`--wb-warn-ink`、`--wb-ok-ink`、`--wb-danger-ink`、`--wb-rail-ic`、`--wb-rail-ic-hover`），集中於 `workbench.css` 開頭；樣式規則只引用 token、不出現 hex。不吸附到 DS 既有色階，像素級重現優先 | 2026-09-21 |
| Q29 | 設定頁的項目 | 只做 README 列的兩項：預設 view、List 預設分組，存 `nc-workbench-prefs-v1`。Tweaks 的「列高」（prototype 中實際未接上）與「筆記字級」不做 | 2026-09-21 |
| Q30 | 切換策略與交付節奏 | 單一分支 `feat/workbench-redesign`、依 §13 分 Phase commit，P13 完成才併回 main；每個 commit 皆可 build；P3 先讓既有頁面原樣搬進新殼。Task 自 59 起編號。不做新舊並存或旗標切換 | 2026-09-21 |
