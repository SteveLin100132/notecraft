// ER plugin 資料推導的斷言（Task 78）。
//
// 以 Node 原生 strip-types 直接載入 plugin 的 derive.ts —— 不加 test runner、不加套件。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:er
//
// 最重要的是 ① 與 ⑪：v1.1／v1.2 的資料檔必須零修改就能渲染（沒有 schemas → 隱含 schema、無孤兒；
// 多重性父端一律 one、子端只在外鍵本身是唯一鍵時 zero-or-one）。⑪–⑲ 是 v1.3 的推導（Task 151）。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { erDerive, matchTable, cardinalityText, colsLabel, formatDiagnostics, IMPLICIT_SCHEMA_KEY, UNGROUPED_KEY } from "../../plugins/er-diagram-renderer/derive.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const load = (rel) => JSON.parse(readFileSync(path.join(root, "plugins/er-diagram-renderer", rel), "utf-8"));
const v11 = () => load("example/schema.v1.1.json");
const v12 = () => load("example/schema.v1.2.json");
const v13 = () => load("example/schema.json");

/* 合成資料：requirement 的 r 不可為 null、n 可為 null */
const mk = (tables) => ({
  requirement: [
    { key: "r", label: "必填", marker: "solid" },
    { key: "n", label: "可空", marker: "hollow", nullable: true },
  ],
  flags: [],
  derivations: [],
  groups: [{ key: "g", label: "g" }],
  layout: { columns: [{ key: "c", groups: ["g"] }] },
  tables: tables.map((t) => ({ label: t.name, group: "g", ...t })),
});
const col = (name, o = {}) => ({ name, type: "bigint", required: "r", ...o });
const byId = (D, id) => {
  const e = D.edges.find((x) => x.id === id);
  assert.ok(e, `找不到 edge ${id}；有：${D.edges.map((x) => x.id).join(", ")}`);
  return e;
};
const codes = (D) => D.diagnostics.map((d) => d.code);
const parent = { name: "p", columns: [col("id", { pk: true }), col("code", { unique: true }), col("x")] };

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

check("⑪ v1.1／v1.2：父端一律 one、子端只在外鍵是唯一鍵時 zero-or-one、id 與 v1.2 相同、零診斷", () => {
  for (const data of [v11(), v12()]) {
    const D = erDerive(data);
    const legacy = data.tables.flatMap((t) =>
      t.columns.filter((c) => c.fk && data.tables.some((x) => x.name === c.fk)).map((c) => `${t.name}.${c.name}`),
    );
    assert.deepEqual(D.edges.map((e) => e.id), legacy);
    assert.deepEqual(D.diagnostics, []);
    assert.equal(D.junctions.size, 0);
    for (const e of D.edges) {
      assert.equal(e.card.parent, "one", e.id);
      assert.deepEqual(e.refCols, ["id"], e.id);
      const c = data.tables.find((t) => t.name === e.child).columns.find((x) => x.name === e.cols[0]);
      assert.equal(e.card.child, c.unique || c.pk ? "zero-or-one" : "zero-or-many", e.id);
    }
  }
  assert.equal(byId(erDerive(v11()), "contract.sign_item_id").card.child, "zero-or-one");
});

check("⑫ nullable：欄位 > 語彙 > 不可為 null", () => {
  const D = erDerive(mk([
    parent,
    { name: "c", columns: [
      col("a", { fk: "p" }),
      col("b", { fk: "p", required: "n" }),
      col("c2", { fk: "p", required: "n", nullable: false }),
      col("d", { fk: "p", nullable: true }),
      col("e", { fk: "p", required: "沒有這個語彙" }),
    ] },
  ]));
  assert.equal(byId(D, "c.a").card.parent, "one");
  assert.equal(byId(D, "c.b").card.parent, "zero-or-one");
  assert.equal(byId(D, "c.b").optional, true);
  assert.equal(byId(D, "c.c2").card.parent, "one");
  assert.equal(byId(D, "c.d").card.parent, "zero-or-one");
  assert.equal(byId(D, "c.e").card.parent, "one");
});

