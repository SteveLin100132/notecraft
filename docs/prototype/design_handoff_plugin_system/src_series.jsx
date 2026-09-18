// 系列詳情頁 · 章節列（entry 化：一章可以是筆記或資料檔頁）
// ─────────────────────────── 章節列 ───────────────────────────
// 資料檔那一列與筆記完全同構：同樣的序號方塊、同樣的狀態徽章、同樣的點擊面積。
// 型別差異只由「資料檔」徽章與 mono 路徑承載 —— 不同種類，不是次等。
function ChapterRow({ entry, status, index, accent, onOpenNote, chapterMark }) {
  const { Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const [hover, setHover] = useState(false);
  const m = window.readingMeta(status);
  const isData = entry.kind === "data";
  const mk = isData ? [] : window.markersOf(entry.note);
  const A = ac(accent);
  const iconMark = isData && chapterMark === "icon";
  const tintMark = isData && chapterMark === "tint";
  return React.createElement("button", {
    onClick: () => openEntry(entry, onOpenNote),
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    style: { display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left", padding: "15px 18px", border: "none", borderTop: index === 0 ? "none" : `1px solid ${V.n100}`, background: hover ? "var(--neutral-50)" : (tintMark ? "var(--orange-50)" : "transparent"), cursor: "pointer", fontFamily: "var(--font-sans)", transition: "background 140ms" } },
    // 章節序號（資料檔同樣有序號 —— 它是正式的一章）
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "var(--radius-md)", background: status === "done" ? "var(--success-50)" : (iconMark ? "var(--orange-50)" : A.soft), color: status === "done" ? "var(--success-500)" : (iconMark ? "var(--orange-600)" : A.deep), flex: "none", fontSize: 13.5, fontWeight: 800, fontFamily: "var(--font-mono)" } },
      status === "done" ? window.Icons.check({ s: 17 }) : (iconMark ? window.Icons.database({ s: 17 }) : String(index + 1).padStart(2, "0"))),
    // 標題 + 描述
    React.createElement("span", { style: { minWidth: 0, flex: 1 } },
      React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 15.5, fontWeight: 700, color: V.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, entry.title),
        isData && chapterMark !== "icon" && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, flex: "none", padding: "2px 8px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange-600)", fontSize: 11.5, fontWeight: 700 } },
          window.Icons.database({ s: 12 }), "資料檔")
      ),
      React.createElement("span", { style: { display: "block", fontSize: 12.5, color: V.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, entry.description || "尚無內容")
    ),
    // 資料檔：原始檔路徑（筆記在同一格是 @ai-visualize 計數）
    isData && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, flex: "none", fontFamily: "var(--font-mono)", fontSize: 11.5, color: V.muted } },
      window.Icons.fileJson({ s: 13 }), entry.file.path),
    // AI 視覺化計數
    mk.length > 0 && React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: V.muted, flex: "none" } },
      window.Icons.sparkle({ s: 13, style: { color: V.orange } }), `${mk.filter((x) => x.status === "generated").length}/${mk.length}`),
    // 閱讀狀態徽章
    React.createElement(Badge, { tone: m.tone, variant: "soft" },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, window.Icons[m.icon]({ s: 12 }), m.label)),
    React.createElement("span", { style: { color: "var(--neutral-300)", display: "flex", flex: "none" } }, window.Icons.chevronRight({ s: 17 }))
  );
}

