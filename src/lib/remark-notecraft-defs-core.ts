/**
 * 定義與引用的 remark transform 核心（docs/notecraft-workbench-define-ref.md §4.3、§5、§6）。
 *
 * 索引、目前檔案的相對路徑、站台前綴都由呼叫端注入，本檔不碰檔案系統與 Node API：
 * app 由 remark-notecraft-defs.ts 接上 defs-state.mjs；官網的「筆記頁」示範在瀏覽器裡接上自己算的索引。
 *
 * 掛在 `remark-directive` 之後、`remarkNotecraftDirectives` 之前：先把 include 的子樹搬進來，
 * 後面的 directives／codeblock／notes-assets／base 才會一併處理嵌入的內容，渲染結果與來源相同。
 *
 * - `::::define{id}` → `section.nc-def#def-<id>`（meta 列＋內容）
 * - `::include{id}`  → `.nc-inc`（來源列＋嵌入內容；元件換成 placeholder、相對路徑改寫、標題層級相對化）
 * - `:ref[文字]{id}` → `a.nc-ref`（mdast link，交給 remarkNotecraftBase 補前綴）
 * - 文末：本篇用到的每個 ref id 各一份預覽內容（hidden 容器內的 `div[data-nc-def]`），給預覽卡用
 *
 * 引用數、錯誤都來自 defs-state.mjs 的索引；define 片段以 `this.parse()` 解析（同一套語法擴充，Task 125）。
 */
import GithubSlugger from "github-slugger";
import { rebaseRelativeUrl } from "./defs-index.mjs";
import type { DefEntry, DefIndex } from "./defs-index.d.mts";

interface MdNode {
  type: string;
  name?: string;
  depth?: number;
  url?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown>; directiveLabel?: boolean };
  position?: unknown;
}
interface VFileLike {
  path?: string;
}
interface Processor {
  parse(text: string): MdNode;
}

const ICON_ATTRS = {
  viewBox: "0 0 24 24",
  width: 12,
  height: 12,
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
  focusable: "false",
};
const HASH_PATHS = ["M4 9h16", "M4 15h16", "M10 3 8 21", "M16 3l-2 18"];
const CORNER_PATHS = ["m15 10 5 5-5 5", "M4 4v7a4 4 0 0 0 4 4h12"];
const BOX_PATHS = ["M21 8 12 3 3 8v8l9 5 9-5Z", "m3 8 9 5 9-5", "M12 13v8"];

function el(hName: string, hProperties: Record<string, unknown>, children: MdNode[] = []): MdNode {
  return { type: "ncElement", data: { hName, hProperties }, children };
}
function text(value: string): MdNode {
  return { type: "text", value };
}
function icon(paths: string[], className: string, size = 12): MdNode {
  return el(
    "svg",
    { ...ICON_ATTRS, width: size, height: size, className: [className] },
    paths.map((d) => el("path", { d })),
  );
}

export interface DefsCoreOptions {
  /** 目前的索引（app：defs-state.mjs 的單例；示範：自己以 buildDefIndex 算） */
  getIndex: () => DefIndex;
  /** 索引有錯誤時丟錯（app：assertDefIndex） */
  assert?: (index: DefIndex) => void;
  /** remark 的 file.path → notesDir 相對路徑；不是筆記回 null */
  relOf: (filePath: string) => string | null;
  /** 站台前綴（NOTECRAFT_BASE）；只用在自己組的 <a>，mdast link 交給 remarkNotecraftBase */
  base?: () => string;
}

let baseOf: () => string = () => "";

/** 與 remarkNotecraftBase 同一套前綴規則（只用在自己組的 <a>；mdast link 交給它）。 */
function withBase(url: string): string {
  const base = baseOf();
  if (!base || !url.startsWith("/") || url.startsWith("//")) return url;
  return url === base || url.startsWith(base + "/") ? url : base + url;
}

function defHref(d: DefEntry): string {
  return `/notes/${d.slug}#def-${d.id}`;
}

function textOf(n: MdNode): string {
  if (typeof n.value === "string" && (n.type === "text" || n.type === "inlineCode")) return n.value;
  return (n.children ?? []).map(textOf).join("");
}

function isComponentName(name: unknown): boolean {
  return typeof name === "string" && (/^[A-Z]/.test(name) || name.includes("."));
}

