const WB_GCOLOR = { "01-前端": "#2c6ebb", "02-後端": "#163f7d", "03-產品管理": "#ed9b26", "04-資安與網路": "#6c798e", inbox: "#8b9aad" };

function AiPill({ ai, nofm }) {
  if (nofm) return <span className="wb-pill muted">無 frontmatter</span>;
  const [done, pend] = ai;
  if (pend > 0) return <span className="wb-pill warn tnum">待生成 {pend}</span>;
  if (done > 0) return <span className="wb-pill ok tnum">已生成 {done}</span>;
  return <span className="wb-pill muted">無標記</span>;
}

function WbListRows({ selected, onSelect }) {
  const groups = ["01-前端", "02-後端", "03-產品管理", "04-資安與網路", "inbox"];
  return groups.map((g) => {
    const items = WB_NOTES.filter((n) => n.g === g);
    const pend = items.reduce((a, n) => a + n.ai[1], 0);
    const done = items.reduce((a, n) => a + n.ai[0], 0);
    return (
      <div key={g}>
        <div className="wb-gh" style={{ "--gc": WB_GCOLOR[g] }}>
          <Ic n="chev" s={11} sw={2.4} style={{ transform: "rotate(90deg)" }} />
          <Ic n="folder" s={13} />
          <span className="wb-gh-n">{g}</span>
          <span className="wb-gh-c tnum">{items.length}</span>
          <span className="wb-gh-stats tnum">已生成 {done} ・ 待生成 {pend} ・ 更新 {items[0].d}</span>
        </div>
        {items.map((n) => (
          <div key={n.p} className={"wb-row" + (selected === n.p ? " sel" : "")} onClick={() => onSelect && onSelect(n.p)}>
            <Ic n="doc" s={13} c="var(--wb-ink-3)" />
            <span className="wb-row-t">{n.t}</span>
            <span className="wb-row-p">{n.p}</span>
            <span className="wb-row-tags">
              {n.tags.slice(0, 2).map((t) => <span key={t} className="wb-tagchip">{t}</span>)}
              {n.tags.length > 2 ? <span className="wb-tagchip more tnum">+{n.tags.length - 2}</span> : null}
            </span>
            <AiPill ai={n.ai} nofm={n.nofm} />
            <span className="wb-row-d tnum">{n.d}</span>
          </div>
        ))}
      </div>
    );
  });
}

function WbDrawer({ slug, onClose }) {
  const n = WB_NOTES.find((x) => x.p === slug);
  const s = WB_SERIES.find((x) => x.id === n.s);
  const meta = [
    ["資料夾", n.g + "/"],
    ["系列", s ? s.name + " ・ 第 2 章" : "未歸入系列"],
    ["標籤", n.tags.join("、") || "—"],
    ["字數", n.w.toLocaleString() + " 字"],
    ["建立", "2026/05/28"],
    ["更新", "2026/" + n.d],
  ];
  return (
    <>
      <div className="wb-scrim" onClick={onClose} />
      <aside className="wb-drawer">
        <div className="wb-dw-h">
          <span className="wb-crumb">{n.p}</span>
          <div className="wb-dw-x" onClick={onClose}><Ic n="close" s={14} /></div>
        </div>
        <div className="wb-dw-body">
          <h2 className="wb-dw-t">{n.t}</h2>
          <div className="wb-dw-pills">
            <AiPill ai={n.ai} nofm={n.nofm} />
            {s ? <span className="wb-pill" style={{ color: s.color, background: s.color + "1a" }}>{s.name}</span> : null}
            <span className="wb-pill muted">已發佈</span>
          </div>
          <div className="wb-dw-actions">
            <button className="wb-btn-solid"><Ic n="doc" s={13} c="#fff" /> 開啟筆記</button>
            <button className="wb-btn-ghost"><Ic n="slide" s={13} /> 轉簡報</button>
            <button className="wb-btn-ghost"><Ic n="sparkle" s={13} /> 生成標記</button>
          </div>
          <div className="wb-dw-sec">摘要</div>
          <p className="wb-dw-p">Render 與 Commit 兩階段、可中斷的協調流程，以及 key 為何會影響 diff 結果。筆記中以三個互動元件拆解 Fiber 的工作單元排程。</p>
          <div className="wb-dw-sec">Metadata</div>
          <div className="wb-dw-meta">
            {meta.map(([k, v]) => (
              <div key={k} className="wb-dw-mrow"><span className="wb-dw-mk">{k}</span><span className="wb-dw-mv">{v}</span></div>
            ))}
          </div>
          <div className="wb-dw-sec">@ai-visualize 標記 <span className="wb-dw-sec-n tnum">3</span></div>
          <div className="wb-dw-markers">
            {[["Fiber 工作單元排程", "已生成"], ["Render / Commit 時序圖", "已生成"], ["key diff 對照", "已生成"]].map(([t, st]) => (
              <div key={t} className="wb-marker">
                <span className="wb-dot ok" />
                <span className="wb-marker-t">{t}</span>
                <span className="wb-marker-s">{st}</span>
              </div>
            ))}
          </div>
          <div className="wb-dw-sec">同系列</div>
          <div className="wb-dw-markers">
            {WB_NOTES.filter((x) => x.s === n.s && x.p !== n.p).slice(0, 3).map((x, i) => (
              <div key={x.p} className="wb-marker link">
                <span className="wb-marker-i tnum">{i + 2}</span>
                <span className="wb-marker-t">{x.t}</span>
                <span className="wb-marker-s tnum">{x.d}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function WbListView({ drawer }) {
  const [sel, setSel] = React.useState(drawer ? "01-前端/react/react-rendering-fiber.mdx" : null);
  return (
    <div className="wb-frame">
      <WbRail active="home" />
      <WbSidebar activeFolder="fe" activeSeries={null} />
      <div className="wb-main">
        <WbHeader crumbs={["NoteCraft", "資料夾", "全部筆記"]} title="全部筆記" badges={[["22 篇", ""], ["3 無 frontmatter", "muted"]]} tabs={["List", "Board", "Table", "Timeline"]} activeTab="List" />
        <WbToolbar count={22} />
        <div className="wb-body flush">
          <WbListRows selected={sel} onSelect={setSel} />
        </div>
        {drawer && sel ? <WbDrawer slug={sel} onClose={() => setSel(null)} /> : null}
      </div>
    </div>
  );
}
Object.assign(window, { AiPill, WbListRows, WbDrawer, WbListView, WB_GCOLOR });
