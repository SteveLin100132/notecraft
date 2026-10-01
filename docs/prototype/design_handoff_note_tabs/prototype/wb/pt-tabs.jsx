// 筆記頁籤：持久化在 localStorage 的「已開啟清單」。MPA 下每次換頁重畫；切回時還原捲動位置。
const NT_KEY = "nc.tabs.v1";
const NT_MAX = 20;
const NT_PATHS = { pin: "M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3z", more: "M5 12h.01M12 12h.01M19 12h.01", down: "M6 9l6 6 6-6", link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.6 6.7M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4", ext: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5", undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" };
function NtIc({ n, s = 14, c = "currentColor", sw = 1.7 }) {
  const d = NT_PATHS[n];
  if (!d) return <Ic n={n} s={s} c={c} sw={sw} />;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.split("M").filter(Boolean).map((p, i) => <path key={i} d={"M" + p} />)}</svg>;
}

function ntResolve(t) {
  if (t.kind === "note") {
    const n = window.noteBySlug(t.id);
    if (!n) return null;
    const r = window.ptRow(n);
    return { ...t, title: n.title, path: r.path, data: false, pending: r.ai[1], read: window.readingStatus ? window.readingStatus(n.slug) : null };
  }
  const f = (window.DATAFILES || []).find((x) => x.id === t.id);
  if (!f) return null;
  return { ...t, title: f.title, path: f.path, data: true, pending: 0, read: null };
}
function ntSeed(demo) {
  const notes = window.ptRows().filter((r) => !r.nofm).map((r) => r.slug);
  const files = (window.DATAFILES || []).map((f) => f.id);
  const mk = (kind, id, pinned) => ({ kind, id, key: kind + ":" + id, pinned: !!pinned, scroll: 0, at: Date.now() });
  if (demo === "empty") return { tabs: [], closed: [] };
  if (demo === "overflow") {
    const all = window.ptRows().map((r) => r.slug);
    const list = [mk("note", all[0], true)];
    all.slice(1, 13).forEach((s) => list.push(mk("note", s)));
    files.forEach((f) => { if (list.length < 15) list.push(mk("view", f)); });
    return { tabs: list.slice(0, 15), closed: [] };
  }
  return { tabs: [mk("note", notes[0], true), mk("note", notes[1]), mk("note", notes[2]), files[0] ? mk("view", files[0]) : mk("note", notes[3])], closed: [] };
}
function ntLoad() { try { const v = JSON.parse(localStorage.getItem(NT_KEY)); if (v && Array.isArray(v.tabs)) return v; } catch (e) {} return { tabs: [], closed: [] }; }
const ntSort = (tabs) => tabs.filter((t) => t.pinned).concat(tabs.filter((t) => !t.pinned));

