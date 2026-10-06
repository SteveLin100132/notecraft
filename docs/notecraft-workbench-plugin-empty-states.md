Project Name: NoteCraft Workbench — Plugin 頁空狀態與「內建外掛外洩」修正
文件類型: Design Document
文件版本: v0.2.0
開發模式: Waterfall
技術選型: 確定（沿用既有技術棧，不新增套件；插圖為 inline SVG）
文件狀態: 已定案、未實作 —— §13 的 6 題已於 2026-10-06 逐題確認（紀錄見 §14）
文件作者: 建宇
建立日期: 2026-10-06
更新日期: 2026-10-06
依賴文件: docs/notecraft-plugin-system.md（§4.2 Q17 主專案自己消費 plugins/）、docs/notecraft-workbench.md（§8.6 Plugin 頁與 Drawer）、docs/notecraft-workbench-empty-states.md（`EmptyState`／`pt-empty*`）、docs/notecraft-workbench-update-check.md（複製指令互動）、docs/prototype/design_handoff_plugin_empty_states/README.md
分支: fix/plugin-empty-states
---

# NoteCraft Workbench — Plugin 頁空狀態設計文件

這份文件處理兩件互相牽連的事：

1. **錯誤修正**：沒有安裝任何外掛的工作區，`/plugins` 的「已安裝外掛」仍列出 `er-diagram-renderer` 與 `openapi-renderer`。根因是 npm 套件把官方 store `plugins/` 一起發佈了（§2）。
2. **空狀態設計**：修掉 1 之後，「0 個外掛」才會真的出現，而現行 UI 沒有為它與其他「裝了卻沒在用」的情境設計畫面（§3 起），依 handoff `design_handoff_plugin_empty_states/` 實作。

1 必須先做：不修 1，情境 3／4（0 個外掛）在 npx viewer 永遠不會出現，空狀態做了也看不到。

---

## 1. 這份文件要解決什麼

### 1.1 起點

作者在 `sme-ai-talent-2026-proposal`（npx viewer，`notecraftapp ^1.10.1`）打開 `/plugins?tab=installed`，看到「已安裝 2、啟用中 2」。該工作區的 `.notecraft/` 只有 `components/` 與 `series.json`，**沒有 `plugins/`、也沒有 `plugins.json`**。

### 1.2 目標

- npx viewer 的「已安裝外掛」只反映 `.notecraft/plugins/` 實際安裝的外掛；主 repo 仍能直接 build 官方外掛（Q17 不變）
- 同一個 id 同時存在於兩處時，renderer、manifest、schema 來自同一份
- `/plugins` 兩個頁籤、Header 徽章、Sidebar「Plugin 資料檔」區段，在 handoff 定義的 7 種情境 × dev／正式 × 三種尺寸下都有對應畫面
- 正式環境（部署站、`serve`、`build`）頁面上不出現任何 `npx` 字串

### 1.3 非目標

- **Plugin Store**（瀏覽、搜尋、在 UI 內安裝）：handoff §9 明訂這次不做。官方外掛清單抽成常數，日後換資料來源即可
- 「不相容」「渲染錯誤」pill：handoff 的列狀態優先序含這兩項，但工作台 Q23／Q24 已決定不做（app 不判斷 engines、渲染錯誤只在瀏覽器端錯誤卡片呈現），維持不做
- `install-plugin` CLI 行為不改

---

## 2. 錯誤修正：官方 store 不再隨 npm 發佈

### 2.1 根因

| 位置 | 現況 |
| :-- | :-- |
| `src/lib/plugins.ts:71-74`、`src/components/islands/PluginHost.tsx:31-34` | 兩條 glob：`/plugins/*/renderer.tsx`（app 根目錄的官方 store，Q17）＋`@notes/plugins/*/renderer.tsx`（使用者安裝） |
| `package.json` `files` | 含 `"plugins/"`（v0.6.0，d43c355 一併加入，提交訊息未說明理由） |

CLI 執行時 app 根目錄是 `node_modules/notecraftapp/`，第一條 glob 命中套件內的兩個官方外掛，`getPlugins()` 把它們當成已安裝。連帶影響：

