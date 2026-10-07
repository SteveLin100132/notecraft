// 工作台 Prototype — 請假系統範例筆記（define / include / :ref），build 期已解析完成的結果
// Inline：string | {b} | {code} | {badge} | {a} 一般連結 | {tip, d} 既有 :tip | {ref:id, t} 行內引用
// Block：h2 h3 p ul table adm code tabs steps img define include
const RF_FOLDER = "請假系統";
const Q = (t) => ({ ref: "hr.term-quota", t: t || "年度額度" });
const RF_DEFS = {
  "hr.role-admin": { label: "管理員", src: "hr-overview", blocks: [
    { t: "p", c: [{ b: "管理員" }, "：負責帳號審核、權限設定與稽核報表。"] },
    { t: "adm", k: "note", c: [{ t: "p", c: ["離職時要同步撤權。"] }] },
  ] },
  "hr.role-manager": { label: "主管", src: "hr-overview", blocks: [
    { t: "p", c: [{ b: "主管" }, "：部門的第一線簽核者，審核部屬的請假與加班申請，並對部門的出勤狀況負責。"] },
    { t: "h3", c: "主管職責" },
    { t: "table", head: ["職責", "說明", "頻率"], rows: [
      ["假單簽核", "審核直屬部屬的請假申請，逾 2 個工作日自動提醒", "每日"],
      ["加班核准", "事前申請需在加班日前一天核准", "每週"],
      ["代理指派", "休假期間指定代理人承接簽核", "休假前"],
      ["出勤檢視", "確認部門的異常出勤與補登", "每月"],
    ] },
  ] },
  "hr.role-employee": { label: "員工", src: "hr-overview", blocks: [
    { t: "p", c: [{ b: "員工" }, "：系統的一般使用者，處理自己的差勤事項："] },
    { t: "ul", c: [["送出請假、加班與銷假申請。"], ["查詢個人假別餘額與出勤紀錄。"], ["在假單送審前修改或撤回。"]] },
  ] },
  "hr.leave-status": { label: "假單狀態", src: "hr-overview", blocks: [
    { t: "p", c: [{ b: "假單狀態" }, "：一張假單從建立到結案依序經過下列狀態，任一時間只會處於其中一種。"] },
    { t: "steps", c: [
      { h: "草稿", d: ["員工建立後尚未送出，可隨時修改或刪除。"] },
      { h: "送審", d: ["已送出，等待主管簽核；此時無法修改，只能撤回。"] },
      { h: "核准／退回", d: ["核准後扣抵額度；退回時附上理由，假單回到草稿。"] },
      { h: "銷假", d: ["假期結束或提前返回時申請銷假，未使用的時數退回額度。"] },
    ] },
    { t: "tabs", tabs: [
      { l: "一般假", c: [{ t: "p", c: ["事假、病假等一般假別，主管核准即生效。病假連續超過 3 天需附證明。"] }] },
      { l: "特休", c: [{ t: "p", c: ["主管核准後還要經人資覆核，才會從", Q(), "扣抵；退回時不扣額度。"] }] },
    ] },
  ] },
  "hr.term-quota": { label: "年度額度", src: "hr-glossary", blocks: [
    { t: "p", c: [{ b: "年度額度" }, "：員工在一個年度內可請的特休時數，依到職年資計算，以小時為單位。每年 1 月 1 日重新計算。"] },
    { t: "code", lang: "ts", c: "// 年度額度（小時）= 年資對應天數 × 每日工時 − 已核准時數\nquota = tenureDays(seniority) * dailyHours - approvedHours\n\n// 例：年資 3 年 → 14 天 × 8 小時 − 已核准 24 小時 = 88 小時" },
  ] },
  "hr.term-carryover": { label: "特休遞延", src: "hr-glossary", blocks: [
    { t: "p", c: [{ b: "特休遞延" }, "：年度結束時未休完的特休，經員工同意後遞延至次一年度；遞延時數另行記錄，不併入次年的額度計算。"] },
  ] },
};

