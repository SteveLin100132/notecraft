// Duty Mate 值日生排班 — shared data, icons, helpers, recommendation engine.
// Exposes window.Duty namespace.

/* ----------------------------- Icons (line, ~1.9 stroke) ----------------------------- */
const ic = (paths, s = 20) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);
const DutyIcons = {
  calendar: (s) => ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>, s),
  exclude: (s) => ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9.5 14.5l5 5M14.5 14.5l-5 5"/></>, s),
  constraint: (s) => ic(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>, s),
  draft: (s) => ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m11.5 13-2.5 2.5L8 18l2.5-1 2.5-2.5a1 1 0 0 0-1.5-1.5Z"/></>, s),
  official: (s) => ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></>, s),
  activity: (s) => ic(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></>, s),
  users: (s) => ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></>, s),
  stats: (s) => ic(<><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="13" y="7" width="3" height="10"/></>, s),
  import: (s) => ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>, s),
  swap: (s) => ic(<><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></>, s),
  logout: (s) => ic(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>, s),
  bell: (s) => ic(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>, s),
  chevL: (s) => ic(<path d="m15 18-6-6 6-6"/>, s),
  chevR: (s) => ic(<path d="m9 18 6-6-6-6"/>, s),
  chevDown: (s) => ic(<path d="m6 9 6 6 6-6"/>, s),
  plus: (s) => ic(<path d="M12 5v14M5 12h14"/>, s),
  x: (s) => ic(<path d="M18 6 6 18M6 6l12 12"/>, s),
  check: (s) => ic(<path d="M20 6 9 17l-5-5"/>, s),
  menu: (s) => ic(<path d="M4 6h16M4 12h16M4 18h16"/>, s),
  filter: (s) => ic(<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>, s),
  spark: (s) => ic(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></>, s),
  trash: (s) => ic(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>, s),
  edit: (s) => ic(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></>, s),
  warn: (s) => ic(<><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/></>, s),
  note: (s) => ic(<><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6M9 13h6M9 17h4"/></>, s),
  task: (s) => ic(<><path d="M16 4h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 3h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="m9.5 13 1.8 1.8 3.7-3.8"/></>, s),
  user: (s) => ic(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, s),
  lock: (s) => ic(<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>, s),
  mail: (s) => ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></>, s),
};

/* ----------------------------- Sample data ----------------------------- */
const USERS = [
  { id: "u1", name: "劉亭筠", role: "duty",  include: true,  email: "tingyun.liu@trendlink.com.tw" },
  { id: "u2", name: "張耘瑄", role: "duty",  include: true,  email: "yunxuan.chang@trendlink.com.tw" },
  { id: "u3", name: "吳金燕", role: "admin", include: true,  email: "jinyan.wu@trendlink.com.tw" },
  { id: "u4", name: "陳舒珊", role: "duty",  include: true,  email: "shushan.chen@trendlink.com.tw" },
  { id: "u5", name: "Vicky Huang", role: "duty", include: false, email: "vicky.huang@trendlink.com.tw" },
  { id: "u6", name: "黃喻靖", role: "duty",  include: true,  email: "yujing.huang@trendlink.com.tw" },
  { id: "u7", name: "黃宣凱", role: "duty",  include: true,  email: "xuankai.huang@trendlink.com.tw" },
];

// "current" month for the demo: 2026 年 6 月
const SEED_YEAR = 2026, SEED_MONTH = 5; // 0-indexed (June)

// Activities: 端午節 (停班) + 補班 (調整上班日)
const SEED_ACTIVITIES = {
  "2026-06-19": { type: "off",    note: "端午節" },
  "2026-06-20": { type: "adjust", note: "端午節補班" },
};

// 排除時段（各值日生不能排的日期）
const SEED_EXCLUSIONS = {
  u1: ["2026-06-08", "2026-06-09"],
  u2: ["2026-06-15"],
  u4: ["2026-06-22", "2026-06-23"],
  u6: ["2026-06-11"],
  u7: ["2026-06-03", "2026-06-29"],
};

const SEED_TASKS = [
  { id: "t1", text: "上午 8:30 前開啟辦公室門窗與冷氣" },
  { id: "t2", text: "倒茶水間與影印區垃圾、更換垃圾袋" },
  { id: "t3", text: "補充茶水間紙杯與飲用水" },
  { id: "t4", text: "下班前巡檢會議室電源與門窗" },
];

/* ----------------------------- Date helpers ----------------------------- */
const WK = ["日", "一", "二", "三", "四", "五", "六"];
const pad2 = (n) => String(n).padStart(2, "0");
const dstr = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const isWeekend = (date) => { const w = date.getDay(); return w === 0 || w === 6; };
const MONTH_LABEL = (y, m) => `${y} 年 ${m + 1} 月`;

// schedulable: a base weekday that isn't 停班日, OR a weekend that's 調整上班日
function isSchedulable(date, dateStr, activities) {
  const a = activities[dateStr];
  if (a && a.type === "off") return false;
  if (isWeekend(date)) return !!(a && a.type === "adjust");
  return true;
}

function schedulableDays(year, month, activities) {
  const out = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const date = new Date(year, month, d);
    const ds = dstr(year, month, d);
    if (isSchedulable(date, ds, activities)) out.push(ds);
  }
  return out;
}

// pool = users that are 列入排班
const schedulingPool = (users) => users.filter((u) => u.include);

function counts(schedule, pool) {
  const c = {}; pool.forEach((u) => (c[u.id] = 0));
  Object.values(schedule).forEach((uid) => { if (c[uid] != null) c[uid]++; });
  return c;
}

// 推薦演算法：排除停班日、納入調整上班日、平均分配、間隔 ≥3 天、避開排除時段。
// 不覆蓋既有指派（PRD：推薦僅針對尚未排班的部分）。
function recommend(year, month, users, exclusions, activities, existing = {}) {
  const pool = schedulingPool(users);
  const days = schedulableDays(year, month, activities);
  const result = { ...existing };
  const cnt = counts(result, pool);
  const last = {};
  Object.keys(result).forEach((ds) => {
    const d = parseInt(ds.slice(-2), 10);
    if (last[result[ds]] == null || d > last[result[ds]]) last[result[ds]] = d;
  });
  const open = days.filter((ds) => !result[ds]);
  for (const ds of open) {
    const dnum = parseInt(ds.slice(-2), 10);
    let cand = pool.filter((u) => !(exclusions[u.id] || []).includes(ds));
    const spaced = cand.filter((u) => last[u.id] == null || dnum - last[u.id] >= 3);
    let use = spaced.length ? spaced : cand;
    if (!use.length) continue; // 無人可排 → 留空（發布時提醒）
    use = use.slice().sort((a, b) => (cnt[a.id] - cnt[b.id]) || ((last[a.id] || 0) - (last[b.id] || 0)));
    const pick = use[0];
    result[ds] = pick.id;
    cnt[pick.id]++; last[pick.id] = dnum;
  }
  return result;
}

const userById = (users, id) => users.find((u) => u.id === id);
const roleLabel = (r) => (r === "admin" ? "排班負責人" : "值日生");

window.Duty = {
  DutyIcons, USERS, SEED_YEAR, SEED_MONTH, SEED_ACTIVITIES, SEED_EXCLUSIONS, SEED_TASKS,
  WK, pad2, dstr, daysInMonth, isWeekend, MONTH_LABEL, isSchedulable, schedulableDays,
  schedulingPool, counts, recommend, userById, roleLabel,
};
