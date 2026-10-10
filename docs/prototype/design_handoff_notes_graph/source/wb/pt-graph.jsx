// Graph —— /notes 第三種檢視：Toolbar、畫布（平移／縮放）、圖例、提示框、縮放控制、統計列、各種狀態
const GR_R = [5, 8, 12, 17];
const GR_DIM = { node: .16, edge: .06, rest: .55, hot: .95 };
const GR_ZOOM = { min: .25, max: 3, label: 1.5, dense: 2.4 };
const GR_MOVE_MS = 600;
const grEase = (t) => 1 - Math.pow(1 - t, 3);
const grRM = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const GR_COLOR_BY = [["folder", "資料夾"], ["series", "系列"], ["tag", "標籤"], ["none", "不著色"]];

function GrI({ d, s = 14, sw = 1.8 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.split("|").map((p, i) => <path key={i} d={p} />)}</svg>;
}
const GR_IC = {
  plus: "M12 5v14|M5 12h14", minus: "M5 12h14", fit: "M4 9V4h5|M20 9V4h-5|M4 15v5h5|M20 15v5h-5",
  chev: "M6 15l6-6 6 6", graph: "M6 7a2 2 0 1 0 0-.01|M18 6a2 2 0 1 0 0-.01|M12 18a2.5 2.5 0 1 0 0-.01|M7.6 8.2l3.2 7.6|M16.6 7.6l-3.4 8|M8 6.4h8", list: "M8 6h12|M8 12h12|M8 18h12|M4 6h.01|M4 12h.01|M4 18h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1|M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1", check: "M5 12.5l4.5 4.5L19 7.5", wide: "M3 6h18v12H3z|M7 10l-2 2 2 2|M17 10l2 2-2 2",
};

function GrLine({ kind, w = 26, arrow }) {
  const sw = kind === "tagl" ? "var(--wb-gr-w-tag)" : "var(--wb-gr-w-" + kind + ")";
  return (
    <svg width={w} height="10" viewBox={"0 0 " + w + " 10"} aria-hidden="true" style={{ flex: "none", overflow: "visible" }}>
      <line x1="1" y1="5" x2={arrow ? w - 6 : w - 1} y2="5" className={"gr-e " + kind} style={{ strokeWidth: sw, opacity: 1 }} />
      {arrow ? <path d={`M${w - 7} 1.6 L${w - 1} 5 L${w - 7} 8.4z`} className={"gr-arr-" + kind} /> : null}
    </svg>
  );
}
function grEdgeW(e) { return `min(calc(var(--wb-gr-w-${e.kind}) + ${Math.max(0, e.n - 1)} * var(--wb-gr-w-step)), var(--wb-gr-w-max))`; }