- 部署站同樣顯示，且兩個 renderer 被打包進所有使用者的 client chunk（`PluginHost` eager glob）
- `plugins.json` 引用官方外掛但沒安裝也能 build 過，與官網〈安裝與設定內建 Plugin〉「指到尚未安裝的 Plugin，build 會失敗」矛盾
- Drawer 來源欄寫「內建 ・ 隨 notecraftapp 發佈」，把錯誤包裝成功能

### 2.2 依賴盤點

確認移除 `plugins/` 不會弄壞出貨的程式：

| 讀取 `plugins/` 的地方 | 是否出貨 | 結論 |
| :-- | :-- | :-- |
| `plugins.ts`／`PluginHost.tsx` 的 glob | 是 | 目錄不存在時命中 0 筆、不報錯（既有註解已說明） |
| `plugins.ts` `PLUGIN_ROOTS[0]`、`workbench.ts:171` 的 `builtin` 判斷 | 是 | 目錄不存在即不成立，行為等同只有使用者安裝 |
| `bin/install-plugin.mjs` | 是 | 一律從 GitHub 抓（`ghRaw`／`git clone`），不讀套件內 `plugins/` |
| `scripts/check-plugins.mjs`、`scripts/checks/*.mjs` | 否 | 只在主 repo 跑 |
| manifest 的 `$schema` | — | 指向 GitHub raw URL，不是相對路徑 |

### 2.3 修正

1. **`package.json` `files` 移除 `"plugins/"`**。主 repo 不受影響，npm 套件縮小約 572 KB。
2. **同 id 撞名時以使用者安裝為準**（只剩主 repo 會發生，但讓邏輯本身正確）：
   - `plugins.ts` 的 `PLUGIN_ROOTS` 改成 `.notecraft/plugins` 在前
   - `rendererModules` 與 `PluginHost` 的 `byId` 已是 `@notes` 後寫入、覆蓋前者，順序本來就對，不用改
   - 兩處都有同 id 時 build 期 warn 一次：`plugin "<id>" 同時存在於 plugins/ 與 .notecraft/plugins/，採用 .notecraft/plugins/ 的版本`
3. **`PluginDrawer` 來源欄**：`builtin` 的文案改成「內建 ・ 主 repo 官方 store」（只有主 repo 會看到）。
4. **護欄**：`scripts/check-plugins.mjs` 加一項，執行 `npm pack --dry-run --json`，斷言打包清單沒有 `plugins/` 開頭的路徑。`prepublishOnly` 會跑到。

### 2.4 相容性

已有工作區**沒安裝就在 `plugins.json` 引用官方外掛**的，升級後 build 會失敗，訊息已附安裝指令（`plugins.ts:327`）：

```
plugins.json 指定的 plugin "er-diagram-renderer" 尚未安裝。
  安裝：npx notecraftapp install-plugin er-diagram-renderer
```

這是回到文件原本承諾的行為，不另做相容層；CHANGELOG 以「修正」記錄並寫明遷移方式（§11）。

---

## 3. 情境模型

### 3.1 純函式 `derivePluginEnv`

新檔 `src/lib/wb-plugin-env.ts`，只能 `import type`、不碰 `window`、不寫 JSX（與 `wb-dashboard.ts` 同規則，由 `scripts/checks/wb-plugin-env.mjs` 載入斷言，併入 `npm run check:wb`）。

```ts
export type PluginReason = null | "fresh" | "noplugins" | "nomap" | "nohit" | "disabled";

export interface PluginEnv {
  reason: PluginReason;
  /** 啟用中外掛的映射規則數（plugins.json 的 plugins[] 條目，不是 glob 數） */
  activeRules: number;
  /** 啟用中外掛的所有 glob，供情境 6 的 chip 清單 */
  activeGlobs: string[];
  enabledCount: number;
}

export function derivePluginEnv(input: {
  plugins: Pick<WbPlugin, "id" | "enabled" | "mappings">[];
  hasConfig: boolean;      // WbIndex.pluginSystem
  fileCount: number;       // WbIndex.dataFiles.length（只含啟用中外掛的產物）
}): PluginEnv;
```

