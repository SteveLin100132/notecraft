---
Project Name: NoteCraft — 多個工作區同時執行（每個工作區獨立的執行目錄）
文件類型: Design Document
文件版本: v0.1.0
開發模式: Waterfall
技術選型: 確定 —— 沿用既有技術棧，不新增依賴
文件狀態: 已實作（notecraftapp v1.16.0，Task 157–160，2026-11-16）—— §11 的 7 題已全數確認；實作後回填見 §13（Windows 實機待驗證）
文件作者: 建宇
建立日期: 2026-11-16
更新日期: 2026-11-16
依賴文件: docs/notecraft-npx-viewer.md（`~/.notecraft/app-<version>/` 執行位置）、docs/notecraft-npx-viewer-v2.md（`userCwd`／`notesDir`、快取、watcher）、docs/notecraft-ignore-config.md（content-layer guard、隱私保證）
分支: fix/multi-instance
目標版本: notecraftapp 1.16.0（Q6 已定）
---

# NoteCraft — 多個工作區同時執行 設計文件

作者回報：同時啟動兩個 NoteCraft 專案（兩個不同的筆記資料夾），即使 port 不同，畫面也不正確。

本文先記錄重現與根因（§1、§2），再比較修法（§4），最後給出建議方案的細節（§5 起）：**每個筆記資料夾有自己的一份執行目錄（run root）**，Astro 與 Vite 的狀態檔各自獨立；`node_modules` 仍共用一份。

---

## 1. 重現（2026-11-16）

環境：`npm pack` 出的 notecraftapp 1.15.0（Astro 5.18.2），以 `NOTECRAFTAPP_DEV=1` 直接從解開的目錄執行，Node 22.16，macOS。

兩個工作區的內容、`ignore.json`、`plugins.json` 都不同：

| | wsA | wsB |
| :-- | :-- | :-- |
| 筆記 | `note-A1`～`A3` | `note-B1`～`B3`、`subB/secret-B` |
| `ignore.json` | `subA/` | `note-B3.mdx` |
| `plugins.json` | `{"plugins":[]}` | `{"plugins":[],"disabled":["er-diagram-renderer"]}` |

| 流程 | 步驟 | 結果 |
| :-- | :-- | :-- |
| dev（`view`） | 先開 A（4401），確認顯示 A1～A3；再開 B（4402） | **4401 也變成 B 的筆記**，`/notes/note-a1` 404 |
| dev | 接著修改 wsA 的一篇筆記 | **兩個 port 都變回 A 的筆記**，`4402/notes/note-b1` 404。誰最後寫入，兩邊就都顯示誰的 |
| serve | 兩個同時 `serve --rebuild --no-open`（4411／4412） | **兩邊產物都是 B 的筆記**；A 的 `~/.notecraft/cache/<A>/dist` 與 `wb-index.json` 含 B 的全文 |
| serve | 關掉後只重啟 A（不加 `--rebuild`） | 「快取有效，跳過 build」，**仍顯示 B 的筆記**：污染過的快取會一直留著 |

附帶：B 啟動時 log 出現 `Re-optimizing dependencies because vite config has changed`（共用的 Vite 依賴快取被改寫）。這次瀏覽器測試 A 的 island 正常，未觀察到壞掉，列為潛在風險。

---

## 2. 根因

所有工作區的 astro 子行程都以**同一個 app 根目錄**（`~/.notecraft/app-<version>/`）為 cwd 與 Astro `root`：

- `bin/notecraftapp.mjs` 的 `view`：`spawn(…, { cwd: packageRoot })`（L736）
- `runAstroBuild`：`spawn(…, { cwd })`，呼叫端傳的是 `packageRoot`（L393–394、L758、L804、L820）

而 Astro 的 content layer 狀態檔放在 root 底下、不分筆記資料夾：

