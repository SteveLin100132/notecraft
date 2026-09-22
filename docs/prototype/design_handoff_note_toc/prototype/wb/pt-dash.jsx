function PtWg({ span, title, meta, children, action }) {
  return (
    <section className="wb-wg" style={{ gridColumn: "span " + span }}>
      <header className="wb-wg-h">
        <span className="wb-wg-t">{title}</span>
        {action || (meta ? <span className="wb-wg-m">{meta}</span> : null)}
      </header>
      <div className="wb-wg-b">{children}</div>
    </section>
  );
}

function PtDashboard({ tab, onSel, onOpen, onSeries, onTag, onRoute }) {
  const rows = window.ptRows();
  const series = window.ptSeries();
  const pending = window.ptPending();
  const weeks = window.ptWeeks(8);
  const tags = window.tagStats().sort((a, b) => b.count - a.count).slice(0, 10);
  const maxTag = tags[0] ? tags[0].count : 1;
  const maxWeek = Math.max(...weeks.map((w) => w.v), 1);
  const markers = rows.flatMap((r) => r.markers);
  const done = markers.filter((m) => m.status === "generated").length;
  const pct = markers.length ? Math.round((done / markers.length) * 100) : 0;
  const latest = new Date(rows[0].updated + "T00:00:00");
  const weekAgo = new Date(latest); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = rows.filter((r) => new Date(r.updated + "T00:00:00") > weekAgo);
  const monthAgo = new Date(latest); monthAgo.setDate(monthAgo.getDate() - 30);
  const thisMonth = rows.filter((r) => new Date(r.updated + "T00:00:00") > monthAgo);

  if (tab === "本週") {
    return (
      <div className="wb-body flush">
        {thisWeek.map((r) => (
          <button key={r.slug} className="wb-row" onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}>
            <Ic n="doc" s={13} c="var(--wb-ink-3)" /><span className="wb-row-t">{r.title}</span>
            <span className="wb-row-p">{r.path}</span><window.PtTags tags={r.tags} /><window.PtAiPill row={r} />
            <span className="wb-row-d tnum">{r.md}</span>
          </button>
        ))}
      </div>
    );
  }
  if (tab === "AI 佇列") {
    return (
      <div className="wb-body flush">
        {pending.rows.map((r) => (
          <React.Fragment key={r.slug}>
            <button className="wb-gh" style={{ "--gc": "#e3a008" }} onClick={() => onSel(r.slug)}>
              <Ic n="doc" s={13} /><span className="wb-gh-n">{r.title}</span>
              <span className="wb-gh-c tnum">{r.ai[1]}</span>
              <span className="wb-gh-stats tnum">{r.path}</span>
            </button>
            {r.markers.filter((m) => m.status !== "generated").map((m) => (
              <button key={m.id} className="wb-row" onClick={() => onOpen(r.slug)}>
                <span className="wb-dot warn" /><span className="wb-row-t">{m.id}</span>
                <span className="wb-row-p">{m.prompt}</span>
                <span className="wb-pill muted">{m.type}</span>
                <span className="wb-row-d">待生成</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    );
  }
  return (
    <div className="wb-body">
      <div className="wb-grid">
        <PtWg span={3} title="筆記總數" meta="全部資料夾">
          <div className="wb-kpi">
            <div className="wb-kpi-n tnum">{rows.length}</div>
            <div className="wb-kpi-sub">近 7 日更新 <b className="tnum up">{thisWeek.length}</b> ・ 近 30 日 <b className="tnum">{thisMonth.length}</b></div>
          </div>
        </PtWg>
        <PtWg span={3} title="AI 視覺化生成率" meta={`${done} / ${markers.length} 標記`}>
          <div className="wb-kpi">
            <div className="wb-kpi-row">
              <div className="wb-kpi-n tnum">{pct}<span className="wb-kpi-u">%</span></div>
              <div className="wb-kpi-side">已生成 <b className="tnum">{done}</b><br />待生成 <b className="tnum warn">{pending.count}</b></div>
            </div>
            <div className="wb-bar lg"><i style={{ width: pct + "%" }} /></div>
          </div>
        </PtWg>
        <PtWg span={6} title="寫作頻率 · 近 8 週" meta="每週更新筆記數">
          <div className="wb-spark">
            {weeks.map((w, i) => (
              <div key={i} className="wb-spark-col" title={w.label}>
                <span className="wb-spark-v tnum">{w.v || ""}</span>
                <span className="wb-spark-b" style={{ height: Math.round((w.v / maxWeek) * 100) + "%", opacity: i === weeks.length - 1 ? 1 : 0.6 }} />
                <span className="wb-spark-x tnum">{i === 0 || i === weeks.length - 1 ? w.label : ""}</span>
              </div>
            ))}
          </div>
        </PtWg>

        <PtWg span={8} title="最近更新" action={<button className="wb-sb-foot-a" style={{ padding: 0, fontSize: 11 }} onClick={() => onRoute("notes")}>全部筆記 →</button>}>
          {rows.slice(0, 8).map((r) => (
            <button key={r.slug} className="wb-row dense" onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}>
              <Ic n="doc" s={13} c="var(--wb-ink-3)" />
              <span className="wb-row-t">{r.title}</span>
              <span className="wb-row-p">{r.path}</span>
              <window.PtAiPill row={r} />
              <span className="wb-row-d tnum">{r.md}</span>
            </button>
          ))}
        </PtWg>
        <PtWg span={4} title="系列進度" meta={`${series.length} 個系列`}>
          <div className="wb-series-list">
            {series.map((s) => (
              <button key={s.id} className="wb-series" onClick={() => onSeries(s.id)}>
                <div className="wb-series-top">
                  <span className="wb-sb-swatch" style={{ background: s.color }} />
                  <span className="wb-series-n">{s.name}</span>
                  <span className="wb-series-c tnum">{s.done}/{s.total}</span>
                </div>
                <div className="wb-bar"><i style={{ width: s.pct + "%" }} /></div>
                <div className="wb-series-next">{s.next ? "繼續讀：" + (s.next.title || s.next.entry && s.next.entry.title || "") : "已全部讀完"}</div>
              </button>
            ))}
          </div>
        </PtWg>

        <PtWg span={7} title="標籤分布" meta={`前 ${tags.length} 個 ・ 共 ${window.tagStats().length} 個`}>
          <div className="wb-tagchart">
            {tags.map((t) => (
              <button key={t.name} className="wb-tagrow" onClick={() => onTag(t.name)}>
                <span className="wb-tagrow-n">{t.name}</span>
                <span className="wb-tagrow-track"><i style={{ width: (t.count / maxTag) * 100 + "%" }} /></span>
                <span className="wb-tagrow-v tnum">{t.count}</span>
              </button>
            ))}
          </div>
        </PtWg>
        <PtWg span={5} title="待生成 @ai-visualize 標記" meta={`${pending.count} 個 ・ ${pending.rows.length} 篇`}>
          {pending.rows.slice(0, 6).map((r) => (
            <button key={r.slug} className="wb-row dense" onClick={() => onSel(r.slug)} onDoubleClick={() => onOpen(r.slug)}>
              <span className="wb-dot warn" />
              <span className="wb-row-t">{r.title}</span>
              <span className="wb-row-p">{r.folder}</span>
              <span className="wb-pill warn tnum">待生成 {r.ai[1]}</span>
            </button>
          ))}
          <button className="wb-row-more" onClick={() => onRoute("ai")}>查看完整 AI 佇列 →</button>
        </PtWg>
      </div>
    </div>
  );
}
Object.assign(window, { PtWg, PtDashboard });
