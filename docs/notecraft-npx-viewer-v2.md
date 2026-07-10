---
Project Name: NoteCraft NPX Viewer
文件類型: Design Document
文件版本: v2.0.0
開發模式: Waterfall
技術選型: 確定
文件狀態: 草稿
文件作者: 建宇
建立日期: 2026-07-10
更新日期: 2026-07-10
依賴文件: docs/notecraft-npx-viewer.md（v1）
---

# NoteCraft NPX Viewer — v2 設計文件

在 [v1](./notecraft-npx-viewer.md) 已能瀏覽 / 輕量管理任何專案 `./docs` 內 md/mdx 的基礎上，v2 加兩件事：

1. **AI 視覺化管線可被使用者專案採用**——`notecraftapp init-skill` 把主專案的 content-visualize Skill 與 4 個 Subagent 設定安裝到使用者 cwd，之後使用者在自己專案內開 Claude Code 就能觸發 `@ai-visualize` 標記處理
2. **背景 rebuild**——viewer 觀察 md/mdx 與 `.notecraft/components/` 變動、自動重 build、原子切換 dist、SSE 通知前端刷新，AI 生成一個元件立刻看得到

---

## 1. 目標與範圍

### 1.1 目標

- 使用者專案內執行一次 `npx notecraftapp init-skill` 後，`.claude/` 底下就有完整可用的 content-visualize skill + 4 Subagent
- viewer 執行期間能 render 使用者專案的 `.notecraft/components/*.tsx`（AI 生成的 React 元件）
- md/mdx 或 generated 元件變動 → 背景 rebuild → 前端自動刷新，無需手動 Ctrl+C 重啟

### 1.2 非目標（v2 也不做）

| 項目 | 原因 |
| :-- | :-- |
| pagefind 全文搜尋 | 留 v1.2 或 v2.1 迭代 |
| 執行時 sandbox AI 生成的元件 | 見 §8.3，與主專案信任模型對齊即可 |
| viewer 主動觸發 AI 生成 | 觸發仍在使用者本地 Claude Code 對話，viewer 只觀察檔案變動 |
| Skill 上游升級的自動 merge | init-skill 為一次性 copy，升級由使用者自行決定 |
| 多 notesDir / Windows / 主題客製 | 延續 v1 |

---

## 2. 承接 v1 的定案

v1 的五條主決策 v2 全部沿用，v2 只在其上疊加。逐條標記狀態：

| # | v1 定案 | v2 處理 |
| :-- | :-- | :-- |
| 1 | astro build + 快取靜態產物 | ✅ 沿用，快取失效條件擴充（見 §7.1） |
| 2 | 執行位置 `~/.notecraft/app-<v>/` | ✅ 沿用，不變 |
| 3 | v1 直接包含寫入 | ✅ 沿用，寫入端擴充「AI 元件也走同套路徑安全」 |
| 4 | 保留階層 `[...slug].astro` | ✅ 沿用，不變 |
| 5 | Frontmatter 靜默補預設 | ✅ 沿用，不變 |

v2 新增定案（在 §13 集中整理）：

| # | 新決策 | 選項 |
| :-- | :-- | :-- |
| 6 | AI 元件位置 | **`<notesDir>/.notecraft/components/`** |
| 7 | MDX import 解析 | **新增 `@notes/*` alias**，Vite `server.fs.allow` 動態擴充 |
| 8 | Skill 安裝機制 | **一次性 copy 到 `<cwd>/.claude/`**，不做 symlink、不自動升級 |
| 9 | Skill 兩份維護 | **主專案本地 Skill 與 viewer 打包 Skill 分離**（見 §5） |
| 10 | rebuild 觸發 | **watcher + debounce 300ms + 原子 rename dist** |
| 11 | 前端刷新機制 | **SSE (`/__notecraft/events`)**，僅 `view` 子命令注入 |

---

## 3. 系統架構

### 3.1 三個角色，三個 loop

v2 的關鍵是：**AI 生成的觸發者、執行者、觀察者分離**。

