---
Project Name: NoteCraft Workbench — 檢查更新（npm 新版通知）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；icon 用既有 lucide-react；跨 island 狀態用模組單例，不引入 nanostores）
文件狀態: 定稿待實作 —— §15 的 4 題已於 2026-10-03 逐題確認（紀錄見 §16）
文件作者: 建宇
建立日期: 2026-10-03
更新日期: 2026-10-03
依賴文件: docs/notecraft-workbench.md（§4 殼、§4.5 z-index／Escape）、docs/notecraft-workbench-note-tabs.md（§3.2 模組單例、§6.6 toast 時序）、docs/notecraft-workbench-loading-transitions.md（§6–§8 殼的預繪）、docs/notecraft-npx-viewer-v2.md、docs/prototype/design_handoff_update_check/README.md
分支: feat/update-check
---

# NoteCraft Workbench — 檢查更新設計文件

在瀏覽器端直接查詢 npm registry，比對目前執行的 `notecraftapp` 與 npm 上的最新版。有新版時用低干擾的方式提醒，並列出「你錯過的更新」（目前版本之後、到最新版為止的 CHANGELOG）。viewer（本機）與部署站共用同一套 UI 與文案，不做區分（Q3）。

> 視覺與互動的**像素級規格**以 [design_handoff_update_check/README.md](prototype/design_handoff_update_check/README.md) 與 `prototype/wb/pt-update.jsx`、`pt-update.css`、`pt-update-data.jsx` 為準，本文不重抄。
> 本文負責 handoff 沒有回答、或與 codebase 對不上的事：CHANGELOG 實際是**中文類別**、有 handoff 沒列的「內部」類別、有巢狀清單與粗體（§4.3）；CHANGELOG 裡有 **5 個版本沒發佈到 npm**，以 npm 版本清單切 CHANGELOG 會略過這些段落（已定案接受，Q1）；Rail 是 `.astro` 靜態元件，圓點要靠預繪（§7）；Palette 的項目只能是連結（§6.6）；Drawer 與 toast 每一頁都要能開，但工作台是 MPA（§3）。
> **與設計稿不同之處一律以本文為準**，全部列在 §1.3。

---

## 1. 這份文件要解決什麼

### 1.1 起點

已拍板的需求（2026-10-03 對話）：

- 瀏覽器端直接 `fetch` npm registry（已實測 `registry.npmjs.org` 回 `access-control-allow-origin: *`），不經 CLI、不需後端
- **部署站也照樣檢查與提示**，訪客看到的就當作提醒。這是「dev-only 功能在正式環境隱藏」原則的刻意例外
- localStorage 記上次檢查時間，**30 分鐘內不重複**；另有手動「檢查更新」，不受限制
- 離線、被公司網路擋住時 fetch 失敗**靜默略過**，頁面不可報錯
- CHANGELOG：把 `CHANGELOG.md` 加進 `package.json` 的 `files`，從 jsDelivr 讀 `notecraftapp@<latest>/CHANGELOG.md`；GitHub raw 當備援

Handoff 是工作台 prototype 的延伸，更新相關原始碼在 `pt-update-data.jsx`（mock 資料、store）、`pt-update.jsx`（元件）、`pt-update.css`（`.upd-*`），整合點散在 `pt-shell.jsx`、`pt-views2.jsx`、`pt-app.jsx`。讀過 codebase 與實際資料後，有這幾類落差：

| 落差 | 說明 |
| :-- | :-- |
| **CHANGELOG 的類別名稱** | handoff 以 `### Added／Changed／…` 切類別。實際 `CHANGELOG.md` 全是中文：`新增`、`變更`、`修正`、`移除`、`安全`，另有 handoff 沒列的 **`內部`**（6 次） |
| **CHANGELOG 的格式細節** | 項目有縮排 2 格的續行（同一項的第二段）、7 處巢狀清單、66 行含 `**粗體**`、站內相對連結 `./docs/…`；還有一個區間標題 `## [0.1.1] – [0.1.3] - 2026-07-09`。部分版本在第一個 `###` 之前有導言段落（例如 1.0.0），minor 版標題下有 `<!-- 重點：… -->` 註解（官網 `site/src/lib/changelog.ts` 的 `readMilestones()` 用，PR #45）。handoff 的 `updInline()` 只處理 `` `code` `` 與 `[text](url)` |
| **CHANGELOG 與 npm 版本不一致** | npm 上有 28 版，CHANGELOG 有 31 段。`1.0.1`、`1.1.1`、`1.8.1`、`1.8.2`、`1.8.4` 有寫 CHANGELOG 卻**沒發佈到 npm**（直接跳到下一版發佈；1.8.3 兩邊都沒有）。handoff 用 npm 版本清單算 `missed` 再拿去切 CHANGELOG：使用者從 1.8.0 升到 1.8.5 時，只會看到 1.8.5 那一段，漏掉 1.8.1、1.8.2、1.8.4 三段。**已定案照 handoff（Q1 = B）**，接受這個落差 |
| **GitHub 網址** | handoff 寫 `github.com/notecraftapp/notecraftapp`，實際是 `github.com/SteveLin100132/notecraft`（`package.json` 的 `homepage`） |
| **CHANGELOG 目前抓不到** | 實測 `cdn.jsdelivr.net/npm/notecraftapp@latest/CHANGELOG.md` 回 404：這個檔不在 `files` 裡 |
| **Rail 是靜態的** | `Rail.astro` 在 build 期畫完，不是 island。圓點的有無來自 localStorage，要在第一次繪製前由 inline script 預繪，與頁籤列、Sidebar 系列進度同一招（loading-transitions §6–§8） |
| **MPA** | prototype 是單頁，Drawer、toast 跟著 app 狀態走。工作台每次換頁都是新文件：Drawer 與 toast 要能在**任何一頁**開，Palette 的「檢查更新」在別頁按下時要跨頁交棒 |
| **Palette 只能導覽** | `Palette.tsx` 的 `Item` 只有 `href`，Enter 一律 `location.href = …`。「檢查更新」「查看更新內容」是動作，不是連結 |
| **viewer／部署的判斷** | handoff 說 viewer =「`notecraftapp view` 啟動的 dev server」。但 viewer CLI 還有 `serve`（build 成靜態檔再本機服務，`import.meta.env.DEV` 是 false），而 `notecraftapp build` 的產物也可能被部署。現有的 `settings.astro` 以 `NOTECRAFT_NOTES_DIR` 判斷 viewer，與「本機或部署」也不是同一件事。**已定案不區分（Q3 = D）**，問題不存在 |
| **目前版本比 npm 新** | 在原始碼 repo 開發、或已 bump 版號但還沒發佈時，`cur > latest`。handoff 只有「相同 → 已是最新」，沒有這一格 |
| **既有規則** | 新 token 一律 `--wb-*`（handoff 是 `--upd-*`）；規則裡零色碼（toast 的 `rgba(255,255,255,.72)` 等沒有對應 token）；Escape 走 `wb-escape` 堆疊（handoff 是 capture 階段 `stopPropagation`）；localStorage key 命名慣例是 `nc-…-v1`（handoff 是四個 `nc-upd-*`） |

