// 工作台 Prototype — 筆記頁（方案 D）：以 np/ 的 markdown 元件渲染 NC_BODIES 內的筆記
(() => {
const { useRef: npvUR, useEffect: npvUE } = React;
function PtNpNoteView({ note, theme, fontScale, onTag, onOpenNote, onOpenSeries, onOpenData }) {
  const scRef = npvUR(null);
  const Body = window.NC_BODIES[note.slug];
  const r = window.ptRow(note);
  const sr = window.seriesOf ? window.seriesOf(note.slug) : null;
  window.NC_OPEN_DATA = onOpenData;
  window.npJump = (id) => {
    const el = document.getElementById(id), sc = scRef.current; if (!el || !sc) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sc.scrollTo({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 24, behavior: reduce ? "auto" : "smooth" });
  };
  npvUE(() => { if (window.markReading) window.markReading(note.slug); }, [note.slug]);
  const fc = (window.FOLDER_COLOR || {})[r.folder] || "#8b9aad";
  const mins = Math.max(1, Math.round(r.words / 450));
  const open = (c) => (c.kind === "data" ? onOpenData && onOpenData(c.id) : onOpenNote(c.id));
  const plan = theme === "classic" ? "o" : "d";
  const fs = fontScale && fontScale !== 1 ? { "--md-fs": (16 * fontScale).toFixed(1) + "px" } : undefined;
  return (
    <div ref={scRef} className={"wb-body flush np-scroll np-" + plan} style={fs}>
      <div className="np-page">
        <article className="md-art">
          <header className="md-head">
            {r.tags.length ? <div className="md-tags">{r.tags.map((t) => <button key={t} className="md-tag" onClick={() => onTag(t)}>{t}</button>)}</div> : null}
            <h1 className="md-h1">{note.title}</h1>
            {note.description ? <p className="md-desc">{note.description}</p> : null}
            <div className="md-meta">
              <span className="mi"><NpI n="folder" s={13} c={fc} />{r.folder}</span>
              <span className="mi"><NpI n="clock" s={13} />{window.fmtDate(note.updatedAt)}</span>
              <span className="mi"><NpI n="book" s={13} />約 {mins} 分鐘</span>
              {sr ? <button className="mi" onClick={() => onOpenSeries(sr.series.id)}><NpI n="layers" s={13} />{sr.series.title} · {sr.index + 1}/{sr.total}</button> : null}
            </div>
          </header>
          <Body />
          {sr && (sr.prev || sr.next) ? (
            <nav className="md-series" aria-label="系列章節">
              <div className="md-series-h"><NpI n="layers" s={13} /><button onClick={() => onOpenSeries(sr.series.id)}>{sr.series.title}</button><span className="tnum">第 {sr.index + 1} / {sr.total} 章</span></div>
              <div className="md-series-n">
                {sr.prev ? <button onClick={() => open(sr.prev)}><small>上一章</small><b>{sr.prev.title}</b></button> : <span />}
                {sr.next ? <button className="r" onClick={() => open(sr.next)}><small>下一章</small><b>{sr.next.title}</b></button> : <span />}
              </div>
            </nav>
          ) : null}
          <div className="md-foot"><span>建立於 {window.fmtDate(note.createdAt)}</span><span className="mono">src/content/notes/{r.path}</span></div>
        </article>
        <window.NpToc key={plan} plan={plan} scRef={scRef} />
      </div>
    </div>
  );
}
window.PtNpNoteView = PtNpNoteView;
if (window.GENERATED && window.VzLeave) window.GENERATED["annual-leave-calculator"] = window.VzLeave;
})();
