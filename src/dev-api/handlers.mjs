// P6：純 JS ESM 版本的 dev-api 邏輯，讓 Astro integration（開發時）與 CLI 的 Node HTTP server（v1 生產）
// 都能直接 import。若後續要新增 API 或動路徑安全規則，只改這一份。

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// ── 路徑決策 & 安全檢查 ────────────────────────────────────────────────

export function resolveNotesRoot(cwd) {
  const env = process.env.NOTECRAFT_NOTES_DIR;
  return env ? path.resolve(cwd, env) : path.resolve(cwd, "src/content/notes");
}

export function isViewerMode() {
  return Boolean(process.env.NOTECRAFT_NOTES_DIR);
}

export async function assertSafePath(candidate, notesRoot) {
  const abs = path.resolve(candidate);
  const rootWithSep = notesRoot.endsWith(path.sep) ? notesRoot : notesRoot + path.sep;
  if (!abs.startsWith(rootWithSep) && abs !== notesRoot) {
    throw new Error(`path outside notesRoot: ${abs}`);
  }
  try {
    const real = await fs.realpath(abs);
    if (!real.startsWith(rootWithSep) && real !== notesRoot) {
      throw new Error(`symlink target outside notesRoot: ${real}`);
    }
  } catch (e) {
    if (e && e.code !== "ENOENT") throw e;
  }
  return abs;
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

async function listMdx(root) {
  const out = [];
  async function walk(dir) {
    let ents;
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue;
        await walk(p);
      } else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) {
        out.push(p);
      }
    }
  }
  await walk(root);
  return out;
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

async function writeNote(filePath, data, content) {
  const out = matter.stringify(content, data);
  await fs.writeFile(filePath, out, "utf8");
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

async function handleNotesAsset(notesRoot, urlPath, res) {
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

// ── API handlers ────────────────────────────────────────────────

async function handleCreateNote(cwd, notesRoot, req, res) {
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
  const slug = slugify(title);
  const existing = await findNoteFile(notesRoot, slug);
  if (existing) return json(res, 409, { error: "slug already exists", slug });

  let targetDir = notesRoot;
  if (!isViewerMode()) {
    const folder = (payload.folder || "src/content/notes").replace(/^\/+/, "");
    if (folder.startsWith("src/content/notes")) {
      targetDir = path.resolve(cwd, folder);
    }
  }

  try {
    const abs = await assertSafePath(path.join(targetDir, `${slug}.mdx`), notesRoot);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const tagsYaml = `[${tags.map((t) => JSON.stringify(t)).join(", ")}]`;
    await fs.writeFile(abs, TEMPLATE(title, tagsYaml, !isViewerMode()), "utf8");
    return json(res, 200, {
      slug,
      path: path.relative(cwd, abs),
      vscode: `vscode://file/${abs.replace(/\\/g, "/").replace(/^\/+/, "")}`,
    });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}

async function handleSetNoteTags(notesRoot, slug, req, res) {
  const file = await findNoteFile(notesRoot, slug);
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

async function collectTagStats(notesRoot) {
  const files = await listMdx(notesRoot);
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

async function handleTagList(notesRoot, res) {
  const stats = await collectTagStats(notesRoot);
  const list = Array.from(stats.entries()).map(([name, v]) => ({
    name,
    count: v.count,
    lastUsed: v.lastUsed,
  }));
  return json(res, 200, { tags: list });
}

async function handleFolderList(cwd, notesRoot, res) {
  const rel = path.relative(cwd, notesRoot);
  const displayRoot = !rel || rel.startsWith("..")
    ? notesRoot.endsWith(path.sep) ? notesRoot : notesRoot + path.sep
    : rel + "/";
  const folders = [displayRoot];
  try {
    const ents = await fs.readdir(notesRoot, { withFileTypes: true });
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith(".")) continue;
      folders.push(`${displayRoot}${e.name}/`);
    }
  } catch {}
  return json(res, 200, { folders });
}

async function handleRenameTag(notesRoot, oldName, req, res) {
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  const newName = (payload.newName || "").trim();
  if (!newName) return json(res, 400, { error: "newName required" });
  const stats = await collectTagStats(notesRoot);
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

async function handleDeleteTag(notesRoot, name, res) {
  const stats = await collectTagStats(notesRoot);
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

async function handleDeleteNote(cwd, notesRoot, slug, res) {
  const file = await findNoteFile(notesRoot, slug);
  if (!file) return json(res, 404, { error: "note not found" });
  try {
    await assertSafePath(file, notesRoot);
  } catch (e) {
    return json(res, 400, { error: e.message });
  }

  if (isViewerMode()) {
    await fs.unlink(file);
    return json(res, 200, {
      deletedNote: path.relative(cwd, file),
      deletedComponents: [],
      keptShared: [],
      failed: [],
    });
  }

  const { content } = await readNote(file);
  const ids = markerIds(content);
  const others = (await listMdx(notesRoot)).filter((f) => f !== file);
  const referencedElsewhere = new Set();
  for (const f of others) {
    const otherIds = new Set(markerIds((await readNote(f)).content));
    for (const id of ids) if (otherIds.has(id)) referencedElsewhere.add(id);
  }
  const deletedComponents = [];
  const keptShared = [];
  const failed = [];
  for (const id of ids) {
    if (referencedElsewhere.has(id)) {
      keptShared.push(`${id}.tsx`);
      continue;
    }
    const comp = path.join(cwd, "src/components/generated", `${id}.tsx`);
    try {
      await fs.unlink(comp);
      deletedComponents.push(`${id}.tsx`);
    } catch (e) {
      if (e && e.code !== "ENOENT") failed.push(`${id}.tsx`);
    }
  }
  await fs.unlink(file);
  return json(res, 200, {
    deletedNote: path.relative(cwd, file),
    deletedComponents,
    keptShared,
    failed,
  });
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
    await handleNotesAsset(notesRoot, url, res);
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
      await handleCreateNote(cwd, notesRoot, req, res);
      return true;
    }
    if (parts.length === 2 && parts[1] === "tags" && req.method === "GET") {
      await handleTagList(notesRoot, res);
      return true;
    }
    if (parts.length === 2 && parts[1] === "folders" && req.method === "GET") {
      await handleFolderList(cwd, notesRoot, res);
      return true;
    }
    if (parts.length === 3 && parts[1] === "tags") {
      const name = decodeURIComponent(parts[2]);
      if (req.method === "PUT") {
        await handleRenameTag(notesRoot, name, req, res);
        return true;
      }
      if (req.method === "DELETE") {
        await handleDeleteTag(notesRoot, name, res);
        return true;
      }
    }
    // 巢狀 slug 支援：/api/notes/a/b/c/tags PUT、/api/notes/a/b/c DELETE
    if (parts.length >= 4 && parts[1] === "notes" && parts[parts.length - 1] === "tags" && req.method === "PUT") {
      const slug = parts.slice(2, -1).map(decodeURIComponent).join("/");
      await handleSetNoteTags(notesRoot, slug, req, res);
      return true;
    }
    if (parts.length >= 3 && parts[1] === "notes" && req.method === "DELETE") {
      const slug = parts.slice(2).map(decodeURIComponent).join("/");
      await handleDeleteNote(cwd, notesRoot, slug, res);
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
