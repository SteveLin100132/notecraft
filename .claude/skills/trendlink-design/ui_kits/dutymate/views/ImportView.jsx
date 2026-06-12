// Duty Mate — 過往班表匯入（單一頁面元件）
// 依賴：DutyKit / DutyCalendar / DutyShell / DutyViewShared 先載入。Exposes window.Duty.ImportView.
const D = window.Duty;

function ImportView(p) {
  const { Button, Badge } = window.TrendLinkDesignSystem_b2a0d6;
  const [done, setDone] = React.useState(false);
  const sample = [["2026-05-02", "劉亭筠"], ["2026-05-05", "張耘瑄"], ["2026-05-06", "黃喻靖"], ["2026-05-07", "陳舒珊"], ["2026-05-08", "黃宣凱"]];
  return (
    <div>
      <D.PageHeader icon={D.DutyIcons.import(22)} title="過往班表匯入" desc="匯入過往的值日生班表，累計截至目前的出勤統計。支援 CSV（日期, 值日生姓名）。" />
      <div className="dm-split">
        <div className="dm-card" style={{ padding: 22 }}>
          <div className="dm-drop" onClick={() => setDone(true)}>
            <span style={{ color: "var(--blue-500)" }}>{D.DutyIcons.import(34)}</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginTop: 10 }}>拖曳檔案到此處，或點擊上傳</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>CSV / Excel · 最大 5MB</div>
          </div>
          <div className="dm-banner" style={{ marginTop: 16 }}>{D.DutyIcons.note(16)} 格式範例：<code style={{ fontFamily: "var(--font-latin)" }}>日期,值日生姓名</code>　每列一筆，日期為 YYYY-MM-DD。</div>
        </div>
        <div className="dm-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontWeight: 700, color: "var(--text-strong)", fontSize: 14 }}>預覽 · 2026 年 5 月.csv</span>
            {done ? <Badge tone="success" variant="soft">已解析 {sample.length} 筆</Badge> : <Badge tone="neutral" variant="soft">待上傳</Badge>}
          </div>
          <table className="dm-table"><thead><tr><th>日期</th><th>值日生</th><th style={{ textAlign: "right" }}>狀態</th></tr></thead>
            <tbody>{sample.map(([d, n]) => (
              <tr key={d}><td style={{ fontFamily: "var(--font-latin)", color: "var(--text-body)" }}>{d}</td><td style={{ fontWeight: 600, color: "var(--text-strong)" }}>{n}</td>
                <td style={{ textAlign: "right" }}>{done ? <Badge tone="success" variant="soft">對應成功</Badge> : <span style={{ color: "var(--text-muted)", fontSize: 12.5 }}>—</span>}</td></tr>
            ))}</tbody>
          </table>
          <div className="dm-modal-foot"><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{done ? "確認無誤後匯入，將併入出勤統計。" : ""}</span>
            <Button variant="primary" size="sm" disabled={!done} onClick={() => p.toast("已匯入 5 筆過往班表")}>匯入</Button></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { ImportView });
