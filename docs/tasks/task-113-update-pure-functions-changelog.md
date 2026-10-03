# Task 113 — 檢查更新地基：版本推導、CHANGELOG 解析、預繪函式、斷言

> 規格 [notecraft-workbench-update-check.md](../notecraft-workbench-update-check.md) §4.1–§4.4、§7、§12；Q1、Q2、Q4 定案（§16）。
> 設計交付 [design_handoff_update_check](../prototype/design_handoff_update_check/) README「資料來源與檢查流程」「State Management」；行為對照 `prototype/wb/pt-update-data.jsx` 的 `updResult()`、`updTone()`、`useUpdRail()`。
> 無前置依賴，**本批第一個做**；Task 114、115、116 都靠它。

## 為什麼要有這一步

「落後幾版」「更新等級」「該不該亮圓點」「Drawer 列哪幾段 CHANGELOG」錯了 build 照樣全綠，只有斷言抓得到。而且 CHANGELOG 的實際格式比 handoff 假設的複雜（中文類別、「內部」、續行、巢狀清單、粗體、區間標題、導言、`<!-- 重點 -->` 註解），拿 repo 的真實 `CHANGELOG.md` 當斷言輸入，日後改寫格式時會直接在 `check-plugins` 擋下。

## 範圍

### 1. `src/lib/update-check.ts`（新增，純函式）

型別照規格 §4.1（`UpdLevel`、`UpdTone`、`UpdResult`）。另外：

```ts
export const UPD_STORAGE_KEY = "nc-update-v1";
export const UPD_TTL_MS = 30 * 60 * 1000;
export const UPD_TIMEOUT_MS = 8000;
export const NPM_PACKUMENT_URL = "https://registry.npmjs.org/notecraftapp";
export type UpdCache = { cur: string; at: number; res: UpdResult; toasted: string | null; skipped: string | null };
```

| 函式 | 規則 |
| --- | --- |
| `parseSemver(v)` | `x.y.z` 或 `x.y.z-pre` → `{ major, minor, patch, pre }`；其他回 `null` |
| `cmpSemver(a, b)` | 數值比較；同版號時有 prerelease 的較小；`1.10.0 > 1.9.0` |
| `isStable(v)` | 可解析且不含 prerelease |
| `levelOf(cur, latest)` | 規格 §4.2：major／minor／patch；`cur >= latest` → `null` |
| `nodeNeedOf(engines)` | 認 `>=N`、`>=N.x.y`、`^N`、`N.x`；其他（`\|\|`、空白分隔區間、空字串）→ `null` |
| `deriveResult(packument, cur, userNode)` | 照規格 §4.2 組 `UpdResult`；packument 缺 `dist-tags.latest` 或 `versions` → **throw**（呼叫端視同失敗）；`missed` 由新到舊；`ahead = cmpSemver(cur, latest) > 0`（Q4） |
| `updTone(res)` | `deprecated` → `danger`；`major` → `major`；patch／minor → `info`；否則 `null` |
| `railHintOf(res, skipped)` | handoff `useUpdRail()`：`tone && !(skipped === latest && !deprecated)` → `{ tone, n: behind, label }`；label 照 handoff「設定與關於 ・ 有新版 v1.9.2，落後 4 個版本」／「目前版本 v1.8.5 已棄用」 |
| `readCache(raw, cur)` | JSON 壞、外形不對、`cur` 不符 → `null`（§4.5：`cur` 不同整份作廢） |
| `isFresh(cache, now)` | `now - at < UPD_TTL_MS` |
| `shouldToast(res, cache, manual)` | 規格 §5：`!manual && level && toasted !== latest && (skipped !== latest \|\| deprecated)` |
| `agoLabel(ms, now)` | 「剛剛」（<60s）／「N 分鐘前」／「N 小時前」／「N 天前」 |
| `daysLabel(iso, now)` | handoff `updDays`：今天／昨天／N 天前（<14）／N 週前（<60 天）／N 個月前 |
| `sizeLabel(bytes)` | `1.4 MB`、`820 KB`（一位小數，1024 進位） |

