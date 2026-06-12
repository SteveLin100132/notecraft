import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type Props = { id: string; kind: string; children: ReactNode; caption?: string };

export default function Figure({ id, kind, children, caption }: Props) {
  return (
    <figure
      style={{
        margin: "26px 0",
        padding: 0,
        border: "1px solid var(--neutral-200)",
        borderRadius: "var(--radius-lg)",
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 2px 6px rgba(17,47,93,0.08)",
      }}
    >
      <figcaption
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid var(--neutral-100)",
          background: "#fbfcfe",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".06em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        <Sparkles size={14} style={{ color: "var(--orange-500)" }} />
        <span style={{ color: "var(--blue-700)" }}>{kind}</span>
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 600,
            letterSpacing: 0,
            textTransform: "none",
            fontSize: 11,
            color: "var(--neutral-300)",
          }}
        >
          generated/{id}.tsx
        </span>
      </figcaption>
      <div style={{ padding: "22px 24px" }}>{children}</div>
      {caption && (
        <div
          style={{
            padding: "0 24px 18px",
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.7,
          }}
        >
          {caption}
        </div>
      )}
    </figure>
  );
}
