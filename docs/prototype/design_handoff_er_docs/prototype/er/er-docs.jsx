(() => {
const { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } = React;
// Docs 外殼：導覽樹 + Wiki / Diagram 分頁。page 與 embed 共用，差在外框與導覽收合
function ErNav({ D, data, route, go, collapsedInit }) {
  const [filter, setFilter] = useState('');
  const [closed, setClosed] = useState(new Set(collapsedInit || []));
  const f = filter.trim().toLowerCase();
  const match = (t) => !f || t.name.includes(f) || t.label.toLowerCase().includes(f);
  const total = data.tables.length;
  const shown = data.tables.filter(match).length;
  return <nav className="erx-nav" aria-label="Schema 與資料表">
    <div className="erx-nav-search">
      <ErIcon n="search" s={13}></ErIcon>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="篩選資料表" aria-label="篩選資料表"></input>
      {f ? <span className={`erx-hits ${shown ? 'ok' : 'none'}`}>{shown}/{total}</span> : null}
    </div>
    <div className="erx-nav-scroll">
      <button type="button" className={`erx-nav-item top${route.kind === 'overview' ? ' on' : ''}`} onClick={() => go({ kind: 'overview' })}>
        <ErIcon n="home" s={13}></ErIcon><span className="erx-nav-l">總覽</span>
      </button>
      <div className="erx-nav-sec">SCHEMAS<span>{D.schemas.length}</span></div>
      {D.tree.map((s) => {
        const tables = s.groups.flatMap((g) => g.tables);
        const vis = tables.filter(match);
        if (f && !vis.length) return null;
        const open = f ? true : !closed.has(s.key);
        return <div key={s.key} className="erx-nav-schema">
          <div className={`erx-nav-item schema${route.kind === 'schema' && route.key === s.key ? ' on' : ''}`}>
            <button type="button" className={`erx-caret${open ? ' open' : ''}`} aria-label={open ? '收合' : '展開'} onClick={() => setClosed((c) => { const n = new Set(c); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n; })}><ErIcon n="right" s={12}></ErIcon></button>
            <button type="button" className="erx-nav-main" onClick={() => go({ kind: 'schema', key: s.key })}>
              <ErIcon n="db" s={13}></ErIcon><span className="erx-nav-l"><code>{s.key}</code>{s.label}</span><span className="erx-nav-n">{tables.length}</span>
            </button>
          </div>
          {open ? s.groups.map((g) => {
            const gt = g.tables.filter(match);
            if (!gt.length) return null;
            return <div key={g.key} className="erx-nav-group">
              <div className="erx-nav-glabel">{g.label}</div>
              {gt.map((t) => <button type="button" key={t.name} className={`erx-nav-item table${route.kind === 'table' && route.key === t.name ? ' on' : ''}`} onClick={() => go({ kind: 'table', key: t.name })}>
                <ErIcon n="table" s={12}></ErIcon><span className="erx-nav-l"><code>{t.name}</code><span className="erx-nav-sub">{t.label}</span></span>
              </button>)}
            </div>;
          }) : null}
        </div>;
      })}
    </div>
  </nav>;
}

function ErSectionHead({ id, children, count }) {
  return <h2 className="erx-h2" id={id}>{children}{count != null ? <span className="erx-h2-n">{count}</span> : null}</h2>;
}

function ErOverview({ data, D, go, linkSet }) {
  const cols = data.tables.reduce((a, t) => a + t.columns.length, 0);
  return <article className="erx-page">
    <div className="erx-eyebrow">DATABASE</div>
    <h1 className="erx-h1">{data.meta?.title ?? '資料庫 schema'}</h1>
    <div className="erx-meta">
      <span><b>{D.schemas.length}</b> schemas</span><span><b>{data.tables.length}</b> 張表</span><span><b>{cols}</b> 個欄位</span><span><b>{D.edges.length}</b> 條外鍵</span>
      {data.meta?.source ? <span className="erx-meta-src">來源：{data.meta.source}</span> : null}
    </div>
    <ErMarkdown src={data.meta?.description} onLink={go} tables={linkSet}></ErMarkdown>
    <ErSectionHead count={D.schemas.length}>Schemas</ErSectionHead>
    <div className="erx-schema-list">
      {D.tree.map((s) => {
        const n = s.groups.reduce((a, g) => a + g.tables.length, 0);
        return <button type="button" key={s.key} className="erx-schema-card" onClick={() => go({ kind: 'schema', key: s.key })}>
          <div className="erx-schema-card-h"><code>{s.key}</code><span>{s.label}</span><em>{n} 張表</em></div>
          <p>{(s.description || '').split('\n')[0].replace(/[`*]/g, '')}</p>
          <div className="erx-schema-card-g">{s.groups.map((g) => <span key={g.key}>{g.label}</span>)}</div>
        </button>;
      })}
    </div>
    <ErSectionHead>語彙</ErSectionHead>
    <p className="erx-lede">本份資料自訂的標示方式。這些叫法寫在資料檔裡，換專案可以改。</p>
    <div className="erx-vocab">
      <div><h4>必填性</h4>{data.requirement.map((r) => <div key={r.key} className="erx-vocab-row"><i className={`erx-dot erx-dot--${r.marker}`}></i><b>{r.label}</b><span>{r.title ?? ''}</span></div>)}</div>
      <div><h4>欄位徽章</h4>{data.flags.map((f) => <div key={f.key} className="erx-vocab-row"><b className={`erx-k erx-k--${f.tone ?? 'neutral'}`}>{f.badge}</b><b>{f.label}</b></div>)}</div>
      <div><h4>衍生欄</h4>{data.derivations.map((d) => <div key={d.key} className="erx-vocab-row"><b className="erx-k erx-k--warning">{d.badge}</b><b>{d.label}</b></div>)}</div>
    </div>
  </article>;
}

function ErSchemaPage({ data, D, s, go, linkSet, toDiagram }) {
  return <article className="erx-page">
    <div className="erx-eyebrow">SCHEMA</div>
    <div className="erx-h1-row"><h1 className="erx-h1"><code>{s.key}</code>{s.label}</h1>
      <button type="button" className="erx-pill erx-pill--blue" onClick={toDiagram}><ErIcon n="diagram" s={12}></ErIcon>在 Diagram 檢視</button></div>
    <ErMarkdown src={s.description} onLink={go} tables={linkSet}></ErMarkdown>
    {s.groups.map((g) => <section key={g.key}>
      <ErSectionHead count={g.tables.length}>{g.label}</ErSectionHead>
      {g.description ? <p className="erx-lede">{g.description}</p> : null}
      <div className="erx-tlist">
        <div className="erx-tlist-h"><span>資料表</span><span>說明</span><span>欄位</span><span>父／子</span></div>
        {g.tables.map((t) => <button type="button" key={t.name} className="erx-tlist-r" onClick={() => go({ kind: 'table', key: t.name })}>
          <span><code>{t.name}</code><em>{t.label}</em></span>
          <span className="erx-tlist-d">{t.description ? t.description.split('\n')[0].replace(/[`*]/g, '') : <i>尚無說明</i>}</span>
          <span className="tnum">{t.columns.length}</span>
          <span className="tnum">{new Set(D.parentsOf(t.name).map((e) => e.parent)).size}／{new Set(D.childrenOf(t.name).map((e) => e.child)).size}</span>
        </button>)}
      </div>
    </section>)}
  </article>;
}

function ErTablePage({ data, D, t, opts, go, linkSet, toDiagram }) {
  const { Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const g = D.groupByKey.get(t.group);
  const s = D.schemas.find((x) => x.key === D.schemaOfTable(t.name));
  const parents = D.parentsOf(t.name), children = D.childrenOf(t.name);
  const selfRefs = D.edges.filter((e) => e.self && e.child === t.name);
  const keyed = t.columns.filter((c) => c.pk || c.unique || c.index);
  const derived = t.columns.filter((c) => c.derivation);
  const der = (k) => data.derivations.find((d) => d.key === k);
  const req = (k) => data.requirement.find((r) => r.key === k);
  const open = (n) => go({ kind: 'table', key: n });
  return <article className="erx-page">
    <div className="erx-crumbs">
      <button type="button" onClick={() => go({ kind: 'schema', key: s.key })}><code>{s.key}</code></button><ErIcon n="right" s={11}></ErIcon><span>{g?.label}</span>
    </div>
    <div className="erx-h1-row">
      <h1 className="erx-h1"><code>{t.name}</code>{t.label}</h1>
      <button type="button" className="erx-pill erx-pill--blue" onClick={toDiagram}><ErIcon n="diagram" s={12}></ErIcon>在 Diagram 聚焦</button>
    </div>
    <div className="erx-meta">
      {t.section ? <Badge tone="blue">{opts.sectionPrefix}{t.section}</Badge> : null}
      <span><b>{t.columns.length}</b> 個欄位</span>
      <span><b>{new Set(parents.map((e) => e.parent)).size}</b> 張父表</span>
      <span><b>{new Set(children.map((e) => e.child)).size}</b> 張子表</span>
    </div>
    {t.description ? <ErMarkdown src={t.description} onLink={go} tables={linkSet}></ErMarkdown> : <p className="erx-empty">這張表還沒有說明。在資料檔的 <code>tables[].description</code> 以 Markdown 撰寫。</p>}

    <ErSectionHead id="cols" count={t.columns.length}>欄位</ErSectionHead>
    <div className="erx-colt-wrap"><table className="erx-colt">
      <thead><tr><th>欄位</th><th>型別</th><th>必填</th><th>預設</th><th>標示</th><th>說明</th></tr></thead>
      <tbody>{t.columns.map((c) => <tr key={c.name}>
        <td><code className="erx-cname">{c.name}</code></td>
        <td><code className="erx-ctype">{c.type}</code></td>
        <td><span className="erx-req"><ErDot data={data} req={c.required}></ErDot>{req(c.required)?.label ?? c.required}</span></td>
        <td>{c.default ? <code className="erx-ctype">{c.default}</code> : <span className="erx-na">—</span>}</td>
        <td><ErFlagBadges data={data} col={c}></ErFlagBadges></td>
        <td className="erx-cnote">{c.fk ? <a href={`#table:${c.fk}`} className="erx-fkref" onClick={(e) => { e.preventDefault(); open(c.fk); }}><ErIcon n="arrowR" s={11}></ErIcon><code>{c.fk}.id</code></a> : null}{c.note}</td>
      </tr>)}</tbody>
    </table></div>

    <ErSectionHead id="rel" count={parents.length + children.length + selfRefs.length}>關聯</ErSectionHead>
    <ErLocalDiagram data={data} D={D} name={t.name} onOpen={open} key={t.name}></ErLocalDiagram>
    <div className="erx-rel">
      <div>
        <h4>參照（本表 → 父表）</h4>
        {parents.length || selfRefs.length ? [...parents, ...selfRefs].map((e) => <button type="button" key={e.id} className="erx-rel-r" onClick={() => open(e.parent)}>
          <code>{t.name}.{e.col}</code><ErIcon n="arrowR" s={12}></ErIcon><code className="to">{e.parent}.id</code>{e.self ? <em>自我參照</em> : null}{opts.hubTables.includes(e.parent) ? <em>hub</em> : null}
        </button>) : <p className="erx-empty">沒有外鍵欄位。</p>}
      </div>
      <div>
        <h4>被參照（子表 → 本表）</h4>
        {children.length ? children.map((e) => <button type="button" key={e.id} className="erx-rel-r" onClick={() => open(e.child)}>
          <code className="to">{e.child}.{e.col}</code><ErIcon n="arrowR" s={12}></ErIcon><code>{t.name}.id</code>
        </button>) : <p className="erx-empty">沒有其他表指向這張表。</p>}
      </div>
    </div>

    <ErSectionHead id="idx" count={keyed.length}>索引與唯一鍵</ErSectionHead>
    <div className="erx-kv">{keyed.map((c) => <div key={c.name} className="erx-kv-r">
      <code className="erx-cname">{c.name}</code>
      <ErFlagBadges data={data} col={{ pk: c.pk, unique: c.unique, index: c.index }}></ErFlagBadges>
      <span>{[c.pk && '主鍵', c.unique && '唯一', c.index && '一般索引'].filter(Boolean).join('、')}</span>
    </div>)}</div>

    {derived.length ? <>
      <ErSectionHead id="der" count={derived.length}>衍生欄</ErSectionHead>
      <p className="erx-lede">這些欄位由資料庫維護或特殊儲存，應用層不應直接寫入。</p>
      <div className="erx-kv">{derived.map((c) => <div key={c.name} className="erx-kv-r">
        <code className="erx-cname">{c.name}</code><b className="erx-k erx-k--warning">{der(c.derivation)?.badge}</b><span><b>{der(c.derivation)?.label}</b>　{c.note}</span>
      </div>)}</div>
    </> : null}
  </article>;
}

function ErDocs({ data, options, mode, storeKey, bare }) {
  const D = useMemo(() => erDerive(data), [data]);
  const opts = useMemo(() => ({ defaultRows: 6, hubTables: [], sectionPrefix: '§', hint: '點一張表可聚焦它的關聯。', searchPlaceholder: '搜尋表名或欄位名', ...(data.options || {}), ...(options || {}) }), [data, options]);
  const linkSet = useMemo(() => { const s = new Set(data.tables.map((t) => t.name)); s.schemas = new Set(D.schemas.map((x) => x.key)); return s; }, [data, D]);
  const saved = (() => { try { return JSON.parse(localStorage.getItem(storeKey) || 'null'); } catch (e) { return null; } })();
  const [route, setRoute] = useState(saved?.route ?? { kind: 'overview' });
  const [tab, setTab] = useState(saved?.tab ?? 'wiki');
  const [dgScope, setDgScope] = useState(saved?.dgScope ?? null);
  const [focus, setFocus] = useState(null);
  const [navOpen, setNavOpen] = useState(mode === 'page');
  const [wide, setWide] = useState(false);
  const bodyRef = useRef(null);
  useEffect(() => { localStorage.setItem(storeKey, JSON.stringify({ route, tab, dgScope })); }, [route, tab, dgScope, storeKey]);

  const scopeSet = useMemo(() => dgScope ? new Set(data.tables.filter((t) => D.schemaOfTable(t.name) === dgScope).map((t) => t.name)) : null, [dgScope, data, D]);

  const go = useCallback((r) => {
    setRoute(r);
    if (tab === 'diagram') {
      if (r.kind === 'overview') { setDgScope(null); setFocus(null); }
      if (r.kind === 'schema') { setDgScope(r.key); setFocus(null); }
      if (r.kind === 'table') { const sk = D.schemaOfTable(r.key); if (dgScope && dgScope !== sk) setDgScope(sk); setFocus(r.key); }
    }
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (mode === 'embed' && !wide) setNavOpen(false);
  }, [tab, dgScope, D, mode, wide]);

  const toDiagram = () => {
    if (route.kind === 'schema') { setDgScope(route.key); setFocus(null); }
    else if (route.kind === 'table') { setDgScope(D.schemaOfTable(route.key)); setFocus(route.key); }
    else { setDgScope(null); setFocus(null); }
    setTab('diagram');
  };
  const openWiki = (n) => { setRoute({ kind: 'table', key: n }); setTab('wiki'); };
  const setFocusSync = useCallback((n) => { setFocus(n); if (n) setRoute({ kind: 'table', key: n }); }, []);

  let page;
  if (route.kind === 'schema') { const s = D.tree.find((x) => x.key === route.key); page = s ? <ErSchemaPage data={data} D={D} s={s} go={go} linkSet={linkSet} toDiagram={toDiagram}></ErSchemaPage> : null; }
  else if (route.kind === 'table') { const t = D.byName.get(route.key); page = t ? <ErTablePage data={data} D={D} t={t} opts={opts} go={go} linkSet={linkSet} toDiagram={toDiagram}></ErTablePage> : null; }
  if (!page) page = <ErOverview data={data} D={D} go={go} linkSet={linkSet}></ErOverview>;

  const isEmbed = mode === 'embed' && !wide;
  const dgHeight = isEmbed ? 460 : undefined;

  const shell = <div className={`erx-shell erx-shell--${isEmbed ? 'embed' : 'page'}${navOpen ? '' : ' nav-closed'}${bare && isEmbed ? ' bare' : ''}`}>
    <div className="erx-bar">
      <button type="button" className={`erx-iconbtn${navOpen ? ' on' : ''}`} onClick={() => setNavOpen(!navOpen)} aria-label="切換導覽" title="切換導覽"><ErIcon n="panel" s={15}></ErIcon></button>
      {isEmbed && !bare ? <div className="erx-bar-title"><ErIcon n="db" s={14}></ErIcon><b>{data.meta?.title}</b></div> : null}
      <div className="erx-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'wiki'} className={tab === 'wiki' ? 'on' : ''} onClick={() => setTab('wiki')}><ErIcon n="book" s={13}></ErIcon>Wiki</button>
        <button type="button" role="tab" aria-selected={tab === 'diagram'} className={tab === 'diagram' ? 'on' : ''} onClick={toDiagram}><ErIcon n="diagram" s={13}></ErIcon>Diagram</button>
      </div>
      {tab === 'diagram' ? <div className="erx-scope">
        <span>範圍</span>
        {[{ key: null, label: '全部' }, ...D.schemas].map((s) => <button type="button" key={s.key ?? 'all'} className={dgScope === s.key ? 'on' : ''} onClick={() => { setDgScope(s.key); if (s.key) setRoute({ kind: 'schema', key: s.key }); else setRoute({ kind: 'overview' }); setFocus(null); }}>{s.key ? <code>{s.key}</code> : s.label}</button>)}
      </div> : <div className="erx-bar-crumb">{route.kind === 'overview' ? '總覽' : route.kind === 'schema' ? <>schema · <code>{route.key}</code></> : <>{D.schemaOfTable(route.key)} · <code>{route.key}</code></>}</div>}
      {mode === 'embed' ? <button type="button" className={`erx-pill${wide ? '' : ' erx-pill--gold'}`} onClick={() => setWide(!wide)}><ErIcon n="expand" s={12}></ErIcon>{wide ? '回到本文' : '展開全寬'}</button> : null}
    </div>
    <div className="erx-body">
      {navOpen ? <ErNav D={D} data={data} route={route} go={go}></ErNav> : null}
      <div className={`erx-main${tab === 'diagram' ? ' dg' : ''}`} ref={bodyRef}>
        {tab === 'wiki' ? page : <ErDiagram data={data} D={D} opts={opts} scope={scopeSet} focus={focus} setFocus={setFocusSync} onOpenWiki={openWiki} height={dgHeight}></ErDiagram>}
      </div>
    </div>
  </div>;

  if (mode !== 'embed') return shell;
  return <>
    {wide ? <div className="erx-hold"><span>{data.meta?.title} 已在全寬檢視開啟。</span><button type="button" className="erx-pill erx-pill--gold" onClick={() => setWide(false)}>回到本文</button></div> : shell}
    {wide ? <div className="erx-overlay" role="dialog" aria-modal="true">{shell}</div> : null}
  </>;
}

Object.assign(window, { ErDocs });

})();
