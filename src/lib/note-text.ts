// 從筆記原始內文推導文字的純函式：備用標題（H1）、excerpt、@ai-visualize 標記。
//
// 內文是 MDX／Markdown 原始碼，不是 AST：程式碼區塊裡的 `# 註解`、`@ai-visualize` 標記裡的
// prompt 都只是「長得像」標題或段落的字，必須先排除（stripNonProse）再比對。
// 零 runtime import：scripts/checks/app-note-text.mjs 以 Node 的 strip-types 直接載入本檔。

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const COMMENT_OPEN = "{/*";
const COMMENT_CLOSE = "*/}";

/**
 * 去掉 fenced code block（``` 與 ~~~，收尾要同字元且不短於開頭）與 MDX 註解 `{/* … *\/}`，
 * 其餘行原樣保留（含換行，段落切分不受影響）。
 * 未收尾的程式碼區塊照 CommonMark 規則延伸到文末；未收尾的註解同樣吃到文末。
 */
export function stripNonProse(body: string): string {
  const out: string[] = [];
  let fence: { ch: string; len: number } | null = null;
  let inComment = false;
  for (const line of body.split("\n")) {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.ch && close[1].length >= fence.len) fence = null;
      continue;
    }
    let rest = line;
    let kept = "";
    if (inComment) {
      const end = rest.indexOf(COMMENT_CLOSE);
      if (end === -1) continue;
      inComment = false;
      rest = rest.slice(end + COMMENT_CLOSE.length);
    }
    for (;;) {
      const start = rest.indexOf(COMMENT_OPEN);
      if (start === -1) {
        kept += rest;
        break;
      }
      kept += rest.slice(0, start);
      const end = rest.indexOf(COMMENT_CLOSE, start + COMMENT_OPEN.length);
      if (end === -1) {
        inComment = true;
        break;
      }
      rest = rest.slice(end + COMMENT_CLOSE.length);
    }
    // 註解吃掉整行（或只剩空白）時不留空行之外的痕跡；開 fence 只看「行首就是 fence」
    const open = !inComment && kept === line ? kept.match(FENCE_OPEN) : null;
    if (open) {
      fence = { ch: open[1][0], len: open[1].length };
      continue;
    }
    out.push(kept);
  }
  return out.join("\n");
}

/** 內文第一個真正的 H1（`# 標題`），程式碼區塊與 MDX 註解裡的不算 */
export function firstH1(body: string | undefined | null): string | undefined {
  if (!body) return undefined;
  const m = stripNonProse(body).match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : undefined;
}

export function excerpt(body: string | undefined | null, fallback: string): string {
  if (!body) return fallback.replace(/\s+/g, " ").slice(0, 220);
  const stripped = stripNonProse(body.replace(/^---[\s\S]*?---/, ""))
    .replace(/^import[^\n]*$/gm, "")
    .replace(/<[A-Z][^>]*\/?>/g, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/^\s*[-*]\s.*$/gm, "")
    .replace(/^>\s.*$/gm, "")
    .trim();
  const para = stripped.split(/\n{2,}/).find((p) => p.trim().length > 0);
  return (para || fallback).replace(/\s+/g, " ").slice(0, 220);
}

export type AiMarker = {
  id: string;
  type: string;
  status: "pending" | "generated" | "locked" | "failed";
  prompt: string;
  caption?: string;
};

const MARKER_RE = /\{\/\*\s*@ai-visualize\s+([\s\S]*?)\*\/\}/g;

/**
 * 只有 .mdx 的標記會被 AI 流程（note-scanner）處理；.md 不是 MDX，`{/* *\/}` 也不是註解，
 * 算進「待生成」只會永遠掛在佇列裡。沒有路徑時（不該發生）視為可處理，維持舊行為。
 */
export function acceptsMarkers(filePath: string | undefined | null): boolean {
  return !filePath || /\.mdx$/i.test(filePath);
}

export function parseMarkers(body: string | undefined | null): AiMarker[] {
  const out: AiMarker[] = [];
  if (!body) return out;
  for (const m of body.matchAll(MARKER_RE)) {
    const raw = m[1];
    const obj: Record<string, string> = {};
    let key: string | null = null;
    let multi: string[] | null = null;
    for (const line of raw.split("\n")) {
      const trimmed = line.replace(/\s+$/, "");
      if (multi) {
        if (/^\s*\S/.test(trimmed) && !/^\s{2,}/.test(trimmed) && trimmed.includes(":")) {
          obj[key!] = multi.join("\n").trim();
          multi = null;
          key = null;
        } else {
          multi.push(trimmed.replace(/^\s{2}/, ""));
          continue;
        }
      }
      const mk = trimmed.match(/^\s*([a-zA-Z_]\w*)\s*:\s*(.*)$/);
      if (!mk) continue;
      const k = mk[1];
      const v = mk[2];
      if (v === "|") {
        key = k;
        multi = [];
      } else {
        obj[k] = v.trim();
      }
    }
    if (multi && key) obj[key] = multi.join("\n").trim();
    if (obj.id) {
      out.push({
        id: obj.id,
        type: obj.type || "free",
        status: (obj.status as AiMarker["status"]) || "pending",
        prompt: obj.prompt || "",
        ...(obj.caption ? { caption: obj.caption } : {}),
      });
    }
  }
  return out;
}
