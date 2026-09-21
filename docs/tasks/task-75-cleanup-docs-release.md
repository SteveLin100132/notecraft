# Task 75 — 清理、文件回填、viewer 端對端驗證與發版（v0.7.0）

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §2（去留清單）、§12（viewer 相容性）、§13 P13、§14（風險）。
> 依賴 Task 59–74 全部。對應實作階段 **P13**，本批最後一個。
> Q30 定案：**本 Task 完成後**才把 `feat/workbench-redesign` 併回 `main`。

## 範圍

### 1. 刪除已無引用的舊程式

先以 `grep` 確認零引用再刪，**不要憑清單直接刪**：

| 候選 | 說明 |
| --- | --- |
| `src/components/Card.astro`、`Badge.astro`、`Button.astro` | 開工前各有 1–2 個引用檔（Dashboard、`/notes`、筆記頁）。那些頁面改版後應該歸零；**筆記內文若仍在用就保留** |
| `src/components/TagChip.astro` | 開工前就已是 0 引用 |
| `src/components/AiMarkerCard.astro`、`DownloadButton.astro` | **保留** —— 前者在筆記頁、後者在 MDX 筆記內文裡被使用 |
| 各 Task 標明要刪的 island | `NotesList`、`PagefindSearch`、`ContinueReading`、`DataFilesList`、`RegenerateButton` —— 確認都已刪 |
| `src/styles/global.css` | 舊殼相關規則（`.nc-sidebar`、`.nc-sb-*`、`.nc-mobilebar`、`.nc-hamburger`、`.nc-page-wrap`、`#nc-scrim`、`.nc-dv-*`、`.nc-note-title`）。`.nc-prose`、程式碼塊、`GeneratedFrame`、`VizZoom` 相關的**不動** |
| `src/lib/notes.ts` | `buildDashboardStats()` 與 `DashboardStats`（Task 66 應已刪，複查） |
| `src/pages/dev/[wb].astro` | Task 59 的樣式頁：**保留**（正式 build 不產生，日後調樣式有用） |
| `localStorage` | 舊 key `nc:sidebar` 已無人讀。在 layout 的 pre-paint script 裡 `removeItem` 一次，幾個版本後再拿掉這行 |

`.claude/launch.json` 與 `tailwind.config.mjs` 的未提交修改是本批開工前就存在的、與本批無關 —— **不要順手處理**。

### 2. 文件回填

| 文件 | 要改什麼 |
| --- | --- |
| [CLAUDE.md](../../CLAUDE.md) | ① 目錄結構加 `src/components/wb/`、`src/layouts/WorkbenchLayout.astro`、`src/styles/workbench.css`、`src/lib/workbench.ts`；② 新增「Workbench」一節：殼的切分原則、`id="nc-scroll"` 不可拿掉、列的 DOM 規則（連結與按鈕並排不巢狀）、`?folder=` 用真實路徑不是 slug、路徑顯示不得含絕對路徑；③ dev-only API 清單加 `PUT /api/plugins/:id`、`GET /api/folders` 改為遞迴；④ dev／正式差異清單更新（「⋯」選單、複製生成提示、Plugin Switch）；⑤ Plugin System 一節補 `disabled` 陣列與 `meta.backTo` 約定；⑥ **修正兩句與事實不符的敘述**：`LOCAL_EDIT=1` build 旗標在程式碼裡不存在、「Pre-push hook 跑 `astro build`」實際上沒有這個 hook（`.git/hooks` 只有 sample，也沒有 husky）—— 要嘛刪掉這兩句，要嘛另開任務把它們做出來，由作者決定 |
| [notecraft-prd.md](../notecraft-prd.md) | 用 `/bump-prd` 補 §8.1 的 Phase 條目與 changelog。注意 Phase 4.13–4.15 之前也還欠著（見 tasks README 的註記） |
| [notecraft-plugin-system.md](../notecraft-plugin-system.md) | 補三筆修訂：① Q6「`/notes` 列表：進」→ 移出（本批 Q14）；② §8.2 `meta.backTo` 升格為 app 層約定並限制站內路徑（本批 Q21）；③ §15「仍未做的」把 pagefind 一項劃掉 —— 它其實早已實作。另補 `disabled` 陣列（本批 Q22）到 §5 |
| [notecraft-workbench.md](../notecraft-workbench.md) | 比照 plugin 設計文件 §15，新增「實作後回填」一節：各待驗證項的實測結果、實作中新增的決定、仍未做的。文件狀態改為「已實作（v0.7.0）」。**順手更正 §13 交付節奏那句「pre-push hook 本來就會擋」—— 沒有這個 hook** |
| [README.md](../../README.md)、[CHANGELOG.md](../../CHANGELOG.md) | 截圖、功能列表、v0.7.0 條目。CHANGELOG 要列出**使用者看得到的移除項**：多標籤篩選、排序切換、字數、`/about` 與 `/view` 列表頁（已轉址）、Dashboard 的簡報統計 |
| 各 Task 檔末 | 補「實作記錄」（日期、實際改了什麼、偏離原計畫的理由），比照 Task 49、52 的寫法 |
| 本目錄 [README.md](README.md) | 把本批標為已完成，寫完成摘要 |

