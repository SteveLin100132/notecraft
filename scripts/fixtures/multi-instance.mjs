// 多個筆記資料夾同時執行的整合驗證（Task 159，規格 docs/notecraft-multi-instance.md §1、§10.3）。
//
// 1.15.0 以前，兩個筆記資料夾同時 view／serve 會共用 app 根的 .astro/data-store.json，互相覆寫內容、污染 build 快取。
// 這支把設計文件 §1 的手動重現自動化。以「npm 實際發佈的樣子」跑：npm pack → 解開到暫存 → node_modules 連回本 repo →
// NOTECRAFTAPP_DEV=1 直接從解開的套件執行（否則 CLI 會 re-exec 到 ~/.notecraft/app-<version>/ 那份舊的）。
// HOME 指到暫存資料夾，~/.notecraft/cache/ 不碰作者真正的快取。
//
// 用法：
//   node scripts/fixtures/multi-instance.mjs            view 的情境（兩個同時、重複啟動、過期鎖、view 中 build）
//   node scripts/fixtures/multi-instance.mjs --build    另加 serve 的情境（兩個同時 build、快取不被污染）
//   --keep                                              保留暫存資料夾
//
// 不放 scripts/checks/：那裡每支 .mjs 都會被 check-plugins 當成秒級檢查執行，這支要幾分鐘。

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doBuild = process.argv.includes("--build");
const keep = process.argv.includes("--keep");
const isWin = process.platform === "win32";

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "notecraft-multi-")));
const home = path.join(tmp, "home");
fs.mkdirSync(home);

