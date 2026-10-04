// .notecraft/ignore.json 的整合驗證（Task 118／119，規格 docs/notecraft-ignore-config.md §9.2）。
//
// 在 tmp/ignore-sample/ 產生一個筆記資料夾（node_modules/、dist/ 進不了 git，所以每次現場產生），
// 以 viewer 模式 build 到 tmp/ignore-sample-out/，斷言被排除的檔沒有出現在產物、build log 有該有的訊息；
// 再把 ignore.json 改壞，斷言 build 失敗。
//
// 不放 scripts/checks/：那裡每支 .mjs 都會被 check-plugins 當成秒級檢查執行，這支要跑完整 build（約 1 分鐘）。
// 執行：node scripts/fixtures/ignore-sample.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { root, writeTree as writeSampleTree } from "./ignore-sample-tree.mjs";

const notesDir = path.join(root, "tmp", "ignore-sample");
const outDir = path.join(root, "tmp", "ignore-sample-out");
const writeTree = () => writeSampleTree(notesDir);

function build() {
  fs.rmSync(outDir, { recursive: true, force: true });
  const r = spawnSync("npx", ["astro", "build", "--outDir", outDir], {
    cwd: root,
    shell: true,
    encoding: "utf-8",
    env: { ...process.env, NOTECRAFT_NOTES_DIR: notesDir, NOTECRAFT_USER_CWD: notesDir },
  });
  return { ok: r.status === 0, log: `${r.stdout}\n${r.stderr}` };
}

function listFiles(dir, prefix = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}${e.name}`;
    if (e.isDirectory()) out.push(...listFiles(path.join(dir, e.name), `${rel}/`));
    else out.push(rel);
  }
  return out;
}

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

console.log("ignore-sample：build 中（約 1 分鐘）…");
writeTree();
const res = build();
if (!res.ok) {
  console.error(res.log.split("\n").slice(-40).join("\n"));
  console.error("\n✗ build 失敗");
  process.exit(1);
}
const files = listFiles(outDir);
const html = files.filter((f) => f.endsWith(".html")).map((f) => fs.readFileSync(path.join(outDir, f), "utf-8")).join("\n");
const index = JSON.parse(fs.readFileSync(path.join(outDir, "wb-index.json"), "utf-8"));
const log = res.log;
fs.writeFileSync(path.join(root, "tmp", "ignore-sample-build.log"), log);

check("被排除的筆記沒有頁面、內容不在任何 HTML", () => {
  for (const s of ["B", "BROKEN", "C", "OLD", "NM", "DIST"]) {
    assert.ok(!html.includes(`IGNORED_SENTINEL_${s}`), `HTML 含 IGNORED_SENTINEL_${s}`);
  }
  assert.ok(!files.some((f) => /^notes\/(drafts|archive\/old|c\.private|node_modules|dist)\b/i.test(f)), "有被排除筆記的頁");
});

check("`archive/*` + `!archive/keep.mdx` 救回 keep", () => {
  assert.ok(files.includes("notes/archive/keep/index.html"), "缺 /notes/archive/keep");
  assert.ok(html.includes("KEEP_SENTINEL"));
  assert.ok(files.includes("notes/a/index.html"), "缺 /notes/a");
});

check("wb-index.json 不含被排除的 path", () => {
  const paths = index.notes.map((n) => n.path).sort();
  assert.deepEqual(paths, ["a.mdx", "archive/keep.mdx"]);
  assert.equal(index.dataFiles.length, 0);
  assert.ok(!index.folders.some((f) => /drafts|private|node_modules|fixtures/.test(JSON.stringify(f))), "資料夾樹含被排除的資料夾");
});

check("附件：被排除的不複製、沒被排除的照常", () => {
  assert.ok(!files.some((f) => f.startsWith("notes-assets/private/")), "notes-assets/private 被複製了");
  assert.ok(files.includes("notes-assets/img/ok.png"), "公開圖沒有被複製");
});

check("build log：摘要與各種 warn", () => {
  const want = [
    /\[ignore\] \.notecraft\/ignore\.json：7 條規則，排除/,
    /"!dist\/" 不會生效/,
    /a\.mdx 連到被排除的 drafts\/b\.mdx，該連結會 404/,
    /a\.mdx 引用被排除的 private\/x\.png/,
    /另有 1 個檔被 \.notecraft\/ignore\.json 排除/,
    /章節 slug "drafts\/b" 已被 \.notecraft\/ignore\.json 排除/,
    /產物中沒有被 ignore\.json 排除的檔/,
  ];
  const missing = want.filter((re) => !re.test(log)).map((re) => re.source);
  assert.deepEqual(missing, [], `build log 缺少：\n${missing.join("\n")}`);
});

check("build log 不含本機絕對路徑", () => {
  const ignoreLines = log.split("\n").filter((l) => l.includes("[ignore]"));
  for (const l of ignoreLines) assert.ok(!l.includes(notesDir) && !l.includes(root), `含絕對路徑：${l}`);
});

console.log("ignore-sample：ignore.json 改壞後 build 中…");
fs.writeFileSync(path.join(notesDir, ".notecraft", "ignore.json"), "[]");
const bad = build();
check("格式錯誤 → build fail，訊息指出檔案與原因", () => {
  assert.equal(bad.ok, false, "壞掉的 ignore.json 應讓 build 失敗");
  assert.ok(/\.notecraft\/ignore\.json 的頂層必須是物件/.test(bad.log), "錯誤訊息沒有指出頂層必須是物件");
});

fs.rmSync(outDir, { recursive: true, force: true });
fs.rmSync(notesDir, { recursive: true, force: true });

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("\n全部通過");
