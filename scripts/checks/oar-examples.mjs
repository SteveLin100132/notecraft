// OpenAPI plugin 範例與 cURL／fetch 的斷言（Task 99）。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:oar

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { derive } from "../../plugins/openapi-renderer/derive.ts";
import { curlSnippet, exampleFromSchema, fetchSnippet, FORMAT_SAMPLES, mediaExample } from "../../plugins/openapi-renderer/examples.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ex = (n) => JSON.parse(readFileSync(path.join(root, `plugins/openapi-renderer/example/${n}.openapi.json`), "utf-8"));
const orders = ex("orders");
const pet = ex("petstore");
const O = derive(orders);
const P = derive(pet);
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });

let failed = 0;
function check(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n  ${e.message.split("\n").join("\n  ")}`);
  }
}

check("優先序：example > examples[0] > const > default > enum[0]", () => {
  assert.equal(exampleFromSchema({}, { type: "string", example: "a", examples: ["b"], default: "c" }), "a");
  assert.equal(exampleFromSchema({}, { type: "string", examples: ["b"], default: "c" }), "b");
  assert.equal(exampleFromSchema({}, { const: 1, default: 2 }), 1);
  assert.equal(exampleFromSchema({}, { type: "string", default: "c", enum: ["d"] }), "c");
  assert.equal(exampleFromSchema({}, { type: "string", enum: ["d", "e"] }), "d");
});

check("format 固定值寫死（不取今天）", () => {
  for (const [fmt, v] of Object.entries(FORMAT_SAMPLES)) assert.equal(exampleFromSchema({}, { type: "string", format: fmt }), v);
  assert.equal(exampleFromSchema({}, { type: "string" }), "string");
  assert.equal(exampleFromSchema({}, { type: "integer", minimum: 5 }), 5);
  assert.equal(exampleFromSchema({}, { type: "number" }), 0);
  assert.equal(exampleFromSchema({}, { type: "boolean" }), true);
});

check("request 略過 readOnly、response 保留；deprecated 一律略過", () => {
  const req = exampleFromSchema(orders, ref("Order"), "request");
  const res = exampleFromSchema(orders, ref("Order"), "response");
  assert.ok(!("id" in req) && !("createdAt" in req), JSON.stringify(Object.keys(req)));
  assert.ok("id" in res && "createdAt" in res, JSON.stringify(Object.keys(res)));
  assert.ok(!("legacy_code" in req) && !("legacy_code" in res));
  const input = exampleFromSchema(orders, ref("CreateOrderInput"), "request");
  assert.ok(!("couponCode" in input));
});

check("循環 ref 回 {}、不無限遞迴", () => {
  const c = exampleFromSchema(orders, ref("Category"), "response");
  assert.deepEqual(c.parent, {});
  const m = exampleFromSchema(orders, ref("Member"), "response");
  assert.ok(m && typeof m === "object");
});

check("深度上限 8", () => {
  let s = { type: "string" };
  for (let i = 0; i < 20; i++) s = { type: "object", properties: { n: s } };
  let v = exampleFromSchema({}, s);
  let depth = 0;
  while (v && typeof v === "object" && "n" in v) {
    v = v.n;
    depth++;
  }
  assert.ok(depth <= 9, `${depth}`);
});

check("allOf 合併、oneOf 取第一個非 null", () => {
  assert.deepEqual(exampleFromSchema({}, { allOf: [{ type: "object", properties: { a: { type: "integer" } } }, { type: "object", properties: { b: { type: "boolean" } } }] }), { a: 0, b: true });
  assert.equal(exampleFromSchema({}, { oneOf: [{ type: "null" }, { type: "string", format: "email" }] }), "user@example.com");
});

check("map：additionalProperties 產生 key", () => {
  assert.deepEqual(exampleFromSchema({}, { type: "object", additionalProperties: { type: "integer" } }), { key: 0 });
});

check("mediaExample：examples 第一個、可切換、標 summary", () => {
  const media = P.opByKey.get("searchPets").requestBody.content["application/json"];
  const a = mediaExample(pet, media, "request");
  assert.equal(a.generated, false);
  assert.deepEqual(a.names, ["searchFriendlyCats", "searchAffordableDogs"]);
  assert.equal(a.labels.searchAffordableDogs, "Search for affordable dogs");
  assert.equal(a.value.species, "cat");
  assert.equal(mediaExample(pet, media, "request", "searchAffordableDogs").value.species, "dog");
});

check("mediaExample：沒有範例 → 由 schema 產生並標註", () => {
  const media = O.opByKey.get("createOrder").requestBody.content["application/json"];
  const m = mediaExample(orders, media, "request");
  assert.equal(m.generated, true);
  assert.ok(m.value && typeof m.value === "object");
});

check("cURL：path 參數用 example、query 帶 example／default、deprecated 不帶", () => {
  const c = curlSnippet(O, O.opByKey.get("listOrders"), O.servers[0]);
  assert.match(c, /^curl -X GET '/);
  assert.match(c, /\/organizations\/org_tm01\/orders\?/);
  assert.match(c, /status=placed,paid/);
  assert.match(c, /page=1/);
  assert.doesNotMatch(c, /legacy_sort/);
  assert.match(c, /-H 'Authorization: Bearer <ACCESS_TOKEN>'/);
});

check("cURL：沒有 example 的 path 參數 → <佔位>", () => {
  const c = curlSnippet(P, P.opByKey.get("getPetById"), P.servers[0]);
  assert.match(c, /\/pet\/<petId>'/);
  assert.match(c, /-H 'api_key: <API_KEY>'/);
});

check("cURL：JSON body 與 Content-Type、行接續格式", () => {
  const c = curlSnippet(O, O.opByKey.get("createOrder"), O.servers[0], "application/json");
  assert.match(c, /-H 'Content-Type: application\/json'/);
  assert.match(c, /-d '\{/);
  assert.ok(c.split("\n").slice(1).every((l) => l.startsWith("  ") || /^\s/.test(l) || l.startsWith("}")));
  assert.match(c, / \\\n  -H/);
});

check("cURL：multipart 用 -F、form-urlencoded 用 --data-urlencode、binary 用 --data-binary", () => {
  assert.match(curlSnippet(O, O.opByKey.get("createOrder"), O.servers[0], "multipart/form-data"), /-F '/);
  assert.match(curlSnippet(P, P.opByKey.get("addPet"), P.servers[0], "application/x-www-form-urlencoded"), /--data-urlencode 'name=doggie'/);
  assert.match(curlSnippet(P, P.opByKey.get("uploadFile"), P.servers[0]), /--data-binary '@\.\/file\.bin'/);
});

check("cURL：單引號跳脫", () => {
  const doc = {
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: { "/x": { post: { requestBody: { content: { "application/json": { example: { msg: "it's" } } } }, responses: {} } } },
  };
  const D = derive(doc);
  assert.match(curlSnippet(D, D.ops[0], undefined), /it'\\''s/);
});

check("cURL：security [] 不帶驗證；沒有 server 用相對路徑", () => {
  const c = curlSnippet(O, O.opByKey.get("healthz"), undefined);
  assert.doesNotMatch(c, /Authorization/);
  assert.match(c, /'\/healthz'/);
});

check("fetch：method、headers、JSON body", () => {
  const f = fetchSnippet(O, O.opByKey.get("createOrder"), O.servers[0], "application/json");
  assert.match(f, /^const res = await fetch\('https?:\/\//);
  assert.match(f, /method: 'POST'/);
  assert.match(f, /'Content-Type': 'application\/json'/);
  assert.match(f, /body: JSON\.stringify\(\{/);
});

check("同樣輸入兩次輸出相同（SSR 與瀏覽器一致）", () => {
  const op = O.opByKey.get("createOrder");
  assert.equal(curlSnippet(O, op, O.servers[0]), curlSnippet(derive(orders), derive(orders).opByKey.get("createOrder"), O.servers[0]));
});

if (failed) {
  console.error(`\n✗ oar-examples：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ oar-examples：通過");
