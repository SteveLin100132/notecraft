// NoteCraft — define / include / :ref 元件 + 預覽卡控制器 + 反向連結
const { useState: rfUS, useEffect: rfUE, useRef: rfUR, useLayoutEffect: rfULE, useContext: rfUC } = React;
Object.assign(PT_ICONS, {
  hash: "M5 9h14M5 15h14M10 4 8 20M16 4l-2 16",
  corner: "M6 5v6a4 4 0 0 0 4 4h9M15 11l4 4-4 4",
  pin: "M9 4h6l-1 6 3 3v1H7v-1l3-3zM12 14v6",
  chevDown: "M6 9l6 6 6-6",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
});
const RfCtx = React.createContext(null);
const rfSlug = (s) => s.replace(/[^\w\u4e00-\u9fff]+/g, "-");
const rfDefHref = (id) => "/notes/" + RF_DEFS[id].src + "#def-" + id;

// ── 共用 Esc 堆疊：Palette 50 → Modal 40 → 浮層（預覽卡／反向連結）30 → Drawer 20 → Sidebar 抽屜 10 ──
const RF_LAYERS = [];
let rfLayerSeq = 0;
function useEscLayer(active, pri, close) {
  const cr = rfUR(close); cr.current = close;
  rfUE(() => {
    if (!active) return;
    const l = { pri, seq: ++rfLayerSeq, close: () => cr.current() };
    RF_LAYERS.push(l);
    return () => { const i = RF_LAYERS.indexOf(l); if (i >= 0) RF_LAYERS.splice(i, 1); };
  }, [active, pri]);
}
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !RF_LAYERS.length) return;
  const top = RF_LAYERS.reduce((a, b) => (b.pri > a.pri || (b.pri === a.pri && b.seq > a.seq) ? b : a));
  e.preventDefault(); e.stopPropagation(); top.close();
}, true);

// ── Inline ──
function RfTip({ t, d }) {
  const [o, setO] = rfUS(false);
  const id = React.useId();
  return (
    <span className="nc-tip" tabIndex={0} aria-describedby={o ? id : undefined}
      onMouseEnter={() => setO(true)} onMouseLeave={() => setO(false)} onFocus={() => setO(true)} onBlur={() => setO(false)}>
      {t}{o ? <span role="tooltip" id={id} className="nc-tip-bub">{d}</span> : null}
    </span>
  );
}
function RfRef({ id, t, ctx }) {
  const pc = rfUC(RfCtx);
  const el = rfUR(null);
  if (ctx && ctx.preview) return <span className="nc-ref is-static">{t}</span>;
  const on = !!(pc.pop && pc.pop.kind === "pv" && el.current && pc.pop.el === el.current);
  return (
    <a ref={el} className={"nc-ref" + (on ? " on" : "")} href={rfDefHref(id)} data-ref={id}
      aria-haspopup="dialog" aria-expanded={on} aria-controls={on ? "rf-pop" : undefined}
      onMouseEnter={() => pc.hover(el.current, id)} onMouseLeave={pc.leave}
      onFocus={() => pc.focus(el.current, id)} onBlur={pc.blur}
      onClick={(e) => {
        e.preventDefault();
        if (e.metaKey || e.ctrlKey || e.shiftKey) { pc.toast("正式版會在新分頁開啟 " + rfDefHref(id)); return; }
        pc.click(el.current, id);
      }}>{t}</a>
  );
}
function RfInline({ c, ctx }) {
  const pc = rfUC(RfCtx);
  if (typeof c === "string") return c;
  return c.map((x, i) => {
    if (typeof x === "string") return <React.Fragment key={i}>{x}</React.Fragment>;
    if (Array.isArray(x)) return <RfInline key={i} c={x} ctx={ctx} />;
    if (x.b) return <strong key={i}>{x.b}</strong>;
    if (x.code) return <code key={i} className="nc-code-i">{x.code}</code>;
    if (x.badge) return <span key={i} className="nc-badge">{x.badge}</span>;
    if (x.a) return <a key={i} className="nc-a" href="#" onClick={(e) => { e.preventDefault(); pc.toast("一般連結：" + x.a); }}>{x.a}</a>;
    if (x.tip) return <RfTip key={i} t={x.tip} d={x.d} />;
    if (x.ref) return <RfRef key={i} id={x.ref} t={x.t} ctx={ctx} />;
    return null;
  });
}

