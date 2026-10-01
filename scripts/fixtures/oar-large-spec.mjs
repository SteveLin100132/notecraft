// 極大 OpenAPI spec 產生器（Task 99，規格 Q9）：20 個 tag、250+ 支 operation。
//
// 官方 store 不放真實的大型 spec，規模測試改用這裡產生的假資料（比照 handoff prototype 的 makeLarge()）。
//   - scripts/checks/oar-derive.mjs import 它做斷言
//   - 手動驗證：node scripts/fixtures/oar-large-spec.mjs <輸出路徑>  → 寫成 JSON 檔放進本機筆記資料夾（不進版控）

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TAGS = [
  ["accounts", "帳號"], ["attendance", "出勤"], ["audit-logs", "稽核紀錄"], ["billing", "帳務"], ["branches", "分店"],
  ["contracts", "合約"], ["departments", "部門"], ["documents", "文件"], ["employees", "員工"], ["exports", "匯出"],
  ["holidays", "假日"], ["imports", "匯入"], ["insurance", "勞健保"], ["leave", "請假"], ["notifications", "通知"],
  ["overtime", "加班"], ["payroll", "薪資"], ["reports", "報表"], ["schedules", "排班"], ["settings", "設定"],
];
const EXTRA = ["archive", "restore", "history", "permissions", "comments", "attachments", "export"];

export function makeLargeSpec() {
  const paths = {};
  const schemas = {};
  TAGS.forEach(([t, zh], i) => {
    const S = t.replace(/(^|-)([a-z])/g, (_m, _a, c) => c.toUpperCase()).replace(/s$/, "");
    schemas[S] = {
      type: "object",
      required: ["id", "name"],
      properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, createdAt: { type: "string", format: "date-time", readOnly: true } },
    };
    schemas[`${S}Input`] = { type: "object", properties: { name: { type: "string" } } };
    const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
    const ok = (s) => ({ 200: { description: "OK", content: { "application/json": { schema: s } } } });
    const idName = `${S[0].toLowerCase()}${S.slice(1)}Id`;
    const base = `/v2/${t}`;
    const one = `${base}/{${idName}}`;
    const idParam = { name: idName, in: "path", required: true, schema: { type: "string" } };
    paths[base] = {
      get: { tags: [t], operationId: `list${S}s`, summary: `列出${zh}`, responses: ok({ type: "array", items: ref(S) }) },
      post: { tags: [t], operationId: `create${S}`, summary: `新增${zh}`, requestBody: { content: { "application/json": { schema: ref(`${S}Input`) } } }, responses: ok(ref(S)) },
    };
    paths[one] = {
      parameters: [idParam],
      get: { tags: [t], operationId: `get${S}`, summary: `取得單筆${zh}`, responses: ok(ref(S)) },
      patch: { tags: [t], operationId: `update${S}`, summary: `修改${zh}`, requestBody: { content: { "application/json": { schema: ref(`${S}Input`) } } }, responses: ok(ref(S)) },
      delete: { tags: [t], operationId: `delete${S}`, summary: `刪除${zh}`, responses: { 204: { description: "已刪除" } } },
    };
    EXTRA.slice(0, 3 + (i % 4)).forEach((x) => {
      paths[`${one}/${x}`] = {
        parameters: [idParam],
        get: { tags: [t], operationId: `get${S}${x[0].toUpperCase()}${x.slice(1)}`, summary: `${zh}的 ${x}`, responses: ok({ type: "object" }) },
        post: { tags: [t], operationId: `post${S}${x[0].toUpperCase()}${x.slice(1)}`, summary: `${zh}的 ${x}（寫入）`, responses: ok({ type: "object" }) },
      };
    });
  });
  return {
    openapi: "3.0.3",
    info: { title: "Acme Payroll Platform API（產生的測試資料）", version: "5.12.0", description: "規模測試用的假資料：20 個 tag。" },
    servers: [{ url: "https://api.example.com/v2" }],
    tags: TAGS.map(([name, zh]) => ({ name, description: `${zh}相關 API` })),
    security: [{ bearerAuth: [] }],
    paths,
    components: { schemas, securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) {
    console.error("用法：node scripts/fixtures/oar-large-spec.mjs <輸出路徑.openapi.json>");
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify(makeLargeSpec(), null, 2));
  console.log(`已寫出 ${out}`);
}
