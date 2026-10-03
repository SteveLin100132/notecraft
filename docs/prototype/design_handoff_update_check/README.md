# Handoff：檢查更新（npm 新版通知）

## Overview
NoteCraftApp 以 npm 套件 `notecraftapp` 發佈。這個功能在瀏覽器端直接查詢 npm registry，有新版時用低干擾的方式提醒使用者，並列出「你錯過的更新」（目前版本之後、到最新版為止的 CHANGELOG）。

- **viewer 模式**（`npx notecraftapp view`）與 **部署模式**（build 成靜態站部署到 Netlify）共用同一套 UI，只在文案上區分。
- 沒有後端。自動檢查失敗時完全靜默；不使用 modal。

接觸點共五個，干擾程度由低到高：
1. Rail「設定與關於」按鈕的圓點
2. 「設定與關於」頁標頭「關於」頁籤旁的數字徽章（落後版數）
3. 「關於」分頁最上方的「版本與更新」區塊（版本資訊的唯一完整位置）
4. 更新詳情 Drawer（CHANGELOG）
5. 發現新版時的 toast（同一版只出現一次）
另外 Command Palette 多一組「指令」。

## About the Design Files
`prototype/` 內的檔案是 **以 HTML/React（瀏覽器內 Babel）製作的設計參考**，用來呈現外觀與行為，**不是要直接搬進 production 的程式碼**。請在既有的 NoteCraftApp 專案（Astro 5 + React island）中，以專案現有的元件、樣式與 island 寫法重新實作。mock 資料（`UPD_VERSIONS`、`UPD_SCEN`）要換成真正的 registry 與 CHANGELOG 抓取。

- `prototype/NoteCraft 工作台 Prototype.html` — 可操作的工作台 Prototype（已整合檢查更新）
- `prototype/NoteCraft 檢查更新 Spec.html` — 設計規格頁：放置方案、每個狀態的桌面＋手機畫面、Drawer／toast／Rail 變體、元件拆分、互動表、token
- `prototype/Update States Frame.html` — 規格頁用的單一狀態 frame（`?s=&view=&cl=&mode=`）

以本機靜態伺服器開啟（例如 `npx serve prototype`）；用 `file://` 開會因載入 jsx 失敗。

Prototype 右下 Tweaks 的「檢查更新」區可切換：
- **npm 回傳情境**：已是最新版／patch（1 版）／minor（4 版）／major（12 版）／目前版本已棄用／新版需要 Node 22
- **網路**：可連線／離線（被擋）
- **CHANGELOG**：正常／載入中／失敗
- **使用方式**：viewer／部署站
- **模擬開頁**：清除 30 分鐘與 toast 記錄後重跑自動檢查

## Fidelity
**High-fidelity。** 顏色、尺寸、字級、狀態與互動都是最終值，沿用工作台既有 `--wb-*` token 與元件語彙（`.wb-gh`、`.wb-set`、`.wb-pill`、`.wb-chip`、`.wb-btn-*`、`.wb-drawer`、`.wb-dw-*`）。請依數值精確重建。

---

## 資料來源與檢查流程

### 版本與環境（build／啟動時注入）
| 值 | 來源 |
|---|---|
| 目前版本 `cur` | build 時從 `notecraftapp/package.json` 的 `version` 注入（例如 Vite `define` → `import.meta.env.NC_VERSION`） |
| 模式 `mode` | `viewer` = 由 `notecraftapp view` 啟動的 dev server；`deploy` = 靜態 build |
| 使用者 Node 版本 `userNode` | viewer：dev server 注入 `process.versions.node`。deploy：build 時注入 build 環境的 `process.versions.node`（代表 Netlify 建置用 Node） |

### npm registry
`GET https://registry.npmjs.org/notecraftapp`（registry 允許 CORS）。從完整 packument 取：
| 欄位 | 用途 |
|---|---|
| `dist-tags.latest` | 最新版本 |
| `time[v]` | 每一版的發佈時間（「最新版 2 天前發佈」） |
| `versions[latest].engines.node` | Node 需求（例如 `>=22`），與 `userNode` 的 major 比較 → `needsNode` |
| `versions[cur].deprecated` | 目前版本的棄用說明字串（存在即已棄用） |
| `versions[latest].dist.unpackedSize`、`dist.fileCount` | 套件大小與檔案數（次要資訊） |
| `Object.keys(versions)` | 計算 `missed`：`cur < v ≤ latest` 的穩定版（排除含 `-` 的 prerelease），由新到舊 → `behind = missed.length` |

