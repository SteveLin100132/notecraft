// NoteCraft — Note → Presentation：deck 資料 + 8 種系統化版型（16:9 固定畫布 1600×900）
// 所有顏色一律取自 trendlink design tokens；亮/暗兩套主題由 DKT 供應。

const DKT = {
  light: {
    stage: "var(--neutral-100)",      // 舞台（投影片外的底）
    chrome: "var(--neutral-0)",       // 工具列 / 面板
    rail: "var(--neutral-50)",        // 縮覽側欄
    slide: "var(--neutral-0)",        // 投影片底
    border: "var(--neutral-200)",
    borderSoft: "var(--neutral-100)",
    ink: "var(--neutral-900)",
    body: "var(--neutral-700)",
    muted: "var(--neutral-500)",
    brand: "var(--blue-700)",
    brandInk: "var(--blue-700)",
    brandSoft: "var(--blue-50)",
    accent: "var(--orange-500)",
    accentSoft: "var(--orange-50)",
    sunken: "var(--neutral-100)",
    hover: "var(--neutral-50)",
    shadow: "var(--shadow-sm)",
    shadowLg: "var(--shadow-lg)",
  },
  dark: {
    stage: "var(--neutral-900)",
    chrome: "var(--neutral-800)",
    rail: "var(--neutral-900)",
    slide: "var(--neutral-800)",
    border: "rgba(255,255,255,0.14)",
    borderSoft: "rgba(255,255,255,0.08)",
    ink: "var(--neutral-0)",
    body: "var(--neutral-200)",
    muted: "var(--neutral-400)",
    brand: "var(--blue-300)",
    brandInk: "var(--blue-200)",
    brandSoft: "rgba(44,110,187,0.20)",
    accent: "var(--orange-300)",
    accentSoft: "rgba(237,155,38,0.14)",
    sunken: "rgba(255,255,255,0.05)",
    hover: "rgba(255,255,255,0.07)",
    shadow: "0 2px 10px rgba(0,0,0,0.45)",
    shadowLg: "0 18px 44px rgba(0,0,0,0.55)",
  },
};
window.DKT = DKT;
const dkt = (dark) => (dark ? DKT.dark : DKT.light);
window.dkt = dkt;

