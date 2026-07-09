#!/usr/bin/env node
// NoteCraftApp CLI（P6 / 三命令版）
// - view <dir>：spawn astro dev，HMR、新增/編輯/刪除筆記即時反映
// - build <dir>：astro build → ~/.notecraft/cache/<hash>/dist/（給 CI 或 serve 用）
// - serve <dir>：Node HTTP 服務快取的 dist；純靜態、唯讀；仍掛 /notes-assets/* 讓外部圖片可見
//
// 「能寫」與否天然對齊 astro 的 dev/build 兩態，不再需要額外旗標。

import { defineCommand, runMain } from "citty";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { promises as fs, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { tryHandleAssetsRequest } from "../src/dev-api/handlers.mjs";

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), "..");
const pkgJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

const STATIC_MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function cacheDirFor(absNotesDir) {
  const hash = crypto.createHash("sha1").update(absNotesDir).digest("hex").slice(0, 12);
  return path.join(os.homedir(), ".notecraft", "cache", hash);
}

function log(...args) {
  console.log("[notecraftapp]", ...args);
}

function resolveNotesDirArg(dirArg) {
  const notesDir = path.resolve(process.cwd(), dirArg || ".");
  if (!existsSync(notesDir)) {
    console.error(`notes 資料夾不存在：${notesDir}`);
    process.exit(1);
  }
  return notesDir;
}

// ── 快取失效偵測（§8.1）────────────────────────────────────────
async function shouldRebuild(cacheDir, notesDir, force) {
  if (force) return { should: true, why: "--rebuild flag" };
  const distDir = path.join(cacheDir, "dist");
  const metaPath = path.join(cacheDir, "meta.json");
  const stalePath = path.join(cacheDir, ".stale");
  if (!existsSync(distDir)) return { should: true, why: "dist 不存在" };
  if (existsSync(stalePath)) return { should: true, why: ".stale 標記" };
  if (!existsSync(metaPath)) return { should: true, why: "meta.json 不存在" };
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  } catch {
    return { should: true, why: "meta.json 壞掉" };
  }
  const lastBuildMs = new Date(meta.lastBuildAt).getTime();
  let count = 0;
  let latest = 0;
  async function walk(dir) {
    let ents;
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue;
        await walk(path.join(dir, e.name));
      } else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) {
        count += 1;
        const s = statSync(path.join(dir, e.name));
        if (s.mtimeMs > latest) latest = s.mtimeMs;
      }
    }
  }
  await walk(notesDir);
  if (latest > lastBuildMs) return { should: true, why: `有 md/mdx 檔案在上次 build 後被修改` };
  if (count !== meta.fileCount) return { should: true, why: `md/mdx 數量從 ${meta.fileCount} 變成 ${count}` };
  return { should: false, meta: { fileCount: count, latest } };
}

async function writeMeta(cacheDir, notesDir, fileCount) {
  const metaPath = path.join(cacheDir, "meta.json");
  const meta = {
    notesDir,
    lastBuildAt: new Date().toISOString(),
    fileCount,
    tool: `notecraftapp@${pkgJson.version}`,
  };
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  const stalePath = path.join(cacheDir, ".stale");
  if (existsSync(stalePath)) await fs.unlink(stalePath);
}

async function countMdx(dir) {
  let count = 0;
  async function walk(d) {
    let ents;
    try {
      ents = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue;
        await walk(path.join(d, e.name));
      } else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) count += 1;
    }
  }
  await walk(dir);
  return count;
}

async function runAstroBuild(cwd, notesDir, outDir) {
  return new Promise((resolve, reject) => {
    const astroBin = path.join(cwd, "node_modules", "astro", "astro.js");
    const proc = spawn(process.execPath, [astroBin, "build", "--outDir", outDir], {
      cwd,
      env: { ...process.env, NOTECRAFT_NOTES_DIR: notesDir },
      stdio: "inherit",
    });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`astro build exited with code ${code}`))));
    proc.on("error", reject);
  });
}

async function ensureBuild(cwd, notesDir, cacheDir, force) {
  const check = await shouldRebuild(cacheDir, notesDir, force);
  if (!check.should) {
    log(`快取有效，跳過 build（${check.meta.fileCount} 篇筆記）`);
    return;
  }
  log(`重 build：${check.why}`);
  await fs.mkdir(cacheDir, { recursive: true });
  const distDir = path.join(cacheDir, "dist");
  await runAstroBuild(cwd, notesDir, distDir);
  const count = await countMdx(notesDir);
  await writeMeta(cacheDir, notesDir, count);
}