更新等級：比較 `cur` 與 `latest` 的 semver。major 位數變 → `major`；否則 minor 變 → `minor`；否則 → `patch`；相同 → `null`（已是最新）。

### CHANGELOG（Keep a Changelog）
`GET https://cdn.jsdelivr.net/npm/notecraftapp@{latest}/CHANGELOG.md`（或 unpkg）。打開 Drawer 時才抓，與 registry 查詢分開。
- 以 `## [x.y.z] - YYYY-MM-DD` 切版本，以 `### Added|Changed|Deprecated|Removed|Fixed|Security` 切類別，條列 `- ` 為項目（項目可多行）。
- 只保留 `missed` 內的版本；已是最新版時保留目前版本那一版（可改抓 `notecraftapp@{cur}/CHANGELOG.md`）。
- 項目內的行內 Markdown 只需支援 `` `code` `` 與 `[text](url)`（見 `updInline()`）。連結 `target="_blank" rel="noopener"`。
- 失敗退回連結：`https://github.com/notecraftapp/notecraftapp/blob/main/CHANGELOG.md`

類別中文與顯示順序（**刻意與 Keep a Changelog 不同，讓風險先被看到**）：
| 順序 | key | 中文 | 類別點顏色 |
|---|---|---|---|
| 1 | security | 安全 | `--upd-security`（另有特殊框，見下） |
| 2 | removed | 移除 | `--upd-major` |
| 3 | changed | 變更 | `--wb-blue-l` |
| 4 | deprecated | 棄用 | `--upd-major` |
| 5 | added | 新增 | `--wb-ok` |
| 6 | fixed | 修正 | `--wb-ink-3` |

### 檢查規則（已定案）
- **自動**：開頁時執行。`localStorage["nc-upd-last"]`（ms timestamp）在 30 分鐘內就沿用快取結果，不發請求。建議把上次結果也快取（例如 `nc-upd-cache`），30 分鐘內直接顯示。
- **手動**：「檢查更新」按鈕與 Command Palette 指令，一律立即查詢。
- **失敗**：自動失敗 → 不寫入任何錯誤狀態、不顯示任何 UI，維持上一次結果或「尚未檢查」。手動失敗 → `err = "目前無法連線到 npm，稍後再試"`，只在按鈕下方顯示一行字；保留上一次的版本資訊。
- **Toast**：只在 **自動** 檢查發現新版、且 `localStorage["nc-upd-toasted"] !== latest`、且該版未被略過（已棄用例外）時顯示一次，顯示後寫入 `nc-upd-toasted = latest`。手動檢查不跳 toast。
- **略過這一版**：`localStorage["nc-upd-skipped"] = latest`。效果：不跳 toast、Rail 圓點與「關於」頁籤徽章都不顯示；「關於」區塊照常顯示新版並多一列「恢復提醒」。出現更新的 `latest` 時自然失效。**已棄用的版本不能略過**（按鈕不出現、圓點／徽章照常顯示）。
- **不做「稍後提醒」**：toast 只出現一次、自動檢查 30 分鐘才一次，「稍後提醒」只會增加通知。

---

## State Management
單一 store（prototype：`wb/pt-update-data.jsx` 的 `updStore` + `useUpd()`；實作可用 nanostores 等跨 island 共享）：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `status` | `"idle" \| "checking" \| "done"` | idle = 從未成功檢查 |
| `res` | `UpdResult \| null` | 最近一次成功結果 |
| `checkedAt` | `number \| null` | 最近一次成功檢查時間 |
| `err` | `string \| null` | 只有手動失敗會寫入；下一次檢查開始時清空 |
| `drawer` | `boolean` | Drawer 是否開啟 |
| `toast` | `UpdResult \| null` | 目前顯示中的 toast |
| `skipped` | `string \| null` | 被略過的版本號（同步 localStorage） |

`UpdResult`：`{ cur, curDate, latest, latestDate, level, behind, missed[], engines, nodeNeed, userNode, needsNode, deprecated, size, files }`

`tone`（`updTone(res)`，決定圓點／徽章／hero 強度）：`deprecated` → `"danger"`；`level === "major"` → `"major"`；patch／minor → `"info"`；無更新 → `null`。

Rail 與頁籤徽章的顯示條件（`useUpdRail()`）：`tone && !(skipped === latest && !deprecated)`，回傳 `{ tone, n: behind, label }`。

