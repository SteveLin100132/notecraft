// 筆記頁籤純函式的斷言（Task 105，規格 docs/notecraft-workbench-note-tabs.md §4.2）。
// 插入位置、LRU 淘汰、固定不可關、關閉後導覽到誰 —— 這些壞了 build 仍全綠，只有這裡抓得到。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import {
  TAB_MAX,
  close,
  closeAll,
  closeOthers,
  closeRight,
  cycle,
  emptyStore,
  ensure,
  hrefOf,
  move,
  neighborAfterClose,
  normalize,
  parseStore,
  popClosed,
  prune,
  refreshSnapshot,
  setScroll,
  tabKey,
  tabStorageKey,
  tabTooltip,
  togglePin,
} from "../../src/lib/wb-tabs.ts";

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

const mk = (id, at = 0, extra = {}) => ({
  kind: "note",
  id,
  key: `note:${id}`,
  pinned: false,
  scroll: 0,
  at,
  title: id.toUpperCase(),
  path: `${id}.mdx`,
  pending: 0,
  ...extra,
});
const self = (id, extra = {}) => ({ kind: "note", id, title: id.toUpperCase(), path: `${id}.mdx`, pending: 0, ...extra });
const st = (tabs, closed = []) => ({ v: 1, tabs, closed });
const ids = (s) => s.tabs.map((t) => t.id).join(" ");

check("插入在 at 最大者右側", () => {
  const s = st([mk("a", 1), mk("b", 3), mk("c", 2)]);
  const { store, evicted } = ensure(s, self("d"), 10);
  assert.equal(ids(store), "a b d c");
  assert.equal(evicted, null);
  assert.equal(store.tabs[2].at, 10);
});

check("已存在：不改順序、只更新 at 與快照", () => {
  const s = st([mk("a", 1), mk("b", 3, { scroll: 120 }), mk("c", 2)]);
  const { store } = ensure(s, self("b", { title: "新標題", pending: 2 }), 9);
  assert.equal(ids(store), "a b c");
  assert.equal(store.tabs[1].at, 9);
  assert.equal(store.tabs[1].title, "新標題");
  assert.equal(store.tabs[1].pending, 2);
  assert.equal(store.tabs[1].scroll, 120);
});

check("空清單 ensure", () => {
  const { store } = ensure(emptyStore(), { kind: "view", id: "api/x.openapi", title: "X", path: "api/x.openapi.json", pending: 0 }, 1);
  assert.equal(store.tabs.length, 1);
  assert.equal(store.tabs[0].key, "view:api/x.openapi");
  assert.equal(store.tabs[0].pinned, false);
});

check("不改傳入值", () => {
  const s = st([mk("a", 1)]);
  const before = JSON.stringify(s);
  ensure(s, self("b"), 2);
  close(s, ["note:a"]);
  togglePin(s, "note:a");
  assert.equal(JSON.stringify(s), before);
});

check("固定排前、togglePin", () => {
  const s = normalize(st([mk("a"), mk("b", 0, { pinned: true }), mk("c")]));
  assert.equal(ids(s), "b a c");
  assert.equal(ids(togglePin(s, "note:c")), "b c a");
  // 取消固定：留在一般區最前（原位置），不跳回原本的索引
  assert.equal(ids(togglePin(s, "note:b")), "b a c");
  assert.equal(togglePin(s, "note:b").tabs[0].pinned, false);
});

check("新頁籤不會插進固定區", () => {
  const s = st([mk("p", 9, { pinned: true }), mk("a", 1)]);
  const { store } = ensure(s, self("n"), 10);
  assert.equal(ids(store), "p n a");
  assert.equal(store.tabs[0].pinned, true);
});

check("跨區移動無效", () => {
  const s = st([mk("p", 0, { pinned: true }), mk("a"), mk("b")]);
  assert.equal(move(s, "note:p", "note:b"), s);
  assert.equal(move(s, "note:a", "note:p"), s);
});

