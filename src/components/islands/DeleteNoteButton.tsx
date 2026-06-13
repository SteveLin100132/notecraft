import { useEffect, useState } from "react";
import { Trash2, X, AlertTriangle, FileText } from "lucide-react";

type Props = { slug: string; title: string; componentIds: string[] };

export default function DeleteNoteButton({ slug, title, componentIds }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  const confirm = async () => {
    setSubmitting(true);
    // 關鍵：先導頁、不要 await。
    // 刪掉這篇筆記的 MDX 後，停在原 URL 必然 404；而 Astro dev 偵測到內容檔被刪會對
    // 「當前頁面」觸發 HMR 全頁重載，若我們先 await 刪除回應再導頁，重載會在這空檔把
    // 當前（已刪）頁面載成 404、並摧毀尚未執行的導頁程式碼。
    // 因此這裡在送出刪除請求的「同一時刻」就 replace 到 /notes（此時伺服器多半還沒刪檔、
    // 也還沒發出 HMR），徹底避開競態。刪除請求用 keepalive 確保導頁後仍會送達伺服器。
    try {
      sessionStorage.setItem("nc-toast-next", JSON.stringify({ msg: "已刪除筆記", icon: "check" }));
    } catch {
      /* sessionStorage 不可用時略過提示 */
    }
    try {
      void fetch(`/api/notes/${encodeURIComponent(slug)}`, { method: "DELETE", keepalive: true });
    } catch {
      /* 送出失敗也照常導頁；筆記仍會留在列表中，可重試 */
    }
    window.location.replace("/notes");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={triggerBtn}>
        <Trash2 size={15} /> 刪除筆記
      </button>
      {open && (
        <div onClick={() => !submitting && setOpen(false)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={modal}>
            <div style={modalHead}>
              <span style={dangerIcon}>
                <AlertTriangle size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, color: "var(--text-strong)", margin: 0 }}>刪除這篇筆記？</h2>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                  此操作不可復原（可用 git 復原）
                </div>
              </div>
              <button onClick={() => !submitting && setOpen(false)} style={closeBtn}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", display: "flex" }}>
                  <FileText size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" }}>{title}</div>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>
                    src/content/notes/{slug}.mdx
                  </code>
                </div>
              </div>
              {componentIds.length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--neutral-50)", border: "1px solid var(--neutral-100)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
                    將一併刪除以下 AI 生成元件（共用於其他筆記者會自動保留）：
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {componentIds.map((id) => (
                      <code
                        key={id}
                        style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--blue-700)", background: "var(--blue-50)", padding: "3px 8px", borderRadius: 5 }}
                      >
                        generated/{id}.tsx
                      </code>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button onClick={() => setOpen(false)} disabled={submitting} style={ghostBtn}>
                  取消
                </button>
                <button onClick={confirm} disabled={submitting} style={dangerBtn(submitting)}>
                  {submitting ? "刪除中…" : (
                    <>
                      <Trash2 size={16} /> 確認刪除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const triggerBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 999,
  border: "1.5px solid var(--danger-500)",
  background: "#fff",
  color: "var(--danger-500)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 600,
  background: "rgba(11,31,62,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  animation: "ncFade 180ms ease-out",
};
const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 500,
  background: "#fff",
  borderRadius: "var(--radius-xl)",
  boxShadow: "var(--shadow-xl)",
  overflow: "hidden",
  animation: "ncRise 240ms cubic-bezier(0.16,1,0.3,1)",
};
const modalHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "20px 24px",
  borderBottom: "1px solid var(--neutral-100)",
};
const dangerIcon: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 5,
  background: "var(--danger-50)",
  color: "var(--danger-500)",
};
const closeBtn: React.CSSProperties = {
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
function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 20px",
    borderRadius: 999,
    border: "none",
    background: "var(--danger-500)",
    color: "#fff",
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
