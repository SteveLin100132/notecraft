// Plugin 頁的空狀態與邊界情境：情境模型、插圖、可複製指令、兩個頁籤的空狀態與「裝了卻沒在用」提示
const PL_OFFICIAL = [
  { id: "er-diagram-renderer", title: "ER Diagram", glob: "**/*.er.json", desc: "資料庫 schema JSON → 可導覽的 Wiki 與實體關聯圖" },
  { id: "openapi-renderer", title: "API 文件", glob: "**/*.openapi.json", desc: "OpenAPI 3.0／3.1 JSON → tag 與 operation 導覽、欄位樹、範例與 cURL" },
];
const PL_SCENS = [
  { value: "normal", label: "1. 正常（3 個外掛）" },
  { value: "one", label: "2. 只裝 1 個" },
  { value: "fresh", label: "3. 全新工作區（無 plugins.json）" },
  { value: "noplugins", label: "4. 有 plugins.json、0 個外掛" },
  { value: "nomap", label: "5. 已裝，無映射規則" },
  { value: "nohit", label: "6. 有規則，沒有命中" },
  { value: "disabled", label: "7. 已裝，全部停用" },
];
// 情境 6：規則存在但指到筆記資料夾裡不存在的位置
const PL_NOHIT_GLOBS = { "er-diagram-renderer": ["db/**/*.er.json"], "timeline-renderer": ["docs/roadmap.json"], "metrics-table-renderer": ["kpi/**/*.json"] };
const PL_REASON_PILL = { nomap: "未設定映射", nohit: "映射無命中", disabled: "外掛全部停用" };

function ptPlEnv(scen, off) {
  off = off || {};
  const base = window.PT_PLUGINS || [];
  const all = window.DATAFILES || [];
  let plugins, hasConfig = true;
  if (scen === "fresh" || scen === "noplugins") { plugins = []; hasConfig = scen === "noplugins"; }
  else if (scen === "one") plugins = base.slice(0, 1);
  else plugins = base.map((p) => scen === "nomap" ? { ...p, files: [] } : scen === "nohit" ? { ...p, enabled: true, files: PL_NOHIT_GLOBS[p.id] || ["none/*.json"] } : scen === "disabled" ? { ...p, enabled: false } : (scen === "normal" ? p : { ...p, enabled: true }));
  const isOn = (p) => (off[p.id] === undefined ? p.enabled : !off[p.id]);
  const matched = (p) => all.filter((f) => p.files.some((g) => ptGlobMatch(g, f.path)));
  // 正常／只裝 1 個沿用既有資料；其餘情境的資料檔 = 啟用中外掛的規則命中的檔案
  const strict = scen !== "normal" && scen !== "one";
  const files = scen === "normal" ? all : scen === "one" ? all.filter((f) => f.plugin === base[0].id)
    : all.filter((f) => plugins.some((p) => isOn(p) && p.files.some((g) => ptGlobMatch(g, f.path))));
  const rules = plugins.reduce((a, p) => a + p.files.length, 0);
  let reason = null;
  if (!plugins.length) reason = hasConfig ? "noplugins" : "fresh";
  else if (!files.length) reason = !rules ? "nomap" : (plugins.every((p) => !isOn(p)) ? "disabled" : "nohit");
  return { scen, plugins, hasConfig, files, rules, reason, isOn, matched, strict };
}

function plCopy(text, msg) {
  try { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon: "check" } }));
}
function PlCopyBtn({ text, msg, label }) {
  const [done, setDone] = React.useState(false);
  const t = React.useRef(null);
  const go = () => { plCopy(text, msg); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1600); };
  return (
    <button className={"upd-copy" + (done ? " done" : "")} onClick={go} aria-label={label}>
      <Ic n={done ? "check" : "copy"} s={13} sw={done ? 2.2 : 1.7} />{done ? "已複製" : "複製"}
    </button>
  );
}
function PlCmd({ cmd, primary }) {
  return (
    <div className={"pl-cmd" + (primary ? " primary" : "")}>
      <span className="pl-cmd-p">$</span><code>{cmd}</code>
      <PlCopyBtn text={cmd} msg="已複製指令" label={"複製指令 " + cmd} />
    </div>
  );
}
function PlSnippet({ name, code }) {
  return (
    <div className="pl-snip">
      <div className="pl-snip-h">{name}<PlCopyBtn text={code} msg={"已複製 " + name + " 範例"} label={"複製 " + name + " 範例"} /></div>
      <pre className="wb-pre">{code}</pre>
    </div>
  );
}