| 狀態 | 位置 | 誰讀寫 | 出處（astro 5.18.2） |
| :-- | :-- | :-- | :-- |
| dev 的 data store | `<root>/.astro/data-store.json` | 每個 dev server 都 **watch** 這個檔，別人一寫就 invalidate、重讀別人的內容；自己存檔時又把整份 store 寫回去 | `content/content-layer.js:338`（`getDataStoreFile`，dev 用 `dotAstroDir`）、`content/vite-plugin-content-virtual-mod.js:69, 166–177` |
| build 的 data store | `<root>/node_modules/.astro/data-store.json` | 打包階段才讀檔，中途被另一個 build 覆寫就拿到別人的資料 | 同上函式，build 用 `config.cacheDir`（預設 `./node_modules/.astro`）；`virtual-mod.js:135–138` |
| MDX 本文對照表 | `<root>/.astro/content-modules.mjs` 等 | dev 與 build 都用 | `virtual-mod.js` 的 `MODULES_MJS_VIRTUAL_ID` |
| Vite 依賴預打包 | `<root>/node_modules/.vite/` | 兩邊 config 不同（`@notes` alias、`fs.allow`），configHash 不同 → 互相 re-optimize | Vite 預設 `cacheDir` |

`dotAstroDir` 固定是 `new URL(".astro/", config.root)`（`core/config/settings.js:21`），**無法用設定改位置**。

CLI 端的兩個假設也不成立：

- `bin/notecraftapp.mjs:572` 的註解寫「以快取 hash 命名，不同筆記資料夾可並行」—— 只有 outDir（staging）分開了，content layer 的狀態沒有分開
- `shouldRebuild` 只比對檔案與指紋、不驗產物內容，所以被污染的 `dist` 會被當成有效快取（§1 最後一列）

**這個問題先前已被記錄過**：`docs/notecraft-ignore-config.md` §13.3 的已知限制寫到「同一個 app 根底下有另一個 astro 行程同時在跑時，兩者共用 `.astro/data-store.json`」，當時判定為既有行為、未處理，`scripts/fixtures/ignore-dev.mjs` 以觸碰 `ignore.json` 強制重新同步來繞開。本文是它的正式修正。

**隱私面**：A 的產物含 B 的筆記全文，而且 A 的 `ignore-guard` 只依 A 自己的規則檢查，擋不到 B 的檔案。這違反 ignore 設計文件 §6 的「被排除的檔不出現在任何產物」的精神（雖然洩漏的是另一個工作區）。

---

## 3. 目標與非目標

### 3.1 目標

1. 不同筆記資料夾的 `view`／`serve`／`build` 可以**任意組合同時執行**，內容互不影響
2. **同一個**筆記資料夾重複啟動時，給明確的錯誤訊息，而不是安靜地互相覆寫（§6）
3. 升級後**舊快取一律重建一次**，清掉以前多開時可能污染的產物（§8）
4. 既有使用者不需要改任何設定：筆記、`.notecraft/` 都留在原處，升級就生效
5. `node_modules` 不重複安裝（每個工作區多出的磁碟用量控制在數 MB）

### 3.2 非目標

- 主 repo 以 `npm run dev` 開發 app 本身（不經 CLI）—— 行為不變
- 自動清除不再使用的工作區執行目錄（第一版不做，見 §9.3）
- 讓兩個 dev server 共用同一個 Vite 依賴快取以節省時間

---

## 4. 方案比較

