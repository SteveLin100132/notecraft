// .mdx 版的示範渲染：真的用 MDX 編譯、執行，再輸出成 HTML，所以 `{a: 1}`、`<!-- -->` 這類寫法會得到與 app 相同的錯誤。
// @astrojs/mdx 沿用 Markdown 的 remark 外掛，這裡也用同一組（nc-render.ts 的 REMARK）。
// 與 nc-render.ts 分開：MDX 編譯器（acorn 等）很大，只有 .md／.mdx 對照的示範才需要。
import { evaluateSync } from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { REMARK, rehypeHeadingIds, run, type NcRendered } from "./nc-render";

// ── MDX 運算式裡的未定義變數 ──
// app 在 Node 端 build，`{name}` 找不到變數就 ReferenceError；瀏覽器裡同一段卻會讀到 window.name、window.status 這類全域值。
// 讀者改原文是在瀏覽器重算，所以先自己檢查：運算式引用的名稱不是 JS 內建、也不是這篇 export 出來的，就照 Node 的訊息丟錯。
const JS_GLOBALS = new Set(
  "undefined NaN Infinity globalThis Math JSON Date String Number Boolean Array Object Symbol BigInt RegExp Map Set WeakMap WeakSet Promise Intl Error TypeError RangeError SyntaxError Reflect Proxy parseInt parseFloat isNaN isFinite encodeURI decodeURI encodeURIComponent decodeURIComponent console structuredClone props".split(
    " ",
  ),
);

type EsNode = { type: string; [k: string]: unknown };
type MdxNode = { type: string; data?: { estree?: EsNode }; children?: MdxNode[] };

/** 收集一段 estree 裡「被當成變數讀取」的名稱（略過屬性名、物件鍵、箭頭函式參數與區域宣告）。 */
function freeNames(node: unknown, bound: Set<string>, out: Set<string>, parent?: EsNode, key?: string): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => freeNames(n, bound, out, parent, key));
    return;
  }
  const n = node as EsNode;
  if (n.type === "Identifier") {
    const name = n.name as string;
    const isProp = parent && ((parent.type === "MemberExpression" && key === "property" && !parent.computed) || (parent.type === "Property" && key === "key" && !parent.computed));
    if (!isProp && !bound.has(name)) out.add(name);
    return;
  }
  if (n.type === "JSXIdentifier" || n.type === "JSXAttribute") return;
  let inner = bound;
  if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression") {
    inner = new Set(bound);
    const params = new Set<string>();
    freeNames(n.params, new Set(), params);
    params.forEach((p) => inner.add(p));
  }
  for (const [k, v] of Object.entries(n)) {
    if (k === "type" || k === "loc" || k === "range" || k === "start" || k === "end" || k === "comments") continue;
    if ((n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression") && k === "params") continue;
    freeNames(v, inner, out, n, k);
  }
}

function remarkMdxUndefined() {
  return (tree: MdxNode) => {
    const exported = new Set<string>();
    const exprs: EsNode[] = [];
    const walk = (n: MdxNode) => {
      if (n.type === "mdxjsEsm" && n.data?.estree) {
        // export const x = …／import x from … 的名稱都算已定義
        const json = JSON.stringify(n.data.estree);
        for (const m of json.matchAll(/"name":"([^"]+)"/g)) exported.add(m[1]);
      } else if ((n.type === "mdxFlowExpression" || n.type === "mdxTextExpression") && n.data?.estree) {
        exprs.push(n.data.estree);
      }
      n.children?.forEach(walk);
    };
    walk(tree);
    for (const e of exprs) {
      const names = new Set<string>();
      freeNames(e.body, new Set(), names);
      for (const name of names) {
        if (!JS_GLOBALS.has(name) && !exported.has(name)) throw new ReferenceError(`${name} is not defined`);
      }
    }
  };
}

/** 照 .mdx 筆記渲染。 */
export function renderMdx(source: string, idPrefix = ""): NcRendered {
  return run(idPrefix, "mdx", (headings) => {
    const mod = evaluateSync(
      { value: source, path: "note.mdx" },
      { ...(jsxRuntime as Parameters<typeof evaluateSync>[1]), remarkPlugins: [remarkMdxUndefined, ...REMARK], rehypePlugins: [rehypeHeadingIds(headings, idPrefix)] },
    );
    return renderToStaticMarkup(createElement(mod.default));
  });
}
