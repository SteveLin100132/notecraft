#!/usr/bin/env node
// NoteCraftApp CLI（P6 / 三命令版）
// - view <dir>：spawn astro dev，HMR、新增/編輯/刪除筆記即時反映
// - build <dir>：astro build → ~/.notecraft/cache/<hash>/dist/（給 CI 或 serve 用）
// - serve <dir>：Node HTTP 服務快取的 dist；純靜態、唯讀；仍掛 /notes-assets/* 讓外部圖片可見
//
// 「能寫」與否天然對齊 astro 的 dev/build 兩態，不再需要額外旗標。

import { defineCommand, runMain } from "citty";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { promises as fs, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";
import { tryHandleAssetsRequest } from "../src/dev-api/handlers.mjs";

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), "..");
const pkgJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

// ── P8：首次執行時把套件複製到 ~/.notecraft/app-<version>/ ────────────────────────
// 目的：不污染 npm/pnpm cache 目錄；在使用者家目錄有穩定執行位置。
//
// 三種情境：
// - dev 源碼（packageRoot 有 .git 或 NOTECRAFTAPP_DEV=1）→ 直接跑，不複製
// - 已在 ~/.notecraft/app-<v>/ → 直接跑
// - 其他（npm cache、npx cache、global install）→ 複製過去、npm install、重新 exec
//
// 這段在頂層執行、且會 process.exit()，所以下面的 CLI 主流程只有「已就位」的情況才走到。

const stableAppRoot = path.join(os.homedir(), ".notecraft", `app-${pkgJson.version}`);

function isDevSource() {
  if (process.env.NOTECRAFTAPP_DEV === "1") return true;
  return existsSync(path.join(packageRoot, ".git"));
}

async function copyDirExcluding(src, dest, excludes) {
  await fs.mkdir(dest, { recursive: true });
  const ents = await fs.readdir(src, { withFileTypes: true });
  for (const e of ents) {
    if (excludes.has(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDirExcluding(s, d, excludes);
    } else if (e.isFile()) {
      await fs.copyFile(s, d);
    }
  }
}

async function ensureInstalled() {
  if (isDevSource()) return; // dev 源碼直接跑
  if (packageRoot === stableAppRoot) return; // 已在穩定位置

  if (!existsSync(stableAppRoot)) {
    console.log(`[notecraftapp] 首次執行：複製套件到 ${stableAppRoot}`);
    // 排除 node_modules（下面會 npm install）與快取
    const excludes = new Set(["node_modules", ".git", ".astro", "dist", "tmp"]);
    await copyDirExcluding(packageRoot, stableAppRoot, excludes);

    console.log(`[notecraftapp] 安裝相依（npm install）…`);
    const install = spawnSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
      cwd: stableAppRoot,
      stdio: "inherit",
    });
    if (install.status !== 0) {
      console.error("[notecraftapp] npm install 失敗");
      process.exit(install.status ?? 1);
    }
  }

  // 從穩定位置 re-exec，把後續行為交給新的 process
  const proc = spawn(process.execPath, [path.join(stableAppRoot, "bin", "notecraftapp.mjs"), ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NOTECRAFTAPP_INSTALLED: "1" },
  });
  proc.on("exit", (code) => process.exit(code ?? 0));
  // 讓下方的 runMain 不要執行
  await new Promise(() => {});
}

await ensureInstalled();

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

