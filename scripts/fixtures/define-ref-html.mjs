// 定義與引用的產物斷言（Task 127，規格 docs/notecraft-workbench-define-ref.md §5、§6、§15）。
// 先 `npx astro build`，再 `node scripts/fixtures/define-ref-html.mjs [--dist <dir>] [--base /x]`。
// 放 fixtures/ 不放 checks/：要先有 build 產物，不併入 check-plugins。

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const dist = path.resolve(opt("--dist", "dist"));
const base = (opt("--base", "") || "").replace(/\/+$/, "");
const dir = path.join(dist, "notes", "testing", "define-ref");

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
const read = (name) => fs.readFileSync(path.join(dir, name, "index.html"), "utf8");
const count = (html, re) => (html.match(re) ?? []).length;
/** 預覽內容的容器（hidden）裡每一份 [data-nc-def] 的 HTML；以下一份的開頭切開 */
const templatesOf = (html) => {
  const i = html.indexOf("data-nc-def-templates");
  if (i < 0) return [];
  // 容器是 .nc-prose 的最後一個子元素，後面緊接的是 RefLayer 等 island
  const end = html.indexOf("<astro-island", i);
  const box = html.slice(i, end < 0 ? undefined : end);
  return box.split(/<div data-nc-def="/).slice(1);
};

assert.ok(fs.existsSync(dir), `找不到 ${path.relative(process.cwd(), dir)}，請先 build`);
const pages = { overview: read("系統-overview"), leave: read("請假功能規格"), acct: read("帳號權限規格") };

check("整頁沒有重複的元素 id（含 template 內）", () => {
  for (const [name, html] of Object.entries(pages)) {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    assert.deepEqual([...new Set(dup)], [], name);
  }
});

check("來源頁：7 個 define、引用數與「尚未被引用」", () => {
  const h = pages.overview;
  assert.equal(count(h, /<section class="nc-def"/g), 7);
  assert.match(h, /id="def-hr\.role-admin"/);
  assert.equal(count(h, /class="nc-def-cnt zero"/g), 1, "只有 hr.term-carryover");
  assert.match(h, /data-def="hr\.term-carryover"[\s\S]*?尚未被引用/);
});

check("來源頁的元件照常渲染（astro-island），沒有 placeholder", () => {
  assert.match(pages.overview, /<astro-island[^>]*rr-raci/i);
  assert.equal(count(pages.overview, /class="nc-inc-ph"/g), 0);
});

check("嵌入頁：5 個 include、元件是 placeholder、沒有 rr-raci island", () => {
  const h = pages.leave;
  assert.equal(count(h, /<div class="nc-inc"/g), 5);
  assert.equal(count(h, /class="nc-inc-ph"/g), 1);
  assert.doesNotMatch(h, /<astro-island[^>]*rr-raci/i);
});

check("嵌入的標題相對化並帶 inc- id；template 內沒有標題", () => {
  assert.match(pages.leave, /<h3 id="inc-hr\.role-manager-主管職責"/);
  for (const t of templatesOf(pages.leave)) assert.doesNotMatch(t, /<h[1-6][\s>]/);
});

check("include、template 都帶 data-pagefind-ignore；template 內的 ref 是 is-static", () => {
  for (const html of Object.values(pages)) {
    for (const m of html.matchAll(/<div class="nc-inc"[^>]*>/g)) assert.match(m[0], /data-pagefind-ignore/);
    if (html.includes("data-nc-def-templates")) assert.match(html, /<div hidden[^>]*data-pagefind-ignore[^>]*data-nc-def-templates/);
    for (const t of templatesOf(html)) for (const m of t.matchAll(/<a [^>]*class="nc-ref[^"]*"/g)) assert.match(m[0], /is-static/);
  }
});

check("預覽內容不是空的", () => {
  const t = templatesOf(pages.leave);
  assert.equal(t.length, 4);
  for (const x of t) assert.ok(x.replace(/<[^>]+>/g, "").trim().length > 20, x.slice(0, 80));
});

check("預覽內容只放本頁用到的 id", () => {
  const ids = (h) => [...h.matchAll(/<div data-nc-def="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids(pages.acct), ["hr.leave-status", "hr.role-admin", "hr.role-employee", "hr.role-manager", "hr.term-quota"]);
  assert.deepEqual(ids(pages.leave), ["hr.role-admin", "hr.role-employee", "hr.role-manager", "hr.term-quota"]);
});

check("沒有 [文字] 的 :ref 顯示 label", () => {
  assert.match(pages.acct, /<a href="[^"]*#def-hr\.role-admin"[^>]*class="nc-ref"[^>]*>管理員<\/a>/);
});

check("嵌入的 steps、tabs、表格、note、tip 都經過既有管線", () => {
  const h = pages.leave;
  assert.match(h, /class="nc-steps/);
  assert.match(h, /data-nc-tabs/);
  assert.match(h, /<table/);
  assert.match(h, /class="nc-adm nc-adm--note"/);
  assert.match(h, /class="nc-tip"/);
});

check(`連結帶 base 前綴（${base || "無"}）`, () => {
  const prefix = `${base}/notes/testing/define-ref/系統-overview#def-`;
  assert.ok(pages.acct.includes(`href="${prefix}hr.role-admin"`), "ref");
  assert.ok(pages.leave.includes(`class="nc-inc-go" href="${prefix}`), "前往來源");
  assert.ok(pages.leave.includes(`data-href="${prefix}`), "template");
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