狀態轉移：
- `updCheck(manual)`：`status = "checking"`、`err = null` → 成功：`status = "done"`、寫入 `res`／`checkedAt`／`nc-upd-last`，視條件設 `toast` → 失敗：`status = res ? "done" : "idle"`，手動才寫 `err`。
- `updOpenDrawer()`：`drawer = true`、`toast = null`。
- `updSkip(v)` / `updUnskip()`。

---

## Screens / Views

### 1. Rail 圓點（`PtRail`，「設定與關於」按鈕）
- `.upd-rail-dot`：`position:absolute; top:5px; right:5px; 8×8; border-radius:50%; box-shadow:0 0 0 2px var(--wb-rail) #161c28`。
- 色：info `--upd-info #2c6ebb`、major `--upd-major #e3a008`、danger `--upd-danger #d64545`。
- 進場：`ncPop`（scale .8 → 1 + 淡入）240ms `--upd-ease`。
- 按鈕 `title`／`aria-label` 加上說明：`設定與關於 ・ 有新版 v1.9.2，落後 4 個版本`；已棄用：`目前版本 v1.8.5 已棄用`。
- 手機（≤860px）rail 變底部列，圓點位置相同。
- 圓點不可點，只作提示。與既有 AI 佇列的 `.wb-rail-dot`（6px、`--wb-warn`）是不同元件。

### 2. 「關於」頁籤數字徽章（`PtHeader` tabs）
- `PtHeader` 新增 `tabBadges` prop：`{ [tabName]: { n, tone, label } }`。「設定與關於」頁傳入 `{ 關於: useUpdRail() }`。
- `.upd-tab-badge`：`min-width:18px; height:18px; margin-left:6px; padding:0 5px; border-radius:999px; 11px/700; tabular-nums; line-height:1`。
  - info：底 `--upd-info #2c6ebb`、字 `#fff`
  - major：底 `--upd-major #e3a008`、字 `--wb-ink #161c28`（白字在黃底對比不足）
  - danger：底 `--upd-danger #d64545`、字 `#fff`
- 數字 = `behind`（落後版數）。按鈕 `aria-label="關於，有新版 v1.9.2，落後 4 個版本"`。
- 顯示條件與 Rail 圓點相同，兩者永遠同步。

### 3. 「關於」分頁：版本與更新區塊（`PtUpdBlock`）
位置：`PtSettings` 「關於」分頁 `.wb-body.flush` 的第一個子元素（統計列 `PtStatStrip` 之上）。外層 `<section class="upd" aria-label="版本與更新">`，`border-bottom:1px solid --wb-line`。

由上到下：

**a. 群組標頭**：既有 `.wb-gh`（32px、底 `--wb-bg`、`border-top:none`），icon `refresh` 13px、標題「版本與更新」12.5px/700，右側 `.wb-gh-stats`「開頁時自動檢查，30 分鐘內不重複」（手機隱藏）。

**b. Hero `.upd-hero`**：`display:flex; align-items:center; gap:20px; padding:16px 18px; flex-wrap:wrap; border-bottom:1px solid --wb-line-2`。
- 強度底色：major `color-mix(in srgb, --upd-major 7%, --wb-panel)`；danger `color-mix(in srgb, --upd-danger 5%, --wb-panel)`；其他無底色。
- 左 `.upd-ver`（flex:1, min-width:220px）：
  - 版本列 `.upd-ver-row`（baseline 對齊、gap 8px）：`目前`（11px `--wb-ink-3`）＋ `v1.8.5`；有新版時接 → 箭頭（15px `--wb-ink-3`）＋ `最新` ＋ `v1.9.2`。
  - 版本號 `.upd-v`：`--font-mono` 22px/700、`--wb-ink`、letter-spacing -.01em、tabular-nums。有新版時目前版本改 `.old`：weight 500、`--wb-ink-2`。
  - pills `.upd-pills`（margin-top 8px、gap 6px、min-height 20px），見下方「Pill 規則」。
- 右 `.upd-act`（column、align-items:flex-end、gap 6px）：
  - 按鈕列：**只要有檢查結果（`res` 不為 null，包含已是最新版）** 就顯示 `.wb-btn-solid`「查看更新內容」（icon notes，白）；永遠有 `.wb-btn-ghost`「檢查更新」（icon refresh）。檢查中：`disabled`、`aria-busy`、icon 換 spinner、文字「檢查中…」、opacity .7。
  - 狀態行 `.upd-status`（11.5px `--wb-ink-3`、min-height 17px、靠右、`aria-live="polite"`）：
    - 有 `err` → `.upd-err`（`--wb-ink-2`）`目前無法連線到 npm，稍後再試`
    - 有 `checkedAt` → `3 分鐘前檢查`（`剛剛`／`N 分鐘前`／`N 小時前`，每 30 秒重算）
    - 都沒有且非檢查中 → `尚未檢查`

