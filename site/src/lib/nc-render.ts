// 文件頁示範用的 Markdown 渲染：與 NoteCraftApp 筆記頁同一組外掛、同一個順序。
// build 時在 Astro 端先渲染一次（沒有 JS 也看得到結果），讀者改原文後由瀏覽器動態載入本模組重算。
//
// app 的設定（根目錄 astro.config.mjs）：Astro 內建 GFM、smartypants，接著
// remark-directive → remark-notecraft-directives → remark-notecraft-codeblock；標題 id 由 Astro 的 rehypeHeadingIds 產生。
// 兩支 app 外掛不依賴任何套件，直接從 ../src/lib 取用，規則永遠只有一份。
// 圖片路徑改寫（notes-assets）只在 viewer 模式有作用，示範裡不掛。
// .mdx 的渲染在 nc-render-mdx.ts（MDX 編譯器很大，只有 .md／.mdx 對照的示範才載入）。
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import Slugger from "github-slugger";
import remarkNotecraftDirectives from "../../../src/lib/remark-notecraft-directives.ts";
import remarkNotecraftCodeblock from "../../../src/lib/remark-notecraft-codeblock.ts";
// 定義與引用：索引與 remark 核心都是 app 的同一份（不碰 Node API，瀏覽器可用）
import { buildDefIndex } from "../../../src/lib/defs-index.mjs";
import { createRemarkDefs } from "../../../src/lib/remark-notecraft-defs-core.ts";

export type NcHeading = { depth: number; id: string; text: string };
export type NcRendered = { html: string; warnings: string[]; headings: NcHeading[]; error?: string };

type HNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
};

/** 對應 Astro 的 rehypeHeadingIds：取標題裡所有文字（含行內 code），github-slugger，去掉結尾的 `-`。 */
export function rehypeHeadingIds(out: NcHeading[], prefix: string) {
  return () => (tree: HNode) => {
    const slugger = new Slugger();
    const textOf = (n: HNode): string =>
      n.type === "text" || n.type === "raw" ? (n.value ?? "") : (n.children ?? []).map(textOf).join("");
    const walk = (n: HNode) => {
      if (n.type === "element" && n.tagName && /^h[1-6]$/.test(n.tagName)) {
        const text = textOf(n);
        // 已經有 id 的標題（定義與引用嵌入的 inc-…）照 Astro 的行為保留，不重新產生
        const preset = typeof n.properties?.id === "string" ? (n.properties.id as string) : "";
        let id = preset || slugger.slug(text);
        if (!preset && id.endsWith("-")) id = id.slice(0, -1);
        // 同一頁有好幾個示範、也有文件自己的標題：DOM 上的 id 加前綴，app 實際產生的 id 放 data-nc-id
        n.properties = { ...n.properties, id: prefix ? `${prefix}${id}` : id, ...(prefix ? { dataNcId: id } : {}) };
        out.push({ depth: Number(n.tagName[1]), id, text });
        return;
      }
      n.children?.forEach(walk);
    };
    walk(tree);
  };
}

/**
 * idPrefix：同一頁有多個示範時，app 外掛各自從 0 起算的 nc-tab-0-0、nc-tip-0 這類 id 會重複，
 * 標題 id 也可能撞到文件本身的錨點，所以 DOM 上的 id 一律加前綴。
 */
export const REMARK = [remarkGfm, remarkSmartypants, remarkDirective, remarkNotecraftDirectives, remarkNotecraftCodeblock];

/** 跑一次渲染：收下 app 外掛用 console.warn 寫的 build log，並把 id 加上前綴。 */
export function run(idPrefix: string, ext: "md" | "mdx", fn: (headings: NcHeading[]) => string): NcRendered {
  const warnings: string[] = [];
  const headings: NcHeading[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    // app 外掛的警告會附上檔名；示範裡沒有真的檔案
    warnings.push(
      args
        .map(String)
        .join(" ")
        .replace(/^\[notecraft-directives\]\s*/, "")
        .replace(new RegExp(`（note\\.${ext}）$`), ""),
    );
  };
  try {
    const html = fn(headings)
      .replace(/\b(nc-(?:tab|panel|tip|anno))-(\d)/g, (_, k: string, d: string) => (idPrefix ? `${k}-${idPrefix}${d}` : `${k}-${d}`))
      .trim();
    return { html, warnings, headings };
  } catch (e) {
    return { html: "", warnings, headings, error: describeError(e) };
  } finally {
    console.warn = warn;
  }
}