// ── 1. 打包並解開成「發佈出去的 app」 ─────────────────────────
const npmCli = process.env.npm_execpath;
const pack = npmCli
  ? spawnSync(process.execPath, [npmCli, "pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: repo, encoding: "utf-8" })
  : spawnSync("npm", ["pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: repo, encoding: "utf-8", shell: isWin });
const tgz = JSON.parse(pack.stdout)[0].filename;
const appDir = path.join(tmp, "package");
spawnSync("tar", ["xzf", path.join(tmp, path.basename(tgz))], { cwd: tmp });
assert.ok(fs.existsSync(path.join(appDir, "bin", "run-root.mjs")), "打包內容沒有 bin/run-root.mjs");
fs.symlinkSync(path.join(repo, "node_modules"), path.join(appDir, "node_modules"), isWin ? "junction" : "dir");
const cli = path.join(appDir, "bin", "notecraftapp.mjs");

// ── 2. 兩個工作區：內容、ignore.json、plugins.json 都不同 ─────────
function note(title, body) {
  return `---\ntitle: "${title}"\ntags: ["multi"]\n---\n\n# ${title}\n\n${body}\n`;
}
function writeWorkspace(key, ignore, plugins) {
  const ws = path.join(tmp, `ws${key}`);
  fs.mkdirSync(path.join(ws, ".notecraft"), { recursive: true });
  fs.mkdirSync(path.join(ws, `sub${key}`), { recursive: true });
  for (const i of [1, 2, 3]) {
    fs.writeFileSync(path.join(ws, `note-${key.toLowerCase()}${i}.mdx`), note(`WS${key} 筆記 ${i}`, `識別字 MARKER-${key}-${i}。`));
  }
  fs.writeFileSync(path.join(ws, `sub${key}`, `secret-${key.toLowerCase()}.mdx`), note(`WS${key} 子資料夾`, `識別字 EXCLUDED-${key}。`));
  fs.writeFileSync(path.join(ws, ".notecraft", "ignore.json"), JSON.stringify({ ignore }) + "\n");
  fs.writeFileSync(path.join(ws, ".notecraft", "plugins.json"), JSON.stringify(plugins) + "\n");
  return ws;
}
// A 排除子資料夾；B 排除第 3 篇
const wsA = writeWorkspace("A", ["subA/"], { plugins: [] });
const wsB = writeWorkspace("B", ["note-b3.mdx"], { plugins: [], disabled: ["er-diagram-renderer"] });
/** 各工作區應出現與不應出現的標記 */
const EXPECT = {
  A: { has: ["MARKER-A-1", "MARKER-A-2", "MARKER-A-3"], not: ["EXCLUDED-A", "MARKER-B-", "EXCLUDED-B"] },
  B: { has: ["MARKER-B-1", "MARKER-B-2", "EXCLUDED-B"], not: ["MARKER-B-3", "MARKER-A-", "EXCLUDED-A"] },
};

// ── 3. 子行程管理 ───────────────────────────────────────────
const env = { ...process.env, NOTECRAFTAPP_DEV: "1", HOME: home, USERPROFILE: home, BROWSER: "none" };
/** @type {Set<import("node:child_process").ChildProcess>} */
const children = new Set();

function startCli(ws, args) {
  // POSIX 以 process group 起，kill 時連 astro 子行程一起收
  const child = spawn(process.execPath, [cli, ...args], { cwd: ws, env, detached: !isWin, stdio: ["ignore", "pipe", "pipe"] });
  child.out = "";
  child.stdout.on("data", (d) => (child.out += d));
  child.stderr.on("data", (d) => (child.out += d));
  child.exited = new Promise((r) => child.on("exit", (code) => r(code)));
  children.add(child);
  child.exited.then(() => children.delete(child));
  return child;
}

function killTree(child, signal = "SIGINT") {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (isWin) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    else process.kill(-child.pid, signal);
  } catch {}
}

async function stop(child, signal = "SIGINT") {
  killTree(child, signal);
  const t = setTimeout(() => killTree(child, "SIGKILL"), 10_000);
  await child.exited;
  clearTimeout(t);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function get(url) {
  try {
    const r = await fetch(url);
    return { status: r.status, text: await r.text() };
  } catch {
    return { status: 0, text: "" };
  }
}

/** 輪詢直到 pred 成立；child 提前結束就失敗 */
async function waitFor(what, fn, { child, timeout = 120_000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (child && child.exitCode !== null) throw new Error(`${what}：行程提前結束（exit ${child.exitCode}）\n${tail(child.out)}`);
    if (Date.now() - t0 > timeout) throw new Error(`${what}：逾時\n${child ? tail(child.out) : ""}`);
    await sleep(500);
  }
}

const tail = (s, n = 15) => s.replace(/\x1b\[[0-9;]*m/g, "").trim().split("\n").slice(-n).join("\n");

/** 該工作區所有筆記頁（含應被排除的）合起來的 HTML */
async function allPages(base) {
  const slugs = ["note-a1", "note-a2", "note-a3", "suba/secret-a", "note-b1", "note-b2", "note-b3", "subb/secret-b"];
  let html = "";
  for (const s of slugs) {
    const r = await get(`${base}notes/${s}`);
    if (r.status === 200) html += r.text;
  }
  return html;
}

function assertMarkers(key, html, where) {
  for (const m of EXPECT[key].has) assert.ok(html.includes(m), `${where}：缺 ${m}`);
  for (const m of EXPECT[key].not) assert.ok(!html.includes(m), `${where}：不應出現 ${m}`);
}

function cacheDirOf(ws) {
  const cacheRoot = path.join(home, ".notecraft", "cache");
  for (const h of fs.existsSync(cacheRoot) ? fs.readdirSync(cacheRoot) : []) {
    // meta.json（build 後才有）記著 notesDir
    const meta = path.join(cacheRoot, h, "meta.json");
    if (fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, "utf-8")).notesDir === ws) return path.join(cacheRoot, h);
  }
  return null;
}

function readTree(dir) {
  let s = "";
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) s += readTree(p);
    else if (/\.(html|json)$/.test(e.name)) s += fs.readFileSync(p, "utf-8");
  }
  return s;
}

let failed = 0;
async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${String(err.message).split("\n").join("\n    ")}`);
  }
}

async function cleanup() {
  await Promise.all([...children].map((c) => stop(c, "SIGKILL")));
  if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
  else console.log(`\n暫存目錄：${tmp}`);
}
process.on("SIGINT", async () => {
  await cleanup();
  process.exit(130);
});

// ── 4. view 的情境 ──────────────────────────────────────────
console.log("多個筆記資料夾同時執行（view）");
const [pA, pB, pA2] = [await freePort(), await freePort(), await freePort()];
const baseA = `http://127.0.0.1:${pA}/`;
const baseB = `http://127.0.0.1:${pB}/`;
const ready = (base) => async () => (await get(`${base}notes`)).status === 200;

let viewA = startCli(wsA, ["view", "--port", String(pA)]);
let viewB = null;

await step("兩個 view 同時啟動，各自只有自己的筆記", async () => {
  await waitFor("A 的 view 啟動", ready(baseA), { child: viewA });
  viewB = startCli(wsB, ["view", "--port", String(pB)]);
  await waitFor("B 的 view 啟動", ready(baseB), { child: viewB });
  await sleep(2000); // 讓 B 的 content sync 有機會波及 A（1.15.0 的症狀）
  assertMarkers("A", await allPages(baseA), "A");
  assertMarkers("B", await allPages(baseB), "B");
});

await step("各改一篇筆記後仍各自正確", async () => {
  fs.appendFileSync(path.join(wsA, "note-a1.mdx"), "\nEDIT-A\n");
  fs.appendFileSync(path.join(wsB, "note-b2.mdx"), "\nEDIT-B\n");
  await waitFor("A 反映修改", async () => (await get(`${baseA}notes/note-a1`)).text.includes("EDIT-A"));
  await waitFor("B 反映修改", async () => (await get(`${baseB}notes/note-b2`)).text.includes("EDIT-B"));
  await sleep(2000);
  assertMarkers("A", await allPages(baseA), "A（修改後）");
  assertMarkers("B", await allPages(baseB), "B（修改後）");
  assert.equal((await get(`${baseB}notes/note-a1`)).status, 404, "B 不應有 A 的筆記頁");
  assert.equal((await get(`${baseA}notes/note-b1`)).status, 404, "A 不應有 B 的筆記頁");
});

await step("同一個筆記資料夾開第二個 view：拒絕並顯示第一個的網址", async () => {
  const dup = startCli(wsA, ["view", "--port", String(pA2)]);
  const code = await Promise.race([dup.exited, sleep(30_000).then(() => "timeout")]);
  if (code === "timeout") await stop(dup, "SIGKILL");
  assert.notEqual(code, "timeout", "第二個 view 沒有被擋下");
  assert.notEqual(code, 0);
  assert.ok(dup.out.includes(baseA), `訊息沒有第一個的網址：\n${tail(dup.out)}`);
});

await step("view 執行中 build 同一個筆記資料夾：直接報錯", async () => {
  const b = startCli(wsA, ["build"]);
  const code = await b.exited;
  assert.notEqual(code, 0);
  assert.ok(b.out.includes(baseA), tail(b.out));
});

if (!isWin) {
  await step("強制結束（SIGKILL）後再開：過期鎖不擋", async () => {
    await stop(viewA, "SIGKILL");
    viewA = startCli(wsA, ["view", "--port", String(pA)]);
    await waitFor("A 重新啟動", ready(baseA), { child: viewA });
    assertMarkers("A", await allPages(baseA), "A（重開後）");
  });
}

await step("正常結束後鎖檔刪除", async () => {
  await stop(viewA);
  await stop(viewB);
  const locks = fs
    .readdirSync(path.join(home, ".notecraft", "cache"))
    .filter((h) => fs.existsSync(path.join(home, ".notecraft", "cache", h, "run.lock.json")));
  assert.deepEqual(locks, [], "殘留鎖檔");
});

// ── 5. serve 的情境（--build） ───────────────────────────────
if (doBuild) {
  console.log("多個筆記資料夾同時執行（serve）");
  const [sA, sB] = [await freePort(), await freePort()];
  const sBaseA = `http://127.0.0.1:${sA}/`;
  const sBaseB = `http://127.0.0.1:${sB}/`;
  const served = (base) => async () => (await get(`${base}notes/`)).text.includes("MARKER-") || (await get(`${base}notes/`)).text.includes("筆記");

  await step("兩個 serve --rebuild 同時 build，產物各自正確", async () => {
    const a = startCli(wsA, ["serve", "--port", String(sA), "--no-open", "--rebuild"]);
    const b = startCli(wsB, ["serve", "--port", String(sB), "--no-open", "--rebuild"]);
    await waitFor("A 的 serve", served(sBaseA), { child: a, timeout: 300_000 });
    await waitFor("B 的 serve", served(sBaseB), { child: b, timeout: 300_000 });
    // build 完才上線的是 dist；等兩邊都不是 fallback 頁
    await waitFor("A 的 dist", async () => (await get(`${sBaseA}notes/note-a1/`)).status === 200, { child: a, timeout: 300_000 });
    await waitFor("B 的 dist", async () => (await get(`${sBaseB}notes/note-b1/`)).status === 200, { child: b, timeout: 300_000 });
    await stop(a);
    await stop(b);
    for (const [key, ws] of [["A", wsA], ["B", wsB]]) {
      const cacheDir = cacheDirOf(ws);
      assert.ok(cacheDir, `找不到 ${key} 的快取`);
      assertMarkers(key, readTree(path.join(cacheDir, "dist")), `${key} 的 dist`);
      assert.ok(!fs.existsSync(path.join(cacheDir, "run.lock.json")), `${key} 殘留鎖檔`);
    }
  });

  await step("單獨重啟（不加 --rebuild）沿用快取且內容正確", async () => {
    const a = startCli(wsA, ["serve", "--port", String(sA), "--no-open"]);
    await waitFor("A 的 serve", async () => (await get(`${sBaseA}notes/note-a1/`)).status === 200, { child: a });
    assert.ok(a.out.includes("快取有效"), `沒有沿用快取：\n${tail(a.out)}`);
    let html = "";
    for (const s of ["note-a1/", "note-a2/", "note-a3/", "note-b1/", "suba/secret-a/"]) {
      const r = await get(`${sBaseA}notes/${s}`);
      if (r.status === 200) html += r.text;
    }
    assertMarkers("A", html, "A（重啟）");
    await stop(a);
  });
}

await cleanup();
if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("\n全部通過");
