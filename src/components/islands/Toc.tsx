import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type Heading = { id: string; label: string };

export default function Toc({ items }: { items: Heading[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(true);

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

  // 手機 / 平板：目錄改為可折疊面板（預設收合）；桌面：常駐展開
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => {
      setMobile(mq.matches);
      setOpen(!mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!items.length) return null;

  return (
    <nav className="nc-toc">
      <button
        type="button"
        className="nc-toc-head"
        aria-expanded={open}
        onClick={() => mobile && setOpen((o) => !o)}
      >
        <span>目錄</span>
        <ChevronDown className="nc-toc-chevron" size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="nc-toc-list" style={{ display: "flex", flexDirection: "column", gap: 2, borderLeft: "2px solid var(--neutral-200)" }}>
          {items.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(h.id);
                const sc = document.getElementById("nc-scroll");
                if (el && sc) sc.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
                if (mobile) setOpen(false);
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
      )}
    </nav>
  );
}