### 1.2 目標

1. 五個接觸點（Rail 圓點、「關於」頁籤徽章、「版本與更新」區塊、更新詳情 Drawer、發現新版 toast）與 Palette 指令，照 handoff 還原（§6）
2. 版本推導（semver 比較、更新等級、落後版數、Node 需求、棄用）與 CHANGELOG 解析抽成**純函式**，用 `scripts/checks/` 斷言鎖住；CHANGELOG 的斷言直接拿 repo 的真實 `CHANGELOG.md` 當輸入（§4.4）
3. Rail 圓點在第一個 frame 就畫對，換頁不閃（§7）
4. 自動檢查不阻塞任何東西、失敗不留痕跡；同一頁、同一瀏覽器的多個分頁不重複查詢（§5）
5. 殼的既有規則與各頁 island **不動**，只在 `SettingsView`、`WbHeader`、`Palette` 加接點；Present 頁（`PresentLayout`）不檢查

### 1.3 非目標與刻意的偏離

| 項目 | 決定 | 為什麼 |
| :-- | :-- | :-- |
| CHANGELOG 列哪些版本 | 照 handoff，**只列 `missed`**（npm 上 `cur < v ≤ latest` 的穩定版）對應的段落（Q1 = B） | 「落後 N 個版本」與 Drawer 的版本數永遠一致；沒單獨發佈到 npm 的版本（例如 1.8.1、1.8.2、1.8.4）不列，已接受 |
| 「落後 N 個版本」 | 照 handoff 以 **npm 上發佈過的穩定版**計算（Q1） | 數字要對應「使用者實際能裝的版本」；Rail 與徽章在 CHANGELOG 載入前就要有數字 |
| 「內部」類別 | **不顯示**、不計入類別 chip 與項目數（Q2） | 寫給維護者看的（build 腳本、檢查器），使用者升級時用不到 |
| 類別名稱 | 中英文都認：`安全／Security`、`移除／Removed`、`變更／Changed`、`棄用／Deprecated`、`新增／Added`、`修正／Fixed`；不認得的類別放最後、照原標題顯示 | 實際檔案是中文；英文是 Keep a Changelog 的原文，日後改寫也不會壞 |
| 行內 Markdown | 支援 `` `code` ``、`**粗體**`、`[text](url)`；相對連結（`./docs/…`）轉成 GitHub blob 網址 | 實際內容 66 行有粗體；不用 `dangerouslySetInnerHTML`，切 token 後組 React 節點 |
| viewer／部署 | **不區分**，只用一套通用文案（Q3 = D，§8） | 判斷不影響是否檢查，只影響文案；各種判斷法都有誤判的情境，通用文案省掉這層複雜度 |
| 目前版本比 npm 新 | 視同「已是最新」、不提醒，pill 改「尚未發佈的版本」（Q4） | 開發中或發版前的狀態，沒有要升級的東西 |
| localStorage key | 一個 **`nc-update-v1`**（`{ cur, at, res, toasted, skipped }`），不依工作區分開 | 命名慣例；版本是 app 層的事，與工作區無關。`cur` 不同就整份作廢（§4.5） |
| token | `--upd-*` 改名 `--wb-upd-*`；toast 的白色半透明字改用 `--wb-a-white-*` 系列 | 新 token 一律 `--wb-*`、規則零色碼 |
| Escape | 走 `wb-escape` 堆疊，Drawer（`DrawerShell` 已內建）與 toast 都 `pushEscape` | 後開的在上面，自然達到 handoff 要的「Drawer 開著時 Esc 只關 Drawer」，不必 capture＋`stopPropagation` |
| 「關於」原本的「版本」列 | **拿掉** | handoff：「版本與更新」區塊是版本資訊的唯一完整位置，兩處重複會不一致 |
| 部署站關閉提醒的 build 選項 | **不做** | handoff 已列在範圍外；部署站訪客的瀏覽器會向 npm 與 jsDelivr 發請求，這是已接受的代價 |
| 「稍後提醒」 | 照 handoff **不做** | toast 只出現一次、自動檢查 30 分鐘一次，再加只會增加通知 |
| 深色模式 | **不做** | 與 Dashboard §1.3、頁籤 §1.3 同一決定 |
| Prototype 的 Tweaks 與 `Update States Frame.html` | **不移植** | 示範用；情境改由 §4.4 的斷言與 §14 的手動驗收涵蓋 |

---

## 2. 現況盤點：哪些留、哪些改、哪些新增

