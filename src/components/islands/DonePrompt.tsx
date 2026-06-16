import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { readingStatus, setReadingStatus, READING_EVENT } from "@/lib/reading-progress";

function toast(msg: string, icon = "check") {
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon } }));
}

export default function DonePrompt({ slug }: { slug: string }) {
  // SSR / 首次 render 一律以「未完成」呈現，hydration 後依 localStorage 修正，避免 mismatch。
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sync = () => setDone(readingStatus(slug) === "done");
    sync();
    window.addEventListener(READING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(READING_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  if (done) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 40,
          padding: "16px 20px",
          borderRadius: "var(--radius-lg)",
          background: "var(--success-50)",
          border: "1px solid #bfe6d1",
        }}
      >
        <span style={{ display: "flex", color: "var(--success-500)" }}>
          <CheckCircle2 size={20} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1d6b48" }}>已標記為完成</span>
        <button
          onClick={() => setReadingStatus(slug, "reading")}
          className="nc-btn-reset"
          style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--blue-600)" }}
        >
          標記為未完成
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 40,
        padding: "16px 20px",
        borderRadius: "var(--radius-lg)",
        background: "var(--orange-50)",
        border: "1px solid var(--orange-100)",
      }}
    >
      <span style={{ display: "flex", color: "var(--orange-500)" }}>
        <Circle size={20} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--orange-600)" }}>讀完這篇了嗎？</span>
      <button
        onClick={() => {
          setReadingStatus(slug, "done");
          toast("已標記為完成", "check");
        }}
        style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 34,
          padding: "0 16px",
          border: "none",
          borderRadius: 999,
          cursor: "pointer",
          background: "var(--action-primary)",
          color: "#fff",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <CheckCircle2 size={15} /> 標記為已完成
      </button>
    </div>
  );
}
