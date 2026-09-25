// `notecraftapp install-plugin` 的實作（Task 54 / 55）。
//
// 拆成獨立檔案而非塞進 notecraftapp.mjs：那支已經 900 行，
// 而這裡的來源解析、抓取與靜態檢查是一整塊自成邏輯的東西。
//
// 設計依據：docs/notecraft-plugin-system.md §9、§10、§12。
// 幾條不可退讓的規則：
//   - 安裝前一律要人確認（`--yes` 才略過）。這是唯一有人能介入的點 ——
//     Q12 定案 store 一律從網路抓，沒有「離線包」可以當退路。
//   - 白名單外的 import 在**安裝時**就擋，不拖到 build。
//   - 不執行任何安裝腳本、不收可執行檔。

import { spawnSync } from "node:child_process";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

const DEFAULT_REPO = "SteveLin100132/notecraft";
const DEFAULT_STORE_DIR = "plugins";

/** 只收這些副檔名。其餘（package.json、*.sh、*.mjs…）一律拒絕。 */
const ALLOWED_EXT = new Set([".tsx", ".ts", ".json", ".md", ".css", ".svg", ".png"]);

const log = (...a) => console.log("[notecraftapp]", ...a);

// ── 白名單：與 AI 生成元件共用同一份 ────────────────────────────
// src/lib/generated-component-whitelist.ts 是 TypeScript，node 不能直接 import，
// 因此以正則讀出字面量。**不要在這裡另外抄一份清單** —— 漂移的代價是
// 「安裝時說 OK、build 時炸掉」，使用者只會覺得這個工具壞了。
function readWhitelist(packageRoot) {
  const p = path.join(packageRoot, "src/lib/generated-component-whitelist.ts");
  try {
    const src = readFileSync(p, "utf-8");
    const block = src.match(/GENERATED_COMPONENT_PACKAGE_WHITELIST\s*=\s*\[([\s\S]*?)\]/);
    if (!block) throw new Error("找不到白名單字面量");
    return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  } catch (e) {
    throw new Error(`讀取 import 白名單失敗（${p}）：${e.message}`);
  }
}

// ── 來源解析 ──────────────────────────────────────────────────
//
// 支援：<官方 id> / owner/repo / owner/repo/子目錄 / owner/repo#ref / 完整網址 / 本地路徑
export function parseSource(raw) {
  const s = String(raw).trim();

  // Windows 絕對路徑（D:\x、D:/x、\\server\share）沒有前導 . / ~，不另外判斷會被當成
  // 官方 id 或 owner/repo 丟去 GitHub。GitHub 帳號不含冒號，磁碟機寫法在任何平台都當本地路徑。
  if (
    s.startsWith(".") || s.startsWith("/") || s.startsWith("~") ||
    path.isAbsolute(s) || /^[a-zA-Z]:[\\/]/.test(s)
  ) {
    return { kind: "local", dir: path.resolve(s.replace(/^~/, os.homedir())) };
  }

  let rest = s;
  let ref = null;
  const hash = rest.indexOf("#");
  if (hash >= 0) {
    ref = rest.slice(hash + 1);
    rest = rest.slice(0, hash);
  }

  const url = rest.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.*))?)?\/?$/);
  if (url) {
    return { kind: "github", owner: url[1], repo: url[2].replace(/\.git$/, ""), ref: url[3] ?? ref, dir: url[4] ?? null };
  }

  const parts = rest.split("/").filter(Boolean);
  if (parts.length === 1) {
    // 只給 id → 官方 store
    const [owner, repo] = DEFAULT_REPO.split("/");
    return { kind: "github", owner, repo, ref, dir: `${DEFAULT_STORE_DIR}/${parts[0]}`, officialId: parts[0] };
  }
  if (parts.length >= 2) {
    return { kind: "github", owner: parts[0], repo: parts[1], ref, dir: parts.slice(2).join("/") || null };
  }
  throw new Error(`無法解析來源：${raw}`);
}

