/**
 * 共用的程式碼 tokenizer（Task 38）—— **零依賴、不碰 DOM、不產生任何節點型別**。
 *
 * 原本住在 `remark-notecraft-codeblock.ts` 裡並直接產出 hast；deck 的 `<Code>` 原子是
 * runtime React 元件，用不到 hast，故抽成中性的 `CodePart[]`，由兩端各自映射：
 *
 *   remark（build-time，筆記內文）  →  hast <span class="nc-cb__t nc-cb__t--{cat}">
 *   <Code>（runtime，1600×900 投影片）→  JSX <span style={codeTone(dark)[cat]}>
 *
 * 這樣筆記與簡報的**上色規則保證一致**（同一份 tokenizer），只有色彩取法不同
 * （筆記走 CSS class → token，投影片走 dkt(dark) 的 inline style，因為投影片有暗色模式）。
 *
 * tokenizer 本身移植自 prototype/codeblock.jsx，語法規則未改動。
 */

export type CodeTokenCat =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "func"
  | "type"
  | "attr"
  | "punct"
  | "plain";

/**
 * 一行程式碼切出來的片段。
 *
 * - `tok`：要上色的 token。
 * - `space`：空白（含空行的佔位字元）—— **不上色、不包 span**，兩端都直接輸出純文字。
 * - `marker`：`(n)!` sentinel，筆記端轉為可互動的註解標記、deck 端轉為靜態編號徽章。
 */
export type CodePart =
  | { kind: "tok"; text: string; cat: CodeTokenCat }
  | { kind: "space"; text: string }
  | { kind: "marker"; n: string };

/** 空行的佔位字元（U+200B）—— 讓空行仍有行高，不會塌掉。 */
export const EMPTY_LINE_CHAR = "​";

const KW = new Set(
  "const let var function return if else for while do switch case break continue type interface enum import export from as default new await async class extends implements public private protected readonly static get set null undefined true false void never any unknown in of typeof instanceof this yield delete throw try catch finally".split(
    " ",
  ),
);

// comments | strings | numbers | identifiers | punctuation | whitespace | 其他單一字元（catch-all，避免掉字）
const CODE_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\].,;:=<>+\-*/%!&|?~@]+)|(\s+)|(.)/g;

/** annotation 標記 sentinel：`(1)!` */
const MARKER_RE = /\((\d+)\)!/g;

function classifyIdent(word: string, line: string, start: number, end: number): CodeTokenCat {
  if (KW.has(word)) return "keyword";
  let n = end;
  while (n < line.length && line[n] === " ") n++;
  let p = start - 1;
  while (p >= 0 && line[p] === " ") p--;
  const nextCh = line[n];
  const prevCh = line[p];
  if (prevCh === "<" || prevCh === ".") return /^[A-Z]/.test(word) ? "type" : nextCh === "(" ? "func" : "attr";
  if (nextCh === "(") return "func";
  if (nextCh === "=" && line[n + 1] !== "=") return "attr"; // JSX attr / assignment target
  if (/^[A-Z]/.test(word)) return "type"; // Component / Type names
  return "plain";
}

/** 對一段（不含 annotation 標記的）程式碼文字做 tokenize，片段推入 out。 */
function tokenizeSegment(seg: string, out: CodePart[]): void {
  let m: RegExpExecArray | null;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(seg)) !== null) {
    if (m[1]) out.push({ kind: "tok", text: m[1], cat: "comment" });
    else if (m[2]) out.push({ kind: "tok", text: m[2], cat: "string" });
    else if (m[3]) out.push({ kind: "tok", text: m[3], cat: "number" });
    else if (m[4]) out.push({ kind: "tok", text: m[4], cat: classifyIdent(m[4], seg, m.index, CODE_RE.lastIndex) });
    else if (m[5]) out.push({ kind: "tok", text: m[5], cat: "punct" });
    else if (m[6]) out.push({ kind: "space", text: m[6] });
    else out.push({ kind: "tok", text: m[0], cat: "punct" }); // catch-all（如 Python `#`）→ 以標點色呈現，不掉字
  }
}

/**
 * 把一行程式碼切成中性片段。空行回傳單一 `space`（U+200B），保住行高。
 */
export function tokenizeLine(line: string): CodePart[] {
  // 先抽出 `(n)!` annotation 標記，避免被 tokenizer 拆散（標記多落在註解或行尾）。
  const out: CodePart[] = [];
  MARKER_RE.lastIndex = 0;
  let last = 0;
  let mm: RegExpExecArray | null;
  while ((mm = MARKER_RE.exec(line)) !== null) {
    if (mm.index > last) tokenizeSegment(line.slice(last, mm.index), out);
    out.push({ kind: "marker", n: mm[1] });
    last = mm.index + mm[0].length;
  }
  if (last < line.length) tokenizeSegment(line.slice(last), out);
  return out.length ? out : [{ kind: "space", text: EMPTY_LINE_CHAR }];
}

/**
 * 圍欄 meta 的整行高亮：`{2}`、`{1,3-5}`（1-indexed）。
 * deck 的 `<Code>` 直接收陣列，不解析 meta，但共用同一套範圍展開語意。
 */
export function parseHighlights(meta: string | null | undefined): Set<number> {
  const set = new Set<number>();
  const m = /\{([^}]*)\}/.exec(meta || "");
  if (!m) return set;
  for (const part of m[1].split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(seg);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
    } else if (/^\d+$/.test(seg)) {
      set.add(Number(seg));
    }
  }
  return set;
}

/** 把 `[3, [7, 9]]` 這種混合寫法展開成行號集合（deck `<Code>` 的 `highlight` 用）。 */
export function expandLineRanges(ranges: readonly (number | readonly [number, number])[]): Set<number> {
  const set = new Set<number>();
  for (const r of ranges) {
    if (typeof r === "number") {
      set.add(r);
      continue;
    }
    const [a, b] = r;
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
  }
  return set;
}