check("同區移動（先移除再插到 to 原索引）", () => {
  const s = st([mk("a"), mk("b"), mk("c"), mk("d")]);
  assert.equal(ids(move(s, "note:a", "note:c")), "b c a d");
  assert.equal(ids(move(s, "note:d", "note:b")), "a d b c");
  assert.equal(move(s, "note:a", "note:a"), s);
});

check("LRU 淘汰：最舊的未固定，不動固定與新開", () => {
  const tabs = [mk("pin", 0, { pinned: true })];
  for (let i = 0; i < TAB_MAX; i++) tabs.push(mk(`n${i}`, 100 + i));
  tabs[5] = { ...tabs[5], at: 1 }; // n4 最舊
  const { store, evicted } = ensure(st(tabs), self("new"), 1000);
  assert.ok(evicted);
  assert.equal(evicted.id, "n4");
  assert.equal(store.tabs.filter((t) => !t.pinned).length, TAB_MAX);
  assert.ok(store.tabs.some((t) => t.id === "pin"));
  assert.ok(store.tabs.some((t) => t.id === "new"));
  assert.equal(store.closed[0].id, "n4");
});

check("未滿上限不淘汰；固定不計入上限", () => {
  const tabs = [];
  for (let i = 0; i < 5; i++) tabs.push(mk(`p${i}`, i, { pinned: true }));
  for (let i = 0; i < TAB_MAX - 1; i++) tabs.push(mk(`n${i}`, 10 + i));
  const { evicted } = ensure(st(tabs), self("new"), 1000);
  assert.equal(evicted, null);
});

check("closed：上限 10、新的在前、去重", () => {
  let s = st(Array.from({ length: 12 }, (_, i) => mk(`t${i}`, i)));
  for (let i = 0; i < 12; i++) s = close(s, [`note:t${i}`]);
  assert.equal(s.closed.length, 10);
  assert.equal(s.closed[0].id, "t11");
  assert.equal(s.closed[9].id, "t2");
  // 同一個 key 再關一次只留一筆
  let r = st([mk("a"), mk("b")]);
  r = close(r, ["note:a"]);
  r = { ...r, tabs: [...r.tabs, mk("a")] };
  r = close(r, ["note:a"]);
  assert.equal(r.closed.filter((t) => t.id === "a").length, 1);
});

check("批次關閉順序：最後關的在最前", () => {
  const s = close(st([mk("a"), mk("b"), mk("c")]), ["note:a", "note:b", "note:c"]);
  assert.deepEqual(s.closed.map((t) => t.id), ["c", "b", "a"]);
});

check("固定頁籤不可關", () => {
  const s = st([mk("p", 0, { pinned: true }), mk("a"), mk("b"), mk("c")]);
  assert.equal(ids(close(s, ["note:p"])), "p a b c");
  assert.equal(ids(closeAll(s)), "p");
  assert.equal(ids(closeOthers(s, "note:b")), "p b");
  assert.equal(ids(closeRight(s, "note:a")), "p a");
  assert.equal(ids(closeRight(s, "note:p")), "p");
});

check("關閉後的鄰居", () => {
  const s = st([mk("a"), mk("b"), mk("c")]);
  assert.equal(neighborAfterClose(s, "note:b").id, "c");
  assert.equal(neighborAfterClose(s, "note:c").id, "b");
  assert.equal(neighborAfterClose(st([mk("a")]), "note:a"), null);
  // closeRight(a) 而 active 是 c：c 被關，鄰居要跳過 b、c → a
  assert.equal(neighborAfterClose(s, "note:c", new Set(["note:b", "note:c"])).id, "a");
});

check("popClosed：跳過不存在與已開，保留 scroll", () => {
  const s = st([mk("y", 1), mk("w", 2)], [mk("x"), mk("y"), mk("z", 0, { scroll: 345, pinned: true })]);
  const { store, entry } = popClosed(s, (k) => k !== "note:x", 50);
  assert.equal(entry.id, "z");
  assert.equal(entry.scroll, 345);
  assert.equal(entry.pinned, false);
  assert.equal(ids(store), "y w z");
  assert.deepEqual(store.closed.map((t) => t.id), ["x", "y"]);
  const none = popClosed(st([], [mk("x")]), () => false, 1);
  assert.equal(none.entry, null);
});

