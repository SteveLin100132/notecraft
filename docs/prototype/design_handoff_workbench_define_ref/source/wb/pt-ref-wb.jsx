// 工作台 Prototype — define / include / :ref 筆記頁、TOC、Drawer 摘要、Palette 定義群組
const { useState: rwUS, useEffect: rwUE } = React;

function RfToc({ items, hasBl, blN }) {
  const [act, setAct] = rwUS(null);
  rwUE(() => {
    const sc = document.querySelector(".wb-main > .wb-body"); if (!sc) return;
    const h = () => { const base = sc.getBoundingClientRect().top + 120; let cur = null; items.forEach((x) => { const el = document.getElementById(x.id); if (el && el.getBoundingClientRect().top < base) cur = x.id; }); setAct(cur); };
    sc.addEventListener("scroll", h); h();
    return () => sc.removeEventListener("scroll", h);
  }, [items]);
  const jump = (e, id) => {
    e.preventDefault(); const el = document.getElementById(id); const sc = document.querySelector(".wb-main > .wb-body"); if (!el || !sc) return;
    sc.scrollTo({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 24, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  if (!items.length) return null;
  const min = Math.min(...items.map((x) => x.lv));
  return (
    <nav className="rf-toc" aria-label="目錄">
      <div className="rf-toc-h">目錄</div>
      <div className="rf-toc-l">
        {items.map((x, i) => (
          <a key={i} href={"#" + x.id} onClick={(e) => jump(e, x.id)} className={"d" + Math.min(2, x.lv - min) + (act === x.id ? " on" : "") + (x.inc ? " inc" : "")} title={x.inc ? "嵌入的內容" : undefined}>
            {x.inc ? <Ic n="corner" s={11} sw={2} /> : null}<span>{x.label}</span>
          </a>
        ))}
        {hasBl ? <a href="#backlinks" className="bl" onClick={(e) => jump(e, "backlinks")}>被引用 · {blN}</a> : null}
      </div>
    </nav>
  );
}

function RfNotePage({ slug, fontScale, onOpenNote, onTag }) {
  const n = window.rfNote(slug), note = window.noteBySlug(slug);
  const bl = window.rfBacklinks(slug);
  const toc = window.rfToc(n);
  const fd = (s) => s.replace(/-/g, "/");
  return (
    <div className={"rf-page" + (toc.length ? "" : " no-toc")} style={{ "--nc-fs-scale": fontScale || 1 }}>
      <article className="rf-art">
        <h1 className="rf-h1">{n.title}</h1>
        <p className="rf-desc">{n.desc}</p>
        <div className="rf-meta">
          <span><Ic n="folder" s={13} c={window.FOLDER_COLOR[window.RF_FOLDER]} />{window.RF_FOLDER}</span>
          <span>更新於 {fd(n.updatedAt)}</span>
          {note.tags.map((t) => <button key={t} className="wb-tagchip" style={{ cursor: "pointer" }} onClick={() => onTag(t)}>{t}</button>)}
        </div>
        <div className="nc-flow rf-scaled"><RfBlocks blocks={n.blocks} ctx={{}} /></div>
        <RfBacklinks slug={slug} onOpen={onOpenNote} />
        <div className="rf-foot"><span>建立於 {fd(n.createdAt)}</span><span className="mono">src/content/notes/{window.RF_FOLDER}/{slug}.mdx</span></div>
      </article>
      <RfToc items={toc} hasBl={bl.length > 0} blN={bl.length} />
    </div>
  );
}

// Drawer：被引用／本篇定義／引用的定義（三段都沒有資料時不渲染）
function RfDrawerSummary({ slug, onOpen }) {
  const n = window.rfNote(slug); if (!n) return null;
  const nav = window.NC_RF || {};
  const defs = window.rfDefsOf(slug), bl = window.rfBacklinks(slug), out = window.rfOutgoing(n);
  return (
    <>
      {bl.length ? (
        <div className="rf-dw-bl">
          <div className="wb-dw-sec">被引用 <span className="wb-dw-sec-n tnum">{bl.length}</span></div>
          <div className="wb-dw-markers">
            {bl.slice(0, 3).map((r) => (
              <button key={r.note.slug} className="wb-marker link" onClick={() => onOpen(r.note.slug)}>
                <span className="wb-marker-t">{r.note.title}</span>
                <span className="ids">{r.ids.slice(0, 2).map((x) => <span key={x.id} className="nc-bl-id"><RfKindIcons kinds={x.kinds} />{x.id}</span>)}{r.ids.length > 2 ? <span className="nc-bl-id">+{r.ids.length - 2}</span> : null}</span>
              </button>
            ))}
          </div>
          {bl.length > 3 ? <button className="rf-dw-more" onClick={() => nav.goBl(slug)}>開啟筆記看全部 {bl.length} 篇<Ic n="arrowUpRight" s={11} sw={2} /></button> : null}
        </div>
      ) : null}
      {defs.length ? (
        <>
          <div className="wb-dw-sec">本篇定義 <span className="wb-dw-sec-n tnum">{defs.length}</span></div>
          <div className="wb-dw-markers">
            {defs.map((id) => { const c = window.rfDefRefs(id).length; return (
              <button key={id} className="wb-marker link" onClick={() => nav.goDef(id)}>
                <Ic n="hash" s={12} c="var(--wb-ink-3)" /><span className="wb-marker-t" style={{ color: "var(--wb-ink)" }}>{RF_DEFS[id].label} <span className="rf-mono" style={{ color: "var(--wb-ink-3)" }}>{id}</span></span>
                <span className="wb-marker-s">{c ? "被 " + c + " 篇引用" : "尚未被引用"}</span>
              </button>
            ); })}
          </div>
        </>
      ) : null}
      {out.length ? (
        <>
          <div className="wb-dw-sec">引用的定義 <span className="wb-dw-sec-n tnum">{out.length}</span></div>
          <div className="wb-dw-markers">
            {out.map((o) => (
              <button key={o.id} className="wb-marker link" onClick={() => nav.goDef(o.id)}>
                <RfKindIcons kinds={o.kinds} /><span className="wb-marker-t" style={{ color: "var(--wb-ink)" }}>{RF_DEFS[o.id].label} <span className="rf-mono" style={{ color: "var(--wb-ink-3)" }}>{o.id}</span></span>
                <span className="wb-marker-s">{window.rfNote(RF_DEFS[o.id].src).title}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

// Palette：以 id 任一段或 label 搜尋定義（空查詢不列）
function rfPalDefs(q) {
  const ql = q.trim().toLowerCase(); if (!ql) return [];
  return Object.keys(RF_DEFS).filter((id) => id.includes(ql) || RF_DEFS[id].label.includes(q.trim())).slice(0, 6);
}
function RfPalDefRows({ ids, onDef }) {
  if (!ids.length) return null;
  return (
    <>
      <div className="nt-all-sec" style={{ padding: "8px 16px 4px" }}>定義</div>
      {ids.map((id) => { const c = window.rfDefRefs(id).length; return (
        <button key={id} className="wb-row" onClick={() => onDef(id)}>
          <Ic n="hash" s={13} c="var(--wb-blue-l)" /><span className="wb-row-t rf-mono" style={{ fontSize: 12.5 }}>{id}</span>
          <span className="wb-row-p">{RF_DEFS[id].label} · {window.rfNote(RF_DEFS[id].src).title}</span>
          <span className="wb-pill muted tnum">{c ? "被 " + c + " 篇引用" : "未被引用"}</span>
        </button>
      ); })}
    </>
  );
}

Object.assign(window, { RfToc, RfNotePage, RfDrawerSummary, rfPalDefs, RfPalDefRows });
