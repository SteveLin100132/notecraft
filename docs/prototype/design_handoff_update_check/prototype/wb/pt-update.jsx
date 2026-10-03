// 檢查更新：UI 元件（版本區塊、更新詳情 Drawer、toast、Rail 圓點）
const UPD_LV = {
  patch: ["修補更新 patch", "wb-pill muted"],
  minor: ["功能更新 minor", "wb-pill"],
  major: ["主版本更新 major", "wb-pill warn upd-strong"],
};
function useUpdTick() {
  const [, f] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => f((x) => x + 1), 30000); return () => clearInterval(id); }, []);
}
function updInline(s) {
  const out = []; const re = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g; let i = 0, m, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > i) out.push(s.slice(i, m.index));
    out.push(m[1] != null ? <code key={k++} className="upd-code">{m[1]}</code> : <a key={k++} href={m[3]} target="_blank" rel="noopener">{m[2]}</a>);
    i = re.lastIndex;
  }
  if (i < s.length) out.push(s.slice(i));
  return out;
}
function updCounts(missed) {
  const c = {}; missed.forEach((m) => Object.keys(m.sec).forEach((k) => { c[k] = (c[k] || 0) + m.sec[k].length; })); return c;
}
const UpdSpin = () => <span className="upd-spin" aria-hidden="true" />;

function UpdCmd({ label, cmd }) {
  const [done, setDone] = React.useState(false);
  const t = React.useRef(null);
  const copy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(cmd).catch(() => {}); } catch (e) {}
    setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1600);
  };
  return (
    <div className="upd-cmd">
      <span className="upd-cmd-l">{label}</span>
      <code>{cmd}</code>
      <button className={"upd-copy" + (done ? " done" : "")} onClick={copy} aria-label={"複製指令 " + cmd}>
        <Ic n={done ? "check" : "copy"} s={13} sw={done ? 2.2 : 1.7} />{done ? "已複製" : "複製"}
      </button>
      <span className="upd-sr" aria-live="polite">{done ? "已複製到剪貼簿" : ""}</span>
    </div>
  );
}
function UpdCmds() {
  return (
    <div className="upd-cmds">
      <UpdCmd label="viewer 模式" cmd={"npx " + UPD_PKG + "@latest view"} />
      <UpdCmd label="全域安裝" cmd={"npm i -g " + UPD_PKG + "@latest"} />
    </div>
  );
}

function UpdNotes({ r, env }) {
  if (!r) return null;
  const deploy = env.mode === "deploy";
  const c = updCounts(r.missed);
  const notes = [];
  if (r.deprecated) notes.push(
    <div key="dep" className="upd-note danger" role="status">
      <Ic n="warn" s={15} c="var(--upd-danger)" />
      <div><div className="upd-note-t">v{r.cur} 已被標記為棄用</div>
        <div>npm 上的說明：「{r.deprecated}」建議直接升級到 v{r.latest}。</div></div>
    </div>);
  if (r.level && r.needsNode) notes.push(
    <div key="node" className="upd-note">
      <Ic n="warn" s={15} c="var(--upd-major)" />
      <div><div className="upd-note-t">升級前需要先升級 Node</div>
        {deploy
          ? <div>v{r.latest} 要求 Node {r.engines.replace(">=", "≥ ")}，此站目前以 Node {r.userNode} 建置。請先把 Netlify 的 <code className="upd-code">NODE_VERSION</code> 設為 {r.nodeNeed} 以上，再升級套件。</div>
          : <div>v{r.latest} 要求 Node {r.engines.replace(">=", "≥ ")}，你目前使用 Node {r.userNode}。請先升級 Node，再執行升級指令。<a href="https://nodejs.org/" target="_blank" rel="noopener">下載 Node.js ↗</a></div>}
      </div>
    </div>);
  if (r.level === "major" && !r.needsNode) notes.push(
    <div key="major" className="upd-note">
      <Ic n="warn" s={15} c="var(--upd-major)" />
      <div><div className="upd-note-t">主版本更新可能有破壞性變更</div>
        <div>這次有 {c.removed || 0} 項移除、{c.changed || 0} 項變更。升級前請先看更新內容，必要時對照遷移指南。</div></div>
    </div>);
  return notes.length ? <div className="upd-notes">{notes}</div> : null;
}