/** MDX 註解：只有 /* … *\/ 的運算式。 */
function isMdxComment(n: MdNode): boolean {
  return (n.type === "mdxFlowExpression" || n.type === "mdxTextExpression") && /^\s*\/\*[\s\S]*\*\/\s*$/.test(n.value ?? "");
}

/** 段落裡只有元件（與空白）→ 當成區塊元件（單行 <X>…</X> 會被解析成這樣，Task 125）。 */
function isComponentParagraph(n: MdNode): boolean {
  if (n.type !== "paragraph" || !n.children?.length) return false;
  let has = false;
  for (const c of n.children) {
    if (c.type === "mdxJsxTextElement" && isComponentName(c.name)) has = true;
    else if (c.type === "text" && !(c.value ?? "").trim()) continue;
    else return false;
  }
  return has;
}

/** §2.5：元件換成 placeholder（連續的區塊合併）、移除 MDX 註解與 ESM。 */
function placeholderize(nodes: MdNode[], href: string): MdNode[] {
  const out: MdNode[] = [];
  let lastWasPh = false;
  for (const n of nodes) {
    if (isMdxComment(n) || n.type === "mdxjsEsm") continue;
    const block =
      (n.type === "mdxJsxFlowElement" && isComponentName(n.name)) || n.type === "mdxFlowExpression" || isComponentParagraph(n);
    if (block) {
      if (!lastWasPh) {
        out.push(
          el("div", { className: ["nc-inc-ph"] }, [
            icon(BOX_PATHS, "nc-inc-ph-ic", 14),
            el("span", { className: ["nc-inc-ph-t"] }, [text("此處有互動元件，請至原文檢視")]),
            el("a", { className: ["nc-inc-ph-go"], href: withBase(href) }, [text("前往原文 ↗")]),
          ]),
        );
      }
      lastWasPh = true;
      continue;
    }
    if (!(n.type === "text" && !(n.value ?? "").trim())) lastWasPh = false;
    if ((n.type === "mdxJsxTextElement" && isComponentName(n.name)) || n.type === "mdxTextExpression") {
      out.push(el("span", { className: ["nc-inc-ph-i"], title: "請至原文檢視" }, [text("〔元件〕")]));
      continue;
    }
    if (n.children) n.children = placeholderize(n.children, href);
    out.push(n);
  }
  return out;
}

const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i;

/** 相對 URL 以來源檔解析，再改成相對於目前檔（後面的 notes-assets／Astro 圖片處理才找得到檔）。 */
function rebasePaths(n: MdNode, srcRel: string, curRel: string): void {
  if ((n.type === "image" || n.type === "link" || n.type === "definition") && typeof n.url === "string" && n.url && !ABSOLUTE_URL.test(n.url)) {
    n.url = rebaseRelativeUrl(n.url, srcRel, curRel);
  }
  n.children?.forEach((c) => rebasePaths(c, srcRel, curRel));
}

function headingsOf(n: MdNode, acc: MdNode[] = []): MdNode[] {
  if (n.type === "heading") acc.push(n);
  n.children?.forEach((c) => headingsOf(c, acc));
  return acc;
}

/** 嵌入處的標題：最高的一級 → 前一個標題的下一級（上限 h4），其餘相對位移；id 為 inc-<defId>-<slug>[-n]。 */
function relativizeHeadings(nodes: MdNode[], baseDepth: number, defId: string, occurrence: number): void {
  const hs = nodes.flatMap((n) => headingsOf(n));
  if (!hs.length) return;
  const min = Math.min(...hs.map((h) => h.depth ?? 6));
  const top = Math.min(baseDepth + 1, 4);
  const slugger = new GithubSlugger();
  for (const h of hs) {
    h.depth = Math.min(top + ((h.depth ?? min) - min), 6);
    const id = `inc-${defId}-${slugger.slug(textOf(h))}${occurrence > 1 ? `-${occurrence}` : ""}`;
    h.data = { ...(h.data ?? {}), hProperties: { ...(h.data?.hProperties ?? {}), id } };
  }
}

/** 預覽卡用：標題改成 div（不進 headings、不產生錨點）。 */
function flattenHeadings(n: MdNode): void {
  if (n.type === "heading") {
    n.data = { ...(n.data ?? {}), hName: "div", hProperties: { className: ["nc-pv-h"] } };
  }
  n.children?.forEach(flattenHeadings);
}