check("⑬ 子端：外鍵包含唯一鍵才是 zero-or-one", () => {
  const D = erDerive(mk([
    parent,
    { name: "pk1", columns: [col("p_id", { pk: true, fk: "p" })] },
    { name: "uq1", columns: [col("id", { pk: true }), col("p_id", { unique: true, fk: "p" })] },
    { name: "cmp", columns: [col("id", { pk: true }), col("a"), col("b")],
      indexes: [{ columns: ["a"], unique: true }],
      foreignKeys: [{ columns: ["a", "b"], references: { table: "p", columns: ["id", "code"] } }] },
    { name: "part", columns: [col("id", { pk: true }), col("a", { fk: "p" }), col("b")],
      indexes: [{ columns: ["a", "b"], unique: true }] },
  ]));
  assert.equal(byId(D, "pk1.p_id").card.child, "zero-or-one");
  assert.equal(byId(D, "uq1.p_id").card.child, "zero-or-one");
  assert.equal(byId(D, "cmp.fk:a+b").card.child, "zero-or-one");
  assert.equal(byId(D, "part.a").card.child, "zero-or-many");
});

check("⑭ 明確覆寫：只寫一端、兩端都寫、與約束矛盾也照用", () => {
  const D = erDerive(mk([
    parent,
    { name: "c", columns: [col("id", { pk: true }), col("a"), col("b", { nullable: true }), col("d")],
      foreignKeys: [
        { columns: ["a"], references: { table: "p" }, cardinality: { child: "one-or-many" } },
        { columns: ["b"], references: { table: "p" }, cardinality: { parent: "one", child: "one" } },
        { name: "k", columns: ["d"], references: { table: "p" }, cardinality: { child: "zero-or-one" } },
      ] },
  ]));
  const a = byId(D, "c.fk:a");
  assert.deepEqual(a.card, { parent: "one", child: "one-or-many" });
  assert.deepEqual(a.cardFrom, { parent: "derived", child: "explicit" });
  const b = byId(D, "c.fk:b");
  assert.deepEqual(b.card, { parent: "one", child: "one" });
  assert.deepEqual(b.cardFrom, { parent: "explicit", child: "explicit" });
  assert.equal(b.optional, false);
  assert.equal(byId(D, "c.fk:k").card.child, "zero-or-one");
  assert.deepEqual(D.diagnostics, []);
});

check("⑮ fk 簡寫：表名、表.欄位、表名本身含點；與表層重複時表層優先", () => {
  const D = erDerive(mk([
    parent,
    { name: "crm.customer", columns: [col("id", { pk: true }), col("code", { unique: true })] },
    { name: "c", columns: [
      col("id", { pk: true }),
      col("a", { fk: "p" }),
      col("b", { fk: "p.code" }),
      col("d", { fk: "crm.customer" }),
      col("e", { fk: "crm.customer.code" }),
      col("f", { fk: "p" }),
      col("g", { fk: "p.code" }),
    ],
    foreignKeys: [
      { columns: ["f"], references: { table: "p" }, note: "表層" },
      { columns: ["g"], references: { table: "crm.customer" } },
    ] },
  ]));
  assert.deepEqual(byId(D, "c.a").refCols, ["id"]);
  assert.deepEqual(byId(D, "c.b").refCols, ["code"]);
  assert.equal(byId(D, "c.d").parent, "crm.customer");
  assert.deepEqual(byId(D, "c.d").refCols, ["id"]);
  assert.equal(byId(D, "c.e").parent, "crm.customer");
  assert.deepEqual(byId(D, "c.e").refCols, ["code"]);
  assert.equal(D.edges.filter((e) => e.cols[0] === "f").length, 1);
  assert.equal(byId(D, "c.fk:f").note, "表層");
  assert.equal(byId(D, "c.fk:g").parent, "crm.customer");
  assert.ok(!D.edges.some((e) => e.id === "c.g"));
  assert.deepEqual(codes(D), ["fk-duplicate"]);
  assert.deepEqual(D.fksOfColumn("c", "f").map((e) => e.id), ["c.fk:f"]);
});