// ── Blocks ──
const rfMinLv = (blocks) => { let m = 9; window.rfWalk(blocks, (b) => { if (/^h[2-4]$/.test(b.t)) m = Math.min(m, +b.t[1]); }); return m; };
function RfTabs({ tabs, ctx }) {
  const [i, setI] = rfUS(0);
  const base = React.useId();
  const refs = rfUR([]);
  const key = (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
    e.preventDefault(); const n = (i + d + tabs.length) % tabs.length; setI(n); refs.current[n] && refs.current[n].focus();
  };
  return (
    <div className="nc-tabs">
      <div className="nc-tablist" role="tablist" onKeyDown={key}>
        {tabs.map((t, j) => (
          <button key={j} ref={(r) => (refs.current[j] = r)} role="tab" id={ctx.preview ? undefined : base + "t" + j} aria-selected={i === j} tabIndex={i === j ? 0 : -1}
            aria-controls={ctx.preview ? undefined : base + "p" + j} className="nc-tabbtn" onClick={() => setI(j)}>{t.l}</button>
        ))}
      </div>
      <div className="nc-tabpanel" role="tabpanel" id={ctx.preview ? undefined : base + "p" + i} aria-labelledby={ctx.preview ? undefined : base + "t" + i}>
        <RfBlocks blocks={tabs[i].c} ctx={ctx} />
      </div>
    </div>
  );
}
function RfCode({ b }) {
  const pc = rfUC(RfCtx);
  return (
    <div className="nc-codeblk">
      <div className="nc-codeblk-h"><span>{b.lang}</span><button className="nc-copy" onClick={() => pc.toast("已複製程式碼")}>複製</button></div>
      <pre><code>{b.c}</code></pre>
    </div>
  );
}
const RF_ADM = { note: ["about", "NOTE"], tip: ["bulb", "TIP"], warning: ["warn", "WARNING"] };
function RfBlock({ b, ctx, hostLv }) {
  switch (b.t) {
    case "h2": case "h3": case "h4": {
      const lv = Math.max(2, Math.min(4, +b.t[1] + (ctx.shift || 0)));
      if (ctx.preview) return <div className={"nc-h nc-h" + lv}>{b.c}</div>;
      const Tag = "h" + lv;
      return <Tag id={(ctx.idp || "h-") + rfSlug(b.c)} className={"nc-h nc-h" + lv}>{b.c}</Tag>;
    }
    case "p": return <p className="nc-p"><RfInline c={b.c} ctx={ctx} /></p>;
    case "ul": return <ul className="nc-ul">{b.c.map((li, j) => <li key={j}><RfInline c={li} ctx={ctx} /></li>)}</ul>;
    case "table": return (
      <div className="nc-tablewrap"><table className="nc-table">
        <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
        <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
      </table></div>
    );
    case "adm": {
      const [ic, lb] = RF_ADM[b.k] || RF_ADM.note;
      return <div className={"nc-adm k-" + b.k} role="note"><div className="nc-adm-t"><Ic n={ic} s={13} sw={2} />{lb}</div><div className="nc-adm-b"><RfBlocks blocks={b.c} ctx={ctx} /></div></div>;
    }
    case "code": return !ctx.preview && ctx.inNote !== false && window.NcCodeBlock ? <window.NcCodeBlock block={b} /> : <RfCode b={b} />;
    case "tabs": return <RfTabs tabs={b.tabs} ctx={ctx} />;
    case "steps": return (
      <ol className="nc-steps">
        {b.c.map((s, j) => <li key={j} className="nc-step"><span className="nc-step-n" aria-hidden="true">{j + 1}</span><div className="nc-step-h">{s.h}</div><div className="nc-step-d"><RfInline c={s.d} ctx={ctx} /></div></li>)}
      </ol>
    );
    case "img": return <figure className="nc-fig"><div className="nc-fig-img" style={{ height: ctx.preview ? Math.round(b.h * 0.72) : b.h }} role="img" aria-label={b.cap}>圖片：{b.cap}</div><figcaption>圖：{b.cap}</figcaption></figure>;
    case "define": return ctx.preview ? <RfBlocks blocks={RF_DEFS[b.id].blocks} ctx={ctx} /> : <RfDefine id={b.id} ctx={ctx} />;
    case "include": return <RfInclude id={b.id} ctx={ctx} hostLv={hostLv} />;
    default: return null;
  }
}
function RfBlocks({ blocks, ctx }) {
  let lv = ctx.baseLv || 1;
  return blocks.map((b, i) => {
    if (/^h[2-4]$/.test(b.t)) lv = Math.max(2, Math.min(4, +b.t[1] + (ctx.shift || 0)));
    return <RfBlock key={i} b={b} ctx={ctx} hostLv={lv} />;
  });
}

