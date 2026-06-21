/**
 * NoteCraft 自訂 remark transform — 把 MDX 圍欄程式碼（mdast `code` 節點）渲染成
 * 設計定稿（design_handoff_mdx_codeblock）的「白底程式碼塊」DOM：
 *   外框 → 標題列（語言標籤 + 複製鈕）→ 固定行號欄 + 可橫捲程式碼 + 整行高亮。
 *
 * 採 build-time 自寫 tokenizer（移植自 prototype/codeblock.jsx 的 CODE_RE / classifyIdent /
 * tokenizeLine），於建構階段產出靜態 HTML，無客戶端高亮 JS。色彩全部走 design-system CSS class
 * → token（見 global.css 的 .nc-cb*），不硬編色碼。
 *
 * 圍欄 meta 支援整行高亮：```ts {2}、```ts {1,3-5}（1-indexed），以及選填檔名 title="path/file"
 * （與語言標籤並存於標題列，可與 {行號} 並用）。
 * 程式碼中的 `(n)!` sentinel 會轉為註解標記（.nc-anno-marker），與 `:::annotate` 容器（見
 * remark-notecraft-directives 的 buildAnnotate）配對互動。
 *
 * 須掛在 remark-directive / remark-notecraft-directives 之後：buildAnnotate 需在 code 仍為原始
 * `code` 節點時讀取其值；本 transform 再把 code 節點改寫為自訂 DOM。
 */

// ── hast 最小型別與工具 ──
interface HastText {
  type: "text";
  value: string;
}
interface HastElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: HastNode[];
}
type HastNode = HastText | HastElement;

function h(tagName: string, properties: Record<string, unknown>, children: HastNode[] = []): HastElement {
  return { type: "element", tagName, properties, children };
}
function t(value: string): HastText {
  return { type: "text", value };
}

// mdast（鬆散）
interface MdNode {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown>; hChildren?: HastNode[] };
}

// ── icons（Lucide 風格，移植自 prototype/icons.jsx）──
type IconPart = string | { rect: Record<string, number> };
function icon(parts: IconPart[], size: number, strokeWidth: number, extraClass: string): HastElement {
  const children = parts.map((p) =>
    typeof p === "string"
      ? h("path", { d: p }, [])
      : h("rect", { ...p.rect }, []),
  );
  return h(
    "svg",
    {
      className: ["nc-cb__ico", extraClass],
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    children,
  );
}
const codeIcon = () => icon(["m16 18 4-4-4-4", "m8 6-4 4 4 4", "m13 4-2 16"], 15, 2, "nc-cb__ico--code");
const copyIcon = () =>
  icon([{ rect: { x: 9, y: 9, width: 11, height: 11, rx: 2 } }, "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"], 14, 1.9, "nc-cb__ico--copy");
const checkIcon = () => icon(["M20 6 9 17l-5-5"], 14, 2.6, "nc-cb__ico--check");

// ── tokenizer（移植自 prototype/codeblock.jsx）──
const KW = new Set(
  "const let var function return if else for while do switch case break continue type interface enum import export from as default new await async class extends implements public private protected readonly static get set null undefined true false void never any unknown in of typeof instanceof this yield delete throw try catch finally".split(
    " ",
  ),
);
// comments | strings | numbers | identifiers | punctuation | whitespace | 其他單一字元（catch-all，避免掉字）
const CODE_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()[\].,;:=<>+\-*/%!&|?~@]+)|(\s+)|(.)/g;

function classifyIdent(word: string, line: string, start: number, end: number): string {
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

function tok(text: string, cat: string): HastElement {
  return h("span", { className: ["nc-cb__t", `nc-cb__t--${cat}`] }, [t(text)]);
}

/** 對一段（不含 annotation 標記的）程式碼文字做 tokenize，spans 推入 out。 */
function tokenizeSegment(seg: string, out: HastNode[]): void {
  let m: RegExpExecArray | null;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(seg)) !== null) {
    if (m[1]) out.push(tok(m[1], "comment"));
    else if (m[2]) out.push(tok(m[2], "string"));
    else if (m[3]) out.push(tok(m[3], "number"));
    else if (m[4]) out.push(tok(m[4], classifyIdent(m[4], seg, m.index, CODE_RE.lastIndex)));
    else if (m[5]) out.push(tok(m[5], "punct"));
    else if (m[6]) out.push(t(m[6])); // whitespace
    else out.push(tok(m[0], "punct")); // catch-all（如 Python `#`）→ 以標點色呈現，不掉字
  }
}

