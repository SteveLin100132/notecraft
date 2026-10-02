// 首屏 critical CSS 的斷言（Task 111，規格 docs/notecraft-workbench-loading-transitions.md §4.2、§12.2）。
// WorkbenchLayout head 的 <style is:inline> 是 workbench.css 的複本（@view-transition 必須 inline，見規格 §22）；
// 兩邊漂移時轉場行為會依「頁面多快就緒」而不同，build 照樣全綠，只有這裡抓得到。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import fs from "node:fs";

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

const root = new URL("../../", import.meta.url);
const layout = fs.readFileSync(new URL("src/layouts/WorkbenchLayout.astro", root), "utf8");
const css = fs.readFileSync(new URL("src/styles/workbench.css", root), "utf8");
const inline = [...layout.matchAll(/<style is:inline>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
// 頂層規則：以「選擇器或 @規則 {…}」切開（critical 子集刻意不放巢狀 @media）
const rules = (src) => [...src.matchAll(/[^{}]+\{[^{}]*\}/g)].map((m) => m[0].trim()).filter(Boolean);

console.log("wb-critical-css");

check("layout 有 critical CSS，且含 @view-transition", () => {
  assert.ok(inline.length > 0, "找不到 <style is:inline>");
  assert.ok(inline.some((s) => s.includes("@view-transition{navigation:auto}")), "@view-transition 必須在 head 的 inline style");
});

check("每條 inline 規則都能在 workbench.css 找到相同字串", () => {
  for (const r of inline.flatMap(rules)) assert.ok(css.includes(r), `workbench.css 沒有：${r}`);
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