check("⑯ 參照欄位：省略用主鍵、複合主鍵、參照唯一欄位", () => {
  const D = erDerive(mk([
    parent,
    { name: "line", columns: [col("h_id", { pk: true }), col("no", { pk: true })] },
    { name: "c", columns: [col("id", { pk: true }), col("h"), col("n"), col("code")],
      foreignKeys: [
        { columns: ["h", "n"], references: { table: "line" } },
        { columns: ["code"], references: { table: "p", columns: ["code"] } },
      ] },
  ]));
  const comp = byId(D, "c.fk:h+n");
  assert.deepEqual(comp.refCols, ["h_id", "no"]);
  assert.equal(comp.col, "h, n");
  assert.deepEqual(D.fksOfColumn("c", "n").map((e) => e.id), ["c.fk:h+n"]);
  assert.deepEqual(byId(D, "c.fk:code").refCols, ["code"]);
  assert.deepEqual(D.pkOf("line"), ["h_id", "no"]);
  assert.deepEqual(D.diagnostics, []);
});

check("⑰ 中間表：自動判斷與 junction 旗標", () => {
  const D = erDerive(mk([
    parent,
    { name: "q", columns: [col("id", { pk: true })] },
    { name: "viaPk", columns: [col("p_id", { pk: true, fk: "p" }), col("q_id", { pk: true, fk: "q" }), col("role")] },
    { name: "viaUq", columns: [col("id", { pk: true }), col("p_id", { fk: "p" }), col("q_id", { fk: "q" })],
      indexes: [{ columns: ["q_id", "p_id"], unique: true }] },
    { name: "selfMn", columns: [col("a", { pk: true, fk: "p" }), col("b", { pk: true, fk: "p" })] },
    { name: "nullFk", columns: [col("id", { pk: true }), col("p_id", { fk: "p", nullable: true }), col("q_id", { fk: "q" })],
      indexes: [{ columns: ["p_id", "q_id"], unique: true }] },
    { name: "off", junction: false, columns: [col("p_id", { pk: true, fk: "p" }), col("q_id", { pk: true, fk: "q" })] },
    { name: "forced", junction: true, columns: [col("id", { pk: true }), col("p_id", { fk: "p" }), col("q_id", { fk: "q" })] },
    { name: "bad", junction: true, columns: [col("id", { pk: true }), col("p_id", { fk: "p" })] },
  ]));
  assert.deepEqual([...D.junctions.keys()], ["viaPk", "viaUq", "selfMn", "forced"]);
  assert.equal(D.junctions.get("viaPk").auto, true);
  assert.equal(D.junctions.get("forced").auto, false);
  assert.equal(D.junctions.get("selfMn").a.parent, "p");
  assert.equal(D.junctions.get("selfMn").b.parent, "p");
  assert.deepEqual(D.manyToManyOf("q").map((j) => j.table), ["viaPk", "viaUq", "forced"]);
  assert.deepEqual(
    D.diagnostics.map((d) => `${d.code}:${d.table}`),
    ["junction-not-unique:forced", "junction-invalid:bad"],
  );
});

check("⑱ 診斷：每種代碼；疑似複合外鍵不連帶 ref-not-unique", () => {
  const line = { name: "line", columns: [col("h_id", { pk: true }), col("no", { pk: true })] };
  const nopk = { name: "nopk", columns: [col("x")] };
  const one = (t) => codes(erDerive(mk([parent, line, nopk, { name: "c", ...t }])));
  assert.deepEqual(one({ columns: [col("a", { fk: "nope" })] }), ["fk-missing-table"]);
  assert.deepEqual(one({ columns: [col("a")], foreignKeys: [{ columns: ["zz"], references: { table: "p" } }] }), ["fk-missing-column"]);
  assert.deepEqual(one({ columns: [col("a", { fk: "p.zz" })] }), ["ref-missing-column"]);
  assert.deepEqual(one({ columns: [col("a", { fk: "line" })] }), ["fk-arity"]);
  assert.deepEqual(one({ columns: [col("a", { fk: "nopk" })] }), ["ref-no-pk"]);
  assert.deepEqual(one({ columns: [col("a", { fk: "p.x" })] }), ["ref-not-unique"]);
  assert.deepEqual(
    one({ columns: [col("a")], foreignKeys: [{ columns: ["a"], references: { table: "p" } }, { columns: ["a"], references: { table: "p" } }] }),
    ["fk-duplicate"],
  );
  assert.deepEqual(one({ columns: [col("a", { fk: "line.h_id" }), col("b", { fk: "line.no" })] }), ["fk-maybe-composite"]);
  assert.deepEqual(one({ junction: true, columns: [col("a", { fk: "p" })] }), ["junction-invalid"]);
  assert.deepEqual(
    one({ junction: true, columns: [col("id", { pk: true }), col("a", { fk: "p" }), col("b", { fk: "p" })] }),
    ["junction-not-unique"],
  );
  for (const d of erDerive(mk([parent, { name: "c", columns: [col("a", { fk: "nope" })] }])).diagnostics) {
    assert.equal(d.table, "c");
    assert.match(d.message, /nope/);
  }
});

