# Task 62 — `/notes`：List view、Toolbar、篩選與網址參數

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.2、§8.2.1、§6（路由與網址更新規則）；Q3、Q4、Q8、Q11、Q14、Q27 定案。
> 設計交付 README §3.5（Toolbar）、§4（資料列語彙）、§5.2（List）；原始碼 `prototype/wb/pt-views.jsx` 的 `PtList`、
> `pt-shell.jsx` 的 `PtToolbar`、`pt-app.jsx` 的過濾邏輯。
> 依賴 [Task 61](task-61-workbench-shell.md)。對應實作階段 **P4** 的前半。

## 範圍

### 1. `src/components/wb/NotesWorkbench.tsx`（新增，取代 `NotesList.tsx`）

**一個 island** 管頁首 Tab、Toolbar、view、選取（Drawer 由 [Task 63](task-63-note-drawer.md) 接上）。
頁面以 `<WorkbenchLayout noHeader flush>` 掛它，`client:load`，props 是 `WbNoteRow[]` + 系列清單（供標題與「僅筆記」提示用）。
**不再傳資料檔**（Q14 定案移出）。

本 Task 只做 **List**；頁首 Tab 四個都畫出來，但 Board／Table／Timeline 暫時顯示「此 view 於 Task 64 實作」的空狀態。

### 2. 篩選：網址 → 狀態

`output: 'static'` 下 build 期看不到 query，全部由 client 讀 `location.search`：

| 參數 | 意義 |
| --- | --- |
| `folder=<路徑>` | 路徑前綴比對，含所有子孫；`a/b` 不可誤中 `a/bc`（比對 `folder.join("/")` 等於它或以它加 `/` 開頭） |
| `series=<id>` | 該系列的筆記章節 |
| `tag=<名稱>` | 既有參數，原樣保留；標籤頁、筆記頁 chip、Dashboard 都連到它 |
| `pending=1` | AI 標記佇列（有待生成標記的筆記） |
| `hasAi=1`、`nofm=1`、`fav=1` | 其餘三顆 chip |
| `view=list\|board\|table\|timeline` | 小寫；未帶或無效 → 設定頁的預設 view |

把「query → 過濾後的 rows」寫成純函式放 `src/lib/wb-filter.ts`（`parseQuery`、`applyFilters`、`groupRows`），
island 只負責接線。這幾個函式之後 Dashboard 的「本週」「AI 佇列」Tab 也會用到。

**網址更新規則**（Q3）：island 內切 Tab、切 chip 用 `history.replaceState`，不堆疊歷史。
**搜尋字串與分組方式不進網址**。

### 3. 頁首

- 麵包屑 `NoteCraft / 筆記 / <篩選名>`
- 標題 = 目前篩選：全部筆記／資料夾最後一段／系列名／`#標籤`／AI 標記佇列
- pill：「N 篇」muted；待生成總數 > 0 時「待生成 N」warn
- **以系列篩選時**多一顆 muted pill「僅筆記」；Toolbar 左側說明改為「此系列另有 M 個資料檔章節」+「系列總覽 →」連到 `/series/<id>`。M 為 0 時兩者都不顯示
- dev-only「＋ 新增筆記」

### 4. Toolbar（由左到右）

```
分組 [資料夾|系列|標籤|月份]  │  (含 AI 標記)(待生成 N)(無 frontmatter N)(收藏 N)        [搜尋框]  N 篇
└ 只在 List 出現 ────────────┘  └ 四種 view 都有 ─────────────────────────────┘
```

- 「無 frontmatter N」與「收藏 N」**計數為 0 時不顯示**（Q8、Q11）
- 收藏讀既有 `src/lib/favorites.ts`（key `nc:favorites`，不動）。SSR 一律當 0，hydrate 後才出現；監聽 `FAVORITES_EVENT`
- 搜尋：標題 + 路徑 + 標籤的小寫子字串比對，只過濾當頁
- 分組切換時回寫偏好（見 §6）

### 5. List

- 分組 key：資料夾 → 頂層資料夾名（根目錄的筆記歸「根目錄」，**永遠排最前**）；系列 → 系列名／「未歸入系列」；
  標籤 → **第一個標籤**／「未加標籤」（一篇只出現在一組）；月份 → `updatedAt` 的 `YYYY / MM`
- group header（README §4）：caret、icon、名稱、計數膠囊、右側「已生成 x ・ 待生成 y ・ 最後更新 m/d」；可收合
- `--gc`：資料夾分組 `--wb-blue-l`（根目錄 `--wb-mute`）；系列分組用系列色；其餘 `--wb-ink-3`
- 組內依 `updatedAt` 倒序

