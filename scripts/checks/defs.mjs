// 定義與引用：掃描器與跨檔索引的斷言（Task 126，規格 docs/notecraft-workbench-define-ref.md §2–§4）。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:defs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isValidDefId, maskNonProse, parseAttrs, scanDefs, suggestIds } from "../../src/lib/defs-scan.mjs";
import matter from "gray-matter";
import { buildDefIndex, rebaseRelativeUrl, slugOfNotePath } from "../../src/lib/defs-state.mjs";
import { readFrontmatterLite } from "../../src/lib/defs-index.mjs";
import { scanLinks } from "../../src/lib/links-scan.mjs";
import { firstH1 } from "../../src/lib/note-text.ts";
import { walkNotes, createNotesIgnore } from "../../src/lib/notes-ignore.mjs";

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
const ids = (xs) => xs.map((x) => x.id);

console.log("defs-scan");

check("三種指令的 id、行號", () => {
  const s = scanDefs(`---\ntitle: x\n---\n\n::::define{id="hr.role-admin"}\n**管理員**：審核。\n::::\n\n::include{id="hr.a"}\n\n由 :ref[管理員]{id="hr.b"} 與 :ref{id=hr.c} 審核。\n`);
  assert.deepEqual(ids(s.defines), ["hr.role-admin"]);
  assert.equal(s.defines[0].line, 5);
  assert.deepEqual(ids(s.includes), ["hr.a"]);
  assert.equal(s.includes[0].line, 9);
  assert.deepEqual(ids(s.refs), ["hr.b", "hr.c"]);
  assert.deepEqual(s.errors, []);
});

check("define 的 source 是內容原文、不含 fence 行", () => {
  const src = `::::define{id="a"}\n第一行\n\n:::note\n內層\n:::\n::::\n後文\n`;
  const s = scanDefs(src);
  assert.equal(s.defines[0].source, "第一行\n\n:::note\n內層\n:::\n");
  assert.equal(src.slice(s.defines[0].start, s.defines[0].end), s.defines[0].source);
});

check("巢狀容器：內層 ::: 不會提早收掉 ::::define", () => {
  const s = scanDefs(`::::define{id="a"}\n:::tabs\n:::tab{label="x"}\nx\n:::\n:::\n::::\n:ref{id="b"}\n`);
  assert.equal(s.defines.length, 1);
  assert.equal(s.refs[0].inDefine, null, "收尾後的 ref 不在 define 裡");
});

check("圍欄程式碼、MDX 註解、HTML 註解、行內 code 裡的指令不算", () => {
  const s = scanDefs("```mdx\n::include{id=\"a\"}\n:ref{id=\"b\"}\n```\n{/* :ref{id=\"c\"} */}\n<!-- ::include{id=\"d\"} -->\n寫成 `:ref{id=\"e\"}` 即可\n");
  assert.deepEqual(s.includes, []);
  assert.deepEqual(s.refs, []);
});

check("maskNonProse 保留長度與換行", () => {
  const src = "---\nt: 1\n---\na `b` c\n```\nx\n```\n";
  const m = maskNonProse(src);
  assert.equal(m.length, src.length);
  assert.equal(m.split("\n").length, src.split("\n").length);
});

check("label：屬性 → 第一個粗體 → id", () => {
  const s = scanDefs(`:::define{id="a" label="自訂"}\n**粗體**\n:::\n:::define{id="b"}\n說明 **主管** 與 **其他**\n:::\n:::define{id="c"}\n沒有粗體\n:::\n`);
  assert.deepEqual(s.defines.map((d) => d.label), ["自訂", "主管", "c"]);
});

check("components：需要 import 的元件，連續的算一個；小寫 HTML 不算", () => {
  const s = scanDefs(`::::define{id="a"}\n<GeneratedFrame title="x">\n  <Chart client:visible />\n</GeneratedFrame>\n\n<Other />\n\n文字\n\n<Third />\n<br />\n::::\n`);
  assert.equal(s.defines[0].components, 2);
});

check("id 格式：允許中文；空白、開頭 .、連續 .. 不行", () => {
  assert.ok(isValidDefId("hr.role-admin"));
  assert.ok(isValidDefId("人資.管理員"));
  assert.ok(isValidDefId("a_b-1"));
  for (const bad of ["", "a b", ".a", "a..b", "a.", "a/b"]) assert.ok(!isValidDefId(bad), bad);
});