// ── 1. define ──
function RfDefine({ id, ctx }) {
  const pc = rfUC(RfCtx);
  const btn = rfUR(null);
  const d = RF_DEFS[id], refs = window.rfDefRefs(id);
  const on = !!(pc.pop && pc.pop.kind === "bl" && pc.pop.id === id);
  return (
    <section className={"nc-def" + (on ? " pop-on" : "")} id={"def-" + id} tabIndex={-1} aria-label={"定義：" + d.label}>
      <div className="nc-def-meta">
        <button className="nc-def-id" title="複製這個定義的連結" aria-label={"定義 id " + id + "，複製連結"} onClick={() => pc.toast("已複製連結 " + rfDefHref(id))}><Ic n="hash" s={12} />{id}</button>
        <span className="nc-def-sep" aria-hidden="true" />
        {refs.length ? (
          <button ref={btn} className="nc-def-cnt" aria-haspopup="dialog" aria-expanded={on} aria-controls={on ? "rf-pop" : undefined} onClick={() => pc.openBl(btn.current, id)}>
            被 <b>{refs.length}</b> 篇引用<Ic n="chevDown" s={11} sw={2} />
          </button>
        ) : <span className="nc-def-cnt zero">尚未被引用</span>}
      </div>
      <div className="nc-def-body"><RfBlocks blocks={d.blocks} ctx={{ ...ctx, shift: 0, idp: "h-" }} /></div>
    </section>
  );
}

// ── 2. include ──
function RfInclude({ id, ctx, hostLv }) {
  const pc = rfUC(RfCtx);
  const d = RF_DEFS[id], src = window.rfNote(d.src);
  const mn = rfMinLv(d.blocks);
  const shift = mn < 9 ? Math.min(4, (hostLv || 1) + 1) - mn : 0;
  if (ctx.preview) return <RfBlocks blocks={d.blocks} ctx={ctx} />;
  return (
    <div className="nc-inc" data-include={id} role="group" aria-label={"嵌入內容：" + d.label + "，來自 " + src.title}>
      <div className="nc-inc-src">
        <Ic n="corner" s={12} />
        <span>嵌入自</span><span className="t">{src.title}</span>
        {pc.dev ? <><span className="dot">·</span><span className="id">{id}</span></> : null}
        <a className="nc-inc-go" href={rfDefHref(id)} onClick={(e) => { e.preventDefault(); pc.goDef(id); }}>前往來源<Ic n="arrowUpRight" s={11} sw={2} /></a>
      </div>
      <div className="nc-inc-body"><RfBlocks blocks={d.blocks} ctx={{ ...ctx, shift, idp: "inc-" + id + "-", baseLv: hostLv }} /></div>
    </div>
  );
}

// ── TOC：嵌入內容的標題計入，id 加 inc-<defId>- 前綴 ──
function rfToc(note) {
  const out = []; let lv = 1;
  const walk = (blocks, shift, idp, inc) => blocks.forEach((b) => {
    if (/^h[2-4]$/.test(b.t)) {
      const l = Math.max(2, Math.min(4, +b.t[1] + shift)); if (!inc) lv = l;
      out.push({ id: idp + rfSlug(b.c), label: b.c, lv: l, inc });
    }
    if (b.t === "define") walk(RF_DEFS[b.id].blocks, 0, "h-", false);
    if (b.t === "include") {
      const mn = rfMinLv(RF_DEFS[b.id].blocks); if (mn < 9) walk(RF_DEFS[b.id].blocks, Math.min(4, lv + 1) - mn, "inc-" + b.id + "-", true);
    }
  });
  walk(note.blocks, 0, "h-", false);
  return out;
}

