#!/usr/bin/env node
// Three jobs:
//   1. Refresh the whitelist block (between BEGIN:whitelist / END:whitelist markers)
//      in the *main-project* SKILL.md and component-generator.md, so the single
//      source of truth (src/lib/generated-component-whitelist.ts) can't drift.
//   2. Copy .claude/skills/content-visualize/ and .claude/agents/*.md into
//      skill-template/ with viewer-flavor path substitutions applied. The
//      whitelist refresh in step 1 flows through to the template too.
//   3. Mirror .claude/skills/trendlink-design/ into skill-template/ verbatim,
//      excluding non-public Duty Mate side-project assets (see
//      TRENDLINK_EXCLUDES). content-visualize/SKILL.md instructs the
//      subagents to read trendlink-design for tokens; without this the
//      viewer flavor has no design system to consult.
//
// Path substitutions (longer/more-specific first):
//   @/components/generated/     -> @notes/components/
//   src/components/generated/   -> .notecraft/components/
//   src/content/notes/          -> <notesDir>/
//
// Runs on `npm run sync-skill`; wired into prepublishOnly so packaged tarball
// always ships an up-to-date viewer-flavor template.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(__filename), '..')

// Load the whitelist by parsing the .ts source with a regex instead of
// `import`ing it — the script stays pure ESM Node (no --experimental-strip-types
// flag, no TS toolchain assumption). The constant is a simple string array so
// regex parsing is not fragile; if the file's shape ever changes, the assert
// below yells loudly.
async function loadWhitelist() {
  const src = await fs.readFile(
    path.join(projectRoot, 'src/lib/generated-component-whitelist.ts'),
    'utf8',
  )
  const match = src.match(
    /GENERATED_COMPONENT_PACKAGE_WHITELIST\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
  )
  if (!match) {
    throw new Error(
      'sync-skill: could not locate GENERATED_COMPONENT_PACKAGE_WHITELIST in src/lib/generated-component-whitelist.ts',
    )
  }
  const entries = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  if (entries.length === 0) {
    throw new Error('sync-skill: whitelist parsed as empty; refusing to write')
  }
  return entries
}

const SUBSTITUTIONS = [
  ['@/components/generated/', '@notes/components/'],
  ['src/components/generated/', '.notecraft/components/'],
  ['src/content/notes/', '<notesDir>/'],
]

const WHITELIST_MARKER = /<!-- BEGIN:whitelist -->[\s\S]*?<!-- END:whitelist -->/g

function buildWhitelistBlock(entries) {
  return `<!-- BEGIN:whitelist -->${entries.map((p) => `\`${p}\``).join('、')}<!-- END:whitelist -->`
}

// v2 修正：viewer 版的驗證段——use cwd 沒有 astro 專案設定，
// 直接跑 `npx astro build` 一定炸；改為信任 `serve --watch` 的背景 rebuild。
const VALIDATION_SKILL_MARKER = /<!-- BEGIN:validation-skill -->[\s\S]*?<!-- END:validation-skill -->/g
const VALIDATION_SKILL_VIEWER = `<!-- BEGIN:validation-skill -->
完成元件寫入後，**不要在使用者 cwd 跑 \`npx tsc --noEmit\` 或 \`npx astro build\`**——viewer 場景下 cwd 只是 md/mdx 資料夾、沒有 astro 專案設定，這兩個指令一定會失敗，錯誤訊息也對本次生成沒幫助。

驗證的正確做法是**觀察使用者的 \`npx notecraftapp serve ./notes\`**：mdx-writer 寫回 mdx 後，viewer 的 chokidar watcher 會在 300ms 內觸發 rebuild、SSE 廣播 auto reload；成功則瀏覽器直接看到元件、失敗則 fallback 頁顯示錯誤節錄。

- 若作者離線測試（沒開 serve）：可跑 \`npx notecraftapp build ./notes\` 手動觸發一次 build 產物到 \`~/.notecraft/cache/<hash>/dist/\`
- 若 rebuild 失敗、每次修正後仍不通過：3 次後放棄，**跳到第 5 步、將該 MDX 標記的 \`status\` 設為 \`failed\`**（保留原始 prompt），並在對話中回報錯誤節錄。驗證未通過前，不要進行第 5 步的 MDX 寫回。
<!-- END:validation-skill -->`

