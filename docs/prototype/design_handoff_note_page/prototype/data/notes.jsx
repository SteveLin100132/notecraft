// NoteCraft — sample notes. Content is a block array (simulating rendered MDX).
// Block types: h1, h2, h3, p, code, ul, ol, quote, marker (AI 標記區塊), viz (generated component)
// Note-level frontmatter `status`:  published（預設，已有內容）｜ empty（新建筆記初始畫面）｜ coming-soon（佔位畫面 + 彩蛋）
// 工作台示範筆記：3 篇語法示範 + 1 篇完整規格範例。內文由 np/ 的 NC_BODIES 渲染（方案 D），content 只保留摘要與 AI 標記供列表、佇列統計使用。
const NOTES = [ { "slug": "md-basics", "title": "Markdown 基本語法", "description": "標題、段落、清單、引言、表格、程式碼、圖片與註腳：NoteCraft 支援的標準 Markdown 一次看完。", "tags": [ "Markdown", "語法" ], "category": "guide", "createdAt": "2026-05-20", "updatedAt": "2026-06-10", "words": 2180, "content": [ { "t": "p", "c": "本篇整理 NoteCraft 支援的標準 Markdown（CommonMark 與 GitHub Flavored Markdown），每一節先列出寫法，再直接呈現渲染結果。" } ] }, { "slug": "md-advanced", "title": "進階語法", "description": "提示文字、定義與引用、提示框、分頁、步驟、數學公式、程式碼註解與摺疊問答。", "tags": [ "MDX", "語法" ], "category": "guide", "createdAt": "2026-05-24", "updatedAt": "2026-06-12", "words": 2960, "content": [ { "t": "p", "c": "NoteCraft 以 MDX 擴充標準 Markdown，本篇逐一示範這些語法的寫法與渲染結果。" } ] }, { "slug": "md-viz", "title": "視覺化互動元件", "description": "以 @ai-visualize 標記產生的互動計算器、流程模擬與圖表、待生成標記，以及以 renderer plugin 嵌入的資料檔。", "tags": [ "MDX", "視覺化", "Plugin" ], "category": "guide", "createdAt": "2026-05-28", "updatedAt": "2026-06-14", "words": 1640, "content": [ { "t": "p", "c": "文字講不清楚的內容，可以在筆記中放一個 @ai-visualize 標記，描述想要的互動元件，再交給 AI 產生。" }, { "t": "marker", "id": "demo-leave-calculator", "type": "interactive", "status": "generated", "prompt": "把特休年資級距做成可拖曳的計算器，顯示天數與級距說明。" }, { "t": "marker", "id": "demo-approval-flow", "type": "motion", "status": "generated", "prompt": "以逐步動畫呈現不同請假長度的簽核路徑，可切換情境並按「下一步」推進。" }, { "t": "marker", "id": "demo-usage-chart", "type": "chart", "status": "generated", "prompt": "以堆疊長條圖比較各部門 1–9 月的請假時數，圖例可切換假別。" }, { "t": "marker", "id": "demo-expiry-heatmap", "type": "chart", "status": "pending", "prompt": "以月份 × 部門的熱度圖呈現即將到期的特休時數，顏色越深代表到期時數越多，點格子顯示員工名單。" }, { "t": "marker", "id": "demo-approval-sla", "type": "interactive", "status": "pending", "prompt": "以儀表呈現各主管的平均簽核時間，超過 24 小時的區段標為警示色，可切換月份。" } ] }, { "slug": "annual-leave-spec", "title": "特休假規格與計算", "description": "依勞動基準法第 38 條計算特別休假天數，並說明申請、簽核與年度結算的規則。", "tags": [ "系統規格", "勞動法令" ], "category": "hr", "createdAt": "2026-03-02", "updatedAt": "2026-06-15", "words": 4820, "content": [ { "t": "p", "c": "員工到職滿六個月後，依勞動基準法第 38 條取得特別休假。系統會在每位員工的到職週年日自動發放天數，並於年度結算日處理未休完的時數。" }, { "t": "marker", "id": "annual-leave-calculator", "type": "interactive", "status": "generated", "prompt": "把特休年資級距做成可拖曳的計算器，點長條可直接跳到該年資。" }, { "t": "marker", "id": "leave-approval-flow", "type": "motion", "status": "generated", "prompt": "把一般、長假與特殊情境三種簽核路徑做成可切換的流程模擬。" }, { "t": "marker", "id": "leave-usage-by-dept", "type": "chart", "status": "generated", "prompt": "2026 年 1–9 月各部門的請假時數分布，可切換假別。" } ] } ];

