// 每個筆記資料夾一份的執行目錄（run root）與鎖檔（docs/notecraft-multi-instance.md §5、§6；Task 157）。
//
// 為什麼要有：Astro 的 content layer 把狀態寫在 root 底下（`.astro/data-store.json`、`node_modules/.astro/`），
// 位置不分筆記資料夾；所有工作區共用 ~/.notecraft/app-<v>/ 當 root 時，兩個同時執行的 view／serve 會互相覆寫內容。
// 這裡讓每個筆記資料夾在 ~/.notecraft/cache/<hash>/app/ 有一份自己的 app 副本（約 3 MB），node_modules 以連結共用。
//
// 模組頂層不可有副作用：scripts/checks/run-root.mjs 會直接 import（notecraftapp.mjs 頂層會 re-exec，不能被載入）。
// 只 import node:*。

import fs from "node:fs";
import path from "node:path";

/** 執行目錄的配置版本；改了配置就 +1，既有執行目錄與 build 快取都會重建（Q7）。 */
export const RUN_ROOT_LAYOUT = 1;

export const RUN_STAMP_FILE = ".nc-run.json";
export const STATE_DIR = ".nc-state";
// 鎖檔放在執行目錄外（cache/<hash>/）：要先拿到鎖才能重建執行目錄，重建會整個刪掉 app/。
export const LOCK_FILE = "run.lock.json";

/** 不複製進執行目錄的頂層項目：CLI 自己、說明文件、只有 CLI 用的 skill 範本。 */
const NOT_NEEDED_AT_RUNTIME = new Set(["bin", "README.md", "CHANGELOG.md", "LICENSE", "skill-template"]);

// ── 純函式 ─────────────────────────────────────────────

/** @param {string} cacheDir ~/.notecraft/cache/<hash> */
export function runRootDirFor(cacheDir) {
  return path.join(cacheDir, "app");
}

/**
 * 由 package.json 的 `files` 推出要複製的頂層項目。glob 與子路徑收斂到第一段（`src/components/*.astro` → `src`），
 * 去重、保留順序；`package.json` 一律收（npm 不必列也會發佈，workbench.ts 以 cwd 讀它取版本）。
 * @param {readonly string[]} pkgFiles
 * @returns {string[]}
 */
export function runRootEntries(pkgFiles) {
  const out = ["package.json"];
  for (const raw of pkgFiles ?? []) {
    if (typeof raw !== "string") continue;
    const first = raw.replace(/^\.\//, "").split("/")[0];
    if (!first || /[*?[\]{}!]/.test(first) || first === "." || first === "..") continue;
    if (NOT_NEEDED_AT_RUNTIME.has(first) || out.includes(first)) continue;
    out.push(first);
  }
  return out;
}

/**
 * @typedef {{ layout: number, appVersion: string, appRoot: string }} RunStamp
 * @typedef {RunStamp & { devPackage: boolean, linkOk: boolean }} RunCurrent
 */

/**
 * 執行目錄要不要重建（§5.3）。
 * @param {unknown} stamp `.nc-run.json` 讀到的值（可能是 null 或壞掉的物件）
 * @param {RunCurrent} current
 * @returns {{ resync: boolean, why: string }}
 */
export function needsResync(stamp, current) {
  if (!stamp || typeof stamp !== "object") return { resync: true, why: "第一次建立執行目錄" };
  const s = /** @type {Partial<RunStamp>} */ (stamp);
  if (s.layout !== current.layout) return { resync: true, why: `執行目錄配置從 ${s.layout ?? "（無）"} 變成 ${current.layout}` };
  if (s.appVersion !== current.appVersion) {
    return { resync: true, why: `app 版本從 ${s.appVersion ?? "（無）"} 變成 ${current.appVersion}` };
  }
  if (s.appRoot !== current.appRoot) return { resync: true, why: "app 位置改變" };
  if (!current.linkOk) return { resync: true, why: "node_modules 連結不存在或目標已不存在" };
  if (current.devPackage) return { resync: true, why: "開發套件（NOTECRAFTAPP_DEV=1）每次啟動都重新同步" };
  return { resync: false, why: "" };
}

/**
 * @typedef {{ pid: number, command: string, url?: string | null, startedAt?: string }} LockInfo
 */

/**
 * @param {unknown} lock 鎖檔內容（可能是 null 或壞掉的物件）
 * @param {(pid: number) => boolean} isAlive
 * @returns {"free" | "held" | "stale"}
 */
export function lockState(lock, isAlive) {
  if (lock === null || lock === undefined) return "free";
  const pid = /** @type {{ pid?: unknown }} */ (lock)?.pid;
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return "stale";
  return isAlive(pid) ? "held" : "stale";
}

/** @param {LockInfo} lock */
export function formatLockMessage(lock) {
  const who = `${lock.command}，pid ${lock.pid}`;
  if (lock.url) return `這個筆記資料夾已經在 ${lock.url} 執行中（${who}）。要同時開，請先關掉它。`;
  return `這個筆記資料夾正在 build（${who}）。請等它結束再執行。`;
}

// ── 有副作用 ───────────────────────────────────────────

/** @param {number} pid */
export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return /** @type {NodeJS.ErrnoException} */ (e).code === "EPERM";
  }
}

