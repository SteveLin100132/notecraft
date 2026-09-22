import { useState } from "react";
import { Edit3, Trash2, ArrowRight, Layers, Search, Tag } from "lucide-react";
import { GroupHeader, Ic, MiniButton, Progress, SearchBox, Seg, StatStrip } from "@/components/wb/ui";
import { ymd } from "@/lib/wb-time";

export type TagRow = { name: string; count: number; lastUsed: string };

type Props = { initial: TagRow[]; devMode: boolean; noteCount?: number };

function toast(msg: string, icon = "tag") {
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon } }));
}

const SORTS: Array<{ k: "count" | "recent" | "alpha"; label: string }> = [
  { k: "count", label: "使用次數" },
  { k: "recent", label: "最近使用" },
  { k: "alpha", label: "字母序" },
];

export default function TagsManager({ initial, devMode, noteCount = 0 }: Props) {
  const [tags, setTags] = useState<TagRow[]>(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"count" | "recent" | "alpha">("count");
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [pendingRename, setPendingRename] = useState<{ oldName: string; newName: string; affected: number; merged: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ name: string; affected: number } | null>(null);

  let stats = [...tags];
  if (sort === "count") stats.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  else if (sort === "recent") stats.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  else stats.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const max = Math.max(...stats.map((s) => s.count), 1);
  const used = tags.reduce((a, t) => a + t.count, 0);
  const ql = q.trim().toLowerCase();
  if (ql) stats = stats.filter((t) => t.name.toLowerCase().includes(ql));

  const startEdit = (name: string) => {
    setEditing(name);
    setEditVal(name);
  };
  const submitEdit = (oldName: string) => {
    const nn = editVal.trim();
    setEditing(null);
    if (!nn || nn === oldName) return;
    const cur = tags.find((s) => s.name === oldName);
    const merged = tags.some((s) => s.name === nn);
    setPendingRename({ oldName, newName: nn, affected: cur?.count ?? 0, merged });
  };

  const doRename = async () => {
    if (!pendingRename) return;
    const { oldName, newName, merged } = pendingRename;
    setPendingRename(null);
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(oldName)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "重新命名失敗", "x");
        return;
      }
      // refresh
      setTags((cur) => {
        const next = cur.filter((t) => t.name !== oldName);
        if (merged) {
          return next.map((t) =>
            t.name === newName ? { ...t, count: t.count + data.done } : t,
          );
        }
        return [...next, { name: newName, count: data.done, lastUsed: new Date().toISOString().slice(0, 10) }];
      });
      if (data.failed > 0) toast(`已完成 ${data.done} 篇、未完成 ${data.failed} 篇`, "x");
      else toast(merged ? `已合併至「${newName}」，更新 ${data.done} 篇` : `已重新命名，更新 ${data.done} 篇筆記`, "tag");
    } catch {
      toast("dev API 不可用", "x");
    }
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    const { name } = pendingDelete;
    setPendingDelete(null);
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "刪除失敗", "x");
        return;
      }
      setTags((cur) => cur.filter((t) => t.name !== name));
      if (data.failed > 0) toast(`已完成 ${data.done} 篇、未完成 ${data.failed} 篇`, "x");
      else toast(`已從 ${data.done} 篇筆記移除標籤「${name}」`, "tag");
    } catch {
      toast("dev API 不可用", "x");
    }
  };

  return (
    <>
      <div className="wb-tb">
        <Seg label="排序" value={sort} options={SORTS.map((x) => ({ value: x.k, label: x.label }))} onChange={setSort} />
        <div className="wb-tb-right">
          <SearchBox value={q} onChange={setQ} icon={Search} placeholder="搜尋標籤…" />
          <span className="wb-count tnum">{stats.length} 個</span>
        </div>
      </div>
      <div id="nc-scroll" className="wb-body flush">
        <StatStrip
          items={[
            { label: "標籤", value: tags.length },
            { label: "標記次數", value: used },
            { label: "平均每篇", value: (used / Math.max(noteCount, 1)).toFixed(1) },
          ]}
        />
        <GroupHeader name="全部標籤" count={stats.length} icon={Tag} gc="wb-gc-ink3" stats="點一列以該標籤篩選筆記" />
        {stats.length === 0 ? <div className="wb-empty">沒有符合條件的標籤。</div> : null}
        {stats.map((s) => {
          const isEdit = editing === s.name;
          return (
            // 列是容器：名稱區是連結、mini button 是並排的兄弟（規格 §8.2.1）
            <div key={s.name} className="wb-row">
              {isEdit ? (
                <>
                  <Ic icon={Tag} size={13} color="var(--wb-ink-3)" />
                  <input
                    className="wb-inline"
                    autoFocus
                    value={editVal}
                    aria-label="新的標籤名稱"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter") submitEdit(s.name);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    onBlur={() => submitEdit(s.name)}
                  />
                  <span className="wb-row-p" />
                </>
              ) : (
                <a className="wb-row-main" href={`/notes?tag=${encodeURIComponent(s.name)}`}>
                  <Ic icon={Tag} size={13} color="var(--wb-ink-3)" />
                  <span className="wb-row-t">{s.name}</span>
                  <span className="wb-row-p">最後使用 {ymd(s.lastUsed)}</span>
                </a>
              )}
              <Progress pct={(s.count / max) * 100} gc="wb-gc-blue-l" />
              <span className="wb-row-d tnum">{s.count} 篇</span>
              {devMode && (
                <>
                  <MiniButton onClick={() => startEdit(s.name)}>重新命名</MiniButton>
                  <MiniButton danger onClick={() => setPendingDelete({ name: s.name, affected: s.count })}>
                    刪除
                  </MiniButton>
                </>
              )}
            </div>
          );
        })}
      </div>

      {pendingRename && (
        <ConfirmDialog
          icon={pendingRename.merged ? <Layers size={22} /> : <Edit3 size={22} />}
          iconTone={pendingRename.merged ? "orange" : "blue"}
          title={pendingRename.merged ? "合併標籤" : "重新命名標籤"}
          confirmLabel={pendingRename.merged ? "合併標籤" : "確認重新命名"}
          onCancel={() => setPendingRename(null)}
          onConfirm={doRename}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Pill label={pendingRename.oldName} />
            <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
            <Pill label={pendingRename.newName} tone={pendingRename.merged ? "merge" : "blue"} />
          </div>
          {pendingRename.merged ? (
            <div>
              將與既有標籤「<strong style={{ color: "var(--orange-500)" }}>{pendingRename.newName}</strong>」合併，
              <strong style={{ color: "var(--text-strong)" }}>影響 {pendingRename.affected} 篇筆記</strong>。同時含兩個標籤的筆記會自動去重。
            </div>
          ) : (
            <div>
              將從「<strong style={{ color: "var(--text-strong)" }}>{pendingRename.oldName}</strong>」重新命名為「
              <strong style={{ color: "var(--blue-700)" }}>{pendingRename.newName}</strong>」，
              <strong style={{ color: "var(--text-strong)" }}>影響 {pendingRename.affected} 篇筆記</strong>。
            </div>
          )}
        </ConfirmDialog>
      )}

      {pendingDelete && (
        <ConfirmDialog
          icon={<Trash2 size={22} />}
          iconTone="danger"
          title="刪除標籤"
          confirmLabel="永久刪除"
          danger
          requireAck
          ackLabel="我了解這會從所有筆記永久移除此標籤"
          onCancel={() => setPendingDelete(null)}
          onConfirm={doDelete}
        >
          <div style={{ marginBottom: 10 }}>
            <Pill label={pendingDelete.name} />
          </div>
          將從 <strong style={{ color: "var(--text-strong)" }}>{pendingDelete.affected} 篇筆記</strong> 中移除標籤「
          <strong style={{ color: "var(--danger-500)" }}>{pendingDelete.name}</strong>」。此操作無法復原。
        </ConfirmDialog>
      )}
    </>
  );
}

