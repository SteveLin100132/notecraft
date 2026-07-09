---
Project Name: NoteCraft NPX Viewer
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 確定
文件狀態: 草稿
文件作者: 建宇
建立日期: 2026-07-09
更新日期: 2026-07-09
---

# NoteCraft NPX Viewer — v1 設計文件

把目前 NoteCraft 的 Astro app 包成一顆 npm 套件，任何專案下執行 `npx notecraft view ./docs` 就能用 NoteCraft 的 UI 品味瀏覽與輕量管理該資料夾內的 md/mdx 檔。

---

## 1. 目標與定位

### 1.1 目標

- 讓任何專案的 md/mdx 資料夾能透過一行指令啟動 NoteCraft 的完整 UI
- UI 與目前主專案的 dashboard、標籤、筆記檢視頁完全一致
- 支援本地寫回（新增筆記、編輯 frontmatter、編輯標籤），對外定位為「帶 UI 品味的 md/mdx viewer + 輕量管理工具」
- 不改動使用者專案的目錄結構、不要求 frontmatter 完整

### 1.2 非目標（v1 不做）

- AI 視覺化管線（`@ai-visualize` 標記處理）——留給 v2 的 `notecraft init-skill`
- pagefind 或任何全文搜尋
- 主題切換、多站點、workspace 概念
- Git 衝突偵測、undo
- 執行時的線上部署形態（v1 只跑本地）

---

## 2. 定案決策

| # | 決策 | 選項 |
| :-- | :-- | :-- |
| 1 | 執行模式 | **astro build + 快取靜態產物**，非 astro dev |
| 2 | 執行位置 | **複製到 `~/.notecraft/app-<version>/`** 後執行，不污染 npm cache |
| 3 | 寫入能力 | **v1 直接包含寫入**，不做「先唯讀」中間版本 |
| 4 | 路徑對應 | **保留階層**（catchall route，`[...slug].astro`）——實作階段調整，見 §6 |
| 5 | Frontmatter 缺欄位 | **靜默補預設值**，使用者無感 |

---

## 3. 系統架構

### 3.1 三個位置

執行過程涉及三個磁碟位置：

```
[1] npm cache（受 npx 管理，我們不動它）
    └── notecraft@1.0.0 的下載內容

[2] ~/.notecraft/（我們自己的家目錄）
    ├── app-1.0.0/          <- 這個版本套件的執行位置
    │   ├── src/            <- 完整 NoteCraft Astro app
    │   ├── astro.config.mjs
    │   ├── package.json
    │   ├── node_modules/   <- 首次執行時 install
    │   └── ...
    ├── app-1.0.1/          <- 未來新版本
    └── cache/
        └── <sha1(abs-path)>/    <- 每個「使用者資料夾」一份快取
            ├── dist/            <- astro build 產物
            ├── meta.json        <- {notesDir, lastBuildAt, filesHash}
            └── .stale           <- 存在時代表下次執行要 rebuild

[3] 使用者的專案目錄（唯一的 notes 來源）
    └── ./docs/**/*.{md,mdx}
```

### 3.2 執行流程

```
$ npx notecraft view ./docs

1. CLI 啟動
   ├── 解析 flags：--port, --no-open, --rebuild
   ├── 解析 notesDir = path.resolve(process.cwd(), './docs')
   └── 驗證 notesDir 存在

2. 檢查 ~/.notecraft/app-<version>/
   ├── 不存在 → 從套件安裝位置複製過來
   └── 首次進去 → 執行 npm install

3. 決定要不要 rebuild
   ├── 讀 ~/.notecraft/cache/<hash>/meta.json
   ├── 比對 notesDir 內所有 md/mdx 的 mtime 與 lastBuildAt
   ├── 檢查 .stale 檔案是否存在（前次寫入標記）
   └── 任一條件成立 → rebuild

4. Rebuild（如需要）
   ├── 設定 env NOTECRAFT_NOTES_DIR、NOTECRAFT_LOCAL_EDIT=1
   ├── cd ~/.notecraft/app-<version>/ && astro build
   ├── 輸出到 ~/.notecraft/cache/<hash>/dist/
   └── 更新 meta.json、清除 .stale

5. 啟動靜態伺服器
   ├── 用內建 express（或類似）伺服 cache/<hash>/dist/
   ├── 同時掛載 dev-only API routes（新增/編輯筆記、標籤）
   ├── 開瀏覽器 http://localhost:<port>
   └── stdout 顯示 notesDir、port、指令說明
```