function usePtTabs(demo) {
  const [st, setSt] = React.useState(() => (demo ? ntSeed(demo) : ntLoad()));
  React.useEffect(() => { if (!demo) try { localStorage.setItem(NT_KEY, JSON.stringify(st)); } catch (e) {} }, [st, demo]);
  const resolved = st.tabs.map(ntResolve);
  const tabs = resolved.filter(Boolean);
  const stale = st.tabs.filter((t, i) => !resolved[i]);
  React.useEffect(() => {
    if (!stale.length) return;
    setSt((s) => ({ ...s, tabs: s.tabs.filter((t) => ntResolve(t)) }));
    window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: stale.length === 1 ? "筆記已不存在，對應頁籤已關閉" : `${stale.length} 篇筆記已不存在，對應頁籤已關閉`, icon: "close" } }));
  }, [stale.length]);
  const api = {
    tabs, closed: st.closed,
    ensure(kind, id, activeKey) {
      const key = kind + ":" + id;
      let evicted = null;
      setSt((s) => {
        if (s.tabs.some((t) => t.key === key)) return { ...s, tabs: s.tabs.map((t) => (t.key === key ? { ...t, at: Date.now() } : t)) };
        const nt = { kind, id, key, pinned: false, scroll: 0, at: Date.now() };
        let list = s.tabs.slice();
        const ai = list.findIndex((t) => t.key === activeKey);
        list.splice(ai >= 0 ? ai + 1 : list.length, 0, nt);
        list = ntSort(list);
        let closed = s.closed;
        if (list.filter((t) => !t.pinned).length > NT_MAX) {
          const lru = list.filter((t) => !t.pinned && t.key !== key).sort((a, b) => a.at - b.at)[0];
          if (lru) { evicted = lru; list = list.filter((t) => t !== lru); closed = [lru].concat(closed).slice(0, 10); }
        }
        return { tabs: list, closed };
      });
      if (evicted) setTimeout(() => { const r = ntResolve(evicted); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: `已達 ${NT_MAX} 個頁籤上限，關閉最久未用的「${r ? r.title : evicted.id}」`, icon: "close" } })); }, 0);
    },
    close(keys) {
      const ks = [].concat(keys);
      setSt((s) => ({ tabs: s.tabs.filter((t) => !ks.includes(t.key)), closed: s.tabs.filter((t) => ks.includes(t.key)).reverse().concat(s.closed).slice(0, 10) }));
    },
    pin(key) { setSt((s) => ({ ...s, tabs: ntSort(s.tabs.map((t) => (t.key === key ? { ...t, pinned: !t.pinned } : t))) })); },
    move(from, to) {
      setSt((s) => {
        const list = s.tabs.slice(); const a = list.findIndex((t) => t.key === from); const b = list.findIndex((t) => t.key === to);
        if (a < 0 || b < 0 || list[a].pinned !== list[b].pinned) return s;
        const [x] = list.splice(a, 1); list.splice(b, 0, x); return { ...s, tabs: list };
      });
    },
    popClosed() {
      const t = st.closed.find((x) => ntResolve(x) && !st.tabs.some((y) => y.key === x.key));
      if (!t) return null;
      setSt((s) => ({ closed: s.closed.filter((x) => x.key !== t.key), tabs: ntSort(s.tabs.concat([{ ...t, at: Date.now() }])) }));
      return t;
    },
    setScroll(key, y) { setSt((s) => ({ ...s, tabs: s.tabs.map((t) => (t.key === key ? { ...t, scroll: y } : t)) })); },
    scrollOf(key) { const t = st.tabs.find((x) => x.key === key); return t ? t.scroll : 0; },
  };
  return api;
}

function NtTab({ t, active, focusKey, onFocusKey, onActivate, onClose, onMenu, statusMode, drag }) {
  const dot = statusMode === "ai" && t.pending > 0 ? "warn" : (statusMode === "read" && t.read ? (t.read === "done" ? "ok" : t.read === "reading" ? "blue" : "") : null);
  return (
    <div role="tab" aria-selected={active} tabIndex={focusKey === t.key ? 0 : -1} data-key={t.key}
      className={"nt-tab" + (active ? " on" : "") + (t.pinned ? " pinned" : "") + (drag.over === t.key ? " over" : "") + (drag.from === t.key ? " dragging" : "")}
      title={t.title + "\n" + t.path + (t.pending ? `\n待生成 AI 標記 ${t.pending}` : "")}
      draggable={drag.enabled} onDragStart={(e) => drag.start(e, t.key)} onDragOver={(e) => drag.over2(e, t.key)} onDragEnd={drag.end} onDrop={(e) => drag.drop(e, t.key)}
      onClick={() => onActivate(t.key)} onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(t.key); } }}
      onContextMenu={(e) => { e.preventDefault(); onMenu(t.key, e.clientX, e.clientY); }} onFocus={() => onFocusKey(t.key)}>
      <span className="nt-ic"><Ic n="doc" s={13} c={t.data ? "var(--wb-gold)" : (active ? "var(--wb-blue-l)" : "var(--wb-ink-3)")} /></span>
      <span className="nt-t">{t.title}</span>
      {dot !== null && dot !== undefined ? <span className={"nt-dot " + dot} /> : null}
      {t.pinned ? <span className="nt-pin" title="已固定"><NtIc n="pin" s={12} /></span>
        : <button className="nt-x" tabIndex={-1} aria-label={"關閉 " + t.title} onClick={(e) => { e.stopPropagation(); onClose(t.key); }}><Ic n="close" s={12} sw={2} /></button>}
    </div>
  );
}