// ── Deck 資料：以「角色與職責 R&R」筆記為取樣來源 ──────────────────
const DECKS = {
  "role-and-responsibility": {
    slug: "role-and-responsibility",
    title: "角色與職責 R&R",
    eyebrow: "PRODUCT MANAGEMENT",
    generatedAt: "2026-06-14",
    source: "src/content/notes/role-and-responsibility.mdx",
    slides: [
      {
        layout: "cover", nav: "封面",
        eyebrow: "NOTECRAFT DECK · 產品管理",
        title: "角色與職責 R&R",
        subtitle: "每件事誰拍板、誰動手、誰該被問、誰只是被通知",
        meta: ["由 role-and-responsibility.mdx 生成", "8 頁 · 16:9"],
      },
      {
        layout: "section", nav: "章節：兩種權責結構",
        num: "01", eyebrow: "STRUCTURE",
        title: "兩種權責結構",
        subtitle: "Waterfall 的指揮鏈，與 Agile 的自組織圈",
      },
      {
        layout: "bullets", nav: "R&R 的四個問題",
        eyebrow: "FOUNDATION",
        title: "R&R 要回答的四個問題",
        lead: "頭銜不等於權責。把每一件事拆到人，才是 R&R 真正在做的事。",
        items: [
          { k: "誰拍板", v: "Accountable — 最終負責人，一件事只能有一位。", tone: "orange" },
          { k: "誰動手", v: "Responsible — 實際執行的人，可以有多位。", tone: "blue" },
          { k: "誰該被問", v: "Consulted — 決策前必須徵詢的專業意見。", tone: "blue" },
          { k: "誰只是被通知", v: "Informed — 事後知會即可，不介入決策。", tone: "muted" },
        ],
      },
      {
        layout: "media", nav: "Waterfall 指揮鏈",
        eyebrow: "WATERFALL",
        title: "由上而下的指揮鏈",
        body: "PM 站在指揮鏈頂端，需求向下拆解、進度向上回報。角色邊界清楚、變更成本高，適合規格明確、驗收條件固定的專案。",
        points: ["PM 指派任務並對交付日期負責", "System Architect 定義技術規格", "Dev / QA 依規格執行與驗證"],
        mediaLabel: "組織階層圖",
        mediaHint: "notes/role-and-responsibility/waterfall-chain.png",
      },
      {
        layout: "compare", nav: "Waterfall vs Agile",
        eyebrow: "COMPARE",
        title: "同一群人，兩種權力流向",
        left: {
          tag: "WATERFALL", name: "指揮鏈", tone: "blue",
          rows: [["決策", "PM 由上而下拍板"], ["團隊", "依職能分工的執行單位"], ["變更", "走變更管制流程"], ["節奏", "階段閘門驗收"]],
        },
        right: {
          tag: "AGILE", name: "自組織圈", tone: "orange",
          rows: [["決策", "PO 排序、團隊自行認領"], ["團隊", "跨職能、自組織"], ["變更", "下一個 Sprint 重新排序"], ["節奏", "固定迭代交付"]],
        },
      },
      {
        layout: "full-visual", nav: "RACI 互動矩陣",
        eyebrow: "INTERACTIVE",
        title: "RACI Matrix — 播放時仍可點選操作",
        vizId: "rr-raci",
        vizLabel: "@ai-visualize · rr-raci",
        vizHint: "沿用筆記中已生成的互動元件，播放時可直接點選 R / A / C / I 聚焦角色。",
      },
      {
        layout: "quote", nav: "引言：A 的唯一性",
        eyebrow: "KEY TAKEAWAY",
        quote: "A（最終負責人）只能有一個，否則責任會被稀釋，出事時容易互踢皮球。",
        by: "角色與職責 R&R",
        byMeta: "NoteCraft · 產品管理系列",
      },
      {
        layout: "closing", nav: "結語 / 重點回顧",
        eyebrow: "RECAP",
        title: "帶走這三件事",
        items: [
          { n: "01", k: "先拆事，再談頭銜", v: "R&R 的單位是「任務」，不是職稱。" },
          { n: "02", k: "A 只能有一位", v: "唯一的最終負責人，是責任不被稀釋的前提。" },
          { n: "03", k: "方法論決定流向", v: "換了 Waterfall / Agile，同一群人的權責也跟著換。" },
        ],
        cta: "回到筆記閱讀完整互動內容",
        ctaMeta: "/notes/role-and-responsibility",
      },
    ],
  },
};
window.DECKS = DECKS;
window.deckOf = (slug) => DECKS[slug] || null;
window.hasDeck = (slug) => !!DECKS[slug];

// ── 版型共用零件 ──────────────────────────────────────────────
const PAD = 104;

function Eyebrow({ text, dark, onBrand }) {
  return (
    <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: ".3em", color: onBrand ? "var(--orange-300)" : dkt(dark).accent, marginBottom: 26 }}>{text}</div>
  );
}

function SlideTitle({ children, dark, size }) {
  return <h2 style={{ margin: 0, fontSize: size || 62, lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.01em", color: dkt(dark).ink }}>{children}</h2>;
}

function AccentRule({ dark, w }) {
  return <div style={{ width: w || 92, height: 6, borderRadius: 999, background: "var(--gradient-accent)", margin: "30px 0 0" }} />;
}

function SlideChrome({ slide, deck, index, total, dark }) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 46, display: "flex", alignItems: "center", gap: 14, fontSize: 19, color: c.muted }}>
      <span style={{ fontWeight: 700, color: c.brandInk }}>{deck.title}</span>
      <span style={{ opacity: 0.5 }}>／</span>
      <span>{slide.eyebrow || "NOTECRAFT"}</span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    </div>
  );
}

