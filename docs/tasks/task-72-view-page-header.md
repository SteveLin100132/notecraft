# Task 72 — 資料檔渲染頁：換頁首、`meta.backTo` 升格、pagefind 標記搬家

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.7（全節）；Q19、Q21 定案。
> 相關：[notecraft-plugin-system.md](../notecraft-plugin-system.md) §8.2（`meta` 欄位約定）、§15（pagefind 一項實際已完成）。
> 設計交付 README §5.9。
> 依賴 [Task 61](task-61-workbench-shell.md)；「返回」連到 `/plugins`，需 [Task 70](task-70-plugins-pages.md)。對應實作階段 **P10** 的第三部分。

## 這一頁的路由不變

`/view/<路徑去副檔名>`（Q19：維持 plugin 設計文件 Q4 的定案，不採用 README 的 `/plugins/view/[id]`）。
系列識別碼 `view:<路徑>`、既有書籤、資料檔裡的 `meta.backTo` 都不必動。

## 範圍

### 1. 現有頁內 `<header class="nc-dv-head">` 整塊移除，內容分配到新殼

[src/pages/view/[...path].astro](../../src/pages/view/%5B...path%5D.astro)：

| 現有頁內元素 | 去向 |
| --- | --- |
| 「← 資料檔」返回連結 | 頁首返回鍵 → `/plugins` |
| 標題 | 頁首 `h1` |
| 描述 `meta.description` | **Toolbar 左側的說明文字**（`.wb-tb-lbl`）。新頁首沒有描述的位置，而這頁的 Toolbar 本來是空的。沒有描述時 Toolbar 整條不渲染 |
| 「DATA FILE」標記、database icon | 移除；頁首 pill 的 plugin id 已足以辨識 |
| 「<系列名> 第 N 章」按鈕 | 頁首 pill「<系列名> #N」：系列色、**可點**、連到 `/series/<id>`（樣式同 `NoteDrawer` 的系列 pill） |
| 「回到來源筆記」 | 頁首動作 ghost（見 §2） |
| 「以 VS Code 編輯」（dev） | 頁首動作 ghost |
| 頁尾 `ReadingControl`、`DonePrompt`、`SeriesNav`（僅系列章節才有） | **不動**，仍包在一般版心裡、不跟著渲染區出血（Task 52 的既有規定） |

頁首：麵包屑 `NoteCraft / Plugin / <相對路徑>`、`rail="plugins"`、`flush`。
pill：plugin id（預設樣式）+「N 天前更新」muted + 系列 pill（若有）。
「N 天前更新」在瀏覽器算（Q10）：SSR 輸出絕對日期 `y/m/d`，以一小段 inline script 或極小的 island 換成相對時間 —— 不要為此把整個頁首變成 island。

對應的 `.nc-dv-*` CSS 一併刪除。

### 2. `meta.backTo` 正式升格為 app 層約定（Q21）

現況：app **已經**在讀它（`view/[...path].astro:30`），但 plugin 設計文件 §8.2 寫的是「app 不碰」。定案讓文件追上實作，並補一道檢查。

- **只接受站內路徑**：值必須符合 `/^\/(?!\/)/`（單一 `/` 開頭），排除 `//host`、`http(s):`、`javascript:` 等
- 不符者**忽略、不顯示按鈕、build 期印 warn**（指出檔案與值）。不 build fail —— 它不影響頁面能否渲染
- 檢查放在 `src/lib/plugins.ts` 解析資料檔時做；`ResolvedDataFile` 多一個已驗證的 `backTo?: string`，頁面**不再自己去挖** `file.data.meta`
- 任何 plugin 的資料檔都能用，plugin 的 schema 不必特別宣告它

> 為什麼要限制：現有程式把值原封不動放進 `href`，`javascript:` 開頭的字串點下去會執行。
> 資料檔是作者自己寫的、風險低，但檢查只要一行；而且按鈕寫的是「回到來源**筆記**」，連到站外本來就文不對題。