輸入全部是 build 期就有的 `WbIndex` 欄位，**不需要新增索引欄位**。island 內切換啟用狀態時（樂觀更新、600ms 後重載），以 `isOn` 覆寫後的 `enabled` 重算。

### 3.2 reason 判定（依序，第一個成立者）

| # | 情境 | 條件 | `reason` |
| :-- | :-- | :-- | :-- |
| 1／2 | 正常 | `fileCount > 0` | `null` |
| 3 | 全新工作區 | `plugins.length === 0 && !hasConfig` | `fresh` |
| 4 | 有 plugins.json、0 個外掛 | `plugins.length === 0 && hasConfig` | `noplugins` |
| 7 | 全部停用 | `enabledCount === 0` | `disabled` |
| 6 | 有規則、沒有命中 | `activeRules > 0` | `nohit` |
| 5 | 沒有映射規則 | 其餘（啟用中的外掛都沒有規則） | `nomap` |

**與 handoff 的差異**：handoff 以「所有外掛的規則總數」判斷 5／6，混合狀態會講錯話（例：A 停用但有規則、B 啟用但沒規則 → handoff 判成 6「有 N 條規則但沒命中」，實際上那 N 條根本沒在跑）。這裡改成只看**啟用中**的外掛，並把「全部停用」提前判斷，三種文案在任何混合狀態下都成立。見 §13 Q1。

### 3.3 實際會出現的條件

- **情境 4** 只在 `plugins.json` 沒有規則、或規則都指向列在 `disabled` 裡的外掛時出現；規則指向未安裝且未停用的外掛會直接 build fail，不是 UI 狀態
- **情境 1 與 2** 對實作而言是同一條路徑（`reason === null`），handoff 的「只裝 1 個誤列全部檔案」是 prototype 自己的資料 bug，app 沒有這個問題

---

## 4. Header 徽章

`PluginsWorkbench` 傳給 `WbHeader` 的 `pills`：

| 條件 | 正式 | dev |
| :-- | :-- | :-- |
| `reason === null` | 「N 個資料檔」muted ＋「已裝 N 個外掛」 | 同左 |
| `fresh`／`noplugins` | 不顯示 | 「未安裝外掛」muted |
| `nomap`／`nohit`／`disabled` | 不顯示 | 「已裝 N 個外掛」＋ warn pill：「未設定映射」／「映射無命中」／「外掛全部停用」 |

---

## 5. Sidebar「Plugin 資料檔」區段

`src/components/wb/Sidebar.astro:68`，現況是 `dataFiles.length > 0` 才渲染整段。

| 條件 | 呈現 |
| :-- | :-- |
| `dataFiles > 0` | 照舊 |
| `dataFiles = 0`、dev | 保留區段標題＋一個入口：`plug` icon、文字「尚無資料檔」（`--wb-ink-3`）、無數字、無資料夾項目，連到 `/plugins` |
| `dataFiles = 0`、正式 | 整段不渲染（＝現況） |

Sidebar 是 `.astro`，以 `import.meta.env.DEV` 判斷，與 layout 其他 dev-only 元素一致。`data-wb-path` 照舊設為 `/plugins`，讓高亮規則不變。

---

## 6. Toolbar（`.wb-tb`）

**資料檔頁籤**

- `dataFiles > 0`：照舊
- `dataFiles = 0`：**不渲染搜尋框與計數**；說明文字 dev「沒有資料檔 ・ 由外掛渲染的 JSON 檔會列在這裡」、正式「這個站沒有使用資料檔」

**已安裝外掛頁籤**

- `plugins > 0`：照舊（說明文字依 handoff 改為「.notecraft/plugins.json ・ 展開可看映射規則、設定覆寫與外掛檔案」）
- `plugins = 0`：不渲染「N 個外掛」；說明文字：
  - dev、`fresh`：「尚未建立 .notecraft/plugins.json ・ 沒有已安裝的外掛」
  - dev、`noplugins`：「.notecraft/plugins.json ・ 沒有已安裝的外掛」
  - 正式：「這個站沒有使用外掛」

