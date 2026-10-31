// 工作台 Prototype — 定義與引用（define / include / :ref）的 build 期索引
// 筆記內文由 np/ 的 NC_BODIES 渲染；這裡只記錄每篇筆記宣告、引用與嵌入了哪些定義，供預覽卡、被引用 Drawer、命令面板與關聯圖使用。
const RF_FOLDER = "02-請假系統";
const RF_DEFS = {
  "hr.term-annual-leave": { label: "特別休假", src: "annual-leave-spec",
    desc: "勞工繼續工作滿一定期間後，依年資取得的有薪休假；未休完者於年度終結時折發工資。",
    blocks: [{ t: "p", c: [{ b: "特別休假" }, "：勞工在同一雇主或事業單位繼續工作滿一定期間後，依年資取得的有薪休假。休假期間工資照給，未休完者於年度終結時折發工資。"] }] },
  "hr.rule-settlement": { label: "年度結算規則", src: "annual-leave-spec",
    desc: "結算日鎖定特休餘額並產生折發清冊；協商遞延的時數須於次一年度內休完。",
    blocks: [{ t: "p", c: [{ b: "年度結算規則" }, "：年度結算日當天，系統會鎖定所有員工的特休餘額，並產生「未休特休折發清冊」供薪資計算使用。勞雇雙方若協商遞延，遞延的時數須於次一年度內休完。"] }] },
  "hr.role-employee": { label: "員工", src: "annual-leave-spec",
    desc: "在系統中擁有個人假勤與薪資單檢視權限的帳號。",
    blocks: [{ t: "p", c: [{ b: "員工" }, "：在系統中擁有個人假勤與薪資單檢視權限的帳號，可送出請假申請並查詢自己的特休餘額。"] }] },
  "hr.role-admin": { label: "管理員", src: "annual-leave-spec",
    desc: "可修改假勤設定、手動調整員工餘額的帳號。",
    blocks: [{ t: "p", c: [{ b: "管理員" }, "：可修改假勤設定、手動調整員工餘額的帳號；所有調整都會寫入稽核紀錄。"] }] },
  "nc.syntax-define": { label: "定義區塊", src: "md-advanced",
    desc: "以 id 宣告一段可被其他筆記引用的內容，id 全站唯一。",
    blocks: [{ t: "p", c: [{ b: "定義區塊" }, "：以 id 宣告一段可被其他筆記引用的內容。id 在全站唯一，建議以領域作為前綴，例如 ", { code: "hr." }, " 或 ", { code: "nc." }, "。"] }] },
};
// 每篇筆記的 define / include / :ref（build 期由 MDX 解析而來）
const RF_SRC = {
  "md-basics": [{ t: "p", c: [{ ref: "nc.syntax-define" }] }],
  "md-advanced": [{ t: "define", id: "nc.syntax-define" }, { t: "p", c: [{ ref: "hr.role-employee" }, { ref: "hr.term-annual-leave" }] }, { t: "include", id: "hr.rule-settlement" }],
  "md-viz": [{ t: "p", c: [{ ref: "hr.term-annual-leave" }] }],
  "annual-leave-spec": [{ t: "p", c: [{ ref: "hr.role-employee" }, { ref: "hr.role-admin" }] },
    { t: "define", id: "hr.term-annual-leave" }, { t: "define", id: "hr.rule-settlement" }, { t: "define", id: "hr.role-employee" }, { t: "define", id: "hr.role-admin" }],
};
const RF_NOTES = Object.keys(RF_SRC).map((slug) => {
  const n = window.NOTES.find((x) => x.slug === slug) || {};
  return { slug, title: n.title, folder: ({ guide: "01-語法示範", hr: RF_FOLDER })[n.category] || "根目錄", desc: n.description, updatedAt: n.updatedAt, createdAt: n.createdAt, blocks: RF_SRC[slug] };
});

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
RF_NOTES.forEach((r) => {
  const n = window.NOTES.find((x) => x.slug === r.slug);
  if (n) Object.assign(n, { rf: true, defines: rfDefsOf(r.slug), references: rfOutgoing(r) });
});

Object.assign(window, { RF_DEFS, RF_NOTES, RF_FOLDER, rfNote, rfDefRefs, rfDefsOf, rfBacklinks, rfOutgoing, rfWalk });
