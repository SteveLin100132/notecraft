// Duty Mate — 排班限制表（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.ConstraintView.
const D = window.Duty;

function ConstraintView(p) {
  const { state, set } = p;
  const today = new Date();
  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.constraint(22)} title="排班限制表"
        desc="彙整所有值日生填寫的排除時段，於每個可排班日列出當天「不能排」的人員，作為排班參考。" />
      <div className="dm-card" style={{ padding: 18 }}>
        <D.MonthNav year={state.year} month={state.month}
          onPrev={() => set({ month: state.month === 0 ? 11 : state.month - 1, year: state.month === 0 ? state.year - 1 : state.year })}
          onNext={() => set({ month: state.month === 11 ? 0 : state.month + 1, year: state.month === 11 ? state.year + 1 : state.year })}
          onToday={() => set({ year: D.SEED_YEAR, month: D.SEED_MONTH })} />
        <div style={{ height: 16 }} />
        <D.MonthCalendar year={state.year} month={state.month} renderCell={(ctx) => {
          const a = state.activities[ctx.dateStr];
          const schedulable = D.isSchedulable(ctx.date, ctx.dateStr, state.activities);
          const off = a && a.type === "off";
          const blocked = D.schedulingPool(state.users).filter((u) => (state.exclusions[u.id] || []).includes(ctx.dateStr));
          return (
            <D.DayCell ctx={ctx} tone={off ? "off" : a && a.type === "adjust" ? "adjust" : (!schedulable ? "muted" : "default")} disabled={!schedulable}
              ribbon={a && <D.ActivityRibbon type={a.type} />}>
              {off ? <span style={{ fontSize: 11.5, color: "var(--danger-500)", fontWeight: 700 }}>{a.note}</span>
                : schedulable ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {blocked.length ? blocked.map((u) => <D.NameChip key={u.id} name={u.name} tone="gold" small />)
                      : <span style={{ fontSize: 11.5, color: "var(--success-500)" }}>全員可排</span>}
                  </div>
                ) : null}
            </D.DayCell>
          );
        }} />
        <div style={{ marginTop: 14 }}>
          <D.Legend items={[["var(--orange-100)", "當天不能排的人員"], ["var(--success-50)", "補班 (可排)"], ["var(--danger-50)", "停班日"]]} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { ConstraintView });
