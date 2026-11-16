// 檢查每個筆記資料夾一份的執行目錄與鎖檔（Task 157，規格 docs/notecraft-multi-instance.md §5.3、§6、§10.2）。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:run-root

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCK_FILE,
  RUN_ROOT_LAYOUT,
  RUN_STAMP_FILE,
  acquireLock,
  ensureRunRoot,
  formatLockMessage,
  isPidAlive,
  lockState,
  needsResync,
  runRootDirFor,
  runRootEntries,
} from "../../bin/run-root.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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

const withTmp = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-run-root-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/** 一個一定不存在的 pid：拿一個剛結束的子行程。 */
const deadPid = () => spawnSync(process.execPath, ["-e", ""]).pid;

console.log("run-root（多個工作區同時執行）");

check("runRootEntries：真實 package.json 收齊執行期需要的項目", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf-8"));
  const entries = runRootEntries(pkg.files);
  for (const need of ["package.json", "src", "public", "schemas", "astro.config.mjs", "tailwind.config.mjs", "tsconfig.json"]) {
    assert.ok(entries.includes(need), `缺 ${need}：${entries.join(", ")}`);
  }
  for (const not of ["bin", "README.md", "CHANGELOG.md", "LICENSE", "skill-template"]) {
    assert.ok(!entries.includes(not), `不該有 ${not}`);
  }
  assert.equal(new Set(entries).size, entries.length, "有重複");
});

check("runRootEntries：glob 收斂到第一段、去重、略過怪值", () => {
  assert.deepEqual(runRootEntries(["src/components/*.astro", "src/lib/", "./public/favicon.svg", "*.md", "", "bin/"]), [
    "package.json",
    "src",
    "public",
  ]);
});

check("runRootDirFor", () => {
  assert.equal(runRootDirFor(path.join("x", "cache", "abc")), path.join("x", "cache", "abc", "app"));
});

const cur = { layout: RUN_ROOT_LAYOUT, appVersion: "1.16.0", appRoot: "/a", devPackage: false, linkOk: true };
const same = { layout: RUN_ROOT_LAYOUT, appVersion: "1.16.0", appRoot: "/a" };

check("needsResync：各種要重建的情況都有原因", () => {
  const cases = [
    [null, cur],
    ["壞掉", cur],
    [{ ...same, layout: RUN_ROOT_LAYOUT - 1 }, cur],
    [{ ...same, appVersion: "1.15.0" }, cur],
    [{ ...same, appRoot: "/b" }, cur],
    [same, { ...cur, linkOk: false }],
    [same, { ...cur, devPackage: true }],
  ];
  for (const [stamp, c] of cases) {
    const r = needsResync(stamp, c);
    assert.equal(r.resync, true, JSON.stringify(stamp));
    assert.ok(r.why.length > 0);
  }
});

check("needsResync：全部相同就沿用", () => {
  assert.deepEqual(needsResync(same, cur), { resync: false, why: "" });
});

check("lockState", () => {
  assert.equal(lockState(null, () => true), "free");
  assert.equal(lockState({ pid: 123, command: "view" }, () => true), "held");
  assert.equal(lockState({ pid: 123, command: "view" }, () => false), "stale");
  assert.equal(lockState({ command: "view" }, () => true), "stale");
  assert.equal(lockState("壞掉", () => true), "stale");
});

check("formatLockMessage：有網址、沒有網址", () => {
  const a = formatLockMessage({ pid: 42, command: "view", url: "http://127.0.0.1:4401/" });
  assert.ok(a.includes("http://127.0.0.1:4401/") && a.includes("view") && a.includes("42"), a);
  const b = formatLockMessage({ pid: 7, command: "build" });
  assert.ok(b.includes("build") && b.includes("7") && !b.includes("undefined"), b);
});

check("isPidAlive", () => {
  assert.equal(isPidAlive(process.pid), true);
  assert.equal(isPidAlive(deadPid()), false);
});

