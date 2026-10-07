// P6：純 JS ESM 版本的 dev-api 邏輯，讓 Astro integration（開發時）與 CLI 的 Node HTTP server（v1 生產）
// 都能直接 import。若後續要新增 API 或動路徑安全規則，只改這一份。

import { promises as fs } from "node:fs";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { slug as githubSlug } from "github-slugger";
import { buildDefIndex } from "../lib/defs-state.mjs";
import {
  createNotesIgnore,
  IGNORED_LOCATION_MESSAGE,
  loadNotesIgnore,
  resolveNotecraftDir as resolveNotecraftDirFromEnv,
  toNotesRel,
  walkNotesAsync,
} from "../lib/notes-ignore.mjs";

// ── 路徑決策 & 安全檢查 ────────────────────────────────────────────────

export function resolveNotesRoot(cwd) {
  const env = process.env.NOTECRAFT_NOTES_DIR;
  return env ? path.resolve(cwd, env) : path.resolve(cwd, "src/content/notes");
}

export function isViewerMode() {
  return Boolean(process.env.NOTECRAFT_NOTES_DIR);
}

/** .notecraft/ 的位置：唯一實作在 src/lib/notes-ignore.mjs（USER_CWD > NOTES_DIR > cwd）。 */
export function resolveNotecraftDir(cwd) {
  const env = { ...process.env };
  if (env.NOTECRAFT_NOTES_DIR) env.NOTECRAFT_NOTES_DIR = path.resolve(cwd, env.NOTECRAFT_NOTES_DIR);
  return resolveNotecraftDirFromEnv(env, cwd);
}

// ── .notecraft/ignore.json（docs/notecraft-ignore-config.md §5.3）─────────────────
// 被排除的檔不讀也不寫：標籤統計／改名／刪除、資料夾下拉、slug 查找、notes-assets 都看不到它。
// 依 notecraftDir 快取一份；astro dev 由 notes-ignore-integration 重啟前 reset，CLI serve 換新比對器時 reset。
// 格式錯誤時 throw，由各分派入口的 catch 回 500（訊息不含本機絕對路徑）。

const ignoreCache = new Map();

function ignoreFor(cwd) {
  const dir = resolveNotecraftDir(cwd);
  let ig = ignoreCache.get(dir);
  if (!ig) {
    ig = loadNotesIgnore(dir);
    ignoreCache.set(dir, ig);
  }
  return ig;
}

export function resetHandlersIgnore() {
  ignoreCache.clear();
}

/** 絕對路徑（或資料夾）是否被排除；落在 notesRoot 外 → false（由 assertSafePath 另外擋）。 */
function isIgnored(ig, notesRoot, abs, isDir = false) {
  const rel = toNotesRel(notesRoot, abs);
  if (!rel) return false;
  try {
    return ig.ignores(isDir ? `${rel}/` : rel);
  } catch {
    return false;
  }
}


export async function assertSafePath(candidate, notesRoot) {
  const abs = path.resolve(candidate);
  const rootWithSep = notesRoot.endsWith(path.sep) ? notesRoot : notesRoot + path.sep;
  if (!abs.startsWith(rootWithSep) && abs !== notesRoot) {
    throw new Error(`path outside notesRoot: ${abs}`);
  }
  // 目標還不存在（新增筆記、要 mkdir 的資料夾）時，realpath 往上找最近一層存在的祖先：
  // 否則 notesRoot 內指向外面的 symlink 資料夾，會讓尚未建立的檔案繞過檢查。
  // notesRoot 本身可能在 symlink 底下（macOS 的 /tmp），所以兩邊都比對 realpath。
  let realRoot = notesRoot;
  try {
    realRoot = await fs.realpath(notesRoot);
  } catch {}
  const realRootWithSep = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
  let probe = abs;
  for (;;) {
    try {
      const real = await fs.realpath(probe);
      const inside =
        real === notesRoot || real.startsWith(rootWithSep) || real === realRoot || real.startsWith(realRootWithSep);
      if (!inside) throw new Error(`symlink target outside notesRoot: ${real}`);
      break;
    } catch (e) {
      if (!e || e.code !== "ENOENT") throw e;
      const parent = path.dirname(probe);
      if (probe === notesRoot || parent === probe) break;
      probe = parent;
    }
  }
  return abs;
}

/**
 * GET /api/folders 回傳的每一項都以這個字串開頭：notesRoot 在 cwd 底下時是相對路徑
 * （主專案 "src/content/notes/"），否則是 notesRoot 絕對路徑加分隔符（viewer 的筆記資料夾通常不在 package root 底下）。
 */