// ── 元件細部（規格頁也直接拿來展示）──
function GrStats({ mode, nNotes, nEdges, nOrph, nTags, nUntag, match }) {
  return (
    <div className="gr-stats" role="status">
      {mode === "tag"
        ? <><span><b>{nNotes}</b> 篇筆記</span><i>・</i><span><b>{nTags}</b> 個標籤</span><i>・</i><span><b>{nUntag}</b> 篇未加標籤</span></>
        : <><span><b>{nNotes}</b> 篇筆記</span><i>・</i><span><b>{nEdges}</b> 條關聯</span><i>・</i><span><b>{nOrph}</b> 篇孤島</span></>}
      {match != null ? <><i>・</i><span style={{ color: "var(--wb-blue-l)" }}>符合 <b style={{ color: "inherit" }}>{match}</b></span></> : null}
    </div>
  );
}
function GrZoom({ k, onIn, onOut, onFit }) {
  return (
    <div className="gr-zoom" role="group" aria-label="縮放">
      <button className="gr-zb" onClick={onIn} disabled={k >= GR_ZOOM.max - .001} aria-label="放大" title="放大"><GrI d={GR_IC.plus} s={15} /></button>
      <button className="gr-zb" onClick={onOut} disabled={k <= GR_ZOOM.min + .001} aria-label="縮小" title="縮小"><GrI d={GR_IC.minus} s={15} /></button>
      <button className="gr-zb" onClick={onFit} aria-label="符合視窗" title="符合視窗"><GrI d={GR_IC.fit} s={15} /></button>
      <div className="gr-zpct" aria-live="polite">{Math.round(k * 100)}%</div>
    </div>
  );
}
function GrLegend({ open, onToggle, mode, colorBy, groups, kinds }) {
  const cbLabel = (GR_COLOR_BY.find((x) => x[0] === colorBy) || [])[1];
  return (
    <div className={"gr-lg" + (open ? "" : " closed")}>
      <button className="gr-lg-h" onClick={onToggle} aria-expanded={open}>圖例<span className="gr-car"><GrI d={GR_IC.chev} s={13} sw={2.2} /></span></button>
      {open ? (
        <div className="gr-lg-b">
          <div className="gr-lg-sec">
            <div className="gr-lg-t">著色依據：{cbLabel}</div>
            <div className="gr-lg-grid">{groups.map((g) => <div key={g.key} className="gr-lg-r"><span className="gr-dot" style={{ background: g.color, flex: "none" }} /><span>{g.key}</span><em>{g.n}</em></div>)}</div>
          </div>
          {mode === "doc" ? (
            <>
              <div className="gr-lg-sec">
                <div className="gr-lg-t">節點大小：被連入數</div>
                <div className="gr-sizes">{GR_R.map((r, i) => <div key={i}><i style={{ width: r * 2, height: r * 2 }} />{["0–1", "2–3", "4–7", "8+"][i]}</div>)}</div>
                <div className="gr-lg-r" style={{ marginTop: 4 }}><span className="gr-dot" style={{ background: "var(--wb-gr-c0)" }} /><span>筆記</span><span className="gr-sq" style={{ background: "var(--wb-gr-c-data)" }} /><span>資料檔</span></div>
              </div>
              <div className="gr-lg-sec">
                <div className="gr-lg-t">邊：箭頭指向被參照的一方</div>
                {window.GR_KINDS.map((k) => <div key={k} className="gr-lg-r" style={{ opacity: kinds[k] ? 1 : .4 }}><GrLine kind={k} arrow w={30} /><span>{window.GR_KIND[k].name}</span></div>)}
                <div className="gr-lg-r" style={{ color: "var(--wb-ink-3)", fontSize: 11 }}><span>線越粗，兩篇之間的關聯次數越多</span></div>
              </div>
            </>
          ) : (
            <div className="gr-lg-sec">
              <div className="gr-lg-t">結構</div>
              <div className="gr-lg-r"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="var(--wb-panel)" stroke="var(--wb-blue-l)" strokeWidth="2" /></svg><span>標籤樞紐・筆記數</span></div>
              <div className="gr-lg-r"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--wb-gr-c0)" strokeWidth="1.6" strokeDasharray="3 2.4" /></svg><span>未加標籤</span></div>
              <div className="gr-lg-r"><GrLine kind="tagl" w={16} /><span>筆記屬於該標籤</span></div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
function GrTipNode({ n, mode }) {
  return (
    <>
      <div className="gr-tip-t">{n.title}</div>
      <div className="gr-tip-r">{n.data ? <>資料檔<b>{n.plugin}</b></> : <>資料夾<b>{n.folder}</b></>}</div>
      <div className="gr-tip-r">連入<b>{n.inDeg}</b>・連出<b>{n.outDeg}</b>{n.orphan ? <span>・孤島</span> : null}</div>
      {mode === "tag" && n.gtags.length ? <div className="gr-tip-r">標籤<b>{n.gtags.join("、")}</b></div> : null}
    </>
  );
}
function GrTipEdge({ e, a, b }) {
  return (
    <>
      <div className="gr-tip-t">{a} <span style={{ color: "var(--wb-ink-3)", fontWeight: 400 }}>→</span> {b}</div>
      {Object.keys(e.kinds).map((k) => <div key={k} className="gr-tip-r"><span className="gr-tip-k"><GrLine kind={k} arrow w={22} /><b>{window.GR_KIND[k].name} ×{e.kinds[k]}</b></span></div>)}
    </>
  );
}

function GrSkeleton() {
  const dots = [[150, 100, 15], [86, 64, 9], [222, 58, 10], [60, 142, 7], [240, 150, 12], [148, 30, 6], [110, 178, 8], [196, 196, 6], [28, 92, 5], [292, 104, 5], [270, 30, 5], [36, 192, 5]];
  return (
    <div className="gr-center" aria-busy="true" aria-live="polite">
      <div>
        <div className="gr-skel" aria-hidden="true">
          {dots.slice(1, 8).map(([x, y], i) => { const dx = x - 150, dy = y - 100; return <s key={"s" + i} style={{ left: 150, top: 100, width: Math.hypot(dx, dy), transform: `rotate(${Math.atan2(dy, dx)}rad)` }} />; })}
          {dots.map(([x, y, r], i) => <i key={i} style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, animationDelay: (i * 90) + "ms" }} />)}
        </div>
        <div className="gr-skel-t">正在計算筆記之間的關聯…</div>
      </div>
    </div>
  );
}
function GrEmptyFilter({ label, onClear }) {
  return (
    <div className="gr-center"><div className="gr-msg">
      <div className="gr-medal"><Ic n="filter" s={20} /></div>
      <h3>沒有符合篩選條件的筆記</h3>
      <p>目前篩選「{label}」底下沒有任何筆記，Graph 沒有東西可以畫。清除篩選後會回到全部筆記。</p>
      <div className="gr-acts"><button className="wb-btn-solid" onClick={onClear}>清除篩選</button></div>
    </div></div>
  );
}
function GrEmptyLinks({ n, onTag }) {
  const ways = [
    ["行內引用定義", <>在內文寫 <code>:ref[hr.term-quota]</code>，引用另一篇筆記裡的定義。</>],
    ["嵌入定義", <>用 <code>::include&#123;id=…&#125;</code> 把定義整段嵌入。</>],
    ["站內連結", <>用 <code>[文字](/notes/slug)</code> 連到另一篇筆記。</>],
    ["加入系列", <>在 frontmatter 加上 <code>series</code>，章節之間會依序相連。</>],
  ];
  return (
    <div className="gr-center"><div className="gr-msg" style={{ maxWidth: 520 }}>
      <div className="gr-medal"><GrI d={GR_IC.link} s={20} /></div>
      <h3>這 {n} 篇筆記之間還沒有任何關聯</h3>
      <p>文件模式只畫引用、嵌入、連結與系列順序。用下面任一種方式建立關聯後，這裡就會出現 Graph；也可以先用標籤看筆記怎麼分群。</p>
      <div className="gr-ways">{ways.map(([t, d]) => <div key={t} className="gr-way"><div><b>{t}</b><span>{d}</span></div></div>)}</div>
      <div className="gr-acts"><button className="wb-btn-solid" onClick={onTag}><Ic n="tag" s={13} c="#fff" /> 改用標籤模式</button></div>
    </div></div>
  );
}
function GrNarrow({ onList }) {
  return (
    <div className="gr-center"><div className="gr-msg">
      <div className="gr-medal"><GrI d={GR_IC.wide} s={20} /></div>
      <h3>Graph 需要較寬的畫面</h3>
      <p>Graph 要能平移、縮放並同時看到圖例，視窗寬度 860px 以上才會顯示。目前畫面較窄，請改用清單檢視，或把視窗拉寬。</p>
      <div className="gr-acts"><button className="wb-btn-solid" onClick={onList}><GrI d={GR_IC.list} s={13} /> 改用清單檢視</button></div>
    </div></div>
  );
}

const GR_CB_DESC = { folder: "依筆記所在資料夾", series: "依所屬系列，未歸入者為灰", tag: "依第一個標籤，未加標籤者為灰", none: "全部同色，只看結構" };
function GrColorMenu({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const [hi, setHi] = React.useState(0);
  const btn = React.useRef(null), list = React.useRef(null);
  const idx = Math.max(0, GR_COLOR_BY.findIndex((x) => x[0] === value));
  const show = () => { const r = btn.current.getBoundingClientRect(); setPos({ left: r.left, top: r.bottom + 6 }); setHi(idx); setOpen(true); };
  const close = (focus) => { setOpen(false); if (focus && btn.current) btn.current.focus(); };
  const pick = (i) => { onChange(GR_COLOR_BY[i][0]); close(true); };
  window.useEscLayer && window.useEscLayer(open, 35, () => close(true));
  React.useEffect(() => { if (open && list.current) list.current.focus(); }, [open]);
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % GR_COLOR_BY.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + GR_COLOR_BY.length) % GR_COLOR_BY.length); }
    else if (e.key === "Home") { e.preventDefault(); setHi(0); }
    else if (e.key === "End") { e.preventDefault(); setHi(GR_COLOR_BY.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(hi); }
    else if (e.key === "Tab") close(false);
  };
  const sw = (v) => v === "none" ? ["var(--wb-gr-c7)", "var(--wb-gr-c7)", "var(--wb-gr-c7)"] : v === "folder" ? ["var(--wb-gr-c1)", "var(--wb-gr-c2)", "var(--wb-gr-c3)"] : ["var(--wb-gr-c1)", "var(--wb-gr-c4)", "var(--wb-gr-c0)"];
  return (
    <>
      <button ref={btn} className={"gr-dd" + (open ? " open" : "")} aria-haspopup="listbox" aria-expanded={open} aria-label={"著色依據：" + GR_COLOR_BY[idx][1]}
        onClick={() => (open ? close(false) : show())} onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); show(); } }}>
        <span className="gr-dd-sw">{sw(value).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
        <span>{GR_COLOR_BY[idx][1]}</span>
        <svg className="gr-dd-car" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && pos ? (
        <>
          <div className="gr-dd-scrim" onPointerDown={() => close(false)} />
          <div ref={list} className="gr-dd-menu" role="listbox" tabIndex={-1} aria-label="著色依據" aria-activedescendant={"gr-cb-" + GR_COLOR_BY[hi][0]} style={{ left: pos.left, top: pos.top }} onKeyDown={onKey}>
            <div className="gr-dd-h">節點著色依據</div>
            {GR_COLOR_BY.map(([v, l], i) => (
              <div key={v} id={"gr-cb-" + v} role="option" aria-selected={v === value} className={"gr-dd-opt" + (i === hi ? " hi" : "") + (v === value ? " on" : "")}
                onPointerEnter={() => setHi(i)} onClick={() => pick(i)}>
                <span className="gr-dd-sw lg">{sw(v).map((c, j) => <i key={j} style={{ background: c }} />)}</span>
                <span className="gr-dd-txt"><b>{l}</b><span>{GR_CB_DESC[v]}</span></span>
                {v === value ? <svg className="gr-dd-ck" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function grUseTween(target, key) {
  const [disp, setDisp] = React.useState(target);
  const cur = React.useRef(target), raf = React.useRef(0), first = React.useRef(true);
  React.useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (first.current || grRM()) { first.current = false; cur.current = target; setDisp(target); return; }
    const from = cur.current, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / GR_MOVE_MS), e = grEase(p), o = {};
      Object.keys(target).forEach((id) => {
        const a = from[id] || target[id], b = target[id];
        o[id] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
      });
      cur.current = o; setDisp(o);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [key]);
  return disp;
}

function PtGraph({ rows, filter, filterLabel, onClearFilter, sel, onSel, onOpenData, onTag, onListView, demo = "live", narrow }) {
  const [mode, setMode] = React.useState("doc");
  const [colorBy, setColorBy] = React.useState("folder");
  const [kinds, setKinds] = React.useState({ ref: true, inc: true, link: true, seq: true });
  const [showOrph, setShowOrph] = React.useState(true);
  const [gq, setGq] = React.useState("");
  const [hover, setHover] = React.useState(null);
  const [hoverEdge, setHoverEdge] = React.useState(null);
  const [kfocus, setKfocus] = React.useState(null);
  const [focusId, setFocusId] = React.useState(null);
  const [legendOpen, setLegendOpen] = React.useState(true);
  const [loading, setLoading] = React.useState(!window.__grLoaded);
  const [forceLoad, setForceLoad] = React.useState(false);
  const [forceNarrow, setForceNarrow] = React.useState(false);
  const [big, setBig] = React.useState(false);
  const [noLinks, setNoLinks] = React.useState(false);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });
  const [glide, setGlide] = React.useState(false);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [panning, setPanning] = React.useState(false);
  const wrap = React.useRef(null), svgRef = React.useRef(null), viewRef = React.useRef(view), drag = React.useRef(null), glideT = React.useRef(0);
  viewRef.current = view;

  React.useEffect(() => { if (!loading) return; const t = setTimeout(() => { window.__grLoaded = true; setLoading(false); }, 700); return () => clearTimeout(t); }, []);
  React.useEffect(() => {
    setMode("doc"); setHover(null); setHoverEdge(null); setGq(""); setBig(false); setNoLinks(false); setKfocus(null); setForceLoad(false); setForceNarrow(false); setShowOrph(true); setColorBy("folder");
    if (demo === "hover") setHover("g-http-basics");
    if (demo === "edge") setHoverEdge("http-caching>g-http-basics");
    if (demo === "search") setGq("React");
    if (demo === "tag") setMode("tag");
    if (demo === "taghover") { setMode("tag"); setHover("tag:前端"); }
    if (demo === "loading") setForceLoad(true);
    if (demo === "emptyB") setNoLinks(true);
    if (demo === "big") setBig(true);
    if (demo === "focus") { setKfocus("react-rendering-fiber"); setHover("react-rendering-fiber"); }
    if (demo === "narrow") setForceNarrow(true);
  }, [demo]);
  React.useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [loading, forceLoad, narrow, forceNarrow]);

  // ── 資料與佈局 ──
  const rowKey = rows.map((r) => r.slug).join(",");
  const data = React.useMemo(() => (big ? window.grBig() : window.grBuild(rows, { noLinks })), [rowKey, big, noLinks]);
  const R = (n) => GR_R[n.tier - 1] * (big ? .85 : 1);
  const keyOf = window.grColorKey(colorBy);
  const nodes = data.nodes.filter((n) => showOrph || !n.orphan);
  const notes = nodes.filter((n) => !n.data);
  const nodeKey = nodes.map((n) => n.id).join(",");
  const layoutKey = [rowKey, big, noLinks, mode, colorBy, showOrph].join("|");
  const layout = React.useMemo(() => {
    if (!nodes.length) return { pos: {}, clusters: [], hubs: [] };
    return mode === "tag" ? window.grLayoutTag(nodes, R) : window.grLayoutDoc(nodes, data.edges, keyOf, window.grGroups(colorBy), R);
  }, [layoutKey]);
  const disp = grUseTween(layout.pos, layoutKey);
  const byId = React.useMemo(() => { const m = {}; data.nodes.forEach((n) => (m[n.id] = n)); return m; }, [data]);
  const vis = new Set(nodes.map((n) => n.id));
  const edges = mode === "doc" ? data.edges.filter((e) => kinds[e.kind] && vis.has(e.s) && vis.has(e.t)) : [];
  const tagLines = mode === "tag" ? nodes.flatMap((n) => n.gtags.map((t) => ({ id: "tl:" + n.id + ">" + t, s: n.id, t: "tag:" + t }))) : [];
  const hubs = mode === "tag" ? layout.hubs : [];

  // ── 檢視：符合視窗、縮放 ──
  const setGlideOnce = () => { if (grRM()) return; setGlide(true); clearTimeout(glideT.current); glideT.current = setTimeout(() => setGlide(false), 380); };
  const fitView = (anim) => {
    const { w, h } = size; if (!w || !h) return;
    const ids = Object.keys(layout.pos); if (!ids.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ids.forEach((id) => { const p = layout.pos[id], r = 26; x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r); x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r + 14); });
    const k = Math.max(GR_ZOOM.min, Math.min(1.6, Math.min((w - 80) / (x1 - x0), (h - 72) / (y1 - y0))));
    if (anim) setGlideOnce();
    setView({ k, x: w / 2 - ((x0 + x1) / 2) * k, y: h / 2 - ((y0 + y1) / 2) * k + 10 });
  };
  const fitted = React.useRef(null);
  React.useEffect(() => {
    if (!size.w || loading || forceLoad) return;
    const anim = fitted.current != null;
    if (fitted.current !== layoutKey) { fitted.current = layoutKey; fitView(anim); }
  }, [layoutKey, size.w > 0, loading, forceLoad]);
  const zoomAt = (f, cx, cy, anim) => {
    const v = viewRef.current, k = Math.max(GR_ZOOM.min, Math.min(GR_ZOOM.max, v.k * f));
    if (cx == null) { cx = size.w / 2; cy = size.h / 2; }
    if (anim) setGlideOnce();
    setView({ k, x: cx - (cx - v.x) * (k / v.k), y: cy - (cy - v.y) * (k / v.k) });
  };
  React.useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const h = (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0016), e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  });
  const onDown = (e) => {
    if (!(e.target === svgRef.current || (e.target.dataset && e.target.dataset.bg))) return;
    drag.current = { x: e.clientX, y: e.clientY, v: viewRef.current, moved: false };
    setPanning(true); e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView({ ...d.v, x: d.v.x + dx, y: d.v.y + dy });
  };
  const onUp = () => { drag.current = null; setPanning(false); };

  // 選取後若節點被 Drawer 蓋住，把圖平移到可見區（圖不縮放、不變形）
  React.useEffect(() => {
    if (!sel || !disp[sel] || !size.w) return;
    const v = viewRef.current, dw = Math.min(480, size.w), sx = disp[sel].x * v.k + v.x, sy = disp[sel].y * v.k + v.y;
    const free = size.w - dw;
    if (sx > free - 40 || sx < 40 || sy < 40 || sy > size.h - 40) { setGlideOnce(); setView({ ...v, x: Math.max(free / 2, Math.min(free - 40, 280)) - disp[sel].x * v.k, y: sy < 40 || sy > size.h - 40 ? size.h / 2 - disp[sel].y * v.k : v.y }); }
  }, [sel, size.w]);

  // ── 高亮集合 ──
  const ql = gq.trim().toLowerCase();
  const matches = ql ? new Set(nodes.filter((n) => (n.title + " " + n.folder + " " + n.tags.join(" ")).toLowerCase().includes(ql)).map((n) => n.id)) : null;
  let act = null, actE = null;
  if (hoverEdge) {
    const e = data.edges.find((x) => x.id === hoverEdge);
    if (e) { act = new Set([e.s, e.t]); actE = new Set([e.id]); }
  } else if (hover && (byId[hover] || hover.startsWith("tag:"))) {
    act = new Set([hover]); actE = new Set();
    if (mode === "doc") edges.forEach((e) => { if (e.s === hover || e.t === hover) { act.add(e.s); act.add(e.t); actE.add(e.id); } });
    else if (hover.startsWith("tag:")) {
      const t = hover.slice(4);
      nodes.forEach((n) => { if (t === window.GR_UNTAGGED ? !n.gtags.length : n.gtags.includes(t)) act.add(n.id); });
      tagLines.forEach((l) => { if (l.t === hover) actE.add(l.id); });
    } else tagLines.forEach((l) => { if (l.s === hover) { act.add(l.t); actE.add(l.id); } });
  } else if (matches) {
    act = matches; actE = new Set();
    edges.forEach((e) => { if (matches.has(e.s) && matches.has(e.t)) actE.add(e.id); });
    tagLines.forEach((l) => { if (matches.has(l.s)) { actE.add(l.id); } });
  }
  const nOp = (id) => (act ? (act.has(id) ? 1 : GR_DIM.node) : 1);
  const eOp = (id) => (act ? (actE.has(id) ? GR_DIM.hot : GR_DIM.edge) : GR_DIM.rest);

  // ── 圖例分組 ──
  const gcount = {};
  nodes.forEach((n) => { const k = n.data && colorBy === "folder" ? "資料檔" : keyOf(n); gcount[k] = (gcount[k] || 0) + 1; });
  const groups = window.grGroups(colorBy).filter((k) => gcount[k]).map((k) => ({ key: k, n: gcount[k], color: window.grColor(k, colorBy) }));
  const colorOf = (n) => (n.data ? "var(--wb-gr-c-data)" : window.grColor(keyOf(n), colorBy));

  const k = view.k;
  const labelAll = k >= (big ? GR_ZOOM.dense : GR_ZOOM.label);
  const showLabel = (n) => n.id === hover || n.id === sel || n.id === kfocus || (matches && matches.has(n.id)) || (hover && act && act.has(n.id) && !big && (k >= .8 || n.tier >= 3)) || labelAll || (big ? n.tier === 4 : n.tier >= 3);
  const isNarrow = narrow || forceNarrow;
  const isLoading = loading || forceLoad;
  const emptyA = !isLoading && !notes.length && !big;
  const emptyB = !isLoading && !emptyA && mode === "doc" && !big && data.edges.length === 0;

  const clickNode = (n) => {
    if (n.big) { window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "壓力測試資料，沒有對應的筆記", icon: "check" } })); return; }
    if (n.data) onOpenData(n.fileId); else onSel(n.id);
  };
  const keyAct = (fn) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

  // ── 提示框 ──
  let tip = null;
  const scr = (p) => ({ x: p.x * k + view.x, y: p.y * k + view.y });
  if (!isLoading && !emptyA && !emptyB && size.w) {
    if (hoverEdge) {
      const e = data.edges.find((x) => x.id === hoverEdge);
      if (e && disp[e.s] && disp[e.t]) {
        const a = scr(disp[e.s]), b = scr(disp[e.t]);
        tip = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, off: 10, body: <GrTipEdge e={e} a={byId[e.s].title} b={byId[e.t].title} /> };
      }
    } else if (hover && hover.startsWith("tag:")) {
      const h = hubs.find((x) => x.id === hover);
      if (h) tip = { ...scr(h), off: h.r * k + 10, body: <><div className="gr-tip-t">{h.tag}</div><div className="gr-tip-r">筆記<b>{h.n}</b>{h.untagged ? null : <span>・點一下只看這個標籤</span>}</div></> };
    } else if (hover && byId[hover] && disp[hover]) {
      const n = byId[hover];
      tip = { ...scr(disp[hover]), off: R(n) * k + 10, body: <GrTipNode n={n} mode={mode} /> };
    }
  }
  const tipStyle = tip ? (tip.x > size.w - 300 ? { right: size.w - tip.x + tip.off, top: Math.max(8, tip.y - 20) } : { left: tip.x + tip.off, top: Math.max(8, tip.y - 20) }) : null;

  // ── Toolbar ──
  const toolbar = (
    <div className="wb-tb gr-tb">
      <div className="wb-tb-group">
        <span className="wb-tb-lbl">關聯依據</span>
        <div className="wb-setseg" role="radiogroup" aria-label="關聯依據">
          {[["doc", "文件"], ["tag", "標籤"]].map(([v, l]) => <button key={v} role="radio" aria-checked={mode === v} className={"wb-seg" + (mode === v ? " on" : "")} onClick={() => { setMode(v); setHover(null); setHoverEdge(null); }}>{l}</button>)}
        </div>
      </div>
      <span className="wb-tb-div" />
      <div className="wb-tb-group">
        <span className="wb-tb-lbl">著色</span>
        <GrColorMenu value={colorBy} onChange={setColorBy} />
      </div>
      {mode === "doc" ? (
        <>
          <span className="wb-tb-div" />
          <div className="wb-tb-group" role="group" aria-label="邊的種類">
            <span className="wb-tb-lbl">邊</span>
            {window.GR_KINDS.map((kd) => (
              <button key={kd} role="checkbox" aria-checked={kinds[kd]} className={"gr-kind" + (kinds[kd] ? " on" : "")} onClick={() => setKinds({ ...kinds, [kd]: !kinds[kd] })} title={window.GR_KIND[kd].desc}>
                <span className="gr-box">{kinds[kd] ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : null}</span>
                <GrLine kind={kd} w={16} />{window.GR_KIND[kd].short}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <span className="wb-tb-div" />
      <button className="gr-sw" role="switch" aria-checked={showOrph} onClick={() => setShowOrph(!showOrph)}>
        <span className={"wb-switch" + (showOrph ? " on" : "")}><i /></span>顯示孤島
      </button>
      <div className="wb-tb-right">
        <span className="wb-search" style={{ width: 170 }}><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="搜尋節點…" aria-label="搜尋節點" onKeyDown={(e) => { if (e.key === "Escape") setGq(""); }} />{gq ? <button className="wb-dw-x" style={{ width: 18, height: 18 }} onClick={() => setGq("")} aria-label="清除搜尋"><Ic n="close" s={11} /></button> : null}</span>
        <span className="wb-count tnum">{notes.length} 篇</span>
      </div>
    </div>
  );

  if (isNarrow) {
    return (<><div className="wb-tb"><span className="wb-tb-lbl">Graph 在窄畫面不顯示</span></div><div className="wb-body flush gr-body"><GrNarrow onList={onListView} /></div></>);
  }

  const fs = 11 / k;
  return (
    <>
      {toolbar}
      <div className="wb-body flush gr-body" ref={wrap}>
        {isLoading ? <GrSkeleton /> : emptyA ? <GrEmptyFilter label={filterLabel} onClear={onClearFilter} /> : emptyB ? <GrEmptyLinks n={notes.length} onTag={() => setMode("tag")} /> : (
          <>
            <svg ref={svgRef} className={"gr-svg" + (panning ? " panning" : "")} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="group" aria-label={"筆記 Graph，" + notes.length + " 篇筆記"}>
              <g className={"gr-world" + (glide ? " glide" : "")} style={{ transform: `translate(${view.x}px,${view.y}px) scale(${k})`, transformOrigin: "0 0" }}>
                {tagLines.map((l) => { const a = disp[l.s], b = layout.pos[l.t]; if (!a || !b) return null; return <line key={l.id} className="gr-e tagl" x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ strokeOpacity: eOp(l.id) }} />; })}
                {edges.map((e) => {
                  const a = disp[e.s], b = disp[e.t]; if (!a || !b) return null;
                  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
                  const ra = R(byId[e.s]) + 1.5, rb = R(byId[e.t]) + 2;
                  if (d < ra + rb + 4) return null;
                  const x1 = a.x + ux * ra, y1 = a.y + uy * ra, x2 = b.x - ux * rb, y2 = b.y - uy * rb;
                  const op = eOp(e.id), bx = x2 - ux * 7, by = y2 - uy * 7, hw = 3.3;
                  return (
                    <g key={e.id}>
                      <line className={"gr-e " + e.kind} x1={x1} y1={y1} x2={bx + ux * 1.5} y2={by + uy * 1.5} style={{ strokeWidth: grEdgeW(e), strokeOpacity: op }} />
                      <path className={"gr-arr gr-arr-" + e.kind} d={`M${x2} ${y2}L${bx - uy * hw} ${by + ux * hw}L${bx + uy * hw} ${by - ux * hw}z`} style={{ fillOpacity: op }} />
                      <line className="gr-ehit" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={10 / k} onPointerEnter={() => setHoverEdge(e.id)} onPointerLeave={() => setHoverEdge(null)} />
                    </g>
                  );
                })}
                {mode === "doc" && showOrph ? layout.clusters.map((c) => <text key={c.key} className="gr-cl" x={c.x} y={c.y} style={{ fontSize: 10 / Math.max(k, .5), fillOpacity: act ? GR_DIM.node : 1 }}>{c.key === "全部" ? "孤島" : "孤島・" + c.key}</text>) : null}
                {hubs.map((h) => (
                  <g key={h.id} className={"gr-hub" + (h.untagged ? " untag" : "")} transform={`translate(${h.x},${h.y})`} style={{ "--op": nOp(h.id) }} tabIndex={0} role="button"
                    aria-label={`標籤 ${h.tag}，${h.n} 篇筆記`} onPointerEnter={() => setHover(h.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(h.id)} onBlur={() => setHover(null)}
                    onClick={() => !h.untagged && onTag(h.tag)} onKeyDown={keyAct(() => !h.untagged && onTag(h.tag))}>
                    <circle className="gr-fring" r={h.r + 4} />
                    <circle className="gr-hc" r={h.r} style={h.untagged ? null : { stroke: window.grColor(h.tag, "tag") }} />
                    {h.r * k >= 11 ? <text className="gr-hn" style={{ fontSize: 10.5 / k }}>{h.n}</text> : null}
                  </g>
                ))}
                {nodes.map((n) => {
                  const p = disp[n.id]; if (!p) return null;
                  const r = R(n), on = sel === n.id;
                  return (
                    <g key={n.id} className={"gr-n" + (n.data ? " data" : "") + (on ? " sel" : "") + (hover === n.id ? " hov" : "") + (kfocus === n.id ? " kfocus" : "")} transform={`translate(${p.x},${p.y})`} style={{ "--op": nOp(n.id) }}
                      tabIndex={0} role="button" aria-pressed={on} aria-label={`${n.data ? "資料檔" : "筆記"} ${n.title}，連入 ${n.inDeg}、連出 ${n.outDeg}`}
                      onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)} onFocus={(e) => { setHover(n.id); setFocusId(e.currentTarget.matches(":focus-visible") ? n.id : null); }} onBlur={() => { setHover(null); setKfocus(null); setFocusId(null); }}
                      onClick={() => clickNode(n)} onKeyDown={keyAct(() => clickNode(n))}>
                      {on ? (n.data ? <rect className="gr-halo" x={-r - 8} y={-r - 8} width={(r + 8) * 2} height={(r + 8) * 2} rx={(r + 8) * .4} /> : <circle className="gr-halo" r={r + 8} />) : null}
                      {focusId === n.id || kfocus === n.id ? (n.data ? <rect className="gr-fring" x={-r - 4.5} y={-r - 4.5} width={(r + 4.5) * 2} height={(r + 4.5) * 2} rx={(r + 4.5) * .4} /> : <circle className="gr-fring" r={r + 4.5} />) : null}
                      {on ? (n.data ? <rect className="gr-ring" x={-r - 3.5} y={-r - 3.5} width={(r + 3.5) * 2} height={(r + 3.5) * 2} rx={(r + 3.5) * .4} /> : <circle className="gr-ring" r={r + 3.5} />) : null}
                      {n.data ? <rect className="gr-shape" x={-r} y={-r} width={r * 2} height={r * 2} rx={r * .38} style={{ fill: colorOf(n) }} /> : <circle className="gr-shape" r={r} style={{ fill: colorOf(n) }} />}
                    </g>
                  );
                })}
                {nodes.map((n) => {
                  const p = disp[n.id]; if (!p || !showLabel(n)) return null;
                  const strong = n.id === hover || n.id === sel || (matches && matches.has(n.id));
                  return <text key={"l" + n.id} className={"gr-lbl" + (strong ? " strong" : "")} x={p.x} y={p.y + R(n) + fs * 1.25} style={{ fontSize: fs, strokeWidth: 3 / k, "--op": nOp(n.id) }}>{n.title}</text>;
                })}
                {hubs.map((h) => <text key={"hl" + h.id} className="gr-lbl strong" x={h.x} y={h.y + h.r + fs * 1.3} style={{ fontSize: fs * 1.08, strokeWidth: 3.5 / k, "--op": nOp(h.id) }}>{h.tag}{h.r * k >= 11 ? "" : " " + h.n}</text>)}
              </g>
            </svg>
            <GrStats mode={mode} nNotes={notes.length} nEdges={edges.length} nOrph={data.nodes.filter((n) => n.orphan && !n.data).length}
              nTags={hubs.filter((h) => !h.untagged).length} nUntag={notes.filter((n) => !n.gtags.length).length} match={matches ? matches.size : null} />
            <GrLegend open={legendOpen} onToggle={() => setLegendOpen(!legendOpen)} mode={mode} colorBy={colorBy} groups={groups} kinds={kinds} />
            <GrZoom k={k} onIn={() => zoomAt(1.25, null, null, true)} onOut={() => zoomAt(.8, null, null, true)} onFit={() => fitView(true)} />
            {tip ? <div className="gr-tip" style={tipStyle} role="tooltip">{tip.body}</div> : null}
          </>
        )}
      </div>
    </>
  );
}
Object.assign(window, { GrColorMenu, PtGraph, GrStats, GrZoom, GrLegend, GrTipNode, GrTipEdge, GrLine, GrSkeleton, GrEmptyFilter, GrEmptyLinks, GrNarrow, GR_R, GR_DIM, GR_ZOOM, GR_MOVE_MS, GR_COLOR_BY });