check("ensureRunRoot：建立、沿用、換版重建、連結壞掉重建", () =>
  withTmp((tmp) => {
    const app = path.join(tmp, "app-x");
    fs.mkdirSync(path.join(app, "src", "lib"), { recursive: true });
    fs.mkdirSync(path.join(app, "node_modules", "astro"), { recursive: true });
    fs.mkdirSync(path.join(app, "bin"), { recursive: true });
    fs.writeFileSync(path.join(app, "package.json"), JSON.stringify({ version: "1.0.0", files: ["bin/", "src/lib/", "astro.config.mjs"] }));
    fs.writeFileSync(path.join(app, "src", "lib", "a.ts"), "export const a = 1;\n");
    fs.writeFileSync(path.join(app, "astro.config.mjs"), "export default {};\n");
    fs.writeFileSync(path.join(app, "bin", "cli.mjs"), "");
    const cacheDir = path.join(tmp, "cache", "h");
    const logs = [];
    const opts = { appRoot: app, cacheDir, appVersion: "1.0.0", log: (m) => logs.push(m) };

    const root = ensureRunRoot(opts);
    assert.equal(root, runRootDirFor(cacheDir));
    assert.ok(fs.existsSync(path.join(root, "src", "lib", "a.ts")));
    assert.ok(fs.existsSync(path.join(root, "astro.config.mjs")));
    assert.ok(fs.existsSync(path.join(root, "package.json")));
    assert.ok(!fs.existsSync(path.join(root, "bin")), "bin 不該複製");
    assert.ok(fs.lstatSync(path.join(root, "node_modules")).isSymbolicLink(), "node_modules 應是連結");
    assert.ok(fs.existsSync(path.join(root, "node_modules", "astro")));
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, RUN_STAMP_FILE), "utf-8")).appVersion, "1.0.0");
    assert.equal(logs.length, 1);

    // 沿用：在執行目錄裡留個記號，沒重建就還在
    fs.mkdirSync(path.join(root, ".astro"));
    ensureRunRoot(opts);
    assert.equal(logs.length, 1, "不該重建");
    assert.ok(fs.existsSync(path.join(root, ".astro")));

    // 換版：重建、記號消失、app 的 node_modules 不受影響
    ensureRunRoot({ ...opts, appVersion: "1.1.0" });
    assert.equal(logs.length, 2);
    assert.ok(!fs.existsSync(path.join(root, ".astro")));
    assert.ok(fs.existsSync(path.join(app, "node_modules", "astro")), "刪執行目錄不可波及 node_modules 本體");

    // 連結目標消失：重建（換一個 appRoot 模擬舊版本目錄被刪）
    const app2 = path.join(tmp, "app-y");
    fs.cpSync(app, app2, { recursive: true });
    ensureRunRoot({ ...opts, appRoot: app2, appVersion: "1.1.0" });
    fs.rmSync(app2, { recursive: true, force: true });
    fs.cpSync(app, app2, { recursive: true });
    fs.rmSync(path.join(app2, "node_modules"), { recursive: true, force: true });
    ensureRunRoot({ ...opts, appRoot: app2, appVersion: "1.1.0" });
    assert.equal(logs.at(-1).includes("node_modules"), true, logs.at(-1));
  }),
);

check("acquireLock：第二次拿不到、release 後拿得到、過期鎖直接覆寫", () =>
  withTmp((cacheDir) => {
    const a = acquireLock(cacheDir, { command: "view", url: "http://127.0.0.1:4401/" });
    assert.equal(a.ok, true);
    const b = acquireLock(cacheDir, { command: "serve", url: "http://127.0.0.1:4402/" });
    assert.equal(b.ok, false);
    assert.equal(b.lock.url, "http://127.0.0.1:4401/");
    a.release();
    a.release(); // 可重複呼叫
    assert.ok(!fs.existsSync(path.join(cacheDir, LOCK_FILE)));
    const c = acquireLock(cacheDir, { command: "build" });
    assert.equal(c.ok, true);
    c.release();

    fs.writeFileSync(path.join(cacheDir, LOCK_FILE), JSON.stringify({ pid: deadPid(), command: "view" }));
    const d = acquireLock(cacheDir, { command: "view" });
    assert.equal(d.ok, true, "過期鎖應被覆寫");
    d.release();

    fs.writeFileSync(path.join(cacheDir, LOCK_FILE), "{壞掉");
    const e = acquireLock(cacheDir, { command: "view" });
    assert.equal(e.ok, true, "壞掉的鎖視為過期");
    e.release();
  }),
);

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
