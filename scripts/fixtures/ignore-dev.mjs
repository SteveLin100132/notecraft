// .notecraft/ignore.json 的 dev／CLI 驗證（Task 119，規格 docs/notecraft-ignore-config.md §5.3、§5.4、§9.3）。
//
//   A. astro dev（等同 notecraftapp view）：dev-only API 看不到被排除的檔、notes-assets 404、
//      被排除的筆記存檔不會冒出來、改 ignore.json 會重啟並生效、刪掉 ignore.json 後回來
//   B. notecraftapp build：被排除的檔改了不 rebuild、ignore.json 改了才 rebuild
//   C. notecraftapp serve：被排除的檔改了不觸發背景 rebuild、ignore.json 改了才觸發
//
// 會實際起 dev server 與跑 build（合計約 4–6 分鐘），所以不放 scripts/checks/。
// 執行：node scripts/fixtures/ignore-dev.mjs

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { IGNORE, makeChecker, root, writeTree } from "./ignore-sample-tree.mjs";

const notesDir = path.join(root, "tmp", "ignore-dev");
const PORT = 4399;
const base = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { check, state } = makeChecker();

/** 起一個子行程，收集 stdout／stderr。 */
function start(args, cwd) {
  const proc = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, NOTECRAFT_NOTES_DIR: notesDir, NOTECRAFT_USER_CWD: notesDir, BROWSER: "none" },
  });
  const out = { text: "" };
  proc.stdout.on("data", (d) => (out.text += d));
  proc.stderr.on("data", (d) => (out.text += d));
  return { proc, out };
}

async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < ms) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      last = e;
    }
    await sleep(500);
  }
  throw new Error(`等不到：${what}${last ? `（${last.message}）` : ""}`);
}

const getJson = async (p) => (await fetch(base + p)).json();
const notePaths = async () => (await getJson("/wb-index.json")).notes.map((n) => n.path).sort();
const file = (rel) => path.join(notesDir, ...rel.split("/"));

// ── A. astro dev ─────────────────────────────────────────────────

