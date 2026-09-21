function Wg({ span, title, meta, children, pad = 12 }) {
  return (
    <section className="wb-wg" style={{ gridColumn: "span " + span }}>
      <header className="wb-wg-h">
        <span className="wb-wg-t">{title}</span>
        {meta ? <span className="wb-wg-m">{meta}</span> : null}
      </header>
      <div className="wb-wg-b" style={{ padding: pad }}>{children}</div>
    </section>
  );
}

function WbDashboard() {
  const recent = WB_NOTES.slice(0, 8);
  const maxTag = WB_TAGS[0][1];
  const maxWeek = Math.max(...WB_WEEKS);
  return (
    <div className="wb-frame">
      <WbRail active="home" />
      <WbSidebar activeFolder={null} activeSeries={null} />
      <div className="wb-main">
        <WbHeader crumbs={["NoteCraft", "工作區"]} title="儀表板" badges={[["42 篇筆記", ""], ["11 待生成", "warn"]]} tabs={["總覽", "本週", "AI 佇列"]} activeTab="總覽" />
        <div className="wb-body">
          <div className="wb-grid">
            <Wg span={3} title="筆記總數" meta="全部資料夾" pad={0}>
              <div className="wb-kpi">
                <div className="wb-kpi-n tnum">42</div>
                <div className="wb-kpi-sub">本週新增 <b className="tnum up">+5</b> ・ 本月 <b className="tnum">+13</b></div>
              </div>
            </Wg>
            <Wg span={3} title="AI 視覺化生成率" meta="54 / 65 標記" pad={0}>
              <div className="wb-kpi">
                <div className="wb-kpi-row">
                  <div className="wb-kpi-n tnum">83<span className="wb-kpi-u">%</span></div>
                  <div className="wb-kpi-side">已生成 <b className="tnum">54</b><br />待生成 <b className="tnum warn">11</b></div>
                </div>
                <div className="wb-bar lg"><i style={{ width: "83%" }} /></div>
              </div>
            </Wg>
            <Wg span={6} title="寫作頻率 · 近 12 週" meta="每週新增／更新筆記數">
              <div className="wb-spark">
                {WB_WEEKS.map((v, i) => (
                  <div key={i} className="wb-spark-col">
                    <span className="wb-spark-v tnum">{v}</span>
                    <span className="wb-spark-b" style={{ height: Math.round((v / maxWeek) * 62) + "px", opacity: i === 11 ? 1 : 0.62 }} />
                    <span className="wb-spark-x tnum">{i === 0 ? "W23" : i === 11 ? "W34" : ""}</span>
                  </div>
                ))}
              </div>
            </Wg>

            <Wg span={8} title="最近更新" meta="8 / 42 篇" pad={0}>
              <div>
                {recent.map((n) => (
                  <div key={n.p} className="wb-row dense">
                    <Ic n="doc" s={13} c="var(--wb-ink-3)" />
                    <span className="wb-row-t">{n.t}</span>
                    <span className="wb-row-p">{n.p.replace(/\/[^/]+$/, "/")}</span>
                    <AiPill ai={n.ai} nofm={n.nofm} />
                    <span className="wb-row-d tnum">{n.d}</span>
                  </div>
                ))}
              </div>
            </Wg>
            <Wg span={4} title="系列進度" meta="4 個系列">
              <div className="wb-series-list">
                {WB_SERIES.map((s) => (
                  <div key={s.id} className="wb-series">
                    <div className="wb-series-top">
                      <span className="wb-sb-swatch" style={{ background: s.color }} />
                      <span className="wb-series-n">{s.name}</span>
                      <span className="wb-series-c tnum">{s.done}/{s.total}</span>
                    </div>
                    <div className="wb-bar"><i style={{ width: (s.done / s.total) * 100 + "%" }} /></div>
                    <div className="wb-series-next">繼續讀：{WB_NOTES.find((n) => n.s === s.id).t}</div>
                  </div>
                ))}
              </div>
            </Wg>

            <Wg span={7} title="標籤分布" meta="前 10 個標籤 ・ 共 28 個">
              <div className="wb-tagchart">
                {WB_TAGS.map(([name, v]) => (
                  <div key={name} className="wb-tagrow">
                    <span className="wb-tagrow-n">{name}</span>
                    <span className="wb-tagrow-track"><i style={{ width: (v / maxTag) * 100 + "%" }} /></span>
                    <span className="wb-tagrow-v tnum">{v}</span>
                  </div>
                ))}
              </div>
            </Wg>
            <Wg span={5} title="待生成 @ai-visualize 標記" meta="11 個 ・ 8 篇" pad={0}>
              <div>
                {WB_NOTES.filter((n) => n.ai[1] > 0).slice(0, 6).map((n) => (
                  <div key={n.p} className="wb-row dense">
                    <span className="wb-dot warn" />
                    <span className="wb-row-t">{n.t}</span>
                    <span className="wb-row-p">{n.g}</span>
                    <span className="wb-pill warn tnum">待生成 {n.ai[1]}</span>
                  </div>
                ))}
                <div className="wb-row-more">查看全部 8 篇 →</div>
              </div>
            </Wg>
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { Wg, WbDashboard });