function folderDisplayRoot(cwd, notesRoot) {
  const rel = path.relative(cwd, notesRoot);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return notesRoot.endsWith(path.sep) ? notesRoot : notesRoot + path.sep;
  }
  return rel.split(path.sep).join("/") + "/";
}

/**
 * 新增筆記表單的 folder 值 → notesRoot 底下的絕對資料夾路徑。
 * 接受 /api/folders 的原樣（含上面的顯示前綴）或相對 notesRoot 的路徑；空值＝notesRoot。
 * 其餘絕對路徑、含 ".." 的路徑一律拒絕；symlink 逃脫由 assertSafePath 擋。
 */
async function resolveNoteFolder(cwd, notesRoot, raw) {
  let folder = typeof raw === "string" ? raw.trim().replace(/\\/g, "/") : "";
  const displayRoot = folderDisplayRoot(cwd, notesRoot).replace(/\\/g, "/");
  const displayBare = displayRoot.replace(/\/+$/, "");
  if (folder === displayBare || folder.startsWith(displayRoot)) {
    folder = folder.slice(displayRoot.length);
  } else if (folder.startsWith("/") || /^[A-Za-z]:/.test(folder)) {
    throw new Error("folder must be inside notesRoot");
  }
  const segments = folder.split("/").filter((s) => s && s !== ".");
  if (segments.includes("..")) throw new Error("folder must not contain ..");
  return assertSafePath(path.join(notesRoot, ...segments), notesRoot);
}

/** 檔案路徑 → Content Layer glob loader 的 entry id（逐段 github-slugger、去掉結尾 /index）。 */
function noteIdFromFile(notesRoot, abs) {
  const rel = path.relative(notesRoot, abs).replace(/\.(mdx|md)$/i, "");
  return rel
    .split(path.sep)
    .map((s) => githubSlug(s))
    .join("/")
    .replace(/\/index$/, "");
}

// ── 小工具 ────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(s) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\w一-鿿\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) || "untitled-note"
  );
}

function normalizeTagList(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Map();
  for (const item of arr) {
    const t = String(item).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) seen.set(k, t);
  }
  return Array.from(seen.values());
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/** notesRoot 底下所有沒被排除的 .md／.mdx（絕對路徑）。 */
async function listMdx(root, ig) {
  const out = [];
  await walkNotesAsync(root, ig, ({ rel, abs }) => {
    if (rel.endsWith(".mdx") || rel.endsWith(".md")) out.push(abs);
  });
  return out;
}

/** API 用的 slug 查找：被排除的筆記當作不存在（舊頁籤或書籤對它改標籤、刪除都是 404）。 */
async function findVisibleNoteFile(notesRoot, slug, ig) {
  const file = await findNoteFile(notesRoot, slug);
  return file && !isIgnored(ig, notesRoot, file) ? file : null;
}

// slug 對應到 <notesRoot>/<slug>.mdx 或 .md（slug 對齊 Content Layer glob 的 entry.id，
// 巢狀路徑會含 /，例如 "test/test1"）。path.resolve + assertSafePath 一體處理路徑逃逸。
async function findNoteFile(notesRoot, slug) {
  for (const ext of [".mdx", ".md"]) {
    const abs = path.resolve(notesRoot, `${slug}${ext}`);
    try {
      await assertSafePath(abs, notesRoot);
    } catch {
      return null;
    }
    try {
      const s = await fs.stat(abs);
      if (s.isFile()) return abs;
    } catch {
      // ENOENT → 試下一個副檔名
    }
  }
  return null;
}

async function readNote(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  return { raw, data: parsed.data, content: parsed.content };
}

/**
 * 原子寫入：先寫同目錄的 `.<name>.tmp` 再 rename。
 * 直接 writeFile 會讓 Astro dev 的 glob loader 收到 add + change 兩個事件、對同一檔同時跑兩次 sync，
 * 兩次都寫 `.astro/data-store.json`（tmp + rename）→ 第二次 rename ENOENT，緊接著渲染新筆記會拋
 * UnknownContentCollectionError。rename 是單一事件，loader 只 sync 一次。tmp 以 `.` 開頭且副檔名 `.tmp`，
 * 不會被 notes collection 的 md／mdx glob 掃到。
 */
