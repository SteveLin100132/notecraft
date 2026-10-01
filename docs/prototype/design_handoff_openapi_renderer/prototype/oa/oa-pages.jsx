// OpenAPI Renderer — 導覽、總覽、Tag、Operation、Schema 頁
(() => {
const { useState, useMemo, useEffect } = React;
const IN_ORDER = [['path', 'Path 參數'], ['query', 'Query 參數'], ['header', 'Header'], ['cookie', 'Cookie']];

function OaH2({ id, sec, children, count, extra }) {
  return <h2 className="erx-h2 oa-h2" id={id} data-sec={sec}>{children}{count != null ? <span className="erx-h2-n">{count}</span> : null}{extra ? <span className="oa-h2-x">{extra}</span> : null}</h2>;
}
const oaMatch = (o, q, methods) => (!methods.size || methods.has(o.method)) && (!q || (o.path + ' ' + (o.summary || '') + ' ' + (o.operationId || '')).toLowerCase().includes(q));
// tag 內所有 path 的共同前綴（至少 2 段才抽出）
function oaTagBase(ops) {
  if (ops.length < 2) return '';
  const segs = ops.map((o) => o.path.split('/').filter(Boolean));
  const out = [];
  for (let i = 0; ; i++) { const s = segs[0][i]; if (s == null || !segs.every((x) => x[i] === s && x.length > i + 1)) break; out.push(s); }
  return out.length >= 2 ? '/' + out.join('/') : '';
}

function OaNav({ D, route, go, q, setQ, methods, setMethods, openTags, toggleTag, activeSec, onSec, inputRef, navSummary, setTip, scrollRef }) {
  const ql = q.trim().toLowerCase();
  const filtering = !!ql || methods.size > 0;
  const shown = D.ops.filter((o) => oaMatch(o, ql, methods)).length;
  const present = OA_METHODS.filter((m) => D.ops.some((o) => o.method === m));
  const schemaHits = D.schemaNames.filter((n) => !ql || n.toLowerCase().includes(ql));
  const secs = route.kind === 'op' ? oaOpSections(D.opByKey.get(route.key)) : [];
  return <nav className="erx-nav oa-nav" aria-label="API 導覽">
    <div className="erx-nav-search">
      <OaIcon n="search" s={13}></OaIcon>
      <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="篩選 path、summary" aria-label="篩選 operation"></input>
      {filtering ? <span className={`erx-hits ${shown ? 'ok' : 'none'}`}>{shown}/{D.ops.length}</span> : <kbd className="oa-kbd">/</kbd>}
    </div>
    <div className="oa-nav-methods" role="group" aria-label="依 method 篩選">
      {present.map((m) => { const n = D.ops.filter((o) => o.method === m).length; const on = methods.has(m); return <button type="button" key={m} aria-pressed={on} className={`oa-mchip${on ? ' on' : ''}`} onClick={() => { const s = new Set(methods); on ? s.delete(m) : s.add(m); setMethods(s); }}><OaMethod m={m}></OaMethod><span className="tnum">{n}</span></button>; })}
    </div>
    <div className="erx-nav-scroll" ref={scrollRef}>
      <button type="button" className={`erx-nav-item top${route.kind === 'overview' ? ' on' : ''}`} onClick={() => go({ kind: 'overview' })}><OaIcon n="home" s={13}></OaIcon><span className="erx-nav-l">總覽</span></button>
      <div className="erx-nav-sec">OPERATIONS<span>{filtering ? `${shown}/${D.ops.length}` : D.ops.length}</span></div>
      {D.tags.map((t) => {
        const vis = t.ops.filter((o) => oaMatch(o, ql, methods));
        if (filtering && !vis.length) return null;
        const open = filtering || openTags.has(t.name);
        const base = oaTagBase(t.ops);
        return <div key={t.name} className="oa-nav-tag">
          <div className={`erx-nav-item schema${route.kind === 'tag' && route.key === t.name ? ' on' : ''}`}>
            <button type="button" className={`erx-caret${open ? ' open' : ''}`} aria-label={open ? '收合' : '展開'} onClick={() => toggleTag(t.name)} disabled={filtering}><OaIcon n="right" s={12}></OaIcon></button>
            <button type="button" className="erx-nav-main" onClick={() => go({ kind: 'tag', key: t.name })}>
              <OaIcon n="tag" s={12}></OaIcon><span className={`erx-nav-l${t.name === '__none' ? ' oa-none' : ''}`}>{t.label}</span><span className="erx-nav-n tnum">{filtering ? `${vis.length}/${t.ops.length}` : t.ops.length}</span>
            </button>
          </div>
          {open ? <div className="erx-nav-group oa-nav-group">
            {base ? <div className="oa-nav-base" title="這個 tag 內所有 path 的共同前綴">{base}</div> : null}
            {(filtering ? vis : t.ops).map((o) => {
              const on = route.kind === 'op' && route.key === o.key;
              const rest = base ? o.path.slice(base.length) || '/' : o.path;
              return <React.Fragment key={o.key}>
                <button type="button" className={`oa-nav-op${on ? ' on' : ''}${o.deprecated ? ' dep' : ''}${navSummary === 'line' ? ' two' : ''}`} onClick={() => go({ kind: 'op', key: o.key })}
                  onMouseEnter={(e) => { if (navSummary !== 'hover') return; const r = e.currentTarget.getBoundingClientRect(); setTip({ op: o, x: r.right + 8, y: r.top }); }} onMouseLeave={() => setTip(null)}>
                  <OaMethod m={o.method}></OaMethod>
                  <span className="oa-nav-pw"><span className="oa-nav-p"><OaPath path={rest} short={base ? 24 : 26}></OaPath></span>
                    {navSummary === 'line' ? <span className="oa-nav-s">{o.summary || <i>沒有 summary</i>}</span> : null}</span>
                  {o.deprecated ? <span className="oa-nav-dep" title="已棄用">棄用</span> : null}
                </button>
                {on && secs.length ? <div className="oa-nav-secs">{secs.map((s) => <button type="button" key={s.id} className={activeSec === s.id ? 'on' : ''} onClick={() => onSec(s.id)}>{s.label}</button>)}</div> : null}
              </React.Fragment>;
            })}
          </div> : null}
        </div>;
      })}
      {filtering && !shown ? <p className="oa-nav-empty">沒有符合的 operation。按 <kbd className="oa-kbd">Esc</kbd> 清除篩選。</p> : null}
      {D.schemaNames.length && schemaHits.length ? <>
        <div className="erx-nav-sec">SCHEMAS<span>{ql ? `${schemaHits.length}/${D.schemaNames.length}` : D.schemaNames.length}</span></div>
        {schemaHits.map((n) => <button type="button" key={n} className={`erx-nav-item table${route.kind === 'schema' && route.key === n ? ' on' : ''}`} onClick={() => go({ kind: 'schema', key: n })}>
          <OaIcon n="braces" s={12}></OaIcon><span className="erx-nav-l"><code>{n}</code></span><span className="erx-nav-n tnum">{D.usage[n].length || ''}</span>
        </button>)}
      </> : null}
    </div>
    <div className="oa-nav-foot"><kbd className="oa-kbd">/</kbd>篩選<kbd className="oa-kbd">Esc</kbd>逐層退出</div>
  </nav>;
}
function oaOpSections(op) {
  if (!op) return [];
  return [op.params.length && { id: 'params', label: '參數' }, op.requestBody && { id: 'body', label: 'Request Body' }, { id: 'responses', label: 'Responses' }, { id: 'example', label: '範例請求' }].filter(Boolean);
}

function OaVersionNotice({ D }) {
  if (D.supported) return null;
  return <div className="oa-notice"><OaIcon n="alert" s={14}></OaIcon><div>這份文件宣告 <code>openapi: {D.version}</code>，plugin 只保證 3.0 / 3.1。目前以 3.1 規則渲染：3.2 新增的 <code>query</code> method 以中性色標記，其他 3.2 專屬欄位會略過。</div></div>;
}
function OaMethodCounts({ ops, size }) {
  return <span className="oa-mcounts">{OA_METHODS.map((m) => { const n = ops.filter((o) => o.method === m).length; return n ? <span key={m} className="oa-mcount"><OaMethod m={m} size={size}></OaMethod><b className="tnum">{n}</b></span> : null; })}</span>;
}
function OaOpList({ ops, go }) {
  return <div className="oa-oplist">{ops.map((o) => <button type="button" key={o.key} className={`oa-oplist-r${o.deprecated ? ' dep' : ''}`} onClick={() => go({ kind: 'op', key: o.key })}>
    <OaMethod m={o.method}></OaMethod><span className="oa-oplist-p"><OaPath path={o.path}></OaPath></span>
    <span className="oa-oplist-s">{o.summary || <i>沒有 summary</i>}</span>{o.deprecated ? <span className="oa-flag dep">已棄用</span> : null}
  </button>)}</div>;
}

function OaOverview({ D, entry, go, small }) {
  const info = D.spec.info || {};
  const dep = D.ops.filter((o) => o.deprecated).length;
  const max = Math.max(...D.tags.map((t) => t.ops.length));
  return <article className="erx-page">
    <OaVersionNotice D={D}></OaVersionNotice>
    <div className="erx-eyebrow">OPENAPI {D.version}</div>
    <h1 className="erx-h1">{info.title || <span className="oa-muted">未命名 API</span>}<span className="oa-ver">v{info.version}</span></h1>
    <div className="erx-meta">
      <span><b>{D.ops.length}</b> 支 operation</span>
      {!small ? <span><b>{D.tags.filter((t) => t.name !== '__none').length}</b> 個 tag</span> : null}
      <span><b>{D.schemaNames.length}</b> 個 schema</span>
      {dep ? <span><b>{dep}</b> 支已棄用</span> : null}
      <span className="erx-meta-src">來源：<code>{entry.file}</code></span>
    </div>
    {info.description ? <ErMarkdown src={info.description}></ErMarkdown> : <OaMissing field="info.description" what="這份 API 還沒有總覽說明"></OaMissing>}

    {small ? <>
      <OaH2 count={D.ops.length}>Operations</OaH2>
      <p className="erx-lede">這份文件沒有分 tag，operation 不多，直接全部列在這裡；點一列看參數與回應。</p>
      <OaOpList ops={D.ops} go={go}></OaOpList>
      {D.schemaNames.length ? <><OaH2 count={D.schemaNames.length}>Schemas</OaH2>
        <div className="oa-schemachips">{D.schemaNames.map((n) => <button type="button" key={n} className="oa-schemachip" onClick={() => go({ kind: 'schema', key: n })}><OaIcon n="braces" s={12}></OaIcon><code>{n}</code><span>{Object.keys(D.schemas[n].properties || {}).length} 欄位</span></button>)}</div></> : null}
    </> : <>
      <OaH2 count={D.tags.length} extra={<OaMethodCounts ops={D.ops}></OaMethodCounts>}>API 結構</OaH2>
      <div className="oa-sizebar" role="list" aria-label="各 tag 的 operation 數">
        {D.tags.map((t) => <button type="button" role="listitem" key={t.name} style={{ flexGrow: t.ops.length }} onClick={() => go({ kind: 'tag', key: t.name })} title={`${t.label} · ${t.ops.length} 支`}>
          <span>{t.label}</span><b className="tnum">{t.ops.length}</b></button>)}
      </div>
      <div className="oa-tagt">
        <div className="oa-tagt-h"><span>Tag</span><span>說明</span><span>數量</span><span>Method 分布</span></div>
        {D.tags.map((t) => <button type="button" key={t.name} className="oa-tagt-r" onClick={() => go({ kind: 'tag', key: t.name })}>
          <span className={t.name === '__none' ? 'oa-none' : ''}><code>{t.label}</code></span>
          <span className="erx-tlist-d">{t.description || t.summary || <i>尚無說明</i>}</span>
          <span className="oa-tagt-n"><b className="tnum">{t.ops.length}</b><i style={{ width: `${(t.ops.length / max) * 100}%` }}></i></span>
          <span><OaMethodCounts ops={t.ops}></OaMethodCounts></span>
        </button>)}
      </div>
    </>}

    <OaH2 count={D.servers.length}>伺服器</OaH2>
    {D.servers.length ? <div className="erx-kv">{D.servers.map((s) => <div key={s.url} className="erx-kv-r oa-kv3">
      <code className="oa-url">{s.url}</code><span>{s.description || <span className="oa-muted">—</span>}</span><OaCopyBtn text={s.url}></OaCopyBtn>
    </div>)}</div> : <OaMissing field="servers" what="沒有列出伺服器，範例請求會用相對路徑"></OaMissing>}

    <OaH2 count={Object.keys(D.securitySchemes).length}>驗證方式</OaH2>
    {Object.keys(D.securitySchemes).length ? <div className="erx-kv">{Object.entries(D.securitySchemes).map(([k, s]) => <div key={k} className="erx-kv-r oa-kv-sec">
      <code className="erx-cname">{k}</code><span className="oa-type">{s.type}{s.scheme ? ` · ${s.scheme}` : ''}</span>
      <span>{oaSecDetail(s)}{s.description ? <span className="oa-muted">　{s.description}</span> : null}</span>
    </div>)}</div> : <p className="erx-empty">這份文件沒有宣告驗證方式（<code>components.securitySchemes</code>）。</p>}
  </article>;
}
function oaSecDetail(s) {
  if (s.type === 'apiKey') return <>放在 {s.in} 的 <code>{s.name}</code></>;
  if (s.type === 'http') return <>HTTP {s.scheme}{s.bearerFormat ? `（${s.bearerFormat}）` : ''}</>;
  if (s.type === 'oauth2') { const [flow, f] = Object.entries(s.flows || {})[0] || []; return <>OAuth2 {flow}{f && f.scopes ? <> · scopes {Object.keys(f.scopes).map((x) => <code key={x} className="oa-scope">{x}</code>)}</> : null}</>; }
  return s.type;
}
function OaSecurity({ D, op }) {
  const sec = op.security || [];
  if (!sec.length) return <span className="oa-sec none"><OaIcon n="unlock" s={12}></OaIcon>不需驗證</span>;
  return <span className="oa-secs">{sec.map((req, i) => <React.Fragment key={i}>{i ? <em>或</em> : null}
    {Object.keys(req).length ? Object.entries(req).map(([k, scopes]) => <span key={k} className="oa-sec" title={D.securitySchemes[k] ? D.securitySchemes[k].type : '未宣告的 scheme'}><OaIcon n="lock" s={11}></OaIcon>{k}{scopes.length ? <span className="oa-sec-sc">{scopes.join(' ')}</span> : null}</span>) : <span className="oa-sec none">匿名</span>}
  </React.Fragment>)}</span>;
}

function OaTagPage({ D, t, go }) {
  return <article className="erx-page">
    <div className="erx-eyebrow">TAG</div>
    <h1 className="erx-h1"><code>{t.label}</code></h1>
    <div className="erx-meta"><span><b>{t.ops.length}</b> 支 operation</span><OaMethodCounts ops={t.ops}></OaMethodCounts></div>
    {t.description ? <ErMarkdown src={t.description}></ErMarkdown> : t.name === '__none' ? <p className="erx-empty">這些 operation 沒有設定 <code>tags</code>，統一歸在這裡。</p> : <OaMissing field={`tags[name="${t.name}"].description`} what="這個 tag 還沒有說明"></OaMissing>}
    <OaH2 count={t.ops.length}>Operations</OaH2>
    <OaOpList ops={t.ops} go={go}></OaOpList>
  </article>;
}

function OaParams({ D, op, go }) {
  return IN_ORDER.map(([k, label]) => {
    const ps = op.params.filter((p) => p.in === k);
    if (!ps.length) return null;
    return <div key={k} className="oa-pgroup">
      <div className="oa-pgroup-h">{label}<span className="erx-h2-n">{ps.length}</span></div>
      <div className="erx-colt-wrap"><table className="erx-colt oa-ptable">
        <colgroup><col style={{ width: '22%' }}></col><col style={{ width: '17%' }}></col><col style={{ width: 64 }}></col><col></col><col style={{ width: '18%' }}></col></colgroup>
        <thead><tr><th>名稱</th><th>型別</th><th>必填</th><th>說明</th><th>範例</th></tr></thead>
        <tbody>{ps.map((p) => { const s = p.schema || {}; const ex = oaParamExample(p); const cons = oaConstraints(s); return <tr key={p.name} id={`param-${k}-${p.name}`} className={p.deprecated ? 'dep' : ''}>
          <td><code className="erx-cname">{p.name}</code>{p.deprecated ? <span className="oa-flag dep">已棄用</span> : null}</td>
          <td><span className="oa-tcell"><OaTypeLabel f={s} go={go}></OaTypeLabel>{s.format || (s.items && s.items.format) ? <span className="oa-f-fmt">{s.format || s.items.format}</span> : null}</span></td>
          <td>{p.required ? <span className="oa-f-req"><i></i>必填</span> : <span className="erx-na">選填</span>}</td>
          <td className="erx-cnote">{p.description ? <ErInline text={p.description}></ErInline> : <span className="erx-na">—</span>}
            {s.enum || (s.items && s.items.enum) || cons.length ? <div className="oa-f-d tight"><OaEnum values={s.enum || (s.items && s.items.enum)}></OaEnum>{cons.map((c) => <span key={c} className="oa-f-c">{c}</span>)}{p.explode === false || p.style ? <span className="oa-f-c">{p.style || 'form'}{p.explode === false ? ', 逗號分隔' : ''}</span> : null}</div> : null}</td>
          <td>{ex !== undefined ? <code className="oa-ex">{Array.isArray(ex) ? ex.join(',') : String(ex)}</code> : <span className="erx-na">—</span>}</td>
        </tr>; })}</tbody>
      </table></div>
    </div>;
  });
}

function OaMedia({ D, media, ct, go, sig, forResponse, rootLabel }) {
  const ex = useMemo(() => oaMediaExample(D.spec, media, forResponse), [D, media, forResponse]);
  const [exKey, setExKey] = useState(null);
  useEffect(() => setExKey(null), [media]);
  const exVal = ex.all && exKey ? oaDeref(D.spec, ex.all[exKey]).value : ex.value;
  const schema = media && media.schema;
  const isBin = schema && schema.format === 'binary';
  const textual = ct && !/json|xml|form/.test(ct);
  return <div className="oa-split">
    <div className="oa-split-l">{schema ? <OaSchemaTree D={D} schema={schema} go={go} sig={sig} rootLabel={rootLabel}></OaSchemaTree> : <p className="erx-empty">沒有 schema。</p>}</div>
    <div className="oa-split-r">
      <OaCode title={<><OaIcon n="braces" s={12}></OaIcon>{ex.generated ? '範例（由 schema 產生）' : '範例'}</>}
        tools={ex.all && Object.keys(ex.all).length > 1 ? <select className="oa-sel" value={exKey || Object.keys(ex.all)[0]} onChange={(e) => setExKey(e.target.value)}>{Object.entries(ex.all).map(([k, v]) => <option key={k} value={k}>{v.summary || k}</option>)}</select> : null}
        copyText={isBin ? null : (typeof exVal === 'string' ? exVal : JSON.stringify(exVal, null, 2))}
        foot={/xml/.test(ct || '') ? 'XML 依 schema 序列化，這裡以 JSON 呈現結構。' : /form-urlencoded/.test(ct || '') ? '以表單欄位送出，這裡以 JSON 呈現結構。' : null}>
        {isBin ? <p className="oa-code-empty">二進位內容，沒有文字範例。</p> : <OaJson value={exVal} maxH={360}></OaJson>}
      </OaCode>
    </div>
  </div>;
}

function OaBody({ D, op, ct, setCt, go, sig }) {
  const rb = op.requestBody; const cts = Object.keys(rb.content || {});
  return <section>
    <OaH2 id="sec-body" sec="body" extra={rb.required ? <span className="oa-f-req"><i></i>必填</span> : <span className="erx-na">選填</span>}>Request Body</OaH2>
    {rb.description ? <p className="erx-lede">{rb.description}</p> : null}
    <div className="oa-media-bar"><span>content-type</span><OaSeg mono value={ct} options={cts} onChange={setCt}></OaSeg></div>
    <OaMedia D={D} media={rb.content[ct]} ct={ct} go={go} sig={sig} rootLabel="body"></OaMedia>
  </section>;
}

function OaResponses({ D, op, go, sig, sub }) {
  const codes = Object.keys(op.responses);
  const [code, setCode] = useState(() => (sub && sub.startsWith('responses/') ? sub.slice(10) : codes.find((c) => c[0] === '2') || codes[0]));
  const r = op.responses[code] || {};
  const cts = Object.keys(r.content || {});
  const [ct, setCt] = useState(cts[0]);
  useEffect(() => { setCt(Object.keys((op.responses[code] || {}).content || {})[0]); }, [code, op]);
  return <section>
    <OaH2 id="sec-responses" sec="responses" count={codes.length}>Responses</OaH2>
    <div className="oa-st-tabs" role="tablist">{codes.map((c) => <OaStatus key={c} code={c} on={c === code} onClick={() => setCode(c)}></OaStatus>)}</div>
    <div className="oa-resp">
      <div className="oa-resp-h"><OaStatus code={code}></OaStatus><span className="oa-resp-d">{r.description ? <ErInline text={r.description}></ErInline> : <span className="oa-muted">沒有說明</span>}</span>
        {cts.length ? <span className="oa-resp-ct">{cts.length > 1 ? <span className="oa-media-n">{cts.length} 種格式</span> : null}<OaSeg mono value={ct} options={cts} onChange={setCt}></OaSeg></span> : null}</div>
      {r.headers ? <div className="oa-rh"><div className="oa-rh-t">回應標頭</div>{Object.entries(r.headers).map(([k, h]) => { h = oaDeref(D.spec, h); return <div key={k} className="oa-rh-r"><code className="erx-cname">{k}</code><OaTypeLabel f={h.schema} go={go}></OaTypeLabel><span>{h.description}</span></div>; })}</div> : null}
      {cts.length && ct ? <OaMedia D={D} media={r.content[ct]} ct={ct} go={go} sig={sig} forResponse rootLabel={code}></OaMedia> : <p className="oa-nobody">這個回應沒有 body。</p>}
    </div>
  </section>;
}

function OaCurlText({ text }) {
  return <pre className="oa-pre oa-sh"><code>{text.split(/(<[^>\s]+>)/).map((p, i) => (/^<[^>\s]+>$/.test(p) ? <span key={i} className="oa-ph">{p}</span> : p))}</code></pre>;
}
function OaExample({ D, op, ct }) {
  const [lang, setLang] = useState(() => localStorage.getItem('oa-lang') || 'curl');
  const [si, setSi] = useState(0);
  useEffect(() => { localStorage.setItem('oa-lang', lang); }, [lang]);
  const server = D.servers[si];
  const text = lang === 'curl' ? oaCurl(D, op, server, ct) : oaFetch(D, op, server, ct);
  return <section>
    <OaH2 id="sec-example" sec="example">範例請求</OaH2>
    <OaCode title={<OaSeg value={lang} options={[{ value: 'curl', label: 'cURL' }, { value: 'fetch', label: 'fetch' }]} onChange={setLang}></OaSeg>}
      tools={D.servers.length > 1 ? <select className="oa-sel" value={si} onChange={(e) => setSi(+e.target.value)} aria-label="伺服器">{D.servers.map((s, i) => <option key={s.url} value={i}>{s.description || s.url}</option>)}</select> : null}
      copyText={text} foot={<><span className="oa-ph">&lt;…&gt;</span> 為佔位，換成實際值再執行。這是純靜態文件，不會替你送出請求。</>}>
      <OaCurlText text={text}></OaCurlText>
    </OaCode>
  </section>;
}

function OaOpPage({ D, op, go, sig, sub, hashFor, mainRef }) {
  const cts = op.requestBody ? Object.keys(op.requestBody.content || {}) : [];
  const [ct, setCt] = useState(cts[0]);
  useEffect(() => setCt(cts[0]), [op]);
  const tag = D.tags.find((t) => t.name === op.tags[0]);
  const jumpParam = (e) => {
    const pp = e.target.closest('.oa-pp'); if (!pp || !mainRef.current) return;
    const el = mainRef.current.querySelector(`#param-path-${CSS.escape(pp.textContent.slice(1, -1))}`); if (!el) return;
    mainRef.current.scrollTop = el.getBoundingClientRect().top - mainRef.current.getBoundingClientRect().top + mainRef.current.scrollTop - 80;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  };
  return <article className="erx-page oa-op" key={op.key}>
    <div className="erx-crumbs"><button type="button" onClick={() => go({ kind: 'tag', key: tag.name })}><code>{tag.label}</code></button><OaIcon n="right" s={11}></OaIcon><span>operation</span></div>
    <div className="oa-op-hd" onClick={jumpParam}>
      <OaMethod m={op.method} size="lg"></OaMethod>
      <h1 className="oa-op-path"><OaPath path={op.path} wrap></OaPath></h1>
    </div>
    <div className="oa-op-sum">{op.summary || <span className="oa-muted">沒有 summary</span>}{op.deprecated ? <span className="oa-flag dep lg">已棄用</span> : null}</div>
    <div className="erx-meta oa-op-meta">
      <span className="oa-opid">operationId {op.operationId ? <code>{op.operationId}</code> : <span className="oa-muted">未設定，連結改用 method + path</span>}</span>
      <OaSecurity D={D} op={op}></OaSecurity>
      <span className="oa-op-tools"><OaCopyBtn text={op.path} label="複製 path" className="erx-pill"></OaCopyBtn><OaCopyBtn text={hashFor({ kind: 'op', key: op.key })} label="複製連結" icon="link" className="erx-pill"></OaCopyBtn></span>
    </div>
    {op.deprecated ? <div className="oa-dep-note"><OaIcon n="alert" s={13}></OaIcon><span>這支 operation 已標記為 <code>deprecated</code>，新的串接請不要再使用。</span></div> : null}
    {op.description ? <ErMarkdown src={op.description}></ErMarkdown> : <OaMissing field={oaOpPointer(op)} what="這支 operation 還沒有說明"></OaMissing>}

    {op.params.length ? <section><OaH2 id="sec-params" sec="params" count={op.params.length}>參數</OaH2><OaParams D={D} op={op} go={go}></OaParams></section> : null}
    {op.requestBody && ct ? <OaBody D={D} op={op} ct={ct} setCt={setCt} go={go} sig={sig}></OaBody> : null}
    <OaResponses D={D} op={op} go={go} sig={sig} sub={sub} key={op.key}></OaResponses>
    <OaExample D={D} op={op} ct={ct}></OaExample>
  </article>;
}

function OaSchemaPage({ D, name, go, sig, hashFor }) {
  const s = D.schemas[name];
  const props = s.properties ? Object.keys(s.properties) : [];
  const used = D.usage[name];
  const direct = used.filter((u) => u.where);
  const via = used.filter((u) => u.via);
  const deps = [...D.deps[name]];
  const selfCycle = deps.includes(name);
  return <article className="erx-page" key={name}>
    <div className="erx-crumbs"><span>components.schemas</span></div>
    <div className="erx-h1-row"><h1 className="erx-h1"><code>{name}</code>{s.title ? s.title : null}</h1>
      <span className="oa-op-tools"><OaCopyBtn text={() => JSON.stringify(s, null, 2)} label="複製 schema JSON" icon="braces" className="erx-pill"></OaCopyBtn><OaCopyBtn text={hashFor({ kind: 'schema', key: name })} label="複製連結" icon="link" className="erx-pill"></OaCopyBtn></span></div>
    <div className="erx-meta">
      <span className="oa-type">{oaType(s) || (s.oneOf ? 'oneOf' : s.anyOf ? 'anyOf' : s.allOf ? 'allOf' : 'any')}</span>
      {props.length ? <span><b>{props.length}</b> 個欄位</span> : null}
      {s.required ? <span><b>{s.required.length}</b> 個必填</span> : null}
      <span>被 <b>{used.length}</b> 支 operation 使用</span>
      {selfCycle ? <span className="oa-flag cyc"><OaIcon n="cycle" s={11}></OaIcon>自我參照</span> : null}
    </div>
    {s.description ? <ErMarkdown src={s.description}></ErMarkdown> : <OaMissing field={`components.schemas.${name}.description`} what="這個 schema 還沒有說明"></OaMissing>}
    <OaH2 count={props.length || null}>欄位</OaH2>
    <OaMedia D={D} media={{ schema: { $ref: `#/components/schemas/${name}` } }} go={go} sig={sig} forResponse rootLabel={name}></OaMedia>

    <OaH2 count={used.length}>被哪些 operation 使用</OaH2>
    {used.length ? <div className="oa-oplist">
      {direct.map((u) => <button type="button" key={u.op.key} className={`oa-oplist-r${u.op.deprecated ? ' dep' : ''}`} onClick={() => go({ kind: 'op', key: u.op.key })}>
        <OaMethod m={u.op.method}></OaMethod><span className="oa-oplist-p"><OaPath path={u.op.path}></OaPath></span><span className="oa-oplist-s">{u.where.join('、')}</span></button>)}
      {via.length ? <div className="oa-oplist-sub">間接使用（經由其他 schema）</div> : null}
      {via.map((u) => <button type="button" key={u.op.key} className="oa-oplist-r via" onClick={() => go({ kind: 'op', key: u.op.key })}>
        <OaMethod m={u.op.method}></OaMethod><span className="oa-oplist-p"><OaPath path={u.op.path}></OaPath></span><span className="oa-oplist-s">經由 <code>{u.via}</code></span></button>)}
    </div> : <p className="erx-empty">沒有 operation 參照這個 schema。可能是預留或已不再使用。</p>}

    <div className="erx-rel">
      <div><h4>參照（本 schema → 其他）</h4>{deps.length ? deps.map((d) => <button type="button" key={d} className="erx-rel-r" onClick={() => go({ kind: 'schema', key: d })}><code>{name}</code><OaIcon n="right" s={12}></OaIcon><code className="to">{d}</code>{d === name ? <em>自我參照</em> : D.deps[d] && D.deps[d].has(name) ? <em>互相參照</em> : null}</button>) : <p className="erx-empty">沒有參照其他 schema。</p>}</div>
      <div><h4>被參照（其他 → 本 schema）</h4>{D.refBy[name].length ? D.refBy[name].map((d) => <button type="button" key={d} className="erx-rel-r" onClick={() => go({ kind: 'schema', key: d })}><code className="to">{d}</code><OaIcon n="right" s={12}></OaIcon><code>{name}</code></button>) : <p className="erx-empty">沒有其他 schema 參照這裡。</p>}</div>
    </div>
  </article>;
}

Object.assign(window, { OaNav, OaOverview, OaTagPage, OaOpPage, OaSchemaPage, OaOpList, OaMethodCounts, OaSecurity, OaParams, OaH2, oaOpSections, oaMatch, OaCurlText });
})();