// ── 快取失效偵測（§8.1、P7）────────────────────────────────────────
// 三條路徑：
// 1) md/mdx 內容變動：遞迴掃 notesDir、跳過 . 開頭子資料夾、取最大 mtime + 檔案數
// 2) .notecraft/*.json 設定變動：series.json 之類的東西，series 用來 build 系列頁
// 3) 檔案數量變動：新增/刪除筆記（mtime 不見得會變）
async function shouldRebuild(cacheDir, notesDir, force, userCwd) {
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

  // Pass 1：md/mdx 內容檔
  let mdxCount = 0;
  let latestMdx = { mtime: 0, path: "" };
  async function walkMdx(dir) {
    let ents;
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue;
        await walkMdx(path.join(dir, e.name));
      } else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) {
        mdxCount += 1;
        const p = path.join(dir, e.name);
        const s = statSync(p);
        if (s.mtimeMs > latestMdx.mtime) latestMdx = { mtime: s.mtimeMs, path: p };
      }
    }
  }
  await walkMdx(notesDir);

  // Pass 2：.notecraft/*.json 設定檔（可能在 notes 資料夾或使用者 cwd）
  let latestConfig = { mtime: 0, path: "" };
  const configDirs = [path.join(notesDir, ".notecraft")];
  if (userCwd && path.resolve(userCwd) !== path.resolve(notesDir)) {
    configDirs.push(path.join(userCwd, ".notecraft"));
  }
  for (const configDir of configDirs) {
    try {
      const ents = await fs.readdir(configDir, { withFileTypes: true });
      for (const e of ents) {
        if (!e.isFile() || !e.name.endsWith(".json")) continue;
        const p = path.join(configDir, e.name);
        const s = statSync(p);
        if (s.mtimeMs > latestConfig.mtime) latestConfig = { mtime: s.mtimeMs, path: p };
      }
    } catch {
      // 沒 .notecraft 資料夾就跳過
    }
  }

  if (latestMdx.mtime > lastBuildMs) {
    const rel = path.relative(notesDir, latestMdx.path);
    return { should: true, why: `md/mdx 有變動（最新：${rel}）` };
  }
  if (latestConfig.mtime > lastBuildMs) {
    return { should: true, why: `設定檔有變動（最新：${latestConfig.path}）` };
  }
  if (mdxCount !== meta.fileCount) {
    return { should: true, why: `md/mdx 數量從 ${meta.fileCount} 變成 ${mdxCount}` };
  }
  return { should: false, meta: { fileCount: mdxCount } };
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

async function runAstroBuild(cwd, notesDir, outDir, userCwd) {
  return new Promise((resolve, reject) => {
    const astroBin = path.join(cwd, "node_modules", "astro", "astro.js");
    const proc = spawn(process.execPath, [astroBin, "build", "--outDir", outDir], {
      cwd,
      env: { ...process.env, NOTECRAFT_NOTES_DIR: notesDir, NOTECRAFT_USER_CWD: userCwd },
      stdio: "inherit",
    });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`astro build exited with code ${code}`))));
    proc.on("error", reject);
  });
}