---

## 4. Content Collections 改造

### 4.1 讀外部絕對路徑

`src/content.config.ts`：

```ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const notesDir = process.env.NOTECRAFT_NOTES_DIR
  ? process.env.NOTECRAFT_NOTES_DIR
  : new URL('./content/notes/', import.meta.url).pathname

export const collections = {
  notes: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: notesDir }),
    schema: () => z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      createdAt: z.coerce.date().optional(),
      updatedAt: z.coerce.date().optional(),
    }),
  }),
}
```

三處變化：
- `base` 讀 env（外部絕對路徑），fallback 到目前的 `src/content/notes/`
- schema 五個欄位全部 optional
- 在 `[slug].astro` 或 layout 中補預設值（見 §5）

### 4.2 MDX 相對圖片的處理

外部 MDX 若寫了 `![](./cover.png)`，Astro 用 Vite 解析器編譯時會找不到（不在專案 root 底下）。

**v1 決策**：在 CLI 啟動時把 `NOTECRAFT_NOTES_DIR` 額外掛成 Astro 的 `public/` 靜態資源根，並提供一個 remark 插件把 MDX 內的相對路徑重寫為絕對 URL `/notes-assets/<相對路徑>`。

實作放 `astro.config.mjs`：讀 env 動態把 `notesDir` 加入 Vite 的 `publicDir` 或 `server.fs.allow`，再配一個小的 remark 插件轉換路徑。細節在實作時 POC 驗證，這是最高風險項。

### 4.3 系列（Series）外部化

目前系列註冊表寫死在 [src/data/series.ts](../src/data/series.ts) 的 `SERIES` 常數裡，內含作者私人 slug（如 `waterfall-vs-agile`）。viewer 若沿用會壞掉——別人的 md/mdx 不可能有這些 slug。

**v1 方案 C：使用者自訂 `<notesDir>/.notecraft/series.json`**。

#### 4.3.1 JSON 格式

```jsonc
{
  "$schema": "https://notecraftapp.dev/schemas/series.json",
  "series": [
    {
      "id": "pm-basics",
      "title": "專案管理筆記",
      "eyebrow": "PROJECT MANAGEMENT",
      "description": "從「在管什麼」到「怎麼做、誰來做、如何落地」...",
      "accent": "navy",
      "icon": "target",
      "slugs": ["專案管理系列", "專案-vs-產品", "waterfall-vs-agile"]
    }
  ]
}
```

Schema 對齊現有 `SeriesDef` 型別，欄位限制：
- `accent`：`"blue" | "orange" | "navy"`（對應現有 `ACCENT` 對照表）
- `icon`：`"target" | "code" | "layers" | "bookOpen" | "bolt"`（對應 `SERIES_ICONS`）
- `slugs`：必須是字串陣列，順序即章節順序

#### 4.3.2 載入行為

viewer 啟動 build 前：

1. 檢查 `<notesDir>/.notecraft/series.json` 是否存在
2. 存在 → zod 驗證：
   - 通過 → 載入為 `SERIES`
   - 失敗 → stderr 印格式錯誤細節、走空陣列 fallback、儀表板顯示警告
3. 不存在 → 空陣列，`/series` 頁顯示引導文案「這個資料夾還沒定義系列，見文件（連結）」

#### 4.3.3 檔案結構重構

把 [src/data/series.ts](../src/data/series.ts) 拆成兩個檔案：

```
src/data/
├── series.ts             <- 匯出 types + loader + accent tokens（會發佈到 npm）
└── series.registry.ts    <- 硬編碼的 SERIES 陣列（.npmignore 排除，主專案本地用）
```

`series.ts` 的 `SERIES` 常數改成：

