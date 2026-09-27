// ER plugin 樣式字串的斷言。
//
// CSS 以 <style>{CSS}</style> 注入。React SSR 會把文字裡的 < > & " ' 跳脫成實體，
// 但 <style> 是 raw text 元素、瀏覽器不會解回來 —— 結果是 SSR 的選擇器壞掉，而且 hydration 對不上
// （整個 island 退回 client render）。子代選擇器用空白、偽元素別用 content: ""。
// 由 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { CSS } from "../../plugins/er-diagram-renderer/styles.ts";

const bad = [...new Set([...CSS].filter((c) => `<>&"'`.includes(c)))];
try {
  assert.deepEqual(bad, [], `styles.ts 的 CSS 含有會被 SSR 跳脫的字元：${bad.join(" ")}`);
  const lines = CSS.split("\n").filter((l) => l.trim() && !l.trim().startsWith("/*") && !l.trim().startsWith("*") && !l.trim().startsWith("@") && !l.trim().startsWith("}"));
  const unscoped = lines.filter((l) => /^\s*[.#a-z]/i.test(l) && !/^\s*(\.erd-root|from|to)\b/.test(l));
  assert.deepEqual(unscoped, [], `有規則不是以 .erd-root 起頭：\n${unscoped.join("\n")}`);
  console.log("✓ er-styles：CSS 無 SSR 跳脫字元、規則皆以 .erd-root 起頭");
} catch (err) {
  console.error(`✗ er-styles：${err.message}`);
  process.exit(1);
}
