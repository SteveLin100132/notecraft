// NoteCraft — Deck 版型庫（系統化版型展示 + 功能列狀態規格）
function DeckLibrary({ slug, dark, onTheme, onBack, onPresent }) {
  const deck = window.deckOf(slug);
  const c = window.dkt(dark);
  const specs = window.LAYOUT_SPEC;
  const byLayout = {};
  deck.slides.forEach((s, i) => { byLayout[s.layout] = { s, i }; });

  const Panel = ({ children, title, desc, mono }) => (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: c.ink }}>{title}</h2>
        {mono && <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: c.muted }}>{mono}</code>}
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13.5, color: c.muted, lineHeight: 1.75, maxWidth: 720 }}>{desc}</p>
      {children}
    </section>
  );

  const ToolbarSpec = ({ label, note, devMode, deckSlug, tone }) => (
    <div style={{ borderRadius: "var(--radius-lg)", border: `1px solid ${c.border}`, background: c.chrome, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderBottom: `1px solid ${c.borderSoft}`, background: c.sunken }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: tone }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: c.ink }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: c.muted, fontFamily: "var(--font-mono)" }}>{devMode ? "dev" : "production"}</span>
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        {/* 迷你功能列：與筆記檢視頁的 meta 列同構 */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: `1px solid ${c.borderSoft}`, fontSize: 12.5, color: c.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{window.Icons.clock({ s: 14 })}更新於 2026/06/13</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{window.Icons.sparkle({ s: 14, style: { color: "var(--orange-400)" } })}3/3 視覺化已生成</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}>
            <window.DeckToolbarActions slug={deckSlug} devMode={devMode} onPresent={onPresent} dark={dark} />
            {!deckSlug && !devMode && <span style={{ fontSize: 12, color: c.muted, fontStyle: "italic" }}>（無簡報入口）</span>}
          </span>
        </div>
        <div style={{ marginTop: 12, fontSize: 12.5, color: c.body, lineHeight: 1.7 }}>{note}</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: c.stage, fontFamily: "var(--font-sans)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 5, height: 64, display: "flex", alignItems: "center", gap: 14, padding: "0 26px", background: c.chrome, borderBottom: `1px solid ${c.border}` }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 999, border: `1px solid ${c.border}`, background: "transparent", color: c.body, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700 }}>
          {window.Icons.chevronLeft({ s: 16 })}返回
        </button>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".2em", color: c.accent }}>DECK LAYOUT LIBRARY</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.ink }}>簡報版型庫</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <window.ThemeToggle dark={dark} onChange={onTheme} />
          <button onClick={onPresent} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 18px", border: "none", borderRadius: 999, background: "var(--gradient-accent)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 800 }}>
            {window.Icons.play({ s: 16 })}開啟簡報模式
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 26px 90px" }}>
        <div style={{ marginBottom: 40, maxWidth: 780 }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 900, letterSpacing: "-0.01em", color: c.ink }}>一套設計語言，八種版型</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.85, color: c.body }}>
            所有版型共用同一組節奏：104px 版面留白、eyebrow overline、金色強調規則線、右下角頁碼。內容取樣自「角色與職責 R&amp;R」筆記，畫布固定 16:9（1600×900），等比縮放。
          </p>
        </div>

        <Panel title="筆記功能列 — 兩種狀態" mono="/notes/&lt;slug&gt;"
          desc="「簡報」為讀者可見入口，僅在該篇已生成簡報時出現；「生成簡報」僅 dev 環境顯示，點擊複製提示詞到剪貼簿並跳出成功 toast。正式環境若尚未生成，功能列不出現任何簡報相關按鈕。">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <ToolbarSpec label="① 已生成簡報" tone="var(--success-500)" devMode={false} deckSlug="role-and-responsibility"
              note="讀者與 dev 皆可見「簡報」按鈕（navy pill），點擊前往 /present/<slug>。" />
            <ToolbarSpec label="② 未生成 · dev" tone="var(--orange-400)" devMode={true} deckSlug="oauth-2-pkce"
              note="dev 環境顯示「生成簡報」（outline pill），沿用既有複製提示詞的互動與成功 toast。" />
            <ToolbarSpec label="③ 未生成 · 正式環境" tone={c.muted} devMode={false} deckSlug=""
              note="完全隱藏，讀者不會看到任何未完成的入口。" />
          </div>
        </Panel>

        <Panel title="Deck 版型庫" mono="8 layouts"
          desc="每一種版型都以真實內容填入，示範它在系統中的角色。點任一張進入該頁的檢視模式。">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))", gap: 26 }}>
            {specs.map(([key, name, desc], n) => {
              const entry = byLayout[key];
              if (!entry) return null;
              return (
                <div key={key} style={{ borderRadius: "var(--radius-lg)", border: `1px solid ${c.border}`, background: c.chrome, overflow: "hidden", boxShadow: dark ? "none" : "var(--shadow-sm)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderBottom: `1px solid ${c.borderSoft}` }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 900, color: c.accent }}>{String(n + 1).padStart(2, "0")}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: c.ink }}>{name}</span>
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, padding: "3px 9px", borderRadius: 999, background: c.brandSoft, color: c.brandInk }}>{key}</code>
                  </div>
                  <div style={{ padding: 18, background: dark ? "rgba(255,255,255,0.03)" : "var(--neutral-50)" }}>
                    <button onClick={() => onPresent(entry.i)} style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer" }}>
                      <window.SlideFrame slide={entry.s} deck={deck} index={entry.i} total={deck.slides.length} dark={dark} width={424}
                        radius="var(--radius-md)" border={`1px solid ${c.border}`} shadow={c.shadow} style={{ margin: "0 auto" }} />
                    </button>
                  </div>
                  <div style={{ padding: "13px 18px 16px", fontSize: 13, color: c.body, lineHeight: 1.7, borderTop: `1px solid ${c.borderSoft}` }}>{desc}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
window.DeckLibrary = DeckLibrary;
