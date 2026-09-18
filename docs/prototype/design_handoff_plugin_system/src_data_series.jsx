// seriesEntry / seriesOf（章節解析）
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


// 進度彙總
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
