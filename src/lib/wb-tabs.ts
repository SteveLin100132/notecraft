// 筆記頁籤的純函式（規格 docs/notecraft-workbench-note-tabs.md §4）。
// 頁籤是存在 localStorage 的「已開啟清單」；這裡只做清單運算，讀寫 localStorage 在 wb-tabs-store.ts。
//
// scripts/checks/wb-tabs.mjs 以 Node 原生 strip-types 直接載入本檔做斷言，所以：
// **只能 import type、不能有 JSX、不碰 window／localStorage／Date.now()**（時間由呼叫端傳入）。
// 唯一例外是帶副檔名的 ./base.ts（純函式；Node 下沒有 import.meta.env，前綴是空字串）。
// 所有函式回傳新物件，不改傳入值。

import { withBase } from "./base.ts";

export type TabKind = "note" | "view";

export interface TabEntry {
  kind: TabKind;
  /** note：slug（entry.id）；view：routePath（不含 view: 前綴） */
  id: string;
  /** `${kind}:${id}` —— view 的 key 剛好等於系列章節識別碼 */
  key: string;
  pinned: boolean;
  /** 上次 #nc-scroll 的 scrollTop */
  scroll: number;
  /** 最後聚焦時間（ms）；LRU 與「上一個 active」都用它 */
  at: number;
  /** 顯示用快照（規格 §4.3，Q1）。可能過期；解析到新值就覆寫 */
  title: string;
  path: string;
  /** 待生成 AI 標記數；資料檔恆為 0 */
  pending: number;
}

export interface TabStore {
  v: 1;
  tabs: TabEntry[];
  /** 最近關閉，新的在前 */
  closed: TabEntry[];
}

/** 頁面透過 layout 傳給 TabBar 的「目前頁面」 */
export interface TabSelf {
  kind: TabKind;
  id: string;
  title: string;
  path: string;
  pending: number;
}

export type TabSnapshot = { title: string; path: string; pending: number };

/** 未固定頁籤上限（Q3） */
export const TAB_MAX = 20;
/** 最近關閉堆疊上限 */
export const TAB_CLOSED_MAX = 10;

export const tabKey = (kind: TabKind, id: string): string => `${kind}:${id}`;
/** localStorage key，依工作區分開（Q5） */
export const tabStorageKey = (workspace: string): string => `nc-tabs-v1:${workspace}`;

export function emptyStore(): TabStore {
  return { v: 1, tabs: [], closed: [] };
}

function validEntry(x: unknown): x is TabEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    (e.kind === "note" || e.kind === "view") &&
    typeof e.id === "string" &&
    e.id !== "" &&
    e.key === `${e.kind}:${e.id}` &&
    typeof e.pinned === "boolean" &&
    typeof e.scroll === "number" &&
    typeof e.at === "number" &&
    typeof e.title === "string" &&
    typeof e.path === "string" &&
    typeof e.pending === "number"
  );
}

function dedupe(list: TabEntry[]): TabEntry[] {
  const seen = new Set<string>();
  return list.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));
}

/** 容錯解析：壞 JSON、版本不符、欄位型別不對 → 丟掉，不 throw */
export function parseStore(raw: string | null): TabStore {
  if (!raw) return emptyStore();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyStore();
  }
  if (!data || typeof data !== "object") return emptyStore();
  const d = data as Record<string, unknown>;
  if (d.v !== 1 || !Array.isArray(d.tabs)) return emptyStore();
  const tabs = dedupe(d.tabs.filter(validEntry));
  const closed = Array.isArray(d.closed) ? dedupe(d.closed.filter(validEntry)).slice(0, TAB_CLOSED_MAX) : [];
  return normalize({ v: 1, tabs, closed });
}

/** 固定頁籤排最前，兩區各自保持相對順序 */
export function normalize(store: TabStore): TabStore {
  const pinned = store.tabs.filter((t) => t.pinned);
  const rest = store.tabs.filter((t) => !t.pinned);
  return { ...store, tabs: [...pinned, ...rest] };
}