```
[角色 A] 作者（使用者）
    └── 在自己專案根打開 Claude Code 對話
        └── 說：「處理視覺化」

[角色 B] Claude Code + 4 Subagent（在 [A] 的 cwd 內）
    ├── 讀 <cwd>/.claude/skills/content-visualize/SKILL.md
    ├── 讀 <cwd>/.claude/agents/{note-scanner, visualize-planner,
    │                             component-generator, mdx-writer}.md
    ├── 掃描 <notesDir>/**/*.{md,mdx} 找 @ai-visualize 標記
    ├── 產出 <notesDir>/.notecraft/components/<id>.tsx
    └── 改 <notesDir>/some-note.mdx（插入 import + JSX、更新 status）

[角色 C] Viewer（另一個 terminal 執行 npx notecraftapp view）
    ├── watcher 監看 <notesDir>/**/*.{md,mdx}
    ├── watcher 監看 <notesDir>/.notecraft/components/*.tsx
    ├── 偵測到變動 → debounce → 背景 astro build
    ├── build 成功 → 原子替換 dist/
    └── SSE 通知瀏覽器 → 自動 reload
```

**設計意涵**：
- viewer 本體不會呼叫 AI、不會載入 Skill——它只是個檔案觀察者 + 靜態伺服器
- 使用者不需要在 viewer 執行時「切到 viewer 這邊觸發什麼」——Claude Code 對話在自己 terminal 跑，viewer 那邊自動反映
- 兩個 terminal 各司其職，狀態同步靠檔案系統

### 3.2 執行流程（相對 v1 差異）

v1 §3.2 的 5 步流程 v2 全部保留，額外加：

```
6. 啟動 watcher（僅 view 子命令）
   ├── chokidar 監看 notesDir（md/mdx）
   ├── chokidar 監看 notesDir/.notecraft/components（tsx）
   ├── chokidar 監看 notesDir/.notecraft/series.json
   └── 變動 → 進入背景 rebuild 佇列（見 §7）

7. 掛載 SSE 端點
   └── express 加一條 GET /__notecraft/events
       └── 每次 build 完成 push {type: 'rebuild-complete', ok: true|false}
```

---

## 4. `notecraftapp init-skill` CLI

### 4.1 指令表面

```
notecraftapp init-skill [--force] [--check] [--dir <path>]
```

| Flag | 預設 | 說明 |
| :-- | :-- | :-- |
| `--force` | false | 目標檔存在時直接覆寫，不 prompt |
| `--check` | false | 只印目前安裝狀態與版本比對，不寫檔 |
| `--dir <path>` | `process.cwd()` | 指定安裝目標 root（一般不用） |

### 4.2 安裝內容

從 npm 套件的 `skill-template/` 目錄 copy 到目標：

```
<套件>/skill-template/                 <cwd>/
├── .claude/skills/content-visualize/  → .claude/skills/content-visualize/
│   ├── SKILL.md                       →     SKILL.md
│   └── references/                    →     references/
└── .claude/agents/                    → .claude/agents/
    ├── note-scanner.md                →     note-scanner.md
    ├── visualize-planner.md           →     visualize-planner.md
    ├── component-generator.md         →     component-generator.md
    └── mdx-writer.md                  →     mdx-writer.md
```

### 4.3 衝突處理

目標檔已存在時：

1. `--force` → 直接覆寫，stdout 印被覆寫的檔案清單
2. 未 `--force` → 對每個衝突檔互動式詢問：`overwrite / skip / diff / abort`
3. 非 TTY 環境（CI / 腳本）+ 未 `--force` → 直接 abort，exit code 1

### 4.4 `--check` 行為

讀取套件內嵌的 `skill-template/VERSION` 與本地 `<cwd>/.claude/skills/content-visualize/VERSION` 比對，輸出：

```
content-visualize skill:
  installed: v2.0.0
  packaged:  v2.1.0
  → upgrade available: run `notecraftapp init-skill` to upgrade
```

**明確不做**：自動 merge。使用者可能改過 Skill 內容（改 prompt、改決策樹），任何 auto-merge 都會踩到腳。作者只提示、由作者跑 `init-skill --force` 或手動 diff 決定。

### 4.5 為什麼選 copy 而非 symlink

- 使用者需要能改 skill 內容（微調 prompt、白名單、決策樹）
- symlink 到 `~/.notecraft/app-<v>/` 底下 → 下次升級 viewer 就吃到新版，破壞使用者改動
- copy → 使用者擁有修改權，viewer 升級與 skill 升級解耦
- 代價：升級 skill 要主動跑 `init-skill --force`；接受

---

## 5. Skill / Subagent 的兩份維護

### 5.1 為什麼需要兩份

