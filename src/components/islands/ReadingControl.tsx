import { useEffect, useState } from "react";
import { Circle, BookOpen, CheckCircle2 } from "lucide-react";
import {
  readingStatus,
  setReadingStatus,
  markReading,
  READING_EVENT,
  type ReadingStatus,
} from "@/lib/reading-progress";

const SEGMENTS: { key: ReadingStatus; label: string; color: string; Icon: typeof Circle }[] = [
  { key: "not-started", label: "待開始", color: "var(--neutral-600)", Icon: Circle },
  { key: "reading", label: "閱讀中", color: "var(--blue-700)", Icon: BookOpen },
  { key: "done", label: "已完成", color: "#1d6b48", Icon: CheckCircle2 },
];

export default function ReadingControl({ slug }: { slug: string }) {
  // SSR / 首次 render 視為 not-started，hydration 後修正，避免 mismatch。
  const [status, setStatus] = useState<ReadingStatus>("not-started");

  useEffect(() => {
    // 開啟筆記時的輕量自動轉換：not-started → reading（永不降級）。
    markReading(slug);
    const sync = () => setStatus(readingStatus(slug));
    sync();
    window.addEventListener(READING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(READING_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  return (
    <div
      role="group"
      aria-label="閱讀進度"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        background: "var(--neutral-100)",
        borderRadius: 999,
      }}
    >
      {SEGMENTS.map((seg) => {
        const on = seg.key === status;
        return (
          <button
            key={seg.key}
            onClick={() => setReadingStatus(slug, seg.key)}
            aria-pressed={on}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 30,
              padding: "0 12px",
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: 700,
              background: on ? "#fff" : "transparent",
              color: on ? seg.color : "var(--text-muted)",
              boxShadow: on ? "var(--shadow-xs)" : "none",
              whiteSpace: "nowrap",
              transition: "color 140ms",
            }}
          >
            <seg.Icon size={14} /> {seg.label}
          </button>
        );
      })}
    </div>
  );
}