const rfN = (slug, title, upd, cre, desc, blocks) => ({ slug, title, folder: RF_FOLDER, desc, updatedAt: upd, createdAt: cre, blocks });
const RF_APX = [
  ["假別代碼對照", ["特休的假別代碼為 ", { code: "AL" }, "，請休時以小時扣抵", Q(), "。"]],
  ["半日假規則", ["半日假以 4 小時計，從", Q(), "扣抵時不扣午休時段。"]],
  ["跨年度請假", ["跨年度的特休會依年度拆成兩筆，分別扣抵各年度的", Q(), "。"]],
  ["到職當年", ["到職未滿一年的員工，依到職月份比例計算當年度的", Q(), "。"]],
  ["離職結算", ["離職時未休完的", Q(), "折算工資，於最後一次薪資發放。"]],
  ["留職停薪", ["留職停薪期間不累計年資，復職後重新計算", Q(), "。"]],
  ["額度不足", ["申請時數超過剩餘", Q(), "時，系統擋下送出並顯示可請時數。"]],
  ["主管代請", ["主管代部屬補登特休時，同樣即時扣抵部屬的", Q(), "。"]],
  ["報表欄位", ["差勤月報的「剩餘特休」欄位即為當下的", Q(), "。"]],
  ["匯入舊資料", ["從舊系統匯入時，以匯入日的剩餘時數作為當年度", Q(), "的起始值。"]],
  ["通知時機", ["", Q(), "剩下不到 16 小時時，系統每月 1 日提醒員工安排休假。"]],
  ["API 欄位", ["員工查詢 API 的 ", { code: "leave.quotaHours" }, " 回傳", Q(), "，單位為小時。"]],
];
const RF_NOTES = [
  rfN("hr-overview", "系統 Overview", "2026-06-11", "2026-05-18", "請假系統的角色與假單狀態。各功能規格以 id 引用這裡的定義，修改時只改這一處。", [
    { t: "p", c: ["請假系統負責員工的請假、加班與銷假流程。本文定義系統中的角色與假單狀態，各功能規格以 id 引用這裡的定義，修改時只改這一處。"] },
    { t: "h2", c: "角色" },
    { t: "p", c: ["系統有三種角色，權限依員工、主管、管理員的順序遞增。"] },
    { t: "define", id: "hr.role-admin" },
    { t: "define", id: "hr.role-manager" },
    { t: "define", id: "hr.role-employee" },
    { t: "h2", c: "狀態" },
    { t: "define", id: "hr.leave-status" },
  ]),
  rfN("hr-leave-spec", "請假功能規格", "2026-06-13", "2026-05-20", "員工申請各種假別，送出後進入主管簽核。", [
    { t: "p", c: ["員工透過本功能申請各種假別。送出後依假別進入簽核，核准後扣抵對應的額度。"] },
    { t: "h2", c: "簽核角色" },
    { t: "include", id: "hr.role-manager" },
    { t: "h2", c: "申請流程" },
    { t: "p", c: ["假單送出後，由", { ref: "hr.role-admin", t: "管理員" }, "先確認假別設定，再進入主管簽核；", { ref: "hr.role-employee", t: "員工" }, "可在「我的申請」查看進度。完整步驟見", { a: "請假流程圖" }, "，", { tip: "半日假", d: "以 4 小時計，跨午休時不扣午休時段。" }, "只適用於特休與事假。"] },
    { t: "h2", c: "假單狀態" },
    { t: "p", c: ["假單的狀態與兩種假別的差異如下："] },
    { t: "include", id: "hr.leave-status" },
    { t: "adm", k: "warning", c: [{ t: "p", c: ["跨年度的請假申請，會依年度拆成兩筆。"] }] },
  ]),
  rfN("hr-overtime-spec", "加班申請規格", "2026-06-09", "2026-05-22", "事前申請與事後補登的加班流程。", [
    { t: "p", c: ["加班分成事前申請與事後補登兩種，兩者都要經過主管核准。"] },
    { t: "h2", c: "角色" },
    { t: "p", c: ["加班申請涉及兩個角色："] },
    { t: "include", id: "hr.role-employee" },
    { t: "include", id: "hr.role-manager" },
    { t: "h2", c: "換休" },
    { t: "p", c: ["員工選擇以補休代替加班費時，補休假單同樣依", { ref: "hr.leave-status", t: "假單狀態" }, "流轉，核准後才可使用。"] },
  ]),
  rfN("hr-account-spec", "帳號權限規格", "2026-06-05", "2026-05-25", "帳號開通、角色指派與權限異動。", [
    { t: "p", c: ["本文描述帳號從開通到停用的生命週期。帳號相關操作一律由", { ref: "hr.role-admin", t: "管理員" }, "執行。"] },
    { t: "h2", c: "開通與指派" },
    { t: "p", c: ["新進員工的帳號在到職日前一個工作日開通，預設角色為員工。角色異動需經人資主管同意。"] },
    { t: "h2", c: "權限異動" },
    { t: "p", c: ["部門調動、職務異動與離職都會觸發權限異動。調動時，原部門的簽核權限在生效日當天零時移交給新任主管，尚未簽核的假單一併轉移，並以系統通知告知申請人；職務異動若涉及角色升降，新角色的權限在人資主管核准後立即生效，舊角色的權限同時收回，不保留過渡期；離職時帳號在最後工作日下班後停用，個人資料保留三年供稽核查詢，期間任何人都不能以該帳號登入。上述異動都會寫入稽核紀錄，記錄異動前後的角色、生效時間與核准人，並由", { ref: "hr.role-admin", t: "管理員" }, "每月彙整成稽核報表。"] },
  ]),
  rfN("hr-glossary", "術語表", "2026-06-12", "2026-05-18", "請假系統的共用術語。", [
    { t: "p", c: ["請假系統各規格共用的術語。引用時寫 id，不要在各篇重新解釋。"] },
    { t: "h2", c: "額度" },
    { t: "define", id: "hr.term-quota" },
    { t: "h2", c: "遞延" },
    { t: "define", id: "hr.term-carryover" },
  ]),
  ...RF_APX.map(([sub, c], i) => {
    const n = String(i + 1).padStart(2, "0");
    const d = ["01", "02", "02", "03", "04", "04", "06", "07", "08", "10", "13", "14"][i];
    return rfN("hr-appendix-" + n, "規格附錄 " + n, "2026-06-" + d, "2026-05-28", sub + "的補充說明。", [
      { t: "h2", c: sub },
      { t: "p", c },
    ]);
  }),
];

