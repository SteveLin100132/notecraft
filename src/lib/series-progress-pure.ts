// 系列完成數的純計算（規格 docs/notecraft-workbench-loading-transitions.md §8.2）。
// reading-progress.ts 的 seriesProgress() 與 WorkbenchLayout 的 Sidebar 預繪 inline script 共用；
// 後者以 `Function.prototype.toString()` 內嵌，所以**必須自足**、只能 import type、不碰 window／localStorage。

/** map 是 nc-reading-progress-v1 的內容；refs 是章節識別碼原字串（含 view: 前綴）。只有 "done" 計入。 */
export function seriesDone(map: Record<string, unknown>, refs: string[]): { done: number; total: number; pct: number } {
  const total = refs.length;
  let done = 0;
  for (const r of refs) if (map && map[r] === "done") done++;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