// ── serve 用的靜態檔案伺服 ────────────────────────────────────────
async function serveStatic(distDir, req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.includes("\0") || pathname.includes("..")) {
    res.statusCode = 400;
    res.end("bad url");
    return;
  }
  let candidate = path.join(distDir, pathname);
  if (candidate === distDir || pathname === "/") {
    candidate = path.join(distDir, "index.html");
  } else {
    try {
      const s = await fs.stat(candidate);
      if (s.isDirectory()) candidate = path.join(candidate, "index.html");
    } catch {
      if (!path.extname(candidate)) candidate = path.join(candidate, "index.html");
    }
  }
  const rel = path.relative(distDir, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    res.statusCode = 400;
    res.end("bad url");
    return;
  }
  try {
    const data = await fs.readFile(candidate);
    const ext = path.extname(candidate).toLowerCase();
    const type = STATIC_MIME[ext] ?? "application/octet-stream";
    res.setHeader("content-type", type);
    res.setHeader("cache-control", "no-cache");
    res.end(data);
  } catch {
    const notFound = path.join(distDir, "404.html");
    try {
      const data = await fs.readFile(notFound);
      res.statusCode = 404;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end("not found");
    }
  }
}

async function startStaticServer(cwd, notesDir, distDir, port, host, openBrowser) {
  const server = createServer(async (req, res) => {
    try {
      // 只掛 assets，不掛寫入 API（serve = 唯讀靜態）
      const handled = await tryHandleAssetsRequest(cwd, notesDir, req, res);
      if (handled) return;
      await serveStatic(distDir, req, res);
    } catch (e) {
      res.statusCode = 500;
      res.end(e && e.message ? e.message : "internal error");
    }
  });
  server.listen(port, host, () => {
    const url = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`;
    log("");
    log(`  ➜  Local:   ${url}`);
    log(`  ➜  Mode:    serve（純靜態、唯讀）`);
    log(`  ➜  Notes:   ${notesDir}`);
    log(`  ➜  Dist:    ${distDir}`);
    log("");
    if (openBrowser) openInBrowser(url);
  });
  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}

function openInBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" :
    "xdg-open";
  try {
    spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
  } catch {}
}

// ── 子命令 ────────────────────────────────────────

const viewCmd = defineCommand({
  meta: { name: "view", description: "spawn astro dev：HMR + 可寫入" },
  args: {
    dir: { type: "positional", required: false, description: "notes 資料夾（預設當前目錄）" },
    port: { type: "string", default: "4321", description: "dev server port" },
    host: { type: "string", default: "127.0.0.1", description: "綁定 host" },
  },
  async run({ args }) {
    const notesDir = resolveNotesDirArg(args.dir);
    log(`spawn astro dev`);
    log(`notes dir  : ${notesDir}`);
    log(`port       : ${args.port}`);
    const astroBin = path.join(packageRoot, "node_modules", "astro", "astro.js");
    const proc = spawn(process.execPath, [astroBin, "dev", "--port", String(args.port), "--host", args.host], {
      cwd: packageRoot,
      env: { ...process.env, NOTECRAFT_NOTES_DIR: notesDir },
      stdio: "inherit",
    });
    const shutdown = () => proc.kill("SIGTERM");
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    proc.on("exit", (code) => process.exit(code ?? 0));
  },
});

const buildCmd = defineCommand({
  meta: { name: "build", description: "astro build 到 ~/.notecraft/cache/<hash>/dist/" },
  args: {
    dir: { type: "positional", required: false, description: "notes 資料夾（預設當前目錄）" },
    rebuild: { type: "boolean", description: "強制 rebuild，忽略快取" },
  },
  async run({ args }) {
    const notesDir = resolveNotesDirArg(args.dir);
    const cacheDir = cacheDirFor(notesDir);
    log(`notes dir  : ${notesDir}`);
    log(`cache dir  : ${cacheDir}`);
    await ensureBuild(packageRoot, notesDir, cacheDir, args.rebuild);
    log(`dist:      : ${path.join(cacheDir, "dist")}`);
  },
});

const serveCmd = defineCommand({
  meta: { name: "serve", description: "Node HTTP 服務 build 過的 dist（純靜態、唯讀）" },
  args: {
    dir: { type: "positional", required: false, description: "notes 資料夾（預設當前目錄）" },
    port: { type: "string", default: "4321", description: "伺服器 port" },
    host: { type: "string", default: "127.0.0.1", description: "綁定 host" },
    "no-open": { type: "boolean", description: "不自動開啟瀏覽器" },
    rebuild: { type: "boolean", description: "強制 rebuild，忽略快取" },
  },
  async run({ args }) {
    const notesDir = resolveNotesDirArg(args.dir);
    const cacheDir = cacheDirFor(notesDir);
    log(`notes dir  : ${notesDir}`);
    log(`cache dir  : ${cacheDir}`);
    await ensureBuild(packageRoot, notesDir, cacheDir, args.rebuild);
    await startStaticServer(
      packageRoot,
      notesDir,
      path.join(cacheDir, "dist"),
      Number(args.port),
      args.host,
      !args["no-open"],
    );
  },
});

const main = defineCommand({
  meta: { name: pkgJson.name, version: pkgJson.version, description: "NoteCraft viewer CLI" },
  subCommands: { view: viewCmd, build: buildCmd, serve: serveCmd },
});

runMain(main);
