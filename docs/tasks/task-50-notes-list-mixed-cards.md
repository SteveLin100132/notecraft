# Task 50 — `/notes` 列表的資料檔卡片（混排）

> 設計交付 [design_handoff_plugin_system](../prototype/design_handoff_plugin_system/) §4；
> 規格 [§7.5](../notecraft-plugin-system.md)（Q6 定案：進 `/notes` 列表）。
> 依賴 [Task 47](task-47-plugin-build-resolution.md)。

## 為什麼要有這一步

Q6 定案資料檔與筆記混在同一份列表。難的不是渲染，是**讓它一眼可辨、又不像次等的附件**。

## 範圍

與筆記卡片**同節奏**（左上 42×42 icon 方塊 → 標題 → 兩行摘要 → 底部一列），只換三處：

| 位置 | 筆記 | 資料檔 |
| --- | --- | --- |
| icon 方塊 | `--blue-50` 底 / `--blue-700` 色 / `FileText` | `--orange-50` 底 / `--orange-600` 色 / `Database` |
| 右上徽章列 | 時間 + 閱讀進度 + `@ai-visualize` 標記數 + 收藏星 | 「資料檔」膠囊（`--orange-50`/`--orange-600`）+ 時間 |
| 底部一列 | `TagRow` 標籤 | `--surface-sunken` 底、`--radius-md` 的 mono 路徑列（左路徑、右 plugin id） |

**mono 是筆記卡片完全沒有的質地，掃視時最快的訊號** —— 這是設計交付選它的理由，不要換成純文字。

格狀與清單兩種檢視都要做。

### 頁面副標

`pages/notes/index.astro:43` 目前寫「N 篇筆記 · 預設依更新時間倒序」。
資料檔混進列表後這個數字與量詞都不再準確，需一併調整
（建議「N 篇筆記、M 個資料檔」，實作時定）。

> 這與 [Task 52](task-52-series-entry-integration.md) 的「篇」→「章」是不同的事：
> 那裡改的是**系列**的量詞，這裡是筆記列表多了一種東西要數。

### 排序與篩選

- 排序用檔案 **mtime**，與筆記的 `updatedAt` 同軸排序
- **套用標籤篩選時資料檔退出列表**（它們沒有 tags）—— 不是灰掉、是不出現
- 搜尋比對：資料檔比對 `title` + `description` + 路徑；筆記維持既有欄位

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 混排可辨 | 列表含筆記與資料檔 | 檢視格狀 | 資料檔為橘系 icon + mono 路徑列，一眼可分 |
| 兩種檢視都有 | 同上 | 切換清單檢視 | 資料檔列同樣可辨，版面不破 |
| 標籤篩選排除 | 點任一標籤 | 列表更新 | 只剩該標籤的筆記，資料檔全部不出現 |
| 同軸排序 | 資料檔 mtime 最新 | 依更新時間排序 | 資料檔排在最前 |
| 無資料檔零影響 | 專案無 `plugins.json` | 開 `/notes` | 與現況完全相同 |

## 依賴

Task 47。

## 風險

低。但 `NotesList.tsx` 是既有的大 island，卡片型別要從 `NoteCardData` 擴成聯集，
注意排序 / 篩選 / 搜尋三處的分支都要照顧到，別讓資料檔在某條路徑上被當成筆記存取 `tags`。

## 實作記錄（2026-09-18）

`NotesList.tsx` 的卡片型別改成 `ListItem` 聯集（`{kind:"note"}` | `{kind:"data"}`），
新增 `DataCardGrid` / `DataCardList`；`pages/notes/index.astro` 傳入 `dataFiles`。

- 沒有把兩種資料硬湊成同一個型別 —— 欄位差太多（資料檔沒有 tags / markers / series /
  createdAt），用 `kind` 分支比塞一堆 optional 清楚
- 排序改走 `compareItems`：資料檔兩個時間欄位都用檔案 mtime；依系列排序時排在最後
- 套用標籤篩選或「只看收藏」時資料檔**不出現**（不是灰掉）—— 那些維度對它們不存在，
  灰掉會讓人以為「這些沒有該標籤」
- 副標改成「N 篇筆記、M 個資料檔」（只在有資料檔時）