主專案本地的 Skill（`.claude/skills/content-visualize/SKILL.md`）寫死了主專案的路徑約定：

- 元件寫到 `src/components/generated/<id>.tsx`
- MDX import 走 `@/components/generated/<id>`

viewer 安裝到使用者專案的 Skill 需要不同路徑：

- 元件寫到 `.notecraft/components/<id>.tsx`
- MDX import 走 `@notes/components/<id>`

兩份 SKILL.md 的差異就在這兩個字串。其餘 95%（決策樹、視覺化選型、樣式規範、白名單）完全相同。

### 5.2 檔案佈局

```
notecraft/                              # 這個 repo
├── .claude/skills/content-visualize/   # 主專案本地版（.npmignore 排除）
│   └── SKILL.md
├── .claude/agents/                     # 主專案本地版（.npmignore 排除）
│   ├── note-scanner.md
│   ├── visualize-planner.md
│   ├── component-generator.md
│   └── mdx-writer.md
└── skill-template/                     # v2 新增：viewer 打包版（打包進 npm）
    ├── VERSION                         # semver，供 init-skill --check
    └── .claude/
        ├── skills/content-visualize/
        │   ├── SKILL.md                # viewer 路徑版
        │   └── references/
        └── agents/
            └── *.md                    # viewer 路徑版
```

### 5.3 兩份如何避免長期漂移

- 主專案本地版是**唯一 source of truth**
- 加一個腳本 `scripts/sync-skill-template.mjs`：讀主專案 `.claude/`，做字串替換（`src/components/generated/` → `.notecraft/components/`、`@/components/generated/` → `@notes/components/`），寫到 `skill-template/`
- pre-commit hook 或 CI 檢查 `skill-template/` 相對主專案有沒有落後（比對兩者的原始文本 + 已知替換規則）
- 發佈前跑 `npm run sync-skill && npm publish`

### 5.4 viewer 版 Skill 的關鍵差異項

只有這些字串會被替換：

| 主專案 | viewer 版 |
| :-- | :-- |
| `src/components/generated/<id>.tsx` | `.notecraft/components/<id>.tsx` |
| `@/components/generated/<id>` | `@notes/components/<id>` |
| `src/content/notes/` | `<notesDir>` |

其他所有內容——決策樹、視覺化選型表、trendlink-design 依賴、白名單、locked/failed 規則——**完全不變**。

---

## 6. AI 元件位置與 import 解析

### 6.1 目錄約定

使用者專案的 `<notesDir>/.notecraft/` 是 viewer 與 AI 管線的共同機房：

```
<notesDir>/
├── .notecraft/
│   ├── series.json                  # v1 已定案
│   ├── components/                  # v2 新增：AI 生成元件
│   │   ├── oauth-flow.tsx
│   │   ├── revenue-chart.tsx
│   │   └── ...
│   └── VERSION                      # 由 init-skill 寫入，供比對
└── **/*.{md,mdx}
```

### 6.2 MDX 內的 import 語法

mdx-writer 產出的 MDX 片段：

```mdx
{/* @ai-visualize
id: oauth-flow
type: diagram
prompt: |
  ...
status: generated
*/}

import OauthFlow from '@notes/components/oauth-flow'

<OauthFlow client:visible />
```

**為什麼用 `@notes/` 而非相對路徑**：
- 相對路徑（`./.notecraft/components/oauth-flow`）在巢狀 md 內會變成 `../../.notecraft/...`，難讀且易錯
- alias 讓所有 MDX 內 import 統一

### 6.3 Astro 端 alias 設定

`~/.notecraft/app-<v>/astro.config.mjs` 讀 env 動態注入**三件事**（Q3 POC 實測後補齊）：