**Pill 規則（`UpdLevelPills`，Block 與 Drawer 共用）**：
| 狀態 | pills |
|---|---|
| idle、無結果 | `.wb-pill.muted`「尚未檢查新版」 |
| checking、無結果 | spinner ＋「正在向 npm registry 查詢…」（12px `--wb-ink-3`） |
| 已是最新 | `.wb-pill.ok` ✓「已是最新版」＋ `.wb-pill.muted`「發佈於 12 天前」 |
| patch | `.wb-pill.muted`「修補更新 patch」 |
| minor | `.wb-pill`（藍）「功能更新 minor」 |
| major | `.wb-pill.warn` + weight 700「主版本更新 major」 |
| 有新版時接 | `.wb-pill.muted`「落後 N 個版本」、`.wb-pill.muted`「最新版 N 天前發佈」 |
| 已棄用（最前面） | `.wb-pill.danger` + weight 700「目前版本已棄用」 |

相對日期（`updDays`）：今天／昨天／N 天前（<14）／N 週前（<60 天）／N 個月前。

**c. 提示框 `.upd-notes`**（`padding:12px 18px; gap:8px; border-bottom:1px solid --wb-line-2`；Drawer 內 `padding:12px 0 0` 無邊框）。`.upd-note`：`flex; gap:10px; padding:10px 12px; radius 8px; 12.5px/1.75 --wb-ink-2`；icon `warn` 15px（margin-top 3px）；標題 `.upd-note-t` 700 `--wb-ink`。
- 黃（預設）：底 `color-mix(--upd-major 10%, --wb-panel)`、框 `color-mix(--upd-major 32%, --wb-panel)`、icon `--upd-major`
- 紅 `.danger`：底 `color-mix(--upd-danger 7%, ...)`、框 `color-mix(--upd-danger 30%, ...)`、icon `--upd-danger`，`role="status"`

最多三則，依序：
1. **已棄用**（紅）：「v1.8.5 已被標記為棄用」／「npm 上的說明：「{deprecated}」建議直接升級到 v{latest}。」
2. **需要先升級 Node**（黃，`level && needsNode`）：「升級前需要先升級 Node」
   - viewer：「v2.0.0 要求 Node ≥ 22，你目前使用 Node 20.11.1。請先升級 Node，再執行升級指令。」＋連結「下載 Node.js ↗」（https://nodejs.org/）
   - deploy：「v2.0.0 要求 Node ≥ 22，此站目前以 Node 20.11.1 建置。請先把 Netlify 的 `NODE_VERSION` 設為 22 以上，再升級套件。」
3. **主版本破壞性變更**（黃，`major && !needsNode`）：「主版本更新可能有破壞性變更」／「這次有 {removed} 項移除、{changed} 項變更。升級前請先看更新內容，必要時對照遷移指南。」（數量來自 CHANGELOG 統計）

**d. 部署站說明**（deploy 且有新版）`.upd-deploy`：12px `--wb-ink-3`、`padding:10px 18px`：「這是部署站，訪客看到的是提醒。升級由站台維護者在 repo 中進行，重新部署後生效。」

**e. 設定列**（既有 `PtSetRow` / `.wb-set`）：
| 列 | 條件 | 內容 |
|---|---|---|
| 升級指令 | 有新版或已棄用 | 說明：viewer「複製後在終端機執行」／deploy「在站台的 repo 中執行，重新部署後生效」；右側 `UpdCmds` |
| 最新版需求（無新版時叫「Node 需求」） | 有結果 | 說明 `engines.node：>=22`；`Node ≥ 22` ＋ pill「你目前 20.11.1」（deploy 為「建置用」）。`needsNode` 時 `.wb-pill.warn`，否則 `.muted` |
| 套件 | 有結果 | 說明 `notecraftapp@1.9.2`；`1.4 MB ・ 152 個檔案`（`--wb-ink-3`） |
| 已略過 v{latest} 的提醒 | 已略過且未棄用 | 說明「這一版不再跳通知、Rail 不顯示圓點。有更新的版本時會恢復提醒。」；`.wb-btn-ghost`「恢復提醒」 |

