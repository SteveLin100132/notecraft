(() => {
// NoteCraft 筆記頁提案 — markdown / MDX 元件
const { useState: mdUS } = React;
const NP_PATHS = {
  folder: "M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.2h7A1.5 1.5 0 0 1 19 9.7v8.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 18z",
  doc: "M6 3h7l5 5v13H6zM13 3v5h5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  edit: "M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  slide: "M3 5h18v11H3zM9 21l3-5 3 5",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  check: "M5 12.5l4.5 4.5L19 7.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  warn: "M12 4 2.5 20h19zM12 10v4M12 17h.01",
  stop: "M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2zM12 8v5M12 16h.01",
  chev: "M9 6l6 6-6 6",
  hash: "M5 9h14M5 15h14M10 4 8 20M16 4l-2 16",
  corner: "M5 5v8a3 3 0 0 0 3 3h11M15 12l4 4-4 4",
  up: "M7 17 17 7M8 7h9v9",
  sparkle: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  close: "M6 6l12 12M18 6 6 18",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01",
  layers: "M12 3.5 20 8l-8 4.5L4 8zM4 12.5 12 17l8-4.5M4 16.5 12 21l8-4.5",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
  book: "M12 6.5C10.4 5.2 7.9 4.6 4 4.5V18c3.9.1 6.4.7 8 2 1.6-1.3 4.1-1.9 8-2V4.5c-3.9.1-6.4.7-8 2zM12 6.5V20",
  play: "M8 5v14l11-7z",
  reset: "M4 4v5h5M4.6 15a8 8 0 1 0 1.9-8.3L4 9",
  tag: "M4 12.5V5a1 1 0 0 1 1-1h7.5l7 7-8.5 8.5z",
};
function NpI({ n, s = 14, sw = 1.8, c = "currentColor", style, className }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {NP_PATHS[n].split("M").filter(Boolean).map((d, i) => <path key={i} d={"M" + d} />)}
    </svg>
  );
}

function H({ lv = 2, id, children }) {
  const Tag = "h" + lv;
  return (
    <Tag id={id} className={"md-h md-h" + lv} data-label={typeof children === "string" ? children : undefined}>
      <a className="md-anc" href={"#" + id} aria-hidden="true" tabIndex={-1} onClick={(e) => e.preventDefault()}>#</a>{children}
    </Tag>
  );
}
const C = ({ children }) => <code className="md-ci">{children}</code>;
const A = ({ children, href = "#" }) => <a className="md-a" href={href} onClick={(e) => e.preventDefault()}>{children}</a>;
const Badge = ({ children, tone }) => <span className={"md-badge" + (tone ? " " + tone : "")}>{children}</span>;
const Fn = ({ n }) => <sup className="md-fnref" id={"fnref-" + n}><a href={"#fn-" + n} onClick={(e) => { e.preventDefault(); window.npJump && window.npJump("fn-" + n); }}>[{n}]</a></sup>;
function Tip({ t, children }) {
  return <span className="md-tip" tabIndex={0}>{children}<span className="md-tip-b" role="tooltip">{t}</span></span>;
}
const npDef = (id) => (window.RF_DEFS || {})[id];
const npDefSrc = (d) => (d && window.noteBySlug ? window.noteBySlug(d.src) : null);
const npGoDef = (id) => { if (npDef(id) && window.NC_RF) window.NC_RF.goDef(id); };
function Ref({ id, label, src, children, desc }) {
  const d = npDef(id), s = npDefSrc(d);
  return (
    <span className="md-ref" tabIndex={0} data-ref={id} onClick={() => npGoDef(id)} onKeyDown={(e) => { if (e.key === "Enter") npGoDef(id); }}>{children}
      <span className="md-pop" role="tooltip"><b>{label || (d && d.label) || children}</b><span className="id">{id}</span>{desc || (d && d.desc)}<span className="s">來源：{src || (s && s.title) || ""}</span></span>
    </span>
  );
}

// ── 程式碼 ──
const NP_LANGS = {
  ts: [/(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(\d+(?:\.\d+)?)\b|\b(export|const|let|type|function|return|if|else|await|async|import|from|new|true|false|null|number|string)\b|([A-Za-z_$][\w$]*)(?=\()/g, ["com", "str", "num", "kw", "fn"]],
  sh: [/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\s-{1,2}[A-Za-z][\w-]*)|\b(curl)\b/g, ["com", "str", "num", "kw"]],
  md: [/(^#{1,6}\s.*$)|(`[^`]*`)|(\*\*[^*]+\*\*|~~[^~]+~~|==[^=]+==)|(\[[^\]]*\]\([^)]*\)|\[\^\d+\])|(^\s*(?:[-*>]|\d+\.)\s)|(:{1,3}[\w-]+|\{#[\w.-]+\}|@ai-visualize)/g, ["kw", "str", "fn", "key", "com", "num"]],
  json: [/("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?\b\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g, ["key", "str", "num", "kw"]],
};
function tokLine(s, lang) {
  const [re, cls] = NP_LANGS[lang] || NP_LANGS.ts;
  re.lastIndex = 0;
  const out = []; let last = 0, m, k = 0;
  while ((m = re.exec(s))) {
    if (!m[0]) { re.lastIndex++; continue; }
    if (m.index > last) out.push(s.slice(last, m.index));
    const gi = m.slice(1).findIndex((x) => x !== undefined);
    out.push(<span key={k++} className={"tk-" + cls[gi]}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
function Code({ lang = "ts", file, code, hl = [], diff, label, ann }) {
  const [copied, setCopied] = mdUS(false);
  const [act, setAct] = mdUS(null);
  const [pos, setPos] = mdUS(null);
  const boxR = React.useRef(null);
  const openAnn = (an, e) => {
    if (act === an) { setAct(null); return; }
    const b = boxR.current.getBoundingClientRect(), r = e.currentTarget.getBoundingClientRect();
    setPos({ x: Math.max(8, Math.min(r.left - b.left - 280, b.width - 408)), y: r.bottom - b.top + 14 });
    setAct(an);
  };
  React.useEffect(() => {
    if (!act) return;
    const k = (e) => { if (e.key === "Escape") setAct(null); };
    const c = (e) => { if (boxR.current && !e.target.closest(".md-ann,.md-ann-pop")) setAct(null); };
    window.addEventListener("keydown", k); document.addEventListener("mousedown", c);
    return () => { window.removeEventListener("keydown", k); document.removeEventListener("mousedown", c); };
  }, [act]);
  const annAt = {}; (ann || []).forEach((a, i) => { annAt[a[0]] = i + 1; });
  const lines = code.replace(/^\n|\n\s*$/g, "").split("\n");
  const kind = (l) => (diff ? (l[0] === "+" ? "add" : l[0] === "-" ? "del" : "") : "");
  const copy = () => { try { navigator.clipboard.writeText(code.trim()); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="md-code" ref={boxR}>
      <div className="md-code-h">
        {file ? <span className="fn">{file}</span> : null}
        <span className="lang">{label || lang}</span>
        <button className="md-copy" onClick={copy} aria-label="複製程式碼"><NpI n={copied ? "check" : "copy"} s={13} />{copied ? "已複製" : "複製"}</button>
      </div>
      <div className="md-code-b">
        <div className="md-gut" aria-hidden="true">
          {lines.map((l, i) => { const d = kind(l); return <div key={i} className={(hl.includes(i + 1) ? "hl " : "") + d}>{diff ? (d === "add" ? "+" : d === "del" ? "−" : "\u00a0") : i + 1}</div>; })}
        </div>
        <pre className="md-pre"><code>
          {lines.map((l, i) => { const d = kind(l); const body = diff ? l.slice(1) : l; const an = annAt[i + 1]; return (
            <div key={i} className={(hl.includes(i + 1) ? "hl " : "") + d}>{tokLine(body, lang === "diff" ? "ts" : lang)}{an ? <>{/\/\/\s*$/.test(body) ? null : <span className="tk-com">{/\s$/.test(body) || !body ? "" : " "}// </span>}<button className={"md-ann" + (act === an ? " on" : "")} aria-label={"註解 " + an} aria-expanded={act === an} onClick={(e) => openAnn(an, e)}>{an}</button></> : null}</div>
          ); })}
        </code></pre>
      </div>
      {act && ann && pos ? <div className="md-ann-pop" role="note" style={{ left: pos.x, top: pos.y }}><span className="md-ann on" aria-hidden="true">{act}</span>{ann[act - 1][1]}</div> : null}
    </div>
  );
}

const NP_ADM = { note: ["info", "備註"], tip: ["bulb", "提示"], warn: ["warn", "注意"], danger: ["stop", "警告"] };
function Adm({ k = "note", title, fold, children }) {
  const [ic, def] = NP_ADM[k];
  if (fold) {
    return (
      <details className={"md-adm fold k-" + k} open={fold === "open"}>
        <summary className="md-adm-t"><NpI className="ic" n={ic} s={14} sw={2} /><span className="tt">{title || def}</span><NpI className="cv" n="chev" s={13} sw={2.2} /></summary>
        <div className="md-adm-b">{children}</div>
      </details>
    );
  }
  return (
    <div className={"md-adm k-" + k} role="note">
      <div className="md-adm-t"><NpI className="ic" n={ic} s={14} sw={2} />{title || def}</div>
      <div className="md-adm-b">{children}</div>
    </div>
  );
}

const NP_ST = { done: "已完成", cur: "進行中", todo: "未開始", err: "需處理", skip: "已略過" };
function Steps({ dir = "v", items, label }) {
  return (
    <ol className={"md-steps " + dir} aria-label={label}>
      {items.map(([t, d, s], i) => (
        <li key={i} className={"st" + (s ? " s-" + s : "")} aria-current={s === "cur" ? "step" : undefined}>
          <span className="st-m" aria-hidden="true">{s === "done" ? <NpI n="check" s={12} sw={3} /> : s === "err" ? "!" : s === "skip" ? "–" : i + 1}</span>
          <div className="st-c">
            <b>{t}</b>{s ? <span className="st-s">{NP_ST[s]}</span> : null}
            {d ? <span className="st-d">{d}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Tabs({ items, name, content }) {
  const [i, setI] = mdUS(0);
  const key = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setI((i + 1) % items.length); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setI((i - 1 + items.length) % items.length); }
  };
  return (
    <div className={"md-tabs" + (content ? " content" : " codes")}>
      <div className="md-tablist" role="tablist" aria-label={name} onKeyDown={key}>
        {items.map(([l], j) => <button key={l} role="tab" className="md-tabbtn" aria-selected={i === j} tabIndex={i === j ? 0 : -1} onClick={() => setI(j)}>{l}</button>)}
      </div>
      <div className="md-tabpanel" role="tabpanel" tabIndex={content ? 0 : undefined}>{items[i][1]}</div>
    </div>
  );
}

function Task({ items }) {
  const [st, setSt] = mdUS(items.map((x) => x[1]));
  return (
    <ul className="md-task">
      {items.map(([t], i) => (
        <li key={i} className={st[i] ? "done" : ""}>
          <button className={"md-cb" + (st[i] ? " on" : "")} role="checkbox" aria-checked={st[i]} aria-label={t} onClick={() => setSt(st.map((v, j) => (j === i ? !v : v)))}>{st[i] ? <NpI n="check" s={11} sw={3} /> : null}</button>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Viz({ kind, file, caption, children }) {
  const [z, setZ] = mdUS(false);
  React.useEffect(() => {
    if (!z) return;
    const h = (e) => { if (e.key === "Escape") setZ(false); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [z]);
  return (
    <>
      {z ? <button className="np-zscrim" onClick={() => setZ(false)} aria-label="關閉放大檢視" /> : null}
      <figure className={"md-viz" + (z ? " zoom" : "")} role={z ? "dialog" : undefined} aria-label={z ? kind : undefined}>
        <div className="md-viz-h">
          <NpI n="sparkle" s={13} c="var(--wb-gold)" sw={2} /><span className="k">{kind}</span>
          <span className="f">generated/{file}.tsx</span>
          <button className="md-viz-x" onClick={() => setZ(!z)} aria-label={z ? "關閉" : "放大檢視"}><NpI n={z ? "close" : "expand"} s={13} /></button>
        </div>
        <div className="md-viz-b">{children}</div>
        {caption ? <figcaption className="md-viz-c">{caption}</figcaption> : null}
      </figure>
    </>
  );
}

function Def({ id, n, children }) {
  const cnt = window.rfDefRefs && npDef(id) ? window.rfDefRefs(id).length : n;
  return (
    <section className="md-def" id={"def-" + id} tabIndex={-1}>
      <div className="md-def-m"><span className="id"><NpI n="hash" s={11} />{id}</span>{cnt != null ? <><i />被 <b>{cnt}</b> 篇引用</> : null}</div>
      <div className="md-def-b">{children}</div>
    </section>
  );
}
function Inc({ title, id, children }) {
  const d = npDef(id), s = npDefSrc(d);
  return (
    <div className="md-inc">
      <div className="md-inc-s"><NpI n="corner" s={12} sw={2} /><span className="t">{title || (d && d.label)}</span><span className="id">· {s ? s.title : id}</span><a href="#" onClick={(e) => { e.preventDefault(); npGoDef(id); }}>前往來源<NpI n="up" s={11} sw={2} /></a></div>
      <div className="md-inc-b">{children}</div>
    </div>
  );
}
function Det({ q, children, open }) {
  return (
    <details className="md-det" open={open}>
      <summary><NpI n="chev" s={13} sw={2.2} />{q}</summary>
      <div className="md-det-b">{children}</div>
    </details>
  );
}

const NP_AIS = { pending: "待生成", generated: "已生成", failed: "生成失敗" };
function AiMark({ id, type, prompt, status = "pending" }) {
  return (
    <div className={"md-aim s-" + status} role="note">
      <div className="md-aim-h"><NpI n="sparkle" s={13} c="var(--wb-gold)" sw={2} /><code>@ai-visualize · {id}</code><span className="ty">{type}</span><span className="st">{NP_AIS[status]}</span></div>
      <div className="md-aim-b"><div className="md-aim-l">PROMPT</div><p>{prompt}</p>{status !== "generated" ? <div className="md-aim-n"><NpI n="clock" s={13} />尚未生成：在 Claude Code 中請 AI 處理此標記，元件就會渲染在這裡。</div> : null}</div>
    </div>
  );
}
function Fns({ items }) {
  return (
    <section className="md-fns" aria-label="註腳">
      <div className="md-fns-h">註腳</div>
      <ol>{items.map((t, i) => <li key={i} id={"fn-" + (i + 1)}>{t}<a href={"#fnref-" + (i + 1)} onClick={(e) => { e.preventDefault(); window.npJump && window.npJump("fnref-" + (i + 1)); }} aria-label="回到內文">↩</a></li>)}</ol>
    </section>
  );
}
window.NpI = NpI;
window.NPMD = { H, C, A, Badge, Fn, Fns, Tip, Ref, Code, Adm, Tabs, Task, Viz, Def, Inc, Det, Steps, AiMark };
})();