```js
import { defineConfig } from 'astro/config'
import path from 'node:path'
import { GENERATED_COMPONENT_PACKAGE_WHITELIST } from './src/lib/generated-component-whitelist.ts'

const notesDir = process.env.NOTECRAFT_NOTES_DIR
  ? path.resolve(process.env.NOTECRAFT_NOTES_DIR)
  : null

export default defineConfig({
  vite: {
    resolve: {
      // (1) @notes alias 指向 <notesDir>/.notecraft/，讓 MDX 內 import 統一走短路徑
      alias: notesDir ? { '@notes': path.join(notesDir, '.notecraft') } : {},
      // (2) dedupe 強制白名單套件從 viewer app 的 node_modules 解析——外部 tsx
      //     位於 notesDir 底下、無自帶 node_modules，rollup 若從 tsx 位置向上找
      //     不到會直接 build fail（見 §6.3.1 踩坑紀錄）
      dedupe: notesDir ? GENERATED_COMPONENT_PACKAGE_WHITELIST : [],
    },
    server: {
      host: '127.0.0.1',
      // (3) fs.allow 加入 notesDir，避開 Vite 5+ dev server 對 project root 以外檔案的預設 403
      //     （build 期預設不受此限，但保留設定讓 view 子命令 dev 模式也能用）
      ...(notesDir && { fs: { allow: [process.cwd(), notesDir] } }),
    },
  },
  // ...
})
```

#### 6.3.1 踩坑紀錄：dedupe 不設就 build fail

Q3 POC 期間發現：純靜態外部 tsx（無 npm dependency）能用 alias 解析；但一旦元件內出現 `import { motion } from 'motion/react'`——這是絕大多數 AI 生成元件的常態——rollup 從外部 tsx 位置向上找 `node_modules` 一路都沒有，直接 build fail：

```
[vite]: Rollup failed to resolve import "motion/react" from
  "/private/tmp/.../q3-fixture/.notecraft/components/counter.tsx"
```

修正：`vite.resolve.dedupe` 列白名單套件、強制從 viewer app root 解析。**dedupe 清單必須與 `component-generator` Subagent 的 import 白名單、`content-visualize` Skill 文檔中的白名單完全一致**——三處手動同步會漂移，因此提出成單一 constant，見 §6.6。

### 6.4 元件不存在時的 fallback

MDX 內 import 一個不存在的元件（例如作者刪了 tsx 但沒清掉 import）→ Astro build 失敗。**v2 決策：build 失敗就失敗，讓使用者看到明確錯誤**，不做「靜默替換為 placeholder」。

理由：靜默替換會讓「元件消失」變成沉默 bug；build 失敗至少明確。背景 rebuild 失敗時 §7.4 已有 UX 處理。

### 6.5 元件白名單（安全性）

繼承主專案：

```
react, react-dom, motion, recharts, d3, lucide-react, clsx, tailwind-merge
```

+ 相對路徑（`./` `../`）與 alias（`@notes/*`）。

白名單檢查由 **component-generator Subagent** 執行（產出前 lint import statement）。viewer 端不做 runtime 檢查——若使用者手改元件加了白名單外套件，會在 rebuild 時 build fail，走同一 UX。

### 6.6 白名單的唯一定義來源

白名單同時被三個地方消費：

1. **build-time**：`astro.config.mjs` 的 `vite.resolve.dedupe`（外部 tsx 能否被 rollup 解析）
2. **generation-time**：`component-generator` Subagent 的 lint（AI 產出前把關）
3. **文檔**：`content-visualize` SKILL.md 內明列給 planner 決策時參考

三處若手動同步遲早漂移——今天忘了在 dedupe 加一個新套件，明天 build 就會炸；SKILL.md 標的白名單與實際能 build 的清單不一致，作者會困惑。

**v2 決策**：白名單集中在 `src/lib/generated-component-whitelist.ts` 一份 constant，其他兩處自動引用：

```ts
// src/lib/generated-component-whitelist.ts
export const GENERATED_COMPONENT_PACKAGE_WHITELIST = [
  'react',
  'react-dom',
  'motion',
  'recharts',
  'd3',
  'lucide-react',
  'clsx',
  'tailwind-merge',
] as const
```

- `astro.config.mjs` **直接 import**（見 §6.3 範例）
- `scripts/sync-skill-template.mjs` **讀 constant → 產生 SKILL.md 內白名單段落**（取代原本硬編碼在 SKILL.md 的清單），確保 viewer 版 SKILL 永遠與 build 期實際能吃的套件一致
- 主專案本地的 `.claude/skills/content-visualize/SKILL.md` 也改讀共用 constant，避免主專案自己漂移
- 未來加套件只改一處：改 constant + `npm run sync-skill` + 一併加入 `package.json` dependencies

**代價**：主專案 `SKILL.md` 內原本手寫的白名單段落要改成 sync 腳本產生的占位標記（例如 HTML comment `<!-- BEGIN:whitelist --> ... <!-- END:whitelist -->`），讓腳本能精準替換。這是一次性重構，之後不再變動。

