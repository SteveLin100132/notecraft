// 定義與引用的 build／dev 期索引（docs/notecraft-workbench-define-ref.md §4.2）。
//
// remark plugin、workbench.ts、dev-api（含 CLI 的純 Node）共用一份。掛在 globalThis：
// astro.config 載入的模組與 Vite SSR 模組圖各有一份模組實例（同 notes-ignore-state.mjs）。
// 正式 build 只算一次；dev 期間（defs-integration 會設 dev 旗標）每次呼叫以各檔 mtime＋size 判斷要不要重算。
//
// 訊息只用 notesDir 相對路徑，不得出現本機絕對路徑。

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import matter from "gray-matter";
import { walkNotes } from "./notes-ignore.mjs";
import { getNotesDir, getNotesIgnore } from "./notes-ignore-state.mjs";
import { buildDefIndex } from "./defs-index.mjs";

export { MAX_INCLUDE_DEPTH, buildDefIndex, rebaseRelativeUrl, slugOfNotePath } from "./defs-index.mjs";

const KEY = Symbol.for("notecraft.defs");

/** @typedef {import("./defs-state.d.mts").DefIndex} DefIndex */
/** @typedef {import("./defs-state.d.mts").DefEntry} DefEntry */
/** @typedef {import("./defs-state.d.mts").DefNote} DefNote */

function listNoteFiles(notesDir) {
  /** @type {{ rel: string, abs: string, mtimeMs: number, size: number }[]} */
  const out = [];
  walkNotes(notesDir, getNotesIgnore(), ({ rel, abs }) => {
    if (!/\.(md|mdx)$/i.test(rel)) return;
    try {
      const st = fs.statSync(abs);
      out.push({ rel, abs, mtimeMs: st.mtimeMs, size: st.size });
    } catch {
      /* 競態：當作不存在 */
    }
  });
  return out;
}

/**
 * Q8：已追蹤的筆記引用了 git-ignored 筆記裡的 define → warn（本機 build 會過、部署後那篇不存在就失敗）。
 * 不在 git repo、沒有 git → 略過。
 */
function gitIgnoredWarnings(index, notesDir) {
  const rels = new Set();
  for (const n of index.notes.values()) {
    for (const r of n.references) {
      rels.add(n.rel);
      rels.add(/** @type {DefEntry} */ (index.defs.get(r.id)).rel);
    }
  }
  if (rels.size === 0) return [];
  let res;
  try {
    res = spawnSync("git", ["check-ignore", "--stdin"], { cwd: notesDir, input: [...rels].join("\n"), encoding: "utf8" });
  } catch {
    return [];
  }
  if (res.error || (res.status !== 0 && res.status !== 1)) return []; // 128：不是 git repo
  const ignored = new Set(res.stdout.split("\n").map((s) => s.trim().replace(/\\/g, "/")).filter(Boolean));
  const out = [];
  for (const n of index.notes.values()) {
    if (ignored.has(n.rel)) continue;
    for (const r of n.references) {
      const d = /** @type {DefEntry} */ (index.defs.get(r.id));
      if (ignored.has(d.rel)) out.push(`${n.rel} 引用了 ${d.rel} 的定義「${d.id}」，但後者被 git 忽略：推上去之後那篇不存在，build 會失敗`);
    }
  }
  return out;
}

function fingerprint(list) {
  return list.map((f) => `${f.rel}\0${f.mtimeMs}\0${f.size}`).join("\n");
}

/**
 * 目前 notesDir 的索引。正式 build 只算一次；dev 旗標開著時，檔案有變就重算。
 * @returns {DefIndex}
 */
export function getDefIndex() {
  const g = /** @type {Record<symbol, any>} */ (globalThis);
  const st = g[KEY] ?? (g[KEY] = { index: null, fp: "", dev: false, warned: new Set() });
  if (st.index && !st.dev) return st.index;
  const notesDir = getNotesDir();
  const list = listNoteFiles(notesDir);
  const fp = fingerprint(list);
  if (st.index && st.fp === fp) return st.index;
  const files = list.map((f) => ({ rel: f.rel, source: fs.readFileSync(f.abs, "utf8") }));
  // frontmatter 用 gray-matter（與 Content Layer 的 YAML 解析一致）
  const index = buildDefIndex(files, { frontmatter: (s) => matter(s).data ?? {} });
  index.warnings.push(...gitIgnoredWarnings(index, notesDir));
  for (const w of index.warnings) {
    if (st.warned.has(w)) continue;
    st.warned.add(w);
    console.warn(`[defs] ${w}`);
  }
  st.index = index;
  st.fp = fp;
  return index;
}

/** 有錯誤就 throw（一次列出全部）。 */
export function assertDefIndex(index = getDefIndex()) {
  if (index.errors.length === 0) return;
  throw new Error(`[defs] 定義與引用有 ${index.errors.length} 個錯誤：\n${index.errors.map((e) => `  - ${e}`).join("\n")}`);
}

/** 下一次 getDefIndex() 一定重算（dev integration 用）。 */
export function resetDefIndex() {
  const g = /** @type {Record<symbol, any>} */ (globalThis);
  if (g[KEY]) g[KEY].index = null;
}

/** dev 期間每次呼叫都檢查檔案有沒有變（defs-integration 在 astro:server:setup 打開）。 */
export function setDefIndexDev(on) {
  const g = /** @type {Record<symbol, any>} */ (globalThis);
  const st = g[KEY] ?? (g[KEY] = { index: null, fp: "", dev: false, warned: new Set() });
  st.dev = on;
}

/** notesDir 底下絕對路徑 → 相對路徑（給 integration 比對用）。 */
export function relOfNoteAbs(abs) {
  const rel = path.relative(getNotesDir(), abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/** NOTECRAFT_BASE 前綴（與 remark-notecraft-base.ts 同一套規則）；remark plugin 用（.ts 不碰 process，避免 tsc 錯誤）。 */
export function siteBase() {
  const raw = process.env.NOTECRAFT_BASE ?? "";
  return raw === "/" ? "" : raw.replace(/\/+$/, "");
}

/** remark 的 file.path（可能是相對 cwd）→ notesDir 相對路徑；不在 notesDir 底下回 null。 */
export function relOfNoteFile(filePath) {
  return relOfNoteAbs(path.resolve(filePath));
}