```ts
// src/data/series.ts
export async function loadSeries(): Promise<SeriesDef[]> {
  if (process.env.NOTECRAFT_NOTES_DIR) {
    return loadFromExternalJson(process.env.NOTECRAFT_NOTES_DIR)
  }
  // 主專案本地：讀硬編碼 registry；發佈版沒這檔就回空陣列
  try {
    const mod = await import('./series.registry')
    return mod.SERIES
  } catch {
    return []
  }
}
```

下游 [src/lib/series.ts](../src/lib/series.ts)、`src/pages/series/*.astro` 全部改用 `await loadSeries()` 取代直接 import `SERIES`。

#### 4.3.4 對主專案的影響

- `SERIES` 資料從 `series.ts` 搬到 `series.registry.ts`——**主專案體驗零變化**（loader 會 fallback 到 registry）
- 但下游所有直接 `import { SERIES } from '@/data/series'` 的地方要改成 `await loadSeries()`，因為變成 async

影響檔案：`series.ts`、新增 `series.registry.ts`、`lib/series.ts`、`pages/series/index.astro`、`pages/series/[id].astro`、可能還有 `SeriesNav.tsx`、`SeriesOverview.tsx`、`SeriesDetail.tsx`、`Sidebar.astro`（若有直接 import）。估 **6–9 個檔案**。

---

## 5. Frontmatter 降級策略

讀取時如果欄位缺失，依下表補值。所有補值只用於顯示與排序，**不會自動寫回檔案**，除非使用者透過 UI 主動編輯。

| 欄位 | 缺失時 fallback | 來源 |
| :-- | :-- | :-- |
| `title` | 檔案第一個 `#` H1 → 檔名（去副檔名、轉 Title Case） | MDX 內容 / 檔名 |
| `description` | 第一個非空段落前 160 字 | MDX 內容 |
| `tags` | `[]` | 常數 |
| `createdAt` | `fs.stat().birthtime`；不可用時 `mtime` | 檔案系統 |
| `updatedAt` | `fs.stat().mtime` | 檔案系統 |

實作點：在 Content Collections loader 之後的 `getStaticPaths()` 或 layout 進入前套用一個 `enrichEntry(entry)` 函式，所有 UI 元件之後都拿 enriched 版本。

---

## 6. 路徑對應（保留階層）

### 6.1 規則

- 遞迴讀 `<notesDir>/**/*.{md,mdx}`
- `slug` = 檔案相對 notesDir 的路徑（去副檔名、以 `/` 分隔）
  - `hello.mdx` → `hello`
  - `guides/setup.mdx` → `guides/setup`
  - `guides/oauth/flow.mdx` → `guides/oauth/flow`
- Astro 路由用 `[...slug].astro`（rest 參數），URL 直接對應階層：
  - `/notes/hello`、`/notes/guides/setup`、`/notes/guides/oauth/flow`

### 6.2 為什麼不用攤平（實作階段調整）

**原本問題 4 選攤平**，前提是「主專案自己的 slug 都是平的、不會有衝突」。實作到 P6/P7 才意識到 viewer 是給**任何專案**用的，別人的 `./docs` 幾乎都是巢狀（`guides/`、`api/`、`tutorials/`）。攤平會：

- URL 失去階層感（`/notes/setup` 讀不出來這篇屬於 guides 還是 tutorials）
- 同名衝突需要另外偵測、UI 顯示、frontmatter escape hatch，複雜度大

保留階層則天然沒有這些問題：每個檔案的完整相對路徑天然唯一，不需要衝突偵測。

### 6.3 寫入時的 slug 產生

新增筆記走 `POST /api/notes`：

- `slug = slugify(title)`（純檔名，不含 `/`）
- 一律寫到 `notesRoot/<slug>.mdx` 根層
- v1 不支援「新增筆記到子資料夾」的 UI（保留給 v1.1）
- 讀取時仍照 §6.1 規則，所以已存在的子資料夾筆記能被正確路由

### 6.4 API URL 對巢狀 slug 的處理

- `PUT /api/notes/<slug>/tags`：`<slug>` 可含 `/`（例 `/api/notes/guides/setup/tags`）
- `DELETE /api/notes/<slug>`：同理
- 伺服端解析：`parts.slice(2, -1).join("/")` 抓中間段做 slug
- 路徑安全一律走 `assertSafePath`（`resolve` 後 prefix 檢查 + `fs.realpath`）

