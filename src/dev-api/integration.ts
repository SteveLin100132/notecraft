import type { AstroIntegration } from "astro";
import type { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const NOTES_ROOT = "src/content/notes";

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
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) out.push(p);
    }
  }
  await walk(root);
  return out;
}

async function findNoteFile(cwd: string, slug: string): Promise<string | null> {
  const root = path.join(cwd, NOTES_ROOT);
  const files = await listMdx(root);
  for (const f of files) {
    const base = path.basename(f, path.extname(f));
    if (base === slug) return f;
  }
  return null;
}

const TEMPLATE = (title: string, tagsYaml: string) => `---
title: ${JSON.stringify(title)}
description: ""
tags: ${tagsYaml}
createdAt: "${todayISO()}"
updatedAt: "${todayISO()}"
---

在此撰寫筆記內文。

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
`;

async function handleCreateNote(cwd: string, req: IncomingMessage, res: ServerResponse) {
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
  let folder = (payload.folder || `${NOTES_ROOT}/`).replace(/^\/+/, "");
  if (!folder.endsWith("/")) folder += "/";
  if (!folder.startsWith(NOTES_ROOT)) folder = `${NOTES_ROOT}/`;

  const slug = slugify(title);
  const existing = await findNoteFile(cwd, slug);
  if (existing) return json(res, 409, { error: "slug already exists", slug });

  const absDir = path.join(cwd, folder);
  await fs.mkdir(absDir, { recursive: true });
  const abs = path.join(absDir, `${slug}.mdx`);
  const tagsYaml = `[${tags.map((t) => JSON.stringify(t)).join(", ")}]`;
  await fs.writeFile(abs, TEMPLATE(title, tagsYaml), "utf8");

  return json(res, 200, {
    slug,
    path: path.relative(cwd, abs),
    vscode: `vscode://file/${abs.replace(/\\/g, "/").replace(/^\/+/, "")}`,
  });
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

async function handleSetNoteTags(cwd: string, slug: string, req: IncomingMessage, res: ServerResponse) {
  const file = await findNoteFile(cwd, slug);
  if (!file) return json(res, 404, { error: "note not found" });
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

async function collectTagStats(cwd: string) {
  const root = path.join(cwd, NOTES_ROOT);
  const files = await listMdx(root);
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

async function handleTagList(cwd: string, res: ServerResponse) {
  const stats = await collectTagStats(cwd);
  const list = Array.from(stats.entries()).map(([name, v]) => ({
    name,
    count: v.count,
    lastUsed: v.lastUsed,
  }));
  return json(res, 200, { tags: list });
}

async function handleRenameTag(cwd: string, oldName: string, req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  let payload: { newName?: string };
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  const newName = (payload.newName || "").trim();
  if (!newName) return json(res, 400, { error: "newName required" });
  const stats = await collectTagStats(cwd);
  const target = stats.get(oldName);
  if (!target) return json(res, 404, { error: "tag not found" });
  const merged = stats.has(newName);
  let done = 0;
  let failed = 0;
  for (const file of target.files) {
    try {
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

async function handleDeleteTag(cwd: string, name: string, res: ServerResponse) {
  const stats = await collectTagStats(cwd);
  const target = stats.get(name);
  if (!target) return json(res, 404, { error: "tag not found" });
  let done = 0;
  let failed = 0;
  for (const file of target.files) {
    try {
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

async function handleDeleteNote(cwd: string, slug: string, res: ServerResponse) {
  const file = await findNoteFile(cwd, slug);
  if (!file) return json(res, 404, { error: "note not found" });

  const { content } = await readNote(file);
  const ids = markerIds(content);

  // 掃描其他 MDX 是否仍引用這些 id（保留共用元件）
  const root = path.join(cwd, NOTES_ROOT);
  const others = (await listMdx(root)).filter((f) => f !== file);
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
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || "";
          if (!url.startsWith("/api/")) return next();
          if (!localhostOnly(req)) {
            return json(res, 403, { error: "dev API is localhost-only" });
          }
          try {
            const u = new URL(url, "http://127.0.0.1");
            const parts = u.pathname.split("/").filter(Boolean); // ['api', ...]
            // /api/notes — POST
            if (parts.length === 2 && parts[1] === "notes" && req.method === "POST") {
              return await handleCreateNote(cwd, req, res);
            }
            // /api/tags — GET
            if (parts.length === 2 && parts[1] === "tags" && req.method === "GET") {
              return await handleTagList(cwd, res);
            }
            // /api/tags/:name — PUT (rename) / DELETE
            if (parts.length === 3 && parts[1] === "tags") {
              const name = decodeURIComponent(parts[2]);
              if (req.method === "PUT") return await handleRenameTag(cwd, name, req, res);
              if (req.method === "DELETE") return await handleDeleteTag(cwd, name, res);
            }
            // /api/notes/:slug/tags — PUT
            if (parts.length === 4 && parts[1] === "notes" && parts[3] === "tags" && req.method === "PUT") {
              const slug = decodeURIComponent(parts[2]);
              return await handleSetNoteTags(cwd, slug, req, res);
            }
            // /api/notes/:slug — DELETE
            if (parts.length === 3 && parts[1] === "notes" && req.method === "DELETE") {
              const slug = decodeURIComponent(parts[2]);
              return await handleDeleteNote(cwd, slug, res);
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
