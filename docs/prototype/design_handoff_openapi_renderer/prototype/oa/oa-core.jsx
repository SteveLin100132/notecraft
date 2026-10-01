// OpenAPI Renderer — 核心：推導、$ref、範例產生、cURL / fetch、原子元件
(() => {
const { useState, useEffect, useRef, useCallback } = React;

const OA_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'query', 'head', 'options', 'trace'];
const OA_READ = new Set(['get', 'head', 'options', 'query', 'trace']);
const OA_KNOWN = new Set(['get', 'post', 'put', 'patch', 'delete']);

// lucide 圖示（production 以 lucide-react 對應元件取代：Search, X, ChevronRight…）
const OA_IC = {
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3', x: 'M18 6 6 18M6 6l12 12',
  right: 'm9 18 6-6-6-6', down: 'm6 9 6 6 6-6', left: 'm15 18-6-6 6-6',
  copy: 'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zM4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
  check: 'M20 6 9 17l-5-5', link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  unlock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 9.9-1',
  server: 'M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM6 6h.01M6 18h.01',
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  braces: 'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1',
  tag: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4zM7.5 7.5h.01',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  dive: 'M15 10l5 5-5 5M4 4v7a4 4 0 0 0 4 4h12',
  cycle: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  out: 'M7 17 17 7M7 7h10v10', back: 'M19 12H5M12 19l-7-7 7-7',
  panel: 'M3 3h18v18H3zM9 3v18', info: 'M12 16v-4M12 8h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  terminal: 'M4 17l6-6-6-6M12 19h8', merge: 'M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21V9a9 9 0 0 0 9 9',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', collapse: 'm7 20 5-5 5 5M7 4l5 5 5-5',
  file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1',
  plug: 'M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z',
};
function OaIcon({ n, s = 14, style }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', ...style }}><path d={OA_IC[n]}></path></svg>;
}

// ── $ref ──
function oaPtr(spec, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  return ref.slice(2).split('/').reduce((o, k) => (o == null ? o : o[k.replace(/~1/g, '/').replace(/~0/g, '~')]), spec);
}
const oaRefName = (ref) => ref.split('/').pop();
const oaIsSchemaRef = (ref) => typeof ref === 'string' && ref.startsWith('#/components/schemas/');
function oaDeref(spec, x) { let n = 0; while (x && x.$ref && n++ < 10) x = oaPtr(spec, x.$ref); return x; }
function oaType(s) {
  if (!s) return null;
  let t = s.type; if (Array.isArray(t)) t = t.find((x) => x !== 'null') || t[0];
  if (!t) { if (s.properties || s.additionalProperties) t = 'object'; else if (s.items) t = 'array'; }
  return t || null;
}
const oaNullable = (s) => !!s && (s.nullable === true || (Array.isArray(s.type) && s.type.includes('null')));

function oaCollectRefs(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((x) => oaCollectRefs(x, out)); return out; }
  if (oaIsSchemaRef(node.$ref)) out.add(oaRefName(node.$ref));
  Object.keys(node).forEach((k) => { if (k !== '$ref' && k !== 'example' && k !== 'examples') oaCollectRefs(node[k], out); });
  return out;
}

