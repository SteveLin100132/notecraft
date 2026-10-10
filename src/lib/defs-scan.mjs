// 定義與引用的掃描器（docs/notecraft-workbench-define-ref.md §4.1）：一篇筆記的原始碼 → defines／includes／refs。
//
// 純函式、零 import：Astro（remark plugin、workbench.ts）、dev-api 與 CLI（純 Node）三種環境共用，
// 所以是 .mjs（同 notes-ignore.mjs）；scripts/checks/defs-scan.mjs 直接載入斷言。
//
// 不用 AST：這裡只需要 id、位置與計數，三種環境都不必帶 remark 處理器。真正渲染時 remark plugin 以 AST 為準，
// 兩邊對同一篇的 id 集合不一致時由 remark plugin 印 warn（remark-notecraft-defs.ts）。

/** @typedef {import("./defs-scan.d.mts").ScanResult} ScanResult */

/** id：字母（含中文）、數字、_、-，以 . 分段（§2.2、Q4）。 */
const ID_RE = /^[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)*$/u;

/** @param {string} id */
export function isValidDefId(id) {
  return typeof id === "string" && ID_RE.test(id);
}

/**
 * directive 的屬性字串（`{…}` 內）→ 物件。支援 key="v"、key='v'、key=v、#id、.class（後者略過）。
 * @param {string} raw
 * @returns {Record<string, string>}
 */
export function parseAttrs(raw) {
  /** @type {Record<string, string>} */
  const out = {};
  const re = /([#.])([^\s#.="'}]+)|([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=}]+)))?/gu;
  let m;
  while ((m = re.exec(raw))) {
    if (m[1] === "#") out.id = m[2];
    else if (m[1] === ".") continue;
    else if (m[3]) out[m[3]] = m[4] ?? m[5] ?? m[6] ?? "";
  }
  return out;
}

/**
 * 把不是正文的部分換成等長空白（保留換行與 offset）：frontmatter、圍欄程式碼、MDX 註解、HTML 註解、行內 code。
 * @param {string} src
 */
export function maskNonProse(src) {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  let out = src;
  // frontmatter（檔案開頭的 --- 區塊）
  const fm = /^﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(out);
  if (fm) out = blank(fm[0]) + out.slice(fm[0].length);
  // 圍欄程式碼：逐行，收尾要同字元且不短於開頭；未收尾延伸到文末（CommonMark）
  const lines = out.split("\n");
  /** @type {{ ch: string, len: number } | null} */
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.ch && close[1].length >= fence.len) fence = null;
      lines[i] = blank(line);
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (open) {
      fence = { ch: open[1][0], len: open[1].length };
      lines[i] = blank(line);
    }
  }
  out = lines.join("\n");
  // MDX 註解 {/* … */}、HTML 註解 <!-- … -->（可跨行）
  out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, blank).replace(/<!--[\s\S]*?-->/g, blank);
  // 行內 code：同長度的反引號配對（逐行）
  out = out
    .split("\n")
    .map((l) => l.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, blank))
    .join("\n");
  return out;
}

