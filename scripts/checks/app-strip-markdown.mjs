// app 端 meta.description 去 Markdown 的斷言（Task 85）。
//
// app（src/lib/strip-markdown.ts）與 ER plugin（markdown-text.ts）各有一份純文字實作 ——
// app 不能 import plugin。兩份分開寫，唯一防止它們漂移的就是這裡的逐字對照。
// 由 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripMarkdownAll, stripMarkdownFirst } from "../../src/lib/strip-markdown.ts";
import { stripMarkdown } from "../../plugins/er-diagram-renderer/markdown-text.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const v12 = JSON.parse(readFileSync(path.join(root, "plugins/er-diagram-renderer/example/schema.json"), "utf-8"));

const inputs = [
  v12.meta.description,
  ...(v12.schemas ?? []).map((s) => s.description),
  ...v12.groups.map((g) => g.description),
  ...v12.tables.map((t) => t.description),
  "純文字描述，沒有任何標記",
  "## 標題\n\n**粗** 與 `table:x`、`schema:crm`",
  "第一段\n\n第二段\n- 清單\n1. 有序\n> 引言",
  "看 [文件](https://a.b) 與 ![圖](x.png)、[壞](javascript:alert(1))",
  "<b>粗</b>字 <script>alert(1)</script>",
  "段落\n- 緊接清單",
  "# 只有標題",
  "",
  undefined,
].filter((x) => x !== null);

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

check(`app 與 plugin 的純文字輸出逐字相同（${inputs.length} 組輸入 × first／all）`, () => {
  for (const src of inputs) {
    assert.equal(stripMarkdownFirst(src), stripMarkdown(src, "first"), `first：${JSON.stringify(src)?.slice(0, 60)}`);
    assert.equal(stripMarkdownAll(src), stripMarkdown(src, "all"), `all：${JSON.stringify(src)?.slice(0, 60)}`);
  }
});

check("純文字單段的 description 原樣保留", () => {
  assert.equal(stripMarkdownFirst("36 張表、297 個欄位"), "36 張表、297 個欄位");
  assert.equal(stripMarkdownAll("36 張表、297 個欄位"), "36 張表、297 個欄位");
});

check("前綴去掉、標記不殘留", () => {
  assert.equal(stripMarkdownFirst("見 `table:customer`"), "見 customer");
  for (const s of [stripMarkdownFirst(v12.meta.description), stripMarkdownAll(v12.meta.description)]) {
    for (const bad of ["##", "**", "`", "](", "\n"]) assert.ok(!s.includes(bad), `含 ${JSON.stringify(bad)}：${s}`);
  }
});

if (failed) {
  console.error(`\n✗ app-strip-markdown：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ app-strip-markdown：通過");
