// 關聯圖規格：狀態索引、規格表、--wb-gr-* token 表、元件細部
const GR_STATES = [
  ["default", "預設", "文件模式，約 60 個節點、孤島在外圍成團"],
  ["hover", "hover 節點", "相鄰節點與邊保持原色，其餘淡出；顯示提示框"],
  ["select", "選取節點", "選取環 + NoteDrawer 從右側滑入，圖不變形"],
  ["edge", "hover 邊", "「A → B・定義引用 ×3」"],
  ["search", "搜尋中", "輸入「React」，符合的高亮"],
  ["tag", "標籤模式", "標籤為樞紐、筆記圍著標籤成團"],
  ["taghover", "標籤模式 hover 樞紐", "該團高亮，其餘淡出"],
  ["filter", "套用篩選", "側欄只看「02-後端」"],
  ["loading", "載入中", "畫布置中的骨架"],
  ["emptyA", "空狀態 A", "篩選後沒有筆記"],
  ["emptyB", "空狀態 B", "有筆記但沒有任何關聯"],
  ["big", "約 300 個節點", "文字全部隱藏，只留樞紐"],
  ["focus", "鍵盤 focus", "節點是可聚焦的按鈕，虛線 focus 環"],
  ["narrow", "寬度 < 860", "不畫圖，改用清單檢視"],
];
const GR_TOKENS = [
  ["分類色盤（品牌藍單色系，8 階明度；相鄰分類明度差至少 2 階）", [
    ["--wb-gr-c1", "分類 1・品牌藍 700"], ["--wb-gr-c2", "分類 2・淺藍"], ["--wb-gr-c3", "分類 3・最深藍"], ["--wb-gr-c4", "分類 4・中淺藍"],
    ["--wb-gr-c5", "分類 5・深藍"], ["--wb-gr-c6", "分類 6・更淺藍"], ["--wb-gr-c7", "分類 7・品牌藍 500"], ["--wb-gr-c8", "分類 8・最淺藍（加 1px 藍色描邊）"],
    ["--wb-gr-c0", "未分類（未加標籤、未歸入系列、不著色）"], ["--wb-gr-c-data", "資料檔節點（另以圓角方塊區分）"]]],
  ["邊", [
    ["--wb-gr-e-ref", "定義引用・顏色"], ["--wb-gr-e-inc", "定義嵌入・顏色"], ["--wb-gr-e-link", "站內連結・顏色"], ["--wb-gr-e-seq", "系列順序・顏色"], ["--wb-gr-e-tag", "標籤模式 筆記—標籤 細線"],
    ["--wb-gr-dash-ref", "定義引用・實線"], ["--wb-gr-dash-inc", "定義嵌入・虛線"], ["--wb-gr-dash-link", "站內連結・點線"], ["--wb-gr-dash-seq", "系列順序・點劃線"],
    ["--wb-gr-w-ref", "定義引用・基本線寬"], ["--wb-gr-w-inc", "定義嵌入・基本線寬"], ["--wb-gr-w-link", "站內連結・基本線寬"], ["--wb-gr-w-seq", "系列順序・基本線寬"], ["--wb-gr-w-tag", "筆記—標籤線寬"],
    ["--wb-gr-w-step", "每多一次關聯加粗"], ["--wb-gr-w-max", "線寬上限"]]],
  ["節點", [["--wb-gr-r1", "第 1 級半徑・被連入 0–1"], ["--wb-gr-r2", "第 2 級・2–3"], ["--wb-gr-r3", "第 3 級・4–7"], ["--wb-gr-r4", "第 4 級（樞紐）・8+"], ["--wb-gr-r-hub", "標籤樞紐最小半徑（+ 2.6 × √筆記數）"]]],
  ["淡出與畫布", [["--wb-gr-edge-rest", "邊的靜止不透明度"], ["--wb-gr-dim-node", "淡出節點／文字"], ["--wb-gr-dim-edge", "淡出的邊"], ["--wb-gr-canvas", "畫布底色"], ["--wb-gr-grid", "畫布點格"], ["--wb-gr-halo", "節點描邊、文字光暈"],
    ["--wb-gr-sel", "選取環（品牌橙，與藍色節點區隔）"], ["--wb-gr-sel-halo", "選取光暈"], ["--wb-gr-focus", "鍵盤 focus 環"]]],
  ["縮放與動態", [["--wb-gr-zoom-label", "全部標題出現的縮放門檻"], ["--wb-gr-zoom-label-dense", "節點 > 150 時的門檻"], ["--wb-gr-zoom-min", "最小縮放"], ["--wb-gr-zoom-max", "最大縮放"],
    ["--wb-gr-dur-move", "模式切換：節點移動"], ["--wb-gr-dur-fade", "淡出／淡入"], ["--wb-gr-dur-glide", "符合視窗、縮放鈕、選取後平移"], ["--wb-gr-ease", "緩動"]]],
];
function grTokVal(name) { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) { return ""; } }
function GrTokSample({ name }) {
  if (/-c\d|-c-data|-e-(ref|inc|link|seq|tag)$|-sel$|-sel-halo|-focus|-canvas|-grid|-halo/.test(name)) return <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 5, background: `var(${name})`, border: "1px solid var(--wb-line)", verticalAlign: "middle" }} />;
  const m = name.match(/-(?:dash|w)-(ref|inc|link|seq)$/);
  if (m) return <GrLine kind={m[1]} w={34} arrow />;
  const r = name.match(/-r(\d)$/);
  if (r) return <span style={{ display: "inline-block", width: window.GR_R[r[1] - 1] * 2, height: window.GR_R[r[1] - 1] * 2, borderRadius: "50%", background: "var(--wb-gr-c1)", verticalAlign: "middle" }} />;
  return null;
}

