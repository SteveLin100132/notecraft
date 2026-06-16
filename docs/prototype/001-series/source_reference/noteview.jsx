// NoteCraft — MDX block renderer + Note view page
const { useState, useEffect, useRef } = React;

const T = {
  blue: "var(--blue-700)", blue500: "var(--blue-500)", blue50: "var(--blue-50)",
  orange: "var(--orange-500)", orange50: "var(--orange-50)",
  ink: "var(--text-strong)", body: "var(--text-body)", muted: "var(--text-muted)",
  n100: "var(--neutral-100)", n200: "var(--neutral-200)", n50: "var(--neutral-50)",
};

// slug for headings (TOC)
const hid = (s) => "h-" + s.replace(/[^\w\u4e00-\u9fff]+/g, "-");

function MarkerBlock({ block }) {
  const { Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const statusMap = {
    generated: ["success", "已生成"], pending: ["warning", "待生成"],
    locked: ["neutral", "已鎖定"], failed: ["danger", "生成失敗"],
  };
  const [tone, label] = statusMap[block.status] || statusMap.pending;
  const isPending = block.status !== "generated";
  return React.createElement("div", {
    style: {
      margin: "22px 0", borderRadius: "var(--radius-lg)", overflow: "hidden",
      border: `1px dashed ${isPending ? "var(--orange-300)" : "var(--neutral-300)"}`,
      background: isPending ? "var(--orange-50)" : "var(--neutral-50)",
    },
  },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${isPending ? "var(--orange-100)" : T.n100}` } },
      React.createElement("span", { style: { display: "flex", color: T.orange } }, window.Icons.sparkle({ s: 16 })),
      React.createElement("code", { style: { fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: T.blue } }, `@ai-visualize · ${block.id}`),
      React.createElement("span", { style: { marginLeft: "auto", display: "flex", gap: 6 } },
        React.createElement(Badge, { tone: "blue", variant: "soft" }, block.type),
        React.createElement(Badge, { tone, variant: "soft" }, label)
      )
    ),
    React.createElement("div", { style: { padding: "12px 16px 14px" } },
      React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", color: T.muted, marginBottom: 5 } }, "PROMPT"),
      React.createElement("p", { style: { margin: 0, fontSize: 13.5, color: T.body, lineHeight: 1.7 } }, block.prompt),
      isPending && React.createElement("div", { style: { marginTop: 10, fontSize: 12.5, color: "var(--orange-600)", display: "flex", alignItems: "center", gap: 6 } },
        window.Icons.clock({ s: 14 }),
        "尚未生成 — 在 Claude Code 中請 AI 處理此標記即可在此渲染元件"
      )
    )
  );
}

// ── Code block theme (trendlink light surface) ──
const CODE = {
  bg: "var(--neutral-0)",           // #ffffff — clean white surface
  header: "var(--neutral-50)",      // #f6f8fb — faint blue-tinted bar
  gutterBg: "var(--neutral-50)",    // sunken gutter
  border: "var(--neutral-200)",     // #e1e6ee — hairline
  gutter: "var(--neutral-400)",     // #9aa6b8 — line-number figures
  base: "var(--neutral-800)",       // #262e3d — plain code
  comment: "var(--neutral-400)",    // muted blue-gray
  string: "var(--orange-600)",      // #c7641a — warm accent (legible on white)
  keyword: "var(--blue-700)",       // #1b4f9c — brand navy
  number: "var(--orange-700)",      // #a04f15
  hlBg: "var(--orange-50)",         // #fdf4e6 — highlighted line band
  hlBar: "var(--orange-400)",       // #ed9b26 — left accent stripe
  hlNum: "var(--orange-600)",       // #c7641a — emphasized line number
};
const CODE_FONT_SIZE = 13.5;
const CODE_LINE_HEIGHT = 1.85;      // generous, controllable line height

// Token → style, all mapped to design-system tokens.
const CODE_TC = {
  comment: { color: "var(--neutral-400)", fontStyle: "italic" },
  string:  { color: "var(--success-500)" },              // green — strings
  number:  { color: "var(--orange-700)" },               // warm — numerics
  keyword: { color: "var(--blue-700)", fontWeight: 600 },// navy — language keywords
  func:    { color: "var(--blue-500)" },                 // azure — function calls
  type:    { color: "var(--orange-600)" },               // gold — Components / Types
  attr:    { color: "var(--sky-600)" },                  // sky — JSX attrs / object keys
  punct:   { color: "var(--neutral-400)" },              // muted — punctuation
  plain:   { color: "var(--neutral-800)" },              // base identifiers
};

const CODE_KW_SET = new Set("const let var function return if else for while do switch case break continue type interface enum import export from as default new await async class extends implements public private protected readonly static get set null undefined true false void never any unknown in of typeof instanceof this yield delete throw try catch finally".split(" "));

// Master tokenizer: comments, strings, numbers, identifiers, punctuation.
const CODE_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()\[\].,;:=<>+\-*/%!&|?~@]+)|(\s+)/g;

function classifyIdent(word, line, start, end) {
  if (CODE_KW_SET.has(word)) return "keyword";
  let n = end; while (n < line.length && line[n] === " ") n++;
  let p = start - 1; while (p >= 0 && line[p] === " ") p--;
  const nextCh = line[n], prevCh = line[p];
  if (prevCh === "<" || prevCh === ".") return /^[A-Z]/.test(word) ? "type" : (nextCh === "(" ? "func" : "attr");
  if (nextCh === "(") return "func";
  if (nextCh === "=" && line[n + 1] !== "=") return "attr";      // JSX attr / assignment target
  if (/^[A-Z]/.test(word)) return "type";                         // Component / Type names
  return "plain";
}

function tokenizeLine(line, keyBase) {
  const out = [];
  let m, k = 0;
  CODE_RE.lastIndex = 0;
  const push = (text, t) => out.push(React.createElement("span", { key: keyBase + "-" + (k++), style: CODE_TC[t] }, text));
  while ((m = CODE_RE.exec(line))) {
    if (m[1]) push(m[1], "comment");
    else if (m[2]) push(m[2], "string");
    else if (m[3]) push(m[3], "number");
    else if (m[4]) push(m[4], classifyIdent(m[4], line, m.index, CODE_RE.lastIndex));
    else if (m[5]) push(m[5], "punct");
    else out.push(m[0]); // whitespace
  }
  return out.length ? out : "\u200b"; // keep empty lines tall
}

function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);
  const lines = String(block.c).split("\n");
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    try {
      navigator.clipboard.writeText(block.c).then(done, done);
    } catch (e) { done(); }
  };
  const rowStyle = { lineHeight: CODE_LINE_HEIGHT, height: `${CODE_LINE_HEIGHT}em` };
  const hl = new Set((block.hl || []).map(Number));   // 1-indexed lines to highlight

  return React.createElement("div", { style: { margin: "22px 0", borderRadius: "var(--radius-lg)", overflow: "hidden", border: `1px solid ${CODE.border}`, background: CODE.bg, boxShadow: "var(--shadow-sm)" } },
    // header
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px 9px 14px", background: CODE.header, borderBottom: `1px solid ${CODE.border}` } },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, color: "var(--orange-500)" } },
        window.Icons.code({ s: 15 }),
        React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--orange-600)" } }, block.lang)
      ),
      React.createElement("span", { style: { marginLeft: "auto" } },
        React.createElement("button", {
          onClick: copy,
          style: {
            display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
            padding: "5px 11px", borderRadius: 999,
            border: `1px solid ${copied ? "rgba(46,158,107,0.45)" : "var(--neutral-300)"}`,
            background: copied ? "var(--success-50)" : "var(--neutral-0)",
            color: copied ? "var(--success-500)" : "var(--neutral-600)",
            transition: "background 140ms, color 140ms, border-color 140ms",
          },
          onMouseEnter: (e) => { if (!copied) e.currentTarget.style.background = "var(--neutral-100)"; },
          onMouseLeave: (e) => { if (!copied) e.currentTarget.style.background = "var(--neutral-0)"; },
        },
          copied ? window.Icons.check({ s: 14 }) : window.Icons.copy({ s: 14 }),
          copied ? "已複製" : "複製"
        )
      )
    ),
    // body: fixed line-number gutter + horizontally-scrolling code
    React.createElement("div", { style: { display: "flex", alignItems: "stretch", fontFamily: "var(--font-mono)", fontSize: CODE_FONT_SIZE } },
      React.createElement("div", { style: { flex: "none", textAlign: "right", userSelect: "none", padding: "14px 0", color: CODE.gutter, background: CODE.gutterBg, borderRight: `1px solid ${CODE.border}` } },
        lines.map((_, i) => {
          const on = hl.has(i + 1);
          return React.createElement("div", { key: i, style: { ...rowStyle, padding: "0 14px 0 16px", background: on ? CODE.hlBg : "transparent", boxShadow: on ? `inset 3px 0 0 ${CODE.hlBar}` : "none", color: on ? CODE.hlNum : undefined, fontWeight: on ? 700 : undefined } }, i + 1);
        })
      ),
      React.createElement("pre", { style: { margin: 0, padding: "14px 0", overflowX: "auto", flex: "1 1 auto", minWidth: 0 } },
        React.createElement("code", { style: { color: CODE.base } },
          lines.map((ln, i) => React.createElement("div", { key: i, style: { ...rowStyle, padding: "0 18px", whiteSpace: "pre", background: hl.has(i + 1) ? CODE.hlBg : "transparent" } }, tokenizeLine(ln, i)))
        )
      )
    )
  );
}

function NoteBody({ note }) {
  return note.content.map((b, i) => {
    switch (b.t) {
      case "h2":
        return React.createElement("h2", { key: i, id: hid(b.c), style: { fontSize: "var(--text-2xl)", color: T.ink, margin: "38px 0 14px", scrollMarginTop: 90 } }, b.c);
      case "h3":
        return React.createElement("h3", { key: i, id: hid(b.c), style: { fontSize: "var(--text-xl)", color: T.ink, margin: "28px 0 10px", scrollMarginTop: 90 } }, b.c);
      case "p":
        return React.createElement("p", { key: i, style: { fontSize: "var(--text-md)", color: T.body, lineHeight: 1.85, margin: "0 0 16px" } }, b.c);
      case "ul":
      case "ol":
        return React.createElement(b.t === "ul" ? "ul" : "ol", { key: i, style: { margin: "0 0 18px", paddingLeft: 22, color: T.body, fontSize: "var(--text-md)", lineHeight: 1.85, display: "flex", flexDirection: "column", gap: 7 } },
          b.c.map((li, j) => React.createElement("li", { key: j }, li)));
      case "quote":
        return React.createElement("blockquote", { key: i, style: { margin: "22px 0", padding: "14px 20px", borderLeft: `4px solid ${T.orange}`, background: T.orange50, borderRadius: "0 var(--radius-md) var(--radius-md) 0", fontSize: "var(--text-md)", color: "var(--blue-900)", fontWeight: 500, lineHeight: 1.8 } }, b.c);
      case "code":
        return React.createElement(CodeBlock, { key: i, block: b });
      case "marker":
        return React.createElement(MarkerBlock, { key: i, block: b });
      case "viz": {
        const Comp = window.GENERATED[b.id];
        return Comp ? React.createElement(Comp, { key: i }) : null;
      }
      default:
        return null;
    }
  });
}

// 閱讀進度控制（手動為主）：待開始 / 閱讀中 / 已完成
function ReadingControl({ note }) {
  const status = window.readingStatus(note.slug);
  const opts = [["not-started", "待開始", "var(--neutral-600)"], ["reading", "閱讀中", "var(--blue-500)"], ["done", "已完成", "var(--success-500)"]];
  return React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 9 } },
    React.createElement("span", { style: { fontSize: 12.5, fontWeight: 600, color: T.muted } }, "閱讀進度"),
    React.createElement("div", { style: { display: "inline-flex", gap: 3, padding: 3, background: "var(--neutral-100)", borderRadius: 999 } },
      opts.map(([k, label, color]) => {
        const on = status === k;
        const m = window.readingMeta(k);
        return React.createElement("button", { key: k, onClick: () => window.setReadingStatus(note.slug, k),
          style: { display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 12px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: on ? 700 : 600, background: on ? "#fff" : "transparent", color: on ? color : T.muted, boxShadow: on ? "var(--shadow-xs)" : "none", transition: "all 140ms" } },
          window.Icons[m.icon]({ s: 14 }), label);
      })
    )
  );
}

// 文末「標記為已完成」提示
function DonePrompt({ note }) {
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const status = window.readingStatus(note.slug);
  if (status === "done") {
    return React.createElement("div", { style: { marginTop: 32, display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--success-50)", color: "var(--success-500)", fontSize: 14, fontWeight: 700 } },
      window.Icons.circleCheck({ s: 18 }), "已標記為完成",
      React.createElement("button", { onClick: () => window.setReadingStatus(note.slug, "reading"),
        style: { marginLeft: "auto", border: "none", background: "none", color: "var(--text-muted)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" } }, "標記為未完成")
    );
  }
  return React.createElement("div", { style: { marginTop: 32, display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: "var(--radius-lg)", background: T.orange50, border: "1px solid var(--orange-100)" } },
    React.createElement("span", { style: { display: "flex", color: T.orange } }, window.Icons.lightbulb({ s: 20 })),
    React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--blue-900)" } }, "讀完這篇了嗎？"),
    React.createElement(Button, { variant: "primary", size: "sm", shape: "pill", style: { marginLeft: "auto" }, iconLeft: window.Icons.check({ s: 15 }), onClick: () => { window.setReadingStatus(note.slug, "done"); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "已標記為完成", icon: "check" } })); } }, "標記為已完成")
  );
}

function NoteView({ note, devMode, onBack, onTag, onOpenNote, onOpenSeries, fontScale }) {
  const { Button, Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const [copied, setCopied] = useState(false);
  const [activeH, setActiveH] = useState(null);
  const toc = note.content.filter((b) => b.t === "h2").map((b) => ({ id: hid(b.c), label: b.c }));
  const markers = window.markersOf(note);
  const genCount = markers.filter((m) => m.status === "generated").length;

  useEffect(() => { window.scrollTo(0, 0); }, [note.slug]);
  // 開啟已發佈筆記時，輕量自動轉換：待開始 → 閱讀中（手動為主，永不降級）
  useEffect(() => { if (window.noteStatus(note) === "published") window.markReading(note.slug); }, [note.slug]);
  useEffect(() => {
    const onScroll = () => {
      let cur = null;
      toc.forEach((h) => {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 140) cur = h.id;
      });
      setActiveH(cur);
    };
    const sc = document.querySelector("#nc-scroll");
    sc && sc.addEventListener("scroll", onScroll);
    onScroll();
    return () => sc && sc.removeEventListener("scroll", onScroll);
  }, [note.slug]);

  const copyPrompt = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ── status-driven states：empty（初始畫面）/ coming-soon（佔位 + 彩蛋）──
  // 所有 hooks 已於上方無條件呼叫完畢，這裡才依 status 分流，避免 hooks 順序錯亂。
  const status = window.noteStatus(note);
  if (status !== "published") {
    const StateComp = status === "coming-soon" ? window.ComingSoonState : window.EmptyNoteState;
    return React.createElement("div", { style: { fontSize: `calc(1rem * ${fontScale})` } },
      React.createElement("button", { onClick: onBack, style: { display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: T.muted, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 22, fontFamily: "var(--font-sans)" } },
        window.Icons.chevronLeft({ s: 16 }), "返回筆記列表"),
      React.createElement(StateComp, { note, devMode })
    );
  }

  return React.createElement("div", { style: { fontSize: `calc(1rem * ${fontScale})` } },
    React.createElement("button", { onClick: onBack, style: { display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: T.muted, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 18, fontFamily: "var(--font-sans)" } },
      window.Icons.chevronLeft({ s: 16 }), "返回筆記列表"),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: toc.length ? "1fr 220px" : "1fr", gap: 40, alignItems: "start" } },
      // main column
      React.createElement("article", { style: { minWidth: 0, maxWidth: 760 } },
        React.createElement("div", { style: { marginBottom: 14 } },
          React.createElement(window.TagEditor, {
            tags: note.tags, editable: devMode,
            suggestions: window.allTags().map((x) => x[0]),
            onTagClick: onTag,
            onAdd: (tg) => { const r = window.addNoteTag(note.slug, tg); if (!r.ok) window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: r.reason === "dup" ? "此筆記已有相同標籤" : "標籤無效", icon: "x" } })); },
            onRemove: (tg) => { window.removeNoteTag(note.slug, tg); },
          })
        ),
        React.createElement("h1", { style: { fontSize: "var(--text-4xl)", color: T.ink, lineHeight: 1.2, margin: "0 0 14px", fontWeight: 900 } }, note.title),
        React.createElement("p", { style: { fontSize: "var(--text-lg)", color: T.muted, lineHeight: 1.7, margin: "0 0 18px" } }, note.description),
        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, paddingBottom: 18, marginBottom: 8, borderBottom: `1px solid ${T.n200}`, fontSize: 13, color: T.muted } },
          React.createElement(ReadingControl, { note }),
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 } }, window.Icons.clock({ s: 15 }), `更新於 ${window.fmtDate(note.updatedAt)}`),
          markers.length > 0 && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 } }, window.Icons.sparkle({ s: 15, style: { color: T.orange } }), `${genCount}/${markers.length} 視覺化已生成`),
          // dev-only buttons
          devMode && React.createElement("span", { style: { marginLeft: "auto", display: "inline-flex", gap: 8 } },
            React.createElement(Button, { variant: "secondary", size: "sm", shape: "pill", iconLeft: window.Icons.edit({ s: 15 }), onClick: () => window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: `已喚起 VS Code 開啟 ${note.slug}.mdx`, icon: "code" } })) }, "以 VS Code 編輯"),
            markers.some((m) => m.status !== "generated") && React.createElement(Button, { variant: "outline", size: "sm", shape: "pill", iconLeft: copied ? window.Icons.check({ s: 15 }) : window.Icons.clipboard({ s: 15 }), onClick: copyPrompt }, copied ? "已複製範本" : "在 Claude Code 重新生成")
          )
        ),
        React.createElement("div", { style: { marginTop: 14 } }, React.createElement(NoteBody, { note })),
        // 文末「標記為已完成」提示
        React.createElement(DonePrompt, { note }),
        // series prev / next navigation
        onOpenNote && React.createElement(SeriesNav, { note, onOpenNote, onOpenSeries }),
        // footer nav
        React.createElement("div", { style: { marginTop: 44, paddingTop: 22, borderTop: `1px solid ${T.n200}`, display: "flex", justifyContent: "space-between", color: T.muted, fontSize: 13 } },
          React.createElement("span", null, `建立於 ${window.fmtDate(note.createdAt)}`),
          React.createElement("span", { style: { fontFamily: "var(--font-mono)" } }, `src/content/notes/${note.slug}.mdx`)
        )
      ),
      // TOC
      toc.length > 0 && React.createElement("nav", { style: { position: "sticky", top: 8, alignSelf: "start" } },
        React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", color: T.muted, marginBottom: 12, textTransform: "uppercase" } }, "目錄"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, borderLeft: `2px solid ${T.n200}` } },
          toc.map((h) => React.createElement("a", { key: h.id, href: `#${h.id}`,
            onClick: (e) => { e.preventDefault(); const el = document.getElementById(h.id); el && el.scrollIntoView ? null : null; const sc = document.querySelector("#nc-scroll"); if (el && sc) sc.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" }); },
            style: { padding: "5px 14px", marginLeft: -2, borderLeft: `2px solid ${activeH === h.id ? T.orange : "transparent"}`, fontSize: 13.5, color: activeH === h.id ? T.blue : T.muted, fontWeight: activeH === h.id ? 700 : 500, textDecoration: "none", lineHeight: 1.5, transition: "color 140ms" } }, h.label))
        )
      )
    )
  );
}

