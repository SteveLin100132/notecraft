// 資料檔清單（Task 49）。
//
// 篩選列只在裝了 2 個以上 plugin 時出現 —— 一個 plugin 時整條不渲染，
// 而不是渲染一顆永遠選中的按鈕。空的篩選器比沒有篩選器更糟。

import { useMemo, useState } from "react";
import { ChevronRight, Clock, Database, FileJson, Plug } from "lucide-react";

export interface DataFileCardData {
  routePath: string;
  relPath: string;
  title: string;
  description: string;
  pluginId: string;
  updatedAt: string;
}

function daysAgo(s: string, today: string = new Date().toISOString().slice(0, 10)): string {
  const ms = new Date(today + "T00:00:00").getTime() - new Date(s + "T00:00:00").getTime();
  const d = Math.round(ms / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 週前`;
  return `${Math.floor(d / 30)} 個月前`;
}

export default function DataFilesList({ files }: { files: DataFileCardData[] }) {
  const [active, setActive] = useState<string | null>(null);

  const plugins = useMemo(() => {
    const count = new Map<string, number>();
    for (const f of files) count.set(f.pluginId, (count.get(f.pluginId) ?? 0) + 1);
    return [...count.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => a.id.localeCompare(b.id));
  }, [files]);

  const shown = active ? files.filter((f) => f.pluginId === active) : files;

  return (
    <div>
      {plugins.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          <FilterPill label="全部" count={files.length} on={active === null} onClick={() => setActive(null)} />
          {plugins.map((p) => (
            <FilterPill
              key={p.id}
              label={p.id}
              count={p.n}
              mono
              on={active === p.id}
              onClick={() => setActive(active === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((f) => (
          <a
            key={f.routePath}
            href={`/view/${f.routePath}`}
            className="nc-card-link"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "16px 20px",
              background: "#fff",
              border: "1px solid var(--neutral-200)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xs)",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 5,
                background: "var(--orange-50)",
                color: "var(--orange-600)",
                flex: "none",
              }}
            >
              <Database size={20} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ fontSize: 16.5, color: "var(--text-strong)", margin: "0 0 4px", fontWeight: 700 }}>
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--text-muted)",
                  margin: 0,
                  lineHeight: 1.6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.description || "（這份資料沒有寫 meta.description）"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
              <span style={mono}>
                <FileJson size={13} /> {f.relPath}
              </span>
              <span style={pill}>
                <Plug size={12} /> {f.pluginId}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--text-muted)" }}>
                <Clock size={14} /> {daysAgo(f.updatedAt.slice(0, 10))}
              </span>
              <span style={{ color: "var(--neutral-300)", display: "flex" }}>
                <ChevronRight size={18} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const mono: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  color: "var(--text-muted)",
};

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "2px 9px",
  borderRadius: "var(--radius-pill)",
  background: "var(--blue-50)",
  color: "var(--blue-700)",
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  fontWeight: 700,
};

function FilterPill({
  label,
  count,
  on,
  mono: isMono,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  mono?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${on ? "var(--blue-500)" : "var(--border-default)"}`,
        background: on ? "var(--blue-50)" : "var(--surface-card)",
        color: on ? "var(--blue-700)" : "var(--text-muted)",
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: isMono ? "var(--font-mono)" : "inherit",
        cursor: "pointer",
        transition: "border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out)",
      }}
    >
      {label}
      <span style={{ opacity: 0.65, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </button>
  );
}
