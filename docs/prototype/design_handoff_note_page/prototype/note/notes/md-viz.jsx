// NoteCraft 工作台 — 示範筆記：視覺化互動元件
(() => {
const { H, C, A, Ref, Code, Adm, Viz, AiMark } = window.NPMD;
const { useState: gvUS } = React;
const GV_CFG = `{
  "plugins": {
    "er-diagram-renderer": {
      "files": ["**/*.er.json"],
      "options": { "defaultRows": 6 }
    },
    "timeline-renderer": {
      "files": ["planning/roadmap.json"]
    }
  }
}`;
const GV_EMBED = `<PluginView file="planning/81-schema-er-diagram.er.json" />

<PluginView
  file="planning/81-schema-er-diagram.er.json"
  options={{ focus: "attendance_record" }}
/>`;
// renderer plugin 的嵌入外框（與 AI 元件的 Viz 外框同一套，改以資料檔標示）
function PluginEmbed({ fileId, caption }) {
  const [z, setZ] = gvUS(false);
  const f = (window.DATAFILES || []).find((x) => x.id === fileId);
  if (!f) return null;
  const pl = (window.PT_PLUGINS || []).find((p) => p.id === f.plugin);
  const data = f.dataKey && window.ErDocs ? window[f.dataKey] : null;
  const opts = pl ? { hubTables: pl.options.hubTables, defaultRows: pl.options.defaultRows } : {};
  return (
    <>
      {z ? <button className="np-zscrim" onClick={() => setZ(false)} aria-label="關閉放大檢視" /> : null}
      <figure className={"md-viz md-plv" + (z ? " zoom" : "")} role={z ? "dialog" : undefined} aria-label={z ? f.title : undefined}>
        <div className="md-viz-h">
          <NpI n="layers" s={13} c="var(--wb-gold)" sw={2} /><span className="k">資料檔 · {f.pluginLabel}</span>
          <span className="f">{f.path}</span>
          <button className="md-plv-o" onClick={() => window.NC_OPEN_DATA && window.NC_OPEN_DATA(f.id)}>開啟檢視頁<NpI n="up" s={11} sw={2} /></button>
          <button className="md-viz-x" onClick={() => setZ(!z)} aria-label={z ? "關閉" : "放大檢視"}><NpI n={z ? "close" : "expand"} s={13} /></button>
        </div>
        <div className="md-plv-b">{data ? <window.ErDocs data={data} options={opts} mode="embed" bare storeKey={"erx-np:" + f.id} /> : <div className="md-ph"><NpI n="layers" s={22} sw={1.5} />{f.plugin} 渲染區<span className="m">{f.path}</span></div>}</div>
        {caption ? <figcaption className="md-viz-c">{caption}</figcaption> : null}
      </figure>
    </>
  );
}
const { VzLeave, VzFlow, VzMix } = window;
const GV_MARK = `{/* @ai-visualize
  id="demo-leave-calculator"
  type="interactive"
  prompt="把特休年資級距做成可拖曳的計算器，顯示天數與級距說明。"
*/}`;
const NC_VIZ_MARKERS = {
  heat: { id: "demo-expiry-heatmap", type: "chart", prompt: "以月份 × 部門的熱度圖呈現即將到期的特休時數，顏色越深代表到期時數越多，點格子顯示員工名單。" },
  gauge: { id: "demo-approval-sla", type: "interactive", prompt: "以儀表呈現各主管的平均簽核時間，超過 24 小時的區段標為警示色，可切換月份。" },
};

function NcVizBody() {
  const openData = (e) => { e.preventDefault(); if (window.NC_OPEN_DATA) window.NC_OPEN_DATA("trendmile-schema"); };
  return (
    <>
      <div className="md-flow">
        <p>文字講不清楚的內容，可以在筆記中放一個 <C>@ai-visualize</C> 標記，描述想要的互動元件，再交給 AI 產生。本篇示範三種已生成的元件、待生成標記的樣貌，以及外掛提供的資料檔。</p>

        <H id="v-marker">AI 視覺化標記</H>
        <p>標記寫在 MDX 註解裡，不會出現在發佈後的頁面。<C>id</C> 決定產生的檔名，<C>type</C> 為元件類型，<C>prompt</C> 描述需求。</p>
        <Code lang="md" label="mdx" code={GV_MARK} />
        <p>生成後，元件會以統一的外框呈現：左上為類型，右上為元件檔案路徑與放大按鈕。</p>

        <H id="v-calc">互動計算器</H>
        <p>拖曳滑桿或點長條，查看不同年資對應的<Ref id="hr.term-annual-leave">特別休假</Ref>天數。計算規則與「特休假規格與計算」的級距表一致。</p>
        <Viz kind="互動計算器" file="demo-leave-calculator" caption="type: interactive — 拖曳滑桿或點長條。">
          <VzLeave />
        </Viz>

        <H id="v-flow">流程模擬</H>
        <p>切換情境並按「下一步」，觀察不同請假長度的簽核路徑。適合呈現有分支、需要逐步說明的流程。</p>
        <Viz kind="流程模擬" file="demo-approval-flow" caption="type: motion — 切換情境，按「下一步」推進。">
          <VzFlow />
        </Viz>

        <H id="v-chart">互動圖表</H>
        <p>點圖例可隱藏或顯示假別，滑過色塊顯示數值。</p>
        <Viz kind="互動圖表" file="demo-usage-chart" caption="type: chart — 2026 年 1–9 月各部門請假時數。">
          <VzMix />
        </Viz>
        <Adm k="tip"><p>每個元件右上角都有放大按鈕，可以全螢幕操作；按 <kbd>Esc</kbd> 關閉。筆記轉成簡報時，已生成的元件也能在投影片中直接操作。</p></Adm>

        <H id="v-pending">待生成標記</H>
        <p>還沒生成的標記會以虛線框呈現，列出類型與 prompt，同時計入工作台的「AI 標記佇列」。</p>
        <AiMark {...NC_VIZ_MARKERS.heat} />
        <AiMark {...NC_VIZ_MARKERS.gauge} />

        <H id="v-plugin">Renderer Plugin</H>
        <p>AI 元件是為一篇筆記量身產生的；renderer plugin 則負責某一類<strong>資料檔</strong>，例如資料庫 schema 或產品路線圖。資料檔更新後重新建置，所有用到它的地方都會跟著更新。</p>
        <H lv={3} id="v-plugin-map">對應資料檔</H>
        <p>在 <C>.notecraft/plugins.json</C> 以 glob 指定每個 plugin 負責哪些檔案。符合的檔案會自動產生獨立檢視頁，並出現在側欄的「Plugin」。</p>
        <Code lang="json" label="json" file=".notecraft/plugins.json" code={GV_CFG} />
        <div className="md-tw">
          <table className="md-t">
            <thead><tr><th>Plugin</th><th>負責的檔案</th><th>渲染結果</th><th className="c">狀態</th></tr></thead>
            <tbody>
              {(window.PT_PLUGINS || []).map((p) => <tr key={p.id}><td><C>{p.id}</C></td><td><C>{p.files.join(", ")}</C></td><td>{p.description}</td><td className="c">{p.enabled ? "啟用" : "停用"}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="md-tcap">表：目前安裝的 renderer plugin</p>
        <H lv={3} id="v-plugin-embed">嵌入筆記</H>
        <p>資料檔除了有自己的檢視頁，也可以用 <C>{"<PluginView>"}</C> 直接嵌入筆記，嵌入時由同一個 renderer 以精簡模式呈現；需要時可用 <C>options</C> 指定起始焦點。</p>
        <Code lang="ts" label="mdx" code={GV_EMBED} />
        <PluginEmbed fileId="trendmile-schema" caption="er-diagram-renderer 嵌入模式：切換 Wiki 與關聯圖、點表格聚焦；右上角可開啟完整檢視頁或放大。" />
        <Adm k="note"><p>嵌入與檢視頁讀的是同一份資料檔，不會複製內容到筆記裡。系列也可以把資料檔當成一個章節，本系列的最後一章就是這份 ER 圖。</p></Adm>
      </div>
    </>
  );
}
window.NC_VIZ_MARKERS = NC_VIZ_MARKERS;
window.NC_BODIES = Object.assign(window.NC_BODIES || {}, { "md-viz": NcVizBody });
})();
