# Task 76 — ER plugin 資料格式 v1.2：schema、兩份範例、型別、`check-plugins` 多範例

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §5.1、§2.1、§12.1；Q6 定案。
> 設計交付 [design_handoff_er_docs/README.md](../prototype/design_handoff_er_docs/README.md)〈資料格式與相容性〉、`schema.json`、`example/schema.json`。
> 無依賴，**最先做**。之後每個 Task 都靠這裡建立的「v1.1 與 v1.2 兩份範例都驗證、都 build」護欄抓回歸。

## 範圍

### 1. `schema.json` 換成 v1.2

`plugins/er-diagram-renderer/schema.json` ← `docs/prototype/design_handoff_er_docs/schema.json`。

- 已逐字比對：差異**只有**新增 `schemas`、`groups[].schema`、`groups[].description`、`tables[].description` 四個選填屬性，以及三處 `description` 註解文字
- `$id` 不變、`additionalProperties: false` 維持
- 換檔後以 `git diff` 再確認一次沒有其他差異（交付包的檔案是 LF，repo 會轉 CRLF，diff 應只剩上述內容）

### 2. 兩份範例

| 檔案 | 內容 | 角色 |
| --- | --- | --- |
| `example/schema.json` | ← 交付包 `example/schema.json`（v1.2：3 schemas、6 groups、14 張表） | `manifest.example` 仍指向它；store 頁與 `install-plugin` 預設行為不變 |
| `example/schema.v1.1.json` | ← 現有 `example/schema.json` **原封不動改名**（`git mv`） | v1.1 零修改相容的測試資料，**不可加任何 v1.2 欄位** |

`$schema` 欄位若有，兩份都指向同一個 v1.2 schema URL。

### 3. 型別

目前型別在 `renderer.tsx` 內。本 Task **先就地加欄位**（Task 77 才搬到 `types.ts`）：

```ts
export interface ErSchema { key: string; label: string; description?: string }
// groups 項目：{ key; label; schema?: string; description?: string }
// ErTable：description?: string
// ErDiagramData：schemas?: ErSchema[]
```

全部可選。renderer 行為**不改** —— v1.1 renderer 吃 v1.2 資料會忽略新欄位，這正是本 Task 要驗證的中間態。

### 4. `check-plugins` 驗證並 build `example/` 下所有 `.json`

[scripts/check-plugins.mjs](../../scripts/check-plugins.mjs)：

- **schema 驗證**（現況只驗 `manifest.example`）：改為驗 plugin 目錄內 `example/` 底下**所有** `.json`；錯誤訊息帶檔名。`manifest.example` 必須存在的檢查保留
- **build**（現況把 `manifest.example` 複製成 fixture 的 `docs/example.json`）：改為把 `example/*.json` 全部複製到 fixture 的 `docs/examples/<原檔名>`，`plugins.json` 規則改 `files: ["examples/*.json"]`，**一次** build
  - 注意副檔名：`schema.v1.1.json` 的 `routePath` 會是 `examples/schema.v1.1`，確認 `/view/` 路由接受含 `.` 的路徑（現有 `schema-demo.er` 已證明可以）
- 沒有 `example/` 目錄的 plugin（未來第三方）：退回只處理 `manifest.example`，與現況相同
- 印出 `✓ er-diagram-renderer 配 2 份 example 資料 build 成功`

### 5. registry

`plugins/registry.json` 的 `files` 補 `example/schema.v1.1.json`。**`version` 本 Task 不動**（1.2.0 在 Task 86 一次升，分支上的中間 commit 不該宣稱已是 1.2.0）。

## 要改的既有檔案

`plugins/er-diagram-renderer/{schema.json, example/schema.json, renderer.tsx}`、新增 `example/schema.v1.1.json`、`plugins/registry.json`、`scripts/check-plugins.mjs`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 兩份範例通過 v1.2 | — | `npm run check-plugins` | 通過；輸出顯示 2 份 example build 成功 |
| v1.1 範例未被動過 | — | `git log --follow -p example/schema.v1.1.json` | 只有改名，內容 0 行差異 |
| schema 擋得住壞資料 | 在 v1.2 範例某張表加 `"foo": 1` | `npm run check-plugins` | fail，訊息指出檔名與 `additionalProperties` |
| 擋得住壞的 v1.1 範例 | 在 `schema.v1.1.json` 刪掉 `requirement` | 同上 | fail，訊息指出是 `schema.v1.1.json` |
| registry 漂移 | 從 registry 刪掉 `example/schema.v1.1.json` | 同上 | fail「registry files 少了」 |
| 轉檔產物通過 v1.2 | `src/content/notes/schema-demo.er.json` | `npx astro build` | 通過（build 期 Ajv 驗證用的就是新 schema） |
| 渲染無變化 | — | 開 `/view/schema-demo.er` | 與改動前完全相同 |
| 型別 | — | `npx tsc --noEmit` | 通過 |

## 依賴

無。

## 實作記錄（2026-09-27）

- schema.json 換成交付包的 v1.2（逐字比對只多四個選填屬性與三處註解）；原 v1.1 範例 `git mv` 成 `example/schema.v1.1.json`，內容零差異
- `check-plugins` 以 `exampleFiles()` 取 `manifest.example` + `example/` 底下其餘 `.json`，全部 Ajv 驗證、複製到 fixture 的 `docs/examples/` 一次 build（規則 `examples/*.json`）
