const PT_ICONS = {
  home: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  sparkle: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8zM18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z",
  plug: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5zM12 16v5",
  gear: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5a7.6 7.6 0 0 0 0-3l1.8-1.3-1.9-3.3-2.1.9a7.6 7.6 0 0 0-2.6-1.5L14.2 3H9.8l-.4 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.1-.9L2.8 9.2l1.8 1.3a7.6 7.6 0 0 0 0 3L2.8 14.8l1.9 3.3 2.1-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.3h4.4l.4-2.3a7.6 7.6 0 0 0 2.6-1.5l2.1.9 1.9-3.3z",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  folder: "M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.2h7A1.5 1.5 0 0 1 19 9.7v8.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 18z",
  chev: "M9 6l6 6-6 6",
  layers: "M12 3.5 20 8l-8 4.5L4 8zM4 12.5 12 17l8-4.5M4 16.5 12 21l8-4.5",
  doc: "M6 3h7l5 5v13H6zM13 3v5h5",
  plus: "M12 5v14M5 12h14",
  filter: "M4 6h16l-6 7v6l-4-2v-4z",
  slide: "M3 5h18v11H3zM9 21l3-5 3 5",
  close: "M6 6l12 12M18 6 6 18",
  tag: "M4 12.5V5a1 1 0 0 1 1-1h7.5l7 7-8.5 8.5z",
  back: "M19 12H5M11 6l-6 6 6 6",
};
function Ic({ n, s = 16, c = "currentColor", sw = 1.7, style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {PT_ICONS[n].split("M").filter(Boolean).map((d, i) => <path key={i} d={"M" + d} />)}
    </svg>
  );
}

function useNarrow(bp = 860) {
  const q = "(max-width:" + bp + "px)";
  const [n, setN] = React.useState(() => (window.matchMedia ? window.matchMedia(q).matches : false));
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(q);
    const fn = (e) => setN(e.matches);
    m.addEventListener ? m.addEventListener("change", fn) : m.addListener(fn);
    setN(m.matches);
    return () => { m.removeEventListener ? m.removeEventListener("change", fn) : m.removeListener(fn); };
  }, [q]);
  return n;
}

function NcLogo({ s = 28, r = 10 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx={r} fill="var(--wb-blue)" />
      <path d="M14 30h20M14 36h13" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24 11c1 5.6 2.6 7.2 8.2 8.2-5.6 1-7.2 2.6-8.2 8.2-1-5.6-2.6-7.2-8.2-8.2 5.6-1 7.2-2.6 8.2-8.2z" fill="var(--wb-gold)" />
    </svg>
  );
}

