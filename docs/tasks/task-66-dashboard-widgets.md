# Task 66 — Dashboard：widget grid 與三個 Tab

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.1、§5.4；Q10、Q15 定案。
> 設計交付 README §5.1；原始碼 `prototype/wb/pt-dash.jsx`。
> 依賴 [Task 63](task-63-note-drawer.md)（共用 `NoteRow` 與 Drawer）。對應實作階段 **P7**。

## 範圍

### 1. `src/components/wb/DashboardWorkbench.tsx`（新增）

頁面以 `<WorkbenchLayout noHeader rail="dashboard">` 掛它。三個 Tab 是同一份資料的三種投影，做成同一個 island；
Tab 寫進 `?tab=week`／`?tab=ai`（總覽不帶參數），`replaceState`。

頁首：麵包屑 `NoteCraft / 工作區`、標題「儀表板」、pill「N 篇筆記」muted +「N 待生成」warn、dev-only「＋ 新增筆記」。

inline 的 props 只帶本頁需要的切片：所有筆記的**精簡列**（slug／title／path／folder／tags／ai 計數／updatedAt）、
系列（含 chapters）、標籤統計、待生成標記清單。完整的 `WbNoteRow`（Drawer 要用）走 `useWbIndex()` 延遲載入。

### 2. 總覽：12 欄 grid

`.wb-grid` 12 欄、gap 12；widget `.wb-wg`。span 用 class（`.s3`／`.s4`…）不用 inline style。

| span | widget | 內容 | 何時算 |
| --: | --- | --- | --- |
| 3 | 筆記總數 | 40px/900 數字；下行「近 7 日更新 **N**（綠）・ 近 30 日 **N**」 | 總數 build 期；**近 N 日在瀏覽器** |
| 3 | AI 視覺化生成率 | `NN%` + 右側「已生成 N／待生成 N（黃）」+ 7px 進度條 | build 期 |
| 6 | 寫作頻率・近 8 週 | 長條圖：每欄 max 34px 寬、`--wb-blue-l`、非最後一週 `opacity:.6`、頂端數值、首尾顯示 `m/d` | **瀏覽器** |
| 8 | 最近更新 | 8 列 dense `NoteRow`；右上「全部筆記 →」 | build 期 |
| 4 | 系列進度 | 見 §3 | 瀏覽器（localStorage） |
| 7 | 標籤分布 | 前 10 個：78px 右對齊名稱 + 9px 軌長條 + 計數；點了 → `/notes?tag=…` | build 期 |
| 5 | 待生成 @ai-visualize 標記 | 前 6 篇 dense 列（黃點 + 標題 + 資料夾 + warn pill）+「查看完整 AI 佇列 →」 | build 期 |

**時間相關（Q10）**：

- 一律以 **`updatedAt`** 為準，文案寫「更新」。現有以 `createdAt` 計的「本週新增／本月新增」KPI **取消**
- 用 Task 60 的 `wb-time.ts`：`withinDays()`、`weekBuckets(dates, 8)`。**週窗以今天為終點**，不是 prototype 的「最新一篇」
- **首次繪製以「—」佔位、長條圖畫 8 根 0 高的軌**，hydrate 後才填值。伺服器沒有「今天」，硬算會 hydration mismatch
- 長條圖是純 `<div>`，**不引入 recharts**（prototype 也是 div；8 根長條不值得一個圖表庫）
- 移除 [src/pages/index.astro](../../src/pages/index.astro) 寫死的 `const TODAY = "2026-06-12"`

**不再顯示**「已生成簡報 N／總數」（Q15b 定案：拿掉，不搬到別處）。`allDeckSlugs()` 的引用一併移除。

「最近更新」與「待生成標記」的列：單擊開 Drawer、雙擊開啟、列尾有常駐「開啟」圖示（規格 §8.2.1）。

### 3. 系列進度 widget（Q15a，作者提出的按鈕）

```
■ AI 顧問陪跑筆記系列             2/5
▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░
繼續讀：Workshop 0625       (繼續閱讀)
```