// v2: 走 atomicRebuild、回傳結果物件而非 throw。
// 兩點好處：
// 1) 快取失效重 build 時走 dist.next → rename，途中失敗保留舊 dist（v1 直接寫入 distDir 有 corrupt 風險）
// 2) 呼叫端可選擇如何反應（build 命令 exit 1、serve 命令降級成 fallback 頁）
async function ensureBuild(cwd, notesDir, cacheDir, force, userCwd) {
  const check = await shouldRebuild(cacheDir, notesDir, force, userCwd);
  if (!check.should) {
    log(`快取有效，跳過 build（${check.meta.fileCount} 篇筆記）`);
    return { ok: true };
  }
  log(`重 build：${check.why}`);
  await fs.mkdir(cacheDir, { recursive: true });
  try {
    await atomicRebuild(cwd, notesDir, cacheDir, userCwd);
    return { ok: true };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ── serve 用的靜態檔案伺服 ────────────────────────────────────────
// v2: 當 injectHtml 有值時，讀到 .html 內容就 inline 注入 SSE client script。
// 不獨立成 public 檔（見 v2 doc §7.5：少一個 round-trip、且 build 子命令不會夾帶）。
async function serveStatic(distDir, req, res, injectHtml) {
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
    if (injectHtml && ext === ".html") {
      res.end(injectHtml(data.toString("utf-8")));
    } else {
      res.end(data);
    }
  } catch {
    const notFound = path.join(distDir, "404.html");
    try {
      const data = await fs.readFile(notFound);
      res.statusCode = 404;
      res.setHeader("content-type", "text/html; charset=utf-8");
      if (injectHtml) {
        res.end(injectHtml(data.toString("utf-8")));
      } else {
        res.end(data);
      }
    } catch {
      res.statusCode = 404;
      res.end("not found");
    }
  }
}

// ── v2: SSE client script（inline 注入）────────────────────────────────
// 極短、無外部依賴；連 rebuild-complete ok=true 就 reload。
// 失敗只 console.warn 避免使用者困惑（詳細錯誤在 terminal）。
const DEV_CLIENT_SCRIPT = `<script>(function(){
  try {
    var es = new EventSource('/__notecraft/events');
    es.addEventListener('message', function(ev){
      try {
        var d = JSON.parse(ev.data);
        if (d.type === 'rebuild-complete') {
          if (d.ok) { location.reload(); }
          else { console.warn('[notecraft] rebuild failed:', d.error); }
        }
      } catch (e) {}
    });
  } catch (e) {}
})();</script>`;

function injectDevScript(html) {
  // 優先塞 </head>；找不到就 </body>；都找不到就原樣返回（不是 HTML shell）
  if (html.includes("</head>")) return html.replace("</head>", DEV_CLIENT_SCRIPT + "</head>");
  if (html.includes("</body>")) return html.replace("</body>", DEV_CLIENT_SCRIPT + "</body>");
  return html;
}

// v2: dist 不存在或首次 build 失敗時，serve 一個帶 SSE script 的等待頁——
// 使用者修好 mdx/tsx 後 watcher 觸發 rebuild 成功 → SSE 廣播 → 頁面自動 reload 到正常狀態。
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderFallbackPage({ error, notesDir }) {
  const errBlock = error
    ? `<p><strong>錯誤（詳細見 terminal）：</strong></p><pre>${escapeHtml(error)}</pre>`
    : `<p class="dim">尚無 build 產物；等待 watcher 偵測到 md/mdx 或 tsx 變動後自動 build。</p>`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>NoteCraft — 等待 build</title>
<style>
  body { font: 14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding: 40px; max-width: 720px; margin: auto; color: #334155; background: #f8fafc; }
  h1 { font-size: 20px; margin: 0 0 8px; color: #0f172a; }
  .dim { color: #64748b; font-size: 13px; }
  pre { background: #fff; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 6px; overflow: auto; font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  code { background: #eef2f7; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; }
</style>
</head>
<body>
<div class="card">
  <h1>NoteCraft — 等待可用的 dist</h1>
  <p class="dim">Notes: <code>${escapeHtml(notesDir)}</code></p>
  ${errBlock}
  <p class="dim">Watcher 正在監看 <code>*.md</code>／<code>*.mdx</code>／<code>.notecraft/components/*.tsx</code>／<code>.notecraft/*.json</code>。修好後這頁會自動 reload。</p>
</div>
${DEV_CLIENT_SCRIPT}
</body>
</html>`;
}

function hasServableDist(distDir) {
  return existsSync(path.join(distDir, "index.html"));
}

// ── v2: SSE broadcast helpers ────────────────────────────────────
function sseHandshake(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.write(`: ok\n\n`); // 開場 comment 幫助部分代理即時 flush
}

function sseSend(res, payload) {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    // client 斷線就吞掉；close handler 會處理清理
  }
}

// ── v2: 原子 rebuild（build 到 dist.next → rename 交換） ─────────────
async function atomicRebuild(cwd, notesDir, cacheDir, userCwd) {
  const distDir = path.join(cacheDir, "dist");
  const nextDir = path.join(cacheDir, "dist.next");
  const prevDir = path.join(cacheDir, "dist.prev");

  // 清 next 與 prev 殘留
  await fs.rm(nextDir, { recursive: true, force: true });
  await fs.rm(prevDir, { recursive: true, force: true });

  // build 到 dist.next；失敗直接 throw，caller 保留舊 dist
  await runAstroBuild(cwd, notesDir, nextDir, userCwd);

  // 原子交換：舊 dist → prev，next → dist。rename 在同一 filesystem 內原子
  if (existsSync(distDir)) {
    await fs.rename(distDir, prevDir);
  }
  await fs.rename(nextDir, distDir);

  // meta + 背景清理 prev（不 await，失敗也不影響 UX）
  const count = await countMdx(notesDir);
  await writeMeta(cacheDir, notesDir, count);
  fs.rm(prevDir, { recursive: true, force: true }).catch(() => {});
}

// startStaticServer 回傳 { server, broadcast, setLastError }。
// - broadcast: watch 模式時把 rebuild 結果推給所有 SSE 訂閱者
// - setLastError: 讓 caller（watcher / serveCmd 初始 build）更新 fallback 頁的錯誤訊息
async function startStaticServer(cwd, notesDir, distDir, port, host, openBrowser, { watch, initialError }) {
  const subscribers = new Set();
  const injectHtml = watch ? injectDevScript : null;
  let lastError = initialError || null;

  const server = createServer(async (req, res) => {
    try {
      // v2: SSE endpoint 優先攔截
      if (watch && req.url === "/__notecraft/events") {
        sseHandshake(res);
        subscribers.add(res);
        req.on("close", () => subscribers.delete(res));
        return;
      }
      // 只掛 assets，不掛寫入 API（serve = 唯讀靜態）
      const handled = await tryHandleAssetsRequest(cwd, notesDir, req, res);
      if (handled) return;

      // v2: dist 無 index.html（首次 build 失敗、或 notesDir 剛建、沒任何 mdx）→ fallback 頁
      if (!hasServableDist(distDir)) {
        const url = new URL(req.url || "/", "http://127.0.0.1");
        const pathname = decodeURIComponent(url.pathname);
        const ext = path.extname(pathname).toLowerCase();
        // 只對 HTML/目錄路由給 fallback；資產類直接 404，避免對 fetch 進來的 css/js 回傳 HTML
        if (!ext || ext === ".html") {
          res.statusCode = 200;
          res.setHeader("content-type", "text/html; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(renderFallbackPage({ error: lastError, notesDir }));
          return;
        }
        res.statusCode = 404;
        res.end("dist unavailable — check terminal for build errors");
        return;
      }

      await serveStatic(distDir, req, res, injectHtml);
    } catch (e) {
      res.statusCode = 500;
      res.end(e && e.message ? e.message : "internal error");
    }
  });

  server.listen(port, host, () => {
    const url = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`;
    log("");
    log(`  ➜  Local:   ${url}`);
    log(`  ➜  Mode:    serve${watch ? "（背景 rebuild + auto reload）" : "（純靜態、唯讀）"}`);
    log(`  ➜  Notes:   ${notesDir}`);
    log(`  ➜  Dist:    ${distDir}`);
    log("");
    if (openBrowser) openInBrowser(url);
  });

  function shutdown() {
    for (const res of subscribers) {
      try { res.end(); } catch {}
    }
    subscribers.clear();
    server.close(() => process.exit(0));
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  function broadcast(payload) {
    for (const res of subscribers) sseSend(res, payload);
  }

  function setLastError(err) {
    lastError = err || null;
  }

  return { server, broadcast, setLastError };
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
    const userCwd = process.cwd();
    log(`spawn astro dev`);
    log(`notes dir  : ${notesDir}`);
    log(`user cwd   : ${userCwd}`);
    log(`port       : ${args.port}`);
    const astroBin = path.join(packageRoot, "node_modules", "astro", "astro.js");
    const proc = spawn(process.execPath, [astroBin, "dev", "--port", String(args.port), "--host", args.host], {
      cwd: packageRoot,
      env: { ...process.env, NOTECRAFT_NOTES_DIR: notesDir, NOTECRAFT_USER_CWD: userCwd },
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
    const result = await ensureBuild(packageRoot, notesDir, cacheDir, args.rebuild, process.cwd());
    if (!result.ok) {
      log(`build failed: ${result.error}`);
      process.exit(1);
    }
    log(`dist:      : ${path.join(cacheDir, "dist")}`);
  },
});

const serveCmd = defineCommand({
  meta: {
    name: "serve",
    description: "Node HTTP 服務 build 過的 dist；預設帶背景 rebuild + auto reload（--no-watch 退出）",
  },
  args: {
    dir: { type: "positional", required: false, description: "notes 資料夾（預設當前目錄）" },
    port: { type: "string", default: "4321", description: "伺服器 port" },
    host: { type: "string", default: "127.0.0.1", description: "綁定 host" },
    "no-open": { type: "boolean", description: "不自動開啟瀏覽器" },
    rebuild: { type: "boolean", description: "強制首次 rebuild，忽略快取" },
    "no-watch": { type: "boolean", description: "關閉背景 rebuild + SSE（回到純靜態、唯讀行為）" },
  },
  async run({ args }) {
    const notesDir = resolveNotesDirArg(args.dir);
    const cacheDir = cacheDirFor(notesDir);
    const userCwd = process.cwd();
    const watch = !args["no-watch"];
    log(`notes dir  : ${notesDir}`);
    log(`cache dir  : ${cacheDir}`);
    log(`watch mode : ${watch ? "on（chokidar + SSE + atomic rebuild）" : "off"}`);
    const initial = await ensureBuild(packageRoot, notesDir, cacheDir, args.rebuild, userCwd);
    if (!initial.ok) {
      log(`⚠ 首次 build 失敗；server 仍上線，watcher 待修好後自動 rebuild`);
      log(`  錯誤：${initial.error}`);
    }
    const { broadcast, setLastError } = await startStaticServer(
      packageRoot,
      notesDir,
      path.join(cacheDir, "dist"),
      Number(args.port),
      args.host,
      !args["no-open"],
      { watch, initialError: initial.ok ? null : initial.error },
    );
    if (watch) {
      startBackgroundRebuild({
        cwd: packageRoot,
        notesDir,
        cacheDir,
        userCwd,
        broadcast,
        setLastError,
      });
    }
  },
});

// ── v2: chokidar watcher + debounced rebuild queue ───────────────
// 呼叫端：serveCmd。debounce 300ms、rebuild 期間再來事件標記 pending
// 讓下一輪跑一次不合併掉。
//
// chokidar v4/v5 已棄用 glob 語法（`**/*.md` 之類）；watch notesDir 整棵樹、
// 然後在 handler 內以 relPath 判斷是不是我們關心的三類。
function isWatchedFile(notesDir, filePath) {
  const rel = path.relative(notesDir, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const parts = rel.split(path.sep);
  if (parts[0] === ".notecraft") {
    if (parts.length === 2 && parts[1].endsWith(".json")) return true;
    if (parts.length === 3 && parts[1] === "components" && parts[2].endsWith(".tsx")) return true;
    return false;
  }
  // notesDir 底下、非 .* 目錄 → 只吃 md/mdx
  if (parts.some((p) => p.startsWith("."))) return false;
  return filePath.endsWith(".md") || filePath.endsWith(".mdx");
}

function startBackgroundRebuild({ cwd, notesDir, cacheDir, userCwd, broadcast, setLastError }) {
  const watcher = chokidar.watch(notesDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored: (p) => {
      // 目錄一律讓過（讓 chokidar recurse）；除了 .* 深層目錄（省 CPU）
      const rel = path.relative(notesDir, p);
      const parts = rel.split(path.sep);
      // 允許 .notecraft 本身；其他 . 開頭資料夾（.git、node_modules 等）不 recurse
      if (parts.length === 1 && parts[0].startsWith(".") && parts[0] !== ".notecraft") return true;
      return false;
    },
  });

  let debounceTimer = null;
  let rebuilding = false;
  let pending = false;
  let lastChange = "";

  async function runOnce() {
    rebuilding = true;
    log(`rebuild triggered: ${lastChange}`);
    const t0 = Date.now();
    try {
      await atomicRebuild(cwd, notesDir, cacheDir, userCwd);
      const dt = Date.now() - t0;
      log(`rebuild ok (${dt}ms) → broadcast reload`);
      setLastError && setLastError(null);
      broadcast({ type: "rebuild-complete", ok: true, tookMs: dt });
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      log(`rebuild FAILED: ${msg}`);
      setLastError && setLastError(msg);
      broadcast({ type: "rebuild-complete", ok: false, error: msg });
    } finally {
      rebuilding = false;
      if (pending) {
        pending = false;
        runOnce();
      }
    }
  }

  function trigger(reason) {
    lastChange = reason;
    if (rebuilding) {
      pending = true;
      return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runOnce, 300);
  }

  watcher.on("all", (event, filePath) => {
    // 只吃 md/mdx、.notecraft/components/*.tsx、.notecraft/*.json
    // 目錄 add/unlink 事件也會來，用 isWatchedFile 過濾（目錄的 filePath 不會有副檔名）
    if (!isWatchedFile(notesDir, filePath)) return;
    trigger(`${event} ${path.relative(notesDir, filePath)}`);
  });
  watcher.on("error", (err) => log(`watcher error: ${err.message || err}`));
  log(`watching: ${notesDir}`);
}

// ── v2 Q2: init-skill ────────────────────────────────────────────
// 把套件內 skill-template/.claude/ 整棵樹複製到 <targetRoot>/.claude/，
// 讓使用者在自己專案內開 Claude Code 就能觸發 @ai-visualize 標記處理。
// 詳見 docs/notecraft-npx-viewer-v2.md §4。

const SKILL_TEMPLATE_DIR = path.join(packageRoot, "skill-template");
const VERSION_REL = ".claude/skills/content-visualize/VERSION";

async function readIfExists(p) {
  try { return await fs.readFile(p, "utf-8"); } catch { return null; }
}

// 遞迴掃描來源、對每個檔案分類 new / same / conflict。
async function collectCopyPlan(sourceRoot, targetRoot) {
  const plan = [];
  async function walk(dir) {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const e of ents) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(abs);
      } else if (e.isFile()) {
        const rel = path.relative(sourceRoot, abs);
        const destAbs = path.join(targetRoot, rel);
        const src = await fs.readFile(abs, "utf-8");
        let action;
        if (!existsSync(destAbs)) {
          action = "new";
        } else {
          const dst = await fs.readFile(destAbs, "utf-8");
          action = src === dst ? "same" : "conflict";
        }
        plan.push({ srcAbs: abs, destAbs, rel, action });
      }
    }
  }
  await walk(path.join(sourceRoot, ".claude"));
  return plan;
}

function askOnce(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });
}

// 每個衝突檔案問一次，或作者一次選 A（overwrite all）/ S（skip all）。
async function promptConflicts(conflicts, targetRoot) {
  let bulkMode = null; // "overwrite" | "skip" | null
  const decisions = new Map();
  for (const c of conflicts) {
    if (bulkMode) {
      decisions.set(c, bulkMode);
      continue;
    }
    const rel = path.relative(targetRoot, c.destAbs);
    const ans = await askOnce(`衝突: ${rel} — [o]verwrite / [s]kip / [O]verwrite-all / [S]kip-all / [a]bort? `);
    if (ans === "a" || ans === "abort") {
      log("aborted by user");
      process.exit(1);
    }
    if (ans === "o" || ans === "overwrite") { decisions.set(c, "overwrite"); continue; }
    if (ans === "s" || ans === "skip") { decisions.set(c, "skip"); continue; }
    if (ans === "overwrite-all" || ans === "O".toLowerCase() /* readline lowercased */) {
      // readline 已 lowercase，'o' 走上面；只允許使用者打 "overwrite-all"
      bulkMode = "overwrite";
      decisions.set(c, "overwrite");
      continue;
    }
    if (ans === "skip-all") {
      bulkMode = "skip";
      decisions.set(c, "skip");
      continue;
    }
    // 沒答對重問這一個
    log("請輸入 o / s / overwrite-all / skip-all / a");
    conflicts.unshift(c); // 塞回 queue 頭
  }
  return decisions;
}

async function doInitSkillCheck(targetRoot) {
  const packaged = (await readIfExists(path.join(SKILL_TEMPLATE_DIR, VERSION_REL)))?.trim() ?? "unknown";
  const installed = (await readIfExists(path.join(targetRoot, VERSION_REL)))?.trim() ?? null;
  log(`content-visualize skill:`);
  log(`  target   : ${targetRoot}`);
  log(`  packaged : ${packaged}`);
  log(`  installed: ${installed ?? "(not installed)"}`);
  if (installed === null) {
    log(``);
    log(`→ 尚未安裝：跑 \`notecraftapp init-skill\` 安裝到當前目錄`);
  } else if (installed !== packaged) {
    log(``);
    log(`→ 版本落差：跑 \`notecraftapp init-skill\` 升級（會 prompt 每個衝突檔；帶 --force 直接覆蓋）`);
  } else {
    log(``);
    log(`→ up to date`);
  }
}

async function doInitSkill(targetRoot, { force }) {
  if (!existsSync(SKILL_TEMPLATE_DIR)) {
    log(`skill-template 目錄不存在：${SKILL_TEMPLATE_DIR}`);
    log(`（若在 dev 模式跑，先執行 \`npm run sync-skill\` 產生 skill-template）`);
    process.exit(1);
  }

  const plan = await collectCopyPlan(SKILL_TEMPLATE_DIR, targetRoot);
  const news = plan.filter((p) => p.action === "new");
  const sames = plan.filter((p) => p.action === "same");
  const conflicts = plan.filter((p) => p.action === "conflict");

  log(`from   : ${SKILL_TEMPLATE_DIR}`);
  log(`target : ${targetRoot}`);
  log(`plan   : ${news.length} new, ${sames.length} unchanged, ${conflicts.length} conflicts`);

  const skips = new Map();
  if (conflicts.length > 0) {
    if (force) {
      log(`--force：${conflicts.length} 個衝突檔將被覆蓋`);
    } else if (!process.stdin.isTTY) {
      log(``);
      log(`有 ${conflicts.length} 個衝突檔、當前非 TTY 環境；請帶 --force 或於互動 shell 執行`);
      for (const c of conflicts) log(`  conflict: ${c.rel}`);
      process.exit(1);
    } else {
      const decisions = await promptConflicts(conflicts, targetRoot);
      for (const [c, decision] of decisions) {
        if (decision === "skip") skips.set(c, true);
      }
    }
  }

  const written = [];
  for (const item of plan) {
    if (item.action === "same") continue;
    if (skips.has(item)) continue;
    await fs.mkdir(path.dirname(item.destAbs), { recursive: true });
    await fs.copyFile(item.srcAbs, item.destAbs);
    written.push(item.rel);
  }

  log(``);
  if (written.length === 0) {
    log(`nothing written`);
  } else {
    log(`wrote ${written.length} file(s):`);
    for (const rel of written) log(`  ${rel}`);
  }
  log(``);
  log(`✓ 安裝完成；在 ${targetRoot} 底下開 Claude Code 對話即可觸發 @ai-visualize 標記處理`);
}

const initSkillCmd = defineCommand({
  meta: {
    name: "init-skill",
    description: "把 content-visualize skill + 4 個 Subagent 設定安裝到當前專案 .claude/",
  },
  args: {
    force: { type: "boolean", description: "衝突檔直接覆寫、不 prompt" },
    check: { type: "boolean", description: "只印安裝狀態與版本比對、不寫檔" },
    dir: { type: "string", description: "安裝目標 root（預設 cwd）" },
  },
  async run({ args }) {
    const targetRoot = path.resolve(args.dir || process.cwd());
    if (args.check) {
      await doInitSkillCheck(targetRoot);
      return;
    }
    await doInitSkill(targetRoot, { force: !!args.force });
  },
});

const main = defineCommand({
  meta: { name: pkgJson.name, version: pkgJson.version, description: "NoteCraft viewer CLI" },
  subCommands: { view: viewCmd, build: buildCmd, serve: serveCmd, "init-skill": initSkillCmd },
});

runMain(main);
