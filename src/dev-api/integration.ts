import type { AstroIntegration } from "astro";
import type { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// P5：所有寫入操作的目標資料夾。
// - 有 NOTECRAFT_NOTES_DIR → 用該絕對路徑（viewer 模式）
// - 否則 fallback src/content/notes/（主專案）
// notesRoot 一律回傳「絕對路徑」，讓後續 path.resolve + prefix 檢查有可比較的基準。
function resolveNotesRoot(cwd: string): string {
  const env = process.env.NOTECRAFT_NOTES_DIR;
  return env ? path.resolve(cwd, env) : path.resolve(cwd, "src/content/notes");
}

function isViewerMode(): boolean {
  return Boolean(process.env.NOTECRAFT_NOTES_DIR);
}

// 路徑安全檢查（P5 §7.3）：
// - resolvedCandidate 必須落在 notesRoot 之下（防 ../ 逃逸）
// - 若 candidate 已存在，realpath 也必須在 notesRoot 之下（防 symlink 到目錄外）
// 回傳絕對路徑；不安全時 throw Error 讓上層轉 400。
async function assertSafePath(candidate: string, notesRoot: string): Promise<string> {
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
  } catch (e: unknown) {
    // 檔案不存在時 realpath 會 ENOENT，那是合法情境（新增筆記）；其他錯往上丟。
    const code = (e as { code?: string })?.code;
    if (code !== "ENOENT") throw e;
  }
  return abs;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(s: string): string {
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

function normalizeTagList(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Map<string, string>();
  for (const item of arr) {
    const t = String(item).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) seen.set(k, t);
  }
  return Array.from(seen.values());
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function listMdx(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    let ents: import("node:fs").Dirent[];
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // 跳過 .notecraft 之類的設定資料夾
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

async function findNoteFile(notesRoot: string, slug: string): Promise<string | null> {
  const files = await listMdx(notesRoot);
  for (const f of files) {
    const base = path.basename(f, path.extname(f));
    if (base === slug) return f;
  }
  return null;
}

const TEMPLATE = (title: string, tagsYaml: string, includeMarker: boolean) => `---
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

async function handleCreateNote(cwd: string, notesRoot: string, req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  let payload: { title?: string; tags?: string[]; folder?: string };
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  const title = (payload.title || "").trim();
  if (!title) return json(res, 400, { error: "title required" });
  const tags = normalizeTagList(payload.tags);

  const slug = slugify(title);
  // slug 已由 slugify 剝掉路徑分隔符與非法字元；CJK 保留（跟主專案一致），路徑安全由 assertSafePath 統一把關。
  const existing = await findNoteFile(notesRoot, slug);
  if (existing) return json(res, 409, { error: "slug already exists", slug });

  // viewer 模式不支援子資料夾，一律寫進 notesRoot 根層；主專案沿用 folder 選項
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
    // v1 viewer 不塞 @ai-visualize 標記（無 AI 管線可觸發）
    await fs.writeFile(abs, TEMPLATE(title, tagsYaml, !isViewerMode()), "utf8");
    return json(res, 200, {
      slug,
      path: path.relative(cwd, abs),
      vscode: `vscode://file/${abs.replace(/\\/g, "/").replace(/^\/+/, "")}`,
    });
  } catch (e) {
    return json(res, 400, { error: (e as Error).message });
  }
}

async function readNote(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  return { raw, data: parsed.data as Record<string, unknown>, content: parsed.content };
}

async function writeNote(filePath: string, data: Record<string, unknown>, content: string) {
  const out = matter.stringify(content, data);
  await fs.writeFile(filePath, out, "utf8");
}

