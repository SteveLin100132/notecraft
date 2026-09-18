# Task 56 — watch / 快取整合與 dev HMR

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §11（實作階段 P7）。
> 依賴 [Task 47](task-47-plugin-build-resolution.md)。
> **本批風險最高的一項。**

## 為什麼要有這一步

作者改一份 JSON，畫面要跟著動。目前的快取失效偵測只掃 md/mdx 與 `.notecraft/*.json` 頂層 ——
資料檔與 plugin 都掃不到，改了不會重 build。

## 範圍

### 1. 快取失效條件擴充（viewer v2 §7.1）

| 新條件 | 說明 |
| --- | --- |
| `.notecraft/plugins.json` mtime | 現行已掃 `.notecraft/*.json` 頂層，**這條剛好涵蓋** |
| `.notecraft/plugins/**/*.{tsx,ts,json}` mtime / 檔案數 | **新增**，現行掃描不進子目錄 |
| 命中 glob 的資料檔 mtime / 檔案數 | **新增**，現行只掃 md/mdx；Task 47 走訪時已順手收齊，直接用 |

`meta.json` 相應增加 `pluginCount` / `dataFileCount`。

### 2. `serve` 的 chokidar 清單

加入上述三項。既有的 debounce 300ms、原子 rename、SSE 廣播都不動。

### 3. `view`（astro dev）的 HMR —— 先實測

資料檔是用 fs 讀進來的、**不在 Vite 模組圖裡**，改它很可能不觸發更新（Q19）。

**先實測**，確認結果再決定：

- 若會觸發 → 什麼都不用做，把實測結果記在本 Task 的實作記錄裡
- 若不觸發 → 在 `view` 掛一個**只監看資料檔**的 watcher，變動時主動要求 Vite 失效對應模組

**不要改現有的讀檔方式**去遷就 HMR。虛擬模組是備案不是首選 —— 它會與 Q10 的 inline props 糾纏。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| serve 自動重建 | `serve` 執行中 | 改一份資料檔 | 30 秒內自動 rebuild，瀏覽器經 SSE 自動 reload |
| plugin 改動觸發 | 同上 | 改 `renderer.tsx` | 同上 |
| 新增資料檔觸發 | glob 為 `**/*.er.json` | 新建一個符合的檔 | 觸發 rebuild，新頁出現 |
| rebuild 失敗不白畫面 | 改壞資料檔 | 存檔 | 保留舊 dist，前端收到失敗通知，終端機印錯誤 |
| view 模式可用 | `view` 執行中 | 改資料檔 | 畫面更新（或記錄實測結果與所採方案） |
| 無 plugin 零負擔 | 專案無 `plugins.json` | `serve` | watcher 不監看多餘路徑 |

## 依賴

Task 47。

## 風險

**高。** dev HMR 的行為未知，是整批唯一沒有既有經驗可循的部分。
另一個坑是 watcher 範圍：資料檔的 glob 可能是 `**/*.json`，若不小心把 `node_modules`
或 `.notecraft/` 一起監看，低效能機器上會吃滿 CPU。

## 實作記錄（2026-09-18）

`bin/notecraftapp.mjs`：`isWatchedFile` 加 `.notecraft/plugins/**` 子樹與 notesDir 下的 `.json`；
`shouldRebuild` 加兩個 pass（資料檔、plugin 檔案）與對應的 mtime / 數量比對；
`writeMeta` 記下 `jsonCount` 與 `pluginFileCount`。

- watcher 的資料檔判定**用副檔名粗篩**，不在 CLI 重算一次 glob ——
  重算等於有兩份真相；這裡只決定「要不要重 build」，真正命中哪些檔是 `src/lib/plugins.ts` 的事
- `meta.json` 的新欄位用 `undefined` 檢查向後相容（舊快取不會因為缺欄位就一直重 build）

**未做（Q19）**：`view`（astro dev）模式改資料檔會不會觸發 HMR 尚未實測。
`serve` 的背景 rebuild 已涵蓋。
