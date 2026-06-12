// Duty Mate — 出勤統計（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.StatsView.
const D = window.Duty;

function StatsView(p) {
  const { state, set } = p;
  const pool = D.schedulingPool(state.users);
  const [yr, setYr] = React.useState(state.year);
  const [pick, setPick] = React.useState(null);
  const [cm, setCm] = React.useState(state.month); // calendar month

  // gather published months in selected year
  const months = state.publishedMonths.filter((mk) => mk.startsWith(String(yr)));
  const rows = pool.map((u) => {
    let actual = 0, absent = 0, schedTotal = 0;
    months.forEach((mk) => {
      const [yy, mm] = mk.split("-").map(Number);
      const sched = state.official[mk] || {};
      schedTotal += D.schedulableDays(yy, mm - 1, state.activities).length;
      Object.entries(sched).forEach(([ds, uid]) => {
        if (uid === u.id) {
          const a = state.activities[ds];
          if (a && a.type === "off") absent++; else actual++;
        }
      });
    });
    const avg = pool.length ? schedTotal / pool.length : 0;
    return { u, avg, actual, absent };
  });

  const cmKey = `${yr}-${D.pad2(cm + 1)}`;
  const cmSched = state.official[cmKey] || {};

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.stats(22)} title="出勤統計"
        desc="檢視各值日生的排班平均次數、實際排班次數與缺勤次數，確認排班是否平均。"
        actions={
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{D.DutyIcons.calendar(15)} 統計年度</span>
            <select className="dm-input" style={{ width: "auto", height: 38, fontWeight: 700 }}
              value={yr} onChange={(e) => setYr(Number(e.target.value))}>
              {Array.from({ length: 6 }, (_, i) => state.year - i).map((y) => (
                <option key={y} value={y}>{y} 年</option>
              ))}
            </select>
          </label>
        } />
      {months.length === 0 && <div className="dm-banner" style={{ marginBottom: 16 }}>{D.DutyIcons.warn(16)} {yr} 年尚無已發布的班表，數據將於發布後累計。</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="dm-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="dm-table">
            <thead><tr><th>值日生</th><th style={{ textAlign: "right" }}>平均次數</th><th style={{ textAlign: "right" }}>實際次數</th><th style={{ textAlign: "right" }}>缺勤</th></tr></thead>
            <tbody>
              {rows.map(({ u, avg, actual, absent }) => (
                <tr key={u.id} className={"dm-rowsel" + (pick === u.id ? " on" : "")} onClick={() => setPick(pick === u.id ? null : u.id)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="dm-avatar sm">{u.name[0]}</span><span style={{ fontWeight: 600, color: pick === u.id ? "var(--blue-700)" : "var(--text-strong)" }}>{u.name}</span></div></td>
                  <td style={{ textAlign: "right", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{avg.toFixed(1)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--blue-700)", fontVariantNumeric: "tabular-nums" }}>{actual}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: absent ? "var(--danger-500)" : "var(--text-muted)", fontWeight: absent ? 700 : 400 }}>{absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>點選值日生姓名，下方日曆篩選其出勤狀況。</div>
        </div>
        <div className="dm-card" style={{ padding: 18 }}>
          <D.MonthNav year={yr} month={cm} onPrev={() => setCm(cm === 0 ? 11 : cm - 1)} onNext={() => setCm(cm === 11 ? 0 : cm + 1)} />
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "10px 0 14px" }}>{pick ? `篩選：${D.userById(state.users, pick).name}` : "顯示全部值日生"}</div>
          <D.MonthCalendar year={yr} month={cm} renderCell={(ctx) => {
            const a = state.activities[ctx.dateStr];
            const who = cmSched[ctx.dateStr];
            const off = a && a.type === "off";
            const show = who && (!pick || who === pick);
            return (
              <D.DayCell ctx={ctx} tone={off ? "off" : a && a.type === "adjust" ? "adjust" : "default"} disabled={!D.isSchedulable(ctx.date, ctx.dateStr, state.activities) && !who}>
                {show ? (off
                  ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--danger-500)" }}>缺勤·{D.userById(state.users, who).name}</span>
                  : <D.NameChip name={D.userById(state.users, who).name} small tone={pick ? "me" : "blue"} />) : null}
              </D.DayCell>
            );
          }} />
          <div style={{ marginTop: 12 }}><D.Legend items={[["var(--blue-50)", "出勤"], ["var(--danger-50)", "缺勤 (停班)"]]} /></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { StatsView });