- **只能 `import type`、不能有 JSX、不碰 `window`／`localStorage`／`Date.now()`**：時間一律由呼叫端傳 `now`

### 2. `src/lib/changelog-parse.ts`（新增，純函式）

型別照規格 §4.1（`ClCat`、`ClItem`、`ClSection`、`ClVersion`，含 `lead`）。

| 函式 | 規則 |
| --- | --- |
| `CL_CATS` | 顯示順序與中文、色 token：`security 安全`、`removed 移除`、`changed 變更`、`deprecated 棄用`、`added 新增`、`fixed 修正`、`other`（原標題） |
| `catOf(title)` | 中英文對照（規格 §1.3）；`內部`／`Internal` → `"internal"`（解析後丟棄，Q2）；其他 → `"other"` |
| `parseChangelog(md)` | 規格 §4.3 解析表：先 `\r\n` → `\n`；版本標題 regex 與 `site/src/lib/changelog.ts` 的 `readReleases()` **逐字相同**；`[Unreleased]` 與認不得的 `##` 略過到下一個認得的；`<!-- … -->` 略過；導言進 `lead`；續行與巢狀清單照表；`internal` 段丟棄 |
| `findSection(versions, v)` | 單一版號 → 段落；區間段落涵蓋 `vFrom ≤ v ≤ v` |
| `sliceChangelog(versions, missed, cur)` | 規格 §4.3「切片」（Q1 = B）：依 `missed` 順序取段落，同一段只列一次；`missed` 空（已是最新或 `ahead`）→ 取 `cur` 那一段；找不到段落的版本回傳 `{ v, empty: true }` 佔位 |
| `countByCategory(versions)` | 各類別項目數（巢狀項目不另計）；給 chip 列與 major 提示框「N 項移除、N 項變更」 |
| `inlineTokens(text, repoBlobBase)` | 規格 §4.3「行內」：`code` 優先、再 `bold`、`link`；相對連結以 `repoBlobBase`（例 `https://github.com/SteveLin100132/notecraft/blob/main/`）補成絕對網址並去掉 `./`；非 `http(s):`／相對的連結當純文字 |

### 3. `src/lib/update-prepaint.ts`（新增，自足函式）

- `railHint(raw: string | null, cur: string): { tone: string; label: string } | null`
  - 讀 `nc-update-v1` 原字串 → 驗 `cur` → 依快取的 `res` 與 `skipped` 算出是否顯示（邏輯同 `railHintOf`，**在函式內自己寫一份**）
  - **必須自足**：不引用模組內其他識別碼、不 import，因為會以 `toString()` 內嵌進 inline script（與 `wb-tabs-prepaint.ts` 同一做法）
  - 任何例外 → `null`

### 4. 斷言（新增三支）

比照 `scripts/checks/wb-calendar.mjs` 的骨架（`assert/strict`、`check(name, fn)`、`✓／✗`、失敗 `process.exit(1)`）。

**`scripts/checks/upd-derive.mjs`**

| 斷言 | 內容 |
| --- | --- |
| semver | `1.10.0 > 1.9.0`；`1.9.0-beta.1 < 1.9.0`；`parseSemver("v1")` 為 `null` |
| 等級 | 1.8.5→1.8.6 patch；→1.9.0 minor；→2.0.0 major；相同 → `null`；1.9.0→1.8.5 → `null` 且 `ahead` |
| missed／behind | 假 packument：1.8.5、1.8.6、1.9.0-beta.1、1.9.0、1.9.1；cur 1.8.5 → `missed = [1.9.1, 1.9.0, 1.8.6]`、`behind = 3` |
| cur 沒發佈 | cur 1.8.4 不在 versions → `curDate`、`deprecated` 為 `null`，其他照常 |
| engines | `>=22`、`>=22.0.0`、`^22`、`22.x` → 22；`>=18 <23`、`^18 \|\| ^20`、`""` → `null`；userNode 20.11.1 + need 22 → `needsNode` |
| deprecated | `versions[cur].deprecated = "請升級"` → `deprecated` 為該字串、`updTone` 為 `danger` |
| 外形 | 缺 `dist-tags` 或 `versions` → throw |
| Rail | 略過 latest → `null`；略過但已棄用 → 仍顯示；已是最新 → `null` |
| 快取 | `readCache` 遇 `cur` 不符、JSON 壞 → `null`；`isFresh` 29 分 true、31 分 false |
| toast | 手動 → false；已 toasted 同版 → false；略過 → false；略過但已棄用 → true |
| 文字 | `agoLabel`、`daysLabel`、`sizeLabel` 邊界各一組 |