/** `at` 最大者（新頁面載入時，它就是剛離開的頁籤） */
export function mostRecent(tabs: TabEntry[]): TabEntry | null {
  let best: TabEntry | null = null;
  for (const t of tabs) if (!best || t.at > best.at) best = t;
  return best;
}

function pushClosed(closed: TabEntry[], entries: TabEntry[]): TabEntry[] {
  // entries 依關閉順序；最後關的要在最前面
  const fresh = entries.slice().reverse();
  return dedupe([...fresh, ...closed]).slice(0, TAB_CLOSED_MAX);
}

function insertAfterRecent(tabs: TabEntry[], entry: TabEntry): TabEntry[] {
  const prev = mostRecent(tabs);
  const list = tabs.slice();
  if (!prev) list.push(entry);
  else list.splice(list.indexOf(prev) + 1, 0, entry);
  return list;
}

function evict(store: TabStore, keep: string): { store: TabStore; evicted: TabEntry | null } {
  const unpinned = store.tabs.filter((t) => !t.pinned);
  if (unpinned.length <= TAB_MAX) return { store, evicted: null };
  let victim: TabEntry | null = null;
  for (const t of unpinned) if (t.key !== keep && (!victim || t.at < victim.at)) victim = t;
  if (!victim) return { store, evicted: null };
  const v = victim;
  return {
    store: { ...store, tabs: store.tabs.filter((t) => t !== v), closed: pushClosed(store.closed, [v]) },
    evicted: v,
  };
}

/** 開啟／聚焦目前頁面 */
export function ensure(store: TabStore, self: TabSelf, now: number): { store: TabStore; evicted: TabEntry | null } {
  const key = tabKey(self.kind, self.id);
  const snap: TabSnapshot = { title: self.title, path: self.path, pending: self.pending };
  if (store.tabs.some((t) => t.key === key)) {
    return { store: { ...store, tabs: store.tabs.map((t) => (t.key === key ? { ...t, ...snap, at: now } : t)) }, evicted: null };
  }
  const entry: TabEntry = { kind: self.kind, id: self.id, key, pinned: false, scroll: 0, at: now, ...snap };
  const next = normalize({ ...store, tabs: insertAfterRecent(store.tabs, entry) });
  return evict(next, key);
}

/** 關閉（固定頁籤略過），被關的推入 closed */
export function close(store: TabStore, keys: string[]): TabStore {
  const ks = new Set(keys);
  const gone = store.tabs.filter((t) => ks.has(t.key) && !t.pinned);
  if (gone.length === 0) return store;
  const goneSet = new Set(gone);
  // 依 keys 的順序視為關閉順序
  const ordered = keys.map((k) => gone.find((t) => t.key === k)).filter((t): t is TabEntry => !!t);
  return { ...store, tabs: store.tabs.filter((t) => !goneSet.has(t)), closed: pushClosed(store.closed, ordered) };
}

export function closeOthers(store: TabStore, key: string): TabStore {
  return close(store, store.tabs.filter((t) => t.key !== key).map((t) => t.key));
}

export function closeRight(store: TabStore, key: string): TabStore {
  const i = store.tabs.findIndex((t) => t.key === key);
  if (i < 0) return store;
  return close(store, store.tabs.slice(i + 1).map((t) => t.key));
}

export function closeAll(store: TabStore): TabStore {
  return close(store, store.tabs.map((t) => t.key));
}

/** 實際會被關掉的 key（固定的不算），給呼叫端判斷要不要導覽 */
export function closable(store: TabStore, keys: string[]): string[] {
  const ks = new Set(keys);
  return store.tabs.filter((t) => ks.has(t.key) && !t.pinned).map((t) => t.key);
}

export function togglePin(store: TabStore, key: string): TabStore {
  if (!store.tabs.some((t) => t.key === key)) return store;
  return normalize({ ...store, tabs: store.tabs.map((t) => (t.key === key ? { ...t, pinned: !t.pinned } : t)) });
}

