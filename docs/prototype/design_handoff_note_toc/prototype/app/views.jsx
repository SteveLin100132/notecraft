// NoteCraft — Notes list, Tags index, About views
(function () {
const V = window._Vtokens;
const { useState, useMemo } = React;

// ─────────────────────────── Notes list ───────────────────────────
function NoteCard({ note, layout, onOpen, onTag }) {
  const { Card, Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const mk = window.markersOf(note);
  const sm = window.statusMeta(note);
  const rs = window.readingStatus(note.slug);
  const rm = rs !== "unpublished" ? window.readingMeta(rs) : null;
  const allGen = mk.length > 0 && mk.every((m) => m.status === "generated");
  const meta = React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: V.muted, flexWrap: "wrap" } },
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, window.Icons.clock({ s: 14 }), window.daysAgo(note.updatedAt)),
    rm && rs !== "not-started" && React.createElement(Badge, { tone: rm.tone, variant: "soft" },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, window.Icons[rm.icon]({ s: 12 }), rm.label)),
    sm && React.createElement(Badge, { tone: sm.tone, variant: "soft" },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, window.Icons[sm.icon]({ s: 12 }), sm.label)),
    mk.length > 0 && React.createElement(Badge, { tone: allGen ? "success" : "warning", variant: "soft" },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, window.Icons.sparkle({ s: 12 }), allGen ? "已生成" : `${mk.filter((m) => m.status === "generated").length}/${mk.length}`))
  );
  const tagRow = React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
    note.tags.map((tg) => React.createElement("span", { key: tg, onClick: (e) => { e.stopPropagation(); onTag(tg); },
      style: { fontSize: 12, fontWeight: 600, color: V.blue, background: V.blue50, padding: "3px 9px", borderRadius: 999, cursor: "pointer" } }, tg)));

  if (layout === "list") {
    return React.createElement(Card, { hoverable: true, style: { padding: "16px 20px", cursor: "pointer" }, onClick: () => onOpen(note.slug) },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 18 } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 5, background: V.blue50, color: V.blue, flex: "none" } }, window.Icons.notes({ s: 20 })),
        React.createElement("div", { style: { minWidth: 0, flex: 1 } },
          React.createElement("h3", { style: { fontSize: 16.5, color: V.ink, margin: "0 0 4px", fontWeight: 700 } }, note.title),
          React.createElement("p", { style: { fontSize: 13.5, color: V.muted, margin: 0, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, note.description || "尚無內容")
        ),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, flex: "none" } }, tagRow, meta,
          React.createElement("span", { style: { color: "var(--neutral-300)", display: "flex" } }, window.Icons.chevronRight({ s: 18 })))
      )
    );
  }
  return React.createElement(Card, { hoverable: true, accent: allGen ? "orange" : undefined, style: { padding: 22, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, height: "100%" }, onClick: () => onOpen(note.slug) },
    React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 5, background: V.blue50, color: V.blue } }, window.Icons.notes({ s: 20 })),
      meta
    ),
    React.createElement("div", null,
      React.createElement("h3", { style: { fontSize: 18, color: V.ink, margin: "0 0 7px", fontWeight: 700, lineHeight: 1.35 } }, note.title),
      React.createElement("p", { style: { fontSize: 13.5, color: V.muted, margin: 0, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, window.excerpt(note) || "尚無內容，點擊查看初始畫面")
    ),
    React.createElement("div", { style: { marginTop: "auto" } }, tagRow)
  );
}

