# Task 52 — 系列整合：一章可以是資料檔頁

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §7.6（Q6′ 翻案）、
> [notecraft-prd.md](../notecraft-prd.md)〈系列資料模型〉；
> 設計交付 [design_handoff_plugin_system](../prototype/design_handoff_plugin_system/) §7。
> 依賴 [Task 47](task-47-plugin-build-resolution.md)、[Task 48](task-48-data-file-view-route.md)。
> **開工前有一項待確認，見文末。**

## 為什麼要有這一步

系列表達的是**閱讀動線**，而一份 schema 的 ER 圖往往正是那條動線上該停的一站，不是附錄。
Q6 原本定案「不進 series」，理由是閱讀進度只該算筆記 —— 但那個理由建立在
「進度靠捲動計算」的錯誤前提上。實際機制是開頁轉「閱讀中」、手動按「已完成」，
純 localStorage、零捲動偵測，**資料檔頁完全適用**。

## 範圍

### 1. 資料模型 entry 化

章節識別碼從「筆記 slug」放寬為兩種字串，同一個 `slugs` 陣列混放：

- 筆記：既有 slug（如 `oauth-101`）
- 資料檔：**`view:` 前綴 + 路徑去副檔名**（如 `view:planning/schema`，對應 `/view/planning/schema`）

`ref` 即上述原字串。**閱讀進度的 localStorage key 一律用未經轉換的 `ref`**（含前綴），
避免筆記與資料檔撞 key。


```ts
type SeriesEntry =
  | { kind: "note"; ref: string; id: string; title: string; description: string; note: Note }
  | { kind: "data"; ref: string; id: string; title: string; description: string; file: ResolvedDataFile }
```

`seriesOf(ref)`、`seriesProgress(series)` 全部改吃 entry：`chapters`、`statuses[].entry`、
`next`、`prev/next` 都是 entry。點擊時依 `kind` 決定 `/notes/<slug>` 或 `/view/<path>`。

### 2. 進度

**完全沿用現有三態機制**，localStorage 的 key 用 entry 的 `ref`。
資料檔一律可追蹤並計入分母。因此系列卡進度條、詳情頁整體進度、章節狀態點三處的
畫法與數字呈現**都不需要改**。

### 3. 章節列（系列詳情頁）

資料檔那一列與筆記**同構**：同樣的 34×34 序號方塊（系列 accent 色、完成時轉 success）、
同樣的狀態徽章、同樣的點擊面積與字級。型別差異只加兩個元素：

- 標題後一枚膠囊徽章：`--orange-50` 底 / `--orange-600` 色 / 11.5px / 700 / `Database` 12 +「資料檔」
- 筆記那一格原本放 `@ai-visualize` 計數的位置，改放 mono 原始檔路徑（11.5px / `--text-muted` + `FileJson` 13）

> **不要縮小字級、不要降低對比、不要排到列尾。** 差異要表現在「多了一種資訊」，
> 不是「少了什麼」或「縮小什麼」—— 它有序號，就是正式的一章。

### 4. 筆記頁底部的系列導覽

章節縮覽混入資料檔項目（同一組狀態圖示、同一個 22px 序號欄），列尾加同一枚「資料檔」徽章（11px）。
上一章／下一章卡片：方向標那行後補「· 資料檔」+ `Database`（`--orange-600`/700），
標題的字級與顏色處理不變，卡片下緣多一行 mono 路徑 —— 讓人知道點下去會看到圖而不是文章。

### 5. 資料檔頁自己的系列導覽

`/view/<path>` 屬於某系列時：

- 頁首右側多一條連結「<系列名> 第 N 章」（`Layers`）
- 頁尾接「標記為已完成」提示卡與同一組系列導覽，**包在 `max-width:1120px; margin:0 auto;
  padding:0 40px 72px` 的一般版心裡** —— 導覽不得跟著渲染區出血成橫跨螢幕的一條
- 此時渲染區**不要**再套 `min-height: calc(100vh - 頁首高)`，否則圖與導覽之間出現一整屏空白

### 6. 既有 warn 擴充語意

`series.ts:124` 已經會警示對不到的 slug（`系列 "X" 的章節 slug "Y" 找不到對應筆記，已跳過。`）。
加進資料檔後這句話會誤導 —— slug 可能對得到資料檔、只是不是筆記。
訊息要能區分「兩邊都對不到」與「對到的是資料檔但未被任何 plugin 認領」。

### 7. 文案：「篇」→「章」（已定案）

系列的一章可以不是文章之後，「篇」就是事實上的錯字。實際範圍比想像窄，**只有兩處**：

| 位置 | 現況 | 改成 |
| --- | --- | --- |
| `SeriesOverview.tsx:328` | `{prog.total} 篇` | `{prog.total} 章` |
| `pages/series/index.astro:37` | `共 N 個系列、M 篇` | `共 N 個系列、M 章` |

