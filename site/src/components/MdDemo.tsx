import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { enhanceNote } from "../lib/nc-enhance";
import type { NcHeading, NcRendered } from "../lib/nc-render";

/*
 * 「原文 → 筆記頁」示範：左邊是可以直接改的 Markdown 原文，右邊是 NoteCraftApp 筆記頁的實際渲染。
 * 預設組都在 build 時渲染好；讀者第一次改原文時才動態載入渲染器（與 app 同一組 remark 外掛），之後即時重算。
 * 右邊的互動（分頁、提示、註解、複製）沿用筆記頁的行為（lib/nc-enhance.ts）。app 外掛寫進 build log 的警告列在圖框底部。
 */

/** compare 模式：同一段原文分別當成 .md 與 .mdx 渲染，上下並列 */
type Out = { md: NcRendered; mdx?: NcRendered };
type Preset = Out & { label: string; source: string };
type Props = {
  id?: string;
  file?: string;
  caption?: string;
  toc?: boolean;
  compare?: boolean;
  presets?: Preset[];
};

const EMPTY: NcRendered = { html: "", warnings: [], headings: [] };

type Renderer = typeof import("../lib/nc-render");
type MdxRenderer = typeof import("../lib/nc-render-mdx");
let renderer: Promise<Renderer> | null = null;
let mdxRenderer: Promise<MdxRenderer> | null = null;
const loadRenderer = () => (renderer ??= import("../lib/nc-render"));
const loadMdx = () => (mdxRenderer ??= import("../lib/nc-render-mdx"));

export default function MdDemo({ id = "demo", file = "note.md", caption = "", toc = false, compare = false, presets = [] }: Props) {
  const prefix = `ncd-${id}-`;
  const [pi, setPi] = useState(0);
  const [src, setSrc] = useState(presets[0]?.source ?? "");
  const [out, setOut] = useState<Out>(presets[0] ?? { md: EMPTY });
  const [edited, setEdited] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  // 改了原文才重算；切換預設組直接用 build 好的結果
  useEffect(() => {
    if (!edited) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const m = await loadRenderer();
      const x = compare ? await loadMdx() : null;
      if (alive) setOut(x ? { md: m.renderNote(src, `${prefix}md-`), mdx: x.renderMdx(src, `${prefix}mdx-`) } : { md: m.renderNote(src, prefix) });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [src, edited, prefix, compare]);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    return enhanceNote(el);
  }, [out]);

  const pick = (i: number) => {
    setPi(i);
    setSrc(presets[i].source);
    setOut(presets[i]);
    setEdited(false);
  };

  const rows = Math.max(3, src.split("\n").length + 1);
  const warnings = compare ? [] : out.md.warnings;

  return (
    <figure className="mdd">
      {presets.length > 1 && (
        <div className="mdd-bar" role="radiogroup" aria-label="範例">
          {presets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={!edited && i === pi}
              className={`mdd-chip${i === pi ? (edited ? " is-edited" : " is-on") : ""}`}
              onClick={() => pick(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="mdd-grid">
        <div className="mdd-src">
          <div className="mdd-head">
            <span className="mdd-tag">原文</span>
            <span className="mdd-file">{file}</span>
            {edited ? (
              <button type="button" className="mdd-reset" onClick={() => pick(pi)}>
                還原
              </button>
            ) : (
              <span className="mdd-hint">可以直接改</span>
            )}
          </div>
          <textarea
            className="mdd-text"
            value={src}
            rows={rows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={`${file} 的原文，可以直接修改`}
            onChange={(e) => {
              setSrc(e.target.value);
              setEdited(true);
              loadRenderer();
              if (compare) loadMdx();
            }}
          />
        </div>
        <div className="mdd-out">
          <div className="mdd-head">
            <span className="mdd-tag mdd-tag--out">筆記頁</span>
            <span className="mdd-hint">NoteCraftApp 的實際渲染</span>
          </div>
          <div ref={body} className="mdd-outs">
            {compare ? (
              <>
                <Rendered r={out.md} label=".md" />
                <Rendered r={out.mdx ?? EMPTY} label=".mdx" />
              </>
            ) : (
              <div className={`mdd-canvas ncp${toc ? " has-toc" : ""}`}>
                <Body r={out.md} />
                {toc && <Toc headings={out.md.headings} prefix={prefix} />}
              </div>
            )}
          </div>
          {toc && <Ids headings={out.md.headings} />}
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="mdd-log" aria-live="polite">
          <span className="mdd-log-tag">build log</span>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Body({ r }: { r: NcRendered }) {
  return r.error ? (
    <div className="mdd-error" role="alert">
      <p className="mdd-error-title">這篇筆記打不開</p>
      <p className="mdd-error-msg">{r.error}</p>
    </div>
  ) : (
    <div className="nc-prose" dangerouslySetInnerHTML={{ __html: r.html }} />
  );
}

/** compare 模式的一格：左上角標出副檔名 */
function Rendered({ r, label }: { r: NcRendered; label: string }) {
  return (
    <div className={`mdd-canvas mdd-canvas--cmp ncp${r.error ? " is-error" : ""}`}>
      <span className="mdd-ext">{label}</span>
      <Body r={r} />
    </div>
  );
}

/** 筆記頁右側目錄的外觀（app 的 Toc.tsx）：只收 H1–H3，層級相對於這篇實際用到的最高層。示範裡一律展開。 */
function Toc({ headings, prefix }: { headings: NcHeading[]; prefix: string }) {
  const items = useMemo(() => headings.filter((h) => h.depth <= 3), [headings]);
  const minLv = Math.min(3, ...items.map((h) => h.depth));
  const counts = [1, 2, 3]
    .map((lv) => [lv, items.filter((h) => h.depth === lv).length] as const)
    .filter(([, n]) => n > 0)
    .map(([lv, n]) => `H${lv}×${n}`)
    .join(" · ");
  if (!items.length) return <p className="ncp-toc-none">沒有 H1–H3 標題，筆記頁不顯示目錄。</p>;
  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(prefix + id)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <nav className="ncp-toc" aria-label="示範筆記的目錄">
      <div className="ncp-toc-title">
        <span>目錄</span>
        <span className="ncp-toc-count">{counts}</span>
      </div>
      <div className="ncp-toc-list">
        {items.map((h, i) => {
          const d = h.depth - minLv;
          return (
            <a key={`${h.id}-${i}`} href={`#${prefix}${h.id}`} className={`ncp-toc-item d${d}`} onClick={(e) => go(e, h.id)}>
              {d > 0 && <span className="ncp-toc-mark" aria-hidden="true" />}
              <span>{h.text}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/** 每個標題產生的錨點 id（含不進目錄的 H4 以下）。 */
function Ids({ headings }: { headings: NcHeading[] }) {
  if (!headings.length) return null;
  return (
    <div className="mdd-ids">
      <p className="mdd-ids-title">錨點 id</p>
      <ul>
        {headings.map((h, i) => (
          <li key={`${h.id}-${i}`} className={h.depth > 3 ? "is-out" : undefined}>
            <span className="mdd-ids-lv">H{h.depth}</span>
            <span className="mdd-ids-text">{h.text}</span>
            <code>#{h.id}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
