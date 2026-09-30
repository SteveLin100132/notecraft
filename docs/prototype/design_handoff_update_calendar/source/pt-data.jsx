// 工作台 Prototype — 真實資料轉接層（從 window.NOTES / SERIES 推導資料夾、統計）
const FOLDER_OF = { frontend: "01-前端", backend: "02-後端", pm: "03-產品管理", security: "04-資安", network: "05-網路" };
const FOLDER_COLOR = { "01-前端": "#2c6ebb", "02-後端": "#163f7d", "03-產品管理": "#ed9b26", "04-資安": "#6c798e", "05-網路": "#1b4f9c", "根目錄": "#8b9aad" };
const SUB_OF = { React: "react", CSS: "css-layout", TypeScript: "typescript", JavaScript: "runtime", WebSocket: "runtime", 資料庫: "storage", 系統設計: "system-design" };
const SERIES_COLOR = { orange: "#ed9b26", blue: "#2c6ebb", navy: "#163f7d", green: "#2e9e6b" };

function ptWords(note) {
  let n = 0;
  (note.content || []).forEach((b) => {
    if (typeof b.c === "string") n += b.c.length;
    else if (Array.isArray(b.c)) n += b.c.join("").length;
  });
  return n;
}
function ptRow(note) {
  const folder = FOLDER_OF[note.category] || "根目錄";
  const sub = folder === "根目錄" ? null : ((note.tags || []).map((t) => SUB_OF[t]).find(Boolean) || null);
  const markers = window.markersOf(note);
  const done = markers.filter((m) => m.status === "generated").length;
  const s = window.SERIES.find((x) => x.slugs.indexOf(note.slug) !== -1) || null;
  return {
    slug: note.slug, note, title: note.title, folder, sub,
    path: (folder === "根目錄" ? [] : [folder, sub]).concat(note.slug + ".mdx").filter(Boolean).join("/"),
    atRoot: folder === "根目錄",
    tags: note.tags || [], markers, ai: [done, markers.length - done],
    words: ptWords(note), updated: note.updatedAt, md: note.updatedAt.slice(5).replace("-", "/"),
    series: s, seriesIndex: s ? s.slugs.indexOf(note.slug) + 1 : 0,
    status: window.noteStatus ? window.noteStatus(note) : null,
    nofm: (note.content || []).length === 0,
  };
}
function ptRows() { return window.NOTES.map(ptRow).sort((a, b) => (a.updated < b.updated ? 1 : -1)); }

function ptFolders() {
  const rows = ptRows();
  const order = ["根目錄", "01-前端", "02-後端", "03-產品管理", "04-資安", "05-網路"];
  return order.filter((f) => rows.some((r) => r.folder === f)).map((f) => {
    const inF = rows.filter((r) => r.folder === f);
    const subs = [];
    inF.forEach((r) => { if (r.sub && !subs.some((s) => s.name === r.sub)) subs.push({ name: r.sub, count: inF.filter((x) => x.sub === r.sub).length }); });
    return { name: f, count: inF.length, color: FOLDER_COLOR[f], subs };
  });
}
function ptSeries() {
  return window.SERIES.map((s) => {
    const p = window.seriesProgress(s);
    return { s, id: s.id, name: s.title, color: SERIES_COLOR[s.accent] || "#2c6ebb", total: s.slugs.length, done: p.done, pct: p.pct, next: p.next };
  });
}
function ptPending() {
  const rows = ptRows().filter((r) => r.ai[1] > 0);
  return { rows, count: rows.reduce((a, r) => a + r.ai[1], 0) };
}
function ptWeeks(n) {
  const rows = ptRows();
  const latest = new Date(rows[0].updated + "T00:00:00");
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const end = new Date(latest); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    out.push({
      label: (end.getMonth() + 1) + "/" + end.getDate(),
      v: rows.filter((r) => { const d = new Date(r.updated + "T00:00:00"); return d >= start && d <= end; }).length,
    });
  }
  return out;
}
function ptGroupKey(row, by) {
  if (by === "series") return row.series ? row.series.title : "未歸入系列";
  if (by === "tag") return row.tags[0] || "未加標籤";
  if (by === "month") return row.updated.slice(0, 7).replace("-", " / ");
  return row.folder;
}
function ptGroupColor(key, by) {
  if (by === "folder") return FOLDER_COLOR[key] || "#8b9aad";
  if (by === "series") { const s = ptSeries().find((x) => x.name === key); return s ? s.color : "#8b9aad"; }
  return "#6c798e";
}
function ptDataFolders() {
  const files = window.DATAFILES || [];
  const out = [];
  files.forEach((f) => {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "根目錄";
    let g = out.find((x) => x.name === dir);
    if (!g) { g = { name: dir, files: [] }; out.push(g); }
    g.files.push({ id: f.id, name: parts[parts.length - 1], title: f.title, plugin: f.plugin });
  });
  out.sort((a, b) => (a.name === "根目錄" ? -1 : b.name === "根目錄" ? 1 : 0));
  return out;
} 
Object.assign(window, { ptRow, ptRows, ptFolders, ptSeries, ptPending, ptWeeks, ptWords, ptGroupKey, ptGroupColor, ptDataFolders, FOLDER_COLOR, SERIES_COLOR });
