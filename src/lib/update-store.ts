// 檢查更新的狀態（client only；規格 docs/notecraft-workbench-update-check.md §3、§4.5、§5）。
//
// ES module 在同一頁是單例：UpdateHost、SettingsView、Palette 拿到的是同一份（與 wb-escape.ts、wb-tabs-store.ts 同一招）。
// 狀態推導全在 update-check.ts／changelog-parse.ts 的純函式；這裡只管「什麼時候查、存在哪、通知誰」。
//
// 規則：
// - 自動檢查失敗零痕跡：不寫 at、不顯示任何東西、不在 console 印錯誤；只有手動檢查失敗寫 err
// - nc-update-v1 的 cur 與目前版本不同就整份作廢（readCache）；寫入前先重讀，storage 事件同步其他分頁
// - localStorage 不可用時改用模組變數（只在這一頁有效）

import {
  deriveResult,
  isFresh,
  NPM_PACKUMENT_URL,
  readCache,
  shouldToast,
  UPD_STORAGE_KEY,
  UPD_TIMEOUT_MS,
  type UpdCache,
  type UpdResult,
} from "./update-check";
import { parseChangelog, type ClVersion } from "./changelog-parse";
import { stripBase, withBase } from "./base";

export interface UpdEnv {
  cur: string;
  userNode: string;
  /** https://github.com/<owner>/<repo>/blob/main/；推不出時為空字串 */
  repoBlobBase: string;
}

export type ClStatus = "idle" | "loading" | "ok" | "error";

export interface UpdState {
  /** idle = 從未成功檢查 */
  status: "idle" | "checking" | "done";
  res: UpdResult | null;
  checkedAt: number | null;
  err: string | null;
  drawer: boolean;
  /** 目前顯示中的 toast */
  toast: UpdResult | null;
  skipped: string | null;
  cl: { status: ClStatus; key: string; versions: ClVersion[] | null };
  /** Palette 在 /settings 上選「檢查更新」時遞增，SettingsView 據此切到「關於」 */
  focusAbout: number;
}

export const UPD_ERR_MSG = "目前無法連線到 npm，稍後再試";
const NEXT_KEY = "nc-update-next";

const INITIAL: UpdState = {
  status: "idle",
  res: null,
  checkedAt: null,
  err: null,
  drawer: false,
  toast: null,
  skipped: null,
  cl: { status: "idle", key: "", versions: null },
  focusAbout: 0,
};

let env: UpdEnv | null = null;
let state: UpdState = INITIAL;
let mem: UpdCache | null = null; // localStorage 不可用時的備援
let memToasted: string | null = null;
const subs = new Set<() => void>();
let inflight: Promise<void> | null = null;
let manualPending = false;
let booted = false;

function set(patch: Partial<UpdState>): void {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}

export function getUpd(): UpdState {
  return state;
}
/** SSR 與 hydration 用：一律是「尚未檢查」（CLAUDE.md：靠 localStorage 的東西 SSR 一律當作沒有） */
export function getServerUpd(): UpdState {
  return INITIAL;
}
export function subscribeUpd(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}
export function getUpdEnv(): UpdEnv | null {
  return env;
}