**升級指令 `UpdCmd`**：`.upd-cmds` column gap 6px、width 460px（max 100%）。每列 `.upd-cmd`：`height:34px; padding:0 3px 0 12px; gap:10px; border:1px solid --wb-line; radius 6px; 底 --wb-bg`。
- 標籤 `.upd-cmd-l` 11px `--wb-ink-3`、寬 62px：`viewer 模式`、`全域安裝`
- 指令 `<code>` `--font-mono` 12px `--wb-ink`、不換行、超出時框內水平捲動（隱藏捲軸）：`npx notecraftapp@latest view`、`npm i -g notecraftapp@latest`
- 複製鈕 `.upd-copy`：26px 高、`padding:0 9px`、radius 5、11.5px/700 `--wb-blue-l`、icon copy 13px＋「複製」；hover 底 `--wb-panel`。按下後 1.6 秒內變 `.done`：`--wb-ok`、icon check、「已複製」，並由隱藏的 `aria-live` 讀出「已複製到剪貼簿」。

### 4. 更新詳情 Drawer（`PtUpdDrawer` / `UpdDrawerPanel`）
- 沿用 `.wb-scrim` ＋ `.wb-drawer`（absolute 於 `.wb-main` 內、右側、`wbSlide` 200ms），加 `.upd-dw`：**寬 520px**；平板（861–1100）沿用既有 420px；手機全寬。`role="dialog" aria-label="更新內容"`。
- **標頭** `.wb-dw-h`：左 crumb `notecraftapp ・ 更新內容`；右 `.wb-dw-x`（aria-label「關閉（Esc）」）。
- **內容** `.wb-dw-body`（padding 16px，捲動）：
  1. 標題 `.wb-dw-t.upd-dw-t`（19px/700、`--font-mono`）：`v1.8.5 → v1.9.2`
  2. pills（同 Block）
  3. 提示框（同 Block）
  4. `.wb-dw-sec`「升級指令」＋ `UpdCmds`（只在有新版時）
  5. 有新版：`.wb-dw-sec`「你錯過的更新 **4** 個版本」＋ `UpdChangelog`（`missed`）。已是最新版：`.wb-dw-sec`「目前版本的更新內容」＋ `UpdChangelog`（只有目前版本一版，`firstLabel="目前"`）
  6. `.wb-dw-sec`「套件資訊」＋ `.wb-dw-meta`：最新版 `v1.9.2（2026/09/15）`、Node `≥ 20`（needsNode 時接「　目前 20.11.1，需先升級」）、大小 `1.4 MB ・ 152 個檔案`、檢查 `3 分鐘前`
- **固定底列** `.upd-dw-f`：`padding:10px 16px; border-top:1px solid --wb-line; space-between; wrap`。左：連結「到 GitHub 看完整 CHANGELOG ↗」（12.5px/700）。右：有新版且未棄用 → `.wb-btn-ghost`「略過這一版」（title「不再為這一版跳通知與顯示 Rail 圓點」）；已略過 →「恢復這一版的提醒」。

**UpdChangelog**
- **類別 chip 列** `.upd-sum`（gap 6px、wrap、margin-bottom 8px）：既有 `.wb-chip`，內容「{類別} **{數量}**」，只列數量 > 0 的類別，順序同上表。單選篩選（`aria-pressed`）。
  - 安全 chip `.upd-chip-sec`：盾牌 icon 12px、字與數字 `--upd-security`、框 `color-mix(--upd-security 35%, --wb-panel)`；選中時框 `--upd-security`、底 `color-mix(8%)`。
  - 右側文字鈕 `.upd-linkbtn`（11.5px/700 `--wb-blue-l`）：未篩選「全部展開／全部收合」（作用於目前可見版本）；篩選中「清除篩選」。
- **版本清單** `.upd-vlist`：`border:1px solid --wb-line; radius 8px; overflow:hidden`；版本之間 `1px --wb-line-2`。
- **版本列標題** `.upd-vh`（整列是 `<button aria-expanded aria-controls>`）：`min-height:40px（手機 46px）; padding:8px 12px; gap:8px; wrap`；hover 底 `--wb-bg`。
  - caret 11px（展開時旋轉 90°，240ms）
  - 版號 `.upd-vh-v`：mono 13px/700 `--wb-ink`
  - 主版本跳號的那一版（例如 2.0.0）接 `.wb-pill.warn` 700「major」
  - 日期 `.upd-vh-d`：11.5px `--wb-ink-3`「2026/09/15 ・ 18 天前」
  - 右側 `.upd-vh-r`：含安全項目時 `.upd-secpill`（20px 高 pill、盾牌 11px＋「安全 1」、11px/700 `--upd-security`、底 `color-mix(--upd-security 10%, --wb-panel)`）；最新一版 `.wb-pill`「最新」，其他版 `.wb-badge-n`「N 項」
