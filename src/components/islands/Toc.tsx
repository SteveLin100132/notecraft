import { useEffect, useState } from "react";

type Heading = { id: string; label: string };

export default function Toc({ items }: { items: Heading[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const sc = document.getElementById("nc-scroll");
    const onScroll = () => {
      let cur: string | null = null;
      for (const h of items) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 140) cur = h.id;
      }
      setActive(cur);
    };
    sc?.addEventListener("scroll", onScroll);
    onScroll();
    return () => sc?.removeEventListener("scroll", onScroll);
  }, [items]);

  if (!items.length) return null;

  return (
    <nav style={{ position: "sticky", top: 8, alignSelf: "start" }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: ".1em",
          color: "var(--text-muted)",
          marginBottom: 12,
          textTransform: "uppercase",
        }}
      >
        目錄
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, borderLeft: "2px solid var(--neutral-200)" }}>
        {items.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(h.id);
              const sc = document.getElementById("nc-scroll");
              if (el && sc) sc.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
            }}
            style={{
              padding: "5px 14px",
              marginLeft: -2,
              borderLeft: `2px solid ${active === h.id ? "var(--orange-500)" : "transparent"}`,
              fontSize: 13.5,
              color: active === h.id ? "var(--blue-700)" : "var(--text-muted)",
              fontWeight: active === h.id ? 700 : 500,
              textDecoration: "none",
              lineHeight: 1.5,
              transition: "color 140ms",
            }}
          >
            {h.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