---

## 7. 背景 rebuild

**掛在哪個命令**：v1 CLI 已分成 `view / build / serve` 三命令，其中 `view` 走 astro dev（已有 vite HMR + 寫入 API，供作者自用），`serve` 走靜態伺服 build 過的 dist（純觀察者）。v2 背景 rebuild **掛在 `serve` 命令**、預設開啟（`--no-watch` 選擇性退出）。不動 `view`——它已有 HMR，與 v2 chokidar+SSE 並存會有兩套 reload 機制打架；且外部絕對路徑（`.notecraft/components/*.tsx`）在 dev 模式下 vite HMR 行為不確定，用 build+watch 這條乾淨路徑迴避。

作者若要**編輯 UI**（改標籤、新增筆記按鈕）→ 用 `view`；要**觀察 AI 生成**（Claude Code 在別的 terminal 寫檔、viewer 自動反映）→ 用 `serve`。

### 7.1 快取失效條件（v1 §8.1 擴充）

v1 五條全部保留，v2 額外加：

6. `<notesDir>/.notecraft/components/*.tsx` 任一 mtime > `meta.json.lastBuildAt`
7. `<notesDir>/.notecraft/components/` 檔案數量 ≠ `meta.json.componentCount`

### 7.2 watcher 佈署

CLI `serve` 子命令啟動後（除非帶 `--no-watch`）：