function refLink(node: MdNode, d: DefEntry, isStatic: boolean): void {
  const label = (node.children ?? []).filter((c) => c.data?.directiveLabel);
  const children = label.length ? (label[0].children ?? []) : node.children?.length ? node.children : [text(d.label)];
  node.type = "link";
  node.url = defHref(d);
  node.children = children.length ? children : [text(d.label)];
  delete node.name;
  delete node.attributes;
  node.data = {
    hProperties: {
      className: isStatic ? ["nc-ref", "is-static"] : ["nc-ref"],
      "data-def": d.id,
      ...(isStatic ? { tabIndex: -1 } : { "aria-haspopup": "dialog", "aria-expanded": "false" }),
    },
  };
}

interface Ctx {
  index: DefIndex;
  self: Processor;
  curRel: string;
  /** 本篇用到的 ref id（文件順序），給文末 template */
  refIds: string[];
  /** 各 define 在本篇被 include 的次數（標題 id 的 -2、-3） */
  incCount: Map<string, number>;
  /** 最近一個標題的層級（include 的標題相對化用） */
  lastDepth: number;
  /** 本篇 AST 實際看到的 id（與掃描器對照） */
  seen: { defines: string[]; includes: string[]; refs: string[] };
}

function parseDefine(ctx: Ctx, d: DefEntry): MdNode[] {
  const root = ctx.self.parse(d.source);
  const nodes = placeholderize(root.children ?? [], defHref(d));
  nodes.forEach((n) => rebasePaths(n, d.rel, ctx.curRel));
  return nodes;
}

type Mode = "page" | "include" | "preview";

/** 走訪並就地轉換；回傳替換後的子節點陣列。 */
function transform(nodes: MdNode[], ctx: Ctx, mode: Mode, trail: string[]): MdNode[] {
  const out: MdNode[] = [];
  for (const n of nodes) {
    if (mode === "page" && n.type === "heading") ctx.lastDepth = n.depth ?? ctx.lastDepth;

    if (n.type === "containerDirective" && n.name === "define") {
      const id = n.attributes?.id ?? "";
      const d = ctx.index.defs.get(id);
      if (mode === "page") ctx.seen.defines.push(id);
      // 錯誤已由 assertDefIndex 擋下；這裡只會遇到合法的 define
      const body = transform(n.children ?? [], ctx, mode, trail);
      if (!d || mode !== "page") {
        out.push(...body);
        continue;
      }
      const count = d.refs.length;
      out.push(
        el("section", { className: ["nc-def"], id: `def-${d.id}`, tabIndex: -1, "aria-label": `定義：${d.label}`, "data-def": d.id }, [
          el("div", { className: ["nc-def-meta"] }, [
            el("button", { type: "button", className: ["nc-def-id"], "data-nc-copy": withBase(defHref(d)), title: "複製連結" }, [
              icon(HASH_PATHS, "nc-def-ic"),
              el("span", {}, [text(d.id)]),
            ]),
            el("span", { className: ["nc-def-sep"], "aria-hidden": "true" }),
            count > 0
              ? el("button", { type: "button", className: ["nc-def-cnt"], "aria-haspopup": "dialog", "aria-expanded": "false", "data-def": d.id }, [
                  text("被 "),
                  el("b", {}, [text(String(count))]),
                  text(" 篇引用"),
                  el("svg", { ...ICON_ATTRS, width: 11, height: 11, className: ["nc-def-chev"] }, [el("path", { d: "m6 9 6 6 6-6" })]),
                ])
              : el("span", { className: ["nc-def-cnt", "zero"] }, [text("尚未被引用")]),
          ]),
          el("div", { className: ["nc-def-body"] }, body),
        ]),
      );
      continue;
    }

    if (n.type === "leafDirective" && n.name === "include") {
      const id = n.attributes?.id ?? "";
      if (mode === "page") ctx.seen.includes.push(id);
      const d = ctx.index.defs.get(id);
      if (!d || trail.includes(id)) continue; // 錯誤已在索引擋下；保險起見不無限遞迴
      const occurrence = (ctx.incCount.get(id) ?? 0) + 1;
      if (mode !== "preview") ctx.incCount.set(id, occurrence);
      let body = parseDefine(ctx, d);
      if (mode === "preview") body.forEach(flattenHeadings);
      else relativizeHeadings(body, ctx.lastDepth, id, occurrence);
      body = transform(body, ctx, mode === "preview" ? "preview" : "include", [...trail, id]);
      out.push(
        el(
          "div",
          { className: ["nc-inc"], role: "group", "aria-label": `嵌入內容：${d.label}，來自 ${d.title}`, "data-pagefind-ignore": "", "data-def": d.id },
          [
            el("div", { className: ["nc-inc-src"] }, [
              icon(CORNER_PATHS, "nc-inc-ic"),
              el("span", { className: ["nc-inc-from"] }, [text("嵌入自")]),
              el("span", { className: ["nc-inc-t"] }, [text(d.title)]),
              el("span", { className: ["nc-inc-id"] }, [text(`· ${d.id}`)]),
              el("a", { className: ["nc-inc-go"], href: withBase(defHref(d)) }, [text("前往來源 ↗")]),
            ]),
            el("div", { className: ["nc-inc-body"] }, body),
          ],
        ),
      );
      continue;
    }

    if (n.type === "textDirective" && n.name === "ref") {
      const hasAttrs = n.attributes && Object.keys(n.attributes).length > 0;
      const hasLabel = (n.children ?? []).length > 0;
      if (!hasAttrs && !hasLabel) {
        out.push(n); // 光禿禿的 ":ref" 交給 directives 的安全網還原成字面
        continue;
      }
      const id = n.attributes?.id ?? "";
      if (mode === "page") ctx.seen.refs.push(id);
      const d = ctx.index.defs.get(id);
      if (!d) {
        out.push(n);
        continue;
      }
      refLink(n, d, mode === "preview");
      if (mode !== "preview" && !ctx.refIds.includes(id)) ctx.refIds.push(id);
      out.push(n);
      continue;
    }

    if (n.children) n.children = transform(n.children, ctx, mode, trail);
    out.push(n);
  }
  return out;
}

