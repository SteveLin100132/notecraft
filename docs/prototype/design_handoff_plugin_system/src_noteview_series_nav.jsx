// ── Series navigation：系列上一章 / 下一章（置於內文末）── 一章可以是筆記，也可以是資料檔頁
const ncOpenEntry = (entry, onOpenNote) => {
  if (!entry) return;
  if (entry.kind === "data") { const f = (window.NC_ENV || {}).onOpenView; f && f(entry.id); return; }
  onOpenNote(entry.ref);
};

function SeriesNavCard({ entry, dir, onOpenNote }) {
  const isPrev = dir === "prev";
  const isData = entry.kind === "data";
  const [hover, setHover] = useState(false);
  return React.createElement("button", {
    onClick: () => ncOpenEntry(entry, onOpenNote),
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
    // 方向標：資料檔在這裡補上型別，標題本身的處理與筆記完全相同
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: T.muted } },
      isPrev && window.Icons.chevronLeft({ s: 14 }),
      isPrev ? "上一章" : "下一章",
      isData && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, color: "var(--orange-600)", fontWeight: 700 } },
        "· ", window.Icons.database({ s: 13 }), "資料檔"),
      !isPrev && window.Icons.chevronRight({ s: 14 })
    ),
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--text-lg)", fontWeight: 700, color: hover ? "var(--blue-500)" : T.blue, lineHeight: 1.35, transition: "color 160ms" } },
      isPrev && React.createElement("span", { style: { fontWeight: 400, color: "var(--orange-500)", fontSize: "1.1em" } }, "«"),
      entry.title,
      !isPrev && React.createElement("span", { style: { fontWeight: 400, color: "var(--orange-500)", fontSize: "1.1em" } }, "»")
    ),
    isData && React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11.5, color: T.muted } }, entry.file.path)
  );
}

function SeriesNav({ note, entryRef, onOpenNote, onOpenSeries }) {
  const cur = entryRef || (note && note.slug);
  const info = window.seriesOf(cur);
  if (!info) return null;
  const { series, index, total, prev, next } = info;
  const prog = window.seriesProgress(series);
  const chapterMark = (window.NC_ENV || {}).chapterMark || "pill";
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
    // 系列整體進度條（依各章閱讀狀態，資料檔與筆記同一條）
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
        const e = s.entry;
        const m = window.readingMeta(s.status);
        const isCur = e.ref === cur;
        const isData = e.kind === "data";
        const color = s.status === "done" ? "var(--success-500)" : s.status === "reading" ? "var(--blue-500)" : "var(--neutral-400)";
        const tint = isData && chapterMark === "tint";
        return React.createElement("button", { key: e.ref, onClick: () => ncOpenEntry(e, onOpenNote),
          style: { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 12px", border: `1px solid ${isCur ? "var(--blue-200)" : "transparent"}`, borderRadius: "var(--radius-md)", background: isCur ? T.blue50 : (tint ? "var(--orange-50)" : "transparent"), cursor: "pointer", fontFamily: "var(--font-sans)", transition: "background 140ms" },
          onMouseEnter: (ev) => { if (!isCur) ev.currentTarget.style.background = "var(--neutral-50)"; },
          onMouseLeave: (ev) => { if (!isCur) ev.currentTarget.style.background = tint ? "var(--orange-50)" : "transparent"; } },
          React.createElement("span", { style: { display: "inline-flex", color, flex: "none" } }, window.Icons[m.icon]({ s: 16 })),
          React.createElement("span", { style: { fontSize: 11.5, fontWeight: 700, color: isData && chapterMark === "icon" ? "var(--orange-600)" : T.muted, fontFamily: "var(--font-mono)", flex: "none", width: 22, display: "inline-flex", justifyContent: "center" } },
            isData && chapterMark === "icon" ? window.Icons.database({ s: 14 }) : String(i + 1).padStart(2, "0")),
          React.createElement("span", { style: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: isCur ? 700 : 500, color: isCur ? T.blue : T.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, e.title),
          isData && chapterMark !== "icon" && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, flex: "none", padding: "2px 8px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange-600)", fontSize: 11, fontWeight: 700 } },
            window.Icons.database({ s: 11 }), "資料檔"),
          isCur && React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: T.blue, flex: "none" } }, "目前這一章")
        );
      })
    ),
    // prev / next cards
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } },
      prev
        ? React.createElement(SeriesNavCard, { entry: prev, dir: "prev", onOpenNote })
        : React.createElement("div", null),
      next
        ? React.createElement(SeriesNavCard, { entry: next, dir: "next", onOpenNote })
        : React.createElement("div", null)
    )
  );
}


