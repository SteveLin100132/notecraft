// NoteCraft — app shell: sidebar, routing, tweaks
const { useState, useEffect, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "devMode": true,
  "deckTheme": "light",
  "sidebarStyle": "navy",
  "listLayout": "grid",
  "fontScale": 1,
  "accent": "#ed9b26",
  "radiusScale": 1,
  "sbCollapsed": false,
  "navLabel": "data",
  "viewWidth": "bleed",
  "pluginCount": 3,
  "cardFoot": "path",
  "embedMark": "adapted",
  "chapterMark": "pill",
  "vizError": false
}/*EDITMODE-END*/;

const NAV_LABELS = {
  data: { zh: "資料", en: "Data", icon: "database" },
  views: { zh: "檢視", en: "Views", icon: "layers" },
  plugins: { zh: "外掛", en: "Plugins", icon: "plug" },
};

const RADIUS_BASE = { xs: 2, sm: 3, md: 5, lg: 8, xl: 11, "2xl": 14 };

const NAV = [
  ["dashboard", "總覽", "Dashboard", "dashboard"],
  ["notes", "筆記", "Notes", "notes"],
  ["series", "系列", "Series", "layers"],
  ["tags", "標籤", "Tags", "tag"],
  ["about", "關於", "About", "about"],
];

function Logo({ light }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 5, background: light ? "rgba(255,255,255,0.12)" : "var(--blue-50)", color: light ? "#fff" : "var(--blue-700)", flex: "none" } }, window.Icons.notes({ s: 22 })),
    React.createElement("div", { style: { lineHeight: 1.1 } },
      React.createElement("div", { style: { fontSize: 17, fontWeight: 900, color: light ? "#fff" : "var(--blue-700)", letterSpacing: "-0.01em" } }, "NoteCraft"),
      React.createElement("div", { style: { fontSize: 9.5, fontWeight: 700, letterSpacing: ".22em", color: light ? "var(--orange-300)" : "var(--orange-500)" } }, "AI NOTES")
    )
  );
}