function tokenizeLine(line: string): HastNode[] {
  // 先抽出 `(n)!` annotation 標記，避免被 tokenizer 拆散（標記多落在註解或行尾）。
  const out: HastNode[] = [];
  MARKER_RE.lastIndex = 0;
  let last = 0;
  let mm: RegExpExecArray | null;
  while ((mm = MARKER_RE.exec(line)) !== null) {
    if (mm.index > last) tokenizeSegment(line.slice(last, mm.index), out);
    out.push(markerSpan(mm[1]));
    last = mm.index + mm[0].length;
  }
  if (last < line.length) tokenizeSegment(line.slice(last), out);
  return out.length ? out : [t("​")]; // keep empty lines tall
}

// ── annotation 標記：把 token 文字中的 `(n)!` sentinel 換成標記節點 ──
const MARKER_RE = /\((\d+)\)!/g;
function markerSpan(n: string): HastElement {
  return h(
    "span",
    {
      className: ["nc-anno-marker"],
      "data-anno": n,
      role: "button",
      tabindex: "0",
      "aria-label": `註解 ${n}`,
    },
    [t(n)],
  );
}
// ── 圍欄 meta 的檔名標題：title="src/lib/auth.ts"（單雙引號或不含空白的裸值）──
function parseTitle(meta: string | null | undefined): string {
  const m = /\btitle=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta || "");
  if (!m) return "";
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

// ── 圍欄 meta 的整行高亮：{2}、{1,3-5}（1-indexed）──
function parseHighlights(meta: string | null | undefined): Set<number> {
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

function buildCodeBlock(node: MdNode): void {
  const raw = String(node.value ?? "");
  const lines = raw.split("\n");
  const lang = (node.lang || "").trim();
  const label = (lang || "text").toUpperCase();
  const title = parseTitle(node.meta);
  const hl = parseHighlights(node.meta);

  // 標題列：語言標籤（+ 選填檔名）+ 複製鈕
  const headerLeft: HastNode[] = [
    h("span", { className: ["nc-cb__lang"] }, [
      codeIcon(),
      h("span", { className: ["nc-cb__lang-text"] }, [t(label)]),
    ]),
  ];
  if (title) headerLeft.push(h("span", { className: ["nc-cb__file"] }, [t(title)]));
  const header = h("div", { className: ["nc-cb__header"] }, [
    ...headerLeft,
    h(
      "button",
      {
        type: "button",
        className: ["nc-cb__copy"],
        "data-code": raw,
        "aria-label": "複製程式碼",
      },
      [
        copyIcon(),
        checkIcon(),
        h("span", { className: ["nc-cb__copy-label"], "data-copy": "複製", "data-copied": "已複製" }, [t("複製")]),
      ],
    ),
  ]);

  // 行號欄
  const gutter = h(
    "div",
    { className: ["nc-cb__gutter"], "aria-hidden": "true" },
    lines.map((_, i) =>
      h("div", { className: hl.has(i + 1) ? ["nc-cb__ln", "is-hl"] : ["nc-cb__ln"] }, [t(String(i + 1))]),
    ),
  );

  // 程式碼欄
  const code = h(
    "code",
    { className: ["nc-cb__code"] },
    lines.map((ln, i) =>
      h("div", { className: hl.has(i + 1) ? ["nc-cb__line", "is-hl"] : ["nc-cb__line"] }, tokenizeLine(ln)),
    ),
  );
  const pre = h("pre", { className: ["nc-cb__pre"] }, [code]);

  const body = h("div", { className: ["nc-cb__body"] }, [gutter, pre]);

  // 改 type 為未知節點，避免 mdast-util-to-hast 內建的 `code` handler 仍包一層 <pre>；
  // 未知 type + data.hName/hChildren → to-hast 直接以 data 建構元素（同 directive 機制）。
  node.type = "ncCodeBlock";
  node.data = node.data || {};
  node.data.hName = "div";
  node.data.hProperties = { className: ["nc-cb"], "data-lang": lang || "text" };
  node.data.hChildren = [header, body];
}

export default function remarkNotecraftCodeblock() {
  return (tree: MdNode) => {
    const walk = (parent: MdNode): void => {
      const children = parent.children;
      if (!children) return;
      for (const child of children) {
        if (child.type === "code") {
          buildCodeBlock(child);
          continue;
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