| # | 方案 | 做法 | 評估 |
| :-- | :-- | :-- | :-- |
| A | 只改 config 的 `root` | cwd 仍是 app，`root` 指到每個工作區的狀態目錄、`srcDir`／`publicDir` 指回 app | ❌ `entry.filePath` 相對於 `root`，但程式至少 5 處以 `process.cwd()` 解析它（`workbench.ts:73, 91`、`notes.ts:55`、`[...slug].astro:47`）；tsconfig（`@/*` alias）從 `root` 載入（`settings.js:141`）；`import.meta.glob("/src/…")`、`"/plugins/…"` 以 root 為基準。要改的點多且散 |
| B | 整個 root 用 symlink 拼出來 | 每個工作區一個目錄，`src`、`public`、設定檔全是 symlink | ❌ Vite 預設把 symlink 解析成真實路徑，`src` 的模組會落在 root 之外，Astro 的路由與元件 id 可能對不上（未驗證、風險高）；Windows 的**檔案** symlink 需要系統管理員或開發人員模式 |
| **C** | **每個工作區複製一份 app（不含 `node_modules`），`node_modules` 用連結共用** | **`src` 等約 3 MB 是真檔；`node_modules` 是目錄連結（Windows 用 junction，不需權限）；Astro／Vite 的快取指到執行目錄自己的資料夾** | ✅ **建議**。Astro 看到的是一個正常的專案，`process.cwd()` 相關程式都不用改；已 spike 驗證（§10.1） |
| D | 只加鎖，不支援並行 | 同一個 app 根已有別的工作區在跑就拒絕 | ⚠️ 最省事，但作者的需求就是同時開兩個；保留為 C 的一部分（同一工作區重複啟動，§6） |
| E | 每個工作區完整複製含 `node_modules` | | ❌ 每份約 300 MB、每份都要 `npm install` |

---

## 5. 建議方案：每個工作區一份執行目錄

### 5.1 位置與命名（Q2）

```
~/.notecraft/
├── app-1.16.0/                 共用：app 本體與 node_modules（不變）
└── cache/<hash>/               每個筆記資料夾一份（hash 與現行相同）
    ├── meta.json               快取指紋（現有）
    ├── dist/                   serve 的產物（現有）
    └── app/                    新增：執行目錄（run root）
        ├── .nc-run.json        同步戳記（§5.3）
        ├── .nc-state/          Astro cacheDir、Vite cacheDir、build staging、鎖檔
        ├── .astro/             Astro 自己產生（dotAstroDir，現在每個工作區一份）
        ├── node_modules  →     連結到 ~/.notecraft/app-1.16.0/node_modules
        ├── src/ public/ schemas/ skill-template/ …   從 app 複製
        └── package.json astro.config.mjs tailwind.config.mjs tsconfig.json
```

- `<hash>` 沿用 `cacheDirFor()`（`bin/notecraftapp.mjs:152`）：筆記資料夾絕對路徑的 SHA-1 前 12 碼。不需要對照表，每次啟動以路徑重算
- 放在 `cache/<hash>/` 底下的好處：一個工作區的所有東西在同一個資料夾，刪掉它就等於整份重來
- 專案搬家或改資料夾名稱 → hash 改變 → 第一次啟動重新建立（與現行快取行為相同）

### 5.2 哪些東西複製、哪些連結

| 項目 | 處理 | 理由 |
| :-- | :-- | :-- |
| `node_modules/` | **目錄連結**（macOS／Linux：symlink；Windows：junction） | 300 MB、只讀；junction 不需要權限 |
| `package.json` 的 `files` 清單裡其餘項目（`src/`、`public/`、`schemas/`、設定檔…） | **複製** | 約 3 MB；Astro 必須把它們當成 root 底下的真檔 |
| `bin/` | 不需要 | CLI 本身仍從 `app-<version>/bin` 執行 |
| `CHANGELOG.md`、`README.md`、`LICENSE` | 不需要 | 執行期不讀（CHANGELOG 由瀏覽器從 jsDelivr 取） |

複製清單以 `package.json` 的 `files` 為準，再扣掉 `bin/` 等不需要的項目，寫成一個常數，避免日後新增執行期需要的資料夾時漏掉（§10.2 有斷言）。

### 5.3 建立與同步

每次 `view`／`serve`／`build` 啟動時呼叫 `ensureRunRoot(appRoot, cacheDir)`：