// ── Series（系列）— ordered chapters linking related notes ──
// 把相關筆記串成「系列」，提供系列總覽、閱讀進度彙總，以及筆記頁底的章節導覽。
// 封面採「色塊 + 圖示」：accent 決定漸層色系，icon 取 window.Icons 名稱。
const SERIES = [
  { id: "md-guide", title: "Markdown 寫作指南", eyebrow: "WRITING SERIES", accent: "blue", icon: "code",
    description: "從標準 Markdown 到 NoteCraft 的 MDX 擴充語法與互動元件，依序讀完就能寫出結構完整的筆記。",
    slugs: ["md-basics", "md-advanced", "md-viz", "view:trendmile-schema"] },
  { id: "hr-spec", title: "請假系統規格", eyebrow: "SPEC SERIES", accent: "orange", icon: "layers",
    description: "以特休假規格為範例，示範規格文件如何宣告定義、搭配互動元件與資料檔。",
    slugs: ["annual-leave-spec", "view:roadmap-2026h2"] },
];

function seriesById(id) { return SERIES.find((s) => s.id === id) || null; }

function noteBySlug(slug) { return NOTES.find((n) => n.slug === slug) || null; }

// ── note 狀態（frontmatter status）── 缺省視為 published（已有內容的一般筆記）
function noteStatus(note) { return (note && note.status) || "published"; }
function statusMeta(note) {
  const s = noteStatus(note);
  if (s === "empty") return { key: "empty", label: "草稿", tone: "neutral", icon: "edit" };
  if (s === "coming-soon") return { key: "coming-soon", label: "即將登場", tone: "orange", icon: "sparkle" };
  return null;
}

// slug 化（與 dev API 寫入 MDX 檔名一致）
function ncSlugify(s) {
  return (s || "").trim().toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50) || "untitled-note";
}

// 模擬 dev API：POST /api/notes 寫入含預設 frontmatter 的 MDX，並回傳新筆記物件。
function createNote({ title, tags, folder, status }) {
  const slug = ncSlugify(title);
  const note = {
    slug,
    title: (title || "").trim() || "未命名筆記",
    description: "",
    tags: (Array.isArray(tags) ? tags : String(tags || "").split(",")).map((t) => t.trim()).filter(Boolean),
    category: "",
    folder: folder || "src/content/notes/",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
    status: status || "empty",
    content: [],
  };
  NOTES.unshift(note);
  ncEmit();
  return note;
}

// 系列的一章可以是筆記（slug）或資料檔頁（"view:<id>"）。兩者一視同仁：
// 都有序號、都計入進度分母、都可被標記為已完成。
function seriesEntry(ref) {
  if (typeof ref === "string" && ref.indexOf("view:") === 0) {
    const f = (window.DATAFILES || []).find((d) => d.id === ref.slice(5));
    if (!f) return null;
    return { kind: "data", ref, id: f.id, title: f.title, description: f.description, file: f, note: null };
  }
  const n = noteBySlug(ref);
  return n ? { kind: "note", ref, id: n.slug, title: n.title, description: n.description, note: n, file: null } : null;
}

// 回傳某一章（筆記 slug 或 "view:<id>"）所屬系列的導覽資訊；不在任何系列則回傳 null。
function seriesOf(ref) {
  for (const s of SERIES) {
    const i = s.slugs.indexOf(ref);
    if (i === -1) continue;
    const chapters = s.slugs.map(seriesEntry).filter(Boolean);
    const j = chapters.findIndex((c) => c.ref === ref);
    return {
      series: s,
      index: j,
      total: chapters.length,
      chapters,
      prev: j > 0 ? chapters[j - 1] : null,
      next: j < chapters.length - 1 ? chapters[j + 1] : null,
    };
  }
  return null;
}

