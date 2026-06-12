import { useEffect, useRef, useState } from "react";
import { Hash, Plus, X } from "lucide-react";

type Props = {
  slug: string;
  initialTags: string[];
  editable: boolean;
  suggestions: { name: string; count: number }[];
};

function toast(msg: string, icon = "check") {
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon } }));
}

export default function TagEditor({ slug, initialTags, editable, suggestions }: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const avail = suggestions.filter((s) => !tags.includes(s.name));
  const matches = (val.trim()
    ? avail.filter((s) => s.name.toLowerCase().includes(val.trim().toLowerCase()))
    : avail
  ).slice(0, 6);

  const persist = async (next: string[]) => {
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(slug)}/tags`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "標籤更新失敗", "x");
        return false;
      }
      return true;
    } catch {
      toast("dev API 不可用，無法更新標籤", "x");
      return false;
    }
  };

  const addTag = async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (tags.includes(t)) {
      toast("此筆記已有相同標籤", "x");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setVal("");
    setHi(0);
    setOpen(false);
    const ok = await persist(next);
    if (!ok) setTags(tags);
    else toast(`已加入標籤「${t}」`, "tag");
  };

  const removeTag = async (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    const ok = await persist(next);
    if (!ok) setTags(tags);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(open && matches[hi] ? matches[hi].name : val);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(matches.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Backspace" && !val && tags.length) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", position: "relative" }}
    >
      {tags.map((tg) => (
        <span
          key={tg}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: editable ? "5px 7px 5px 11px" : "5px 11px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            background: "var(--blue-50)",
            color: "var(--blue-700)",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          {editable ? (
            <span>{tg}</span>
          ) : (
            <a href={`/notes?tag=${encodeURIComponent(tg)}`} style={{ color: "inherit", textDecoration: "none" }}>
              {tg}
            </a>
          )}
          {editable && (
            <button
              onClick={() => removeTag(tg)}
              aria-label="移除"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 17,
                height: 17,
                padding: 0,
                border: "none",
                borderRadius: 999,
                cursor: "pointer",
                background: "transparent",
                color: "currentColor",
                opacity: 0.55,
              }}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {editable && (
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 30,
              padding: "0 10px",
              border: "1.5px dashed var(--neutral-200)",
              borderRadius: 999,
              background: "#fff",
            }}
          >
            <Plus size={13} style={{ color: "var(--text-muted)" }} />
            <input
              value={val}
              placeholder="新增標籤"
              onKeyDown={onKey}
              onChange={(e) => {
                setVal(e.target.value);
                setOpen(true);
                setHi(0);
              }}
              onFocus={() => setOpen(true)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-strong)",
                width: Math.max(72, val.length * 9 + 20),
              }}
            />
          </div>
          {open && matches.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: 180,
                zIndex: 50,
                background: "#fff",
                border: "1px solid var(--neutral-200)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                padding: 5,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  color: "var(--text-muted)",
                  padding: "4px 8px 5px",
                }}
              >
                既有標籤
              </div>
              {matches.map((s, i) => (
                <button
                  key={s.name}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => addTag(s.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: "7px 9px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-strong)",
                    background: i === hi ? "var(--blue-50)" : "transparent",
                  }}
                >
                  <span style={{ color: "var(--blue-500)", display: "flex" }}>
                    <Hash size={13} />
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