/** 先移除 from、再插到 to 原本的索引（與 prototype 相同）；跨固定／一般區不動 */
export function move(store: TabStore, fromKey: string, toKey: string): TabStore {
  const a = store.tabs.findIndex((t) => t.key === fromKey);
  const b = store.tabs.findIndex((t) => t.key === toKey);
  if (a < 0 || b < 0 || a === b || store.tabs[a].pinned !== store.tabs[b].pinned) return store;
  const list = store.tabs.slice();
  const [x] = list.splice(a, 1);
  list.splice(b, 0, x);
  return { ...store, tabs: list };
}

/** 關閉 key 後要去的頁籤：右鄰，否則左鄰；跳過同一批被關掉的 */
export function neighborAfterClose(store: TabStore, key: string, closing: Set<string> = new Set([key])): TabEntry | null {
  const i = store.tabs.findIndex((t) => t.key === key);
  if (i < 0) return null;
  for (let j = i + 1; j < store.tabs.length; j++) if (!closing.has(store.tabs[j].key)) return store.tabs[j];
  for (let j = i - 1; j >= 0; j--) if (!closing.has(store.tabs[j].key)) return store.tabs[j];
  return null;
}

/** 重開最近關閉的（略過不存在、已開的）；保留原 scroll，固定歸 false */
export function popClosed(
  store: TabStore,
  exists: (key: string) => boolean,
  now: number,
): { store: TabStore; entry: TabEntry | null } {
  const open = new Set(store.tabs.map((t) => t.key));
  const hit = store.closed.find((t) => exists(t.key) && !open.has(t.key));
  if (!hit) return { store, entry: null };
  const entry: TabEntry = { ...hit, pinned: false, at: now };
  const closed = store.closed.filter((t) => t !== hit);
  const next = normalize({ ...store, closed, tabs: insertAfterRecent(store.tabs, entry) });
  const out = evict(next, entry.key);
  return { store: out.store, entry };
}

/** 移除解析不到的頁籤（closed 一併清） */
export function prune(store: TabStore, exists: (key: string) => boolean): { store: TabStore; removed: TabEntry[] } {
  const removed = store.tabs.filter((t) => !exists(t.key));
  const closed = store.closed.filter((t) => exists(t.key));
  if (removed.length === 0 && closed.length === store.closed.length) return { store, removed };
  return { store: { ...store, tabs: store.tabs.filter((t) => exists(t.key)), closed }, removed };
}

/** 下一個／上一個（循環）；不在頁籤頁時回到 at 最大者 */
export function cycle(store: TabStore, activeKey: string | null, dir: 1 | -1): TabEntry | null {
  const n = store.tabs.length;
  if (n === 0) return null;
  const i = activeKey ? store.tabs.findIndex((t) => t.key === activeKey) : -1;
  if (i < 0) return mostRecent(store.tabs);
  return store.tabs[(i + dir + n) % n];
}

export function setScroll(store: TabStore, key: string, y: number): TabStore {
  if (!store.tabs.some((t) => t.key === key)) return store;
  const v = Math.max(0, Math.round(y));
  return { ...store, tabs: store.tabs.map((t) => (t.key === key ? { ...t, scroll: v } : t)) };
}

/** 用索引覆寫快照（Q1 的第三來源）；resolve 回傳 null 表示查不到，維持原值 */
export function refreshSnapshot(store: TabStore, resolve: (t: TabEntry) => TabSnapshot | null): TabStore {
  const fix = (t: TabEntry): TabEntry => {
    const s = resolve(t);
    return s ? { ...t, ...s } : t;
  };
  return { ...store, tabs: store.tabs.map(fix), closed: store.closed.map(fix) };
}

export function hrefOf(t: Pick<TabEntry, "kind" | "id">): string {
  return withBase(t.kind === "note" ? `/notes/${t.id}` : `/view/${t.id}`);
}

/** title 屬性：標題／路徑／待生成數 */
export function tabTooltip(t: Pick<TabEntry, "title" | "path" | "pending">): string {
  return [t.title, t.path, t.pending > 0 ? `待生成 AI 標記 ${t.pending}` : ""].filter(Boolean).join("\n");
}
