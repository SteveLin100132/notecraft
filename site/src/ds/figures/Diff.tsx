import type { ReactNode } from "react";

export type DiffLine = {
  /** `ctx` 上下文、`add` 新增（tint 底 sheet 字）、`del` 刪除（del-bg 底 del-ink 字）。 */
  kind: "ctx" | "add" | "del";
  /** 行內容，不含前綴；前綴（空白、+、-）由 kind 決定。 */
  text: string;
};

export type DiffProps = {
  /** 頭部的檔名。 */
  file?: string;
  /** 頭部右側的標籤，示意用的 diff 寫「示意」。 */
  tag?: string;
  lines?: DiffLine[];
  /** 圖說：通常列出新檔路徑與其 Ref。 */
  caption?: ReactNode;
};

const DEFAULT_LINES: DiffLine[] = [
  { kind: "ctx", text: "{/* @ai-visualize" },
  { kind: "ctx", text: "id: oauth-flow" },
  { kind: "del", text: "status: pending" },
  { kind: "add", text: "status: generated" },
  { kind: "ctx", text: "*/}" },
  { kind: "add", text: "import OauthFlow from '@notes/components/oauth-flow'" },
];

const PREFIX = { ctx: "  ", add: "+ ", del: "- " } as const;

/** Diff 圖：1.5px 墨框、等寬字，頭部檔名＋標籤。只放在 paper 上。 */
export function Diff({ file = "notes/guides/oauth/flow.mdx", tag = "示意", lines = DEFAULT_LINES, caption }: DiffProps) {
  return (
    <figure className="diff">
      <div className="diff-head">
        <span>{file}</span>
        <span className="diff-tag">{tag}</span>
      </div>
      <pre className="diff-body">
        <code>
          {lines.map((l, i) => (
            <span key={i} className={`d-${l.kind}`}>
              {PREFIX[l.kind]}
              {l.text}
            </span>
          ))}
        </code>
      </pre>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
