// Duty Mate — single-page harness.
// Each page in pages/*.html sets window.__DUTY_PAGE = "<id>" then renders <DutyPage>.
// The harness reuses the exact state shape + localStorage persistence as the
// integrated index.html, but routing between pages becomes real navigation
// (go("draft") → draft.html), so each page can be developed in isolation while
// still sharing one source of truth (localStorage "dutymate_v1").
// Exposes window.DutyPage + window.mountDutyPage(id).

const { useState, useEffect } = React;

const DUTY_ALLOWED = {
  admin: ["official", "exclude", "constraint", "draft", "activity", "worktask", "users", "stats", "import", "swap"],
  duty:  ["official", "exclude", "activity", "swap"],
};

const DUTY_VIEW_EXPORT = {
  official: "OfficialView", exclude: "ExcludeView", constraint: "ConstraintView",
  draft: "DraftView", activity: "ActivityView", worktask: "WorkTaskView",
  users: "UsersView", stats: "StatsView", import: "ImportView", swap: "SwapView",
};

const dutySeed = () => {
  const D = window.Duty;
  return {
    users: D.USERS, activities: D.SEED_ACTIVITIES, exclusions: D.SEED_EXCLUSIONS,
    draft: {}, official: {}, publishedMonths: [], taskList: D.SEED_TASKS,
    year: D.SEED_YEAR, month: D.SEED_MONTH,
  };
};
const dutyLoadState = () => { try { return JSON.parse(localStorage.getItem("dutymate_v1")); } catch (e) { return null; } };
const dutyLoadAccount = () => { try { return JSON.parse(localStorage.getItem("dutymate_account")); } catch (e) { return null; } };

function DutyPage({ page }) {
  const Duty = window.Duty;
  const [account, setAccount] = useState(dutyLoadAccount);
  const [viewRole, setViewRole] = useState(() => localStorage.getItem("dutymate_role") || "admin");
  const [state, setState] = useState(() => { const s = dutyLoadState(); return s ? { ...dutySeed(), ...s } : dutySeed(); });
  const [toast, setToast] = useState(null);

  window.__dmActivities = state.activities;
  useEffect(() => { try { localStorage.setItem("dutymate_v1", JSON.stringify(state)); } catch (e) {} }, [state]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const showToast = (msg) => setToast({ msg, id: Date.now() });
  const go = (pg) => { if (pg !== page) window.location.href = pg + ".html"; };

  if (!account) {
    return <Duty.Login onLogin={(u) => {
      const role = u.role === "admin" ? "admin" : "duty";
      localStorage.setItem("dutymate_account", JSON.stringify(u));
      localStorage.setItem("dutymate_role", role);
      if (DUTY_ALLOWED[role].includes(page)) { setAccount(u); setViewRole(role); }
      else window.location.href = "official.html";
    }} />;
  }

  // Role can't access this page → bounce to home.
  if (!DUTY_ALLOWED[viewRole].includes(page)) {
    window.location.replace("official.html");
    return null;
  }

  const onNav = (id) => {
    if (id === "__logout") { localStorage.removeItem("dutymate_account"); setAccount(null); return; }
    if (id !== page) window.location.href = id + ".html";
  };
  const onRole = (r) => {
    localStorage.setItem("dutymate_role", r);
    setViewRole(r);
    if (!DUTY_ALLOWED[r].includes(page)) window.location.href = "official.html";
  };

  const View = Duty[DUTY_VIEW_EXPORT[page]] || Duty.OfficialView;
  const props = { state, set, viewRole, account, toast: showToast, go };

  return (
    <Duty.AppShell account={account} viewRole={viewRole} onRole={onRole} page={page} onNav={onNav}>
      <View {...props} />
      {toast && <div className="dm-toast" key={toast.id}>{Duty.DutyIcons.check(16)}{toast.msg}</div>}
    </Duty.AppShell>
  );
}

function mountDutyPage(id) {
  ReactDOM.createRoot(document.getElementById("root")).render(<DutyPage page={id} />);
}

Object.assign(window, { DutyPage, mountDutyPage });