// 插圖：與 PtEmptyArt 同尺度（132×104、地面橢圓、金色點綴），顏色一律以 style 帶 --wb-* 變數
function PlArt({ kind }) {
  const f = (fill, stroke, sw, extra) => ({ fill: fill || "none", stroke: stroke || "none", strokeWidth: sw || 0, ...(extra || {}) });
  const B = "var(--wb-blue-l)", O = "var(--wb-gold)", S = "var(--wb-line)", P = "var(--wb-panel)", M = "var(--wb-ink-3)";
  const ground = <ellipse cx="66" cy="94" rx="42" ry="5" style={f(S, null, 0, { opacity: 0.7 })} />;
  const spark = <path d="M108 20c3 0 5-2 5-5 0 3 2 5 5 5-3 0-5 2-5 5 0-3-2-5-5-5z" style={f(O)} />;
  const plug = (x, y, c, k) => (
    <g key={k}>
      <path d={`M${x - 6} ${y - 10}v8M${x + 6} ${y - 10}v8`} style={f(null, c, 2.4)} />
      <rect x={x - 12} y={y - 2} width="24" height="18" rx="4" style={f(P, c, 2)} />
      <path d={`M${x} ${y + 16}v6`} style={f(null, c, 2)} />
    </g>
  );
  const json = (x, y, c, dash) => (
    <g>
      <path d={`M${x} ${y + 7}a7 7 0 0 1 7-7h26l12 12v47a7 7 0 0 1-7 7H${x + 7}a7 7 0 0 1-7-7z`} style={f(P, c, 2, dash ? { strokeDasharray: "4 4" } : null)} />
      <path d={`M${x + 33} ${y}v12h12`} style={f(null, c, 2, dash ? { strokeDasharray: "4 4" } : null)} />
      <path d={`M${x + 16} ${y + 26}c-4 0-4 3-4 6s-2 4-4 4c2 0 4 1 4 4s0 6 4 6M${x + 29} ${y + 26}c4 0 4 3 4 6s2 4 4 4c-2 0-4 1-4 4s0 6-4 6`} style={f(null, dash ? S : O, 2.2)} />
    </g>
  );
  const svg = (children) => <svg width="132" height="104" viewBox="0 0 132 104" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ground}{children}</svg>;
  if (kind === "plug") return svg(<>
    <rect x="28" y="22" width="76" height="62" rx="9" style={f(P, B, 2, { strokeDasharray: "5 5" })} />
    {plug(66, 46, B)}
    {spark}<path d="M20 48v6M17 51h6" style={f(null, O, 2)} /><circle cx="112" cy="58" r="2.2" style={f(O)} />
  </>);
  if (kind === "data") return svg(<>
    {json(26, 16, B)}
    <path d="M78 52h10" style={f(null, S, 2.2, { strokeDasharray: "3 4" })} />
    <circle cx="100" cy="52" r="13" style={f(P, O, 2, { strokeDasharray: "4 4" })} />
    <path d="M100 47v10M95 52h10" style={f(null, O, 2.2)} />
    {spark}
  </>);
  if (kind === "map") return svg(<>
    {json(16, 18, B)}
    <path d="M68 52h8M88 52h6" style={f(null, M, 2.2, { strokeDasharray: "3 4" })} />
    <circle cx="82" cy="52" r="2.6" style={f(O)} />
    {plug(108, 44, B)}
  </>);
  if (kind === "nohit") return svg(<>
    {json(22, 16, S, true)}
    <circle cx="80" cy="56" r="17" style={f(P, B, 2.2)} />
    <path d="M92 68l12 12" style={f(null, B, 3)} />
    <path d="M74 56h12" style={f(null, O, 2.4)} />
    {spark}
  </>);
  if (kind === "off") return svg(<>
    {plug(52, 34, M)}
    <rect x="70" y="56" width="40" height="22" rx="11" style={f(S)} />
    <circle cx="81" cy="67" r="7.5" style={f(P, M, 1.6)} />
    <path d="M36 74h20" style={f(null, S, 3)} />
    <path d="M22 44v6M19 47h6" style={f(null, O, 2)} />
  </>);
  return svg(<>
    <rect x="34" y="24" width="56" height="62" rx="7" style={f(P, S, 2, { transform: "rotate(-6deg)", transformOrigin: "62px 55px" })} />
    <rect x="42" y="18" width="56" height="64" rx="7" style={f(P, B, 2)} />
    <path d="M52 34h24M52 44h36M52 54h30M52 64h20" style={f(null, S, 3)} />
    <circle cx="108" cy="30" r="2.4" style={f(O)} />
  </>);
}