---

## 7. 寫入能力與安全

### 7.1 保留的 dev-only 功能

CLI 啟動時設 `NOTECRAFT_LOCAL_EDIT=1`，取代目前判定 `import.meta.env.DEV` 的條件：

| 功能 | v1 是否啟用 |
| :-- | :-- |
| 「＋新增筆記」按鈕 | ✅ 啟用 |
| 「以 VS Code 編輯」按鈕 | ✅ 啟用 |
| 筆記檢視頁的標籤 chip 編輯 | ✅ 啟用 |
| `/tags` 頁的重新命名 / 刪除 | ✅ 啟用 |
| 「在 Claude Code 中重新生成」按鈕 | ❌ 隱藏（v1 沒 AI 管線） |

判定邏輯統一改成：`import.meta.env.DEV || import.meta.env.NOTECRAFT_LOCAL_EDIT`

### 7.2 API endpoints

所有 dev-only API 現在改成 v1 也提供，但綁在 CLI 內建的靜態伺服器上（不是 `astro dev`，而是我們自己起的一個小 express）：

- `POST /api/notes`
- `GET /api/tags`
- `PUT /api/tags/:old`
- `DELETE /api/tags/:tag`
- `PUT /api/notes/:slug/tags`

寫入完成後：
1. 更新目標 md/mdx 檔的 frontmatter（保持 YAML 格式、不動內文）
2. 更新該檔的 `updatedAt`
3. 在 `~/.notecraft/cache/<hash>/` 建立 `.stale` 檔，下次啟動 rebuild

### 7.3 路徑安全

**這條沒得商量**，寫入端一律遵守：

- slug 由 `slugify()` 產生，**保留 CJK**（跟主專案一致，作者以中文寫作）；路徑分隔符與非法字元由 slugify 剝除
- 目標路徑：`path.resolve(notesDir, `${slug}.mdx`)`
- 驗證：`resolvedPath.startsWith(notesDir + path.sep)`；不成立直接 400
- 新增筆記時檢查目標檔不存在，存在則 409（包含衝突原因）
- 所有寫入操作只綁 `127.0.0.1`，拒絕外部連線
- 拒絕 symlink（`fs.realpath` 後再驗證一次 prefix）

**曾考慮但決定不做**：viewer 模式強制 ASCII kebab-case slug 白名單。理由：主專案本身就大量使用 CJK slug（`專案-vs-產品`、`ai-顧問陪跑-workshop-20260625`），viewer 模式若比主專案嚴格會破壞 UX；路徑安全由上述 slugify + assertSafePath 兩層把關已足夠。

### 7.4 新增筆記的 frontmatter 預設模板

```yaml
---
title: <使用者輸入>
description: ''
tags: []
createdAt: <ISO 8601 now>
updatedAt: <ISO 8601 now>
---

<空白內容>
```

**v1 不含 `@ai-visualize` 標記**（因為沒 AI 管線可觸發）。目前主專案 CLAUDE.md 提到「預設 AI 標記範本」的行為，僅在主專案本體保留。

---

## 8. 快取失效策略

### 8.1 何時要 rebuild

任一條件成立：

1. `~/.notecraft/cache/<hash>/dist/` 不存在
2. `~/.notecraft/cache/<hash>/.stale` 存在（前次 API 寫入標記）
3. `notesDir` 內任一 md/mdx 的 mtime > `meta.json.lastBuildAt`
4. `notesDir` 內檔案數量 ≠ `meta.json.fileCount`（處理刪檔）
5. 使用者手動加 `--rebuild` flag

### 8.2 使用者透過 UI 編輯後的體驗

因為選了「build + 快取」+「寫入」，兩者天然有張力：使用者按下編輯 → API 寫檔完成 → 但快取的 dist 還沒重 build → 前端立即刷新看到的可能是舊資料。

**v1 決策**：API 寫入完成後回傳 202 + `{ needsRebuild: true, hint: '請重啟 notecraft view' }`，前端跳一個 toast「已儲存，重啟 notecraft view 即可看到更新」。