function readStored(): UpdCache | null {
  if (!env) return null;
  try {
    return readCache(localStorage.getItem(UPD_STORAGE_KEY), env.cur);
  } catch {
    return mem && mem.cur === env.cur ? mem : null;
  }
}
function writeStored(c: UpdCache): void {
  mem = c;
  try {
    localStorage.setItem(UPD_STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* 隱私模式、配額：只留在記憶體 */
  }
}

function onStorage(e: StorageEvent): void {
  if (e.key !== UPD_STORAGE_KEY || !env) return;
  const c = readCache(e.newValue, env.cur);
  if (!c) return;
  const same = state.res && state.res.latest === c.res.latest;
  set({
    res: c.res,
    checkedAt: c.at,
    skipped: c.skipped,
    status: "done",
    // 別的分頁已經跳過這一版的 toast，這裡同步收起
    toast: state.toast && c.toasted === state.toast.latest ? null : state.toast,
    cl: same ? state.cl : INITIAL.cl,
  });
}

/** 第一次呼叫生效。讀快取放進狀態（render 前就有上次結果），並掛 storage 同步 */
export function initUpdate(e: UpdEnv): void {
  if (env || typeof window === "undefined") return;
  env = e;
  const c = readStored();
  if (c) state = { ...state, res: c.res, checkedAt: c.at, skipped: c.skipped, status: "done" };
  window.addEventListener("storage", onStorage);
}

/** 開頁自動檢查：快取未過期就沿用；離線直接略過；背景分頁等可見再查 */
export function boot(): void {
  if (booted || !env) return;
  booted = true;
  if (isFresh(readStored(), Date.now())) return;
  if (navigator.onLine === false) return;
  if (document.visibilityState === "hidden") {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVis);
      void check(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return;
  }
  void check(false);
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPD_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

/** 查 registry。進行中重複呼叫回傳同一個 Promise（不重複發請求） */
export function check(manual: boolean): Promise<void> {
  if (!env) return Promise.resolve();
  if (manual) manualPending = true;
  if (inflight) {
    if (manual) set({ err: null });
    return inflight;
  }
  const e = env;
  set({ status: "checking", err: null });
  inflight = (async () => {
    try {
      const res = deriveResult(JSON.parse(await fetchText(NPM_PACKUMENT_URL)), e.cur, e.userNode);
      const now = Date.now();
      const prev = readStored();
      const toasted = prev?.toasted ?? memToasted;
      const skipped = prev?.skipped ?? state.skipped;
      const wasManual = manualPending;
      const toast = shouldToast(res, { toasted, skipped }, wasManual);
      if (toast) memToasted = res.latest;
      writeStored({ cur: e.cur, at: now, res, toasted: toast ? res.latest : toasted, skipped });
      const sameCl = state.res && state.res.latest === res.latest && state.res.ahead === res.ahead && !!state.res.level === !!res.level;
      set({
        status: "done",
        res,
        checkedAt: now,
        skipped,
        err: null,
        toast: toast ? res : state.toast,
        cl: sameCl ? state.cl : INITIAL.cl,
      });
    } catch {
      set({ status: state.res ? "done" : "idle", err: manualPending ? UPD_ERR_MSG : null });
    } finally {
      inflight = null;
      manualPending = false;
    }
  })();
  return inflight;
}

function persistSkipped(skipped: string | null): void {
  if (!env) return;
  const prev = readStored();
  if (prev) writeStored({ ...prev, skipped });
}

export function skip(v: string): void {
  persistSkipped(v);
  set({ skipped: v, toast: null });
}
export function unskip(): void {
  persistSkipped(null);
  set({ skipped: null });
}
export function openDrawer(): void {
  if (!state.res) return;
  set({ drawer: true, toast: null });
}
export function closeDrawer(): void {
  set({ drawer: false });
}
export function dismissToast(): void {
  set({ toast: null });
}

function onSettingsPage(): boolean {
  return stripBase(location.pathname).replace(/\/+$/, "") === "/settings";
}

/** Palette「檢查更新」：在 /settings 就切到「關於」並立即檢查；否則交棒給下一頁（規格 §3.2） */
export function requestCheckOnSettings(): void {
  if (onSettingsPage()) {
    set({ focusAbout: state.focusAbout + 1 });
    void check(true);
    return;
  }
  try {
    sessionStorage.setItem(NEXT_KEY, "check");
  } catch {
    /* 交棒失敗就只是換頁，到了「關於」再按一次 */
  }
  location.href = withBase("/settings?tab=about");
}

/** UpdateHost 掛載時呼叫：上一頁交棒的手動檢查 */
export function takeHandoff(): boolean {
  try {
    if (sessionStorage.getItem(NEXT_KEY) !== "check") return false;
    sessionStorage.removeItem(NEXT_KEY);
    return true;
  } catch {
    return false;
  }
}

/** GitHub 上 CHANGELOG 的網址（連結用與 raw） */
export function changelogLinks(): { page: string; raw: string } {
  const base = env?.repoBlobBase ?? "";
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/$/.exec(base);
  return {
    page: base ? base + "CHANGELOG.md" : "",
    raw: m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/CHANGELOG.md` : "",
  };
}

/**
 * 取 CHANGELOG（規格 §4.3）：jsDelivr 的 @<latest>（已是最新用 @<cur>）→ GitHub raw main；目前版本較新直接用 raw。
 * 同一頁同一個 key 只抓一次（失敗也不重試，Drawer 顯示失敗狀態與 GitHub 連結）
 */
export function loadChangelog(): void {
  const res = state.res;
  if (!res || !env) return;
  const v = res.level ? res.latest : res.cur;
  const key = (res.ahead ? "raw:" : "") + v;
  if (state.cl.key === key && state.cl.status !== "idle") return;
  const { raw } = changelogLinks();
  const urls = [...(res.ahead ? [] : [`https://cdn.jsdelivr.net/npm/notecraftapp@${v}/CHANGELOG.md`]), ...(raw ? [raw] : [])];
  set({ cl: { status: "loading", key, versions: null } });
  void (async () => {
    for (const u of urls) {
      try {
        const versions = parseChangelog(await fetchText(u));
        if (versions.length === 0) continue;
        if (state.cl.key === key) set({ cl: { status: "ok", key, versions } });
        return;
      } catch {
        /* 換下一個來源 */
      }
    }
    if (state.cl.key === key) set({ cl: { status: "error", key, versions: null } });
  })();
}