| 系列狀態 | 第三行左側 | 右側按鈕 |
| --- | --- | --- |
| 進行中 | 「繼續讀：<下一章標題>」 | `.wb-mini`「繼續閱讀」 |
| 未開始 | 「第一章：<首章標題>」 | `.wb-mini`「開始閱讀」 |
| 已全部讀完 | 「已全部讀完」 | 不顯示 |

- 按鈕是 `<a>`，連到 `seriesProgress().nextSlug` 對應章節的 `href`（下一章是資料檔時連 `/view/…`）
- 點系列其他區域 → `/series/<id>`
- **DOM 同規格 §8.2.1**：每個系列是容器，內含並排的主區域 `<button>`（或 `<a>`）與「繼續閱讀」`<a>`，**不巢狀**
- 左側文字單行省略；按鈕 `flex:none`
- 排序：**進行中 → 未開始 → 已讀完**；進行中者依完成度高到低，其餘依 `series.json` 順序
- 首次繪製用 `seriesProgress(slugs, false)`（全部未開始、**不顯示按鈕**），hydrate 後才套真實進度與排序；監聽 `READING_EVENT`
- 零章節的系列略過（與現行 `index.astro` 一致）

刪除 `src/components/islands/ContinueReading.tsx`。

### 4. 「本週」Tab

flush 列表：近 7 日更新的筆記，依 `updatedAt` 倒序，用 `NoteRow`。瀏覽器端過濾；首次繪製顯示空狀態骨架而不是「沒有筆記」。
空結果：「近 7 日沒有更新的筆記」。

### 5. 「AI 佇列」Tab

每篇一個黃色 group header（`--gc: var(--wb-warn)`，計數 = 該篇待生成數，右側路徑）；
下方每個待生成標記一列：黃點 + marker id + prompt（單行省略）+ type pill +「待生成」。
點 group header → 開啟該筆記。全部生成完時顯示「沒有待生成的標記」。

### 6. 清理

`src/lib/notes.ts` 的 `buildDashboardStats()` 與 `DashboardStats` 型別已無呼叫者，刪除。

## 要改的既有檔案

`src/pages/index.astro`（整頁重寫）、`src/lib/notes.ts`。刪除 `ContinueReading.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 相對量不寫死 | 把系統日期往後調 10 天 | 重整（不重 build） | 「近 7 日更新」與長條圖跟著變 |
| 無 hydration 警告 | dev | 開 Dashboard 看 console | 沒有 mismatch 警告 |
| 週窗終點是今天 | 最近一篇筆記是 3 週前更新 | 看長條圖 | 最右 3 根為 0，不是把那篇放在最右 |
| 繼續閱讀直達 | 某系列讀到第 3 章 | 點「繼續閱讀」 | 直接進第 3 章（不是系列詳情頁） |
| 下一章是資料檔 | 同上但下一章為 `view:` | 點按鈕 | 進 `/view/…` |
| 讀完不顯示 | 某系列全部已完成 | — | 顯示「已全部讀完」、沒有按鈕、排在最後 |
| 排序 | 三個系列分別為讀完／未開始／進行中 | — | 順序為進行中、未開始、讀完 |
| HTML 合法 | — | 檢查系列項目的 DOM | 連結與按鈕不巢狀 |
| Drawer 可用 | — | 單擊「最近更新」的列 | Drawer 開啟；Network 出現一次 `wb-index.json` |
| Tab 進網址 | — | 切到 AI 佇列後重整 | 仍在 AI 佇列 |
| 簡報數已移除 | — | 找「簡報」字樣 | Dashboard 上沒有 |
| 響應式 | 視窗 1180／800 | — | widget 分別變 span 6／span 12（README §5.1） |

## 依賴

Task 63。

## 實作記錄（2026-09-22）

- inline 的精簡列拿掉 `description` 與標記的 `prompt`；Drawer 走 `useWbIndex()`，載入中顯示骨架 Drawer
- 系列進度 widget：每個系列是 `.wb-series-item` 容器，主區 `<a>` 與「繼續閱讀」`<a>` 並排；`live=false` 時不顯示按鈕
- 實測：週窗最後一格是今天往回 6 天（`weekBuckets` 傳固定 `now` 驗過）；Dashboard 無 hydration 警告（console 裡的是舊 `TagsManager` 頁殘留）；「簡報」字樣 0 筆
