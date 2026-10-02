(() => {
const { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } = React;
// Diagram 分頁：移植自 renderer.tsx v1.1.0（畫布、聚焦、搜尋、hub 收折），新增 schema 範圍與「開啟 Wiki」
const ERX_MIN_Z = 0.2, ERX_MAX_Z = 2.5, ERX_STEP = 1.25, ERX_PAD = 28;
const erxClamp = (z) => Math.min(ERX_MAX_Z, Math.max(ERX_MIN_Z, z));

function ErDiagram({ data, D, opts, scope, focus, setFocus, onOpenWiki, height }) {
  const inScope = useCallback((n) => !scope || scope.has(n), [scope]);
  const columns = useMemo(() => data.layout.columns
    .map((c) => ({ ...c, groups: c.groups.filter((g) => data.tables.some((t) => t.group === g && inScope(t.name))) }))
    .filter((c) => c.groups.length), [data, inScope]);
  const edges = useMemo(() => D.edges.filter((e) => inScope(e.child) && inScope(e.parent)), [D, inScope]);
  const crossEdges = scope ? D.edges.filter((e) => inScope(e.child) !== inScope(e.parent)).length : 0;
  const hub = useMemo(() => new Set(opts.hubTables), [opts]);

  const [hover, setHover] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [query, setQuery] = useState('');
  const [showHub, setShowHub] = useState(false);
  const [tip, setTip] = useState(null);
  const [paths, setPaths] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [animate, setAnimate] = useState(false);
  const [panning, setPanning] = useState(false);
  const wrapRef = useRef(null), vpRef = useRef(null), canvasRef = useRef(null), gridRef = useRef(null);
  const cards = useRef(new Map());
  const viewRef = useRef(view); viewRef.current = view;
  const touched = useRef(false), pan = useRef(null), dragged = useRef(false);

  const defaultCols = (t) => {
    const out = t.columns.filter((c) => c.pk || c.fk);
    for (const c of t.columns) { if (out.length >= opts.defaultRows) break; if (!c.pk && !c.fk) out.push(c); }
    return t.columns.filter((c) => out.includes(c));
  };

  const fit = useCallback((smooth) => {
    const vp = vpRef.current; if (!vp || !size.w) return;
    const vw = vp.clientWidth, vh = vp.clientHeight;
    const z = erxClamp(Math.min((vw - ERX_PAD * 2) / size.w, 1));
    const sh = size.h * z;
    setAnimate(smooth);
    setView({ x: (vw - size.w * z) / 2, y: sh <= vh - ERX_PAD * 2 ? (vh - sh) / 2 : ERX_PAD, z });
  }, [size.w, size.h]);
  const resetView = useCallback(() => { touched.current = false; fit(true); }, [fit]);
  useEffect(() => { if (!touched.current) fit(false); }, [fit]);
  useEffect(() => { touched.current = false; }, [scope]);
  useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const ro = new ResizeObserver(() => { if (!touched.current) fit(false); });
    ro.observe(vp); return () => ro.disconnect();
  }, [fit]);

  const zoomAt = useCallback((f, px, py, smooth) => {
    const cur = viewRef.current, z = erxClamp(cur.z * f);
    if (Math.abs(z - cur.z) < 1e-4) return;
    touched.current = true; setAnimate(!!smooth);
    setView({ x: px - (px - cur.x) * (z / cur.z), y: py - (py - cur.y) * (z / cur.z), z });
  }, []);
  const zoomBtn = (f) => { const vp = vpRef.current; zoomAt(f, vp.clientWidth / 2, vp.clientHeight / 2, true); };
  useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const onWheel = (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      ev.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(Math.exp(-ev.deltaY * 0.0015), ev.clientX - r.left, ev.clientY - r.top);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt]);
  const onDown = (ev) => {
    if (ev.button !== 0) return;
    if (!ev.altKey && ev.target.closest('.erx-card, button, a, input, label')) return;
    pan.current = { px: ev.clientX, py: ev.clientY, ox: viewRef.current.x, oy: viewRef.current.y, moved: false };
    setPanning(true); setAnimate(false); ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const onMove = (ev) => {
    const p = pan.current; if (!p) return;
    const dx = ev.clientX - p.px, dy = ev.clientY - p.py;
    if (!p.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    p.moved = true; touched.current = true;
    setView((v) => ({ ...v, x: p.ox + dx, y: p.oy + dy }));
  };
  const onUp = (ev) => {
    if (!pan.current) return;
    dragged.current = pan.current.moved; pan.current = null; setPanning(false);
    ev.currentTarget.releasePointerCapture?.(ev.pointerId);
  };

  const q = query.trim().toLowerCase();
  const { hitT, hitC } = useMemo(() => {
    const hitT = new Set(), hitC = new Set();
    if (!q) return { hitT, hitC };
    for (const t of data.tables) {
      if (!inScope(t.name)) continue;
      if (t.name.toLowerCase().includes(q) || t.label.toLowerCase().includes(q)) hitT.add(t.name);
      for (const c of t.columns) if (c.name.toLowerCase().includes(q)) { hitT.add(t.name); hitC.add(`${t.name}.${c.name}`); }
    }
    return { hitT, hitC };
  }, [q, data, inScope]);
  const hitLabel = !q ? null : hitT.size === 0 ? '查無符合' : hitC.size === 0 ? `${hitT.size} 張表` : `${hitT.size} 張表・${hitC.size} 個欄位`;

  const focusIn = focus && inScope(focus) ? focus : null;
  const related = useMemo(() => {
    if (!focusIn) return null;
    const parents = new Set(), children = new Set();
    for (const e of edges) { if (e.self) continue; if (e.child === focusIn) parents.add(e.parent); if (e.parent === focusIn) children.add(e.child); }
    return { parents, children, all: new Set([...parents, ...children, focusIn]) };
  }, [focusIn, edges]);

  const measure = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const base = canvas.getBoundingClientRect();
    const k = canvas.offsetWidth > 0 ? base.width / canvas.offsetWidth || 1 : 1;
    const g = gridRef.current;
    setSize({ w: g ? g.scrollWidth : 0, h: g ? g.scrollHeight : 0 });
    const next = [];
    for (const e of edges) {
      const a = cards.current.get(e.child), b = cards.current.get(e.parent);
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ax = (ra.left - base.left) / k, bx = (rb.left - base.left) / k, aw = ra.width / k, bw = rb.width / k;
      const ay = (ra.top - base.top) / k + Math.min(ra.height / k / 2, 26);
      const by = (rb.top - base.top) / k + Math.min(rb.height / k / 2, 26);
      if (e.self) {
        const x = ax + aw;
        next.push({ ...e, d: `M ${x} ${ay - 8} C ${x + 26} ${ay - 22}, ${x + 26} ${ay + 22}, ${x} ${ay + 8}`, mx: x + 26, my: ay });
        continue;
      }
      let x1, x2;
      if (ax + aw / 2 <= bx + bw / 2) { x1 = ax + aw; x2 = bx; } else { x1 = ax; x2 = bx + bw; }
      const dx = Math.max(28, Math.min(110, Math.abs(x2 - x1) / 2));
      const c1 = x1 + (x2 >= x1 ? dx : -dx), c2 = x2 + (x2 >= x1 ? -dx : dx);
      next.push({ ...e, d: `M ${x1} ${ay} C ${c1} ${ay}, ${c2} ${by}, ${x2} ${by}`, mx: (x1 + x2) / 2, my: (ay + by) / 2 });
    }
    setPaths(next);
  }, [edges]);
  useLayoutEffect(() => { measure(); }, [measure, expanded, q, columns]);
  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (canvasRef.current) ro.observe(canvasRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const onKey = (ev) => { if (ev.key === 'Escape') { setFocus(null); setTip(null); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [setFocus]);

  const showTip = (el, title, body) => {
    const w = wrapRef.current; if (!w) return;
    const b = w.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = Math.max(166, Math.min(r.left - b.left + r.width / 2, b.width - 166));
    const up = r.bottom > b.bottom - 120;
    setTip({ x, y: up ? r.top - b.top - 8 : r.bottom - b.top + 8, up, title, body });
  };

  const dim = (n) => focusIn ? !related.all.has(n) : q ? !hitT.has(n) : false;
  const edgeState = (p) => {
    if (focusIn) return p.child === focusIn || p.parent === focusIn ? 'on' : 'off';
    if (hover) return p.child === hover || p.parent === hover ? 'on' : 'dim';
    if (q) return hitT.has(p.child) && hitT.has(p.parent) ? 'on' : 'dim';
    return 'base';
  };
  const hubCount = edges.filter((e) => hub.has(e.parent)).length;
  const ft = focusIn ? D.byName.get(focusIn) : null;
  const groupLabel = (g) => D.groupByKey.get(g)?.label ?? g;

  return <div className="erx-dg" ref={wrapRef}>
    <div className="erx-dg-bar">
      <div className="erx-search">
        <ErIcon n="search" s={14}></ErIcon>
        <input type="search" value={query} placeholder={opts.searchPlaceholder} onChange={(e) => setQuery(e.target.value)} aria-label="搜尋表名或欄位名"></input>
        {hitLabel ? <span className={`erx-hits ${hitT.size ? 'ok' : 'none'}`} role="status">{hitLabel}</span> : null}
        {query ? <button type="button" className="erx-clear" onClick={() => setQuery('')} aria-label="清除搜尋"><ErIcon n="x" s={12}></ErIcon></button> : null}
      </div>
      {hubCount > 0 ? <label className="erx-toggle"><input type="checkbox" checked={showHub} onChange={(e) => setShowHub(e.target.checked)}></input>顯示 {opts.hubTables.join('、')} 的 {hubCount} 條連線</label> : null}
      <div className="erx-legend">{data.requirement.map((r) => <span key={r.key} title={r.title}><i className={`erx-dot erx-dot--${r.marker}`}></i>{r.label}</span>)}</div>
    </div>
    {ft ? <div className="erx-focusbar">
      <div><strong>{ft.name}</strong><span className="erx-muted">　{ft.label}{ft.section ? `　${opts.sectionPrefix}${ft.section}` : ''}</span></div>
      <div className="erx-muted">指向 {related.parents.size} 張父表{related.parents.size ? `（${[...related.parents].join('、')}）` : ''}；被 {related.children.size} 張子表指向{related.children.size ? `（${[...related.children].join('、')}）` : ''}</div>
      <div className="erx-focusbar-act">
        <button type="button" className="erx-pill erx-pill--blue" onClick={() => onOpenWiki(ft.name)}><ErIcon n="book" s={12}></ErIcon>開啟 Wiki</button>
        <button type="button" className="erx-pill" onClick={() => setFocus(null)}>取消聚焦（Esc）</button>
      </div>
    </div> : <p className="erx-hint">{opts.hint}<span>畫布可拖曳平移，⌘/Ctrl＋滾輪縮放，雙擊空白處還原。</span>{crossEdges ? <span className="erx-hint-x">另有 {crossEdges} 條跨 schema 連線未顯示。</span> : null}</p>}
    <div className={`erx-vp${panning ? ' panning' : ''}`} ref={vpRef} style={{ height }} tabIndex={0} role="application" aria-label="關聯圖畫布"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onKeyDown={(ev) => { if (ev.key === '+' || ev.key === '=') zoomBtn(ERX_STEP); else if (ev.key === '-') zoomBtn(1 / ERX_STEP); else if (ev.key === '0') resetView(); }}
      onDoubleClick={(ev) => { if (!ev.target.closest('.erx-card, button')) resetView(); }}>
      <div className={`erx-stage${animate ? ' anim' : ''}`} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
        <div className="erx-canvas" ref={canvasRef} onClick={(ev) => { if (dragged.current) { dragged.current = false; return; } if (!ev.target.closest('.erx-card')) setFocus(null); }}>
          <svg className="erx-svg" width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`} aria-hidden="true">
            <defs>
              <marker id="erx-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" className="erx-head"></path></marker>
              <marker id="erx-arrow-on" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" className="erx-head on"></path></marker>
            </defs>
            {paths.map((p) => {
              const isHub = hub.has(p.parent), st = edgeState(p);
              if (isHub && !showHub && st !== 'on') return null;
              return <g key={p.id} className={`erx-edge ${st}${isHub ? ' opt' : ''}`}>
                <path d={p.d} markerEnd={st === 'on' ? 'url(#erx-arrow-on)' : 'url(#erx-arrow)'}></path>
                {st === 'on' ? <text x={p.mx} y={p.my - 5} textAnchor="middle">{p.col}</text> : null}
              </g>;
            })}
          </svg>
          <div className="erx-cols" ref={gridRef} style={{ gridTemplateColumns: `repeat(${columns.length}, max-content)` }}>
            {columns.map((col) => <div className="erx-col" key={col.key}>
              {col.groups.map((g) => <section className="erx-group" key={g}>
                <h4>{groupLabel(g)}</h4>
                {data.tables.filter((t) => t.group === g && inScope(t.name)).map((t) => {
                  const open = expanded.has(t.name), shown = open ? t.columns : defaultCols(t), hidden = t.columns.length - shown.length;
                  const cls = ['erx-card', dim(t.name) && 'dim', focusIn === t.name && 'focus', focusIn && related.all.has(t.name) && focusIn !== t.name && 'rel', q && hitT.has(t.name) && 'hit'].filter(Boolean).join(' ');
                  return <div key={t.name} className={cls} ref={(el) => { if (el) cards.current.set(t.name, el); else cards.current.delete(t.name); }}
                    onMouseEnter={() => setHover(t.name)} onMouseLeave={() => setHover((h) => (h === t.name ? null : h))}>
                    <button type="button" className="erx-cardhead" aria-pressed={focusIn === t.name} onClick={() => setFocus(focusIn === t.name ? null : t.name)}>
                      <span className="erx-tname">{t.name}</span><span className="erx-tlabel">{t.label}</span>{t.section ? <span className="erx-tsec">{opts.sectionPrefix}{t.section}</span> : null}
                    </button>
                    <ul className="erx-fields">{shown.map((c) => <li key={c.name} className={hitC.has(`${t.name}.${c.name}`) ? 'hit' : ''}>
                      <ErDot data={data} req={c.required}></ErDot>
                      <span className="erx-fname">{c.name}</span><span className="erx-ftype">{c.type}</span>
                      <ErFlagBadges data={data} col={c}></ErFlagBadges>
                      <button type="button" className="erx-info" aria-label={`${c.name} 的說明`}
                        onMouseEnter={(e) => showTip(e.currentTarget, `${c.name}　${c.type}${c.default ? `　預設 ${c.default}` : ''}`, c.note)}
                        onMouseLeave={() => setTip(null)}><ErIcon n="info" s={11}></ErIcon></button>
                    </li>)}</ul>
                    {hidden > 0 || open ? <button type="button" className="erx-more" onClick={() => setExpanded((s) => { const n = new Set(s); n.has(t.name) ? n.delete(t.name) : n.add(t.name); return n; })}>
                      {open ? <>收合 <ErIcon n="up" s={11}></ErIcon></> : <>展開全部 {t.columns.length} 欄 <ErIcon n="down" s={11}></ErIcon></>}
                    </button> : null}
                  </div>;
                })}
              </section>)}
            </div>)}
          </div>
        </div>
      </div>
      <div className="erx-zoombar">
        <button type="button" aria-label="縮小" onClick={() => zoomBtn(1 / ERX_STEP)} disabled={view.z <= ERX_MIN_Z + 0.001}><ErIcon n="minus" s={13}></ErIcon></button>
        <span>{Math.round(view.z * 100)}%</span>
        <button type="button" aria-label="放大" onClick={() => zoomBtn(ERX_STEP)} disabled={view.z >= ERX_MAX_Z - 0.001}><ErIcon n="plus" s={13}></ErIcon></button>
        <i></i>
        <button type="button" aria-label="還原並置中" onClick={resetView}><ErIcon n="fit" s={12}></ErIcon></button>
      </div>
    </div>
    {tip ? <div className={`erx-tip${tip.up ? ' up' : ''}`} style={{ left: tip.x, top: tip.y }} role="tooltip"><div>{tip.title}</div>{tip.body}</div> : null}
  </div>;
}

/* 局部關聯圖：父表 ← 本表 ← 子表，三欄固定、不縮放 */
function ErLocalDiagram({ data, D, name, onOpen }) {
  const boxRef = useRef(null);
  const refs = useRef(new Map());
  const [lines, setLines] = useState([]);
  const parents = D.parentsOf(name), children = D.childrenOf(name);
  const uniq = (arr, key) => [...new Map(arr.map((e) => [e[key], e])).keys()];
  const pNames = uniq(parents, 'parent'), cNames = uniq(children, 'child');
  const self = D.edges.some((e) => e.self && e.child === name);
  const measure = useCallback(() => {
    const box = boxRef.current; if (!box) return;
    const b = box.getBoundingClientRect(); const me = refs.current.get('@'); if (!me) return;
    const m = me.getBoundingClientRect();
    const out = [];
    const link = (el, side, id, label) => {
      const r = el.getBoundingClientRect();
      const y1 = r.top - b.top + r.height / 2, y2 = m.top - b.top + m.height / 2;
      if (side === 'p') { const x1 = m.left - b.left, x2 = r.right - b.left; out.push({ id, d: `M ${x1} ${y2} C ${x1 - 40} ${y2}, ${x2 + 40} ${y1}, ${x2} ${y1}`, label }); }
      else { const x1 = r.left - b.left, x2 = m.right - b.left; out.push({ id, d: `M ${x1} ${y1} C ${x1 - 40} ${y1}, ${x2 + 40} ${y2}, ${x2} ${y2}`, label }); }
    };
    pNames.forEach((p) => { const el = refs.current.get('p:' + p); if (el) link(el, 'p', 'p' + p, parents.filter((e) => e.parent === p).map((e) => e.col).join(', ')); });
    cNames.forEach((c) => { const el = refs.current.get('c:' + c); if (el) link(el, 'c', 'c' + c, children.filter((e) => e.child === c).map((e) => e.col).join(', ')); });
    setLines(out);
  }, [name]);
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => { const ro = new ResizeObserver(measure); if (boxRef.current) ro.observe(boxRef.current); return () => ro.disconnect(); }, [measure]);
  const t = D.byName.get(name);
  const node = (n, key, cls) => { const x = D.byName.get(n); return <button type="button" key={key} ref={(el) => el && refs.current.set(key, el)} className={`erx-ln ${cls}`} onClick={() => onOpen(n)}>
    <span className="erx-tname">{n}</span><span className="erx-ln-l">{x.label}</span></button>; };
  return <div className="erx-local" ref={boxRef}>
    <svg className="erx-local-svg" aria-hidden="true">
      <defs><marker id="erx-la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="var(--blue-400)"></path></marker></defs>
      {lines.map((l) => <path key={l.id} d={l.d} markerEnd="url(#erx-la)"></path>)}
    </svg>
    <div className="erx-local-col"><div className="erx-local-h">父表 {pNames.length}</div>{pNames.length ? pNames.map((p) => node(p, 'p:' + p, '')) : <div className="erx-local-empty">無</div>}</div>
    <div className="erx-local-col mid"><div className="erx-local-h">本表</div>
      <div className="erx-ln me" ref={(el) => el && refs.current.set('@', el)}><span className="erx-tname">{t.name}</span><span className="erx-ln-l">{t.label}</span>{self ? <span className="erx-ln-self">自我參照</span> : null}</div>
    </div>
    <div className="erx-local-col"><div className="erx-local-h">子表 {cNames.length}</div>{cNames.length ? cNames.map((c) => node(c, 'c:' + c, '')) : <div className="erx-local-empty">無</div>}</div>
  </div>;
}

Object.assign(window, { ErDiagram, ErLocalDiagram });

})();
