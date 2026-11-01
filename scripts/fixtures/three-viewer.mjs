// three 3D 元件在 npx viewer 的整合驗證（Task 148，規格 docs/notecraft-generated-three.md §4.3、§6 V4）。
//
// 主 repo 能 build 不代表 viewer 能：viewer 的元件在 <ws>/.notecraft/components/、app 之外，
// `three` 與 `three/addons/...` 要靠 astro.config.mjs 的 vite.resolve.dedupe 從 app root 解析。
// 工作區本身沒有 node_modules，dedupe 沒涵蓋子路徑的話 build 會以 Could not resolve 失敗。
//
// 以「npm 實際發佈的樣子」跑：npm pack → 解開到暫存 → node_modules symlink 回主 repo →
// NOTECRAFTAPP_DEV=1 直接從解開的套件執行（否則 CLI 會 re-exec 到 ~/.notecraft/app-<version>/ 那份舊的）。
//
// 用法：
//   node scripts/fixtures/three-viewer.mjs                 產生工作區，印出 view／serve／build 指令（手動檢查用；暫存目錄保留）
//   node scripts/fixtures/three-viewer.mjs --out <dir>     同上，但工作區寫到 <dir>（例：tmp/three-ws，配 launch.json 用）
//   node scripts/fixtures/three-viewer.mjs --build         以 CLI build 並斷言產物；結束刪除暫存（--keep 保留）
//
// 不放 scripts/checks/：那裡每支 .mjs 都會被 check-plugins 當成秒級檢查執行。
//
// 兩個環境限制（皆來自 node_modules 以 junction 指回主 repo，與 three 無關）：
//   - 產物沒有 CSS，頁面看起來沒有樣式；只用來驗 three 的解析、打包與 hydrate
//   - Astro 的 content 快取在共用的 node_modules/.astro/，記著最後一次 build 的工作區。
//     換了工作區後直接 serve 會以 `content-layer-deferred-module … fileName=<舊路徑>` 失敗，先跑一次 `build --rebuild` 即可

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const doBuild = argv.includes("--build");
const outIdx = argv.indexOf("--out");
const outDir = outIdx >= 0 ? path.resolve(argv[outIdx + 1]) : null;
const keep = argv.includes("--keep") || !doBuild;

const ID = "demo-platform-layers";
const PASCAL = "DemoPlatformLayers";
const SRC = path.join(root, "src", "components", "generated", `${ID}.tsx`);
assert.ok(fs.existsSync(SRC), `找不到範例元件 ${path.relative(root, SRC)}（Task 147）`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notecraft-three-"));

// ── 1. 打包並解開成「發佈出去的 app」 ─────────────────────────
const npmCli = process.env.npm_execpath;
const pack = npmCli
  ? spawnSync(process.execPath, [npmCli, "pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8" })
  : spawnSync("npm", ["pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8", shell: process.platform === "win32" });
const tgz = JSON.parse(pack.stdout)[0].filename;
const appDir = path.join(tmp, "package");
// 只傳檔名（cwd 已是 tmp）：從 Git Bash 執行時 PATH 先找到 GNU tar，它會把 `C:\…` 的冒號當成遠端主機
spawnSync("tar", ["xzf", path.basename(tgz)], { cwd: tmp });
assert.ok(fs.existsSync(path.join(appDir, "bin", "notecraftapp.mjs")), "解開的套件沒有 bin/notecraftapp.mjs");
fs.symlinkSync(path.join(root, "node_modules"), path.join(appDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
const cli = path.join(appDir, "bin", "notecraftapp.mjs");

// ── 2. 工作區：一篇筆記 + .notecraft/components/<id>.tsx ─────
const ws = outDir ?? path.join(tmp, "ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(path.join(ws, "notes"), { recursive: true });
fs.mkdirSync(path.join(ws, ".notecraft", "components"), { recursive: true });
fs.copyFileSync(SRC, path.join(ws, ".notecraft", "components", `${ID}.tsx`));
fs.writeFileSync(
  path.join(ws, "notes", "three.mdx"),
  `---
title: 3D 場景
description: three 元件在 viewer 的驗證
tags: []
createdAt: '2026-11-01'
updatedAt: '2026-11-01'
---
import GeneratedFrame from '@/components/GeneratedFrame.astro'
import ${PASCAL} from '@notes/components/${ID}'

## 3D 場景

<GeneratedFrame id="${ID}" type="free" prompt={"viewer fixture"}>
  <${PASCAL} client:visible />
</GeneratedFrame>
`,
  "utf-8",
);
const env = { ...process.env, NOTECRAFTAPP_DEV: "1" };

if (!doBuild) {
  console.log(`\n暫存 app：${appDir}（不會自動刪除）`);
  console.log(`工作區：${ws}\n`);
  for (const cmd of ["view", "serve", "build"]) {
    console.log(`  cd ${JSON.stringify(ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} ${cmd} ./notes`);
  }
  process.exit(0);
}

// ── 3. build 並斷言產物 ──────────────────────────────────────
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
};

let dist = null;
try {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [cli, "build", "--rebuild", "./notes"], { cwd: ws, env, encoding: "utf-8" });
  const log = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
  assert.equal(r.status, 0, `build 失敗：\n${log.split("\n").slice(-20).join("\n")}`);
  assert.ok(!/Could not resolve/i.test(log), "build log 出現 Could not resolve");
  const m = log.match(/dist:\s*:\s*(\S+)/);
  assert.ok(m, "build log 找不到 dist 路徑");
  dist = m[1];

  const page = fs.readFileSync(path.join(dist, "notes", "three", "index.html"), "utf-8");
  assert.ok(page.includes('client="visible"'), "筆記頁沒有 client:visible 的 island");
  assert.ok(page.includes("data-nc-viz-body"), "筆記頁沒有 GeneratedFrame 的 data-nc-viz-body");
  // SSR 不輸出 canvas（renderer 只在 useEffect 建立），但要先佔好固定高度與 role="img"
  assert.ok(!page.includes("<canvas"), "SSR 輸出了 canvas（renderer 不在 useEffect 裡建立？）");
  assert.ok(page.includes('role="img"'), "SSR 沒有 role=\"img\" 容器");

  // 不斷言 CSS：node_modules 以 junction 指回主 repo 時，產物一個 _astro/*.css 都沒有（改動前的 commit 同樣如此，
  // 真實安裝的 ~/.notecraft/app-<v>/ 則正常），所以這裡看到的頁面沒有樣式是 fixture 的環境限制
  const js = walk(dist).filter((f) => f.includes(`${path.sep}_astro${path.sep}`) && f.endsWith(".js"));
  const threeChunk = js.find((f) => {
    const s = fs.readFileSync(f, "utf-8");
    return s.includes("WebGLRenderer") && s.includes("OrbitControls");
  });
  assert.ok(threeChunk, "client chunk 裡找不到 three 與 OrbitControls");
  const kb = (fs.statSync(threeChunk).size / 1024).toFixed(0);
  console.log(`  ✓ viewer build（${((Date.now() - t0) / 1000).toFixed(1)}s）；three chunk ${path.basename(threeChunk)} ${kb} KB`);
} catch (err) {
  console.error(`  ✗ ${err.message.split("\n").join("\n    ")}`);
  process.exitCode = 1;
}

if (dist) fs.rmSync(path.dirname(dist), { recursive: true, force: true });
if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`\n暫存目錄保留：${tmp}`);

if (process.exitCode) console.error("\n✗ three-viewer 失敗");
else console.log("\n✓ three-viewer 通過");
