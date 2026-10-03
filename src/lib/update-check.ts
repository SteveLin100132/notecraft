// 檢查更新的純函式（規格 docs/notecraft-workbench-update-check.md §4.1、§4.2、§4.4）。
// 只能 import type、無 JSX、不碰 window／localStorage／Date.now()：scripts/checks/upd-derive.mjs 直接載入斷言。
// 時間一律由呼叫端傳 now。

export type UpdLevel = "patch" | "minor" | "major";
export type UpdTone = "info" | "major" | "danger";

export interface UpdResult {
  cur: string;
  curDate: string | null;
  latest: string;
  latestDate: string | null;
  /** null = 已是最新或目前版本較新 */
  level: UpdLevel | null;
  /** 目前版本比 npm 的 latest 新（開發中、bump 了還沒發佈；Q4） */
  ahead: boolean;
  /** cur < v ≤ latest 的 npm 穩定版數 */
  behind: number;
  /** 同上，新到舊；Rail／徽章／toast 計數與 CHANGELOG 切片共用（Q1 = B） */
  missed: string[];
  engines: string | null;
  nodeNeed: number | null;
  userNode: string;
  needsNode: boolean;
  deprecated: string | null;
  size: number | null;
  files: number | null;
}

export interface UpdCache {
  cur: string;
  at: number;
  res: UpdResult;
  toasted: string | null;
  skipped: string | null;
}

export interface RailHint {
  tone: UpdTone;
  n: number;
  label: string;
}

export const UPD_STORAGE_KEY = "nc-update-v1";
export const UPD_TTL_MS = 30 * 60 * 1000;
export const UPD_TIMEOUT_MS = 8000;
export const NPM_PACKUMENT_URL = "https://registry.npmjs.org/notecraftapp";

type Semver = { major: number; minor: number; patch: number; pre: string };

export function parseSemver(v: string): Semver | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(v).trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ?? "" };
}

