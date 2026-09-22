// 已安裝外掛 —— 資料結構對齊 .notecraft/plugins.json 與 plugins/<id>/notecraft-plugin.json
const PT_APP_VERSION = "0.6.3";
const PT_PLUGINS = [
  {
    id: "er-diagram-renderer", title: "ER Diagram", version: "1.1.0", author: "建宇",
    description: "把資料庫 schema JSON 渲染成可聚焦、可搜尋的實體關聯圖",
    homepage: "https://github.com/SteveLin100132/notecraft/tree/main/plugins/er-diagram-renderer",
    engines: ">=0.6.0", source: "local", enabled: true,
    dataSchema: "schema.json", example: "example/schema.json",
    files: ["**/*.er.json"],
    options: { defaultRows: 6, hubTables: ["option_item"], canvasHeight: 640 },
    assets: [["notecraft-plugin.json", "manifest"], ["renderer.tsx", "renderer"], ["schema.json", "data schema"], ["example/schema.json", "範例資料"], ["README.md", "說明"]],
  },
  {
    id: "timeline-renderer", title: "Timeline", version: "0.4.2", author: "建宇",
    description: "把里程碑 JSON 渲染成帶相依關係的季度時間軸",
    homepage: "https://github.com/SteveLin100132/notecraft/tree/main/plugins/timeline-renderer",
    engines: ">=0.7.0", source: "npm", enabled: true,
    dataSchema: "schema.json", example: "example/roadmap.json",
    files: ["planning/roadmap.json"],
    options: { groupBy: "product", showDependencies: true },
    assets: [["notecraft-plugin.json", "manifest"], ["renderer.tsx", "renderer"], ["schema.json", "data schema"], ["README.md", "說明"]],
  },
  {
    id: "metrics-table-renderer", title: "Metrics Table", version: "0.2.0", author: "社群貢獻",
    description: "把指標定義 JSON 渲染成可排序、可展開計算式的指標表",
    homepage: "https://github.com/SteveLin100132/notecraft/tree/main/plugins/metrics-table-renderer",
    engines: ">=0.5.0", source: "git", enabled: false,
    dataSchema: "schema.json", example: null,
    files: ["metrics/**/*.json"],
    options: {},
    assets: [["notecraft-plugin.json", "manifest"], ["renderer.tsx", "renderer"], ["schema.json", "data schema"]],
  },
];
const PT_SOURCE = { local: ["本機", ".notecraft/plugins/"], npm: ["npm", "npx notecraftapp install-plugin"], git: ["git", "clone 至 .notecraft/plugins/"] };

function ptGlobMatch(glob, path) {
  const re = new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0001").replace(/\*\*/g, "\u0002").replace(/\*/g, "[^/]*")
    .replace(/\u0001/g, "(?:.*/)?").replace(/\u0002/g, ".*") + "$");
  return re.test(path);
}
function ptSemverOk(range, v) {
  const need = (range || "").replace(/[^0-9.]/g, "").split(".").map(Number);
  const has = v.split(".").map(Number);
  for (let i = 0; i < 3; i++) { if ((has[i] || 0) > (need[i] || 0)) return true; if ((has[i] || 0) < (need[i] || 0)) return false; }
  return true;
}

function PtInstalledPlugins({ onOpen, pluginCount, vizError }) {
  const [sel, setSel] = React.useState(null);
  const [off, setOff] = React.useState({});
  const list = PT_PLUGINS.slice(0, pluginCount === 1 ? 1 : PT_PLUGINS.length);
  const files = window.DATAFILES || [];
  const isOn = (p) => (off[p.id] === undefined ? p.enabled : !off[p.id]);
  const errored = (p) => vizError && p.id === "er-diagram-renderer";
  const matched = (p) => files.filter((f) => p.files.some((g) => ptGlobMatch(g, f.path)));
  const selP = list.find((p) => p.id === sel) || null;
  return (
    <>
      <div className="wb-body flush">
        <PtStatStrip items={[
          ["已安裝", list.length],
          ["啟用中", list.filter(isOn).length, "var(--wb-ok)"],
          ["映射資料檔", files.filter((f) => list.some((p) => p.files.some((g) => ptGlobMatch(g, f.path)))).length],
          ["不相容", list.filter((p) => !ptSemverOk(p.engines, PT_APP_VERSION)).length, "var(--wb-warn)"],
          ["notecraftapp", PT_APP_VERSION],
        ]} />
        <button className="wb-gh" style={{ "--gc": "#ed9b26", cursor: "default" }}>
          <span style={{ width: 11 }} /><Ic n="plug" s={13} />
          <span className="wb-gh-n">已安裝外掛</span>
          <span className="wb-gh-c tnum">{list.length}</span>
          <span className="wb-gh-stats tnum">點一列看設定、映射與檔案</span>
        </button>
        {list.map((p) => {
          const on = isOn(p);
          const compat = ptSemverOk(p.engines, PT_APP_VERSION);
          return (
            <div key={p.id} className={"wb-row" + (sel === p.id ? " sel" : "") + (on ? "" : " dim")} role="button" tabIndex={0} onClick={() => setSel(p.id === sel ? null : p.id)}>
              <Ic n="plug" s={13} c={on ? "var(--wb-gold)" : "var(--wb-ink-3)"} />
              <span className="wb-row-t">{p.title}</span>
              <span className="wb-row-p">{p.id}</span>
              <span className="wb-tagchip tnum">v{p.version}</span>
              {errored(p) ? <span className="wb-pill danger">渲染錯誤</span> : (!compat ? <span className="wb-pill warn">不相容</span> : null)}
              <span className="wb-row-d tnum" style={{ width: 34, flex: "0 0 34px" }}>{matched(p).length} 檔</span>
              <span className={"wb-pill " + (on ? "ok" : "muted")} style={{ width: 44, justifyContent: "center" }}>{on ? "啟用" : "停用"}</span>
              <span onClick={(e) => e.stopPropagation()}><PtSwitch value={on} onChange={(x) => setOff({ ...off, [p.id]: !x })} /></span>
            </div>
          );
        })}
        <div className="wb-callout">
          <Ic n="sparkle" s={14} c="var(--wb-blue-l)" />
          <div>
            <div className="wb-callout-t">安裝新外掛</div>
            <div className="wb-callout-b">執行 <span className="wb-code">npx notecraftapp install-plugin &lt;id&gt;</span>，檔案會寫入 <span className="wb-code">.notecraft/plugins/</span> 並產生型別定義 <span className="wb-code">_types.d.ts</span>。</div>
          </div>
        </div>
      </div>
      {selP ? <PtPluginDrawer p={selP} on={isOn(selP)} onToggle={(x) => setOff({ ...off, [selP.id]: !x })} errored={errored(selP)} files={matched(selP)} onOpen={onOpen} onClose={() => setSel(null)} /> : null}
    </>
  );
}