function GrNodeStates() {
  const S = ({ cls, label, data }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 11, color: "var(--wb-ink-3)" }}>
      <svg width="64" height="64" viewBox="-32 -32 64 64" style={{ overflow: "visible" }}>
        <g className={"gr-n " + cls}>
          {data ? <>{cls === "sel" ? <><rect className="gr-halo" x="-20" y="-20" width="40" height="40" rx="8" /><rect className="gr-ring" x="-15.5" y="-15.5" width="31" height="31" rx="6.2" /></> : null}{cls === "kfocus" ? <rect className="gr-fring" x="-16.5" y="-16.5" width="33" height="33" rx="6.6" /> : null}<rect className="gr-shape" x="-12" y="-12" width="24" height="24" rx="4.6" style={{ fill: "var(--wb-gr-c-data)" }} /></>
            : <>{cls === "sel" ? <><circle className="gr-halo" r="20" /><circle className="gr-ring" r="15.5" /></> : null}{cls === "kfocus" ? <circle className="gr-fring" r="16.5" /> : null}<circle className="gr-shape" r="12" style={{ fill: "var(--wb-gr-c1)" }} /></>}
        </g>
      </svg>{label}
    </div>
  );
  return <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}><S cls="" label="預設" /><S cls="hov" label="hover" /><S cls="sel" label="選取" /><S cls="kfocus" label="鍵盤 focus" /><S cls="" data label="資料檔" /><S cls="sel" data label="資料檔・選取" /></div>;
}

