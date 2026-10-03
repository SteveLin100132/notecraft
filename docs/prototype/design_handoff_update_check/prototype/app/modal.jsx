// NoteCraft — New Note modal + Toast
(function () {
const { useState, useEffect } = React;
const V = window._Vtokens;

function slugify(s) {
  return s.trim().toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50) || "untitled-note";
}

function NewNoteModal({ open, onClose, onCreated }) {
  const { Input, Button } = window.TrendLinkDesignSystem_b2a0d6;
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [folder, setFolder] = useState("src/content/notes/");
  const [status, setStatus] = useState("empty");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setTitle(""); setTags(""); setFolder("src/content/notes/"); setStatus("empty"); setError(""); setDone(null); setSubmitting(false); }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const slug = slugify(title);
  const exists = window.NOTES.some((n) => n.slug === slug);

  const submit = () => {
    setError("");
    if (!title.trim()) { setError("標題不可為空。"); return; }
    if (exists) { setError("此標題已存在筆記，請更換。"); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const created = window.createNote({ title, tags, folder, status });
      setDone({ slug: created.slug, path: `${folder}${created.slug}.mdx`, status });
    }, 650);
  };

  const folders = ["src/content/notes/", "src/content/notes/frontend/", "src/content/notes/backend/", "src/content/notes/security/"];

  return React.createElement("div", {
    onClick: onClose,
    style: { position: "fixed", inset: 0, zIndex: 600, background: "rgba(11,31,62,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "ncFade 180ms ease-out" },
  },
    React.createElement("div", {
      onClick: (e) => e.stopPropagation(),
      style: { width: "100%", maxWidth: 520, background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-xl)", overflow: "hidden", animation: "ncRise 240ms cubic-bezier(0.16,1,0.3,1)" },
    },
      // header
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: `1px solid ${V.n100}` } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 5, background: V.orange50, color: V.orange } }, window.Icons.plus({ s: 20 })),
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("h2", { style: { fontSize: 19, color: V.ink, margin: 0 } }, done ? "筆記已建立" : "新增筆記"),
          React.createElement("div", { style: { fontSize: 12.5, color: V.muted, marginTop: 2 } }, done ? "dev API 已寫入 MDX 範本檔" : "POST /api/notes · 僅 dev 環境可用")
        ),
        React.createElement("button", { onClick: onClose, style: { border: "none", background: V.n100, borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: V.muted } }, window.Icons.x({ s: 18 }))
      ),
      done
        ? React.createElement("div", { style: { padding: 24 } },
            React.createElement("div", { style: { display: "flex", gap: 12, padding: "14px 16px", borderRadius: 5, background: "var(--success-50)", marginBottom: 18 } },
              React.createElement("span", { style: { color: "var(--success-500)", display: "flex", marginTop: 1 } }, window.Icons.check({ s: 20 })),
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#1d6b48" } }, "建立成功"),
                React.createElement("code", { style: { fontFamily: "var(--font-mono)", fontSize: 12.5, color: V.body, wordBreak: "break-all" } }, done.path))
            ),
            React.createElement("p", { style: { fontSize: 13, color: V.muted, lineHeight: 1.7, margin: "0 0 18px" } },
              React.createElement("span", null, "已寫入 "),
              React.createElement("code", { style: { fontFamily: "var(--font-mono)", fontSize: 12.5, color: V.orange, fontWeight: 700 } }, `status: ${done.status}`),
              React.createElement("span", null, done.status === "coming-soon" ? " 等預設 frontmatter。前往筆記即可看到「即將登場」佔位畫面。" : " 等預設 frontmatter。前往筆記即可看到空白筆記的初始引導畫面。")),
            React.createElement("div", { style: { display: "flex", gap: 10 } },
              React.createElement(Button, { variant: "secondary", size: "md", iconLeft: window.Icons.edit({ s: 16 }), onClick: () => { onClose(); window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: `已喚起 VS Code 開啟 ${done.slug}.mdx`, icon: "code" } })); } }, "以 VS Code 編輯"),
              React.createElement(Button, { variant: "primary", size: "md", iconRight: window.Icons.arrowRight({ s: 16 }), onClick: () => onCreated(done) }, "前往筆記")
            )
          )
        : React.createElement("div", { style: { padding: 24, display: "flex", flexDirection: "column", gap: 16 } },
            React.createElement(Input, { label: "標題", placeholder: "例：WebSocket 連線生命週期", value: title, onChange: (e) => { setTitle(e.target.value); setError(""); }, error: error || undefined, autoFocus: true }),
            title.trim() && React.createElement("div", { style: { marginTop: -8, fontSize: 12, color: V.muted, fontFamily: "var(--font-mono)" } }, `slug: ${slug}`),
            React.createElement(Input, { label: "標籤（以逗號分隔，可空）", placeholder: "前端, WebSocket, 即時通訊", value: tags, onChange: (e) => setTags(e.target.value) }),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
              React.createElement("label", { style: { fontSize: 13.5, fontWeight: 500, color: V.body } }, "初始狀態 status"),
              React.createElement("div", { style: { display: "flex", gap: 8 } },
                [["empty", "草稿", "empty", "edit"], ["coming-soon", "即將登場", "coming-soon", "sparkle"]].map(([val, label, mono, ic]) => {
                  const on = status === val;
                  return React.createElement("button", { key: val, onClick: () => setStatus(val),
                    style: { flex: 1, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", padding: "11px 14px", borderRadius: 5, cursor: "pointer", textAlign: "left", background: on ? V.orange50 : "#fff", border: `1.5px solid ${on ? V.orange : V.n200}`, transition: "all 140ms", fontFamily: "var(--font-sans)" } },
                    React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700, color: on ? V.orange : V.ink } }, window.Icons[ic]({ s: 15 }), label),
                    React.createElement("code", { style: { fontFamily: "var(--font-mono)", fontSize: 11.5, color: V.muted } }, mono));
                })
              ),
              React.createElement("div", { style: { fontSize: 12, color: V.muted, lineHeight: 1.6 } }, status === "coming-soon" ? "筆記內文會顯示「即將登場」佔位畫面。" : "建立後顯示空白筆記的初始引導畫面。")
            ),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
              React.createElement("label", { style: { fontSize: 13.5, fontWeight: 500, color: V.body } }, "分類 / 資料夾"),
              React.createElement("div", { style: { position: "relative", display: "flex" } },
                React.createElement("select", { value: folder, onChange: (e) => setFolder(e.target.value),
                  style: { appearance: "none", width: "100%", height: 46, padding: "0 40px 0 16px", background: "#fff", border: `1.5px solid ${V.n200}`, borderRadius: 5, fontFamily: "var(--font-mono)", fontSize: 13.5, color: V.ink, cursor: "pointer", outline: "none" } },
                  folders.map((f) => React.createElement("option", { key: f, value: f }, f))),
                React.createElement("span", { style: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: V.muted, display: "flex" } }, window.Icons.chevronRight({ s: 16, style: { transform: "rotate(90deg)" } })))
            ),
            tags.trim() && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: -4 } },
              tags.split(",").map((t) => t.trim()).filter(Boolean).map((t, i) => React.createElement("span", { key: i, style: { fontSize: 12, fontWeight: 600, color: V.blue, background: V.blue50, padding: "3px 9px", borderRadius: 999 } }, t))),
            React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 } },
              React.createElement(Button, { variant: "ghost", size: "md", onClick: onClose }, "取消"),
              React.createElement(Button, { variant: "primary", size: "md", disabled: submitting, iconLeft: submitting ? null : window.Icons.plus({ s: 17 }), onClick: submit }, submitting ? "建立中…" : "建立筆記")
            )
          )
    )
  );
}

function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...e.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener("nc-toast", on);
    return () => window.removeEventListener("nc-toast", on);
  }, []);
  return React.createElement("div", { style: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 700, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" } },
    toasts.map((t) => React.createElement("div", { key: t.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 999, background: "var(--neutral-900)", color: "#fff", fontSize: 14, fontWeight: 600, boxShadow: "var(--shadow-lg)", animation: "ncRise 220ms cubic-bezier(0.16,1,0.3,1)" } },
      React.createElement("span", { style: { display: "flex", color: "var(--orange-400)" } }, (window.Icons[t.icon] || window.Icons.check)({ s: 18 })),
      t.msg))
  );
}

Object.assign(window, { NewNoteModal, ToastHost });
})();