function PtTabStrip({ tabs, activeKey, onActivate, onClose, onMenu, onAll, statusMode, onMove, allOpen }) {
  const sc = React.useRef(null);
  const [fade, setFade] = React.useState([false, false]);
  const [focusKey, setFocusKey] = React.useState(null);
  const [dg, setDg] = React.useState({ from: null, over: null });
  const fine = React.useMemo(() => (window.matchMedia ? window.matchMedia("(pointer:fine)").matches : true), []);
  const upd = () => { const el = sc.current; if (!el) return; setFade([el.scrollLeft > 2, el.scrollLeft + el.clientWidth < el.scrollWidth - 2]); };
  React.useEffect(() => {
    const el = sc.current; if (!el) return;
    const a = el.querySelector(".nt-tab.on");
    if (a) { const l = a.offsetLeft, r = l + a.offsetWidth; if (l < el.scrollLeft + 24) el.scrollLeft = l - 24; else if (r > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = r - el.clientWidth + 24; }
    upd();
  }, [activeKey, tabs.length]);
  React.useEffect(() => { const fn = () => upd(); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);
  const fk = focusKey && tabs.some((t) => t.key === focusKey) ? focusKey : (activeKey && tabs.some((t) => t.key === activeKey) ? activeKey : (tabs[0] || {}).key);
  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.key === fk); if (i < 0) return;
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(fk); return; }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (!tabs[i].pinned) onClose(fk); return; }
    else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); const r = e.target.getBoundingClientRect(); onMenu(fk, r.left, r.bottom + 2); return; }
    if (n === null) return;
    e.preventDefault(); setFocusKey(tabs[n].key);
    const el = sc.current && sc.current.querySelector(`[data-key="${tabs[n].key}"]`); if (el) el.focus();
  };
  const drag = {
    enabled: fine,
    from: dg.from, over: dg.over,
    start: (e, k) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", k); setDg({ from: k, over: null }); },
    over2: (e, k) => { if (!dg.from) return; e.preventDefault(); if (dg.over !== k) setDg({ ...dg, over: k }); },
    drop: (e, k) => { e.preventDefault(); if (dg.from && dg.from !== k) onMove(dg.from, k); setDg({ from: null, over: null }); },
    end: () => setDg({ from: null, over: null }),
  };
  return (
    <div className="nt-bar">
      {tabs.length ? (
        <div className={"nt-scrollwrap" + (fade[0] ? " fl" : "") + (fade[1] ? " fr" : "")}>
          <div className="nt-scroll" ref={sc} role="tablist" aria-label="已開啟的頁籤" onScroll={upd} onKeyDown={onKey}
            onWheel={(e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && sc.current) sc.current.scrollLeft += e.deltaY; }}>
            {tabs.map((t, i) => (
              <React.Fragment key={t.key}>
                {i > 0 && tabs[i - 1].pinned && !t.pinned ? <span className="nt-sep" aria-hidden="true" /> : null}
                <NtTab t={t} active={t.key === activeKey} focusKey={fk} onFocusKey={setFocusKey} onActivate={onActivate} onClose={onClose} onMenu={onMenu} statusMode={statusMode} drag={drag} />
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="nt-empty"><Ic n="doc" s={13} c="var(--wb-ink-3)" />尚未開啟任何筆記。在列表雙擊一列，或按列上的「開啟」，筆記會在這裡留下頁籤。</div>
      )}
      {tabs.length ? (
        <button className={"nt-all" + (allOpen ? " on" : "")} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onAll(r.right, r.bottom + 4); }} aria-haspopup="menu" aria-expanded={!!allOpen} title="全部頁籤">
          <span className="tnum">{tabs.length}</span><NtIc n="down" s={12} sw={2} />
        </button>
      ) : null}
    </div>
  );
}

