// NoteCraft — Plugin System：資料檔檢視頁 /view/<path>、資料檔清單、混排卡片、MDX 內嵌外框、渲染錯誤卡
(function () {
const h = React.createElement;
const V = window._Vtokens;
const { useState } = React;
const mono = "var(--font-mono)";

// ── 資料檔（.notecraft/plugins.json 的映射結果）──
const DATAFILES = [
  {
    id: "trendmile-schema",
    path: "planning/schema.json",
    route: "/view/planning/schema",
    title: "TrendMile 系統 Schema 全表關聯圖",
    description: "80 張表的欄位盤點與外鍵關聯，附必填性、索引與衍生欄標示。",
    plugin: "er-diagram-renderer",
    pluginLabel: "ER 關聯圖",
    updatedAt: "2026-06-09",
    source: "80-field-inventory.mdx §2（2026-08-12）",
    backTo: "database-index-btree",
    img: "assets/er-diagram.png",
  },
  {
    id: "roadmap-2026h2",
    path: "planning/roadmap.json",
    route: "/view/planning/roadmap",
    title: "2026 H2 產品路線圖",
    description: "三條產品線的季度里程碑與相依關係，含已完成、進行中、未排程三種狀態。",
    plugin: "timeline-renderer",
    pluginLabel: "時間軸",
    updatedAt: "2026-06-02",
    source: "planning/roadmap.json",
  },
  {
    id: "risk-metrics",
    path: "metrics/risk-indicators.json",
    route: "/view/metrics/risk-indicators",
    title: "勞資風險檢測指標定義",
    description: "24 項檢測指標的計算邏輯、法源依據與權重配置。",
    plugin: "metrics-table-renderer",
    pluginLabel: "指標表",
    updatedAt: "2026-05-27",
    source: "metrics/risk-indicators.json",
  },
];
const dataFileById = (id) => DATAFILES.find((d) => d.id === id);
const visibleFiles = (pluginCount) => (pluginCount === 1 ? DATAFILES.filter((d) => d.plugin === "er-diagram-renderer") : DATAFILES);

// ── 共用原子：橘底 Database 方塊（「這是資料檔」的第一個訊號）──
function DataMark({ size = 42, icon = 20 }) {
  return h("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: 5, background: "var(--orange-50)", color: "var(--orange-600)", flex: "none" } }, window.Icons.database({ s: icon }));
}
function PathChip({ path, size = 12.5 }) {
  return h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: size, color: "var(--text-body)", minWidth: 0 } },
    window.Icons.fileJson({ s: 14, style: { color: "var(--text-muted)", flex: "none" } }),
    h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, path));
}
function PluginChip({ plugin, tone = "soft" }) {
  return h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: tone === "soft" ? "var(--blue-50)" : "var(--neutral-100)", color: tone === "soft" ? "var(--blue-700)" : V.body, fontFamily: mono, fontSize: 11.5, fontWeight: 600, maxWidth: "100%" } },
    window.Icons.plug({ s: 12, style: { flex: "none" } }),
    h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, plugin));
}

