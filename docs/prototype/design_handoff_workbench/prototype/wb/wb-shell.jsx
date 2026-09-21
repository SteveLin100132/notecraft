const WB_ICONS = {
  home: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  sparkle: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8zM18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z",
  gear: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5a7.6 7.6 0 0 0 0-3l1.8-1.3-1.9-3.3-2.1.9a7.6 7.6 0 0 0-2.6-1.5L14.2 3H9.8l-.4 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.1-.9L2.8 9.2l1.8 1.3a7.6 7.6 0 0 0 0 3L2.8 14.8l1.9 3.3 2.1-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.3h4.4l.4-2.3a7.6 7.6 0 0 0 2.6-1.5l2.1.9 1.9-3.3z",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
  folder: "M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.2h7A1.5 1.5 0 0 1 19 9.7v8.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 18z",
  chev: "M9 6l6 6-6 6",
  layers: "M12 3.5 20 8l-8 4.5L4 8zM4 12.5 12 17l8-4.5M4 16.5 12 21l8-4.5",
  doc: "M6 3h7l5 5v13H6zM13 3v5h5",
  plus: "M12 5v14M5 12h14",
  filter: "M4 6h16l-6 7v6l-4-2v-4z",
  slide: "M3 5h18v11H3zM9 21l3-5 3 5",
  close: "M6 6l12 12M18 6 6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3.5 2",
  tag: "M4 12.5V5a1 1 0 0 1 1-1h7.5l7 7-8.5 8.5z",
};
function Ic({ n, s = 16, c = "currentColor", sw = 1.7, style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={WB_ICONS[n]} />
    </svg>
  );
}

function WbRail({ active = "home" }) {
  const items = [["home", "首頁"], ["search", "搜尋"], ["sparkle", "AI 標記"], ["gear", "設定"]];
  return (
    <div className="wb-rail">
      <div className="wb-rail-mark">N</div>
      <div className="wb-rail-group">
        {items.map(([k, label]) => (
          <div key={k} className={"wb-rail-btn" + (k === active ? " on" : "")} title={label}>
            <Ic n={k} s={17} />
            {k === "sparkle" ? <span className="wb-rail-dot" /> : null}
          </div>
        ))}
      </div>
      <div className="wb-rail-btn" title="深淺色切換"><Ic n="moon" s={17} /></div>
    </div>
  );
}

function WbTree({ activeFolder }) {
  const rows = [];
  WB_FOLDERS.forEach((f) => {
    rows.push(f);
    if (f.open && f.children) f.children.forEach((c) => rows.push(c));
  });
  return rows.map((f) => (
    <div key={f.id} className={"wb-sb-item" + (f.id === activeFolder ? " on" : "")} style={{ paddingLeft: 10 + f.depth * 14 }}>
      {f.depth === 0 && f.children ? <Ic n="chev" s={11} sw={2.2} style={{ transform: "rotate(90deg)", opacity: 0.55, flex: "0 0 11px" }} /> : <span style={{ width: 11, flex: "0 0 11px" }} />}
      <Ic n="folder" s={14} c="var(--wb-ink-3)" />
      <span className="wb-sb-label">{f.name}</span>
      <span className="wb-badge-n">{f.count}</span>
    </div>
  ));
}

function WbSidebar({ activeFolder, activeSeries }) {
  return (
    <div className="wb-sb">
      <div className="wb-sb-ws">
        <div className="wb-sb-ws-mark">NC</div>
        <div style={{ minWidth: 0 }}>
          <div className="wb-sb-ws-name">NoteCraft</div>
          <div className="wb-sb-ws-path">~/notes/src/content</div>
        </div>
      </div>
      <div className="wb-sb-scroll">
        <div className="wb-sb-sec">資料夾</div>
        <WbTree activeFolder={activeFolder} />
        <div className="wb-sb-sec" style={{ marginTop: 10 }}>系列</div>
        {WB_SERIES.map((s) => (
          <div key={s.id} className={"wb-sb-item" + (s.id === activeSeries ? " on" : "")} style={{ paddingLeft: 10 }}>
            <span className="wb-sb-swatch" style={{ background: s.color }} />
            <span className="wb-sb-label">{s.name}</span>
            <span className="wb-sb-prog"><i style={{ width: (s.done / s.total) * 100 + "%" }} /></span>
            <span className="wb-badge-n tnum">{s.done}/{s.total}</span>
          </div>
        ))}
      </div>
      <div className="wb-sb-foot">
        <div className="wb-sb-foot-h"><Ic n="sparkle" s={13} c="var(--wb-warn)" /> 待生成標記</div>
        <div className="wb-sb-foot-b"><b className="tnum">11</b> 個 @ai-visualize 標記待生成，分布於 8 篇筆記。</div>
        <div className="wb-sb-foot-a">查看佇列</div>
      </div>
    </div>
  );
}

function WbHeader({ crumbs, title, badges, tabs, activeTab }) {
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  return (
    <div className="wb-hd">
      <div className="wb-hd-top">
        <div style={{ minWidth: 0 }}>
          <div className="wb-crumb">{crumbs.join("  /  ")}</div>
          <div className="wb-hd-title-row">
            <h1 className="wb-hd-title">{title}</h1>
            {badges.map((b) => <span key={b[0]} className={"wb-pill " + b[1]}>{b[0]}</span>)}
          </div>
        </div>
        <div className="wb-hd-actions">
          <button className="wb-btn-ghost"><Ic n="slide" s={14} /> 轉簡報</button>
          <Button size="sm" iconLeft={<Ic n="plus" s={14} c="#fff" sw={2.2} />} style={{ height: 30, padding: "0 14px", fontSize: 13, fontWeight: 700, border: "none" }}>新增筆記</Button>
        </div>
      </div>
      {tabs ? (
        <div className="wb-tabs">
          {tabs.map((t) => <div key={t} className={"wb-tab" + (t === activeTab ? " on" : "")}>{t}</div>)}
        </div>
      ) : null}
    </div>
  );
}

function WbToolbar({ count }) {
  return (
    <div className="wb-tb">
      <div className="wb-tb-group">
        <span className="wb-tb-lbl">分組</span>
        {["資料夾", "系列", "標籤", "月份"].map((g) => (
          <span key={g} className={"wb-seg" + (g === "資料夾" ? " on" : "")}>{g}</span>
        ))}
      </div>
      <span className="wb-tb-div" />
      <div className="wb-tb-group">
        <span className="wb-chip on"><Ic n="filter" s={12} /> 含 AI 標記</span>
        <span className="wb-chip">待生成 <b className="tnum">11</b></span>
        <span className="wb-chip">無 frontmatter <b className="tnum">3</b></span>
      </div>
      <div className="wb-tb-right">
        <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /> 搜尋標題、路徑、標籤…</span>
        <span className="wb-count tnum">{count} 篇</span>
      </div>
    </div>
  );
}
Object.assign(window, { Ic, WbRail, WbSidebar, WbHeader, WbToolbar, WbTree });
