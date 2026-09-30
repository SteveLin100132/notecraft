const { useState: useDvState, useEffect: useDvEffect, useRef: useDvRef } = React;
const DV_WD = ["日", "一", "二", "三", "四", "五", "六"];
const dvHatch = (fg, bg) => `repeating-linear-gradient(135deg,${fg} 0 1.6px,${bg} 1.6px 5px)`;
const DV_RS = [
  { k: "done", l: "已完成", c: "#1b4f9c", bg: "#1b4f9c", svg: "#1b4f9c" },
  { k: "reading", l: "閱讀中", c: "#ed9b26", bg: dvHatch("#ed9b26", "#fdf1de"), svg: "url(#dvp-reading)" },
  { k: "not-started", l: "待開始", c: "#2c6ebb", bg: dvHatch("#7fa6d8", "#eaf1fb"), svg: "url(#dvp-ns)" },
  { k: "unpublished", l: "未發佈", c: "#b3bccb", bg: dvHatch("#c3cad6", "#f3f5f8"), svg: "url(#dvp-un)" },
];
function DvPatterns() {
  const p = (id, fg, bg) => (
    <pattern key={id} id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" fill={bg} /><rect width="1.6" height="5" fill={fg} />
    </pattern>
  );
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs>{p("dvp-reading", "#ed9b26", "#fdf1de")}{p("dvp-ns", "#7fa6d8", "#eaf1fb")}{p("dvp-un", "#c3cad6", "#f3f5f8")}</defs></svg>;
}
const dvIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dvAdd = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dvMd = (s) => { const d = new Date(s + "T00:00:00"); return `${d.getMonth() + 1}/${d.getDate()}`; };
const dvRsCount = (rows) => DV_RS.map((s) => ({ ...s, v: rows.filter((r) => window.readingStatus(r.slug) === s.k).length }));

function DvCard({ title, sub, right, children, cls }) {
  return (
    <section className={"dv-card " + (cls || "")}>
      {title ? <header className="dv-card-h"><div><h3>{title}</h3>{sub ? <p>{sub}</p> : null}</div>{right}</header> : null}
      {children}
    </section>
  );
}
function DvSeg({ opts, on, set }) {
  return <div className="dv-seg">{opts.map((o) => <button key={o} className={o === on ? "on" : ""} onClick={() => set(o)}>{o}</button>)}</div>;
}
function DvRing({ parts, size }) {
  const S = size || 84, R = S / 2 - 8, C = 2 * Math.PI * R, tot = parts.reduce((a, p) => a + p.v, 0);
  let off = 0;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="dv-ring">
      <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke="var(--wb-line-2)" strokeWidth="12" />
      {tot ? parts.filter((p) => p.v).map((p) => {
        const len = (p.v / tot) * C, gap = parts.filter((x) => x.v).length > 1 ? 2 : 0;
        const el = <circle key={p.k} cx={S / 2} cy={S / 2} r={R} fill="none" stroke={p.svg} strokeWidth="12" strokeDasharray={`${Math.max(len - gap, 0)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${S / 2} ${S / 2})`} />;
        off += len; return el;
      }) : null}
    </svg>
  );
}
function DvStatKpi({ label, value, rows }) {
  const parts = dvRsCount(rows);
  return (
    <DvCard cls="dv-kpi">
      <div className="dv-kpi-l">{label}</div>
      <div className="dv-kpi-body">
        <span className="dv-kpi-n tnum">{value}</span>
        <DvRing parts={parts} />
      </div>
      <div className="dv-kpi-rs">{parts.filter((p) => p.k !== "unpublished" || p.v).map((p) => <span key={p.k} title={p.l}><i style={{ background: p.bg }} />{p.l}<b className="tnum">{p.v}</b></span>)}</div>
    </DvCard>
  );
}

