/**
 * 站台部署在子路徑（NOTECRAFT_BASE，例 /notecraft/demo）時，把 Markdown 裡的站內絕對連結補上前綴：
 * `[x](/notes/a)` → `/notecraft/demo/notes/a`。圖片與 reference 定義也一樣。
 *
 * - 沒設 NOTECRAFT_BASE（或是 "/"）→ no-op
 * - 只動 `/` 開頭、不是 `//host` 的 URL；已帶前綴的不重複加
 * - 排在 remark-notecraft-notes-assets 之後，它產生的 /notes-assets/*、/notes/* 也會被補上
 */

interface MdNode {
  type: string;
  url?: string;
  children?: MdNode[];
}

export default function remarkNotecraftBase() {
  const raw = process.env.NOTECRAFT_BASE ?? "";
  const base = raw === "/" ? "" : raw.replace(/\/+$/, "");
  return (tree: MdNode) => {
    if (!base) return;
    const walk = (node: MdNode) => {
      if ((node.type === "link" || node.type === "image" || node.type === "definition") && typeof node.url === "string") {
        const u = node.url;
        if (u.startsWith("/") && !u.startsWith("//") && u !== base && !u.startsWith(base + "/")) node.url = base + u;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