---

## 7. Body

### 7.1 元件切分

| 檔案 | 內容 |
| :-- | :-- |
| `src/lib/official-plugins.ts`（新） | `OFFICIAL_PLUGINS: { id, title, description, defaultGlob }[]`，目前兩筆；`installCmd(p)` 以 id＋defaultGlob 組出指令。client-safe、無 JSX |
| `src/components/wb/plugins/PluginEmptyArt.tsx`（新） | 6 張插圖（`plug`／`data`／`map`／`nohit`／`off`／`quiet`），顏色全用 `style` 帶 `--wb-*` 變數，座標照 handoff `PlArt` |
| `src/components/wb/plugins/PluginEmpty.tsx`（新） | `PlInstallEmpty`（已安裝外掛 3／4）、`PlDataEmpty`（資料檔 3–7）、`PlHint`（已安裝外掛 5／6／7 提示）、`PlCmd`、`PlSnippet` |
| `src/components/wb/PluginsWorkbench.tsx` | 以 `derivePluginEnv` 分派；移除舊的 `PluginEmptyState` |
| `src/components/wb/PluginDrawer.tsx` | 空文案（§7.5）、來源欄（§2.3） |

`PluginEmpty.tsx` 沿用 `EmptyState` 的 `pt-empty-t`／`pt-empty-s`／`pt-empty-btn` class（同一套字級與按鈕），外層改用 handoff 的 `.pl-es`（說明寬度 430px、可接指令區）。插圖不併進 `EmptyState.tsx` 的 `EmptyArt`：那邊是 Dashboard 用的兩張，混進 6 張外掛插圖會讓 Dashboard 的 chunk 一起變大。

### 7.2 「已安裝外掛」頁籤

**情境 3／4（0 個外掛）**：整個 `.wb-body.flush` 只放 `PlInstallEmpty`。不畫統計列、群組標題、「安裝新外掛」說明框。

- dev：插圖 `plug` → 標題「還沒有安裝外掛」→ 說明 → 主要動作 `PlCmd primary`「npx notecraftapp install-plugin」→ 註記「不帶 id 會列出官方外掛清單讓你選。」→（僅 `fresh`）`.pl-fresh` 提示 → 區段標題「官方外掛」→ `OFFICIAL_PLUGINS` 清單，每列附 `installCmd(p)`
- 正式：插圖 `quiet`、「這個站沒有使用外掛」、「外掛用來把 JSON 資料畫成頁面，這個站目前沒有用到。」，無動作

`.pl-fresh` 文案 handoff 標了「以 CLI 實際行為為準」。已查證 `bin/install-plugin.mjs` 的 `applyMapping()`：檔案不存在時以 `{ plugins: [] }` 起始並 `mkdir -p` 後寫入，**`--apply` 會建立 plugins.json**，文案照 handoff 原句：

> 這個工作區還沒有 `.notecraft/plugins.json`。用下方帶 `--apply` 的指令安裝，會一併建立這個檔案並寫入映射規則；只裝外掛的話，之後要自己建立。

**情境 5／6／7**：清單照常（統計列 → 群組標題 → 各列 → 說明框）。dev 在統計列與群組標題之間插入 `PlHint`，正式不顯示。

| reason | 標題 | 內容 |
| :-- | :-- | :-- |
| `nomap` | 外掛已安裝，但還沒有映射規則 | 說明＋`PlSnippet`（`.notecraft/plugins.json` 範例，§7.4） |
| `nohit` | 有 N 條映射規則，但沒有命中任何檔案 | 三個列點＋`activeGlobs` 的 `.wb-code` chip |
| `disabled` | N 個外掛都停用了 | 「停用中的外掛不處理任何檔案。用列尾的開關重新啟用，命中的資料檔會出現在『資料檔』頁籤。」 |