**理由**：v1 不做背景 rebuild，因為
- 背景 rebuild 期間如何服務舊 dist、rebuild 完如何切換、失敗如何 rollback 都需要處理
- v1 使用場景是本地手動觸發，重啟成本可接受（Ctrl+C → ↑ → Enter）
- 讓 v1 快速可用，rebuild UX 留給 v1.1 迭代

**v1.1 可選**：CLI 啟動時多起一個 watch 進程，偵測 md/mdx 變動就在背景 rebuild，準備好再原子切換 dist symlink。

---

## 9. CLI 表面

### 9.1 指令

```
notecraftapp view [dir]      啟動 viewer（預設 dir = 當前目錄）
notecraftapp build [dir]     只 build 不 serve（給 CI / 除錯用）
notecraftapp --version
notecraftapp --help          citty 自動產生
```

**v1 明確不做**：`clean` 子命令。使用者要清快取請自己 `rm -rf ~/.notecraft/cache/`，v1.1 再視需求補。

未來預留（v2+）：
```
notecraftapp init-skill      把 content-visualize skill 安裝到當前專案
```

### 9.2 view 的 flags

| Flag | 預設 | 說明 |
| :-- | :-- | :-- |
| `--port <n>` | 4321 | 靜態伺服器 port |
| `--no-open` | false | 不自動開瀏覽器 |
| `--rebuild` | false | 強制 rebuild，忽略快取 |
| `--host <h>` | 127.0.0.1 | 綁定 host（安全考量鎖 localhost，除非明確指定） |

### 9.3 CLI 框架

**採用 `citty`**：unjs 生態、小體積、原生支援子命令、TypeScript-friendly、`--help` 自動產生。

---

## 10. 打包與發佈

### 10.1 `package.json` 變化

```json
{
  "name": "notecraftapp",
  "version": "1.0.0",
  "bin": { "notecraftapp": "./bin/notecraftapp.mjs" },
  "files": [
    "bin/",
    "src/",
    "public/",
    "astro.config.mjs",
    "tailwind.config.mjs",
    "tsconfig.json",
    "package.json",
    "README.md"
  ],
  "engines": { "node": ">=22" }
}
```

**套件名與指令名**：
- npm 套件名：`notecraftapp`（因 `notecraft` 已被佔用）
- CLI 指令名：`notecraftapp`（與套件名一致，一個名字好記）
- 使用方式：`npx notecraftapp view ./docs`
- 若使用者覺得太長，可自行 `alias nc=notecraftapp`

### 10.2 `.npmignore` 或 `files` 排除

**絕對排除**：
- `src/content/notes/`（作者私人筆記，絕對不能夾帶）
- `src/components/generated/`（AI 產物，v1 viewer 不需要）
- `src/data/series.registry.ts`（作者私人系列註冊表，見 §4.3.3）
- `.claude/`（Skill 與 agent 設定，v2 才用）
- `docs/`
- `dist/`、`.astro/`、`node_modules/`
- `.env*`

**保留**：
- `src/content.config.ts`（Collections schema 定義）
- 所有 `src/pages/`、`src/layouts/`、`src/components/`（非 generated 的）
- `astro.config.mjs`、`tailwind.config.mjs`

發佈前用 `npm pack --dry-run` 檢查 tarball 內容。

### 10.3 套件名稱

**已定案**：`notecraftapp`（因 `notecraft` 已被佔用）。

實作前仍需 `npm view notecraftapp` 確認未被佔用；若也被佔用，備案 `@<npm-scope>/notecraft` 或再改名。

---

## 11. Out of scope（v1 明確不做）

| 項目 | 原因 |
| :-- | :-- |
| AI 視覺化管線 | v2 的 `init-skill` 才處理 |
| pagefind 搜尋 | build 流程複雜化，v1.1 再補 |
| 背景 rebuild / 熱重載 | 見 §8.2 |
| Git 衝突偵測 / undo | 相信 git，讓使用者自己處理 |
| 主題 / 品牌客製 | 目前寫死 trendlink-design |
| Windows 支援 | v1 先確保 macOS + Linux，Windows 之後測 |
| 多個 notesDir 同時掛載 | 一次一個資料夾 |