// ── GitHub 抓取 ───────────────────────────────────────────────
//
// 主路徑逐檔 fetch（零依賴、不必解壓縮、不要求環境有 git）；
// 非 GitHub、限流或任何失敗 → 退回 git clone --depth 1。

async function ghJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "notecraftapp" } });
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status}：${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function ghRaw(owner, repo, ref, filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
  const res = await fetch(url, { headers: { "User-Agent": "notecraftapp" } });
  if (!res.ok) throw new Error(`下載失敗 ${res.status}：${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** 讀某個 repo 的 plugins/registry.json（官方 store 或第三方的多 plugin repo）。 */
export async function fetchRegistry({ owner = "SteveLin100132", repo = "notecraft", ref = "HEAD" } = {}) {
  for (const p of [`${DEFAULT_STORE_DIR}/registry.json`, "registry.json"]) {
    try {
      const buf = await ghRaw(owner, repo, ref, p);
      const data = JSON.parse(buf.toString("utf-8"));
      if (Array.isArray(data?.plugins)) return { ...data, _base: p.includes("/") ? DEFAULT_STORE_DIR : "" };
    } catch {
      /* 換下一個位置 */
    }
  }
  return null;
}

/**
 * 把一個 plugin 目錄抓進暫存區，回傳 { files: Map<相對路徑, Buffer>, commit }。
 * files 清單優先取自 registry（省一次目錄列表 API，也避開未認證 60 次/小時的限流）。
 */
async function fetchPluginFiles(src, knownFiles) {
  const ref = src.ref ?? "HEAD";
  const dir = src.dir ?? "";
  const files = new Map();

  let commit = ref;
  try {
    const info = await ghJson(`https://api.github.com/repos/${src.owner}/${src.repo}/commits/${ref === "HEAD" ? "" : ref}`);
    commit = info?.sha ?? ref;
  } catch {
    /* 拿不到 commit 不影響安裝，只是 .installed.json 少一個欄位 */
  }

  let list = knownFiles;
  if (!list) {
    // 沒有 registry 可依靠時才打目錄列表 API
    const walk = async (sub) => {
      const url = `https://api.github.com/repos/${src.owner}/${src.repo}/contents/${[dir, sub].filter(Boolean).join("/")}?ref=${ref}`;
      const items = await ghJson(url);
      const out = [];
      for (const it of items) {
        const rel = [sub, it.name].filter(Boolean).join("/");
        if (it.type === "dir") out.push(...(await walk(rel)));
        else if (it.type === "file") out.push(rel);
      }
      return out;
    };
    list = await walk("");
  }

  for (const rel of list) {
    const full = [dir, rel].filter(Boolean).join("/");
    files.set(rel, await ghRaw(src.owner, src.repo, ref, full));
  }
  return { files, commit };
}

/** 退路：clone 到暫存目錄再把子目錄搬出來。 */
async function clonePluginFiles(src) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "notecraft-plugin-"));
  const url = `https://github.com/${src.owner}/${src.repo}.git`;
  const args = ["clone", "--depth", "1", ...(src.ref ? ["--branch", src.ref] : []), url, tmp];
  // 任何失敗（clone 失敗、子目錄不存在）都要清掉暫存目錄，否則整份 clone 會留在 tmp
  try {
    const r = spawnSync("git", args, { stdio: "pipe" });
    if (r.status !== 0) {
      throw new Error(`git clone 失敗：${r.stderr?.toString().trim() || r.error?.message || "（未知錯誤）"}`);
    }
    const head = spawnSync("git", ["-C", tmp, "rev-parse", "HEAD"], { stdio: "pipe" });
    const root = path.join(tmp, src.dir ?? "");
    if (!existsSync(root)) throw new Error(`repo 內找不到 ${src.dir}`);
    const files = new Map();
    const walk = async (d, sub = "") => {
      for (const e of await fs.readdir(d, { withFileTypes: true })) {
        if (e.name === ".git") continue;
        const abs = path.join(d, e.name);
        const rel = [sub, e.name].filter(Boolean).join("/");
        if (e.isDirectory()) await walk(abs, rel);
        else if (e.isFile()) files.set(rel, await fs.readFile(abs));
      }
    };
    await walk(root);
    return { files, commit: head.status === 0 ? head.stdout.toString().trim() : (src.ref ?? "unknown") };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

async function readLocalFiles(dir) {
  const files = new Map();
  const walk = async (d, sub = "") => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const abs = path.join(d, e.name);
      const rel = [sub, e.name].filter(Boolean).join("/");
      if (e.isDirectory()) await walk(abs, rel);
      else if (e.isFile()) files.set(rel, await fs.readFile(abs));
    }
  };
  await walk(dir);
  return { files, commit: "local" };
}