// ════════════ 渲染錯誤卡 ════════════
function PluginErrorCard({ file, devMode, embedded }) {
  return h("div", { style: { border: "1px solid var(--danger-500)", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", overflow: "hidden", animation: "ncFade var(--duration-normal) var(--ease-out)" } },
    h("div", { style: { display: "flex", gap: 14, padding: embedded ? "18px 20px" : "24px 26px", alignItems: "flex-start" } },
      h("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 5, background: "var(--danger-50)", color: "var(--danger-500)", flex: "none" } }, window.Icons.alert({ s: 20 })),
      h("div", { style: { minWidth: 0, flex: 1 } },
        h("div", { style: { fontSize: 16, fontWeight: 700, color: V.ink, marginBottom: 6 } }, "這份資料沒有畫出來"),
        h("p", { style: { margin: "0 0 14px", fontSize: 13.5, color: V.body, lineHeight: 1.8 } }, "渲染器在瀏覽器裡執行時發生錯誤。你的筆記與這份資料檔都沒有壞 —— 壞的是把它畫出來的那段程式，頁面其他內容照常運作。"),
        h("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 14px", padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", fontSize: 12.5 } },
          h("span", { style: { color: V.muted } }, "出錯的 plugin"),
          h("span", { style: { fontFamily: mono, color: V.ink, fontWeight: 600 } }, file.plugin),
          h("span", { style: { color: V.muted } }, "資料檔"),
          h("span", { style: { fontFamily: mono, color: V.ink } }, file.path),
          h("span", { style: { color: V.muted } }, "錯誤訊息"),
          h("span", { style: { fontFamily: mono, color: "var(--danger-500)" } }, "TypeError: Cannot read properties of undefined (reading 'columns')")
        ),
        devMode && h("div", { style: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" } },
          h(DevButton, { icon: "code", label: "以 VS Code 開啟渲染器" }),
          h(DevButton, { icon: "rotateCcw", label: "重新載入此區塊" })
        )
      )
    )
  );
}

function DevButton({ icon, label, primary }) {
  const [hov, setHov] = useState(false);
  return h("button", {
    onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
    style: { display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, transition: "background var(--duration-fast), border-color var(--duration-fast)",
      border: primary ? "none" : `1.5px solid ${hov ? "var(--border-strong)" : V.n200}`,
      background: primary ? "var(--action-secondary)" : (hov ? V.n50 : "var(--surface-card)"),
      color: primary ? "#fff" : V.body },
  }, window.Icons[icon]({ s: 15 }), label);
}

// dev-only 工具列：與既有 dev 元素同一條規則（devMode 關閉時完全不存在）
function DevBar({ file }) {
  return h("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: "var(--radius-md)", border: `1px dashed ${V.n200}`, background: "var(--surface-sunken)", flexWrap: "wrap" } },
    h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: V.muted } }, window.Icons.bolt({ s: 13 }), "DEV ONLY"),
    h("span", { style: { width: 1, height: 18, background: V.n200 } }),
    h(DevButton, { icon: "code", label: "以 VS Code 編輯", primary: true }),
    h("span", { style: { fontFamily: mono, fontSize: 11.5, color: V.muted } }, `docs/${file.path}`)
  );
}

// ════════════ A：資料檔檢視頁 /view/<path> ════════════
// 滿版畫面：沒有 1120 版心、沒有外框卡片 —— 渲染器直接佔滿內容區，
// 這頁獨有的資訊（路徑、plugin、更新時間）壓縮成頂部一條 sticky 頁首。
function DataFileView({ fileId, devMode, viewWidth, vizError, onBack, onOpenNote, onOpenSeries }) {
  const file = dataFileById(fileId) || DATAFILES[0];
  const ref = `view:${file.id}`;
  const inSeries = window.seriesOf(ref);
  // 與筆記同一條進度機制：開啟即「閱讀中」，完成由使用者手動按
  React.useEffect(() => { window.markReading(ref); }, [ref]);
  const framed = viewWidth === "page";
  const link = { display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: "var(--blue-600)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 };

  return h("div", { style: { animation: "ncFade var(--duration-normal) var(--ease-out)" } },
    h("header", { style: { position: "sticky", top: 0, zIndex: 5, background: "var(--surface-card)", borderBottom: `1px solid ${V.n200}`, padding: "13px clamp(16px, 2.5vw, 34px) 14px", display: "flex", flexDirection: "column", gap: 9 } },
      h("div", { style: { display: "flex", alignItems: "center", gap: 16 } },
        h("button", { onClick: onBack, title: "回到資料檔清單", style: { ...link, fontSize: 13, flex: "none" } },
          window.Icons.chevronLeft({ s: 16 }), "資料檔"),
        h("span", { style: { width: 1, height: 26, background: V.n200, flex: "none" } }),
        h(DataMark, { size: 34, icon: 18 }),
        h("div", { style: { minWidth: 0, flex: 1 } },
          h("div", { style: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" } },
            h("h1", { style: { fontSize: "var(--text-md)", color: V.ink, fontWeight: 700, margin: 0, lineHeight: 1.35 } }, file.title),
            h("span", { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--orange-600)" } }, "DATA FILE")
          ),
          h("p", { style: { margin: "2px 0 0", fontSize: 13, color: V.muted, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, file.description)
        ),
        h("div", { style: { display: "flex", alignItems: "center", gap: 14, flex: "none" } },
          inSeries && h("button", { onClick: () => onOpenSeries && onOpenSeries(inSeries.series.id), style: link },
            window.Icons.layers({ s: 14 }), `${inSeries.series.title} 第 ${inSeries.index + 1} 章`),
          file.backTo && h("button", { onClick: () => onOpenNote(file.backTo), style: link }, window.Icons.bookOpen({ s: 14 }), "回到來源筆記"),
          devMode && h(DevButton, { icon: "code", label: "以 VS Code 編輯", primary: true })
        )
      ),
      h("div", { style: { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", paddingLeft: 66 } },
        h(PathChip, { path: file.path }),
        h(PluginChip, { plugin: file.plugin }),
        h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: V.muted } }, window.Icons.clock({ s: 14 }), `${window.daysAgo(file.updatedAt)} · ${file.updatedAt}`),
        devMode && h("span", { style: { fontFamily: mono, fontSize: 11.5, color: V.muted, marginLeft: "auto" } }, file.route)
      )
    ),
    // ── 渲染區：佔滿內容區，不套外框卡片 ──
    h("div", { style: { minHeight: inSeries ? 0 : "calc(100vh - 118px)", background: "var(--surface-page)", padding: "18px clamp(12px, 3vw, 40px) 48px" } },
      h("div", { style: framed ? { maxWidth: 1120, margin: "0 auto" } : null },
        vizError
          ? h("div", { style: { maxWidth: 760 } }, h(PluginErrorCard, { file, devMode }))
          : file.img
            ? h("img", { src: file.img, alt: file.title, style: { display: "block", width: "100%", borderRadius: "var(--radius-md)" } })
            : h("div", { style: { border: `1px solid ${V.n200}`, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", overflow: "hidden" } }, h(RenderPlaceholder, { file }))
      )
    ),
    // ── 系列導覽：維持一般版心，不隨渲染區撐開 ──
    inSeries && h("div", { style: { maxWidth: 1120, margin: "0 auto", padding: "0 40px 72px" } },
      h(DataDonePrompt, { entryRef: ref }),
      h(window.SeriesNav, { entryRef: ref, onOpenNote, onOpenSeries })
    )
  );
}

// 資料檔頁的「標記為已完成」—— 與筆記文末同一組控制
function DataDonePrompt({ entryRef }) {
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const status = window.readingStatus(entryRef);
  if (status === "done") {
    return h("div", { style: { marginTop: 8, display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--success-50)", color: "var(--success-500)", fontSize: 14, fontWeight: 700 } },
      window.Icons.circleCheck({ s: 18 }), "已標記為完成",
      h("button", { onClick: () => window.setReadingStatus(entryRef, "reading"), style: { marginLeft: "auto", border: "none", background: "none", color: V.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" } }, "標記為未完成")
    );
  }
  return h("div", { style: { marginTop: 8, display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--orange-50)", border: "1px solid var(--orange-100)" } },
    h("span", { style: { display: "flex", color: "var(--orange-500)" } }, window.Icons.lightbulb({ s: 20 })),
    h("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--blue-900)" } }, "看完這份資料了嗎？"),
    h(Button, { variant: "primary", size: "sm", shape: "pill", style: { marginLeft: "auto" }, iconLeft: window.Icons.check({ s: 15 }), onClick: () => { window.setReadingStatus(entryRef, "done"); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "已標記為完成", icon: "check" } })); } }, "標記為已完成")
  );
}

function RenderPlaceholder({ file }) {
  return h("div", { style: { padding: "70px 30px", textAlign: "center", color: V.muted, background: "var(--surface-sunken)" } },
    h("div", { style: { display: "inline-flex", color: "var(--neutral-300)", marginBottom: 12 } }, window.Icons.plug({ s: 34 })),
    h("p", { style: { margin: 0, fontSize: 14 } }, `${file.plugin} 的渲染結果`),
    h("p", { style: { margin: "6px 0 0", fontSize: 12.5, fontFamily: mono, color: V.muted } }, file.path)
  );
}

// ════════════ B2：資料檔清單頁 ════════════
function DataFilesList({ onOpen, devMode, pluginCount, navLabel }) {
  const { Card } = window.TrendLinkDesignSystem_b2a0d6;
  const files = visibleFiles(pluginCount);
  const plugins = [...new Set(files.map((f) => f.plugin))];
  const [active, setActive] = useState(null);
  const shown = active ? files.filter((f) => f.plugin === active) : files;
  // 提案：篩選器只在裝了 2 個以上 plugin 時出現 —— 只有一個 plugin 時它不提供任何選擇
  const showFilter = plugins.length > 1;

  return h("div", null,
    h(window.PageHead, {
      eyebrow: navLabel.en.toUpperCase(), title: `所有${navLabel.zh}檔`,
      sub: `${files.length} 個資料檔 · 由 ${plugins.length} 個 plugin 渲染 · 依檔案 mtime 倒序`,
    }),
    showFilter && h("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22, alignItems: "center" } },
      h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: V.muted, marginRight: 2 } }, window.Icons.filter({ s: 14 }), "依 plugin"),
      [null, ...plugins].map((p) => {
        const on = active === p;
        return h("button", { key: p || "all", onClick: () => setActive(p),
          style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, border: `1.5px solid ${on ? "var(--blue-500)" : V.n200}`, background: on ? "var(--blue-50)" : "var(--surface-card)", color: on ? "var(--blue-700)" : V.body, fontFamily: p ? mono : "var(--font-sans)", fontSize: p ? 12 : 13, fontWeight: 600, cursor: "pointer", transition: "all var(--duration-fast)" } },
          p || "全部", h("span", { style: { fontSize: 11, opacity: 0.7, fontFamily: "var(--font-sans)" } }, p ? files.filter((f) => f.plugin === p).length : files.length));
      })
    ),
    h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
      shown.map((f) => h(Card, { key: f.id, hoverable: true, style: { padding: "16px 20px", cursor: "pointer" }, onClick: () => onOpen(f.id) },
        h("div", { style: { display: "flex", alignItems: "center", gap: 18 } },
          h(DataMark, null),
          h("div", { style: { minWidth: 0, flex: 1 } },
            h("h3", { style: { fontSize: 16.5, color: V.ink, margin: "0 0 4px", fontWeight: 700 } }, f.title),
            h("p", { style: { fontSize: 13.5, color: V.muted, margin: 0, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.description)
          ),
          h("div", { style: { display: "flex", alignItems: "center", gap: 16, flex: "none" } },
            h(PathChip, { path: f.path }),
            h(PluginChip, { plugin: f.plugin }),
            h("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: V.muted } }, window.Icons.clock({ s: 14 }), window.daysAgo(f.updatedAt)),
            h("span", { style: { color: "var(--neutral-300)", display: "flex" } }, window.Icons.chevronRight({ s: 18 }))
          )
        )
      ))
    ),
    devMode && h("p", { style: { marginTop: 20, fontSize: 12.5, color: V.muted, fontFamily: mono } }, ".notecraft/plugins.json · " + files.length + " mappings")
  );
}

// ════════════ B3：/notes 列表裡的資料檔卡片 ════════════
function DataFileCard({ file, layout, onOpen, cardFoot }) {
  const { Card } = window.TrendLinkDesignSystem_b2a0d6;
  const time = h("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: V.muted } }, window.Icons.clock({ s: 14 }), window.daysAgo(file.updatedAt));
  const kindBadge = h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange-600)", fontSize: 11.5, fontWeight: 700 } },
    window.Icons.database({ s: 12 }), "資料檔");

  const foot = cardFoot === "blank" ? null
    : cardFoot === "pill"
      ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, h(PluginChip, { plugin: file.plugin }))
      : h("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", minWidth: 0 } },
          h(PathChip, { path: file.path, size: 12 }),
          h("span", { style: { fontFamily: mono, fontSize: 11.5, color: V.muted, marginLeft: "auto", whiteSpace: "nowrap" } }, file.plugin));

  if (layout === "list") {
    return h(Card, { hoverable: true, style: { padding: "16px 20px", cursor: "pointer" }, onClick: () => onOpen(file.id) },
      h("div", { style: { display: "flex", alignItems: "center", gap: 18 } },
        h(DataMark, null),
        h("div", { style: { minWidth: 0, flex: 1 } },
          h("h3", { style: { fontSize: 16.5, color: V.ink, margin: "0 0 4px", fontWeight: 700 } }, file.title),
          h("p", { style: { fontSize: 13.5, color: V.muted, margin: 0, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, file.description)
        ),
        h("div", { style: { display: "flex", alignItems: "center", gap: 16, flex: "none" } },
          cardFoot === "blank" ? null : (cardFoot === "pill" ? h(PluginChip, { plugin: file.plugin }) : h(PathChip, { path: file.path })),
          kindBadge, time,
          h("span", { style: { color: "var(--neutral-300)", display: "flex" } }, window.Icons.chevronRight({ s: 18 }))
        )
      )
    );
  }
  return h(Card, { hoverable: true, style: { padding: 22, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, height: "100%" }, onClick: () => onOpen(file.id) },
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } }, h(DataMark, null),
      h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" } }, kindBadge, time)),
    h("div", null,
      h("h3", { style: { fontSize: 18, color: V.ink, margin: "0 0 7px", fontWeight: 700, lineHeight: 1.35 } }, file.title),
      h("p", { style: { fontSize: 13.5, color: V.muted, margin: 0, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, file.description)
    ),
    h("div", { style: { marginTop: "auto" } }, foot)
  );
}

// ════════════ B4：MDX 內嵌（沿用 GeneratedFrame 外框）════════════
function DataEmbedFrame({ fileId, devMode, embedMark, vizError, onOpenView }) {
  const file = dataFileById(fileId) || DATAFILES[0];
  const [zoom, setZoom] = useState(false);
  const aiStyle = embedMark === "same";
  const accent = embedMark === "accent";
  const pill = aiStyle
    ? { bg: "var(--blue-50)", fg: "var(--blue-700)", icon: "sparkle", label: "視覺化", suffix: "· DIAGRAM" }
    : { bg: "var(--orange-50)", fg: "var(--orange-600)", icon: "database", label: "資料檔", suffix: `· ${file.pluginLabel}` };
  const code = aiStyle ? `generated/${file.id}.tsx` : file.path;
  const body = vizError
    ? h(PluginErrorCard, { file, devMode, embedded: true })
    : file.img
      ? h("img", { src: file.img, alt: file.title, style: { display: "block", width: "100%", borderRadius: "var(--radius-md)", border: `1px solid ${V.n200}` } })
      : h(RenderPlaceholder, { file });

  return h("figure", { style: { margin: "22px 0", padding: 0, border: `1px solid ${V.n200}`, borderLeft: accent ? "3px solid var(--orange-400)" : `1px solid ${V.n200}`, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", overflow: "hidden", boxShadow: "var(--shadow-xs)" } },
    h("figcaption", { style: { display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderBottom: `1px solid ${V.n100}`, background: V.n50, flexWrap: "wrap" } },
      h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: pill.bg, color: pill.fg, fontSize: 11.5, fontWeight: 700 } },
        window.Icons[pill.icon]({ s: 13 }), pill.label,
        h("span", { style: { letterSpacing: ".05em", opacity: 0.75 } }, pill.suffix)),
      h("span", { style: { marginLeft: "auto", fontFamily: mono, fontSize: 11.5, color: V.muted } }, code),
      !aiStyle && h("button", { onClick: () => onOpenView(file.id), style: { display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: "var(--blue-600)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 } },
        window.Icons.external({ s: 13 }), "開啟完整檢視頁"),
      devMode && h("button", { onClick: () => {}, style: { display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${V.n200}`, borderRadius: 999, background: "#fff", color: V.body, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", padding: "3px 10px" } },
        window.Icons[aiStyle ? "copy" : "code"]({ s: 13 }), aiStyle ? "複製提示詞" : "以 VS Code 編輯"),
      h(window.VizZoomButton, { onClick: () => setZoom(true) })
    ),
    h("div", { style: { padding: "18px 20px" } }, body),
    h(window.VizZoomOverlay, { open: zoom, onClose: () => setZoom(false), id: file.id, kind: aiStyle ? "視覺化 · Diagram" : `資料檔 · ${file.pluginLabel}`, codeLabel: code, icon: aiStyle ? "sparkle" : "database" }, body)
  );
}

Object.assign(window, { DATAFILES, dataFileById, visibleFiles, DataFileView, DataFilesList, DataFileCard, DataEmbedFrame, PluginErrorCard, DataMark, PathChip, PluginChip, DataDonePrompt });
})();