---

## 12. 實作階段

| Phase | 目標 | 前置 | 交付物 |
| :-- | :-- | :-- | :-- |
| **P1：Collections 外接** | 主專案裡驗證 `NOTECRAFT_NOTES_DIR` 能讀外部絕對路徑 | — | POC，能 build 一個指向 `/tmp/foo` 的版本 |
| **P2：MDX 圖片路徑** | 解決 §4.2 的相對圖片問題 | — | remark 插件 + astro config 動態 publicDir |
| **P3：Frontmatter 降級** | §5 的 enrich 函式與所有 UI 消費點改造 | P1 | 一個沒 frontmatter 的 md 也能正常顯示 |
| **P4：系列外部化** | §4.3 的 `.notecraft/series.json` 載入、`series.registry.ts` 拆檔、下游 async 化 | P1 | 用一份 JSON 就能讓 `/series` 頁跑起來 |
| **P5：寫入路徑安全** | §7.3 的路徑白名單、slug regex、symlink 拒絕、localhost bind | P1 | 能新增/編輯筆記、看到 `.stale` 生成 |
| **P6：CLI 骨架 + `~/.notecraft/`** | citty CLI、`view` / `build` 子命令、複製到 `~/.notecraft/app-<v>/`、express 靜態伺服器 | — | 本地 `node bin/notecraftapp.mjs view ./somewhere` 能跑 |
| **P7：快取失效** | §8.1 的偵測邏輯（mtime + .stale + fileCount） | P6 | 改外部 md 後重啟能看到更新 |
| **P8：打包發佈** | `.npmignore`、`npm pack --dry-run`、發佈到 npm | 全部 | `npx notecraftapp view` 從 npm 執行成功 |

**風險最高**：P1、P2、P5。這三個先各自 POC 驗證通過，其他都是接線工（P4 系列外部化是機械性 refactor，低風險）。

**並行機會**：
- P2 與 P1 可平行
- P3、P4、P5 都依賴 P1，做完 P1 後可三頭並進
- P6 骨架可與 P1–P5 並行（只是骨架，不依賴 Collections）

---

## 13. 已定案（原「尚未定案」）

| 項目 | 決定 | 備註 |
| :-- | :-- | :-- |
| CLI 框架 | **`citty`** | unjs 生態、子命令原生支援、`--help` 自動 |
| npm 套件名稱 | **`notecraftapp`** | 因 `notecraft` 已被佔用；實作前再 `npm view notecraftapp` 保險 |
| CLI 子命令範圍 | **僅 `view`、`build`、`--version`（+ `--help`）** | `clean` 延到 v1.1 |
| 首次 `npm install` 用哪個 pm | **一律 `npm`** | 避免 pnpm / yarn 偵測不一致的坑，`~/.notecraft/` 內部一律 npm |
| Node 版本要求 | **`>=22`** | 對齊主專案，不放寬到 20 LTS |
| Telemetry / 匿名統計 | **不加** | v1 純本地工具，尊重使用者隱私 |
| 環境變數命名 | **`NOTECRAFT_NOTES_DIR`、`NOTECRAFT_LOCAL_EDIT`** | 沿用原命名，前綴清楚不縮短 |

---

## 14. 決策紀錄摘要

給實作時當單頁備忘錄用：

```
套件：notecraftapp（npm）、指令 npx notecraftapp view ./docs
執行：build + 快取，複製到 ~/.notecraft/app-<v>/、~/.notecraft/ 內一律用 npm
寫入：v1 就開，路徑安全鎖死 notesDir 底下、slug 白名單
路由：保留階層（[...slug].astro rest route），新增筆記寫根層、讀取全深度
Metadata：靜默補預設，只 enrich、不寫回
系列：<notesDir>/.notecraft/series.json 外部載入；主專案 fallback 到 series.registry.ts
Cache：mtime 比對 + .stale 檔；編輯後要重啟
CLI：citty、view / build / --version 三個表面（clean 留 v1.1）
Node：>=22，無 telemetry
```
