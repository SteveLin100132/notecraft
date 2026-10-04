// `.notecraft/ignore.json`：類 .gitignore 的排除規則（docs/notecraft-ignore-config.md）。
//
// 寫成 .mjs 是因為三種執行環境都要用：Astro／Vite（.ts 呼叫端）、src/dev-api/handlers.mjs
// （astro dev 與 CLI 共用）、bin/notecraftapp.mjs（純 Node）。型別在 notes-ignore.d.ts。
//
// 本模組不做快取（build 期單例在 notes-ignore-state.mjs），純函式可在 scripts/checks 直接斷言。
// 走訪 notesDir 一律用這裡的 walkNotes()／walkNotesAsync()，不要再自寫 readdir 遞迴。

import fs from "node:fs";
import path from "node:path";
import ignore from "ignore";

export const IGNORE_FILE = "ignore.json";

/** POST /api/notes 與 npm run new-note 共用：目標位置被排除時的訊息。 */
export const IGNORED_LOCATION_MESSAGE = "這個位置被 .notecraft/ignore.json 排除，建立後不會出現在 NoteCraft";

/**
 * 內建排除（規格 §3.4）：不必寫、不能用 `!` 解除（Q5）。
 * 加在使用者規則**之後**，`ignore` 的「後寫的勝」讓 `!node_modules/` 之類覆蓋不到。
 */
export const BUILTIN_IGNORES = [".*", "node_modules/", "dist/"];

/** 去掉註解、空白；`\#` 開頭保留（交給 ignore 解讀成字面的 #）。 */
function cleanPatterns(patterns) {
  return patterns.filter((p) => p.trim() !== "" && !p.startsWith("#"));
}

/**
 * `ignore` 對未閉合的 `[` 之類的寫法是靜默當成不命中；靜默失效會讓私人筆記上站（Q4），
 * 所以自己先擋最常見的一種：沒有對應 `]` 的 `[`。回傳錯誤說明或 null。
 */
function patternError(p) {
  let open = false;
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (!open && c === "[") open = true;
    else if (open && c === "]") open = false;
  }
  return open ? "「[」沒有對應的「]」（要比對字面的 [ 請寫 \\[）" : null;
}

/**
 * 從規則字串建立比對器。純函式、無 I/O。
 * @param {readonly string[]} patterns
 * @param {{ source?: string | null }} [opts]
 */
export function createNotesIgnore(patterns, opts = {}) {
  const rules = cleanPatterns(patterns);
  rules.forEach((p, i) => {
    const err = patternError(p);
    if (err) throw new Error(`第 ${i + 1} 條規則 "${p}" 無效：${err}`);
  });
  const user = ignore().add(rules);
  const all = ignore().add(rules).add(BUILTIN_IGNORES);
  const builtin = ignore().add(BUILTIN_IGNORES);
  const builtinNegations = rules.filter((p) => {
    if (!p.startsWith("!")) return false;
    const target = p.slice(1).replace(/^\//, "").replace(/\/\*\*$/, "/");
    if (!target || target.includes("*")) return false;
    return safeIgnores(builtin, target) || (!target.endsWith("/") && safeIgnores(builtin, `${target}/`));
  });
  return {
    ignores(relPath) {
      assertRel(relPath);
      return all.ignores(relPath);
    },
    /** 只看使用者規則（不含內建）：給「排除 N 個檔案」的統計。 */
    ignoresByUser(relPath) {
      assertRel(relPath);
      return user.ignores(relPath);
    },
    ruleCount: rules.length,
    rules,
    source: opts.source ?? null,
    builtinNegations,
  };
}

function safeIgnores(ig, p) {
  try {
    return ig.ignores(p);
  } catch {
    return false;
  }
}

/** relPath：相對 notesDir、以 / 分隔；資料夾帶結尾 /。 */
function assertRel(relPath) {
  if (typeof relPath !== "string" || relPath === "" || relPath === "/") {
    throw new Error(`[ignore] 路徑必須是相對 notesDir 的非空字串，收到 ${JSON.stringify(relPath)}`);
  }
  if (relPath.includes("\\")) throw new Error(`[ignore] 路徑要以 / 分隔，收到 "${relPath}"`);
  if (relPath.startsWith("/")) throw new Error(`[ignore] 路徑必須相對 notesDir，收到 "${relPath}"`);
  if (relPath.split("/").some((s) => s === ".." || s === ".")) {
    throw new Error(`[ignore] 路徑不可含 . 或 .. 片段，收到 "${relPath}"`);
  }
}

/**
 * 解析 ignore.json 的內容。純函式。
 * @param {string} text
 * @param {string} sourceLabel 訊息用（相對路徑，例 ".notecraft/ignore.json"）
 */
export function parseIgnoreJson(text, sourceLabel) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`[ignore] ${sourceLabel} 不是合法的 JSON：${e.message}`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`[ignore] ${sourceLabel} 的頂層必須是物件，例：{ "ignore": ["drafts/"] }`);
  }
  const raw = data.ignore ?? [];
  if (!Array.isArray(raw)) {
    throw new Error(`[ignore] ${sourceLabel} 的 "ignore" 必須是字串陣列`);
  }
  raw.forEach((p, i) => {
    if (typeof p !== "string") {
      throw new Error(`[ignore] ${sourceLabel} 的 "ignore" 第 ${i + 1} 個元素不是字串（收到 ${JSON.stringify(p)}）`);
    }
  });
  const unknownKeys = Object.keys(data).filter((k) => k !== "ignore" && k !== "$schema");
  return { patterns: raw, unknownKeys };
}

