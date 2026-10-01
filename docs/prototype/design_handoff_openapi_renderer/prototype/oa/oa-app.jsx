// OpenAPI Renderer — 外殼（page / embed）與工作台 demo
(() => {
const { useState, useEffect, useMemo, useRef, useCallback } = React;

function OaDocs(props) {
  if (props.entry.spec.swagger) return <div className="oa-embed-err" style={{ margin: 24 }}><OaIcon n="alert" s={14}></OaIcon>這份文件是 Swagger {props.entry.spec.swagger}，plugin 只支援 OpenAPI 3.0 / 3.1。請先轉檔（例如 <code>swagger2openapi</code>）再放進筆記資料夾。</div>;
  return <OaDocsInner {...props}></OaDocsInner>;
}
function OaDocsInner({ entry, mode = 'page', navSummary = 'hover', initial }) {
  const D = useMemo(() => oaDerive(entry.spec), [entry]);
  const small = D.ops.length <= 4 && D.tags.every((t) => t.name === '__none');
  const read = () => (mode === 'page' && oaHashToRoute(location.hash, D)) || initial || { kind: 'overview' };
  const [route, setRoute] = useState(read);
  const [q, setQ] = useState('');
  const [methods, setMethods] = useState(() => new Set());
  const tagOf = (r) => (r.kind === 'op' ? D.opByKey.get(r.key).tags[0] : r.kind === 'tag' ? r.key : null);
  const [openTags, setOpenTags] = useState(() => new Set(D.tags.length > 6 ? [tagOf(read())].filter(Boolean) : D.tags.map((t) => t.name)));
  const [sig, setSig] = useState(0);
  const [navOpen, setNavOpen] = useState(true);
  const [activeSec, setActiveSec] = useState(null);
  const [tip, setTip] = useState(null);
  const [toast, setToast] = useState(null);
  const mainRef = useRef(null), inputRef = useRef(null), navScrollRef = useRef(null), toastT = useRef();
  const flash = (m) => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 1400); };

  useEffect(() => { const r = read(); setRoute(r); setQ(''); setMethods(new Set()); setOpenTags(new Set(D.tags.length > 6 ? [tagOf(r)].filter(Boolean) : D.tags.map((t) => t.name))); }, [D]);
  useEffect(() => {
    if (mode !== 'page') return;
    const h = oaRouteToHash(route);
    if (h !== location.hash) history.replaceState(null, '', h || location.pathname + location.search);
  }, [route, mode]);
  useEffect(() => {
    if (mode !== 'page') return;
    const fn = () => { const r = oaHashToRoute(location.hash, D); if (r) go(r); };
    window.addEventListener('hashchange', fn); return () => window.removeEventListener('hashchange', fn);
  }, [D, mode]);

  const go = useCallback((r) => {
    setRoute(r); setTip(null);
    const t = tagOf(r); if (t) setOpenTags((s) => (s.has(t) ? s : new Set([...s, t])));
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [D]);
  const hashFor = (r) => `${location.origin}/view/${entry.file.replace(/\.openapi\.json$/, '').replace(/\.json$/, '')}${oaRouteToHash(r)}`;

  // 導覽選中項保持在可視範圍
  useEffect(() => {
    const sc = navScrollRef.current; if (!sc) return;
    requestAnimationFrame(() => {
      const el = sc.querySelector('.oa-nav-op.on, .erx-nav-item.on'); if (!el) return;
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
      if (top < sc.scrollTop + 8 || top > sc.scrollTop + sc.clientHeight - 60) sc.scrollTop = top - sc.clientHeight / 3;
    });
  }, [route]);

  // 捲動同步：Operation 頁的區段 → 導覽
  const onScroll = () => {
    const m = mainRef.current; if (!m || route.kind !== 'op') return;
    const secs = [...m.querySelectorAll('[data-sec]')]; const mt = m.getBoundingClientRect().top;
    let cur = secs.length ? null : null;
    secs.forEach((s) => { if (s.getBoundingClientRect().top - mt <= 96) cur = s.dataset.sec; });
    if (m.scrollTop + m.clientHeight >= m.scrollHeight - 4 && secs.length) cur = secs[secs.length - 1].dataset.sec;
    setActiveSec(cur);
  };
  useEffect(() => { setActiveSec(null); }, [route]);
  const onSec = (id) => { const m = mainRef.current; const el = m && m.querySelector(`[data-sec="${id}"]`); if (!el) return; m.scrollTop = el.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - 12; };

  // 鍵盤：/ 聚焦篩選；Esc 一層一層退：清文字 → 清 method → 收起展開項 → 離開輸入框
  useEffect(() => {
    if (mode !== 'page') return;
    const h = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setNavOpen(true); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); }
      if (e.key === 'Escape') {
        if (q) { setQ(''); flash('已清除文字篩選'); }
        else if (methods.size) { setMethods(new Set()); flash('已清除 method 篩選'); }
        else if (!typing) { setSig((s) => s + 1); flash('已收起所有展開項'); }
        else document.activeElement.blur();
      }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [q, methods, mode]);

  let page;
  if (route.kind === 'op' && D.opByKey.get(route.key)) page = <OaOpPage D={D} op={D.opByKey.get(route.key)} go={go} sig={sig} sub={route.sub} hashFor={hashFor} mainRef={mainRef}></OaOpPage>;
  else if (route.kind === 'schema' && D.schemas[route.key]) page = <OaSchemaPage D={D} name={route.key} go={go} sig={sig} hashFor={hashFor}></OaSchemaPage>;
  else if (route.kind === 'tag' && D.tags.find((t) => t.name === route.key)) page = <OaTagPage D={D} t={D.tags.find((t) => t.name === route.key)} go={go}></OaTagPage>;
  else page = <OaOverview D={D} entry={entry} go={go} small={small}></OaOverview>;

  const crumb = route.kind === 'overview' ? '總覽' : route.kind === 'tag' ? <>tag · <code>{(D.tags.find((t) => t.name === route.key) || {}).label}</code></> : route.kind === 'schema' ? <>schema · <code>{route.key}</code></> : <>{(D.tags.find((t) => t.name === (D.opByKey.get(route.key) || { tags: [] }).tags[0]) || {}).label} · <code>{route.key}</code></>;
  const showNav = !small && navOpen;
  return <div className={`erx-shell erx-shell--page oa-shell${small ? ' small' : ''}`}>
    <div className="erx-bar">
      {!small ? <button type="button" className={`erx-iconbtn${navOpen ? ' on' : ''}`} onClick={() => setNavOpen(!navOpen)} aria-label="切換導覽" title="切換導覽"><OaIcon n="panel" s={15}></OaIcon></button> : null}
      {small && route.kind !== 'overview' ? <button type="button" className="erx-pill" onClick={() => go({ kind: 'overview' })}><OaIcon n="back" s={12}></OaIcon>總覽</button> : null}
      <div className="erx-bar-crumb oa-bar-crumb">{crumb}</div>
      {toast ? <span className="oa-toast" role="status"><OaIcon n="check" s={12}></OaIcon>{toast}</span> : null}
      {!D.supported ? <span className="oa-bar-warn" title="超出 plugin 支援範圍"><OaIcon n="alert" s={12}></OaIcon>OAS {D.version}</span> : <span className="oa-bar-v">OAS {D.version}</span>}
    </div>
    <div className="erx-body">
      {showNav ? <OaNav D={D} route={route} go={go} q={q} setQ={setQ} methods={methods} setMethods={setMethods} openTags={openTags} toggleTag={(t) => setOpenTags((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; })}
        activeSec={activeSec} onSec={onSec} inputRef={inputRef} navSummary={navSummary} setTip={setTip} scrollRef={navScrollRef}></OaNav> : null}
      <div className="erx-main oa-main" ref={mainRef} onScroll={onScroll}><div className={small ? 'oa-narrow' : ''}>{page}</div></div>
    </div>
    {tip ? <div className="oa-tip" style={{ left: tip.x, top: tip.y }}><div className="oa-tip-p"><OaMethod m={tip.op.method}></OaMethod><OaPath path={tip.op.path}></OaPath></div><div>{tip.op.summary || <i>沒有 summary</i>}</div></div> : null}
  </div>;
}

