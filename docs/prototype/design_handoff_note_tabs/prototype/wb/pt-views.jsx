function PtAiPill({ row }) {
  if (row.nofm) return <span className="wb-pill muted">無 frontmatter</span>;
  const [done, pend] = row.ai;
  if (pend > 0) return <span className="wb-pill warn tnum">{`待生成 ${pend}`}</span>;
  if (done > 0) return <span className="wb-pill ok tnum">{`已生成 ${done}`}</span>;
  return <span className="wb-pill muted">無標記</span>;
}
function PtTags({ tags, max = 2 }) {
  return (
    <span className="wb-row-tags">
      {tags.slice(0, max).map((t) => <span key={t} className="wb-tagchip">{t}</span>)}
      {tags.length > max ? <span className="wb-tagchip more tnum">+{tags.length - max}</span> : null}
    </span>
  );
}
function ptGroup(rows, by) {
  const out = [];
  rows.forEach((r) => {
    const k = window.ptGroupKey(r, by);
    let g = out.find((x) => x.key === k);
    if (!g) { g = { key: k, color: window.ptGroupColor(k, by), rows: [] }; out.push(g); }
    g.rows.push(r);
  });
  out.sort((a, b) => (a.key === "根目錄" ? -1 : b.key === "根目錄" ? 1 : 0));
  return out;
}

function PtList({ rows, groupBy, sel, onSel, onOpen }) {
  const [collapsed, setCollapsed] = React.useState({});
  const groups = ptGroup(rows, groupBy);
  if (!rows.length) return <div className="wb-empty">沒有符合條件的筆記。試著清掉篩選條件或搜尋字。</div>;
  return groups.map((g) => (
    <div key={g.key}>
      <button className="wb-gh" style={{ "--gc": g.color }} onClick={() => setCollapsed({ ...collapsed, [g.key]: !collapsed[g.key] })}>
        <span className={"wb-sb-caret" + (collapsed[g.key] ? "" : " open")} style={{ color: "inherit" }}><Ic n="chev" s={11} sw={2.4} /></span>
        <Ic n="folder" s={13} />
        <span className="wb-gh-n">{g.key}</span>
        <span className="wb-gh-c tnum">{g.rows.length}</span>
        <span className="wb-gh-stats tnum">
          已生成 {g.rows.reduce((a, r) => a + r.ai[0], 0)} ・ 待生成 {g.rows.reduce((a, r) => a + r.ai[1], 0)} ・ 最後更新 {g.rows[0].md}
        </span>
      </button>
      {collapsed[g.key] ? null : g.rows.map((r) => (
        <button key={r.slug} className={"wb-row" + (sel === r.slug ? " sel" : "")} onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}>
          <Ic n="doc" s={13} c="var(--wb-ink-3)" />
          <span className="wb-row-t">{r.title}</span>
          <span className="wb-row-p">{r.path}</span>
          <PtTags tags={r.tags} />
          <PtAiPill row={r} />
          <span className="wb-row-d tnum">{r.md}</span>
        </button>
      ))}
    </div>
  ));
}

