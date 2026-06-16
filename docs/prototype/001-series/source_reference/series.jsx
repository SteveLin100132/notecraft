// NoteCraft — 系列總覽頁 + 系列詳情頁
(function () {
const V = window._Vtokens;
const { useState, useMemo, useRef, useEffect } = React;

// accent 色系（色塊封面 + 進度條）
const ACCENT = {
  blue:   { soft: "var(--blue-50)",   line: "var(--blue-100)",   solid: "var(--blue-500)",   deep: "var(--blue-700)",   grad: "linear-gradient(125deg, var(--blue-700) 0%, var(--blue-500) 100%)" },
  orange: { soft: "var(--orange-50)", line: "var(--orange-100)", solid: "var(--orange-400)", deep: "var(--orange-600)", grad: "linear-gradient(125deg, var(--orange-500) 0%, var(--orange-300) 100%)" },
  navy:   { soft: "var(--blue-50)",   line: "var(--blue-100)",   solid: "var(--blue-700)",   deep: "var(--blue-900)",   grad: "linear-gradient(125deg, var(--blue-900) 0%, var(--blue-600) 100%)" },
};
const ac = (a) => ACCENT[a] || ACCENT.blue;

// 章節狀態小圓點
function StatusDot({ status, size = 9 }) {
  const m = window.readingMeta(status);
  const base = { width: size, height: size, borderRadius: 999, flex: "none", boxSizing: "border-box" };
  let style;
  if (m.key === "done") style = { ...base, background: "var(--success-500)" };
  else if (m.key === "reading") style = { ...base, background: "#fff", border: "2.5px solid var(--blue-500)" };
  else if (m.key === "unpublished") style = { ...base, background: "transparent", border: "1.5px dashed var(--neutral-300)" };
  else style = { ...base, background: "transparent", border: "1.5px solid var(--neutral-300)" };
  return React.createElement("span", { title: m.label, style });
}

// 分段進度條：已完成（實心）+ 閱讀中（淺色）疊在軌道上
function ProgressBar({ prog, accent, height = 8 }) {
  const A = ac(accent);
  const donePct = prog.tracked ? (prog.done / prog.tracked) * 100 : 0;
  const readingPct = prog.tracked ? (prog.reading / prog.tracked) * 100 : 0;
  return React.createElement("div", { style: { display: "flex", height, borderRadius: 999, background: "var(--neutral-100)", overflow: "hidden" } },
    React.createElement("div", { style: { width: `${donePct}%`, background: "var(--success-500)", transition: "width 500ms cubic-bezier(0.16,1,0.3,1)" } }),
    React.createElement("div", { style: { width: `${readingPct}%`, background: A.solid, opacity: 0.45, transition: "width 500ms cubic-bezier(0.16,1,0.3,1)" } })
  );
}

// 狀態統計小字（已完成 · 閱讀中 · 待開始）
function ProgStat({ prog }) {
  const parts = [];
  if (prog.done) parts.push(["done", `${prog.done} 已完成`]);
  if (prog.reading) parts.push(["reading", `${prog.reading} 閱讀中`]);
  if (prog.notStarted) parts.push(["not-started", `${prog.notStarted} 待開始`]);
  if (parts.length === 0) parts.push(["not-started", "尚未開始"]);
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: V.muted } },
    parts.map(([k, label], i) => React.createElement("span", { key: k, style: { display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" } },
      React.createElement(StatusDot, { status: k, size: 8 }), label))
  );
}

// 封面色塊（icon 徽章 + 章節數 chip + 進度環）
function Cover({ series, prog, height = 132 }) {
  const A = ac(series.accent);
  return React.createElement("div", { style: { position: "relative", height, background: A.grad, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" } },
    // 裝飾光暈
    React.createElement("div", { style: { position: "absolute", right: -34, top: -34, width: 120, height: 120, borderRadius: 999, background: "rgba(255,255,255,0.12)" } }),
    React.createElement("div", { style: { position: "absolute", right: 18, bottom: -40, width: 90, height: 90, borderRadius: 999, background: "rgba(255,255,255,0.08)" } }),
    React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" } },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(2px)" } }, window.Icons[series.icon]({ s: 24 })),
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 999, background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, fontWeight: 700 } },
        window.Icons.notes({ s: 13 }), `${prog.total} 篇`)
    ),
    React.createElement("div", { style: { position: "relative" } },
      React.createElement("div", { style: { fontSize: 10, fontWeight: 700, letterSpacing: ".18em", color: "rgba(255,255,255,0.78)", marginBottom: 3 } }, series.eyebrow),
      React.createElement("div", { style: { fontSize: 19, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" } }, series.title)
    )
  );
}

// ─────────────────────────── 系列總覽卡片 ───────────────────────────
function SeriesCard({ series, onOpenSeries, onOpenNote }) {
  const { Card, Button } = window.TrendLinkDesignSystem_b2a0d6;
  const prog = window.seriesProgress(series);
  const ctaLabel = prog.completed ? "重新閱讀" : prog.started ? "繼續閱讀" : "開始閱讀";
  return React.createElement(Card, { hoverable: true, style: { padding: 0, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }, onClick: () => onOpenSeries(series.id) },
    React.createElement(Cover, { series, prog }),
    React.createElement("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14, flex: 1 } },
      React.createElement("p", { style: { margin: 0, fontSize: 13.5, color: V.muted, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, series.description),
      // 各章節狀態圓點
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
        prog.statuses.map((s, i) => React.createElement(StatusDot, { key: i, status: s.status }))),
      // 進度條 + 百分比
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement(ProgStat, { prog }),
          React.createElement("span", { style: { fontSize: 14, fontWeight: 900, color: prog.completed ? "var(--success-500)" : ac(series.accent).deep, fontFamily: "var(--font-mono)" } }, `${prog.pct}%`)
        ),
        React.createElement(ProgressBar, { prog, accent: series.accent })
      ),
      // CTA
      React.createElement("div", { style: { marginTop: "auto", paddingTop: 4 } },
        React.createElement(Button, { variant: prog.completed ? "secondary" : "primary", size: "sm", shape: "pill", iconLeft: prog.completed ? window.Icons.rotateCcw({ s: 15 }) : window.Icons.play({ s: 14 }),
          onClick: (e) => { e.stopPropagation(); prog.next && onOpenNote(prog.next.slug); } },
          prog.next ? `${ctaLabel}：${prog.next.title.length > 12 ? prog.next.title.slice(0, 12) + "…" : prog.next.title}` : ctaLabel)
      )
    )
  );
}

