// app 端資料檔 meta 取值的斷言（Task 98）。
//
// manifest 可用 `meta`（JSON Pointer）改指標題／描述／backTo 的來源；沒宣告時要與以前一樣讀 data.meta.*。
// 後者是 ER plugin 的行為，這裡同時當回歸測試。由 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { pickMeta, resolvePointer } from "../../src/lib/plugin-meta.ts";

let failed = 0;
function check(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n  ${e.message.split("\n").join("\n  ")}`);
  }
}

const doc = {
  openapi: "3.1.0",
  info: { title: "訂單 API", description: "**粗**說明", version: "1" },
  "a/b": { "c~d": "跳脫" },
  arr: ["零", "一"],
  "x-notecraft-back-to": "/notes/api",
  meta: { title: "舊標題", description: "舊描述", backTo: "/notes/old" },
};

check("resolvePointer：空字串指整份", () => assert.equal(resolvePointer(doc, ""), doc));
check("resolvePointer：一般路徑", () => assert.equal(resolvePointer(doc, "/info/title"), "訂單 API"));
check("resolvePointer：~1 與 ~0 跳脫", () => assert.equal(resolvePointer(doc, "/a~1b/c~0d"), "跳脫"));
check("resolvePointer：陣列索引", () => assert.equal(resolvePointer(doc, "/arr/1"), "一"));
check("resolvePointer：陣列非數字索引", () => assert.equal(resolvePointer(doc, "/arr/x"), undefined));
check("resolvePointer：不存在", () => assert.equal(resolvePointer(doc, "/info/nope/deeper"), undefined));
check("resolvePointer：不以 / 開頭", () => assert.equal(resolvePointer(doc, "info/title"), undefined));
check("resolvePointer：不走原型鏈", () => assert.equal(resolvePointer(doc, "/info/toString"), undefined));

check("沒有 metaMap → 讀 data.meta（ER 回歸）", () => {
  assert.equal(pickMeta(doc, "title").value, "舊標題");
  assert.equal(pickMeta(doc, "description").value, "舊描述");
  assert.equal(pickMeta(doc, "backTo").value, "/notes/old");
  assert.equal(pickMeta(doc, "backTo").source, "meta.backTo");
});

check("metaMap 三鍵都宣告", () => {
  const map = { title: "/info/title", description: "/info/description", backTo: "/x-notecraft-back-to" };
  assert.equal(pickMeta(doc, "title", map).value, "訂單 API");
  assert.equal(pickMeta(doc, "description", map).value, "**粗**說明");
  const b = pickMeta(doc, "backTo", map);
  assert.equal(b.value, "/notes/api");
  assert.equal(b.source, "x-notecraft-back-to");
});

check("metaMap 只宣告 title → 其餘仍讀 data.meta", () => {
  const map = { title: "/info/title" };
  assert.equal(pickMeta(doc, "title", map).value, "訂單 API");
  assert.equal(pickMeta(doc, "description", map).value, "舊描述");
});

check("取到非字串 → value undefined、present true", () => {
  const p = pickMeta(doc, "title", { title: "/info" });
  assert.equal(p.value, undefined);
  assert.equal(p.present, true);
});

check("指到不存在 → present false", () => {
  const p = pickMeta({ info: {} }, "backTo", { backTo: "/x-notecraft-back-to" });
  assert.equal(p.present, false);
});

check("資料檔不是 object", () => {
  assert.equal(pickMeta(null, "title").value, undefined);
  assert.equal(pickMeta([1], "title", { title: "/0" }).value, undefined);
});

if (failed) {
  console.error(`\n✗ app-plugin-meta：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ app-plugin-meta：通過");
