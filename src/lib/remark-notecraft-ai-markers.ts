/**
 * 待生成的 `@ai-visualize` 標記在原位渲染成提示卡（docs/notecraft-workbench-note-page.md §5.5、Q6）。
 *
 * 標記是 MDX 註解（mdast 的 `mdxFlowExpression`），本身不輸出任何東西；這裡在它後面插一個純 HTML 的卡片。
 * 只處理 status 為 pending／failed 的標記：generated 已由 GeneratedFrame 呈現、locked 是作者刻意保留，都不畫。
 * 解析與筆記頁的「待生成 N」計數用同一支 parseMarkers（lib/note-text.ts），YAML 壞掉的標記照樣略過、不 throw。
 * 卡片帶 data-pagefind-ignore：prompt 不是筆記內文，不該被搜尋到。
 */
import { parseMarkers, type AiMarker } from "./note-text.ts";

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const STATUS_LABEL: Record<string, string> = { pending: "待生成", failed: "生成失敗" };

function el(hName: string, hProperties: Record<string, unknown>, children: MdNode[] = []): MdNode {
  return { type: "ncElement", data: { hName, hProperties }, children };
}
const text = (value: string): MdNode => ({ type: "text", value });

function sparkle(): MdNode {
  return el(
    "svg",
    { className: ["nc-aim__ic"], viewBox: "0 0 24 24", width: 13, height: 13, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
    [el("path", { d: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z" })],
  );
}

function card(m: AiMarker): MdNode {
  return el("div", { className: ["nc-aim", `nc-aim--${m.status}`], role: "note", "data-pagefind-ignore": "", "data-nc-aim": m.id }, [
    el("div", { className: ["nc-aim__h"] }, [
      sparkle(),
      el("code", {}, [text(`@ai-visualize · ${m.id}`)]),
      el("span", { className: ["nc-aim__ty"] }, [text(m.type)]),
      el("span", { className: ["nc-aim__st"] }, [text(STATUS_LABEL[m.status] ?? m.status)]),
    ]),
    el("div", { className: ["nc-aim__b"] }, [
      el("div", { className: ["nc-aim__l"] }, [text("PROMPT")]),
      el("p", {}, [text(m.prompt)]),
      el("div", { className: ["nc-aim__n"] }, [
        text(m.status === "failed" ? "生成失敗：調整提示詞後，在 Claude Code 中請 AI 重新處理此標記。" : "尚未生成：在 Claude Code 中請 AI 處理此標記，元件就會渲染在這裡。"),
      ]),
    ]),
  ]);
}

export default function remarkNotecraftAiMarkers() {
  return (tree: MdNode) => {
    const walk = (node: MdNode): void => {
      const kids = node.children;
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i];
        if (k.type === "mdxFlowExpression" && k.value && k.value.includes("@ai-visualize")) {
          const cards = parseMarkers(`{${k.value}}`)
            .filter((m) => m.status === "pending" || m.status === "failed")
            .map(card);
          if (cards.length) {
            kids.splice(i + 1, 0, ...cards);
            i += cards.length;
          }
          continue;
        }
        walk(k);
      }
    };
    walk(tree);
  };
}
