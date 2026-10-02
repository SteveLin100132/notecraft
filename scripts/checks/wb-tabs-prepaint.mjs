// 頁籤列預繪的斷言（Task 110，規格 docs/notecraft-workbench-loading-transitions.md §6）。
// 預繪層與 TabBar island 的順序不一致時，hydrate 那一刻頁籤會換位置；這裡以隨機資料對照 wb-tabs.ts 的 ensure。
// 兩個函式以 toString() 內嵌進 inline script，所以也斷言「重建後行為相同」。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import { prepaintHtml, prepaintTabs } from "../../src/lib/wb-tabs-prepaint.ts";
import { ensure, parseStore, TAB_MAX } from "../../src/lib/wb-tabs.ts";
import { seriesDone } from "../../src/lib/series-progress-pure.ts";

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

// 決定性的亂數（mulberry32），失敗時可重現
let seed = 20261002;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entry = (kind, id, o = {}) => ({ kind, id, key: `${kind}:${id}`, pinned: false, scroll: 0, at: 1, title: `T ${id}`, path: `${id}.mdx`, pending: 0, ...o });
const raw = (tabs) => JSON.stringify({ v: 1, tabs, closed: [] });
const ICONS = { file: "<svg>f</svg>", pin: "<svg>p</svg>", x: "<svg>x</svg>", chevron: "<svg>c</svg>" };
const COLORS = { on: "var(--on)", off: "var(--off)", view: "var(--view)" };

console.log("wb-tabs-prepaint");

check("與 ensure 的順序一致（隨機 200 組）", () => {
  for (let n = 0; n < 200; n++) {
    const count = Math.floor(rnd() * 12);
    const tabs = [];
    for (let i = 0; i < count; i++) {
      tabs.push(entry(rnd() < 0.2 ? "view" : "note", `n${i}`, { pinned: rnd() < 0.25, at: Math.floor(rnd() * 1000) }));
    }
    const inList = count > 0 && rnd() < 0.5;
    const self = inList
      ? { kind: tabs[0].kind, id: tabs[0].id, title: "新標題", path: "p", pending: 2 }
      : { kind: "note", id: "self", title: "自己", path: "self.mdx", pending: 0 };
    const r = raw(tabs);
    const want = ensure(parseStore(r), self, 5000).store.tabs.map((t) => t.key);
    const got = prepaintTabs(r, self, "").map((t) => t.key);
    assert.deepEqual(got, want, `case ${n}`);
  }
});

check("active 只有目前頁；快照用目前頁的值", () => {
  const r = raw([entry("note", "a", { at: 3 }), entry("note", "b", { at: 9 })]);
  const got = prepaintTabs(r, { kind: "note", id: "a", title: "A 新", path: "a.mdx", pending: 1 }, "");
  assert.deepEqual(got.map((t) => t.on), [true, false]);
  assert.equal(got[0].title, "A 新");
  assert.equal(got[0].tip, "A 新\na.mdx\n待生成 AI 標記 1");
  assert.equal(prepaintTabs(r, null, "").some((t) => t.on), false);
});

check("新頁插在 at 最大者右側", () => {
  const r = raw([entry("note", "a", { at: 1 }), entry("note", "b", { at: 3 }), entry("note", "c", { at: 2 })]);
  assert.deepEqual(prepaintTabs(r, { kind: "note", id: "d", title: "D", path: "", pending: 0 }, "").map((t) => t.key), ["note:a", "note:b", "note:d", "note:c"]);
});

check("壞資料", () => {
  for (const r of [null, "", "{", '{"v":2,"tabs":[]}', '{"v":1,"tabs":"x"}']) assert.deepEqual(prepaintTabs(r, null, ""), [], String(r));
  const r = JSON.stringify({ v: 1, tabs: [{ kind: "note", id: "a", key: "note:a" }, entry("note", "b")] });
  assert.deepEqual(prepaintTabs(r, null, "").map((t) => t.key), ["note:b"]);
});

check("href：CJK 原樣、BASE 前綴", () => {
  const r = raw([entry("note", "中文/筆記"), entry("view", "api/orders.openapi")]);
  assert.deepEqual(prepaintTabs(r, null, "").map((t) => t.href), ["/notes/中文/筆記", "/view/api/orders.openapi"]);
  assert.deepEqual(prepaintTabs(r, null, "/x").map((t) => t.href), ["/x/notes/中文/筆記", "/x/view/api/orders.openapi"]);
});

check("超過上限時不淘汰（交給 island）", () => {
  const tabs = Array.from({ length: TAB_MAX }, (_, i) => entry("note", `n${i}`, { at: i }));
  assert.equal(prepaintTabs(raw(tabs), { kind: "note", id: "new", title: "N", path: "", pending: 0 }, "").length, TAB_MAX + 1);
});

check("HTML：結構、跳脫、指示器只有一個", () => {
  const tabs = prepaintTabs(raw([entry("note", "a", { pinned: true, title: "<b>&\"'" }), entry("note", "b")]), { kind: "note", id: "b", title: "B", path: "", pending: 0 }, "");
  const h = prepaintHtml(tabs, ICONS, COLORS);
  assert.ok(h.includes("&lt;b&gt;&amp;&quot;&#39;"), "標題要跳脫");
  assert.equal(h.split('class="nt-ind"').length - 1, 1);
  assert.ok(h.includes('<span class="nt-sep"></span>'), "固定與一般之間有分隔線");
  assert.ok(h.includes('<span class="tnum">2</span>'));
  assert.ok(h.includes('class="nt-tab on"'));
  assert.ok(h.includes('class="nt-tab pinned"'));
  assert.ok(!h.includes("<button"), "預繪層不放按鈕");
  assert.ok(prepaintHtml([], ICONS, COLORS).includes("nt-empty"));
});

check("toString 重建後行為相同", () => {
  const pt = new Function(`return (${prepaintTabs.toString()})`)();
  const ph = new Function(`return (${prepaintHtml.toString()})`)();
  const r = raw([entry("note", "a", { pinned: true }), entry("view", "x", { at: 5 }), entry("note", "c", { at: 2 })]);
  const self = { kind: "note", id: "z", title: "Z", path: "z.mdx", pending: 0 };
  assert.deepEqual(pt(r, self, "/b"), prepaintTabs(r, self, "/b"));
  assert.equal(ph(pt(r, self, ""), ICONS, COLORS), prepaintHtml(prepaintTabs(r, self, ""), ICONS, COLORS));
});

check("seriesDone：只算 done、view: 前綴原樣、可內嵌", () => {
  const map = { a: "done", b: "reading", "view:a": "done", c: "done" };
  assert.deepEqual(seriesDone(map, ["a", "b", "view:a", "x"]), { done: 2, total: 4, pct: 50 });
  assert.deepEqual(seriesDone({}, []), { done: 0, total: 0, pct: 0 });
  assert.deepEqual(seriesDone(map, ["view:b"]), { done: 0, total: 1, pct: 0 });
  const sd = new Function(`return (${seriesDone.toString()})`)();
  assert.deepEqual(sd(map, ["a", "c", "b"]), seriesDone(map, ["a", "c", "b"]));
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
