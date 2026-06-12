// Duty Mate — 活動設定（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.ActivityView.
const D = window.Duty;

function ActivityView(p) {
  const { state, set, viewRole } = p;
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const isAdmin = viewRole === "admin";
  const [edit, setEdit] = React.useState(false);
  const [dlg, setDlg] = React.useState(null);
  const [type, setType] = React.useState("off");
  const [note, setNote] = React.useState("");

  const open = (ds) => { const a = state.activities[ds]; setType(a ? a.type : "off"); setNote(a ? a.note : ""); setDlg(ds); };
  const save = () => { set({ activities: { ...state.activities, [dlg]: { type, note: note || (type === "off" ? "停班日" : "調整上班日") } } }); setDlg(null); p.toast("已儲存活動設定"); };
  const remove = () => { const n = { ...state.activities }; delete n[dlg]; set({ activities: n }); setDlg(null); p.toast("已刪除活動"); };

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.activity(22)} title="活動設定"
        desc="設定停班日（國定假日、颱風地震等）與調整上班日（補班）。停班日不排值日生，補班日可排。"
        actions={isAdmin && <Button variant={edit ? "secondary" : "outline"} size="sm" iconLeft={D.DutyIcons.edit(15)} onClick={() => setEdit(!edit)}>{edit ? "完成編輯" : "編輯活動"}</Button>} />
      <div className="dm-card" style={{ padding: 18 }}>
        <D.MonthNav year={state.year} month={state.month}
          onPrev={() => set({ month: state.month === 0 ? 11 : state.month - 1, year: state.month === 0 ? state.year - 1 : state.year })}
          onNext={() => set({ month: state.month === 11 ? 0 : state.month + 1, year: state.month === 11 ? state.year + 1 : state.year })}
          onToday={() => set({ year: D.SEED_YEAR, month: D.SEED_MONTH })}
          right={edit && <span style={{ fontSize: 12.5, color: "var(--blue-600)" }}>點選日期以設定活動</span>} />
        <div style={{ height: 16 }} />
        <D.MonthCalendar year={state.year} month={state.month} renderCell={(ctx) => {
          const a = state.activities[ctx.dateStr];
          return (
            <D.DayCell ctx={ctx} tone={a ? (a.type === "off" ? "off" : "adjust") : (ctx.isWeekend ? "muted" : "default")}
              onClick={isAdmin && edit ? () => open(ctx.dateStr) : undefined} ribbon={a && <D.ActivityRibbon type={a.type} />}>
              {a ? <span style={{ fontSize: 11.5, fontWeight: 700, color: a.type === "off" ? "var(--danger-500)" : "var(--success-500)" }}>{a.note}</span>
                : (isAdmin && edit ? <span className="dm-addslot subtle">{D.DutyIcons.plus(14)}</span> : null)}
            </D.DayCell>
          );
        }} />
        <div style={{ marginTop: 14 }}>
          <D.Legend items={[["var(--danger-50)", "停班日 (不可排)"], ["var(--success-50)", "調整上班日 (可排)"], ["var(--neutral-100)", "週末"]]} />
        </div>
      </div>

      {dlg && (
        <div className="dm-modal-scrim" onClick={() => setDlg(null)}>
          <div className="dm-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-head">
              <div><div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>設定活動</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-strong)" }}>{D.fmtDate(dlg)}</div></div>
              <button className="dm-iconbtn" onClick={() => setDlg(null)}>{D.DutyIcons.x(18)}</button>
            </div>
            <div style={{ padding: "4px 22px 18px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", margin: "8px 0" }}>活動類型</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[["off", "停班日", "var(--danger-500)"], ["adjust", "調整上班日", "var(--success-500)"]].map(([v, l, c]) => (
                  <button key={v} onClick={() => setType(v)} className="dm-typebtn" style={{ borderColor: type === v ? c : "var(--border-default)", background: type === v ? `color-mix(in srgb, ${c} 10%, #fff)` : "#fff", color: type === v ? c : "var(--text-body)", fontWeight: type === v ? 700 : 500 }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", margin: "16px 0 6px" }}>活動註記</div>
              <input className="dm-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === "off" ? "例：端午節、颱風停班" : "例：端午節補班"} />
            </div>
            <div className="dm-modal-foot">
              {state.activities[dlg] ? <button className="dm-btn-text danger" onClick={remove}>{D.DutyIcons.trash(15)} 刪除</button> : <span />}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="dm-btn-text" onClick={() => setDlg(null)}>取消</button>
                <Button variant="primary" size="sm" onClick={save}>儲存</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window.Duty, { ActivityView });
