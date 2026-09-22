// 工作台偏好（client-safe）。localStorage["nc-workbench-prefs-v1"]，形狀 { defaultView, groupBy }。
// 讀不到或值無效時一律回預設。設定頁寫、/notes 讀；在 Toolbar 切分組時也會回寫 groupBy。
export type WbView = "list" | "board" | "table" | "timeline";
export type WbGroupBy = "folder" | "series" | "tag" | "month";

export const WB_VIEWS: readonly WbView[] = ["list", "board", "table", "timeline"];
export const WB_GROUPS: readonly WbGroupBy[] = ["folder", "series", "tag", "month"];
export const VIEW_LABEL: Record<WbView, string> = { list: "List", board: "Board", table: "Table", timeline: "Timeline" };
export const GROUP_LABEL: Record<WbGroupBy, string> = { folder: "資料夾", series: "系列", tag: "標籤", month: "月份" };

export interface WbPrefs {
  defaultView: WbView;
  groupBy: WbGroupBy;
}

export const PREFS_KEY = "nc-workbench-prefs-v1";
export const PREFS_EVENT = "nc-prefs-changed";
export const DEFAULT_PREFS: WbPrefs = { defaultView: "list", groupBy: "folder" };

export function isView(v: unknown): v is WbView {
  return typeof v === "string" && (WB_VIEWS as readonly string[]).includes(v);
}
export function isGroupBy(v: unknown): v is WbGroupBy {
  return typeof v === "string" && (WB_GROUPS as readonly string[]).includes(v);
}

export function readPrefs(): WbPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    return {
      defaultView: isView(o.defaultView) ? o.defaultView : DEFAULT_PREFS.defaultView,
      groupBy: isGroupBy(o.groupBy) ? o.groupBy : DEFAULT_PREFS.groupBy,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(patch: Partial<WbPrefs>): WbPrefs {
  const next = { ...readPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* localStorage 不可用時只在當下有效 */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  return next;
}