// ── 「已安裝外掛」頁籤：0 個外掛 ──
function PtPlInstallEmpty({ env, devMode }) {
  if (!devMode) return (
    <div className="pl-es">
      <PlArt kind="quiet" />
      <div className="pt-empty-t">這個站沒有使用外掛</div>
      <div className="pt-empty-s">外掛用來把 JSON 資料畫成頁面，這個站目前沒有用到。</div>
    </div>
  );
  return (
    <div className="pl-es">
      <PlArt kind="plug" />
      <div className="pt-empty-t">還沒有安裝外掛</div>
      <div className="pt-empty-s">外掛負責把結構化的 JSON 資料檔畫成頁面，例如把資料庫 schema 畫成關聯圖。先安裝外掛，再指定它要處理哪些檔案。</div>
      <div className="pl-es-main">
        <PlCmd cmd="npx notecraftapp install-plugin" primary />
        <div className="pl-note">不帶 id 會列出官方外掛清單讓你選。</div>
        {env.reason === "fresh" ? (
          <div className="pl-fresh">
            <Ic n="doc" s={14} c="var(--wb-gold)" />
            <div>這個工作區還沒有 <span className="wb-code">.notecraft/plugins.json</span>。用下方帶 <span className="wb-code">--apply</span> 的指令安裝，會一併建立這個檔案並寫入映射規則；只裝外掛的話，之後要自己建立。</div>
          </div>
        ) : null}
        <div className="pl-sec">官方外掛</div>
        <div className="pl-off">
          {PL_OFFICIAL.map((o) => (
            <div key={o.id} className="pl-off-row">
              <div className="pl-off-top"><Ic n="plug" s={13} c="var(--wb-gold)" /><span className="pl-off-t">{o.title}</span><span className="pl-off-id">{o.id}</span></div>
              <div className="pl-off-d">{o.desc}</div>
              <PlCmd cmd={`npx notecraftapp install-plugin ${o.id} --apply "${o.glob}"`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 「資料檔」頁籤：沒有任何資料檔 ──
function PtPlDataEmpty({ env, devMode, onGoInstalled }) {
  if (!devMode) return (
    <div className="pl-es">
      <PlArt kind="quiet" />
      <div className="pt-empty-t">這個站沒有使用資料檔</div>
      <div className="pt-empty-s">這裡的內容都是筆記。資料檔是由外掛畫成的資料頁面，例如資料表關聯圖，這個站沒有發佈。</div>
    </div>
  );
  const n = env.plugins.length;
  const C = {
    fresh: ["data", "還沒有外掛，所以沒有資料檔", "資料檔是交給外掛渲染的 JSON 檔。這個工作區還沒有安裝任何外掛，JSON 檔會維持原樣，不會出現在這裡。", "查看官方外掛"],
    nomap: ["map", "外掛還沒有分配到檔案", `已安裝 ${n} 個外掛，但 .notecraft/plugins.json 沒有任何映射規則，沒有 JSON 檔交給外掛處理。`, "設定映射規則"],
    nohit: ["nohit", "映射規則沒有命中任何檔案", `plugins.json 有 ${env.rules} 條規則，但筆記資料夾裡沒有符合的 JSON 檔。可能是 glob 寫錯、檔案放在筆記資料夾外，或被 ignore.json 排除。`, "檢查映射規則"],
    disabled: ["off", "外掛都停用了", `已安裝的 ${n} 個外掛都在停用中。停用的外掛不處理任何檔案，所以這裡沒有資料檔。`, "重新啟用外掛"],
  };
  const [art, title, sub, act] = C[env.reason === "noplugins" ? "fresh" : env.reason] || C.nohit;
  return (
    <div className="pl-es">
      <PlArt kind={art} />
      <div className="pt-empty-t">{title}</div>
      <div className="pt-empty-s">{sub}</div>
      <button className="pt-empty-btn" onClick={onGoInstalled}>{act} →</button>
    </div>
  );
}

// ── 「已安裝外掛」頁籤：裝了卻沒在用（情境 5／6／7，dev 才顯示）──
function PtPlHint({ env }) {
  const r = env.reason, n = env.plugins.length;
  if (r !== "nomap" && r !== "nohit" && r !== "disabled") return null;
  const base = window.PT_PLUGINS || [];
  const glob = (p) => ((base.find((x) => x.id === p.id) || p).files[0] || "**/*.json");
  const json = '{\n  "plugins": [\n' + env.plugins.map((p) => `    { "plugin": "${p.id}", "files": ["${glob(p)}"] }`).join(",\n") + "\n  ]\n}";
  return (
    <div className="pl-hint" role="status">
      <Ic n="plug" s={15} c="var(--wb-gold)" />
      <div className="pl-hint-c">
        {r === "nomap" ? <>
          <div className="pl-hint-t">外掛已安裝，但還沒有映射規則</div>
          <div className="pl-hint-b">在 <span className="wb-code">.notecraft/plugins.json</span> 指定每個外掛處理哪些 JSON 檔，命中的檔案才會變成資料檔頁。路徑相對於筆記資料夾。</div>
          <PlSnippet name=".notecraft/plugins.json" code={json} />
        </> : null}
        {r === "nohit" ? <>
          <div className="pl-hint-t">有 {env.rules} 條映射規則，但沒有命中任何檔案</div>
          <ul className="pl-hint-ul">
            <li>檢查 glob 寫法：<span className="wb-code">**/*.er.json</span> 會比對所有子資料夾，<span className="wb-code">*.er.json</span> 只比對最上層。</li>
            <li>資料檔必須放在筆記資料夾 <span className="wb-code">src/content/notes/</span> 內，規則裡的路徑相對於這個資料夾。</li>
            <li>檔案可能被 <span className="wb-code">.notecraft/ignore.json</span> 排除。</li>
          </ul>
          <div className="pl-hint-globs">{env.plugins.flatMap((p) => p.files.map((g) => <span key={p.id + g} className="wb-code">{g}</span>))}</div>
        </> : null}
        {r === "disabled" ? <>
          <div className="pl-hint-t">{n} 個外掛都停用了</div>
          <div className="pl-hint-b">停用中的外掛不處理任何檔案。用列尾的開關重新啟用，命中的資料檔會出現在「資料檔」頁籤。</div>
        </> : null}
      </div>
    </div>
  );
}

Object.assign(window, { PL_OFFICIAL, PL_SCENS, PL_REASON_PILL, ptPlEnv, PlCmd, PlSnippet, PlArt, PtPlInstallEmpty, PtPlDataEmpty, PtPlHint });
