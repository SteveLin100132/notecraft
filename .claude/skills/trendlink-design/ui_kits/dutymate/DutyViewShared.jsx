// Duty Mate — shared view helpers used across pages.
// fmtDate + AssignDialog were previously local to DutyViewsA; lifted here so any
// single page (正式班表 / 草稿班表 / 活動設定…) can load them independently.
// Exposes window.Duty.fmtDate + window.Duty.AssignDialog.

const D = window.Duty;

const fmtDate = (ds) => {
  const [y, m, d] = ds.split("-").map(Number);
  return `${m} 月 ${d} 日（週${D.WK[new Date(y, m - 1, d).getDay()]}）`;
};

/* ---------- Assign dialog (shared by 草稿班表 + 正式班表編輯) ---------- */
function AssignDialog({ dateStr, users, exclusions, assignedId, onAssign, onClear, onClose }) {
  if (!dateStr) return null;
  const pool = D.schedulingPool(users);
  return (
    <div className="dm-modal-scrim" onClick={onClose}>
      <div className="dm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dm-modal-head">
          <div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>指派值日生</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-strong)" }}>{fmtDate(dateStr)}</div>
          </div>
          <button className="dm-iconbtn" onClick={onClose}>{D.DutyIcons.x(18)}</button>
        </div>
        <div className="dm-modal-body">
          {pool.map((u) => {
            const excluded = (exclusions[u.id] || []).includes(dateStr);
            const on = assignedId === u.id;
            return (
              <button key={u.id} disabled={excluded}
                className={"dm-pick" + (on ? " on" : "")} onClick={() => onAssign(u.id)}>
                <span className="dm-avatar sm">{u.name[0]}</span>
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                {excluded && <span className="dm-pick-tag">已排除</span>}
                {on && <span style={{ marginLeft: "auto", color: "var(--success-500)" }}>{D.DutyIcons.check(18)}</span>}
              </button>
            );
          })}
        </div>
        <div className="dm-modal-foot">
          {assignedId
            ? <button className="dm-btn-text danger" onClick={onClear}>{D.DutyIcons.trash(15)} 清除指派</button>
            : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>同一天僅能指派一位值日生</span>}
          <button className="dm-btn-text" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { fmtDate, AssignDialog });