**`scripts/checks/upd-changelog.mjs`**（讀 repo 根的真實 `CHANGELOG.md`）

| 斷言 | 內容 |
| --- | --- |
| 版本 | 第一段是 `package.json` 的 `version`；區間段 `vFrom = 0.1.1`、`v = 0.1.3` |
| 與官網一致 | 動態 import `site/src/lib/changelog.ts` 的 `readReleases()`，與 `parseChangelog()` 展開區間後的版號清單相同 |
| 類別 | 每個 `###` 都對到已知 key 或 `internal`；結果中沒有 `internal` 段 |
| 註解與導言 | 沒有任何項目文字含 `<!--`；1.0.0 的 `lead` 非空 |
| 續行／巢狀 | 至少一個項目含換行；至少一個項目有 `children` |
| 每行可解析 | 所有 `## ` 開頭的行（除 `[Unreleased]`）都被解析成版本 |
| 切片（Q1 = B） | `missed = ["1.8.5"]`、cur 1.8.0 → 只得 1.8.5 一段；`missed` 含 `0.1.2` → 對到區間段落；`missed = ["0.1.3","0.1.2"]` → 區間段只出現一次；`missed` 含不存在的 `9.9.9` → `empty` 佔位；`missed` 空 → `cur` 那一段 |
| 行內 | `` `a` **b** [c](https://x) `` 切成四種 token；`[d](./docs/x.md)` 轉 GitHub blob 網址；`[e](javascript:alert(1))` 是純文字；`` `**x**` `` 內不解析粗體 |
| 統計 | `countByCategory` 對 1.8.5 段：`fixed = 3` |
| 發佈護欄 | `package.json` 的 `files` 含 `CHANGELOG.md`（規格 §12） |

**`scripts/checks/upd-prepaint.mjs`**

- 讀 `src/lib/update-prepaint.ts`，以 `new Function("return (" + railHint.toString() + ")")()` 重建（與 inline script 同一條路），斷言：快取 `cur` 不符 → `null`；略過 → `null`；略過但已棄用 → 有值；`raw = "{"` → `null` 不 throw；`raw = null` → `null`

### 5. `package.json`

- `files` 加 `"CHANGELOG.md"`
- `scripts` 加 `check:upd`：三支依序以 `node --experimental-strip-types --disable-warning=ExperimentalWarning` 執行；`check-plugins` 會自動跑到 `scripts/checks/*.mjs`

## 要改的既有檔案

`package.json`。新增 `src/lib/update-check.ts`、`src/lib/changelog-parse.ts`、`src/lib/update-prepaint.ts`、`scripts/checks/upd-derive.mjs`、`scripts/checks/upd-changelog.mjs`、`scripts/checks/upd-prepaint.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | Node 22.6+ | `npm run check:upd` | 三支全綠 |
| 護欄 | 暫時把 `CHANGELOG.md` 某個 `## [x.y.z] - …` 改成 `## x.y.z` | `npm run check:upd` | `upd-changelog.mjs` 失敗並指出那一行；改回後綠 |
| 護欄 | 暫時從 `files` 拿掉 `CHANGELOG.md` | 同上 | 失敗 |
| 純度 | — | `grep -n "^import" src/lib/update-check.ts src/lib/changelog-parse.ts src/lib/update-prepaint.ts` | 只有 `import type`（或無） |
| 無副作用 | — | `grep -nE "window\|localStorage\|Date\.now" src/lib/update-check.ts src/lib/changelog-parse.ts` | 0 筆 |
| 打包 | — | `npm pack --dry-run` | 清單含 `CHANGELOG.md` |
| 全套 | — | `npm run check-plugins` | 通過（含新三支） |
| build | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |

## 依賴

無。
