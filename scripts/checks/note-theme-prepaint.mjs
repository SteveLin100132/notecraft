// 筆記頁主題與字級預繪的斷言（Task 137，規格 docs/notecraft-workbench-note-page.md §4.3）。
// notePaint／applyNotePaint 以 toString() 內嵌進 inline script：重建後行為必須相同（函式自足），
// 而且夾值規則要與 wb-prefs.ts 的 readPrefs() 一致（兩邊各寫一份 5 段清單）。
// 由 check:wb 與 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { applyNotePaint, notePaint } from "../../src/lib/note-theme-prepaint.ts";
import { NOTE_FONT_SCALES } from "../../src/lib/wb-prefs.ts";

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
console.log("note-theme-prepaint");

const rebuilt = new Function(`return (${notePaint.toString()})`)();
const rebuiltApply = new Function(`return (${applyNotePaint.toString()})`)();
const cases = [
  null,
  "",
  "{",
  "null",
  "[]",
  '{"noteTheme":"classic"}',
  '{"noteTheme":"brand","noteFontScale":1.25}',
  '{"noteTheme":"dark","noteFontScale":1.3}',
  '{"noteFontScale":"1.1"}',
  '{"noteFontScale":0.9,"defaultView":"board"}',
];

check("預設：品牌、倍率 1", () => {
  assert.deepEqual(notePaint(null), { theme: "brand", scale: 1 });
  assert.deepEqual(notePaint("{"), { theme: "brand", scale: 1 });
});
check("只接受 classic 與 5 段倍率，其餘退回預設", () => {
  assert.deepEqual(notePaint('{"noteTheme":"classic","noteFontScale":1.2}'), { theme: "classic", scale: 1.2 });
  assert.deepEqual(notePaint('{"noteTheme":"dark","noteFontScale":1.3}'), { theme: "brand", scale: 1 });
  assert.deepEqual(notePaint('{"noteFontScale":"1.1"}'), { theme: "brand", scale: 1 });
});
check("5 段倍率與 wb-prefs.ts 相同", () => {
  for (const s of NOTE_FONT_SCALES) assert.equal(notePaint(JSON.stringify({ noteFontScale: s })).scale, s);
  for (const s of [0.8, 1.05, 1.3, 2]) assert.equal(notePaint(JSON.stringify({ noteFontScale: s })).scale, 1);
});
check("toString() 重建後行為相同（函式自足）", () => {
  for (const c of cases) assert.deepEqual(rebuilt(c), notePaint(c), String(c));
});
check("applyNotePaint：換 class、寫 --md-fs，倍率 1 時移除", () => {
  const cls = new Set(["wb-body", "np-d"]);
  const style = new Map();
  const el = {
    classList: { toggle: (k, on) => (on ? cls.add(k) : cls.delete(k)) },
    style: { setProperty: (k, v) => style.set(k, v), removeProperty: (k) => style.delete(k) },
  };
  rebuiltApply(el, { theme: "classic", scale: 1.25 });
  assert.ok(cls.has("np-o") && !cls.has("np-d"));
  assert.equal(style.get("--md-fs"), "20.0px");
  rebuiltApply(el, { theme: "brand", scale: 1 });
  assert.ok(cls.has("np-d") && !cls.has("np-o"));
  assert.ok(!style.has("--md-fs"));
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
