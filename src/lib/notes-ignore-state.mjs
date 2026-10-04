// `.notecraft/ignore.json` 的 build／dev 期單例（docs/notecraft-ignore-config.md §4.3、§7）。
//
// 同一個 process 內 Content config、plugins.ts、series.ts、remark plugin、dev-api handlers 共用一份。
// 掛在 globalThis：astro.config 載入的模組與 Vite SSR 模組圖各有一份模組實例，掛模組層會讀兩次、印兩次訊息。
// dev 期間 ignore.json 變動由 notes-ignore-integration.mjs 先 reset 再重啟 dev server；
// CLI serve 的背景 rebuild 是子行程，每次都重新載入。

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  deadNegations,
  findShadowedIgnoreFiles,
  loadNotesIgnore,
  resolveNotecraftDir,
  resolveNotesDir,
  toNotesRel,
  walkNotes,
} from "./notes-ignore.mjs";

const KEY = Symbol.for("notecraft.notesIgnore");

/**
 * 訊息只印相對路徑（不得出現本機絕對路徑）：以「.notecraft/ 所在的資料夾」為基準，
 * 目前讀的那份恆為 `.notecraft/ignore.json`，被遮蔽的那份像 `docs/.notecraft/ignore.json`。
 */
function shown(abs, notecraftDir) {
  const rel = path.relative(path.dirname(notecraftDir), abs);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return rel.split(path.sep).join("/");
  return abs.split(path.sep).slice(-3).join("/");
}

export function getNotesDir() {
  return resolveNotesDir(process.env, process.cwd());
}

export function getNotecraftDir() {
  return resolveNotecraftDir(process.env, process.cwd());
}

/**
 * 取得目前的比對器；第一次呼叫時讀檔並印訊息。格式錯誤直接 throw（Q4 = build fail）。
 * @returns {import("./notes-ignore.d.mts").LoadedNotesIgnore}
 */
export function getNotesIgnore() {
  const g = /** @type {Record<symbol, unknown>} */ (globalThis);
  if (g[KEY]) return /** @type {import("./notes-ignore.d.mts").LoadedNotesIgnore} */ (g[KEY]);
  const notesDir = getNotesDir();
  const notecraftDir = getNotecraftDir();
  const ig = loadNotesIgnore(notecraftDir);
  g[KEY] = ig;
  report(ig, notesDir, notecraftDir);
  return ig;
}

/** 讓下一次 getNotesIgnore() 重新讀檔（dev 重啟前、CLI 換新比對器時）。 */
export function resetNotesIgnore() {
  delete (/** @type {Record<symbol, unknown>} */ (globalThis))[KEY];
}

/** 相對 notesDir 的絕對路徑是否被排除；落在 notesDir 外 → false。 */
export function isIgnoredAbs(abs, isDir = false) {
  const rel = toNotesRel(getNotesDir(), abs);
  if (!rel) return false;
  return getNotesIgnore().ignores(isDir ? `${rel}/` : rel);
}

/** glob loader 的 base 必須是 file URL（Windows 的 "D:\..." 會被當成 scheme，見 content/config.ts）。 */
export function notesBaseUrl(notesDir) {
  return pathToFileURL(notesDir + path.sep);
}

/** Content Layer entry 的 filePath（相對 Astro root 的 posix 路徑）→ 相對 notesDir 的路徑；在外面回 null。 */
export function entryRelToNotes(rootUrl, filePath, notesDir) {
  return toNotesRel(notesDir, path.resolve(fileURLToPath(rootUrl), filePath));
}

function report(ig, notesDir, notecraftDir) {
  const label = ".notecraft/ignore.json";
  for (const k of ig.unknownKeys) {
    console.warn(`[ignore] ${label} 有不認得的欄位 "${k}"（只認 "ignore" 與 "$schema"），已略過`);
  }
  for (const p of ig.builtinNegations) {
    console.warn(`[ignore] "${p}" 不會生效：. 開頭、node_modules/、dist/ 是內建排除，無法以 ! 解除`);
  }
  for (const f of findShadowedIgnoreFiles(notesDir, notecraftDir)) {
    console.warn(`[ignore] 找到 ${shown(f, notecraftDir)}，但目前讀的是 ${label}，前者不會生效`);
  }
  if (!ig.source || ig.ruleCount === 0) return;
  // 統計只算使用者規則命中的（內建排除不算）；被剪枝的資料夾算一個、不深入計檔數
  const { prunedDirs, ignoredFiles } = walkNotes(notesDir, ig);
  const dirs = prunedDirs.filter((d) => ig.ignoresByUser(d));
  const files = ignoredFiles.filter((f) => ig.ignoresByUser(f));
  const parts = [];
  if (dirs.length) parts.push(`${dirs.length} 個資料夾`);
  parts.push(`${files.length} 個檔案`);
  console.log(`[ignore] ${label}：${ig.ruleCount} 條規則，排除 ${parts.join("、")}（另有內建排除）`);
  for (const p of deadNegations(ig, prunedDirs)) {
    const dir = prunedDirs.find((d) => p.slice(1).replace(/^\//, "").startsWith(d));
    console.warn(`[ignore] "${p}" 不會生效：${dir} 整個資料夾已被排除，請改寫成 ${dir}*`);
  }
}
