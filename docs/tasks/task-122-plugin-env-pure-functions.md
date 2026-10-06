# Task 122 — 情境模型：`derivePluginEnv`、官方外掛常數、斷言

> 規格 [notecraft-workbench-plugin-empty-states.md](../notecraft-workbench-plugin-empty-states.md) §3、§7.1、§7.4；Q1、Q2 定案（§14）。
> 前置：無（可與 Task 121 平行，但依序 commit）。Task 123 靠它。

## 為什麼要有這一步

`/plugins` 的 Header、Sidebar、兩個頁籤的 Toolbar 與 Body 都由同一個「現在是哪種情境」決定。把判定抽成純函式先鎖住，UI 只負責依 `reason` 分派；混合狀態（部分停用、部分沒規則）用 UI 很難逐一點到，只有斷言抓得到。

## 範圍

### 1. `src/lib/wb-plugin-env.ts`（新增）

只能 `import type`、不碰 `window`、無 JSX（`scripts/checks` 以 strip-types 直接載入）。

```ts
export type PluginReason = null | "fresh" | "noplugins" | "nomap" | "nohit" | "disabled";

export interface PluginEnv {
  reason: PluginReason;
  activeRules: number;    // 啟用中外掛的 mappings 條目數（不是 glob 數）
  activeGlobs: string[];  // 啟用中外掛的所有 files glob，去重、保留出現順序
  enabledCount: number;
}

export function derivePluginEnv(input: {
  plugins: Pick<WbPlugin, "id" | "enabled" | "mappings">[];
  hasConfig: boolean;
  fileCount: number;
}): PluginEnv;
```

判定順序（第一個成立者，規格 §3.2，Q1）：

1. `fileCount > 0` → `null`
2. `plugins.length === 0` → `hasConfig ? "noplugins" : "fresh"`
3. `enabledCount === 0` → `"disabled"`
4. `activeRules > 0` → `"nohit"`
5. 其餘 → `"nomap"`

另匯出列狀態判斷，給 Task 123 的列 pill 與 Drawer 共用：

```ts
export type PluginRowState = "ok" | "unmapped" | "nohit" | "off";
export function pluginRowState(p: Pick<WbPlugin, "enabled" | "mappings" | "matched">): PluginRowState;
```

- 停用 → `off`；`mappings` 為空 → `unmapped`；`matched` 為空 → `nohit`；其餘 `ok`

### 2. `src/lib/official-plugins.ts`（新增）

client-safe、無 JSX、只能 `import type`。

```ts
export interface OfficialPlugin { id: string; title: string; description: string; defaultGlob: string }
export const OFFICIAL_PLUGINS: readonly OfficialPlugin[];   // er-diagram-renderer、openapi-renderer 兩筆，文案照 handoff §5.2
export const INSTALL_BASE_CMD = "npx notecraftapp install-plugin";
export function installCmd(p: Pick<OfficialPlugin, "id" | "defaultGlob">): string;   // `${INSTALL_BASE_CMD} ${id} --apply "${defaultGlob}"`
export function snippetGlob(id: string): string;            // 官方 → defaultGlob；其餘 → "**/*.json"（Q2）
export function mappingSnippet(ids: readonly string[]): string;   // plugins.json 範例全文，兩格縮排、結尾換行
```

- `defaultGlob`：`**/*.er.json`、`**/*.openapi.json`
- 標題與說明要和 `plugins/registry.json` 一致；斷言對照（見下）

### 3. 斷言 `scripts/checks/wb-plugin-env.mjs`（新增）

比照 `scripts/checks/wb-dashboard.mjs` 的骨架。

| 斷言 | 內容 |
| --- | --- |
| 純情境 3–7 | 依 handoff §1 表各一組，結果為 `fresh`／`noplugins`／`nomap`／`nohit`／`disabled` |
| 正常 | `fileCount > 0` 時不論外掛狀態一律 `null` |
| 混合 A | A 停用有規則、B 啟用無規則 → `nomap`（不是 `nohit`）；`activeRules === 0` |
| 混合 B | A 停用有規則、B 啟用有規則、0 檔 → `nohit`；`activeGlobs` 只含 B 的 glob |
| 規則計數 | 一條 mapping 有 3 個 glob → `activeRules === 1`、`activeGlobs.length === 3` |
| 去重 | 兩個外掛寫同一個 glob → `activeGlobs` 只出現一次 |
| 列狀態 | `off`／`unmapped`／`nohit`／`ok` 各一組；停用且無規則 → `off`（停用優先） |
| 指令 | `installCmd` 兩筆的完整字串 |
| 範例 | `mappingSnippet(["er-diagram-renderer", "x-renderer"])` 為合法 JSON，glob 分別是 `**/*.er.json`、`**/*.json` |
| 對照 registry | `OFFICIAL_PLUGINS` 的 id 集合 ⊆ `plugins/registry.json` 的 id；title 相同 |
| 純度 | 兩個 `.ts` 檔原始碼不含非 `import type` 的 import、不含 `window` |

### 4. `package.json`

- `check:wb` 串接 `scripts/checks/wb-plugin-env.mjs`（帶 strip-types 旗標，與其他 `.ts` 斷言相同）

## 要改的既有檔案

`package.json`。新增 `src/lib/wb-plugin-env.ts`、`src/lib/official-plugins.ts`、`scripts/checks/wb-plugin-env.mjs`。

**本 Task 不改任何 UI**，行為零變化。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 斷言 | Node 22.6+ | `npm run check:wb` | 全綠（含新斷言） |
| 護欄 | 暫時把判定順序的 3、4 對調 | `npm run check:wb` | 「混合 A」失敗；改回後綠 |
| 全套 | — | `npm run check-plugins` | 通過（`scripts/checks/*.mjs` 自動跑到） |
| 零變化 | — | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加；頁數與前一個 commit 相同 |

## 依賴

無。