- **預設展開**：只展開第一版（有新版時是最新版；已是最新版時是目前版本）。
- **第一版的標記**：有新版時 `.wb-pill`「最新」；已是最新版時 `.wb-pill.ok`「目前」。
- **版本內容** `.upd-vb`：`padding:0 14px 14px 31px`（手機左 14px）；進場 `updOpen`（淡入＋下移 4px）240ms。
  - 類別 `.upd-cat`（padding-top 10px）：標題 `.upd-cat-h` 11px/700、letter-spacing .06em、`--wb-ink-3`，前置 6px 類別色圓點；項目 `<ul>` padding-left 18px、12.5px/1.75 `--wb-ink-2`、`li` margin 3px 0、`text-wrap:pretty`。
  - 安全 `.upd-cat.sec`：`margin-top:10px; padding:8px 10px; radius 6px; 底 color-mix(--upd-security 6%, --wb-panel); 框 color-mix(--upd-security 22%, --wb-panel)`；標題改盾牌 icon 且色 `--upd-security`；項目文字 `--wb-ink`。
  - 行內 code `.upd-code`：mono .9em、`padding:1px 5px; radius 4; 底 --wb-bg; 框 --wb-line-2; --wb-ink; overflow-wrap:anywhere`。
- **摺疊**：`missed.length > 5` 且未篩選時，只顯示最新 4 版，其餘收成一列 `.upd-more`（40px、底 `--wb-bg`、12px/700 `--wb-blue-l`、hover 底 `--wb-line-2`）：「⌄ 顯示較早的 8 個版本（v1.8.6 – v1.12.0）」，被收起的版本含安全項目時接 `.upd-secpill`「含安全 2」。點擊後一次列出剩餘版本標題（內容仍收合）。
- **篩選中**：只列含該類別的版本、全部展開、每版只顯示該類別、不摺疊、沒有「最新」標記。
- **載入中**（`aria-busy`）：`.upd-vlist` 內一列 `.upd-skel-h`（spinner＋「正在讀取 CHANGELOG.md…」12px `--wb-ink-3`），下接 3 列 40px 骨架（10px 高灰條 52／96／38px，`--wb-line-2` 底＋`--wb-panel` 掃光，1.3s linear）。chip 列不顯示。
- **載入失敗**：`.upd-vlist` 內 `.upd-clerr`（padding 14px、12.5px/1.75 `--wb-ink-2`）：資訊 icon 15px `--wb-ink-3`＋「CHANGELOG 暫時無法載入，版本資訊與升級指令不受影響。」＋連結「到 GitHub 看完整 CHANGELOG ↗」。不用紅色。

### 5. 發現新版 toast（`PtUpdToast` / `UpdToastView`）
- 掛在 `.wb-app` 內：`.upd-toast-wrap` absolute、`right:20px; bottom:20px; z-index:700`。手機：`left:12px; right:12px; bottom:66px`（底部列 54px 上方 12px）。
- `.upd-toast`：`flex; gap:10px; width:356px; padding:12px 10px 10px 14px; radius --radius-lg 8px; 底 --upd-toast-bg (--neutral-900); 字 #fff; box-shadow --shadow-lg`；進場 `ncRise` 280ms（上移 10px＋淡入）。`role="status"`。
- icon 17px stroke 2：一般 `arrowUp` 色 `--orange-400`；已棄用 `warn` 色 `--upd-danger`。
- 標題 `.upd-toast-t` 13.5px/700；次行 `.upd-toast-s` 12px `rgba(255,255,255,.72)`：
| 情境 | 標題 | 次行 |
|---|---|---|
| patch／minor | `NoteCraftApp v1.9.2 已發佈` | `目前 v1.8.5 ・ 落後 4 個版本` |
| major | `NoteCraftApp v2.0.0 已發佈` | `主版本更新，可能有破壞性變更 ・ 落後 12 個版本` |
| 已棄用 | `你使用的 v1.8.5 已被棄用` | `建議升級到 v1.9.2，原因見更新內容` |
| 部署站 | `此站使用的 NoteCraftApp 有新版 v1.9.2` | 同 patch／minor |
- 動作列（margin `8px 0 0 -8px`、gap 4px）：28px 高（手機 36px）文字鈕 12.5px/600 `rgba(255,255,255,.78)`，hover 底 `rgba(255,255,255,.08)`。主鈕「查看更新內容」`--orange-400` 700；次鈕「略過這一版」（已棄用時不出現）。
- 關閉 ✕ `.upd-toast-x` 24×24、`rgba(255,255,255,.6)`，aria-label「關閉通知」。
- 10 秒後自動收起；滑鼠停留或鍵盤聚焦時暫停計時。

