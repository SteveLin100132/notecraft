// OpenAPI plugin 樣式字串的斷言（Task 100）。
//
// CSS 以 <style>{CSS}</style> 注入。React SSR 會把文字裡的 < > & " ' 跳脫成實體，
// 但 <style> 是 raw text 元素、瀏覽器不會解回來 —— 結果是 SSR 的選擇器壞掉、hydration 對不上。
// 另外檢查：每個選擇器都以 .oar-root 起頭（不漏到筆記內文）、沒有殘留 handoff 的 --wb-oa-* 名稱、
// 規則裡沒有色碼字面值（只允許出現在 .oar-root 的 --oar-* 定義）。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:oar

import assert from "node:assert/strict";
import { CSS } from "../../plugins/openapi-renderer/styles.ts";

/** 走訪 CSS，回傳 [選擇器, 宣告區塊] —— 進入 @container／@media 的內層，略過 @keyframes */
function rules(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0;
  function block(end) {
    while (i < src.length) {
      const open = src.indexOf("{", i);
      const close = src.indexOf("}", i);
      if (close !== -1 && (open === -1 || close < open)) {
        i = close + 1;
        if (end) return;
        continue;
      }
      if (open === -1) return;
      const sel = src.slice(i, open).trim();
      i = open + 1;
      if (sel.startsWith("@keyframes")) {
        let depth = 1;
        while (depth && i < src.length) {
          if (src[i] === "{") depth++;
          else if (src[i] === "}") depth--;
          i++;
        }
      } else if (sel.startsWith("@")) {
        block(true);
      } else {
        const close2 = src.indexOf("}", i);
        out.push([sel, src.slice(i, close2)]);
        i = close2 + 1;
      }
    }
  }
  block(false);
  return out;
}

try {
  const bad = [...new Set([...CSS].filter((c) => `<>&"'`.includes(c)))];
  assert.deepEqual(bad, [], `styles.ts 的 CSS 含有會被 SSR 跳脫的字元：${bad.join(" ")}`);

  const rs = rules(CSS);
  assert.ok(rs.length > 100, `只解析到 ${rs.length} 條規則，解析器可能壞了`);
  const unscoped = rs.flatMap(([sel]) => sel.split(",").map((s) => s.trim())).filter((s) => !s.startsWith(".oar-root"));
  assert.deepEqual(unscoped, [], `有選擇器不是以 .oar-root 起頭：\n${unscoped.join("\n")}`);

  assert.ok(!CSS.includes("--wb-oa-"), "殘留 handoff 的 --wb-oa-* 名稱（規格 Q7：改為 --oar-*）");

  const literal = rs.filter(([sel, body]) => sel !== ".oar-root" && /#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(/.test(body)).map(([sel]) => sel);
  assert.deepEqual(literal, [], `規則裡有色碼字面值（應集中到 .oar-root 的 --oar-*）：\n${literal.join("\n")}`);

  console.log(`✓ oar-styles：${rs.length} 條規則皆以 .oar-root 起頭、無 SSR 跳脫字元、無散落色碼`);
} catch (err) {
  console.error(`✗ oar-styles：${err.message}`);
  process.exit(1);
}
