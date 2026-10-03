// 檢查更新：Rail 圓點預繪函式的斷言（Task 113；規格 docs/notecraft-workbench-update-check.md §7）。
// railHint 以 toString() 內嵌進 inline script —— 這裡用同一條路（new Function）重建，並與 update-check.ts 的 railHintOf 對照。
// 由 scripts/check-plugins.mjs 串接執行；單跑 npm run check:upd

import assert from "node:assert/strict";
import { railHint } from "../../src/lib/update-prepaint.ts";
import { deriveResult, railHintOf } from "../../src/lib/update-check.ts";

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

const rebuilt = new Function("return (" + railHint.toString() + ")")();
const pack = (latest, list, extra = {}) => ({
  "dist-tags": { latest },
  versions: Object.fromEntries(list.map((v) => [v, { ...(extra[v] ?? {}) }])),
  time: {},
});
const cache = (res, o = {}) => JSON.stringify({ cur: res.cur, at: 1, res, toasted: null, skipped: null, ...o });

console.log("upd-prepaint");

check("自足：重建後可執行", () => {
  assert.equal(typeof rebuilt, "function");
  assert.equal(rebuilt(null, "1.8.5"), null);
});

check("與 railHintOf 一致", () => {
  const cases = [
    [deriveResult(pack("1.9.0", ["1.8.5", "1.8.6", "1.9.0"]), "1.8.5", "22"), null],
    [deriveResult(pack("2.0.0", ["1.8.5", "2.0.0"]), "1.8.5", "22"), null],
    [deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"]), "1.8.5", "22"), "1.9.0"],
    [deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"], { "1.8.5": { deprecated: "x" } }), "1.8.5", "22"), "1.9.0"],
    [deriveResult(pack("1.8.5", ["1.8.5"]), "1.8.5", "22"), null],
    [deriveResult(pack("1.8.5", ["1.8.5"]), "1.9.0", "22"), null],
  ];
  for (const [res, skipped] of cases) {
    const a = rebuilt(cache(res, { skipped }), res.cur);
    const b = railHintOf(res, skipped);
    assert.deepEqual(a, b ? { tone: b.tone, label: b.label } : null);
  }
});

check("cur 不符 → null", () => {
  const res = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"]), "1.8.5", "22");
  assert.equal(rebuilt(cache(res), "1.8.6"), null);
});

check("略過 → null；略過但已棄用 → 有值", () => {
  const res = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"]), "1.8.5", "22");
  assert.equal(rebuilt(cache(res, { skipped: "1.9.0" }), "1.8.5"), null);
  const d = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"], { "1.8.5": { deprecated: "x" } }), "1.8.5", "22");
  assert.equal(rebuilt(cache(d, { skipped: "1.9.0" }), "1.8.5").tone, "danger");
});

check("壞資料不 throw", () => {
  assert.equal(rebuilt("{", "1.8.5"), null);
  assert.equal(rebuilt("null", "1.8.5"), null);
  assert.equal(rebuilt('{"cur":"1.8.5","res":1}', "1.8.5"), null);
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