function Sidebar({ route, onNav, style, devMode, markersPending, collapsed, onCollapse, navLabel }) {
  const navy = style === "navy";
  const bg = navy ? "var(--gradient-header)" : "#fff";
  const fg = navy ? "rgba(255,255,255,0.78)" : "var(--text-muted)";
  const items = [...NAV];
  items.splice(2, 0, ["data", navLabel.zh, navLabel.en, navLabel.icon]);
  return React.createElement("aside", { style: { width: collapsed ? 72 : 248, flex: "none", background: bg, borderRight: navy ? "none" : "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", transition: "width var(--duration-normal) var(--ease-out)", overflow: "hidden" } },
    React.createElement("div", { style: { height: 72, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 8, padding: collapsed ? "0 16px" : "0 14px 0 22px", borderBottom: navy ? "1px solid rgba(255,255,255,0.12)" : "1px solid var(--border-subtle)" } },
      collapsed
        ? React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 5, background: navy ? "rgba(255,255,255,0.12)" : "var(--blue-50)", color: navy ? "#fff" : "var(--blue-700)" } }, window.Icons.notes({ s: 22 }))
        : React.createElement(Logo, { light: navy }),
      !collapsed && React.createElement("button", { onClick: () => onCollapse(true), title: "收合側邊欄",
        style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 5, background: "transparent", color: fg, cursor: "pointer" } }, window.Icons.panelLeft({ s: 17 }))
    ),
    collapsed && React.createElement("button", { onClick: () => onCollapse(false), title: "展開側邊欄",
      style: { margin: "12px auto 0", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 34, border: "none", borderRadius: 5, background: "transparent", color: fg, cursor: "pointer" } }, window.Icons.panelLeft({ s: 17 })),
    React.createElement("nav", { style: { padding: collapsed ? "10px 16px" : "16px 14px", display: "flex", flexDirection: "column", gap: 4 } },
      items.map(([id, zh, en, ic]) => {
        const on = route === id;
        const activeBg = navy ? "rgba(255,255,255,0.16)" : "var(--blue-50)";
        const activeFg = navy ? "#fff" : "var(--blue-700)";
        return React.createElement("button", { key: id, onClick: () => onNav(id), title: collapsed ? `${zh} ${en}` : undefined,
          style: { display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "11px 0" : "11px 14px", justifyContent: collapsed ? "center" : "flex-start", border: "none", borderRadius: 5, cursor: "pointer", textAlign: "left", width: "100%", background: on ? activeBg : "transparent", color: on ? activeFg : fg, fontWeight: on ? 700 : 500, fontSize: 14.5, fontFamily: "var(--font-sans)", transition: "background 140ms" },
          onMouseEnter: (e) => { if (!on) e.currentTarget.style.background = navy ? "rgba(255,255,255,0.08)" : "var(--neutral-50)"; },
          onMouseLeave: (e) => { if (!on) e.currentTarget.style.background = "transparent"; } },
          React.createElement("span", { style: { display: "flex" } }, window.Icons[ic]({ s: 20 })),
          !collapsed && React.createElement("span", { style: { flex: 1 } }, zh),
          !collapsed && React.createElement("span", { style: { fontSize: 11, fontWeight: 600, letterSpacing: ".05em", opacity: 0.55 } }, en)
        );
      })
    ),
    // pending callout
    !collapsed && React.createElement("div", { style: { marginTop: "auto", margin: 14, padding: 16, borderRadius: 6, background: navy ? "rgba(255,255,255,0.1)" : "var(--blue-50)", color: navy ? "#fff" : "var(--text-body)" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: navy ? "#fff" : "var(--blue-700)" } }, window.Icons.sparkle({ s: 16, style: { color: "var(--orange-400)" } }), "待生成視覺化"),
      React.createElement("div", { style: { fontSize: 12, opacity: navy ? 0.85 : 1, color: navy ? "#fff" : "var(--text-muted)", margin: "6px 0 10px", lineHeight: 1.6 } }, `${markersPending} 個 @ai-visualize 標記等待處理`),
      React.createElement("button", { onClick: () => onNav("notes"),
        style: { width: "100%", height: 34, border: "none", borderRadius: 999, background: "var(--gradient-accent)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font-sans)" } }, "查看筆記")
    )
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("dashboard");
  const [openSlug, setOpenSlug] = useState(null);
  const [openSeriesId, setOpenSeriesId] = useState(null);
  const [openDataId, setOpenDataId] = useState(null);
  const [listLayout, setListLayout] = useState(t.listLayout);
  const [tagFilter, setTagFilter] = useState(null);
  const [modal, setModal] = useState(false);
  const [presentSlug, setPresentSlug] = useState(null);
  const [presentIndex, setPresentIndex] = useState(0);
  const [, forceVer] = useState(0);

  useEffect(() => window.ncSubscribe(() => forceVer((v) => v + 1)), []);

  useEffect(() => { setListLayout(t.listLayout); }, [t.listLayout]);
  useEffect(() => {
    document.documentElement.style.setProperty("--action-primary", t.accent);
    document.documentElement.style.setProperty("--orange-400", t.accent);
  }, [t.accent]);
  useEffect(() => {
    const s = t.radiusScale;
    Object.entries(RADIUS_BASE).forEach(([k, v]) =>
      document.documentElement.style.setProperty(`--radius-${k}`, `${(v * s).toFixed(1)}px`));
  }, [t.radiusScale]);

  useEffect(() => {
    document.documentElement.style.setProperty("--nc-sb", (t.sbCollapsed ? 72 : 248) + "px");
  }, [t.sbCollapsed]);

  const goData = (id) => { setOpenDataId(id); setRoute("view"); };
  window.NC_ENV = { devMode: t.devMode, pluginCount: t.pluginCount, cardFoot: t.cardFoot, embedMark: t.embedMark, vizError: t.vizError, chapterMark: t.chapterMark, onOpenView: goData };

  const pendingCount = window.NOTES.flatMap((n) => window.markersOf(n)).filter((m) => m.status !== "generated").length;

  const goNote = (slug) => { setOpenSlug(slug); setRoute("note"); };
  const goPresent = (slug, i) => { setPresentSlug(slug || openSlug); setPresentIndex(i || 0); setRoute("present"); };
  const goSeries = (id) => { setOpenSeriesId(id); setRoute("series-detail"); };
  const nav = (id, layout) => {
    if (layout) { setListLayout(layout); setTweak("listLayout", layout); return; }
    setOpenSlug(null); setTagFilter(null); setOpenSeriesId(null); setRoute(id);
  };


  const openTag = (tg) => { setTagFilter(tg); setOpenSlug(null); setRoute("notes"); };
  const navLabel = NAV_LABELS[t.navLabel] || NAV_LABELS.data;


  const note = openSlug ? window.NOTES.find((n) => n.slug === openSlug) : null;

  let view;
  if (route === "view") {
    view = React.createElement(window.DataFileView, { fileId: openDataId || "trendmile-schema", devMode: t.devMode, viewWidth: t.viewWidth, vizError: t.vizError, onBack: () => nav("data"), onOpenNote: goNote, onOpenSeries: goSeries });
  } else if (route === "data") {
    view = React.createElement(window.DataFilesList, { onOpen: goData, devMode: t.devMode, pluginCount: t.pluginCount, navLabel });
  } else if (route === "note" && note) {
    view = React.createElement(window.NoteView, { note, devMode: t.devMode, fontScale: t.fontScale, onBack: () => nav("notes"), onTag: openTag, onOpenNote: goNote, onOpenSeries: goSeries, onPresent: goPresent });
  } else if (route === "notes") {
    view = React.createElement(window.NotesList, { layout: listLayout, onOpen: goNote, onNav: nav, devMode: t.devMode, onNew: () => setModal(true), initialTag: tagFilter, onClearTag: () => setTagFilter(null), onOpenData: goData });
  } else if (route === "series") {
    view = React.createElement(window.SeriesView, { onOpenSeries: goSeries, onOpenNote: goNote });
  } else if (route === "series-detail" && openSeriesId) {
    view = React.createElement(window.SeriesDetail, { seriesId: openSeriesId, onBack: () => nav("series"), onOpenNote: goNote });
  } else if (route === "tags") {
    view = React.createElement(window.TagsView, { onOpenTag: openTag, devMode: t.devMode });
  } else if (route === "about") {
    view = React.createElement(window.AboutView, null);
  } else {
    view = React.createElement(window.Dashboard, { onOpen: goNote, onNav: nav, devMode: t.devMode, onNew: () => setModal(true) });
  }

  const deckDark = t.deckTheme === "dark";
  const setDeckDark = (v) => setTweak("deckTheme", v ? "dark" : "light");
  const backFromDeck = () => { setRoute(presentSlug ? "note" : "notes"); if (presentSlug) setOpenSlug(presentSlug); };

  let overlay = null;
  if (route === "present" && presentSlug) {
    overlay = React.createElement(window.PresentView, { slug: presentSlug, dark: deckDark, onTheme: setDeckDark, onBack: backFromDeck, onLibrary: () => setRoute("decklib") });
  } else if (route === "decklib") {
    overlay = React.createElement(window.DeckLibrary, { slug: presentSlug || "role-and-responsibility", dark: deckDark, onTheme: setDeckDark, onBack: () => setRoute(presentSlug ? "present" : "note"), onPresent: (i) => goPresent(presentSlug || "role-and-responsibility", typeof i === "number" ? i : 0) });
  }

  return React.createElement(React.Fragment, null,
    overlay || React.createElement("div", { style: { display: "flex", minHeight: "100vh", background: "var(--surface-page)" } },
      React.createElement(Sidebar, { route: route === "note" ? "notes" : (route === "series-detail" ? "series" : (route === "view" ? "data" : route)), onNav: nav, style: t.sidebarStyle, devMode: t.devMode, markersPending: pendingCount, collapsed: t.sbCollapsed, onCollapse: (v) => setTweak("sbCollapsed", v), navLabel }),
      React.createElement("div", { id: "nc-scroll", style: { flex: 1, minWidth: 0, height: "100vh", overflow: "auto" } },
        React.createElement("div", { style: route === "view" ? { padding: 0 } : { maxWidth: 1120, margin: "0 auto", padding: "34px 40px 80px" } }, view)
      )
    ),
    React.createElement(window.NewNoteModal, { open: modal, onClose: () => setModal(false), onCreated: (d) => { setModal(false); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "筆記已建立並開啟", icon: "check" } })); goNote(d.slug); } }),
    React.createElement(window.ToastHost, null),
    React.createElement(TweaksPanel, null,
      React.createElement(TweakSection, { label: "環境" }),
      React.createElement(TweakToggle, { label: "Dev 模式（顯示新增/編輯按鈕）", value: t.devMode, onChange: (v) => setTweak("devMode", v) }),
      React.createElement(TweakSection, { label: "Plugin System" }),
      React.createElement(TweakRadio, { label: "側邊欄新項命名（提案）", value: t.navLabel, options: [{ value: "data", label: "資料 Data" }, { value: "views", label: "檢視 Views" }, { value: "plugins", label: "外掛 Plugins" }], onChange: (v) => setTweak("navLabel", v) }),
      React.createElement(TweakToggle, { label: "側邊欄收合", value: t.sbCollapsed, onChange: (v) => setTweak("sbCollapsed", v) }),
      React.createElement(TweakRadio, { label: "/view 渲染區寬度", value: t.viewWidth, options: [{ value: "bleed", label: "滿版" }, { value: "page", label: "1120 置中" }], onChange: (v) => setTweak("viewWidth", v) }),
      React.createElement(TweakRadio, { label: "資料檔卡片底部（提案）", value: t.cardFoot, options: [{ value: "path", label: "路徑列" }, { value: "pill", label: "plugin 膠囊" }, { value: "blank", label: "留白" }], onChange: (v) => setTweak("cardFoot", v) }),
      React.createElement(TweakRadio, { label: "MDX 內嵌外框標示（提案）", value: t.embedMark, options: [{ value: "adapted", label: "改標示" }, { value: "same", label: "沿用 AI 標示" }, { value: "accent", label: "改標示+邊條" }], onChange: (v) => setTweak("embedMark", v) }),
      React.createElement(TweakRadio, { label: "系列章節裡的資料檔（提案）", value: t.chapterMark, options: [{ value: "pill", label: "徽章+路徑" }, { value: "icon", label: "序號改圖示" }, { value: "tint", label: "整列淡橘底" }], onChange: (v) => setTweak("chapterMark", v) }),
      React.createElement(TweakRadio, { label: "已裝 plugin 數（測篩選器）", value: t.pluginCount, options: [{ value: 3, label: "3 個" }, { value: 1, label: "1 個" }], onChange: (v) => setTweak("pluginCount", v) }),
      React.createElement(TweakToggle, { label: "渲染器出錯（錯誤狀態）", value: t.vizError, onChange: (v) => setTweak("vizError", v) }),
      React.createElement(TweakSection, { label: "簡報" }),
      React.createElement(TweakRadio, { label: "簡報主題", value: t.deckTheme, options: [{ value: "light", label: "亮色" }, { value: "dark", label: "暗色" }], onChange: (v) => setTweak("deckTheme", v) }),
      React.createElement(TweakButton, { label: "開啟 Deck 版型庫", onClick: () => { setPresentSlug("role-and-responsibility"); setRoute("decklib"); } }),
      React.createElement(TweakSection, { label: "外觀" }),
      React.createElement(TweakRadio, { label: "側邊欄", value: t.sidebarStyle, options: [{ value: "navy", label: "Navy" }, { value: "light", label: "白底" }], onChange: (v) => setTweak("sidebarStyle", v) }),
      React.createElement(TweakRadio, { label: "列表顯示", value: t.listLayout, options: [{ value: "grid", label: "卡片" }, { value: "list", label: "清單" }], onChange: (v) => { setTweak("listLayout", v); setListLayout(v); } }),
      React.createElement(TweakColor, { label: "強調色", value: t.accent, options: ["#ed9b26", "#e37b24", "#2c6ebb", "#2e9e6b"], onChange: (v) => setTweak("accent", v) }),
      React.createElement(TweakSlider, { label: "圓角", value: t.radiusScale, min: 0, max: 3, step: 0.25, unit: "×", onChange: (v) => setTweak("radiusScale", v) }),
      React.createElement(TweakSlider, { label: "筆記字級", value: t.fontScale, min: 0.9, max: 1.25, step: 0.05, unit: "×", onChange: (v) => setTweak("fontScale", v) })
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
