# 文件爆炸圖：零件庫與組裝稿寫法

每一節文件（`src/content/docs/<slug>.mdx`）的圖版右側有一張等角爆炸圖。組裝稿寫在 `src/lib/figs/<章>.ts`，
型別在 `src/lib/figs/types.ts`，零件的線稿在 `parts.tsx`，引擎在 `DocFig.tsx`。

## 一份組裝稿

```ts
"guides/tabs": {
  caption: "筆記頁籤分解圖：頁籤列浮在主區之上，⌥ 快捷鍵與「全部頁籤」清單。",
  layers: [ // 由下而上
    { id: "screen", kind: "screen", ref: 10, name: "頁籤列實機", to: "開啟與切換", box: [0, 0, 320, 200], shot: "note-tabs" },
    { id: "tabs", kind: "tabs", ref: 12, name: "頁籤列", to: "滑鼠操作", box: [60, 0, 320, 24], p: { n: 5, on: 1, variant: "pin" } },
    ...
  ],
},
```

- **caption**：圖說「FIG. 節號」後面那一句，格式「〇〇分解圖：一句話講這張圖畫了什麼」，≤ 40 字。
- **layers**：3–6 層為宜（最多 7）。**由下而上**：底下是基礎（資料夾、底板、實機畫面），越上面越是這一節的重點。
- **ref**：偶數、由下而上遞增，從 10 起（10、12、14…）。
- **name**：符號說明上的名稱，≤ 12 字，用文件裡的用語。
- **to**：對應小節的錨點（`##`／`###` 的 slug）。查法：`node scripts/doc-headings.mjs <slug>`。盡量每層都有、分散到不同小節，讓圖變成這一節的視覺目錄。不能亂填：build 會檢查。
- **also**：這個零件也負責的其他小節錨點（陣列）。爆炸圖取代本頁目錄，**每個 `##` 都必須被某個零件的 `to` 或 `also` 涵蓋**，否則 build 失敗。捲到 `also` 的段落時零件一樣浮起；點零件仍跳到 `to`。小節比零件多時用它，不要為了涵蓋硬加零件。
- **box**：在 320 × 220 底板平面上的範圍 `[u0, v0, u1, v1]`。省略＝整塊底板。u 往右下、v 往左下。上層用小一點的 box 放在它「屬於」的位置（例如頁籤列放在主區上緣 `[60, 0, 320, 24]`），引線才指得清楚。
- **slab**：只有最底層的底板給（12–16），畫出板厚。
- **gap**：與上一層的間距倍數（預設 1）；想讓某層特別浮起就給 1.4。
- **side**：引線拉到左邊（`"l"`）或右邊（預設）。左邊適合 box 貼在左側的零件（Rail、Sidebar、檔案樹）。一張圖左右都有時比較不擠。
- **hl**：「這就是生成出來的那一塊」：星芒橙描邊。每張圖最多一層，只給 AI 生成元件、或這一節真正的主角。
- **shot**：只給 `kind: "screen"`，值是下面「實機截圖」的名稱。box 要是 16:10（例如 `[0, 0, 320, 200]`）。截圖會先畫鉛筆線稿、上墨，再從左向右鋪上；圖版右上角出現「實機畫面」按鈕可攤平看大圖。**只有這一節真的在講某個畫面時才放**，不要每節都放。

## 共用 id（換節時同 id 的零件會原地變形，所以同一種東西請用同一個 id）

| id | 用途 |
| --- | --- |
| `base` | 最底層的底板（slab）：專案目錄、你的筆記資料夾、repo |
| `files` | 檔案樹（tree）：筆記資料夾的內容 |
| `screen` | 實機截圖（screen） |
| `app` | 應用程式視窗外框（window／browser） |
| `rail`、`sidebar`、`main`、`drawer`、`tabs`、`palette` | 工作台的各區 |
| `note` | 一篇筆記檔（file） |
| `marker` | `@ai-visualize` 標記原文（marker） |
| `component` | AI 生成的互動元件（component，hl） |
| `term` | 終端機（terminal） |
| `json` | 設定檔／資料檔（json） |
| `flow` | 流程（flow） |
| `deck` | 簡報（slides） |
| `plugin` | Plugin 渲染結果（er／api） |
| `keys` | 鍵帽（keys） |

## 零件（kind）與參數 p

文字（`text`、`items`）會斜印在等角平面上：要短，英數為主（中文也可以，但 ≤ 6 字）。

