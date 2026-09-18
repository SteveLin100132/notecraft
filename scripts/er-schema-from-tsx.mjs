#!/usr/bin/env node
// 把「資料寫死在 tsx 裡」的舊版 ER 元件轉成 er-diagram-renderer 吃的 schema.json。
//
// 一次性遷移工具，用完保留 —— 別人要把自己的舊元件搬過來時可以照抄。
//
// 用法：
//   node scripts/er-schema-from-tsx.mjs <舊元件.tsx> <輸出.json> [--title "..."] [--back "/notes/xxx"]
//
// 做四件事：
//   1. 抽出 TABLES 字面量（它本來就是合法 JSON）與 LAYOUT
//   2. 欄位短鍵 → 長鍵，boolean 為 false 時省略（檔案會變大約 1.6 倍，換來人與 AI 都改得動）
//   3. 每張表重複一份的 groupLabel → 正規化成頂層 groups
//   4. 補上原本寫死在程式裡的語彙：必填性、徽章、衍生欄、hub 表、提示文案

import { readFileSync, writeFileSync } from "node:fs";

const [, , srcPath, outPath, ...rest] = process.argv;
if (!srcPath || !outPath) {
  console.error("用法：node scripts/er-schema-from-tsx.mjs <舊元件.tsx> <輸出.json> [--title ...] [--back ...]");
  process.exit(1);
}
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

const src = readFileSync(srcPath, "utf-8");

// ── 1. 抽資料 ──────────────────────────────────────────
const tablesMatch = src.match(/const TABLES:\s*Table\[\]\s*=\s*(\[[\s\S]*?\])\s*\n/);
if (!tablesMatch) {
  console.error("找不到 `const TABLES: Table[] = [...]`");
  process.exit(1);
}
const oldTables = JSON.parse(tablesMatch[1]);

const layoutMatch = src.match(/const LAYOUT[^=]*=\s*\[([\s\S]*?)\]\s*\n/);
const layoutColumns = [];
if (layoutMatch) {
  const re = /\{\s*key:\s*'([^']+)',\s*groups:\s*\[([^\]]*)\]\s*\}/g;
  let m;
  while ((m = re.exec(layoutMatch[1])) !== null) {
    layoutColumns.push({
      key: m[1],
      groups: m[2].split(",").map((s) => s.trim().replace(/^'|'$/g, "")).filter(Boolean),
    });
  }
}
if (layoutColumns.length === 0) {
  console.error("找不到 LAYOUT，或格式與預期不符");
  process.exit(1);
}

// ── 2. 短鍵 → 長鍵 ─────────────────────────────────────
const REQUIRED = { y: "required", n: "nullable", c: "condition", s: "system" };
const DERIVATION = { g: "generated", t: "trigger", e: "encrypted" };

const tables = oldTables.map((t) => ({
  name: t.name,
  label: t.label,
  ...(t.sec ? { section: t.sec } : {}),
  group: t.group,
  columns: t.cols.map((c) => ({
    name: c.n,
    type: c.t,
    required: REQUIRED[c.r] ?? "nullable",
    ...(c.d ? { default: c.d } : {}),
    ...(c.fk ? { fk: c.fk } : {}),
    ...(c.pk ? { pk: true } : {}),
    ...(c.u ? { unique: true } : {}),
    ...(c.i ? { index: true } : {}),
    ...(c.g ? { derivation: DERIVATION[c.g] } : {}),
    ...(c.p ? { pii: true } : {}),
    ...(c.s ? { note: c.s } : {}),
  })),
}));

// ── 3. groupLabel 正規化 ───────────────────────────────
// 依 LAYOUT 的欄序排列，讓 groups 的順序與畫面一致，讀 JSON 時比較好對照。
const labelOf = new Map();
for (const t of oldTables) if (!labelOf.has(t.group)) labelOf.set(t.group, t.groupLabel);
const ordered = layoutColumns.flatMap((c) => c.groups).filter((g) => labelOf.has(g));
for (const g of labelOf.keys()) if (!ordered.includes(g)) ordered.push(g);
const groups = ordered.map((key) => ({ key, label: labelOf.get(key) }));

// ── 4. 原本寫死在程式裡的語彙 ──────────────────────────
const doc = {
  $schema: "https://raw.githubusercontent.com/SteveLin100132/notecraft/main/plugins/er-diagram-renderer/schema.json",
  meta: {
    title: flag("title") ?? "資料表關聯圖",
    description: flag("desc") ?? "",
    ...(flag("source") ? { source: flag("source") } : {}),
    ...(flag("back") ? { backTo: flag("back") } : {}),
  },
  options: {
    defaultRows: Number(src.match(/const DEFAULT_ROWS\s*=\s*(\d+)/)?.[1] ?? 6),
    // 舊版寫死在工具列與連線判定裡的那張共用表
    hubTables: [...new Set([...src.matchAll(/parent === '([a-z_]+)'/g)].map((m) => m[1]))],
    sectionPrefix: "§",
    hint: "點一張表可聚焦它的關聯，其餘變淡；再點一次、點空白處或按 Esc 取消。欄位右側的圖示 hover 可看該欄說明。",
    searchPlaceholder: src.match(/placeholder="([^"]+)"/)?.[1] ?? "搜尋表名或欄位名",
  },
  requirement: [
    { key: "required", label: "必填", marker: "solid" },
    { key: "condition", label: "條件", marker: "half", title: "條件必填，條件見說明" },
    { key: "nullable", label: "可空", marker: "hollow" },
    { key: "system", label: "系統", marker: "muted", title: "系統維護，應用層不可寫入" },
  ],
  flags: [
    { key: "pk", badge: "PK", tone: "danger", label: "主鍵" },
    { key: "fk", badge: "FK", tone: "info", label: "外鍵" },
    { key: "unique", badge: "UQ", tone: "success", label: "唯一" },
    { key: "index", badge: "IX", tone: "neutral", label: "索引" },
  ],
  derivations: [
    { key: "generated", badge: "GEN", label: "資料庫計算欄" },
    { key: "trigger", badge: "TRG", label: "由 trigger 維護" },
    { key: "encrypted", badge: "ENC", label: "加密儲存" },
  ],
  groups,
  layout: { columns: layoutColumns },
  tables,
};

writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf-8");

const cols = tables.reduce((n, t) => n + t.columns.length, 0);
const fks = tables.reduce((n, t) => n + t.columns.filter((c) => c.fk).length, 0);
console.log(`✓ ${outPath}`);
console.log(`  ${tables.length} 張表、${cols} 個欄位、${fks} 個外鍵、${groups.length} 個群組、${layoutColumns.length} 欄版面`);
console.log(`  hubTables: ${doc.options.hubTables.join("、") || "（無）"}`);
