(function () {
  if (document.getElementById("pt-empty-css")) return;
  const st = document.createElement("style"); st.id = "pt-empty-css";
  st.textContent = ".pt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:28px 16px;margin:auto 0}.wb-body .pt-empty{padding:72px 16px}.pt-empty svg{margin-bottom:8px}.pt-empty-t{font-size:14px;font-weight:700;color:var(--wb-ink)}.pt-empty-s{font-size:12.5px;line-height:1.7;color:var(--wb-ink-3);max-width:280px;text-wrap:pretty}.pt-empty-btn{margin-top:10px;height:32px;padding:0 16px;border-radius:999px;border:1px solid var(--wb-line);background:var(--wb-panel);font:inherit;font-size:12.5px;font-weight:700;color:var(--wb-blue-l,#2c6ebb);cursor:pointer}.pt-empty-btn:hover{background:var(--wb-bg);border-color:#9dbde6}";
  document.head.appendChild(st);
})();

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

function PtEmptyArt({ kind }) {
  const B = "var(--wb-blue-l,#2c6ebb)", O = "#ed9b26", S = "var(--wb-line,#dfe5ee)", P = "var(--wb-panel,#fff)";
  if (kind === "ai") return (
    <svg width="132" height="104" viewBox="0 0 132 104" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="66" cy="94" rx="42" ry="5" fill={S} opacity=".7" />
      <rect x="30" y="22" width="60" height="66" rx="7" fill={P} stroke={S} strokeWidth="2" transform="rotate(-6 60 55)" />
      <rect x="40" y="16" width="60" height="68" rx="7" fill={P} stroke={B} strokeWidth="2" />
      <path d="M50 32h26M50 42h40M50 52h32" stroke={S} strokeWidth="3" />
      <circle cx="90" cy="72" r="15" fill={B} />
      <path d="M83.5 72.5l4.5 4.5 8.5-9" stroke="#fff" strokeWidth="2.6" />
      <path d="M112 24v10M107 29h10" stroke={O} strokeWidth="2.2" />
      <path d="M22 50v6M19 53h6" stroke={O} strokeWidth="2" />
      <circle cx="110" cy="52" r="2.2" fill={O} />
    </svg>
  );
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="66" cy="94" rx="42" ry="5" fill={S} opacity=".7" />
      <rect x="30" y="20" width="66" height="66" rx="8" fill={P} stroke={B} strokeWidth="2" />
      <path d="M30 36h66" stroke={B} strokeWidth="2" />
      <path d="M44 14v12M82 14v12" stroke={B} strokeWidth="2.4" />
      {[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => <rect key={c + "-" + r} x={40 + c * 12.5} y={45 + r * 12} width="7" height="6" rx="1.5" fill={S} />))}
      <circle cx="96" cy="74" r="14" fill={P} stroke={O} strokeWidth="2.2" />
      <path d="M96 67v7l5 3" stroke={O} strokeWidth="2.2" />
      <path d="M108 20c3 0 5-2 5-5 0 3 2 5 5 5-3 0-5 2-5 5 0-3-2-5-5-5z" fill={O} />
      <circle cx="20" cy="46" r="2.2" fill={B} opacity=".5" />
    </svg>
  );
}
function PtEmpty({ kind, title, sub, action }) {
  return (
    <div className="pt-empty">
      <PtEmptyArt kind={kind} />
      <div className="pt-empty-t">{title}</div>
      {sub ? <div className="pt-empty-s">{sub}</div> : null}
      {action || null}
    </div>
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

  if (tab === "更新月曆" && window.PtCalendar) return <window.PtCalendar onSel={onSel} onOpen={onOpen} />;
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
        {!pending.rows.length ? <PtEmpty kind="ai" title="AI 佇列已清空" sub="所有 @ai-visualize 標記都已生成完成。新增標記後會出現在這裡。" action={<button className="pt-empty-btn" onClick={() => onRoute("notes")}>前往筆記</button>} /> : null}
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
  if (window.PtOverview) return <window.PtOverview onSel={onSel} onOpen={onOpen} onSeries={onSeries} onTag={onTag} onRoute={onRoute} />;
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
Object.assign(window, { PtWg, PtDashboard, PtEmpty, PtEmptyArt });