| 檔案 | 處置 |
| :-- | :-- |
| `src/lib/update-check.ts` | **新增**：純函式與型別（§4.4）——semver、`deriveResult()`、`updTone()`、Node 需求、相對時間文字。只能 `import type`、無 JSX、不碰 `window` |
| `src/lib/changelog-parse.ts` | **新增**：純函式——`parseChangelog()`、`sliceChangelog()`、`countByCategory()`、`inlineTokens()`。同上限制 |
| `src/lib/update-prepaint.ts` | **新增**：Rail 圓點預繪用的自足函式，以 `toString()` 內嵌進 inline script（§7） |
| `src/lib/update-store.ts` | **新增**：狀態、localStorage 讀寫、`storage` 事件、`subscribe()`、`check()`／`openDrawer()`／`skip()`（client only） |
| `src/components/wb/update/UpdateHost.tsx` | **新增**：layout 每頁掛的 island（`client:idle`）。開頁自動檢查、渲染 toast 與 Drawer（portal）、同步 Rail 圓點 DOM、接跨頁交棒 |
| `src/components/wb/update/UpdateBlock.tsx`、`UpdateDrawer.tsx`、`UpdateToast.tsx`、`UpdateChangelog.tsx`、`UpdatePills.tsx`、`UpdateNotes.tsx`、`UpdateCmds.tsx` | **新增**：對應 prototype 的 `PtUpdBlock`、`PtUpdDrawer`、`PtUpdToast`、`UpdChangelog`、`UpdLevelPills`、`UpdNotes`、`UpdCmd(s)` |
| `scripts/checks/upd-derive.mjs`、`upd-changelog.mjs`、`upd-prepaint.mjs` | **新增**：斷言；`package.json` 加 `check:upd`（`check-plugins` 會自動串上 `scripts/checks/*.mjs`） |
| `src/layouts/WorkbenchLayout.astro` | **改**：Rail 之後加圓點預繪的 inline script；body 尾端掛 `<UpdateHost client:idle …/>` |
| `src/components/wb/Rail.astro` | **改**：「設定與關於」按鈕加 `id`、內含 `hidden` 的 `.wb-upd-dot` 佔位 |
| `src/components/wb/WbHeader.tsx` | **改**：新 prop `tabBadges`（§6.2） |
| `src/components/wb/SettingsView.tsx` | **改**：「關於」最上方插入 `UpdateBlock`、拿掉原本的「版本」列、傳 `tabBadges` |
| `src/components/wb/Palette.tsx` | **改**：`Item` 加 `run`；最後加「指令」分組（§6.6） |
| `src/styles/workbench.css` | **改**：`:root` 加 `--wb-upd-*`；追加 `.wb-upd-*` 規則（§9） |
| `package.json` | **改**：`files` 加 `CHANGELOG.md`；`scripts` 加 `check:upd` |
| `astro.config.mjs` | **不動**：版本已由 `getWorkbenchIndex().appVersion` 提供，Node 版本在 layout 的 frontmatter 取 `process.versions.node`，都以 island props 傳入 |
| 其他頁面與 island | **不動** |

---

## 3. 架構

### 3.1 一個 host island、一份模組狀態

```
WorkbenchLayout
├── Rail（.astro）
│     └── 「設定與關於」<a id="wb-rail-settings"> ＋ <span class="wb-upd-dot" hidden>   ← 預繪／UpdateHost 改它
├── <script is:inline>  圓點預繪（§7）
├── .wb-main#nc-main
│     └── …（各頁）
│           └── /settings：SettingsView（client:load）
│                 ├── WbHeader tabBadges={{ about }}   ← 讀 update-store
│                 └── 「關於」：UpdateBlock             ← 讀 update-store
├── Palette（client:idle）  「指令」分組               ← 呼叫 update-store
└── UpdateHost（client:idle）                           ← 新增
      ├── 開頁 boot()：讀快取 → 過期才查 registry
      ├── UpdateToast（portal → .wb-app）
      └── UpdateDrawer（portal → #nc-main）
```

- 狀態集中在 `src/lib/update-store.ts`。同一頁的 ES module 是單例，`SettingsView`、`Palette`、`UpdateHost` 共用同一份（與 `wb-escape.ts`、`wb-tabs-store.ts` 同一招），以 `subscribe()` 通知重畫
- Drawer 與 toast 只由 `UpdateHost` 渲染。其他 island 想開 Drawer 時呼叫 `openDrawer()`，store 通知 `UpdateHost`
- Drawer 以 `createPortal` 掛進 `#nc-main`（`.wb-drawer` 以 `.wb-main` 為定位基準，`.nc-main-pane` 不設 position，見 CLAUDE.md），toast 掛進 `.wb-app`
- `UpdateHost` 用 `client:idle`：自動檢查本來就不急，不搶首屏

### 3.2 跨頁交棒

| 情境 | 做法 |
| :-- | :-- |
| 在 `/settings` 以外的頁面，Palette 選「檢查更新」 | `sessionStorage["nc-update-next"] = "check"` → 導到 `/settings?tab=about`。新頁的 `UpdateHost` 掛載時讀到就刪掉，執行 `check(true)` |
| 已在 `/settings`，Palette 選「檢查更新」 | `SettingsView` 訂閱 store 的 `focusAbout` 事件切到「關於」分頁，直接 `check(true)` |
| 任何頁面選「查看更新內容」 | `openDrawer()`，不換頁 |
| 從 toast 按「查看更新內容」 | 同上 |

Drawer 的開關不跨頁保存：換頁就關閉，與 `NoteDrawer` 相同。

---

## 4. 資料層

### 4.1 型別

