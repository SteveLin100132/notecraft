// 接進既有圖框包裝的位置 —— 這是 app/generated.jsx 裡 `Figure` 的實際 diff（+ 為新增）
// 生成元件本身完全不用改：所有元件都是 <Figure id kind caption>{內容}</Figure>，
// 放大入口與覆蓋層都掛在這個共用包裝上，一改全部生效。

function Figure({ id, kind, children, caption }) {
+ const [zoom, setZoom] = React.useState(false);          // ← 每個圖框自己管自己的覆蓋層
  return React.createElement("figure", {
    style: {
      margin: "26px 0", padding: 0, border: `1px solid ${C.n200}`,
      borderRadius: "var(--radius-lg)", background: "#fff", overflow: "hidden",
      boxShadow: "0 2px 6px rgba(17,47,93,0.08)",
    },
  },
    // ── 標題列：sparkle + 元件類型 + 檔名 + 【放大檢視】 ──
    React.createElement("figcaption", {
      style: {
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: `1px solid ${C.n100}`, background: "#fbfcfe",
        fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: C.muted,
        textTransform: "uppercase",   // ⚠ 按鈕文字必須自行覆蓋這兩項
      },
    },
      window.Icons.sparkle({ s: 14, style: { color: C.orange500 } }),
      React.createElement("span", { style: { color: C.blue } }, kind),
      React.createElement("span", {
        style: { marginLeft: "auto", fontWeight: 600, letterSpacing: 0, textTransform: "none", fontSize: 11, color: C.n300 },
      }, `generated/${id}.tsx`),
+     React.createElement(window.VizZoomButton, { onClick: () => setZoom(true) })
    ),

    // ── 元件本體（內文中的那一份，維持原樣）──
    React.createElement("div", { style: { padding: "22px 24px" } }, children),

    // ── 說明文字（內文中的那一份，維持原樣）──
    caption && React.createElement("div", {
      style: { padding: "0 24px 18px", fontSize: 13, color: C.muted, lineHeight: 1.7 },
    }, caption),

+   // ── 放大檢視覆蓋層：同一份 children 在 portal 中另起一個 instance ──
+   // （state 從初始值開始，不與內文那份共用，這是預期行為）
+   React.createElement(window.VizZoomOverlay, {
+     open: zoom, onClose: () => setZoom(false), id, kind, caption,
+   }, children)
  );
}