const VALIDATION_CG_MARKER = /<!-- BEGIN:validation-cg -->[\s\S]*?<!-- END:validation-cg -->/g
const VALIDATION_CG_VIEWER = `<!-- BEGIN:validation-cg -->
4. **驗證**（觀察 serve --watch 就好）：**不要在使用者 cwd 跑 \`npx tsc --noEmit\` 或 \`npx astro build\`**——viewer 場景下 cwd 只是 md/mdx 資料夾、沒有 astro 專案設定，這兩個指令一定會失敗
   - 假設作者已開著 \`npx notecraftapp serve ./notes\`（見 CLAUDE.md 建議工作流）；mdx-writer 寫回 mdx 後，viewer 的 watcher 自動觸發 rebuild、成功會 SSE 廣播 auto reload
   - 若作者離線驗證（沒開 serve）：可跑 \`npx notecraftapp build ./notes\` 手動觸發一次 build
5. **修復**：若後續 serve 的 rebuild 失敗（terminal 印出錯誤 + fallback 頁），讀錯誤訊息、用 Edit 修正元件；watcher 會再 trigger 一次 rebuild，最多重試 3 次
<!-- END:validation-cg -->`

// 簡報管線 slide-generator 的驗證段——viewer 版同樣不能在 cwd 跑 tsc/astro build，
// 改為觀察 serve 的背景 rebuild（deck 檔寫到 .notecraft/components/<slug>.deck.tsx 會被 watcher 抓到）。
const VALIDATION_SG_MARKER = /<!-- BEGIN:validation-sg -->[\s\S]*?<!-- END:validation-sg -->/g
const VALIDATION_SG_VIEWER = `<!-- BEGIN:validation-sg -->
5. **驗證（你只做 rebuild 這一層）**：**不要在使用者 cwd 跑 \`npx tsc --noEmit\` 或 \`npx astro build\`**——viewer 場景下 cwd 只是 md/mdx 資料夾、沒有 astro 專案設定，這兩個指令一定會失敗。

   deck 檔寫到 \`.notecraft/components/<slug>.deck.tsx\` 後，假設作者開著 \`npx notecraftapp serve ./notes\`：watcher 會觸發 rebuild、成功則 SSE 廣播 auto reload；失敗則 fallback 頁顯示錯誤節錄。
   若作者離線驗證（沒開 serve）：可跑 \`npx notecraftapp build ./notes\` 手動觸發一次 build。

   **溢出偵測與逐頁截圖由主 Agent 執行，不是你。** 你的工具清單沒有瀏覽器 / preview 工具，做不到，也不要嘗試。你能做的是**在回報中標出需要重點看的頁**：區塊最密的頁、單頁 block 數最多的頁、嵌入既有元件的頁（那些元件是為網頁內文設計的，常常比 900px 高）。
6. **修復**：rebuild 失敗就讀錯誤、用 Edit 修正 deck 檔；watcher 會再 trigger。最多 3 次；仍失敗則用 Bash 刪除半成品 deck 檔並回報。
   主 Agent 若帶著截圖發現的問題（頁碼 + 症狀）回來，同樣照這個循環修。
<!-- END:validation-sg -->`

// Files whose main-project copy carries the whitelist marker — sync also
// rewrites these in-place so the source-of-truth constant flows to the docs
// the author reads in their own tree.
const WHITELIST_HOSTS = [
  '.claude/skills/content-visualize/SKILL.md',
  '.claude/agents/component-generator.md',
  // 簡報管線：v0.2 起 custom 頁是元件、也要 import 套件，白名單同一份來源
  '.claude/skills/content-present/SKILL.md',
  '.claude/agents/slide-generator.md',
]

const AGENT_NAMES = [
  'note-scanner',
  'visualize-planner',
  'component-generator',
  'mdx-writer',
  // 簡報管線（content-present）：與上述四個完全隔離
  'present-planner',
  'slide-generator',
]

const VERSION = '2.0.0-alpha.2'
const PRESENT_VERSION = '1.0.0-alpha.1'

const VIEWER_HEADER = `<!--
  This file was generated by scripts/sync-skill-template.mjs — do NOT edit here.
  Edit the source under .claude/ at the notecraft repo root and re-run:
      npm run sync-skill

  Path conventions in this file assume the "viewer" flavour:
    - Generated components live at <notesDir>/.notecraft/components/<id>.tsx
    - MDX imports go through the @notes alias:
        import Foo from '@notes/components/foo'
    - GeneratedFrame (@/components/GeneratedFrame.astro) is baked into the
      viewer app and does NOT live in the user's project.
-->

`