// ── 8 種版型 ─────────────────────────────────────────────────
function LayoutCover({ s, dark }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--gradient-header)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${PAD}px` }}>
      <div style={{ position: "absolute", right: -120, top: -140, width: 560, height: 560, borderRadius: 999, background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", right: 150, bottom: -230, width: 420, height: 420, borderRadius: 999, background: "rgba(237,155,38,0.16)" }} />
      <div style={{ position: "relative", maxWidth: 1080 }}>
        <Eyebrow text={s.eyebrow} dark={dark} onBrand />
        <h1 style={{ margin: 0, fontSize: 116, lineHeight: 1.1, fontWeight: 900, letterSpacing: "-0.02em" }}>{s.title}</h1>
        <div style={{ width: 120, height: 7, borderRadius: 999, background: "var(--gradient-accent)", margin: "38px 0 34px" }} />
        <p style={{ margin: 0, fontSize: 36, lineHeight: 1.65, color: "rgba(255,255,255,0.86)", maxWidth: 980 }}>{s.subtitle}</p>
      </div>
      <div style={{ position: "absolute", left: PAD, bottom: 62, display: "flex", gap: 30, fontSize: 19, color: "rgba(255,255,255,0.66)", fontFamily: "var(--font-mono)" }}>
        {s.meta.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

function LayoutSection({ s, dark }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: dark ? "var(--blue-950)" : "var(--blue-900)", color: "#fff", display: "flex", alignItems: "center", padding: `0 ${PAD}px`, overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)", fontSize: 460, fontWeight: 900, lineHeight: 1, color: "rgba(255,255,255,0.06)", fontFamily: "var(--font-mono)" }}>{s.num}</div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 74, height: 74, padding: "0 20px", borderRadius: "var(--radius-md)", background: "var(--gradient-accent)", color: "#fff", fontSize: 34, fontWeight: 900, fontFamily: "var(--font-mono)" }}>{s.num}</span>
          <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: ".3em", color: "var(--orange-300)" }}>{s.eyebrow}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 92, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{s.title}</h2>
        <p style={{ margin: "26px 0 0", fontSize: 32, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>{s.subtitle}</p>
      </div>
    </div>
  );
}

function LayoutBullets({ s, dark, deck, index, total }) {
  const c = dkt(dark);
  const toneOf = (t) => (t === "orange" ? c.accent : t === "muted" ? c.muted : c.brand);
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `86px ${PAD}px 0` }}>
      <Eyebrow text={s.eyebrow} dark={dark} />
      <SlideTitle dark={dark}>{s.title}</SlideTitle>
      <p style={{ margin: "22px 0 0", fontSize: 28, color: c.muted, lineHeight: 1.7, maxWidth: 1080 }}>{s.lead}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px 44px", marginTop: 52 }}>
        {s.items.map((it, i) => (
          <div key={it.k} style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: "26px 30px", borderRadius: "var(--radius-lg)", background: dark ? c.sunken : "var(--neutral-50)", borderTop: `4px solid ${toneOf(it.tone)}` }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: toneOf(it.tone), flex: "none", lineHeight: 1.5 }}>{String(i + 1).padStart(2, "0")}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: c.ink, marginBottom: 8 }}>{it.k}</div>
              <div style={{ fontSize: 25, color: c.body, lineHeight: 1.6 }}>{it.v}</div>
            </div>
          </div>
        ))}
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutMedia({ s, dark, deck, index, total }) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `86px ${PAD}px 0`, display: "grid", gridTemplateColumns: "1fr 700px", gap: 72, alignItems: "center" }}>
      <div style={{ paddingBottom: 60 }}>
        <Eyebrow text={s.eyebrow} dark={dark} />
        <SlideTitle dark={dark} size={58}>{s.title}</SlideTitle>
        <p style={{ margin: "26px 0 0", fontSize: 28, color: c.body, lineHeight: 1.8 }}>{s.body}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34 }}>
          {s.points.map((p) => (
            <div key={p} style={{ display: "flex", gap: 14, alignItems: "flex-start", fontSize: 25, color: c.body, lineHeight: 1.6 }}>
              <span style={{ flex: "none", width: 11, height: 11, borderRadius: 999, background: c.accent, marginTop: 12 }} />
              {p}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 620, borderRadius: "var(--radius-xl)", background: dark ? c.sunken : "var(--blue-50)", border: `2px dashed ${dark ? c.border : "var(--blue-200)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <span style={{ display: "inline-flex", color: c.brand }}>{window.Icons.grid({ s: 76 })}</span>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.brandInk }}>{s.mediaLabel}</div>
        <div style={{ fontSize: 20, color: c.muted, fontFamily: "var(--font-mono)" }}>{s.mediaHint}</div>
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutCompare({ s, dark, deck, index, total }) {
  const c = dkt(dark);
  const col = (side, tone) => {
    const accent = tone === "orange" ? c.accent : c.brand;
    const tint = tone === "orange" ? c.accentSoft : c.brandSoft;
    return (
      <div style={{ borderRadius: "var(--radius-lg)", border: `1px solid ${c.border}`, overflow: "hidden", background: dark ? c.sunken : "var(--neutral-0)", boxShadow: dark ? "none" : "var(--shadow-sm)" }}>
        <div style={{ padding: "26px 34px", background: tint, borderTop: `5px solid ${accent}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".26em", color: accent }}>{side.tag}</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: c.ink, marginTop: 8 }}>{side.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {side.rows.map(([k, v], i) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 22, padding: "22px 34px", borderTop: i ? `1px solid ${c.borderSoft}` : "none" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: c.muted }}>{k}</span>
              <span style={{ fontSize: 25, color: c.body, lineHeight: 1.55 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `82px ${PAD}px 0` }}>
      <Eyebrow text={s.eyebrow} dark={dark} />
      <SlideTitle dark={dark} size={58}>{s.title}</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 76px 1fr", alignItems: "center", gap: 0, marginTop: 46 }}>
        {col(s.left, s.left.tone)}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: c.muted }}>
          <div style={{ width: 1, height: 90, background: c.border }} />
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: ".1em" }}>VS</span>
          <div style={{ width: 1, height: 90, background: c.border }} />
        </div>
        {col(s.right, s.right.tone)}
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutFullVisual({ s, dark, deck, index, total, live, play, scale }) {
  const c = dkt(dark);
  const Comp = live ? window.GENERATED[s.vizId] : null;
  const mode = !live ? "thumb" : play ? "play" : "view";
  // 縮覽圖不掛載真元件：畫一張骨架紙張，保留「這頁是畫布」的辨識度
  const skeleton = (
    <div style={{ width: 700, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ height: 26, width: "42%", borderRadius: 6, background: "var(--blue-200)" }} />
      {[1, 2, 3].map((i) => <div key={i} style={{ height: 22, width: i === 3 ? "62%" : "100%", borderRadius: 6, background: "var(--neutral-200)" }} />)}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: dark ? c.slide : "var(--neutral-50)", padding: `58px ${PAD}px 0`, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: ".3em", color: c.accent, marginBottom: 12 }}>{s.eyebrow}</div>
          <SlideTitle dark={dark} size={46}>{s.title}</SlideTitle>
        </div>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 20px", borderRadius: 999, background: c.accentSoft, color: dark ? "var(--orange-300)" : "var(--orange-600)", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
          {window.Icons.sparkle({ s: 22 })}{s.vizLabel}
        </span>
      </div>
      <window.CanvasViewport
        content={Comp ? <Comp /> : skeleton}
        natural={s.vizWidth || 860}
        w={1392} h={658} mode={mode} dark={dark} outerScale={scale || 1}
        empty={live && !Comp} emptyId={s.vizId} />
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutQuote({ s, dark, deck, index, total }) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", inset: 0, background: dark ? c.slide : "var(--blue-50)", padding: `0 ${PAD + 60}px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: PAD - 8, top: 150, fontSize: 320, lineHeight: 0.8, fontWeight: 900, color: dark ? "rgba(237,155,38,0.16)" : "var(--orange-200)" }}>“</div>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: ".3em", color: c.accent, marginBottom: 34 }}>{s.eyebrow}</div>
        <blockquote style={{ margin: 0, fontSize: 62, lineHeight: 1.5, fontWeight: 800, color: dark ? c.ink : "var(--blue-900)", letterSpacing: "-0.01em" }}>{s.quote}</blockquote>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 52 }}>
          <span style={{ width: 64, height: 5, borderRadius: 999, background: "var(--gradient-accent)" }} />
          <span style={{ fontSize: 26, fontWeight: 800, color: c.brandInk }}>{s.by}</span>
          <span style={{ fontSize: 22, color: c.muted }}>{s.byMeta}</span>
        </div>
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

