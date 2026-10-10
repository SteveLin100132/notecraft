// 站內連結的掃描器（docs/notecraft-workbench-notes-graph.md §4.3）：一篇筆記的原始碼 → 連結的原始 URL 與行號。
//
// 與 defs-scan.mjs 同一種做法：不用 AST，遮掉不是正文的部分後以正規表示式找。只 import defs-scan.mjs，
// **不可碰 Node API**：defs-index.mjs 會載入它，官網的瀏覽器示範也用得到。
//
// 這裡只回傳原始 URL，不解析目標：解析要用到全站的 slug 表，在 lib/wb-graph.ts 的 buildGraphEdges。

import { maskNonProse } from "./defs-scan.mjs";

/** @typedef {import("./links-scan.d.mts").ScanLink} ScanLink */

/** 行內連結 `[文字](url "標題")`；前面是 `!` 的是圖片，不算。 */
const INLINE_LINK = /(?<!!)\[(?:[^\]\\\n]|\\.)*\]\(\s*(<[^>\n]*>|[^\s)]+)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g;
/** reference 定義 `[label]: url` */
const REF_DEF = /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]*>|\S+)/gm;
/** JSX／HTML 的 href */
const HREF_ATTR = /\bhref\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')/g;
/** `<PluginView src="…">`：筆記內嵌資料檔，src 相對 notesDir */
const PLUGIN_VIEW = /<PluginView\b[^>]*?\bsrc\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')/g;

/**
 * @param {string} source 一篇筆記的完整原始碼（含 frontmatter）
 * @returns {ScanLink[]} 依出現位置排序
 */
export function scanLinks(source) {
  const masked = maskNonProse(source);
  /** @type {(ScanLink & { at: number })[]} */
  const out = [];
  // 行號：換行位置的前綴表，查詢用二分
  const breaks = [];
  for (let i = 0; i < masked.length; i++) if (masked.charCodeAt(i) === 10) breaks.push(i);
  const lineOf = (at) => {
    let lo = 0;
    let hi = breaks.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (breaks[mid] < at) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
  const push = (raw, at, via) => {
    let url = (raw ?? "").trim();
    if (url.startsWith("<") && url.endsWith(">")) url = url.slice(1, -1).trim();
    if (!url) return;
    out.push({ url, line: lineOf(at), via, at });
  };
  let m;
  INLINE_LINK.lastIndex = 0;
  while ((m = INLINE_LINK.exec(masked))) push(m[1], m.index, "link");
  REF_DEF.lastIndex = 0;
  while ((m = REF_DEF.exec(masked))) push(m[1], m.index, "link");
  HREF_ATTR.lastIndex = 0;
  while ((m = HREF_ATTR.exec(masked))) push(m[1] ?? m[2], m.index, "link");
  PLUGIN_VIEW.lastIndex = 0;
  while ((m = PLUGIN_VIEW.exec(masked))) push(m[1] ?? m[2], m.index, "pluginview");
  return out.sort((a, b) => a.at - b.at).map(({ at: _at, ...rest }) => rest);
}
