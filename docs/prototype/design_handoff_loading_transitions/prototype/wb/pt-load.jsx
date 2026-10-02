// Loading 與轉場：骨架、island 佔位、導覽時序（模擬 MPA 換頁）與 View Transition 包裝
const NC_SPEED = {
  fast: { resp: 30, body: 0, js: 60, vis: 60, boot: 80 },
  normal: { resp: 140, body: 100, js: 260, vis: 140, boot: 300 },
  slow: { resp: 650, body: 1100, js: 900, vis: 500, boot: 1800 },
  stuck: { resp: 250, body: Infinity, js: Infinity, vis: Infinity, boot: Infinity },
};
const NC_SK_DELAY = 150, NC_SK_MIN = 300;
// 骨架出現門檻 150ms；一旦出現至少停 300ms，避免「閃一下」
const ncHold = (shownAt) => { const e = performance.now() - shownAt; return e < NC_SK_DELAY ? 0 : Math.max(0, NC_SK_DELAY + NC_SK_MIN - e); };
const NcLoadCtx = React.createContext({ phase: "hydrated", sp: NC_SPEED.normal });

const NC_HUBS = ["dashboard", "notes", "ai", "series", "tags", "plugins", "datafolder", "about"];
function ncVtType(from, to) {
  if (NC_HUBS.includes(to)) return "section";
  return NC_HUBS.includes(from) ? "drill" : "peer";
}

let ncSrc = null;
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest && e.target.closest(".nt-tab, .wb-row, .wb-card, .wb-tl-row");
  if (!el) { ncSrc = null; return; }
  ncSrc = { el: el.querySelector(".nt-t, .wb-row-t, .wb-card-t") || el, at: performance.now() };
}, true);
const ncLastSrc = () => (ncSrc && ncSrc.el.isConnected && performance.now() - ncSrc.at < 3000 ? ncSrc.el : null);

function ncRunVT(type, update, src) {
  const de = document.documentElement;
  if (!document.startViewTransition) {
    update();
    const p = document.querySelector(".wb-app .nc-main-pane");
    if (p && p.animate && !de.classList.contains("nc-rm")) p.animate([{ opacity: 0, transform: `translateY(${type === "section" ? 0 : type === "drill" ? 8 : 4}px)` }, { opacity: 1, transform: "none" }], { duration: type === "drill" ? 280 : type === "section" ? 200 : 240, easing: "cubic-bezier(.22,.7,.3,1)" });
    return;
  }
  de.dataset.ncVt = type;
  const title = () => document.querySelector(".wb-app .wb-hd-title");
  if (src) { const h = title(); if (h) h.style.viewTransitionName = "none"; src.style.viewTransitionName = "nc-title"; }
  let vt;
  try {
    vt = document.startViewTransition(() => {
      update();
      if (src) { src.style.viewTransitionName = ""; const h = title(); if (h) h.style.viewTransitionName = "nc-title"; }
    });
  } catch (e) { update(); delete de.dataset.ncVt; return; }
  vt.finished.finally(() => { delete de.dataset.ncVt; const h = title(); if (h) h.style.viewTransitionName = ""; });
}

function Sk({ w = "100%", h = 12, r, sq, style, className }) {
  return <span className={"nc-sk" + (r ? " r" : "") + (sq ? " sq" : "") + (className ? " " + className : "")} style={{ width: w, height: h, ...style }} />;
}