// ── 3. 預覽卡 / 反向連結 popover 控制器 ──
function useRfPop({ sheetMode, clickMode, goDef, toast, dev, onNote }) {
  const [pop, setPopS] = rfUS(null);
  const popRef = rfUR(null);
  const tOpen = rfUR(0), tClose = rfUR(0), suppress = rfUR(null);
  const setPop = (p) => { popRef.current = p; setPopS(p); };
  const clear = () => { clearTimeout(tOpen.current); clearTimeout(tClose.current); };
  const close = (restore) => { const p = popRef.current; clear(); setPop(null); if (restore && p && p.el && document.contains(p.el)) { suppress.current = p.el; p.el.focus({ preventScroll: true }); } };
  const softClose = () => { clearTimeout(tClose.current); tClose.current = setTimeout(() => { const p = popRef.current; if (p && !p.pinned) setPop(null); }, 150); };
  const api = {
    pop, dev, toast, goDef: (id) => { close(false); goDef(id); }, onNote: (s) => { close(false); onNote(s); },
    hover(el, id) {
      if (sheetMode) return; clearTimeout(tClose.current);
      const p = popRef.current; if (p && (p.el === el || p.pinned)) return;
      clearTimeout(tOpen.current); tOpen.current = setTimeout(() => setPop({ kind: "pv", id, el, pinned: false, via: "hover" }), 300);
    },
    leave() { clearTimeout(tOpen.current); const p = popRef.current; if (p && !p.pinned) softClose(); },
    focus(el, id) {
      if (suppress.current === el) { suppress.current = null; return; }
      suppress.current = null;
      if (sheetMode || !el.matches(":focus-visible")) return; clearTimeout(tClose.current);
      const p = popRef.current; if (p && p.el === el) return;
      clearTimeout(tOpen.current); tOpen.current = setTimeout(() => setPop({ kind: "pv", id, el, pinned: false, via: "focus" }), 150);
    },
    blur() { clearTimeout(tOpen.current); const p = popRef.current; if (p && !p.pinned) softClose(); },
    click(el, id) {
      clear();
      if (sheetMode) { setPop({ kind: "pv", id, el, pinned: true, sheet: true }); return; }
      if (clickMode === "nav") { api.goDef(id); return; }
      const p = popRef.current;
      if (p && p.el === el && p.pinned) { close(false); return; }
      setPop({ kind: "pv", id, el, pinned: true, via: "click", focus: true });
    },
    openBl(el, id) {
      clear(); const p = popRef.current;
      if (p && p.kind === "bl" && p.id === id) { close(false); return; }
      setPop({ kind: "bl", id, el, pinned: true, sheet: sheetMode, focus: true });
    },
    cardEnter() { clearTimeout(tClose.current); },
    cardLeave() { const p = popRef.current; if (p && !p.pinned) softClose(); },
    pin() { const p = popRef.current; if (p && !p.pinned) setPop({ ...p, pinned: true }); },
    close,
  };
  useEscLayer(!!pop, 30, () => close(true));
  rfUE(() => { if (pop && pop.sheet !== undefined && !sheetMode && pop.sheet) close(false); }, [sheetMode]);
  // 釘選後點外面關閉
  rfUE(() => {
    if (!pop || !pop.pinned || pop.sheet) return;
    const h = (e) => { const c = document.getElementById("rf-pop"); if (c && c.contains(e.target)) return; if (pop.el && pop.el.contains(e.target)) return; close(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pop]);
  return api;
}

function RfPvBody({ id, sheet, expanded, setExpanded }) {
  const body = rfUR(null);
  const [over, setOver] = rfUS(false);
  rfULE(() => { if (!sheet && !expanded && body.current) setOver(body.current.scrollHeight > body.current.clientHeight + 2); }, [id, expanded, sheet]);
  return (
    <>
      <div ref={body} className={"nc-pv-b" + (expanded ? " x" : "") + (over && !expanded ? " clip" : "")} tabIndex={expanded ? 0 : undefined} aria-label={expanded ? "定義內容" : undefined}>
        <div className="nc-flow"><RfBlocks blocks={RF_DEFS[id].blocks} ctx={{ preview: true }} /></div>
      </div>
      {over && !expanded ? <button className="nc-pv-more" onClick={() => setExpanded(true)}><Ic n="chevDown" s={12} sw={2} />看完整內容</button> : null}
    </>
  );
}
function RfPopHead({ title, id, pinned, onClose, tid }) {
  return (
    <div className="nc-pop-h">
      <div className="nc-pop-hl">
        <div className="nc-pop-t" id={tid}>{title}</div>
        <div className="nc-pop-id"><Ic n="hash" s={11} />{id}</div>
      </div>
      {pinned && onClose ? <button className="wb-dw-x" onClick={onClose} aria-label="關閉"><Ic n="close" s={14} /></button> : null}
    </div>
  );
}
function RfBlBody({ id, sheet, onPick }) {
  const pc = rfUC(RfCtx);
  const refs = window.rfDefRefs(id);
  const [q, setQ] = rfUS("");
  const many = refs.length >= 10;
  const rows = refs.filter((r) => !q.trim() || (r.note.title + r.note.folder).toLowerCase().includes(q.trim().toLowerCase()));
  const d = RF_DEFS[id];
  return (
    <>
      {many ? <label className="nc-bl-q"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={"篩選 " + refs.length + " 篇筆記…"} aria-label="篩選引用的筆記" /></label> : null}
      <div className="nc-bl-pl" role="list">
        {rows.length ? rows.map((r) => (
          <button key={r.slug} role="listitem" className="nc-bl-pi" onClick={() => onPick(r.slug)}>
            <Ic n="doc" s={14} c="var(--wb-ink-3)" />
            <span className="l"><div className="t">{r.note.title}</div><div className="f">{r.note.folder}</div></span>
            {r.kinds.map((k) => <span key={k} className="nc-kind"><Ic n={k === "inc" ? "corner" : "hash"} s={10} />{k === "inc" ? "嵌入" : "行內"}</span>)}
          </button>
        )) : <div className="nc-bl-none">沒有符合「{q}」的筆記</div>}
      </div>
      {pc.dev ? (
        <div className="nc-pop-acts">
          <button className="wb-mini" onClick={() => pc.toast("已複製 ::include{id=\"" + id + "\"}")}>複製 include 語法</button>
          <button className="wb-mini" onClick={() => pc.toast("已複製 :ref[" + d.label + "]{id=\"" + id + "\"}")}>複製 ref 語法</button>
        </div>
      ) : null}
    </>
  );
}

function RfPopLayer() {
  const pc = rfUC(RfCtx);
  const pop = pc.pop;
  const card = rfUR(null);
  const [pos, setPos] = rfUS(null);
  const [expanded, setExpanded] = rfUS(false);
  rfUE(() => { setExpanded(false); }, [pop && pop.id, pop && pop.kind, pop && pop.el]);
  const place = () => {
    if (!pop || pop.sheet || !card.current || !pop.el || !document.contains(pop.el)) return;
    const rs = pop.el.getClientRects(); const r = rs.length ? rs[0] : pop.el.getBoundingClientRect();
    const rb = rs.length ? rs[rs.length - 1] : r;
    const w = card.current.offsetWidth, h = card.current.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, M = 12, G = 8;
    const below = vh - rb.bottom - G - M, above = r.top - G - M;
    const up = h > below && above > below;
    let top = up ? r.top - G - h : rb.bottom + G;
    top = Math.max(M, Math.min(top, vh - h - M));
    const left = Math.max(M, Math.min((up ? r : rb).left - 14, vw - w - M));
    const T = Math.round(top), L = Math.round(left);
    setPos((p) => (p && Math.abs(p.top - T) < 2 && Math.abs(p.left - L) < 2 && p.up === up ? p : { top: T, left: L, up }));
  };
  const placeRef = rfUR(place); placeRef.current = place;
  rfULE(() => { if (!pop) setPos(null); else place(); }, [pop, expanded]);
  rfUE(() => {
    if (!pop || pop.sheet || !card.current || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => placeRef.current()); ro.observe(card.current);
    return () => ro.disconnect();
  }, [pop]);
  rfUE(() => {
    if (!pop || pop.sheet) return;
    const h = () => { if (!pop.pinned) { const r = pop.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) { pc.close(false); return; } } place(); };
    window.addEventListener("scroll", h, true); window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  });
  rfUE(() => { if (pop && pop.focus && card.current && (pos || pop.sheet)) { card.current.focus({ preventScroll: true }); } }, [pop, !!pos]);
  if (!pop) return null;
  const isPv = pop.kind === "pv";
  const d = RF_DEFS[pop.id], src = window.rfNote(d.src);
  const n = isPv ? 0 : window.rfDefRefs(pop.id).length;
  const title = isPv ? d.label : "被 " + n + " 篇筆記引用";
  const onKey = (e) => {
    if (e.key !== "Tab" || !card.current) return;
    const f = [...card.current.querySelectorAll("button,a[href],input,[tabindex='0']")].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if ((!e.shiftKey && document.activeElement === last) || (e.shiftKey && (document.activeElement === first || document.activeElement === card.current))) { e.preventDefault(); pc.close(true); }
  };
  const foot = isPv ? (
    <div className="nc-pop-f">
      <span className="src">來自 <b>{src.title}</b> · {src.folder}</span>
      <a className={"nc-pv-go" + (pop.sheet ? " solid" : "")} href={rfDefHref(pop.id)} onClick={(e) => { e.preventDefault(); pc.goDef(pop.id); }}>開啟來源<Ic n="arrowUpRight" s={12} sw={2} /></a>
    </div>
  ) : null;
  const inner = (
    <>
      <RfPopHead tid="rf-pop-t" title={title} id={pop.id} pinned={pop.pinned} onClose={() => pc.close(true)} />
      {isPv ? <RfPvBody id={pop.id} sheet={pop.sheet} expanded={expanded} setExpanded={setExpanded} /> : <RfBlBody id={pop.id} sheet={pop.sheet} onPick={(s) => pc.onNote(s)} />}
      {foot}
    </>
  );
  if (pop.sheet) {
    return (
      <>
        <button className="nc-sheet-scrim" aria-label="關閉" onClick={() => pc.close(true)} />
        <div ref={card} id="rf-pop" className={"nc-sheet" + (isPv ? "" : " nc-bl-pop")} role="dialog" aria-modal="true" aria-labelledby="rf-pop-t" tabIndex={-1} onKeyDown={onKey}>
          <div className="nc-sheet-grip" aria-hidden="true" />
          {inner}
        </div>
      </>
    );
  }
  return (
    <div ref={card} id="rf-pop" role="dialog" aria-modal="false" aria-labelledby="rf-pop-t" tabIndex={-1}
      className={"nc-pop" + (isPv ? "" : " nc-bl-pop") + (pos ? (pos.up ? " up" : "") : " measuring")}
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}
      onMouseEnter={pc.cardEnter} onMouseLeave={pc.cardLeave} onFocus={pc.cardEnter} onMouseDown={() => isPv && pc.pin()} onKeyDown={onKey}>
      {inner}
    </div>
  );
}

