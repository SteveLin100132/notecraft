const { useState, useEffect, useCallback } = React;

const PT_TWEAKS = /*EDITMODE-BEGIN*/{
  "devMode": true,
  "aiQueueEmpty": false,
  "deckTheme": "light",
  "defaultView": "List",
  "groupBy": "folder",
  "rowDensity": 38,
  "viewport": "自動",
  "fontScale": 1,
  "pluginCount": 3,
  "vizError": false,
  "cardFoot": "path",
  "embedMark": "adapted",
  "chapterMark": "pill",
  "tabStatus": "off",
  "loadSpeed": "normal",
  "vtMode": "context",
  "titleShare": false,
  "reduceMotion": false,
  "dark": false
}/*EDITMODE-END*/;

// 壓縮頁首接手了標題與主要動作，legacy 頁面的大 PageHead 改成一行說明
window.PageHead = function PtPageHead({ sub, action }) {
  if (!sub && !action) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
      <div style={{ fontSize: 12.5, color: "var(--wb-ink-3)", lineHeight: 1.7 }}>{sub}</div>
      {action || null}
    </div>
  );
};

function PtPalette({ onClose, onNote, onSeries, onTag, openTabs = [], activeKey, onTab }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const tabHits = openTabs.filter((t) => !ql || (t.title + t.path).toLowerCase().includes(ql)).slice(0, ql ? 4 : 6);
  const notes = window.ptRows().filter((r) => !ql || (r.title + r.path + r.tags.join()).toLowerCase().includes(ql)).slice(0, 7);
  const series = window.ptSeries().filter((s) => !ql || s.name.toLowerCase().includes(ql)).slice(0, 3);
  const tags = window.tagStats().filter((t) => ql && t.name.toLowerCase().includes(ql)).slice(0, 4);
  const empty = !notes.length && !series.length && !tags.length && !tabHits.length;
  return (
    <div className="wb-pal-scrim" onClick={onClose}>
      <div className="wb-pal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-pal-in">
          <Ic n="search" s={16} c="var(--wb-ink-3)" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋筆記、系列、標籤…" onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "Enter") { if (tabHits[0]) onTab(tabHits[0].key); else if (notes[0]) onNote(notes[0].slug); } }} />
          <span className="wb-crumb">Esc 關閉</span>
        </div>
        <div className="wb-pal-list">
          {empty ? <div className="wb-pal-empty">找不到相符的項目</div> : null}
          {tabHits.length ? <div className="nt-all-sec" style={{ padding: "8px 16px 4px" }}>已開啟的頁籤</div> : null}
          {tabHits.map((t) => (
            <button key={t.key} className={"wb-row" + (t.key === activeKey ? " sel" : "")} onClick={() => onTab(t.key)}>
              <Ic n="doc" s={13} c={t.data ? "var(--wb-gold)" : "var(--wb-ink-3)"} /><span className="wb-row-t">{t.title}</span>
              <span className="wb-row-p">{t.path}</span>{t.key === activeKey ? <span className="wb-pill">目前</span> : (t.pinned ? <span className="wb-pill muted">已固定</span> : null)}
            </button>
          ))}
          {tabHits.length && notes.length ? <div className="nt-all-sec" style={{ padding: "8px 16px 4px" }}>筆記</div> : null}
          {notes.map((r) => (
            <button key={r.slug} className="wb-row" onClick={() => onNote(r.slug)}>
              <Ic n="doc" s={13} c="var(--wb-ink-3)" /><span className="wb-row-t">{r.title}</span>
              <span className="wb-row-p">{r.path}</span><window.PtAiPill row={r} />
            </button>
          ))}
          {series.map((s) => (
            <button key={s.id} className="wb-row" onClick={() => onSeries(s.id)}>
              <span className="wb-sb-swatch" style={{ background: s.color }} /><span className="wb-row-t">{s.name}</span>
              <span className="wb-row-p">系列 ・ {s.total} 章</span><span className="wb-pill tnum">{s.pct}%</span>
            </button>
          ))}
          {tags.map((t) => (
            <button key={t.name} className="wb-row" onClick={() => onTag(t.name)}>
              <Ic n="tag" s={13} c="var(--wb-ink-3)" /><span className="wb-row-t">{t.name}</span>
              <span className="wb-row-p">標籤</span><span className="wb-pill tnum">{t.count} 篇</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PtApp() {
  const [t, setTweak] = useTweaks(PT_TWEAKS);
  const qs = React.useMemo(() => new URLSearchParams(location.search), []);
  const tabsDemo = qs.get("tabsDemo"), loadDemo = qs.get("loadDemo");
  const demo = tabsDemo || (loadDemo ? "seed" : null);
  const tabs = window.usePtTabs(demo);
  const [tabMenu, setTabMenu] = useState(null);
  const [tabAll, setTabAll] = useState(null);
  const [tabSheet, setTabSheet] = useState(false);
  const lastTab = React.useRef(null);
  const scrollT = React.useRef(null);
  const keyRef = React.useRef({});
  window.__ptAiEmpty = !!t.aiQueueEmpty;
  const NC_DEMO_SLUG = { note: "oauth-2-pkce", viz: "rate-limiting-token-bucket" };
  const hashNote = (location.hash.match(/^#note\/([\w-]+)/) || [])[1] || (loadDemo === "mid" ? (tabs.tabs[0] || {}).id : NC_DEMO_SLUG[loadDemo]) || null;
  const [route, setRoute] = useState(loadDemo === "list" ? "notes" : (hashNote ? "note" : "dashboard"));
  const [tab, setTab] = useState(t.defaultView);
  const [dashTab, setDashTab] = useState("總覽");
  const [filter, setFilter] = useState(null);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState({ hasAi: false, pending: false, nofm: false });
  const [groupBy, setGroupBy] = useState(t.groupBy);
  const [sel, setSel] = useState(null);
  const [openSlug, setOpenSlug] = useState(hashNote);
  const [openSeriesId, setOpenSeriesId] = useState(null);
  const [openDataId, setOpenDataId] = useState(null);
  const [presentSlug, setPresentSlug] = useState(null);
  const [presentIndex, setPresentIndex] = useState(0);
  const [modal, setModal] = useState(false);
  const [palette, setPalette] = useState(false);
  const [sbOpen, setSbOpen] = useState(false);
  const autoNarrow = window.useNarrow();
  const vp = ({ m: "手機", t: "平板", d: "電腦" })[qs.get("vp")] || t.viewport || "自動";
  const narrow = vp === "手機" ? true : (vp === "自動" ? autoNarrow : false);
  React.useEffect(() => {
    const b = document.body;
    b.classList.remove("pt-mobile", "pt-tablet", "pt-desktop");
    if (vp === "手機") b.classList.add("pt-mobile");
    else if (vp === "平板") b.classList.add("pt-tablet");
    else if (vp === "電腦") b.classList.add("pt-desktop");
    return () => b.classList.remove("pt-mobile", "pt-tablet", "pt-desktop");
  }, [vp]);
  const [, ver] = useState(0);
  React.useEffect(() => { if (!narrow) setSbOpen(false); }, [narrow]);

  // ── Loading／轉場：模擬 MPA 換頁的時序（回應 → View Transition → Body → hydrate）──
  const sp = window.NC_SPEED[["boot", "note", "viz", "list", "values"].includes(loadDemo) ? "stuck" : (t.loadSpeed || "normal")] || window.NC_SPEED.normal;
  const [phase, setPhase] = useState(loadDemo === "note" || loadDemo === "list" ? "skeleton" : (loadDemo === "mid" ? "hydrated" : "content"));
  const [pendingNav, setPendingNav] = useState(false);
  const [swap, setSwap] = useState(false);
  const [hydFlash, setHydFlash] = useState(false);
  const [boot, setBoot] = useState(loadDemo && loadDemo !== "boot" ? "off" : "on");
  const [bootN, setBootN] = useState(0);
  const timers = React.useRef([]);
  const routeRef = React.useRef(route); routeRef.current = route;
  const later = (ms, fn) => { if (isFinite(ms)) timers.current.push(setTimeout(fn, ms)); };
  const clearT = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const hydrate = () => { setPhase("hydrated"); setHydFlash(true); later(360, () => setHydFlash(false)); };
  const ncCtx = React.useMemo(() => ({ phase, sp }), [phase, sp]);
  useEffect(() => { document.documentElement.classList.toggle("nc-rm", !!t.reduceMotion); }, [t.reduceMotion]);
  useEffect(() => {
    if (loadDemo && loadDemo !== "boot") return;
    clearT(); setBoot("on"); setPhase("content"); setPendingNav(false);
    const t0 = performance.now();
    later(sp.boot, () => later(window.ncHold(t0), () => { setBoot("out"); later(220, () => setBoot("off")); later(sp.js, hydrate); }));
    return clearT;
  }, [bootN]);
  const nav = (to, apply) => {
    if (loadDemo) { apply(); return; }
    clearT();
    const from = routeRef.current;
    const src = t.titleShare ? window.ncLastSrc() : null;
    setPendingNav(true);
    later(sp.resp, () => {
      const type = t.vtMode === "uniform" ? "peer" : window.ncVtType(from, to);
      const skel = sp.body > 0;
      window.ncRunVT(type, () => ReactDOM.flushSync(() => { setPendingNav(false); setSwap(false); apply(); setPhase(skel ? "skeleton" : "content"); }), src);
      const t0 = performance.now();
      if (!skel) { later(sp.js, hydrate); return; }
      later(sp.body, () => later(window.ncHold(t0), () => {
        const shown = performance.now() - t0 >= window.NC_SK_DELAY;
        setPhase("content");
        if (shown) { setSwap(true); later(260, () => setSwap(false)); }
        later(sp.js, hydrate);
      }));
    });
  };

  useEffect(() => window.ncSubscribe(() => ver((v) => v + 1)), []);
  useEffect(() => { setGroupBy(t.groupBy); }, [t.groupBy]);
  useEffect(() => { setTab(t.defaultView); }, [t.defaultView]);
  useEffect(() => {
    document.documentElement.classList.toggle("wb-dark", qs.get("dark") === "1" || !!t.dark);
    document.documentElement.style.setProperty("--pt-row-h", t.rowDensity + "px");
  }, [t.rowDensity, t.dark]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") { setPalette(false); setSel(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── 頁籤 ──
  const activeKey = route === "note" && openSlug && window.noteBySlug(openSlug) ? "note:" + openSlug : (route === "view" && openDataId ? "view:" + openDataId : null);
  useEffect(() => {
    if (!activeKey) return;
    const i = activeKey.indexOf(":");
    tabs.ensure(activeKey.slice(0, i), activeKey.slice(i + 1), lastTab.current);
    lastTab.current = activeKey;
  }, [activeKey]);
  React.useLayoutEffect(() => {
    if (!activeKey) return;
    const y = tabs.scrollOf(activeKey);
    const el = document.querySelector(".wb-app .nc-body-wrap > .wb-body");
    if (el) { el.scrollTop = y; requestAnimationFrame(() => { el.scrollTop = y; }); }
  }, [activeKey]);
  const onMainScroll = (e) => {
    if (!activeKey || !e.target.classList || !e.target.classList.contains("wb-body")) return;
    const k = activeKey, y = e.target.scrollTop;
    clearTimeout(scrollT.current); scrollT.current = setTimeout(() => tabs.setScroll(k, y), 220);
  };
  const tabActivate = (key) => {
    const i = key.indexOf(":"), kind = key.slice(0, i), id = key.slice(i + 1);
    nav(kind === "note" ? "note" : "view", () => { if (kind === "note") { setOpenSlug(id); setSel(null); setRoute("note"); } else { setOpenDataId(id); setRoute("view"); } });
  };
  const tabClose = (keys) => {
    const ks = [].concat(keys);
    if (activeKey && ks.includes(activeKey)) {
      const list = tabs.tabs, i = list.findIndex((x) => x.key === activeKey);
      const nb = list.slice(i + 1).find((x) => !ks.includes(x.key)) || list.slice(0, i).reverse().find((x) => !ks.includes(x.key));
      if (nb) tabActivate(nb.key); else { lastTab.current = null; setFilter(null); setRoute("notes"); }
    }
    if (lastTab.current && ks.includes(lastTab.current)) lastTab.current = null;
    tabs.close(ks);
  };
  const tabReopen = () => { const x = tabs.popClosed(); if (x) tabActivate(x.key); };
  const tabUrl = (x) => (x.kind === "note" ? "/notes/" + x.id : "/view/" + x.path);
  const tabAct = {
    activate: tabActivate, close: tabClose, pin: tabs.pin, reopen: tabReopen,
    copy: (x) => { try { navigator.clipboard.writeText(location.origin + tabUrl(x)); } catch (e) {} window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "已複製連結 " + tabUrl(x), icon: "check" } })); },
    newWin: (x) => { if (x.kind === "note") window.open(location.pathname + "#note/" + x.id, "_blank"); else window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "正式版會以新視窗開啟 " + tabUrl(x), icon: "check" } })); },
  };
  const tabStep = (d) => {
    const list = tabs.tabs; if (!list.length) return;
    const i = list.findIndex((x) => x.key === activeKey);
    if (i < 0) { const back = list.find((x) => x.key === lastTab.current) || list[d > 0 ? 0 : list.length - 1]; tabActivate(back.key); return; }
    tabActivate(list[(i + d + list.length) % list.length].key);
  };
  keyRef.current = { step: tabStep, close: () => { const a = tabs.tabs.find((x) => x.key === activeKey); if (a && !a.pinned) tabClose(a.key); }, reopen: tabReopen };
  useEffect(() => {
    const h = (e) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const c = e.code;
      if (c === "Comma" || c === "Period") { e.preventDefault(); keyRef.current.step(c === "Period" ? 1 : -1); }
      else if (c === "KeyW" && !e.shiftKey) { e.preventDefault(); keyRef.current.close(); }
      else if (c === "KeyT" && e.shiftKey) { e.preventDefault(); keyRef.current.reopen(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => {
    if (!tabsDemo) return;
    const list = tabs.tabs;
    const pick = (i) => { const x = list[Math.min(i, list.length - 1)]; if (x) tabActivate(x.key); };
    if (demo === "list" || demo === "empty") { setFilter(null); setRoute("notes"); lastTab.current = list[2] ? list[2].key : null; }
    else pick(demo === "overflow" ? 9 : 2);
    setTimeout(() => {
      if (demo === "menu") { const el = document.querySelectorAll(".nt-tab")[1]; if (el) { const r = el.getBoundingClientRect(); setTabMenu({ key: el.getAttribute("data-key"), x: r.left + 40, y: r.bottom + 2 }); } }
      if (demo === "all") { const el = document.querySelector(".nt-all"); if (el) { const r = el.getBoundingClientRect(); setTabAll({ x: r.right, y: r.bottom + 4 }); } }
      if (demo === "sheet") setTabSheet(true);
    }, 400);
  }, []);

  useEffect(() => {
    if (loadDemo !== "viz") return;
    const tm = setTimeout(() => {
      const el = document.querySelector(".wb-app .nc-island"), b = document.querySelector(".wb-app .nc-body-wrap > .wb-body");
      const host = b && b.querySelector(".wb-host");
      if (el && host) host.style.marginTop = -(el.getBoundingClientRect().top - b.getBoundingClientRect().top - 120) + "px";
    }, 900);
    return () => clearTimeout(tm);
  }, []);
  // 靜態示範：轉場中間格 t≈60ms（舊主區 20%、新主區 45% 且仍有 2.4px 位移、指示器走到 45%）
  useEffect(() => {
    if (loadDemo !== "mid") return;
    const T = +(qs.get("t") || 60), ez = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 2.6);
    if (T <= 0) return;
    const tm = setTimeout(() => {
      const pane = document.querySelector(".wb-app .nc-main-pane"); if (!pane) return;
      const main = pane.parentElement, bar = main.querySelector(".nt-bar");
      const g = pane.cloneNode(true); g.classList.add("nc-ghost");
      Object.assign(g.style, { left: pane.offsetLeft + "px", top: pane.offsetTop + "px", width: pane.offsetWidth + "px", height: pane.offsetHeight + "px" });
      const a = main.querySelector(".nt-tab.on"), ra = a && a.getBoundingClientRect();
      const nx = tabs.tabs[1]; if (!nx) return;
      ReactDOM.flushSync(() => tabActivate(nx.key));
      const oo = 1 - ez(T / 120), no = ez(T / 240);
      if (oo > 0.01) { g.style.opacity = oo.toFixed(2); main.appendChild(g); }
      pane.style.opacity = no.toFixed(2); pane.style.transform = "translateY(" + (4 * (1 - no)).toFixed(1) + "px)";
      const b = main.querySelector(".nt-tab.on"), rb = b && b.getBoundingClientRect();
      if (ra && rb && bar) {
        const br = bar.getBoundingClientRect(), p = ez(T / 240), ind = document.createElement("i");
        ind.className = "nc-mid-ind"; ind.style.left = (ra.left + (rb.left - ra.left) * p - br.left) + "px"; ind.style.width = (ra.width + (rb.width - ra.width) * p) + "px";
        bar.appendChild(ind); bar.classList.add("nc-mid-bar");
      }
    }, 1400);
    return () => clearTimeout(tm);
  }, []);

  window.NC_ENV = { devMode: t.devMode, pluginCount: t.pluginCount, cardFoot: t.cardFoot, embedMark: t.embedMark, vizError: t.vizError, chapterMark: t.chapterMark, onOpenView: (id) => goData(id) };

  const folders = window.ptFolders();
  const seriesList = window.ptSeries();
  const pending = window.ptPending();
  const allRows = window.ptRows();

  const goRoute = (r) => nav(r, () => { setSel(null); setRoute(r === "ai" ? "ai" : r); if (r === "notes") setFilter(null); });
  const goNote = (slug) => nav("note", () => { setOpenSlug(slug); setSel(null); setRoute("note"); });
  const goSeries = (id) => nav("series-detail", () => { setOpenSeriesId(id); setSel(null); setRoute("series-detail"); });
  const goData = (id) => nav("view", () => { setOpenDataId(id); setRoute("view"); });
  const deckSlug = (s) => (s && window.deckOf(s)) ? s : "role-and-responsibility";
  const goPresent = (slug, i) => { setPresentSlug(deckSlug(slug || openSlug)); setPresentIndex(i || 0); setRoute("present"); };
  const goTag = (tag) => nav("notes", () => { setFilter({ type: "tag", value: tag }); setSel(null); setRoute("notes"); });
  const goFolder = (folder, sub) => nav("notes", () => {
    setFilter(folder ? (sub ? { type: "sub", value: sub, folder } : { type: "folder", value: folder }) : null);
    setSel(null); setRoute("notes");
  });
  const goSeriesFilter = (id) => nav("notes", () => { setFilter({ type: "series", value: id }); setSel(null); setRoute("notes"); });
  const goDataFolder = (name) => nav("datafolder", () => { setFilter({ type: "datafolder", value: name }); setSel(null); setRoute("datafolder"); });

  // ── /notes 資料過濾 ──
  let rows = allRows;
  if (filter) {
    if (filter.type === "folder") rows = rows.filter((r) => r.folder === filter.value);
    else if (filter.type === "sub") rows = rows.filter((r) => r.sub === filter.value);
    else if (filter.type === "series") rows = rows.filter((r) => r.series && r.series.id === filter.value);
    else if (filter.type === "tag") rows = rows.filter((r) => r.tags.includes(filter.value));
  }
  if (route === "ai") rows = rows.filter((r) => r.ai[1] > 0);
  if (flt.hasAi) rows = rows.filter((r) => r.markers.length > 0);
  if (flt.pending) rows = rows.filter((r) => r.ai[1] > 0);
  if (flt.nofm) rows = rows.filter((r) => r.nofm);
  if (q.trim()) {
    const ql = q.trim().toLowerCase();
    rows = rows.filter((r) => (r.title + r.path + r.tags.join()).toLowerCase().includes(ql));
  }

  const filterLabel = filter ? (filter.type === "series" ? (seriesList.find((s) => s.id === filter.value) || {}).name : filter.value) : "全部筆記";
  const newBtn = t.devMode ? <button className="wb-btn-gold" onClick={() => setModal(true)}><Ic n="plus" s={14} c="#fff" sw={2.2} /> 新增筆記</button> : null;

  // ── 主區內容 ──
  let header = null, body = null;
  if (route === "note" && window.noteBySlug(openSlug)) {
    const note = window.noteBySlug(openSlug);
    const r = window.ptRow(note);
    header = <window.PtHeader onBack={() => goRoute("notes")} crumbs={[["NoteCraft", () => goRoute("dashboard")], ["筆記", () => goRoute("notes")], r.folder]} title={note.title}
      badges={[[r.ai[1] > 0 ? `待生成 ${r.ai[1]}` : (r.ai[0] > 0 ? `已生成 ${r.ai[0]}` : "無標記"), r.ai[1] > 0 ? "warn" : (r.ai[0] ? "ok" : "muted")], [r.words.toLocaleString() + " 字", "muted"]]}
      actions={<><button className="wb-btn-ghost" onClick={() => setRoute("decklib")}><Ic n="layers" s={14} /> 版型庫</button><button className="wb-btn-solid" onClick={() => goPresent(openSlug, 0)}><Ic n="slide" s={14} c="#fff" /> 轉簡報</button></>} />;
    body = <div className="wb-body"><div className="wb-host">
      <window.NoteView note={note} devMode={t.devMode} fontScale={t.fontScale} onBack={() => goRoute("notes")} onTag={goTag} onOpenNote={goNote} onOpenSeries={goSeries} onPresent={goPresent} />
    </div></div>;
  } else if (route === "notes" || route === "ai") {
    const isAi = route === "ai";
    header = <window.PtHeader
      crumbs={[["NoteCraft", () => goRoute("dashboard")], "筆記", isAi ? "AI 標記佇列" : filterLabel]}
      title={isAi ? "AI 標記佇列" : filterLabel}
      badges={[[rows.length + " 篇", "muted"], ...(pending.count ? [[`待生成 ${pending.count}`, "warn"]] : [])]}
      tabs={narrow ? ["List"] : ["List", "Board", "Table", "Timeline"]} activeTab={narrow ? "List" : tab} onTab={setTab} actions={newBtn} />;
    const props = { rows, sel, onSel: (s) => setSel(s === sel ? null : s), onOpen: goNote };
    const view = narrow ? "List" : tab;
    body = (
      <>
        <window.PtToolbar groupBy={groupBy} onGroupBy={(g) => { setGroupBy(g); setTweak("groupBy", g); }} flt={flt} onFlt={setFlt} q={q} onQ={setQ}
          count={rows.length} pending={pending.count} nofm={allRows.filter((r) => r.nofm).length} showGroup={view === "List"} />
        <div className={"wb-body" + (view === "List" || view === "Table" ? " flush" : "")}>
          {view === "List" ? <window.PtList {...props} groupBy={groupBy} /> : null}
          {view === "Board" ? <window.PtBoard {...props} /> : null}
          {view === "Table" ? <window.PtTable {...props} /> : null}
          {view === "Timeline" ? <window.PtTimeline {...props} /> : null}
        </div>
      </>
    );
  } else if (route === "series") {
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], "系列"]} title="系列" badges={[[seriesList.length + " 個系列", "muted"]]} tabs={["List"]} activeTab="List" onTab={() => {}} actions={newBtn} />;
    body = (
      <>
        <div className="wb-tb">
          <span className="wb-tb-lbl">依閱讀進度追蹤的章節集合，點一列進入詳情</span>
          <div className="wb-tb-right">
            <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋系列…" /></span>
            <span className="wb-count tnum">{seriesList.length} 個</span>
          </div>
        </div>
        <div className="wb-body flush"><window.PtSeriesList onOpen={goSeries} q={q} /></div>
      </>
    );
  } else if (route === "series-detail" && openSeriesId) {
    const s = seriesList.find((x) => x.id === openSeriesId);
    header = <window.PtHeader onBack={() => goRoute("series")} crumbs={[["NoteCraft", () => goRoute("dashboard")], ["系列", () => goRoute("series")], s ? s.name : ""]} title={s ? s.name : ""}
      badges={s ? [[`${s.done}/${s.total} 已讀`, "muted"], [s.pct + "%", "ok"]] : []}
      actions={<button className="wb-btn-ghost" onClick={() => goSeriesFilter(openSeriesId)}><Ic n="layers" s={14} /> 在筆記列表中篩選</button>} />;
    body = <div className="wb-body flush"><window.PtSeriesDetail seriesId={openSeriesId} onOpenNote={goNote} onOpenData={goData} /></div>;
  } else if (route === "tags") {
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], "標籤"]} title="標籤" badges={[[window.tagStats().length + " 個標籤", "muted"]]} tabs={["List"]} activeTab="List" onTab={() => {}} actions={newBtn} />;
    body = <window.PtTagsView onOpenTag={goTag} />;
  } else if (route === "datafolder") {
    const dir = filter ? filter.value : "";
    const files = (window.DATAFILES || []).filter((f) => {
      const parts = f.path.split("/");
      return (parts.length > 1 ? parts.slice(0, -1).join("/") : "根目錄") === dir;
    }).filter((f) => !q.trim() || (f.title + f.path + f.plugin).toLowerCase().includes(q.trim().toLowerCase()));
    const plugins = Array.from(new Set(files.map((f) => f.plugin)));
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], ["Plugin", () => goRoute("plugins")], dir]} title={dir}
      badges={[[files.length + " 個資料檔", "muted"], [plugins.length + " 個 plugin", ""]]} tabs={["List"]} activeTab="List" onTab={() => {}} />;
    body = (
      <>
        <div className="wb-tb">
          <span className="wb-tb-lbl">plugin 渲染的資料檔，點列直接進入渲染頁</span>
          <div className="wb-tb-right">
            <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋檔名、plugin…" /></span>
            <span className="wb-count tnum">{files.length} 個</span>
          </div>
        </div>
        <div className="wb-body flush"><window.PtDataList files={files} onOpen={goData} /></div>
      </>
    );
  } else if (route === "plugins") {
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], "Plugin"]} title="Plugin 資料檔" badges={[[(window.DATAFILES || []).length + " 個資料檔", "muted"], [`已裝 ${t.pluginCount} 個外掛`, ""]]}
      tabs={["資料檔", "已安裝外掛"]} activeTab={dashTab === "已安裝外掛" ? "已安裝外掛" : "資料檔"} onTab={setDashTab} actions={newBtn} />;
    {
      const byPlugin = dashTab === "已安裝外掛";
      const all = (window.DATAFILES || []).filter((f) => !q.trim() || (f.title + f.path + f.plugin).toLowerCase().includes(q.trim().toLowerCase()));
      body = byPlugin ? (
        <>
          <div className="wb-tb">
            <span className="wb-tb-lbl">.notecraft/plugins.json ・ 展開可看映射規則、設定覆寫與外掛檔案</span>
            <div className="wb-tb-right"><span className="wb-count tnum">{t.pluginCount === 1 ? 1 : (window.PT_PLUGINS || []).length} 個外掛</span></div>
          </div>
          <window.PtInstalledPlugins onOpen={goData} pluginCount={t.pluginCount} vizError={t.vizError} />
        </>
      ) : (
        <>
          <div className="wb-tb">
            <span className="wb-tb-lbl">所有 plugin 資料檔，依所在資料夾分組</span>
            <div className="wb-tb-right">
              <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋檔名、plugin…" /></span>
              <span className="wb-count tnum">{all.length} 個</span>
            </div>
          </div>
          <div className="wb-body flush"><window.PtDataAll files={all} onOpen={goData} groupBy="folder" /></div>
        </>
      );
    }
  } else if (route === "view") {
    const f = (window.DATAFILES || []).find((x) => x.id === openDataId) || (window.DATAFILES || [])[0];
    header = <window.PtHeader onBack={() => goRoute("plugins")} crumbs={[["NoteCraft", () => goRoute("dashboard")], ["Plugin", () => goRoute("plugins")], f ? f.path : ""]} title={f ? f.title : "資料檔"}
      badges={f ? [[f.plugin, ""], [window.daysAgo(f.updatedAt) + "更新", "muted"]] : []}
      actions={<>{f && f.backTo ? <button className="wb-btn-ghost" onClick={() => goNote(f.backTo)}><Ic n="doc" s={14} /> 回到來源筆記</button> : null}{t.devMode ? <button className="wb-btn-ghost">以 VS Code 編輯</button> : null}</>} />;
    body = <div className="wb-body flush wb-viewhost" style={{ overflow: "auto" }}>
      <window.DataFileView fileId={f ? f.id : ""} devMode={t.devMode} viewWidth="bleed" vizError={t.vizError} onBack={() => goRoute("plugins")} onOpenNote={goNote} onOpenSeries={goSeries} />
    </div>;
  } else if (route === "about") {
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], "設定"]} title="設定與關於"
      tabs={["設定", "關於"]} activeTab={dashTab === "關於" ? "關於" : "設定"} onTab={setDashTab} actions={newBtn} />;
    body = <window.PtSettings tab={dashTab === "關於" ? "關於" : "設定"} t={t} setTweak={setTweak} onRoute={goRoute} />;
  } else {
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], "工作區"]} title="儀表板"
      badges={[[allRows.length + " 篇筆記", "muted"], ...(pending.count ? [[`${pending.count} 待生成`, "warn"]] : [])]}
      tabs={["總覽", "更新月曆", "AI 佇列"]} activeTab={dashTab} onTab={setDashTab} actions={newBtn} />;
    body = <window.PtDashboard tab={dashTab} onSel={(s) => setSel(s === sel ? null : s)} onOpen={goNote} onSeries={goSeries} onTag={goTag} onRoute={goRoute} />;
  }

  if (route === "present" && presentSlug) {
    return <window.PresentView slug={presentSlug} dark={t.deckTheme === "dark"} onTheme={(v) => setTweak("deckTheme", v ? "dark" : "light")} onBack={() => { setRoute(openSlug ? "note" : "notes"); }} onLibrary={() => setRoute("decklib")} />;
  }
  if (route === "decklib") {
    return <window.DeckLibrary slug={deckSlug(presentSlug || openSlug)} dark={t.deckTheme === "dark"} onTheme={(v) => setTweak("deckTheme", v ? "dark" : "light")}
      onBack={() => setRoute(openSlug ? "note" : "notes")} onPresent={(i) => goPresent(presentSlug || openSlug, typeof i === "number" ? i : 0)} />;
  }

  const railRoute = route === "note" || route === "notes" ? (route === "notes" && !filter ? "dashboard" : "") : route;
  const ncRail = route === "ai" ? "ai" : (route === "plugins" || route === "view" ? "plugins" : (route === "dashboard" ? "dashboard" : (route === "about" ? "about" : "")));
  return (
    <window.NcLoadCtx.Provider value={ncCtx}>
      <div className="wb-app">
        <window.PtRail route={route === "ai" ? "ai" : (route === "plugins" || route === "view" ? "plugins" : (route === "dashboard" ? "dashboard" : (route === "about" ? "about" : "")))}
          onRoute={goRoute} onSearch={() => setPalette(true)} pending={pending.count} />
        <window.PtSidebar route={route} openSeriesId={openSeriesId} folders={folders} series={seriesList} filter={filter} onFolder={(f, s) => { goFolder(f, s); setSbOpen(false); }} onSeries={(id) => { goSeries(id); setSbOpen(false); }} onRoute={(r) => { goRoute(r); setSbOpen(false); }} onDataFolder={(d) => { goDataFolder(d); setSbOpen(false); }} pending={pending} open={sbOpen} onClose={() => setSbOpen(false)} />
        <div className="wb-main has-tabs" onScrollCapture={onMainScroll}>
          <window.PtTabStrip tabs={tabs.tabs} activeKey={activeKey} onActivate={tabActivate} onClose={tabClose} onMove={tabs.move} statusMode={t.tabStatus}
            onMenu={(key, x, y) => setTabMenu({ key, x, y })} onAll={(x, y) => setTabAll(tabAll ? null : { x, y })} allOpen={!!tabAll} />
          <window.PtTabCount n={tabs.tabs.length} active={!!activeKey} onClick={() => setTabSheet(true)} />
          <button className="wb-mburger" onClick={() => setSbOpen(true)} aria-label="開啟側欄"><Ic n="layers" s={16} /></button>
          <div className={"nc-main-pane" + (phase === "skeleton" ? " nc-skel" : "") + (phase !== "hydrated" ? " nc-pending" : "") + (hydFlash ? " nc-hyd" : "")}>
            {pendingNav ? <i className="nc-progress" aria-hidden="true" /> : null}
            {header}
            <div className={"nc-body-wrap" + (swap ? " nc-swap" : "")}>
              {body}
              {phase === "skeleton" ? <div className="nc-body-sk" aria-busy="true" style={{ top: window.NC_TB_ROUTES.includes(route) ? 40 : 0 }}><window.NcBodySk route={route} /></div> : null}
            </div>
          </div>
          {sel ? <window.PtDrawer slug={sel} onClose={() => setSel(null)} onOpen={goNote} onPresent={(s) => goPresent(s, 0)} onSeries={goSeries} onTag={goTag} /> : null}
        </div>
        {tabMenu ? <window.PtTabMenu menu={tabMenu} tabs={tabs.tabs} onClose={() => setTabMenu(null)} act={tabAct} /> : null}
        {tabAll ? <window.PtTabAll pos={tabAll} tabs={tabs.tabs} activeKey={activeKey} closed={tabs.closed} onClose={() => setTabAll(null)} act={tabAct} /> : null}
        {tabSheet ? <window.PtTabSheet tabs={tabs.tabs} activeKey={activeKey} closed={tabs.closed} onClose={() => setTabSheet(false)} act={tabAct} /> : null}
      </div>
      {palette ? <PtPalette openTabs={tabs.tabs} activeKey={activeKey} onTab={(k) => { setPalette(false); tabActivate(k); }} onClose={() => setPalette(false)} onNote={(s) => { setPalette(false); goNote(s); }} onSeries={(id) => { setPalette(false); goSeries(id); }} onTag={(tg) => { setPalette(false); goTag(tg); }} /> : null}
      <window.NewNoteModal open={modal} onClose={() => setModal(false)} onCreated={(d) => { setModal(false); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "筆記已建立並開啟", icon: "check" } })); goNote(d.slug); }} />
      <window.ToastHost />
      {boot !== "off" ? <window.NcBoot state={boot} route={route} railRoute={ncRail} tabs={tabs.tabs} activeKey={activeKey} pending={pending.count} /> : null}
      <TweaksPanel>
        <TweakSection label="載入與轉場" />
        <TweakRadio label="模擬網路" value={t.loadSpeed || "normal"} options={[{ value: "fast", label: "快" }, { value: "normal", label: "一般" }, { value: "slow", label: "慢速" }, { value: "stuck", label: "卡住" }]} onChange={(v) => setTweak("loadSpeed", v)} />
        <TweakRadio label="轉場" value={t.vtMode || "context"} options={[{ value: "context", label: "依情境" }, { value: "uniform", label: "統一" }]} onChange={(v) => setTweak("vtMode", v)} />
        <TweakToggle label="標題共享元素（評估用）" value={!!t.titleShare} onChange={(v) => setTweak("titleShare", v)} />
        <TweakToggle label="模擬減少動態" value={!!t.reduceMotion} onChange={(v) => setTweak("reduceMotion", v)} />
        <TweakToggle label="深色模式" value={!!t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakButton label="重播啟動載入" onClick={() => setBootN((n) => n + 1)} />
        <TweakSection label="工作台" />
        <TweakRadio label="/notes 預設 view" value={t.defaultView} options={[{ value: "List", label: "List" }, { value: "Board", label: "Board" }, { value: "Table", label: "Table" }, { value: "Timeline", label: "Timeline" }]} onChange={(v) => setTweak("defaultView", v)} />
        <TweakRadio label="List 預設分組" value={t.groupBy} options={[{ value: "folder", label: "資料夾" }, { value: "series", label: "系列" }, { value: "tag", label: "標籤" }, { value: "month", label: "月份" }]} onChange={(v) => setTweak("groupBy", v)} />
        <TweakRadio label="介面尺寸" value={t.viewport || "自動"} options={[{ value: "自動", label: "自動" }, { value: "電腦", label: "電腦" }, { value: "平板", label: "平板" }, { value: "手機", label: "手機" }]} onChange={(v) => setTweak("viewport", v)} />
        <TweakSection label="頁籤" />
        <TweakRadio label="頁籤狀態點" value={t.tabStatus || "off"} options={[{ value: "off", label: "不顯示" }, { value: "ai", label: "AI 待生成" }, { value: "read", label: "閱讀狀態" }]} onChange={(v) => setTweak("tabStatus", v)} />
        <TweakButton label="關閉全部頁籤（看空狀態）" onClick={() => tabClose(tabs.tabs.map((x) => x.key))} />
        <TweakSection label="環境" />
        <TweakToggle label="Dev 模式（顯示新增/編輯）" value={t.devMode} onChange={(v) => setTweak("devMode", v)} />
        <TweakRadio label="已裝 plugin 數" value={t.pluginCount} options={[{ value: 3, label: "3 個" }, { value: 1, label: "1 個" }]} onChange={(v) => setTweak("pluginCount", v)} />
        <TweakToggle label="AI 佇列清空（空狀態）" value={!!t.aiQueueEmpty} onChange={(v) => setTweak("aiQueueEmpty", v)} />
        <TweakToggle label="Plugin 渲染器出錯" value={t.vizError} onChange={(v) => setTweak("vizError", v)} />
        <TweakSection label="簡報" />
        <TweakRadio label="簡報主題" value={t.deckTheme} options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }]} onChange={(v) => setTweak("deckTheme", v)} />
        <TweakButton label="開啟 Deck 版型庫" onClick={() => setRoute("decklib")} />
        <TweakSection label="閱讀" />
        <TweakSlider label="筆記字級" value={t.fontScale} min={0.9} max={1.25} step={0.05} unit="×" onChange={(v) => setTweak("fontScale", v)} />
      </TweaksPanel>
    </window.NcLoadCtx.Provider>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<PtApp />);