function applySubstitutions(text) {
  let result = text
  for (const [from, to] of SUBSTITUTIONS) {
    result = result.split(from).join(to)
  }
  return result
}

function countSubstitutions(text) {
  return SUBSTITUTIONS.reduce(
    (n, [from]) => n + (text.split(from).length - 1),
    0,
  )
}

function applyWhitelist(text, block) {
  const matches = text.match(WHITELIST_MARKER)
  if (!matches) return { text, count: 0 }
  return { text: text.replace(WHITELIST_MARKER, block), count: matches.length }
}

// viewer 版才做的替換：驗證步驟主專案版跑 npx astro build，viewer 版改成觀察 serve --watch
function applyViewerValidation(text) {
  let count = 0
  let result = text
  const skillMatches = result.match(VALIDATION_SKILL_MARKER)
  if (skillMatches) {
    result = result.replace(VALIDATION_SKILL_MARKER, VALIDATION_SKILL_VIEWER)
    count += skillMatches.length
  }
  const cgMatches = result.match(VALIDATION_CG_MARKER)
  if (cgMatches) {
    result = result.replace(VALIDATION_CG_MARKER, VALIDATION_CG_VIEWER)
    count += cgMatches.length
  }
  const sgMatches = result.match(VALIDATION_SG_MARKER)
  if (sgMatches) {
    result = result.replace(VALIDATION_SG_MARKER, VALIDATION_SG_VIEWER)
    count += sgMatches.length
  }
  return { text: result, count }
}

async function refreshWhitelistInPlace(relPath, block) {
  const abs = path.join(projectRoot, relPath)
  const original = await fs.readFile(abs, 'utf8')
  const { text, count } = applyWhitelist(original, block)
  if (count === 0) {
    throw new Error(
      `${relPath}: expected <!-- BEGIN:whitelist --> marker but found none`,
    )
  }
  if (text !== original) {
    await fs.writeFile(abs, text, 'utf8')
  }
  return { relPath, count, changed: text !== original }
}

async function syncFile(srcRel, destRel, block, { addHeader = false } = {}) {
  const srcAbs = path.join(projectRoot, srcRel)
  const destAbs = path.join(projectRoot, destRel)

  const original = await fs.readFile(srcAbs, 'utf8')
  const substCount = countSubstitutions(original)
  const pathed = applySubstitutions(original)
  const { text: withWhitelist, count: whitelistCount } = applyWhitelist(pathed, block)
  const { text: withValidation, count: validationCount } = applyViewerValidation(withWhitelist)
  const body = addHeader ? VIEWER_HEADER + withValidation : withValidation

  await fs.mkdir(path.dirname(destAbs), { recursive: true })
  await fs.writeFile(destAbs, body, 'utf8')

  return { destRel, substCount, whitelistCount, validationCount }
}

// trendlink-design：整棵樹複製到 skill-template/，只做排除、不做路徑替換
// （trendlink-design 內部不會引用 notecraft 專案路徑）。
//
// 排除清單：Duty Mate（未公開 side-project）+ 個人貼上素材。每個 entry
// 都對照相對於 trendlink-design 根目錄的 rel path，比對「完全相等」或
// 「以 <entry>/ 開頭」——同時涵蓋單一檔案（Duty Mate.html）與整棵子樹
// （uploads/、scraps/、ui_kits/dutymate/）。
const TRENDLINK_SOURCE_REL = '.claude/skills/trendlink-design'
const TRENDLINK_DEST_REL = 'skill-template/.claude/skills/trendlink-design'
const TRENDLINK_EXCLUDES = [
  'Duty Mate 值日生排班.html',
  'uploads',
  'scraps',
  'ui_kits/dutymate',
]

function isTrendlinkExcluded(rel) {
  return TRENDLINK_EXCLUDES.some(
    (ex) => rel === ex || rel.startsWith(ex + path.sep) || rel.startsWith(ex + '/'),
  )
}