`nohit` 第二個列點 handoff 寫死 `src/content/notes/`，改帶 `WbIndex.workspaceLabel`（主 repo 是 `src/content/notes`、viewer 是 `<專案>/<notesDir>`），不會出現本機絕對路徑：

> 資料檔必須放在筆記資料夾 `{workspaceLabel}` 內，規則裡的路徑相對於這個資料夾。

第一個列點的 glob 說明已對照 `plugins.ts:341`（`picomatch(..., { dot: false })`、未開 `matchBase`），`*.er.json` 確實只比對最上層。

**列狀態**（情境 3–7 適用，1／2 也一起套用，因為判斷只看該列自己）：

- pill 槽（版本 chip 右側）：`mappings` 為空 →「未映射」warn；啟用中、有規則、`matched` 為空 →「無命中」warn
- 「N 檔」欄：停用中顯示「—」、`title="停用中，不處理任何檔案"`；啟用中顯示 `matched.length`
  - 現況是 `matched + inactiveMatches`，停用的外掛會顯示「若啟用會命中幾檔」。handoff 改成「—」，理由是停用就是不處理；`inactiveMatches` 仍在 Drawer 列出（§7.5），資訊沒有遺失

**「安裝新外掛」說明框**：改成 dev-only（現況正式環境也顯示，讀者看到 `npx` 指令沒有意義）。

### 7.3 「資料檔」頁籤

`dataFiles = 0` 時 Body 只放 `PlDataEmpty`；按鈕一律呼叫既有的 `goTab("installed")`（`replaceState`，不換路由）。文案、插圖照 handoff §5.3 的表，N 以 `plugins.length`／`activeRules` 帶入。正式環境一律 `quiet` 版、無動作。

`dataFiles > 0` 但搜尋無結果：維持現有單行 `.wb-empty`「沒有符合條件的資料檔。」。

### 7.4 `PlSnippet` 的 glob 來源

handoff 寫「glob 取該外掛 manifest 的預設值」，但 `notecraft-plugin.json` **沒有預設 glob 欄位**。改為：

1. id 在 `OFFICIAL_PLUGINS` → 用它的 `defaultGlob`
2. 否則 → `**/*.json`（與 `install-plugin` 沒帶 `--apply` 時印出的範例一致，`install-plugin.mjs:483`）

清單只列**啟用中**的外掛（停用的寫了規則也不會生效）。見 §13 Q2。

### 7.5 Drawer 空文案

| 區段 | 條件 | 文案 |
| :-- | :-- | :-- |
| 映射規則 | `mappings` 為空 | 「plugins.json 沒有指定這個外掛要處理的檔案。」（取代現行「plugins.json 沒有指向這個外掛的規則。」） |
| 命中的資料檔 | 停用中且 `inactiveMatches` 為空 | 「停用中，不處理任何檔案。」 |
| 命中的資料檔 | 啟用中、有規則、`matched` 為空 | 「沒有檔案符合這條映射。」 |
| 命中的資料檔 | 沒有規則 | 「沒有映射規則，所以沒有命中的檔案。」 |

停用中但 `inactiveMatches` 有值時，照現況列出灰色的「已停用」列。

---

## 8. 互動

### 8.1 複製

沿用 `UpdateParts.tsx` 的 `UpdateCmd` 行為（`writeClipboard`、1600ms 還原、`aria-live` 朗讀、`.wb-upd-copy` 樣式），並加上成功時 `toast()`（`lib/toast.ts`）：指令「已複製指令」、範例「已複製 .notecraft/plugins.json 範例」。

**與 handoff 的差異**：handoff 寫「剪貼簿失敗也顯示已複製」，但 app 現行的 `UpdateCmd` 是失敗時顯示「無法複製」並自動選取文字，讓使用者手動複製。沿用 app 的行為，不 toast。見 §13 Q3。

實作上把 `UpdateCmd` 的狀態邏輯抽成 `useCopyState()`（`src/components/wb/useCopyState.ts`），`UpdateCmd`、`PlCmd`、`PlSnippet` 共用；`UpdateCmd` 的 DOM 與 class 不變。