1. 讀 `.nc-run.json`：`{ layout: 1, appVersion, appRoot }`
2. 下列任一成立就**重建**：戳記不存在、`layout`／`appVersion`／`appRoot` 不同、`node_modules` 連結不存在或目標不存在、來源是 dev 套件（`NOTECRAFTAPP_DEV=1`，內容可能在版號不變下改動）
3. 重建 = 複製到 `app.next/` → 建連結 → 寫戳記 → 刪掉舊的 `app/` → `rename(app.next, app)`；`.nc-state/` 與 `.astro/` 隨舊目錄一起刪（換版時本來就該重來）
4. 不需重建時直接沿用

升級 app 版本時，各工作區第一次啟動會自動重建執行目錄。

### 5.4 `astro.config.mjs` 的改動

CLI 啟動 astro 時多傳一個環境變數 `NOTECRAFT_RUN_ROOT=1`。只在有這個變數時：

| 設定 | 值 | 理由 |
| :-- | :-- | :-- |
| `cacheDir` | `./.nc-state/astro` | 預設 `./node_modules/.astro` 會穿過連結落回共用的 `node_modules` |
| `vite.cacheDir` | `./.nc-state/vite` | 同上（`node_modules/.vite`） |
| `vite.server.fs.allow` | 另加 `fs.realpathSync("node_modules")` | Vite 把連結解析成真實路徑（`~/.notecraft/app-<v>/node_modules/…`），不在 allow 清單裡會 403。spike 中 dev toolbar 的 entrypoint 就是 403（§10.1） |

沒有這個變數（主 repo `npm run dev`）時行為完全不變。

### 5.5 CLI 的改動

| 位置 | 現在 | 改成 |
| :-- | :-- | :-- |
| `view`（L734–737） | `cwd: packageRoot`、`astroBin` 在 packageRoot | `cwd: runRoot`；`astroBin` 可沿用 packageRoot 的（同一份 node_modules） |
| `runAstroBuild` 呼叫端（L758、L804、L820） | 傳 `packageRoot` | 傳 `runRoot` |
| `buildStageDir`（L573） | `<packageRoot>/node_modules/.notecraft-build/<hash>/` | `<runRoot>/.nc-state/build/`（仍在 astro 的 cwd 底下，`runAstroBuild` 的斷言照舊成立；不再穿過共用的 `node_modules`） |
| L572 的註解 | 「不同筆記資料夾可並行」 | 改成描述實際的隔離方式 |
| `startStaticServer(packageRoot, …)` | | 不變（只用來送 `/notes-assets/*`，以環境變數找 notesDir） |
| `SKILL_TEMPLATE_DIR`、`install-plugin` 讀白名單與 `plugin-types.ts` | packageRoot | 不變（讀 app 本體即可） |

### 5.6 護欄要補的地方

改成 runRoot 之後，`process.cwd()` 不再是 app 本體的路徑，下列護欄會**少檢查一個路徑**，要補上：

- `src/lib/no-local-path-integration.mjs`（L21 的 `roots`）：加入 `fs.realpathSync(path.join(process.cwd(), "node_modules"))` 的上一層（即 `~/.notecraft/app-<v>/`）
- `src/lib/workbench.ts:360` 的 `assertNoAbsolutePath`：同樣加入 app 本體路徑（`.ts` 端不碰 `node:*` 的原則下，路徑由 `defs-state.mjs` 或環境變數提供，實作時決定）
- `src/lib/content-layer-guard-integration.mjs` 的說明文字：「app 根」改成「執行目錄」

---

## 6. 同一個工作區重複啟動（Q3、Q4）

C 方案只隔離「不同」筆記資料夾。同一個資料夾開兩次，兩個行程仍共用同一個執行目錄，會重現原本的問題（而且 serve 的 staging 目錄也相同）。

做法：執行目錄裡放鎖檔 `.nc-state/lock.json`：

```json
{ "pid": 12345, "command": "view", "url": "http://127.0.0.1:4401/", "startedAt": "2026-11-16T06:38:15Z" }
```

