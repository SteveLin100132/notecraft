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
import { slug as githubSlug } from "github-slugger";
import { walkNotes } from "./notes-ignore.mjs";
import { getNotesDir, getNotesIgnore } from "./notes-ignore-state.mjs";
import { scanDefs, suggestIds } from "./defs-scan.mjs";

const KEY = Symbol.for("notecraft.defs");
/** 嵌入深度上限（§3.1）：A 嵌入 B、B 嵌入 C… 超過這個層數就 build fail。 */
export const MAX_INCLUDE_DEPTH = 4;

/** @typedef {import("./defs-state.d.mts").DefIndex} DefIndex */
/** @typedef {import("./defs-state.d.mts").DefEntry} DefEntry */
/** @typedef {import("./defs-state.d.mts").DefNote} DefNote */

/**
 * Content Layer 預設 generateId 的規則（astro/dist/content/loaders/glob.js，Task 125 確認）：
 * frontmatter 有 slug 就用它；否則去副檔名、逐段 github-slugger、去掉結尾 /index。
 * @param {string} rel notesDir 相對路徑（正斜線）
 * @param {unknown} [fmSlug]
 */
export function slugOfNotePath(rel, fmSlug) {
  if (typeof fmSlug === "string" && fmSlug) return fmSlug;
  return rel
    .replace(/\.(md|mdx)$/i, "")
    .split("/")
    .map((s) => githubSlug(s))
    .join("/")
    .replace(/\/index$/, "");
}

/** notes.ts 的 fallbackTitle：H1 → slug 轉 Title Case。 */
function fallbackTitle(slug, h1) {
  if (h1) return h1;
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

/** 資料夾樹順序（workbench.ts buildFolderTree 同一套 localeCompare）：逐段比較，資料夾在前、根目錄最先。 */
function folderOrder(a, b) {
  const sa = a.split("/");
  const sb = b.split("/");
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const lastA = i === sa.length - 1;
    const lastB = i === sb.length - 1;
    if (lastA !== lastB) return lastA ? -1 : 1; // 根目錄（同層的檔案）先於子資料夾
    const c = sa[i].localeCompare(sb[i], "zh-Hant");
    if (c !== 0) return c;
  }
  return sa.length - sb.length;
}

/**
 * 以一組檔案（rel → 原始碼）建索引。純計算、不碰檔案系統，scripts/checks/defs-index.mjs 直接用它測跨檔規則。
 * @param {{ rel: string, source: string }[]} files
 * @returns {DefIndex}
 */