// ── 4. 反向連結（筆記頁底部）──
function RfKindIcons({ kinds }) {
  return kinds.map((k) => <Ic key={k} n={k === "inc" ? "corner" : "hash"} s={10} sw={2} />);
}
function RfBacklinks({ slug, onOpen, drawer }) {
  const [f, setF] = rfUS(null);
  const [all, setAll] = rfUS(false);
  rfUE(() => { setF(null); setAll(false); }, [slug]);
  const list = window.rfBacklinks(slug);
  if (!list.length) return null;
  const defs = window.rfDefsOf(slug).map((id) => ({ id, n: window.rfDefRefs(id).length })).filter((x) => x.n);
  const rows = f ? list.filter((r) => r.ids.some((x) => x.id === f)) : list;
  const LIM = drawer ? Infinity : 6, shown = all ? rows : rows.slice(0, LIM);
  return (
    <section className={"nc-bl" + (drawer ? " in-dw" : "")} id={drawer ? undefined : "backlinks"} aria-labelledby={drawer ? undefined : "backlinks-h"} aria-label={drawer ? "引用本篇的筆記" : undefined}>
      {drawer ? null : <h2 className="nc-bl-h" id="backlinks-h">被引用<span className="n">{list.length} 篇筆記</span></h2>}
      <p className="nc-bl-sub">這些筆記引用了本篇的定義。修改定義前，先確認它們的文意仍然成立。</p>
      {defs.length > 1 ? (
        <div className="nc-bl-chips" role="group" aria-label="依定義篩選">
          <button className={"wb-chip all" + (!f ? " on" : "")} aria-pressed={!f} onClick={() => setF(null)}>全部 <b>{list.length}</b></button>
          {defs.map((x) => <button key={x.id} className={"wb-chip" + (f === x.id ? " on" : "")} aria-pressed={f === x.id} onClick={() => { setF(f === x.id ? null : x.id); setAll(false); }}>{x.id} <b>{x.n}</b></button>)}
        </div>
      ) : null}
      <ul className="nc-bl-list">
        {shown.map((r) => (
          <li key={r.note.slug}>
            <button className="nc-bl-row" onClick={() => onOpen(r.note.slug)}>
              <span style={{ minWidth: 0 }}><div className="t">{r.note.title}</div><div className="f">{r.note.folder}</div></span>
              <span className="nc-bl-ids">{r.ids.map((x) => <span key={x.id} className="nc-bl-id" title={x.kinds.map((k) => (k === "inc" ? "嵌入" : "行內引用")).join("、")}><RfKindIcons kinds={x.kinds} />{x.id}</span>)}</span>
            </button>
          </li>
        ))}
      </ul>
      {rows.length > LIM ? <button className="nc-bl-more" onClick={() => setAll(!all)} aria-expanded={all}><Ic n="chevDown" s={12} sw={2} style={{ transform: all ? "rotate(180deg)" : "none" }} />{all ? "收合" : "顯示其餘 " + (rows.length - LIM) + " 篇"}</button> : null}
      <div className="nc-bl-legend" aria-hidden="true"><span><Ic n="corner" s={10} sw={2} />嵌入</span><span><Ic n="hash" s={10} sw={2} />行內引用</span></div>
    </section>
  );
}