- 啟動時若鎖檔存在且該 pid 還活著（`process.kill(pid, 0)`）→ 拒絕啟動，印出：
  `這個筆記資料夾已經在 http://127.0.0.1:4401/ 執行中（view，pid 12345）。要同時開，請先關掉它。`
- pid 已不存在（上次當掉）→ 視為過期，直接覆寫
- 正常結束（SIGINT／SIGTERM／exit）時刪除鎖檔
- `build` 子命令遇到鎖：直接報錯（Q4），不等待

---

## 7. 主 repo 與 dev 套件（Q5）

| 情境 | 判斷 | 建議行為 |
| :-- | :-- | :-- |
| 主 repo（packageRoot 有 `.git`） | 作者在改 app 本身，期望改了 `src` 立即 HMR | **不使用執行目錄**，維持現狀（啟動時印一行提示：主 repo 模式不支援多個工作區同時執行） |
| `NOTECRAFTAPP_DEV=1`（`npm pack` 出的套件、fixture） | 用來驗證 viewer 行為 | **使用執行目錄**，每次啟動都重新同步（§5.3 第 2 點） |
| 一般使用者（`~/.notecraft/app-<v>/`） | | **使用執行目錄** |

---

## 8. 快取作廢與既有使用者

- `buildFingerprint()` 加入 `runRootLayout: 1`。升級後每個工作區的 `dist` 都會重建一次，**清掉以前多開時可能污染的產物**（Q7）
- 舊的 `~/.notecraft/app-<v>/node_modules/.notecraft-build/`、`.astro/`、`node_modules/.astro/`、`node_modules/.vite/` 只屬於舊版本目錄，新版不再使用，不必處理
- 使用者不用改任何東西；筆記資料夾與 `.notecraft/` 都不動

---

## 9. 平台與邊界

### 9.1 Windows

- `node_modules` 用 `fs.symlink(target, link, "junction")`，不需要系統管理員或開發人員模式
- 執行目錄在 `%USERPROFILE%\.notecraft\cache\<hash>\app`，與 app 本體同一顆磁碟；筆記在別的磁碟時，`vite-cross-drive-content.ts` 處理的情境與現在相同（root 與 app 本體同磁碟）
- `fs.realpathSync` 對 junction 會回傳目標路徑，§5.4 的 `fs.allow` 補法同樣適用。**需要在 Windows 實機驗證**（§10.3）

### 9.2 磁碟與時間

- 每個工作區多約 3 MB（spike：3.1 MB），加上各自的 `.nc-state/vite`（依賴預打包，十數 MB）
- 同步只在換版、首次、或 dev 套件時發生，複製 3 MB 不到一秒

### 9.3 不做的事

- 不自動清除舊工作區的執行目錄（專案搬走後留下的 `cache/<hash>/`）。現行 `cache/<hash>/dist` 本來就有同樣狀況，日後若要做 `notecraftapp clean`，兩者一起處理

---

## 10. 驗證

### 10.1 Spike 結果（2026-11-16，scratchpad，不在 repo）

以 1.15.0 套件手動建立兩份執行目錄（複製 app、`node_modules` symlink、astro.config 加 `cacheDir`／`vite.cacheDir`），直接以 `astro dev`／`astro build` 執行：

| 測試 | 結果 |
| :-- | :-- |
| 兩個 dev 同時執行（4421／4422） | A 顯示 A1～A3、B 顯示 B1、B2、secret-B ✅ |
| 兩邊各改一篇筆記 | 各自更新，互不覆蓋；`/notes/note-a1`、`/notes/note-b1` 都 200 ✅ |
| 瀏覽器開 A 的筆記頁 | island 正常 hydrate；**唯一錯誤：dev toolbar entrypoint 403**（真實路徑不在 `fs.allow`，§5.4 已列入修正） |
| 兩個 build 同時執行 | 兩邊 exit 0，產物各自只含自己的筆記；guard 全部通過 ✅ |
| 共用的 `node_modules` | 沒有產生 `.astro`、`.vite` ✅ |