check("parseAttrs：雙引號、單引號、無引號、#id", () => {
  assert.deepEqual(parseAttrs(`id="a" label='管理 員' x=1`), { id: "a", label: "管理 員", x: "1" });
  // 與 remark-directive 相同：#id 簡寫遇到 . 就是 class 的開始，帶點的 id 只能寫 id="…"
  assert.deepEqual(parseAttrs(`#hr.a .cls`), { id: "hr" });
});

check("錯誤：缺 id、格式、巢狀、不在最上層、import、include 自己、沒收尾", () => {
  const msg = (src) => scanDefs(src).errors.map((e) => e.message).join("\n");
  assert.match(msg(`:::define\nx\n:::\n`), /缺少 id/);
  assert.match(msg(`:::define{id="a b"}\nx\n:::\n`), /格式不符/);
  assert.match(msg(`::::define{id="a"}\n:::define{id="b"}\nx\n:::\n::::\n`), /不可巢狀/);
  assert.match(msg(`::::note\n:::define{id="b"}\nx\n:::\n::::\n`), /最上層/);
  assert.match(msg(`:::define{id="a"}\nimport X from "x";\n:::\n`), /import／export/);
  assert.match(msg(`:::define{id="a"}\nx\n:::\n::include{id="a"}\n`), /不能 include 自己/);
  assert.match(msg(`:::define{id="a"}\nx\n`), /沒有收尾/);
  assert.match(msg(`見 :ref[x] 吧\n`), /:ref 缺少 id/);
});

check("光禿禿的 :ref（沒有 [] 也沒有 {}）不是引用、也不是錯誤", () => {
  const s = scanDefs(`看:ref 這個字\n`);
  assert.deepEqual(s.refs, []);
  assert.deepEqual(s.errors, []);
});

check("inDefine：define 內的 ref／include 記到該 define", () => {
  const s = scanDefs(`::::define{id="a"}\n:ref{id="x"}\n::include{id="y"}\n::::\n`);
  assert.equal(s.refs[0].inDefine, "a");
  assert.equal(s.includes[0].inDefine, "a");
});

check("suggestIds：編輯距離 ≤2", () => {
  assert.deepEqual(suggestIds("hr.role-admn", ["hr.role-admin", "hr.role-manager", "crm.x"]), ["hr.role-admin"]);
  assert.deepEqual(suggestIds("zzz", ["hr.role-admin"]), []);
});

console.log("defs-index");

const DEF = (id, body = "內容") => `::::define{id="${id}"}\n${body}\n::::\n`;

check("找不到 id 附建議；重複 id 指出兩處", () => {
  const idx = buildDefIndex([
    { rel: "a.mdx", source: DEF("hr.role-admin") },
    { rel: "b.mdx", source: `:ref{id="hr.role-admn"}\n` },
    { rel: "c.mdx", source: DEF("hr.role-admin") },
  ]);
  const all = idx.errors.join("\n");
  assert.match(all, /b\.mdx:1 :ref 找不到定義「hr\.role-admn」（是不是 「hr\.role-admin」？）/);
  assert.match(all, /c\.mdx:1 定義 id「hr\.role-admin」重複（另一處在 a\.mdx:1）/);
});

check("循環嵌入與深度上限", () => {
  const cyc = buildDefIndex([
    { rel: "a.mdx", source: DEF("a", `::include{id="b"}`) },
    { rel: "b.mdx", source: DEF("b", `::include{id="a"}`) },
  ]);
  assert.match(cyc.errors.join("\n"), /循環嵌入：a → b → a|循環嵌入：b → a → b/);
  assert.equal(cyc.errors.filter((e) => e.includes("循環")).length, 1, "同一個環只報一次");
  const chain = ["d1", "d2", "d3", "d4", "d5"];
  const files = chain.map((id, i) => ({ rel: `${id}.mdx`, source: DEF(id, chain[i + 1] ? `::include{id="${chain[i + 1]}"}` : "底") }));
  files.push({ rel: "x.mdx", source: `::include{id="d1"}\n` });
  assert.match(buildDefIndex(files).errors.join("\n"), /x\.mdx:1 嵌入層數 5 超過上限 4/);
  files.pop();
  files.push({ rel: "x.mdx", source: `::include{id="d2"}\n` });
  assert.deepEqual(buildDefIndex(files).errors, []);
});

