// Duty Mate — Login screen + App shell (sidebar, topbar, role switch) + shared atoms.
// Exposes window.Duty.Login, AppShell, and atoms.

const D = window.Duty;

/* ----------------------------- Shared atoms ----------------------------- */
function NameChip({ name, tone = "blue", absent, onRemove, small }) {
  const tones = {
    blue:   ["var(--blue-50)", "var(--blue-700)", "color-mix(in srgb,var(--blue-500) 30%, transparent)"],
    gold:   ["var(--orange-50)", "var(--orange-600)", "color-mix(in srgb,var(--orange-400) 36%, transparent)"],
    me:     ["var(--blue-600)", "#fff", "var(--blue-600)"],
  };
  const [bg, fg, bd] = tones[tone] || tones.blue;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%",
      padding: small ? "2px 7px" : "3px 9px", borderRadius: 999, background: bg, color: fg,
      border: `1px solid ${bd}`, fontSize: small ? 11.5 : 12.5, fontWeight: 700,
      textDecoration: absent ? "line-through" : "none", opacity: absent ? 0.7 : 1, whiteSpace: "nowrap",
    }}>
      {name}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="移除"
          style={{ border: "none", background: "none", padding: 0, display: "flex", cursor: "pointer", color: "currentColor", opacity: 0.7 }}>
          {D.DutyIcons.x(12)}
        </button>
      )}
    </span>
  );
}

function ActivityRibbon({ type }) {
  if (!type) return null;
  const map = {
    off:    ["var(--danger-500)", "停班"],
    adjust: ["var(--success-500)", "補班"],
  }[type];
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 800, color: "#fff", background: map[0],
      borderRadius: 5, padding: "1px 6px", letterSpacing: ".03em", lineHeight: 1.5,
    }}>{map[1]}</span>
  );
}

function PageHeader({ icon, title, desc, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blue-50)", color: "var(--blue-600)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, color: "var(--text-strong)", margin: 0, lineHeight: 1.2 }}>{title}</h1>
          {desc && <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "5px 0 0", lineHeight: 1.5 }}>{desc}</p>}
        </div>
      </div>
      {actions && <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
      {items.map(([color, label]) => (
        <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: color, flex: "none" }} />{label}
        </span>
      ))}
    </div>
  );
}

