#!/usr/bin/env node
// 官網 Demo（GitHub Pages）build 前執行，只在 CI 的乾淨 checkout 上跑。
//
// 簡報 deck 由 src/lib/decks.ts 以 eager glob 全部打包進 PresentApp 的 client chunk，
// 不管對應的筆記在不在。private 筆記不進 git，CI 上看不到它們，但它們的 deck 還在 repo 裡，
// 不刪掉的話內容會跟著 Demo 一起發佈。這裡依 deck 的 `source:` 欄位判斷：來源筆記不存在就刪。
//
// 本機不要跑（會刪掉 private 筆記的 deck）；要跑請加 --dry-run 先看清單。

import { readdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dir = path.join(root, "src/components/generated");
const dryRun = process.argv.includes("--dry-run");

let removed = 0;
for (const name of readdirSync(dir)) {
  if (!name.endsWith(".deck.tsx")) continue;
  const file = path.join(dir, name);
  const m = /\bsource:\s*"([^"]+)"/.exec(readFileSync(file, "utf-8"));
  if (!m || !m[1].startsWith("src/content/notes/")) continue; // 不是來自筆記的 deck（例如 docs/ 的樣本）不動
  if (existsSync(path.join(root, m[1]))) continue;
  console.log(`${dryRun ? "[dry-run] " : ""}移除 ${name}（來源 ${m[1]} 不存在）`);
  if (!dryRun) rmSync(file);
  removed++;
}
console.log(`prune-demo-decks：${removed} 份 deck ${dryRun ? "將被" : "已"}移除`);