window.NoteView = NoteView;

// ── Series navigation：系列上一章 / 下一章卡片（置於筆記內文末） ──
function SeriesNavCard({ note, dir, onOpenNote }) {
  const isPrev = dir === "prev";
  const [hover, setHover] = useState(false);
  return React.createElement("button", {
    onClick: () => onOpenNote(note.slug),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex", flexDirection: "column", gap: 7,
      alignItems: isPrev ? "flex-start" : "flex-end",
      textAlign: isPrev ? "left" : "right",
      padding: "16px 20px", width: "100%", cursor: "pointer",
      border: `1px solid ${hover ? "var(--blue-300)" : T.n200}`,
      borderRadius: "var(--radius-lg)", background: "#fff",
      boxShadow: hover ? "var(--shadow-sm)" : "none",
      transform: hover ? "translateY(-2px)" : "none",
      transition: "transform 160ms var(--ease-out), box-shadow 160ms, border-color 160ms",
      fontFamily: "var(--font-sans)",
    },
  },
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: T.muted } },
      isPrev && window.Icons.chevronLeft({ s: 14 }),
      isPrev ? "上一章" : "下一章",
      !isPrev && window.Icons.chevronRight({ s: 14 })
    ),
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--text-lg)", fontWeight: 700, color: hover ? "var(--blue-500)" : T.blue, lineHeight: 1.35, transition: "color 160ms" } },
      isPrev && React.createElement("span", { style: { fontWeight: 400, color: "var(--orange-500)", fontSize: "1.1em" } }, "«"),
      note.title,
      !isPrev && React.createElement("span", { style: { fontWeight: 400, color: "var(--orange-500)", fontSize: "1.1em" } }, "»")
    )
  );
}

