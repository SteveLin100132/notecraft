// Duty Mate — 用戶管理（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.UsersView.
const D = window.Duty;

function UsersView(p) {
  const { state, set, account } = p;
  const { Button, Badge, Switch } = window.TrendLinkDesignSystem_b2a0d6;
  const [form, setForm] = React.useState(null); // {id?, name, email, role, include}
  const [del, setDel] = React.useState(null);

  const blank = { name: "", email: "", password: "", role: "duty", include: true };
  const valid = form && form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && (form.id || form.password.length >= 8);

  const saveUser = () => {
    if (form.id) set({ users: state.users.map((u) => u.id === form.id ? { ...u, name: form.name, email: form.email, role: u.id === account.id ? u.role : form.role, include: form.include } : u) });
    else set({ users: [...state.users, { ...form, id: "u" + Date.now(), email: form.email.toLowerCase() }] });
    p.toast(form.id ? "已更新用戶" : "已新增用戶"); setForm(null);
  };
  const doDelete = () => { set({ users: state.users.filter((u) => u.id !== del.id) }); p.toast(`已刪除 ${del.name}`); setDel(null); };

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.users(22)} title="用戶管理"
        desc="新增、修改、刪除系統用戶，設定角色與是否列入排班。"
        actions={<Button variant="primary" size="sm" iconLeft={D.DutyIcons.plus(16)} onClick={() => setForm(blank)}>新增用戶</Button>} />
      <div className="dm-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="dm-table">
          <thead><tr><th>姓名</th><th>公司郵箱</th><th>角色</th><th style={{ textAlign: "center" }}>列入排班</th><th style={{ textAlign: "right" }}>操作</th></tr></thead>
          <tbody>
            {state.users.map((u) => {
              const self = u.id === account.id;
              return (
                <tr key={u.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="dm-avatar sm">{u.name[0]}</span><span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{u.name}{self && <span className="dm-self">你</span>}</span></div></td>
                  <td style={{ color: "var(--text-muted)", fontFamily: "var(--font-latin)" }}>{u.email}</td>
                  <td><Badge tone={u.role === "admin" ? "blue" : "neutral"}>{D.roleLabel(u.role)}</Badge></td>
                  <td style={{ textAlign: "center" }}>{u.include ? <Badge tone="success" variant="soft">是</Badge> : <Badge tone="neutral" variant="soft">否</Badge>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="dm-iconbtn sm" onClick={() => setForm({ id: u.id, name: u.name, email: u.email, password: "", role: u.role, include: u.include })} aria-label="編輯">{D.DutyIcons.edit(16)}</button>
                      <button className="dm-iconbtn sm danger" disabled={self} style={{ opacity: self ? 0.35 : 1, cursor: self ? "not-allowed" : "pointer" }} onClick={() => !self && setDel(u)} aria-label="刪除">{D.DutyIcons.trash(16)}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.7 }}>※ 負責人無法修改自己的角色或刪除自己，以免失去管理權限。電子郵件在系統中唯一。</p>

      {form && (
        <div className="dm-modal-scrim" onClick={() => setForm(null)}>
          <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-head">
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-strong)" }}>{form.id ? "編輯用戶" : "新增用戶"}</div>
              <button className="dm-iconbtn" onClick={() => setForm(null)}>{D.DutyIcons.x(18)}</button>
            </div>
            <div style={{ padding: "8px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="dm-field"><span>姓名</span><input className="dm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2–20 字，中英文" /></label>
              <label className="dm-field"><span>公司郵箱</span><input className="dm-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@trendlink.com.tw" /></label>
              {!form.id && <label className="dm-field"><span>密碼</span><input className="dm-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="至少 8 碼，含字母與數字" /></label>}
              <label className="dm-field"><span>角色</span>
                <select className="dm-input" value={form.role} disabled={form.id === account.id} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="duty">值日生</option><option value="admin">排班負責人</option>
                </select>
                {form.id === account.id && <small style={{ color: "var(--text-muted)", fontSize: 11.5 }}>無法修改自己的角色</small>}
              </label>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
                <span style={{ fontSize: 13.5, color: "var(--text-body)", fontWeight: 600 }}>列入排班</span>
                <Switch checked={form.include} onChange={(e) => setForm({ ...form, include: e.target.checked })} />
              </div>
            </div>
            <div className="dm-modal-foot">
              <button className="dm-btn-text" onClick={() => setForm(null)}>取消</button>
              <Button variant="primary" size="sm" disabled={!valid} onClick={saveUser}>{form.id ? "儲存" : "新增"}</Button>
            </div>
          </div>
        </div>
      )}
      {del && (
        <div className="dm-modal-scrim" onClick={() => setDel(null)}>
          <div className="dm-modal sm" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "22px 22px 6px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}><span style={{ color: "var(--danger-500)" }}>{D.DutyIcons.warn(22)}</span><h3 style={{ margin: 0, fontSize: 17, color: "var(--text-strong)" }}>刪除用戶？</h3></div>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>將刪除「{del.name}」，該帳號將無法再登入。此動作無法復原。</p>
            </div>
            <div className="dm-modal-foot"><button className="dm-btn-text" onClick={() => setDel(null)}>取消</button><Button variant="secondary" size="sm" onClick={doDelete}>確認刪除</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window.Duty, { UsersView });