function PtPluginDrawer({ p, on, onToggle, errored, files, onOpen, onClose }) {
  const compat = ptSemverOk(p.engines, PT_APP_VERSION);
  const [srcLabel, srcHint] = PT_SOURCE[p.source];
  const meta = [
    ["id", p.id],
    ["版本", "v" + p.version],
    ["作者", p.author],
    ["來源", srcLabel + " ・ " + srcHint + (p.source === "local" ? p.id : "")],
    ["引擎需求", "notecraftapp " + p.engines],
    ["data schema", p.dataSchema],
    ["範例資料", p.example || "—"],
  ];
  return (
    <>
      <button className="wb-scrim" onClick={onClose} aria-label="關閉" />
      <aside className="wb-drawer">
        <div className="wb-dw-h">
          <span className="wb-crumb">.notecraft/plugins/{p.id}/</span>
          <button className="wb-dw-x" onClick={onClose}><Ic n="close" s={14} /></button>
        </div>
        <div className="wb-dw-body">
          <h2 className="wb-dw-t">{p.title}</h2>
          <div className="wb-dw-pills">
            <span className={"wb-pill " + (on ? "ok" : "muted")}>{on ? "啟用中" : "已停用"}</span>
            <span className="wb-pill tnum">v{p.version}</span>
            {errored ? <span className="wb-pill danger">渲染錯誤</span> : null}
            {!compat ? <span className="wb-pill warn tnum">渲染已跳過 ・ 需 {p.engines}</span> : null}
          </div>
          <p className="wb-dw-p">{p.description}</p>
          <div className="wb-dw-actions">
            <button className={on ? "wb-btn-ghost" : "wb-btn-solid"} onClick={() => onToggle(!on)}>{on ? "停用此外掛" : "啟用此外掛"}</button>
            <a className="wb-btn-ghost" href={p.homepage} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>homepage ↗</a>
          </div>
          {!compat ? <div className="wb-dw-warn">目前 notecraftapp {PT_APP_VERSION} 不符 {p.engines}，這個外掛的資料檔會維持未渲染狀態。</div> : null}
          <div className="wb-dw-sec">Manifest</div>
          <div className="wb-dw-meta">
            {meta.map(([k, val]) => <div key={k} className="wb-dw-mrow"><span className="wb-dw-mk">{k}</span><span className="wb-dw-mv">{val}</span></div>)}
          </div>
          <div className="wb-dw-sec">映射規則 <span className="wb-dw-sec-n">plugins.json</span></div>
          <div className="wb-pl-globs" style={{ padding: "6px 0 10px" }}>{p.files.map((g) => <span key={g} className="wb-code">{g}</span>)}</div>
          <div className="wb-dw-sec">命中的資料檔 <span className="wb-dw-sec-n tnum">{files.length}</span></div>
          {files.length ? (
            <div className="wb-dw-markers">
              {files.map((f) => (
                <button key={f.id} className="wb-marker link" onClick={() => onOpen(f.id)}>
                  <span className="wb-dot ok" />
                  <span className="wb-marker-t">{f.title}</span>
                  <span className="wb-marker-s">{f.path}</span>
                </button>
              ))}
            </div>
          ) : <p className="wb-dw-p" style={{ fontSize: 12.5, color: "var(--wb-ink-3)" }}>沒有檔案符合這條映射。</p>}
          <div className="wb-dw-sec">設定覆寫 <span className="wb-dw-sec-n">options</span></div>
          {Object.keys(p.options).length ? (
            <pre className="wb-pre" style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid var(--wb-line)" }}>{JSON.stringify(p.options, null, 2)}</pre>
          ) : <p className="wb-dw-p" style={{ fontSize: 12.5, color: "var(--wb-ink-3)" }}>未覆寫，全部採用資料檔自帶的 options。</p>}
          <div className="wb-dw-sec">外掛檔案</div>
          <div className="wb-dw-markers">
            {p.assets.map(([f, role]) => (
              <div key={f} className="wb-marker">
                <span className="wb-marker-t" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{f}</span>
                <span className="wb-marker-s">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
Object.assign(window, { PtInstalledPlugins, PtPluginDrawer, PT_PLUGINS, PT_APP_VERSION });
