import { useEffect, useState } from "react";
import { Plus, X, ArrowRight, Edit3, Check, ChevronDown } from "lucide-react";

const FOLDERS = [
  "src/content/notes/",
  "src/content/notes/frontend/",
  "src/content/notes/backend/",
  "src/content/notes/security/",
];

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\w一-鿿\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) || "untitled-note"
  );
}

type Props = { triggerId?: string };

export default function NewNoteModal({ triggerId = "nc-new-note" }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [folder, setFolder] = useState(FOLDERS[0]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ slug: string; path: string; vscode: string } | null>(null);

  useEffect(() => {
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;
    const onClick = () => {
      setOpen(true);
      setTitle("");
      setTags("");
      setFolder(FOLDERS[0]);
      setError("");
      setDone(null);
      setSubmitting(false);
    };
    trigger.addEventListener("click", onClick);
    return () => trigger.removeEventListener("click", onClick);
  }, [triggerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const slug = slugify(title);

  const submit = async () => {
    setError("");
    if (!title.trim()) {
      setError("標題不可為空。");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          folder,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "建立失敗。");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setDone({ slug: data.slug, path: data.path, vscode: data.vscode });
    } catch (e) {
      setError("建立失敗：dev API 不可用。");
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(11,31,62,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "ncFade 180ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "ncRise 240ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 24px",
            borderBottom: "1px solid var(--neutral-100)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 5,
              background: "var(--orange-50)",
              color: "var(--orange-500)",
            }}
          >
            <Plus size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 19, color: "var(--text-strong)", margin: 0 }}>
              {done ? "筆記已建立" : "新增筆記"}
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
              {done ? "dev API 已寫入 MDX 範本檔" : "POST /api/notes · 僅 dev 環境可用"}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              border: "none",
              background: "var(--neutral-100)",
              borderRadius: 999,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 5,
                background: "var(--success-50)",
                marginBottom: 18,
              }}
            >
              <span style={{ color: "var(--success-500)", display: "flex", marginTop: 1 }}>
                <Check size={20} />
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1d6b48" }}>建立成功</div>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-body)", wordBreak: "break-all" }}>
                  {done.path}
                </code>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 18px" }}>
              已寫入預設 frontmatter 與一段 @ai-visualize 標記區塊範本。接著可在 VS Code 撰寫內容，再到 Claude Code 請 AI 生成視覺化。
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <a href={done.vscode} className="nc-btn-link">
                <Edit3 size={16} /> 以 VS Code 編輯
              </a>
              <a href={`/notes/${done.slug}`} className="nc-btn-link nc-btn-primary">
                前往筆記 <ArrowRight size={16} />
              </a>
            </div>
            <style>{`
              .nc-btn-link {
                display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 20px;border-radius:999px;
                background:#fff;border:1.5px solid var(--blue-500);color:var(--blue-700);
                font-weight:700;font-size:14px;text-decoration:none;cursor:pointer;
              }
              .nc-btn-primary {
                background:var(--gradient-accent);border:none;color:#fff;
              }
            `}</style>
          </div>
        ) : (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="標題" error={error}>
              <input
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError("");
                }}
                placeholder="例：WebSocket 連線生命週期"
                style={inputStyle}
              />
            </Field>
            {title.trim() && (
              <div style={{ marginTop: -8, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                slug: {slug}
              </div>
            )}
            <Field label="標籤（以逗號分隔，可空）">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="前端, WebSocket, 即時通訊"
                style={inputStyle}
              />
            </Field>
            <Field label="分類 / 資料夾">
              <div style={{ position: "relative" }}>
                <select value={folder} onChange={(e) => setFolder(e.target.value)} style={selectStyle}>
                  {FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "var(--text-muted)",
                    display: "flex",
                  }}
                >
                  <ChevronDown size={16} />
                </span>
              </div>
            </Field>
            {tags.trim() && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: -4 }}>
                {tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--blue-700)",
                        background: "var(--blue-50)",
                        padding: "3px 9px",
                        borderRadius: 999,
                      }}
                    >
                      {t}
                    </span>
                  ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button onClick={() => setOpen(false)} style={ghostBtn}>
                取消
              </button>
              <button onClick={submit} disabled={submitting} style={primaryBtn(submitting)}>
                {submitting ? "建立中…" : (
                  <>
                    <Plus size={17} /> 建立筆記
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-body)" }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 12, color: "var(--danger-500)", marginTop: 2 }}>{error}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  padding: "0 16px",
  background: "#fff",
  border: "1.5px solid var(--neutral-200)",
  borderRadius: 5,
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--text-strong)",
  outline: "none",
};
const selectStyle: React.CSSProperties = {
  appearance: "none",
  width: "100%",
  height: 46,
  padding: "0 40px 0 16px",
  background: "#fff",
  border: "1.5px solid var(--neutral-200)",
  borderRadius: 5,
  fontFamily: "var(--font-mono)",
  fontSize: 13.5,
  color: "var(--text-strong)",
  cursor: "pointer",
  outline: "none",
};
const ghostBtn: React.CSSProperties = {
  height: 42,
  padding: "0 20px",
  borderRadius: 999,
  border: "1.5px solid var(--neutral-200)",
  background: "#fff",
  color: "var(--text-body)",
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 20px",
    borderRadius: 999,
    border: "none",
    background: "var(--gradient-accent)",
    color: "#fff",
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
