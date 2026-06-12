// Duty Mate — 排除時段（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.ExcludeView.
const D = window.Duty;

function ExcludeView(p) {
  const { state, set, viewRole } = p;
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const isAdmin = viewRole === "admin";
  const [target, setTarget] = React.useState(viewRole === "duty" ? "u1" : "u1");
  React.useEffect(() => { if (viewRole === "duty") setTarget("u1"); }, [viewRole]);
  const monthKey = `${state.year}-${D.pad2(state.month + 1)}`;
  const published = state.publishedMonths.includes(monthKey);
  const mine = state.exclusions[target] || [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pool = D.schedulingPool(state.users);

  const toggle = (ds, date) => {
    if (published || date < today) return;
    const has = mine.includes(ds);
    const next = has ? mine.filter((x) => x !== ds) : [...mine, ds];
    set({ exclusions: { ...state.exclusions, [target]: next } });
  };

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.exclude(22)} title="排除時段"
        desc="點選日曆標記「不能排」的日期，重複點擊可取消。資料供排班負責人排班參考。"
        actions={<Button variant="primary" size="sm" onClick={() => p.toast("已儲存排除時段")}>儲存</Button>} />
      {isAdmin && (
        <div className="dm-card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{D.DutyIcons.users(15)} 代填同仁</span>
          {pool.map((u) => (
            <button key={u.id} className={"dm-fchip" + (target === u.id ? " on" : "")} onClick={() => setTarget(u.id)}>{u.name}</button>
          ))}
        </div>
      )}
      <div className="dm-card" style={{ padding: 18 }}>
        <D.MonthNav year={state.year} month={state.month}
          onPrev={() => set({ month: state.month === 0 ? 11 : state.month - 1, year: state.month === 0 ? state.year - 1 : state.year })}
          onNext={() => set({ month: state.month === 11 ? 0 : state.month + 1, year: state.month === 11 ? state.year + 1 : state.year })}
          onToday={() => set({ year: D.SEED_YEAR, month: D.SEED_MONTH })}
          right={published && <span style={{ fontSize: 12.5, color: "var(--warning-500)", display: "inline-flex", gap: 5, alignItems: "center" }}>{D.DutyIcons.lock(14)} 已發布，本月鎖定</span>} />
        <div style={{ height: 16 }} />
        <D.MonthCalendar year={state.year} month={state.month} renderCell={(ctx) => {
          const a = state.activities[ctx.dateStr];
          const schedulable = D.isSchedulable(ctx.date, ctx.dateStr, state.activities);
          const past = ctx.date < today;
          const excluded = mine.includes(ctx.dateStr);
          const off = a && a.type === "off";
          const editable = schedulable && !past && !published;
          return (
            <D.DayCell ctx={ctx} tone={off ? "off" : a && a.type === "adjust" ? "adjust" : (!schedulable ? "muted" : excluded ? "off" : "default")}
              disabled={!schedulable} onClick={editable ? () => toggle(ctx.dateStr, ctx.date) : undefined}
              ribbon={a ? <D.ActivityRibbon type={a.type} /> : (excluded && <span style={{ color: "var(--orange-500)" }}>{D.DutyIcons.x(15)}</span>)}>
              {excluded && !off ? <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--orange-600)" }}>不能排</span>
                : (editable ? <span className="dm-addslot subtle">點選標記</span> : null)}
            </D.DayCell>
          );
        }} />
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <D.Legend items={[["var(--orange-100)", "不能排"], ["var(--neutral-100)", "週末 / 不可排"], ["var(--danger-50)", "停班日"]]} />
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>本月已標記 <strong style={{ color: "var(--orange-600)" }}>{mine.filter((d) => d.startsWith(monthKey)).length}</strong> 天</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { ExcludeView });