function DvFreq({ rows, latest }) {
  const [range, setRange] = useDvState("12 週");
  const n = parseInt(range, 10);
  const weeks = Array.from({ length: n }, (_, i) => {
    const end = dvAdd(latest, -7 * (n - 1 - i)), start = dvAdd(end, -6);
    const rs = rows.filter((r) => { const t = new Date(r.updated + "T00:00:00"); return t >= start && t <= end; });
    return { label: `${end.getMonth() + 1}/${end.getDate()}`, parts: dvRsCount(rs), tot: rs.length };
  });
  const top = Math.max(2, ...weeks.map((w) => w.tot));
  const every = Math.ceil(n / 6);
  return (
    <DvCard cls="dv-freq" title="寫作頻率" right={<DvSeg opts={["8 週", "12 週", "16 週"]} on={range} set={setRange} />}>
      <div className="dv-legend">{DV_RS.map((s) => <span key={s.k}><i style={{ background: s.bg }} />{s.l}</span>)}</div>
      <div className="dv-chart">
        <div className="dv-chart-y tnum"><span style={{ top: 0 }}>{top}</span><span style={{ top: "50%" }}>{Math.round(top / 2)}</span><span style={{ top: "100%" }}>0</span></div>
        <div className="dv-chart-p">
          {[0, 50, 100].map((p) => <i key={p} className="dv-gl" style={{ top: `calc((100% - 18px) * ${p / 100})` }} />)}
          {weeks.map((w, i) => (
            <div key={i} className="dv-col" title={`${w.label} 當週更新 ${w.tot} 篇：` + w.parts.filter((p) => p.v).map((p) => `${p.l} ${p.v}`).join("、")}>
              <div className="dv-col-up">
                <div className="dv-stack" style={{ height: (w.tot / top) * 100 + "%" }}>{w.parts.map((p) => p.v ? <span key={p.k} style={{ flex: p.v, background: p.bg }} /> : null)}</div>
              </div>
              <em className="tnum">{(n - 1 - i) % every === 0 ? w.label : ""}</em>
            </div>
          ))}
        </div>
      </div>
    </DvCard>
  );
}