### 8.2 重新啟用（情境 7）

dev 的列尾 `PluginSwitch` 與 Drawer 的 `PluginToggleButton` 已存在（寫 `plugins.json` 的 `disabled`、600ms 後重載）。樂觀更新期間以覆寫後的 `enabled` 重算 `derivePluginEnv`，提示會先消失；重載後 Header、Sidebar、兩個頁籤以 build 期資料一致呈現。

---

## 9. 樣式

- `.pl-*` 規則追加到 `workbench.css`（沿用 prototype class 名，與 `pt-empty*`、`dv-`、`cal-` 的前例一致），數值照 handoff §5–§6、§8
- **不新增 token**：handoff 的 `color-mix(... var(--wb-gold) 8% ...)` 等只引用既有 `--wb-*`；`.pt-empty-btn` hover 邊框已有 `--wb-dv-hover-line`
- 規則裡不出現色碼字面值
- 860px 斷點的 `.pl-es`／`.pl-hint` 縮 padding、複製鈕 36px、`.pl-cmd.primary` 最小高 46px，放在既有 860px 媒體規則之前（與 `cal-` 規則同理）
- 指令一律 `white-space:pre-wrap; overflow-wrap:anywhere`，375px 寬不得出現橫向捲動
- 插圖無動畫，不需 reduced-motion 對應

---

## 10. SSR、dev／正式、viewer

- `reason` 只依 build 期資料，**SSR 與 hydration 結果一致**，不需要「—」佔位
- dev 判斷一律用既有 `isDev` prop（island）或 `import.meta.env.DEV`（`.astro`）；`notecraftapp view` 是 dev，`serve`／`build` 是正式
- 正式環境移除：`PlHint`、`PlCmd`、`PlSnippet`、`.pl-fresh`、官方外掛清單、「安裝新外掛」說明框、Sidebar 0 檔入口、Header 原因 pill
- 不輸出本機路徑：唯一帶路徑的地方是 `workspaceLabel`，它本來就保證不含絕對路徑與 `../`
- 驗收時在 `dist` 以 `grep -r "npx" --include=*.html` 確認 `/plugins` 頁沒有 `npx`（§12）

---

## 11. 實作階段

| Task | 內容 | 驗證 |
| :-- | :-- | :-- |
| 121 | §2：移除 `files` 的 `plugins/`、`PLUGIN_ROOTS` 順序與撞名 warn、Drawer 來源文案、`check-plugins` 打包斷言 | `npm pack --dry-run` 無 `plugins/`；主 repo dev 仍見 2 個「內建」；`npm run check-plugins` |
| 122 | §3：`wb-plugin-env.ts`＋`official-plugins.ts`＋`scripts/checks/wb-plugin-env.mjs`（7 種 reason 與混合狀態） | `npm run check:wb` |
| 123 | §4–§9：Header、Sidebar、Toolbar、兩個頁籤 Body、`PlHint`、列狀態、Drawer 空文案、`useCopyState`、`.pl-*` 樣式 | §12 驗收 |
| 124 | 收尾：CHANGELOG `1.11.0`（「修正」官方外掛外洩＋遷移說明、「新增」空狀態）、版號、CLAUDE.md、`notecraft-plugin-system.md` Q17 補「只限主 repo，不隨 npm 發佈」、`notecraft-workbench.md` §8.6 連到本文件、本文件 §15 回填 | `npx tsc --noEmit`（不新增錯誤）、`npx astro build`、`npm run check-plugins` |

### 11.1 情境 fixture

新增 `scripts/fixtures/plugin-empty-states.mjs`（放 `fixtures/` 不放 `checks/`）：在 scratch 目錄產生 5 個工作區（情境 3–7），各自以本機 `node bin/notecraftapp.mjs view` 開啟，印出網址供逐一檢查；加 `--build` 時改跑 `build` 並斷言產物：

- 情境 3／4：`/plugins` HTML 不含 `er-diagram-renderer`、`openapi-renderer`（驗證 §2）
- 全部情境：正式產物不含 `npx`
- client chunk 不含官方 renderer 的程式碼（以 `oar-` 或 ER 專屬 class 字串抽查）

