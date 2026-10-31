// 交付 Prototype — App Shell（Rail + 側欄 + 頁首）＋ 筆記頁。只收 4 篇範例筆記。
const { useState: hpUS, useEffect: hpUE, useRef: hpUR } = React;
const HP_TWEAKS = /*EDITMODE-BEGIN*/{
  "noteTheme": "brand",
  "theme": "light",
  "viewport": "自動",
  "fontScale": 1
}/*EDITMODE-END*/;

function HpSidebar({ cur, onOpen, open, onClose, toast }) {
  const folders = window.ptFolders();
  const series = window.ptSeries();
  const [exp, setExp] = hpUS(Object.fromEntries(folders.map((f) => [f.name, true])));
  return (
    <>
      {open ? <button className="wb-sb-scrim" onClick={onClose} aria-label="關閉側欄" /> : null}
      <nav className={"wb-sb" + (open ? " open" : "")} aria-label="筆記導覽">
        <div className="wb-sb-ws">
          <span className="wb-sb-ws-mark"><NcLogo s={30} r={9} /></span>
          <div style={{ minWidth: 0 }}><div className="wb-sb-ws-name">NoteCraft 工作台</div><div className="wb-sb-ws-path">~/notes/src/content/notes</div></div>
        </div>
        <div className="wb-sb-scroll">
          <div className="wb-sb-sec">資料夾</div>
          {folders.map((f) => (
            <React.Fragment key={f.name}>
              <button className="wb-sb-item" style={{ paddingLeft: 10 }} aria-expanded={!!exp[f.name]} onClick={() => setExp({ ...exp, [f.name]: !exp[f.name] })}>
                <span className={"wb-sb-caret" + (exp[f.name] ? " open" : "")}><Ic n="chev" s={11} sw={2.2} /></span>
                <Ic n="folder" s={14} c={window.FOLDER_COLOR[f.name] || "#8b9aad"} /><span className="wb-sb-label">{f.name}</span><span className="wb-badge-n">{f.count}</span>
              </button>
              {exp[f.name] ? window.ptRows().filter((r) => r.folder === f.name).map((r) => (
                <button key={r.slug} className={"wb-sb-item" + (r.slug === cur ? " on" : "")} style={{ paddingLeft: 24 }} aria-current={r.slug === cur ? "page" : undefined} onClick={() => onOpen(r.slug)}>
                  <span style={{ width: 11, flex: "0 0 11px" }} /><Ic n="doc" s={13} c="var(--wb-ink-3)" /><span className="wb-sb-label" style={{ fontSize: 12.5 }}>{r.title}</span>
                </button>
              )) : null}
            </React.Fragment>
          ))}
          <div className="wb-sb-sec" style={{ marginTop: 8 }}>系列</div>
          {series.map((s) => (
            <button key={s.id} className="wb-sb-item" style={{ paddingLeft: 10 }} onClick={() => toast("系列頁不在此交付範圍")}>
              <span style={{ width: 11, flex: "0 0 11px" }} /><span className="wb-sb-swatch" style={{ background: s.color }} /><span className="wb-sb-label">{s.name}</span>
              <span className="wb-badge-n tnum">{s.done}/{s.total}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

function HpApp() {
  const [t, setTweak] = useTweaks(HP_TWEAKS);
  const hash = (location.hash.match(/^#note\/([\w-]+)/) || [])[1];
  const [slug, setSlug] = hpUS(window.noteBySlug(hash) ? hash : "md-basics");
  const [sb, setSb] = hpUS(false);
  const [toastM, setToastM] = hpUS(null);
  const [jump, setJump] = hpUS(null);
  const toastT = hpUR(0);
  const toast = (m) => { setToastM(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastM(null), 2200); };
  const open = (s) => { setSlug(s); setSb(false); history.replaceState(null, "", "#note/" + s); };
  // :ref／include「前往來源」→ 切到定義所在筆記並捲到定義、閃爍提示
  window.NC_RF = { goDef: (id) => { const d = window.RF_DEFS[id]; if (!d) return; open(d.src); setJump({ id, n: Date.now() }); } };
  hpUE(() => {
    if (!jump) return;
    const tm = setTimeout(() => {
      const el = document.getElementById("def-" + jump.id), sc = document.querySelector(".np-scroll"); if (!el || !sc) return;
      sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 32;
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); el.focus({ preventScroll: true });
    }, 90);
    return () => clearTimeout(tm);
  }, [jump]);
  hpUE(() => { document.documentElement.classList.toggle("wb-dark", t.theme === "dark"); }, [t.theme]);
  hpUE(() => {
    const b = document.body; b.classList.remove("pt-mobile", "pt-tablet", "pt-desktop");
    const m = { 手機: "pt-mobile", 平板: "pt-tablet", 電腦: "pt-desktop" }[t.viewport]; if (m) b.classList.add(m);
  }, [t.viewport]);
  const note = window.noteBySlug(slug);
  const r = window.ptRow(note);
  const bl = window.rfBacklinks(slug).length;
  const theme = t.noteTheme === "classic" ? "classic" : "brand";
  return (
    <div className="wb-app">
      <PtRail route="" onRoute={() => toast("此交付只包含筆記頁")} onSearch={() => toast("此交付只包含筆記頁")} pending={window.ptPending().count} />
      <HpSidebar cur={slug} onOpen={open} open={sb} onClose={() => setSb(false)} toast={toast} />
      <main className="wb-main">
        <button className="wb-mburger" onClick={() => setSb(true)} aria-label="開啟側欄"><Ic n="layers" s={16} /></button>
        <PtHeader onBack={() => toast("返回筆記列表")} crumbs={["NoteCraft", "筆記", r.folder]} title={note.title}
          badges={[[r.ai[1] > 0 ? `待生成 ${r.ai[1]}` : (r.ai[0] > 0 ? `已生成 ${r.ai[0]}` : "無標記"), r.ai[1] > 0 ? "warn" : (r.ai[0] ? "ok" : "muted")], [r.words.toLocaleString() + " 字", "muted"]]}
          actions={<>
            {bl ? <button className="wb-btn-ghost" onClick={() => toast("被引用 Drawer 沿用既有實作")}><Ic n="layers" s={14} /> 被引用 <b className="tnum">{bl}</b></button> : null}
            <div className="hp-seg" role="group" aria-label="筆記頁主題">
              {[["brand", "品牌"], ["classic", "經典"]].map(([k, l]) => <button key={k} className={theme === k ? "on" : ""} aria-pressed={theme === k} onClick={() => setTweak("noteTheme", k)}>{l}</button>)}
            </div>
            <button className="wb-btn-ghost hp-ic" onClick={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")} aria-label={t.theme === "dark" ? "切換為亮色" : "切換為暗色"}><Ic n={t.theme === "dark" ? "sun" : "moon"} s={15} /></button>
          </>} />
        <window.PtNpNoteView key={slug} note={note} theme={theme} fontScale={t.fontScale} onTag={(x) => toast("標籤篩選：" + x)} onOpenNote={open}
          onOpenSeries={() => toast("系列頁不在此交付範圍")} onOpenData={() => toast("資料檔檢視頁沿用既有實作")} />
        {toastM ? <div className="np-toast" role="status">{toastM}</div> : null}
      </main>
      <TweaksPanel>
        <TweakSection label="筆記頁" />
        <TweakRadio label="頁面主題" value={theme} options={[{ value: "brand", label: "品牌（新）" }, { value: "classic", label: "經典（舊）" }]} onChange={(v) => setTweak("noteTheme", v)} />
        <TweakSlider label="筆記字級" value={t.fontScale} min={0.9} max={1.25} step={0.05} unit="×" onChange={(v) => setTweak("fontScale", v)} />
        <TweakSection label="範例筆記" />
        <TweakSelect label="開啟" value={slug} options={window.NOTES.map((n) => ({ value: n.slug, label: n.title }))} onChange={open} />
        <TweakSection label="外觀" />
        <TweakRadio label="色彩" value={t.theme} options={[{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }]} onChange={(v) => setTweak("theme", v)} />
        <TweakRadio label="介面尺寸" value={t.viewport} options={[{ value: "自動", label: "自動" }, { value: "電腦", label: "電腦" }, { value: "平板", label: "平板" }, { value: "手機", label: "手機" }]} onChange={(v) => setTweak("viewport", v)} />
      </TweaksPanel>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<HpApp />);
