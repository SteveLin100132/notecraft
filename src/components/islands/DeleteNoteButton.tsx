import { useEffect, useState, type ReactNode } from "react";
import { Trash2, X, AlertTriangle, FileText } from "lucide-react";
import { pushEscape } from "@/lib/wb-escape";
import { getTabStore } from "@/lib/wb-tabs-store";
import { close as closeTabs } from "@/lib/wb-tabs";
import { withBase } from "@/lib/base";

type Props = {
  slug: string;
  title: string;
  /** 顯示用路徑（相對 notesDir） */
  path?: string;
  /** 工作區名稱：刪除時一併關掉這篇的頁籤（規格 docs/notecraft-workbench-note-tabs.md §8.2） */
  workspace?: string;
};

/** GET /api/notes/<slug>/delete-plan 的回應：與 DELETE 共用同一份判斷（src/dev-api/handlers.mjs planNoteDeletion） */
type DeletePlan = {
  /** 元件資料夾的顯示用相對路徑：主專案 src/components/generated、viewer 模式 .notecraft/components */
  componentsDir: string;
  toDelete: string[];
  keptShared: string[];
  /** 引用本篇定義的筆記（define-ref §13）：刪除後它們的 include／ref 會讓 build 失敗。只提醒、不擋 */
  referencedBy?: { slug: string; title: string; ids: string[] }[];
};

/**
 * 刪除筆記的對話框與邏輯，拆成 hook 讓「⋯」選單（MoreMenu）與獨立按鈕都能用。
 * 回傳 open() 與要掛在畫面上的 dialog 節點。
 */
export function useDeleteNote({ slug, title, path, workspace }: Props): { open: () => void; dialog: ReactNode } {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 對話框就是刪除元件的同意點：清單向 API 要，不在頁面端自己猜，拿到之前不能確認
  const [plan, setPlan] = useState<DeletePlan | null>(null);
  const [planError, setPlanError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPlan(null);
    setPlanError(false);
    fetch(`/api/notes/${slug.split("/").map(encodeURIComponent).join("/")}/delete-plan`)
      .then((r) => (r.ok ? (r.json() as Promise<DeletePlan>) : Promise.reject(new Error(String(r.status)))))
      .then((p) => alive && setPlan(p))
      .catch(() => alive && setPlanError(true));
    return () => {
      alive = false;
    };
  }, [open, slug]);

  // Escape 走共用堆疊（與 Drawer、Palette 同一套關閉順序）
  useEffect(() => {
    if (!open) return;
    return pushEscape(() => {
      if (!submitting) setOpen(false);
    });
  }, [open, submitting]);

  const confirm = async () => {
    if (!plan) return;
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
      // 帶上作者在對話框看到的清單：API 只刪這些（對話框開著時別篇筆記改了也不會多刪）
      void fetch(`/api/notes/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ components: plan.toDelete }),
      });
    } catch {
      /* 送出失敗也照常導頁；筆記仍會留在列表中，可重試 */
    }
    // 同步關掉這篇的頁籤（不走「導覽到鄰居」：刪除後回列表是既有行為），
    // 下一頁的 idle 校正才不會再跳一次「筆記已不存在」
    if (workspace !== undefined) {
      try {
        getTabStore(workspace).update((s) => closeTabs(s, [`note:${slug}`]));
      } catch {
        /* localStorage 不可用時略過 */
      }
    }
    window.location.replace(withBase("/notes"));
  };

  const dialog = open ? (
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
                    {path ?? `${slug}.mdx`}
                  </code>
                </div>
              </div>
              {planError ? (
                <div style={{ ...planBox, color: "var(--danger-500)" }}>
                  無法確認會一併刪除哪些 AI 生成元件，請關閉後重試。
                </div>
              ) : !plan ? (
                <div style={{ ...planBox, color: "var(--text-muted)" }}>正在確認會一併刪除的 AI 生成元件…</div>
              ) : (
                (plan.toDelete.length > 0 || plan.keptShared.length > 0 || (plan.referencedBy?.length ?? 0) > 0) && (
                  <div style={{ ...planBox, display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.toDelete.length > 0 && (
                      <FileList label="將一併刪除以下 AI 生成元件：" dir={plan.componentsDir} files={plan.toDelete} />
                    )}
                    {plan.keptShared.length > 0 && (
                      <FileList label="其他筆記也引用、會保留：" dir={plan.componentsDir} files={plan.keptShared} muted />
                    )}
                    {(plan.referencedBy?.length ?? 0) > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--orange-600)", marginBottom: 6 }}>
                          {plan.referencedBy!.length} 篇筆記引用了這篇的定義，刪除後 build 會失敗，請修改這些引用：
                        </div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                          {plan.referencedBy!.map((r) => (
                            <li key={r.slug} style={{ fontSize: 13, color: "var(--text-strong)" }}>
                              {r.title}{" "}
                              <code style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>{r.ids.join("、")}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button onClick={() => setOpen(false)} disabled={submitting} style={ghostBtn}>
                  取消
                </button>
                <button onClick={confirm} disabled={submitting || !plan} style={dangerBtn(submitting || !plan)}>
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
  ) : null;

  return { open: () => setOpen(true), dialog };
}

function FileList({ label, dir, files, muted = false }: { label?: string; dir?: string; files?: string[]; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(files ?? []).map((f) => (
          <code
            key={f}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: muted ? "var(--text-muted)" : "var(--blue-700)",
              background: muted ? "var(--neutral-100)" : "var(--blue-50)",
              padding: "3px 8px",
              borderRadius: 5,
              wordBreak: "break-all",
            }}
          >
            {dir}/{f}
          </code>
        ))}
      </div>
    </div>
  );
}

export default function DeleteNoteButton(props: Props) {
  const { open, dialog } = useDeleteNote(props);
  return (
    <>
      <button onClick={open} style={triggerBtn}>
        <Trash2 size={15} /> 刪除筆記
      </button>
      {dialog}
    </>
  );
}

const planBox: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  background: "var(--neutral-50)",
  border: "1px solid var(--neutral-100)",
  fontSize: 12.5,
};
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
  whiteSpace: "nowrap",
};
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
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
