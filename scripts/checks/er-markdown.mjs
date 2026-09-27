// ER plugin 迷你 Markdown 的斷言（Task 79）：連結白名單、反引號自動連結、純文字模式。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:er

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseInline,
  parseMarkdown,
  resolveCodeLink,
  stripMarkdown,
} from "../../plugins/er-diagram-renderer/markdown-text.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const v12 = JSON.parse(readFileSync(path.join(root, "plugins/er-diagram-renderer/example/schema.json"), "utf-8"));

const cases = [];
const check = (name, fn) => cases.push([name, fn]);
const links = (s) => parseInline(s).filter((x) => x.t === "link");

check("① javascript: 連結當純文字", () => {
  assert.deepEqual(links("[x](javascript:alert(1))"), []);
  assert.ok(parseInline("[x](javascript:alert(1))").every((x) => x.t === "text"));
});

check("② 大小寫、前置空白、控制字元繞法都擋", () => {
  for (const s of ["[x](JavaScript:alert(1))", "[x]( javascript:alert(1))", "[x](java\tscript:alert(1))", "[x](vbscript:x)"]) {
    assert.deepEqual(links(s), [], s);
  }
});

check("③ 協定相對、data: 擋", () => {
  assert.deepEqual(links("[x](//evil.example)"), []);
  assert.deepEqual(links("[x](data:text/html,hi)"), []);
  assert.deepEqual(links("[x](relative/path)"), []);
});

check("④ http(s)、mailto、站內、錨點放行", () => {
  assert.equal(links("[x](/notes/a)")[0].external, false);
  assert.equal(links("[x](https://a.b)")[0].external, true);
  assert.equal(links("[x](http://a.b)")[0].external, true);
  assert.equal(links("[x](mailto:a@b.c)")[0].external, true);
  assert.equal(links("[x](#c)")[0].href, "#c");
});

const targets = { tables: new Set(["customer", "contract"]), schemas: new Set(["customer", "crm"]) };

check("⑤ 無前綴撞名 → 表名優先", () => {
  assert.deepEqual(resolveCodeLink("customer", targets), { kind: "table", key: "customer", display: "customer" });
  assert.deepEqual(resolveCodeLink("crm", targets), { kind: "schema", key: "crm", display: "crm" });
  assert.equal(resolveCodeLink("nothing", targets), null);
});

check("⑥ schema: 前綴指定 schema，顯示去掉前綴", () => {
  assert.deepEqual(resolveCodeLink("schema:customer", targets), { kind: "schema", key: "customer", display: "customer" });
  assert.deepEqual(resolveCodeLink("table:contract", targets), { kind: "table", key: "contract", display: "contract" });
});

check("⑦ 前綴指向不存在 → null（呼叫端保留原字串）", () => {
  assert.equal(resolveCodeLink("table:nope", targets), null);
  assert.equal(resolveCodeLink("schema:nope", targets), null);
  assert.equal(resolveCodeLink("table:customer.id", targets), null);
  assert.equal(resolveCodeLink("Table:customer", targets), null);
});

check("⑧ 隱含模式（schemas 空）schema: 一律找不到", () => {
  const t = { tables: new Set(["a"]), schemas: new Set() };
  assert.equal(resolveCodeLink("schema:_all", t), null);
});

check("⑨ stripMarkdown first：跳過標題、去標記與前綴", () => {
  assert.equal(stripMarkdown("## 標題\n\n**粗** 與 `table:x`", "first"), "粗 與 x");
  assert.equal(stripMarkdown("第一段\n\n第二段", "first"), "第一段");
  assert.equal(stripMarkdown("段落\n- 清單", "first"), "段落");
  assert.equal(stripMarkdown("看 [文件](https://a.b) 與 ![圖](x.png)", "first"), "看 文件 與 圖");
  assert.equal(stripMarkdown(undefined, "first"), "");
});

check("⑩ v1.2 範例 meta.description 攤平無殘留符號", () => {
  for (const mode of ["first", "all"]) {
    const s = stripMarkdown(v12.meta.description, mode);
    assert.ok(s.length > 0);
    for (const bad of ["##", "**", "`", "](", "\n"]) assert.ok(!s.includes(bad), `${mode} 含 ${JSON.stringify(bad)}：${s}`);
  }
  assert.ok(stripMarkdown(v12.meta.description, "all").length > stripMarkdown(v12.meta.description, "first").length);
});

check("⑪ HTML 標籤：渲染時當文字、純文字模式移除", () => {
  const b = parseMarkdown("<script>alert(1)</script>");
  assert.equal(b[0].type, "p");
  assert.deepEqual(b[0].inline, [{ t: "text", v: "<script>alert(1)</script>" }]);
  assert.equal(stripMarkdown("<b>粗</b>字", "first"), "粗字");
});

check("⑫ 區塊解析：標題層級、清單型別、引言", () => {
  const b = parseMarkdown("# a\n## b\n### c\n- x\n- y\n1. z\n> q\n> r\n段落\n續行");
  assert.deepEqual(b.map((x) => x.type), ["h3", "h3", "h4", "ul", "ol", "quote", "p"]);
  assert.equal(b[3].items.length, 2);
  assert.deepEqual(b[5].inline, [{ t: "text", v: "q r" }]);
  assert.deepEqual(b[6].inline, [{ t: "text", v: "段落 續行" }]);
});

let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message.split("\n").join("\n    ")}`);
  }
}
if (failed) {
  console.error(`\n✗ er-markdown：${failed}／${cases.length} 項失敗`);
  process.exit(1);
}
console.log(`✓ er-markdown：${cases.length} 項通過`);
