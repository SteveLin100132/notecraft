// 瀏覽器端的時間工具（純函式，可進 client）。
// 規格 §5.4（Q10）：相對於「今天」的量一律在瀏覽器以 Date.now() 計算、以**當地時區**的日界線比較。
// 用 UTC 的話，台灣時間早上八點前「今天」會算成昨天。

const DAY = 86400000;

/** "YYYY-MM-DD" → 當地時區該日 00:00 的 Date。字串不合法時回傳 Invalid Date。 */
export function localDay(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 任意時刻 → 當地時區當日 00:00。 */
function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 兩個當地日之間差幾天（DST 切換日一天不是 24 小時，所以用 round）。 */
export function daysBetween(s: string, now: Date = new Date()): number {
  const d = localDay(s).getTime();
  if (Number.isNaN(d)) return NaN;
  return Math.round((startOfLocalDay(now).getTime() - d) / DAY);
}

export function daysAgoLabel(s: string, now: Date = new Date()): string {
  const d = daysBetween(s, now);
  if (Number.isNaN(d)) return "—";
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 週前`;
  if (d < 365) return `${Math.floor(d / 30)} 個月前`;
  return `${Math.floor(d / 365)} 年前`;
}

/** s 是否落在「今天往回 n 天」之內（含今天；n=7 → 今天與前 6 天）。未來日期不算。 */
export function withinDays(s: string, n: number, now: Date = new Date()): boolean {
  const d = daysBetween(s, now);
  return !Number.isNaN(d) && d >= 0 && d < n;
}

export type WeekBucket = { label: string; count: number };

/**
 * 以**今天**為最後一天，每 7 天一格往回 n 格。最後一格 = 今天往回 6 天到今天。
 * 不採 prototype「以最新一篇筆記日期為基準」的做法 —— 那會讓很久沒寫時看起來仍像最近很活躍。
 * label 是該格第一天的 m/d。
 */
export function weekBuckets(dates: string[], n = 8, now: Date = new Date()): WeekBucket[] {
  const today = startOfLocalDay(now);
  const buckets: WeekBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (i * 7 + 6));
    buckets.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count: 0 });
  }
  for (const s of dates) {
    const d = daysBetween(s, now);
    if (Number.isNaN(d) || d < 0) continue;
    const idx = n - 1 - Math.floor(d / 7);
    if (idx >= 0) buckets[idx].count += 1;
  }
  return buckets;
}

/** "2026-09-18" → "09/18" */
export function md(s: string): string {
  return s.length >= 10 ? `${s.slice(5, 7)}/${s.slice(8, 10)}` : s;
}

/** "2026-09-18" → "2026/09/18" */
export function ymd(s: string): string {
  return s.slice(0, 10).replace(/-/g, "/");
}

/** "2026-09-18" → "2026 年 9 月"（Timeline 與 List 月份分組的 key） */
export function monthLabel(s: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  return m ? `${m[1]} 年 ${Number(m[2])} 月` : "未知月份";
}
