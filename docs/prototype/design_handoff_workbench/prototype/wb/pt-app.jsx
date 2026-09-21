const { useState, useEffect, useCallback } = React;

const PT_TWEAKS = /*EDITMODE-BEGIN*/{
  "devMode": true,
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
  "chapterMark": "pill"
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

function PtPalette({ onClose, onNote, onSeries, onTag }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const notes = window.ptRows().filter((r) => !ql || (r.title + r.path + r.tags.join()).toLowerCase().includes(ql)).slice(0, 7);
  const series = window.ptSeries().filter((s) => !ql || s.name.toLowerCase().includes(ql)).slice(0, 3);
  const tags = window.tagStats().filter((t) => ql && t.name.toLowerCase().includes(ql)).slice(0, 4);
  const empty = !notes.length && !series.length && !tags.length;
  return (
    <div className="wb-pal-scrim" onClick={onClose}>
      <div className="wb-pal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-pal-in">
          <Ic n="search" s={16} c="var(--wb-ink-3)" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋筆記、系列、標籤…" onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && notes[0]) onNote(notes[0].slug); }} />
          <span className="wb-crumb">Esc 關閉</span>
        </div>
        <div className="wb-pal-list">
          {empty ? <div className="wb-pal-empty">找不到相符的項目</div> : null}
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
  const [route, setRoute] = useState("dashboard");
  const [tab, setTab] = useState(t.defaultView);
  const [dashTab, setDashTab] = useState("總覽");
  const [filter, setFilter] = useState(null);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState({ hasAi: false, pending: false, nofm: false });
  const [groupBy, setGroupBy] = useState(t.groupBy);
  const [sel, setSel] = useState(null);
  const [openSlug, setOpenSlug] = useState(null);
  const [openSeriesId, setOpenSeriesId] = useState(null);
  const [openDataId, setOpenDataId] = useState(null);
  const [presentSlug, setPresentSlug] = useState(null);
  const [presentIndex, setPresentIndex] = useState(0);
  const [modal, setModal] = useState(false);
  const [palette, setPalette] = useState(false);
  const [sbOpen, setSbOpen] = useState(false);
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
    document.documentElement.classList.remove("wb-dark");
    document.documentElement.style.setProperty("--pt-row-h", t.rowDensity + "px");
  }, [t.rowDensity]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") { setPalette(false); setSel(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  window.NC_ENV = { devMode: t.devMode, pluginCount: t.pluginCount, cardFoot: t.cardFoot, embedMark: t.embedMark, vizError: t.vizError, chapterMark: t.chapterMark, onOpenView: (id) => { setOpenDataId(id); setRoute("view"); } };

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
      actions={<><button className="wb-btn-ghost" onClick={() => setRoute("decklib")}><Ic n="layers" s={14} /> 版型庫</button><button className="wb-btn-solid" onClick={() => goPresent(openSlug, 0)}><Ic n="slide" s={14} c="#fff" /> 轉簡報</button></>} />;
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
      tabs={["總覽", "本週", "AI 佇列"]} activeTab={dashTab} onTab={setDashTab} actions={newBtn} />;
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
  return (
    <>
      <div className="wb-app">
        <window.PtRail route={route === "ai" ? "ai" : (route === "plugins" || route === "view" ? "plugins" : (route === "dashboard" ? "dashboard" : (route === "about" ? "about" : "")))}
          onRoute={goRoute} onSearch={() => setPalette(true)} pending={pending.count} />
        <window.PtSidebar route={route} openSeriesId={openSeriesId} folders={folders} series={seriesList} filter={filter} onFolder={(f, s) => { goFolder(f, s); setSbOpen(false); }} onSeries={(id) => { goSeries(id); setSbOpen(false); }} onRoute={(r) => { goRoute(r); setSbOpen(false); }} onDataFolder={(d) => { goDataFolder(d); setSbOpen(false); }} pending={pending} open={sbOpen} onClose={() => setSbOpen(false)} />
        <div className="wb-main">
          <button className="wb-mburger" onClick={() => setSbOpen(true)} aria-label="開啟側欄"><Ic n="layers" s={16} /></button>
          {header}
          {body}
          {sel ? <window.PtDrawer slug={sel} onClose={() => setSel(null)} onOpen={goNote} onPresent={(s) => goPresent(s, 0)} onSeries={goSeries} onTag={goTag} /> : null}
        </div>
      </div>
      {palette ? <PtPalette onClose={() => setPalette(false)} onNote={(s) => { setPalette(false); goNote(s); }} onSeries={(id) => { setPalette(false); goSeries(id); }} onTag={(tg) => { setPalette(false); goTag(tg); }} /> : null}
      <window.NewNoteModal open={modal} onClose={() => setModal(false)} onCreated={(d) => { setModal(false); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "筆記已建立並開啟", icon: "check" } })); goNote(d.slug); }} />
      <window.ToastHost />
      <TweaksPanel>
        <TweakSection label="工作台" />
        <TweakRadio label="/notes 預設 view" value={t.defaultView} options={[{ value: "List", label: "List" }, { value: "Board", label: "Board" }, { value: "Table", label: "Table" }, { value: "Timeline", label: "Timeline" }]} onChange={(v) => setTweak("defaultView", v)} />
        <TweakRadio label="List 預設分組" value={t.groupBy} options={[{ value: "folder", label: "資料夾" }, { value: "series", label: "系列" }, { value: "tag", label: "標籤" }, { value: "month", label: "月份" }]} onChange={(v) => setTweak("groupBy", v)} />
        <TweakRadio label="介面尺寸" value={t.viewport || "自動"} options={[{ value: "自動", label: "自動" }, { value: "電腦", label: "電腦" }, { value: "平板", label: "平板" }, { value: "手機", label: "手機" }]} onChange={(v) => setTweak("viewport", v)} />
        <TweakSection label="環境" />
        <TweakToggle label="Dev 模式（顯示新增/編輯）" value={t.devMode} onChange={(v) => setTweak("devMode", v)} />
        <TweakRadio label="已裝 plugin 數" value={t.pluginCount} options={[{ value: 3, label: "3 個" }, { value: 1, label: "1 個" }]} onChange={(v) => setTweak("pluginCount", v)} />
        <TweakToggle label="Plugin 渲染器出錯" value={t.vizError} onChange={(v) => setTweak("vizError", v)} />
        <TweakSection label="簡報" />
        <TweakRadio label="簡報主題" value={t.deckTheme} options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }]} onChange={(v) => setTweak("deckTheme", v)} />
        <TweakButton label="開啟 Deck 版型庫" onClick={() => setRoute("decklib")} />
        <TweakSection label="閱讀" />
        <TweakSlider label="筆記字級" value={t.fontScale} min={0.9} max={1.25} step={0.05} unit="×" onChange={(v) => setTweak("fontScale", v)} />
      </TweaksPanel>
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<PtApp />);