function NtPop({ x, y, alignRight, onClose, children, width }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState({ left: x, top: y, op: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const host = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    let l = (alignRight ? x - el.offsetWidth : x) - host.left, t = y - host.top;
    l = Math.max(8, Math.min(l, host.width - el.offsetWidth - 8)); t = Math.max(8, Math.min(t, host.height - el.offsetHeight - 8));
    setPos({ left: l, top: t, op: 1 });
  }, [x, y]);
  React.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true);
  }, []);
  return (
    <>
      <div className="nt-pop-scrim" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div ref={ref} className="nt-pop" role="menu" style={{ left: pos.left, top: pos.top, opacity: pos.op, width }}>{children}</div>
    </>
  );
}
function NtMi({ ic, label, kbd, onClick, disabled, danger }) {
  return <button role="menuitem" className={"nt-mi" + (danger ? " danger" : "")} disabled={disabled} onClick={onClick}><span className="nt-mi-ic">{ic ? <NtIc n={ic} s={13} /> : null}</span><span className="nt-mi-l">{label}</span>{kbd ? <span className="nt-kbd">{kbd}</span> : null}</button>;
}

function PtTabMenu({ menu, tabs, onClose, act }) {
  const i = tabs.findIndex((t) => t.key === menu.key); const t = tabs[i];
  if (!t) return null;
  const right = tabs.slice(i + 1).filter((x) => !x.pinned);
  const others = tabs.filter((x) => x.key !== t.key && !x.pinned);
  const run = (f) => () => { f(); onClose(); };
  return (
    <NtPop x={menu.x} y={menu.y} onClose={onClose} width={232}>
      <div className="nt-pop-h">{t.title}</div>
      <NtMi ic="close" label="關閉" kbd="⌥W" onClick={run(() => act.close([t.key]))} disabled={t.pinned} />
      <NtMi label="關閉其他" onClick={run(() => act.close(others.map((x) => x.key)))} disabled={!others.length} />
      <NtMi label="關閉右側" onClick={run(() => act.close(right.map((x) => x.key)))} disabled={!right.length} />
      <NtMi label="全部關閉" onClick={run(() => act.close(tabs.filter((x) => !x.pinned).map((x) => x.key)))} />
      <div className="nt-pop-sep" />
      <NtMi ic="pin" label={t.pinned ? "取消固定" : "固定頁籤"} onClick={run(() => act.pin(t.key))} />
      <div className="nt-pop-sep" />
      <NtMi ic="link" label="複製連結" onClick={run(() => act.copy(t))} />
      <NtMi ic="ext" label="在新視窗開啟" onClick={run(() => act.newWin(t))} />
    </NtPop>
  );
}