// ── build 期索引 ──
function rfWalk(blocks, fn) {
  (blocks || []).forEach((b) => {
    fn(b);
    if (b.t === "adm") rfWalk(b.c, fn);
    if (b.t === "tabs") b.tabs.forEach((t) => rfWalk(t.c, fn));
    if (b.t === "define") rfWalk(RF_DEFS[b.id].blocks, fn);
  });
}
function rfInlineRefs(c, out) {
  if (!Array.isArray(c)) return;
  c.forEach((x) => { if (Array.isArray(x)) rfInlineRefs(x, out); else if (x && x.ref) out.push(x.ref); });
}
function rfOutgoing(note) {
  const m = new Map();
  const add = (id, k) => { if (RF_DEFS[id] && RF_DEFS[id].src !== note.slug) { if (!m.has(id)) m.set(id, new Set()); m.get(id).add(k); } };
  rfWalk(note.blocks, (b) => {
    if (b.t === "include") add(b.id, "inc");
    const ids = [];
    if (b.t === "p") rfInlineRefs(b.c, ids);
    if (b.t === "ul") b.c.forEach((li) => rfInlineRefs(li, ids));
    if (b.t === "steps") b.c.forEach((s) => rfInlineRefs(s.d, ids));
    ids.forEach((id) => add(id, "ref"));
  });
  return [...m.entries()].map(([id, ks]) => ({ id, kinds: [...ks] }));
}
const RF_INDEX = (() => {
  const byDef = {}; Object.keys(RF_DEFS).forEach((id) => (byDef[id] = []));
  RF_NOTES.forEach((n) => rfOutgoing(n).forEach((o) => byDef[o.id].push({ slug: n.slug, kinds: o.kinds })));
  return byDef;
})();
const rfNote = (slug) => RF_NOTES.find((n) => n.slug === slug);
const rfDefRefs = (id) => (RF_INDEX[id] || []).map((r) => ({ ...r, note: rfNote(r.slug) }));
const rfDefsOf = (slug) => Object.keys(RF_DEFS).filter((id) => RF_DEFS[id].src === slug);
function rfBacklinks(slug) {
  const m = new Map();
  rfDefsOf(slug).forEach((id) => rfDefRefs(id).forEach((r) => {
    if (!m.has(r.slug)) m.set(r.slug, { note: r.note, ids: [] });
    m.get(r.slug).ids.push({ id, kinds: r.kinds });
  }));
  return [...m.values()].sort((a, b) => b.ids.length - a.ids.length || RF_NOTES.indexOf(a.note) - RF_NOTES.indexOf(b.note));
}

// ── 併入工作台筆記資料（window.NOTES）：與既有筆記同形狀，另加 rf:true 與 defines/references ──
const rfPlain = (c) => (typeof c === "string" ? c : (c || []).map((x) => (typeof x === "string" ? x : Array.isArray(x) ? rfPlain(x) : x.b || x.code || x.badge || x.a || x.tip || x.t || "")).join(""));
// 筆記頁沿用既有 NoteView：最上層標題維持 h2/h3（既有樣式與 TOC），其餘連續區塊併成一個 rf 區塊交給 RfBlocks
function rfContent(blocks) {
  const out = []; let lv = 1, cur = null;
  blocks.forEach((b) => {
    if (/^h[23]$/.test(b.t)) { cur = null; lv = +b.t[1]; out.push({ t: b.t, c: b.c }); return; }
    if (!cur) { cur = { t: "rf", lv, blocks: [], c: "" }; out.push(cur); }
    cur.blocks.push(b);
    const txt = []; rfWalk([b], (x) => { if (x.t === "p") txt.push(rfPlain(x.c)); if (x.t === "ul") x.c.forEach((li) => txt.push(rfPlain(li))); });
    cur.c += txt.join("");
  });
  return out;
}
RF_NOTES.forEach((n) => {
  if (window.NOTES.some((x) => x.slug === n.slug)) return;
  window.NOTES.push({
    slug: n.slug, title: n.title, description: n.desc, tags: ["系統規格"], category: "hr",
    createdAt: n.createdAt, updatedAt: n.updatedAt, content: rfContent(n.blocks), rf: true,
    defines: rfDefsOf(n.slug), references: rfOutgoing(n),
  });
});

Object.assign(window, { RF_DEFS, RF_NOTES, RF_FOLDER, rfNote, rfDefRefs, rfDefsOf, rfBacklinks, rfOutgoing, rfWalk });
