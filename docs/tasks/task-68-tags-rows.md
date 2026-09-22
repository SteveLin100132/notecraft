# Task 68 — 標籤頁：資料列版面與 inline 改名

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.5、§11。
> 設計交付 README §5.6；原始碼 `prototype/wb/pt-views2.jsx` 的 `PtTagsView`。
> 依賴 [Task 61](task-61-workbench-shell.md)。對應實作階段 **P8** 的後半，可與其他頁面 Task 並行。

## 範圍

### 1. 重寫 [TagsManager.tsx](../../src/components/islands/TagsManager.tsx) 的版面

props（`initial`、`devMode`）不變。**寫入邏輯與確認流程一行都不要動**，只換外觀與觸發點。

- 頁首：標題「標籤」+ pill「N 個標籤」muted；dev-only 新增筆記
- Toolbar：排序 segmented（**使用次數／最近使用／字母序**）+ 搜尋 +「N 個」
- Body flush：
  1. **Stat strip**：標籤／標記次數（所有筆記的標籤總數）／平均每篇
  2. group header「全部標籤」
  3. 每標籤一列：tag icon + 名稱 +「最後使用 y/m/d」+ 96px 使用率條（相對於最大使用次數）+「N 篇」+
     dev-only 的「重新命名」「刪除」mini button（`.wb-mini`；刪除用 `.danger`）

點列（名稱區域）→ `/notes?tag=<名稱>`。**DOM 同規格 §8.2.1 的原則**：列是容器，名稱區是 `<a>`，mini button 是並排的兄弟。

「平均每篇」= 標記次數 ÷ 筆記總數，取一位小數。筆記總數目前不在 props 裡，由 `tags.astro` 多傳一個 `noteCount`。

### 2. inline 改名

按「重新命名」→ 名稱換成 **200px 藍邊輸入框**，自動聚焦並全選。

| 操作 | 結果 |
| --- | --- |
| `Enter`、blur | 提交 |
| `Escape` | 取消，還原 |
| 提交值與原名相同、或 trim 後為空 | 視為取消，不開對話框 |

提交後**不直接寫入**，而是走既有的確認流程（見下）。標籤字串規範照 CLAUDE.md：trim、濾空、同篇內不分大小寫去重。

### 3. 確認流程：沿用既有 `ConfirmDialog`

⚠ Prototype 的刪除用原生 `confirm()`，**不要照抄**。現有 `TagsManager.tsx:352` 的 `ConfirmDialog` 已經有三種情境，全部保留：

| 情境 | 現有行為（保留） |
| --- | --- |
| 重新命名 | 顯示舊名 → 新名、影響 N 篇 |
| 合併（新名稱已存在） | 標題改「合併標籤」、橘色、說明同時含兩個標籤的筆記會去重 |
| 刪除 | danger、**需勾選「我了解…」才能按**、影響 N 篇、「此操作無法復原」 |

寫入走既有 API：`PUT /api/tags/:old`、`DELETE /api/tags/:tag`。**不新增 API。**

`ConfirmDialog` 的外觀本 Task 不改（它是 1000 級的 Modal，不屬於工作台的列語彙），也**留在 `TagsManager.tsx` 裡不搬**。
刪除筆記（`DeleteNoteButton`）有自己的一套對話框與導頁競態處理，兩者不共用，沒有抽出來的理由。

### 4. 正式環境

`devMode` 為 false 時：沒有 mini button、沒有改名輸入框。列仍可點。

## 要改的既有檔案

`TagsManager.tsx`、`src/pages/tags.astro`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 排序 | — | 切三種排序 | 順序分別依使用次數、最後使用日、名稱 |
| 改名 | dev | 重新命名 → 輸入新名 → `Enter` | 開確認對話框；確認後列表更新、受影響筆記的 `updatedAt` 為今天 |
| 合併 | dev，新名稱是既有標籤 | 提交 | 對話框標題為「合併標籤」；確認後兩個標籤合為一個、同篇去重 |
| 取消 | dev | 改名中按 `Escape` | 還原、無對話框、無寫入 |
| 同名 | dev | 改名但沒改內容就 `Enter` | 視為取消 |
| 刪除要勾選 | dev | 按刪除 | 對話框的確認鈕在勾選前是停用的 |
| 正式環境唯讀 | `astro build` 後預覽 | 開 `/tags` | 沒有任何編輯控制 |
| 連到篩選 | — | 點某標籤的名稱 | 進 `/notes?tag=<名稱>` |
| 沒用原生對話框 | — | grep `confirm(` 於 `TagsManager.tsx` | 0 筆 |

## 依賴

Task 61。

## 實作記錄（2026-09-22）

- 寫入邏輯、`ConfirmDialog` 三種情境一行未動；只換版面與觸發點。`IconBtn` 與寫死基準日的 `daysAgo()` 刪除
- 新增 `WorkbenchLayout` 的 `bareBody`（頁首靜態、Toolbar 與 Body 由 island 輸出），標籤頁與系列總覽採用
- 實測：改名 `Escape` 取消無對話框、改名提交開「重新命名標籤」對話框、刪除的確認鈕在勾選前停用；正式 build 的 `/tags` 沒有 mini button
