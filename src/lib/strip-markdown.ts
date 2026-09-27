// 資料檔 meta.description 的 Markdown → 單行純文字。
//
// meta.description 允許 Markdown（例：ER plugin 的 Wiki 總覽頁），但 app 把它用在
// <meta name="description">、/view 頁 Toolbar、/wb-index.json、系列章節 —— 這些地方只要文字，
// 原樣輸出會出現 `**`、`##`、反引號（pagefind 的索引也會收進這些符號）。
//
// 規則與 plugins/er-diagram-renderer/markdown-text.ts 的 stripMarkdown 相同（app 不能 import plugin，
// 所以各寫一份），兩者輸出由 scripts/checks/app-strip-markdown.mjs 對照 —— 改一邊時兩邊要一起改。
// 零 runtime import：scripts/checks 以 Node 的 strip-types 直接載入本檔。

const HEADING = /^(#{1,6})\s+/;
const QUOTE = /^>\s?/;
const LIST = /^(-|\d+\.)\s+/;
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g;

function inlineText(line: string): string {
  const text = line.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  let out = "";
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0];
    const at = m.index ?? 0;
    out += text.slice(last, at).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    if (tok.startsWith("**")) out += tok.slice(2, -2);
    /* 反引號內的 table:／schema: 是 ER plugin 的連結前綴，純文字不需要 */
    else if (tok.startsWith("`")) out += tok.slice(1, -1).replace(/^(table|schema):(?=\S)/, "");
    else out += (/^\[([^\]]+)\]/.exec(tok) as RegExpExecArray)[1];
    last = at + tok.length;
  }
  out += text.slice(last).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  /* HTML 標籤不該出現在摘要裡 */
  return out.replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function blocks(src: string): { heading: boolean; text: string }[] {
  const out: { heading: boolean; text: string }[] = [];
  let cur: string[] = [];
  let curKind = "";
  const flush = () => {
    if (cur.length) out.push({ heading: false, text: squash(cur.join(" ")) });
    cur = [];
  };
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const l = raw.trim();
    if (!l) {
      flush();
      continue;
    }
    if (HEADING.test(l)) {
      flush();
      out.push({ heading: true, text: squash(inlineText(l.replace(HEADING, ""))) });
      continue;
    }
    const kind = QUOTE.test(l) ? "quote" : LIST.test(l) ? "list" : "p";
    if (kind !== curKind) flush();
    curKind = kind;
    cur.push(inlineText(l.replace(QUOTE, "").replace(LIST, "")));
  }
  flush();
  return out.filter((b) => b.text);
}

/** 第一個非標題區塊（沒有的話取第一個標題），單行。顯示用：頁面描述、Toolbar、清單摘要。 */
export function stripMarkdownFirst(src: string | undefined): string {
  if (!src) return "";
  const b = blocks(src);
  return (b.find((x) => !x.heading) ?? b[0])?.text ?? "";
}

/** 全文，區塊以空白分隔，單行。索引用：pagefind。 */
export function stripMarkdownAll(src: string | undefined): string {
  if (!src) return "";
  return squash(blocks(src).map((b) => b.text).join(" "));
}
