// Duty Mate — 草稿班表（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.DraftView.
const D = window.Duty;

function DraftView(p) {
  const { state, set } = p;
  const { Button } = window.TrendLinkDesignSystem_b2a0d6;
  const monthKey = `${state.year}-${D.pad2(state.month + 1)}`;
  const published = state.publishedMonths.includes(monthKey);
  const draft = state.draft[monthKey] || {};
  const [dlg, setDlg] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);

  const saveDraft = (next) => set({ draft: { ...state.draft, [monthKey]: next } });
  const doRecommend = () => {
    const r = D.recommend(state.year, state.month, state.users, state.exclusions, state.activities, draft);
    saveDraft(r); p.toast("已產生推薦班表（僅填補未排班日）");
  };
  const doClear = () => { saveDraft({}); setConfirm(null); p.toast("已清除草稿班表"); };
  const assign = (uid) => { saveDraft({ ...draft, [dlg]: uid }); setDlg(null); };
  const clear = () => { const n = { ...draft }; delete n[dlg]; saveDraft(n); setDlg(null); };
  const publish = () => {
    const days = D.schedulableDays(state.year, state.month, state.activities);
    const blanks = days.filter((d) => !draft[d]).length;
    setConfirm(null);
    set({
      official: { ...state.official, [monthKey]: { ...draft } },
      publishedMonths: state.publishedMonths.includes(monthKey) ? state.publishedMonths : [...state.publishedMonths, monthKey],
    });
    p.toast(blanks ? `已發布，但有 ${blanks} 天尚未排班，可於正式班表補上` : "已發布正式班表 🎉");
    p.go("official");
  };

  const days = D.schedulableDays(state.year, state.month, state.activities);
  const filled = days.filter((d) => draft[d]).length;

  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.draft(22)} title="草稿班表"
        desc="一鍵產生平均、無衝突的推薦班表，可手動點格子指派或移除值日生；發布後轉為正式班表。"
        actions={!published && (
          <React.Fragment>
            <Button variant="outline" size="sm" iconLeft={D.DutyIcons.trash(15)} onClick={() => setConfirm("clear")}>清除</Button>
            <Button variant="secondary" size="sm" onClick={() => p.toast("已儲存草稿")}>儲存草稿</Button>
            <Button variant="primary" size="sm" iconLeft={D.DutyIcons.spark(15)} onClick={doRecommend}>一鍵產生推薦</Button>
          </React.Fragment>
        )} />

      {published && (
        <div className="dm-banner warn" style={{ marginBottom: 16 }}>
          {D.DutyIcons.lock(16)} {D.MONTH_LABEL(state.year, state.month)}已發布，草稿鎖定。如需調整請至「正式班表」編輯。
        </div>
      )}

      <div className="dm-split">
        <div className="dm-card" style={{ padding: 18 }}>
          <D.MonthNav year={state.year} month={state.month}
            onPrev={() => set({ month: state.month === 0 ? 11 : state.month - 1, year: state.month === 0 ? state.year - 1 : state.year })}
            onNext={() => set({ month: state.month === 11 ? 0 : state.month + 1, year: state.month === 11 ? state.year + 1 : state.year })}
            right={<span style={{ fontSize: 12.5, color: filled === days.length ? "var(--success-500)" : "var(--text-muted)", fontWeight: 600 }}>已排 {filled}/{days.length} 天</span>} />
          <div style={{ height: 16 }} />
          <D.MonthCalendar year={state.year} month={state.month} renderCell={(ctx) => {
            const a = state.activities[ctx.dateStr];
            const schedulable = D.isSchedulable(ctx.date, ctx.dateStr, state.activities);
            const off = a && a.type === "off";
            const who = draft[ctx.dateStr];
            const canEdit = !published && schedulable;
            return (
              <D.DayCell ctx={ctx} tone={off ? "off" : a && a.type === "adjust" ? "adjust" : (!schedulable ? "muted" : "default")}
                disabled={off} onClick={canEdit ? () => setDlg(ctx.dateStr) : undefined}
                ribbon={a && <D.ActivityRibbon type={a.type} />}>
                {who ? <D.NameChip name={D.userById(state.users, who).name} small />
                  : (canEdit ? <span className="dm-addslot">{D.DutyIcons.plus(15)}</span> : null)}
                {a && a.note && <div className="dm-daynote">{a.note}</div>}
              </D.DayCell>
            );
          }} />
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <D.Legend items={[["var(--blue-50)", "已指派"], ["var(--success-50)", "補班"], ["var(--danger-50)", "停班 (鎖定)"]]} />
            {!published && <Button variant="primary" iconLeft={D.DutyIcons.check(16)} onClick={() => setConfirm("publish")}>發布班表</Button>}
          </div>
        </div>
        <D.StatPanel users={state.users} schedule={draft} year={state.year} month={state.month} title="人員排班統計（即時）" />
      </div>

      {!published && <D.AssignDialog dateStr={dlg} users={state.users} exclusions={state.exclusions}
        assignedId={dlg ? draft[dlg] : null} onAssign={assign} onClear={clear} onClose={() => setDlg(null)} />}

      {confirm && (
        <div className="dm-modal-scrim" onClick={() => setConfirm(null)}>
          <div className="dm-modal sm" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "22px 22px 6px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: confirm === "clear" ? "var(--danger-500)" : "var(--blue-600)" }}>{confirm === "clear" ? D.DutyIcons.warn(22) : D.DutyIcons.check(22)}</span>
                <h3 style={{ margin: 0, fontSize: 17, color: "var(--text-strong)" }}>{confirm === "clear" ? "清除草稿班表？" : "發布正式班表？"}</h3>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
                {confirm === "clear" ? "將清除本月所有排班資料，回到初始狀態，此動作無法復原。"
                  : `將 ${D.MONTH_LABEL(state.year, state.month)} 草稿發布為正式班表，全體值日生即可查看。${filled < days.length ? `目前有 ${days.length - filled} 天尚未排班。` : ""}`}
              </p>
            </div>
            <div className="dm-modal-foot">
              <button className="dm-btn-text" onClick={() => setConfirm(null)}>取消</button>
              <Button variant={confirm === "clear" ? "secondary" : "primary"} size="sm" onClick={confirm === "clear" ? doClear : publish}>
                {confirm === "clear" ? "確認清除" : "確認發布"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window.Duty, { DraftView });
