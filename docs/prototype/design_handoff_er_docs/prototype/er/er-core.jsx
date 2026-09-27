(() => {
const { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } = React;
// 共用：圖示、資料推導、Markdown、欄位徽章

const ER_ICON_PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  info: 'M12 16v-4M12 8h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  down: 'm6 9 6 6 6-6',
  up: 'm18 15-6-6-6 6',
  right: 'm9 18 6-6-6-6',
  table: 'M3 5h18v14H3zM3 10h18M9 10v9',
  db: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  diagram: 'M3 3h7v7H3zM14 14h7v7h-7zM10 6.5h4a2 2 0 0 1 2 2V14',
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  back: 'M19 12H5M12 19l-7-7 7-7',
  expand: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  arrowR: 'M5 12h14M13 5l7 7-7 7',
  arrowL: 'M19 12H5M11 19l-7-7 7-7',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  key: 'M15.5 7.5 19 4M21 2l-2 2M15.5 7.5a4.5 4.5 0 1 1-6.4 6.4 4.5 4.5 0 0 1 6.4-6.4zM17 6l3 3',
  panel: 'M3 3h18v18H3zM9 3v18',
};
function ErIcon({ n, s = 14, style }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', ...style }}><path d={ER_ICON_PATHS[n]}></path></svg>;
}

/* 資料推導：edges 一律由 fk 推，不存 */
function erDerive(data) {
  const byName = new Map(data.tables.map((t) => [t.name, t]));
  const groupByKey = new Map(data.groups.map((g) => [g.key, g]));
  const schemas = data.schemas && data.schemas.length ? data.schemas : [{ key: '_all', label: '全部' }];
  const schemaOfGroup = (g) => groupByKey.get(g)?.schema ?? schemas[0].key;
  const schemaOfTable = (t) => schemaOfGroup(byName.get(t)?.group);
  const edges = data.tables.flatMap((t) => t.columns.filter((c) => c.fk && byName.has(c.fk)).map((c) => ({
    id: `${t.name}.${c.name}`, child: t.name, parent: c.fk, col: c.name, self: c.fk === t.name,
  })));
  const parentsOf = (n) => edges.filter((e) => e.child === n && !e.self);
  const childrenOf = (n) => edges.filter((e) => e.parent === n && !e.self);
  /* 導覽樹順序依 layout.columns → groups，與圖上位置一致 */
  const groupOrder = data.layout.columns.flatMap((c) => c.groups);
  data.groups.forEach((g) => { if (!groupOrder.includes(g.key)) groupOrder.push(g.key); });
  const tree = schemas.map((s) => ({
    ...s,
    groups: groupOrder.map((k) => groupByKey.get(k)).filter((g) => g && schemaOfGroup(g.key) === s.key)
      .map((g) => ({ ...g, tables: data.tables.filter((t) => t.group === g.key) })),
  }));
  return { byName, groupByKey, schemas, schemaOfGroup, schemaOfTable, edges, parentsOf, childrenOf, tree };
}

/* 迷你 Markdown：## / ### / 清單 / 引言 / **粗** / `碼` / [文](#table:x)。
   反引號內容若恰為表名，自動連到該表的 Wiki。 */
function ErInline({ text, onLink, tables }) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) parts.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) {
      const v = t.slice(1, -1);
      if (tables && tables.has(v) && onLink) parts.push(<a key={i++} className="erx-tlink" href={`#table:${v}`} onClick={(e) => { e.preventDefault(); onLink({ kind: 'table', key: v }); }}><code>{v}</code></a>);
      else if (tables && tables.schemas?.has(v) && onLink) parts.push(<a key={i++} className="erx-tlink" href={`#schema:${v}`} onClick={(e) => { e.preventDefault(); onLink({ kind: 'schema', key: v }); }}><code>{v}</code></a>);
      else parts.push(<code key={i++}>{v}</code>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t);
      parts.push(<a key={i++} href={mm[2]}>{mm[1]}</a>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
function ErMarkdown({ src, onLink, tables }) {
  if (!src) return null;
  const blocks = [];
  const lines = src.split('\n');
  let i = 0, k = 0;
  const inl = (t) => <ErInline text={t} onLink={onLink} tables={tables}></ErInline>;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^###\s/.test(l)) { blocks.push(<h4 key={k++}>{inl(l.slice(4))}</h4>); i++; continue; }
    if (/^##\s/.test(l)) { blocks.push(<h3 key={k++}>{inl(l.slice(3))}</h3>); i++; continue; }
    if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); blocks.push(<blockquote key={k++}>{inl(q.join(' '))}</blockquote>); continue; }
    if (/^(-|\d+\.)\s/.test(l)) {
      const ordered = /^\d+\./.test(l); const items = [];
      while (i < lines.length && /^(-|\d+\.)\s/.test(lines[i])) items.push(lines[i++].replace(/^(-|\d+\.)\s/, ''));
      const L = ordered ? 'ol' : 'ul';
      blocks.push(<L key={k++}>{items.map((t, j) => <li key={j}>{inl(t)}</li>)}</L>); continue;
    }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(#|>|-\s|\d+\.\s)/.test(lines[i])) p.push(lines[i++]);
    blocks.push(<p key={k++}>{inl(p.join(' '))}</p>);
  }
  return <div className="erx-md">{blocks}</div>;
}

function ErFlagBadges({ data, col }) {
  const der = col.derivation ? data.derivations.find((d) => d.key === col.derivation) : null;
  return <span className="erx-keys">
    {data.flags.map((f) => col[f.key] ? <b key={f.key} className={`erx-k erx-k--${f.tone ?? 'neutral'}`} title={f.label}>{f.badge}</b> : null)}
    {der ? <b className="erx-k erx-k--warning" title={der.label}>{der.badge}</b> : null}
  </span>;
}
function ErDot({ data, req }) {
  const r = data.requirement.find((x) => x.key === req);
  return <i className={`erx-dot erx-dot--${r?.marker ?? 'hollow'}`} title={r?.title ?? r?.label ?? req}></i>;
}

Object.assign(window, { ErIcon, erDerive, ErMarkdown, ErInline, ErFlagBadges, ErDot });

})();
