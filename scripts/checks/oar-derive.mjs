// OpenAPI plugin 推導的斷言（Task 99）：ops／tags／$ref／security／usage／深連結／欄位樹展開，
// 以及程式產生的極大 spec（規格 Q9：store 不放真實大型 spec）。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:oar

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  children,
  derive,
  expand,
  hashToRoute,
  kidCount,
  opMatch,
  paramExample,
  ptr,
  routeToHash,
  shortPath,
  tagBase,
  versionOf,
  viewPath,
} from "../../plugins/openapi-renderer/derive.ts";
import { makeLargeSpec } from "../fixtures/oar-large-spec.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ex = (n) => JSON.parse(readFileSync(path.join(root, `plugins/openapi-renderer/example/${n}.openapi.json`), "utf-8"));

const orders = ex("orders");
const pet = ex("petstore");
const health = ex("health");
const O = derive(orders);
const P = derive(pet);
const H = derive(health);

let failed = 0;
function check(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n  ${e.message.split("\n").join("\n  ")}`);
  }
}

check("ops：method 順序依 METHODS、key 用 operationId", () => {
  const p = O.ops.filter((o) => o.path === "/v1/organizations/{orgId}/orders/{orderId}").map((o) => o.method);
  assert.deepEqual(p, ["get", "patch", "delete"]);
  assert.ok(O.opByKey.has("createOrder"));
});

check("ops：沒有 operationId → method + path", () => {
  const D = derive({ openapi: "3.1.0", info: { title: "t", version: "1" }, paths: { "/pet/{petId}": { get: { responses: {} } } } });
  assert.deepEqual([...D.opByKey.keys()], ["get/pet/{petId}"]);
});

check("參數：path-level $ref 參數解開並與 op 參數合併", () => {
  const op = O.opByKey.get("getOrder");
  const names = op.params.map((p) => `${p.in}:${p.name}`);
  assert.ok(names.includes("path:orgId"), names.join(","));
  assert.ok(names.includes("path:orderId"));
});

check("參數：同 name + in 時 op-level 覆蓋 path-level", () => {
  const doc = {
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: { "/a/{id}": { parameters: [{ name: "id", in: "path", description: "舊" }], get: { parameters: [{ name: "id", in: "path", description: "新" }], responses: {} } } },
  };
  const ps = derive(doc).ops[0].params;
  assert.equal(ps.length, 1);
  assert.equal(ps[0].description, "新");
});

check("security：op 的 [] 覆蓋頂層；沒寫則繼承頂層", () => {
  assert.deepEqual(O.opByKey.get("healthz").security, []);
  assert.deepEqual(O.opByKey.get("listOrders").security, [{ bearerAuth: [] }]);
});

check("tags：宣告順序 → 未宣告 → 未分類；只留有 op 的", () => {
  assert.deepEqual(O.tags.map((t) => t.name), ["orders", "members", "__none"]);
  assert.equal(O.tags.at(-1).label, "未分類");
});

check("tags：一支 op 多個 tag 出現在每個 tag 下；未宣告 tag 接在後面", () => {
  const doc = {
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    tags: [{ name: "b" }],
    paths: { "/x": { get: { tags: ["a", "b"], responses: {} } } },
  };
  const D = derive(doc);
  assert.deepEqual(D.tags.map((t) => t.name), ["b", "a"]);
  assert.ok(D.tags.every((t) => t.ops.length === 1));
});

check("tag 共同前綴：每支 path 在前綴之後都要還有東西", () => {
  assert.equal(O.tags[0].base, "/v1/organizations/{orgId}");
  assert.equal(O.tags[1].base, "/v1/organizations/{orgId}/members");
  assert.equal(tagBase(["/v1/a/x", "/v1/a/y/z"]), "/v1/a");
  assert.equal(tagBase(["/a/b"]), "");
  assert.equal(tagBase(["/a/b", "/c/d"]), "");
});

check("requestBody／responses 的 $ref 解開", () => {
  const op = O.opByKey.get("createOrder");
  assert.deepEqual(Object.keys(op.requestBody.content), ["application/json", "multipart/form-data"]);
  assert.deepEqual(Object.keys(op.responses), ["201", "400", "409", "422", "500"]);
  assert.ok(Object.values(op.responses).every((r) => typeof r === "object"));
});

check("$ref 斷掉不 throw：記 warning、參數略過", () => {
  const doc = {
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: { "/x": { get: { parameters: [{ $ref: "#/components/parameters/Nope" }], responses: { 200: { $ref: "#/components/responses/Nope" } } } } },
  };
  const D = derive(doc);
  assert.equal(D.ops[0].params.length, 0);
  assert.match(D.ops[0].responses["200"].description, /無法解析/);
  assert.ok(D.warnings.length >= 2);
});

check("operationId 重複：第二支改用 method/path 並記 warning", () => {
  const doc = {
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: { "/a": { get: { operationId: "dup", responses: {} } }, "/b": { get: { operationId: "dup", responses: {} } } },
  };
  const D = derive(doc);
  assert.deepEqual(D.ops.map((o) => o.key), ["dup", "get/b"]);
  assert.equal(D.warnings.length, 1);
});

check("deps／refBy：自我參照與互相參照", () => {
  assert.ok(O.deps.Category.has("Category"));
  assert.ok(O.deps.Member.has("OrgUnit"));
  assert.ok(O.deps.OrgUnit.has("Member"));
  assert.ok(O.refBy.Member.includes("OrgUnit"));
  assert.ok(!O.refBy.Category.includes("Category"), "refBy 不含自己");
});

check("usage：直接（位置字串）與間接（經由）", () => {
  const order = O.usage.Order;
  const direct = order.find((u) => u.op.key === "createOrder");
  assert.ok(direct.where.includes("回應 201"), JSON.stringify(direct.where));
  const money = O.usage.Money.find((u) => u.op.key === "createOrder");
  assert.ok(money, "Money 應被 createOrder 使用（直接或間接）");
});

check("usage：循環參照的閉包不會無窮迴圈", () => {
  assert.ok(Array.isArray(O.usage.Member));
  assert.ok(Array.isArray(O.usage.OrgUnit));
});

check("版本判斷", () => {
  assert.deepEqual(versionOf({ openapi: "3.0.3" }), { raw: "3.0.3", kind: "3.0", supported: true });
  assert.equal(versionOf({ openapi: "3.1.0" }).kind, "3.1");
  assert.deepEqual(versionOf({ openapi: "3.2.0" }), { raw: "3.2.0", kind: "3.x", supported: false });
  assert.equal(versionOf({ swagger: "2.0" }).kind, "swagger");
  assert.equal(P.version.supported, false);
});

check("Petstore 3.2：query method 收進來", () => {
  assert.equal(P.opByKey.get("searchPets").method, "query");
  assert.ok(P.ops.length >= 19);
});

check("極小判定：health 是、orders 不是", () => {
  assert.equal(H.tiny, true);
  assert.equal(O.tiny, false);
  assert.equal(P.tiny, false);
});

check("paramExample：example → enum → default", () => {
  const p = P.opByKey.get("findPetsByStatus").params[0];
  assert.equal(paramExample(p), "available");
  assert.equal(paramExample({ name: "x", in: "query", example: 3, schema: { enum: [1] } }), 3);
  assert.equal(paramExample({ name: "x", in: "query", schema: { default: 7 } }), 7);
  assert.equal(paramExample({ name: "x", in: "query" }), undefined);
});

check("ptr：~1／~0 跳脫、外部 ref 不解析", () => {
  assert.equal(ptr({ a: { "b/c": { "d~e": 1 } } }, "#/a/b~1c/d~0e"), 1);
  assert.equal(ptr({}, "other.json#/x"), undefined);
});

check("shortPath：保留第一段與尾段", () => {
  const p = "/v1/organizations/{orgId}/members/{memberId}/roles";
  const s = shortPath(p, 26);
  assert.ok(s.startsWith("/v1/…/"), s);
  assert.ok(s.endsWith("/roles"), s);
  assert.ok(s.length <= 26 || s.split("/").length === 4, s);
  assert.equal(shortPath("/short", 26), "/short");
});

check("opMatch：文字（path、summary、operationId）與 method", () => {
  const op = O.opByKey.get("createOrder");
  assert.ok(opMatch(op, "createorder", new Set()));
  assert.ok(opMatch(op, "/orders", new Set(["post"])));
  assert.ok(!opMatch(op, "", new Set(["get"])));
});

check("深連結：來回轉換", () => {
  const cases = [
    { kind: "tag", key: "orders" },
    { kind: "op", key: "createOrder" },
    { kind: "op", key: "healthz" },
    { kind: "op", key: "createOrder", sub: "responses/409" },
    { kind: "schema", key: "Order" },
  ];
  for (const r of cases) assert.deepEqual(hashToRoute(routeToHash(r), O), r, routeToHash(r));
  assert.equal(routeToHash({ kind: "overview" }), "");
});

check("深連結：{} 與中文、瀏覽器百分比編碼、無效 hash", () => {
  const D = derive({ openapi: "3.1.0", info: { title: "t", version: "1" }, tags: [{ name: "訂單" }], paths: { "/a/{id}": { get: { tags: ["訂單"], responses: {} } } } });
  assert.deepEqual(hashToRoute("#op/get/a/{id}", D), { kind: "op", key: "get/a/{id}" });
  assert.deepEqual(hashToRoute("#tag/%E8%A8%82%E5%96%AE", D), { kind: "tag", key: "訂單" });
  assert.deepEqual(hashToRoute(routeToHash({ kind: "tag", key: "訂單" }), D), { kind: "tag", key: "訂單" });
  assert.equal(hashToRoute("#op/nope", O), null);
  assert.equal(hashToRoute("#schema/Nope", O), null);
  assert.equal(hashToRoute("#weird", O), null);
  assert.equal(hashToRoute("#op/%E0%A4%A", O), null, "壞的百分比編碼不 throw");
  assert.equal(hashToRoute("", O), null);
});

check("viewPath：只去 .json（與 app 規則一致）", () => {
  assert.equal(viewPath("api/orders.openapi.json"), "/view/api/orders.openapi");
});

check("欄位樹：自我循環停止", () => {
  const e = children(orders, { $ref: "#/components/schemas/Category" }, []);
  assert.equal(e.kind, "props");
  const parent = e.props.find(([n]) => n === "parent");
  assert.ok(parent, "Category 應有 parent 欄位");
  const again = expand(orders, parent[1], e.chain);
  assert.equal(again.kind, "cycle");
});

check("欄位樹：oneOf 帶 discriminator 與選項名", () => {
  const e = children(orders, { $ref: "#/components/schemas/Shipping" }, []);
  assert.equal(e.kind, "combo");
  assert.equal(e.mode, "oneOf");
  assert.equal(e.discriminator, "method");
  assert.deepEqual(e.variants.map((v) => v.label), ["HomeDelivery", "StorePickup"]);
});

check("欄位樹：allOf 攤平並標來源", () => {
  const e = children(orders, { $ref: "#/components/schemas/ValidationProblem" }, []);
  assert.equal(e.kind, "props");
  assert.ok(e.allOf.length >= 2, JSON.stringify(e.allOf));
  assert.ok(e.props.some(([, , via]) => via === "Problem"));
});

check("欄位樹：map 與無欄位 object", () => {
  const inv = P.opByKey.get("getInventory").responses["200"].content["application/json"].schema;
  assert.equal(children(pet, inv, []).kind, "map");
  const free = children(pet, { type: "object" }, []);
  assert.equal(free.kind, "props");
  assert.equal(free.free, true);
  assert.equal(kidCount(free), 0);
});

check("極大 spec（程式產生）：20 tag、250+ op、推導 < 300ms", () => {
  const big = makeLargeSpec();
  const t0 = performance.now();
  const D = derive(big);
  const ms = performance.now() - t0;
  assert.equal(D.tags.length, 20);
  assert.ok(D.ops.length >= 250, `${D.ops.length}`);
  assert.ok(D.usage.Employee.length > 0);
  assert.equal(D.tiny, false);
  assert.equal(D.warnings.length, 0, D.warnings.join("\n"));
  assert.ok(ms < 300, `推導花了 ${ms.toFixed(0)}ms`);
});

if (failed) {
  console.error(`\n✗ oar-derive：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ oar-derive：通過");