async function writeFileAtomic(filePath, text) {
  const tmp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.tmp`);
  await fs.writeFile(tmp, text, "utf8");
  try {
    await fs.rename(tmp, filePath);
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}

async function writeNote(filePath, data, content) {
  const out = matter.stringify(content, data);
  await writeFileAtomic(filePath, out);
}

const TEMPLATE = (title, tagsYaml, includeMarker) => `---
title: ${JSON.stringify(title)}
description: ""
tags: ${tagsYaml}
createdAt: "${todayISO()}"
updatedAt: "${todayISO()}"
---

在此撰寫筆記內文。
${includeMarker ? `
## 概念

於下方標記區塊填入提示詞，描述你想看到的視覺化。

{/* @ai-visualize
id: placeholder
type: free
status: pending
prompt: |
  在這裡描述你想要的視覺化或互動，例如：
  「用一張流程圖呈現……」
*/}

接著在 Claude Code 中執行 content-visualize-skill，AI 會掃描標記、生成元件，並在標記下方插入對應的 \`import\` 與 \`<Component client:visible />\`。
` : ""}`;

// ── /notes-assets/* ────────────────────────────────────────────────

const MIME_MAP = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

async function handleNotesAsset(notesRoot, urlPath, res, ig) {
  const raw = urlPath.replace(/^\/notes-assets\//, "").split("?")[0].split("#")[0];
  let relPath;
  try {
    relPath = decodeURIComponent(raw);
  } catch {
    res.statusCode = 400;
    return res.end("bad url");
  }
  const abs = path.resolve(notesRoot, relPath);
  try {
    await assertSafePath(abs, notesRoot);
  } catch (e) {
    res.statusCode = 400;
    return res.end(e.message);
  }
  // 路徑防護之後才看排除（順序不可反：逃逸路徑要是 400 而不是 404）
  if (isIgnored(ig, notesRoot, abs)) {
    res.statusCode = 404;
    return res.end("ignored");
  }
  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile()) {
      res.statusCode = 404;
      return res.end("not a file");
    }
    const ext = path.extname(abs).toLowerCase();
    const type = MIME_MAP[ext] ?? "application/octet-stream";
    const data = await fs.readFile(abs);
    res.setHeader("content-type", type);
    res.setHeader("cache-control", "no-cache");
    return res.end(data);
  } catch {
    res.statusCode = 404;
    return res.end("not found");
  }
}

// ── build 產物的 notes-assets/ ────────────────────────────────────────
// build 完掃輸出的 HTML，把裡面出現的 `<base>/notes-assets/<路徑>` 對應的檔案從筆記資料夾複製到
// `<outDir>/notes-assets/<路徑>`。看的是「產物實際引用的網址」而不是 remark 階段收集：
// - 作者手寫的 `/notes-assets/specs/v2.pdf` 連結（一般連結不會被 remark 改寫）也涵蓋
// - Astro 會快取 .md 的渲染結果，快取命中時 remark 外掛根本不會跑，收集清單會缺
// 只複製 MIME_MAP 內的副檔名、路徑要通過 assertSafePath（拒絕 `..` 與 symlink 逃脫）。
// 找不到或被拒的只回報，不讓 build 失敗（與 view／serve 執行期 404 的行為一致）。

/** 從一段 HTML 抽出 notes-assets 的相對路徑（已 decode、去掉 query／hash）。純函式，不碰檔案系統。 */
export function extractNotesAssetPaths(html, base = "") {
  const prefix = `${base.replace(/\/+$/, "")}/notes-assets/`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}([^"'\\s<>()?#]+)`, "g");
  const out = new Set();
  for (const m of html.matchAll(re)) {
    // 屬性值裡的 & 會是 &amp;；其他實體在檔名裡極少見，不處理
    let raw = m[1].replace(/&amp;/g, "&");
    try {
      raw = decodeURIComponent(raw);
    } catch {
      continue;
    }
    out.add(raw);
  }
  return out;
}

export async function copyReferencedNotesAssets(notesRoot, outDir, base = "", ig = null) {
  const refs = new Set();
  async function walk(dir) {
    let ents;
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) await walk(abs);
      else if (e.isFile() && e.name.endsWith(".html")) {
        for (const p of extractNotesAssetPaths(await fs.readFile(abs, "utf-8"), base)) refs.add(p);
      }
    }
  }
  await walk(outDir);

  const destRoot = path.join(outDir, "notes-assets");
  const copied = [];
  const missing = [];
  const rejected = [];
  const ignored = [];
  for (const rel of [...refs].sort()) {
    if (!MIME_MAP[path.extname(rel).toLowerCase()]) {
      rejected.push(rel);
      continue;
    }
    const src = path.resolve(notesRoot, rel);
    try {
      await assertSafePath(src, notesRoot);
    } catch {
      rejected.push(rel);
      continue;
    }
    // 被 ignore.json 排除的檔不進產物，即使有筆記（或手寫連結）引用它（規格 §6）
    if (ig && isIgnored(ig, notesRoot, src)) {
      ignored.push(rel);
      continue;
    }
    try {
      if (!(await fs.stat(src)).isFile()) throw new Error("not a file");
    } catch {
      missing.push(rel);
      continue;
    }
    // 目的地用 notesRoot 相對路徑重組，保證落在 destRoot 內
    const dest = path.join(destRoot, path.relative(notesRoot, src));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    copied.push(rel);
  }
  return { copied, missing, rejected, ignored };
}

