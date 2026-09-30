// 更新月曆的純函式（規格 docs/notecraft-workbench-calendar.md §4.3）。
// **只能 `import type`、不能有 JSX、不 import wb-time.ts**：scripts/checks/wb-calendar.mjs 以 Node --experimental-strip-types 直接載入，
// 相對 import 在那邊要帶副檔名、在 tsc／Vite 這邊不帶，乾脆不依賴。
// 與 wb-time.ts 的分工：那邊是「以今天為錨往回數」的滾動窗（withinDays／weekOf／weekWindow）；
// 這裡是「以 anchor 為錨、對齊日曆邊界（當月 1 日、週日）」。兩者的「週」不是同一個東西（規格 Q1）。
// 日期一律以 YYYY-MM-DD **當地日**字串進出，Date 只在函式內短暫存在，UTC 位移不會進 state。

export type CalView = "month" | "week";

/** 日曆週：週日→週六，7 天 */
export type CalWeek = { start: string; end: string; days: string[] };

/** 月格：從當月 1 日所在週的週日起、共 weeks×7 天；前後月的補位格也在 days 裡 */
export type CalMonth = { year: number; month: number; weeks: 4 | 5 | 6; days: string[]; first: string; last: string };

/** Date（當地）→ YYYY-MM-DD */
export function calIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD…" → 當地該日 00:00；不合法回 Invalid Date */
function parse(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** iso 所在的日曆週（週日起算） */
export function calWeekOf(iso: string): CalWeek {
  const d = parse(iso);
  const start = addDays(d, -d.getDay());
  const days = Array.from({ length: 7 }, (_, i) => calIso(addDays(start, i)));
  return { start: days[0], end: days[6], days };
}

/** iso 所在月的格子；weeks = ceil((當月 1 日的星期 + 當月天數) / 7)，只會是 4／5／6 */
export function calMonthGrid(iso: string): CalMonth {
  const d = parse(iso);
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1);
  const dim = new Date(y, m + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + dim) / 7) as 4 | 5 | 6;
  const start = addDays(first, -first.getDay());
  const days = Array.from({ length: weeks * 7 }, (_, i) => calIso(addDays(start, i)));
  return { year: y, month: m + 1, weeks, days, first: calIso(first), last: calIso(new Date(y, m, dim)) };
}

/** 翻頁：月 → 上／下個月的 1 日（用 new Date(y, m±1, 1) 建構，1 月 31 日不會溢到 3 月）；週 → ±7 天 */
export function calShift(view: CalView, anchor: string, dir: -1 | 1): string {
  const d = parse(anchor);
  if (view === "month") return calIso(new Date(d.getFullYear(), d.getMonth() + dir, 1));
  return calIso(addDays(d, 7 * dir));
}

/** 「2026 年 9 月」／「2026 年 9/27 – 10/3」（不補零；跨年週的年份取週日那天） */
export function calTitle(view: CalView, anchor: string): string {
  const d = parse(anchor);
  if (view === "month") return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
  const w = calWeekOf(anchor);
  const s = parse(w.start);
  const e = parse(w.end);
  return `${s.getFullYear()} 年 ${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
}

/** 格頭日期：每月 1 日與（週檢視的）首格顯示「M/D」，其餘只顯示「D」 */
export function calCellLabel(iso: string, firstCell: boolean): string {
  const d = parse(iso);
  return d.getDate() === 1 || firstCell ? `${d.getMonth() + 1}/${d.getDate()}` : String(d.getDate());
}

/** iso 與 anchor 是否同年月（補位格判斷、範圍內筆記的過濾） */
export function calInMonth(iso: string, anchor: string): boolean {
  return iso.slice(0, 7) === anchor.slice(0, 7);
}

/** 依 updatedAt 前 10 碼分組（frontmatter 允許帶時間）；順序照輸入 */
export function groupByDay<T extends { updatedAt: string }>(rows: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const k = r.updatedAt.slice(0, 10);
    (out[k] ??= []).push(r);
  }
  return out;
}
