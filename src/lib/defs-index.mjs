// 定義與引用的索引計算（docs/notecraft-workbench-define-ref.md §4.2）：一組檔案 → defines、反向連結、跨檔錯誤。
//
// 純計算、不碰檔案系統與 Node API：app 的 defs-state.mjs（build／dev／CLI）與官網的瀏覽器示範共用同一份規則。
// 只 import github-slugger（瀏覽器可用）與零 import 的 defs-scan.mjs。

import { slug as githubSlug } from "github-slugger";
import { scanDefs, suggestIds } from "./defs-scan.mjs";

/** @typedef {import("./defs-state.d.mts").DefIndex} DefIndex */
/** @typedef {import("./defs-state.d.mts").DefEntry} DefEntry */
/** @typedef {import("./defs-state.d.mts").DefNote} DefNote */

/** 嵌入深度上限（§3.1）：A 嵌入 B、B 嵌入 C… 超過這個層數就 build fail。 */
export const MAX_INCLUDE_DEPTH = 4;

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
 * frontmatter 的 title／slug（輕量版：只認單行的 `key: value`，可帶引號）。
 * app 端（defs-state.mjs）改用 gray-matter，與 Content Layer 的 YAML 解析一致；官網的瀏覽器示範用這個。
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
export function readFrontmatterLite(source) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  if (!m) return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^(title|slug):\s*(.*?)\s*$/.exec(line);
    if (!kv) continue;
    out[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

/**
 * 以一組檔案（rel → 原始碼）建索引。純計算、不碰檔案系統：scripts/checks/defs.mjs 以它測跨檔規則，
 * 官網的示範在瀏覽器裡也用它。
 * @param {{ rel: string, source: string }[]} files
 * @param {{ frontmatter?: (source: string) => Record<string, unknown> }} [opts]
 * @returns {DefIndex}
 */
export function buildDefIndex(files, opts = {}) {
  const readFm = opts.frontmatter ?? readFrontmatterLite;
  /** @type {DefIndex} */
  const index = { defs: new Map(), notes: new Map(), errors: [], warnings: [] };
  /** @type {Map<string, string>} rel → slug */
  const slugOf = new Map();

  for (const f of files) {
    /** @type {Record<string, any>} */
    let fm = {};
    try {
      fm = readFm(f.source) ?? {};
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


/** 正斜線路徑的 dirname／normalize（不依賴 node:path，瀏覽器也能用） */
function posixDir(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}
function posixNormalize(p) {
  const out = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === ".." && out.length && out[out.length - 1] !== "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

/** 相對 URL 以來源檔解析，再改成相對於目前檔（include 的圖片、連結）。 */
export function rebaseRelativeUrl(url, srcRel, curRel) {
  const target = posixNormalize(`${posixDir(srcRel)}/${url}`).split("/");
  const from = posixNormalize(posixDir(curRel)).split("/").filter(Boolean);
  let i = 0;
  while (i < from.length && i < target.length - 1 && from[i] === target[i]) i++;
  const rel = [...Array(from.length - i).fill(".."), ...target.slice(i)].join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}
