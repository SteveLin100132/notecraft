// NoteCraft — Dashboard, Notes list, Tags, About views
const V = {
  blue: "var(--blue-700)", blue500: "var(--blue-500)", blue50: "var(--blue-50)",
  orange: "var(--orange-500)", orange400: "var(--orange-400)", orange50: "var(--orange-50)",
  ink: "var(--text-strong)", body: "var(--text-body)", muted: "var(--text-muted)",
  n100: "var(--neutral-100)", n200: "var(--neutral-200)", n50: "var(--neutral-50)",
  green: "var(--success-500)",
};

function PageHead({ eyebrow, title, sub, action }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" } },
    React.createElement("div", null,
      eyebrow && React.createElement("div", { className: "tl-eyebrow", style: { marginBottom: 10 } }, eyebrow),
      React.createElement("h1", { style: { fontSize: "var(--text-3xl)", color: V.ink, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, title),
      sub && React.createElement("p", { style: { fontSize: "var(--text-md)", color: V.muted, margin: "8px 0 0", lineHeight: 1.6 } }, sub)
    ),
    action
  );
}

// ─────────────────────────── Dashboard ───────────────────────────
function Dashboard({ onOpen, onNav, devMode, onNew }) {
  const { Card, Badge, Button } = window.TrendLinkDesignSystem_b2a0d6;
  const notes = window.NOTES;
  const total = notes.length;
  const recent = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const weekNew = notes.filter((n) => new Date("2026-06-12") - new Date(n.createdAt) < 7 * 86400000).length;
  const monthNew = notes.filter((n) => new Date("2026-06-12") - new Date(n.createdAt) < 30 * 86400000).length;
  const allMarkers = notes.flatMap((n) => window.markersOf(n));
  const gen = allMarkers.filter((m) => m.status === "generated").length;
  const pending = allMarkers.length - gen;
  const tags = window.allTags();
  const maxTag = tags[0][1];

  const kpis = [
    { label: "筆記總數", value: total, suffix: "篇", icon: "notes", tone: "blue" },
    { label: "本週新增", value: weekNew, suffix: "篇", icon: "bolt", tone: "blue" },
    { label: "本月新增", value: monthNew, suffix: "篇", icon: "clock", tone: "blue" },
    { label: "AI 視覺化", value: gen, suffix: `/ ${allMarkers.length}`, icon: "sparkle", tone: "orange" },
  ];

  return React.createElement("div", null,
    React.createElement(PageHead, {
      eyebrow: "DASHBOARD", title: "知識總覽",
      sub: "所有統計皆於 astro build 階段掃描 MDX 計算，前端直接讀取。",
      action: devMode && React.createElement(Button, { variant: "primary", size: "md", iconLeft: window.Icons.plus({ s: 18 }), onClick: onNew }, "新增筆記"),
    }),
    // KPIs
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 } },
      kpis.map((k) => React.createElement(Card, { key: k.label, style: { padding: 20 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement("span", { style: { fontSize: 13, color: V.muted, fontWeight: 500, whiteSpace: "nowrap" } }, k.label),
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 4, background: k.tone === "orange" ? V.orange50 : V.blue50, color: k.tone === "orange" ? V.orange : V.blue500 } }, window.Icons[k.icon]({ s: 18 }))
        ),
        React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 5, marginTop: 12, whiteSpace: "nowrap" } },
          React.createElement("span", { style: { fontSize: 34, fontWeight: 900, color: k.tone === "orange" ? V.orange : V.blue, lineHeight: 1 } }, k.value),
          React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: V.muted } }, k.suffix)
        )
      ))
    ),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20 } },
      // recent updates
      React.createElement(Card, { style: { padding: 0, overflow: "hidden" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px" } },
          React.createElement("h2", { style: { fontSize: 17, color: V.ink, margin: 0 } }, "最近更新"),
          React.createElement("button", { onClick: () => onNav("notes"), style: linkBtn() }, "查看全部", window.Icons.arrowRight({ s: 15 }))
        ),
        React.createElement("div", null,
          recent.slice(0, 6).map((n, i) => {
            const mk = window.markersOf(n);
            return React.createElement("button", { key: n.slug, onClick: () => onOpen(n.slug),
              style: { display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", padding: "13px 22px", border: "none", borderTop: `1px solid ${V.n100}`, background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "background 140ms" },
              onMouseEnter: (e) => e.currentTarget.style.background = "var(--neutral-50)",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent" },
              React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 4, background: V.blue50, color: V.blue500, flex: "none" } }, window.Icons.notes({ s: 18 })),
              React.createElement("span", { style: { minWidth: 0, flex: 1 } },
                React.createElement("span", { style: { display: "block", fontSize: 14.5, fontWeight: 700, color: V.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, n.title),
                React.createElement("span", { style: { display: "flex", gap: 8, marginTop: 3, fontSize: 12, color: V.muted, whiteSpace: "nowrap" } },
                  React.createElement("span", null, window.daysAgo(n.updatedAt)),
                  React.createElement("span", null, "·"),
                  React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, n.tags.slice(0, 2).join("、"))
                )
              ),
              (() => { const sm = window.statusMeta(n); return sm && React.createElement(Badge, { tone: sm.tone, variant: "soft" }, sm.label); })(),
              mk.length > 0 && React.createElement(Badge, { tone: mk.every((m) => m.status === "generated") ? "success" : "warning", variant: "soft" }, mk.every((m) => m.status === "generated") ? "已生成" : `${mk.filter((m) => m.status === "generated").length}/${mk.length}`),
              React.createElement("span", { style: { color: "var(--neutral-300)", display: "flex" } }, window.Icons.chevronRight({ s: 16 }))
            );
          })
        )
      ),
      // right column
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } },
        // 繼續閱讀（進行中的系列）
        (() => {
          const sp = window.SERIES.map((s) => ({ s, prog: window.seriesProgress(s) }));
          const inProg = sp.filter((x) => x.prog.started && !x.prog.completed).sort((a, b) => b.prog.pct - a.prog.pct);
          const show = (inProg.length ? inProg : sp.filter((x) => !x.prog.started)).slice(0, 2);
          const heading = inProg.length ? "繼續閱讀" : "開始一個系列";
          return React.createElement(Card, { style: { padding: 22 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("span", { style: { display: "flex", color: V.blue500 } }, window.Icons.bookOpen({ s: 18 })),
                React.createElement("h2", { style: { fontSize: 16, color: V.ink, margin: 0 } }, heading)
              ),
              React.createElement("button", { onClick: () => onNav("series"), style: linkBtn() }, "全部", window.Icons.arrowRight({ s: 15 }))
            ),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
              show.map(({ s, prog }) => React.createElement("div", { key: s.id, style: { display: "flex", flexDirection: "column", gap: 8 } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } },
                  React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: V.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.title),
                  React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: V.blue, fontFamily: "var(--font-mono)", flex: "none" } }, `${prog.pct}%`)
                ),
                React.createElement("div", { style: { display: "flex", height: 6, borderRadius: 999, background: V.n100, overflow: "hidden" } },
                  React.createElement("div", { style: { width: `${prog.tracked ? (prog.done / prog.tracked) * 100 : 0}%`, background: "var(--success-500)" } }),
                  React.createElement("div", { style: { width: `${prog.tracked ? (prog.reading / prog.tracked) * 100 : 0}%`, background: V.blue500, opacity: 0.4 } })
                ),
                React.createElement("button", { onClick: () => prog.next && onOpen(prog.next.slug),
                  style: { display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", border: "none", background: "none", color: "var(--blue-600)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 } },
                  window.Icons.play({ s: 13 }), prog.next ? `${inProg.length ? "繼續" : "開始"}：${prog.next.title.length > 14 ? prog.next.title.slice(0, 14) + "…" : prog.next.title}` : "查看")
              ))
            )
          );
        })(),
        // AI generation ratio
        React.createElement(Card, { accent: "orange", style: { padding: 22 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 } },
            React.createElement("span", { style: { display: "flex", color: V.orange } }, window.Icons.sparkle({ s: 18 })),
            React.createElement("h2", { style: { fontSize: 16, color: V.ink, margin: 0 } }, "AI 視覺化進度")
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
            React.createElement("span", { style: { fontSize: 30, fontWeight: 900, color: V.orange } }, `${Math.round((gen / allMarkers.length) * 100)}%`),
            React.createElement("span", { style: { fontSize: 13, color: V.muted } }, `${gen} 已生成 · ${pending} 待生成`)
          ),
          React.createElement("div", { style: { height: 10, borderRadius: 999, background: V.n100, overflow: "hidden", marginTop: 12 } },
            React.createElement("div", { style: { height: "100%", width: `${(gen / allMarkers.length) * 100}%`, background: "var(--gradient-accent)", borderRadius: 999, transition: "width 600ms cubic-bezier(0.16,1,0.3,1)" } })
          ),
          React.createElement("p", { style: { fontSize: 12.5, color: V.muted, margin: "12px 0 0", lineHeight: 1.7 } }, `${notes.filter((n) => window.markersOf(n).length > 0).length} 篇筆記含 @ai-visualize 標記區塊。`)
        ),
        // tag distribution
        React.createElement(Card, { style: { padding: 22 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } },
            React.createElement("h2", { style: { fontSize: 16, color: V.ink, margin: 0 } }, "標籤分布"),
            React.createElement("button", { onClick: () => onNav("tags"), style: linkBtn() }, "全部")
          ),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 9 } },
            tags.slice(0, 6).map(([tg, ct]) => React.createElement("button", { key: tg, onClick: () => onNav("tags"),
              style: { display: "flex", alignItems: "center", gap: 10, border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" } },
              React.createElement("span", { style: { width: 70, fontSize: 13, color: V.body, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" } }, tg),
              React.createElement("span", { style: { flex: 1, height: 8, borderRadius: 999, background: V.n100, overflow: "hidden" } },
                React.createElement("span", { style: { display: "block", height: "100%", width: `${(ct / maxTag) * 100}%`, background: V.blue500, borderRadius: 999 } })),
              React.createElement("span", { style: { width: 20, fontSize: 12.5, color: V.muted, fontWeight: 700, textAlign: "right" } }, ct)
            ))
          )
        )
      )
    )
  );
}

function linkBtn() {
  return { display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--blue-600)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 };
}

window.Dashboard = Dashboard;
window.PageHead = PageHead;
window._Vtokens = V;
