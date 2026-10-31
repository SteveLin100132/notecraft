(() => {
// NoteCraft 筆記頁提案 — 互動視覺化元件（跟著各方案的 token 變色）
const { useState: vzUS } = React;

const leaveDays = (y) => (y < 0.5 ? 0 : y < 1 ? 3 : y < 2 ? 7 : y < 3 ? 10 : y < 5 ? 14 : y < 10 ? 15 : Math.min(30, 15 + Math.floor(y) - 9));
const leaveTier = (y) =>
  y < 0.5 ? "未滿 6 個月，尚未取得特休。" :
  y < 1 ? "6 個月以上、未滿 1 年：3 日。" :
  y < 2 ? "1 年以上、未滿 2 年：7 日。" :
  y < 3 ? "2 年以上、未滿 3 年：10 日。" :
  y < 5 ? "3 年以上、未滿 5 年：每年 14 日。" :
  y < 10 ? "5 年以上、未滿 10 年：每年 15 日。" :
  y >= 24 ? "已達上限：每年 30 日。" : "10 年以上：每 1 年加給 1 日，加至 30 日為止。";

function VzLeave() {
  const [y, setY] = vzUS(6);
  const xs = [0.5]; for (let i = 1; i <= 25; i++) xs.push(i);
  const on = y >= 1 ? Math.floor(y) : y >= 0.5 ? 0.5 : null;
  return (
    <div>
      <div className="vz-row">
        <div><div className="vz-lab">年資</div><div className="vz-big">{y}<small>年</small></div></div>
        <div><div className="vz-lab">當年度特休</div><div className="vz-big gold">{leaveDays(y)}<small>日</small></div></div>
        <div className="vz-tier">{leaveTier(y)}</div>
      </div>
      <input className="vz-range" type="range" min="0" max="25" step="0.5" value={y} onChange={(e) => setY(+e.target.value)} aria-label="年資（年）" />
      <div className="vz-bars" role="group" aria-label="各年資的特休天數">
        {xs.map((x) => (
          <button key={x} className={"vz-bar" + (x === on ? " on" : on !== null && x < on ? " past" : "")} style={{ height: (leaveDays(x) / 30) * 100 + "%" }} onClick={() => setY(x)} title={x + " 年：" + leaveDays(x) + " 日"} aria-label={x + " 年，" + leaveDays(x) + " 日"} />
        ))}
      </div>
      <div className="vz-axis" aria-hidden="true">{xs.map((x) => <span key={x}>{[0.5, 5, 10, 15, 20, 25].includes(x) ? x : ""}</span>)}</div>
    </div>
  );
}

const VZ_FLOWS = {
  short: { label: "1–3 日", steps: [
    ["送出申請", "員工", "選擇假別與時段後送出，系統即時檢查剩餘天數。"],
    ["代理人確認", "職務代理人", "代理人需於 24 小時內確認，逾時會通知申請人改派。"],
    ["主管簽核", "直屬主管", "主管可核准、退回或要求補件；核准後立即扣除餘額。"],
    ["歸檔完成", "系統", "寫入假勤紀錄並同步至排班表與薪資計算。"]] },
  long: { label: "4 日以上", steps: [
    ["送出申請", "員工", "連續 4 日以上的特休需提前 7 日申請。"],
    ["代理人確認", "職務代理人", "代理人需確認整段期間皆可代理。"],
    ["主管簽核", "直屬主管", "主管確認工作交接安排。"],
    ["部門經理", "部門經理", "超過 3 日由部門經理加簽，確認人力配置。"],
    ["HR 確認", "人資", "HR 檢查與國定假日、補休是否重疊。"],
    ["歸檔完成", "系統", "寫入假勤紀錄並同步至排班表與薪資計算。"]] },
  timeout: { label: "代理人逾時", steps: [
    ["送出申請", "員工", "申請送出後進入代理人確認。"],
    ["代理人逾時", "職務代理人", "超過 24 小時未確認，流程暫停並通知申請人。", "warn"],
    ["改派代理人", "員工", "申請人改選其他代理人，原紀錄保留於簽核歷程。"],
    ["主管簽核", "直屬主管", "主管可在歷程中看到改派原因。"],
    ["歸檔完成", "系統", "寫入假勤紀錄並同步至排班表與薪資計算。"]] },
};
function VzFlow() {
  const [k, setK] = vzUS("short");
  const [cur, setCur] = vzUS(1);
  const [sel, setSel] = vzUS(1);
  const steps = VZ_FLOWS[k].steps;
  const pick = (nk) => { setK(nk); setCur(1); setSel(1); };
  const next = () => { const n = Math.min(cur + 1, steps.length); setCur(n); setSel(Math.min(n, steps.length - 1)); };
  const done = cur >= steps.length;
  const s = steps[sel];
  return (
    <div>
      <div className="vz-seg" role="radiogroup" aria-label="情境">
        {Object.entries(VZ_FLOWS).map(([id, f]) => <button key={id} role="radio" aria-checked={k === id} className={k === id ? "on" : ""} onClick={() => pick(id)}>{f.label}</button>)}
      </div>
      <div className="vz-flow">
        {steps.map((st, i) => {
          const state = i < cur || done ? (st[3] === "warn" ? "warn" : "done") : i === cur ? "cur" : "";
          return (
            <button key={k + i} className={"vz-node " + state + (sel === i ? " sel" : "")} onClick={() => setSel(i)} aria-pressed={sel === i}>
              <span className="vz-dot">{state === "done" ? <NpI n="check" s={14} sw={2.6} /> : state === "warn" ? "!" : i + 1}</span>
              <span className="vz-nl">{st[0]}</span><span className="vz-ns">{st[1]}</span>
            </button>
          );
        })}
      </div>
      <div className="vz-detail" aria-live="polite"><b>{s[0]}</b>・{s[1]}　{s[2]}</div>
      <div className="vz-acts">
        <button className="wb-btn-solid" onClick={next} disabled={done} style={done ? { opacity: .5, cursor: "default" } : null}><NpI n="play" s={12} c="#fff" />下一步</button>
        <button className="wb-btn-ghost" onClick={() => pick(k)}><NpI n="reset" s={13} />重設</button>
        <span className="s">{done ? "流程已完成" : "目前在第 " + (cur + 1) + " / " + steps.length + " 步"}</span>
      </div>
    </div>
  );
}

const VZ_CATS = [["特休", "var(--wb-blue-l)"], ["病假", "var(--wb-ok)"], ["事假", "var(--wb-gold)"], ["公假", "#8a5cc2"]];
const VZ_DEPT = [["業務部", [168, 42, 36, 12]], ["研發部", [212, 30, 18, 24]], ["客服部", [96, 58, 44, 6]], ["行政部", [74, 22, 16, 30]]];
function VzMix() {
  const [off, setOff] = vzUS({});
  const [hv, setHv] = vzUS(null);
  const vis = (i) => !off[i];
  const tot = (vals) => vals.reduce((a, v, i) => a + (vis(i) ? v : 0), 0);
  const max = Math.max(1, ...VZ_DEPT.map(([, v]) => tot(v)));
  return (
    <div>
      <div className="vz-legend">
        {VZ_CATS.map(([n, c], i) => <button key={n} className={"vz-chip" + (vis(i) ? "" : " off")} style={{ "--c": c }} aria-pressed={vis(i)} onClick={() => setOff({ ...off, [i]: !off[i] })}><i />{n}</button>)}
      </div>
      {VZ_DEPT.map(([d, vals]) => {
        const t = tot(vals);
        return (
          <div key={d} className="vz-st">
            <span className="n">{d}</span>
            <div className="vz-track" style={{ width: (t / max) * 100 + "%" }} onMouseLeave={() => setHv(null)}>
              {vals.map((v, i) => vis(i) ? <button key={i} className="vz-sg" style={{ "--c": VZ_CATS[i][1], width: (v / t) * 100 + "%" }} onMouseEnter={() => setHv([d, i, v, t])} onFocus={() => setHv([d, i, v, t])} aria-label={d + " " + VZ_CATS[i][0] + " " + v + " 小時"} /> : null)}
            </div>
            <span className="v">{t} 小時</span>
          </div>
        );
      })}
      <div className="vz-hint" aria-live="polite">{hv ? <><b>{hv[0]}・{VZ_CATS[hv[1]][0]}</b>　{hv[2]} 小時，占該部門 {Math.round((hv[2] / hv[3]) * 100)}%</> : "滑過色塊查看時數；點圖例可隱藏假別。"}</div>
    </div>
  );
}

Object.assign(window, { VzLeave, VzFlow, VzMix });
})();