| kind | 畫什麼 | p |
| --- | --- | --- |
| `slab` | 底板（外框＋虛線內框） | `text` 刻在板上的字 |
| `window` | 應用程式視窗 | `variant`：`"rail sidebar tabs"` 的組合；`text` 視窗標題；`on` Rail 選中第幾格 |
| `browser` | 瀏覽器（網址列） | `text` 網址 |
| `screen` | 實機截圖（鋪截圖前的線稿是工作台輪廓） | 用 `shot` |
| `rail` | 左側圖示列 | `on` |
| `sidebar` | 縮排的樹狀列表 | `n` 列數、`on` 所在列 |
| `list` | 列表（標題線＋chip） | `n`、`on` 選中列 |
| `board` | Board 欄與卡片 | `n` 欄數（2–4）、`on` 有選中卡的欄 |
| `table` | 表格 | `items` 欄名、`n` 欄數、`on` 選中列 |
| `timeline` | 時間軸 | `n` 點數、`on` 選中點 |
| `kpi` | 儀表板（KPI 卡＋清單＋長條） | — |
| `chart` | 長條圖 | `n` 條數、`on` 強調哪一條 |
| `calendar` | 月曆 7 × 5 格與色塊 | `on` 選中格 |
| `tabs` | 頁籤列 | `n`、`on`、`variant: "pin"` 第一個有圖釘 |
| `palette` | ⌘K 指令面板 | `text` 輸入字、`n` 結果數、`on` |
| `drawer` | 右側預覽面板 | — |
| `modal` | 對話框（欄位＋主按鈕） | `n` 欄位數 |
| `file` | 一篇筆記檔（折角） | `text` 檔名；`variant`：`"h"` 有標題、`"marker"` 中間有 @ai-visualize 虛線框（可合用 `"h marker"`） |
| `folder` | 資料夾 | `text` 名稱 |
| `tree` | 檔案樹 | `items`：每列一個名稱，前導兩個空白一層縮排，資料夾以 `/` 結尾；`on` 選中列 |
| `terminal` | 終端機 | `items` 每列（第一列自動加 `$`，其他列以 `$` 開頭也會加）；或 `text` 單一指令 |
| `json` | JSON 檔 | `text` 檔名、`items` 鍵名、`on` 強調的鍵 |
| `code` | 程式碼列 | `text` 檔名、`n` 列數、`on` 高亮列 |
| `diff` | 差異（+／-） | `items`：每列 `"+"`、`"-"` 或 `" "` |
| `flow` | 流程節點 | `items` 節點名（或 `n`）、`on` 作用中（之前的算已完成）、`dashed` 最後一個是虛線 |
| `component` | AI 生成的互動元件（橙） | `variant`：`flow`／`chart`／`slider`／`table`；`text` 元件檔名 |
| `marker` | `@ai-visualize` 標記原文 | `items` 欄位名（預設 id/type/prompt/status）、`on` 強調的欄位 |
| `slides` | 一疊 16:9 投影片 | `n` 張數、`variant: "play"` 播放中 |
| `chips` | 標籤 chip | `items`、`on` |
| `shield` | 盾牌（安全） | — |
| `er` | ER 圖（三張表） | — |
| `api` | OpenAPI 端點列 | `items` method（GET/POST…）、`on` |
| `package` | npm 套件盒 | `text` 套件名 |
| `server` | 主機＋地球（部署） | `text` |
| `keys` | 鍵帽 | `items` 每顆鍵的字、`on` 按下的那顆 |
| `progress` | 系列進度條 | `n` 列數、`on` 閱讀中那列 |
| `headings` | 標題層級 H1／H2／H3 | `items`（如 `["H1","H2","H3"]`）、`on` 顯示錨點 # 的那列 |
| `image` | 圖片佔位 | `text` 檔名 |
| `canvas` | 放大檢視的畫布（格線＋可見範圍） | — |
| `scan` | 一排檔案＋放大鏡 | `n`、`on` 被找到的那份（虛線橙框） |
| `toggles` | 開關列 | `items` 名稱或 `n`、`on` 唯一開著的（省略＝除了最後一個都開） |
| `columns` | 比較欄（打勾） | `items` 欄名、`on` 主角欄 |
| `note` | 一張便條紙（概念、名詞） | `text` 標題 |

## 實機截圖（`shot`，都在 `site/public/plates/`，1440 × 900）

`dashboard`、`dashboard-calendar`、`notes-list`、`notes-drawer`、`note-tabs`、`plugins`、
`tutorial-dashboard`、`tutorial-note`、`tutorial-pending`、`tutorial-generated`、
`notes-board`、`notes-table`、`notes-timeline`、`note-detail`、`palette`、`zoom`、`deck`、`deck-play`、
`series`、`plugin-er`、`plugin-openapi`、`new-note`、`tags`、`ai-queue`。

## 設計原則

1. 圖畫的是**這一節講的機構**，不是通用插圖：讀者看圖就知道這一節有哪幾個零件、彼此怎麼疊。
2. 跟畫面有關的節用視窗、UI 零件；要看真實畫面的節放 `screen`；講流程的用 `flow`；講設定檔的用 `json`／`tree`；講指令的用 `terminal`。
3. 由下而上就是由基礎到重點、或由輸入到輸出。
4. box 的位置要有意義：上層零件疊在它在下層「所屬」的位置上方。
5. 同一章裡前後節盡量共用 id，換節時圖會原地變形而不是整張換掉。