function SeriesNav({ note, onOpenNote, onOpenSeries }) {
  const info = window.seriesOf(note.slug);
  if (!info) return null;
  const { series, index, total, prev, next } = info;
  const prog = window.seriesProgress(series);
  return React.createElement("section", { style: { marginTop: 44, paddingTop: 26, borderTop: `1px solid ${T.n200}` } },
    // series context eyebrow
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 14 } },
      React.createElement("button", { onClick: () => onOpenSeries && onOpenSeries(series.id),
        style: { display: "inline-flex", alignItems: "center", gap: 11, border: "none", background: "none", padding: 0, cursor: onOpenSeries ? "pointer" : "default", fontFamily: "var(--font-sans)", textAlign: "left" } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "var(--radius-md)", background: T.blue50, color: T.blue, flex: "none" } }, window.Icons.layers({ s: 17 })),
        React.createElement("div", { style: { lineHeight: 1.25 } },
          React.createElement("div", { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: ".16em", color: "var(--orange-500)" } }, series.eyebrow),
          React.createElement("div", { style: { fontSize: 14.5, fontWeight: 800, color: T.ink } }, series.title)
        )
      ),
      onOpenSeries && React.createElement("button", { onClick: () => onOpenSeries(series.id),
        style: { display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--blue-600)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 } },
        "查看系列", window.Icons.arrowRight({ s: 14 })),
      React.createElement("span", { style: { marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: T.muted, fontFamily: "var(--font-mono)" } }, `第 ${index + 1} 章 · 共 ${total} 章`)
    ),
    // 系列整體進度條（依各章閱讀狀態）
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 } },
      React.createElement("div", { style: { display: "flex", flex: 1, height: 6, borderRadius: 999, background: T.n100, overflow: "hidden" } },
        React.createElement("div", { style: { width: `${prog.tracked ? (prog.done / prog.tracked) * 100 : 0}%`, background: "var(--success-500)", transition: "width 400ms" } }),
        React.createElement("div", { style: { width: `${prog.tracked ? (prog.reading / prog.tracked) * 100 : 0}%`, background: "var(--blue-500)", opacity: 0.4, transition: "width 400ms" } })
      ),
      React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: prog.completed ? "var(--success-500)" : T.blue, fontFamily: "var(--font-mono)" } }, `${prog.pct}%`)
    ),
    // 章節狀態縮覽（目前章節高亮）
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 } },
      prog.statuses.map((s, i) => {
        const m = window.readingMeta(s.status);
        const isCur = s.note.slug === note.slug;
        const color = s.status === "done" ? "var(--success-500)" : s.status === "reading" ? "var(--blue-500)" : "var(--neutral-400)";
        return React.createElement("button", { key: s.note.slug, onClick: () => onOpenNote(s.note.slug),
          style: { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 12px", border: `1px solid ${isCur ? "var(--blue-200)" : "transparent"}`, borderRadius: "var(--radius-md)", background: isCur ? T.blue50 : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "background 140ms" },
          onMouseEnter: (e) => { if (!isCur) e.currentTarget.style.background = "var(--neutral-50)"; },
          onMouseLeave: (e) => { if (!isCur) e.currentTarget.style.background = "transparent"; } },
          React.createElement("span", { style: { display: "inline-flex", color, flex: "none" } }, window.Icons[m.icon]({ s: 16 })),
          React.createElement("span", { style: { fontSize: 11.5, fontWeight: 700, color: T.muted, fontFamily: "var(--font-mono)", flex: "none", width: 22 } }, String(i + 1).padStart(2, "0")),
          React.createElement("span", { style: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: isCur ? 700 : 500, color: isCur ? T.blue : T.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, s.note.title),
          isCur && React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: T.blue, flex: "none" } }, "閱讀中的章節")
        );
      })
    ),
    // prev / next cards
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } },
      prev
        ? React.createElement(SeriesNavCard, { note: prev, dir: "prev", onOpenNote })
        : React.createElement("div", null),
      next
        ? React.createElement(SeriesNavCard, { note: next, dir: "next", onOpenNote })
        : React.createElement("div", null)
    )
  );
}

window.SeriesNav = SeriesNav;
