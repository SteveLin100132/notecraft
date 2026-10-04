// 檢查 .notecraft/ignore.json 的比對語意（Task 117，規格 docs/notecraft-ignore-config.md §3、§4、§9.1）。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:ignore

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createNotesIgnore,
  deadNegations,
  findShadowedIgnoreFiles,
  loadNotesIgnore,
  parseIgnoreJson,
  resolveNotecraftDir,
  resolveNotesDir,
  walkNotes,
} from "../../src/lib/notes-ignore.mjs";

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

const hit = (rules, p) => createNotesIgnore(rules).ignores(p);
const yes = (rules, paths) => paths.forEach((p) => assert.equal(hit(rules, p), true, `${JSON.stringify(rules)} 應命中 ${p}`));
const no = (rules, paths) => paths.forEach((p) => assert.equal(hit(rules, p), false, `${JSON.stringify(rules)} 不應命中 ${p}`));

/** 在暫存資料夾建檔案樹，跑完刪掉。 */
const withTree = (files, fn) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nc-ignore-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(root, ...rel.split("/"));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content ?? "");
    }
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

console.log("notes-ignore");

check("任何深度：不含 / 的規則", () => {
  yes(["CHANGELOG.md"], ["CHANGELOG.md", "a/b/CHANGELOG.md"]);
  no(["CHANGELOG.md"], ["CHANGELOG.mdx"]);
});

check("根錨定：開頭 /", () => {
  yes(["/README.md"], ["README.md"]);
  no(["/README.md"], ["docs/README.md"]);
});

check("資料夾：結尾 / 只比資料夾、子樹一起排除", () => {
  yes(["drafts/"], ["drafts/", "x/drafts/", "drafts/b.mdx", "x/drafts/a/b.md"]);
  no(["drafts/"], ["drafts", "drafts.md"]);
});

check("萬用字元：**/*.private.md", () => {
  yes(["**/*.private.md"], ["a.private.md", "a/b/c.private.md"]);
  no(["**/*.private.md"], ["a.private.mdx"]);
});

check("萬用字元：**/*.test.mdx 與 *.test.mdx 結果相同", () => {
  for (const p of ["a.test.mdx", "x/y/b.test.mdx", "a.test.md", "test.mdx"]) {
    assert.equal(hit(["**/*.test.mdx"], p), hit(["*.test.mdx"], p), p);
  }
  yes(["**/*.test.mdx"], ["a.test.mdx", "x/y/b.test.mdx"]);
  no(["**/*.test.mdx"], ["a.test.md"]);
});

check("錨定的跨層：fixtures/**/*.json", () => {
  yes(["fixtures/**/*.json"], ["fixtures/a.json", "fixtures/x/y.json"]);
  no(["fixtures/**/*.json"], ["other/fixtures/a.json"]);
});

check("反向：archive/* + !archive/keep.mdx", () => {
  const r = ["archive/*", "!archive/keep.mdx"];
  yes(r, ["archive/a.md"]);
  no(r, ["archive/keep.mdx"]);
});

check("救不回：archive/ + !archive/keep.mdx", () => {
  withTree({ "archive/keep.mdx": "", "archive/a.md": "", "b.md": "" }, (root) => {
    const ig = createNotesIgnore(["archive/", "!archive/keep.mdx"]);
    const seen = [];
    const res = walkNotes(root, ig, (e) => seen.push(e.rel));
    assert.deepEqual(seen, ["b.md"]);
    assert.deepEqual(res.prunedDirs, ["archive/"]);
    assert.deepEqual(deadNegations(ig, res.prunedDirs), ["!archive/keep.mdx"]);
    // archive/* 的寫法則沒有無效的 !
    const ig2 = createNotesIgnore(["archive/*", "!archive/keep.mdx"]);
    const seen2 = [];
    const res2 = walkNotes(root, ig2, (e) => seen2.push(e.rel));
    assert.deepEqual(seen2, ["archive/keep.mdx", "b.md"]);
    assert.deepEqual(deadNegations(ig2, res2.prunedDirs), []);
  });
});

check("註解與空白不算規則；\\# 比對字面 #", () => {
  const ig = createNotesIgnore(["# 私人筆記", "", "  ", "\\#tag.md"]);
  assert.equal(ig.ruleCount, 1);
  assert.equal(ig.ignores("#tag.md"), true);
});

check("內建排除：無規則時也排除、! 解除不了", () => {
  const builtin = [".git/", ".notecraft/", ".obsidian/", ".env", "a/.vscode/", "node_modules/", "x/node_modules/", "dist/"];
  yes([], builtin);
  no([], ["a.md", "x/distance.md"]);
  const ig = createNotesIgnore(["!node_modules/", "!dist/", "!a.md"]);
  assert.equal(ig.ignores("node_modules/"), true);
  assert.equal(ig.ignores("dist/"), true);
  assert.deepEqual([...ig.builtinNegations], ["!node_modules/", "!dist/"]);
  // 使用者自己寫內建規則：不報錯、結果不變
  const ig2 = createNotesIgnore(["node_modules/"]);
  assert.equal(ig2.ignores("node_modules/"), true);
  assert.deepEqual([...ig2.builtinNegations], []);
});

