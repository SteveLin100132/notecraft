// 檢查更新：CHANGELOG 解析與切片的斷言（Task 113；規格 docs/notecraft-workbench-update-check.md §4.3、§4.4、§12）。
// 輸入是 repo 根目錄的**真實 CHANGELOG.md**：日後改寫格式、版本標題寫錯，這裡會先擋下（prepublishOnly → check-plugins）。
// 由 scripts/check-plugins.mjs 串接執行；單跑 npm run check:upd

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  countByCategory,
  findSection,
  inlineTokens,
  parseChangelog,
  sliceChangelog,
  tokensText,
} from "../../src/lib/changelog-parse.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const md = readFileSync(root + "CHANGELOG.md", "utf-8");
const pkg = JSON.parse(readFileSync(root + "package.json", "utf-8"));
const BASE = "https://github.com/SteveLin100132/notecraft/blob/main/";

let failed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message.split("\n").join("\n    ")}`);
  }
};

const versions = parseChangelog(md);
const allItems = versions.flatMap((v) => v.sections.flatMap((s) => s.items));

console.log("upd-changelog");

await check("第一段是 package.json 的版本；區間標題", () => {
  assert.equal(versions[0].v, pkg.version);
  const range = versions.find((v) => v.vFrom);
  assert.ok(range, "找不到區間標題");
  assert.equal(range.vFrom, "0.1.1");
  assert.equal(range.v, "0.1.3");
});

await check("每一行 ## 都能解析（[Unreleased] 除外）", () => {
  const heads = md
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.startsWith("## ") && !/^## \[Unreleased\]/i.test(l));
  assert.equal(versions.length, heads.length, `## 行 ${heads.length} 個，解析出 ${versions.length} 個版本：\n${heads.filter((h) => !/^## \[\d+\.\d+\.\d+\]/.test(h)).join("\n")}`);
});

await check("版號清單與官網 readReleases() 一致", async () => {
  const site = await import("../../site/src/lib/changelog.ts");
  const expanded = [];
  for (const v of versions) {
    if (!v.vFrom) {
      expanded.push(v.v);
      continue;
    }
    const [a, b, c0] = v.vFrom.split(".").map(Number);
    const c1 = Number(v.v.split(".")[2]);
    for (let c = c0; c <= c1; c++) expanded.push(`${a}.${b}.${c}`);
  }
  assert.deepEqual(expanded, site.readReleases().map((r) => r.version));
});

await check("類別：沒有「內部」、未知類別不存在", () => {
  for (const v of versions) {
    for (const s of v.sections) {
      assert.notEqual(s.title, "內部");
      assert.notEqual(s.cat, "other", `v${v.v} 有未知類別「${s.title}」`);
    }
  }
  const raw = md.match(/^### 內部/gm) ?? [];
  assert.ok(raw.length > 0, "測試前提：CHANGELOG 有「內部」");
});

await check("註解略過、1.0.0 有導言", () => {
  assert.ok(!allItems.some((i) => i.text.includes("<!--")));
  assert.ok(!versions.some((v) => (v.lead ?? "").includes("<!--")));
  const v100 = versions.find((v) => v.v === "1.0.0");
  assert.ok(v100.lead && v100.lead.includes("Workbench"), "1.0.0 的 lead 應含導言");
});

await check("續行與巢狀清單", () => {
  assert.ok(allItems.some((i) => i.text.includes("\n")), "沒有任何續行");
  assert.ok(allItems.some((i) => i.children.length > 0), "沒有任何巢狀項目");
});

await check("切片（Q1 = B）", () => {
  const fake = parseChangelog(
    [
      "## [1.8.5] - 2026-10-02",
      "### 修正",
      "- a",
      "## [1.8.4] - 2026-10-02",
      "### 修正",
      "- b",
      "## [1.8.0] - 2026-10-01",
      "### 新增",
      "- c",
      "## [0.1.1] – [0.1.3] - 2026-07-09",
      "### 新增",
      "- d",
    ].join("\n"),
  );
  assert.deepEqual(sliceChangelog(fake, ["1.8.5"], "1.8.0").map((s) => s.v), ["1.8.5"]);
  assert.equal(findSection(fake, "0.1.2").v, "0.1.3");
  assert.deepEqual(sliceChangelog(fake, ["0.1.3", "0.1.2"], "0.1.0").map((s) => s.v), ["0.1.3"]);
  const withEmpty = sliceChangelog(fake, ["9.9.9", "1.8.5"], "1.8.0");
  assert.equal(withEmpty[0].empty, true);
  assert.equal(withEmpty[1].v, "1.8.5");
  assert.deepEqual(sliceChangelog(fake, [], "1.8.4").map((s) => s.v), ["1.8.4"]);
  // 真實檔案：1.8.0 → 1.8.5，npm 上只有 1.8.5
  assert.deepEqual(sliceChangelog(versions, ["1.8.5"], "1.8.0").map((s) => s.v), ["1.8.5"]);
});

await check("只剩「內部」的版本標 internalOnly", () => {
  const v = parseChangelog("## [1.0.0] - 2026-01-01\n### 內部\n- x\n## [0.9.0] - 2026-01-01\n### 修正\n- y\n");
  assert.equal(v[0].internalOnly, true);
  assert.equal(v[0].sections.length, 0);
  assert.ok(!v[1].internalOnly);
});

await check("行內 token", () => {
  const t = inlineTokens("`a` **b** [c](https://x.dev) d", BASE);
  assert.deepEqual(
    t.map((k) => k.t),
    ["code", "text", "bold", "text", "link", "text"],
  );
  const rel = inlineTokens("[d](./docs/x.md)", BASE);
  assert.equal(rel[0].t, "link");
  assert.equal(rel[0].href, BASE + "docs/x.md");
  const js = inlineTokens("[e](javascript:alert(1))", BASE);
  assert.ok(js.every((k) => k.t !== "link"));
  const inCode = inlineTokens("`**x**`", BASE);
  assert.deepEqual(inCode, [{ t: "code", s: "**x**" }]);
  const nested = inlineTokens("**用 `foo` 做**", BASE);
  assert.equal(nested[0].t, "bold");
  assert.deepEqual(nested[0].c.map((k) => k.t), ["text", "code", "text"]);
  assert.equal(tokensText(nested), "用 foo 做");
});

await check("真實檔案的行內：純文字 token 沒有殘留的 ** 或反引號", () => {
  const plain = (toks) => toks.flatMap((k) => (k.t === "text" ? [k.s] : k.t === "code" ? [] : plain(k.c)));
  for (const i of [...allItems, ...versions.filter((v) => v.lead).map((v) => ({ text: v.lead, children: [] }))]) {
    for (const s of [i.text, ...i.children]) {
      const txt = plain(inlineTokens(s, BASE)).join("");
      assert.ok(!txt.includes("**"), `粗體沒解開：${s.slice(0, 80)}`);
      assert.ok(!txt.includes("`"), `code 沒解開：${s.slice(0, 80)}`);
    }
  }
});

await check("統計：1.8.5 的修正 3 項", () => {
  const c = countByCategory([versions.find((v) => v.v === "1.8.5")]);
  assert.equal(c.fixed, 3);
});

await check("發佈護欄：files 含 CHANGELOG.md", () => {
  assert.ok(Array.isArray(pkg.files) && pkg.files.includes("CHANGELOG.md"), "package.json 的 files 必須含 CHANGELOG.md（jsDelivr 從 npm tarball 取檔）");
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