function NotesList({ layout, onOpen, onNav, devMode, onNew, initialTag, onClearTag, onOpenData }) {
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const [q, setQ] = useState("");
  const [active, setActive] = useState(initialTag ? [initialTag] : []);
  React.useEffect(() => { if (initialTag) setActive([initialTag]); }, [initialTag]);

  const tags = window.allTags();
  const toggle = (tg) => setActive((a) => a.includes(tg) ? a.filter((x) => x !== tg) : [...a, tg]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return window.NOTES.filter((n) => {
      if (active.length && !active.every((t) => n.tags.includes(t))) return false;
      if (!ql) return true;
      const hay = (n.title + n.description + n.tags.join(" ") + n.content.map((b) => typeof b.c === "string" ? b.c : (Array.isArray(b.c) ? b.c.join(" ") : "")).join(" ")).toLowerCase();
      return hay.includes(ql);
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [q, active]);

  // 資料檔與筆記混排：只在未套用標籤篩選時出現（資料檔沒有 tags），排序用檔案 mtime
  const env = window.NC_ENV || {};
  const dataItems = React.useMemo(() => {
    if (active.length) return [];
    const ql = q.trim().toLowerCase();
    return window.visibleFiles(env.pluginCount || 3)
      .filter((f) => !ql || (f.title + f.description + f.path + f.plugin).toLowerCase().includes(ql))
      .map((f) => ({ kind: "data", t: f.updatedAt, f }));
  }, [q, active, env.pluginCount]);
  const mixed = [...filtered.map((n) => ({ kind: "note", t: n.updatedAt, n })), ...dataItems]
    .sort((a, b) => b.t.localeCompare(a.t));

  return React.createElement("div", null,
    React.createElement(window.PageHead, {
      eyebrow: "NOTES", title: "所有筆記",
      sub: `${window.NOTES.length} 篇筆記 · ${dataItems.length ? `${dataItems.length} 個資料檔混排 · ` : ""}預設依更新時間倒序`,
      action: devMode && React.createElement(Button, { variant: "primary", size: "md", iconLeft: window.Icons.plus({ s: 18 }), onClick: onNew }, "新增筆記"),
    }),
    // search + view toggle
    React.createElement("div", { style: { display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240, height: 46, padding: "0 16px", background: "#fff", border: `1.5px solid ${V.n200}`, borderRadius: 999 } },
        React.createElement("span", { style: { color: V.muted, display: "flex" } }, window.Icons.search({ s: 18 })),
        React.createElement("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "搜尋標題、描述、標籤、內文…",
          style: { flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 14.5, color: V.ink } }),
        q && React.createElement("button", { onClick: () => setQ(""), style: { border: "none", background: "none", cursor: "pointer", color: V.muted, display: "flex", padding: 0 } }, window.Icons.x({ s: 16 }))
      ),
      React.createElement("div", { style: { display: "flex", gap: 4, padding: 4, background: V.n100, borderRadius: 999 } },
        [["grid", "卡片"], ["list", "清單"]].map(([k, lbl]) => React.createElement("button", { key: k, onClick: () => onNav(null, k),
          style: { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, background: layout === k ? "#fff" : "transparent", color: layout === k ? V.blue : V.muted, boxShadow: layout === k ? "var(--shadow-xs)" : "none" } },
          window.Icons[k]({ s: 16 }), lbl))
      )
    ),
    // tag filter
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22, alignItems: "center" } },
      tags.map(([tg, ct]) => {
        const on = active.includes(tg);
        return React.createElement("button", { key: tg, onClick: () => toggle(tg),
          style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, border: `1.5px solid ${on ? V.blue500 : V.n200}`, background: on ? V.blue50 : "#fff", color: on ? V.blue : V.body, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 140ms" } },
          tg, React.createElement("span", { style: { fontSize: 11, opacity: 0.7 } }, ct));
      }),
      active.length > 0 && React.createElement("button", { onClick: () => { setActive([]); onClearTag && onClearTag(); }, style: { ...linkBtn(), marginLeft: 4 } }, "清除")
    ),
    // results
    mixed.length === 0
      ? React.createElement("div", { style: { textAlign: "center", padding: "70px 0", color: V.muted } },
          React.createElement("div", { style: { display: "inline-flex", color: "var(--neutral-300)", marginBottom: 12 } }, window.Icons.search({ s: 40 })),
          React.createElement("p", { style: { margin: 0, fontSize: 15 } }, "找不到符合的筆記"))
      : React.createElement("div", { style: layout === "grid"
          ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }
          : { display: "flex", flexDirection: "column", gap: 12 } },
          mixed.map((it) => it.kind === "note"
            ? React.createElement(NoteCard, { key: it.n.slug, note: it.n, layout, onOpen, onTag: (tg) => setActive([tg]) })
            : React.createElement(window.DataFileCard, { key: it.f.id, file: it.f, layout, cardFoot: env.cardFoot || "path", onOpen: onOpenData || (() => {}) }))
        )
  );
}