function Pill({ label, tone = "blue" }: { label: string; tone?: "blue" | "merge" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        background: tone === "merge" ? "var(--orange-50)" : "var(--blue-50)",
        color: tone === "merge" ? "var(--orange-500)" : "var(--blue-700)",
      }}
    >
      {label}
    </span>
  );
}

function ConfirmDialog({
  icon,
  iconTone,
  title,
  children,
  confirmLabel,
  danger,
  requireAck,
  ackLabel,
  onConfirm,
  onCancel,
}: {
  icon: React.ReactNode;
  iconTone: "blue" | "orange" | "danger";
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  requireAck?: boolean;
  ackLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [ack, setAck] = useState(false);
  const tone = iconTone === "danger" ? "var(--danger-500)" : iconTone === "orange" ? "var(--orange-500)" : "var(--blue-700)";
  const toneBg = iconTone === "danger" ? "var(--danger-50)" : iconTone === "orange" ? "var(--orange-50)" : "var(--blue-50)";
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 620,
        background: "rgba(11,31,62,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "ncFade 160ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "ncRise 220ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 12,
                background: toneBg,
                color: tone,
                flex: "none",
              }}
            >
              {icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 18, color: "var(--text-strong)", margin: "2px 0 8px" }}>{title}</h2>
              <div style={{ fontSize: 13.5, color: "var(--text-body)", lineHeight: 1.75 }}>{children}</div>
            </div>
          </div>
          {requireAck && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 16,
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--danger-50)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--danger-500)" }}
              />
              <span style={{ fontSize: 13, color: "#8f2b2b", fontWeight: 600 }}>{ackLabel || "我了解此操作無法復原"}</span>
            </label>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 24px 20px" }}>
          <button
            onClick={onCancel}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 999,
              border: "1.5px solid var(--neutral-200)",
              background: "#fff",
              color: "var(--text-body)",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={requireAck && !ack}
            style={{
              height: 42,
              padding: "0 22px",
              borderRadius: 999,
              border: "none",
              background: danger ? "var(--danger-500)" : "var(--action-secondary)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 14,
              cursor: requireAck && !ack ? "not-allowed" : "pointer",
              opacity: requireAck && !ack ? 0.45 : 1,
              transition: "opacity 140ms",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