async function handleSetNoteTags(notesRoot: string, slug: string, req: IncomingMessage, res: ServerResponse) {
  const file = await findNoteFile(notesRoot, slug);
  if (!file) return json(res, 404, { error: "note not found" });
  try {
    await assertSafePath(file, notesRoot);
  } catch (e) {
    return json(res, 400, { error: (e as Error).message });
  }
  const raw = await readBody(req);
  let payload: { tags?: string[] };
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

async function collectTagStats(notesRoot: string) {
  const files = await listMdx(notesRoot);
  const stats = new Map<string, { count: number; lastUsed: string; files: string[] }>();
  for (const f of files) {
    const { data } = await readNote(f);
    const updatedAt = String(data.updatedAt || "");
    const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
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

// GET /api/folders：讓「新增筆記」modal 的資料夾下拉根據當前 notesRoot 動態呈現。
// 掃 notesRoot 下一層（不遞迴、略過 . 開頭），回傳可直接顯示的路徑字串。
async function handleFolderList(cwd: string, notesRoot: string, res: ServerResponse) {
  const rel = path.relative(cwd, notesRoot);
  const displayRoot = !rel || rel.startsWith("..")
    ? notesRoot.endsWith(path.sep) ? notesRoot : notesRoot + path.sep
    : rel + "/";
  const folders: string[] = [displayRoot];
  try {
    const ents = await fs.readdir(notesRoot, { withFileTypes: true });
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith(".")) continue;
      folders.push(`${displayRoot}${e.name}/`);
    }
  } catch {
    // notesRoot 不存在或無權限：只回傳 root，前端 fallback 顯示
  }
  return json(res, 200, { folders });
}

// P2：GET /notes-assets/<path> — 從 notesRoot 底下提供靜態檔（配合 remark-notecraft-notes-assets 使用）
const MIME_MAP: Record<string, string> = {
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

async function handleNotesAsset(notesRoot: string, urlPath: string, res: ServerResponse) {
  const raw = urlPath.replace(/^\/notes-assets\//, "").split("?")[0].split("#")[0];
  let relPath: string;
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
    return res.end((e as Error).message);
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

async function handleTagList(notesRoot: string, res: ServerResponse) {
  const stats = await collectTagStats(notesRoot);
  const list = Array.from(stats.entries()).map(([name, v]) => ({
    name,
    count: v.count,
    lastUsed: v.lastUsed,
  }));
  return json(res, 200, { tags: list });
}

async function handleRenameTag(notesRoot: string, oldName: string, req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  let payload: { newName?: string };
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
      const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
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

async function handleDeleteTag(notesRoot: string, name: string, res: ServerResponse) {
  const stats = await collectTagStats(notesRoot);
  const target = stats.get(name);
  if (!target) return json(res, 404, { error: "tag not found" });
  let done = 0;
  let failed = 0;
  for (const file of target.files) {
    try {
      await assertSafePath(file, notesRoot);
      const { data, content } = await readNote(file);
      const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
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

function markerIds(content: string): string[] {
  const out: string[] = [];
  for (const m of content.matchAll(/\{\/\*\s*@ai-visualize([\s\S]*?)\*\/\}/g)) {
    const idMatch = m[1].match(/\bid:\s*([\w-]+)/);
    if (idMatch) out.push(idMatch[1]);
  }
  return out;
}

async function handleDeleteNote(cwd: string, notesRoot: string, slug: string, res: ServerResponse) {
  const file = await findNoteFile(notesRoot, slug);
  if (!file) return json(res, 404, { error: "note not found" });
  try {
    await assertSafePath(file, notesRoot);
  } catch (e) {
    return json(res, 400, { error: (e as Error).message });
  }

  // viewer 模式沒有 AI 管線 / generated 元件，直接刪 md/mdx 就好
  if (isViewerMode()) {
    await fs.unlink(file);
    return json(res, 200, {
      deletedNote: path.relative(cwd, file),
      deletedComponents: [],
      keptShared: [],
      failed: [],
    });
  }

  // 主專案模式：連帶清理未被其他 MDX 引用的 generated 元件
  const { content } = await readNote(file);
  const ids = markerIds(content);
  const others = (await listMdx(notesRoot)).filter((f) => f !== file);
  const referencedElsewhere = new Set<string>();
  for (const f of others) {
    const otherIds = new Set(markerIds((await readNote(f)).content));
    for (const id of ids) if (otherIds.has(id)) referencedElsewhere.add(id);
  }
  const deletedComponents: string[] = [];
  const keptShared: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    if (referencedElsewhere.has(id)) {
      keptShared.push(`${id}.tsx`);
      continue;
    }
    const comp = path.join(cwd, "src/components/generated", `${id}.tsx`);
    try {
      await fs.unlink(comp);
      deletedComponents.push(`${id}.tsx`);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== "ENOENT") failed.push(`${id}.tsx`);
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

function localhostOnly(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress || "";
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

export default function devApi(): AstroIntegration {
  return {
    name: "notecraft-dev-api",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const cwd = process.cwd();
        const notesRoot = resolveNotesRoot(cwd);
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || "";
          // P2：/notes-assets/* → 從 notesRoot 提供靜態檔
          if (url.startsWith("/notes-assets/")) {
            if (!localhostOnly(req)) {
              res.statusCode = 403;
              return res.end("localhost only");
            }
            try {
              return await handleNotesAsset(notesRoot, url, res);
            } catch (e: unknown) {
              res.statusCode = 500;
              return res.end(e instanceof Error ? e.message : "internal error");
            }
          }
          if (!url.startsWith("/api/")) return next();
          if (!localhostOnly(req)) {
            return json(res, 403, { error: "dev API is localhost-only" });
          }
          try {
            const u = new URL(url, "http://127.0.0.1");
            const parts = u.pathname.split("/").filter(Boolean); // ['api', ...]
            // /api/notes — POST
            if (parts.length === 2 && parts[1] === "notes" && req.method === "POST") {
              return await handleCreateNote(cwd, notesRoot, req, res);
            }
            // /api/tags — GET
            if (parts.length === 2 && parts[1] === "tags" && req.method === "GET") {
              return await handleTagList(notesRoot, res);
            }
            // /api/folders — GET
            if (parts.length === 2 && parts[1] === "folders" && req.method === "GET") {
              return await handleFolderList(cwd, notesRoot, res);
            }
            // /api/tags/:name — PUT (rename) / DELETE
            if (parts.length === 3 && parts[1] === "tags") {
              const name = decodeURIComponent(parts[2]);
              if (req.method === "PUT") return await handleRenameTag(notesRoot, name, req, res);
              if (req.method === "DELETE") return await handleDeleteTag(notesRoot, name, res);
            }
            // /api/notes/:slug/tags — PUT
            if (parts.length === 4 && parts[1] === "notes" && parts[3] === "tags" && req.method === "PUT") {
              const slug = decodeURIComponent(parts[2]);
              return await handleSetNoteTags(notesRoot, slug, req, res);
            }
            // /api/notes/:slug — DELETE
            if (parts.length === 3 && parts[1] === "notes" && req.method === "DELETE") {
              const slug = decodeURIComponent(parts[2]);
              return await handleDeleteNote(cwd, notesRoot, slug, res);
            }
            return json(res, 404, { error: "not found" });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "internal error";
            return json(res, 500, { error: msg });
          }
        });
      },
    },
  };
}
