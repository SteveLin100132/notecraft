// Duty Mate — reusable month calendar. Provides the grid shell + weekday header
// + optional month nav; delegates each day's body to a renderCell(ctx) prop.
// Exposes window.Duty.MonthCalendar + DayCell helpers.

const { WK, dstr, daysInMonth, isWeekend, MONTH_LABEL } = window.Duty;

function MonthNav({ year, month, onPrev, onNext, onToday, locked, right }) {
  const { DutyIcons } = window.Duty;
  const btn = {
    width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border-default)",
    background: "#fff", color: "var(--text-body)", display: "inline-flex", alignItems: "center",
    justifyContent: "center", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.4 : 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button style={btn} onClick={() => !locked && onPrev()} aria-label="上個月">{DutyIcons.chevL(18)}</button>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-strong)", minWidth: 130, textAlign: "center" }}>
          {MONTH_LABEL(year, month)}
        </div>
        <button style={btn} onClick={() => !locked && onNext()} aria-label="下個月">{DutyIcons.chevR(18)}</button>
      </div>
      {onToday && (
        <button onClick={() => !locked && onToday()} style={{
          height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid var(--border-default)",
          background: "#fff", color: "var(--text-body)", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
          fontFamily: "var(--font-sans)", opacity: locked ? 0.4 : 1,
        }}>本月</button>
      )}
      {locked && (
        <span style={{ fontSize: 12.5, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          {DutyIcons.lock(14)} 鎖定當前月份
        </span>
      )}
      <div style={{ marginLeft: "auto" }}>{right}</div>
    </div>
  );
}

function MonthCalendar({ year, month, renderCell, weekStart = 0 }) {
  const total = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const lead = (firstDow - weekStart + 7) % 7;
  const todayStr = (() => { const t = new Date(); return dstr(t.getFullYear(), t.getMonth(), t.getDate()); })();
  const header = Array.from({ length: 7 }, (_, i) => WK[(weekStart + i) % 7]);

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<div key={"p" + i} className="dm-cell dm-cell-empty" />);
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    const ds = dstr(year, month, d);
    const ctx = { date, dateStr: ds, day: d, isToday: ds === todayStr, isWeekend: isWeekend(date), dow: date.getDay() };
    cells.push(<React.Fragment key={ds}>{renderCell(ctx)}</React.Fragment>);
  }
  while (cells.length % 7 !== 0) cells.push(<div key={"t" + cells.length} className="dm-cell dm-cell-empty" />);

  return (
    <div className="dm-cal">
      <div className="dm-weekhead">
        {header.map((w, i) => (
          <div key={w} className="dm-wh" style={{ color: (weekStart + i) % 7 === 0 || (weekStart + i) % 7 === 6 ? "var(--text-muted)" : "var(--text-body)" }}>{w}</div>
        ))}
      </div>
      <div className="dm-grid">{cells}</div>
    </div>
  );
}

// A standard styled day cell shell used by most views.
function DayCell({ ctx, tone = "default", disabled, onClick, ribbon, children, selected }) {
  // tone: default | off | adjust | muted
  const toneStyle = {
    default: { background: "#fff", borderColor: "var(--border-subtle)" },
    off:     { background: "var(--danger-50)", borderColor: "color-mix(in srgb, var(--danger-500) 22%, var(--border-subtle))" },
    adjust:  { background: "var(--success-50)", borderColor: "color-mix(in srgb, var(--success-500) 26%, var(--border-subtle))" },
    muted:   { background: "var(--neutral-50)", borderColor: "var(--border-subtle)" },
  }[tone];
  return (
    <div
      className={"dm-cell" + (onClick && !disabled ? " dm-clickable" : "") + (selected ? " dm-selected" : "")}
      onClick={() => onClick && !disabled && onClick(ctx)}
      style={{
        ...toneStyle,
        cursor: onClick && !disabled ? "pointer" : "default",
        opacity: disabled ? 0.55 : 1,
        outline: ctx.isToday ? "2px solid var(--blue-500)" : "none",
        outlineOffset: -2,
      }}
    >
      <div className="dm-cell-top">
        <span className="dm-daynum" style={{ color: ctx.dow === 0 || ctx.dow === 6 ? "var(--text-muted)" : "var(--text-strong)" }}>{ctx.day}</span>
        {ribbon}
      </div>
      <div className="dm-cell-body">{children}</div>
    </div>
  );
}

Object.assign(window.Duty, { MonthCalendar, MonthNav, DayCell });