// 筆記頁頂端「被引用」→ 右側 Drawer（不佔正文篇幅）
function RfBlDrawer({ slug, onClose, onOpen }) {
  const ref = rfUR(null);
  const n = window.rfNote(slug), list = window.rfBacklinks(slug);
  const defs = window.rfDefsOf(slug).filter((id) => window.rfDefRefs(id).length);
  rfUE(() => { if (ref.current) ref.current.focus({ preventScroll: true }); }, [slug]);
  return (
    <>
      <button className="wb-scrim" onClick={onClose} aria-label="關閉被引用" tabIndex={-1} />
      <aside ref={ref} className="wb-drawer rf-bl-dw" role="dialog" aria-modal="false" aria-labelledby="rf-bl-dw-t" tabIndex={-1}>
        <div className="wb-dw-h"><span className="wb-crumb">{n.title} ・ 反向連結</span><button className="wb-dw-x" onClick={onClose} aria-label="關閉"><Ic n="close" s={14} /></button></div>
        <div className="wb-dw-body">
          <h2 className="wb-dw-t" id="rf-bl-dw-t">被 {list.length} 篇筆記引用</h2>
          <div className="wb-dw-pills"><span className="wb-pill">{defs.length} 個定義被引用</span></div>
          <RfBacklinks slug={slug} onOpen={onOpen} drawer />
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { RfBlDrawer, RfCtx, useEscLayer, useRfPop, RfPopLayer, RfBlocks, RfBacklinks, rfToc, rfSlug, RfKindIcons });
