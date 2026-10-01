// NoteCraft — shared tag chip + editor, confirm dialog, and Tags management page
(function () {
const V = window._Vtokens;
const { useState, useRef, useEffect } = React;

// ───────────── shared chip ─────────────
function TagChip({ label, onRemove, onClick, tone }) {
  const [hover, setHover] = useState(false);
  const removable = !!onRemove;
  return React.createElement("span", {
    onClick: onClick,
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex", alignItems: "center", gap: 5, padding: removable ? "5px 7px 5px 11px" : "5px 11px",
      borderRadius: 999, fontSize: 13, fontWeight: 600, lineHeight: 1.4,
      background: tone === "merge" ? V.orange50 : V.blue50, color: tone === "merge" ? V.orange : V.blue,
      cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap", transition: "background 140ms",
    },
  },
    React.createElement("span", null, label),
    removable && React.createElement("button", {
      onClick: (e) => { e.stopPropagation(); onRemove(); }, "aria-label": "移除",
      style: {
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, padding: 0,
        border: "none", borderRadius: 999, cursor: "pointer",
        background: hover ? "rgba(27,79,156,0.16)" : "transparent", color: "currentColor",
        opacity: hover ? 1 : 0.55, transition: "all 120ms",
      },
    }, window.Icons.x({ s: 12 }))
  );
}

// ───────────── editable chip row (note view) ─────────────
function TagEditor({ tags, editable, suggestions, onAdd, onRemove, onTagClick }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef(null);

  const avail = (suggestions || []).filter((s) => !tags.includes(s));
  const matches = val.trim()
    ? avail.filter((s) => s.toLowerCase().includes(val.trim().toLowerCase())).slice(0, 6)
    : avail.slice(0, 6);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const commit = (tag) => {
    const t = (tag != null ? tag : val).trim();
    if (!t) return;
    onAdd(t);
    setVal(""); setHi(0); setOpen(false);
  };

  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(open && matches[hi] != null ? matches[hi] : val); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(matches.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === "Backspace" && !val && tags.length) { onRemove(tags[tags.length - 1]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return React.createElement("div", { ref: wrapRef, style: { display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", position: "relative" } },
    tags.map((tg) => React.createElement(TagChip, {
      key: tg, label: tg,
      onRemove: editable ? () => onRemove(tg) : undefined,
      onClick: editable ? undefined : () => onTagClick && onTagClick(tg),
    })),
    editable && React.createElement("div", { style: { position: "relative" } },
      React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 10px", border: `1.5px dashed ${V.n200}`, borderRadius: 999, background: "#fff" } },
        window.Icons.plus({ s: 13, style: { color: V.muted } }),
        React.createElement("input", {
          value: val, placeholder: "新增標籤", onKeyDown: onKey,
          onChange: (e) => { setVal(e.target.value); setOpen(true); setHi(0); },
          onFocus: () => setOpen(true),
          style: { border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 13, color: V.ink, width: Math.max(72, val.length * 9 + 20) },
        })
      ),
      open && matches.length > 0 && React.createElement("div", {
        style: { position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 180, zIndex: 50, background: "#fff", border: `1px solid ${V.n200}`, borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", padding: 5, display: "flex", flexDirection: "column", gap: 1 },
      },
        React.createElement("div", { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: V.muted, padding: "4px 8px 5px" } }, "既有標籤"),
        matches.map((s, i) => React.createElement("button", {
          key: s, onMouseEnter: () => setHi(i), onClick: () => commit(s),
          style: { display: "flex", alignItems: "center", gap: 8, textAlign: "left", border: "none", borderRadius: 6, cursor: "pointer", padding: "7px 9px", fontFamily: "var(--font-sans)", fontSize: 13, color: V.ink, background: i === hi ? V.blue50 : "transparent" },
        },
          React.createElement("span", { style: { color: V.blue500, display: "flex" } }, window.Icons.hash({ s: 13 })),
          React.createElement("span", { style: { flex: 1, fontWeight: 600 } }, s),
          React.createElement("span", { style: { fontSize: 11, color: V.muted } }, (window.tagStats().find((x) => x.name === s) || {}).count)
        ))
      )
    )
  );
}

// ───────────── confirm dialog ─────────────
function ConfirmDialog({ open, icon, iconTone, title, children, confirmLabel, danger, requireAck, ackLabel, onConfirm, onCancel }) {
  const [ack, setAck] = useState(false);
  useEffect(() => { if (open) setAck(false); }, [open]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onCancel(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const tone = iconTone === "danger" ? "var(--danger-500)" : iconTone === "orange" ? V.orange : V.blue;
  const toneBg = iconTone === "danger" ? "var(--danger-50)" : iconTone === "orange" ? V.orange50 : V.blue50;
  return React.createElement("div", { onClick: onCancel, style: { position: "fixed", inset: 0, zIndex: 620, background: "rgba(11,31,62,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "ncFade 160ms ease-out" } },
    React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { width: "100%", maxWidth: 460, background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-xl)", overflow: "hidden", animation: "ncRise 220ms cubic-bezier(0.16,1,0.3,1)" } },
      React.createElement("div", { style: { padding: "24px 24px 20px" } },
        React.createElement("div", { style: { display: "flex", gap: 14 } },
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: toneBg, color: tone, flex: "none" } }, (window.Icons[icon] || window.Icons.about)({ s: 22 })),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("h2", { style: { fontSize: 18, color: V.ink, margin: "2px 0 8px" } }, title),
            React.createElement("div", { style: { fontSize: 13.5, color: V.body, lineHeight: 1.75 } }, children)
          )
        ),
        requireAck && React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 9, marginTop: 16, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--danger-50)", cursor: "pointer" } },
          React.createElement("input", { type: "checkbox", checked: ack, onChange: (e) => setAck(e.target.checked), style: { width: 16, height: 16, accentColor: "var(--danger-500)" } }),
          React.createElement("span", { style: { fontSize: 13, color: "#8f2b2b", fontWeight: 600 } }, ackLabel || "我了解此操作無法復原")
        )
      ),
      React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 24px 20px" } },
        React.createElement("button", { onClick: onCancel, style: { height: 42, padding: "0 20px", borderRadius: 999, border: `1.5px solid ${V.n200}`, background: "#fff", color: V.body, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, cursor: "pointer" } }, "取消"),
        React.createElement("button", { onClick: onConfirm, disabled: requireAck && !ack, style: { height: 42, padding: "0 22px", borderRadius: 999, border: "none", background: danger ? "var(--danger-500)" : "var(--action-secondary)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, cursor: requireAck && !ack ? "not-allowed" : "pointer", opacity: requireAck && !ack ? 0.45 : 1, transition: "opacity 140ms" } }, confirmLabel || "確認")
      )
    )
  );
}

const toast = (msg, icon) => window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon: icon || "check" } }));