```ts
// src/lib/update-check.ts
export type UpdLevel = "patch" | "minor" | "major";
export type UpdTone = "info" | "major" | "danger";

export interface UpdResult {
  cur: string;               // 目前版本（build 期注入）
  curDate: string | null;    // npm 上的發佈時間；cur 沒發佈過時為 null
  latest: string;            // dist-tags.latest
  latestDate: string | null;
  level: UpdLevel | null;    // null = 已是最新或 cur 較新
  ahead: boolean;            // cur > latest（Q4）
  behind: number;            // cur < v ≤ latest 的 npm 穩定版數
  missed: string[];          // 同上，新到舊；Rail／徽章／toast 計數與 CHANGELOG 切片共用（§4.3）
  engines: string | null;    // versions[latest].engines.node 原字串
  nodeNeed: number | null;   // 由 engines 推出的最低 major；推不出時 null
  userNode: string;          // build／dev 期的 process.versions.node
  needsNode: boolean;        // nodeNeed !== null && userNode 的 major < nodeNeed
  deprecated: string | null; // versions[cur].deprecated
  size: number | null;       // versions[latest].dist.unpackedSize
  files: number | null;      // versions[latest].dist.fileCount
}

// src/lib/changelog-parse.ts
export type ClCat = "security" | "removed" | "changed" | "deprecated" | "added" | "fixed" | "other";
export interface ClItem { text: string; children: string[] }      // children = 巢狀清單項目
export interface ClSection { cat: ClCat; title: string; items: ClItem[] }
export interface ClVersion { v: string; vFrom: string | null; date: string | null; lead: string | null; sections: ClSection[] }
```

`ClVersion.v` 是比較用的版號；區間標題 `[0.1.1] – [0.1.3]` 取上界 `0.1.3` 當 `v`，`vFrom = "0.1.1"`，顯示成「v0.1.1 – v0.1.3」。

### 4.2 registry 的取得與推導

`GET https://registry.npmjs.org/notecraftapp`，取完整 packument。實測（2026-10-03）28 版、未壓縮 93 KB、gzip 後 14 KB，每多一版約加 3.3 KB。有 30 分鐘節流，不另找精簡端點：npm 的 abbreviated metadata（`application/vnd.npm.install-v1+json`）沒有逐版的 `time`。

`deriveResult(packument, cur, userNode)` 照 handoff「資料來源」表推導，補上：

- **prerelease**：版號含 `-` 的不算新版、不計入 `behind`，也不會是 `latest`（`dist-tags.latest` 本來就不會指向它）
- **cur 沒發佈過**（例如 1.8.4）：`curDate = null`、`deprecated = null`，其他照常
- **cur > latest**：`level = null`、`ahead = true`、`behind = 0`（Q4）
- **engines**：只認 `>=N`、`>=N.x.y`、`^N`、`N.x`；其他寫法（`||`、空白分隔的區間）推不出 `nodeNeed`，不警示，只照原字串顯示
- **packument 外形不對**（缺 `dist-tags`、`versions`）：視同失敗

`fetch` 加 `AbortController`，**8 秒**逾時視同失敗。不帶任何自訂 header（避免觸發 CORS preflight）。

### 4.3 CHANGELOG 的取得與解析

**來源**（依序嘗試，前一個失敗才試下一個）：

1. `https://cdn.jsdelivr.net/npm/notecraftapp@<latest>/CHANGELOG.md` —— 內容與發佈的版本完全一致，版號固定的網址可以長期快取
2. `https://raw.githubusercontent.com/SteveLin100132/notecraft/main/CHANGELOG.md` —— `main` 可能已有尚未發佈的段落，`sliceChangelog()` 只取 `missed` 內的版本，自然濾掉
3. 都失敗 → 錯誤狀態，退回「到 GitHub 看完整 CHANGELOG ↗」（`https://github.com/SteveLin100132/notecraft/blob/main/CHANGELOG.md`）

GitHub 網址由 `package.json` 的 `repository.url` 在 build 期推出，以 prop 傳入，不寫死在元件裡。已是最新版時改抓 `@<cur>`。`cur > latest` 時直接用來源 2。

**何時抓**：handoff 是「打開 Drawer 時才抓」。另外，major 更新的「破壞性變更」提示框要顯示移除、變更的項數，所以「關於」頁顯示 major 更新時也會抓。同一頁只抓一次（store 內以 `latest` 為 key 存 Promise）；不寫進 localStorage。

**解析規則**（`parseChangelog(md)`）：

| 行 | 處理 |
| :-- | :-- |
| `## [x.y.z] - YYYY-MM-DD`、`## [a] – [b] - YYYY-MM-DD` | 新版本（`–` 與 `-` 都認） |
| `## [Unreleased]` 或其他認不得的 `##` | 略過到下一個認得的 `##` |
| `### <類別>` | 新類別；對照表見 §1.3。`內部`／`Internal` 解析後丟棄（Q2） |
| `- …` | 新項目 |
| 縮排 ≥2 格且以 `- ` 開頭 | 上一項的巢狀項目（`children`） |
| 縮排 ≥2 格的其他文字 | 接在上一項（或上一個巢狀項目）後面，以換行分隔；渲染時換行視為空白 |
| `<!-- … -->`（含 `<!-- 重點：… -->`） | 略過（「重點」是官網里程碑用的，不在 Drawer 顯示） |
| 版本標題之後、第一個 `###` 之前的文字 | 該版的 `lead`（多行以換行接起）。展開時顯示在類別之前，一段 12.5px/1.75 `--wb-ink-2`，行內規則同項目 |
| 空行、第一個 `##` 之前的內容 | 略過 |

版本標題的 regex 與官網 `site/src/lib/changelog.ts` 的 `readReleases()` 相同。兩者不共用模組（site 是獨立的 Astro 專案、build 期用 `node:fs` 讀檔），由 `upd-changelog.mjs` 斷言兩邊對真實 `CHANGELOG.md` 解析出的版號清單一致。