// ── embed：單一 operation 卡片 ──
function OaOpCard({ D, op, onOpen }) {
  const go = (r) => onOpen(r);
  const ok = Object.keys(op.responses).find((c) => c[0] === '2') || Object.keys(op.responses)[0];
  const r = op.responses[ok] || {};
  const rct = Object.keys(r.content || {})[0];
  const others = Object.keys(op.responses).filter((c) => c !== ok);
  const bct = op.requestBody ? Object.keys(op.requestBody.content || {})[0] : null;
  return <div className="oa-card">
    <div className="oa-card-hd">
      <OaMethod m={op.method} size="lg"></OaMethod><span className="oa-card-path"><OaPath path={op.path} wrap></OaPath></span>
    </div>
    <div className="oa-card-sum">{op.summary}{op.deprecated ? <span className="oa-flag dep">已棄用</span> : null}<span className="oa-card-sec"><OaSecurity D={D} op={op}></OaSecurity></span></div>
    {op.params.length ? <div className="oa-card-sec-b">
      <div className="oa-card-t">參數<span className="erx-h2-n">{op.params.length}</span></div>
      <div className="oa-card-params">{op.params.map((p) => <div key={p.in + p.name} className="oa-card-pr">
        <code className="erx-cname">{p.name}</code><span className="oa-in">{p.in}</span><OaTypeLabel f={p.schema || {}} go={go}></OaTypeLabel>
        {p.required ? <span className="oa-f-req"><i></i>必填</span> : <span></span>}<span className="oa-card-pd">{p.description}</span>
      </div>)}</div>
    </div> : null}
    {op.requestBody ? <div className="oa-card-sec-b">
      <div className="oa-card-t">Request Body<code className="oa-ct">{bct}</code>{Object.keys(op.requestBody.content).length > 1 ? <span className="oa-muted">另有 {Object.keys(op.requestBody.content).length - 1} 種格式</span> : null}</div>
      <OaSchemaTree D={D} schema={op.requestBody.content[bct].schema} go={go} maxDepth={1} flat></OaSchemaTree>
    </div> : null}
    <div className="oa-card-sec-b">
      <div className="oa-card-t">主要回應<OaStatus code={ok}></OaStatus><span className="oa-card-rd">{r.description}</span>{rct ? <code className="oa-ct">{rct}</code> : null}</div>
      {rct ? <OaSchemaTree D={D} schema={r.content[rct].schema} go={go} maxDepth={1} flat></OaSchemaTree> : <p className="oa-nobody">沒有 body。</p>}
      {others.length ? <div className="oa-card-others"><span>其他回應</span>{others.map((c) => <OaStatus key={c} code={c}></OaStatus>)}</div> : null}
    </div>
  </div>;
}
// ── embed：沒有指定 operation → 總覽縮影 ──
function OaMiniOverview({ D, onOpen }) {
  const info = D.spec.info || {};
  const max = Math.max(...D.tags.map((t) => t.ops.length));
  const many = D.tags.length > 8;
  const shownTags = many ? [...D.tags].sort((a, b) => b.ops.length - a.ops.length).slice(0, 6) : D.tags;
  return <div className="oa-mini">
    <div className="oa-mini-hd"><b>{info.title}</b><span className="oa-ver">v{info.version}</span><span className="oa-muted">OAS {D.version}</span></div>
    <div className="oa-mini-meta"><span><b className="tnum">{D.ops.length}</b> 支 operation</span><span><b className="tnum">{D.tags.length}</b> 個 tag</span><span><b className="tnum">{D.schemaNames.length}</b> 個 schema</span><OaMethodCounts ops={D.ops}></OaMethodCounts></div>
    <div className="oa-mini-tags">{shownTags.map((t) => <button type="button" key={t.name} className="oa-mini-tag" onClick={() => onOpen({ kind: 'tag', key: t.name })}>
      <code>{t.label}</code><span className="oa-mini-d">{t.description || ''}</span><span className="oa-mini-bar"><i style={{ width: `${(t.ops.length / max) * 100}%` }}></i></span><b className="tnum">{t.ops.length}</b>
    </button>)}</div>
    {many ? <div className="oa-mini-more">另有 {D.tags.length - shownTags.length} 個 tag，共 {D.ops.length - shownTags.reduce((a, t) => a + t.ops.length, 0)} 支 operation，請在文件頁查看。</div> : null}
  </div>;
}
function OaEmbed({ entry, operation, onOpenPage }) {
  const D = useMemo(() => oaDerive(entry.spec), [entry]);
  const op = operation ? D.ops.find((o) => o.operationId === operation) : null;
  const open = (r) => onOpenPage(r || (op ? { kind: 'op', key: op.key } : { kind: 'overview' }));
  return <figure className="oa-embed">
    <figcaption className="oa-embed-cap">
      <span className="oa-embed-pill"><OaIcon n="file" s={13}></OaIcon>資料檔<span>· API 文件</span></span>
      <code className="oa-embed-path">{entry.file}{op ? <span> · {op.operationId}</span> : null}</code>
      <button type="button" className="oa-embed-open" onClick={() => open()}><OaIcon n="out" s={12}></OaIcon>在文件頁開啟</button>
    </figcaption>
    {operation && !op ? <div className="oa-embed-err"><OaIcon n="alert" s={14}></OaIcon>找不到 <code>operationId: "{operation}"</code>。檢查 <code>options.operation</code> 是否和 spec 一致。</div>
      : op ? <OaOpCard D={D} op={op} onOpen={open}></OaOpCard> : <OaMiniOverview D={D} onOpen={open}></OaMiniOverview>}
  </figure>;
}