// Board 依「閱讀狀態」分欄：未開始 → 閱讀中 → 已完成，另加未發佈（草稿／規劃中）
const PT_READ_COLS = [
  { key: "not-started", name: "未開始", color: "#6c798e", next: "reading", nextLabel: "開始閱讀" },
  { key: "reading", name: "閱讀中", color: "#2c6ebb", next: "done", nextLabel: "標記完成" },
  { key: "done", name: "已完成", color: "#2e9e6b", next: "not-started", nextLabel: "重設進度" },
  { key: "unpublished", name: "未發佈", color: "#8b9aad", next: null },
];
function PtBoard({ rows, sel, onSel, onOpen }) {
  const [drag, setDrag] = React.useState(null);
  const dragRef = React.useRef(null);
  const [over, setOver] = React.useState(null);
  return (
    <div className="wb-board">
      {PT_READ_COLS.map((c) => {
        const items = rows.filter((r) => window.readingStatus(r.slug) === c.key);
        const pend = items.reduce((a, r) => a + r.ai[1], 0);
        const droppable = c.key !== "unpublished" && !!(drag || dragRef.current) && (drag ? drag.from !== c.key : dragRef.current.from !== c.key);
        return (
          <div key={c.key} className={"wb-col" + (droppable && over === c.key ? " drop" : "")} style={{ "--gc": c.color }}
            onDragOver={(e) => { if (droppable) { e.preventDefault(); setOver(c.key); } }}
            onDragLeave={() => setOver((o) => (o === c.key ? null : o))}
            onDrop={(e) => {
              e.preventDefault(); setOver(null);
              if (droppable && dragRef.current) window.setReadingStatus(dragRef.current.slug, c.key);
              dragRef.current = null;
              setDrag(null);
            }}>
            <div className="wb-col-h">
              <span className="wb-sb-swatch" style={{ background: c.color }} />
              <span className="wb-col-n">{c.name}</span>
              <span className="wb-col-c tnum">{items.length}</span>
            </div>
            <div className="wb-col-b">
              {items.map((r) => {
                const fixed = c.key === "unpublished";
                return (
                  <div key={r.slug} className={"wb-card" + (sel === r.slug ? " sel" : "") + (fixed ? " fixed" : " drag") + (drag && drag.slug === r.slug ? " dragging" : "")}
                    draggable={!fixed}
                    onDragStart={(e) => { if (fixed) return; dragRef.current = { slug: r.slug, from: c.key }; setDrag({ slug: r.slug, from: c.key }); if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", r.slug); } }}
                    onDragEnd={() => { dragRef.current = null; setDrag(null); setOver(null); }}
                    onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}
                    title={fixed ? "未發佈的筆記不計入閱讀進度，無法拖曳" : "拖曳可改變閱讀狀態"}>
                    <div className="wb-card-t">{r.title}</div>
                    <div className="wb-card-m">
                      {r.series ? <span className="wb-tagchip" style={{ color: window.SERIES_COLOR[r.series.accent], borderColor: "currentColor" }}>{r.series.title} #{r.seriesIndex}</span> : null}
                      {r.tags.slice(0, 2).map((t) => <span key={t} className="wb-tagchip">{t}</span>)}
                    </div>
                    <div className="wb-card-m">
                      <PtAiPill row={r} />
                      <span className="wb-row-d tnum" style={{ marginLeft: "auto" }}>{r.md}</span>
                    </div>
                  </div>
                );
              })}
              {items.length ? null : <div className="wb-empty" style={{ padding: "18px 8px", fontSize: 12 }}>{droppable ? "拖到這裡" : "無筆記"}</div>}
              <div className="wb-col-f tnum">{c.key === "unpublished" ? "草稿與規劃中，不計入進度" : (pend ? `待生成 ${pend} 個標記` : "標記皆已生成")}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PtTable({ rows, sel, onSel, onOpen }) {
  const cols = ["標題", "資料夾", "系列", "標籤", "AI 標記", "字數", "更新日"];
  return (
    <div className="wb-tablewrap">
      <table className="wb-table">
        <thead><tr>{cols.map((c) => <th key={c} className={c === "字數" ? "num" : ""}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className={sel === r.slug ? "sel" : ""} onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}>
              <td className="t">{r.title}</td>
              <td style={{ color: "var(--wb-ink-3)", fontSize: 11.5 }}>{[r.folder, r.sub].filter(Boolean).join("/")}</td>
              <td>{r.series ? <span className="wb-pill" style={{ color: window.SERIES_COLOR[r.series.accent], background: (window.SERIES_COLOR[r.series.accent] || "#2c6ebb") + "1f" }}>{r.series.title} #{r.seriesIndex}</span> : <span style={{ color: "var(--wb-ink-3)" }}>—</span>}</td>
              <td>{r.tags.length ? r.tags.map((t) => <span key={t} className="wb-tagchip" style={{ marginRight: 4 }}>{t}</span>) : <span style={{ color: "var(--wb-ink-3)" }}>—</span>}</td>
              <td><PtAiPill row={r} /></td>
              <td className="num">{r.words.toLocaleString()}</td>
              <td className="num">{r.updated.replace(/-/g, "/")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PtTimeline({ rows, onSel, onOpen }) {
  const groups = ptGroup(rows, "month");
  return (
    <div className="wb-tl">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="wb-tl-m"><b>{g.key}</b><span className="tnum">{g.rows.length} 篇</span><i /></div>
          {g.rows.map((r) => (
            <button key={r.slug} className="wb-tl-row" onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}>
              <span className="wb-tl-d">{r.md}</span>
              <span className="wb-tl-axis" />
              <span className="wb-row-t">{r.title}</span>
              <span className="wb-row-p">{r.path}</span>
              <PtTags tags={r.tags} />
              <PtAiPill row={r} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function PtDrawer({ slug, onClose, onOpen, onPresent, onSeries, onTag }) {
  const note = window.noteBySlug(slug);
  if (!note) return null;
  const r = window.ptRow(note);
  const st = window.statusMeta ? window.statusMeta(window.noteStatus(note)) : null;
  const meta = [
    ["路徑", "src/content/notes/" + r.path],
    ["資料夾", [r.folder, r.sub].filter(Boolean).join(" / ")],
    ["系列", r.series ? `${r.series.title} ・ 第 ${r.seriesIndex} 章 / ${r.series.slugs.length}` : "未歸入系列"],
    ["字數", r.words.toLocaleString() + " 字"],
    ["建立", note.createdAt.replace(/-/g, "/")],
    ["更新", note.updatedAt.replace(/-/g, "/") + "（" + window.daysAgo(note.updatedAt) + "）"],
  ];
  const chapters = r.series ? r.series.slugs.map(window.seriesEntry).filter(Boolean) : [];
  return (
    <>
      <button className="wb-scrim" onClick={onClose} aria-label="關閉" />
      <aside className="wb-drawer">
        <div className="wb-dw-h">
          <span className="wb-crumb">src/content/notes/{r.path}</span>
          <button className="wb-dw-x" onClick={onClose}><Ic n="close" s={14} /></button>
        </div>
        <div className="wb-dw-body">
          <h2 className="wb-dw-t">{note.title}</h2>
          <div className="wb-dw-pills">
            <PtAiPill row={r} />
            {r.series ? <span className="wb-pill" style={{ color: window.SERIES_COLOR[r.series.accent], background: (window.SERIES_COLOR[r.series.accent] || "#2c6ebb") + "1f" }}>{r.series.title} #{r.seriesIndex}</span> : null}
            {st ? <span className="wb-pill muted">{st.label || st.zh || "已發佈"}</span> : null}
          </div>
          <div className="wb-dw-actions">
            <button className="wb-btn-solid" onClick={() => onOpen(slug)}><Ic n="doc" s={13} c="#fff" /> 開啟筆記</button>
            <button className="wb-btn-ghost" onClick={() => onPresent(slug)}><Ic n="slide" s={13} /> 轉簡報</button>
            {r.ai[1] > 0 ? <button className="wb-btn-ghost" onClick={() => onOpen(slug)}><Ic n="sparkle" s={13} /> 生成 {r.ai[1]} 個標記</button> : null}
          </div>
          {note.description ? (<><div className="wb-dw-sec">摘要</div><p className="wb-dw-p">{note.description}</p></>) : null}
          <div className="wb-dw-sec">Metadata</div>
          <div className="wb-dw-meta">
            {meta.map(([k, v]) => <div key={k} className="wb-dw-mrow"><span className="wb-dw-mk">{k}</span><span className="wb-dw-mv">{v}</span></div>)}
            <div className="wb-dw-mrow"><span className="wb-dw-mk">標籤</span><span className="wb-dw-mv" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {r.tags.length ? r.tags.map((t) => <button key={t} className="wb-tagchip" style={{ cursor: "pointer" }} onClick={() => onTag(t)}>{t}</button>) : "—"}
            </span></div>
          </div>
          <div className="wb-dw-sec">@ai-visualize 標記 <span className="wb-dw-sec-n tnum">{r.markers.length}</span></div>
          {r.markers.length ? (
            <div className="wb-dw-markers">
              {r.markers.map((m) => (
                <div key={m.id} className="wb-marker">
                  <span className={"wb-dot " + (m.status === "generated" ? "ok" : "warn")} />
                  <span className="wb-marker-t" title={m.prompt}>{m.id}</span>
                  <span className="wb-marker-s">{m.type} ・ {m.status === "generated" ? "已生成" : "待生成"}</span>
                </div>
              ))}
            </div>
          ) : <div className="wb-dw-p" style={{ color: "var(--wb-ink-3)", fontSize: 12.5 }}>這篇還沒有 @ai-visualize 標記。</div>}
          {chapters.length ? (
            <>
              <div className="wb-dw-sec">同系列章節 <button className="wb-sb-foot-a" style={{ padding: 0, fontSize: 11 }} onClick={() => onSeries(r.series.id)}>系列總覽 →</button></div>
              <div className="wb-dw-markers">
                {chapters.map((c, i) => (
                  <button key={c.ref} className={"wb-marker" + (c.ref === slug ? "" : " link")} onClick={() => (c.kind === "note" ? onOpen(c.id) : null)}>
                    <span className="wb-marker-i tnum">{i + 1}</span>
                    <span className="wb-marker-t" style={c.ref === slug ? { fontWeight: 700, color: "var(--wb-ink)" } : null}>{c.title}</span>
                    <span className="wb-marker-s">{c.kind === "data" ? "資料檔" : (c.ref === slug ? "目前" : "")}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
// Plugin 資料檔清單（只有 List 一種 view）—— 點列直接進渲染頁
function PtDataList({ files, onOpen }) {
  if (!files.length) return <div className="wb-empty">這個資料夾沒有資料檔。</div>;
  return files.map((f) => (
    <button key={f.id} className="wb-row" onClick={() => onOpen(f.id)}>
      <Ic n="doc" s={13} c="var(--wb-gold)" />
      <span className="wb-row-t">{f.title}</span>
      <span className="wb-row-p">{f.path}</span>
      <span className="wb-tagchip" style={{ fontFamily: "var(--font-mono)" }}>{f.plugin}</span>
      <span className="wb-row-d tnum">{f.updatedAt.slice(5).replace("-", "/")}</span>
    </button>
  ));
}
Object.assign(window, { PtAiPill, PtTags, PtList, PtBoard, PtTable, PtTimeline, PtDrawer, PtDataList, ptGroup });