function LayoutClosing({ s, dark, deck, index, total }) {
  const c = dkt(dark);
  return (
    <div style={{ position: "absolute", inset: 0, background: c.slide, padding: `86px ${PAD}px 0` }}>
      <Eyebrow text={s.eyebrow} dark={dark} />
      <SlideTitle dark={dark}>{s.title}</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginTop: 56 }}>
        {s.items.map((it) => (
          <div key={it.n} style={{ padding: "34px 32px", borderRadius: "var(--radius-lg)", background: dark ? c.sunken : "var(--neutral-50)", border: `1px solid ${c.borderSoft}` }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 900, color: c.accent, marginBottom: 18 }}>{it.n}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.ink, marginBottom: 12, lineHeight: 1.35 }}>{it.k}</div>
            <div style={{ fontSize: 24, color: c.body, lineHeight: 1.7 }}>{it.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 54, padding: "28px 38px", borderRadius: "var(--radius-lg)", background: "var(--gradient-header)", color: "#fff" }}>
        <span style={{ display: "inline-flex", color: "var(--orange-300)" }}>{window.Icons.bookOpen({ s: 34 })}</span>
        <span style={{ fontSize: 30, fontWeight: 800 }}>{s.cta}</span>
        <span style={{ marginLeft: "auto", fontSize: 22, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.72)" }}>{s.ctaMeta}</span>
      </div>
      <SlideChrome slide={s} deck={deck} index={index} total={total} dark={dark} />
    </div>
  );
}