check("prune：tabs 與 closed 都清", () => {
  const s = st([mk("a"), mk("gone1"), mk("b"), mk("gone2")], [mk("gone3"), mk("c")]);
  const { store, removed } = prune(s, (k) => !k.includes("gone"));
  assert.equal(removed.length, 2);
  assert.equal(ids(store), "a b");
  assert.deepEqual(store.closed.map((t) => t.id), ["c"]);
  const same = st([mk("a")]);
  assert.equal(prune(same, () => true).store, same);
});

check("cycle", () => {
  const s = st([mk("a", 1), mk("b", 5), mk("c", 2)]);
  assert.equal(cycle(s, "note:b", 1).id, "c");
  assert.equal(cycle(s, "note:c", 1).id, "a");
  assert.equal(cycle(s, "note:a", -1).id, "c");
  assert.equal(cycle(s, null, 1).id, "b");
  assert.equal(cycle(s, "note:zzz", -1).id, "b");
  assert.equal(cycle(emptyStore(), null, 1), null);
});

check("setScroll", () => {
  const s = st([mk("a")]);
  assert.equal(setScroll(s, "note:a", 12.6).tabs[0].scroll, 13);
  assert.equal(setScroll(s, "note:a", -4).tabs[0].scroll, 0);
  assert.equal(setScroll(s, "note:x", 9), s);
});

check("refreshSnapshot", () => {
  const s = st([mk("a"), mk("b")], [mk("c")]);
  const r = refreshSnapshot(s, (t) => (t.id === "b" ? null : { title: `新${t.id}`, path: `x/${t.id}.mdx`, pending: 3 }));
  assert.equal(r.tabs[0].title, "新a");
  assert.equal(r.tabs[0].pending, 3);
  assert.equal(r.tabs[1].title, "B");
  assert.equal(r.closed[0].path, "x/c.mdx");
});

check("parseStore 容錯", () => {
  for (const raw of [null, "", "{", '{"v":2,"tabs":[]}', '{"v":1,"tabs":"x"}', "null", "3"]) {
    assert.deepEqual(parseStore(raw), emptyStore(), String(raw));
  }
  const bad = { ...mk("bad") };
  delete bad.key;
  const raw = JSON.stringify({ v: 1, tabs: [mk("a"), bad, mk("b", 0, { pinned: true }), mk("a")], closed: "x" });
  const s = parseStore(raw);
  assert.equal(ids(s), "b a");
  assert.deepEqual(s.closed, []);
  // key 與 kind:id 不一致也丟掉
  const wrong = JSON.stringify({ v: 1, tabs: [{ ...mk("a"), key: "note:zzz" }] });
  assert.equal(parseStore(wrong).tabs.length, 0);
});

check("hrefOf、tabKey、tabStorageKey、tooltip", () => {
  assert.equal(hrefOf({ kind: "note", id: "a/b" }), "/notes/a/b");
  assert.equal(hrefOf({ kind: "view", id: "api/orders.openapi" }), "/view/api/orders.openapi");
  assert.equal(hrefOf({ kind: "note", id: "專案/筆記" }), "/notes/專案/筆記");
  assert.equal(tabKey("view", "x/y"), "view:x/y");
  assert.equal(tabStorageKey("我的筆記"), "nc-tabs-v1:我的筆記");
  assert.equal(tabTooltip({ title: "T", path: "a/t.mdx", pending: 0 }), "T\na/t.mdx");
  assert.equal(tabTooltip({ title: "T", path: "a/t.mdx", pending: 2 }), "T\na/t.mdx\n待生成 AI 標記 2");
});

if (failed) {
  console.error(`\n✗ wb-tabs：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ wb-tabs：通過");