**切片**（`sliceChangelog(versions, missed, cur)`，Q1 = B）：依 `missed` 的順序（新到舊）逐一找對應段落；區間標題 `[a] – [b]` 涵蓋 `a ≤ v ≤ b` 的版本，同一段只列一次。已是最新時改取 `v === cur` 那一段。只存在於 CHANGELOG、不在 npm 的版本不列。`missed` 裡某版在 CHANGELOG 找不到段落時，仍列版本列，展開後一行 `--wb-ink-3`「這一版沒有 CHANGELOG 紀錄」——版本數與「落後 N 個版本」保持一致。

**行內**（`inlineTokens(text)` → `{ t: "text" | "code" | "bold" | "link", … }[]`）：先切 `` `code` ``（內部不再解析），其餘再切 `**粗體**` 與 `[text](url)`。連結只接受 `http(s):` 與相對路徑：相對路徑轉成 GitHub blob 網址，其他協定（`javascript:` 等）一律當純文字。元件以 React 節點組回，`target="_blank" rel="noopener"`。

### 4.4 純函式與斷言

| 檔案 | 斷言 |
| :-- | :-- |
| `scripts/checks/upd-derive.mjs` | semver 比較（含 prerelease 排除、`1.10.0 > 1.9.0`）；patch／minor／major；`cur > latest`；`cur` 不在 versions；`behind` 不含 prerelease；engines 的四種寫法與推不出的寫法；`needsNode`；`deprecated`；packument 缺欄位時 throw；`updTone()` 四種結果；「略過」時 Rail 顯示條件（已棄用不能略過） |
| `scripts/checks/upd-changelog.mjs` | **讀 repo 的真實 `CHANGELOG.md`**：版本數與首末版號、區間標題、所有類別都對到 key、`內部` 被丟棄、`<!-- 重點 -->` 被略過、1.0.0 有 `lead`、版號清單與官網 `readReleases()` 一致（展開區間後比對）、續行與巢狀清單、`**粗體**`、相對連結轉址、`javascript:` 連結變純文字；切片：1.8.0 → 1.8.5 只得到 1.8.5 一段（1.8.1、1.8.2、1.8.4 不列）、`missed` 含 0.1.2 時對到區間段落且不重複、`missed` 裡沒有段落的版本得到空段、已是最新只剩一段、`main` 上比 latest 新的段落被濾掉。另斷言 `package.json` 的 `files` 含 `CHANGELOG.md` |
| `scripts/checks/upd-prepaint.mjs` | 以 `new Function` 載入 `toString()` 後的預繪函式（與 inline script 同一條路），驗證快取 `cur` 不符時不顯示、略過時不顯示、已棄用時即使略過也顯示、JSON 壞掉時不 throw |

這些 `.ts` 只能 `import type`、無 JSX（CLAUDE.md「scripts/checks」限制）。

### 4.5 localStorage

一個 key：`nc-update-v1`。

```ts
{ cur: string; at: number; res: UpdResult; toasted: string | null; skipped: string | null }
```

- **`cur` 與目前執行的版本不同 → 整份作廢**（`toasted`／`skipped` 一併清掉）。npx viewer 換過版本、或部署站重新部署後，舊結果的「落後幾版」已經不對
- `at` 只在**成功**時寫入。失敗不寫，下一次開頁照常檢查（不會因為一次失敗就 30 分鐘不查）
- 每次寫入前先重讀（與 `wb-tabs-store` 相同），`storage` 事件同步其他分頁：分頁 A 查完，分頁 B 的圓點與「關於」區塊跟著更新，B 下次開頁也不會重查
- localStorage 不可用（隱私模式、讀寫 throw）：照 handoff 實作備註，每次開頁都查，`toasted`／`skipped` 改存模組變數（只在這一頁有效）

---

## 5. 檢查流程與狀態轉移

```
UpdateHost 掛載（client:idle）
 ├─ sessionStorage 有 nc-update-next=check → 刪掉 → check(manual=true)
 ├─ 讀 nc-update-v1：cur 相符且 now - at < 30 分 → 直接用快取 res，結束
 └─ 否則 → check(manual=false)

check(manual)
 ├─ 已有一個 check 在跑 → 回傳同一個 Promise（不重複發請求）
 ├─ status = "checking"、err = null
 ├─ 成功 → status = "done"、寫入 res／at；
 │        !manual && level && toasted !== latest && (skipped !== latest || deprecated) → 顯示 toast、寫入 toasted
 └─ 失敗 → status = res ? "done" : "idle"；manual 才寫 err（「目前無法連線到 npm，稍後再試」）
```

- 自動檢查期間**只有**「關於」區塊顯示「正在向 npm registry 查詢…」，其他地方不變
- `navigator.onLine === false` 時自動檢查直接略過（不發一個必定失敗的請求）；手動檢查照發，失敗就顯示那行字
- `document.visibilityState === "hidden"` 時延後到 `visibilitychange` 再檢查：背景分頁不必搶著查
- 失敗一律 `catch` 住：`console` 不印錯誤（瀏覽器自己對網路失敗印的那一筆擋不掉）

---

## 6. 各接觸點：handoff 沒講、或與 codebase 有出入的部分

### 6.1 Rail 圓點

- `Rail.astro` 的「設定與關於」`<a>` 加 `id="wb-rail-settings"`，內含 `<span class="wb-upd-dot" hidden aria-hidden="true">`。SSR 一律 `hidden`
- 顯示、色調與 `aria-label`／`title` 由預繪 script（§7）在第一次繪製前設定；之後的變化由 `UpdateHost` 訂閱 store 直接改這兩個 DOM（Rail 不是 island，改它不會造成 hydration mismatch）
- 與既有 `.wb-rail-dot`（AI 佇列）是不同 class、不同尺寸（8px vs 6px），不共用規則
- `ncPop` 進場只在**狀態改變時**播（`UpdateHost` 加一個 class 再移除）；預繪出來的圓點不播，換頁時不會每頁都跳一下

### 6.2 「關於」頁籤徽章