check("⑲ v1.3 範例：零診斷、各種關聯都推得出來", () => {
  const D = erDerive(v13());
  assert.deepEqual(D.diagnostics, []);
  assert.deepEqual([...D.junctions.keys()], ["case_member"]);
  assert.deepEqual(D.manyToManyOf("employee").map((j) => j.table), ["case_member"]);
  const del = D.edges.filter((e) => e.child === "delivery" && e.parent === "contract_item");
  assert.equal(del.length, 1);
  assert.deepEqual(del[0].cols, ["contract_id", "line_no"]);
  assert.deepEqual(del[0].refCols, ["contract_id", "line_no"]);
  assert.deepEqual(byId(D, "option_item.type_code").refCols, ["code"]);
  const item = D.edges.find((e) => e.child === "contract_item" && e.parent === "contract");
  assert.deepEqual(item.card, { parent: "one", child: "one-or-many" });
  assert.equal(item.cardFrom.child, "explicit");
  assert.equal(byId(D, "customer_profile.customer_id").card.child, "zero-or-one");
  assert.deepEqual(byId(D, "contract.quotation_id").card, { parent: "zero-or-one", child: "zero-or-one" });
  assert.equal(byId(D, "contract.case_id").card.parent, "zero-or-one");
  assert.deepEqual(D.uniqueKeysOf("option_item"), [["id"], ["type_code", "code"]]);
});

check("⑳ 多重性文字：參照 N:1／被參照 1:N、（可選）、至少一筆、1:1", () => {
  const D = erDerive(v13());
  const t = (id, side) => cardinalityText(byId(D, id), side);
  assert.equal(t("contract.customer_id", "child").label, "N:1");
  assert.equal(t("contract.customer_id", "parent").label, "1:N");
  assert.equal(t("contract.case_id", "child").label, "N:1（可選）");
  assert.equal(t("contract.case_id", "parent").label, "1:N（可選）");
  assert.equal(t("contract.quotation_id", "child").label, "1:1（可選）");
  assert.equal(t("customer_profile.customer_id", "parent").label, "1:1");
  const item = cardinalityText(D.edges.find((e) => e.child === "contract_item" && e.parent === "contract"), "parent");
  assert.equal(item.label, "1:N");
  assert.equal(item.atLeastOne, true);
  assert.equal(item.sentence, "每筆 contract 有 1..N 筆 contract_item；每筆 contract_item 對應 1 筆 contract");
  assert.equal(t("contract.customer_id", "child").atLeastOne, false);
  assert.equal(colsLabel(["a"]), "a");
  assert.equal(colsLabel(["a", "b"]), "(a, b)");
  assert.equal(colsLabel(null), "?");
});

check("㉑ formatDiagnostics：空的回 null、依代碼分組、每組最多 N 筆", () => {
  assert.equal(formatDiagnostics("a.er.json", []), null);
  assert.equal(formatDiagnostics("a.er.json", erDerive(v13()).diagnostics), null);
  const diags = [
    ...Array.from({ length: 12 }, (_, i) => ({ code: "fk-missing-table", table: "t", message: `m${i}` })),
    { code: "fk-arity", table: "u", message: "x" },
  ];
  const out = formatDiagnostics("erd/s.er.json", diags).split("\n");
  assert.equal(out[0], "[er-diagram-renderer] erd/s.er.json：13 個資料問題");
  assert.equal(out.filter((l) => l.endsWith("（fk-missing-table）")).length, 10);
  assert.ok(out.includes("- 另有 2 筆 fk-missing-table"));
  assert.equal(out.at(-1), "- x（fk-arity）");
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
