// /plugins 空狀態的情境 fixture（Task 124，規格 docs/notecraft-workbench-plugin-empty-states.md §11.1）。
//
// 情境 3–7 在主 repo 都不會出現：主 repo 有 plugins.json，也有官方 store plugins/（app 根目錄的 glob 會當成已安裝）。
// 所以這支以「npm 實際發佈的樣子」跑：npm pack → 解開到暫存 → node_modules symlink 回主 repo →
// NOTECRAFTAPP_DEV=1 直接從解開的套件執行（否則 CLI 會 re-exec 到 ~/.notecraft/app-<version>/ 那份舊的）。
//
// 用法：
//   node scripts/fixtures/plugin-empty-states.mjs            產生工作區，印出各情境的 view／serve 指令（手動檢查用；暫存目錄保留）
//   node scripts/fixtures/plugin-empty-states.mjs --build    逐一以 CLI build，斷言產物；結束刪除暫存（--keep 保留）
//
// 不放 scripts/checks/：那裡每支 .mjs 都會被 check-plugins 當成秒級檢查執行，這支要跑 6 次 build（約 1 分鐘）。

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doBuild = process.argv.includes("--build");
const keep = process.argv.includes("--keep") || !doBuild;

const ER = "er-diagram-renderer";
const ER_DIR = path.join(root, "plugins", ER);