function PtGraphSpec({ onClose, onDemo }) {
  window.useEscLayer && window.useEscLayer(true, 45, onClose);
  const demoTipN = { title: "HTTP 基礎總覽", folder: "05-網路", inDeg: 9, outDeg: 0, gtags: ["網路"], data: false };
  const demoTipE = { kinds: { ref: 3 } };
  return (
    <div className="gr-spec-scrim" onClick={onClose}>
      <div className="gr-spec" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Graph 規格">
        <div className="gr-spec-h"><h2>Graph 檢視規格</h2><span className="wb-crumb">/notes ・ 第三種檢視 ・ class 前綴 gr-</span><button className="wb-dw-x" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="關閉"><Ic n="close" s={14} /></button></div>
        <div className="gr-spec-b">
          <h3>狀態畫面 <small>點一張即套用到工作台；Tweaks 的「Graph 狀態」也可切換</small></h3>
          <div className="gr-states">{GR_STATES.map(([k, t, d], i) => <button key={k} className="gr-st" onClick={() => onDemo(k)}><i>{String(i + 1).padStart(2, "0")}</i><div><b>{t}</b><span>{d}</span></div></button>)}</div>

          <h3>節點</h3>
          <table className="gr-tbl"><thead><tr><th>級距</th><th>被連入數</th><th>半徑</th><th>標題</th><th>樣本</th></tr></thead><tbody>
            {window.GR_R.map((r, i) => <tr key={i}><td>第 {i + 1} 級</td><td className="num">{["0–1", "2–3", "4–7", "8 以上（樞紐）"][i]}</td><td className="num"><code>--wb-gr-r{i + 1}</code>　{r}px</td><td>{i >= 2 ? "預設顯示" : "縮放 ≥ 150% 或 hover 時顯示"}</td><td><GrTokSample name={"--wb-gr-r" + (i + 1)} /></td></tr>)}
            <tr><td>標籤樞紐</td><td>—</td><td className="num">15 + 2.6 × √筆記數</td><td>一律顯示（名稱 + 筆記數）</td><td><svg width="34" height="34"><circle cx="17" cy="17" r="15" fill="var(--wb-panel)" stroke="var(--wb-gr-c1)" strokeWidth="2" /></svg></td></tr>
          </tbody></table>
          <p style={{ marginTop: 8 }}>被連入數以「不同來源」計算，同一對筆記多次關聯只算一次。節點描邊 1.6px <code>--wb-gr-halo</code>；選取環 2.4px <code>--wb-gr-sel</code>，外加 8px 光暈；focus 環 2px 虛線 <code>--wb-gr-focus</code>，間距 4.5px。資料檔為圓角方塊（圓角 = 半徑 × 0.38），形狀本身即可與筆記區分。</p>

          <h3>邊</h3>
          <table className="gr-tbl"><thead><tr><th>種類</th><th>意義</th><th>線型</th><th>基本線寬</th><th>顏色</th><th>樣本</th></tr></thead><tbody>
            {window.GR_KINDS.map((k) => <tr key={k}><td><b>{window.GR_KIND[k].name}</b></td><td>{window.GR_KIND[k].desc}</td><td>{{ ref: "實線", inc: "虛線 7 / 3.5", link: "點線 1.6 / 3.4", seq: "點劃線 9 / 3 / 2 / 3" }[k]}</td><td className="num">{grTokVal("--wb-gr-w-" + k)}</td><td><code>--wb-gr-e-{k}</code></td><td><GrLine kind={k} w={44} arrow /></td></tr>)}
          </tbody></table>
          <p style={{ marginTop: 8 }}>有方向，箭頭為長 7px、寬 6.6px 的三角形（不隨線寬放大），尖端落在目標節點邊緣外 2px。淡出一律用 stroke-opacity／fill-opacity，不對群組設 opacity，避免數百個合成圖層。同一對筆記多次關聯合成一條邊：線寬 = 基本線寬 + (次數 − 1) × 0.7px，上限 4.6px；線型取次數最多的種類，提示框列出各種類次數。邊的開關只影響顯示，不重新佈局。</p>

          <h3>文字、淡出與動態</h3>
          <table className="gr-tbl"><thead><tr><th>項目</th><th>值</th><th>說明</th></tr></thead><tbody>
            <tr><td>節點標題字級</td><td className="num">11px（螢幕），粗體用於 hover／選取／符合搜尋</td><td>字級除以縮放倍率，螢幕上維持 11px；3px 光暈描邊</td></tr>
            <tr><td>預設顯示標題</td><td>第 3、4 級節點、標籤樞紐</td><td>hover、focus、選取、符合搜尋的節點一律顯示</td></tr>
            <tr><td>全部標題出現</td><td className="num">縮放 ≥ 150%</td><td>節點 &gt; 150 時改為 ≥ 240%，且預設只有第 4 級顯示</td></tr>
            <tr><td>縮放範圍</td><td className="num">25%–300%</td><td>滾輪以游標為中心；按鈕每次 ×1.25 / ×0.8；符合視窗上限 160%</td></tr>
            <tr><td>邊・靜止</td><td className="num">0.55</td><td><code>--wb-gr-edge-rest</code></td></tr>
            <tr><td>淡出・節點與文字</td><td className="num">0.16</td><td><code>--wb-gr-dim-node</code>，hover／搜尋／樞紐 hover 時非相關者</td></tr>
            <tr><td>淡出・邊</td><td className="num">0.06</td><td><code>--wb-gr-dim-edge</code>；相關的邊提高到 0.95</td></tr>
            <tr><td>模式切換</td><td className="num">600ms・ease-out</td><td>節點從舊位置移到新位置；標籤樞紐同時淡入</td></tr>
            <tr><td>淡出／淡入</td><td className="num">220ms</td><td><code>--duration-normal</code></td></tr>
            <tr><td>符合視窗、縮放鈕、選取平移</td><td className="num">360ms・ease-out</td><td>滾輪與拖曳不加動畫</td></tr>
            <tr><td>prefers-reduced-motion</td><td>不移動</td><td>模式切換直接換位、平移直接跳到定位、骨架不閃爍</td></tr>
            <tr><td>佈局</td><td>算完即靜止</td><td>力導向在背景同步算完（約 380 次迭代）再輸出，畫面上不持續晃動；不提供拖曳節點</td></tr>
          </tbody></table>

          <h3>佈局規則</h3>
          <p>文件模式：有關聯的節點以力導向排在中央（斥力、依邊的彈簧、向心力、碰撞）。孤島依目前的著色依據分團，以黃金角螺旋緊密排列，沿著主圖外圍一圈放置，每團下方標「孤島・分組名」。</p>
          <p>標籤模式：8 個標籤樞紐 + 「未加標籤」等距排在圓上，相關主題相鄰（前端・效能・網路・資安・後端・系統設計・系統規格・產品管理）。只有一個標籤的筆記以螺旋圍著樞紐；多個標籤的筆記落在各樞紐的中點，再以碰撞推開，並用細線連回各自的標籤。筆記與筆記之間不畫線，資料檔歸入未加標籤。</p>
          <p>選取節點時 NoteDrawer（480px）從主區右側覆蓋；若節點落在 Drawer 底下，圖整體平移到左側可見區的中央，不縮放、不重新佈局。</p>

          <h3>新 token <small>淺色主題的值；暗色只覆寫畫布、點格、光暈、細線與 c0／c8</small></h3>
          {GR_TOKENS.map(([g, list]) => (
            <div key={g} style={{ marginBottom: 14 }}>
              <div className="gr-lg-t" style={{ margin: "4px 0 6px" }}>{g}</div>
              <table className="gr-tbl"><thead><tr><th style={{ width: 210 }}>Token</th><th style={{ width: 170 }}>值</th><th>用途</th><th style={{ width: 60 }}>樣本</th></tr></thead><tbody>
                {list.map(([n, u]) => <tr key={n}><td><code>{n}</code></td><td className="num"><code style={{ color: "var(--wb-ink-2)" }}>{grTokVal(n)}</code></td><td>{u}</td><td><GrTokSample name={n} /></td></tr>)}
              </tbody></table>
            </div>
          ))}

          <h3>元件細部</h3>
          <div className="gr-parts">
            <div className="gr-part"><div className="gr-part-h">圖例（左下，可收合）</div>
              <div className="gr-part-stage"><GrLegend open mode="doc" colorBy="folder" kinds={{ ref: true, inc: true, link: true, seq: true }} groups={[["01-前端", 13], ["02-後端", 15], ["05-網路", 7]].map(([k, n]) => ({ key: k, n, color: window.grColor(k, "folder") }))} onToggle={() => {}} /><GrLegend open={false} mode="doc" colorBy="folder" groups={[]} kinds={{}} onToggle={() => {}} /></div>
              <ul><li>寬 216px，圓角 10px，距畫布邊 14px；收合後只留 32px 高的標題列。</li><li>色塊只列目前畫面上有的分組，右側為節點數。</li><li>標籤模式改列樞紐、未加標籤與細線三種結構。</li></ul></div>
            <div className="gr-part"><div className="gr-part-h">提示框</div>
              <div className="gr-part-stage" style={{ flexDirection: "column" }}><div className="gr-tip" style={{ animation: "none" }}><GrTipNode n={demoTipN} mode="doc" /></div><div className="gr-tip" style={{ animation: "none" }}><GrTipEdge e={demoTipE} a="HTTP 快取策略" b="HTTP 基礎總覽" /></div></div>
              <ul><li>節點：標題、資料夾（資料檔改顯示 plugin）、連入／連出數；位於節點右側 10px，靠近右緣時翻到左側。</li><li>邊：位於邊的中點，「A → B」加上各種類的線型樣本與次數。</li><li>不攔截游標（pointer-events: none），120ms 淡入。</li></ul></div>
            <div className="gr-part"><div className="gr-part-h">縮放控制（右下）</div>
              <div className="gr-part-stage"><GrZoom k={1} onIn={() => {}} onOut={() => {}} onFit={() => {}} /><GrZoom k={3} onIn={() => {}} onOut={() => {}} onFit={() => {}} /></div>
              <ul><li>32 × 32 按鈕直排：放大、縮小、符合視窗，下方顯示目前倍率。</li><li>到達上下限時對應按鈕停用。</li><li>每個按鈕有 aria-label 與 2px focus 外框。</li></ul></div>
            <div className="gr-part"><div className="gr-part-h">統計列（右上）</div>
              <div className="gr-part-stage" style={{ flexDirection: "column" }}><GrStats mode="doc" nNotes={63} nEdges={71} nOrph={15} /><GrStats mode="doc" nNotes={63} nEdges={71} nOrph={15} match={6} /><GrStats mode="tag" nNotes={63} nTags={8} nUntag={5} /></div>
              <ul><li>文件模式：「N 篇筆記・M 條關聯・K 篇孤島」；M 只計目前勾選的邊。</li><li>標籤模式改為標籤數與未加標籤數；搜尋時附加「符合 n」。</li></ul></div>
            <div className="gr-part" style={{ gridColumn: "1 / -1" }}><div className="gr-part-h">節點狀態</div>
              <div className="gr-part-stage"><GrNodeStates /></div>
              <ul><li>節點是 <code>role="button"</code>、<code>tabIndex=0</code> 的 SVG 群組，aria-label 含標題與連入／連出數；Enter／Space 等同點擊，focus 時顯示提示框。</li><li>顏色之外另有區分：邊以實線／虛線／點線／點劃線，資料檔以方塊。</li></ul></div>
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { PtGraphSpec, GR_STATES });