// ───────────── Tags management page ─────────────
const SORTS = [["count", "使用次數"], ["recent", "最近使用"], ["alpha", "字母序"]];

function TagsView({ onOpenTag, devMode }) {
  const { Card } = window.TrendLinkDesignSystem_b2a0d6;
  const [sort, setSort] = useState("count");
  const [editing, setEditing] = useState(null);   // tag name being renamed
  const [editVal, setEditVal] = useState("");
  const [pendingRename, setPendingRename] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  let stats = window.tagStats();
  if (sort === "count") stats = stats.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  else if (sort === "recent") stats = stats.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  else stats = stats.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const max = Math.max(...stats.map((s) => s.count), 1);

  const startEdit = (name) => { setEditing(name); setEditVal(name); };
  const submitEdit = (oldName) => {
    const nn = editVal.trim();
    setEditing(null);
    if (!nn || nn === oldName) return;
    const affected = window.notesWithTag(oldName).length;
    const merged = window.tagStats().some((s) => s.name === nn);
    setPendingRename({ oldName, newName: nn, affected, merged });
  };
  const doRename = () => {
    const r = window.renameTag(pendingRename.oldName, pendingRename.newName);
    setPendingRename(null);
    if (r.failed > 0) toast(`已完成 ${r.done} 篇、未完成 ${r.failed} 篇`, "x");
    else toast(pendingRename.merged ? `已合併至「${r.newName}」，更新 ${r.done} 篇` : `已重新命名，更新 ${r.done} 篇筆記`, "tag");
  };
  const doDelete = () => {
    const r = window.deleteTag(pendingDelete.name);
    setPendingDelete(null);
    if (r.failed > 0) toast(`已完成 ${r.done} 篇、未完成 ${r.failed} 篇`, "x");
    else toast(`已從 ${r.done} 篇筆記移除標籤「${r.name}」`, "tag");
  };

  return React.createElement("div", null,
    React.createElement(window.PageHead, {
      eyebrow: "TAGS", title: "標籤索引",
      sub: devMode ? "瀏覽、重新命名或刪除標籤 — 寫入動作僅 dev 環境可用。" : "依標籤瀏覽筆記，點擊任一標籤進入過濾後的列表。",
    }),
    // sort toggle
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" } },
      React.createElement("span", { style: { fontSize: 13, color: V.muted, fontWeight: 600 } }, `${stats.length} 個標籤`),
      React.createElement("div", { style: { display: "flex", gap: 4, padding: 4, background: V.n100, borderRadius: 999, marginLeft: "auto" } },
        SORTS.map(([k, lbl]) => React.createElement("button", { key: k, onClick: () => setSort(k),
          style: { height: 34, padding: "0 14px", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, background: sort === k ? "#fff" : "transparent", color: sort === k ? V.blue : V.muted, boxShadow: sort === k ? "var(--shadow-xs)" : "none" } }, lbl))
      )
    ),
    // list
    React.createElement(Card, { style: { padding: 0, overflow: "visible" } },
      stats.map((s, i) => {
        const isEdit = editing === s.name;
        return React.createElement("div", { key: s.name,
          style: { display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderTop: i === 0 ? "none" : `1px solid ${V.n100}` } },
          // name / inline editor
          React.createElement("div", { style: { width: 220, flex: "none" } },
            isEdit
              ? React.createElement("input", { value: editVal, autoFocus: true,
                  onChange: (e) => setEditVal(e.target.value),
                  onKeyDown: (e) => { if (e.key === "Enter") submitEdit(s.name); if (e.key === "Escape") setEditing(null); },
                  onBlur: () => submitEdit(s.name),
                  style: { width: "100%", height: 34, padding: "0 12px", border: `1.5px solid ${V.blue500}`, borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: V.ink, outline: "none", boxShadow: "0 0 0 3px color-mix(in srgb, var(--sky-500) 22%, transparent)" } })
              : React.createElement("button", { onClick: () => onOpenTag(s.name),
                  style: { display: "inline-flex", alignItems: "center", gap: 7, border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" } },
                  React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: V.orange50, color: V.orange, flex: "none" } }, window.Icons.hash({ s: 16 })),
                  React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: V.ink } }, s.name))
          ),
          // count bar
          React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 } },
            React.createElement("span", { style: { flex: 1, height: 8, borderRadius: 999, background: V.n100, overflow: "hidden", maxWidth: 220 } },
              React.createElement("span", { style: { display: "block", height: "100%", width: `${(s.count / max) * 100}%`, background: V.blue500, borderRadius: 999 } })),
            React.createElement("span", { style: { fontSize: 13, color: V.body, fontWeight: 700, width: 52 } }, `${s.count} 篇`)
          ),
          // last used
          React.createElement("span", { style: { fontSize: 12.5, color: V.muted, width: 96, flex: "none", textAlign: "right" } }, `最近 ${window.daysAgo(s.lastUsed)}`),
          // dev controls
          devMode && React.createElement("div", { style: { display: "flex", gap: 4, flex: "none", marginLeft: 8 } },
            React.createElement(IconBtn, { icon: "edit", label: "重新命名", onClick: () => startEdit(s.name) }),
            React.createElement(IconBtn, { icon: "trash", label: "刪除", danger: true, onClick: () => setPendingDelete({ name: s.name, affected: s.count }) })
          )
        );
      })
    ),
    // rename dialog
    React.createElement(ConfirmDialog, {
      open: !!pendingRename, icon: pendingRename && pendingRename.merged ? "layers" : "edit",
      iconTone: pendingRename && pendingRename.merged ? "orange" : "blue",
      title: pendingRename && pendingRename.merged ? "合併標籤" : "重新命名標籤",
      confirmLabel: pendingRename && pendingRename.merged ? "合併標籤" : "確認重新命名",
      onCancel: () => setPendingRename(null), onConfirm: doRename,
    }, pendingRename && (pendingRename.merged
      ? React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 } },
            React.createElement(TagChip, { label: pendingRename.oldName }),
            window.Icons.arrowRight({ s: 16, style: { color: V.muted } }),
            React.createElement(TagChip, { label: pendingRename.newName, tone: "merge" })),
          React.createElement("div", null, "將與既有標籤「", React.createElement("strong", { style: { color: V.orange } }, pendingRename.newName), "」合併，",
            React.createElement("strong", { style: { color: V.ink } }, `影響 ${pendingRename.affected} 篇筆記`), "。同時含兩個標籤的筆記會自動去重。"))
      : React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 } },
            React.createElement(TagChip, { label: pendingRename.oldName }),
            window.Icons.arrowRight({ s: 16, style: { color: V.muted } }),
            React.createElement(TagChip, { label: pendingRename.newName })),
          "將從「", React.createElement("strong", { style: { color: V.ink } }, pendingRename.oldName), "」重新命名為「",
          React.createElement("strong", { style: { color: V.blue } }, pendingRename.newName), "」，",
          React.createElement("strong", { style: { color: V.ink } }, `影響 ${pendingRename.affected} 篇筆記`), "。"))
    ),
    // delete dialog
    React.createElement(ConfirmDialog, {
      open: !!pendingDelete, icon: "trash", iconTone: "danger", title: "刪除標籤", danger: true,
      confirmLabel: "永久刪除", requireAck: true, ackLabel: "我了解這會從所有筆記永久移除此標籤",
      onCancel: () => setPendingDelete(null), onConfirm: doDelete,
    }, pendingDelete && React.createElement("div", null,
      React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(TagChip, { label: pendingDelete.name })),
      "將從 ", React.createElement("strong", { style: { color: V.ink } }, `${pendingDelete.affected} 篇筆記`), " 中移除標籤「",
      React.createElement("strong", { style: { color: "var(--danger-500)" } }, pendingDelete.name), "」。此操作無法復原。"))
  );
}

function IconBtn({ icon, label, danger, onClick }) {
  const [h, setH] = useState(false);
  return React.createElement("button", { onClick, "aria-label": label, title: label,
    onMouseEnter: () => setH(true), onMouseLeave: () => setH(false),
    style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "none", borderRadius: 9, cursor: "pointer",
      background: h ? (danger ? "var(--danger-50)" : V.blue50) : "transparent",
      color: h ? (danger ? "var(--danger-500)" : V.blue) : V.muted, transition: "all 130ms" } },
    (window.Icons[icon] || window.Icons.edit)({ s: 17 }));
}

Object.assign(window, { TagChip, TagEditor, ConfirmDialog, TagsView });
})();
