# Task 71 — Plugin 啟用／停用：`disabled` 陣列、build 期語意、dev API、Switch

> 規格 [notecraft-workbench.md](../notecraft-workbench.md) §8.6.1（全節）、§11；Q22 定案。
> 相關：[notecraft-plugin-system.md](../notecraft-plugin-system.md) §5（`plugins.json`）、§7.7（失敗模式）、§11（watch／快取）。
> 依賴 [Task 70](task-70-plugins-pages.md)。對應實作階段 **P10** 的第二部分。

## 為什麼是頂層陣列

`plugins.json` 是「映射規則的陣列」，同一個 plugin 可以出現在多條規則裡，沒有現成的位置存「每個 plugin 一個開關」。
頂層加 `disabled` 陣列，一顆 Switch 對應一個值，規則本身原封不動：

```jsonc
{
  "$schema": "…/plugins.schema.json",
  "disabled": ["timeline-renderer"],          // 新增；省略或空陣列 = 全部啟用
  "plugins": [ /* 規則不動 */ ]
}
```

## 範圍

### 1. `plugins/plugins.schema.json`

加 `disabled`：字串陣列、`uniqueItems`、items 用與 `mapping.plugin` 相同的 id pattern。
這份 schema 只供編輯器補全 —— build 期的檢查是 `readConfig()` 手寫的，所以**舊版 app 讀到 `disabled` 不會失敗，只會忽略它**（停用不生效）。

`src/lib/plugin-types.ts` 的 `PluginsConfig` 加 `disabled?: string[]`。

### 2. build 期語意（[src/lib/plugins.ts](../../src/lib/plugins.ts)）

| 情況 | 行為 |
| --- | --- |
| plugin 在 `disabled` 裡 | 它的**所有**規則在比對前就略過，等同不存在；命中的資料檔不產頁、不進 Sidebar／`/plugins` 資料檔 Tab／Palette |
| 一檔同時被「已停用」與「啟用中」的規則命中 | 啟用中的那條勝。停用的規則不參與「第一條勝」的排序，也不印多重命中的 warn |
| 已停用的 plugin 根本沒安裝 | **不 build fail** —— 規則在「是否已安裝」的檢查之前就被略過。這給了一條退路：某個 plugin 壞掉時先停用，站還是 build 得出來 |
| `disabled` 裡的 id 既沒安裝、也沒被任何規則引用 | warn（多半是打錯字） |
| `disabled` 不是字串陣列 | build fail，訊息格式同其他 `plugins.json` 錯誤 |

新增 `getInactiveMatches(): { pluginId: string; relPath: string }[]` —— 已停用 plugin 的規則「若啟用會命中」的檔案。
只供列表的「N 檔」與 Plugin Drawer 的「命中的資料檔」顯示（**灰字、不可點**），不產頁。
`getPlugins()` 不受 `disabled` 影響，照舊回傳所有已安裝的 plugin。

### 3. 系列章節指向已停用 plugin 的資料檔（[src/lib/series.ts](../../src/lib/series.ts)）

**warn 並跳過該章節，不 build fail**；該章節不計入系列進度分母（它沒有頁面可讀）。
訊息要與既有三種情況區分：

> 系列 "X" 的章節 "view:planning/roadmap"：資料檔存在，但負責渲染它的 plugin `timeline-renderer` 已停用，已跳過。

### 4. dev-only API：`PUT /api/plugins/:id`

放 [src/dev-api/handlers.mjs](../../src/dev-api/handlers.mjs)，body `{ "enabled": boolean }`。僅綁 `localhost`，CLI 的 `view` 模式自動共用。

| 項目 | 規格 |
| --- | --- |
| 驗證 | id 符合 manifest 的 id pattern；必須是已安裝或被某條規則引用的 plugin，否則 404 |
| `plugins.json` 不存在 | 409，不代為建立（建立映射是作者的事，同 plugin 設計文件 Q14 的立場） |
| 寫檔 | 只增刪 `disabled` 的元素，其餘內容不動；鍵順序固定 `$schema` → `disabled` → `plugins`；`disabled` 變空時**整個鍵移除**；2 空格縮排、檔尾換行 |
| 冪等 | 重複送同一個值回 200、檔案不變（不要產生無意義的 mtime 變動觸發 rebuild） |
| 路徑安全 | 沿用既有的 `assertSafePath` |

### 5. UI