function templateFor(ctx: Ctx, d: DefEntry): MdNode {
  let body = parseDefine(ctx, d);
  body.forEach(flattenHeadings);
  body = transform(body, ctx, "preview", [d.id]);
  // 不用 <template>：hast 的 template 內容放在 content 屬性，MDX 編譯時 children 會被丟掉（輸出空的 template）。
  // 改放在 hidden 的容器裡；RefLayer 複製時會清掉頁面初始化留下的 data-enhanced。
  return el(
    "div",
    {
      "data-nc-def": d.id,
      "data-label": d.label,
      "data-src-title": d.title,
      "data-src-folder": d.folder,
      "data-href": withBase(defHref(d)),
    },
    body,
  );
}

const warnedMismatch = new Set<string>();
function sameIds(a: string[], b: string[]): boolean {
  const x = [...new Set(a)].sort().join("\n");
  const y = [...new Set(b)].sort().join("\n");
  return x === y;
}

/** 依注入的索引建立 remark plugin（attacher）。 */
export function createRemarkDefs(opts: DefsCoreOptions) {
  return function remarkNotecraftDefs(this: Processor) {
    const self = this;
    return (tree: MdNode, file: VFileLike) => {
      if (!file.path) return;
      const curRel = opts.relOf(file.path);
      if (!curRel) return;
      baseOf = opts.base ?? (() => "");
      const index = opts.getIndex();
      opts.assert?.(index);
      const note = [...index.notes.values()].find((n) => n.rel === curRel);
      if (!note) return;
      const hasAny = note.defines.length || note.includes.length || note.refs.length;
      if (!hasAny) return;

      const ctx: Ctx = {
        index,
        self,
        curRel,
        refIds: [],
        incCount: new Map(),
        lastDepth: 1,
        seen: { defines: [], includes: [], refs: [] },
      };
      tree.children = transform(tree.children ?? [], ctx, "page", []);

      // 與掃描器對照：不一致時引用數可能算錯，印 warn 方便追查（不影響渲染）
      const scanInc = note.includes.map((u) => u.id);
      const scanRef = note.refs.map((u) => u.id);
      if (!sameIds(ctx.seen.defines, note.defines) || !sameIds(ctx.seen.includes, scanInc) || !sameIds(ctx.seen.refs, scanRef)) {
        if (!warnedMismatch.has(curRel)) {
          warnedMismatch.add(curRel);
          console.warn(`[defs] ${curRel}：掃描器與 MDX 解析看到的 define／include／ref 不一致，引用數可能不準`);
        }
      }

      const templates = ctx.refIds.map((id) => ctx.index.defs.get(id)).filter((d): d is DefEntry => !!d).map((d) => templateFor(ctx, d));
      if (templates.length) {
        tree.children!.push(el("div", { hidden: true, "data-pagefind-ignore": "", "data-nc-def-templates": "" }, templates));
      }
    };
  };
}
