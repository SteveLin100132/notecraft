// 工作台風格的「全部資料檔」「已安裝外掛」「系列總覽」「系列詳情」——與筆記列表同一套 row / group header 語彙
const PT_READ = {
  "not-started": { label: "未開始", cls: "muted", next: "reading", act: "開始閱讀" },
  reading: { label: "閱讀中", cls: "", next: "done", act: "標記完成" },
  done: { label: "已完成", cls: "ok", next: "not-started", act: "重設" },
};

function PtStatStrip({ items }) {
  return (
    <div className="wb-sum">
      {items.map(([k, v, c]) => (
        <div key={k} className="wb-sum-i">
          <div className="wb-sum-k">{k}</div>
          <div className="wb-sum-v tnum" style={c ? { color: c } : null}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// 全部資料檔：依資料夾分組，組頭與筆記列表同一顆 .wb-gh
function PtDataAll({ files, onOpen, groupBy = "folder" }) {
  const [collapsed, setCollapsed] = React.useState({});
  if (!files.length) return <div className="wb-empty">沒有符合條件的資料檔。</div>;
  const groups = [];
  files.forEach((f) => {
    const parts = f.path.split("/");
    const k = groupBy === "plugin" ? f.plugin : (parts.length > 1 ? parts.slice(0, -1).join("/") : "根目錄");
    let g = groups.find((x) => x.key === k);
    if (!g) { g = { key: k, rows: [] }; groups.push(g); }
    g.rows.push(f);
  });
  groups.sort((a, b) => (a.key === "根目錄" ? -1 : b.key === "根目錄" ? 1 : 0));
  return groups.map((g) => (
    <div key={g.key}>
      <button className="wb-gh" style={{ "--gc": "#ed9b26" }} onClick={() => setCollapsed({ ...collapsed, [g.key]: !collapsed[g.key] })}>
        <span className={"wb-sb-caret" + (collapsed[g.key] ? "" : " open")} style={{ color: "inherit" }}><Ic n="chev" s={11} sw={2.4} /></span>
        <Ic n={groupBy === "plugin" ? "plug" : "folder"} s={13} />
        <span className="wb-gh-n">{g.key}</span>
        <span className="wb-gh-c tnum">{g.rows.length}</span>
        <span className="wb-gh-stats tnum">
          {groupBy === "plugin"
            ? `渲染 ${g.rows.length} 個資料檔 ・ 最後更新 ${g.rows[0].updatedAt.slice(5).replace("-", "/")}`
            : `${Array.from(new Set(g.rows.map((r) => r.plugin))).length} 個 plugin ・ 最後更新 ${g.rows[0].updatedAt.slice(5).replace("-", "/")}`}
        </span>
      </button>
      {collapsed[g.key] ? null : g.rows.map((f) => (
        <button key={f.id} className="wb-row" onClick={() => onOpen(f.id)}>
          <Ic n="doc" s={13} c="var(--wb-gold)" />
          <span className="wb-row-t">{f.title}</span>
          <span className="wb-row-p">{f.path}</span>
          <span className="wb-row-tags" style={{ width: 168, flex: "0 0 168px" }}>
            <span className="wb-tagchip" style={{ fontFamily: "var(--font-mono)" }}>{f.plugin}</span>
          </span>
          <span className="wb-row-d tnum">{f.updatedAt.slice(5).replace("-", "/")}</span>
        </button>
      ))}
    </div>
  ));
}

// 系列總覽：一列一個系列，進度條直接在列上
function PtSeriesList({ onOpen, q = "" }) {
  const list = window.ptSeries().filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));
  if (!list.length) return <div className="wb-empty">沒有符合條件的系列。</div>;
  const totalDone = list.reduce((a, s) => a + s.done, 0);
  const totalAll = list.reduce((a, s) => a + s.total, 0);
  return (
    <>
      <PtStatStrip items={[
        ["系列", list.length],
        ["章節總數", totalAll],
        ["已完成", totalDone, "var(--wb-ok)"],
        ["整體進度", (totalAll ? Math.round((totalDone / totalAll) * 100) : 0) + "%"],
      ]} />
      <button className="wb-gh" style={{ "--gc": "#2c6ebb", cursor: "default" }}>
        <span style={{ width: 11 }} /><Ic n="layers" s={13} />
        <span className="wb-gh-n">全部系列</span>
        <span className="wb-gh-c tnum">{list.length}</span>
        <span className="wb-gh-stats tnum">點一列進入系列詳情</span>
      </button>
      {list.map((s) => (
        <button key={s.id} className="wb-row" onClick={() => onOpen(s.id)}>
          <span className="wb-sb-swatch" style={{ background: s.color }} />
          <span className="wb-row-t">{s.name}</span>
          <span className="wb-row-p">{s.total} 章 ・ 已完成 {s.done}</span>
          <span className="wb-prog" style={{ "--gc": s.color }}><i style={{ width: s.pct + "%" }} /></span>
          <span className="wb-row-d tnum" style={{ width: 38, flex: "0 0 38px" }}>{s.pct}%</span>
          <span className={"wb-pill " + (s.pct === 100 ? "ok" : s.done ? "" : "muted")} style={{ width: 54, justifyContent: "center" }}>
            {s.pct === 100 ? "已讀完" : s.done ? "進行中" : "未開始"}
          </span>
        </button>
      ))}
    </>
  );
}

// 系列詳情：章節列表沿用 .wb-row，索引 + 狀態 pill + 單鍵推進
function PtSeriesDetail({ seriesId, onOpenNote, onOpenData }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => window.ncSubscribe(force), []);
  const s = window.seriesById(seriesId);
  if (!s) return <div className="wb-empty">找不到這個系列。</div>;
  const p = window.seriesProgress(s);
  const color = window.SERIES_COLOR[s.accent] || "#2c6ebb";
  return (
    <>
      <PtStatStrip items={[
        ["章節", p.total],
        ["已完成", p.done, "var(--wb-ok)"],
        ["閱讀中", p.reading, "var(--wb-blue-l)"],
        ["未開始", p.notStarted],
        ["進度", p.pct + "%"],
      ]} />
      <div className="wb-sumbar"><span className="wb-prog wide" style={{ "--gc": color }}><i style={{ width: p.pct + "%" }} /></span>
        <span className="wb-sum-note">{p.next ? `下一章：${p.next.title}` : "已全部讀完"}</span>
        <button className="wb-btn-ghost" onClick={() => window.resetSeriesProgress(s)}>重設進度</button>
      </div>
      <button className="wb-gh" style={{ "--gc": color, cursor: "default" }}>
        <span style={{ width: 11 }} /><Ic n="layers" s={13} />
        <span className="wb-gh-n">章節</span>
        <span className="wb-gh-c tnum">{p.total}</span>
        <span className="wb-gh-stats tnum">資料檔頁與筆記一視同仁，都計入進度</span>
      </button>
      {p.chapters.map((c, i) => {
        const st = window.readingStatus(c.ref);
        const m = PT_READ[st] || PT_READ["not-started"];
        return (
          <div key={c.ref} className="wb-row" role="button" tabIndex={0}
            onClick={() => (c.kind === "data" ? onOpenData(c.id) : onOpenNote(c.id))}>
            <span className="wb-row-i tnum">{i + 1}</span>
            <Ic n="doc" s={13} c={c.kind === "data" ? "var(--wb-gold)" : "var(--wb-ink-3)"} />
            <span className="wb-row-t">{c.title}</span>
            <span className="wb-row-p">{c.kind === "data" ? c.file.path : "src/content/notes/" + c.id + ".mdx"}</span>
            {c.kind === "data" ? <span className="wb-tagchip">資料檔</span> : null}
            <span className={"wb-pill " + m.cls} style={{ width: 54, justifyContent: "center" }}>{m.label}</span>
            <button className="wb-mini" onClick={(e) => { e.stopPropagation(); window.setReadingStatus(c.ref, m.next); }}>{m.act}</button>
          </div>
        );
      })}
    </>
  );
}
// 標籤：一列一個標籤，含使用次數長條、最後使用、重新命名／刪除
function PtTagsView({ onOpenTag }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => window.ncSubscribe(force), []);
  const [sort, setSort] = React.useState("count");
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState(null);
  const [draft, setDraft] = React.useState("");
  let tags = window.tagStats();
  const max = tags.reduce((a, t) => Math.max(a, t.count), 1);
  const used = tags.reduce((a, t) => a + t.count, 0);
  tags = tags.filter((t) => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()));
  tags.sort((a, b) => (sort === "alpha" ? a.name.localeCompare(b.name) : sort === "recent" ? (a.lastUsed < b.lastUsed ? 1 : -1) : b.count - a.count));
  const commit = (old) => {
    const next = draft.trim();
    if (next && next !== old) window.renameTag(old, next);
    setEditing(null);
  };
  return (
    <>
      <div className="wb-tb">
        <span className="wb-tb-lbl">排序</span>
        <div className="wb-tb-group">
          {[["count", "使用次數"], ["recent", "最近使用"], ["alpha", "字母序"]].map(([k, l]) => (
            <button key={k} className={"wb-seg" + (sort === k ? " on" : "")} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
        <div className="wb-tb-right">
          <span className="wb-search"><Ic n="search" s={13} c="var(--wb-ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋標籤…" /></span>
          <span className="wb-count tnum">{tags.length} 個</span>
        </div>
      </div>
      <div className="wb-body flush">
        <PtStatStrip items={[["標籤", window.tagStats().length], ["標記次數", used], ["平均每篇", (used / Math.max(window.NOTES.length, 1)).toFixed(1)]]} />
        <button className="wb-gh" style={{ "--gc": "#6c798e", cursor: "default" }}>
          <span style={{ width: 11 }} /><Ic n="tag" s={13} />
          <span className="wb-gh-n">全部標籤</span>
          <span className="wb-gh-c tnum">{tags.length}</span>
          <span className="wb-gh-stats tnum">點一列以該標籤篩選筆記</span>
        </button>
        {tags.length ? tags.map((t) => (
          <div key={t.name} className="wb-row" role="button" tabIndex={0} onClick={() => (editing === t.name ? null : onOpenTag(t.name))}>
            <Ic n="tag" s={13} c="var(--wb-ink-3)" />
            {editing === t.name ? (
              <input className="wb-inline" autoFocus value={draft} onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(t.name)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(t.name); if (e.key === "Escape") setEditing(null); }} />
            ) : <span className="wb-row-t">{t.name}</span>}
            <span className="wb-row-p">最後使用 {t.lastUsed.replace(/-/g, "/")}</span>
            <span className="wb-prog" style={{ "--gc": "#2c6ebb" }}><i style={{ width: Math.round((t.count / max) * 100) + "%" }} /></span>
            <span className="wb-row-d tnum">{t.count} 篇</span>
            <button className="wb-mini" onClick={(e) => { e.stopPropagation(); setEditing(t.name); setDraft(t.name); }}>重新命名</button>
            <button className="wb-mini danger" onClick={(e) => { e.stopPropagation(); if (confirm("刪除標籤「" + t.name + "」？會從 " + t.count + " 篇筆記移除。")) window.deleteTag(t.name); }}>刪除</button>
          </div>
        )) : <div className="wb-empty">沒有符合條件的標籤。</div>}
      </div>
    </>
  );
}
// 設定與關於：設定為 label／說明／控制項三欄的資料列；關於為 metadata 列 + 流程列
function PtSeg({ value, options, onChange }) {
  return (
    <span className="wb-setseg">
      {options.map((o) => (
        <button key={String(o.value)} className={"wb-seg" + (value === o.value ? " on" : "")} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </span>
  );
}
function PtSwitch({ value, onChange }) {
  return <button className={"wb-switch" + (value ? " on" : "")} role="switch" aria-checked={!!value} onClick={() => onChange(!value)}><i /></button>;
}
function PtSetRow({ k, d, children }) {
  return (
    <div className="wb-set">
      <div className="wb-set-l"><div className="wb-set-k">{k}</div>{d ? <div className="wb-set-d">{d}</div> : null}</div>
      <div className="wb-set-c">{children}</div>
    </div>
  );
}
const PT_FLOW = [
  { k: "建立", d: "dev API 寫入含範本的 MDX 檔", phase: "作者", where: "工作台", ic: "plus" },
  { k: "撰寫", d: "自由撰寫文字內容", phase: "作者", where: "VS Code", ic: "doc" },
  { k: "標記", d: "在需要圖、動畫、互動處填入 @ai-visualize 與提示詞", phase: "作者", where: "VS Code", ic: "tag" },
  { k: "生成", d: "依 content-visualize-skill 掃描標記、生成元件", phase: "AI", where: "Claude Code", ic: "sparkle" },
  { k: "檢視", d: "不滿意可調整提示詞、重跑生成", phase: "AI", where: "工作台", ic: "search" },
  { k: "發佈", d: "commit 後自動 build & deploy 為靜態網頁", phase: "發佈", where: "Netlify", ic: "layers" },
];
const PT_PHASE = { 作者: "#2c6ebb", AI: "#ed9b26", 發佈: "#163f7d" };
const PT_STACK = [["Astro 5", "框架"], ["MDX", "原始檔"], ["React", "互動元件"], ["TailwindCSS", "樣式"], ["motion", "動態互動"], ["Claude Code", "AI 載體"], ["pagefind", "搜尋"], ["Netlify", "部署"]];

function PtSettings({ tab, t, setTweak, onRoute }) {
  if (tab === "關於") {
    const meta = [
      ["名稱", "NoteCraft 工作台"],
      ["工作區", "~/notes/src/content/notes"],
      ["筆記", window.NOTES.length + " 篇"],
      ["系列", window.SERIES.length + " 個"],
      ["標籤", window.tagStats().length + " 個"],
      ["資料檔", (window.DATAFILES || []).length + " 個"],
      ["部署", "Netlify ・ 靜態建置"],
    ];
    return (
      <div className="wb-body flush">
        <PtStatStrip items={[["筆記", window.NOTES.length], ["系列", window.SERIES.length], ["資料檔", (window.DATAFILES || []).length], ["待生成標記", window.ptPending().count, "var(--wb-warn)"]]} />
        <button className="wb-gh" style={{ "--gc": "#1b4f9c", cursor: "default" }}>
          <span style={{ width: 11 }} /><Ic n="doc" s={13} /><span className="wb-gh-n">工作區</span>
          <span className="wb-gh-stats">以 MDX 為原始檔，由 AI Agent 與 Skill 生成視覺化與互動</span>
        </button>
        {meta.map(([k, val]) => <PtSetRow key={k} k={k}><span className="wb-set-v tnum">{val}</span></PtSetRow>)}
        <button className="wb-gh" style={{ "--gc": "#ed9b26", cursor: "default" }}>
          <span style={{ width: 11 }} /><Ic n="sparkle" s={13} /><span className="wb-gh-n">一份筆記的生命週期</span>
          <span className="wb-gh-c tnum">{PT_FLOW.length}</span>
        </button>
        <div className="wb-flow">
          {PT_FLOW.map((s, i) => {
            const newPhase = i === 0 || PT_FLOW[i - 1].phase !== s.phase;
            return (
              <div key={s.k} className="wb-flow-s" style={{ "--gc": PT_PHASE[s.phase] }}>
                <div className="wb-flow-rail">
                  <span className="wb-flow-line" style={i === 0 ? { visibility: "hidden" } : null} />
                  <span className="wb-flow-node tnum">{i + 1}</span>
                  <span className="wb-flow-line" style={i === PT_FLOW.length - 1 ? { visibility: "hidden" } : null} />
                </div>
                <div className="wb-flow-b">
                  <div className="wb-flow-ph">{newPhase ? s.phase : "\u00a0"}</div>
                  <div className="wb-flow-k"><Ic n={s.ic} s={13} c="var(--gc)" />{s.k}</div>
                  <div className="wb-flow-d">{s.d}</div>
                  <div><span className="wb-flow-w">{s.where}</span></div>
                </div>
              </div>
            );
          })}
        </div>
        <button className="wb-gh" style={{ "--gc": "#6c798e", cursor: "default" }}>
          <span style={{ width: 11 }} /><Ic n="layers" s={13} /><span className="wb-gh-n">技術選型</span>
          <span className="wb-gh-c tnum">{PT_STACK.length}</span>
        </button>
        <div className="wb-set"><div className="wb-set-l" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PT_STACK.map(([n, r]) => <span key={n} className="wb-tagchip">{n}<span style={{ color: "var(--wb-ink-3)", marginLeft: 5 }}>{r}</span></span>)}
        </div></div>
      </div>
    );
  }
  return (
    <div className="wb-body flush">
      <button className="wb-gh" style={{ "--gc": "#2c6ebb", cursor: "default" }}>
        <span style={{ width: 11 }} /><Ic n="layers" s={13} /><span className="wb-gh-n">工作台</span>
      </button>
      <PtSetRow k="預設 view" d="開啟筆記列表時使用的檢視">
        <PtSeg value={t.defaultView} onChange={(v) => setTweak("defaultView", v)}
          options={[{ value: "List", label: "List" }, { value: "Board", label: "Board" }, { value: "Table", label: "Table" }, { value: "Timeline", label: "Timeline" }]} />
      </PtSetRow>
      <PtSetRow k="List 預設分組" d="List 檢視的分組依據">
        <PtSeg value={t.groupBy} onChange={(v) => setTweak("groupBy", v)}
          options={[{ value: "folder", label: "資料夾" }, { value: "series", label: "系列" }, { value: "tag", label: "標籤" }, { value: "month", label: "月份" }]} />
      </PtSetRow>
    </div>
  );
}
Object.assign(window, { PtSeg, PtSwitch, PtSetRow, PtDataAll, PtSeriesList, PtSeriesDetail, PtStatStrip, PtTagsView, PtSettings });