- `WbHeader` 新 prop：`tabBadges?: Partial<Record<T, { n: number; tone: UpdTone; label: string }>>`。有徽章時，`<button role="tab">` 內文字後接 `<span class="wb-upd-tab-badge">`，`aria-label` 改成 handoff 的完整說明
- `SettingsView` 傳 `{ about: useUpdRail() }`。SSR 與 hydrate 前沒有徽章（CLAUDE.md：靠 localStorage 的東西 SSR 一律當作沒有），hydrate 後出現；`SettingsView` 是 `client:load`，出現時間與頁籤列同一批
- `Header.astro`（靜態頁首）不加：「關於」只出現在 `SettingsView` 的 React 頁首

### 6.3 「版本與更新」區塊

- 位置照 handoff：「關於」分頁 `#nc-scroll.wb-body.flush` 的第一個子元素，`StatStrip` 之上
- 原本 `meta` 陣列的 `["版本", …]` 列拿掉（§1.3）
- 相對時間「3 分鐘前檢查」每 30 秒重算：只在「關於」分頁可見時跑 interval
- **SSR**：區塊外框、群組標頭、版本列的「目前 v1.8.5」照常輸出（`cur` 是 build 期已知值）；pills 一律輸出「尚未檢查新版」；狀態行輸出空字串；按鈕只輸出「檢查更新」。hydrate 後讀 store 補上其他內容。hero 高度在 SSR 與有結果時不同（多一列提示框、設定列），這是預期的展開，不是位移問題：區塊在「關於」分頁，而 `?tab=about` 本身就是 hydrate 後才切換
- 升級指令、Node 需求列與提示框用 §8 的通用文案

### 6.4 更新詳情 Drawer

- 外框用既有 `DrawerShell`（scrim、焦點管理、Tab 循環、`pushEscape`）。`DrawerShell` 加兩個可選 prop：`className`（給 `.wb-upd-dw` 設 520px 寬）與 `footer`（固定底列 `.wb-upd-dw-f`，在 `.wb-dw-body` 之外、不捲動）
- crumb 照 handoff「notecraftapp ・ 更新內容」；關閉鈕的 `aria-label` 照 handoff 改成「關閉（Esc）」，只影響這個 Drawer（由 prop 傳入，預設仍是「關閉」）
- 寬度：桌面 520px；平板（861–1100）與既有 Drawer 一致；手機全寬（既有 `.wb-drawer` 的 860px 規則已涵蓋）
- 同時開著 `NoteDrawer`（例如在 `/notes` 預覽一篇筆記時從 Palette 開更新內容）：兩個都是 `.wb-drawer`，後開的在上面，Esc 依堆疊先關更新 Drawer。不特別互斥
- CHANGELOG 區塊照 handoff 的 `UpdChangelog`，區段標題照 handoff「你錯過的更新 **N** 個版本」，N = `behind`（Q1 = B，與 Rail、徽章同一個數字）
- 某一版切出來後沒有任何項目（只有「內部」）：版本列照常顯示，展開後是一行 `--wb-ink-3`「這一版只有內部調整」

### 6.5 發現新版 toast

- **不是** `ToastHost` 的提示：版面、動作鈕、10 秒計時都不同，由 `UpdateHost` 自己渲染（portal 到 `.wb-app`）
- 位置照 handoff：右下；手機在底部列上方。z-index 用新 token `--wb-z-upd-toast: 700`：高於頁籤列（650）、Drawer（600），低於 Palette 等全螢幕浮層（1000）與 `ToastHost`（950）。兩者不重疊：`ToastHost` 是底部置中
- 顯示時 `pushEscape(close)`；收起（✕、Esc、10 秒、按任一動作）時取消登記
- 滑鼠停留或焦點在 toast 內時暫停計時，離開後**重新計 10 秒**
- toast 不搶焦點（`role="status"`），所以 Tab 順序上它在 DOM 末端
- 「查看更新內容」→ 關 toast、`openDrawer()`；「略過這一版」→ `skip(latest)`、關 toast

### 6.6 Command Palette「指令」分組

- `Item` 改成 `{ key; href?: string; run?: () => void; node }`。Enter 與點擊：有 `run` 就先 `close()` 再呼叫 `run()`，否則照舊導覽；⌘／Ctrl＋Enter 對 `run` 項目無效（沒有「新分頁」可言）
- 分組放在所有既有分組之後（`allGroups` 的最後），label「指令」。Enter 的「第一個符合項」順序自然是「頁籤 → 筆記 → … → 指令」，不需要另外處理
- 兩個指令照 handoff：「檢查更新」一律顯示；「查看更新內容」在 store 有 `res` 時顯示，pill「v{latest}」
- 關鍵字比對沿用既有的 `has()`（小寫包含），比對對象是 handoff 的兩組關鍵字字串
- 「指令」分組不依賴 `/wb-index.json`：索引還在載入或載入失敗時，指令照樣可用（目前「索引載入失敗」的空狀態要改成只在沒有任何項目時顯示）

---

## 7. SSR 與預繪

| 元素 | SSR | 第一次繪製前（inline script） | hydrate 後 |
| :-- | :-- | :-- | :-- |
| Rail 圓點 | `hidden` | 讀 `nc-update-v1` → `railHint(raw, cur)` → 設 `hidden`／`data-tone`／`aria-label`／`title` | `UpdateHost` 訂閱 store 更新同一組屬性 |
| 「關於」頁籤徽章 | 無 | 無 | `SettingsView` 讀 store |
| 「版本與更新」區塊 | 目前版本＋「尚未檢查新版」 | 無 | `SettingsView` 讀 store |
| toast、Drawer | 無 | 無 | `UpdateHost` |