### 10.2 純函式斷言：`scripts/checks/run-root.mjs`

把下列邏輯寫成無副作用的 `.mjs`（例如 `bin/run-root.mjs` 的純函式部分），由 check 直接載入：

- `needsResync(stamp, current)`：戳記比對（版本、appRoot、layout、dev 套件）
- `runRootEntries(pkgFiles)`：從 `package.json` 的 `files` 推出要複製的清單；斷言真實 `package.json` 推出的清單包含 `src/`、`public/`、`astro.config.mjs`、`tailwind.config.mjs`、`tsconfig.json`，且不含 `bin/`
- `lockState(lock, isAlive)`：鎖檔判斷（無鎖、有效、過期）

### 10.3 整合：`scripts/fixtures/multi-instance.mjs [--build]`

沿用 `plugin-empty-states.mjs` 的 `npm pack` ＋ `NOTECRAFTAPP_DEV=1` 方式，自動做完 §1 的情境並斷言：

1. 兩個 `view` 同時啟動，各自只含自己的標記字串；各改一篇後仍正確
2. 兩個 `serve --rebuild` 同時啟動，兩份 `dist` 各自正確；單獨重啟其中一個仍正確
3. 同一個筆記資料夾開第二個 `view` → 非 0 結束且訊息含第一個的網址
4. 結束後無殘留行程、鎖檔已刪

需要幾分鐘，不放進 `check-plugins`。另外在 Windows 實機手動跑一次 1、2（junction 與 `fs.allow`）。

---

## 11. 決策紀錄

以下 7 題已於 2026-11-16 逐題確認，全部採建議選項。

| # | 問題 | 選項 | 建議 |
| :-- | :-- | :-- | :-- |
| Q1 | 修法 | A. 只改 config root　B. symlink 拼 root　C. 每個工作區複製 app、`node_modules` 連結　D. 只加鎖 | ✅ **已定：C**（2026-11-16）—— 已 spike 驗證；`process.cwd()` 相關程式不用改（§4） |
| Q2 | 執行目錄位置 | A. `~/.notecraft/cache/<hash>/app/`　B. `~/.notecraft/roots/<hash>/` | ✅ **已定：A**（2026-11-16）—— 一個工作區的東西集中一處，刪一個資料夾就整份重來 |
| Q3 | 同一個筆記資料夾重複啟動 | A. 拒絕並印出已在執行的網址　B. 允許（後果自負） | ✅ **已定：A**（2026-11-16）—— B 會重現本次的問題 |
| Q4 | `build` 遇到同工作區正在執行 | A. 直接報錯　B. 等待鎖釋放 | ✅ **已定：A**（2026-11-16）—— `view`／`serve` 是長時間執行的，等待沒有意義 |
| Q5 | 主 repo（有 `.git`）是否使用執行目錄 | A. 不使用，維持現狀並提示　B. 也使用 | ✅ **已定：A**（2026-11-16）—— 主 repo 需要改 `src` 即時生效；複製一份會讓 HMR 失效 |
| Q6 | 版號 | A. 1.16.0　B. 1.15.1 | ✅ **已定：A**（2026-11-16）—— 快取配置改變、新增鎖檔行為，不只是 bug fix |
| Q7 | 既有快取 | A. 升級後全部重建一次　B. 只靠版本變更自然失效 | ✅ **已定：A**（2026-11-16）—— 明確寫進指紋，日後不隨版本規則改變而失效 |

---

## 12. 實作切分（決策已定，可拆 Task）