// ── Demo：畫在工作台殼裡 ──
const OA_TWEAKS = /*EDITMODE-BEGIN*/{
  "dataset": "petstore",
  "mode": "page",
  "navSummary": "hover"
}/*EDITMODE-END*/;
const OA_DS_LABEL = { petstore: 'Petstore（附件，3.2）', orders: '訂單服務（邊界案例）', tiny: '極小（2 支、無 tag）', large: '極大（20 tag、200+）' };

function OaDemo() {
  const [t, setTweak] = useTweaks((() => { const p = new URLSearchParams(location.search); const o = { ...OA_TWEAKS }; if (p.get('ds')) o.dataset = p.get('ds'); if (p.get('mode')) o.mode = p.get('mode'); return o; })());
  const entry = window.OA_SPECS[t.dataset] || window.OA_SPECS.petstore;
  const [openKey, setOpenKey] = useState(0);
  const [initial, setInitial] = useState(null);
  const ds = t.dataset;
  const openPage = (dsKey, r) => { setInitial(r); history.replaceState(null, '', oaRouteToHash(r) || location.pathname); setTweak({ dataset: dsKey, mode: 'page' }); setOpenKey((k) => k + 1); };
  useEffect(() => { document.documentElement.style.setProperty('--pt-row-h', '38px'); }, []);
  const folders = window.ptFolders(), series = window.ptSeries(), pending = window.ptPending();
  const filter = { type: 'datafolder', value: 'api' };
  const info = entry.spec.info || {};
  let header, body;
  if (t.mode === 'page') {
    header = <PtHeader onBack={() => {}} crumbs={[['NoteCraft', () => {}], ['Plugin', () => {}], entry.file]} title={info.title}
      badges={[['openapi-renderer', ''], [`${Math.max(1, Math.round((new Date('2026-10-01') - new Date(entry.updated)) / 864e5))} 天前更新`, 'muted']]}
      actions={entry.backTo ? <button className="wb-btn-ghost"><Ic n="doc" s={14}></Ic> 回到來源筆記</button> : null}></PtHeader>;
    body = <div className="wb-body flush oa-host"><OaDocs key={ds + openKey} entry={entry} navSummary={t.navSummary} initial={initial}></OaDocs></div>;
  } else {
    header = <PtHeader onBack={() => {}} crumbs={[['NoteCraft', () => {}], ['筆記', () => {}], '02-後端']} title="訂單服務串接筆記" badges={[['3,240 字', 'muted']]}
      actions={<><button className="wb-btn-ghost"><Ic n="layers" s={14}></Ic> 版型庫</button><button className="wb-btn-solid"><Ic n="slide" s={14} c="#fff"></Ic> 轉簡報</button></>}></PtHeader>;
    body = <div className="wb-body flush" style={{ overflow: 'auto' }}><article className="oa-note">
      <div className="oa-note-meta">02-後端 / integrations · 更新於 2026-09-30</div>
      <h2>建立訂單</h2>
      <p>一鍵發薪的加購流程最後會呼叫訂單服務的建立訂單 API。下面這張卡片直接讀 <code>api/orders.openapi.json</code>，spec 改了重新 build 就會跟著更新，不需要手動同步。</p>
      <pre className="oa-note-src">{'<PluginView file="api/orders.openapi.json" options={{ operation: "createOrder" }} />'}</pre>
      <OaEmbed entry={window.OA_SPECS.orders} operation="createOrder" onOpenPage={(r) => openPage('orders', r)}></OaEmbed>
      <p>需要特別注意的是 <code>Idempotency-Key</code>：前端在使用者按下「確認加購」時就產生並存在 session，網路重試時沿用同一把，才不會重複開單。</p>
      <h2>整份 API 的範圍</h2>
      <p>不指定 operation 時只放總覽縮影，讓讀者知道這份 API 有多大、分成哪幾塊，細節到文件頁看。</p>
      <pre className="oa-note-src">{`<PluginView file="${entry.file}" />`}</pre>
      <OaEmbed entry={entry} onOpenPage={(r) => openPage(ds, r)}></OaEmbed>
      <p>上線前的檢查清單放在 <code>integrations/checklist.mdx</code>。</p>
    </article></div>;
  }
  return <>
    <div className="wb-app">
      <PtRail route="plugins" onRoute={() => {}} onSearch={() => {}} pending={pending.count}></PtRail>
      <PtSidebar route="datafolder" folders={folders} series={series} filter={t.mode === 'page' ? filter : null} onFolder={() => {}} onSeries={() => {}} onRoute={() => {}} onDataFolder={() => {}} pending={pending} open={false} onClose={() => {}}></PtSidebar>
      <div className="wb-main">{header}{body}</div>
    </div>
    <TweaksPanel>
      <TweakSection label="OpenAPI Renderer"></TweakSection>
      <TweakRadio label="模式" value={t.mode} options={[{ value: 'page', label: '文件頁' }, { value: 'embed', label: 'MDX 內嵌' }]} onChange={(v) => setTweak('mode', v)}></TweakRadio>
      <TweakSelect label="資料" value={t.dataset} options={Object.entries(OA_DS_LABEL).map(([value, label]) => ({ value, label }))} onChange={(v) => { history.replaceState(null, '', location.pathname); setInitial(null); setTweak('dataset', v); }}></TweakSelect>
      <TweakRadio label="導覽 summary" value={t.navSummary} options={[{ value: 'hover', label: 'hover 顯示' }, { value: 'line', label: '第二行' }]} onChange={(v) => setTweak('navSummary', v)}></TweakRadio>
    </TweaksPanel>
  </>;
}

// 把 api/ 資料檔掛進工作台的資料檔清單，側欄才會出現 api 資料夾
if (window.DATAFILES && !window.DATAFILES.some((f) => f.plugin === 'openapi-renderer')) {
  Object.entries(window.OA_SPECS).forEach(([k, e]) => window.DATAFILES.push({ id: 'oa-' + k, path: e.file, route: '/view/' + e.file.replace(/\.openapi\.json$/, ''), title: e.spec.info.title, plugin: 'openapi-renderer', pluginLabel: 'API 文件', updatedAt: e.updated }));
}
Object.assign(window, { OaDocs, OaEmbed, OaOpCard, OaMiniOverview });
ReactDOM.createRoot(document.getElementById('root')).render(<OaDemo></OaDemo>);
})();
