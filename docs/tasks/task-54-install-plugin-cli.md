# Task 54 — `notecraftapp install-plugin`（官方 store）

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §9.1、§9.2、§9.5、§9.6（實作階段 P5）。
> 依賴 [Task 46](task-46-plugin-contract-types.md)、[Task 51](task-51-er-diagram-renderer-plugin.md)（要有東西可裝）。

## 範圍

### 1. 指令表面（Q15：只加一個子命令）

```
notecraftapp install-plugin [<source>] [--list] [--remove <id>] [--apply "<glob>"]
                            [--dir <path>] [--ref <tag>] [--as <id>] [--force] [--yes]
```

列表與移除收在 flag 底下；**升級就是重跑 `install-plugin --force`**，與既有 `init-skill --force`
的升級語意一致。不做 `update-plugin`。

沿用 `init-skill` 既有的 `collectCopyPlan` 模式（`bin/notecraftapp.mjs:745`）：
分類 new/same/conflict、逐檔 prompt、非 TTY 且未帶 `--force` 就 abort exit 1。

### 2. 無參數：列官方 store

清單**一律即時從 GitHub 抓**（Q12）—— 讀主 repo 的 `plugins/registry.json`。

好處是修個 plugin 的 bug 不必等 npm 發版；代價是沒網路就裝不了、且可能抓到需要更新版 app 的
plugin，所以 **`engines` 檢查是必要配套**，不是可選。

這個決定讓官方 store 與第三方來源變成**同一條程式路徑** —— 官方只是預設的 `owner/repo`。

### 3. `--remove <id>`

刪除 `.notecraft/plugins/<id>/`，並檢查 `plugins.json` 是否還指著它 ——
會殘留就警告（Q9 定案沒裝就 build fail，不警告的話下次 build 才發現）。

### 4. `--apply "<glob>"`

預設**不動使用者的設定檔**（Q14）—— 映射要寫哪些路徑只有作者知道。
裝完印出可直接貼上的 JSON 片段；帶 `--apply` 才合併進 `plugins.json`。

### 5. 安裝時的把關（Q16）

安裝前**一律要確認**，`--yes` 才略過。這是唯一有人能介入的點。

確認畫面顯示來源網址、`id` / `version`、要寫入的檔案清單。確認前先跑靜態檢查，任一項不過就拒裝：

- 掃所有 `.tsx` / `.ts` 的 import，白名單外的套件 → 列出違規行並拒裝
  （白名單來源：`src/lib/generated-component-whitelist.ts`，與 AI 生成元件共用）
- 禁止 `dangerouslySetInnerHTML`
- 只收 `.tsx` / `.ts` / `.json` / `.md` / `.css` / `.svg` / `.png`；
  拒絕 `package.json`、`node_modules/`、`*.sh`、`*.mjs` 等可執行內容
- 路徑安全：拒絕 `../` 逃脫與 symlink（沿用 viewer v1 §7.3）
- `engines.notecraftapp` 不合 → 擋下並提示升級
- `id` 與資料夾名不一致 → 拒裝
- **不執行任何安裝腳本**

### 6. 寫出 `_types.d.ts`

安裝時把 [Task 46](task-46-plugin-contract-types.md) 定義的 `PluginRendererProps`
寫進 `<userCwd>/.notecraft/plugins/_types.d.ts`，讓 plugin 不必相依 app 原始碼。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 列出官方 store | 有網路 | `install-plugin --list` | 列出 registry 裡的 plugin 與版本 |
| 無網路明確失敗 | 斷網 | `install-plugin` | 明確訊息說明需要網路，非 stack trace |
| 白名單外拒裝 | plugin 內 `import axios` | 安裝 | 拒裝並列出違規檔與行號 |
| engines 不合擋下 | plugin 要求 `>=9.0.0` | 安裝 | 擋下並提示升級 notecraftapp |
| 非 TTY 無 force 中止 | CI 環境、目標已存在 | 安裝 | exit 1，列出衝突檔 |
| `--yes` 可略過確認 | CI 環境 | `install-plugin <id> --yes` | 不 prompt 直接裝 |
| 移除提醒殘留 | `plugins.json` 仍指著該 id | `--remove <id>` | 刪除成功並警告設定殘留 |

## 依賴

Task 46、51。

## 風險

中。這是**唯一會把別人的程式碼拉進使用者專案**的路徑。靜態檢查若有漏，
後果是 build 期才炸（白名單）或更糟（路徑逃脫）。§9.6 那六條要逐條寫測試，不要靠目視。

## 實作記錄（2026-09-18）

`bin/install-plugin.mjs`（獨立檔，`notecraftapp.mjs` 已 900 行）+ citty 子命令。

- 白名單**從 `src/lib/generated-component-whitelist.ts` 正則讀出**，不另抄一份 ——
  漂移的代價是「安裝時說 OK、build 時炸掉」
- `engines` 的 semver 比對只支援 `>=`、`^` 與精確版本，不為此背一個 semver 依賴
- `--remove` 只警告 `plugins.json` 殘留、不自動清（動設定檔要有明確意圖）
- `_types.d.ts` 在安裝時從 `PLUGIN_TYPES_DTS` 落地

**驗證**：本地來源安裝成功（檔案、`.installed.json`、`_types.d.ts`、`--apply` 映射全部到位）。
惡意 plugin 測試一次擋下四項：`postinstall.sh`、`axios`、`marked`、`dangerouslySetInnerHTML`，
各自指出檔名與行號。`--remove` 正確警告設定殘留。

**順帶**：ER plugin 宣告 `engines >=0.6.0`，第一次安裝被 engines 檢查擋下（0.5.1）——
這正是該檢查存在的理由。`package.json` 版號因此推到 **0.6.0**（Plugin System 就是這個版本），
並把 `plugins/` 加進 npm `files`。