function UpdLevelPills({ r, u }) {
  if (u.status === "checking" && !r) return <span className="upd-line"><UpdSpin />正在向 npm registry 查詢…</span>;
  if (!r) return <span className="wb-pill muted">尚未檢查新版</span>;
  const out = [];
  if (r.deprecated) out.push(<span key="d" className="wb-pill danger upd-strong">目前版本已棄用</span>);
  if (!r.level) {
    out.push(<span key="ok" className="wb-pill ok"><Ic n="check" s={11} sw={2.4} style={{ marginRight: 4 }} />已是最新版</span>);
    out.push(<span key="r" className="wb-pill muted">發佈於 {updDays(r.curDate)}</span>);
    return out;
  }
  const [lbl, cls] = UPD_LV[r.level];
  out.push(<span key="l" className={cls}>{lbl}</span>);
  out.push(<span key="b" className="wb-pill muted tnum">落後 {r.behind} 個版本</span>);
  out.push(<span key="t" className="wb-pill muted">最新版 {updDays(r.latestDate)}發佈</span>);
  return out;
}

// ── 「關於」分頁：版本與更新 ──
function PtUpdBlock({ u: uIn, env: envIn }) {
  const live = useUpd(); useUpdTick();
  const u = uIn || live, env = envIn || updEnv();
  const r = u.res, tone = updTone(r), has = !!(r && r.level);
  const checking = u.status === "checking";
  const deploy = env.mode === "deploy";
  const skipped = has && u.skipped === r.latest && !r.deprecated;
  return (
    <section className="upd" aria-label="版本與更新">
      <div className="wb-gh" style={{ "--gc": "var(--wb-blue)", cursor: "default" }}>
        <span style={{ width: 11 }} /><Ic n="refresh" s={13} /><span className="wb-gh-n">版本與更新</span>
        <span className="wb-gh-stats">開頁時自動檢查，30 分鐘內不重複</span>
      </div>
      <div className={"upd-hero" + (tone === "major" ? " major" : tone === "danger" ? " danger" : "")}>
        <div className="upd-ver">
          <div className="upd-ver-row">
            <span className="upd-v-k">目前</span><span className={"upd-v" + (has ? " old" : "")}>v{UPD_CUR}</span>
            {has ? <><Ic n="back" s={15} c="var(--wb-ink-3)" style={{ transform: "scaleX(-1)", alignSelf: "center" }} /><span className="upd-v-k">最新</span><span className="upd-v">v{r.latest}</span></> : null}
          </div>
          <div className="upd-pills"><UpdLevelPills r={r} u={u} /></div>
        </div>
        <div className="upd-act">
          <div className="upd-act-btns">
            {r ? <button className="wb-btn-solid" onClick={updOpenDrawer}><Ic n="notes" s={14} c="#fff" /> 查看更新內容</button> : null}
            <button className="wb-btn-ghost" onClick={() => updCheck(true)} disabled={checking} aria-busy={checking}>
              {checking ? <UpdSpin /> : <Ic n="refresh" s={14} />}{checking ? "檢查中…" : "檢查更新"}
            </button>
          </div>
          <div className="upd-status" aria-live="polite">
            {u.err ? <span className="upd-err">{u.err}</span> : u.checkedAt ? <span className="tnum">{updAgo(u.checkedAt)}檢查</span> : (checking ? "" : "尚未檢查")}
          </div>
        </div>
      </div>
      <UpdNotes r={r} env={env} />
      {deploy && (has || (r && r.deprecated)) ? <div className="upd-deploy">這是部署站，訪客看到的是提醒。升級由站台維護者在 repo 中進行，重新部署後生效。</div> : null}
      {has || (r && r.deprecated) ? (
        <PtSetRow k="升級指令" d={deploy ? "在站台的 repo 中執行，重新部署後生效" : "複製後在終端機執行"}><UpdCmds /></PtSetRow>
      ) : null}
      {r ? (
        <PtSetRow k={has ? "最新版需求" : "Node 需求"} d={"engines.node：" + r.engines}>
          <span className="wb-set-v tnum">Node {r.engines.replace(">=", "≥ ")}</span>
          {r.needsNode ? <span className="wb-pill warn tnum">{deploy ? "建置用" : "你目前"} {r.userNode}</span> : <span className="wb-pill muted tnum">{deploy ? "建置用" : "你目前"} {r.userNode}</span>}
        </PtSetRow>
      ) : null}
      {r ? <PtSetRow k="套件" d={UPD_PKG + "@" + r.latest}><span className="wb-set-v tnum" style={{ color: "var(--wb-ink-3)" }}>{r.size} ・ {r.files} 個檔案</span></PtSetRow> : null}
      {skipped ? (
        <PtSetRow k={"已略過 v" + r.latest + " 的提醒"} d="這一版不再跳通知、Rail 不顯示圓點。有更新的版本時會恢復提醒。">
          <button className="wb-btn-ghost" onClick={updUnskip}>恢復提醒</button>
        </PtSetRow>
      ) : null}
    </section>
  );
}

