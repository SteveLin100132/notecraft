// Duty Mate — 正式班表（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.OfficialView.
const D = window.Duty;

function OfficialView(p) {
  const { state, set, viewRole, account } = p;
  const { Button, Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const isAdmin = viewRole === "admin";
  const monthKey = `${state.year}-${D.pad2(state.month + 1)}`;
  const published = state.publishedMonths.includes(monthKey);
  const sched = state.official[monthKey] || {};
  const [edit, setEdit] = React.useState(false);
  const [dlg, setDlg] = React.useState(null);
  const [filter, setFilter] = React.useState(viewRole === "duty" ? "u1" : "all");
  React.useEffect(() => { setFilter(viewRole === "duty" ? "u1" : "all"); setEdit(false); }, [viewRole]);

  const pool = D.schedulingPool(state.users);
  const assign = (uid) => {
    const next = { ...sched, [dlg]: uid };
    set({ official: { ...state.official, [monthKey]: next } }); setDlg(null);
    p.toast(`已指派 ${D.userById(state.users, uid).name} · ${D.fmtDate(dlg)}`);
  };
  const clear = () => { const n = { ...sched }; delete n[dlg]; set({ official: { ...state.official, [monthKey]: n } }); setDlg(null); };

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.official(22)} title="正式班表"
        desc={isAdmin ? "已發布的班表，可篩選人員、編輯臨時調整，並查看工作任務備註。" : "查看自己的值日安排與工作任務，可篩選只看自己。"}
        actions={isAdmin && published && (
          <Button variant={edit ? "secondary" : "outline"} size="sm" iconLeft={D.DutyIcons.edit(15)} onClick={() => setEdit(!edit)}>
            {edit ? "完成編輯" : "編輯班表"}
          </Button>
        )} />

      {!published ? (
        <div className="dm-card" style={{ padding: 18 }}>
          <D.MonthNav year={state.year} month={state.month}
            onPrev={() => set({ month: state.month === 0 ? 11 : state.month - 1, year: state.month === 0 ? state.year - 1 : state.year })}
            onNext={() => set({ month: state.month === 11 ? 0 : state.month + 1, year: state.month === 11 ? state.year + 1 : state.year })}
            onToday={() => set({ year: D.SEED_YEAR, month: D.SEED_MONTH })} />
          <div className="dm-empty" style={{ padding: "40px 26px 16px" }}>
            <span className="dm-empty-ic">{D.DutyIcons.official(30)}</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-strong)" }}>{D.MONTH_LABEL(state.year, state.month)}尚未發布班表</div>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px 0 16px" }}>{isAdmin ? "請至「草稿班表」產生推薦並發布，或切換月份查看其他班表。" : "請等待排班負責人發布本月班表，或切換月份查看其他班表。"}</p>
            {isAdmin && <Button variant="primary" size="sm" onClick={() => p.go("draft")}>前往草稿班表</Button>}
          </div>
        </div>
      ) : (
        <div className="dm-split">
          <div className="dm-card" style={{ padding: 18 }}>
            <D.MonthNav year={state.year} month={state.month}
              onPrev={() => set({ month: state.month === 0 ? 11 : state.month - 1, year: state.month === 0 ? state.year - 1 : state.year })}
              onNext={() => set({ month: state.month === 11 ? 0 : state.month + 1, year: state.month === 11 ? state.year + 1 : state.year })}
              onToday={() => set({ year: D.SEED_YEAR, month: D.SEED_MONTH })} />
            <div style={{ margin: "16px 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", marginRight: 2 }}>篩選</span>
              <button className={"dm-fchip" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>全部</button>
              {pool.map((u) => (
                <button key={u.id} className={"dm-fchip" + (filter === u.id ? " on" : "")} onClick={() => setFilter(u.id)}>{u.name}</button>
              ))}
            </div>
            <D.MonthCalendar year={state.year} month={state.month} renderCell={(ctx) => {
              const a = state.activities[ctx.dateStr];
              const schedulable = D.isSchedulable(ctx.date, ctx.dateStr, state.activities);
              const who = sched[ctx.dateStr];
              const off = a && a.type === "off";
              const tone = off ? "off" : a && a.type === "adjust" ? "adjust" : (!schedulable ? "muted" : "default");
              const canEdit = isAdmin && edit && schedulable;
              const dim = filter !== "all" && who && who !== filter;
              return (
                <D.DayCell ctx={ctx} tone={tone} disabled={off && !who}
                  onClick={canEdit ? () => setDlg(ctx.dateStr) : undefined}
                  ribbon={a && <D.ActivityRibbon type={a.type} />}>
                  {who ? (
                    <div style={{ opacity: dim ? 0.28 : 1 }}>
                      <D.NameChip name={D.userById(state.users, who).name} tone={filter === who ? "me" : "blue"} absent={off} small />
                      {off && <div className="dm-absent">無法出勤</div>}
                    </div>
                  ) : (schedulable && isAdmin && edit ? <span className="dm-addslot">{D.DutyIcons.plus(15)}</span> : null)}
                  {a && a.note && <div className="dm-daynote">{a.note}</div>}
                </D.DayCell>
              );
            }} />
            <div style={{ marginTop: 14 }}>
              <D.Legend items={[["var(--blue-50)", "已排班"], ["var(--success-50)", "補班 (可排)"], ["var(--danger-50)", "停班 (不可排)"], ["var(--blue-500)", "今日 / 篩選中"]]} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="dm-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--orange-500)" }}>{D.DutyIcons.note(18)}</span>
                <h3 style={{ fontSize: 15, margin: 0, color: "var(--text-strong)" }}>值日生工作任務</h3>
              </div>
              {(state.taskList && state.taskList.length) ? (
                <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {state.taskList.map((it) => <li key={it.id} style={{ fontSize: 13.5, color: "var(--text-body)", lineHeight: 1.7 }}>{it.text}</li>)}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>尚未設定工作任務。</p>
              )}
              {isAdmin && <button className="dm-btn-text" style={{ padding: "10px 0 0", color: "var(--blue-600)" }} onClick={() => p.go("worktask")}>{D.DutyIcons.edit(14)} {(state.taskList && state.taskList.length) ? "編輯工作任務" : "前往設定工作任務"}</button>}
            </div>
            <D.StatPanel users={state.users} schedule={sched} year={state.year} month={state.month} title="本月實際排班" />
          </div>
        </div>
      )}
      {edit && <D.AssignDialog dateStr={dlg} users={state.users} exclusions={state.exclusions}
        assignedId={dlg ? sched[dlg] : null} onAssign={assign} onClear={clear} onClose={() => setDlg(null)} />}
    </div>
  );
}

Object.assign(window.Duty, { OfficialView });