check("反向連結：同篇合併 kinds、自己不計、define 內的 ref 計入來源筆記", () => {
  const idx = buildDefIndex([
    { rel: "sys/overview.mdx", source: DEF("hr.a") + DEF("hr.status", `:ref{id="hr.quota"}`) + `\n:ref{id="hr.a"}\n` },
    { rel: "sys/glossary.mdx", source: DEF("hr.quota") },
    { rel: "sys/leave.mdx", source: `::include{id="hr.status"}\n\n:ref{id="hr.a"} 與 ::include{id="hr.a"}\n\n::include{id="hr.a"}\n` },
  ]);
  assert.deepEqual(idx.errors, []);
  const a = idx.defs.get("hr.a");
  assert.deepEqual(a.refs, [{ slug: "sys/leave", kinds: ["inc", "ref"] }], "overview 自己的 ref 不計；leave 合併成一筆");
  assert.deepEqual(idx.defs.get("hr.quota").refs, [{ slug: "sys/overview", kinds: ["ref"] }], "status 裡的 ref 計入 overview，不計入嵌入它的 leave");
  assert.deepEqual(idx.notes.get("sys/leave").references.map((r) => r.id).sort(), ["hr.a", "hr.status"]);
  assert.deepEqual(idx.notes.get("sys/overview").defines, ["hr.a", "hr.status"]);
});

check("排序：引用該來源越多 id 的筆記越前，同數依資料夾樹", () => {
  const idx = buildDefIndex([
    { rel: "src.mdx", source: DEF("x.a") + DEF("x.b") },
    { rel: "z/one.mdx", source: `:ref{id="x.a"}\n` },
    { rel: "b/two.mdx", source: `:ref{id="x.a"} :ref{id="x.b"}\n` },
    { rel: "root.mdx", source: `:ref{id="x.a"}\n` },
    { rel: "a/one.mdx", source: `:ref{id="x.a"}\n` },
  ]);
  assert.deepEqual(idx.defs.get("x.a").refs.map((r) => r.slug), ["b/two", "root", "a/one", "z/one"]);
});

check("label 與標題：frontmatter title → H1 → slug", () => {
  const idx = buildDefIndex([
    { rel: "a.mdx", source: `---\ntitle: 系統 Overview\n---\n` + DEF("a") },
    { rel: "b.mdx", source: `# 第一個標題\n` + DEF("b") },
    { rel: "my-note.mdx", source: DEF("c") },
  ]);
  assert.deepEqual([...idx.defs.values()].map((d) => d.title), ["系統 Overview", "第一個標題", "My Note"]);
});

check("slugOfNotePath：與 Content Layer 規則一致", () => {
  assert.equal(slugOfNotePath("A Folder/My Note.mdx"), "a-folder/my-note");
  assert.equal(slugOfNotePath("中文/系統 Overview.md"), "中文/系統-overview");
  assert.equal(slugOfNotePath("x/index.mdx"), "x");
  assert.equal(slugOfNotePath("x.mdx", "custom/slug"), "custom/slug");
});

check("rebaseRelativeUrl：以來源檔解析、改成相對於目前檔", () => {
  assert.equal(rebaseRelativeUrl("./images/a.png", "sys/overview.mdx", "sys/leave.mdx"), "./images/a.png");
  assert.equal(rebaseRelativeUrl("images/a.png", "sys/overview.mdx", "other/deep/x.mdx"), "../../sys/images/a.png");
  assert.equal(rebaseRelativeUrl("../b.mdx", "sys/sub/o.mdx", "root.mdx"), "./sys/b.mdx");
});

check("真實筆記：掃描不出錯、H1 與 note-text.ts 的 firstH1 一致", () => {
  const notesDir = path.resolve("src/content/notes");
  if (!fs.existsSync(notesDir)) return;
  const files = [];
  walkNotes(notesDir, createNotesIgnore([]), ({ rel, abs }) => {
    if (/\.(md|mdx)$/.test(rel)) files.push({ rel, source: fs.readFileSync(abs, "utf8") });
  });
  const idx = buildDefIndex(files);
  assert.deepEqual(idx.errors, []);
  for (const f of files) {
    const body = f.source.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "");
    assert.equal(scanDefs(f.source).h1, firstH1(body) ?? "", f.rel);
  }
});