- **Switch**（38×22，on 為 `--wb-blue`，160ms）放在「已安裝外掛」列的最右；`role="switch"` + `aria-checked` + `aria-label="啟用 <名稱>"`。點 Switch 不開 Drawer（兩者是並排的兄弟，不巢狀）
- Plugin Drawer 動作列加「停用此外掛／啟用此外掛」ghost，與 Switch 同一個 handler
- dev：樂觀更新 + Toast；API 失敗時還原並提示
- **正式環境：不渲染 Switch、也不渲染 Drawer 的那顆按鈕，只留「啟用／停用」pill**。一顆永遠不能按的開關對訪客沒有意義
- 停用列 `opacity:.62`、灰底、plug icon 變灰（README §5.7）
- Stat strip 的「啟用中」與「映射資料檔」跟著變（後者只算啟用中的）

### 6. dev 下的即時反映（**先實測再決定**）

`plugins.ts` 以模組層變數快取解析結果。`astro dev` 下改 `plugins.json` 會不會即時反映**尚未實測**
（plugin 設計文件 Q19 的遺留項）。步驟：

1. 先實測：dev 下切 Switch 後，不重整，開一個該 plugin 的資料檔頁，看是否變成 404／是否還在
2. 不反映 → 在 dev integration（`src/dev-api/integration.ts`）監看 `plugins.json`，變動時清掉 `plugins.ts` 與 `workbench.ts` 的快取並送 `full-reload`；
   API 成功後 client 也主動 `location.reload()` 作為保底
3. 把實測結果記在本檔的實作記錄，並回填 plugin 設計文件 §15

### 7. CLI 配套

`install-plugin --remove <id>`：除了現有「`plugins` 規則是否還指著它」的檢查，再檢查 `disabled` 是否殘留該 id。
有就**警告、不自動清**（沿用既有「只警告不自動清」的做法）。

## 要改的既有檔案

`plugins/plugins.schema.json`、`src/lib/plugin-types.ts`、`src/lib/plugins.ts`、`src/lib/series.ts`、`src/lib/workbench.ts`（`enabled` 與 inactive matches）、
`src/dev-api/handlers.mjs`、可能 `src/dev-api/integration.ts`、`bin/install-plugin.mjs`、`PluginsWorkbench.tsx`、`PluginDrawer.tsx`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 舊檔相容 | `plugins.json` 沒有 `disabled` | build | 行為與改動前完全相同 |
| 停用生效 | `disabled: ["er-diagram-renderer"]` | build | 該 plugin 的 `/view/*` 頁不產生；Sidebar、`/plugins` 資料檔 Tab 都沒有它的檔 |
| 列表仍看得到 | 同上 | 開「已安裝外掛」 | 該列灰底、pill「停用」、「N 檔」仍顯示若啟用會命中的數量 |
| 停用檔不可點 | 同上 | 開它的 Drawer | 「命中的資料檔」灰字、不是連結 |
| 壞掉的 plugin 可被繞過 | 規則指向一個未安裝的 plugin，且它在 `disabled` 裡 | build | **成功**（未停用時會 build fail） |
| 規則順序 | 同一檔被停用規則（在前）與啟用規則（在後）命中 | build | 由啟用的那個渲染，沒有多重命中 warn |
| 系列章節 | 某系列含已停用 plugin 的 `view:` 章節 | build | warn 訊息指出 plugin 已停用；系列章節數少 1；build 成功 |
| 打錯字 | `disabled: ["er-diagrm"]` | build | warn |
| 格式錯誤 | `disabled: "er-diagram-renderer"` | build | fail，訊息指出 `disabled` 必須是字串陣列 |
| API 寫檔乾淨 | dev，切一次 Switch 再切回 | `git diff .notecraft/plugins.json` | 無差異（鍵被移除、格式不變） |
| API 防呆 | dev | `PUT /api/plugins/不存在的id` | 404；檔案不變 |
| 正式環境 | `astro build` 後預覽 | 開「已安裝外掛」 | 沒有 Switch，只有 pill |
| 官方 store | — | `npm run check-plugins` | 通過 |

## 依賴

Task 70。

## 注意

停用**不是**解除安裝：已停用 plugin 的 `renderer.tsx` 仍會被 `PluginHost` 的 eager glob 打包進 client chunk。
要讓它離開 bundle 得用 `install-plugin --remove`。在 callout 或 Drawer 的說明裡帶一句，免得使用者以為停用能減少載入量。