console.log("A. astro dev");
writeTree(notesDir);
const dev = start([path.join(root, "node_modules", "astro", "astro.js"), "dev", "--port", String(PORT), "--host", "127.0.0.1"], root);
try {
  await waitFor(async () => (await fetch(base + "/wb-index.json")).ok, 180_000, "dev server 就緒");

  await check("筆記清單只有沒被排除的", async () => {
    // .astro/ 與同一個 repo 裡其他 astro 行程（例如作者自己開著的 npm run dev）共用：
    // 剛起來時可能讀到別的專案寫進 data-store.json 的筆記。遇到就觸碰 ignore.json 讓 dev server 重啟、重新同步
    const foreign = async () => (await notePaths()).some((p) => !/^(a|archive\/keep)\.mdx$/.test(p));
    try {
      await waitFor(async () => !(await foreign()), 20_000, "Content Layer 同步完成");
    } catch {
      console.log("    （偵測到其他行程留下的 content 快取，觸碰 ignore.json 強制重新同步）");
      const restarts = (dev.out.text.match(/重新啟動 dev server/g) || []).length;
      fs.writeFileSync(file(".notecraft/ignore.json"), JSON.stringify(IGNORE, null, 2) + "\n");
      await waitFor(() => (dev.out.text.match(/重新啟動 dev server/g) || []).length > restarts, 30_000, "重啟");
      await waitFor(async () => !(await foreign()), 90_000, "重新同步");
    }
    assert.deepEqual(await notePaths(), ["a.mdx", "archive/keep.mdx"]);
  });

  await check("GET /api/folders 不列被排除的資料夾", async () => {
    const { folders } = await getJson("/api/folders");
    const bad = folders.filter((f) => /\/(drafts|private|node_modules|dist|archive\/old)\//.test(f) || /\/\./.test(f.slice(1)));
    assert.deepEqual(bad, []);
    assert.ok(folders.some((f) => f.endsWith("archive/")), "archive/ 應列出（只排除其中的檔）");
  });

  await check("GET /api/tags 不計被排除的筆記", async () => {
    const { tags } = await getJson("/api/tags");
    assert.equal(tags.find((t) => t.name === "t1")?.count, 1);
  });

  await check("PUT /api/tags/t1 只改沒被排除的檔", async () => {
    const before = fs.readFileSync(file("drafts/b.mdx"), "utf-8");
    const r = await fetch(`${base}/api/tags/t1`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newName: "t2" }),
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).affected, 1);
    assert.equal(fs.readFileSync(file("drafts/b.mdx"), "utf-8"), before, "drafts/b.mdx 被改了");
    assert.match(fs.readFileSync(file("a.mdx"), "utf-8"), /t2/);
  });

  await check("POST /api/notes 到被排除的位置 → 400", async () => {
    const r = await fetch(`${base}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "new note", folder: "drafts" }),
    });
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /ignore\.json 排除/);
    assert.ok(!fs.existsSync(file("drafts/new-note.mdx")), "檔案被建立了");
  });

  await check("DELETE /api/notes/drafts/b → 404，檔案還在", async () => {
    const r = await fetch(`${base}/api/notes/drafts/b`, { method: "DELETE" });
    assert.equal(r.status, 404);
    assert.ok(fs.existsSync(file("drafts/b.mdx")));
  });

  await check("notes-assets：被排除的 404、沒被排除的 200、逃逸仍 400", async () => {
    const a = await fetch(`${base}/notes-assets/private/x.png`);
    assert.equal(a.status, 404);
    assert.equal(await a.text(), "ignored");
    assert.equal((await fetch(`${base}/notes-assets/img/ok.png`)).status, 200);
    assert.equal((await fetch(`${base}/notes-assets/..%2F..%2Fpackage.json`)).status, 400);
  });

  await check("被排除的筆記存檔後不會冒出來", async () => {
    fs.appendFileSync(file("drafts/b.mdx"), "\n再存一次\n");
    fs.writeFileSync(file("drafts/new.md"), "---\ntitle: N\n---\n\nnew\n");
    await sleep(3000);
    assert.deepEqual(await notePaths(), ["a.mdx", "archive/keep.mdx"]);
  });

  await check("改 ignore.json → 重啟並生效", async () => {
    const next = { ...IGNORE, ignore: IGNORE.ignore.filter((r) => r !== "archive/*" && r !== "!archive/keep.mdx").concat("archive/") };
    const restarts = (dev.out.text.match(/重新啟動 dev server/g) || []).length;
    fs.writeFileSync(file(".notecraft/ignore.json"), JSON.stringify(next, null, 2));
    await waitFor(() => (dev.out.text.match(/重新啟動 dev server/g) || []).length > restarts, 30_000, "重啟訊息");
    await waitFor(async () => JSON.stringify(await notePaths()) === JSON.stringify(["a.mdx"]), 90_000, "archive/keep 消失");
  });

  await check("刪掉 ignore.json → 被排除的回來（內建排除仍在）", async () => {
    // 取消排除後：broken.md 會被 parse、fixtures/x.json 會交給 ER plugin 驗 schema（兩者都會讓頁面失敗），先拿掉
    fs.rmSync(file("drafts/broken.md"));
    fs.rmSync(file("fixtures/x.json"));
    fs.rmSync(file(".notecraft/ignore.json"));
    await waitFor(async () => (await notePaths()).includes("drafts/b.mdx"), 90_000, "drafts/b 回來");
    const paths = await notePaths();
    assert.ok(paths.includes("archive/old.md") && paths.includes("c.private.md"));
    assert.ok(!paths.some((p) => p.startsWith("node_modules/") || p.startsWith("dist/")), "內建排除失效");
  });
} finally {
  dev.proc.kill();
}

// ── B. notecraftapp build 的快取 ──────────────────────────────────

const cli = path.join(root, "bin", "notecraftapp.mjs");
async function runCli(args) {
  const p = start([cli, ...args], notesDir);
  await new Promise((r) => p.proc.on("exit", r));
  return p.out.text;
}

console.log("B. notecraftapp build（快取）");
writeTree(notesDir);
fs.rmSync(file("drafts/broken.md"));
{
  const first = await runCli(["build", ".", "--rebuild"]);
  await check("首次 build 成功", async () => {
    assert.ok(!/build failed/.test(first), first.split("\n").slice(-15).join("\n"));
  });
  await check("只改被排除的檔 → 快取有效（筆記數 2）", async () => {
    await sleep(1100);
    fs.appendFileSync(file("c.private.md"), "\n改了\n");
    fs.appendFileSync(file("fixtures/x.json"), " ");
    fs.writeFileSync(file("drafts/another.md"), "---\ntitle: X\n---\n");
    const out = await runCli(["build", "."]);
    assert.match(out, /快取有效，跳過 build（2 篇筆記）/, out.split("\n").slice(-8).join("\n"));
  });
  await check("改 ignore.json → 重 build", async () => {
    await sleep(1100);
    // fixtures/ 要留著排除：取消的話 fixtures/x.json 會交給 ER plugin 驗 schema 而 build fail（設計如此）
    fs.writeFileSync(file(".notecraft/ignore.json"), JSON.stringify({ ignore: ["drafts/", "fixtures/"] }, null, 2));
    const out = await runCli(["build", "."]);
    // 原因可能是「設定檔有變動」或「md/mdx 有變動」（c.private.md 不再被排除、且剛改過，md 那一關先命中）
    assert.match(out, /重 build：/, out.split("\n").slice(-8).join("\n"));
    assert.ok(!/build failed/.test(out), out.split("\n").slice(-15).join("\n"));
  });
}

// ── C. notecraftapp serve 的 watcher ─────────────────────────────

console.log("C. notecraftapp serve（watcher）");
{
  const serve = start([cli, "serve", ".", "--port", String(PORT), "--no-open"], notesDir);
  try {
    await waitFor(() => /watching notes/.test(serve.out.text), 180_000, "serve 就緒");
    await check("serve 送 notes-assets：被排除的 404", async () => {
      fs.writeFileSync(file(".notecraft/ignore.json"), JSON.stringify(IGNORE, null, 2));
      await waitFor(() => /rebuild (ok|FAILED)/.test(serve.out.text), 180_000, "ignore.json 變動後的 rebuild");
      assert.match(serve.out.text, /rebuild triggered: \w+ \.notecraft[\\/]ignore\.json/);
      assert.equal((await fetch(`${base}/notes-assets/private/x.png`)).status, 404);
      assert.equal((await fetch(`${base}/notes-assets/img/ok.png`)).status, 200);
    });
    await check("改被排除的檔 → 不觸發 rebuild", async () => {
      const before = (serve.out.text.match(/rebuild triggered/g) || []).length;
      fs.appendFileSync(file("drafts/b.mdx"), "\nserve 期間改\n");
      fs.appendFileSync(file("archive/old.md"), "\nserve 期間改\n");
      await sleep(3000);
      const after = (serve.out.text.match(/rebuild triggered/g) || []).length;
      assert.equal(after, before, "被排除的檔觸發了 rebuild");
    });
    await check("改沒被排除的檔 → 觸發 rebuild（對照組）", async () => {
      const before = (serve.out.text.match(/rebuild triggered/g) || []).length;
      fs.appendFileSync(file("a.mdx"), "\nserve 期間改\n");
      await waitFor(() => (serve.out.text.match(/rebuild triggered/g) || []).length > before, 10_000, "a.mdx 觸發 rebuild");
      await waitFor(() => (serve.out.text.match(/rebuild (ok|FAILED)/g) || []).length >= 2, 180_000, "rebuild 結束");
    });
  } finally {
    serve.proc.kill();
  }
}

await sleep(500);
fs.rmSync(notesDir, { recursive: true, force: true });

if (state.failed) {
  console.error(`\n${state.failed} 項失敗`);
  process.exit(1);
}
console.log("\n全部通過");