### 6. Command Palette「指令」分組
- 在既有結果（頁籤／筆記／系列／標籤）之後加分組標題「指令」（沿用 `.nt-all-sec`）。
- 列沿用 `.wb-row`，icon 13px `--wb-blue-l`：
  - 「檢查更新」／「向 npm 查詢 notecraftapp 最新版」（icon refresh）— 一律顯示
  - 「查看更新內容」／「版本的 CHANGELOG」＋ `.wb-pill`「v{latest}」（icon notes）— 只要有檢查結果就顯示（包含已是最新版）
- 搜尋關鍵字：`檢查更新 版本 check update npm 升級`、`更新內容 changelog 版本 升級 update`。
- Enter：頁籤 → 筆記 → 指令的第一個符合項。
- 「檢查更新」：關閉 palette → 切到「設定與關於 › 關於」→ `updCheck(true)`。「查看更新內容」：關閉 palette → 開 Drawer。

---

## Interactions & Behavior
| 操作 | 結果 |
|---|---|
| 開頁 | 超過 30 分鐘就在背景自動檢查；查詢中只有「關於」區塊顯示查詢中，其他地方不變；失敗不顯示任何東西 |
| 按「檢查更新」 | 按鈕 disabled＋spinner＋「檢查中…」；成功→狀態行「剛剛檢查」；失敗→狀態行一行字，保留上次資訊；都不跳 toast |
| Rail 按鈕 | 進入「設定與關於」；「關於」頁籤旁的徽章指出提示所在 |
| Toast「查看更新內容」 | 關 toast、開 Drawer，不切換頁面 |
| Toast「略過這一版」 | 寫入 skipped；toast 關閉；圓點與徽章消失；「關於」出現「恢復提醒」列 |
| Toast ✕／Esc | 關閉；同一版不再出現；圓點與徽章保留 |
| Drawer 開啟 | 「查看更新內容」（有結果就顯示）、toast、Palette。已是最新版時只列目前版本的 CHANGELOG，不顯示升級指令與略過 |
| Drawer 關閉 | ✕、點遮罩、Esc。**Esc 在 capture 階段攔截並 `stopPropagation`**，不會同時關掉 toast 或底下浮層；toast 的 Esc 只在 Drawer 未開時作用 |
| 版本列 | 點整列展開／收合 |
| 類別 chip | 單選篩選；再點一次或「清除篩選」回復 |
| 顯示較早的 N 個版本 | 一次列出剩餘版本標題 |
| 複製 | 寫入剪貼簿；按鈕 1.6 秒「已複製」（綠）；aria-live 讀出 |
| ⌘K「檢查更新」 | 跳到「關於」並立即手動檢查 |

### 動畫
全部使用 `--upd-ease: cubic-bezier(.22,.7,.3,1)`（與既有 Drawer 相同）。
| 項目 | 一般 | `prefers-reduced-motion: reduce` |
|---|---|---|
| Drawer 滑入 | 既有 `wbSlide` 200ms | 直接出現 |
| Toast | `ncRise` 280ms | 直接出現 |
| Rail 圓點、頁籤徽章 | `ncPop` 240ms | 直接出現 |
| 版本展開 | `updOpen` 240ms（淡入＋下移 4px）；caret 旋轉 240ms | 無位移、caret 直接換向 |
| Spinner | 0.8s 旋轉 | 靜態完整圓環、opacity .45（搭配「檢查中…」文字） |
| 骨架 | 1.3s 掃光 | 靜態灰條 |
| 複製鈕顏色 | 160ms | 無 transition |

### 響應式（≤860px）
- Hero 改直排（`gap:14px; padding:14px`），按鈕列靠左、兩顆按鈕各 `flex:1`、高 40px；狀態行靠左。
- 指令框全寬、高 44px；複製鈕 36px。
- Drawer 全寬；版本列 min-height 46px；版本內容左內距 14px。
- Toast 左右 12px、底部列上方；動作鈕 36px。
- `.wb-set` 既有規則會把設定列改成上下排列。

### 版面限制
Rail 52px、Sidebar 240px 不變；主區整頁不捲動，只有 `.wb-body` 與 Drawer 的 `.wb-dw-body` 捲動。Drawer 底列固定不捲動。

---

## Design Tokens

