# Task 73 — 設定與關於 `/settings`、舊網址轉址

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.8、§6（舊網址轉址）、§5.2.2；Q20、Q25、Q29 定案。
> 設計交付 README §5.10；原始碼 `prototype/wb/pt-views2.jsx` 的 `PtSettings`、`PT_FLOW`、`PT_STACK`。
> 依賴 [Task 61](task-61-workbench-shell.md)、[Task 62](task-62-notes-list-toolbar-filters.md)（`wb-prefs.ts`）、[Task 70](task-70-plugins-pages.md)（`/plugins` 存在後才能轉址過去）。
> 對應實作階段 **P11**。

## 範圍

### 1. `src/pages/settings.astro` + `src/components/wb/SettingsView.tsx`

`rail="settings"`。Tabs **設定／關於**，寫進 `?tab=about`。Tab 切換需要 client state、「設定」要讀寫 localStorage，
所以頁首與內容由 island 渲染（`noHeader`）；「關於」的內容全是 build 期資料，以 props 傳入。

### 2. 「設定」Tab：只有兩項（Q29）

group header「工作台」→ 設定列 `.wb-set`（左：label 13px/500 + 說明 11.5px 灰；右：控制項）。

| 項目 | 控制項 | 預設 | 作用 |
| --- | --- | --- | --- |
| 預設 view | segmented：List／Board／Table／Timeline | List | 進 `/notes` 且網址沒帶 `?view=` 時用哪一種；手機一律 List |
| List 預設分組 | segmented：資料夾／系列／標籤／月份 | 資料夾 | List 一開始的分組方式；在 `/notes` 的 Toolbar 切分組時也會回寫這個值 |

- 讀寫走 Task 62 的 `src/lib/wb-prefs.ts`（`localStorage["nc-workbench-prefs-v1"]`，`{ defaultView, groupBy }`）；值無效回預設
- 變更即存，Toast「已儲存」。正式環境同樣可用（純 localStorage）
- SSR 以預設值輸出，hydrate 後才套使用者的值
- 在列表下方加一行 11.5px 灰字：「設定儲存在這個瀏覽器，不會同步到其他裝置。」

**不做**：Tweaks 面板的「列高」（prototype 裡其實沒接上 —— JS 寫了 `--pt-row-h`，但 `pt.css` 沒有任何規則讀它）與「筆記字級」。

### 3. 「關於」Tab

| 區塊 | 內容 |
| --- | --- |
| Stat strip | 筆記／系列／資料檔／待生成標記（黃）。**沒有「簡報」**（Q15b 定案拿掉） |
| group header「工作區」+ metadata 列 | 名稱「NoteCraft 工作台」／工作區路徑 = **`workspaceLabel`**（Q25：相對路徑，不出現本機絕對路徑）／筆記 N 篇／系列 N 個／標籤 N 個／資料檔 N 個／部署「Netlify ・ 靜態建置」／版本 = `package.json` 的 `version` |
| group header「一份筆記的生命週期」+ 流程列 `.wb-flow` | 6 步橫向，文案**照抄** `PT_FLOW`；階段色：作者 `--wb-blue-l`／AI `--wb-gold`／發佈 `--wb-blue-d`；≤860 改縱向 |
| group header「技術選型」+ chip 列 | 文案照抄 `PT_STACK` |

viewer 模式下「部署」那一列不適用（使用者不一定用 Netlify）：有 `NOTECRAFT_NOTES_DIR` 時該列改顯示「模式：notecraftapp viewer」。

現有 [src/pages/about.astro](../../src/pages/about.astro) 的內容若有 `PT_FLOW`／`PT_STACK` 沒涵蓋的有用資訊，併入「關於」Tab；沒有就直接丟棄。

### 4. 舊網址轉址（Q20）

`astro.config.mjs`：

```js
redirects: {
  "/about": "/settings?tab=about",
  "/view": "/plugins",
},
```

build 時替每個舊網址產生一個只含 meta refresh 的極小 HTML。不綁平台：Netlify、viewer 的 `serve`、任何靜態主機都有效。
**不另外在 `netlify.toml` 寫 301 規則**（同一件事不維護兩份）。

刪除 `src/pages/about.astro`。`src/pages/view/index.astro` 已由 Task 70 刪除。
**只影響 `/view` 列表頁本身**；`/view/<路徑>` 渲染頁依 Q19 維持原網址、不轉址。

### 5. 導覽接回來

Rail 的設定鈕：Task 61 暫時連 `/about`，改回 `/settings`。

## 要改的既有檔案

`astro.config.mjs`、`Rail.astro`。刪除 `src/pages/about.astro`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 預設 view 生效 | 設定頁把預設 view 改為 Board | 開 `/notes`（不帶參數） | 直接是 Board |
| 網址優先 | 同上 | 開 `/notes?view=table` | 是 Table |
| 分組回寫 | 在 `/notes` 把分組切成「月份」 | 回設定頁 | 「List 預設分組」顯示月份 |
| 壞資料不炸 | 手動把 `nc-workbench-prefs-v1` 設成 `"{oops"` | 開任一頁 | 用預設值、無例外 |
| 關於頁不洩漏路徑 | `astro build` | grep 本機使用者名稱於 `dist/settings/index.html` | 0 筆 |
| 沒有簡報統計 | — | 看「關於」的 Stat strip | 四格，無「簡報」 |
| **`/about` 轉址（待驗證項）** | build 後預覽 | 開 `/about` | 到 `/settings?tab=about` 且停在「關於」Tab —— 確認帶 query 的目的地能正常運作 |
| **`/view` 轉址（待驗證項）** | 同上 | 開 `/view` | 到 `/plugins`。檢查 `dist/view/index.html` 的內容是 meta refresh，**不是**被 `[...path].astro` 的 rest 路由接走而渲染成資料檔頁或 404 |
| 渲染頁不受影響 | — | 開 `/view/<某資料檔>` | 正常，沒有被轉址 |
| dev 也會轉 | `astro dev` | 開 `/about` | 同樣轉址 |
| viewer | `npm run viewer:build -- <外部資料夾>` | 開「關於」 | 工作區路徑為「專案名／相對路徑」；顯示 viewer 模式而非 Netlify |

## 依賴

Task 61、Task 62、Task 70。

## 若 `/view` 轉址被 rest 路由攔走

`[...path].astro` 的 `getStaticPaths()` 只要不回傳空路徑，靜態 build 就不會產生 `/view/index.html`，redirect 應該會勝出。
若實測不是這樣：保留一個極小的 `src/pages/view/index.astro`，內容只有 meta refresh 到 `/plugins`，並從 `redirects` 拿掉 `/view`。
把實測結果記在實作記錄。

## 實作記錄（2026-09-22）

- **待驗證項③實測**：`dist/view/index.html` 是 redirect 產生的 meta refresh，`[...path]` 沒有接走；`/about` → `/settings?tab=about` 停在「關於」Tab；dev 也轉
- viewer 模式下「部署」列改顯示「模式：notecraftapp viewer」（`viewer` prop 由 `NOTECRAFT_NOTES_DIR` 判斷）
- 實測：預設 view 改 Board 後 `/notes` 直接是 Board、`?view=table` 優先；`nc-workbench-prefs-v1` 設成 `"{oops"` 不炸；`dist/settings/index.html` 無本機使用者名稱
