const { useState: useCalState, useEffect: useCalEffect } = React;
const CAL_WD = ["日", "一", "二", "三", "四", "五", "六"];
const calIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const calAdd = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const CAL_MAX = 3;

function CalNote({ r, onSel, onOpen }) {
  const st = window.DV_RS.find((s) => s.k === window.readingStatus(r.slug)) || window.DV_RS[3];
  const extra = r.tags.length - 2;
  return (
    <button className="cal-note" onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)} title={`${r.title}・${st.l}`}>
      <span className="cal-note-st"><i style={{ background: st.bg }} />{st.l}</span>
      <span className="cal-note-t">{r.title}</span>
      {r.series ? <span className="cal-note-sr"><Ic n="bookOpen" s={11} />{r.series.title}</span> : null}
      {(r.tags.length || r.markers.length) ? (
        <span className="cal-note-meta">
          {r.tags.slice(0, 2).map((t) => <span key={t} className="dv-tag">{t}</span>)}
          {extra > 0 ? <span className="dv-tag more">+{extra}</span> : null}
          {r.markers.length ? <span className={"dv-ai" + (r.ai[1] ? " warn" : "")}><Ic n="sparkle" s={11} />{r.ai[0]}/{r.markers.length}</span> : null}
        </span>
      ) : null}
    </button>
  );
}

function CalDot({ r, onSel, onOpen }) {
  const st = window.DV_RS.find((s) => s.k === window.readingStatus(r.slug)) || window.DV_RS[3];
  return <button className="cal-dot" style={{ background: st.bg }} onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)} title={`${r.title}${r.series ? "・" + r.series.title : ""}・${st.l}`} aria-label={`${r.title}（${st.l}）`} />;
}

function PtCalendar({ onSel, onOpen }) {
  const [, force] = useCalState(0);
  useCalEffect(() => (window.ncSubscribe ? window.ncSubscribe(() => force((x) => x + 1)) : undefined), []);
  const rows = window.ptRows();
  const latest = new Date(rows.reduce((a, r) => (r.updated > a ? r.updated : a), rows[0].updated) + "T00:00:00");
  const today = calIso(latest);
  const [view, setView] = useCalState("月");
  const [anchor, setAnchor] = useCalState(latest);
  const [open, setOpen] = useCalState({});
  const byDay = {};
  rows.forEach((r) => { (byDay[r.updated] = byDay[r.updated] || []).push(r); });

  let days, title;
  if (view === "月") {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = calAdd(first, -first.getDay());
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const n = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
    days = Array.from({ length: n }, (_, i) => calAdd(start, i));
    title = `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`;
  } else {
    const start = calAdd(anchor, -anchor.getDay());
    days = Array.from({ length: 7 }, (_, i) => calAdd(start, i));
    const e = days[6];
    title = `${start.getFullYear()} 年 ${start.getMonth() + 1}/${start.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
  }
  const go = (d) => {
    setOpen({});
    if (view === "月") setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + d, 1));
    else setAnchor(calAdd(anchor, 7 * d));
  };
  const inRange = days.flatMap((d) => (view === "月" && d.getMonth() !== anchor.getMonth() ? [] : byDay[calIso(d)] || []));
  const cnt = window.DV_RS.map((s) => ({ ...s, v: inRange.filter((r) => window.readingStatus(r.slug) === s.k).length }));
  const wkStart = calIso(calAdd(latest, -latest.getDay())), wkEnd = calIso(calAdd(latest, 6 - latest.getDay()));

  return (
    <div className="wb-body cal-body">
      <div className="cal-bar">
        <div className="cal-nav">
          <button onClick={() => go(-1)} aria-label="上一頁"><Ic n="chevronLeft" s={16} /></button>
          <button onClick={() => go(1)} aria-label="下一頁"><Ic n="chevronRight" s={16} /></button>
          <button className="cal-today" onClick={() => { setAnchor(latest); setOpen({}); }}>本週</button>
        </div>
        <h2 className="cal-title tnum">{title}<span>共更新 {inRange.length} 篇</span></h2>
        <div className="cal-right">
          <div className="dv-legend">{cnt.map((s) => <span key={s.k}><i style={{ background: s.bg }} />{s.l}<b className="tnum">{s.v}</b></span>)}</div>
          <div className="dv-seg">{["週", "月"].map((o) => <button key={o} className={o === view ? "on" : ""} onClick={() => { setView(o); setOpen({}); }}>{o}</button>)}</div>
        </div>
      </div>
      <div className={"cal-grid " + (view === "週" ? "wk" : "mo")} style={view === "月" ? { gridTemplateRows: `auto repeat(${days.length / 7}, minmax(0,1fr))` } : undefined}>
        {CAL_WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        {days.map((d) => {
          const s = calIso(d), list = byDay[s] || [];
          const out = view === "月" && d.getMonth() !== anchor.getMonth();
          const label = d.getDate() === 1 || (view === "週" && d === days[0]) ? `${d.getMonth() + 1}/${d.getDate()}` : d.getDate();
          return (
            <div key={s} className={"cal-cell" + (out ? " out" : "") + (s === today ? " today" : "") + (s >= wkStart && s <= wkEnd ? " thiswk" : "")}>
              <div className="cal-cell-h"><b className="tnum">{label}</b>{list.length ? <span className="tnum">{list.length} 篇</span> : null}</div>
              <div className="cal-cell-b">
                {view === "月" ? list.map((r) => <CalDot key={r.slug} r={r} onSel={onSel} onOpen={onOpen} />) : list.map((r) => <CalNote key={r.slug} r={r} onSel={onSel} onOpen={onOpen} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
Object.assign(window, { PtCalendar });
