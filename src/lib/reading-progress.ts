// ── 閱讀進度（個人狀態，存於瀏覽器 localStorage）──
// 三態：not-started（待開始）→ reading（閱讀中）→ done（已完成）。
// 純前端、正式環境亦可用、零 API（與 src/lib/favorites.ts 同性質）。
// 所有筆記皆可追蹤（不做「未發佈」判定，見 PRD §7.1〈系列資料模型〉Q2）。

export type ReadingStatus = "not-started" | "reading" | "done";

const KEY = "nc-reading-progress-v1";
export const READING_EVENT = "nc-reading-changed";

type Stored = Record<string, "reading" | "done">;

function load(): Stored {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (!raw || typeof raw !== "object") return {};
    const out: Stored = {};
    for (const [slug, v] of Object.entries(raw)) {
      if (v === "reading" || v === "done") out[slug] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function save(map: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* localStorage 不可用（隱私模式等）時降級：僅當下 session 有效 */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(READING_EVENT));
  }
}

export function readingStatus(slug: string): ReadingStatus {
  return load()[slug] ?? "not-started";
}

export function setReadingStatus(slug: string, status: ReadingStatus): void {
  const map = load();
  if (status === "not-started") delete map[slug];
  else map[slug] = status;
  save(map);
}

/** 開啟筆記時的輕量自動轉換：not-started → reading（永不降級）。 */
export function markReading(slug: string): void {
  if (readingStatus(slug) === "not-started") setReadingStatus(slug, "reading");
}

export type ReadingTone = "neutral" | "blue" | "success";
export type ReadingIcon = "circle" | "bookOpen" | "circleCheck";
export type ReadingMeta = { key: ReadingStatus; label: string; tone: ReadingTone; icon: ReadingIcon };

export function readingMeta(status: ReadingStatus): ReadingMeta {
  switch (status) {
    case "done":
      return { key: "done", label: "已完成", tone: "success", icon: "circleCheck" };
    case "reading":
      return { key: "reading", label: "閱讀中", tone: "blue", icon: "bookOpen" };
    default:
      return { key: "not-started", label: "待開始", tone: "neutral", icon: "circle" };
  }
}

export type SeriesProgress = {
  /** 依章節順序的狀態。 */
  statuses: ReadingStatus[];
  /** 章節總數，亦為進度分母（tracked = total）。 */
  total: number;
  done: number;
  reading: number;
  notStarted: number;
  /** round(done / total * 100)；total 為 0 時 0。 */
  pct: number;
  /** total > 0 且全部完成。 */
  completed: boolean;
  /** 已開始（done + reading > 0）。 */
  started: boolean;
  /** 下一篇要讀的章節索引：優先 reading，其次第一篇 not-started，全完成則回首章。 */
  nextIndex: number;
  /** 下一篇章節 slug（slugs 為空時 null）。 */
  nextSlug: string | null;
};

/**
 * 依章節 slug 陣列彙總即時進度（client 端讀 localStorage）。
 * `live=false` 時一律視為全部 not-started —— 供 SSR / hydration 首次 render 使用，
 * 與伺服器端（無 localStorage）輸出一致，避免 hydration mismatch。
 */
export function seriesProgress(slugs: string[], live = true): SeriesProgress {
  const statuses: ReadingStatus[] = live ? slugs.map(readingStatus) : slugs.map(() => "not-started");
  const total = slugs.length;
  const done = statuses.filter((s) => s === "done").length;
  const reading = statuses.filter((s) => s === "reading").length;
  const notStarted = total - done - reading;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const completed = total > 0 && done === total;
  const started = done + reading > 0;
  let nextIndex = statuses.findIndex((s) => s === "reading");
  if (nextIndex === -1) nextIndex = statuses.findIndex((s) => s === "not-started");
  if (nextIndex === -1) nextIndex = total > 0 ? 0 : -1;
  const nextSlug = nextIndex >= 0 ? slugs[nextIndex] : null;
  return { statuses, total, done, reading, notStarted, pct, completed, started, nextIndex, nextSlug };
}

/** 清掉該系列所有章節的進度（詳情頁「重設進度」用）。 */
export function resetSeriesProgress(slugs: string[]): void {
  const map = load();
  for (const slug of slugs) delete map[slug];
  save(map);
}
