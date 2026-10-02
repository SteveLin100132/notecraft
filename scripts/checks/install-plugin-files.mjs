// install-plugin 靜態檢查（bin/install-plugin.mjs 的 inspectFiles）對檔案的把關：
// package.json、lockfile、tsconfig.json 在任何層都拒收，副檔名 .json 不是通行證。
// 由 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { inspectFiles } from "../../bin/install-plugin.mjs";

const base = () =>
  new Map([
    ["notecraft-plugin.json", Buffer.from(JSON.stringify({ id: "x", title: "X", version: "1.0.0" }))],
    ["renderer.tsx", Buffer.from('import React from "react";\nexport default function R() { return null; }\n')],
    ["schema.json", Buffer.from("{}")],
    ["example/data.json", Buffer.from("{}")],
  ]);
const run = (extra) => {
  const files = base();
  for (const rel of extra) files.set(rel, Buffer.from("{}"));
  return inspectFiles(files, ["react"], "1.8.4").problems;
};

assert.deepEqual(run([]), [], "最小 plugin 應通過");

for (const rel of [
  "package.json",
  "Package.JSON",
  "example/package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "tsconfig.json",
  "sub/jsconfig.json",
]) {
  const problems = run([rel]);
  assert.equal(problems.length, 1, `${rel} 應被拒：${problems.join("；")}`);
  assert.match(problems[0], new RegExp(`^不收這種檔案：${rel.replace(/\./g, "\\.")}（`));
}
assert.match(run(["package.json"])[0], /plugin 不能帶 package\.json；依賴請只用白名單套件/);

// 名稱相近但不是這些檔 → 照常放行
assert.deepEqual(run(["package.example.json", "my-package.json", "tsconfig.base.json"]), []);

console.log("install-plugin files: ok");