/* ----------------------------- Person stat panel ----------------------------- */
function StatPanel({ users, schedule, year, month, title = "人員排班統計", highlightId, onPick }) {
  const pool = D.schedulingPool(users);
  const days = D.schedulableDays(year, month, window.__dmActivities || {});
  const avg = pool.length ? days.length / pool.length : 0;
  const cnt = D.counts(schedule, pool);
  return (
    <div className="dm-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h3 style={{ fontSize: 15, color: "var(--text-strong)", margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>應排 {days.length} 天</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>平均次數 <strong style={{ color: "var(--orange-600)" }}>{avg.toFixed(1)}</strong> 次 / 人</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {pool.map((u) => {
          const c = cnt[u.id];
          const reached = avg > 0 ? c >= Math.round(avg) : c > 0;
          const pct = avg > 0 ? Math.min(100, (c / avg) * 100) : (c > 0 ? 100 : 0);
          const on = highlightId === u.id;
          return (
            <div key={u.id} onClick={() => onPick && onPick(u.id)} style={{ cursor: onPick ? "pointer" : "default", opacity: highlightId && !on ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "var(--blue-700)" : "var(--text-body)" }}>{u.name}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: reached ? "var(--success-500)" : "var(--orange-600)", fontVariantNumeric: "tabular-nums" }}>
                  {c} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>/ {avg.toFixed(1)}</span>
                </span>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "var(--neutral-100)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: reached ? "var(--blue-500)" : "var(--gradient-accent)", transition: "width .35s var(--ease-out)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- Login ----------------------------- */
function Login({ onLogin }) {
  const [email, setEmail] = React.useState("jinyan.wu@trendlink.com.tw");
  const [pw, setPw] = React.useState("dutymate2026");
  const [err, setErr] = React.useState("");
  const { Input, Button } = window.TrendLinkDesignSystem_b2a0d6;

  const submit = (e) => {
    e.preventDefault();
    const u = D.USERS.find((x) => x.email === email.trim().toLowerCase());
    if (!u || pw.length < 8) { setErr("帳號不存在或密碼錯誤"); return; }
    onLogin(u);
  };

  return (
    <div className="dm-login">
      <form className="dm-login-card" onSubmit={submit}>
        <div className="dm-brand" style={{ marginBottom: 26 }}>
          <span className="dm-logo-mark">值</span>
          <div>
            <div className="dm-wordmark">Duty Mate</div>
            <div className="dm-wordmark-sub">值日生排班 · 聯和趨動</div>
          </div>
        </div>
        <h1 style={{ fontSize: 22, color: "var(--text-strong)", margin: "0 0 6px" }}>歡迎回來</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 24px" }}>請使用公司郵箱登入排班系統</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="公司郵箱" type="email" value={email} iconLeft={D.DutyIcons.mail(18)}
            onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="you@trendlink.com.tw" />
          <Input label="密碼" type="password" value={pw} iconLeft={D.DutyIcons.lock(18)}
            onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="至少 8 碼，含字母與數字"
            error={err || undefined} />
        </div>
        <Button type="submit" variant="primary" fullWidth size="lg" style={{ marginTop: 24 }}>登入系統</Button>
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.7 }}>
          示範帳號已預填（排班負責人 · 吳金燕）<br/>帳號由管理員建立，忘記密碼請洽運維人員
        </div>
      </form>
      <div className="dm-login-aside">
        <div style={{ maxWidth: 360 }}>
          <div className="tl-eyebrow" style={{ color: "var(--orange-300)" }}>INTERNAL TOOL</div>
          <h2 style={{ color: "#fff", fontSize: 34, margin: "16px 0 14px", lineHeight: 1.3 }}>集眾人之力<br/>把排班交給系統</h2>
          <p style={{ color: "rgba(255,255,255,.82)", fontSize: 15, lineHeight: 1.9 }}>
            值日生自助填寫不能排的時間，系統一鍵產生平均、無衝突的推薦班表，負責人微調後即可發布——把繁瑣的協調從一個人身上解放出來。
          </p>
          <div style={{ display: "flex", gap: 26, marginTop: 30 }}>
            {[["7", "位成員"], ["1鍵", "產生推薦"], ["≥3天", "排班間隔"]].map(([v, l]) => (
              <div key={l}><div style={{ color: "#fff", fontSize: 26, fontWeight: 900 }}>{v}</div><div style={{ color: "rgba(255,255,255,.7)", fontSize: 12.5, marginTop: 3 }}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- App shell ----------------------------- */
const NAV = [
  { sect: "排班作業" },
  { id: "official",   label: "正式班表",   icon: "official",   roles: ["admin", "duty"] },
  { id: "exclude",    label: "排除時段",   icon: "exclude",    roles: ["admin", "duty"] },
  { id: "constraint", label: "排班限制表", icon: "constraint", roles: ["admin"] },
  { id: "draft",      label: "草稿班表",   icon: "draft",      roles: ["admin"] },
  { sect: "設定與管理" },
  { id: "activity",   label: "活動設定",   icon: "activity",   roles: ["admin", "duty"] },
  { id: "worktask",   label: "工作任務設定", icon: "task",     roles: ["admin"] },
  { id: "users",      label: "用戶管理",   icon: "users",      roles: ["admin"] },
  { id: "stats",      label: "出勤統計",   icon: "stats",      roles: ["admin"] },
  { id: "import",     label: "過往班表匯入", icon: "import",   roles: ["admin"] },
  { id: "swap",       label: "申請換班",   icon: "swap",       roles: ["admin", "duty"], soon: true },
];

function AppShell({ account, viewRole, onRole, page, onNav, children }) {
  const [openMobile, setOpenMobile] = React.useState(false);
  const items = NAV.filter((n) => n.sect || n.roles.includes(viewRole));
  const current = NAV.find((n) => n.id === page);

  const navList = (
    <nav className="dm-nav">
      {items.map((n, i) =>
        n.sect ? (
          <div key={"s" + i} className="dm-nav-sect">{n.sect}</div>
        ) : (
          <button key={n.id} className={"dm-nav-item" + (page === n.id ? " active" : "")}
            onClick={() => { onNav(n.id); setOpenMobile(false); }}>
            <span className="dm-nav-ic">{D.DutyIcons[n.icon](19)}</span>
            <span>{n.label}</span>
            {n.soon && <span className="dm-soon">即將推出</span>}
          </button>
        )
      )}
    </nav>
  );

  return (
    <div className="dm-app">
      <aside className="dm-sidebar">
        <div className="dm-brand dm-sidebar-brand">
          <span className="dm-logo-mark">值</span>
          <div>
            <div className="dm-wordmark">Duty Mate</div>
            <div className="dm-wordmark-sub">值日生排班</div>
          </div>
        </div>
        {navList}
        <div className="dm-sidebar-foot">
          <div className="dm-help">
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" }}>每月排班週期</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.6 }}>填寫排除 → 產生推薦 → 微調 → 發布 → 統計</div>
          </div>
        </div>
      </aside>

      {openMobile && <div className="dm-scrim" onClick={() => setOpenMobile(false)} />}
      <aside className={"dm-sidebar dm-sidebar-mobile" + (openMobile ? " open" : "")}>
        <div className="dm-brand dm-sidebar-brand">
          <span className="dm-logo-mark">值</span>
          <div><div className="dm-wordmark">Duty Mate</div><div className="dm-wordmark-sub">值日生排班</div></div>
          <button className="dm-iconbtn" style={{ marginLeft: "auto" }} onClick={() => setOpenMobile(false)}>{D.DutyIcons.x(18)}</button>
        </div>
        {navList}
      </aside>

      <div className="dm-main">
        <header className="dm-topbar">
          <button className="dm-iconbtn dm-only-mobile" onClick={() => setOpenMobile(true)} aria-label="選單">{D.DutyIcons.menu(20)}</button>
          <div className="dm-topbar-title">
            <span className="dm-only-desktop" style={{ color: "var(--blue-600)" }}>{current && D.DutyIcons[current.icon](18)}</span>
            <span>{current ? current.label : "Duty Mate"}</span>
          </div>
          <div className="dm-topbar-right">
            <div className="dm-roleswitch" role="tablist" aria-label="視角切換">
              <button className={viewRole === "admin" ? "on" : ""} onClick={() => onRole("admin")}>負責人</button>
              <button className={viewRole === "duty" ? "on" : ""} onClick={() => onRole("duty")}>值日生預覽</button>
            </div>
            <button className="dm-iconbtn dm-only-desktop" aria-label="通知">{D.DutyIcons.bell(19)}</button>
            <div className="dm-user">
              <span className="dm-avatar">{(viewRole === "duty" ? "劉" : account.name[0])}</span>
              <div className="dm-only-desktop" style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)" }}>{viewRole === "duty" ? "劉亭筠" : account.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{D.roleLabel(viewRole)}</div>
              </div>
            </div>
            <button className="dm-iconbtn" aria-label="登出" onClick={() => onNav("__logout")}>{D.DutyIcons.logout(19)}</button>
          </div>
        </header>
        {viewRole === "duty" && (
          <div className="dm-previewbar">{D.DutyIcons.user(15)} 值日生視角預覽 — 僅顯示值日生可使用的功能與自己的資料。<button onClick={() => onRole("admin")}>回到負責人視角</button></div>
        )}
        <main className="dm-content">{children}</main>
      </div>
    </div>
  );
}

Object.assign(window.Duty, { Login, AppShell, NameChip, ActivityRibbon, PageHeader, Legend, StatPanel });
