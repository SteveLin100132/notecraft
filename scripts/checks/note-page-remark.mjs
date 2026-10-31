// 筆記頁改版的 remark 純函式斷言（Task 138、142，規格 docs/notecraft-workbench-note-page.md §5.2、§5.5）：
// `==螢光==`（remark-notecraft-mark.ts）與待生成標記卡片（remark-notecraft-ai-markers.ts）。
// 以假的 mdast 直接跑 transformer，不經過 unified。由 check:wb 與 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import remarkNotecraftMark from "../../src/lib/remark-notecraft-mark.ts";
import remarkNotecraftAiMarkers from "../../src/lib/remark-notecraft-ai-markers.ts";

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
console.log("note-page-remark");

const para = (...children) => ({ type: "root", children: [{ type: "paragraph", children }] });
const marks = (tree) => tree.children[0].children.filter((n) => n.type === "ncMark").map((n) => n.children[0].value);
const runMark = (tree) => (remarkNotecraftMark()(tree), tree);

check("==文字== 變 <mark>，前後文字保留", () => {
  const t = runMark(para({ type: "text", value: "可以 ==螢光== 與 ==兩段== 標記" }));
  assert.deepEqual(marks(t), ["螢光", "兩段"]);
  assert.equal(t.children[0].children[0].value, "可以 ");
  assert.equal(t.children[0].children.at(-1).value, " 標記");
});
check("不算：=== 、空內容、頭尾空白、跨行、行內程式碼", () => {
  for (const v of ["a === b", "a ==== b", "== x ==", "==a\nb==", "x == y == z"]) {
    assert.deepEqual(marks(runMark(para({ type: "text", value: v }))), [], v);
  }
  const t = runMark(para({ type: "inlineCode", value: "==code==" }));
  assert.equal(t.children[0].children[0].type, "inlineCode");
});
check("巢狀節點裡的文字也處理（粗體內）", () => {
  const t = runMark(para({ type: "strong", children: [{ type: "text", value: "==粗==" }] }));
  assert.equal(t.children[0].children[0].children[0].type, "ncMark");
});

const marker = (status) => ({
  type: "mdxFlowExpression",
  value: `/* @ai-visualize\nid: demo-${status}\ntype: chart\nprompt: |\n  畫一張圖\nstatus: ${status}\n*/`,
});
check("pending／failed 在註解後插卡片，generated／locked 不插", () => {
  const tree = { type: "root", children: ["pending", "generated", "failed", "locked"].map(marker) };
  remarkNotecraftAiMarkers()(tree);
  const cards = tree.children.filter((n) => n.type === "ncElement");
  assert.deepEqual(cards.map((c) => c.data.hProperties["data-nc-aim"]), ["demo-pending", "demo-failed"]);
  assert.equal(tree.children[1].type, "ncElement", "卡片緊接在自己的註解後面");
  for (const c of cards) assert.equal(c.data.hProperties["data-pagefind-ignore"], "");
});
check("YAML 壞掉、不是標記的註解：略過、不 throw", () => {
  const tree = { type: "root", children: [{ type: "mdxFlowExpression", value: "/* 一般註解 */" }, { type: "mdxFlowExpression", value: "/* @ai-visualize\n沒有 id\n*/" }] };
  remarkNotecraftAiMarkers()(tree);
  assert.equal(tree.children.length, 2);
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