function oaDerive(spec) {
  const ops = [];
  Object.entries(spec.paths || {}).forEach(([path, item]) => {
    const shared = (item.parameters || []).map((p) => oaDeref(spec, p));
    OA_METHODS.forEach((m) => {
      const o = item[m]; if (!o) return;
      const own = (o.parameters || []).map((p) => oaDeref(spec, p));
      const params = [...shared.filter((s) => !own.some((p) => p.name === s.name && p.in === s.in)), ...own];
      const responses = Object.fromEntries(Object.entries(o.responses || {}).map(([k, v]) => [k, oaDeref(spec, v)]));
      ops.push({ ...o, key: o.operationId || `${m}${path}`, method: m, path, params, requestBody: o.requestBody ? oaDeref(spec, o.requestBody) : null, responses,
        security: o.security !== undefined ? o.security : (spec.security || []), tags: o.tags && o.tags.length ? o.tags : ['__none'] });
    });
  });
  const declared = spec.tags || [];
  const keys = declared.map((t) => t.name);
  ops.forEach((o) => o.tags.forEach((t) => { if (!keys.includes(t) && t !== '__none') keys.push(t); }));
  if (ops.some((o) => o.tags.includes('__none'))) keys.push('__none');
  const tags = keys.map((name) => {
    const d = declared.find((t) => t.name === name) || {};
    return { name, label: name === '__none' ? '未分類' : name, description: d.description, summary: d.summary, ops: ops.filter((o) => o.tags.includes(name)) };
  }).filter((t) => t.ops.length);
  const schemas = (spec.components && spec.components.schemas) || {};
  const schemaNames = Object.keys(schemas);
  const deps = Object.fromEntries(schemaNames.map((n) => [n, oaCollectRefs(schemas[n])]));
  const closure = (start) => { const seen = new Set(); const q = [...start]; while (q.length) { const n = q.shift(); if (seen.has(n)) continue; seen.add(n); (deps[n] || []).forEach((x) => q.push(x)); } return seen; };
  ops.forEach((o) => {
    const where = [];
    o.params.forEach((p) => oaCollectRefs(p.schema).forEach((n) => where.push([n, `參數 ${p.name}`])));
    if (o.requestBody) oaCollectRefs(o.requestBody.content).forEach((n) => where.push([n, 'Request body']));
    Object.entries(o.responses).forEach(([c, r]) => oaCollectRefs(r && r.content).forEach((n) => where.push([n, `回應 ${c}`])));
    o.refs = where;
  });
  const usage = Object.fromEntries(schemaNames.map((n) => [n, []]));
  ops.forEach((o) => {
    const direct = new Map(); o.refs.forEach(([n, w]) => { if (!direct.has(n)) direct.set(n, []); if (!direct.get(n).includes(w)) direct.get(n).push(w); });
    schemaNames.forEach((n) => {
      if (direct.has(n)) usage[n].push({ op: o, where: direct.get(n) });
      else { const via = [...direct.keys()].find((d) => d !== n && closure([d]).has(n)); if (via) usage[n].push({ op: o, via }); }
    });
  });
  const refBy = Object.fromEntries(schemaNames.map((n) => [n, schemaNames.filter((m) => m !== n && deps[m].has(n))]));
  const opByKey = new Map(ops.map((o) => [o.key, o]));
  const v = String(spec.openapi || '');
  const supported = /^3\.(0|1)\./.test(v);
  return { spec, ops, opByKey, tags, schemas, schemaNames, deps, usage, refBy, version: v, supported, servers: spec.servers || [], securitySchemes: (spec.components && spec.components.securitySchemes) || {} };
}