- 預繪函式 `railHint` 放在 `src/lib/update-prepaint.ts`，**必須自足**（裡面自己做版號比較，不 import 任何東西）、只能 `import type`，以 `toString()` 內嵌，與 `wb-tabs-prepaint.ts`、`series-progress-pure.ts` 同一個做法；`check:upd` 斷言（§4.4）
- inline script 放在 `<Rail>` 之後、`<Sidebar>` 之前，`define:vars` 傳 `cur` 與函式原始碼
- 預繪不發任何網路請求：快取過期也照舊顯示快取結果，等 `UpdateHost` 查完再更新

---

## 8. 文案與升級指令（不區分 viewer／部署站）

Q3 定案 **D**：不判斷目前是本機還是部署站，**只用一套通用文案**。handoff 中依 `mode` 分支的地方一律改成下表；handoff 的 `NC_UPD_ENV.mode`、部署站專用的 `.upd-deploy` 說明段落都不移植。

| 位置 | handoff（viewer／deploy 兩套） | 本專案（一套） |
| :-- | :-- | :-- |
| 升級指令列的說明 | 「複製後在終端機執行」／「在站台的 repo 中執行，重新部署後生效」 | 「複製後在終端機執行。部署站請由站台維護者升級並重新部署」 |
| 升級指令 | 兩列：`viewer 模式`、`全域安裝` | 同兩列：`npx notecraftapp@latest view`、`npm i -g notecraftapp@latest`（不再依 DEV 換成 `serve`：README 推的入口就是 `view`） |
| 「需要先升級 Node」提示框 | 「你目前使用 Node X」＋下載連結／「此站目前以 Node X 建置，請先把 Netlify 的 `NODE_VERSION` 設為 N 以上」 | 「v2.0.0 要求 Node ≥ 22，目前環境是 Node 20.11.1。請先升級 Node（部署站請調整建置環境的 Node 版本，例如 Netlify 的 `NODE_VERSION`），再執行升級指令。」＋「下載 Node.js ↗」 |
| Node 需求列的 pill | 「你目前 20.11.1」／「建置用 20.11.1」 | 「目前 20.11.1」 |
| 部署站說明段落 `.upd-deploy` | 部署站且有新版時顯示 | **不做**（已併入升級指令列的說明） |
| toast 標題 | 部署站另有「此站使用的 NoteCraftApp 有新版 v1.9.2」 | 一律用 patch／minor／major／已棄用那四種 |

- `userNode` 取 build／dev 期的 `process.versions.node`，由 layout 以 prop 傳給 `UpdateHost`（只是版號，不含路徑，不受 no-local-path 檢查影響）。部署站上它代表建置環境的 Node，通用文案以「目前環境」涵蓋兩種情況

---

## 9. 樣式與 token

- `.upd-*` 規則全部改名 `.wb-upd-*`，追加在 `workbench.css`。手機（≤860px）規則放進既有的 860px 媒體規則區塊
- `:root` 新增（全是既有 token 的別名，**沒有新色碼**）：

| handoff | 本專案 | 值 |
| :-- | :-- | :-- |
| `--upd-info` | `--wb-upd-info` | `var(--wb-blue-l)` |
| `--upd-major` | `--wb-upd-major` | `var(--wb-warn)` |
| `--upd-danger` | `--wb-upd-danger` | `var(--wb-danger)` |
| `--upd-security` | `--wb-upd-security` | `var(--wb-danger)` |
| `--upd-toast-bg` | `--wb-upd-toast-bg` | `var(--wb-ink)`（即 `--neutral-900`） |
| `--upd-dur` | 沿用 `--wb-dur-in` | `240ms` |
| `--upd-ease` | 沿用 `--wb-ease` | 同值 |
| （無） | `--wb-z-upd-toast` | `700`（§6.5） |

- toast 上的白色半透明：`rgba(255,255,255,.72)`、`.78`、`.6`、`.08` 在 `:root` 的 alpha 區新增 `--wb-a-white-60`／`-72`／`-78`／`-08`（與既有 `--wb-a-white-07`、`-12` 同一系列）；toast 主鈕與 icon 的 `--orange-400` 改用 `--wb-gold`（同值）
- `color-mix()` 照 handoff 寫在規則裡，兩端都是 `--wb-*`（`workbench.css` 已有先例）
- 骨架沿用 `--wb-sk`／`--wb-sk-hi`，不用 handoff 的 `--wb-line-2`＋`--wb-panel`：與其他骨架一致
- 每條動畫都有 `prefers-reduced-motion` 的對應（handoff「動畫」表）

---

## 10. 無障礙與鍵盤

照 handoff，另外：

- Rail 按鈕的 `aria-label` 隨狀態改變時，`title` 同步改，兩者文字相同
- 「檢查更新」按鈕檢查中是 `disabled`：焦點會掉。改成 `aria-disabled="true"`＋點擊時忽略，焦點留在按鈕上
- 狀態行 `aria-live="polite"`；複製成功的「已複製到剪貼簿」用另一個隱藏的 `aria-live` 節點
- 複製走既有 `src/lib/clipboard.ts`（`http://` 加區網 IP 時的相容寫法，v1.8.2）；寫入失敗時按鈕文字改「無法複製」，並選取指令文字
- Drawer 內的版本列是 `<button aria-expanded aria-controls>`；類別 chip 是 `aria-pressed` 的單選

---

## 11. 響應式

照 handoff「響應式（≤860px）」，不另訂。驗收寬度 375／768／1280。

---

## 12. 發佈

- `package.json` 的 `files` 加 `CHANGELOG.md`。功能本身隨 **1.9.0** 發佈，而使用者抓的是 `@<latest>` 的 CHANGELOG（≥ 1.9.0，一定有這個檔），所以沒有過渡期問題；萬一日後某版漏掉，GitHub raw 備援會接住
- `upd-changelog.mjs` 斷言 `files` 含 `CHANGELOG.md`，`prepublishOnly` → `check-plugins` 會擋
- 發版時 CHANGELOG 的版號標題必須是 `## [x.y.z] - YYYY-MM-DD`，否則那一版在 Drawer 裡不會出現。`upd-changelog.mjs` 斷言檔案裡所有 `## ` 開頭的行都能被解析（`[Unreleased]` 除外）

