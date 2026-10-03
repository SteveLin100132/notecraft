// 原型頁：P6（full-visual）真實可縮放／平移畫布 — 用來驗手感
const ArchMock = () => {
  const LANES = [
    ["PRESENTATION 前端層", ["Web App", "Admin Console", "Mobile"]],
    ["EDGE 邊界層", ["API Gateway", "Auth / OIDC", "Rate Limit"]],
    ["SERVICE 服務層", ["Note Service", "Deck Service", "Viz Runtime", "Search"]],
    ["ASYNC 非同步", ["Job Queue", "Webhook Fanout", "Scheduler"]],
    ["AI 生成層", ["Prompt Router", "Viz Compiler", "Guardrail"]],
    ["DATA 資料層", ["Postgres", "Object Store", "Vector Index"]],
    ["CACHE 快取", ["Edge KV", "Redis"]],
    ["OBSERVABILITY 可觀測性", ["Tracing", "Metrics", "Log Pipeline"]],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {LANES.map(([k, boxes]) => (
        <div key={k} style={{ border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)", background: "var(--neutral-50)", padding: "14px 16px" }}>
          <b style={{ display: "block", fontSize: 13, color: "var(--blue-700)", marginBottom: 10, letterSpacing: ".04em" }}>{k}</b>
          <div style={{ display: "flex", gap: 10 }}>
            {boxes.map((b) => (
              <div key={b} style={{ flex: 1, height: 56, borderRadius: "var(--radius-sm)", background: "var(--neutral-0)", border: "1px solid var(--neutral-200)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "var(--neutral-600)" }}>{b}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const CONTENTS = {
  "rr-raci": { label: "rr-raci · RACI 矩陣", title: "RACI Matrix — 播放時仍可點選操作", natural: 860 },
  "rr-structure": { label: "rr-structure · 權責結構", title: "兩種權責結構 — 指揮鏈 vs 自組織圈", natural: 860 },
  arch: { label: "arch-diagram · 系統架構", title: "系統架構全貌 — 元件高 1200px+", natural: 900 },
  empty: { label: "未綁定", title: "尚未綁定視覺化元件", natural: 860 },
  dual: { label: "並排雙畫布", title: "左右對照 — 兩塊畫布各自縮放", natural: 640 },
};

function P6({ dark, mode, key0, scale }) {
  const c = window.dkt(dark);
  const meta = CONTENTS[key0];
  const G = window.GENERATED || {};
  const node = key0 === "arch" ? <ArchMock /> : key0 === "rr-structure" ? React.createElement(G["rr-structure"]) : React.createElement(G["rr-raci"]);
  const fitA = React.useRef(null), fitB = React.useRef(null);
  const canvasArea =
    key0 === "dual" ? (
      <div style={{ display: "flex", gap: 24 }}>
        <window.CanvasViewport content={React.createElement(G["rr-raci"])} natural={640} w={684} h={658} mode={mode} dark={dark} compact fitRef={fitA} />
        <window.CanvasViewport content={<ArchMock />} natural={860} w={684} h={658} mode={mode} dark={dark} compact fitRef={fitB} />
      </div>
    ) : (
      <window.CanvasViewport content={node} natural={meta.natural} w={1392} h={658} mode={mode} dark={dark} empty={key0 === "empty"} outerScale={scale} />
    );
  return (
    <div style={{ position: "relative", width: 1600, height: 900, overflow: "hidden", background: dark ? c.slide : "var(--neutral-50)", fontFamily: "var(--font-sans)" }}>
      <div style={{ position: "absolute", inset: 0, padding: "58px 104px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: ".3em", color: c.accent, marginBottom: 12 }}>INTERACTIVE</div>
            <h2 style={{ margin: 0, fontSize: 46, lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.01em", color: c.ink }}>{meta.title}</h2>
          </div>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 20px", borderRadius: 999, background: c.accentSoft, color: dark ? "var(--orange-300)" : "var(--orange-600)", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            {window.Icons.sparkle({ s: 22 })}@ai-visualize · {key0}
          </span>
        </div>
        {canvasArea}
        <div style={{ position: "absolute", left: 104, right: 104, bottom: 46, display: "flex", alignItems: "center", gap: 14, fontSize: 19, color: c.muted }}>
          <span style={{ fontWeight: 700, color: c.brandInk }}>角色與職責 R&amp;R</span>
          <span style={{ opacity: 0.5 }}>／</span><span>INTERACTIVE</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700 }}>06 / 08</span>
        </div>
      </div>
    </div>
  );
}

function Hud({ dark, mode, key0, set }) {
  const c = window.dkt(dark);
  const seg = (val, cur, onPick, opts) => (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: dark ? "rgba(255,255,255,0.07)" : "var(--neutral-100)" }}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => onPick(k)} style={{
          height: 30, padding: "0 14px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700,
          background: cur === k ? (dark ? "var(--neutral-0)" : "var(--blue-700)") : "transparent",
          color: cur === k ? (dark ? "var(--neutral-900)" : "#fff") : c.body,
        }}>{l}</button>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: "var(--radius-lg)", background: c.chrome, border: `1px solid ${c.border}`, boxShadow: c.shadow }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".18em", color: c.accent }}>PROTOTYPE CONTROLS</span>
      {seg(null, key0, (k) => set({ key0: k }), [["rr-raci", "RACI"], ["rr-structure", "權責結構"], ["arch", "高架構圖"], ["empty", "空狀態"], ["dual", "雙畫布"]])}
      {seg(null, mode, (k) => set({ mode: k }), [["view", "檢視模式"], ["play", "播放模式"]])}
      {seg(null, dark ? "d" : "l", (k) => set({ dark: k === "d" }), [["l", "Light"], ["d", "Dark"]])}
      <span style={{ marginLeft: "auto", fontSize: 12, color: c.muted, lineHeight: 1.6 }}>
        {mode === "view" ? "⌘/Ctrl + 滾輪縮放（純滾輪捲頁）" : "純滾輪縮放"}　·　拖曳平移（元件上按 ⌥）　·　雙擊還原　·　hover 時 + − 0
      </span>
    </div>
  );
}

function ProtoApp() {
  const { useState, useEffect } = React;
  const [s, setS] = useState({ dark: false, mode: "view", key0: "rr-raci" });
  const set = (p) => setS((o) => ({ ...o, ...p }));
  const [vw, setVw] = useState(window.innerWidth), [vh, setVh] = useState(window.innerHeight);
  useEffect(() => {
    const r = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);
  const c = window.dkt(s.dark);
  const play = s.mode === "play";
  const scale = play ? Math.min(vw / 1600, vh / 900) : Math.min((Math.min(vw, 1240) - 48) / 1600, 0.78);
  const slide = (
    <div style={{ position: "relative", width: 1600 * scale, height: 900 * scale, borderRadius: play ? 0 : "var(--radius-lg)", overflow: "hidden", boxShadow: play ? "none" : c.shadowLg }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1600, height: 900, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <P6 dark={s.dark} mode={s.mode} key0={s.key0} scale={scale} />
      </div>
    </div>
  );
  if (play) {
    return (
      <div style={{ position: "fixed", inset: 0, background: s.dark ? "#000" : "var(--neutral-900)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {slide}
        <button onClick={() => set({ mode: "view" })} style={{ position: "fixed", left: 20, bottom: 20, height: 36, padding: "0 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.24)", background: "rgba(0,0,0,0.4)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          離開播放模式
        </button>
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: c.stage, fontFamily: "var(--font-sans)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, padding: "16px 20px 12px", background: s.dark ? "rgba(22,28,40,0.86)" : "rgba(238,241,246,0.86)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}><Hud dark={s.dark} mode={s.mode} key0={s.key0} set={set} /></div>
      </div>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "8px 20px 80px" }}>
        <p style={{ maxWidth: 760, fontSize: 14, lineHeight: 1.9, color: c.body }}>
          這一段長文字是為了讓頁面可以捲動 —— 請在畫布上<b style={{ color: c.ink }}>直接滾輪</b>，頁面應該照常捲動（畫布不吃事件）；按住 <b style={{ color: c.ink }}>⌘/Ctrl</b> 再滾輪才會縮放。縮放到 25% / 300% 上下限後繼續滾，事件會放行給頁面。
        </p>
        {slide}
        <p style={{ maxWidth: 760, marginTop: 28, fontSize: 14, lineHeight: 1.9, color: c.body }}>
          切到「高架構圖」測邊界遮罩與偏移徽章；切到「雙畫布」測 40px 精簡控制列；切到「播放模式」測純滾輪縮放與控制列 0.32 → 1 的淡入。RACI 的格子與 legend 在任何倍率下都仍可點選，在元件上按住 <b style={{ color: c.ink }}>⌥</b> 才會改成平移。
        </p>
        <div style={{ height: 400 }} />
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<ProtoApp />);