// ── 範例產生 ──
const OA_FMT = { 'date-time': '2026-10-01T09:00:00Z', date: '2026-10-01', email: 'user@example.com', uuid: '3f2c8a10-5b7e-4c1d-9a2e-6d0f4b8c7e21', uri: 'https://example.com', binary: '<binary>', password: '********' };
function oaExample(spec, s, seen = [], depth = 0) {
  if (!s || depth > 8) return null;
  if (s.$ref) { const n = oaRefName(s.$ref); if (seen.includes(n)) return {}; return oaExample(spec, oaPtr(spec, s.$ref), [...seen, n], depth + 1); }
  if (s.example !== undefined) return s.example;
  if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
  if (s.const !== undefined) return s.const;
  if (s.default !== undefined) return s.default;
  if (s.enum) return s.enum[0];
  if (s.allOf) return Object.assign({}, ...s.allOf.map((x) => oaExample(spec, x, seen, depth + 1)).filter((v) => v && typeof v === 'object' && !Array.isArray(v)));
  if (s.oneOf || s.anyOf) { const vs = (s.oneOf || s.anyOf).filter((x) => x.type !== 'null'); return oaExample(spec, vs[0], seen, depth + 1); }
  const t = oaType(s);
  if (t === 'object') {
    const o = {};
    Object.entries(s.properties || {}).forEach(([k, v]) => { if (!v.deprecated && !v.readOnly) o[k] = oaExample(spec, v, seen, depth + 1); });
    if (!s.properties && s.additionalProperties && typeof s.additionalProperties === 'object') o.key = oaExample(spec, s.additionalProperties, seen, depth + 1);
    return o;
  }
  if (t === 'array') return [oaExample(spec, s.items, seen, depth + 1)];
  if (t === 'integer' || t === 'number') return s.minimum != null ? s.minimum : 0;
  if (t === 'boolean') return true;
  if (t === 'string') return OA_FMT[s.format] || 'string';
  return null;
}
// 回應範例：examples.* > example > 由 schema 產生
function oaMediaExample(spec, media, forResponse) {
  if (!media) return { value: null };
  if (media.examples) { const [k, e] = Object.entries(media.examples)[0]; const ex = oaDeref(spec, e); return { value: ex.value, label: ex.summary || k, all: media.examples }; }
  if (media.example !== undefined) return { value: media.example, label: 'example' };
  const gen = forResponse ? oaExampleResp(spec, media.schema) : oaExample(spec, media.schema);
  return { value: gen, generated: true };
}
// 回應要含 readOnly 欄位
function oaExampleResp(spec, s, seen = [], depth = 0) {
  if (!s || depth > 8) return null;
  if (s.$ref) { const n = oaRefName(s.$ref); if (seen.includes(n)) return {}; return oaExampleResp(spec, oaPtr(spec, s.$ref), [...seen, n], depth + 1); }
  const t = oaType(s);
  if (t === 'object' && s.properties && s.example === undefined) { const o = {}; Object.entries(s.properties).forEach(([k, v]) => { if (!v.deprecated) o[k] = oaExampleResp(spec, v, seen, depth + 1); }); return o; }
  if (t === 'array' && s.example === undefined) return [oaExampleResp(spec, s.items, seen, depth + 1)];
  if (s.allOf) return Object.assign({}, ...s.allOf.map((x) => oaExampleResp(spec, x, seen, depth + 1)).filter((v) => v && typeof v === 'object'));
  return oaExample(spec, s, seen, depth);
}
const oaParamExample = (p) => (p.example !== undefined ? p.example : p.schema && (p.schema.example !== undefined ? p.schema.example : (p.schema.enum ? p.schema.enum[0] : undefined)));

// ── cURL / fetch ──
function oaAuthHeaders(D, op) {
  const req = (op.security || [])[0]; if (!req) return [];
  return Object.keys(req).map((k) => {
    const s = D.securitySchemes[k]; if (!s) return null;
    if (s.type === 'apiKey' && s.in === 'header') return [s.name, '<API_KEY>'];
    if (s.type === 'apiKey' && s.in === 'query') return null;
    if (s.type === 'http' && s.scheme === 'basic') return ['Authorization', 'Basic <BASE64_CREDENTIALS>'];
    return ['Authorization', 'Bearer <ACCESS_TOKEN>'];
  }).filter(Boolean);
}
function oaRequestParts(D, op, server, ct) {
  const base = ((server && server.url) || '').replace(/\/$/, '');
  const path = op.path.replace(/\{([^}]+)\}/g, (m, n) => { const p = op.params.find((x) => x.in === 'path' && x.name === n); const ex = p && oaParamExample(p); return ex != null ? encodeURIComponent(ex) : `<${n}>`; });
  const qs = op.params.filter((p) => p.in === 'query' && !p.deprecated && (p.required || oaParamExample(p) !== undefined))
    .map((p) => { const ex = oaParamExample(p); return `${p.name}=${ex === undefined ? `<${p.name}>` : (Array.isArray(ex) ? ex.join(',') : ex)}`; });
  const headers = [...oaAuthHeaders(D, op), ...op.params.filter((p) => p.in === 'header' && (p.required || p.example !== undefined)).map((p) => [p.name, p.example !== undefined ? p.example : `<${p.name}>`])];
  const cookies = op.params.filter((p) => p.in === 'cookie' && p.required).map((p) => `${p.name}=<${p.name}>`);
  let body = null;
  const media = op.requestBody && op.requestBody.content && (op.requestBody.content[ct] || Object.values(op.requestBody.content)[0]);
  const mediaType = ct || (op.requestBody && Object.keys(op.requestBody.content || {})[0]);
  if (media) { body = oaMediaExample(D.spec, media).value; headers.push(['Content-Type', mediaType]); }
  return { url: base + path + (qs.length ? '?' + qs.join('&') : ''), headers, cookies, body, mediaType };
}
function oaCurl(D, op, server, ct) {
  const r = oaRequestParts(D, op, server, ct);
  const L = [`curl -X ${op.method.toUpperCase()} '${r.url}'`];
  r.headers.forEach(([k, v]) => L.push(`-H '${k}: ${v}'`));
  if (r.cookies.length) L.push(`--cookie '${r.cookies.join('; ')}'`);
  if (r.body != null) {
    if (/json/.test(r.mediaType)) L.push(`-d '${JSON.stringify(r.body, null, 2).replace(/'/g, "'\\''")}'`);
    else if (r.mediaType === 'application/x-www-form-urlencoded') Object.entries(r.body || {}).filter(([, v]) => typeof v !== 'object').forEach(([k, v]) => L.push(`--data-urlencode '${k}=${v}'`));
    else if (r.mediaType === 'multipart/form-data') Object.entries(r.body || {}).forEach(([k, v]) => L.push(v === '<binary>' ? `-F '${k}=@./file.pdf'` : `-F '${k}=${typeof v === 'object' ? JSON.stringify(v) : v};type=application/json'`));
    else L.push(`--data-binary '@./file.bin'`);
  }
  return L.join(' \\\n  ');
}
function oaFetch(D, op, server, ct) {
  const r = oaRequestParts(D, op, server, ct);
  const h = r.headers.length ? `  headers: {\n${r.headers.map(([k, v]) => `    '${k}': '${v}',`).join('\n')}\n  },\n` : '';
  let b = '';
  if (r.body != null) b = /json/.test(r.mediaType) ? `  body: JSON.stringify(${JSON.stringify(r.body, null, 2).split('\n').join('\n  ')}),\n` : `  body, // ${r.mediaType}\n`;
  return `const res = await fetch('${r.url}', {\n  method: '${op.method.toUpperCase()}',\n${h}${b}});\nconst data = await res.json();`;
}