const LAYOUTS = {
  cover: LayoutCover, section: LayoutSection, bullets: LayoutBullets, media: LayoutMedia,
  compare: LayoutCompare, "full-visual": LayoutFullVisual, quote: LayoutQuote, closing: LayoutClosing,
};

const LAYOUT_SPEC = [
  ["cover", "封面", "大標題 + eyebrow overline + 副標，navy 漸層底"],
  ["section", "章節分隔", "章節序號 + 標題，深藍底、巨型 ghost 數字"],
  ["bullets", "重點條列", "2×2 條列卡，頂端 4px 色條標示語意"],
  ["media", "圖文並排", "左文右圖，圖為筆記素材占位框"],
  ["compare", "左右對比", "雙欄對照表，藍 / 橘分色，中央 VS 軸"],
  ["full-visual", "全幅視覺", "嵌入筆記既有互動元件，播放時可操作"],
  ["quote", "引言", "大字引言 + 引號襯底 + 出處"],
  ["closing", "結語回顧", "三欄重點 + 回到筆記 CTA"],
];
window.LAYOUT_SPEC = LAYOUT_SPEC;

// 單張投影片（固定 1600×900 內部座標，外層以 scale 等比縮放）
function Slide({ slide, deck, index, total, dark, live, play, scale }) {
  const L = LAYOUTS[slide.layout] || LayoutBullets;
  return <L s={slide} dark={dark} deck={deck} index={index} total={total} live={live} play={play} scale={scale} />;
}

// 等比縮放的 16:9 畫框
function SlideFrame({ slide, deck, index, total, dark, live, play, width, radius, border, shadow, style }) {
  const scale = width / 1600;
  return (
    <div style={{ width, height: Math.round((width * 9) / 16), position: "relative", overflow: "hidden", borderRadius: radius || "var(--radius-lg)", border, boxShadow: shadow, background: dkt(dark).slide, ...style }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1600, height: 900, transformOrigin: "top left", transform: `scale(${scale})` }}>
        <Slide slide={slide} deck={deck} index={index} total={total} dark={dark} live={live} play={play} scale={scale} />
      </div>
    </div>
  );
}

// ── 筆記功能列上的簡報入口（已生成 → 簡報；未生成 + dev → 生成簡報）──
// 正式環境（devMode = false）且尚未生成時，完全不顯示任何簡報入口。
function DeckToolbarActions({ slug, devMode, onPresent, dark }) {
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const [copied, setCopied] = React.useState(false);
  const has = window.hasDeck(slug);
  if (!has && !devMode) return null;
  const copyPrompt = () => {
    const text = `請把 src/content/notes/${slug}.mdx 轉成 16:9 簡報：套用 deck 版型庫（cover / section / bullets / media / full-visual / compare / quote / closing），沿用筆記中既有的 @ai-visualize 互動元件，輸出到 src/content/decks/${slug}.deck.ts`;
    try { navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
    setCopied(true);
    window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "已複製生成簡報提示詞，貼到 Claude Code 即可", icon: "sparkle" } }));
    setTimeout(() => setCopied(false), 1800);
  };
  return has
    ? <Button variant="secondary" size="sm" shape="pill" iconLeft={window.Icons.play({ s: 15 })} onClick={onPresent} style={dark ? { background: "var(--blue-500)" } : undefined}>簡報</Button>
    : <Button variant="outline" size="sm" shape="pill" iconLeft={copied ? window.Icons.check({ s: 15 }) : window.Icons.sparkle({ s: 15 })} onClick={copyPrompt} style={dark ? { borderColor: "var(--blue-300)", color: "var(--blue-200)" } : undefined}>{copied ? "已複製提示詞" : "生成簡報"}</Button>;
}

Object.assign(window, { Slide, SlideFrame, LAYOUTS, DeckToolbarActions });