封面本身（漸層 + icon 徽章 + chip）不動，只換字。

**不要順手改的**：`/notes` 列表副標、Dashboard 統計、`TagsManager` 的「N 篇筆記」——
那些數的是筆記，不是章節，「篇」在那裡是對的。

## 要改的既有檔案

| 位置 | 改什麼 |
| --- | --- |
| `SeriesDetail.tsx:40`、`:193`；`SeriesNav.tsx:91`、`:139`、`:149` | 硬編碼的 `` `/notes/${slug}` `` **共 5 處**，改為依 `kind` 決定前綴 |
| `DetailChapter` 型別（`SeriesDetail.tsx:6`） | 綁了 `markersTotal` / `markersGenerated`，資料檔沒有 → 改 optional |
| `series.ts` 的 `normalizeSlug()`（`:34`） | 目前只剝 `.md` / `.mdx`，要能辨識資料檔參照 |
| `series.ts` 的比對邏輯 | 對不到筆記時再對資料檔清單 |

**完全不用動**：`seriesProgress()`、`ProgressBar`、`ProgStat`、`ReadingBadge`、
`ReadingControl`、`DonePrompt` —— 它們只吃字串與狀態，不管背後是什麼。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 資料檔可作為章節 | `slugs` 含一筆資料檔參照 | 開系列詳情頁 | 出現在章節列、有序號、連結指向 `/view/...`、計入 `total` |
| 計入進度 | 該章標記 `done` | 看整體進度 | `done` +1、`pct` 依全部章節換算，與筆記章節無差別 |
| 導覽不出血 | 資料檔頁屬於某系列 | 捲到頁尾 | 導覽在 1120 版心內，非橫跨螢幕 |
| 無多餘空白 | 同上 | 檢視圖與導覽之間 | 無一整屏空白（`min-height` 已收） |
| 視覺同儕 | 章節列混排 | 目視 | 資料檔列的字級、對比、序號、點擊面積與筆記列相同 |
| 既有系列零回歸 | 全筆記的既有系列 | 開總覽 / 詳情 / 筆記頁導覽 | 行為與現況一致（僅「篇」→「章」文案差異） |

## 開工前待確認

> **已定案（2026-09-18）：章節識別碼採 `view:` 前綴**——明確勝過推斷、未來可擴充第三種
> 頁面型別、且前綴後的字串與路由同形。PRD〈系列資料模型〉與規格 §7.6 已同步。

**進度分母 `tracked` 的定義。** 原型的 `seriesProgress` 帶了 `isTrackable()`、
讓未發佈筆記不計入分母；但**現行實作與 PRD Q2 收斂都是 `tracked = total`、不做可追蹤判定**。
原型這段是基於不同假設寫的，實作時**以現行為準**，不要把 `isTrackable` 一起搬進來。

> 順帶：PRD 功能列表 #18 仍寫著「未發佈筆記不可追蹤且不計入系列進度」，
> 與同份文件的 Q2 收斂矛盾 —— 是收斂前的舊文字，應一併修掉。

## 風險

中。動到既有系列的三個畫面與五處硬編碼路徑，且「篇」→「章」會掃到既有文案。
`seriesProgress` 不動是關鍵護欄 —— 若發現非動不可，代表 entry 化的抽象漏了，回頭修抽象而不是改它。

## 實作記錄（2026-09-18）

`series.ts` 的 `SeriesChapter` 改為帶 `kind` / `ref` / `href` 的 entry；
`SeriesDetail`、`SeriesNav`、`SeriesOverview`、`ContinueReading` 與四個頁面同步。

- **`seriesProgress()`、`ProgressBar`、`ProgStat`、`ReadingBadge`、`ReadingControl`、
  `DonePrompt` 一行都沒動** —— 它們只吃字串與狀態。這是抽象是否正確的判準
- 硬編碼的 `/notes/` 前綴清掉 5 處（`SeriesDetail` ×2、`SeriesNav` ×3），
  外加 `ContinueReading` 的「繼續閱讀」跳轉 —— 原本盤點漏了這一處
- **Dashboard 也呼叫 `getSeriesChapters`**，同樣漏在原本的盤點裡；不傳 `dataFiles` 的話
  資料檔章節會在首頁觸發「找不到」警示。端對端測試才抓到
- 「篇」→「章」：`SeriesOverview.tsx` 的封面 chip 與 `series/index.astro` 的副標，共 2 處
- 資料檔頁自己的系列導覽包在 1120 版心裡，且 `min-height` 收掉

**進度分母**：依待確認①的定案，維持 `tracked = total`，沒有引入原型的 `isTrackable()`。