/** MDX 的錯誤帶行號與欄位（VFileMessage）；執行期的錯誤（例如找不到變數）只有訊息。 */
function describeError(e: unknown): string {
  if (e && typeof e === "object" && "reason" in e) {
    const m = e as { reason: string; line?: number; column?: number };
    return m.line ? `第 ${m.line} 行第 ${m.column ?? 1} 欄：${m.reason}` : m.reason;
  }
  return e instanceof Error ? `${e.name === "Error" ? "" : `${e.name}: `}${e.message}` : String(e);
}

/** 照 .md 筆記渲染（Astro 的 Markdown 管線）。 */
export function renderNote(source: string, idPrefix = ""): NcRendered {
  return run(idPrefix, "md", (headings) =>
    String(
      unified()
        .use(remarkParse)
        .use(REMARK)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeHeadingIds(headings, idPrefix))
        .use(rehypeStringify, { allowDangerousHtml: true })
        .processSync({ value: source, path: "note.md" }),
    ),
  );
}

/** 多檔示範的一個檔案：name 是 notesDir 相對路徑（決定 slug 與資料夾），source 是原文 */
export type NcFile = { name: string; source: string };
export type NcBacklink = { slug: string; title: string; kinds: ("inc" | "ref")[] };
export type NcNoteSet = {
  outs: NcRendered[];
  /** 每個檔案的 slug（筆記頁網址 /notes/<slug>），點連結時用來切換到對應的檔案 */
  slugs: string[];
  titles: string[];
  /** define id → 引用它的檔案（「被 N 篇引用」的清單） */
  backlinks: Record<string, NcBacklink[]>;
};

/**
 * 定義與引用的多檔示範：先以 app 的 buildDefIndex 對整組檔案建索引，再逐檔用 app 的 remark 核心渲染。
 * 索引有錯誤時（id 找不到、重複…）每個檔案都顯示同一份錯誤，對應 app 的 build 失敗。
 */
export function renderNoteSet(files: NcFile[], idPrefix = ""): NcNoteSet {
  const index = buildDefIndex(files.map((f) => ({ rel: f.name, source: f.source })));
  const remarkDefs = createRemarkDefs({
    getIndex: () => index,
    relOf: (p: string) => p,
    assert: (i) => {
      if (i.errors.length) throw new Error(`build 失敗：\n${i.errors.join("\n")}`);
    },
  });
  const notes = files.map((f) => [...index.notes.values()].find((n) => n.rel === f.name));
  const outs = files.map((f, i) => {
    const p = `${idPrefix}f${i}-`;
    const r = run(p, "md", (headings) =>
      String(
        unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkSmartypants)
          .use(remarkDirective)
          .use(remarkDefs)
          .use(remarkNotecraftDirectives)
          .use(remarkNotecraftCodeblock)
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeHeadingIds(headings, p))
          .use(rehypeStringify, { allowDangerousHtml: true })
          // Astro 會先拿掉 frontmatter 再交給 Markdown 管線；換成等量空行，錯誤訊息的行號才對得上原文
          .processSync({ value: f.source.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/, (m) => m.replace(/[^\n]/g, "")), path: f.name }),
      ),
    );
    // 定義的落點 id（def-…）也加前綴：同一頁有好幾個示範、也可能撞到文件自己的錨點
    return { ...r, html: r.html.replace(/\bid="def-/g, `id="${p}def-`) };
  });
  const backlinks: Record<string, NcBacklink[]> = {};
  for (const d of index.defs.values()) {
    backlinks[d.id] = d.refs.map((r) => ({ slug: r.slug, title: index.notes.get(r.slug)?.title ?? r.slug, kinds: r.kinds }));
  }
  return {
    outs,
    slugs: notes.map((n, i) => n?.slug ?? files[i].name),
    titles: notes.map((n, i) => n?.title ?? files[i].name),
    backlinks,
  };
}