// ── 站內連結掃描（Graph 檢視，docs/notecraft-workbench-notes-graph.md §4.3）──
check("scanLinks：行內連結、reference 定義、href、PluginView 四種寫法", () => {
  const src = [
    "---",
    "title: x",
    "---",
    "看 [總覽](/notes/a/b#sec) 與 [外部](https://example.com)。",
    "",
    '[帶標題](<../c d.md> "標題")',
    "",
    "[ref]: /view/api/orders.openapi",
    "",
    '<a href="/notes/e">e</a> <Card href=\'./f\' />',
    "",
    '<PluginView src="api/orders.openapi.json" options={{ operation: "x" }} />',
  ].join("\n");
  assert.deepEqual(scanLinks(src), [
    { url: "/notes/a/b#sec", line: 4, via: "link" },
    { url: "https://example.com", line: 4, via: "link" },
    { url: "../c d.md", line: 6, via: "link" },
    { url: "/view/api/orders.openapi", line: 8, via: "link" },
    { url: "/notes/e", line: 10, via: "link" },
    { url: "./f", line: 10, via: "link" },
    { url: "api/orders.openapi.json", line: 12, via: "pluginview" },
  ]);
});

check("scanLinks：圖片、圍欄程式碼、行內 code、註解、:ref 不算", () => {
  const src = [
    "![圖](/notes/img.png)",
    "```md",
    "[在程式碼裡](/notes/x)",
    "```",
    "行內 `[y](/notes/y)` 不算",
    "{/* [z](/notes/z) */}",
    "<!-- [w](/notes/w) -->",
    ':ref[額度]{id="hr.term-quota"}',
    "[真的](/notes/real)",
  ].join("\n");
  assert.deepEqual(scanLinks(src), [{ url: "/notes/real", line: 9, via: "link" }]);
});

check("scanLinks：現有筆記的站內連結都掃得到（buildDefIndex 的 links）", () => {
  const notesDir = path.resolve("src/content/notes");
  if (!fs.existsSync(notesDir)) return;
  const files = [];
  walkNotes(notesDir, createNotesIgnore([]), ({ rel, abs }) => {
    if (/\.(md|mdx)$/.test(rel)) files.push({ rel, source: fs.readFileSync(abs, "utf8") });
  });
  const idx = buildDefIndex(files);
  const all = [...idx.notes.values()].flatMap((n) => n.links);
  const count = (re) => all.filter((l) => l.via === "link" && re.test(l.url)).length;
  // 與原始碼對照：遮掉非正文後出現的次數
  const raw = files.map((f) => maskNonProse(f.source)).join("\n");
  assert.equal(count(/^\/notes\//), (raw.match(/\]\(\/notes\//g) ?? []).length + (raw.match(/href="\/notes\//g) ?? []).length);
  assert.equal(count(/^\/view\//), (raw.match(/\]\(\/view\//g) ?? []).length + (raw.match(/href="\/view\//g) ?? []).length);
  assert.equal(all.filter((l) => l.via === "pluginview").length, (raw.match(/<PluginView\b/g) ?? []).length);
  for (const n of idx.notes.values()) assert.ok(Array.isArray(n.links), n.rel);
});

check("readFrontmatterLite：現有筆記的 title／slug 與 gray-matter 一致（官網示範用輕量版）", () => {
  const notesDir = path.resolve("src/content/notes");
  if (!fs.existsSync(notesDir)) return;
  walkNotes(notesDir, createNotesIgnore([]), ({ rel, abs }) => {
    if (!/\.(md|mdx)$/.test(rel)) return;
    const src = fs.readFileSync(abs, "utf8");
    const full = matter(src).data;
    const lite = readFrontmatterLite(src);
    for (const k of ["title", "slug"]) {
      if (typeof full[k] === "string") assert.equal(lite[k], full[k], `${rel} 的 ${k}`);
    }
  });
});

check("瀏覽器可用：defs-index.mjs 只 import github-slugger 與 defs-scan.mjs、不碰 Node API", () => {
  const code = (f) => fs.readFileSync(path.resolve(f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const src = code("src/lib/defs-index.mjs");
  const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["./defs-scan.mjs", "./links-scan.mjs", "github-slugger"]);
  assert.doesNotMatch(src, /\bprocess\.|node:|\bfs\./);
  const links = code("src/lib/links-scan.mjs");
  assert.deepEqual([...links.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]), ["./defs-scan.mjs"]);
  assert.doesNotMatch(links, /\bprocess\.|node:|\bfs\./);
  const core = code("src/lib/remark-notecraft-defs-core.ts");
  assert.doesNotMatch(core, /from "node:|defs-state|\bprocess\./);
});

check("純度：defs-scan.mjs 沒有任何 import", () => {
  const src = fs.readFileSync(path.resolve("src/lib/defs-scan.mjs"), "utf8");
  assert.ok(!/^\s*import\s/m.test(src));
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
