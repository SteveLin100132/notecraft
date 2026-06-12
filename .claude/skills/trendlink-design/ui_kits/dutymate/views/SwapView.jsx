// Duty Mate — 申請換班（追加）（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.SwapView.
const D = window.Duty;

function SwapView() {
  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.swap(22)} title="申請換班" desc="值日生有事時，可申請與其他同仁換班，對方同意即生效，無須管理員審核。" />
      <div className="dm-card dm-empty">
        <span className="dm-empty-ic" style={{ background: "var(--orange-50)", color: "var(--orange-500)" }}>{D.DutyIcons.swap(30)}</span>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-strong)" }}>申請換班功能開發中</div>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 420, lineHeight: 1.8 }}>
          屬第 5 階段追加功能。上線前如需臨時調整，請由排班負責人於「正式班表」編輯模式調整。
        </p>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { SwapView });
