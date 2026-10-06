// /plugins 情境模型與官方外掛常數的斷言（Task 122，規格 docs/notecraft-workbench-plugin-empty-states.md §3、§7.4）。
// 混合狀態（部分停用、部分沒規則）用 UI 很難逐一點到，判錯了 build 仍全綠，只有這裡抓得到。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { derivePluginEnv, pluginRowState } from "../../src/lib/wb-plugin-env.ts";
import { FALLBACK_GLOB, OFFICIAL_PLUGINS, installCmd, mappingSnippet, snippetGlob } from "../../src/lib/official-plugins.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

const pl = (id, enabled, ...globsPerRule) => ({ id, enabled, mappings: globsPerRule.map((files) => ({ files })) });
const env = (plugins, { hasConfig = true, fileCount = 0 } = {}) => derivePluginEnv({ plugins, hasConfig, fileCount });

check("純情境 3–7", () => {
  assert.equal(env([], { hasConfig: false }).reason, "fresh");
  assert.equal(env([], { hasConfig: true }).reason, "noplugins");
  assert.equal(env([pl("a", true), pl("b", true)]).reason, "nomap");
  assert.equal(env([pl("a", true, ["none/*.json"])]).reason, "nohit");
  assert.equal(env([pl("a", false, ["**/*.er.json"]), pl("b", false)]).reason, "disabled");
});

check("有檔一律 null（不論外掛狀態）", () => {
  assert.equal(env([pl("a", true, ["x"])], { fileCount: 3 }).reason, null);
  assert.equal(env([pl("a", false)], { fileCount: 1 }).reason, null);
  assert.equal(env([], { hasConfig: false, fileCount: 1 }).reason, null);
});

check("混合 A：A 停用有規則、B 啟用無規則 → nomap（不是 nohit）", () => {
  const e = env([pl("a", false, ["**/*.er.json"]), pl("b", true)]);
  assert.equal(e.reason, "nomap");
  assert.equal(e.activeRules, 0);
  assert.deepEqual(e.activeGlobs, []);
  assert.equal(e.enabledCount, 1);
});

check("混合 B：A 停用有規則、B 啟用有規則、0 檔 → nohit，只算 B", () => {
  const e = env([pl("a", false, ["a/*.json"]), pl("b", true, ["b/*.json"])]);
  assert.equal(e.reason, "nohit");
  assert.equal(e.activeRules, 1);
  assert.deepEqual(e.activeGlobs, ["b/*.json"]);
});

check("規則計數是 mapping 條目，不是 glob 數", () => {
  const e = env([pl("a", true, ["x/*.json", "y/*.json", "z/*.json"])]);
  assert.equal(e.activeRules, 1);
  assert.equal(e.activeGlobs.length, 3);
});

check("activeGlobs 去重、保留出現順序", () => {
  const e = env([pl("a", true, ["**/*.json", "a/*.json"]), pl("b", true, ["**/*.json"])]);
  assert.deepEqual(e.activeGlobs, ["**/*.json", "a/*.json"]);
  assert.equal(e.activeRules, 2);
});

check("列狀態 off／unmapped／nohit／ok，停用優先", () => {
  const row = (enabled, mappings, matched) => pluginRowState({ enabled, mappings, matched });
  assert.equal(row(false, [{ files: ["x"] }], ["r"]), "off");
  assert.equal(row(false, [], []), "off");
  assert.equal(row(true, [], []), "unmapped");
  assert.equal(row(true, [{ files: ["x"] }], []), "nohit");
  assert.equal(row(true, [{ files: ["x"] }], ["r"]), "ok");
});

check("安裝指令", () => {
  assert.deepEqual(OFFICIAL_PLUGINS.map(installCmd), [
    'npx notecraftapp install-plugin er-diagram-renderer --apply "**/*.er.json"',
    'npx notecraftapp install-plugin openapi-renderer --apply "**/*.openapi.json"',
  ]);
});

check("plugins.json 範例：合法 JSON、官方取 defaultGlob、其餘 **/*.json", () => {
  const text = mappingSnippet(["er-diagram-renderer", "x-renderer"]);
  assert.ok(text.endsWith("}\n"), "結尾換行");
  assert.deepEqual(JSON.parse(text), {
    plugins: [
      { plugin: "er-diagram-renderer", files: ["**/*.er.json"] },
      { plugin: "x-renderer", files: [FALLBACK_GLOB] },
    ],
  });
  assert.equal(snippetGlob("openapi-renderer"), "**/*.openapi.json");
  assert.equal(JSON.parse(mappingSnippet([])).plugins.length, 0);
});

check("OFFICIAL_PLUGINS 與 plugins/registry.json 一致（id ⊆ registry、title 相同）", () => {
  const reg = JSON.parse(readFileSync(path.join(root, "plugins", "registry.json"), "utf-8"));
  for (const p of OFFICIAL_PLUGINS) {
    const r = reg.plugins.find((x) => x.id === p.id);
    assert.ok(r, `registry 沒有 ${p.id}`);
    assert.equal(p.title, r.title, `${p.id} 的 title`);
  }
});

check("純度：兩個 .ts 只有 import type、不碰 window", () => {
  for (const f of ["src/lib/wb-plugin-env.ts", "src/lib/official-plugins.ts"]) {
    const src = readFileSync(path.join(root, f), "utf-8");
    for (const line of src.split("\n").filter((l) => /^\s*import\s/.test(l))) {
      assert.match(line, /^\s*import\s+type\s/, `${f} 有非 type 的 import：${line.trim()}`);
    }
    assert.ok(!/\bwindow\./.test(src), `${f} 碰了 window`);
  }
});

if (failed) {
  console.error(`\n✗ wb-plugin-env：${failed} 組失敗`);
  process.exit(1);
}
console.log("\n✓ wb-plugin-env 全部通過");