/** @param {string} p */
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/** node_modules 連結存在且目標存在。 @param {string} runRoot */
function linkOk(runRoot) {
  try {
    return fs.statSync(path.join(runRoot, "node_modules")).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 建立或沿用執行目錄（§5.3）：複製到 app.next/ → 建 node_modules 連結 → 寫戳記 → 換掉舊的 app/。
 * @param {{ appRoot: string, cacheDir: string, appVersion: string, devPackage?: boolean, log?: (msg: string) => void }} opts
 * @returns {string} 執行目錄的絕對路徑
 */
export function ensureRunRoot({ appRoot, cacheDir, appVersion, devPackage = false, log = () => {} }) {
  const runRoot = runRootDirFor(cacheDir);
  const current = {
    layout: RUN_ROOT_LAYOUT,
    appVersion,
    appRoot: path.resolve(appRoot),
    devPackage,
    linkOk: linkOk(runRoot),
  };
  const { resync, why } = needsResync(readJson(path.join(runRoot, RUN_STAMP_FILE)), current);
  if (!resync) return runRoot;

  log(`準備執行目錄：${why}`);
  const pkg = readJson(path.join(appRoot, "package.json"));
  const entries = runRootEntries(Array.isArray(pkg?.files) ? pkg.files : []);
  const nextDir = `${runRoot}.next`;
  fs.rmSync(nextDir, { recursive: true, force: true });
  fs.mkdirSync(nextDir, { recursive: true });
  for (const name of entries) {
    const src = path.join(appRoot, name);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(nextDir, name), { recursive: true });
  }
  // Windows 用 junction：不需要系統管理員或開發人員模式（§9.1）
  fs.symlinkSync(path.join(appRoot, "node_modules"), path.join(nextDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  /** @type {RunStamp} */
  const stamp = { layout: RUN_ROOT_LAYOUT, appVersion, appRoot: current.appRoot };
  fs.writeFileSync(path.join(nextDir, RUN_STAMP_FILE), JSON.stringify(stamp, null, 2) + "\n");
  // 舊目錄的 .nc-state/、.astro/ 一起丟掉：換版或重建時本來就該重來。
  // 刪連結用 rmSync 不會跟進目標（node_modules 本體不受影響）。
  fs.rmSync(runRoot, { recursive: true, force: true });
  fs.renameSync(nextDir, runRoot);
  return runRoot;
}

/**
 * 取得筆記資料夾的鎖（§6）。過期的鎖（pid 已不存在）直接覆寫。必須在 ensureRunRoot 之前呼叫。
 * @param {string} cacheDir ~/.notecraft/cache/<hash>
 * @param {{ command: string, url?: string | null }} info
 * @returns {{ ok: true, release: () => void } | { ok: false, lock: LockInfo }}
 */
export function acquireLock(cacheDir, { command, url = null }) {
  const file = path.join(cacheDir, LOCK_FILE);
  fs.mkdirSync(cacheDir, { recursive: true });
  /** @type {LockInfo} */
  const mine = { pid: process.pid, command, url, startedAt: new Date().toISOString() };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(file, "wx");
      fs.writeSync(fd, JSON.stringify(mine, null, 2) + "\n");
      fs.closeSync(fd);
      let released = false;
      return {
        ok: true,
        release: () => {
          if (released) return;
          released = true;
          try {
            // 只刪自己的鎖（被當成過期而覆寫後，不要刪掉別人的）
            if (readJson(file)?.pid === process.pid) fs.unlinkSync(file);
          } catch {}
        },
      };
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code !== "EEXIST") throw e;
      const lock = readJson(file);
      const state = lockState(lock, isPidAlive);
      if (state === "held") return { ok: false, lock };
      fs.rmSync(file, { force: true }); // stale 或 free（剛好被刪掉）：重試
    }
  }
  const lock = readJson(file);
  return { ok: false, lock: lock ?? { pid: 0, command: "?" } };
}