// ── 靜態檢查（§9.6）──────────────────────────────────────────

function checkSemverRange(range, version) {
  // 只支援 >=x.y.z、^x.y.z 與精確版本 —— 夠用，且不必為此背一個 semver 依賴。
  const cmp = (a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
    return 0;
  };
  const v = version.split("-")[0];
  const r = String(range).trim();
  if (r.startsWith(">=")) return cmp(v, r.slice(2).trim()) >= 0;
  if (r.startsWith("^")) {
    const base = r.slice(1).trim();
    return cmp(v, base) >= 0 && v.split(".")[0] === base.split(".")[0];
  }
  return cmp(v, r) === 0;
}

export function inspectFiles(files, whitelist, appVersion) {
  const problems = [];
  let manifest = null;

  for (const [rel] of files) {
    // 路徑安全：拒絕逃脫與絕對路徑
    if (rel.split("/").includes("..") || path.isAbsolute(rel)) {
      problems.push(`路徑不安全：${rel}`);
      continue;
    }
    const ext = path.extname(rel).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      problems.push(`不收這種檔案：${rel}（只收 ${[...ALLOWED_EXT].join(" ")}）`);
    }
  }

  const manifestBuf = files.get("notecraft-plugin.json");
  if (!manifestBuf) {
    problems.push("缺少 notecraft-plugin.json");
  } else {
    try {
      manifest = JSON.parse(manifestBuf.toString("utf-8"));
    } catch (e) {
      problems.push(`notecraft-plugin.json 不是合法 JSON：${e.message}`);
    }
  }
  if (!files.has("renderer.tsx")) problems.push("缺少 renderer.tsx（入口檔名固定）");

  // import 白名單 + 禁用 dangerouslySetInnerHTML
  for (const [rel, buf] of files) {
    if (![".tsx", ".ts"].includes(path.extname(rel).toLowerCase())) continue;
    const src = buf.toString("utf-8");
    src.split("\n").forEach((line, i) => {
      const m = line.match(/^\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/);
      if (m) {
        const spec = m[1];
        const isRelative = spec.startsWith(".") || spec.startsWith("@notes/") || spec.startsWith("@/");
        const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        if (!isRelative && !whitelist.includes(pkg)) {
          problems.push(`${rel}:${i + 1} import 了白名單外的套件「${pkg}」`);
        }
      }
      if (line.includes("dangerouslySetInnerHTML")) {
        problems.push(`${rel}:${i + 1} 使用了 dangerouslySetInnerHTML（禁用）`);
      }
    });
  }

  if (manifest?.engines?.notecraftapp && !checkSemverRange(manifest.engines.notecraftapp, appVersion)) {
    problems.push(
      `這個 plugin 需要 notecraftapp ${manifest.engines.notecraftapp}，目前是 ${appVersion}。請先升級。`,
    );
  }

  return { manifest, problems };
}

// ── 互動 ──────────────────────────────────────────────────────

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => (rl.close(), resolve(a.trim()))));
}

// ── 對外：三個動作 ────────────────────────────────────────────