function PtRail({ route, onRoute, onSearch, pending }) {
  const items = [
    ["dashboard", "home", "儀表板"],
    ["__search", "search", "搜尋（⌘K）"],
    ["ai", "sparkle", "AI 標記佇列"],
    ["plugins", "plug", "Plugin 外掛"],
    ["about", "gear", "設定與關於"],
  ];
  return (
    <div className="wb-rail">
      <div className="wb-rail-mark"><NcLogo s={28} r={9} /></div>
      <div className="wb-rail-group">
        {items.map(([id, ic, label]) => (
          <button key={id} className={"wb-rail-btn" + (route === id ? " on" : "")} title={label}
            onClick={() => (id === "__search" ? onSearch() : onRoute(id))}>
            <Ic n={ic} s={17} />
            {id === "ai" && pending > 0 ? <span className="wb-rail-dot" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function PtSidebar({ route, openSeriesId, folders, series, filter, onFolder, onSeries, onRoute, onDataFolder, pending, open: openM, onClose }) {
  const [open, setOpen] = React.useState({ "01-前端": true });
  const dataFolders = window.ptDataFolders();
  return (
    <>
    {openM ? <button className="wb-sb-scrim" onClick={onClose} aria-label="關閉側欄" /> : null}
    <div className={"wb-sb" + (openM ? " open" : "")}>
      <button className="wb-sb-ws" style={{ border: "none", background: "none", width: "100%", cursor: "pointer" }} onClick={() => onRoute("dashboard")}>
        <span className="wb-sb-ws-mark"><NcLogo s={30} r={9} /></span>
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div className="wb-sb-ws-name">NoteCraft 工作台</div>
          <div className="wb-sb-ws-path">~/notes/src/content/notes</div>
        </div>
      </button>
      <div className="wb-sb-scroll">
        <div className="wb-sb-sec">資料夾</div>
        <button className={"wb-sb-item" + (route === "notes" && !filter ? " on" : "")} style={{ paddingLeft: 10 }} onClick={() => onFolder(null)}>
          <span style={{ width: 11 }} /><Ic n="layers" s={14} c="var(--wb-ink-3)" />
          <span className="wb-sb-label">全部筆記</span>
          <span className="wb-badge-n">{window.NOTES.length}</span>
        </button>
        {folders.map((f) => (
          <React.Fragment key={f.name}>
            <button className={"wb-sb-item" + (filter && filter.type === "folder" && filter.value === f.name ? " on" : "")} style={{ paddingLeft: 10 }} onClick={() => onFolder(f.name)}>
              {f.subs.length ? (
                <span className={"wb-sb-caret" + (open[f.name] ? " open" : "")} onClick={(e) => { e.stopPropagation(); setOpen({ ...open, [f.name]: !open[f.name] }); }}>
                  <Ic n="chev" s={11} sw={2.2} />
                </span>
              ) : <span style={{ width: 11, flex: "0 0 11px" }} />}
              <Ic n="folder" s={14} c={f.color} />
              <span className="wb-sb-label">{f.name}</span>
              <span className="wb-badge-n">{f.count}</span>
            </button>
            {f.subs.length && open[f.name] ? f.subs.map((s) => (
              <button key={s.name} className={"wb-sb-item" + (filter && filter.type === "sub" && filter.value === s.name ? " on" : "")} style={{ paddingLeft: 24 }} onClick={() => onFolder(f.name, s.name)}>
                <span style={{ width: 11, flex: "0 0 11px" }} /><Ic n="folder" s={13} c="var(--wb-ink-3)" />
                <span className="wb-sb-label" style={{ fontSize: 12.5 }}>{s.name}</span>
                <span className="wb-badge-n">{s.count}</span>
              </button>
            )) : null}
          </React.Fragment>
        ))}
        <div className="wb-sb-sec" style={{ marginTop: 8 }}>系列<button className="wb-sb-foot-a" style={{ padding: 0, fontSize: 11 }} onClick={() => onRoute("series")}>全部</button></div>
        {series.map((s) => (
          <button key={s.id} className={"wb-sb-item" + ((route === "series-detail" && openSeriesId === s.id) || (filter && filter.type === "series" && filter.value === s.id) ? " on" : "")} style={{ paddingLeft: 10 }} onClick={() => onSeries(s.id)}>
            <span style={{ width: 11, flex: "0 0 11px" }} />
            <span className="wb-sb-swatch" style={{ background: s.color }} />
            <span className="wb-sb-label">{s.name}</span>
            <span className="wb-sb-prog"><i style={{ width: s.pct + "%" }} /></span>
            <span className="wb-badge-n tnum">{s.done}/{s.total}</span>
          </button>
        ))}
        <div className="wb-sb-sec" style={{ marginTop: 8 }}>Plugin 資料檔</div>
        <button className={"wb-sb-item" + (route === "plugins" && !filter ? " on" : "")} style={{ paddingLeft: 10 }} onClick={() => onRoute("plugins")}>
          <span style={{ width: 11, flex: "0 0 11px" }} /><Ic n="layers" s={14} c="var(--wb-ink-3)" />
          <span className="wb-sb-label">全部資料檔</span>
          <span className="wb-badge-n">{(window.DATAFILES || []).length}</span>
        </button>
        {dataFolders.map((d) => (
          <button key={d.name} className={"wb-sb-item" + (filter && filter.type === "datafolder" && filter.value === d.name ? " on" : "")} style={{ paddingLeft: 10 }} onClick={() => onDataFolder(d.name)}>
            <span style={{ width: 11, flex: "0 0 11px" }} />
            <Ic n="folder" s={14} c="var(--wb-gold)" />
            <span className="wb-sb-label">{d.name}</span>
            <span className="wb-badge-n">{d.files.length}</span>
          </button>
        ))}
        <div className="wb-sb-sec" style={{ marginTop: 8 }}>其他</div>
        <button className={"wb-sb-item" + (route === "tags" ? " on" : "")} style={{ paddingLeft: 10 }} onClick={() => onRoute("tags")}>
          <span style={{ width: 11, flex: "0 0 11px" }} /><Ic n="tag" s={14} c="var(--wb-ink-3)" />
          <span className="wb-sb-label">標籤</span>
          <span className="wb-badge-n">{window.tagStats().length}</span>
        </button>
      </div>
      <div className="wb-sb-foot">
        <div className="wb-sb-foot-h"><Ic n="sparkle" s={13} c="var(--wb-warn)" /> 待生成標記</div>
        <div className="wb-sb-foot-b"><b className="tnum">{pending.count}</b> 個 @ai-visualize 標記待生成，分布於 {pending.rows.length} 篇筆記。</div>
        <button className="wb-sb-foot-a" onClick={() => onRoute("ai")}>查看佇列 →</button>
      </div>
    </div>
    </>
  );
}

function PtHeader({ crumbs, title, badges = [], tabs, activeTab, onTab, actions, onBack }) {
  return (
    <div className="wb-hd">
      <div className="wb-hd-top">
        <div style={{ minWidth: 0 }}>
          <div className="wb-crumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i ? "  /  " : null}
                {typeof c === "string" ? <span>{c}</span> : <button onClick={c[1]}>{c[0]}</button>}
              </React.Fragment>
            ))}
          </div>
          <div className="wb-hd-title-row">
            {onBack ? <button className="wb-dw-x" onClick={onBack} title="返回"><Ic n="back" s={15} /></button> : null}
            <h1 className="wb-hd-title">{title}</h1>
            {badges.map((b, i) => <span key={i} className={"wb-pill " + (b[1] || "")}>{b[0]}</span>)}
          </div>
        </div>
        <div className="wb-hd-actions">{actions}</div>
      </div>
      {tabs && tabs.length > 1 ? (
        <div className="wb-tabs">
          {tabs.map((t) => <button key={t} className={"wb-tab" + (t === activeTab ? " on" : "")} onClick={() => onTab(t)}>{t}</button>)}
        </div>
      ) : null}
    </div>
  );
}

const PT_GROUPS = [["folder", "資料夾"], ["series", "系列"], ["tag", "標籤"], ["month", "月份"]];
function PtToolbar({ groupBy, onGroupBy, flt, onFlt, q, onQ, count, pending, nofm, showGroup = true }) {
  return (
    <div className="wb-tb">
      {showGroup ? (
        <>
          <div className="wb-tb-group">
            <span className="wb-tb-lbl">分組</span>
            {PT_GROUPS.map(([k, label]) => (
              <button key={k} className={"wb-seg" + (groupBy === k ? " on" : "")} onClick={() => onGroupBy(k)}>{label}</button>
            ))}
          </div>
          <span className="wb-tb-div" />
        </>
      ) : null}
      <div className="wb-tb-group">
        <button className={"wb-chip" + (flt.hasAi ? " on" : "")} onClick={() => onFlt({ ...flt, hasAi: !flt.hasAi })}><Ic n="filter" s={12} /> 含 AI 標記</button>
        <button className={"wb-chip" + (flt.pending ? " on" : "")} onClick={() => onFlt({ ...flt, pending: !flt.pending })}>待生成 <b className="tnum">{pending}</b></button>
        <button className={"wb-chip" + (flt.nofm ? " on" : "")} onClick={() => onFlt({ ...flt, nofm: !flt.nofm })}>無 frontmatter <b className="tnum">{nofm}</b></button>
      </div>
      <div className="wb-tb-right">
        <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => onQ(e.target.value)} placeholder="搜尋標題、路徑、標籤…" /></span>
        <span className="wb-count tnum">{count} 篇</span>
      </div>
    </div>
  );
}
Object.assign(window, { useNarrow, NcLogo, Ic, PtRail, PtSidebar, PtHeader, PtToolbar, PT_GROUPS });
