const { useState, useEffect, useCallback } = React;

const PT_TWEAKS = /*EDITMODE-BEGIN*/{
  "devMode": true,
  "theme": "light",
  "refClick": "pin",
  "aiQueueEmpty": false,
  "deckTheme": "light",
  "defaultView": "List",
  "groupBy": "folder",
  "rowDensity": 38,
  "viewport": "自動",
  "fontScale": 1,
  "pluginCount": 3,
  "plScen": "normal",
  "vizError": false,
  "cardFoot": "path",
  "embedMark": "adapted",
  "chapterMark": "pill",
  "tabStatus": "off",
  "updScenario": "minor",
  "updNet": "online",
  "updChangelog": "ok",
  "updMode": "viewer"
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

const PT_CMDS = [
  { id: "check", t: "檢查更新", d: "向 npm 查詢 notecraftapp 最新版", k: "檢查更新 版本 check update npm 升級", ic: "refresh" },
  { id: "open", t: "查看更新內容", d: "版本的 CHANGELOG", k: "更新內容 changelog 版本 升級 update", ic: "notes", needs: true },
];
function PtPalette({ onClose, onNote, onSeries, onTag, openTabs = [], activeKey, onTab, onCmd, onDef }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const defs = window.rfPalDefs ? window.rfPalDefs(q) : [];
  const tabHits = openTabs.filter((t) => !ql || (t.title + t.path).toLowerCase().includes(ql)).slice(0, ql ? 4 : 6);
  const notes = window.ptRows().filter((r) => !ql || (r.title + r.path + r.tags.join()).toLowerCase().includes(ql)).slice(0, 7);
  const series = window.ptSeries().filter((s) => !ql || s.name.toLowerCase().includes(ql)).slice(0, 3);
  const tags = window.tagStats().filter((t) => ql && t.name.toLowerCase().includes(ql)).slice(0, 4);
  const ur = window.updStore ? window.updStore.s.res : null;
  const cmds = PT_CMDS.filter((c) => (!c.needs || ur) && (!ql || c.k.toLowerCase().includes(ql)));
  const empty = !defs.length && !notes.length && !series.length && !tags.length && !tabHits.length && !cmds.length;
  return (
    <div className="wb-pal-scrim" onClick={onClose}>
      <div className="wb-pal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-pal-in">
          <Ic n="search" s={16} c="var(--wb-ink-3)" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋筆記、系列、標籤，或定義 id（hr.）…" onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "Enter") { if (defs[0]) onDef(defs[0]); else if (tabHits[0]) onTab(tabHits[0].key); else if (notes[0]) onNote(notes[0].slug); else if (cmds[0]) onCmd(cmds[0].id); } }} />
          <span className="wb-crumb">Esc 關閉</span>
        </div>
        <div className="wb-pal-list">
          {empty ? <div className="wb-pal-empty">找不到相符的項目</div> : null}
          {defs.length ? <window.RfPalDefRows ids={defs} onDef={onDef} /> : null}
          {defs.length && (tabHits.length || notes.length) ? <div className="nt-all-sec" style={{ padding: "8px 16px 4px" }}>{tabHits.length ? "已開啟的頁籤" : "筆記"}</div> : null}
          {tabHits.length && !defs.length ? <div className="nt-all-sec" style={{ padding: "8px 16px 4px" }}>已開啟的頁籤</div> : null}
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
          {cmds.length ? <div className="nt-all-sec" style={{ padding: "8px 16px 4px" }}>指令</div> : null}
          {!ql ? <div className="rf-pal-hint">輸入 id 的任一段（<span className="rf-mono">hr.</span>、<span className="rf-mono">role-admin</span>）或定義名稱，可直接跳到定義所在處。</div> : null}
          {cmds.map((c) => (
            <button key={c.id} className="wb-row" onClick={() => onCmd(c.id)}>
              <Ic n={c.ic} s={13} c="var(--wb-blue-l)" /><span className="wb-row-t">{c.t}</span>
              <span className="wb-row-p">{c.d}</span>
              {c.id === "open" && ur ? <span className="wb-pill tnum">v{ur.latest}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PtApp() {
  const [t, setTweak] = useTweaks(PT_TWEAKS);
  const demo = React.useMemo(() => new URLSearchParams(location.search).get("tabsDemo"), []);
  const tabs = window.usePtTabs(demo);
  const [tabMenu, setTabMenu] = useState(null);
  const [tabAll, setTabAll] = useState(null);
  const [tabSheet, setTabSheet] = useState(false);
  const lastTab = React.useRef(null);
  const scrollT = React.useRef(null);
  const keyRef = React.useRef({});
  window.__ptAiEmpty = !!t.aiQueueEmpty;
  const hashNote = (location.hash.match(/^#note\/([\w-]+)/) || [])[1] || null;
  const [route, setRoute] = useState(hashNote ? "note" : "dashboard");
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
  const [blDw, setBlDw] = useState(null);
  const blTrig = React.useRef(null);
  const [plOff, setPlOff] = useState({});
  useEffect(() => { setPlOff({}); }, [t.plScen]);
  const plEnv = window.ptPlEnv(t.plScen || "normal", plOff);
  const autoNarrow = window.useNarrow();
  const vp = t.viewport || "自動";
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

  useEffect(() => window.ncSubscribe(() => ver((v) => v + 1)), []);
  useEffect(() => { setGroupBy(t.groupBy); }, [t.groupBy]);
  useEffect(() => { setTab(t.defaultView); }, [t.defaultView]);
  useEffect(() => {
    document.documentElement.classList.toggle("wb-dark", t.theme === "dark");
    document.documentElement.style.setProperty("--pt-row-h", t.rowDensity + "px");
  }, [t.rowDensity, t.theme]);
  // 共用 Esc 堆疊：Palette 50 → Modal 40 → 浮層 30（預覽卡、反向連結、頁籤選單）→ Drawer 20 → Sidebar 抽屜 10
  window.useEscLayer(palette, 50, () => setPalette(false));
  window.useEscLayer(modal, 40, () => setModal(false));
  window.useEscLayer(!!(tabMenu || tabAll || tabSheet), 30, () => { setTabMenu(null); setTabAll(null); setTabSheet(false); });
  window.useEscLayer(!!sel, 20, () => setSel(null));
  window.useEscLayer(sbOpen, 10, () => setSbOpen(false));
  // ── define / include / :ref ──
  const rfJump = React.useRef(null);
  const [rfNonce, setRfNonce] = useState(0);
  const hoverNone = window.matchMedia ? window.matchMedia("(hover: none)").matches : false;
  const sheetMode = vp === "手機" || (vp === "自動" && (autoNarrow || hoverNone));
  const rfToast = (m) => window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: m, icon: "check" } }));
  const rfGo = (slug, a) => { rfJump.current = a; setOpenSlug(slug); setSel(null); setSbOpen(false); setPalette(false); setRoute("note"); setRfNonce((x) => x + 1); };
  const goDef = (id) => rfGo(window.RF_DEFS[id].src, { def: id });
  const pc = window.useRfPop({ sheetMode, clickMode: t.refClick || "pin", goDef, toast: rfToast, dev: t.devMode, onNote: (s) => rfGo(s, "top") });
  const pcRef = React.useRef(pc); pcRef.current = pc;
  const openBl = (s, el) => { blTrig.current = el || document.activeElement; setBlDw(s); };
  const closeBl = (restore) => { setBlDw(null); const el = blTrig.current; if (restore && el && document.contains(el)) el.focus({ preventScroll: true }); };
  window.useEscLayer(!!blDw, 20, () => closeBl(true));
  useEffect(() => { if (route !== "note" || blDw !== openSlug) setBlDw(null); }, [route, openSlug]);
  window.NC_RF = { goDef, openBl, goBl: (s) => { rfGo(s, "top"); setTimeout(() => setBlDw(s), 0); } };
  useEffect(() => {
    const a = rfJump.current; if (!a) return; rfJump.current = null;
    const tm = setTimeout(() => {
      const sc = document.querySelector(".wb-main > .wb-body"); if (!sc) return;
      if (a === "top") { sc.scrollTop = 0; return; }
      const el = document.getElementById(a.def ? "def-" + a.def : a.id); if (!el) return;
      sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 32;
      if (a.def) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1700); el.focus({ preventScroll: true }); }
    }, 90);
    return () => clearTimeout(tm);
  }, [rfNonce]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
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
    const el = document.querySelector(".wb-main > .wb-body");
    if (el) { el.scrollTop = y; requestAnimationFrame(() => { el.scrollTop = y; }); }
  }, [activeKey]);
  const onMainScroll = (e) => {
    if (!activeKey || !e.target.classList || !e.target.classList.contains("wb-body")) return;
    const k = activeKey, y = e.target.scrollTop;
    clearTimeout(scrollT.current); scrollT.current = setTimeout(() => tabs.setScroll(k, y), 220);
  };
  const tabActivate = (key) => {
    const i = key.indexOf(":"), kind = key.slice(0, i), id = key.slice(i + 1);
    if (kind === "note") { setOpenSlug(id); setSel(null); setRoute("note"); } else { setOpenDataId(id); setRoute("view"); }
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
    if (!demo) return;
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

  window.NC_UPD_ENV = { scen: t.updScenario || "minor", net: t.updNet || "online", cl: t.updChangelog || "ok", mode: t.updMode || "viewer" };
  const updRail = window.useUpdRail();
  const updFirst = React.useRef(true);
  useEffect(() => { window.updBoot(); }, []);
  useEffect(() => { if (updFirst.current) { updFirst.current = false; return; } window.updSimulateOpen(); }, [t.updScenario, t.updNet]);
  const runCmd = (id) => {
    setPalette(false);
    if (id === "check") { setDashTab("關於"); setSel(null); setRoute("about"); window.updCheck(true); }
    if (id === "open") window.updOpenDrawer();
  };

  window.NC_ENV = { devMode: t.devMode, pluginCount: t.plScen === "one" ? 1 : 3, cardFoot: t.cardFoot, embedMark: t.embedMark, vizError: t.vizError, chapterMark: t.chapterMark, onOpenView: (id) => { setOpenDataId(id); setRoute("view"); } };

  const folders = window.ptFolders();
  const seriesList = window.ptSeries();
  const pending = window.ptPending();
  const allRows = window.ptRows();

  const goRoute = (r) => { setSel(null); setRoute(r === "ai" ? "ai" : r); if (r === "notes") setFilter(null); };
  const goNote = (slug) => { setOpenSlug(slug); setSel(null); setRoute("note"); };
  const goSeries = (id) => { setOpenSeriesId(id); setSel(null); setRoute("series-detail"); };
  const goData = (id) => { setOpenDataId(id); setRoute("view"); };
  const deckSlug = (s) => (s && window.deckOf(s)) ? s : "role-and-responsibility";
  const goPresent = (slug, i) => { setPresentSlug(deckSlug(slug || openSlug)); setPresentIndex(i || 0); setRoute("present"); };
  const goTag = (tag) => { setFilter({ type: "tag", value: tag }); setSel(null); setRoute("notes"); };
  const goFolder = (folder, sub) => {
    setFilter(folder ? (sub ? { type: "sub", value: sub, folder } : { type: "folder", value: folder }) : null);
    setSel(null); setRoute("notes");
  };
  const goSeriesFilter = (id) => { setFilter({ type: "series", value: id }); setSel(null); setRoute("notes"); };
  const goDataFolder = (name) => { setFilter({ type: "datafolder", value: name }); setSel(null); setRoute("datafolder"); };

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
    header = <window.PtHeader onBack={() => setRoute("notes")} crumbs={[["NoteCraft", () => goRoute("dashboard")], ["筆記", () => goRoute("notes")], r.folder]} title={note.title}
      badges={[[r.ai[1] > 0 ? `待生成 ${r.ai[1]}` : (r.ai[0] > 0 ? `已生成 ${r.ai[0]}` : "無標記"), r.ai[1] > 0 ? "warn" : (r.ai[0] ? "ok" : "muted")], [r.words.toLocaleString() + " 字", "muted"]]}
      actions={<>{note.rf && window.rfBacklinks(openSlug).length ? <button className={"wb-btn-ghost rf-bl-trig" + (blDw ? " on" : "")} aria-haspopup="dialog" aria-expanded={!!blDw} onClick={(e) => (blDw ? closeBl(false) : openBl(openSlug, e.currentTarget))}><Ic n="corner" s={14} /> 被引用 <b className="tnum">{window.rfBacklinks(openSlug).length}</b></button> : null}<button className="wb-btn-ghost" onClick={() => setRoute("decklib")}><Ic n="layers" s={14} /> 版型庫</button><button className="wb-btn-solid" onClick={() => goPresent(openSlug, 0)}><Ic n="slide" s={14} c="#fff" /> 轉簡報</button></>} />;
    body = <div className="wb-body"><div className="wb-host">
      <window.NoteView note={note} devMode={t.devMode} fontScale={t.fontScale} onBack={() => setRoute("notes")} onTag={goTag} onOpenNote={goNote} onOpenSeries={goSeries} onPresent={goPresent} />
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
    const npl = plEnv.plugins.length, nf = plEnv.files.length;
    // 徽章：有資料檔照舊；0 檔時正式環境不顯示，dev 改成說明原因
    const plBadges = nf ? [[nf + " 個資料檔", "muted"], [`已裝 ${npl} 個外掛`, ""]]
      : !t.devMode ? [] : !npl ? [["未安裝外掛", "muted"]] : [[`已裝 ${npl} 個外掛`, ""], [window.PL_REASON_PILL[plEnv.reason] || "沒有資料檔", "warn"]];
    header = <window.PtHeader crumbs={[["NoteCraft", () => goRoute("dashboard")], "Plugin"]} title="Plugin 資料檔" badges={plBadges}
      tabs={["資料檔", "已安裝外掛"]} activeTab={dashTab === "已安裝外掛" ? "已安裝外掛" : "資料檔"} onTab={setDashTab} actions={newBtn} />;
    {
      const byPlugin = dashTab === "已安裝外掛";
      const all = plEnv.files.filter((f) => !q.trim() || (f.title + f.path + f.plugin).toLowerCase().includes(q.trim().toLowerCase()));
      const insLbl = npl ? ".notecraft/plugins.json ・ 展開可看映射規則、設定覆寫與外掛檔案" : (!t.devMode ? "這個站沒有使用外掛" : (plEnv.hasConfig ? ".notecraft/plugins.json ・ 沒有已安裝的外掛" : "尚未建立 .notecraft/plugins.json ・ 沒有已安裝的外掛"));
      body = byPlugin ? (
        <>
          <div className="wb-tb">
            <span className="wb-tb-lbl">{insLbl}</span>
            {npl ? <div className="wb-tb-right"><span className="wb-count tnum">{npl} 個外掛</span></div> : null}
          </div>
          <window.PtInstalledPlugins onOpen={goData} env={plEnv} off={plOff} setOff={setPlOff} vizError={t.vizError} devMode={t.devMode} />
        </>
      ) : (
        <>
          <div className="wb-tb">
            <span className="wb-tb-lbl">{nf ? "所有 plugin 資料檔，依所在資料夾分組" : (t.devMode ? "沒有資料檔 ・ 由外掛渲染的 JSON 檔會列在這裡" : "這個站沒有使用資料檔")}</span>
            {nf ? <div className="wb-tb-right">
              <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋檔名、plugin…" /></span>
              <span className="wb-count tnum">{all.length} 個</span>
            </div> : null}
          </div>
          <div className="wb-body flush">{nf ? <window.PtDataAll files={all} onOpen={goData} groupBy="folder" /> : <window.PtPlDataEmpty env={plEnv} devMode={t.devMode} onGoInstalled={() => setDashTab("已安裝外掛")} />}</div>
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
      tabs={["設定", "關於"]} activeTab={dashTab === "關於" ? "關於" : "設定"} onTab={setDashTab} actions={newBtn} tabBadges={updRail ? { 關於: updRail } : {}} />;
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
  const rfDemo = (fn) => setTimeout(fn, 260);
  return (
    <window.RfCtx.Provider value={pc}>
      <div className="wb-app">
        <window.PtRail route={route === "ai" ? "ai" : (route === "plugins" || route === "view" ? "plugins" : (route === "dashboard" ? "dashboard" : (route === "about" ? "about" : "")))}
          onRoute={goRoute} onSearch={() => setPalette(true)} pending={pending.count} />
        <window.PtSidebar route={route} openSeriesId={openSeriesId} folders={folders} series={seriesList} filter={filter} onFolder={(f, s) => { goFolder(f, s); setSbOpen(false); }} onSeries={(id) => { goSeries(id); setSbOpen(false); }} onRoute={(r) => { goRoute(r); setSbOpen(false); }} onDataFolder={(d) => { goDataFolder(d); setSbOpen(false); }} pending={pending} dataFiles={plEnv.files} devMode={t.devMode} open={sbOpen} onClose={() => setSbOpen(false)} />
        <div className="wb-main has-tabs" onScrollCapture={onMainScroll}>
          <window.PtTabStrip tabs={tabs.tabs} activeKey={activeKey} onActivate={tabActivate} onClose={tabClose} onMove={tabs.move} statusMode={t.tabStatus}
            onMenu={(key, x, y) => setTabMenu({ key, x, y })} onAll={(x, y) => setTabAll(tabAll ? null : { x, y })} allOpen={!!tabAll} />
          <window.PtTabCount n={tabs.tabs.length} active={!!activeKey} onClick={() => setTabSheet(true)} />
          <button className="wb-mburger" onClick={() => setSbOpen(true)} aria-label="開啟側欄"><Ic n="layers" s={16} /></button>
          {header}
          {body}
          {sel ? <window.PtDrawer slug={sel} onClose={() => setSel(null)} onOpen={goNote} onPresent={(s) => goPresent(s, 0)} onSeries={goSeries} onTag={goTag} /> : null}
          {blDw ? <window.RfBlDrawer slug={blDw} onClose={() => closeBl(true)} onOpen={(s) => { closeBl(false); rfGo(s, "top"); }} /> : null}
          <window.PtUpdDrawer />
        </div>
        <window.PtUpdToast />
        <window.RfPopLayer />
        {tabMenu ? <window.PtTabMenu menu={tabMenu} tabs={tabs.tabs} onClose={() => setTabMenu(null)} act={tabAct} /> : null}
        {tabAll ? <window.PtTabAll pos={tabAll} tabs={tabs.tabs} activeKey={activeKey} closed={tabs.closed} onClose={() => setTabAll(null)} act={tabAct} /> : null}
        {tabSheet ? <window.PtTabSheet tabs={tabs.tabs} activeKey={activeKey} closed={tabs.closed} onClose={() => setTabSheet(false)} act={tabAct} /> : null}
      </div>
      {palette ? <PtPalette openTabs={tabs.tabs} activeKey={activeKey} onTab={(k) => { setPalette(false); tabActivate(k); }} onClose={() => setPalette(false)} onNote={(s) => { setPalette(false); goNote(s); }} onSeries={(id) => { setPalette(false); goSeries(id); }} onTag={(tg) => { setPalette(false); goTag(tg); }} onCmd={runCmd} onDef={goDef} /> : null}
      <window.NewNoteModal open={modal} onClose={() => setModal(false)} onCreated={(d) => { setModal(false); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "筆記已建立並開啟", icon: "check" } })); goNote(d.slug); }} />
      <window.ToastHost />
      <TweaksPanel>
        <TweakSection label="工作台" />
        <TweakRadio label="/notes 預設 view" value={t.defaultView} options={[{ value: "List", label: "List" }, { value: "Board", label: "Board" }, { value: "Table", label: "Table" }, { value: "Timeline", label: "Timeline" }]} onChange={(v) => setTweak("defaultView", v)} />
        <TweakRadio label="List 預設分組" value={t.groupBy} options={[{ value: "folder", label: "資料夾" }, { value: "series", label: "系列" }, { value: "tag", label: "標籤" }, { value: "month", label: "月份" }]} onChange={(v) => setTweak("groupBy", v)} />
        <TweakRadio label="介面尺寸" value={t.viewport || "自動"} options={[{ value: "自動", label: "自動" }, { value: "電腦", label: "電腦" }, { value: "平板", label: "平板" }, { value: "手機", label: "手機" }]} onChange={(v) => setTweak("viewport", v)} />
        <TweakRadio label="主題" value={t.theme || "light"} options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }]} onChange={(v) => setTweak("theme", v)} />
        <TweakSection label="定義與引用" />
        <TweakRadio label=":ref 點擊（桌機）" value={t.refClick || "pin"} options={[{ value: "pin", label: "固定預覽卡" }, { value: "nav", label: "直接前往來源" }]} onChange={(v) => setTweak("refClick", v)} />
        <TweakButton label="請假功能規格（ref／連結／tip／include）" onClick={() => rfGo("hr-leave-spec", "top")} />
        <TweakButton label="加班申請規格（連續嵌入）" secondary onClick={() => rfGo("hr-overtime-spec", "top")} />
        <TweakButton label="帳號權限規格（只有行內引用）" secondary onClick={() => rfGo("hr-account-spec", "top")} />
        <TweakButton label="系統 Overview（來源端＋被引用）" secondary onClick={() => rfGo("hr-overview", "top")} />
        <TweakButton label="釘選「管理員」預覽卡" secondary onClick={() => { rfGo("hr-leave-spec", "top"); rfDemo(() => { const el = document.querySelector('.nc-ref[data-ref="hr.role-admin"]'); if (el) pcRef.current.click(el, "hr.role-admin"); }); }} />
        <TweakButton label="年度額度：被 13 篇引用" secondary onClick={() => { goDef("hr.term-quota"); rfDemo(() => { const el = document.querySelector('[id="def-hr.term-quota"] .nc-def-cnt'); if (el) el.click(); }); }} />
        <TweakButton label="請假系統列表 → Drawer 摘要" secondary onClick={() => { goFolder(window.RF_FOLDER); setTimeout(() => setSel("hr-overview"), 0); }} />
        <TweakSection label="頁籤" />
        <TweakRadio label="頁籤狀態點" value={t.tabStatus || "off"} options={[{ value: "off", label: "不顯示" }, { value: "ai", label: "AI 待生成" }, { value: "read", label: "閱讀狀態" }]} onChange={(v) => setTweak("tabStatus", v)} />
        <TweakButton label="關閉全部頁籤（看空狀態）" onClick={() => tabClose(tabs.tabs.map((x) => x.key))} />
        <TweakSection label="檢查更新" />
        <TweakSelect label="npm 回傳情境" value={t.updScenario || "minor"} options={[{ value: "latest", label: "已是最新版" }, { value: "patch", label: "patch 更新（1 版）" }, { value: "minor", label: "minor 更新（4 版）" }, { value: "major", label: "major 更新（12 版）" }, { value: "deprecated", label: "目前版本已棄用" }, { value: "node", label: "新版需要 Node 22" }]} onChange={(v) => setTweak("updScenario", v)} />
        <TweakRadio label="網路" value={t.updNet || "online"} options={[{ value: "online", label: "可連線" }, { value: "offline", label: "離線／被擋" }]} onChange={(v) => setTweak("updNet", v)} />
        <TweakRadio label="CHANGELOG" value={t.updChangelog || "ok"} options={[{ value: "ok", label: "正常" }, { value: "loading", label: "載入中" }, { value: "error", label: "失敗" }]} onChange={(v) => setTweak("updChangelog", v)} />
        <TweakRadio label="使用方式" value={t.updMode || "viewer"} options={[{ value: "viewer", label: "viewer" }, { value: "deploy", label: "部署站" }]} onChange={(v) => setTweak("updMode", v)} />
        <TweakButton label="模擬開頁（清除 30 分鐘記錄）" onClick={() => window.updSimulateOpen()} />
        <TweakButton label="前往「關於」分頁" secondary onClick={() => { setDashTab("關於"); setRoute("about"); }} />
        <TweakSection label="環境" />
        <TweakToggle label="Dev 模式（顯示新增/編輯）" value={t.devMode} onChange={(v) => setTweak("devMode", v)} />
        <TweakSelect label="Plugin 情境" value={t.plScen || "normal"} options={window.PL_SCENS} onChange={(v) => setTweak("plScen", v)} />
        <TweakButton label="前往 Plugin 頁" secondary onClick={() => { setDashTab("資料檔"); goRoute("plugins"); }} />
        <TweakToggle label="AI 佇列清空（空狀態）" value={!!t.aiQueueEmpty} onChange={(v) => setTweak("aiQueueEmpty", v)} />
        <TweakToggle label="Plugin 渲染器出錯" value={t.vizError} onChange={(v) => setTweak("vizError", v)} />
        <TweakSection label="簡報" />
        <TweakRadio label="簡報主題" value={t.deckTheme} options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }]} onChange={(v) => setTweak("deckTheme", v)} />
        <TweakButton label="開啟 Deck 版型庫" onClick={() => setRoute("decklib")} />
        <TweakSection label="閱讀" />
        <TweakSlider label="筆記字級" value={t.fontScale} min={0.9} max={1.25} step={0.05} unit="×" onChange={(v) => setTweak("fontScale", v)} />
      </TweaksPanel>
    </window.RfCtx.Provider>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<PtApp />);
