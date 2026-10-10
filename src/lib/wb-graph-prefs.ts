// Graph 檢視的偏好（client-safe）。localStorage["nc-graph-prefs-v1"]（規格 docs/notecraft-workbench-notes-graph.md §9，Q6）。
// 模式、著色、邊的開關、孤島、圖例收合是偏好，不進網址（與 List 的「分組」同性質）；點標籤樞紐會換頁，靠這裡維持模式。
// 搜尋字串、hover、平移縮放不保存。讀不到或值無效時一律回預設。
import type { WbEdgeKind } from "@/lib/wb-types";
import type { GraphColorBy, GraphMode } from "@/lib/wb-graph";

export interface GraphPrefs {
  mode: GraphMode;
  colorBy: GraphColorBy;
  kinds: Record<WbEdgeKind, boolean>;
  showOrphans: boolean;
  legendOpen: boolean;
}

export const GRAPH_PREFS_KEY = "nc-graph-prefs-v1";
export const DEFAULT_GRAPH_PREFS: GraphPrefs = {
  mode: "doc",
  colorBy: "folder",
  kinds: { ref: true, inc: true, link: true, seq: true },
  showOrphans: true,
  legendOpen: true,
};

const MODES: readonly string[] = ["doc", "tag"];
const COLORS: readonly string[] = ["folder", "series", "tag", "none"];
const KINDS: readonly WbEdgeKind[] = ["ref", "inc", "link", "seq"];

export function readGraphPrefs(): GraphPrefs {
  const d = DEFAULT_GRAPH_PREFS;
  if (typeof localStorage === "undefined") return { ...d, kinds: { ...d.kinds } };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(GRAPH_PREFS_KEY) || "{}");
    const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const k = (typeof o.kinds === "object" && o.kinds !== null ? o.kinds : {}) as Record<string, unknown>;
    const kinds = { ...d.kinds };
    for (const key of KINDS) if (typeof k[key] === "boolean") kinds[key] = k[key] as boolean;
    return {
      mode: typeof o.mode === "string" && MODES.includes(o.mode) ? (o.mode as GraphMode) : d.mode,
      colorBy: typeof o.colorBy === "string" && COLORS.includes(o.colorBy) ? (o.colorBy as GraphColorBy) : d.colorBy,
      kinds,
      showOrphans: typeof o.showOrphans === "boolean" ? o.showOrphans : d.showOrphans,
      legendOpen: typeof o.legendOpen === "boolean" ? o.legendOpen : d.legendOpen,
    };
  } catch {
    return { ...d, kinds: { ...d.kinds } };
  }
}

export function writeGraphPrefs(patch: Partial<GraphPrefs>): GraphPrefs {
  const next = { ...readGraphPrefs(), ...patch };
  try {
    localStorage.setItem(GRAPH_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* localStorage 不可用時只在當下有效 */
  }
  return next;
}