### 新增（皆為既有 token 的語意別名，沒有新色碼）
| Token | 值 | 用途 |
|---|---|---|
| `--upd-info` | `var(--wb-blue-l)` #2c6ebb | patch／minor 圓點與徽章 |
| `--upd-major` | `var(--wb-warn)` #e3a008 | major 圓點／徽章／hero 淡底、Node 與破壞性變更提示、「移除」「棄用」類別點 |
| `--upd-danger` | `var(--wb-danger)` #d64545 | 已棄用的圓點／徽章／hero／提示框 |
| `--upd-security` | `var(--wb-danger)` #d64545 | CHANGELOG「安全」類別、chip、安全 pill（與 danger 分開命名以便日後獨立調整） |
| `--upd-toast-bg` | `var(--neutral-900)` | toast 底色（同既有 ToastHost） |
| `--upd-dur` | `240ms` | 圓點、徽章、展開、caret |
| `--upd-ease` | `cubic-bezier(.22,.7,.3,1)` | 所有更新相關動畫 |

### 沿用（`wb/pt.css`）
`--wb-blue #1b4f9c`、`--wb-blue-d #163f7d`、`--wb-blue-l #2c6ebb`、`--wb-gold #ed9b26`、`--wb-bg #f6f8fb`、`--wb-panel #fff`、`--wb-line #e1e6ee`、`--wb-line-2 #eef1f6`、`--wb-ink #161c28`、`--wb-ink-2 #2b3546`、`--wb-ink-3 #6c798e`、`--wb-rail #161c28`、`--wb-ok #2e9e6b`、`--wb-warn #e3a008`、`--wb-danger #d64545`；`--font-mono`；`--orange-400`、`--neutral-900`、`--shadow-lg`（TrendLink tokens）。圓角：pill 999px、卡片／框 8px、指令框與安全框 6px、行內 code 4px。

字型：Noto Sans TC（內文）、`--font-mono`（版本號、指令、行內 code）。

## Assets
沒有圖片。新增的線條 icon（24px grid、stroke 1.7、round cap/join，Lucide 風格），path 見 `wb/pt-shell.jsx` 的 `PT_ICONS`：`refresh`、`shield`、`copy`、`arrowUp`、`warn`。其餘沿用 `notes`、`check`、`close`、`chev`、`back`、`about`。

## Files
新增：
- `prototype/wb/pt-update-data.jsx` — mock registry／CHANGELOG 資料、`updResult()`、store、`updCheck()`／`updBoot()`／略過邏輯
- `prototype/wb/pt-update.jsx` — `PtUpdBlock`、`UpdNotes`、`UpdLevelPills`、`UpdCmd(s)`、`UpdChangelog`、`UpdVersion`、`UpdDrawerPanel`／`PtUpdDrawer`、`UpdToastView`／`PtUpdToast`、`useUpdRail`
- `prototype/wb/pt-update.css` — 全部 `.upd-*` 樣式、token、手機與 reduced-motion
- `prototype/NoteCraft 檢查更新 Spec.html`、`prototype/Update States Frame.html`

修改（搜尋 `upd` 可找到整合點）：
- `prototype/wb/pt-shell.jsx` — 新 icon；`PtRail` 加圓點與 aria-label；`PtHeader` 新增 `tabBadges`
- `prototype/wb/pt-views2.jsx` — `PtSettings`「關於」最上方插入 `<PtUpdBlock />`
- `prototype/wb/pt-app.jsx` — `NC_UPD_ENV`、開頁 `updBoot()`、「關於」頁籤徽章、Palette「指令」分組（`PT_CMDS`、`onCmd`）、掛載 `PtUpdDrawer`（`.wb-main` 內）與 `PtUpdToast`（`.wb-app` 內）、Tweaks
- `prototype/NoteCraft 工作台 Prototype.html` — 載入 `pt-update.css`、`pt-update-data.jsx`、`pt-update.jsx`

其他檔案（`app/`、`er/`、其餘 `wb/`、`_ds/`）是工作台既有內容，只為了讓 Prototype 能執行。

## 實作備註
- registry 查詢建議加 `AbortController` 逾時（例如 8 秒），逾時視同失敗。
- `localStorage` 不可用（隱私模式）時：每次開頁都檢查、toast 每次 session 最多一次（改存 memory）。
- 部署站的訪客也會看到提醒；如果站台維護者不想讓訪客看到，可考慮 build 選項（例如 `updateCheck: false`）關閉，但不在本次設計範圍。
- prerelease（`-beta` 等）不算新版，也不計入落後版數。