// 小型排序下拉
function SortMenu({ value, onChange }) {
  const opts = [["progress", "進度"], ["chapters", "章節數"], ["title", "名稱"]];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = opts.find((o) => o[0] === value);
  return React.createElement("div", { ref, style: { position: "relative" } },
    React.createElement("button", { onClick: () => setOpen((o) => !o),
      style: { display: "inline-flex", alignItems: "center", gap: 7, height: 46, padding: "0 14px", background: "#fff", border: `1.5px solid ${V.n200}`, borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, color: V.body } },
      window.Icons.filter({ s: 16, style: { color: V.muted } }),
      React.createElement("span", null, `排序：${cur[1]}`),
      window.Icons.chevronDown({ s: 15, style: { color: V.muted } })
    ),
    open && React.createElement("div", { style: { position: "absolute", top: 52, right: 0, zIndex: 20, minWidth: 150, background: "#fff", border: `1px solid ${V.n200}`, borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: 5 } },
      opts.map(([k, label]) => React.createElement("button", { key: k, onClick: () => { onChange(k); setOpen(false); },
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 12px", border: "none", background: value === k ? V.blue50 : "transparent", color: value === k ? V.blue : V.body, borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: value === k ? 700 : 500, textAlign: "left" },
        onMouseEnter: (e) => { if (value !== k) e.currentTarget.style.background = "var(--neutral-50)"; },
        onMouseLeave: (e) => { if (value !== k) e.currentTarget.style.background = "transparent"; } },
        label, value === k && window.Icons.check({ s: 15 })))
    )
  );
}

const FILTERS = [["all", "全部"], ["in-progress", "進行中"], ["completed", "已完成"], ["not-started", "未開始"]];