/** 數值比較；同版號時有 prerelease 的較小。無法解析的排最小。 */
export function cmpSemver(a: string, b: string): number {
  const x = parseSemver(a);
  const y = parseSemver(b);
  if (!x || !y) return x ? 1 : y ? -1 : 0;
  if (x.major !== y.major) return x.major - y.major;
  if (x.minor !== y.minor) return x.minor - y.minor;
  if (x.patch !== y.patch) return x.patch - y.patch;
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

export function isStable(v: string): boolean {
  const s = parseSemver(v);
  return !!s && !s.pre;
}

export function levelOf(cur: string, latest: string): UpdLevel | null {
  if (cmpSemver(cur, latest) >= 0) return null;
  const a = parseSemver(cur);
  const b = parseSemver(latest);
  if (!a || !b) return null;
  if (a.major !== b.major) return "major";
  if (a.minor !== b.minor) return "minor";
  return "patch";
}

/** `>=N`、`>=N.x.y`、`^N`、`N.x` → N；其他寫法推不出 → null（不警示，只顯示原字串）。 */
export function nodeNeedOf(engines: string | null | undefined): number | null {
  if (!engines) return null;
  const s = engines.trim();
  const m = /^(?:>=\s*|\^)?(\d+)(?:\.(?:\d+|x|\*))?(?:\.(?:\d+|x|\*))?$/.exec(s);
  if (!m) return null;
  // 純數字「22」也當成 >=22；「22.x」同
  return Number(m[1]);
}

type Packument = {
  "dist-tags"?: { latest?: unknown };
  versions?: Record<string, { engines?: { node?: unknown }; deprecated?: unknown; dist?: { unpackedSize?: unknown; fileCount?: unknown } }>;
  time?: Record<string, unknown>;
};

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** 由 npm packument 推出結果；外形不對時 throw（呼叫端視同失敗）。 */
export function deriveResult(packument: unknown, cur: string, userNode: string): UpdResult {
  const p = packument as Packument;
  const latest = p && typeof p === "object" ? str(p["dist-tags"]?.latest) : null;
  const versions = p && typeof p === "object" && p.versions && typeof p.versions === "object" ? p.versions : null;
  if (!latest || !versions) throw new Error("packument 缺少 dist-tags.latest 或 versions");
  const time = p.time && typeof p.time === "object" ? p.time : {};
  const ahead = cmpSemver(cur, latest) > 0;
  const missed = Object.keys(versions)
    .filter((v) => isStable(v) && cmpSemver(v, cur) > 0 && cmpSemver(v, latest) <= 0)
    .sort((a, b) => cmpSemver(b, a));
  const lv = versions[latest] ?? {};
  const engines = str(lv.engines?.node);
  const nodeNeed = nodeNeedOf(engines);
  const userMajor = parseInt(String(userNode).split(".")[0], 10);
  const level = levelOf(cur, latest);
  return {
    cur,
    curDate: str(time[cur]),
    latest,
    latestDate: str(time[latest]),
    level,
    ahead,
    behind: level ? missed.length : 0,
    missed: level ? missed : [],
    engines,
    nodeNeed,
    userNode,
    needsNode: nodeNeed !== null && Number.isFinite(userMajor) && userMajor < nodeNeed,
    deprecated: str(versions[cur]?.deprecated),
    size: num(lv.dist?.unpackedSize),
    files: num(lv.dist?.fileCount),
  };
}

export function updTone(res: UpdResult | null): UpdTone | null {
  if (!res) return null;
  if (res.deprecated) return "danger";
  if (res.level === "major") return "major";
  if (res.level) return "info";
  return null;
}

/** Rail 圓點與「關於」頁籤徽章的顯示條件（兩者永遠同步）。已棄用不能略過。 */
export function railHintOf(res: UpdResult | null, skipped: string | null): RailHint | null {
  const tone = updTone(res);
  if (!res || !tone) return null;
  if (skipped === res.latest && !res.deprecated) return null;
  const label = res.deprecated
    ? `目前版本 v${res.cur} 已棄用`
    : `有新版 v${res.latest}，落後 ${res.behind} 個版本`;
  return { tone, n: res.behind, label };
}

function isResult(r: unknown): r is UpdResult {
  const x = r as UpdResult;
  return !!x && typeof x === "object" && typeof x.cur === "string" && typeof x.latest === "string" && Array.isArray(x.missed);
}

/** 讀快取；JSON 壞、外形不對、cur 與目前版本不同 → null（整份作廢）。 */
export function readCache(raw: string | null, cur: string): UpdCache | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as UpdCache;
    if (!c || typeof c !== "object" || c.cur !== cur || typeof c.at !== "number" || !isResult(c.res) || c.res.cur !== cur) return null;
    return {
      cur: c.cur,
      at: c.at,
      res: c.res,
      toasted: typeof c.toasted === "string" ? c.toasted : null,
      skipped: typeof c.skipped === "string" ? c.skipped : null,
    };
  } catch {
    return null;
  }
}

export function isFresh(cache: UpdCache | null, now: number): boolean {
  return !!cache && now - cache.at >= 0 && now - cache.at < UPD_TTL_MS;
}

/** 只有自動檢查發現新版、同一版沒跳過、沒被略過（已棄用例外）時才跳 toast。 */
export function shouldToast(
  res: UpdResult,
  state: { toasted: string | null; skipped: string | null },
  manual: boolean,
): boolean {
  if (manual || !res.level) return false;
  if (state.toasted === res.latest) return false;
  return state.skipped !== res.latest || !!res.deprecated;
}

/** 「剛剛」／「N 分鐘前」／「N 小時前」／「N 天前」 */
export function agoLabel(ms: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60) return "剛剛";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}

/** 今天／昨天／N 天前（<14）／N 週前（<60 天）／N 個月前 */
export function daysLabel(iso: string | null, now: number): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const startOf = (x: number) => {
    const d = new Date(x);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const d = Math.round((startOf(now) - startOf(t)) / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 14) return `${d} 天前`;
  if (d < 60) return `${Math.floor(d / 7)} 週前`;
  return `${Math.max(2, Math.floor(d / 30))} 個月前`;
}

/** 2026/09/15 */
export function ymdSlash(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).replace(/-/g, "/") : "";
  const d = new Date(t);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/** 1.4 MB、820 KB（1024 進位、一位小數） */
export function sizeLabel(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** `git+https://github.com/x/y.git` → `https://github.com/x/y/blob/main/`；推不出 → "" */
export function repoBlobBaseOf(repositoryUrl: string | null | undefined): string {
  const m = /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[#?].*)?$/.exec(String(repositoryUrl ?? ""));
  return m ? `https://github.com/${m[1]}/${m[2]}/blob/main/` : "";
}