/**
 * notesDir：NOTECRAFT_NOTES_DIR，否則主專案的 src/content/notes。
 * @param {Record<string, string | undefined>} env
 * @param {string} cwd
 */
export function resolveNotesDir(env, cwd) {
  return env.NOTECRAFT_NOTES_DIR ? path.resolve(env.NOTECRAFT_NOTES_DIR) : path.resolve(cwd, "src/content/notes");
}

/**
 * `.notecraft/` 的位置，唯一一份實作：NOTECRAFT_USER_CWD > NOTECRAFT_NOTES_DIR > cwd。
 * renderer 經 `@notes` alias 找、plugins.json／ignore.json 從這裡讀，兩者必須是同一處。
 */
export function resolveNotecraftDir(env, cwd) {
  if (env.NOTECRAFT_USER_CWD) return path.join(path.resolve(env.NOTECRAFT_USER_CWD), ".notecraft");
  if (env.NOTECRAFT_NOTES_DIR) return path.join(path.resolve(env.NOTECRAFT_NOTES_DIR), ".notecraft");
  return path.join(cwd, ".notecraft");
}

/**
 * 讀 <notecraftDir>/ignore.json。不存在 → 只有內建排除；格式錯誤 → throw（Q4）。
 * @param {string} notecraftDir
 * @param {string} [sourceLabel]
 */
export function loadNotesIgnore(notecraftDir, sourceLabel = `.notecraft/${IGNORE_FILE}`) {
  const file = path.join(notecraftDir, IGNORE_FILE);
  let text;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch (e) {
    if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return { ...createNotesIgnore([]), unknownKeys: [] };
    throw new Error(`[ignore] 讀 ${sourceLabel} 失敗：${e.message}`);
  }
  const { patterns, unknownKeys } = parseIgnoreJson(text.replace(/^﻿/, ""), sourceLabel);
  let ig;
  try {
    ig = createNotesIgnore(patterns, { source: file });
  } catch (e) {
    throw new Error(`[ignore] ${sourceLabel} ${e.message}`);
  }
  return { ...ig, unknownKeys };
}

/** Q6：只讀一處。notesDir/.notecraft/ignore.json 存在但不是目前讀的那份 → 回傳它（給 warn）。 */
export function findShadowedIgnoreFiles(notesDir, notecraftDir) {
  const near = path.join(notesDir, ".notecraft", IGNORE_FILE);
  if (path.resolve(near) === path.resolve(path.join(notecraftDir, IGNORE_FILE))) return [];
  return fs.existsSync(near) ? [near] : [];
}

/** 絕對路徑 → 相對 notesDir 的 / 路徑；落在 notesDir 外回 null。 */
export function toNotesRel(notesDir, abs) {
  const rel = path.relative(notesDir, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * 同步走訪 notesDir：被排除的資料夾不進入（剪枝）、被排除的檔案略過。
 * @param {string} notesDir
 * @param {ReturnType<typeof createNotesIgnore>} ig
 * @param {(e: { rel: string; abs: string; dirent: import("node:fs").Dirent }) => void} [onFile]
 * @param {(e: { rel: string; abs: string }) => void} [onDir] 沒被排除的資料夾（rel 帶結尾 /）
 */
export function walkNotes(notesDir, ig, onFile, onDir) {
  const prunedDirs = [];
  const ignoredFiles = [];
  const walk = (dir, prefix) => {
    let ents;
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // 權限或競態：當作空
    }
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of ents) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        const rel = `${prefix}${e.name}/`;
        if (ig.ignores(rel)) {
          prunedDirs.push(rel);
          continue;
        }
        onDir?.({ rel, abs });
        walk(abs, rel);
      } else if (e.isFile()) {
        const rel = `${prefix}${e.name}`;
        if (ig.ignores(rel)) {
          ignoredFiles.push(rel);
          continue;
        }
        onFile?.({ rel, abs, dirent: e });
      }
    }
  };
  walk(notesDir, "");
  return { prunedDirs, ignoredFiles };
}

/** walkNotes 的 async 版（callback 可回傳 Promise，依序等待）。 */
export async function walkNotesAsync(notesDir, ig, onFile, onDir) {
  const prunedDirs = [];
  const ignoredFiles = [];
  const walk = async (dir, prefix) => {
    let ents;
    try {
      ents = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of ents) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        const rel = `${prefix}${e.name}/`;
        if (ig.ignores(rel)) {
          prunedDirs.push(rel);
          continue;
        }
        if (onDir) await onDir({ rel, abs });
        await walk(abs, rel);
      } else if (e.isFile()) {
        const rel = `${prefix}${e.name}`;
        if (ig.ignores(rel)) {
          ignoredFiles.push(rel);
          continue;
        }
        if (onFile) await onFile({ rel, abs, dirent: e });
      }
    }
  };
  await walk(notesDir, "");
  return { prunedDirs, ignoredFiles };
}

/**
 * 不會生效的 `!` 規則：目標落在某個被剪枝（整個排除）的資料夾內。
 * 例：`archive/` ＋ `!archive/keep.mdx` —— git 一樣救不回，要改寫成 `archive/*`。
 * @param {{ rules: readonly string[] }} ig
 * @param {readonly string[]} prunedDirs
 */
export function deadNegations(ig, prunedDirs) {
  return ig.rules.filter((p) => {
    if (!p.startsWith("!")) return false;
    const target = p.slice(1).replace(/^\//, "");
    return prunedDirs.some((d) => target.startsWith(d) && target.length > d.length);
  });
}
