// 定義與引用的規模 fixture（Task 130，規格 docs/notecraft-workbench-define-ref.md §14.1、§15）。
//
// 範例筆記只有 3 篇（Q10），一個定義最多 2 篇引用；「≥10 篇引用」（popover 篩選框、清單內捲、NoteDrawer「開啟筆記看全部」）
// 與「同頁 include 同一個定義兩次」要靠這支產生的工作區驗。以「npm 實際發佈的樣子」跑（同 plugin-empty-states.mjs）：
// npm pack → 解開到暫存 → node_modules symlink 回主 repo → NOTECRAFTAPP_DEV=1 直接從解開的套件執行。
//
// 用法：
//   node scripts/fixtures/define-ref-scale.mjs            產生工作區，印出 view／serve 指令（手動檢查用；暫存目錄保留）
//   node scripts/fixtures/define-ref-scale.mjs --build    以 CLI build 並斷言產物；結束刪除暫存（--keep 保留）
//
// 不放 scripts/checks/：要跑一次完整 build（約 20 秒）。

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doBuild = process.argv.includes("--build");
const keep = process.argv.includes("--keep") || !doBuild;
const REFS = 12;
const ID = "hr.term-quota";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notecraft-defscale-"));

// ── 1. 打包並解開 ────────────────────────────────────────────
const npmCli = process.env.npm_execpath;
const pack = npmCli
  ? spawnSync(process.execPath, [npmCli, "pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8" })
  : spawnSync("npm", ["pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8", shell: process.platform === "win32" });
const tgz = JSON.parse(pack.stdout)[0].filename;
const appDir = path.join(tmp, "package");
spawnSync("tar", ["xzf", path.join(tmp, path.basename(tgz))], { cwd: tmp });
assert.ok(fs.existsSync(path.join(appDir, "src", "lib", "defs-state.mjs")), "打包內容沒有 src/lib/defs-state.mjs");
fs.symlinkSync(path.join(root, "node_modules"), path.join(appDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
const cli = path.join(appDir, "bin", "notecraftapp.mjs");

// ── 2. 工作區：1 篇來源＋12 篇引用（第 1 篇另外 include 同一個定義兩次） ──
const ws = path.join(tmp, "ws");
const notes = path.join(ws, "notes");
fs.mkdirSync(path.join(notes, "附錄"), { recursive: true });
const fm = (title) => `---\ntitle: "${title}"\ncreatedAt: "2026-10-07"\nupdatedAt: "2026-10-07"\n---\n\n`;
fs.writeFileSync(
  path.join(notes, "術語表.mdx"),
  fm("術語表") +
    `## 年度額度\n\n::::define{id="${ID}"}\n**年度額度**：員工每年可用的特休天數。\n\n### 計算方式\n\n依年資計算，上限 30 天。\n::::\n`,
);
for (let i = 1; i <= REFS; i++) {
  const n = String(i).padStart(2, "0");
  const twice = i === 1 ? `\n## 第一次嵌入\n\n::include{id="${ID}"}\n\n## 第二次嵌入\n\n::include{id="${ID}"}\n` : "";
  fs.writeFileSync(path.join(notes, "附錄", `規格附錄-${n}.mdx`), fm(`規格附錄 ${n}`) + `本附錄的特休依 :ref[年度額度]{id="${ID}"} 計算。\n${twice}`);
}
const env = { ...process.env, NOTECRAFTAPP_DEV: "1" };

if (!doBuild) {
  console.log(`\n暫存目錄：${tmp}（不會自動刪除）\n`);
  console.log(`  cd ${JSON.stringify(ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} view ./notes`);
  console.log(`  cd ${JSON.stringify(ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} serve ./notes`);
  console.log(`\n開 /notes/術語表，點「被 ${REFS} 篇引用」看篩選框與內捲；/notes 列表點「術語表」看「開啟筆記看全部 ${REFS} 篇」。`);
  process.exit(0);
}

// ── 3. build 並斷言 ──────────────────────────────────────────
let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message.split("\n").join("\n    ")}`);
  }
};
const t0 = Date.now();
const r = spawnSync(process.execPath, [cli, "build", "--rebuild", "./notes"], { cwd: ws, env, encoding: "utf-8" });
const log = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
const m = log.match(/dist:\s*:\s*(\S+)/);
let dist = "";
check(`build（${((Date.now() - t0) / 1000).toFixed(1)}s）`, () => {
  assert.equal(r.status, 0, `build 失敗：\n${log.split("\n").slice(-15).join("\n")}`);
  assert.ok(m, "build log 找不到 dist 路徑");
  dist = m[1];
});

if (dist) {
  const read = (rel) => fs.readFileSync(path.join(dist, rel), "utf-8");
  const index = JSON.parse(read("wb-index.json"));
  check(`/wb-index.json：${ID} 被 ${REFS} 篇引用；同時 ref 與 include 的那篇只算 1 篇`, () => {
    const d = index.defs.find((x) => x.id === ID);
    assert.ok(d);
    assert.equal(d.refs.length, REFS);
    assert.deepEqual(d.refs[0].kinds, ["inc", "ref"], "include 兩次＋ref 的附錄 01 合併成一筆、排最前");
    assert.ok(!JSON.stringify(index.defs).includes("年資"), "/wb-index.json 不該含定義內容");
  });
  const src = read(path.join("notes", "術語表", "index.html"));
  check("來源頁：被 12 篇引用、popover 的資料帶在 island props", () => {
    assert.match(src, new RegExp(`被 <b>${REFS}</b> 篇引用`));
    assert.match(src, /RefLayer/);
  });
  const twice = read(path.join("notes", "附錄", "規格附錄-01", "index.html"));
  check("同頁 include 兩次：標題 id 第二份加 -2，整頁沒有重複 id", () => {
    assert.match(twice, /id="inc-hr\.term-quota-計算方式"/);
    assert.match(twice, /id="inc-hr\.term-quota-計算方式-2"/);
    const ids = [...twice.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
    assert.deepEqual([...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))], []);
  });
  check("產物不含本機絕對路徑", () => {
    for (const needle of [tmp, root]) {
      assert.ok(!src.includes(needle) && !twice.includes(needle) && !read("wb-index.json").includes(needle), needle);
    }
  });
  fs.rmSync(path.dirname(dist), { recursive: true, force: true });
}

if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`\n暫存目錄保留：${tmp}`);

if (failed) {
  console.error(`\n✗ define-ref-scale：${failed} 項失敗`);
  process.exit(1);
}
console.log("\n✓ define-ref-scale 全部通過");