/** 情境：reason、plugins.json（null = 不建）、是否安裝 ER */
const SCENARIOS = [
  { key: "fresh", config: null, install: false },
  { key: "noplugins", config: { plugins: [] }, install: false },
  { key: "nomap", config: { plugins: [] }, install: true },
  { key: "nohit", config: { plugins: [{ plugin: ER, files: ["none/*.er.json"] }] }, install: true },
  { key: "disabled", config: { disabled: [ER], plugins: [{ plugin: ER, files: ["**/*.er.json"] }] }, install: true },
  { key: "normal", config: { plugins: [{ plugin: ER, files: ["**/*.er.json"] }] }, install: true },
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notecraft-plempty-"));

// ── 1. 打包並解開成「發佈出去的 app」 ─────────────────────────
const npmCli = process.env.npm_execpath;
const pack = npmCli
  ? spawnSync(process.execPath, [npmCli, "pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8" })
  : spawnSync("npm", ["pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8", shell: process.platform === "win32" });
const tgz = JSON.parse(pack.stdout)[0].filename;
const appDir = path.join(tmp, "package");
spawnSync("tar", ["xzf", path.join(tmp, path.basename(tgz))], { cwd: tmp });
assert.ok(fs.existsSync(path.join(appDir, "bin", "notecraftapp.mjs")), "解開的套件沒有 bin/notecraftapp.mjs");
assert.ok(!fs.existsSync(path.join(appDir, "plugins")), "打包內容含 plugins/（Task 121 的修正失效）");
fs.symlinkSync(path.join(root, "node_modules"), path.join(appDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
const cli = path.join(appDir, "bin", "notecraftapp.mjs");

// ── 2. 工作區 ────────────────────────────────────────────────
function writeWorkspace(s) {
  const ws = path.join(tmp, `ws-${s.key}`);
  fs.mkdirSync(path.join(ws, "notes", "data"), { recursive: true });
  fs.writeFileSync(path.join(ws, "notes", "readme.md"), `---\ntitle: ${s.key}\n---\n\n# ${s.key}\n`, "utf-8");
  fs.copyFileSync(path.join(ER_DIR, "example", "schema.json"), path.join(ws, "notes", "data", "orders.er.json"));
  if (s.config) {
    fs.mkdirSync(path.join(ws, ".notecraft"), { recursive: true });
    fs.writeFileSync(path.join(ws, ".notecraft", "plugins.json"), JSON.stringify(s.config, null, 2) + "\n", "utf-8");
  }
  if (s.install) {
    const dest = path.join(ws, ".notecraft", "plugins", ER);
    fs.cpSync(ER_DIR, dest, { recursive: true });
    fs.writeFileSync(path.join(dest, ".installed.json"), JSON.stringify({ id: ER, origin: `local:${ER}`, commit: "local" }, null, 2) + "\n");
  }
  return ws;
}

const workspaces = SCENARIOS.map((s) => ({ ...s, ws: writeWorkspace(s) }));
const env = { ...process.env, NOTECRAFTAPP_DEV: "1" };

if (!doBuild) {
  console.log(`\n暫存目錄：${tmp}（不會自動刪除）\n`);
  for (const w of workspaces) {
    console.log(`[${w.key}]`);
    console.log(`  cd ${JSON.stringify(w.ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} view ./notes`);
    console.log(`  cd ${JSON.stringify(w.ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} serve ./notes`);
  }
  process.exit(0);
}

// ── 3. build 並斷言產物 ──────────────────────────────────────
let failed = 0;
const cacheDirs = [];
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
};

for (const w of workspaces) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [cli, "build", "--rebuild", "./notes"], { cwd: w.ws, env, encoding: "utf-8" });
  const log = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
  const m = log.match(/dist:\s*:\s*(\S+)/);
  try {
    assert.equal(r.status, 0, `build 失敗：\n${log.split("\n").slice(-15).join("\n")}`);
    assert.ok(m, "build log 找不到 dist 路徑");
    const dist = m[1];
    cacheDirs.push(path.dirname(dist));
    const page = fs.readFileSync(path.join(dist, "plugins", "index.html"), "utf-8");
    const files = walk(dist);
    const html = files.filter((f) => f.endsWith(".html"));
    const js = files.filter((f) => f.includes(`${path.sep}_astro${path.sep}`) && f.endsWith(".js")).map((f) => fs.readFileSync(f, "utf-8"));

    // 正式產物不出現 npx（安裝指令、說明框、plugins.json 範例都是 dev-only）
    for (const f of html) assert.ok(!fs.readFileSync(f, "utf-8").includes("npx"), `${path.relative(dist, f)} 含 npx`);
    // 官方 openapi-renderer 從未安裝，它的程式碼不該進 client chunk
    assert.ok(!js.some((s) => s.includes("--oar-")), "client chunk 含 openapi-renderer（--oar-）");
    if (!w.install) {
      assert.ok(!page.includes(ER) && !page.includes("openapi-renderer"), "/plugins 列出了未安裝的官方外掛");
      // 以 renderer 專屬的 class 判斷（OFFICIAL_PLUGINS 常數本來就含 id 字串，不能用 id 判斷）
      assert.ok(!js.some((s) => s.includes(".erd-root")), "client chunk 含 er-diagram-renderer（.erd-root）");
    }
    if (w.key === "normal") assert.ok(fs.existsSync(path.join(dist, "view", "data", "orders.er", "index.html")), "normal 沒有產生資料檔頁");
    // SSR 一律輸出「資料檔」頁籤（?tab=installed 在 effect 後才讀），所以產物只驗得到這個頁籤；
    // 比對空狀態才有的說明句（標題「這個站沒有使用資料檔」與 Toolbar 文字相同，比對它驗不出空狀態本身）
    else {
      assert.ok(page.includes("這裡的內容都是筆記"), "資料檔頁籤不是安靜版空狀態");
      assert.ok(!page.includes("查看官方外掛") && !page.includes("設定映射規則"), "正式環境出現 dev 版空狀態的按鈕");
    }
    console.log(`  ✓ ${w.key}（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${w.key}\n    ${err.message.split("\n").join("\n    ")}`);
  }
}

for (const d of cacheDirs) fs.rmSync(d, { recursive: true, force: true });
if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`\n暫存目錄保留：${tmp}`);

if (failed) {
  console.error(`\n✗ plugin-empty-states：${failed} 個情境失敗`);
  process.exit(1);
}
console.log("\n✓ plugin-empty-states 全部通過");