export function buildDefIndex(files) {
  /** @type {DefIndex} */
  const index = { defs: new Map(), notes: new Map(), errors: [], warnings: [] };
  /** @type {Map<string, string>} rel → slug */
  const slugOf = new Map();

  for (const f of files) {
    let fm = {};
    try {
      fm = matter(f.source).data ?? {};
    } catch {
      /* frontmatter 壞掉交給 Content Layer 報錯 */
    }
    const slug = slugOfNotePath(f.rel, fm.slug);
    slugOf.set(f.rel, slug);
    const scan = scanDefs(f.source);
    const title = typeof fm.title === "string" && fm.title ? fm.title : fallbackTitle(slug, scan.h1);
    const folder = f.rel.includes("/") ? f.rel.slice(0, f.rel.lastIndexOf("/")) : "";
    for (const e of scan.errors) index.errors.push(`${f.rel}:${e.line} ${e.message}`);
    /** @type {DefNote} */
    const note = { slug, rel: f.rel, title, folder, defines: [], includes: scan.includes, refs: scan.refs, references: [] };
    index.notes.set(slug, note);
    for (const d of scan.defines) {
      const prev = index.defs.get(d.id);
      if (prev) {
        index.errors.push(`${f.rel}:${d.line} 定義 id「${d.id}」重複（另一處在 ${prev.rel}:${prev.line}）`);
        continue;
      }
      note.defines.push(d.id);
      index.defs.set(d.id, {
        id: d.id,
        label: d.label,
        rel: f.rel,
        slug,
        title,
        folder,
        line: d.line,
        source: d.source,
        components: d.components,
        includes: scan.includes.filter((u) => u.inDefine === d.id).map((u) => u.id),
        refs: [],
      });
    }
  }

  // 找不到 id
  const allIds = [...index.defs.keys()];
  for (const n of index.notes.values()) {
    for (const [kind, uses] of /** @type {const} */ ([["include", n.includes], [":ref", n.refs]])) {
      for (const u of uses) {
        if (index.defs.has(u.id)) continue;
        const sug = suggestIds(u.id, allIds);
        index.errors.push(`${n.rel}:${u.line} ${kind} 找不到定義「${u.id}」${sug.length ? `（是不是 ${sug.map((s) => `「${s}」`).join("、")}？）` : ""}`);
      }
    }
  }

  // 循環嵌入與深度：define 之間的 include 圖
  /** @type {Map<string, number>} */
  const depthMemo = new Map();
  const reported = new Set();
  /** @param {string} id @param {string[]} trail */
  const depth = (id, trail) => {
    if (trail.includes(id)) {
      const cyc = [...trail.slice(trail.indexOf(id)), id];
      const key = [...cyc].sort().join("|");
      if (!reported.has(key)) {
        reported.add(key);
        const d = index.defs.get(id);
        index.errors.push(`${d ? `${d.rel}:${d.line} ` : ""}循環嵌入：${cyc.join(" → ")}`);
      }
      return Infinity;
    }
    if (depthMemo.has(id)) return /** @type {number} */ (depthMemo.get(id));
    const d = index.defs.get(id);
    if (!d) return 0;
    let max = 0;
    for (const c of d.includes) max = Math.max(max, depth(c, [...trail, id]));
    const v = max === Infinity ? Infinity : max + 1;
    depthMemo.set(id, v);
    return v;
  };
  for (const id of index.defs.keys()) depth(id, []); // 沒被任何筆記引用的 define 之間也要抓得到環
  for (const n of index.notes.values()) {
    for (const u of n.includes) {
      if (!index.defs.has(u.id) || u.inDefine) continue;
      const v = depth(u.id, []);
      if (v !== Infinity && v > MAX_INCLUDE_DEPTH) {
        index.errors.push(`${n.rel}:${u.line} 嵌入層數 ${v} 超過上限 ${MAX_INCLUDE_DEPTH}（include「${u.id}」）`);
      }
    }
  }

  // 反向連結（§4.2）：同篇合併 kinds；自己的 define 不計；define 內的引用計入來源筆記（掃描時本來就記在來源檔）
  for (const n of index.notes.values()) {
    /** @type {Map<string, Set<"inc" | "ref">>} */
    const kinds = new Map();
    for (const [k, uses] of /** @type {const} */ ([["inc", n.includes], ["ref", n.refs]])) {
      for (const u of uses) {
        const d = index.defs.get(u.id);
        if (!d || d.slug === n.slug) continue;
        if (!kinds.has(u.id)) kinds.set(u.id, new Set());
        /** @type {Set<"inc" | "ref">} */ (kinds.get(u.id)).add(k);
      }
    }
    for (const [id, set] of kinds) {
      const k = /** @type {("inc" | "ref")[]} */ (["inc", "ref"].filter((x) => set.has(/** @type {"inc" | "ref"} */ (x))));
      n.references.push({ id, kinds: k });
      /** @type {DefEntry} */ (index.defs.get(id)).refs.push({ slug: n.slug, kinds: k });
    }
  }
  // 排序：引用的 id 數多到少（以「該篇引用了同一份來源的幾個 id」計），同數依資料夾樹順序
  for (const d of index.defs.values()) {
    const bySrc = (slug) => (index.notes.get(slug)?.references ?? []).filter((r) => index.defs.get(r.id)?.slug === d.slug).length;
    const relOf = (slug) => index.notes.get(slug)?.rel ?? slug;
    d.refs.sort((a, b) => bySrc(b.slug) - bySrc(a.slug) || folderOrder(relOf(a.slug), relOf(b.slug)));
  }
  return index;
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
  const index = buildDefIndex(files);
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

/** 相對 URL 以來源檔解析，再改成相對於目前檔（include 的圖片、連結）。 */
export function rebaseRelativeUrl(url, srcRel, curRel) {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(srcRel), url));
  const rel = path.posix.relative(path.posix.dirname(curRel), target);
  return rel.startsWith(".") ? rel : `./${rel}`;
}