### 6. 列（規格 §8.2.1，**照那一節的 DOM 結構做**）

```html
<div class="wb-row [sel]">
  <button class="wb-row-main">icon · 標題 · 路徑 · 標籤欄 · AI pill · 日期</button>
  <a class="wb-row-open" href="/notes/<slug>" aria-label="開啟筆記：<標題>">→</a>
</div>
```

| 操作 | 結果 |
| --- | --- |
| 單擊 | 切換選取（本 Task 只改 `.sel` 樣式；Drawer 在 Task 63） |
| 雙擊、`Enter` | 開啟筆記 |
| `⌘/Ctrl`+單擊、中鍵 | 新分頁開啟 |
| `Space` | 切換選取 |
| `↑` `↓` | 在列之間移動焦點，跨群組、跳過收合的群組 |
| 點「開啟」圖示 | 開啟筆記（真連結，原生行為全有） |

「開啟」圖示**常駐**：24×24、`arrow-right` 14px、平常 `--wb-ink-3` + `opacity:.55`、hover 變 `--wb-blue-l`。
**連結不可包在按鈕裡**。AI pill 的四態規則照 README §4（`PtAiPill`）。

做成 `src/components/wb/NoteRow.tsx`，`dense` prop 供 Dashboard 用。

### 7. 偏好 `src/lib/wb-prefs.ts`

`localStorage["nc-workbench-prefs-v1"]`，形狀 `{ defaultView, groupBy }`；讀不到或值無效回預設（`list`、`folder`）。
本 Task 只有讀與「切分組時回寫」；設定頁 UI 在 [Task 73](task-73-settings-about-redirects.md)。

### 8. 首屏閃動

靜態 HTML 畫的是「全部筆記」，hydrate 後才套篩選。layout 的 pre-paint script 在 `location.search` 非空時
於 `<html>` 加 `data-wb-filtering`，CSS 先把列表區塊 `visibility:hidden`，island hydrate 完移除該屬性。
沒有 query 時不做任何事，SSR 內容直接可見。

## 要改的既有檔案

[src/pages/notes/index.astro](../../src/pages/notes/index.astro)（改傳 `WbNoteRow[]`、移除資料檔與 `PagefindSearch`）。
刪除 `src/components/islands/NotesList.tsx`。`PagefindSearch.tsx` 由 Task 65 刪。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 資料夾前綴比對 | 有 `a/b/` 與 `a/bc/` 兩個資料夾 | `?folder=a/b` | 只出現 `a/b` 底下（含子孫）的筆記 |
| 舊連結仍有效 | — | 開 `/notes?tag=PM` | 只列該標籤的筆記，標題顯示該標籤 |
| 參數可組合 | — | `?folder=private&pending=1` | 交集 |
| 不堆疊歷史 | 從 Dashboard 進 `/notes`，切三次 chip | 按瀏覽器上一頁 | 直接回 Dashboard |
| 系列篩選提示 | 某系列含 1 個資料檔章節 | `?series=<id>` | 「僅筆記」pill 出現、說明寫「另有 1 個資料檔章節」、連結可回系列詳情 |
| 資料檔不在列表 | 專案有資料檔 | 開 `/notes`，試各種分組 | 沒有任何資料檔列 |
| 收藏 chip | 沒有收藏 | — | chip 不存在；收藏一篇後出現「收藏 1」 |
| 根目錄置頂 | 分組＝資料夾 | — | 「根目錄」是第一組 |
| 鍵盤 | 焦點在某列 | `Enter`／`Space`／`↓` | 開啟／選取／移到下一列 |
| 新分頁 | — | `⌘`+點列、右鍵點圖示 | 新分頁開啟；右鍵選單有「複製連結網址」 |
| HTML 合法 | — | 檢查 DOM | `<a>` 與 `<button>` 是兄弟，不巢狀 |
| 無首屏閃動 | `?folder=private` | 重整並錄影逐格看 | 不會先閃一下全部筆記 |

## 依賴

Task 61。建議**先做 [Task 65](task-65-command-palette.md)**：本 Task 會把 `PagefindSearch` 從 `/notes` 拿掉，
全文搜尋要等 Palette 才回來，先做 65 就沒有空窗。

## 不做

多標籤同時篩選、排序欄位／方向切換（現有 `NotesList` 有、新設計沒有，規格 §8.2 定案不保留）。