/**
 * astro:build:done 用：viewer 模式才動作，base 取自 NOTECRAFT_BASE（與 remark-notecraft-base 同一套正規化）。
 * HTML 裡是 `/base/notes-assets/...`，產物仍放 `<outDir>/notes-assets/...`（outDir 對應站台根 base）。
 * log 只印筆記資料夾相對路徑，不輸出本機絕對路徑。
 */
export async function copyNotesAssetsAfterBuild(outDirUrl, logger) {
  if (!isViewerMode()) return;
  const raw = process.env.NOTECRAFT_BASE ?? "";
  const base = raw === "/" ? "" : raw.replace(/\/+$/, "");
  const { copied, missing, rejected, ignored } = await copyReferencedNotesAssets(
    resolveNotesRoot(process.cwd()),
    fileURLToPath(outDirUrl),
    base,
    ignoreFor(process.cwd()),
  );
  if (copied.length) logger.info(`複製 ${copied.length} 個筆記附件到 notes-assets/`);
  for (const p of ignored) logger.warn(`略過被 .notecraft/ignore.json 排除的附件：notes-assets/${p}`);
  for (const p of missing) logger.warn(`筆記引用的附件不存在：notes-assets/${p}`);
  for (const p of rejected) logger.warn(`略過不支援的格式或筆記資料夾外的路徑：notes-assets/${p}`);
}

// ── API handlers ────────────────────────────────────────────────