async function syncTrendlinkDesign() {
  const srcRoot = path.join(projectRoot, TRENDLINK_SOURCE_REL)
  const destRoot = path.join(projectRoot, TRENDLINK_DEST_REL)

  // sync 是「以來源為權威、鏡射到目的」，先清空目的地避免舊檔殘留。
  // 這只影響套件內 skill-template/，不會碰到使用者專案。
  await fs.rm(destRoot, { recursive: true, force: true })
  await fs.mkdir(destRoot, { recursive: true })

  let copied = 0
  let bytes = 0
  const excludedHits = []

  async function walk(dir) {
    const ents = await fs.readdir(dir, { withFileTypes: true })
    for (const e of ents) {
      const abs = path.join(dir, e.name)
      const rel = path.relative(srcRoot, abs)
      if (isTrendlinkExcluded(rel)) {
        excludedHits.push(rel)
        continue
      }
      if (e.isDirectory()) {
        await walk(abs)
      } else if (e.isFile()) {
        const destAbs = path.join(destRoot, rel)
        await fs.mkdir(path.dirname(destAbs), { recursive: true })
        await fs.copyFile(abs, destAbs)
        const s = await fs.stat(abs)
        bytes += s.size
        copied += 1
      }
    }
  }

  await walk(srcRoot)
  return { copied, bytes, excludedHits }
}

async function main() {
  const whitelist = await loadWhitelist()
  const block = buildWhitelistBlock(whitelist)

  // Step 1: refresh whitelist block in the main-project source-of-truth files
  // so the constant flows to the docs the author reads locally.
  const refreshed = []
  for (const relPath of WHITELIST_HOSTS) {
    refreshed.push(await refreshWhitelistInPlace(relPath, block))
  }

  // Step 2: sync main-project .claude/ → skill-template/ with path substitutions
  // (whitelist markers are picked up too, since they were just refreshed).
  const results = []

  results.push(
    await syncFile(
      '.claude/skills/content-visualize/SKILL.md',
      'skill-template/.claude/skills/content-visualize/SKILL.md',
      block,
      { addHeader: true },
    ),
  )

  results.push(
    await syncFile(
      '.claude/skills/content-present/SKILL.md',
      'skill-template/.claude/skills/content-present/SKILL.md',
      block,
      { addHeader: true },
    ),
  )

  for (const name of AGENT_NAMES) {
    results.push(
      await syncFile(
        `.claude/agents/${name}.md`,
        `skill-template/.claude/agents/${name}.md`,
        block,
        { addHeader: true },
      ),
    )
  }

  // VERSION 放在 skill 目錄內、跟 SKILL.md 同層——init-skill 只做「複製 .claude/ 整棵樹」即可。
  const versionPath = 'skill-template/.claude/skills/content-visualize/VERSION'
  await fs.mkdir(path.dirname(path.join(projectRoot, versionPath)), { recursive: true })
  await fs.writeFile(path.join(projectRoot, versionPath), VERSION + '\n', 'utf8')

  const presentVersionPath = 'skill-template/.claude/skills/content-present/VERSION'
  await fs.mkdir(path.dirname(path.join(projectRoot, presentVersionPath)), { recursive: true })
  await fs.writeFile(path.join(projectRoot, presentVersionPath), PRESENT_VERSION + '\n', 'utf8')

  // Step 3：鏡射 trendlink-design 到 skill-template，套 TRENDLINK_EXCLUDES。
  const trendlink = await syncTrendlinkDesign()

  const w = 62
  console.log(`whitelist (${whitelist.length} packages): ${whitelist.join(', ')}\n`)
  console.log('refreshed whitelist in-place:')
  for (const r of refreshed) {
    const state = r.changed ? 'updated' : 'no change'
    console.log(`  ${r.relPath.padEnd(w)} (${r.count} marker(s), ${state})`)
  }
  console.log('\nsynced skill-template:')
  for (const r of results) {
    console.log(
      `  ${r.destRel.padEnd(w)} (${r.substCount} path subs, ${r.whitelistCount} whitelist, ${r.validationCount} validation)`,
    )
  }
  console.log(`  ${versionPath.padEnd(w)} (${VERSION})`)
  console.log(
    `  ${TRENDLINK_DEST_REL.padEnd(w)} (${trendlink.copied} files, ${(trendlink.bytes / 1024).toFixed(0)} KB)`,
  )
  if (trendlink.excludedHits.length > 0) {
    console.log(`\ntrendlink-design excluded (${trendlink.excludedHits.length} entries):`)
    for (const rel of trendlink.excludedHits) console.log(`  ${rel}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