| Task | 內容 |
| :-- | :-- |
| [157](tasks/task-157-run-root-module.md) | `bin/run-root.mjs`：`ensureRunRoot`、鎖檔、純函式；`scripts/checks/run-root.mjs` |
| [158](tasks/task-158-cli-run-root-wiring.md) | CLI 接線（`view`／`build`／`serve` 改用 runRoot、staging 移到 `.nc-state/build`、指紋）；`astro.config.mjs` 的三項設定；§5.6 護欄 |
| [159](tasks/task-159-multi-instance-fixture.md) | `scripts/fixtures/multi-instance.mjs`；Windows 實機驗證 |
| [160](tasks/task-160-multi-instance-docs-release.md) | 文件：CLAUDE.md（「`--outDir` 必須在 astro 的 cwd 底下」改寫成執行目錄、新增本節）、README、官網文件、CHANGELOG、1.16.0；本文 §13 回填 |

## 13. 實作後回填（2026-11-16，notecraftapp v1.16.0，Task 157–160）

### 13.1 與本文不同之處

| 項目 | 本文原寫 | 實際 | 原因 |
| :-- | :-- | :-- | :-- |
| 鎖檔位置（§6） | `<執行目錄>/.nc-state/lock.json` | `~/.notecraft/cache/<hash>/run.lock.json`（執行目錄外） | 要先拿到鎖才能重建執行目錄，而重建會整個刪掉 `app/`；鎖放在裡面會被刪掉，或刪到正在執行的那一份 |
| `acquireLock` 的參數 | `runRoot` | `cacheDir` | 同上 |
| 不複製的項目（§5.2） | `bin/`、`README.md`、`CHANGELOG.md`、`LICENSE` | 另加 `skill-template/`；`package.json` 一律複製 | `skill-template/` 只有 CLI 的 `init-skill` 用（讀 app 本體）；`package.json` 不在 `files` 裡但 npm 一定發佈，`workbench.ts` 以 cwd 讀它取版本 |
| app 本體路徑給 `.ts` 的方式（§5.6） | 由 `defs-state.mjs` 或 `notes-ignore-state.mjs` 擇一提供 | `notes-ignore-state.mjs` 的 `getAppRoot()`，兩道護欄共用 | 第一版直接寫在 `workbench.ts` 讓 tsc 多出 `process` 的錯誤（`.ts` 端不碰 `node:*`／`process` 的規則） |
| 主 repo 的環境變數 | 未提 | 主 repo 模式明確設 `NOTECRAFT_RUN_ROOT=""` | 避免從外層 shell 繼承到 `1`，讓主 repo 的設定被改掉 |

### 13.2 驗證

- `npm run check:run-root`：10 組（清單以真實 `package.json` 斷言、戳記比對 7 種情況、鎖的三態、文案、實跑建立／沿用／換版／連結壞掉、鎖的取得／釋放／過期／壞檔）
- `node scripts/fixtures/multi-instance.mjs --build`（macOS，Node 22.16）：8 項全過 —— 兩個 `view` 同時與各自存檔、重複啟動被擋並顯示網址、`view` 中 `build` 被擋、SIGKILL 後重開、鎖檔刪除、兩個 `serve --rebuild` 同時 build、單獨重啟沿用快取
- 同一支 fixture 在修正前的 commit（`295c896`）上跑：見 Task 159 實作記錄
- 瀏覽器：執行目錄下 `view` 的筆記頁 console 無錯誤，dev toolbar 的 entrypoint 200（spike 時是 403）
- 護欄：筆記內文寫入 app 本體的絕對路徑 → `build` 失敗並指出該路徑
- `npm run check-plugins`、`npm run check:upd` 通過；`npx tsc --noEmit` 錯誤 45 → 40（無新增）

### 13.3 已知限制

- **主 repo 模式**（有 `.git`）仍共用一個 root，不支援多個筆記資料夾同時執行（Q5）；啟動時會印一行提示
- **Windows 實機尚未驗證**（junction、`fs.allow` 的真實路徑、跨磁碟）；見 Task 159
- 不再使用的執行目錄（專案搬家後留下的 `cache/<hash>/`）不會自動清除（§9.3）
