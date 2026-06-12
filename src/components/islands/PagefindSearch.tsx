import { useEffect, useState } from "react";
import { Search, X, FileText } from "lucide-react";

type Result = {
  url: string;
  meta: { title?: string };
  excerpt: string;
};

declare global {
  interface Window {
    pagefind?: {
      search: (q: string) => Promise<{ results: { data: () => Promise<Result> }[] }>;
    };
  }
}

export default function PagefindSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Built by `pagefind --site dist` and only present in production builds.
        // Hide URL from Vite's static analyzer so dev server doesn't try to resolve it.
        const url = "/pagefind/" + "pagefind.js";
        const mod = await import(/* @vite-ignore */ url);
        if (cancelled) return;
        window.pagefind = mod as any;
        setReady(true);
      } catch {
        setReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.pagefind) return;
    if (!q.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await window.pagefind!.search(q);
      const data = await Promise.all(r.results.slice(0, 8).map((x) => x.data()));
      if (!cancelled) setResults(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, ready]);

  if (!ready) return null;

  return (
    <div style={{ marginBottom: 22, position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 46,
          padding: "0 16px",
          background: "#fff",
          border: "1.5px solid var(--neutral-200)",
          borderRadius: 999,
        }}
      >
        <Search size={18} style={{ color: "var(--text-muted)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="全文搜尋（pagefind）…"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-sans)",
            fontSize: 14.5,
            color: "var(--text-strong)",
          }}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid var(--neutral-200)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            zIndex: 40,
            overflow: "hidden",
          }}
        >
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid var(--neutral-100)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ color: "var(--blue-500)", flex: "none", marginTop: 2 }}>
                <FileText size={16} />
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>
                  {r.meta.title || r.url}
                </div>
                <div
                  style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 2 }}
                  dangerouslySetInnerHTML={{ __html: r.excerpt }}
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
