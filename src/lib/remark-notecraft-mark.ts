/**
 * 螢光標記 `==文字==` → `<mark>`（docs/notecraft-workbench-note-page.md §5.2、Q5：自寫，不引入套件）。
 *
 * 只看 mdast 的 `text` 節點：行內程式碼（inlineCode）、圍欄程式碼（code）、MDX 運算式的值都不是 text，自然不受影響。
 * 不跨節點（`==**粗體**==` 不處理）、不跨行；`===`、`==` 之間沒有字、或內容頭尾是空白時都不算。
 */

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const MARK_RE = /(?<!=)==(?=\S)([^=\n]*?\S)==(?!=)/g;

function split(value: string): MdNode[] | null {
  MARK_RE.lastIndex = 0;
  if (!MARK_RE.test(value)) return null;
  MARK_RE.lastIndex = 0;
  const out: MdNode[] = [];
  let last = 0;
  for (let m = MARK_RE.exec(value); m; m = MARK_RE.exec(value)) {
    if (m.index > last) out.push({ type: "text", value: value.slice(last, m.index) });
    out.push({ type: "ncMark", data: { hName: "mark" }, children: [{ type: "text", value: m[1] }] });
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

export default function remarkNotecraftMark() {
  return (tree: MdNode) => {
    const walk = (node: MdNode): void => {
      const kids = node.children;
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i];
        if (k.type === "text" && k.value) {
          const parts = split(k.value);
          if (parts) {
            kids.splice(i, 1, ...parts);
            i += parts.length - 1;
          }
          continue;
        }
        walk(k);
      }
    };
    walk(tree);
  };
}