export async function listStore() {
  const reg = await fetchRegistry();
  if (!reg) {
    log("讀不到官方 store。這個指令一律從 GitHub 即時取得清單，請確認網路連線。");
    process.exit(1);
  }
  log(`官方 plugin store（github.com/${DEFAULT_REPO}）`);
  console.log("");
  reg.plugins.forEach((p, i) => {
    console.log(`  ${i + 1}) ${p.id}`.padEnd(30) + (p.title ?? ""));
    console.log(`     ${p.description ?? ""}`.padEnd(30) + `  v${p.version ?? "?"}`);
    console.log("");
  });
  return reg;
}

export async function removePlugin(targetRoot, id) {
  const dir = path.join(targetRoot, ".notecraft", "plugins", id);
  if (!existsSync(dir)) {
    log(`沒有安裝 ${id}（找不到 ${dir}）`);
    process.exit(1);
  }
  await fs.rm(dir, { recursive: true, force: true });
  log(`已移除 ${id} → ${dir}`);

  // Q9 定案「plugins.json 指到沒裝的 plugin 就 build fail」，所以殘留一定要講
  const cfgPath = path.join(targetRoot, ".notecraft", "plugins.json");
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
      const still = (cfg.plugins ?? []).filter((m) => m.plugin === id);
      if (still.length) {
        log("");
        log(`⚠ plugins.json 還有 ${still.length} 條規則指向 "${id}"，下次 build 會失敗。`);
        log(`  請一併移除，或重新安裝這個 plugin。`);
      }
      if (Array.isArray(cfg.disabled) && cfg.disabled.includes(id)) {
        log("");
        log(`⚠ plugins.json 的 disabled 仍列著 "${id}"。build 只會 warn，但建議一併清掉。`);
      }
    } catch {
      /* 設定壞掉不是這個指令要處理的事 */
    }
  }
}

