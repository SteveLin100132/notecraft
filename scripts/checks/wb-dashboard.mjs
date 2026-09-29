// Dashboard 總覽純函式的斷言（Task 87，規格 docs/notecraft-workbench-dashboard.md §4.3）。
// treemap 的面積守恆／不重疊／成比例、週窗與分格的一致性 —— 這些壞了 build 仍全綠，只有這裡抓得到。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import { countByStatus, tileStyleIndex, tileTier, topTagsWithRest, treemap } from "../../src/lib/wb-dashboard.ts";
import { mdShort, weekBuckets, weekOf, weekWindow } from "../../src/lib/wb-time.ts";

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
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const overlap = (p, q) => Math.max(0, Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x)) * Math.max(0, Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y));

const inputs = [
  [7],
  [9, 3],
  [50, 1],
  [10, 5, 3, 2, 1],
  [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [100, 2, 2, 2],
];

check(`treemap 面積守恆、不重疊、與 v 成比例（${inputs.length} 組）`, () => {
  for (const vs of inputs) {
    const items = vs.map((v, i) => ({ k: "t" + i, v }));
    const tiles = treemap(items, 0, 0, 100, 100);
    assert.equal(tiles.length, items.length, `塊數 ${vs}`);
    const area = tiles.reduce((a, t) => a + t.w * t.h, 0);
    assert.ok(near(area, 10000), `面積總和 ${area}（${vs}）`);
    const tot = vs.reduce((a, b) => a + b, 0);
    for (const t of tiles) {
      assert.ok(t.w > 0 && t.h > 0, `零寬高：${JSON.stringify(t)}`);
      assert.ok(near((t.w * t.h) / 10000, t.v / tot), `比例 ${t.k}：${(t.w * t.h) / 10000} vs ${t.v / tot}`);
      assert.ok(t.x >= -1e-9 && t.y >= -1e-9 && t.x + t.w <= 100 + 1e-9 && t.y + t.h <= 100 + 1e-9, `出界：${JSON.stringify(t)}`);
    }
    for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) assert.ok(near(overlap(tiles[i], tiles[j]), 0), `重疊 ${tiles[i].k}／${tiles[j].k}`);
  }
});

check("treemap 退化：單一項填滿、空陣列回空、v 為 0 的項略過", () => {
  assert.deepEqual(treemap([{ k: "a", v: 3 }], 0, 0, 100, 100), [{ k: "a", v: 3, x: 0, y: 0, w: 100, h: 100 }]);
  assert.deepEqual(treemap([], 0, 0, 100, 100), []);
  assert.equal(treemap([{ k: "a", v: 3 }, { k: "b", v: 0 }], 0, 0, 100, 100).length, 1);
  assert.deepEqual(treemap([{ k: "a", v: 0 }], 0, 0, 100, 100), []);
});

check("tileTier 邊界", () => {
  assert.equal(tileTier(120, 84), "big");
  assert.equal(tileTier(119, 84), "full");
  assert.equal(tileTier(60, 42), "full");
  assert.equal(tileTier(59, 42), "num");
  assert.equal(tileTier(24, 22), "num");
  assert.equal(tileTier(23, 22), "none");
  assert.equal(tileTier(0, 0), "none");
});

check("topTagsWithRest：前 11 + 其他；11 個以內無其他；其他值 0 不加", () => {
  const mk = (n) => Array.from({ length: n }, (_, i) => ({ name: "t" + i, count: 20 - i }));
  const twelve = mk(12);
  const useTotal = twelve.reduce((a, t) => a + t.count, 0);
  const r = topTagsWithRest(twelve.slice(0, 11), 11, 12, useTotal);
  assert.equal(r.length, 12);
  assert.equal(r[11].k, "__rest");
  assert.equal(r[11].l, "其他 1 個");
  assert.equal(r[11].v, twelve[11].count);
  assert.equal(r[11].rest, true);
  const eleven = mk(11);
  const r2 = topTagsWithRest(eleven, 11, 11, eleven.reduce((a, t) => a + t.count, 0));
  assert.equal(r2.length, 11);
  assert.ok(r2.every((t) => !t.rest));
  const r3 = topTagsWithRest(eleven, 11, 15, eleven.reduce((a, t) => a + t.count, 0)); // 多 4 個標籤但用量 0
  assert.equal(r3.length, 11);
  assert.deepEqual(topTagsWithRest([], 11, 0, 0), []);
});

check("tileStyleIndex：0–2 固定、之後 3–5 循環、其他 −1", () => {
  assert.deepEqual(Array.from({ length: 9 }, (_, i) => tileStyleIndex(i, false)), [0, 1, 2, 3, 4, 5, 3, 4, 5]);
  assert.equal(tileStyleIndex(11, true), -1);
});

check("countByStatus", () => {
  assert.deepEqual(countByStatus(["done", "reading", "done", "not-started"]), { done: 2, reading: 1, "not-started": 1 });
  assert.deepEqual(countByStatus([]), { done: 0, reading: 0, "not-started": 0 });
});

const now = new Date(2026, 8, 29, 15, 30); // 2026-09-29 當地下午

check("weekWindow(0)：結束日是今天、7 天、連續", () => {
  const w = weekWindow(0, now);
  assert.equal(w.end, "2026-09-29");
  assert.equal(w.start, "2026-09-23");
  assert.equal(w.days.length, 7);
  assert.equal(w.days[0], w.start);
  assert.equal(w.days[6], w.end);
  const w1 = weekWindow(1, now);
  assert.equal(w1.end, "2026-09-22");
  assert.equal(w1.start, "2026-09-16");
  const wm = weekWindow(5, now); // 跨月
  assert.equal(wm.end, "2026-08-25");
  assert.equal(wm.start, "2026-08-19");
});

check("weekOf 與 weekBuckets 分格一致；窗外 −1", () => {
  const dates = ["2026-09-29", "2026-09-23", "2026-09-22", "2026-09-01", "2026-07-01", "2026-10-05", "bad"];
  const n = 12;
  const buckets = weekBuckets(dates, n, now);
  const counts = Array.from({ length: n }, () => 0);
  for (const d of dates) {
    const i = weekOf(d, n, now);
    if (i >= 0) counts[i] += 1;
  }
  assert.deepEqual(
    buckets.map((b) => b.count),
    counts,
  );
  assert.equal(weekOf("2026-09-29", n, now), n - 1);
  assert.equal(weekOf("2026-09-23", n, now), n - 1);
  assert.equal(weekOf("2026-09-22", n, now), n - 2);
  assert.equal(weekOf("2026-07-01", n, now), -1); // 90 天前，超過 12 週
  assert.equal(weekOf("2026-10-05", n, now), -1); // 未來
  assert.equal(weekOf("bad", n, now), -1);
});

check("weekBuckets 的 label 是該週結束日 M/D，最後一格是今天", () => {
  const b = weekBuckets([], 8, now);
  assert.equal(b.length, 8);
  assert.equal(b[7].label, "9/29");
  assert.equal(b[6].label, "9/22");
  assert.equal(b[0].label, "8/11");
});

check("mdShort 不補零", () => {
  assert.equal(mdShort("2026-09-08"), "9/8");
  assert.equal(mdShort("2026-12-31"), "12/31");
  assert.equal(mdShort("2026-01-01T00:00:00"), "1/1");
  assert.equal(mdShort("x"), "x");
});

if (failed) {
  console.error(`\n✗ wb-dashboard：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ wb-dashboard：通過");