function DvTimeline({ rows, onSel, onRoute }) {
  const list = rows.slice(0, 7);
  return (
    <DvCard cls="dv-tl" title="最近更新" sub={`最新 ${list.length} 篇`} right={<button className="dv-link" onClick={() => onRoute("notes")}>查看全部</button>}>
      <ol className="dv-tl-list">
        {list.map((r) => {
          const extra = r.tags.length - 2;
          return (
            <li key={r.slug}>
              <span className="dv-tl-dot" style={{ "--c": window.FOLDER_COLOR[r.folder] || "#8b9aad" }} />
              <button className="dv-tl-node" onClick={() => onSel(r.slug)}>
                <span className="dv-tl-t">{r.title}</span>
                <span className="dv-tl-top"><span className="dv-tl-path">{r.path}</span><span className="dv-tl-d tnum">{dvMd(r.updated)}</span></span>
                {r.note.description ? <span className="dv-tl-desc">{r.note.description}</span> : null}
                <span className="dv-tl-meta">
                  {r.tags.slice(0, 2).map((t) => <span key={t} className="dv-tag">{t}</span>)}
                  {extra > 0 ? <span className="dv-tag more">+{extra}</span> : null}
                  {r.markers.length ? <span className={"dv-ai" + (r.ai[1] ? " warn" : "")}><Ic n="sparkle" s={12} />AI {r.ai[0]}/{r.markers.length}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </DvCard>
  );
}

function DvSeries({ onOpen, onSeries, onRoute }) {
  const list = window.SERIES.map((s) => ({ s, p: window.seriesProgress(s), color: ({ orange: "#ed9b26", blue: "#2c6ebb", navy: "#163f7d", green: "#2e9e6b" })[s.accent] || "#2c6ebb" }));
  return (
    <DvCard cls="dv-sl" title="系列" sub={`共 ${list.length} 個系列`} right={<button className="dv-link" onClick={() => onRoute("series")}>查看全部</button>}>
      <div className="dv-sl-list">
        {list.map(({ s, p, color }) => {
          const next = p.completed ? null : p.next;
          return (
            <div key={s.id} className="dv-sl-row">
              <div className="dv-sl-top">
                <button className="dv-sl-n" onClick={() => onSeries(s.id)}><span className="dv-sw" style={{ background: color }} />{s.title}</button>
                <span className="dv-sl-c tnum"><b>{p.done}</b>／{p.tracked} 篇</span>
              </div>
              <div className="dv-sl-bar" title={`已完成 ${p.done}・閱讀中 ${p.reading}・待開始 ${p.notStarted}`}>
                <i style={{ width: (p.tracked ? p.done / p.tracked : 0) * 100 + "%", background: color }} />
                <i className="rd" style={{ width: (p.tracked ? p.reading / p.tracked : 0) * 100 + "%", background: color }} />
              </div>
              <div className="dv-sl-foot">
                {next ? <><span className="dv-sl-next"><span>下一篇</span>{next.title}</span>
                  <button className="dv-btn" onClick={() => (next.kind === "note" ? onOpen(next.ref) : onSeries(s.id))}>{p.started ? "繼續閱讀" : "開始閱讀"}<Ic n="chevronRight" s={13} /></button></>
                  : <span className="dv-sl-done"><Ic n="check" s={13} />已全部閱讀</span>}
              </div>
            </div>
          );
        })}
      </div>
    </DvCard>
  );
}

function dvTreemap(items, x, y, w, h, out) {
  if (!items.length) return out;
  if (items.length === 1) { out.push({ ...items[0], x, y, w, h }); return out; }
  const tot = items.reduce((a, i) => a + i.v, 0);
  let acc = 0, k = 0;
  while (k < items.length - 1 && acc + items[k].v <= tot / 2) { acc += items[k].v; k++; }
  if (k === 0) { acc = items[0].v; k = 1; }
  const a = items.slice(0, k), b = items.slice(k), r = acc / tot;
  if (w >= h) { dvTreemap(a, x, y, w * r, h, out); dvTreemap(b, x + w * r, y, w * (1 - r), h, out); }
  else { dvTreemap(a, x, y, w, h * r, out); dvTreemap(b, x, y + h * r, w, h * (1 - r), out); }
  return out;
}
const DV_TILE = [
  { bg: "#1b4f9c", fg: "#fff" },
  { bg: "#2c6ebb", fg: "#fff" },
  { bg: "repeating-linear-gradient(135deg,#ed9b26 0 1.6px,#fdf1de 1.6px 6px)", fg: "#7a4a08" },
  { bg: "#eaf1fb", fg: "#1b4f9c" },
  { bg: "repeating-linear-gradient(135deg,#9dbde6 0 1.6px,#f3f7fd 1.6px 6px)", fg: "#163f7d" },
  { bg: "#fdf1de", fg: "#8a560c" },
];
function DvTags({ onTag, onRoute }) {
  const all = window.tagStats().filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  const MAX = 11;
  const top = all.slice(0, MAX).map((t) => ({ k: t.name, v: t.count }));
  const rest = all.slice(MAX);
  if (rest.length) top.push({ k: "__rest", l: `其他 ${rest.length} 個`, v: rest.reduce((a, t) => a + t.count, 0) });
  const tiles = dvTreemap(top, 0, 0, 100, 100, []);
  const [hov, setHov] = useDvState(null);
  const [tip, setTip] = useDvState(null);
  const [sz, setSz] = useDvState({ w: 0, h: 0 });
  const tmRef = useDvRef(null);
  useDvEffect(() => {
    const el = tmRef.current; if (!el) return;
    const upd = () => { const r = el.getBoundingClientRect(); setSz((p) => (p.w === r.width && p.h === r.height ? p : { w: r.width, h: r.height })); };
    upd(); const raf = requestAnimationFrame(upd);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(upd) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", upd);
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); window.removeEventListener("resize", upd); };
  }, []);
  const tot = all.reduce((a, t) => a + t.count, 0);
  const moveTip = (e, t) => setTip({ x: e.clientX, y: e.clientY, l: t.l || "#" + t.k, v: t.v, p: Math.round((t.v / tot) * 100) });
  return (
    <DvCard cls="dv-tags" title="標籤分布" sub={`${all.length} 個標籤・共標記 ${tot} 次`} right={<button className="dv-link" onClick={() => onRoute("tags")}>查看全部</button>}>
      <div className="dv-tm" ref={tmRef} onMouseLeave={() => { setHov(null); setTip(null); }}>
        {tiles.map((t, i) => {
          const s = t.k === "__rest" ? { bg: "var(--wb-bg)", fg: "var(--wb-ink-3)" } : DV_TILE[Math.min(i, DV_TILE.length - 1) === i ? i : 3 + (i % 3)];
          const pw = (t.w / 100) * (sz.w || 360), ph = (t.h / 100) * (sz.h || 220);
          const big = pw >= 120 && ph >= 84, full = pw >= 60 && ph >= 42, num = pw >= 24 && ph >= 22;
          return (
            <button key={t.k} className={"dv-tile" + (hov && hov !== t.k ? " dim" : "") + (big ? " big" : "") + (!full && num ? " num" : "")}
              style={{ left: t.x + "%", top: t.y + "%", width: t.w + "%", height: t.h + "%", background: s.bg, color: s.fg }}
              aria-label={`${t.l || t.k}：${t.v} 篇`} onMouseEnter={(e) => { setHov(t.k); moveTip(e, t); }} onMouseMove={(e) => moveTip(e, t)}
              onClick={() => (t.k === "__rest" ? onRoute("tags") : onTag(t.k))}>
              {full ? <><span className="dv-tile-n">{t.l || "#" + t.k}</span><b className="tnum">{t.v}</b></> : num ? <b className="tnum">{t.v}</b> : null}
            </button>
          );
        })}
        {tip ? <div className="dv-tip" style={{ left: Math.min(tip.x + 12, window.innerWidth - 180), top: tip.y + 14 }}><b>{tip.l}</b><span className="tnum">{tip.v} 篇・{tip.p}%</span></div> : null}
      </div>
    </DvCard>
  );
}

function DvLog({ rows, latest, onSel, onRoute }) {
  const [off, setOff] = useDvState(0);
  const [pick, setPick] = useDvState(null);
  const end = dvAdd(latest, -7 * off), days = Array.from({ length: 7 }, (_, i) => dvAdd(end, i - 6));
  const inWeek = rows.filter((r) => { const t = new Date(r.updated + "T00:00:00"); return t >= days[0] && t <= end; });
  const list = inWeek.filter((r) => !pick || r.updated === pick);
  const go = (d) => { setOff(Math.max(0, off + d)); setPick(null); };
  return (
    <DvCard cls="dv-log" title="更新日誌" sub={`${off ? "該週" : "本週"}共更新 ${inWeek.length} 篇筆記`}>
      <div className="dv-week-nav">
        <button onClick={() => go(1)} aria-label="上一週"><Ic n="chevronLeft" s={15} /></button>
        <span><b>7 天</b>・{days[0].getMonth() + 1}/{days[0].getDate()} – {end.getMonth() + 1}/{end.getDate()}</span>
        <button disabled={!off} onClick={() => go(-1)} aria-label="下一週"><Ic n="chevronRight" s={15} /></button>
      </div>
      <div className="dv-days">
        {days.map((d, i) => {
          const s = dvIso(d), has = inWeek.some((r) => r.updated === s);
          return (
            <button key={i} className={(pick === s ? "on " : "") + (has ? "has" : "")} onClick={() => setPick(pick === s ? null : s)}>
              <b className="tnum">{String(d.getDate()).padStart(2, "0")}</b><span>{DV_WD[d.getDay()]}</span>
            </button>
          );
        })}
      </div>
      <div className="dv-log-list">
        {list.map((r) => (
          <button key={r.slug} className="dv-ev" onClick={() => onSel(r.slug)}>
            <span className="dv-ev-t"><i style={{ background: window.FOLDER_COLOR[r.folder] || "#8b9aad" }} />{r.title}</span>
            <span className="dv-ev-s tnum"><span>{dvMd(r.updated)}</span>{r.series ? <span className="dv-ev-sr"><Ic n="bookOpen" s={11} />{r.series.title}</span> : null}<span><Ic n="tag" s={11} />{r.tags.length}</span><span><Ic n="sparkle" s={11} />{r.ai[0]}/{r.markers.length}</span></span>
          </button>
        ))}
        {!list.length ? <div className="dv-empty">這段期間沒有更新的筆記</div> : null}
      </div>
      <button className="dv-full" onClick={() => onRoute("notes")}>查看全部筆記</button>
    </DvCard>
  );
}

function PtOverview({ onSel, onOpen, onSeries, onRoute, onTag }) {
  const [, force] = useDvState(0);
  useDvEffect(() => (window.ncSubscribe ? window.ncSubscribe(() => force((x) => x + 1)) : undefined), []);
  const rows = window.ptRows();
  const markers = rows.flatMap((r) => r.markers);
  const pendN = markers.filter((m) => m.status !== "generated").length;
  const latest = new Date(rows.reduce((a, r) => (r.updated > a ? r.updated : a), rows[0].updated) + "T00:00:00");
  const week = rows.filter((r) => new Date(r.updated + "T00:00:00") > dvAdd(latest, -7));
  const pendNotes = rows.filter((r) => r.ai[1]).length;
  return (
    <div className="wb-body dv-body">
      <DvPatterns />
      <div className="dv-wrap">
        <div className="dv-row1">
          <DvStatKpi label="筆記總數" value={rows.length} rows={rows} />
          <DvStatKpi label="本週更新" value={week.length} rows={week} />
          <DvCard cls="dv-kpi dv-kpi-ai">
            <svg className="dv-spark" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="dvg-ai" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ed9b26" stopOpacity=".22" /><stop offset="1" stopColor="#ed9b26" stopOpacity="0" /></linearGradient>
                <linearGradient id="dvg-fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".45" stopColor="#fff" stopOpacity=".25" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></linearGradient>
                <mask id="dvm-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="80"><rect width="200" height="80" fill="url(#dvg-fade)" /></mask></defs>
              <g mask="url(#dvm-fade)" stroke="var(--wb-line)" strokeWidth="1">{[16, 32, 48, 64].map((y) => <line key={"h" + y} x1="0" x2="200" y1={y} y2={y} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />)}{[40, 80, 120, 160].map((x) => <line key={"v" + x} x1={x} x2={x} y1="0" y2="80" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />)}</g>
              <path d="M0 62 C18 58 26 44 42 48 S66 64 82 52 S108 26 124 34 S150 50 164 30 S188 14 200 18 L200 80 L0 80 Z" fill="url(#dvg-ai)" />
              <path d="M0 62 C18 58 26 44 42 48 S66 64 82 52 S108 26 124 34 S150 50 164 30 S188 14 200 18" fill="none" stroke="#ed9b26" strokeOpacity=".45" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="dv-kpi-hd"><span className="dv-kpi-l">AI 待生成</span><button className="dv-link" onClick={() => onRoute("ai")}>前往佇列</button></div>
            <div className="dv-kpi-body"><span className="dv-kpi-n tnum warn">{pendN}</span></div>
            <div className="dv-kpi-rs"><span>分布於 <b className="tnum">{pendNotes}</b> 篇筆記</span></div>
          </DvCard>
          <DvFreq rows={rows} latest={latest} />
        </div>
        <div className="dv-row2">
          <DvTimeline rows={rows} onSel={onSel} onRoute={onRoute} />
          <div className="dv-midcol">
            <DvSeries onOpen={onOpen} onSeries={onSeries} onRoute={onRoute} />
            <DvTags onTag={onTag || (() => onRoute("tags"))} onRoute={onRoute} />
          </div>
          <DvLog rows={rows} latest={latest} onSel={onSel} onRoute={onRoute} />
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { PtOverview, DV_RS });