// derived helpers
function fmtDate(s) {
  const d = new Date(s + "T00:00:00");
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(s) {
  const ms = new Date("2026-06-12T00:00:00") - new Date(s + "T00:00:00");
  const d = Math.round(ms / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 週前`;
  return `${Math.floor(d / 30)} 個月前`;
}
function markersOf(note) {
  return note.content.filter((b) => b.t === "marker");
}
function allTags() {
  const m = {};
  NOTES.forEach((n) => n.tags.forEach((t) => { m[t] = (m[t] || 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function excerpt(note) {
  const p = note.content.find((b) => b.t === "p");
  return p ? p.c : note.description;
}

// ── mutable tag store (simulates dev API writing MDX frontmatter) ──
const _ncListeners = new Set();
function ncSubscribe(fn) { _ncListeners.add(fn); return () => _ncListeners.delete(fn); }
function ncEmit() { _ncListeners.forEach((fn) => fn()); }

function tagStats() {
  const m = {};
  NOTES.forEach((n) => n.tags.forEach((t) => {
    if (!m[t]) m[t] = { name: t, count: 0, lastUsed: "0000-00-00" };
    m[t].count += 1;
    if (n.updatedAt > m[t].lastUsed) m[t].lastUsed = n.updatedAt;
  }));
  return Object.values(m);
}
function notesWithTag(tag) { return NOTES.filter((n) => n.tags.includes(tag)); }

function addNoteTag(slug, raw) {
  const tag = (raw || "").trim();
  const n = NOTES.find((x) => x.slug === slug);
  if (!n || !tag) return { ok: false, reason: "empty" };
  if (n.tags.includes(tag)) return { ok: false, reason: "dup" };
  n.tags = [...n.tags, tag];
  n.updatedAt = "2026-06-12";
  ncEmit();
  return { ok: true };
}
function removeNoteTag(slug, tag) {
  const n = NOTES.find((x) => x.slug === slug);
  if (!n) return { ok: false };
  n.tags = n.tags.filter((t) => t !== tag);
  ncEmit();
  return { ok: true };
}
// rename (or merge when newName already exists). best-effort, no rollback.
function renameTag(oldName, newRaw) {
  const newName = (newRaw || "").trim();
  if (!newName || newName === oldName) return { ok: false };
  const affected = notesWithTag(oldName);
  const merged = NOTES.some((n) => n.tags.includes(newName));
  let done = 0;
  affected.forEach((n) => {
    n.tags = Array.from(new Set(n.tags.map((t) => (t === oldName ? newName : t))));
    done += 1;
  });
  ncEmit();
  return { ok: true, affected: affected.length, done, failed: affected.length - done, merged, oldName, newName };
}
function deleteTag(name) {
  const affected = notesWithTag(name);
  let done = 0;
  affected.forEach((n) => { n.tags = n.tags.filter((t) => t !== name); done += 1; });
  ncEmit();
  return { ok: true, affected: affected.length, done, failed: affected.length - done, name };
}

// ─────────────────── 閱讀進度（個人狀態，存於 localStorage）───────────────────
// 狀態：not-started（待開始）→ reading（閱讀中）→ done（已完成）。
// 未發佈筆記（empty / coming-soon）不可追蹤、不計入系列進度（回傳 "unpublished"）。
const NC_PROGRESS_KEY = "nc-reading-progress-v1";
function _loadProgress() {
  try { return JSON.parse(localStorage.getItem(NC_PROGRESS_KEY)) || {}; } catch (e) { return {}; }
}
let _progress = _loadProgress();
function _saveProgress() {
  try { localStorage.setItem(NC_PROGRESS_KEY, JSON.stringify(_progress)); } catch (e) {}
}

function isTrackable(note) { return !!note && noteStatus(note) === "published"; }

function readingStatus(slug) {
  const n = noteBySlug(slug);
  if (n && !isTrackable(n)) return "unpublished";
  return _progress[slug] || "not-started";
}
function setReadingStatus(slug, status) {
  const n = noteBySlug(slug);
  if (n && !isTrackable(n)) return;
  if (status === "not-started") delete _progress[slug];
  else _progress[slug] = status;
  _saveProgress();
  ncEmit();
}
// 手動為主；開啟筆記時的輕量自動轉換：待開始 → 閱讀中（永不降級）。
function markReading(slug) {
  if (readingStatus(slug) === "not-started") setReadingStatus(slug, "reading");
}

function readingMeta(status) {
  switch (status) {
    case "done": return { key: "done", label: "已完成", tone: "success", icon: "circleCheck" };
    case "reading": return { key: "reading", label: "閱讀中", tone: "blue", icon: "bookOpen" };
    case "unpublished": return { key: "unpublished", label: "未發佈", tone: "neutral", icon: "clock" };
    default: return { key: "not-started", label: "待開始", tone: "neutral", icon: "circle" };
  }
}

// 系列進度彙總。只把「已發佈」章節計入分母（tracked）；資料檔頁一律可追蹤。
function seriesProgress(series) {
  const chapters = series.slugs.map(seriesEntry).filter(Boolean);
  const trackableEntry = (c) => (c.kind === "data" ? true : isTrackable(c.note));
  const statuses = chapters.map((c) => ({ entry: c, note: c.note, status: readingStatus(c.ref) }));
  const tracked = chapters.filter(trackableEntry);
  const done = tracked.filter((c) => readingStatus(c.ref) === "done").length;
  const reading = tracked.filter((c) => readingStatus(c.ref) === "reading").length;
  const notStarted = tracked.length - done - reading;
  const pct = tracked.length ? Math.round((done / tracked.length) * 100) : 0;
  const completed = tracked.length > 0 && done === tracked.length;
  const started = done + reading > 0;
  // 下一章：優先閱讀中，其次第一個待開始；全完成則回到首章供重讀。
  const next =
    tracked.find((c) => readingStatus(c.ref) === "reading") ||
    tracked.find((c) => readingStatus(c.ref) === "not-started") ||
    chapters[0] || null;
  return { chapters, statuses, total: chapters.length, tracked: tracked.length,
    done, reading, notStarted, pct, completed, started, next };
}
function resetSeriesProgress(series) {
  series.slugs.forEach((s) => { delete _progress[s]; });
  _saveProgress();
  ncEmit();
}

Object.assign(window, { NOTES, SERIES, noteBySlug, seriesById, seriesOf, seriesEntry, fmtDate, daysAgo, markersOf, allTags, excerpt,
  noteStatus, statusMeta, ncSlugify, createNote,
  tagStats, notesWithTag, addNoteTag, removeNoteTag, renameTag, deleteTag, ncSubscribe, ncEmit,
  readingStatus, setReadingStatus, markReading, readingMeta, seriesProgress, resetSeriesProgress, isTrackable });
