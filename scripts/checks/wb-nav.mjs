// 換頁轉場分類的斷言（Task 109，規格 docs/notecraft-workbench-loading-transitions.md §5.2）。
// 分類錯了轉場會用錯動畫或該轉不轉，build 仍全綠，只有這裡抓得到。
// 兩個函式以 toString() 內嵌進 inline script，所以也斷言「重建後行為相同」。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import { navKind, vtType } from "../../src/lib/wb-nav.ts";

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

const HUB = ["/", "/notes", "/notes/", "/plugins", "/plugins/folder/api", "/settings", "/series", "/series/rr", "/series/rr/", "/tags"];
const LEAF = ["/notes/a/b", "/notes/%E4%B8%AD%E6%96%87", "/notes/中文/", "/view/api/orders.openapi"];
const NONE = ["/present/x", "/wb-index.json", "/foo", "/pluginsx", "/notesx/a"];

console.log("wb-nav");

check("hub", () => HUB.forEach((p) => assert.equal(navKind(p, ""), "hub", p)));
check("leaf", () => LEAF.forEach((p) => assert.equal(navKind(p, ""), "leaf", p)));
check("none", () => NONE.forEach((p) => assert.equal(navKind(p, ""), "none", p)));

check("BASE 前綴", () => {
  const b = "/notecraft/demo";
  assert.equal(navKind("/notecraft/demo", b), "hub");
  assert.equal(navKind("/notecraft/demo/", b), "hub");
  assert.equal(navKind("/notecraft/demo/notes/x", b), "leaf");
  assert.equal(navKind("/notecraft/demo/present/x", b), "none");
  // 冪等：不帶前綴的路徑照樣判得出（與 stripBase 一致）
  assert.equal(navKind("/notes/x", b), "leaf");
});

check("vtType 三種", () => {
  assert.equal(vtType("/notes", "/notes/a", ""), "drill");
  assert.equal(vtType("/", "/view/x.er", ""), "drill");
  assert.equal(vtType("/series/rr", "/notes/a", ""), "drill");
  assert.equal(vtType("/notes/a", "/notes/b", ""), "peer");
  assert.equal(vtType("/notes/a", "/view/x", ""), "peer");
  assert.equal(vtType("/notes/a", "/notes", ""), "section");
  assert.equal(vtType("/", "/plugins", ""), "section");
});

check("vtType 不轉場", () => {
  assert.equal(vtType(null, "/notes/a", ""), null);
  assert.equal(vtType("", "/notes/a", ""), null);
  assert.equal(vtType("/present/a", "/notes/a", ""), null);
  assert.equal(vtType("/notes/a", "/present/a", ""), null);
  assert.equal(vtType("https://other.example/notes/a", "http://localhost:4329/notes/b", ""), null);
});

check("vtType 完整網址與 BASE", () => {
  assert.equal(vtType("http://localhost:4329/notes/a", "http://localhost:4329/notes/b", ""), "peer");
  assert.equal(vtType("http://h/notecraft/demo/notes", "http://h/notecraft/demo/notes/%E4%B8%AD", "/notecraft/demo"), "drill");
});

check("toString 重建後行為相同", () => {
  const nk = new Function(`return (${navKind.toString()})`)();
  const vt = new Function(`return (${vtType.toString()})`)();
  for (const p of [...HUB, ...LEAF, ...NONE]) assert.equal(nk(p, ""), navKind(p, ""), p);
  const pairs = [["/notes", "/notes/a"], ["/notes/a", "/notes/b"], ["/notes/a", "/"], ["/present/a", "/notes/a"], [null, "/notes"]];
  for (const [f, t] of pairs) assert.equal(vt(f, t, ""), vtType(f, t, ""), `${f} → ${t}`);
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