```
1. chokidar.watch([
     `${notesDir}/**/*.{md,mdx}`,
     `${notesDir}/.notecraft/components/*.tsx`,
     `${notesDir}/.notecraft/series.json`,
   ], { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 } })

2. 任一事件（add / change / unlink）→ 進 rebuild 佇列

3. debounce 300ms，佇列合併：
   ├── 300ms 內連續變動 → 只觸發一次 rebuild
   └── rebuild 進行中又收到新事件 → 標記 pending，rebuild 結束後立刻再跑一次
```

### 7.3 原子 rebuild

```
1. 產物先寫到 cache/<hash>/dist.next/（而非直接覆蓋 dist/）
2. 成功 → fs.renameSync(dist, dist.prev) + fs.renameSync(dist.next, dist)
       → 移除 dist.prev（可保留 N 版做 rollback，v2 先不做）
3. 失敗 → 保留 dist/、刪 dist.next/
```

`renameSync` 在同一 filesystem 內是原子操作，能避免「rebuild 到一半使用者刷頁面拿到半成品」。

### 7.4 rebuild 失敗處理

分**兩個場景**——「有舊 dist」與「無 dist」，UX 不同：

**A. 有舊 dist（大部分情況）**：
- 保留舊 dist/、使用者頁面繼續顯示上一版（不會白畫面）
- 前端透過 SSE 收到 `{type: 'rebuild-complete', ok: false, error: '...'}` → console.warn，不強制 reload
- v1 的 `.stale` 檔仍保留——作為「顯性強制 rebuild」旗標

**B. 無 dist（首次啟動就失敗、或全新 notesDir）**：v1 行為是 `ensureBuild` throw、整個 CLI 進程死掉，使用者看不到任何 UI；v2 改為：

- `ensureBuild` **不 throw**，回傳 `{ ok: false, error }`
- `serve` 命令**仍上線**、掛 fallback 頁：帶錯誤節錄 + inline SSE script + 說明「watcher 正在監看，修好會自動 reload」
- fallback 頁的作用不是提供內容、是**讓 UI 存在到修好為止**——使用者存檔 → watcher 觸發成功 rebuild → SSE 廣播 `ok:true` → `location.reload()` → 拿到真正的 dist 內容
- 對比 `build` 命令：**仍 exit 1**，CI 語意不變（build 是給 CI 用的，失敗就該吼）

**架構上的順帶收益**：`ensureBuild` 現在也走 `atomicRebuild`（v1 直接寫入 `distDir`、build 失敗會 corrupt 舊 dist），有舊 dist 時的原子性也順手補上。

### 7.5 SSE 通知

express 端：

```
GET /__notecraft/events    # text/event-stream
  ├── 客戶端建立連線 → 加入 subscriber 集合
  ├── rebuild 完成 → broadcast `{type, ok, error?}`
  └── 客戶端 close → 從集合移除

僅 `serve` 子命令（且未帶 `--no-watch`）注入客戶端 script；`build` 子命令產出的 dist 是純靜態、不含 SSE 邏輯
```

客戶端腳本（實作決策：直接 **inline** 注入 HTML 響應的 `</head>` 前，不獨立成 `public/notecraft-dev.js`——腳本極短、少一次 HTTP round-trip、也不會被 build 子命令的 dist 意外夾帶）：

```js
const es = new EventSource('/__notecraft/events')
es.addEventListener('message', (ev) => {
  const { type, ok } = JSON.parse(ev.data)
  if (type === 'rebuild-complete' && ok) location.reload()
  if (type === 'rebuild-complete' && !ok) showToast('rebuild failed, see terminal')
})
```

**注意**：`build` 子命令產出的 dist 用於 CI 或 debug，不能夾帶 dev script。因為 script 是由 `serve` 命令在響應 HTML 時 inline 注入，dist 檔本身完全乾淨；`build` 直接把 dist 拷走或用 `serve --no-watch` 都不會有 SSE 邏輯。

### 7.6 API 寫入 vs 背景 rebuild 的關係

v1 §8.2 決策是「API 寫入完成後回 202 + 請使用者重啟」。v2 的處境需要區分兩個模式：

- **`view` 模式（astro dev）**：API 寫入透過 dev-api integration，vite HMR 直接 pick up，走 v1 已有的路徑，無需 chokidar
- **`serve` 模式**：目前無寫入 API（純觀察者），若未來要在 `serve` 也開放 API 寫入，則走：API 寫入完成 → 建立 `.stale` → watcher 也會偵測到 md/mdx 變動 → 觸發 rebuild → SSE 通知；API 回應為 200 + `{ ok: true, rebuildQueued: true }`

**v2 決策**：`serve` 模式**不加寫入 API**——分工清楚（view 編輯、serve 觀察）。使用者要編輯用 `view`，不需要 `serve` 也提供 API。若未來 v3 有需求再加。

---

## 8. 安全性

### 8.1 沿用 v1 §7.3

- 路徑安全：`path.resolve` + prefix 檢查 + `fs.realpath`
- localhost bind（`127.0.0.1`）
- slug 保留 CJK
- 拒絕 symlink

### 8.2 v2 新增

- **`.notecraft/components/*.tsx` 也走路徑安全**：mdx-writer 產出 import 前先 resolve 目標檔的絕對路徑，驗證在 `<notesDir>/.notecraft/components/` 底下（不允許 `../` 逃脫）
- **元件 import 白名單由 Subagent 端把關**：component-generator 產出檔案前 lint import statement；白名單外套件觸發 Skill 定義的「先徵詢作者」流程
- **白名單三處消費、單一來源**：build-time `dedupe` / Subagent lint / SKILL.md 文檔全部從 `src/lib/generated-component-whitelist.ts` 讀（見 §6.6）。若白名單漂移，後果是 AI 產出了看起來合法、實際 rollup build fail 的元件（Subagent 說 OK、build 說 NO），使用者混亂。集中管理是安全性 **and** UX 措施
- **只接受 `.tsx` 元件**：mdx-writer 拒絕產出 `.js` `.mjs` `.cjs` `.py` 等；component-generator 也只寫 tsx
- **只綁 `127.0.0.1`（含 SSE）**：SSE 端點與 API 端點共用 host 設定，不因新加而放寬

### 8.3 明確不做

| 項目 | 原因 |
| :-- | :-- |
| 執行時 sandbox AI 生成的元件 | 元件在瀏覽器 client-side 執行，與一般 React 元件無異。加 sandbox 會破壞 motion / recharts 的正常使用，且與主專案信任模型不對稱 |
| viewer 端 lint AI 產物 | Skill / Subagent 端已把關；重複檢查 = 重複維護 |
| Skill 內容簽章 | 使用者 copy 後可自由改，簽章反而礙事 |

---

## 9. 打包與發佈變化

### 9.1 tarball 內容（相對 v1 §10.2）

**v2 新增打包**：
- `skill-template/`（見 §5.2）——這是核心新項

**v1 仍排除、v2 依然排除**：
- `src/content/notes/`（作者私人筆記）
- `src/components/generated/`（主專案 AI 產物）
- `src/data/series.registry.ts`
- `.claude/skills/`、`.claude/agents/`（**主專案本地版**——viewer 版走 `skill-template/`）
- `docs/`、`dist/`、`.astro/`、`node_modules/`、`.env*`

### 9.2 package.json 變化

```json
{
  "files": [
    "bin/",
    "src/",
    "public/",
    "skill-template/",         // ← v2 新增
    "astro.config.mjs",
    "tailwind.config.mjs",
    "tsconfig.json",
    "package.json",
    "README.md"
  ],
  "scripts": {
    "sync-skill": "node scripts/sync-skill-template.mjs",
    "prepublishOnly": "npm run sync-skill && npm pack --dry-run"
  }
}
```

`prepublishOnly` 是保險：發佈前一定重跑 sync，避免忘記同步。

---

## 10. CLI 表面（相對 v1 §9 差異）

### 10.1 指令

```
notecraftapp view [dir]           # v1 沿用（astro dev、HMR、寫入 API，作者編輯模式）
notecraftapp build [dir]          # v1 沿用（純靜態產物，不含 SSE）
notecraftapp serve [dir]          # v1 沿用；v2 加背景 rebuild + SSE（觀察者模式）
notecraftapp init-skill           # v2 新增（見 §4）
notecraftapp --version
notecraftapp --help
```

### 10.2 serve 的 flag 擴充

| Flag | 預設 | 說明 | v1/v2 |
| :-- | :-- | :-- | :-- |
| `--port <n>` | 4321 | | v1 |
| `--host <h>` | 127.0.0.1 | | v1 |
| `--no-open` | false | | v1 |
| `--rebuild` | false | 強制首次 rebuild | v1 |
| `--no-watch` | false | 關閉背景 rebuild + SSE（回到 v1 純靜態行為，適合 CI / 容器 / debug） | **v2 新增** |

`--no-watch` 存在的原因：低效能機器 / 容器內執行時，watcher + 頻繁 rebuild 可能吃資源；也提供退路給 CI 場景（跑一次 build 產出、靜態驗證）。

**`view` 不加 `--no-watch`**：`view` 走 astro dev、由 vite HMR 處理更新，本來就沒有 chokidar watcher 可關閉。

---

## 11. Out of scope（v2 明確不做）

| 項目 | 原因 |
| :-- | :-- |
| pagefind 搜尋 | 留 v2.1 或 v3 |
| 多 notesDir 掛載 | 延續 v1 決策 |
| Windows 支援 | 延續 v1 決策 |
| 主題 / 品牌客製 | 延續 v1 決策 |
| Skill 版本 auto merge | 見 §4.4 |
| 執行時元件 sandbox | 見 §8.3 |
| viewer 主動觸發 AI | 觸發權在使用者本地 Claude Code，見 §3.1 |
| rebuild 歷史保留 / rollback UI | 保留 `dist.prev` 即可，UI 留 v2.1 |
| Cloud 版 viewer / Netlify Function | 定位仍為本地工具 |

---

## 12. 實作階段

| Phase | 目標 | 前置 | 交付物 |
| :-- | :-- | :-- | :-- |
| **Q1：skill-template 建立** | §5.2 目錄結構、§5.3 sync 腳本、VERSION 檔 | v1 全部 | `npm run sync-skill` 產出可用 template |
| **Q2：init-skill 骨架** | citty 子命令、copy 邏輯、`--force` / `--check` / `--dir` | Q1 | 空 repo 下 `npx notecraftapp init-skill` 能裝上 |
| **Q3：`@notes/*` alias POC** | 主專案 astro.config.mjs 加 alias + `server.fs.allow` + `dedupe`，fixture 專案驗證靜態 + `client:visible` + motion 三種元件 | v1 P1 | 外部 tsx 三類元件都能被 MDX import 並成功 build（**Q3 POC 已完成**，發現 dedupe 是必要條件，見 §6.3.1） |
| **Q3.5：白名單 constant 化** | 建 `src/lib/generated-component-whitelist.ts`、astro.config.mjs 改讀它、sync 腳本從它產生 SKILL.md 白名單段落、主專案本地 SKILL.md 加占位標記 | Q3 | 三處只需改一處 constant |
| **Q4：元件白名單 lint** | 更新 component-generator Subagent 的產出前 lint 規則、讀 §6.6 constant | Q3.5 | 白名單外 import 一律拒絕產出 |
| **Q5：watcher + debounce** | chokidar + 300ms debounce + rebuild 佇列 | v1 P6 | 改 md/mdx 30 秒內自動 rebuild |
| **Q6：原子 rebuild** | `dist.next/` → rename swap、失敗 rollback | Q5 | rebuild 進行中刷新頁面不出現半成品 |
| **Q7：SSE 通知 + 前端注入** | express `/__notecraft/events`、view 專用 client script | Q6 | 改 mdx → 瀏覽器自動 reload |
| **Q8：端對端驗證** | 空專案 → init-skill → 寫 md + `@ai-visualize` → Claude Code 產生 → 元件出現在頁面 | 全部 | 錄一段 demo（README 用） |

**風險最高**：~~Q3~~（已完成、實測發現 dedupe 是關鍵）、Q5-Q7。Q5-Q7 三者是背景 rebuild 的核心，任一環節壞掉都影響 UX。

**並行機會**：
- Q1-Q2 可並行於 Q3-Q4
- Q5-Q7 是嚴格 sequential
- Q8 依賴全部

---

## 13. 已定案

| 項目 | 決定 | 備註 |
| :-- | :-- | :-- |
| Skill 佈署方式 | copy 到 `<cwd>/.claude/`，不做 symlink | §4.5 |
| Skill 升級策略 | 手動 `init-skill --force`，不 auto merge | §4.4 |
| 主專案 vs viewer Skill 關係 | 兩份維護、sync 腳本 + prepublishOnly 把關 | §5 |
| AI 元件路徑 | `<notesDir>/.notecraft/components/*.tsx` | §6.1 |
| MDX import 語法 | `import X from '@notes/components/<id>'` | §6.2 |
| 元件不存在時 | build fail，不做 placeholder | §6.4 |
| rebuild 觸發延遲 | chokidar debounce 300ms | §7.2 |
| rebuild 原子性 | 產物寫 `dist.next/` → rename swap | §7.3 |
| 前端刷新機制 | SSE `/__notecraft/events`，僅 view 注入 | §7.5 |
| API 寫入 UX | 改 200 + rebuildQueued，取代 v1 的 202 + 重啟提示 | §7.6 |
| watcher 退路 | `serve --no-watch` flag | §10.2 |
| 背景 rebuild 掛哪個命令 | **`serve`**（預設 ON），不動 `view`（有 vite HMR） | §7 開頭 |
| SSE 客戶端 script | inline 注入 HTML 響應，不獨立成檔 | §7.5 |
| `serve` 寫入 API | v2 不加（view / serve 分工：view 編輯、serve 觀察） | §7.6 |
| 首次 build 失敗處理 | `serve` 上線 + fallback 頁（含 SSE、修好自動 reload）；`build` exit 1 保 CI 語意 | §7.4-B |
| `ensureBuild` 一律走 atomicRebuild | 副作用是有舊 dist 時的原子性也順手補上 | §7.4 |
| Build-time module resolution | `vite.resolve.dedupe` 強制白名單套件從 viewer app root 解析 | §6.3.1（Q3 POC 實證） |
| 白名單集中管理 | `src/lib/generated-component-whitelist.ts` 唯一 source of truth，astro config / Subagent lint / SKILL.md 三處都讀它 | §6.6 |

---

## 14. 決策紀錄摘要

給實作單頁備忘錄用：

```
新增 CLI：notecraftapp init-skill（copy .claude/ 到 cwd、--force / --check）
Skill：兩份維護、sync 腳本、prepublishOnly 把關；升級手動觸發
元件位置：<notesDir>/.notecraft/components/*.tsx
Import：@notes/components/<id>（Vite alias + server.fs.allow + resolve.dedupe 白名單）
白名單：src/lib/generated-component-whitelist.ts 唯一來源，astro config / Subagent / SKILL 全讀它
安全：路徑安全沿用 v1，白名單由 Subagent 把關；不做 runtime sandbox
背景 rebuild：掛在 serve 命令（預設 ON、--no-watch 退出）；chokidar 300ms debounce → dist.next → rename 原子切換
前端刷新：SSE /__notecraft/events，serve 命令 inline 注入客戶端 script（非獨立檔）
CLI 分工：view=astro dev + HMR（作者編輯）／serve=靜態 + 背景 rebuild（觀察 AI 產出）／build=純靜態產物（CI）
失敗處理：保留舊 dist、toast 提示、terminal 印錯誤
serve 寫入 API：v2 不加（分工：編輯用 view）
不做：pagefind、runtime sandbox、auto merge skill、cloud 觸發
```