### 3. 四個「待驗證」的項目要有結論

| 項目 | 在哪個 Task 驗 | 結論寫到哪 |
| --- | --- | --- |
| viewer 模式下 `entry.filePath` 是否變成一長串 `../` | Task 60 | 規格 §5.2.2 |
| 移除內文 h1 後 pagefind 的標題來源 | Task 69 | 規格 §8.3 |
| 刪掉 `/view` 列表頁後，`/view` 是落到 redirect 還是被 `[...path]` 接走 | Task 73 | 規格 §6 |
| `astro dev` 下改 `plugins.json` 是否即時反映 | Task 71 | 規格 §8.6.1、plugin 設計文件 §15（Q19 遺留項） |

### 4. `package.json`

- `version` → `0.7.0`
- `files`：確認含 `src/components/wb/`（Task 59 已加）。用 `npm pack --dry-run` 列出清單，逐一確認本批新增的檔案都在：
  `src/components/wb/**`、`src/layouts/WorkbenchLayout.astro`、`src/styles/workbench.css`、`src/lib/{workbench,wb-filter,wb-prefs,wb-time,wb-escape,prompts}.ts`、
  `src/pages/{wb-index.json.ts,settings.astro,plugins/**}`、`public/favicon.svg`
- **`public/` 目前不在 `files` 裡** —— favicon 要進 npm 套件就得加；不加的話 viewer 沒有 favicon（不致命，記下決定）
- `plugins/plugins.schema.json` 已改（Task 71）—— 它是以 GitHub raw 網址被 `$schema` 引用的，**推上預設分支就等於發佈**

### 5. viewer 端對端

用一個**不是本專案**的資料夾跑（建議：有巢狀資料夾、資料夾名含空白與大寫、有無 frontmatter 的 `.md`、有 `.notecraft/plugins.json`）：

```bash
npm run viewer:build -- <外部資料夾>
```

| 檢查 | 預期 |
| --- | --- |
| build 成功 | — |
| Sidebar 資料夾樹 | 顯示**真實資料夾名**（含空白與大寫），不是 slug 化後的名字 |
| `?folder=` | 用真實路徑，點得進去、篩得出來 |
| 「無 frontmatter N」chip | 出現、數字正確 |
| 工作區標籤 | 「專案資料夾名／相對路徑」，無 `../`、無絕對路徑 |
| `grep -r "$HOME" dist/` | 0 筆 |
| 複製生成提示（`view` 模式） | 路徑相對於使用者專案根、指得到真實檔案 |
| 樣式 | 沒有「render 得出來但完全沒版面」的狀況（`workbench.css` 是一般 CSS、不經 Tailwind purge，理論上不受影響，仍要看一眼） |
| `view`（dev）與 `serve` 兩種模式 | dev-only UI 只在 `view` 出現 |

### 6. 發版前總檢

```bash
npx tsc --noEmit && npm run build && npm run check-plugins
```

- 全站逐頁走一遍（Dashboard 三個 Tab、`/notes` 四種 view × 各種篩選、筆記頁、系列兩頁、標籤、`/plugins` 兩個 Tab + 資料檔夾、資料檔渲染頁、設定兩個 Tab、簡報、`/about` 與 `/view` 轉址）
- 與 `NoteCraft-Workbench-standalone.html` 並排做最後一次視覺比對；**刻意偏離設計稿之處以規格 §1.3 為準**，不要在這一步「修回」設計稿的樣子
- 大量筆記的體感：複製筆記到 500 篇左右跑一次 build，開 `/notes` 切四種 view、打字搜尋。明顯卡頓就記錄下來另開任務（規格 §12：首版不做虛擬捲動）

### 7. 合併

併回 `main` 前由作者確認。**不要自行 push 或發佈 npm。**

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 無死碼 | — | `npx tsc --noEmit`；grep 已刪元件的檔名 | 通過；0 引用 |
| 舊殼 CSS 已清 | — | grep `nc-sidebar\|nc-mobilebar\|nc-page-wrap\|nc-dv-` 於 `src/` | 0 筆 |
| 發佈不缺檔 | — | `npm pack --dry-run` | §4 列的檔案全在 |
| viewer 可用 | 外部資料夾 | §5 的檢查 | 全過 |
| 無絕對路徑外洩 | `npm run build` | `grep -r "$HOME" dist/` | 0 筆 |
| 官方 store | — | `npm run check-plugins` | 通過 |
| 文件一致 | — | 對照 CLAUDE.md、plugin 設計文件、本批規格 | 三者對 `/notes` 是否含資料檔、`meta.backTo`、`disabled` 的說法一致 |
| 待驗證項皆有結論 | — | 看規格的「實作後回填」 | §3 的四項都有實測結果 |

## 依賴

Task 59–74。
