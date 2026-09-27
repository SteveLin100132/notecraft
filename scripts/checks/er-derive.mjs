// ER plugin 資料推導的斷言（Task 78）。
//
// 以 Node 原生 strip-types 直接載入 plugin 的 derive.ts —— 不加 test runner、不加套件。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:er
//
// 最重要的是 ①：v1.1 的資料檔必須零修改就能渲染（沒有 schemas → 隱含 schema、無孤兒）。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { erDerive, matchTable, IMPLICIT_SCHEMA_KEY, UNGROUPED_KEY } from "../../plugins/er-diagram-renderer/derive.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const load = (rel) => JSON.parse(readFileSync(path.join(root, "plugins/er-diagram-renderer", rel), "utf-8"));
const v11 = () => load("example/schema.v1.1.json");
const v12 = () => load("example/schema.json");

const cases = [];
const check = (name, fn) => cases.push([name, fn]);

check("① v1.1：隱含 schema、無孤兒、不連 schema", () => {
  const D = erDerive(v11());
  assert.equal(D.implicit, true);
  assert.deepEqual(D.tree.map((s) => s.key), [IMPLICIT_SCHEMA_KEY]);
  assert.deepEqual(D.orphanGroups, []);
  assert.equal(D.linkTargets.schemas.size, 0);
  assert.equal(D.tree[0].groups.flatMap((g) => g.tables).length, v11().tables.length);
});

check("② v1.2：三個 schema、分群順序依 layout", () => {
  const data = v12();
  const D = erDerive(data);
  assert.equal(D.implicit, false);
  assert.deepEqual(D.tree.map((s) => s.key), data.schemas.map((s) => s.key));
  const layoutOrder = data.layout.columns.flatMap((c) => c.groups);
  for (const s of D.tree) {
    const keys = s.groups.map((g) => g.key);
    const expected = layoutOrder.filter((k) => keys.includes(k));
    assert.deepEqual(keys.slice(0, expected.length), expected, `schema ${s.key} 的分群順序`);
  }
  assert.deepEqual(D.orphanGroups, []);
});

check("③ group 沒寫 schema → 歸第一個 schema 並列為孤兒", () => {
  const data = v12();
  const g = data.groups.find((x) => x.schema !== data.schemas[0].key);
  delete g.schema;
  const D = erDerive(data);
  assert.equal(D.schemaOfGroup(g.key), data.schemas[0].key);
  assert.deepEqual(D.orphanGroups, [g.key]);
  assert.ok(D.tree[0].groups.some((x) => x.key === g.key));
});

check("④ group 的 schema 指向不存在的 key → 同 ③", () => {
  const data = v12();
  const g = data.groups.find((x) => x.schema !== data.schemas[0].key);
  g.schema = "nope";
  const D = erDerive(data);
  assert.equal(D.schemaOfGroup(g.key), data.schemas[0].key);
  assert.deepEqual(D.orphanGroups, [g.key]);
});

check("⑤ 自我參照不計入父／子表", () => {
  const data = v11();
  const t = data.tables[0];
  t.columns.push({ name: "parent_id", type: "bigint", required: data.requirement[0].key, fk: t.name });
  const D = erDerive(data);
  const self = D.edges.find((e) => e.child === t.name && e.parent === t.name);
  assert.ok(self?.self);
  assert.ok(!D.parentsOf(t.name).some((e) => e.self));
  assert.ok(!D.childrenOf(t.name).some((e) => e.self));
  assert.ok(!D.parentTables(t.name).includes(t.name));
});

check("⑥ 同一張父表被兩個欄位指向，父表只算一張", () => {
  const data = v11();
  const [child, parent] = [data.tables[1], data.tables[0]];
  child.columns.push(
    { name: "a_id", type: "bigint", required: data.requirement[0].key, fk: parent.name },
    { name: "b_id", type: "bigint", required: data.requirement[0].key, fk: parent.name },
  );
  const D = erDerive(data);
  const toParent = D.parentsOf(child.name).filter((e) => e.parent === parent.name);
  assert.ok(toParent.length >= 2);
  assert.equal(D.parentTables(child.name).filter((n) => n === parent.name).length, 1);
});

check("⑦ 表的 group 不存在 → 未分群", () => {
  const data = v11();
  data.tables[0].group = "ghost";
  const D = erDerive(data);
  assert.deepEqual(D.ungroupedTables, [data.tables[0].name]);
  const ug = D.tree[0].groups.find((g) => g.key === UNGROUPED_KEY);
  assert.ok(ug && ug.tables.some((t) => t.name === data.tables[0].name));
});

check("⑧ 沒出現在 layout 的 group 接在最後", () => {
  const data = v11();
  data.groups.push({ key: "extra", label: "額外" });
  data.tables[0].group = "extra";
  const D = erDerive(data);
  const keys = D.tree[0].groups.map((g) => g.key);
  assert.equal(keys.at(-1), "extra");
});

check("⑨ matchTable：表名、label、欄位名，不分大小寫", () => {
  const t = { name: "customer", label: "客戶主檔", group: "g", columns: [{ name: "tax_ID", type: "text", required: "x" }] };
  assert.deepEqual(matchTable(t, "CUST"), { hit: true, byName: true, columns: [] });
  assert.equal(matchTable(t, "客戶").byName, true);
  assert.deepEqual(matchTable(t, "tax_id"), { hit: true, byName: false, columns: ["tax_ID"] });
  assert.equal(matchTable(t, "zzz").hit, false);
});

check("⑩ 有 schemas 但某個 schema 底下沒有 group → 仍列出", () => {
  const data = v12();
  data.schemas.push({ key: "empty", label: "空的" });
  const D = erDerive(data);
  const s = D.tree.find((x) => x.key === "empty");
  assert.ok(s);
  assert.deepEqual(s.groups, []);
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
  console.error(`\n✗ er-derive：${failed}／${cases.length} 項失敗`);
  process.exit(1);
}
console.log(`✓ er-derive：${cases.length} 項通過`);
