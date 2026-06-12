// Duty Mate — 工作任務設定（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.WorkTaskView.
const D = window.Duty;

function WorkTaskView(p) {
  const { state, set } = p;
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const MAX = 200;
  const list = state.taskList || [];
  const [draft, setDraft] = React.useState("");
  const [editId, setEditId] = React.useState(null);
  const [editText, setEditText] = React.useState("");

  const addTask = () => {
    const t = draft.trim(); if (!t || t.length > MAX) return;
    set({ taskList: [...list, { id: "t" + Date.now(), text: t }] });
    setDraft(""); p.toast("已新增工作任務");
  };
  const startEdit = (it) => { setEditId(it.id); setEditText(it.text); };
  const saveEdit = () => {
    const t = editText.trim(); if (!t || t.length > MAX) return;
    set({ taskList: list.map((x) => (x.id === editId ? { ...x, text: t } : x)) });
    setEditId(null); p.toast("已更新工作任務");
  };
  const removeTask = (id) => { set({ taskList: list.filter((x) => x.id !== id) }); if (editId === id) setEditId(null); p.toast("已刪除工作任務"); };

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.task(22)} title="工作任務設定"
        desc="設定值日生的工作任務清單，內容會以備註形式套用到正式班表，讓每位值日生清楚要完成的工作。可逐條新增、編輯或刪除。" />
      <div className="dm-split">
        <div className="dm-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="dm-input" value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) addTask(); }} style={{ flex: 1 }}
              placeholder="新增一項工作任務，例如：倒茶水間垃圾" />
            <Button variant="primary" size="md" iconLeft={D.DutyIcons.plus(16)} disabled={!draft.trim() || draft.length > MAX} onClick={addTask} style={{ height: 42 }}>新增</Button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 2px 0" }}>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>共 {list.length} 項任務</span>
            <span style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums", color: draft.length > MAX ? "var(--danger-500)" : "var(--text-muted)" }}>{draft.length} / {MAX}</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {list.length === 0 ? (
              <div className="dm-empty" style={{ padding: "34px 16px" }}>
                <span className="dm-empty-ic" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 12 }}>{D.DutyIcons.task(24)}</span>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" }}>尚未設定工作任務</div>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "5px 0 0" }}>於上方輸入並新增第一項工作任務。</p>
              </div>
            ) : list.map((it, i) => (
              <div key={it.id} className="dm-task-row">
                <span className="dm-task-no">{i + 1}</span>
                {editId === it.id ? (
                  <React.Fragment>
                    <input className="dm-input" value={editText} autoFocus style={{ flex: 1, height: 38 }}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditId(null); }} />
                    <button className="dm-iconbtn sm" onClick={saveEdit} aria-label="儲存" disabled={!editText.trim() || editText.length > MAX} style={{ color: "var(--success-500)" }}>{D.DutyIcons.check(16)}</button>
                    <button className="dm-iconbtn sm" onClick={() => setEditId(null)} aria-label="取消">{D.DutyIcons.x(16)}</button>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <span style={{ flex: 1, fontSize: 14, color: "var(--text-body)", lineHeight: 1.6 }}>{it.text}</span>
                    <button className="dm-iconbtn sm" onClick={() => startEdit(it)} aria-label="編輯">{D.DutyIcons.edit(15)}</button>
                    <button className="dm-iconbtn sm danger" onClick={() => removeTask(it.id)} aria-label="刪除">{D.DutyIcons.trash(15)}</button>
                  </React.Fragment>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="dm-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ color: "var(--orange-500)" }}>{D.DutyIcons.note(18)}</span>
            <h3 style={{ fontSize: 15, margin: 0, color: "var(--text-strong)" }}>正式班表預覽</h3>
          </div>
          {list.length ? (
            <div style={{ borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <div style={{ background: "var(--surface-brand-soft)", padding: "10px 14px", fontSize: 12.5, fontWeight: 700, color: "var(--blue-700)", display: "flex", alignItems: "center", gap: 6 }}>{D.DutyIcons.note(15)} 值日生工作任務</div>
              <ul style={{ margin: 0, padding: "12px 16px 12px 30px", display: "flex", flexDirection: "column", gap: 6 }}>
                {list.map((it) => <li key={it.id} style={{ fontSize: 13.5, color: "var(--text-body)", lineHeight: 1.7 }}>{it.text}</li>)}
              </ul>
            </div>
          ) : (
            <div className="dm-empty" style={{ padding: "30px 16px" }}>
              <span className="dm-empty-ic" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 12 }}>{D.DutyIcons.note(24)}</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>沒有工作任務</div>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "5px 0 0" }}>新增後即會套用到正式班表。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { WorkTaskView });