---

## 13. dev／正式環境差異

**沒有差異**：部署站也檢查、也提示（§1.1），文案也相同（§8）。

---

## 14. 實作階段

| Task | 內容 | 驗收 |
| :-- | :-- | :-- |
| **113** | `update-check.ts`、`changelog-parse.ts`、`update-prepaint.ts` 純函式；三支 `scripts/checks/upd-*.mjs`；`check:upd`；`files` 加 `CHANGELOG.md` | `npm run check:upd` 通過；故意改壞 CHANGELOG 標題會失敗 |
| **114** | `update-store.ts`（快取、節流、單一請求、`storage` 同步、跨頁交棒）、`UpdateHost`、Rail 佔位與預繪、toast | 清掉 `nc-update-v1` 後開頁 → 背景查詢；30 分鐘內換頁不再發請求（Network 面板）；DevTools 離線 → 無任何 UI、無 console 錯誤；換頁時圓點不閃 |
| **115** | `UpdateBlock`、`WbHeader` `tabBadges`、`UpdateDrawer`（`DrawerShell` 加 `className`／`footer`）、`UpdateChangelog`（chip 篩選、摺疊、載入中、失敗）、Palette「指令」分組 | 以本機假 registry（`fetch` 攔截）跑過 handoff 的六種情境 × CHANGELOG 三種狀態 |
| **116** | 平板、手機、reduced-motion；CLAUDE.md、`notecraft-workbench.md` 交叉引用；回填本文 §17；release notecraftapp **1.9.0** | 375／768／1280 截圖；`npx tsc --noEmit`（不新增錯誤）＋ `npx astro build` ＋ `npm run check-plugins` ＋ `npm run check:wb` |

---

## 15. 待釐清問題

### Q1. CHANGELOG 裡沒發佈到 npm 的版本怎麼算（已定案：B）

實例：使用者在 1.8.0，npm 最新是 1.8.5。npm 上兩者之間沒有其他版本，但 CHANGELOG 有 1.8.1、1.8.2、1.8.4 三段，內容都包含在 1.8.5 裡。

- **A（建議）**：Drawer 以 CHANGELOG 切 `cur < v ≤ latest`（4 段），沒發佈過的版本加 pill「隨 v1.8.5 發佈」；Rail、徽章、toast 的「落後 N 個版本」照 handoff 用 npm 版數（1）。Drawer 區段標題寫「N 筆版本紀錄」，與「落後 N 個版本」區分（§6.4）
- B：兩邊都用 npm 版本清單。Drawer 只會出現 1.8.5 一段，漏掉三段的內容
- C：兩邊都用 CHANGELOG 段數。Rail 與徽章要等 CHANGELOG 載入才有數字，等於每次檢查都要多抓一個檔

### Q2. 「內部」類別（已定案：A）

- **A（建議）**：解析後丟棄，不出現在 chip、項目數與內容裡
- B：當成第七類，排最後、灰色點
- C：照原樣顯示，不特別處理

### Q3. viewer／部署站的判斷（已定案：D）

判斷不影響是否檢查，只影響文案與升級指令（看到提醒的是能自己升級的本機使用者，還是無法升級的部署站訪客）。

- A（建議）：區分，瀏覽器端看 hostname，本機與區網位址算 viewer，其他算部署站
- B：區分，build 期看 `NOTECRAFT_NOTES_DIR`（與現有 `settings.astro` 的 `viewer` 相同）。用 `notecraftapp build` 產物部署出去的站會被當成 viewer；從原始碼 repo 本機 `astro dev` 會被當成部署站
- C：區分，build 期看 `import.meta.env.DEV`。`notecraftapp serve` 會被當成部署站
- **D**：不區分，一套通用文案（§8）

### Q4. 目前版本比 npm 上的新（開發中、或 bump 了還沒發佈）（已定案：A）

- **A（建議）**：視同已是最新，不提醒；pill 改 `muted`「尚未發佈的版本」，「最新」那格顯示 npm 上的版本供對照。「查看更新內容」從 GitHub raw 取目前版本那一段，取不到就顯示失敗狀態
- B：完全不顯示「版本與更新」區塊的檢查結果，只顯示目前版本
- C：照 handoff 字面，當成「已是最新版」，不另外標示

### 優先順序一覽

全部已定案（§16）。

---

## 16. 定案紀錄

2026-10-03 以問答逐題確認：

| 題 | 定案 | 影響 |
| :-- | :-- | :-- |
| Q1 未發佈版本 | **B**：Drawer 與「落後 N 個版本」都以 npm 版本清單（`missed`）為準；只存在於 CHANGELOG 的版本不列（作者選擇，未採建議的 A） | §1.3、§4.1 `missed`、§4.3 切片、§4.4 斷言、§6.4 區段標題 |
| Q2「內部」類別 | **A**：解析後丟棄，不出現在 chip、項目數與內容；只剩內部項目的版本展開後顯示「這一版只有內部調整」 | §1.3、§4.3 解析規則、§4.4 斷言、§6.4 |
| Q3 viewer／部署 | **D**：不區分，只用一套通用文案；不移植 handoff 的 `mode` 與 `.upd-deploy` 段落（作者選擇，未採建議的 A） | §1.3、§6.3、§8、§13 |
| Q4 目前版本較新 | **A**：視同已是最新、不提醒；pill 改 `muted`「尚未發佈的版本」並列 npm 版本對照；「查看更新內容」從 GitHub raw 取目前版本那一段，取不到顯示失敗狀態 | §1.3、§4.2 `ahead`、§4.3 來源、§4.4 斷言 |

---

## 17. 實作後回填

（待實作後填寫）
