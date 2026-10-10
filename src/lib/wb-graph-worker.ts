// Graph 檢視的佈局 Web Worker（規格 docs/notecraft-workbench-notes-graph.md §5.2）。
// 斥力是 O(n²)：實測 300 節點約 0.2 秒、1,000 節點約 1.4 秒，會讓主執行緒卡住，所以節點超過 GR_DENSE 時改在這裡算。
// 節點少時 GraphView 直接在主執行緒同步算，不經過這裡。只能由 `new Worker(new URL(…))` 載入，主執行緒不要 import 它。
import { runLayout } from "./wb-graph-layout";
import type { LayoutRequest } from "./wb-graph-layout";

// 專案沒有 webworker 的型別庫：只取用得到的兩個成員
const ctx = globalThis as unknown as { onmessage: ((e: { data: LayoutRequest }) => void) | null; postMessage: (m: unknown) => void };
ctx.onmessage = (e) => {
  ctx.postMessage({ key: e.data.key, result: runLayout(e.data) });
};
