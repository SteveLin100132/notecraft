// 走訪跟隨 symlink 的斷言（src/lib/fs-walk.mjs）。
// 沒有這支，筆記資料夾裡的 symlink 資料夾會被 build / serve 靜默略過 —— build 仍全綠。
// 單跑：npm run check:fswalk

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readdirFollow, readdirFollowSync } from "../../src/lib/fs-walk.mjs";

const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "nc-fswalk-")));
const notes = path.join(root, "notes");
const outside = path.join(root, "outside");
mkdirSync(path.join(notes, "real"), { recursive: true });
mkdirSync(path.join(outside, "deep"), { recursive: true });
writeFileSync(path.join(notes, "real", "a.md"), "a");
writeFileSync(path.join(outside, "b.md"), "b");
writeFileSync(path.join(outside, "deep", "c.md"), "c");
symlinkSync(outside, path.join(notes, "linked"), "dir"); // 資料夾 symlink
symlinkSync(path.join(outside, "b.md"), path.join(notes, "file-link.md")); // 檔案 symlink
symlinkSync(path.join(root, "nowhere"), path.join(notes, "dangling")); // 懸空
symlinkSync(notes, path.join(notes, "real", "loop")); // 指回祖先
symlinkSync(path.join(root, "mutual-b"), path.join(outside, "to-b"), "dir");
mkdirSync(path.join(root, "mutual-b"));
symlinkSync(outside, path.join(root, "mutual-b", "to-out"), "dir"); // outside <-> mutual-b 互指

const walkAsync = async (dir, chain, base = dir, out = []) => {
  for (const e of await readdirFollow(dir, chain)) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walkAsync(p, e.chain, base, out);
    else if (e.isFile()) out.push(path.relative(base, p));
  }
  return out.sort();
};
const walkSync = (dir, chain, base = dir, out = []) => {
  for (const e of readdirFollowSync(dir, chain)) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSync(p, e.chain, base, out);
    else if (e.isFile()) out.push(path.relative(base, p));
  }
  return out.sort();
};

let failed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
};

const expected = [
  "file-link.md",
  "linked/b.md",
  "linked/deep/c.md",
  "real/a.md",
].sort();
// 另有 outside/to-b → mutual-b → to-out → outside 互指：outside 已在走訪鏈上，被循環偵測擋下

await check("資料夾 symlink 被跟隨、檔案 symlink 算檔案（async）", async () => {
  assert.deepEqual(await walkAsync(notes), expected);
});
await check("同步版結果與 async 版一致", () => {
  assert.deepEqual(walkSync(notes), expected);
});
await check("懸空 symlink 被略過、不丟錯", async () => {
  const names = (await readdirFollow(notes)).filter((e) => e.name === "dangling");
  assert.equal(names.length, 1);
  assert.equal(names[0].isDirectory(), false);
  assert.equal(names[0].isFile(), false);
});
await check("指回祖先的 symlink 不被當資料夾（循環不無限遞迴）", async () => {
  const loop = (await readdirFollow(path.join(notes, "real"), undefined)).find((e) => e.name === "loop");
  // 單獨讀 real/ 時鏈上只有 real，notes 不在鏈上 → 可進入一層；從 notes 往下走才擋得住
  assert.ok(loop);
  const all = await walkAsync(notes);
  assert.equal(all.filter((p) => p.includes("loop")).length, 0);
});
await check("不存在的目錄回傳空陣列", async () => {
  assert.deepEqual(await readdirFollow(path.join(root, "missing")), []);
  assert.deepEqual(readdirFollowSync(path.join(root, "missing")), []);
});

rmSync(root, { recursive: true, force: true });
if (failed) {
  console.error(`\n✗ fs-walk：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ fs-walk：通過");