check("內建排除：走訪時剪枝", () => {
  withTree({ "node_modules/pkg/README.md": "", ".obsidian/x.md": "", "dist/a.md": "", "a.md": "" }, (root) => {
    const seen = [];
    const res = walkNotes(root, createNotesIgnore([]), (e) => seen.push(e.rel));
    assert.deepEqual(seen, ["a.md"]);
    assert.deepEqual(res.prunedDirs.sort(), [".obsidian/", "dist/", "node_modules/"]);
  });
});

check("ignoresByUser 不含內建", () => {
  const ig = createNotesIgnore(["drafts/"]);
  assert.equal(ig.ignoresByUser("drafts/"), true);
  assert.equal(ig.ignoresByUser("node_modules/"), false);
});

check("輸入防呆：\\、開頭 /、..", () => {
  const ig = createNotesIgnore([]);
  assert.throws(() => ig.ignores("a\\b.md"));
  assert.throws(() => ig.ignores("/a.md"));
  assert.throws(() => ig.ignores("../a.md"));
  assert.throws(() => ig.ignores(""));
});

check("parseIgnoreJson：形狀", () => {
  assert.deepEqual(parseIgnoreJson("{}", "x").patterns, []);
  assert.throws(() => parseIgnoreJson("[]", "x"), /頂層必須是物件/);
  assert.throws(() => parseIgnoreJson("{", "x"), /不是合法的 JSON/);
  assert.throws(() => parseIgnoreJson('{"ignore":"x"}', "x"), /字串陣列/);
  assert.throws(() => parseIgnoreJson('{"ignore":["a",1]}', "x"), /第 2 個/);
  assert.deepEqual(parseIgnoreJson('{"$schema":"s","ignores":[]}', "x").unknownKeys, ["ignores"]);
});

check("語法錯誤：未閉合的 [ → throw 並指出第幾條", () => {
  assert.throws(() => createNotesIgnore(["a.md", "[abc"]), /第 2 條規則/);
  assert.doesNotThrow(() => createNotesIgnore(["\\[abc", "[ab]c.md"]));
});

check("loadNotesIgnore：不存在、正常、壞檔", () => {
  withTree({ "ok/ignore.json": '{"ignore":["drafts/"]}', "bad/ignore.json": '{"ignore":["[x"]}', "arr/ignore.json": "[]" }, (root) => {
    const none = loadNotesIgnore(path.join(root, "missing"));
    assert.equal(none.source, null);
    assert.equal(none.ruleCount, 0);
    const ok = loadNotesIgnore(path.join(root, "ok"));
    assert.equal(ok.ruleCount, 1);
    assert.equal(ok.ignores("drafts/"), true);
    assert.throws(() => loadNotesIgnore(path.join(root, "bad")), /\.notecraft\/ignore\.json 第 1 條規則/);
    assert.throws(() => loadNotesIgnore(path.join(root, "arr")), /頂層必須是物件/);
  });
});

check("路徑解析：與 plugins.json 同一套優先序", () => {
  const cwd = path.resolve("/app");
  assert.equal(resolveNotecraftDir({}, cwd), path.join(cwd, ".notecraft"));
  assert.equal(resolveNotecraftDir({ NOTECRAFT_NOTES_DIR: "/n" }, cwd), path.join(path.resolve("/n"), ".notecraft"));
  assert.equal(
    resolveNotecraftDir({ NOTECRAFT_NOTES_DIR: "/n", NOTECRAFT_USER_CWD: "/u" }, cwd),
    path.join(path.resolve("/u"), ".notecraft"),
  );
  assert.equal(resolveNotesDir({}, cwd), path.resolve(cwd, "src/content/notes"));
  assert.equal(resolveNotesDir({ NOTECRAFT_NOTES_DIR: "/n" }, cwd), path.resolve("/n"));
});

check("遮蔽：notesDir 那份不會生效時回報", () => {
  withTree({ "proj/.notecraft/ignore.json": "{}", "proj/docs/.notecraft/ignore.json": "{}" }, (root) => {
    const notesDir = path.join(root, "proj", "docs");
    const shadowed = findShadowedIgnoreFiles(notesDir, path.join(root, "proj", ".notecraft"));
    assert.equal(shadowed.length, 1);
    assert.deepEqual(findShadowedIgnoreFiles(notesDir, path.join(notesDir, ".notecraft")), []);
  });
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("\n全部通過");