export async function installPlugin(source, opts) {
  const { targetRoot, packageRoot, appVersion, force, yes, apply, as: asId } = opts;
  const whitelist = readWhitelist(packageRoot);

  // 沒給來源 → 列官方 store 讓人選
  let src;
  let knownFiles = null;
  if (!source) {
    const reg = await listStore();
    const ans = await ask("選擇要安裝的 plugin（輸入編號 / q 離開）: ");
    if (!ans || ans.toLowerCase() === "q") process.exit(0);
    const picked = reg.plugins[Number(ans) - 1];
    if (!picked) {
      log("沒有這個編號");
      process.exit(1);
    }
    src = parseSource(picked.id);
    knownFiles = picked.files ?? null;
  } else {
    src = parseSource(source);
    if (src.officialId) {
      const reg = await fetchRegistry();
      knownFiles = reg?.plugins.find((p) => p.id === src.officialId)?.files ?? null;
    }
  }

  // 抓檔
  let fetched;
  if (src.kind === "local") {
    if (!existsSync(src.dir)) {
      log(`本地路徑不存在：${src.dir}`);
      process.exit(1);
    }
    fetched = await readLocalFiles(src.dir);
  } else {
    try {
      fetched = await fetchPluginFiles(src, knownFiles);
    } catch (e) {
      log(`逐檔下載失敗（${e.message}），改用 git clone --depth 1…`);
      fetched = await clonePluginFiles(src);
    }
  }

  const { manifest, problems } = inspectFiles(fetched.files, whitelist, appVersion);
  const id = asId ?? manifest?.id ?? src.officialId ?? path.basename(src.dir ?? "plugin");
  if (manifest && !asId && manifest.id !== id) {
    problems.push(`manifest 的 id 是 "${manifest.id}"，與安裝目錄名 "${id}" 不一致`);
  }

  const origin =
    src.kind === "local"
      ? src.dir
      : `https://github.com/${src.owner}/${src.repo}${src.dir ? "/tree/" + (src.ref ?? "HEAD") + "/" + src.dir : ""}`;

  console.log("");
  log(`來源    : ${origin}`);
  log(`plugin  : ${id}${manifest?.version ? ` v${manifest.version}` : ""}${manifest?.title ? ` — ${manifest.title}` : ""}`);
  log(`檔案    : ${fetched.files.size} 個`);
  for (const rel of fetched.files.keys()) console.log(`          ${rel}`);

  if (problems.length) {
    console.log("");
    log("✗ 靜態檢查未通過，拒絕安裝：");
    for (const p of problems) console.log(`    ${p}`);
    process.exit(1);
  }

  // 一律確認。Q12 讓 store 走網路，這一步是唯一有人能介入的地方。
  if (!yes) {
    if (!process.stdin.isTTY) {
      console.log("");
      log("非 TTY 環境無法確認；若確定要安裝請帶 --yes");
      process.exit(1);
    }
    console.log("");
    const ans = await ask("這會把上述檔案寫進你的專案，並在 build 與瀏覽器中執行。確定安裝？[y/N] ");
    if (!/^y(es)?$/i.test(ans)) {
      log("已取消");
      process.exit(0);
    }
  }

  // 寫檔
  const destDir = path.join(targetRoot, ".notecraft", "plugins", id);
  if (existsSync(destDir) && !force) {
    if (!process.stdin.isTTY) {
      log(`${destDir} 已存在；請帶 --force 覆寫`);
      process.exit(1);
    }
    const ans = await ask(`${id} 已安裝，覆寫？[y/N] `);
    if (!/^y(es)?$/i.test(ans)) {
      log("已取消");
      process.exit(0);
    }
  }
  for (const [rel, buf] of fetched.files) {
    const abs = path.join(destDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buf);
  }
  await fs.writeFile(
    path.join(destDir, ".installed.json"),
    JSON.stringify({ id, origin, ref: src.ref ?? null, commit: fetched.commit, installedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf-8",
  );

  // plugin 不該相依 app 原始碼，但仍需要 props 型別
  await writePluginTypes(targetRoot, packageRoot);

  console.log("");
  log(`✓ 已安裝 ${id}${manifest?.version ? ` v${manifest.version}` : ""} → .notecraft/plugins/${id}/`);

  const cfgPath = path.join(targetRoot, ".notecraft", "plugins.json");
  if (apply) {
    await applyMapping(cfgPath, id, apply);
    log(`✓ 已在 .notecraft/plugins.json 加入映射：${apply}`);
  } else {
    console.log("");
    log("下一步：在 .notecraft/plugins.json 加上映射");
    console.log("");
    console.log(JSON.stringify({ plugins: [{ plugin: id, files: ["**/*.json"] }] }, null, 2)
      .split("\n").map((l) => "    " + l).join("\n"));
    console.log("");
    if (manifest?.example) log(`範例資料：.notecraft/plugins/${id}/${manifest.example}`);
    log(`想一步到位：install-plugin ${id} --apply "**/*.json"`);
  }
}

async function applyMapping(cfgPath, id, glob) {
  let cfg = { plugins: [] };
  if (existsSync(cfgPath)) {
    try {
      cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
    } catch (e) {
      throw new Error(`${cfgPath} 不是合法 JSON，無法自動加入映射：${e.message}`);
    }
  }
  cfg.plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const exist = cfg.plugins.find((m) => m.plugin === id);
  if (exist) {
    exist.files = [...new Set([...(exist.files ?? []), glob])];
  } else {
    cfg.plugins.push({ plugin: id, files: [glob] });
  }
  await fs.mkdir(path.dirname(cfgPath), { recursive: true });
  await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

/** 把 PluginRendererProps 落地到使用者專案，讓 plugin 不必相依 app 原始碼。 */
export async function writePluginTypes(targetRoot, packageRoot) {
  const srcPath = path.join(packageRoot, "src/lib/plugin-types.ts");
  const out = path.join(targetRoot, ".notecraft", "plugins", "_types.d.ts");
  const src = readFileSync(srcPath, "utf-8");
  const m = src.match(/export const PLUGIN_TYPES_DTS = `([\s\S]*?)`;\s*$/);
  if (!m) throw new Error(`讀不到 PLUGIN_TYPES_DTS（${srcPath}）`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, m[1].replace(/\\`/g, "`").replace(/\\\$/g, "$"), "utf-8");
}