需要幾分鐘，不併入 `check-plugins`（同 `ignore-sample.mjs` 的定位）。

---

## 12. 驗收清單

- [ ] 用 `npm pack` 打出的 tarball 裝進一個沒有 `.notecraft/plugins/` 的工作區，`/plugins` 顯示 0 個外掛（＝原始回報情境）
- [ ] 主 repo dev：仍顯示 2 個外掛、來源「內建 ・ 主 repo 官方 store」
- [ ] 7 情境 × dev／正式 × 電腦／平板／手機，與 handoff prototype 一致（§3.2、§7.4、§8.1 的刻意差異除外）
- [ ] 情境 3–7 的「已安裝外掛」頁籤不再出現「還沒有資料檔」
- [ ] 0 個外掛時不出現統計列、空群組標題、「安裝新外掛」說明框
- [ ] 正式產物 `/plugins` 頁找不到 `npx`
- [ ] 375px 寬下所有指令自動換行、頁面無橫向捲動
- [ ] 複製成功顯示「已複製」1.6 秒並跳 Toast；失敗顯示「無法複製」並選取文字
- [ ] 情境 7 在 dev 重新啟用一個外掛後，重載後 Header、Sidebar、兩個頁籤同步
- [ ] 混合狀態（A 停用有規則＋B 啟用無規則）顯示 `nomap`，不顯示「有 N 條映射規則」
- [ ] 搜尋無結果仍是單行字

---

## 13. 待釐清問題

| # | 問題 | 建議 | 理由 |
| :-- | :-- | :-- | :-- |
| Q1 | reason 判定要照 handoff（所有外掛的規則總數），還是只看啟用中外掛（§3.2）？ | **只看啟用中** | handoff 的算法在混合狀態會顯示錯誤文案；7 個純情境的結果兩者相同 |
| Q2 | `PlSnippet` 的 glob 從哪來？manifest 沒有預設 glob 欄位 | **官方常數的 `defaultGlob`，其餘 `**/*.json`**（§7.4） | 不動 manifest 格式；在 manifest 加欄位要改 schema、registry、check-plugins，留給 Plugin Store 一起做 |
| Q3 | 剪貼簿失敗時照 handoff 顯示「已複製」，還是沿用 app 的「無法複製＋選取文字」？ | **沿用 app** | 失敗時謊報已複製，使用者貼上會拿到舊內容；app 已有更好的退路 |
| Q4 | 撞名修正（§2.3 第 2 項）要在這次做嗎？ | **要** | 修完打包後只剩主 repo 會撞，但改一行順序＋一個 warn，成本很低 |
| Q5 | 版號：`1.10.2`（修正）還是 `1.11.0`？ | **`1.11.0`** | 同時有新 UI；且移除內建外掛對「沒裝就引用」的工作區是行為改變，minor 比 patch 誠實 |
| Q6 | 「N 檔」欄停用時改「—」，會讓作者看不到停用外掛原本命中幾檔，是否接受？ | **接受** | Drawer 仍列出 `inactiveMatches`；列上數字代表「現在處理幾檔」語意較一致 |

---

## 14. 定案紀錄

2026-10-06 與作者逐題確認，6 題皆採建議選項：

| # | 決定 |
| :-- | :-- |
| Q1 | reason 只看啟用中外掛（§3.2），不照 handoff 的規則總數 |
| Q2 | `PlSnippet` 的 glob：官方外掛用 `OFFICIAL_PLUGINS.defaultGlob`，其餘 `**/*.json`；不動 manifest 格式 |
| Q3 | 剪貼簿失敗沿用 app 的「無法複製＋選取文字」，不 toast |
| Q4 | 撞名修正這次一起做（§2.3 第 2 項） |
| Q5 | 版號 `1.11.0` |
| Q6 | 停用中外掛的「N 檔」欄顯示「—」，`inactiveMatches` 留在 Drawer |

## 15. 實作後回填

（實作完成後填寫：與本文件的偏離、實測結果）
