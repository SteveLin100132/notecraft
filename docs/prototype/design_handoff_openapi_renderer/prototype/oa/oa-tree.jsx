// OpenAPI Renderer — 欄位樹：$ref 連結、循環停止、oneOf/anyOf/allOf、超過 3 層改為「深入」
(() => {
const { useState, useEffect } = React;

function oaExpand(spec, s, chain) {
  if (!s) return null;
  if (s.$ref) {
    const n = oaRefName(s.$ref);
    if (chain.includes(n)) return { kind: 'cycle', refName: n };
    chain = [...chain, n]; s = oaPtr(spec, s.$ref) || {};
  }
  if (s.allOf) {
    const props = [], req = new Set(), parts = [];
    s.allOf.forEach((p) => {
      let lbl = '內嵌';
      if (p.$ref) { lbl = oaRefName(p.$ref); if (chain.includes(lbl)) return; p = oaPtr(spec, p.$ref) || {}; }
      parts.push(lbl);
      Object.entries(p.properties || {}).forEach((e) => props.push([...e, lbl]));
      (p.required || []).forEach((r) => req.add(r));
    });
    (s.required || []).forEach((r) => req.add(r));
    return { kind: 'props', props, required: req, allOf: parts, chain };
  }
  if (s.oneOf || s.anyOf) {
    const list = s.oneOf || s.anyOf;
    return { kind: 'combo', mode: s.oneOf ? 'oneOf' : 'anyOf', discriminator: s.discriminator && s.discriminator.propertyName, chain,
      variants: list.map((v, i) => ({ label: v.$ref ? oaRefName(v.$ref) : (v.title || (v.type === 'null' ? 'null' : `選項 ${i + 1}`)), schema: v, title: v.$ref ? (oaPtr(spec, v.$ref) || {}).title : null })) };
  }
  const t = oaType(s);
  if (t === 'array') return { kind: 'array', items: s.items, chain };
  if (t === 'object') {
    if (s.properties) return { kind: 'props', props: Object.entries(s.properties), required: new Set(s.required || []), chain };
    if (s.additionalProperties && typeof s.additionalProperties === 'object') return { kind: 'map', value: s.additionalProperties, chain };
    return { kind: 'props', props: [], required: new Set(), chain, free: true };
  }
  return null;
}
function oaChildren(spec, s, chain) {
  let e = oaExpand(spec, s, chain), n = 0;
  while (e && e.kind === 'array' && n++ < 3) e = oaExpand(spec, e.items, e.chain);
  return e && e.kind === 'array' ? null : e;
}
const oaKidCount = (e) => !e ? 0 : e.kind === 'props' ? e.props.length : e.kind === 'combo' ? e.variants.length : e.kind === 'map' ? 1 : 0;
const oaIsArr = (f) => oaType(f) === 'array';
const oaRefOf = (f) => (f.$ref ? oaRefName(f.$ref) : f.items && f.items.$ref ? oaRefName(f.items.$ref) : f.allOf && f.allOf.length === 1 && f.allOf[0].$ref ? oaRefName(f.allOf[0].$ref) : null);

function OaTypeLabel({ f, go }) {
  if (!f) return null;
  const link = (n, arr) => <a className="oa-tref" href={`#schema/${n}`} title={`前往 Schema ${n}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); go({ kind: 'schema', key: n }); }}><code>{n}{arr ? '[]' : ''}</code><OaIcon n="out" s={10}></OaIcon></a>;
  if (f.$ref) return link(oaRefName(f.$ref));
  const t = oaType(f);
  if (t === 'array') { const it = f.items || {}; if (it.$ref) return link(oaRefName(it.$ref), true); return <code className="oa-type">{oaType(it) || (it.oneOf ? 'oneOf' : it.anyOf ? 'anyOf' : 'any')}[]</code>; }
  if (f.oneOf || f.anyOf) return <code className="oa-type combo">{f.oneOf ? 'oneOf' : 'anyOf'}</code>;
  if (f.allOf) return f.allOf.length === 1 && f.allOf[0].$ref ? link(oaRefName(f.allOf[0].$ref)) : <code className="oa-type combo">allOf</code>;
  if (t === 'object' && !f.properties && f.additionalProperties && typeof f.additionalProperties === 'object') { const ap = f.additionalProperties; return <code className="oa-type">map&lt;string, {ap.$ref ? oaRefName(ap.$ref) : oaType(ap) || 'any'}&gt;</code>; }
  return <code className="oa-type">{t || 'any'}</code>;
}
function oaConstraints(f) {
  if (!f) return [];
  const out = [];
  if (f.const !== undefined) out.push(`固定值 ${JSON.stringify(f.const)}`);
  if (f.default !== undefined) out.push(`預設 ${JSON.stringify(f.default)}`);
  if (f.minimum != null) out.push(`≥ ${f.minimum}`); if (f.maximum != null) out.push(`≤ ${f.maximum}`);
  if (f.minLength != null || f.maxLength != null) out.push(`長度 ${f.minLength ?? 0}–${f.maxLength ?? '∞'}`);
  if (f.minItems != null || f.maxItems != null) out.push(`${f.minItems ?? 0}–${f.maxItems ?? '∞'} 項`);
  if (f.pattern) out.push(`pattern ${f.pattern}`);
  return out;
}
function OaEnum({ values, max = 8 }) {
  if (!values || !values.length) return null;
  const shown = values.slice(0, max);
  return <span className="oa-enum"><em>enum</em>{shown.map((v) => <code key={String(v)}>{JSON.stringify(v)}</code>)}{values.length > max ? <span>+{values.length - max}</span> : null}</span>;
}

function OaSchemaTree({ D, schema, go, sig, rootLabel = 'body', maxDepth = 3, flat }) {
  const spec = D.spec;
  const [opened, setOpened] = useState(() => new Set());
  const [closed, setClosed] = useState(() => new Set());
  const [focus, setFocus] = useState([]);
  const [variant, setVariant] = useState({});
  useEffect(() => { setOpened(new Set()); setClosed(new Set()); setFocus([]); setVariant({}); }, [sig, schema]);
  const isOpen = (p, depth, isRef) => opened.has(p) || (!closed.has(p) && !isRef && depth < 1);
  const toggle = (p, cur) => {
    setOpened((s) => { const n = new Set(s); cur ? n.delete(p) : n.add(p); return n; });
    setClosed((s) => { const n = new Set(s); cur ? n.add(p) : n.delete(p); return n; });
  };
  const base = focus.length ? focus[focus.length - 1] : { schema, chain: [], path: '' };

  function Field({ name, f, req, path, depth, chain, via }) {
    f = f || {};
    const refN = oaRefOf(f);
    const cyc = refN && chain.includes(refN);
    const kids = cyc ? null : oaChildren(spec, f, chain);
    const cnt = oaKidCount(kids);
    const hasKids = cnt > 0;
    const seg = name + (oaIsArr(f) ? '[]' : '');
    const p = path ? `${path}.${seg}` : seg;
    const tooDeep = hasKids && depth >= maxDepth - 1;
    const open = hasKids && !tooDeep && isOpen(p, depth, !!refN);
    const target = f.$ref ? oaPtr(spec, f.$ref) : null;
    const desc = f.description || (target && target.description);
    const enumV = f.enum || (f.items && f.items.enum);
    const cons = oaConstraints(f);
    const fmt = f.format || (f.items && f.items.format);
    return <div className={`oa-f${f.deprecated ? ' dep' : ''}`}>
      <div className="oa-f-l">
        {hasKids && !tooDeep ? <button type="button" className={`oa-caret${open ? ' open' : ''}`} aria-expanded={open} aria-label={open ? '收合' : '展開'} onClick={() => toggle(p, open)}><OaIcon n="right" s={12}></OaIcon></button> : <span className="oa-caret-sp"></span>}
        <code className="oa-f-n">{name}</code>
        <OaTypeLabel f={f} go={go}></OaTypeLabel>
        {fmt ? <span className="oa-f-fmt">{fmt}</span> : null}
        {req ? <span className="oa-f-req"><i></i>必填</span> : null}
        {oaNullable(f) ? <span className="oa-flag">nullable</span> : null}
        {f.readOnly ? <span className="oa-flag">readOnly</span> : null}
        {f.writeOnly ? <span className="oa-flag">writeOnly</span> : null}
        {f.deprecated ? <span className="oa-flag dep">已棄用</span> : null}
        {via ? <span className="oa-f-via">來自 {via}</span> : null}
        {cyc ? <span className="oa-flag cyc" title={`${refN} 已在上層展開過，為避免無限展開停在這裡`}><OaIcon n="cycle" s={11}></OaIcon>循環參照 · 同上層 {refN}</span> : null}
        {tooDeep ? <button type="button" className="oa-dive" onClick={() => setFocus([...focus, { label: p, schema: f, chain, path: p, name }])}><OaIcon n="dive" s={12}></OaIcon>深入 {cnt} 個{kids.kind === 'combo' ? '選項' : '欄位'}</button> : null}
      </div>
      {desc || enumV || cons.length ? <div className="oa-f-d">
        {desc ? <span className="oa-f-desc"><ErInline text={desc}></ErInline></span> : null}
        {enumV ? <OaEnum values={enumV}></OaEnum> : null}
        {cons.map((c) => <span key={c} className="oa-f-c">{c}</span>)}
      </div> : null}
      {open ? <div className="oa-f-kids">{renderExp(kids, p, depth + 1)}</div> : null}
    </div>;
  }

  function renderExp(e, path, depth) {
    if (!e) return null;
    if (e.kind === 'cycle') return <div className="oa-f-note"><OaIcon n="cycle" s={12}></OaIcon>循環參照 {e.refName}，停在這裡</div>;
    if (e.kind === 'map') return <Field name="{key}" f={e.value} path={path} depth={depth} chain={e.chain}></Field>;
    if (e.kind === 'combo') {
      const vk = path || '$';
      const vi = Math.min(variant[vk] || 0, e.variants.length - 1);
      const v = e.variants[vi];
      const vk2 = oaChildren(spec, v.schema, e.chain);
      return <div className="oa-combo">
        <div className="oa-combo-h">
          <span className="oa-combo-m"><OaIcon n="merge" s={12}></OaIcon>{e.mode}</span>
          <span className="oa-combo-t">{e.mode === 'oneOf' ? '擇一' : '一個或多個'}{e.discriminator ? <>，依 <code>{e.discriminator}</code> 判斷</> : null}</span>
          <OaSeg value={vi} options={e.variants.map((x, i) => ({ value: i, label: x.title ? `${x.label} · ${x.title}` : x.label }))} onChange={(i) => setVariant({ ...variant, [vk]: i })} mono></OaSeg>
        </div>
        <div className="oa-combo-b">
          {v.schema.$ref ? <div className="oa-combo-ref">選項 <OaTypeLabel f={v.schema} go={go}></OaTypeLabel>{oaRefName(v.schema.$ref) && e.chain.includes(oaRefName(v.schema.$ref)) ? <span className="oa-flag cyc"><OaIcon n="cycle" s={11}></OaIcon>循環參照</span> : null}</div> : null}
          {vk2 ? renderExp(vk2, `${path}<${vi}>`, depth) : <div className="oa-f-note">{v.schema.type === 'null' ? '值為 null' : <>型別 <code className="oa-type">{oaType(v.schema) || 'any'}</code></>}</div>}
        </div>
      </div>;
    }
    if (e.kind === 'props') {
      if (!e.props.length) return <div className="oa-f-note">{e.free ? '任意 object，spec 沒有列出欄位' : '沒有欄位'}</div>;
      return <>
        {e.allOf && e.allOf.length > 1 && depth === 0 ? <div className="oa-allof"><OaIcon n="merge" s={12}></OaIcon><b>allOf</b> 合併自 {e.allOf.map((x, i) => <React.Fragment key={i}>{i ? ' + ' : ''}{x === '內嵌' ? '內嵌欄位' : <code>{x}</code>}</React.Fragment>)}</div> : null}
        {e.props.map(([n, f, via]) => <Field key={n} name={n} f={f} req={e.required.has(n)} path={path} depth={depth} chain={e.chain} via={e.allOf && e.allOf.length > 1 ? (via === '內嵌' ? null : via) : null}></Field>)}
      </>;
    }
    return null;
  }

  const rootExp = focus.length ? oaChildren(spec, base.schema, base.chain) : oaChildren(spec, schema, []);
  const rootRef = !focus.length && schema && (schema.$ref || (schema.items && schema.items.$ref));
  return <div className={`oa-tree${flat ? ' flat' : ''}`}>
    {focus.length ? <div className="oa-tree-crumb">
      <button type="button" className="oa-tree-back" onClick={() => setFocus(focus.slice(0, -1))} title="回上層"><OaIcon n="back" s={12}></OaIcon></button>
      <button type="button" onClick={() => setFocus([])}>{rootLabel}</button>
      {focus.map((x, i) => <React.Fragment key={i}><OaIcon n="right" s={11}></OaIcon>{i === focus.length - 1 ? <b>{x.label}</b> : <button type="button" onClick={() => setFocus(focus.slice(0, i + 1))}>{x.label}</button>}</React.Fragment>)}
    </div> : rootRef || oaType(schema) === 'array' ? <div className="oa-tree-root">
      {oaType(schema) === 'array' ? <span>陣列，每個元素為</span> : <span>型別</span>}<OaTypeLabel f={oaType(schema) === 'array' ? (schema.items || {}) : schema} go={go}></OaTypeLabel>
      {rootRef ? <span className="oa-tree-root-n">{oaKidCount(rootExp)} 個欄位</span> : null}
    </div> : null}
    {rootExp ? renderExp(rootExp, focus.length ? base.path : '', 0) : <div className="oa-tree-prim">
      <OaTypeLabel f={schema} go={go}></OaTypeLabel>{schema && schema.format ? <span className="oa-f-fmt">{schema.format}</span> : null}
      {schema && schema.description ? <span className="oa-f-desc"><ErInline text={schema.description}></ErInline></span> : null}
    </div>}
  </div>;
}

Object.assign(window, { OaSchemaTree, OaTypeLabel, oaConstraints, OaEnum, oaExpand, oaChildren, oaKidCount });
})();
