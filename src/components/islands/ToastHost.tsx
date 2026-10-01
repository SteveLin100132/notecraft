import { useEffect, useState } from "react";
import { Check, X, Code2, Tag } from "lucide-react";
import { registerToastHost, type ToastDetail } from "@/lib/toast";

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
    const push = (detail: ToastDetail) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    };
    const on = (e: Event) => push((e as CustomEvent<ToastDetail>).detail);
    window.addEventListener("nc-toast", on as EventListener);

    // 顯示由前一個頁面（如刪除筆記後導頁）暫存的提示
    try {
      const pending = sessionStorage.getItem("nc-toast-next");
      if (pending) {
        sessionStorage.removeItem("nc-toast-next");
        push(JSON.parse(pending) as ToastDetail);
      }
    } catch {
      /* sessionStorage / JSON 不可用時略過 */
    }

    // lib/toast.ts：掛載前（例如 client:load 的頁籤列）排隊的提示，在這裡一次送出
    const unregister = registerToastHost(push);

    return () => {
      window.removeEventListener("nc-toast", on as EventListener);
      unregister();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        // 全站最上層：必須蓋過簡報播放（800）與生成元件的放大檢視覆蓋層（900），
        // 否則那兩個全螢幕情境發出的提示會被自己的底色擋住。
        zIndex: 950,
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
