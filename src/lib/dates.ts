export function fmtDate(s: string): string {
  const d = new Date(s + "T00:00:00");
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/** 當地時區的今天（YYYY-MM-DD）。不用 toISOString()：那是 UTC，台灣時間早上八點前會算成昨天。 */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysAgo(s: string, today: string = localToday()): string {
  const ms = new Date(today + "T00:00:00").getTime() - new Date(s + "T00:00:00").getTime();
  const d = Math.round(ms / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 週前`;
  return `${Math.floor(d / 30)} 個月前`;
}
