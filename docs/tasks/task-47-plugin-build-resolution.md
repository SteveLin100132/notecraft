# Task 47 — build 期解析：plugin 發現、glob 比對、資料驗證

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §7.1、§7.2、§7.7（實作階段 P2）。
> 依賴 [Task 46](task-46-plugin-contract-types.md)。**48 之後的畫面全部吃這支的輸出。**

## 為什麼要有這一步

畫面能不能做，取決於 build 時能不能把「哪個檔交給哪個 renderer、資料長什麼樣」算出來。
這支是整個功能的資料層，也是**唯一會讓 build 失敗的地方**（規格 §7.7 定案一律 build fail）。

## 範圍

新增 `src/lib/plugins.ts`，於 build / dev 期執行：

### 1. plugin 發現

沿用 deck 已驗證的做法（`src/lib/decks.ts:258`）：

```ts
const renderers = {
  ...import.meta.glob("/plugins/*/renderer.tsx", { eager: true }),        // 主專案官方 store（Q17）
  ...import.meta.glob("@notes/plugins/*/renderer.tsx", { eager: true }),  // 使用者專案
};
```

manifest 同樣用 `import.meta.glob("@notes/plugins/*/notecraft-plugin.json", { eager: true })` 吃進來。

### 2. 讀 `plugins.json` 與 glob 比對

- 讀 `<userCwd>/.notecraft/plugins.json`；**不存在就整個停用，零成本**（不報錯、不 warn）
- 走訪 notesDir —— 自己寫，複用 CLI `walkMdx` 的形狀（`bin/notecraftapp.mjs`）。
  **走訪時順手收 mtime 與檔案數**，直接餵給快取失效判斷（Task 56），不要再 stat 一輪
- 用 **picomatch** 比對 `files` / `exclude`（Q7a）。新增依賴
- 跳過 `.` 開頭資料夾與 `node_modules`
- `files` 基準是 **notesDir**（Q20）—— 資料檔必須在筆記資料夾內

### 3. 命中規則

依 `plugins` 陣列**由上而下，第一條命中的勝**（Q8），並印 warn 指出該檔同時被哪幾條命中、
最後交給了誰。「大範圍 + 特例」是常見寫法，硬擋會讓萬用 glob 不能用。

### 4. 資料載入與驗證

- `JSON.parse` → 以 manifest 的 `dataSchema` 用 **ajv** 驗證（Q7b）。新增依賴
- app 只約定 `meta.title` / `meta.description`（規格 §8.2），缺值退回檔名；其餘欄位不碰

### 5. 輸出

```ts
type ResolvedDataFile = {
  pluginId: string; absPath: string; relPath: string;
  routePath: string;          // 去副檔名，供 /view/<routePath>
  title: string; description: string;
  data: unknown; options: Record<string, unknown>;
  updatedAt: string;          // 檔案 mtime
};
```

## 卡控（規格 §7.7）

| 情況 | 行為 |
| --- | --- |
| `plugins.json` 不存在 | 停用，無任何影響 |
| `plugins.json` JSON 壞掉 | **build fail** |
| 指名的 plugin 未安裝 | **build fail**，提示 `npx notecraftapp install-plugin <id>` |
| plugin 缺 `renderer.tsx` 或 default export | **build fail** |
| 資料檔 parse / schema 驗證失敗 | **build fail**，指出檔案與第一個違規欄位 |
| glob 命中 0 個檔案 | warn |
| `files` 比對到 `.md` / `.mdx` | **build fail**（那是 notes collection 的地盤，規格 §5.2） |
| 一檔被多條規則命中 | warn，第一條勝 |

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 無設定零影響 | 專案沒有 `plugins.json` | `astro build` | 正常完成，無任何 plugin 相關輸出 |
| 萬用比對 | `files: ["**/*.er.json"]`，notesDir 下三處各一個 | build | 三個檔都被解析 |
| 第一條勝 | 規則 A `**/*.json`、B `planning/*.json` | build | `planning/x.json` 歸 A，並印 warn 列出 A、B |
| 驗證失敗擋 build | 資料檔少必填欄位 | build | 非零退出，訊息含檔案路徑與欄位名 |
| plugin 未裝擋 build | `plugins.json` 指向不存在的 id | build | 非零退出，訊息含安裝指令 |

## 依賴

Task 46。新增兩個 dependency：`picomatch`、`ajv`（build 期使用，進 `dependencies` 非 devDependencies）。

## 風險

中。`import.meta.glob` 對外部路徑的行為已由 deck 驗證過，但 **ajv 在 Astro build 環境的打包**尚未驗證；
若有問題，退路是改用既有的 zod（代價是失去資料檔的 `$schema` 編輯期補全，Q7b 的主要理由）。

## 實作記錄（2026-09-18）

`src/lib/plugins.ts`。新增依賴：`picomatch` 4.0.7、`ajv` 8.20.0（皆進 `dependencies`，build 期使用）、
`@types/picomatch`（dev）。

**實作上的決定**

- **manifest / schema / 資料檔一律用 `fs` 讀，只有 renderer 走 `import.meta.glob`。**
  renderer 必須被打包成真的能渲染的模組，fs 給不了；其餘用 fs 少一層 glob key 的解析與限制
  （例如 `dataSchema` 可以指向巢狀路徑）
- **plugin id 由 glob key 的尾段 `plugins/<id>/renderer.tsx` 正則取出。** key 的前綴依解析方式而異，
  但尾段恆定
- **`notecraftDir` 的優先序與 `astro.config.mjs` 完全一致**（`NOTECRAFT_USER_CWD` > `NOTECRAFT_NOTES_DIR` > cwd）。
  必須一致 —— renderer 是透過 `@notes/plugins/*` 找到的，若 `plugins.json` 從另一個 `.notecraft`
  讀進來就會出現「設定在 A、渲染器在 B」的錯位
- **ajv 的 2020 進入點是 CJS**，ESM 下 default import 可能拿到 `{ default: Ajv }`，在檔頭收斂一次

**驗證**（fixture 專案 + 暫時的自測頁，驗完已刪除）

| 情境 | 結果 |
| --- | --- |
| 主專案模式（無 `plugins.json`） | 完全停用，48 頁照常 build，無任何輸出 |
| viewer 模式（fixture） | renderer 經 `@notes` alias 發現、manifest 讀取、glob 比對、schema 驗證、`meta` 擷取、`options` 傳遞、`routePath` 計算全部正確 |
| schema 違規 | build fail，訊息指到 `/rows/1 must have required property 'name'` |
| JSON 壞掉 | build fail，含解析位置 |
| plugin 未安裝 | build fail，附 `install-plugin` 指令 |
| `files` 比對 `.md` | build fail |
| 多條規則命中同一檔 | warn，第一條勝 |
| glob 沒比對到 | warn |

**過程中修掉的一個訊息缺陷**：原本「沒有命中任何檔案」一句話涵蓋兩種情況 ——
glob 真的沒比對到，以及比對到了但都被更前面的規則接手。後者拿著前者的提示去修 glob 會白忙，
因此分成兩種訊息，並在所有多規則訊息裡加上規則序號（同一個 plugin 可以出現在多條規則裡）。

**未驗證**：路由撞名的保護。目前只吃 `.json`（Q21），`relPath` 相異必然 `routePath` 相異，
這道檢查在現況下不可達；留著是為了 Q21 擴充 parser 之後（`schema.json` 與 `schema.yaml` 會撞同一路由）。
已在程式碼註解說明。
