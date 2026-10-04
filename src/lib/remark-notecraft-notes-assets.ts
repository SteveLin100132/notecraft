/**
 * P2：把 viewer 模式下的外部 MDX 中的**相對圖片路徑**重寫成 `/notes-assets/*`。
 *
 * - 沒設 `NOTECRAFT_NOTES_DIR` → no-op（主專案圖片都在 public/ 或 src/assets/，不受影響）
 * - 有 env → 走 mdast image 節點：
 *     - 跳過絕對 URL（http:/https:/data:/mailto:）、頁內 anchor、絕對路徑（/）
 *     - 相對路徑 `./foo.png`、`../assets/x.png`、`foo.png` → resolve 到 MDX 檔案所在目錄
 *     - 再用 path.relative(notesDir, 絕對路徑) 得到 notesDir 相對，如果落在外面就跳過（避免 leak）
 *     - 產生 `/notes-assets/<notesDir-relative-with-forward-slash>`
 *
 * 順便處理**筆記間內連結**：`[test1](./test/test1.mdx)` → `/notes/test/test1`。
 * 直覺跟 GitHub / VS Code 一致（點 .md/.mdx 檔就跳到那頁），不用作者記得手寫 `/notes/<slug>`。
 * 只認 .md / .mdx 副檔名；query / hash 會保留。落在 notesDir 外的連結不動。
 *
 * URL 提供端：view／serve 期間由 `src/dev-api/handlers.mjs` 的 `handleNotesAsset` 即時送出；
 * build 時由 `src/lib/notes-assets-integration.ts` 把產物引用到的檔案複製進 `<outDir>/notes-assets/`。
 */

import path from "node:path";
import { getNotesIgnore } from "./notes-ignore-state.mjs";

function decodeSafe(s: string): string {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

interface MdNode {
  type: string;
  url?: string;
  children?: MdNode[];
}
interface VFileLike {
  path?: string;
  history?: string[];
}

function isRewritable(url: string | undefined): boolean {
  if (!url) return false;
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) return false; // http:, https:, data:, mailto:, ...
  if (url.startsWith("//")) return false; // protocol-relative
  if (url.startsWith("#")) return false;
  if (url.startsWith("/")) return false; // 已是絕對路徑
  return true;
}

// 從 URL 抽出 path / query / hash 三段，rewrite 只動 path。
function splitUrl(url: string): { pathPart: string; suffix: string } {
  const m = url.match(/^([^?#]*)([?#].*)?$/);
  return { pathPart: m?.[1] ?? url, suffix: m?.[2] ?? "" };
}

// 同一組（來源, 目標）只 warn 一次：dev 下同一篇會被重複 transform
const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
}

/** .notecraft/ignore.json（docs/notecraft-ignore-config.md §5.5）：rel 為 / 分隔、相對 notesDir。 */
function ignoredRel(rel: string): boolean {
  try {
    return getNotesIgnore().ignores(rel);
  } catch {
    return false; // 含 . 片段等怪路徑：交給原本的流程
  }
}

function walk(node: MdNode, notesDir: string, mdxAbsPath: string) {
  const from = () => path.relative(notesDir, mdxAbsPath).split(path.sep).join("/");
  if (node.type === "image" && isRewritable(node.url)) {
    const imgAbs = path.resolve(path.dirname(mdxAbsPath), node.url!);
    const rel = path.relative(notesDir, imgAbs);
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
      const posix = rel.split(path.sep).join("/");
      if (ignoredRel(decodeSafe(splitUrl(posix).pathPart))) {
        // 被排除的檔不改寫、不複製（隱私保證，規格 §6）；連結維持原樣，在產物裡是壞圖
        warnOnce(`img:${from()}>${posix}`, `[ignore] ${from()} 引用被排除的 ${posix}，不會出現在產物`);
      } else {
        node.url = `/notes-assets/${posix}`;
      }
    }
  }
  if (node.type === "link" && isRewritable(node.url)) {
    const { pathPart, suffix } = splitUrl(node.url!);
    if (/\.mdx?$/i.test(pathPart)) {
      const linkAbs = path.resolve(path.dirname(mdxAbsPath), pathPart);
      const rel = path.relative(notesDir, linkAbs);
      if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
        const posix = rel.split(path.sep).join("/");
        const slug = posix.replace(/\.mdx?$/i, "");
        // 被排除的筆記照樣改寫（不改寫也是壞連結），但讓作者知道會 404
        if (ignoredRel(decodeSafe(posix))) {
          warnOnce(`link:${from()}>${posix}`, `[ignore] ${from()} 連到被排除的 ${posix}，該連結會 404`);
        }
        node.url = `/notes/${slug}${suffix}`;
      }
    }
  }
  if (node.children) for (const c of node.children) walk(c, notesDir, mdxAbsPath);
}

export default function remarkNotecraftNotesAssets() {
  const envDir = process.env.NOTECRAFT_NOTES_DIR;
  if (!envDir) {
    // 主專案模式：整個 transform 是 no-op
    return () => {};
  }
  const notesDir = path.resolve(process.cwd(), envDir);
  return (tree: MdNode, file: VFileLike) => {
    const mdxAbsPath = file.path;
    if (!mdxAbsPath) return;
    walk(tree, notesDir, mdxAbsPath);
  };
}