function PtTabAll({ pos, tabs, activeKey, closed, onClose, act }) {
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const list = tabs.filter((t) => !ql || (t.title + t.path).toLowerCase().includes(ql));
  return (
    <NtPop x={pos.x} y={pos.y} alignRight onClose={onClose} width={340}>
      <div className="nt-all-in"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`在 ${tabs.length} 個頁籤中篩選…`} onKeyDown={(e) => { if (e.key === "Enter" && list[0]) { act.activate(list[0].key); onClose(); } }} /></div>
      <div className="nt-all-list">
        {list.map((t, i) => (
          <React.Fragment key={t.key}>
            {i === 0 && t.pinned ? <div className="nt-all-sec">已固定</div> : null}
            {i > 0 && list[i - 1].pinned && !t.pinned ? <div className="nt-all-sec">頁籤</div> : null}
            <div className={"nt-all-row" + (t.key === activeKey ? " on" : "")} role="menuitem" tabIndex={0} onClick={() => { act.activate(t.key); onClose(); }} onKeyDown={(e) => { if (e.key === "Enter") { act.activate(t.key); onClose(); } }}>
              <Ic n="doc" s={13} c={t.data ? "var(--wb-gold)" : "var(--wb-ink-3)"} />
              <span className="nt-all-t">{t.title}</span>
              <span className="nt-all-p">{t.path}</span>
              {t.pinned ? <span className="nt-pin"><NtIc n="pin" s={12} /></span> : <button className="nt-x show" aria-label="關閉" onClick={(e) => { e.stopPropagation(); act.close([t.key]); }}><Ic n="close" s={12} sw={2} /></button>}
            </div>
          </React.Fragment>
        ))}
        {!list.length ? <div className="wb-pal-empty">沒有相符的頁籤</div> : null}
      </div>
      <div className="nt-all-f">
        <button className="wb-mini" disabled={!closed.length} onClick={() => { act.reopen(); onClose(); }}>重開剛關閉的 <span className="nt-kbd">⌥⇧T</span></button>
        <button className="wb-mini danger" onClick={() => { act.close(tabs.filter((x) => !x.pinned).map((x) => x.key)); onClose(); }}>全部關閉</button>
      </div>
    </NtPop>
  );
}

function PtTabCount({ n, onClick, active }) {
  return <button className={"nt-count" + (active ? " on" : "")} onClick={onClick} aria-label={`已開啟 ${n} 個頁籤`}><span className="tnum">{n}</span></button>;
}
function PtTabSheet({ tabs, activeKey, closed, onClose, act }) {
  return (
    <div className="nt-sheet-wrap">
      <button className="nt-sheet-scrim" onClick={onClose} aria-label="關閉" />
      <div className="nt-sheet" role="dialog" aria-label="已開啟的頁籤">
        <div className="nt-sheet-grip" />
        <div className="nt-sheet-h"><b>已開啟的頁籤</b><span className="wb-count tnum">{tabs.length} 個</span><button className="wb-dw-x" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="關閉"><Ic n="close" s={15} /></button></div>
        <div className="nt-sheet-list">
          {!tabs.length ? <div className="wb-empty" style={{ padding: "28px 16px" }}>尚未開啟任何筆記</div> : null}
          {tabs.map((t) => (
            <div key={t.key} className={"nt-sheet-row" + (t.key === activeKey ? " on" : "")} role="button" tabIndex={0} onClick={() => { act.activate(t.key); onClose(); }}>
              <Ic n="doc" s={15} c={t.data ? "var(--wb-gold)" : (t.key === activeKey ? "var(--wb-blue-l)" : "var(--wb-ink-3)")} />
              <div className="nt-sheet-m"><div className="nt-sheet-t">{t.title}</div><div className="nt-sheet-p">{t.path}</div></div>
              {t.pinned ? <span className="nt-sheet-pin"><NtIc n="pin" s={14} /></span>
                : <button className="nt-sheet-x" aria-label={"關閉 " + t.title} onClick={(e) => { e.stopPropagation(); act.close([t.key]); }}><Ic n="close" s={15} sw={2} /></button>}
            </div>
          ))}
        </div>
        <div className="nt-sheet-f">
          <button className="wb-btn-ghost" disabled={!closed.length} onClick={() => { act.reopen(); onClose(); }}><NtIc n="undo" s={14} /> 重開剛關閉的</button>
          <button className="wb-btn-ghost" disabled={!tabs.some((t) => !t.pinned)} onClick={() => act.close(tabs.filter((x) => !x.pinned).map((x) => x.key))}>全部關閉</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { usePtTabs, PtTabStrip, PtTabMenu, PtTabAll, PtTabCount, PtTabSheet, NtIc });
