# Task 46 — Plugin 契約與型別

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §5、§6.1、§6.2、§6.3（實作階段 P1）。
> **本批的基礎，先做**；47 之後全部依賴這裡定義的型別與 schema。

## 為什麼要有這一步

Plugin 有三方要對同一份契約：筆記作者寫 `plugins.json`、plugin 作者寫 `notecraft-plugin.json`
與資料檔、app 讀這三者。三方都在不同的檔案裡，沒有共同的型別就只能靠文件約定 ——
而文件約定會漂移（viewer v2 §6.6 的白名單已經教訓過一次）。

## 範圍

### 1. 兩份 JSON Schema

| 檔案 | 內容 |
| --- | --- |
| `plugins/plugins.schema.json` | 專案映射表：`plugins[].plugin` / `files[]` / `exclude[]` / `options`。規格 §5.1 |
| `plugins/notecraft-plugin.schema.json` | 套件 manifest：`id` / `title` / `description` / `version` / `author` / `homepage` / `dataSchema` / `example` / `engines`。規格 §6.1 |

兩份都放在主 repo `plugins/` 下，供 `$schema` 遠端引用（讓作者在 VS Code 編輯時有補全）。

**manifest 刻意沒有的欄位**（Q2a 定案，不要「順手補回去」）：
- 沒有 `entry` —— 入口固定約定為 `renderer.tsx`
- 沒有 `accepts` / 副檔名宣告 —— 吃哪些檔完全由 `plugins.json` 的 `files` 決定

### 2. `PluginRendererProps` 型別

```ts
export interface PluginRendererProps<T = unknown> {
  data: T;                              // 已 parse + 驗證，非 Promise
  file: { path: string; name: string; updatedAt: string };
  options: Record<string, unknown>;
  mode: "page" | "embed";
}
```

`path` 為相對 notesDir 的路徑。`mode` 影響 renderer 是否自己畫標題與全寬按鈕（規格 §6.2）。

### 3. `_types.d.ts` 的產出機制

plugin 不該相依 app 原始碼，但要拿得到 `PluginRendererProps`。
安裝時把型別寫進 `<userCwd>/.notecraft/plugins/_types.d.ts`，plugin 以
`import type { PluginRendererProps } from "@notes/plugins/_types"` 取用。

本 Task 只負責**型別檔的內容與產生它的函式**；實際在安裝時寫出去是 [Task 54](task-54-install-plugin-cli.md)。

## 卡控

- `id` 必須與所在資料夾名一致 —— 這條寫進 schema 的 description，實際檢查在 Task 54
- `plugins.json` 的 `files` 不允許比對 `.md` / `.mdx`（規格 §5.2）—— schema 擋不住，寫進 description，實際檢查在 Task 47

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| schema 可用於編輯期補全 | VS Code 開一份帶 `$schema` 的 `plugins.json` | 輸入 `"plug` | 補全出 `plugin` 欄位並提示必填 |
| manifest 缺必填 | `notecraft-plugin.json` 少 `version` | 以 ajv 驗證 | 驗證失敗，訊息指出缺的欄位 |
| 型別不含 any | `PluginRendererProps` | `tsc --noEmit` | 通過，且無 `any`（泛型預設 `unknown`） |

## 依賴

無。

## 風險

低。純宣告，沒有執行路徑。

## 實作記錄（2026-09-18）

- `plugins/plugins.schema.json`、`plugins/notecraft-plugin.schema.json`、`src/lib/plugin-types.ts`
- manifest schema 設 `additionalProperties: false` —— 日後有人把 `entry` 補回去會驗證失敗，
  而不是被靜默接受。Q2a 砍掉它是有理由的，讓 schema 記住
- `PLUGIN_TYPES_DTS` 是型別的**複製**而非 re-export：使用者專案裡沒有 NoteCraft 的 `src/`，
  解析不到 `@/lib/*`。兩邊同步時以 `plugin-types.ts` 為準