/** `**粗體**`／`__粗體__` 的純文字（去掉內層的行內標記）。 */
function firstBold(text) {
  const m = /\*\*(?!\s)([^*\n]+?)\*\*|__(?!\s)([^_\n]+?)__/.exec(text);
  if (!m) return "";
  return (m[1] ?? m[2]).replace(/[`*_~]/g, "").trim();
}

const CONTAINER_OPEN = /^( {0,3})(:{3,})([\p{L}\p{N}_-]+)(\[[^\]\n]*\])?(\{[^}\n]*\})?\s*$/u;
const CONTAINER_CLOSE = /^\s*(:{3,})\s*$/;
const LEAF_INCLUDE = /^\s*::include(?![\p{L}\p{N}_-])(\[[^\]\n]*\])?(\{[^}\n]*\})?\s*$/u;
const TEXT_REF = /(?<![:\\]):ref(?![\p{L}\p{N}_-])(\[(?:[^\]\n\\]|\\.)*\])?(\{[^}\n]*\})?/gu;
/** 需要 import 的 JSX：大寫開頭或含 .（member expression）；小寫的 HTML 元素（<br />、<div>）不用。 */
const JSX_COMPONENT_LINE = /^\s*<([A-Z][\w]*|[a-z][\w]*\.[\w.]+)[\s/>]/;
const ESM_LINE = /^(import|export)\s/;

/**
 * @param {string} source 一篇筆記的完整原始碼（含 frontmatter）
 * @returns {ScanResult}
 */
export function scanDefs(source) {
  const masked = maskNonProse(source);
  const lines = masked.split("\n");
  /** @type {ScanResult} */
  const res = { defines: [], includes: [], refs: [], errors: [], h1: "" };
  /** @type {{ name: string, colons: number, line: number, define: null | { id: string, label: string, bodyStart: number, line: number, jsx: number, inJsx: boolean } }[]} */
  const stack = [];
  let offset = 0;
  const currentDefine = () => (stack.length && stack[0].define ? stack[0].define : null);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const lineStart = offset;
    offset += line.length + 1;

    if (!res.h1) {
      const h = /^ {0,3}#[ \t]+(.+?)[ \t#\r]*$/.exec(line); // \r：CRLF 的檔案（Windows 的 autocrlf checkout）
      if (h && stack.length === 0) res.h1 = h[1].trim();
    }

    const open = CONTAINER_OPEN.exec(line);
    if (open) {
      const name = open[3];
      const colons = open[2].length;
      /** @type {typeof stack[number]["define"]} */
      let define = null;
      if (name === "define") {
        const attrs = parseAttrs((open[5] ?? "").slice(1, -1));
        const id = attrs.id ?? "";
        if (stack.some((s) => s.name === "define")) {
          res.errors.push({ line: lineNo, message: "define 不可巢狀（define 裡不能再有 define）" });
        } else if (stack.length > 0) {
          res.errors.push({ line: lineNo, message: `define 只能放在最上層，不能放在 :::${stack[stack.length - 1].name} 裡` });
        } else if (!id) {
          res.errors.push({ line: lineNo, message: "define 缺少 id" });
        } else if (!isValidDefId(id)) {
          res.errors.push({ line: lineNo, message: `define 的 id「${id}」格式不符（只能用字母、數字、_、-，以 . 分段）` });
        } else {
          define = { id, label: (attrs.label ?? "").trim(), bodyStart: offset, line: lineNo, jsx: 0, inJsx: false };
        }
      }
      stack.push({ name, colons, line: lineNo, define });
      continue;
    }

    const close = CONTAINER_CLOSE.exec(line);
    if (close && stack.length && close[1].length >= stack[stack.length - 1].colons) {
      const top = /** @type {typeof stack[number]} */ (stack.pop());
      if (top.define) {
        const d = top.define;
        const body = source.slice(d.bodyStart, lineStart);
        const label = d.label || firstBold(masked.slice(d.bodyStart, lineStart)) || d.id;
        res.defines.push({ id: d.id, label, line: d.line, start: d.bodyStart, end: lineStart, components: d.jsx, source: body });
      }
      continue;
    }

    const def = currentDefine();

    const inc = LEAF_INCLUDE.exec(line);
    if (inc) {
      const id = parseAttrs((inc[2] ?? "").slice(1, -1)).id ?? "";
      if (!id) res.errors.push({ line: lineNo, message: "include 缺少 id" });
      else if (!isValidDefId(id)) res.errors.push({ line: lineNo, message: `include 的 id「${id}」格式不符` });
      else res.includes.push({ id, line: lineNo, inDefine: def ? def.id : null });
      if (def) def.inJsx = false;
      continue;
    }

    if (def) {
      if (ESM_LINE.test(line)) {
        res.errors.push({ line: lineNo, message: `define「${def.id}」裡不能有 import／export（請放在檔案開頭）` });
      }
      if (JSX_COMPONENT_LINE.test(line)) {
        // 連續的元件（中間只隔空行）算一個 placeholder
        if (!def.inJsx) def.jsx += 1;
        def.inJsx = true;
      } else if (line.trim() !== "" && !/^\s*<\//.test(line) && !/^\s*[\w-]+=/.test(line) && !/^\s*\/?>\s*$/.test(line)) {
        def.inJsx = false;
      }
    }

    TEXT_REF.lastIndex = 0;
    let m;
    while ((m = TEXT_REF.exec(line))) {
      if (!m[1] && !m[2]) continue; // 光禿禿的 ":ref"（例：「看:ref」）不是引用，交給 directives 的安全網還原
      const id = parseAttrs((m[2] ?? "").slice(1, -1)).id ?? "";
      if (!id) res.errors.push({ line: lineNo, message: ":ref 缺少 id" });
      else if (!isValidDefId(id)) res.errors.push({ line: lineNo, message: `:ref 的 id「${id}」格式不符` });
      else res.refs.push({ id, line: lineNo, inDefine: def ? def.id : null });
    }
  }

  for (const s of stack) {
    if (s.define) res.errors.push({ line: s.line, message: `define「${s.define.id}」沒有收尾（缺少 ${":".repeat(s.colons)}）` });
  }

  const own = new Set(res.defines.map((d) => d.id));
  for (const u of res.includes) {
    if (own.has(u.id)) res.errors.push({ line: u.line, message: `不能 include 自己這篇的定義「${u.id}」（同頁會出現兩份相同內容；要引用請用 :ref）` });
  }
  return res;
}

/**
 * 編輯距離 ≤2 的相近 id（最多 3 個），給「找不到 id」的錯誤訊息用。
 * @param {string} id
 * @param {readonly string[]} all
 */
export function suggestIds(id, all) {
  const dist = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  };
  return all
    .map((c) => ({ c, d: dist(id, c) }))
    .filter((x) => x.d <= 2 && x.c !== id)
    .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
    .slice(0, 3)
    .map((x) => x.c);
}