async function handleCreateNote(cwd, notesRoot, req, res, ig) {
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  const title = (payload.title || "").trim();
  if (!title) return json(res, 400, { error: "title required" });
  const tags = normalizeTagList(payload.tags);
  const base = slugify(title);

  try {
    // 主專案與 viewer 同一套：folder 是 /api/folders 給的真實資料夾路徑
    const targetDir = await resolveNoteFolder(cwd, notesRoot, payload.folder);
    const abs = await assertSafePath(path.join(targetDir, `${base}.mdx`), notesRoot);
    if (isIgnored(ig, notesRoot, abs)) return json(res, 400, { error: IGNORED_LOCATION_MESSAGE });
    const slug = noteIdFromFile(notesRoot, abs);
    // 同資料夾已有同名檔（.mdx 或 .md）、或別的檔案已經對應到同一個 entry id（例如資料夾大小寫不同）都算重複
    const sibling = await findNoteFile(targetDir, base);
    if (sibling || (await findNoteFile(notesRoot, slug))) {
      return json(res, 409, { error: "slug already exists", slug });
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const tagsYaml = `[${tags.map((t) => JSON.stringify(t)).join(", ")}]`;
    await writeFileAtomic(abs, TEMPLATE(title, tagsYaml, !isViewerMode()));
    return json(res, 200, {
      slug,
      // 與 /api/folders 同一套前綴：主專案仍是 src/content/notes/…，viewer 不會冒出 ../../ 的 package root 相對路徑
      path: folderDisplayRoot(cwd, notesRoot) + path.relative(notesRoot, abs).split(path.sep).join("/"),
      vscode: `vscode://file/${abs.replace(/\\/g, "/").replace(/^\/+/, "")}`,
    });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}

async function handleSetNoteTags(notesRoot, slug, req, res, ig) {
  const file = await findVisibleNoteFile(notesRoot, slug, ig);
  if (!file) return json(res, 404, { error: "note not found" });
  try {
    await assertSafePath(file, notesRoot);
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  const tags = normalizeTagList(payload.tags);
  const { data, content } = await readNote(file);
  data.tags = tags;
  data.updatedAt = todayISO();
  await writeNote(file, data, content);
  return json(res, 200, { ok: true, tags });
}

async function collectTagStats(notesRoot, ig) {
  const files = await listMdx(notesRoot, ig);
  const stats = new Map();
  for (const f of files) {
    const { data } = await readNote(f);
    const updatedAt = String(data.updatedAt || "");
    const tags = Array.isArray(data.tags) ? data.tags : [];
    for (const t of tags) {
      const cur = stats.get(t) ?? { count: 0, lastUsed: "0000-00-00", files: [] };
      cur.count += 1;
      if (updatedAt > cur.lastUsed) cur.lastUsed = updatedAt;
      cur.files.push(f);
      stats.set(t, cur);
    }
  }
  return stats;
}

async function handleTagList(notesRoot, res, ig) {
  const stats = await collectTagStats(notesRoot, ig);
  const list = Array.from(stats.entries()).map(([name, v]) => ({
    name,
    count: v.count,
    lastUsed: v.lastUsed,
  }));
  return json(res, 200, { tags: list });
}

async function handleFolderList(cwd, notesRoot, res, ig) {
  const displayRoot = folderDisplayRoot(cwd, notesRoot);
  // 遞迴列出所有層（Workbench 的資料夾樹不限層數，新增筆記要能選到子資料夾）。
  // 回傳格式不變：字串陣列、以 / 結尾；父層恆排在子層之前。
  // 被 ignore.json 排除的資料夾（含內建的 . 開頭、node_modules/、dist/）不列。
  const folders = [displayRoot];
  const walk = async (absDir, relPrefix) => {
    let ents;
    try {
      ents = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    const dirs = ents
      .filter((e) => e.isDirectory() && !ig.ignores(`${relPrefix}${e.name}/`))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
    for (const e of dirs) {
      const rel = `${relPrefix}${e.name}/`;
      folders.push(`${displayRoot}${rel}`);
      await walk(path.join(absDir, e.name), rel);
    }
  };
  await walk(notesRoot, "");
  return json(res, 200, { folders });
}

async function handleRenameTag(notesRoot, oldName, req, res, ig) {
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  const newName = (payload.newName || "").trim();
  if (!newName) return json(res, 400, { error: "newName required" });
  const stats = await collectTagStats(notesRoot, ig);
  const target = stats.get(oldName);
  if (!target) return json(res, 404, { error: "tag not found" });
  const merged = stats.has(newName);
  let done = 0;
  let failed = 0;
  for (const file of target.files) {
    try {
      await assertSafePath(file, notesRoot);
      const { data, content } = await readNote(file);
      const tags = Array.isArray(data.tags) ? data.tags : [];
      const next = normalizeTagList(tags.map((t) => (t === oldName ? newName : t)));
      data.tags = next;
      data.updatedAt = todayISO();
      await writeNote(file, data, content);
      done += 1;
    } catch {
      failed += 1;
    }
  }
  return json(res, 200, { ok: true, done, failed, affected: target.files.length, merged, newName });
}

async function handleDeleteTag(notesRoot, name, res, ig) {
  const stats = await collectTagStats(notesRoot, ig);
  const target = stats.get(name);
  if (!target) return json(res, 404, { error: "tag not found" });
  let done = 0;
  let failed = 0;
  for (const file of target.files) {
    try {
      await assertSafePath(file, notesRoot);
      const { data, content } = await readNote(file);
      const tags = Array.isArray(data.tags) ? data.tags : [];
      data.tags = tags.filter((t) => t !== name);
      data.updatedAt = todayISO();
      await writeNote(file, data, content);
      done += 1;
    } catch {
      failed += 1;
    }
  }
  return json(res, 200, { ok: true, done, failed, affected: target.files.length, name });
}

function markerIds(content) {
  const out = [];
  for (const m of content.matchAll(/\{\/\*\s*@ai-visualize([\s\S]*?)\*\/\}/g)) {
    const idMatch = m[1].match(/\bid:\s*([\w-]+)/);
    if (idMatch) out.push(idMatch[1]);
  }
  return out;
}

/**
 * AI 生成元件所在的資料夾：主專案是 src/components/generated/；viewer 模式是使用者專案的
 * .notecraft/components/（與 astro.config.mjs 的 @notes alias 同一套優先序，見 resolveNotecraftDir）。
 * label 是顯示用的相對路徑，回給對話框用，不含本機絕對路徑。
 */
export function resolveComponentsDir(cwd) {
  if (isViewerMode()) {
    return { dir: path.join(resolveNotecraftDir(cwd), "components"), label: ".notecraft/components" };
  }
  return { dir: path.join(cwd, "src/components/generated"), label: "src/components/generated" };
}

async function isFile(abs) {
  try {
    return (await fs.stat(abs)).isFile();
  } catch {
    return false;
  }
}

/**
 * 刪除這篇筆記會連帶刪掉哪些生成元件。對話框（GET …/delete-plan）與實際刪除（DELETE）共用這一份判斷，
 * 確認對話框列出的就是會刪的檔（CLAUDE.md：孤兒元件的刪除要作者明確同意，對話框就是那個同意點）。
 * - 只列元件檔真的存在的 id（pending／failed 的標記沒有檔，不列）
 * - 其他筆記也有同一個 id 的標記 → keptShared，保留
 * - 元件路徑一律經 assertSafePath 限制在元件資料夾底下
 */
async function planNoteDeletion(cwd, notesRoot, file) {
  const { dir, label } = resolveComponentsDir(cwd);
  const ids = Array.from(new Set(markerIds((await readNote(file)).content)));
  // 刻意連被 ignore.json 排除的筆記一起看（只套內建排除）：被排除的筆記仍在硬碟上，
  // 它引用的元件被當成孤兒刪掉的話，日後取消排除就壞了
  const others = (await listMdx(notesRoot, createNotesIgnore([]))).filter((f) => f !== file);
  const referencedElsewhere = new Set();
  for (const f of others) {
    if (referencedElsewhere.size === ids.length) break;
    const otherIds = new Set(markerIds((await readNote(f)).content));
    for (const id of ids) if (otherIds.has(id)) referencedElsewhere.add(id);
  }
  const toDelete = [];
  const keptShared = [];
  for (const id of ids) {
    let abs;
    try {
      abs = await assertSafePath(path.join(dir, `${id}.tsx`), dir);
    } catch {
      continue;
    }
    if (!(await isFile(abs))) continue;
    (referencedElsewhere.has(id) ? keptShared : toDelete).push(`${id}.tsx`);
  }
  return { dir, componentsDir: label, toDelete, keptShared };
}

async function resolveNoteForDelete(notesRoot, slug, res, ig) {
  const file = await findVisibleNoteFile(notesRoot, slug, ig);
  if (!file) {
    json(res, 404, { error: "note not found" });
    return null;
  }
  try {
    await assertSafePath(file, notesRoot);
  } catch (e) {
    json(res, 400, { error: e.message });
    return null;
  }
  return file;
}

/**
 * 刪掉這篇後會壞掉的引用（docs/notecraft-workbench-define-ref.md §13、Q11）：引用本篇任一 define 的筆記。
 * 只用來提醒、不擋刪除（依靠 git 復原）；刪除後 build 會失敗並指出要改哪裡。
 * 只看沒被排除的筆記（被排除的不會進 build，引用它也不會壞）；只回傳相對資訊。
 */
async function referencedByOf(notesRoot, file, ig) {
  const files = [];
  for (const abs of await listMdx(notesRoot, ig)) {
    files.push({ rel: path.relative(notesRoot, abs).split(path.sep).join("/"), source: await fs.readFile(abs, "utf-8") });
  }
  const index = buildDefIndex(files, { frontmatter: (t) => matter(t).data ?? {} });
  const rel = path.relative(notesRoot, file).split(path.sep).join("/");
  const me = [...index.notes.values()].find((n) => n.rel === rel);
  if (!me) return [];
  const by = new Map();
  for (const id of me.defines) {
    for (const r of index.defs.get(id)?.refs ?? []) {
      const n = index.notes.get(r.slug);
      const row = by.get(r.slug) ?? { slug: r.slug, title: n?.title ?? r.slug, ids: [] };
      row.ids.push(id);
      by.set(r.slug, row);
    }
  }
  return [...by.values()];
}

async function handleDeletePlan(cwd, notesRoot, slug, res) {
  const ig = ignoreFor(cwd);
  const file = await resolveNoteForDelete(notesRoot, slug, res, ig);
  if (!file) return;
  const { componentsDir, toDelete, keptShared } = await planNoteDeletion(cwd, notesRoot, file);
  const referencedBy = await referencedByOf(notesRoot, file, ig);
  return json(res, 200, { componentsDir, toDelete, keptShared, referencedBy });
}

async function handleDeleteNote(cwd, notesRoot, slug, req, res) {
  const file = await resolveNoteForDelete(notesRoot, slug, res, ignoreFor(cwd));
  if (!file) return;

  // body `{ components: string[] }` 是對話框上作者看過、同意的清單：只刪「計畫內 ∩ 同意過」的檔，
  // 對話框開著的期間別篇筆記改了也不會多刪。沒帶 body（舊呼叫端）就照計畫刪。
  let consented = null;
  try {
    const raw = await readBody(req);
    if (raw) {
      const body = JSON.parse(raw);
      if (Array.isArray(body?.components)) consented = new Set(body.components.map(String));
    }
  } catch {
    return json(res, 400, { error: "invalid JSON body" });
  }

  const plan = await planNoteDeletion(cwd, notesRoot, file);
  const deletedComponents = [];
  const skipped = [];
  const failed = [];
  for (const name of plan.toDelete) {
    if (consented && !consented.has(name)) {
      skipped.push(name);
      continue;
    }
    try {
      await fs.unlink(await assertSafePath(path.join(plan.dir, name), plan.dir));
      deletedComponents.push(name);
    } catch (e) {
      if (e && e.code !== "ENOENT") failed.push(name);
    }
  }
  await fs.unlink(file);
  return json(res, 200, {
    deletedNote: path.relative(cwd, file),
    componentsDir: plan.componentsDir,
    deletedComponents,
    keptShared: plan.keptShared,
    skipped,
    failed,
  });
}

// ── Plugin 啟用／停用（Workbench Task 71，規格 §8.6.1）────────────────
// 只增刪 plugins.json 頂層 disabled 陣列的元素，其餘內容不動；鍵順序固定 $schema → disabled → plugins；
// disabled 變空時整個鍵移除；2 空格縮排、檔尾換行；重複送同一個值回 200 且檔案不變。

const PLUGIN_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 頂層 "disabled": [ …字串… ] 這個鍵（含前後的逗號與換行）的文字範圍。陣列裡只會有字串，沒有巢狀括號。
const DISABLED_KEY_RE = /(,?)(\s*)"disabled"\s*:\s*\[[^\]]*\]\s*(,?)/;

function patchDisabledKey(text, ids) {
  const indent = (text.match(/\n( +)"/) || [, "  "])[1];
  const value = ids.length ? `[\n${ids.map((x) => `${indent}${indent}${JSON.stringify(x)}`).join(",\n")}\n${indent}]` : null;
  const m = DISABLED_KEY_RE.exec(text);
  if (m) {
    if (value === null) {
      // 移除整個鍵。它與相鄰鍵之間只需留一個逗號：前後都有逗號時去掉一個。
      const before = m[1];
      const after = m[3];
      const sep = before && after ? "," : before || after;
      return text.slice(0, m.index) + sep + text.slice(m.index + m[0].length);
    }
    return text.slice(0, m.index) + `${m[1]}${m[2]}"disabled": ${value}${m[3]}` + text.slice(m.index + m[0].length);
  }
  if (value === null) return text;
  // 沒有這個鍵：放在 $schema 之後，否則放在最前面
  const schema = /"\$schema"\s*:\s*"[^"]*"\s*,/.exec(text);
  if (schema) {
    const at = schema.index + schema[0].length;
    return text.slice(0, at) + `\n${indent}"disabled": ${value},` + text.slice(at);
  }
  const brace = text.indexOf("{");
  return text.slice(0, brace + 1) + `\n${indent}"disabled": ${value},` + text.slice(brace + 1);
}

async function handleSetPluginEnabled(cwd, id, req, res) {
  if (!PLUGIN_ID_RE.test(id)) return json(res, 400, { error: "invalid plugin id" });
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  if (typeof payload.enabled !== "boolean") return json(res, 400, { error: "enabled must be boolean" });

  const notecraftDir = resolveNotecraftDir(cwd);
  const cfgPath = path.join(notecraftDir, "plugins.json");
  let text;
  try {
    text = await fs.readFile(cfgPath, "utf-8");
  } catch {
    return json(res, 409, { error: "plugins.json not found; create a mapping first" });
  }
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch {
    return json(res, 500, { error: "plugins.json is not valid JSON" });
  }
  if (!cfg || typeof cfg !== "object" || !Array.isArray(cfg.plugins)) {
    return json(res, 500, { error: "plugins.json missing plugins array" });
  }
  const referenced = cfg.plugins.some((m) => m && m.plugin === id);
  const installed = [path.join(cwd, "plugins", id), path.join(notecraftDir, "plugins", id)].some((d) => {
    try {
      return fsSync.existsSync(path.join(d, "notecraft-plugin.json"));
    } catch {
      return false;
    }
  });
  if (!referenced && !installed) return json(res, 404, { error: "plugin not installed nor referenced" });

  const disabled = new Set(Array.isArray(cfg.disabled) ? cfg.disabled.filter((x) => typeof x === "string") : []);
  const was = !disabled.has(id);
  if (was === payload.enabled) return json(res, 200, { ok: true, id, enabled: payload.enabled, changed: false });
  if (payload.enabled) disabled.delete(id);
  else disabled.add(id);

  // 以文字方式只動 disabled 這個鍵，其餘內容（含作者的排版）原封不動；
  // 鍵的位置固定在 $schema 之後、plugins 之前；變空時整個鍵移除。
  const nextText = patchDisabledKey(text, [...disabled]);
  try {
    JSON.parse(nextText); // 防呆：文字改寫後必須仍是合法 JSON，否則退回重新序列化
  } catch {
    const { $schema, disabled: _d, plugins, ...rest } = cfg;
    const next = { ...($schema !== undefined ? { $schema } : {}), ...(disabled.size ? { disabled: [...disabled] } : {}), plugins, ...rest };
    await fs.writeFile(cfgPath, JSON.stringify(next, null, 2) + "\n", "utf-8");
    return json(res, 200, { ok: true, id, enabled: payload.enabled, changed: true });
  }
  await fs.writeFile(cfgPath, nextText, "utf-8");
  return json(res, 200, { ok: true, id, enabled: payload.enabled, changed: true });
}

export function localhostOnly(req) {
  const addr = req.socket.remoteAddress || "";
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

// ── 分派入口 ────────────────────────────────────────────────
// 回傳 true 表示已處理；false 交給下游 fallback。
// 分成 assets / api 兩個 export，讓 serve 模式（純靜態）只掛 assets、不開放寫入。

export async function tryHandleAssetsRequest(cwd, notesRoot, req, res) {
  const url = req.url || "";
  if (!url.startsWith("/notes-assets/")) return false;
  if (!localhostOnly(req)) {
    res.statusCode = 403;
    res.end("localhost only");
    return true;
  }
  try {
    await handleNotesAsset(notesRoot, url, res, ignoreFor(cwd));
  } catch (e) {
    res.statusCode = 500;
    res.end(e && e.message ? e.message : "internal error");
  }
  return true;
}

export async function tryHandleApiRequest(cwd, notesRoot, req, res) {
  const url = req.url || "";
  if (!url.startsWith("/api/")) return false;
  if (!localhostOnly(req)) {
    json(res, 403, { error: "dev API is localhost-only" });
    return true;
  }
  try {
    const u = new URL(url, "http://127.0.0.1");
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 2 && parts[1] === "notes" && req.method === "POST") {
      await handleCreateNote(cwd, notesRoot, req, res, ignoreFor(cwd));
      return true;
    }
    if (parts.length === 2 && parts[1] === "tags" && req.method === "GET") {
      await handleTagList(notesRoot, res, ignoreFor(cwd));
      return true;
    }
    if (parts.length === 2 && parts[1] === "folders" && req.method === "GET") {
      await handleFolderList(cwd, notesRoot, res, ignoreFor(cwd));
      return true;
    }
    if (parts.length === 3 && parts[1] === "plugins" && req.method === "PUT") {
      await handleSetPluginEnabled(cwd, decodeURIComponent(parts[2]), req, res);
      return true;
    }
    if (parts.length === 3 && parts[1] === "tags") {
      const name = decodeURIComponent(parts[2]);
      if (req.method === "PUT") {
        await handleRenameTag(notesRoot, name, req, res, ignoreFor(cwd));
        return true;
      }
      if (req.method === "DELETE") {
        await handleDeleteTag(notesRoot, name, res, ignoreFor(cwd));
        return true;
      }
    }
    // 巢狀 slug 支援：/api/notes/a/b/c/tags PUT、/api/notes/a/b/c DELETE
    if (parts.length >= 4 && parts[1] === "notes" && parts[parts.length - 1] === "tags" && req.method === "PUT") {
      const slug = parts.slice(2, -1).map(decodeURIComponent).join("/");
      await handleSetNoteTags(notesRoot, slug, req, res, ignoreFor(cwd));
      return true;
    }
    if (parts.length >= 4 && parts[1] === "notes" && parts[parts.length - 1] === "delete-plan" && req.method === "GET") {
      const slug = parts.slice(2, -1).map(decodeURIComponent).join("/");
      await handleDeletePlan(cwd, notesRoot, slug, res);
      return true;
    }
    if (parts.length >= 3 && parts[1] === "notes" && req.method === "DELETE") {
      const slug = parts.slice(2).map(decodeURIComponent).join("/");
      await handleDeleteNote(cwd, notesRoot, slug, req, res);
      return true;
    }
    json(res, 404, { error: "not found" });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    json(res, 500, { error: msg });
    return true;
  }
}

// Astro dev integration 用：assets + api 都掛，跟以前 tryHandleDevRequest 一致
export async function tryHandleDevRequest(cwd, notesRoot, req, res) {
  return (
    (await tryHandleAssetsRequest(cwd, notesRoot, req, res)) ||
    (await tryHandleApiRequest(cwd, notesRoot, req, res))
  );
}