// ─────────────────────────── Tags index ───────────────────────────
function TagsView({ onOpenTag }) {
  const { Card } = window.TrendLinkDesignSystem_b2a0d6;
  const tags = window.allTags();
  const max = tags[0][1];
  return React.createElement("div", null,
    React.createElement(window.PageHead, { eyebrow: "TAGS", title: "標籤索引", sub: "依標籤瀏覽筆記，點擊任一標籤進入過濾後的列表。" }),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 } },
      tags.map(([tg, ct]) => React.createElement(Card, { key: tg, hoverable: true, style: { padding: 20, cursor: "pointer" }, onClick: () => onOpenTag(tg) },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } },
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 5, background: V.orange50, color: V.orange } }, window.Icons.hash({ s: 20 })),
          React.createElement("span", { style: { fontSize: 28, fontWeight: 900, color: V.blue } }, ct)
        ),
        React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: V.ink } }, tg),
        React.createElement("div", { style: { fontSize: 12.5, color: V.muted, marginTop: 3 } }, `${ct} 篇筆記`),
        React.createElement("div", { style: { height: 6, borderRadius: 999, background: V.n100, overflow: "hidden", marginTop: 12 } },
          React.createElement("div", { style: { height: "100%", width: `${(ct / max) * 100}%`, background: "var(--gradient-accent)", borderRadius: 999 } }))
      ))
    )
  );
}

// ─────────────────────────── About ───────────────────────────
function AboutView() {
  const { Card } = window.TrendLinkDesignSystem_b2a0d6;
  const flow = [
    ["建立", "在 Dashboard 點「新增筆記」，dev API 寫入含範本的 MDX 檔", "plus"],
    ["撰寫", "以 VS Code 自由撰寫文字內容", "edit"],
    ["標記", "在需要圖、動畫、互動處填入 @ai-visualize 標記與提示詞", "sparkle"],
    ["生成", "在 Claude Code 中請 AI 依 content-visualize-skill 掃描標記、生成元件", "code"],
    ["檢視", "不滿意可調整提示詞、重跑生成", "search"],
    ["發佈", "commit 後由 Netlify 自動 build & deploy 為靜態網頁", "layers"],
  ];
  const stack = [["Astro 5", "框架"], ["MDX", "原始檔"], ["React", "互動元件"], ["TailwindCSS", "樣式"], ["motion", "動態互動"], ["Claude Code", "AI 載體"], ["pagefind", "搜尋"], ["Netlify", "部署"]];
  return React.createElement("div", { style: { maxWidth: 820 } },
    React.createElement(window.PageHead, { eyebrow: "ABOUT", title: "關於 NoteCraft", sub: "以 MDX 為原始檔、由 AI Agent 與 Skill 自動生成視覺化與動態互動的筆記系統。" }),
    React.createElement(Card, { style: { padding: 28, marginBottom: 20 } },
      React.createElement("p", { style: { fontSize: "var(--text-md)", color: V.body, lineHeight: 1.85, margin: 0 } },
        "讓知識學習不再是枯燥的文字堆疊，而是能被「看見」與「操作」的體驗。作者只需用 VS Code 撰寫筆記、放入 AI 標記區塊，系統便能在建構階段由 AI 讀取提示詞、自由發想並產出對應的元件，最終以靜態網頁部署。")
    ),
    React.createElement("h2", { style: { fontSize: "var(--text-xl)", color: V.ink, margin: "8px 0 16px" } }, "一份筆記的生命週期"),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 30 } },
      flow.map(([t, d, ic], i) => React.createElement(Card, { key: t, style: { padding: 18, display: "flex", gap: 14, alignItems: "flex-start" } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 5, background: i % 2 ? V.orange50 : V.blue50, color: i % 2 ? V.orange : V.blue, flex: "none" } }, window.Icons[ic]({ s: 18 })),
        React.createElement("div", null,
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: V.muted, letterSpacing: ".05em" } }, `STEP ${i + 1}`),
          React.createElement("div", { style: { fontSize: 15.5, fontWeight: 700, color: V.ink, margin: "2px 0 4px" } }, t),
          React.createElement("div", { style: { fontSize: 13, color: V.muted, lineHeight: 1.65 } }, d)
        )
      ))
    ),
    React.createElement("h2", { style: { fontSize: "var(--text-xl)", color: V.ink, margin: "8px 0 16px" } }, "技術選型"),
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 } },
      stack.map(([n, r]) => React.createElement("div", { key: n, style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 999, border: `1.5px solid ${V.n200}`, background: "#fff" } },
        React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: V.ink } }, n),
        React.createElement("span", { style: { fontSize: 12, color: V.muted } }, r)))
    )
  );
}

function linkBtn() {
  return { display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--blue-600)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 };
}

Object.assign(window, { NotesList, TagsView, AboutView });
})();
