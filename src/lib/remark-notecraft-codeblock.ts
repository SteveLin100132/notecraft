/**
 * NoteCraft 自訂 remark transform — 把 MDX 圍欄程式碼（mdast `code` 節點）渲染成
 * 設計定稿（design_handoff_mdx_codeblock）的「白底程式碼塊」DOM：
 *   外框 → 標題列（語言標籤 + 複製鈕）→ 固定行號欄 + 可橫捲程式碼 + 整行高亮。
 *
 * 採 build-time 自寫 tokenizer，於建構階段產出靜態 HTML，無客戶端高亮 JS。色彩全部走
 * design-system CSS class → token（見 global.css 的 .nc-cb*），不硬編色碼。
 *
 * **tokenizer 本身住在 `code-tokenize.ts`**（Task 38 抽出）—— 它只吐中性的 `CodePart[]`，
 * 本檔負責映射成 hast；deck 的 `<Code>` 原子共用同一支、映射成 JSX。語法規則因此只有一份。
 *
 * 圍欄 meta 支援整行高亮：```ts {2}、```ts {1,3-5}（1-indexed），以及選填檔名 title="path/file"
 * （與語言標籤並存於標題列，可與 {行號} 並用）。
 * 程式碼中的 `(n)!` sentinel 會轉為註解標記（.nc-anno-marker），與 `:::annotate` 容器（見
 * remark-notecraft-directives 的 buildAnnotate）配對互動。
 *
 * 須掛在 remark-directive / remark-notecraft-directives 之後：buildAnnotate 需在 code 仍為原始
 * `code` 節點時讀取其值；本 transform 再把 code 節點改寫為自訂 DOM。
 */

import { parseHighlights, tokenizeLine as tokenizeLineParts } from "./code-tokenize";

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
const copyIcon = () =>
  icon([{ rect: { x: 9, y: 9, width: 11, height: 11, rx: 2 } }, "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"], 14, 1.9, "nc-cb__ico--copy");
const checkIcon = () => icon(["M20 6 9 17l-5-5"], 14, 2.6, "nc-cb__ico--check");

// ── CodePart[] → hast 映射（tokenizer 規則見 code-tokenize.ts）──

function tok(text: string, cat: string): HastElement {
  return h("span", { className: ["nc-cb__t", `nc-cb__t--${cat}`] }, [t(text)]);
}

// 註解標記前面補上該語言的行尾註解符號（note-page §5.4）：讓 `(1)!` 看起來是一則註解，而不是程式碼的一部分。
// 標記之前已經有註解 token（作者自己寫了 `// (1)!`）就不重複；不知道註解符號的語言（json、text…）不補
const LINE_COMMENT: Record<string, string> = {
  js: "//", jsx: "//", ts: "//", tsx: "//", mjs: "//", cjs: "//", javascript: "//", typescript: "//",
  java: "//", kotlin: "//", swift: "//", go: "//", rust: "//", rs: "//", c: "//", cpp: "//", cs: "//", csharp: "//",
  php: "//", scss: "//", less: "//", dart: "//", scala: "//", groovy: "//", jsonc: "//", astro: "//",
  sh: "#", bash: "#", zsh: "#", shell: "#", console: "#", powershell: "#", ps1: "#", py: "#", python: "#",
  rb: "#", ruby: "#", yaml: "#", yml: "#", toml: "#", ini: "#", dockerfile: "#", docker: "#", r: "#", perl: "#", makefile: "#",
  sql: "--", lua: "--", haskell: "--", hs: "--",
};

function tokenizeLine(line: string, lang = ""): HastNode[] {
  const parts = tokenizeLineParts(line);
  const prefix = LINE_COMMENT[lang.toLowerCase()];
  const out: HastNode[] = [];
  let sawComment = false;
  parts.forEach((p, i) => {
    if (p.kind === "tok") {
      if (p.cat === "comment") sawComment = true;
      out.push(tok(p.text, p.cat));
    } else if (p.kind === "space") {
      out.push(t(p.text));
    } else {
      if (!sawComment && prefix) {
        const prev = parts[i - 1];
        const needSpace = i > 0 && !(prev?.kind === "space" && /\s$/.test(prev.text));
        out.push(tok(`${needSpace ? " " : ""}${prefix} `, "comment"));
        sawComment = true;
      }
      out.push(markerSpan(p.n));
    }
  });
  return out;
}