// ─────────────────────────── 系列總覽頁 ───────────────────────────
function SeriesView({ onOpenSeries, onOpenNote }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("progress");

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = window.SERIES.map((s) => ({ s, prog: window.seriesProgress(s) }));
    // 模糊查詢：系列名 / eyebrow / 描述 / 章節標題 / 章節標籤
    if (ql) list = list.filter(({ s, prog }) => {
      const hay = [s.title, s.eyebrow, s.description,
        ...prog.chapters.map((n) => n.title),
        ...prog.chapters.flatMap((n) => n.tags)].join(" ").toLowerCase();
      return hay.includes(ql);
    });
    // 篩選
    if (filter !== "all") list = list.filter(({ prog }) => {
      if (filter === "completed") return prog.completed;
      if (filter === "in-progress") return prog.started && !prog.completed;
      if (filter === "not-started") return !prog.started;
      return true;
    });
    // 排序
    list.sort((a, b) => {
      if (sort === "chapters") return b.prog.total - a.prog.total;
      if (sort === "title") return a.s.title.localeCompare(b.s.title, "zh-Hant");
      return b.prog.pct - a.prog.pct; // progress
    });
    return list;
  }, [q, filter, sort]);

  const totalNotes = window.SERIES.reduce((acc, s) => acc + s.slugs.length, 0);

  return React.createElement("div", null,
    React.createElement(window.PageHead, {
      eyebrow: "SERIES", title: "系列",
      sub: `把相關筆記串成有順序的閱讀路徑 · 共 ${window.SERIES.length} 個系列、${totalNotes} 篇筆記`,
    }),
    // 搜尋 + 排序
    React.createElement("div", { style: { display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240, height: 46, padding: "0 16px", background: "#fff", border: `1.5px solid ${V.n200}`, borderRadius: 999 } },
        React.createElement("span", { style: { color: V.muted, display: "flex" } }, window.Icons.search({ s: 18 })),
        React.createElement("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜尋系列，或系列內的筆記、標籤…",
          style: { flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 14.5, color: V.ink } }),
        q && React.createElement("button", { onClick: () => setQ(""), style: { border: "none", background: "none", cursor: "pointer", color: V.muted, display: "flex", padding: 0 } }, window.Icons.x({ s: 16 }))
      ),
      React.createElement(SortMenu, { value: sort, onChange: setSort })
    ),
    // 篩選 pills
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, alignItems: "center" } },
      FILTERS.map(([k, label]) => {
        const on = filter === k;
        return React.createElement("button", { key: k, onClick: () => setFilter(k),
          style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${on ? V.blue500 : V.n200}`, background: on ? V.blue50 : "#fff", color: on ? V.blue : V.body, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 140ms" } }, label);
      })
    ),
    rows.length === 0
      ? React.createElement("div", { style: { textAlign: "center", padding: "70px 0", color: V.muted } },
          React.createElement("div", { style: { display: "inline-flex", color: "var(--neutral-300)", marginBottom: 12 } }, window.Icons.search({ s: 40 })),
          React.createElement("p", { style: { margin: 0, fontSize: 15 } }, "找不到符合的系列"))
      : React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 } },
          rows.map(({ s }) => React.createElement(SeriesCard, { key: s.id, series: s, onOpenSeries, onOpenNote })))
  );
}

// ─────────────────────────── 章節列 ───────────────────────────
function ChapterRow({ note, status, index, accent, onOpenNote }) {
  const { Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const [hover, setHover] = useState(false);
  const m = window.readingMeta(status);
  const mk = window.markersOf(note);
  const A = ac(accent);
  return React.createElement("button", {
    onClick: () => onOpenNote(note.slug),
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    style: { display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left", padding: "15px 18px", border: "none", borderTop: index === 0 ? "none" : `1px solid ${V.n100}`, background: hover ? "var(--neutral-50)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "background 140ms" } },
    // 章節序號
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "var(--radius-md)", background: status === "done" ? "var(--success-50)" : A.soft, color: status === "done" ? "var(--success-500)" : A.deep, flex: "none", fontSize: 13.5, fontWeight: 800, fontFamily: "var(--font-mono)" } },
      status === "done" ? window.Icons.check({ s: 17 }) : String(index + 1).padStart(2, "0")),
    // 標題 + 描述
    React.createElement("span", { style: { minWidth: 0, flex: 1 } },
      React.createElement("span", { style: { display: "block", fontSize: 15.5, fontWeight: 700, color: V.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, note.title),
      React.createElement("span", { style: { display: "block", fontSize: 12.5, color: V.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, note.description || "尚無內容")
    ),
    // AI 視覺化計數
    mk.length > 0 && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: V.muted, flex: "none" } },
      window.Icons.sparkle({ s: 13, style: { color: V.orange } }), `${mk.filter((x) => x.status === "generated").length}/${mk.length}`),
    // 閱讀狀態徽章
    React.createElement(Badge, { tone: m.tone, variant: "soft" },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, window.Icons[m.icon]({ s: 12 }), m.label)),
    React.createElement("span", { style: { color: "var(--neutral-300)", display: "flex", flex: "none" } }, window.Icons.chevronRight({ s: 17 }))
  );
}

// ─────────────────────────── 系列詳情頁 ───────────────────────────
function SeriesDetail({ seriesId, onBack, onOpenNote }) {
  const { Card, Button } = window.TrendLinkDesignSystem_b2a0d6;
  const series = window.seriesById(seriesId);
  if (!series) return React.createElement("div", null, "找不到系列");
  const prog = window.seriesProgress(series);
  const A = ac(series.accent);
  const ctaLabel = prog.completed ? "重新閱讀" : prog.started ? "繼續閱讀" : "開始閱讀";

  return React.createElement("div", null,
    React.createElement("button", { onClick: onBack, style: { display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: V.muted, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 18, fontFamily: "var(--font-sans)" } },
      window.Icons.chevronLeft({ s: 16 }), "返回系列"),
    // hero
    React.createElement(Card, { style: { padding: 0, overflow: "hidden", marginBottom: 22 } },
      React.createElement("div", { style: { background: A.grad, padding: "30px 30px 28px", position: "relative", overflow: "hidden" } },
        React.createElement("div", { style: { position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: 999, background: "rgba(255,255,255,0.1)" } }),
        React.createElement("div", { style: { position: "absolute", right: 60, bottom: -70, width: 140, height: 140, borderRadius: 999, background: "rgba(255,255,255,0.07)" } }),
        React.createElement("div", { style: { position: "relative", display: "flex", gap: 18, alignItems: "flex-start" } },
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,0.18)", color: "#fff", flex: "none" } }, window.Icons[series.icon]({ s: 30 })),
          React.createElement("div", { style: { minWidth: 0, flex: 1 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".18em", color: "rgba(255,255,255,0.8)", marginBottom: 6 } }, series.eyebrow),
            React.createElement("h1", { style: { fontSize: "var(--text-3xl)", fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.2 } }, series.title),
            React.createElement("p", { style: { fontSize: 14.5, color: "rgba(255,255,255,0.88)", lineHeight: 1.7, margin: 0, maxWidth: 620 } }, series.description)
          )
        )
      ),
      // progress band
      React.createElement("div", { style: { padding: "20px 30px", display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" } },
        React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 8, flex: "none" } },
          React.createElement("span", { style: { fontSize: 36, fontWeight: 900, color: prog.completed ? "var(--success-500)" : A.deep, lineHeight: 1, fontFamily: "var(--font-mono)" } }, `${prog.pct}%`),
          React.createElement("span", { style: { fontSize: 13, color: V.muted } }, "已完成")
        ),
        React.createElement("div", { style: { flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 9 } },
          React.createElement(ProgressBar, { prog, accent: series.accent, height: 10 }),
          React.createElement(ProgStat, { prog })
        ),
        React.createElement("div", { style: { display: "flex", gap: 10, flex: "none" } },
          React.createElement(Button, { variant: prog.completed ? "secondary" : "primary", size: "md", shape: "pill", iconLeft: prog.completed ? window.Icons.rotateCcw({ s: 16 }) : window.Icons.play({ s: 15 }),
            onClick: () => prog.next && onOpenNote(prog.next.slug) }, ctaLabel),
          prog.started && React.createElement(Button, { variant: "ghost", size: "md", shape: "pill", iconLeft: window.Icons.rotateCcw({ s: 15 }),
            onClick: () => { if (window.confirm(`確定要重設「${series.title}」的所有閱讀進度嗎？`)) { window.resetSeriesProgress(series); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "已重設此系列的閱讀進度", icon: "rotateCcw" } })); } } }, "重設進度")
        )
      )
    ),
    // 章節列表
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, margin: "0 2px 14px" } },
      React.createElement("span", { style: { display: "flex", color: A.deep } }, window.Icons.layers({ s: 18 })),
      React.createElement("h2", { style: { fontSize: 17, color: V.ink, margin: 0 } }, "章節"),
      React.createElement("span", { style: { fontSize: 13, color: V.muted, fontWeight: 600, whiteSpace: "nowrap" } }, `共 ${prog.total} 章`)
    ),
    React.createElement(Card, { style: { padding: 0, overflow: "hidden" } },
      prog.statuses.map((s, i) => React.createElement(ChapterRow, { key: s.note.slug, note: s.note, status: s.status, index: i, accent: series.accent, onOpenNote }))
    )
  );
}

Object.assign(window, { SeriesView, SeriesDetail });
})();
