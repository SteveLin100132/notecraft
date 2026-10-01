// OpenAPI plugin 的迷你 Markdown 與 ER 版的行為對照（Task 99，規格 Q6）。
//
// 兩個 plugin 各自安裝、不能互相 import，所以 parser 各持一份。這裡拿同一組輸入
// （ER 範例資料的所有 description、OpenAPI 範例的所有 description、刻意的邊界字串）逐一比對輸出。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:oar

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as er from "../../plugins/er-diagram-renderer/markdown-text.ts";
import * as oa from "../../plugins/openapi-renderer/markdown-text.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const json = (p) => JSON.parse(readFileSync(path.join(root, p), "utf-8"));

/** 遞迴收集所有 description 字串 */
function descriptions(node, out = []) {
  if (Array.isArray(node)) node.forEach((x) => descriptions(x, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "description" && typeof v === "string") out.push(v);
      else descriptions(v, out);
    }
  }
  return out;
}

const inputs = [
  ...descriptions(json("plugins/er-diagram-renderer/example/schema.json")),
  ...descriptions(json("plugins/openapi-renderer/example/orders.openapi.json")),
  ...descriptions(json("plugins/openapi-renderer/example/petstore.openapi.json")),
  "[x](javascript:alert(1))",
  "[x](java\tscript:alert(1))",
  "[x](//evil.example) [y](data:text/html,hi) [z](/notes/a) [w](#op/x) [m](mailto:a@b.c)",
  "## 標題\n\n**粗** 與 `code`、[連結](https://a.b)\n- 一\n- 二\n1. 有序\n> 引言\n> 第二行",
  "<b>不渲染</b> <script>alert(1)</script>",
  "第一段\r\n\r\n第二段",
  "",
  undefined,
];

let failed = 0;
for (const [i, s] of inputs.entries()) {
  try {
    assert.deepEqual(oa.parseMarkdown(s), er.parseMarkdown(s));
    if (typeof s === "string") assert.deepEqual(oa.parseInline(s), er.parseInline(s));
  } catch (e) {
    failed++;
    console.error(`✗ 第 ${i} 個輸入兩邊輸出不同：${JSON.stringify(s)?.slice(0, 80)}\n  ${e.message.split("\n")[0]}`);
  }
}
for (const u of ["javascript:x", " JavaScript:x", "/notes/a", "//x", "#op/a", "https://a", "mailto:a@b"]) {
  try {
    assert.deepEqual(oa.safeHref(u), er.safeHref(u));
  } catch {
    failed++;
    console.error(`✗ safeHref(${JSON.stringify(u)}) 兩邊不同`);
  }
}

if (failed) {
  console.error(`\n✗ oar-markdown：${failed} 項失敗`);
  process.exit(1);
}
console.log(`✓ oar-markdown：${inputs.length} 組輸入與 ER parser 輸出一致`);