// ── Sidebar 樹：區段標題是靜態文字，直接輸出真值；只有項目列是骨架 ──
function NcSbSk() {
  const sec = [["資料夾", [86, 112, 74, 96, 60]], ["系列", [104, 82, 92]], ["Plugin 資料檔", [90, 70]]];
  return (
    <div className="nc-sk-root">
      {sec.map(([name, ws], i) => (
        <React.Fragment key={name}>
          <div className="wb-sb-sec" style={i ? { marginTop: 8 } : null}>{name}</div>
          {ws.map((w, j) => (
            <div key={j} className="wb-sb-item" style={{ paddingLeft: 10, cursor: "default" }}>
              <span style={{ width: 11, flex: "0 0 11px" }} />
              <Sk w={i === 1 ? 8 : 14} h={i === 1 ? 8 : 12} sq />
              <Sk w={w} h={9} />
              <span style={{ flex: 1 }} />
              {i === 1 ? <Sk w={34} h={3} r /> : null}
              <Sk w={i === 1 ? 22 : 14} h={9} />
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function NcHeadSk() {
  return (
    <div className="wb-hd"><div className="wb-hd-top" style={{ alignItems: "center" }}>
      <div className="nc-sk-root" style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: "2px 0 3px" }}>
        <Sk w={150} h={9} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Sk w="min(300px, 50%)" h={20} /><Sk w={64} h={20} r /><Sk w={52} h={20} r /></div>
      </div>
    </div></div>
  );
}

function NcNoteSk() {
  const P = ({ ws }) => <div className="nc-sk-lines" style={{ marginBottom: 18 }}>{ws.map((w, i) => <Sk key={i} w={w + "%"} h={12} />)}</div>;
  return (
    <div className="wb-host nc-sk-root" aria-hidden="true">
      <Sk w={96} h={12} style={{ marginBottom: 22 }} />
      <div className="nc-sk-note">
        <div className="nc-sk-art">
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}><Sk w={56} h={22} r /><Sk w={68} h={22} r /><Sk w={46} h={22} r /></div>
          <Sk w="62%" h={30} style={{ marginBottom: 10 }} />
          <Sk w="34%" h={30} style={{ marginBottom: 20 }} />
          <div className="nc-sk-lines" style={{ marginBottom: 20 }}><Sk w="88%" h={14} /><Sk w="64%" h={14} /></div>
          <div className="nc-sk-meta"><Sk w={168} h={26} r /><Sk w={112} h={11} /><Sk w={124} h={11} /><span style={{ flex: 1 }} /><Sk w={86} h={26} r /></div>
          <Sk w="38%" h={20} style={{ margin: "34px 0 16px" }} />
          <P ws={[100, 97, 99, 58]} />
          <div className="nc-sk-code"><div className="nc-sk-code-h"><Sk w={52} h={9} /><span style={{ flex: 1 }} /><Sk w={40} h={9} /></div>
            <div className="nc-sk-code-b">{[46, 62, 38, 70, 52, 28].map((w, i) => <Sk key={i} w={w + "%"} h={9} style={{ marginLeft: [0, 18, 18, 36, 18, 0][i] }} />)}</div></div>
          <P ws={[98, 100, 74]} />
          <div className="nc-sk-fig" style={{ height: 300 }}><div className="nc-sk-fig-h"><Sk w={14} h={14} sq /><Sk w={72} h={9} /><span style={{ flex: 1 }} /><Sk w={140} h={9} /></div><div className="nc-island-ph-b"><Sk w="auto" h="auto" /></div></div>
          <P ws={[100, 92]} />
        </div>
        <nav className="nc-sk-toc" aria-hidden="true">
          <div style={{ display: "flex", justifyContent: "space-between" }}><Sk w={34} h={10} /><Sk w={64} h={9} /></div>
          <div className="nc-sk-toc-l">{[[0, 120], [1, 96], [1, 132], [0, 104], [1, 88], [2, 72], [0, 112]].map(([d, w], i) => <Sk key={i} w={w} h={d ? 9 : 11} style={{ marginLeft: 14 + d * 12 }} />)}</div>
        </nav>
      </div>
    </div>
  );
}

function NcListSk({ toolbar }) {
  const ws = [210, 168, 244, 150, 196, 232, 176, 140, 220, 188, 160, 236, 172, 204];
  return (
    <div className="nc-sk-root" aria-hidden="true">
      {toolbar ? <div className="nc-sk-tb"><Sk w={28} h={9} /><Sk w={44} h={22} r /><Sk w={40} h={22} r /><Sk w={40} h={22} r /><span style={{ flex: 1 }} /><Sk w={200} h={26} sq /></div> : null}
      <div className="wb-gh" style={{ borderTop: "none", cursor: "default" }}><Sk w={12} h={12} sq /><Sk w={72} h={10} /><Sk w={24} h={14} r /></div>
      {ws.map((w, i) => (
        <div key={i} className="nc-sk-row">
          <Sk w={13} h={13} sq /><Sk w={w} h={10} />
          <span style={{ flex: 1, minWidth: 0, display: "flex" }}><Sk className="nc-sk-x" w={Math.round(w * .6)} h={8} style={{ opacity: .7 }} /></span>
          <Sk className="nc-sk-x" w={44} h={18} r /><Sk className="nc-sk-x" w={52} h={18} r />
          <Sk w={64} h={18} r /><Sk w={32} h={9} />
        </div>
      ))}
    </div>
  );
}

function NcGridSk() {
  const W = ({ span, h, kpi }) => (
    <div className="wb-wg" style={{ gridColumn: `span ${span}`, minHeight: h }}>
      <div className="wb-wg-h"><Sk w={72} h={10} /><Sk w={48} h={9} /></div>
      {kpi ? <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12 }}><Sk w={70} h={34} /><Sk w="70%" h={9} /></div>
        : <div style={{ display: "flex", flexDirection: "column" }}>{[0, 1, 2, 3, 4].map((i) => <div key={i} className="nc-sk-row" style={{ height: 34, padding: "0 12px" }}><Sk w={13} h={13} sq /><Sk w={[150, 120, 176, 132, 108][i]} h={9} /><span style={{ flex: 1 }} /><Sk w={30} h={9} /></div>)}</div>}
    </div>
  );
  return <div className="wb-grid nc-sk-root" aria-hidden="true"><W span={3} kpi h={112} /><W span={3} kpi h={112} /><W span={3} kpi h={112} /><W span={3} kpi h={112} /><W span={8} h={220} /><W span={4} h={220} /></div>;
}

const NC_TB_ROUTES = ["notes", "ai", "series", "datafolder", "plugins"];
function ncSkKind(route) { return route === "note" ? "note" : route === "dashboard" ? "grid" : "list"; }
function NcBodySk({ route, withToolbar }) {
  const k = ncSkKind(route);
  if (k === "note") return <div className="wb-body" style={{ height: "100%", overflow: "hidden" }}><NcNoteSk /></div>;
  if (k === "grid") return <div className="wb-body" style={{ height: "100%", overflow: "hidden" }}><NcGridSk /></div>;
  return <div className="wb-body flush" style={{ height: "100%", overflow: "hidden" }}><NcListSk toolbar={withToolbar} /></div>;
}

// ── 互動視覺化（client:visible）佔位：外框與 caption 是 SSR 真值，高度預留，進入視窗才 hydrate ──
function NcIsland({ id, children }) {
  const { phase, sp } = React.useContext(NcLoadCtx);
  const ref = React.useRef(null);
  const since = React.useRef(performance.now());
  const was = React.useRef(false);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    if (phase !== "hydrated") { setReady(false); since.current = performance.now(); return; }
    if (ready) return;
    let tm, tm2;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      if (!isFinite(sp.vis)) return;
      tm = setTimeout(() => { const h = ncHold(since.current); was.current = h > 0 || performance.now() - since.current >= NC_SK_DELAY; tm2 = setTimeout(() => setReady(true), h); }, sp.vis);
    }, { rootMargin: "200px" });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); clearTimeout(tm); clearTimeout(tm2); };
  }, [phase, sp.vis]);
  return (
    <div ref={ref} className={"nc-island " + (ready ? "ready" : "pending")} aria-busy={!ready}>
      <div className={"nc-island-real" + (ready && was.current ? " was" : "")}>{children}</div>
      {!ready ? (
        <div className="nc-island-ph nc-sk-root" aria-hidden="true">
          <div className="nc-sk-fig">
            <div className="nc-sk-fig-h"><Ic n="sparkle" s={14} c="var(--wb-gold)" /><Sk w={76} h={9} /><span style={{ marginLeft: "auto" }}>generated/{id}.tsx</span></div>
            <div className="nc-island-ph-b"><Sk w="auto" h="auto" /><span className="nc-island-lbl">互動圖表載入中</span></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── 啟動骨架：與真實殼同一組 class，所以 RWD／深色模式自動跟著走 ──
const ncNoop = () => {};
function NcBoot({ state, route, railRoute, tabs, activeKey, pending }) {
  const tb = NC_TB_ROUTES.includes(route);
  return (
    <div className={"nc-boot" + (state === "out" ? " out" : "")} aria-busy="true" aria-label="載入中">
      <div className="wb-app">
        <window.PtRail route={railRoute} onRoute={ncNoop} onSearch={ncNoop} pending={pending} />
        <div className="wb-sb">
          <div className="wb-sb-ws">
            <span className="wb-sb-ws-mark"><window.NcLogo s={30} r={9} /></span>
            <div style={{ minWidth: 0 }}><div className="wb-sb-ws-name">NoteCraft 工作台</div><div className="wb-sb-ws-path">~/notes/src/content/notes</div></div>
          </div>
          <div className="wb-sb-scroll"><NcSbSk /></div>
          <div className="wb-sb-foot nc-sk-root" style={{ display: "flex", flexDirection: "column", gap: 8 }}><Sk w={84} h={10} /><Sk w="92%" h={8} /><Sk w="60%" h={8} /></div>
        </div>
        <div className="wb-main has-tabs">
          <window.PtTabStrip tabs={tabs} activeKey={activeKey} onActivate={ncNoop} onClose={ncNoop} onMenu={ncNoop} onAll={ncNoop} onMove={ncNoop} statusMode="off" />
          <window.PtTabCount n={tabs.length} active={!!activeKey} onClick={ncNoop} />
          <button className="wb-mburger" tabIndex={-1} aria-hidden="true"><Ic n="layers" s={16} /></button>
          <div className="nc-main-pane">
            <NcHeadSk />
            <div className="nc-body-wrap"><NcBodySk route={route} withToolbar={tb} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NC_SPEED, NC_SK_DELAY, ncHold, NcLoadCtx, ncVtType, ncLastSrc, ncRunVT, Sk, NcSbSk, NcHeadSk, NcNoteSk, NcListSk, NcGridSk, NcBodySk, NcIsland, NcBoot, NC_TB_ROUTES });