/** diff 區塊：```diff 或 meta 帶 `diff`（例：```ts diff）。每行第一個字元 + / - / 空白決定類型 */
function diffKind(line: string): "add" | "del" | "" {
  return line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "";
}

// 複製鈕要給出「可直接執行」的原始碼，故把 `(n)!` sentinel（連同其前方空白）剔除；
// 否則貼進終端機會多出 `(1)!`，且無法用 `\` 換行的長指令標註參數（註解不能放在續行內）。
const ANNO_SENTINEL_RE = /[ \t]*\(\d+\)!/g;

// ── annotation 標記：`(n)!` sentinel → 可互動的註解標記節點 ──
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

// 圍欄 meta 的整行高亮（`{2}`、`{1,3-5}`）解析在 code-tokenize.ts，與 deck 共用同一套語意。

function buildCodeBlock(node: MdNode): void {
  const raw = String(node.value ?? "");
  const rawLang = (node.lang || "").trim();
  const isDiff = rawLang.toLowerCase() === "diff" || /(^|\s)diff(\s|$)/.test(node.meta || "");
  // diff 的內容語言：```ts diff 取 ts；```diff 可用 lang=ts 指定
  const lang = rawLang.toLowerCase() === "diff" ? (/\blang=(\S+)/.exec(node.meta || "")?.[1] ?? "") : rawLang;
  const allLines = raw.split("\n");
  const kinds = allLines.map((ln) => (isDiff ? diffKind(ln) : ""));
  const lines = isDiff ? allLines.map((ln) => (/^[+\- ]/.test(ln) ? ln.slice(1) : ln)) : allLines;
  const label = (isDiff && !lang ? "diff" : lang || "text").toUpperCase();
  const title = parseTitle(node.meta);
  const hl = parseHighlights(node.meta);
  const copyText = (isDiff ? lines.join("\n") : raw).replace(ANNO_SENTINEL_RE, "");

  // 標題列（note-page §5.3）：檔名 → 語言 → 複製。經典主題以 CSS order 把語言移到最前面
  const headerLeft: HastNode[] = [];
  if (title) headerLeft.push(h("span", { className: ["nc-cb__file"] }, [t(title)]));
  headerLeft.push(h("span", { className: ["nc-cb__lang"] }, [h("span", { className: ["nc-cb__lang-text"] }, [t(label)])]));
  const header = h("div", { className: ["nc-cb__header"] }, [
    ...headerLeft,
    h(
      "button",
      {
        type: "button",
        className: ["nc-cb__copy"],
        "data-code": copyText,
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
  const rowClass = (base: string, i: number) => [base, ...(hl.has(i + 1) ? ["is-hl"] : []), ...(kinds[i] ? [`is-${kinds[i]}`] : [])];
  const gutter = h(
    "div",
    { className: ["nc-cb__gutter"], "aria-hidden": "true" },
    lines.map((_, i) =>
      h("div", { className: rowClass("nc-cb__ln", i) }, [
        t(isDiff ? (kinds[i] === "add" ? "+" : kinds[i] === "del" ? "−" : "\u00a0") : String(i + 1)),
      ]),
    ),
  );

  // 程式碼欄
  const code = h(
    "code",
    { className: ["nc-cb__code"] },
    lines.map((ln, i) =>
      h("div", { className: rowClass("nc-cb__line", i) }, tokenizeLine(ln, lang)),
    ),
  );
  const pre = h("pre", { className: ["nc-cb__pre"] }, [code]);

  const body = h("div", { className: ["nc-cb__body"] }, [gutter, pre]);

  // 改 type 為未知節點，避免 mdast-util-to-hast 內建的 `code` handler 仍包一層 <pre>；
  // 未知 type + data.hName/hChildren → to-hast 直接以 data 建構元素（同 directive 機制）。
  node.type = "ncCodeBlock";
  node.data = node.data || {};
  node.data.hName = "div";
  node.data.hProperties = { className: isDiff ? ["nc-cb", "nc-cb--diff"] : ["nc-cb"], "data-lang": isDiff ? "diff" : lang || "text" };
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