// ── 原子 ──
function OaMethod({ m, size }) {
  const k = OA_KNOWN.has(m) ? m : 'other';
  return <span className={`oa-m oa-m--${k} ${OA_READ.has(m) ? 'is-read' : 'is-write'}${size ? ' oa-m--' + size : ''}`} title={OA_READ.has(m) ? '唯讀方法' : '會改變資料的方法'}>{m === 'delete' && size !== 'lg' ? 'DEL' : m.toUpperCase()}</span>;
}
const oaStatusTone = (c) => (c === 'default' ? 'neutral' : c[0] === '2' ? 'ok' : c[0] === '3' ? 'info' : c[0] === '4' ? 'warn' : c[0] === '5' ? 'danger' : 'neutral');
function OaStatus({ code, on, onClick }) {
  const T = onClick ? 'button' : 'span';
  return <T type={onClick ? 'button' : undefined} className={`oa-st oa-st--${oaStatusTone(code)}${on ? ' on' : ''}`} onClick={onClick}><i></i>{code}</T>;
}
function OaPath({ path, wrap, short }) {
  const shown = short ? oaShortPath(path, short) : path;
  const parts = shown.split(/(\{[^}]+\})/);
  return <span className={`oa-path${wrap ? ' wrap' : ''}`} title={short && shown !== path ? path : undefined}>{parts.map((p, i) => p.startsWith('{')
    ? <span key={i} className="oa-pp">{p}</span>
    : (wrap ? p.split(/(\/)/).map((x, j) => x === '/' ? <React.Fragment key={i + '-' + j}><wbr></wbr>/</React.Fragment> : x) : p))}</span>;
}
// 長 path：保留第一段與盡量多的尾段，中間以 …/ 取代
function oaShortPath(path, max) {
  if (path.length <= max) return path;
  const seg = path.split('/').filter(Boolean);
  const tail = [];
  for (let i = seg.length - 1; i > 0; i--) { const cand = ['', seg[0], '…', seg[i], ...tail].join('/'); if (cand.length > max && tail.length) break; tail.unshift(seg[i]); }
  return ['', seg[0], '…', ...tail].join('/');
}
function oaCopyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => fallback());
  function fallback() { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); }
  fallback(); return Promise.resolve();
}
function useOaCopy() {
  const [done, setDone] = useState(false); const t = useRef();
  const copy = useCallback((text) => { oaCopyText(text); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1600); }, []);
  return [done, copy];
}
function OaCopyBtn({ text, label = '複製', doneLabel = '已複製', className = 'oa-copy', icon = 'copy' }) {
  const [done, copy] = useOaCopy();
  return <button type="button" className={`${className}${done ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); copy(typeof text === 'function' ? text() : text); }} aria-live="polite">
    <OaIcon n={done ? 'check' : icon} s={12}></OaIcon>{done ? doneLabel : label}</button>;
}
function OaJson({ value, maxH }) {
  const src = value === undefined ? '' : (typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  const out = []; let last = 0, i = 0;
  const re = /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g; let m;
  if (typeof value !== 'string') while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const t = m[0]; const cls = /^"/.test(t) ? (/:$/.test(t) ? 'k' : 's') : /true|false|null/.test(t) ? 'l' : 'n';
    if (cls === 'k') { const kk = t.replace(/\s*:$/, ''); out.push(<span key={i++} className="oa-j-k">{kk}</span>, t.slice(kk.length)); } else out.push(<span key={i++} className={`oa-j-${cls}`}>{t}</span>);
    last = m.index + t.length;
  }
  out.push(src.slice(last));
  return <pre className="oa-pre" style={maxH ? { maxHeight: maxH } : null}><code>{out}</code></pre>;
}
function OaCode({ title, tools, copyText, children, foot }) {
  return <div className="oa-code">
    <div className="oa-code-h">{title}<span className="oa-code-sp"></span>{tools}{copyText != null ? <OaCopyBtn text={copyText}></OaCopyBtn> : null}</div>
    {children}
    {foot ? <div className="oa-code-f">{foot}</div> : null}
  </div>;
}
function OaSeg({ value, options, onChange, mono }) {
  if (options.length < 2) return options.length ? <span className={`oa-seg-one${mono ? ' mono' : ''}`}>{options[0].label || options[0]}</span> : null;
  return <div className={`oa-seg${mono ? ' mono' : ''}`} role="tablist">{options.map((o) => { const v = o.value ?? o; return <button type="button" role="tab" aria-selected={v === value} key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{o.label ?? o}</button>; })}</div>;
}
// 空狀態：告訴作者去 spec 哪個欄位補
function OaMissing({ field, what }) {
  return <p className="oa-missing"><OaIcon n="info" s={13}></OaIcon><span>{what || '尚無說明'}。在 spec 的 <code>{field}</code> 以 Markdown 補上，下次 build 就會出現在這裡。</span></p>;
}
function oaOpPointer(op) { return `paths["${op.path}"].${op.method}.description`; }

// hash：#op/<operationId>（無 operationId 時 #op/<method><path>）· #schema/<Name> · #tag/<name> · 空 = 總覽
function oaRouteToHash(r) { if (!r || r.kind === 'overview') return ''; return `#${r.kind}/${r.key}${r.sub ? '/' + r.sub : ''}`; }
function oaHashToRoute(h, D) {
  const s = decodeURIComponent((h || '').replace(/^#/, '')); if (!s) return null;
  const [kind, ...rest] = s.split('/'); const key = rest.join('/');
  if (kind === 'op') { if (D.opByKey.has(key)) return { kind, key }; const k = [...D.opByKey.keys()].find((x) => key.startsWith(x + '/')); return k ? { kind, key: k, sub: key.slice(k.length + 1) } : null; }
  if (kind === 'schema') { const [n, ...sub] = rest; return D.schemas[n] ? { kind, key: n, sub: sub.join('/') || undefined } : null; }
  if (kind === 'tag') return D.tags.some((t) => t.name === key) ? { kind, key } : null;
  return null;
}

Object.assign(window, { OA_METHODS, OA_READ, OA_KNOWN, OaIcon, oaPtr, oaRefName, oaIsSchemaRef, oaDeref, oaType, oaNullable, oaDerive, oaExample, oaExampleResp, oaMediaExample, oaParamExample, oaCurl, oaFetch, OaMethod, OaStatus, oaStatusTone, OaPath, oaShortPath, OaCopyBtn, useOaCopy, oaCopyText, OaJson, OaCode, OaSeg, OaMissing, oaOpPointer, oaRouteToHash, oaHashToRoute });
})();