### 3. pagefind 標記要跟著搬（**這一項最容易漏**）

現況已經正確：`data-pagefind-body` 標在頁內 `<header class="nc-dv-head">` 上（`view/[...path].astro:62`），
所以渲染出來的上千個欄位名本來就不進索引。（plugin 設計文件 §15 把這件事列為「未做」是過時的。）

風險剛好相反：**這個 `<header>` 移除後標記會跟著消失**。pagefind 因為筆記頁用了 `data-pagefind-body`，
目前處於「只索引有標記的區塊」模式 —— **沒有標記的頁面整頁不進索引**，資料檔頁會從全文搜尋裡整個消失。

做法：`WorkbenchLayout` 加 `indexHeader?: boolean`。為真時在頁首標題元素與 Toolbar 說明文字上各標 `data-pagefind-body`
（pagefind 允許同頁多個），並在 `h1` 上標 `data-pagefind-meta="title"`。**只有 `/view/*` 傳這個 prop。**
渲染區（`PluginHost`）不標。

### 4. 順帶確認

- `PluginErrorCard` 顯示的檔案路徑已是相對 notesDir，不動
- 已停用 plugin 的資料檔不會有這一頁（Task 71）；若 Task 71 尚未做，本 Task 不受影響

## 要改的既有檔案

`src/pages/view/[...path].astro`、`src/lib/plugins.ts`、`src/lib/plugin-types.ts`（`ResolvedDataFile.backTo`）、`WorkbenchLayout.astro`（`indexHeader`）。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 網址不變 | 既有書籤 `/view/schema-demo.er` | 開啟 | 正常渲染 |
| 標題不重複 | — | 數 `h1` | 1 個 |
| 描述位置 | 資料檔有 `meta.description` | — | 出現在 Toolbar 左側；沒有描述的資料檔沒有 Toolbar |
| 系列 pill | 資料檔屬於某系列第 3 章 | 看頁首 | pill「<系列名> #3」；點了進系列詳情頁 |
| 站內 `backTo` | `"backTo": "/notes/80-field-inventory"` | — | 按鈕出現、可點 |
| 站外 `backTo` | `"backTo": "https://example.com"` | build | 無按鈕；build 印 warn、仍成功 |
| 危險 `backTo` | `"backTo": "javascript:alert(1)"` | build 後檢查 HTML | 整份 HTML 找不到該字串 |
| 協定相對 | `"backTo": "//evil.example"` | build | 視為不符、忽略 |
| **搜得到資料檔** | `npm run build` 後預覽 | Palette 全文搜尋資料檔的標題或描述裡的詞 | 出現該資料檔頁，標題正確 |
| **搜不到欄位名** | ER 圖資料檔含欄位 `company_city_id` | 全文搜尋該欄位名 | 沒有結果 |
| 相對時間 | — | 看「N 天前更新」 | 隨系統日期變動，不是 build 當下的值 |
| 系列導覽仍在 | 系列章節的資料檔 | 捲到頁尾 | `ReadingControl`、`DonePrompt`、`SeriesNav` 照常，寬度是一般版心 |
| 官方 plugin | — | `npm run check-plugins` | 通過 |

## 依賴

Task 61；`/plugins` 連結需 Task 70（未完成前可先連 `/view`）。

## 實作記錄（2026-09-22）

- `readMeta()` 多回 `backTo`；四種值實測：站內路徑出按鈕、`https:`／`javascript:`／`//host` 皆無按鈕、build warn、HTML 內找不到該字串
- 「N 天前更新」用極小的 `RelativeTime` island，不把整個頁首變成 island
- `.nc-dv-stage` 的 `min-height` 改 `100%`（原本以視窗高扣頁首算，殼變了不準）
- pagefind 實測：資料檔頁的標題與描述搜得到（「拖曳」命中描述），欄位名 `company_city_id` 搜不到；「無限畫布」搜不到是 pagefind 對中文分詞的既有行為