// ── 更新詳情 Drawer ──
const UPD_FOLD = 4;
function UpdVersion({ m, open, onToggle, first, only, firstLabel = "最新" }) {
  const idx = UPD_VERSIONS.findIndex((x) => x.v === m.v);
  const lv = idx > 0 ? (m.v.split(".")[0] !== UPD_VERSIONS[idx - 1].v.split(".")[0] ? "major" : null) : null;
  const total = Object.values(m.sec).reduce((a, b) => a + b.length, 0);
  const secN = (m.sec.security || []).length;
  const id = "updv-" + m.v.replace(/\./g, "-");
  return (
    <div className="upd-vi">
      <button className="upd-vh" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className={"upd-caret" + (open ? " open" : "")}><Ic n="chev" s={11} sw={2.2} /></span>
        <span className="upd-vh-v">v{m.v}</span>
        {lv ? <span className="wb-pill warn upd-strong">major</span> : null}
        <span className="upd-vh-d tnum">{m.date.replace(/-/g, "/")} ・ {updDays(m.date)}</span>
        <span className="upd-vh-r">
          {secN ? <span className="upd-secpill"><Ic n="shield" s={11} sw={2} />安全 {secN}</span> : null}
          {first ? <span className={firstLabel === "目前" ? "wb-pill ok" : "wb-pill"}>{firstLabel}</span> : <span className="wb-badge-n tnum">{total} 項</span>}
        </span>
      </button>
      {open ? (
        <div className="upd-vb" id={id}>
          {UPD_CATS.filter(([, k]) => (m.sec[k] || []).length && (!only || only === k)).map(([lbl, k, c]) => (
            <div key={k} className={"upd-cat" + (k === "security" ? " sec" : "")} style={{ "--c": c }}>
              <div className="upd-cat-h">{k === "security" ? <Ic n="shield" s={12} sw={2} /> : <i />}{lbl}</div>
              <ul>{m.sec[k].map((t, j) => <li key={j}>{updInline(t)}</li>)}</ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
function UpdChangelog({ missed, cl, firstLabel }) {
  const [open, setOpen] = React.useState(() => new Set(missed.length ? [missed[0].v] : []));
  const [showAll, setShowAll] = React.useState(false);
  const [flt, setFlt] = React.useState(null);
  if (cl === "loading") return (
    <div className="upd-vlist" aria-busy="true">
      <div className="upd-skel-h"><UpdSpin />正在讀取 CHANGELOG.md…</div>
      {[0, 1, 2].map((i) => <div key={i} className="upd-skel-row"><span className="upd-skel" style={{ width: 52 }} /><span className="upd-skel" style={{ width: 96 }} /><span className="upd-skel" style={{ width: 38, marginLeft: "auto" }} /></div>)}
    </div>
  );
  if (cl === "error") return (
    <div className="upd-vlist"><div className="upd-clerr">
      <Ic n="about" s={15} c="var(--wb-ink-3)" />
      <div><div>CHANGELOG 暫時無法載入，版本資訊與升級指令不受影響。</div><a href={UPD_GH} target="_blank" rel="noopener">到 GitHub 看完整 CHANGELOG ↗</a></div>
    </div></div>
  );
  const c = updCounts(missed);
  const list = flt ? missed.filter((m) => (m.sec[flt] || []).length) : missed;
  const hidden = !flt && !showAll && list.length > UPD_FOLD + 1 ? list.slice(UPD_FOLD) : [];
  const vis = hidden.length ? list.slice(0, UPD_FOLD) : list;
  const allOpen = vis.every((m) => open.has(m.v));
  const toggle = (v) => { const n = new Set(open); n.has(v) ? n.delete(v) : n.add(v); setOpen(n); };
  const hiddenSec = hidden.reduce((a, m) => a + (m.sec.security || []).length, 0);
  return (
    <>
      <div className="upd-sum">
        {UPD_CATS.filter(([, k]) => c[k]).map(([lbl, k]) => (
          <button key={k} className={"wb-chip" + (k === "security" ? " upd-chip-sec" : "") + (flt === k ? " on" : "")} aria-pressed={flt === k} onClick={() => setFlt(flt === k ? null : k)}>
            {k === "security" ? <Ic n="shield" s={12} sw={2} /> : null}{lbl} <b>{c[k]}</b>
          </button>
        ))}
        {!flt ? <button className="upd-linkbtn" onClick={() => setOpen(allOpen ? new Set() : new Set(list.map((m) => m.v)))}>{allOpen ? "全部收合" : "全部展開"}</button>
          : <button className="upd-linkbtn" onClick={() => setFlt(null)}>清除篩選</button>}
      </div>
      <div className="upd-vlist">
        {vis.map((m, i) => <UpdVersion key={m.v} m={m} first={!flt && i === 0} firstLabel={firstLabel} only={flt} open={!!flt || open.has(m.v)} onToggle={() => toggle(m.v)} />)}
        {hidden.length ? (
          <button className="upd-more" onClick={() => setShowAll(true)}>
            <Ic n="chev" s={11} sw={2.2} style={{ transform: "rotate(90deg)" }} />
            顯示較早的 {hidden.length} 個版本（v{hidden[hidden.length - 1].v} – v{hidden[0].v}）
            {hiddenSec ? <span className="upd-secpill"><Ic n="shield" s={11} sw={2} />含安全 {hiddenSec}</span> : null}
          </button>
        ) : null}
      </div>
    </>
  );
}
function UpdDrawerPanel({ u, env, onClose, clForce }) {
  useUpdTick();
  const r = u.res;
  const [cl, setCl] = React.useState(clForce || (env.cl === "ok" ? "loading" : env.cl));
  React.useEffect(() => {
    if (clForce) { setCl(clForce); return; }
    if (env.cl !== "ok") { setCl(env.cl); return; }
    setCl("loading"); const id = setTimeout(() => setCl("ok"), 550); return () => clearTimeout(id);
  }, [env.cl, clForce, r && r.latest]);
  if (!r) return null;
  const skipped = u.skipped === r.latest;
  const has = !!r.level;
  return (
    <>
      <div className="wb-dw-h">
        <span className="wb-crumb">{UPD_PKG} ・ 更新內容</span>
        <button className="wb-dw-x" onClick={onClose} aria-label="關閉（Esc）"><Ic n="close" s={14} /></button>
      </div>
      <div className="wb-dw-body">
        <h2 className="wb-dw-t upd-dw-t">v{r.cur}{has ? <> <Ic n="back" s={16} c="var(--wb-ink-3)" style={{ transform: "scaleX(-1)", verticalAlign: "-2px" }} /> v{r.latest}</> : null}</h2>
        <div className="wb-dw-pills"><UpdLevelPills r={r} u={u} /></div>
        <UpdNotes r={r} env={env} />
        {has ? <><div className="wb-dw-sec">升級指令</div><UpdCmds /></> : null}
        {has ? <>
          <div className="wb-dw-sec">你錯過的更新 <span className="wb-dw-sec-n tnum">{r.behind}</span><span style={{ fontWeight: 400, letterSpacing: 0 }}>個版本</span></div>
          <UpdChangelog key={r.latest} missed={r.missed} cl={cl} />
        </> : <>
          <div className="wb-dw-sec">目前版本的更新內容</div>
          <UpdChangelog key={"cur-" + r.cur} missed={[r.curV]} cl={cl} firstLabel="目前" />
        </>}
        <div className="wb-dw-sec">套件資訊</div>
        <div className="wb-dw-meta">
          {[["最新版", "v" + r.latest + "（" + r.latestDate.replace(/-/g, "/") + "）"], ["Node", r.engines.replace(">=", "≥ ") + (r.needsNode ? "　目前 " + r.userNode + "，需先升級" : "")], ["大小", r.size + " ・ " + r.files + " 個檔案"], ["檢查", u.checkedAt ? updAgo(u.checkedAt) : "—"]].map(([k, v]) => (
            <div key={k} className="wb-dw-mrow"><span className="wb-dw-mk">{k}</span><span className="wb-dw-mv">{v}</span></div>
          ))}
        </div>
      </div>
      <div className="upd-dw-f">
        <a href={UPD_GH} target="_blank" rel="noopener" className="upd-gh">到 GitHub 看完整 CHANGELOG ↗</a>
        {has && !r.deprecated ? (skipped
          ? <button className="wb-btn-ghost" onClick={updUnskip}>恢復這一版的提醒</button>
          : <button className="wb-btn-ghost" onClick={() => updSkip(r.latest)} title="不再為這一版跳通知與顯示 Rail 圓點">略過這一版</button>) : null}
      </div>
    </>
  );
}
function PtUpdDrawer() {
  const u = useUpd();
  React.useEffect(() => {
    if (!u.drawer) return;
    const h = (e) => { if (e.key === "Escape") { e.stopPropagation(); updCloseDrawer(); } };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [u.drawer]);
  if (!u.drawer || !u.res) return null;
  return (
    <>
      <button className="wb-scrim" onClick={updCloseDrawer} aria-label="關閉" />
      <aside className="wb-drawer upd-dw" role="dialog" aria-label="更新內容"><UpdDrawerPanel u={u} env={updEnv()} onClose={updCloseDrawer} /></aside>
    </>
  );
}

// ── 發現新版的 toast（同一版只出現一次） ──
function UpdToastView({ r, mode, onOpen, onSkip, onClose, isStatic }) {
  const dep = !!r.deprecated, deploy = mode === "deploy";
  const title = dep ? `你使用的 v${r.cur} 已被棄用` : deploy ? `此站使用的 NoteCraftApp 有新版 v${r.latest}` : `NoteCraftApp v${r.latest} 已發佈`;
  const sub = dep ? `建議升級到 v${r.latest}，原因見更新內容` : r.level === "major" ? `主版本更新，可能有破壞性變更 ・ 落後 ${r.behind} 個版本` : `目前 v${r.cur} ・ 落後 ${r.behind} 個版本`;
  return (
    <div className={"upd-toast" + (isStatic ? " static" : "")} role="status">
      <span className="upd-toast-ic" style={{ color: dep ? "var(--upd-danger)" : "var(--orange-400)" }}><Ic n={dep ? "warn" : "arrowUp"} s={17} sw={2} /></span>
      <div className="upd-toast-b">
        <div className="upd-toast-t">{title}</div>
        <div className="upd-toast-s">{sub}</div>
        <div className="upd-toast-a">
          <button className="pri" onClick={onOpen}>查看更新內容</button>
          {!dep ? <button onClick={onSkip}>略過這一版</button> : null}
        </div>
      </div>
      <button className="upd-toast-x" onClick={onClose} aria-label="關閉通知"><Ic n="close" s={13} /></button>
    </div>
  );
}
function PtUpdToast() {
  const u = useUpd();
  const hover = React.useRef(false);
  React.useEffect(() => {
    if (!u.toast) return;
    const h = (e) => { if (e.key === "Escape" && !updStore.s.drawer) updCloseToast(); };
    window.addEventListener("keydown", h);
    const id = setInterval(() => { if (!hover.current) { clearInterval(id); updCloseToast(); } }, 10000);
    return () => { window.removeEventListener("keydown", h); clearInterval(id); };
  }, [u.toast]);
  if (!u.toast) return null;
  return (
    <div className="upd-toast-wrap" onMouseEnter={() => (hover.current = true)} onMouseLeave={() => (hover.current = false)} onFocus={() => (hover.current = true)} onBlur={() => (hover.current = false)}>
      <UpdToastView r={u.toast} mode={updEnv().mode} onOpen={updOpenDrawer} onSkip={() => updSkip(u.toast.latest)} onClose={updCloseToast} />
    </div>
  );
}

// Rail 的「設定與關於」圓點：被略過的版本不顯示（已棄用例外）
function useUpdRail() {
  const u = useUpd();
  const r = u.res, tone = updTone(r);
  if (!tone) return null;
  if (u.skipped === r.latest && !r.deprecated) return null;
  return { tone, n: r.behind, label: r.deprecated ? `目前版本 v${r.cur} 已棄用` : `有新版 v${r.latest}，落後 ${r.behind} 個版本` };
}

Object.assign(window, { PtUpdBlock, PtUpdDrawer, PtUpdToast, UpdDrawerPanel, UpdToastView, UpdCmds, UpdCmd, useUpdRail });
