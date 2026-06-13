import { useEffect, useState } from "react";
import { Check, X, Code2, Tag } from "lucide-react";

type Toast = { id: number; msg: string; icon?: string };

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  check: Check,
  x: X,
  code: Code2,
  tag: Tag,
};

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ msg: string; icon?: string }>;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...ce.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener("nc-toast", on as EventListener);

    // 顯示由前一個頁面（如刪除筆記後導頁）暫存的提示
    try {
      const pending = sessionStorage.getItem("nc-toast-next");
      if (pending) {
        sessionStorage.removeItem("nc-toast-next");
        const detail = JSON.parse(pending) as { msg: string; icon?: string };
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, ...detail }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
      }
    } catch {
      /* sessionStorage / JSON 不可用時略過 */
    }

    return () => window.removeEventListener("nc-toast", on as EventListener);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 700,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const Ic = ICONS[t.icon || "check"] || Check;
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              borderRadius: 999,
              background: "var(--neutral-900)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "var(--shadow-lg)",
              animation: "ncRise 220ms cubic-bezier(0.16,1,0.3,1)",
              pointerEvents: "auto",
            }}
          >
            <span style={{ display: "flex", color: "var(--orange-400)" }}>
              <Ic size={18} />
            </span>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}
