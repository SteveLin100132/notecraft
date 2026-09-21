# Task 67 — 系列總覽與系列詳情：改為資料列版面

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.4；Q7、Q14 定案；plugin 設計文件 §7.6（資料檔章節一視同仁）。
> 設計交付 README §5.4、§5.5；原始碼 `prototype/wb/pt-views2.jsx` 的 `PtSeriesList`／`PtSeriesDetail`。
> 依賴 [Task 61](task-61-workbench-shell.md)。對應實作階段 **P8** 的前半，可與 Task 62–66 並行。

## 範圍

### 1. 系列總覽 `/series`

重寫 [SeriesOverview.tsx](../../src/components/islands/SeriesOverview.tsx)（410 行 → 資料列版面）。props 形狀**不變**，
`src/pages/series/index.astro` 只需換 layout 參數。

- 頁首：標題「系列」+ pill「N 個系列」muted；dev-only 新增筆記
- Toolbar：說明「依閱讀進度追蹤的章節集合，點一列進入詳情」+ 搜尋（比對系列名）+「N 個」
- Body flush：
  1. **Stat strip**：系列／章節總數／已完成（綠）／整體進度 %
  2. group header「全部系列」
  3. 每系列一列：swatch（系列色）+ 名稱 +「N 章 ・ 已完成 M」+ 96px 進度條 + `NN%`（38px 欄）+ 狀態 pill 54px
     （已讀完 ok／進行中 default／未開始 muted）。整列是 `<a href="/series/<id>">`

**移除**：封面色塊卡片 grid、排序下拉、狀態篩選 pills。
單位用「**章**」不用「篇」（Task 52 的既有定案：一章可以不是文章）。

進度在 localStorage：首次繪製用 `seriesProgress(slugs, false)`，hydrate 後更新；監聽 `READING_EVENT`。
零章節的系列照現行規則略過。

### 2. 系列詳情 `/series/<id>`

重寫 [SeriesDetail.tsx](../../src/components/islands/SeriesDetail.tsx)。

- 頁首：返回鍵（→ `/series`）、麵包屑 `NoteCraft / 系列 / <名>`、pill「done/total 已讀」muted + `NN%` ok；
  動作「在筆記列表中篩選」ghost → `/notes?series=<id>`
  - pill 的數字靠 localStorage，這一頁的頁首因此由 island 渲染（`noHeader`），用 `WbHeader`
- Body flush：
  1. Stat strip：章節／已完成（綠）／閱讀中（藍）／未開始／進度
  2. **進度帶** `.wb-sumbar`：220×6 進度條 +「下一章：<標題>」（全讀完顯示「已全部讀完」）+「重設進度」ghost
  3. group header「章節」，右側說明「資料檔頁與筆記一視同仁，都計入進度」
  4. 章節列

**章節列**：序號（20px 右對齊）+ doc icon（資料檔為 `--wb-gold`）+ 標題 + 路徑 +「資料檔」chip（若是）+
狀態 pill 54px + **單鍵推進 mini button**。

| 目前狀態 | pill | 按鈕文字 | 按下後 |
| --- | --- | --- | --- |
| 未開始 | muted「未開始」 | 開始閱讀 | → 閱讀中 |
| 閱讀中 | default「閱讀中」 | 標記完成 | → 已完成 |
| 已完成 | ok「已完成」 | 重設 | → 未開始 |

- 直接呼叫既有 `setReadingStatus(ref, next)`。**key 用章節的 `ref` 原字串**（資料檔含 `view:` 前綴），否則筆記 `a/b` 與資料檔 `view:a/b` 會撞同一格
- 點列 → 依 `kind` 進 `/notes/<slug>` 或 `/view/<路徑>`。這一頁**沒有 Drawer**，單擊即導覽
- **DOM**：prototype 把 mini button 塞在 `role="button"` 的列裡（互動元素巢狀）。照規格 §8.2.1 的原則改成容器內並排：
  `<div class="wb-row"><a class="wb-row-main" href="…">…</a><button class="wb-mini">…</button></div>`
- 路徑顯示用 Task 60 的相對路徑（筆記是 `path`、資料檔是 `relPath`），**不要**像 prototype 那樣硬拼 `src/content/notes/<id>.mdx`
- 「重設進度」沿用 `resetSeriesProgress()`；現有的確認流程若有就保留

**移除**：hero 色塊。

**這一頁完整混合顯示筆記與資料檔** —— 作者於 Q14 明確要求保留。資料檔移出的只有 `/notes` 列表。

### 3. 不動的東西

`src/lib/series.ts`、`src/lib/reading-progress.ts`（文案已在 Task 64 改）、`seriesShared.tsx` 裡仍被 `SeriesNav` 用到的部分、
筆記頁與資料檔頁底部的 `SeriesNav`。重寫後 `seriesShared.tsx` 若有只被舊版面用到的匯出，順手刪掉（以 `tsc` 的未使用檢查為準）。

## 要改的既有檔案

`SeriesOverview.tsx`、`SeriesDetail.tsx`、`src/pages/series/index.astro`、`src/pages/series/[id].astro`、可能 `seriesShared.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 總覽數字正確 | 兩個系列，分別完成 2/5 與 0/3 | 開 `/series` | Stat strip：系列 2、章節 8、已完成 2、整體 25% |
| 單鍵推進 | 某章未開始 | 連按三次 mini button | 依序變閱讀中 → 已完成 → 未開始；pill 與 Stat strip 同步 |
| 按鈕不觸發導覽 | — | 點 mini button | 留在本頁 |
| 資料檔章節 | 系列含 `view:` 章節 | 開詳情頁 | 該列金色 icon +「資料檔」chip；點了進 `/view/…`；計入分母 |
| key 不相撞 | 同時存在筆記 `planning/schema` 與資料檔 `view:planning/schema` | 把資料檔章節標為已完成 | 筆記那一章仍是未開始 |
| 下一章 | 讀到第 3 章 | 看進度帶 | 「下一章：<第 3 章標題>」 |
| 重設 | — | 按「重設進度」 | 全部回未開始 |
| 跨頁同步 | 在 Board 把某章拖到已完成 | 回到詳情頁 | 狀態一致 |
| 篩選連結 | — | 按「在筆記列表中篩選」 | 進 `/notes?series=<id>`；系列含資料檔時出現「僅筆記」pill（Task 62） |
| HTML 合法 | — | 檢查章節列 DOM | `<a>` 與 `<button>` 並排、不巢狀 |
| 無 hydration 警告 | dev | 看 console | 無 |

## 依賴

Task 61。「篩選連結」那一項的完整效果需要 Task 62，但不擋本 Task。
