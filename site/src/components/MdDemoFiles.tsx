import { useEffect, useRef, useState } from "react";
import { enhanceDefs, enhanceNote } from "../lib/nc-enhance";
import type { NcNoteSet, NcRendered } from "../lib/nc-render";

/*
 * 多檔的「原文 → 筆記頁」示範（定義與引用）：一個定義在 A 篇、B 篇引用它，所以原文與筆記頁兩側各有檔案頁籤。
 * 預設組在 build 時渲染好；改了任一篇的原文才在瀏覽器載入渲染器（app 的 buildDefIndex＋remark 核心），整組重算。
 * 筆記頁裡的「前往來源」「開啟來源」、反向連結清單會切換到對應的檔案並標示那段定義（示範裡沒有真的頁面可以跳）。
 */

export type DemoFile = { name: string; source: string };
type Preset = { label: string; files: DemoFile[]; show: number; set: NcNoteSet };
type Props = { id?: string; caption?: string; presets?: Preset[] };

type Renderer = typeof import("../lib/nc-render");
let renderer: Promise<Renderer> | null = null;
const loadRenderer = () => (renderer ??= import("../lib/nc-render"));

export default function MdDemoFiles({ id = "demo", caption = "", presets = [] }: Props) {
  const prefix = `ncd-${id}-`;
  const [pi, setPi] = useState(0);
  const [files, setFiles] = useState<DemoFile[]>(presets[0]?.files ?? []);
  const [set, setSet] = useState<NcNoteSet | null>(presets[0]?.set ?? null);
  const [srcIdx, setSrcIdx] = useState(0);
  const [outIdx, setOutIdx] = useState(presets[0]?.show ?? 0);
  const [edited, setEdited] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!edited) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const m = await loadRenderer();
      if (alive) setSet(m.renderNoteSet(files, prefix));
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [files, edited, prefix]);

  const out: NcRendered | undefined = set?.outs[outIdx];

  useEffect(() => {
    const el = canvas.current;
    if (!el || !set) return;
    const offNote = enhanceNote(el);
    const offDefs = enhanceDefs(el, set.backlinks, (slug, hash) => {
      const i = set.slugs.indexOf(slug);
      if (i < 0) return;
      setOutIdx(i);
      setFlash(hash || "top");
    });
    return () => {
      offNote();
      offDefs();
    };
  }, [set, outIdx]);

  // 切到來源檔後：捲到那段定義並標示（app 的落點 flash）；只是切檔就捲到示範框頂端
  useEffect(() => {
    if (!flash || !canvas.current) return;
    const target = flash === "top" ? null : document.getElementById(`${prefix}f${outIdx}-${flash}`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (target ?? canvas.current).scrollIntoView({ block: target ? "center" : "nearest", behavior: reduce ? "auto" : "smooth" });
    if (target) {
      target.classList.remove("flash");
      void target.offsetWidth;
      target.classList.add("flash");
      window.setTimeout(() => target.classList.remove("flash"), 1600);
    }
    setFlash(null);
  }, [flash, outIdx, prefix]);

  const pick = (i: number) => {
    setPi(i);
    setFiles(presets[i].files);
    setSet(presets[i].set);
    setSrcIdx(0);
    setOutIdx(presets[i].show);
    setEdited(false);
  };

  const src = files[srcIdx]?.source ?? "";
  const rows = Math.max(3, src.split("\n").length + 1);
  const warnings = out?.warnings ?? [];

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
            <FileTabs names={files.map((f) => f.name)} active={srcIdx} onPick={setSrcIdx} label="要編輯的檔案" />
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
            aria-label={`${files[srcIdx]?.name ?? ""} 的原文，可以直接修改`}
            onChange={(e) => {
              const v = e.target.value;
              setFiles((fs) => fs.map((f, i) => (i === srcIdx ? { ...f, source: v } : f)));
              setEdited(true);
              loadRenderer();
            }}
          />
        </div>
        <div className="mdd-out">
          <div className="mdd-head">
            <span className="mdd-tag mdd-tag--out">筆記頁</span>
            <FileTabs names={set?.titles ?? files.map((f) => f.name)} active={outIdx} onPick={setOutIdx} label="要看的筆記頁" />
          </div>
          <div className="mdd-outs">
            <div ref={canvas} className="mdd-canvas ncp">
              {out?.error ? (
                <div className="mdd-error" role="alert">
                  <p className="mdd-error-title">build 失敗</p>
                  <p className="mdd-error-msg">{out.error.replace(/^build 失敗：\n/, "")}</p>
                </div>
              ) : (
                <div className="nc-prose" dangerouslySetInnerHTML={{ __html: out?.html ?? "" }} />
              )}
            </div>
          </div>
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

function FileTabs({ names, active, onPick, label }: { names: string[]; active: number; onPick: (i: number) => void; label: string }) {
  return (
    <span className="mdd-files" role="tablist" aria-label={label}>
      {names.map((n, i) => (
        <button key={i} type="button" role="tab" aria-selected={i === active} className={`mdd-file-tab${i === active ? " is-on" : ""}`} onClick={() => onPick(i)}>
          {n}
        </button>
      ))}
    </span>
  );
}
