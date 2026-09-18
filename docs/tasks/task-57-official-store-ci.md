# Task 57 — 官方 store 目錄與 CI 驗證

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §10（實作階段 P5 配套）。
> 依賴 [Task 51](task-51-er-diagram-renderer-plugin.md)。

## 為什麼要有這一步

Q12 定案 store 一律即時從 GitHub 抓 —— 意思是**推上預設分支就等於發佈**。
沒有 CI 把關的話，store 裡隨時可能放著一個裝下去就 build fail 的 plugin，體驗比沒有還糟。

## 範圍

### 1. `plugins/registry.json`

```jsonc
{
  "version": 1,
  "plugins": [
    {
      "id": "er-diagram-renderer",
      "title": "ER Diagram",
      "description": "…",
      "version": "1.0.0",
      "dir": "plugins/er-diagram-renderer",
      "files": ["notecraft-plugin.json", "renderer.tsx", "schema.json", "README.md", "example/schema.json"],
      "tags": ["database", "diagram"],
      "screenshot": "plugins/er-diagram-renderer/screenshot.png"
    }
  ]
}
```

`files` 讓 [Task 55](task-55-install-plugin-remote-sources.md) 的逐檔 fetch 不必先打目錄列表 API。

### 2. `scripts/check-plugins.mjs`

`prepublishOnly` 與 CI 都跑：

- 每個 plugin 的 manifest 必填欄位齊全、`id` 與資料夾名一致
- `registry.json` 與實際目錄無漂移（**含 `files` 清單**）
- `example/` 的資料能通過自己的 `dataSchema`
- 每個 plugin 配 example 資料跑一次 `astro build`（主專案自己就能 build plugin，Q17）
- import 白名單檢查（與 Task 54 的安裝期 lint 同一份實作，不要寫兩套）

### 3. 主專案消費 store

`src/lib/plugins.ts` 的 `/plugins/*/renderer.tsx` glob 分支（Task 47 已含），
讓官方 plugin 有地方能真的 build、能跑 CI。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 漂移可偵測 | 手動改 plugin 版本但沒改 registry | `check-plugins` | 失敗並指出不一致處 |
| example 可 build | 全部官方 plugin | `check-plugins` | 每個都 build 成功 |
| 白名單同源 | 修改白名單 constant | 安裝期與 CI | 兩處行為一致（同一份實作） |
| CI 擋下壞 plugin | 故意寫錯 example 資料 | CI | 非零退出 |

## 依賴

Task 51。與 Task 54 共用白名單 lint 實作。

## 風險

低。但**這是 Q12「即時抓 GitHub」唯一的護欄** —— 少了它，決策的代價就會落到使用者身上。

## 實作記錄（2026-09-18）

`plugins/registry.json`、`scripts/check-plugins.mjs`、`npm run check-plugins`，
並加進 `prepublishOnly`。

- import 白名單檢查**直接 import `bin/install-plugin.mjs` 的 `inspectFiles`**，
  與安裝期同一份實作 —— 兩套規則遲早漂移
- 第 5 項檢查是真的 build：把 plugin 與它的 `example` 丟進臨時 fixture 跑一次 `astro build`
- 沒有 `example` 的 plugin 直接判定失敗 —— 沒有 example 就無從驗證它跑得起來

**未做**：`screenshot` 欄位（registry 目前不帶）。
