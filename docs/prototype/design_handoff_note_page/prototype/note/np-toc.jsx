// NoteCraft 筆記頁 — 目錄（提案頁與工作台共用）
(() => {
const { useState: npUS, useEffect: npUE } = React;
function NpToc({ plan, scRef }) {
  const [items, setItems] = npUS([]);
  const [act, setAct] = npUS(null);
  const [prog, setProg] = npUS(0);
  const [open, setOpen] = npUS(false);
  npUE(() => {
    const sc = scRef.current; if (!sc) return;
    let a = 0, b = 0, p2 = null, p3 = null;
    const lab = (h) => [...h.childNodes].filter((n) => !(n.classList && n.classList.contains("md-anc"))).map((n) => n.textContent).join("").trim();
    const list = [...sc.querySelectorAll(".md-flow > h2.md-h, .md-flow > h3.md-h, .md-flow > h4.md-h")].map((h) => {
      if (h.tagName === "H2") { a++; b = 0; p2 = h.id; p3 = null; return { id: h.id, label: lab(h), lv: 0, tag: 2, n: plan === "b" ? String(a).padStart(2, "0") : a + ".", anc: [] }; }
      if (h.tagName === "H3") { b++; p3 = h.id; return { id: h.id, label: lab(h), lv: 1, tag: 3, n: a + "." + b, anc: p2 ? [p2] : [] }; }
      return { id: h.id, label: lab(h), lv: 2, tag: 4, n: "", anc: [p2, p3].filter(Boolean) };
    });
    list.forEach((x) => { x.kids = list.filter((y) => y.anc[y.anc.length - 1] === x.id).length; });
    setItems(list);
  }, [plan]);
  const [shut, setShut] = npUS({});
  const actIt = items.find((x) => x.id === act);
  const trail = new Set(actIt ? actIt.anc : []);
  const parents = items.filter((x) => x.kids);
  const allOpen = parents.every((x) => !shut[x.id]);
  const toggleAll = () => setShut(allOpen ? Object.fromEntries(parents.map((x) => [x.id, true])) : {});
  const counts = [2, 3, 4].map((tg) => [tg, items.filter((x) => x.tag === tg).length]).filter((c) => c[1]);
  const hidden = (x) => x.anc.some((id) => shut[id] && !(actIt && actIt.id === x.id));
  npUE(() => {
    const sc = scRef.current; if (!sc) return;
    const h = () => {
      const base = sc.getBoundingClientRect().top + 120; let cur = null;
      items.forEach((x) => { const el = document.getElementById(x.id); if (el && el.getBoundingClientRect().top < base) cur = x.id; });
      setAct(cur); setProg(sc.scrollHeight > sc.clientHeight ? sc.scrollTop / (sc.scrollHeight - sc.clientHeight) : 0);
    };
    sc.addEventListener("scroll", h); h();
    return () => sc.removeEventListener("scroll", h);
  }, [items]);
  return (
    <nav className={"np-toc" + (open ? " open" : "")} aria-label="目錄">
      <button className="np-toc-tg" aria-expanded={open} onClick={() => setOpen(!open)}><NpI n="chev" s={12} sw={2.2} />目錄<span className="cur">{(items.find((x) => x.id === act) || {}).label || ""}</span></button>
      <div className="np-toc-h">
        <span>目錄</span>
        <span className="np-toc-cnt tnum">{plan === "b" ? Math.round(prog * 100) + "% · " : ""}{counts.map((c) => "H" + c[0] + "×" + c[1]).join(" · ")}</span>
      </div>
      <div className="np-prog" aria-hidden="true"><i style={{ width: prog * 100 + "%" }} /></div>
      {parents.length ? <button className="np-toc-all" onClick={toggleAll} aria-label={allOpen ? "全部收合" : "全部展開"}><NpI n="chev" s={11} sw={2.2} style={{ transform: allOpen ? "rotate(90deg)" : "none" }} />{allOpen ? "全部收合" : "全部展開"}</button> : null}
      <div className="np-toc-l">
        {items.map((x) => hidden(x) ? null : (
          <div key={x.id} className={"np-toc-r d" + x.lv}>
            <a href={"#" + x.id} className={"d" + x.lv + (act === x.id ? " on" : trail.has(x.id) ? " tr" : "")} aria-current={act === x.id ? "location" : undefined} onClick={(e) => { e.preventDefault(); setOpen(false); window.npJump(x.id); }}>
              <span className="n">{x.n}</span><span className="lb">{x.label}</span>
            </a>
            {x.kids ? <button className={"np-toc-cv" + (shut[x.id] ? "" : " open")} aria-expanded={!shut[x.id]} aria-label={(shut[x.id] ? "展開" : "收合") + "「" + x.label + "」"} onClick={() => setShut({ ...shut, [x.id]: !shut[x.id] })}>{shut[x.id] ? <span className="k tnum">{x.kids}</span> : null}<NpI n="chev" s={11} sw={2.2} /></button> : null}
          </div>
        ))}
      </div>
    </nav>
  );
}
window.NpToc = NpToc;
})();
