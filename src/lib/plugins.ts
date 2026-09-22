// Plugin System 的 build 期解析（Task 47）。
//
// 職責：把「哪個資料檔交給哪個 renderer、資料長什麼樣」在 build / dev 時算出來，
// 供 /view 路由、筆記列表、系列整合、MDX 內嵌共用。
//
// 這是整個功能唯一會讓 build 失敗的地方 —— 設計上刻意如此（規格 §7.7）：
// 靜默降級會讓「東西不見了」變成沉默 bug，build fail 至少明確。
//
// 執行環境：Astro 的 build / dev（Node）。因此 manifest、schema、資料檔一律用 fs 讀，
// 只有 renderer 必須走 import.meta.glob —— 它要被打包成真的能渲染的模組，fs 給不了。
//
// 完整設計見 docs/notecraft-plugin-system.md §7.1、§7.2。

import fs from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import Ajv2020Module from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import type {
  PluginManifest,
  PluginMapping,
  PluginsConfig,
  ResolvedDataFile,
} from "@/lib/plugin-types";

// ajv 的 2020 進入點是 CJS，在 ESM 下 default import 可能拿到 { default: Ajv }。
// 兩種形狀都要能用，因此在這裡收斂一次。
type Ajv2020Ctor = new (opts?: Record<string, unknown>) => {
  compile: (schema: object) => ValidateFunction;
};
const Ajv2020 = ((Ajv2020Module as unknown as { default?: Ajv2020Ctor }).default ??
  Ajv2020Module) as unknown as Ajv2020Ctor;

// ── 路徑解析 ──────────────────────────────────────────────
//
// 與 astro.config.mjs 的 notecraftDir 同一套優先序（NOTECRAFT_USER_CWD > NOTECRAFT_NOTES_DIR
// > cwd）。必須一致：renderer 是透過 `@notes/plugins/*` 這個 alias 被找到的，
// 若 plugins.json 從另一個 .notecraft 讀進來，就會出現「設定在 A、渲染器在 B」的錯位。

const notesDir = process.env.NOTECRAFT_NOTES_DIR
  ? path.resolve(process.env.NOTECRAFT_NOTES_DIR)
  : path.resolve(process.cwd(), "src/content/notes");

const userCwd = process.env.NOTECRAFT_USER_CWD
  ? path.resolve(process.env.NOTECRAFT_USER_CWD)
  : null;

const notecraftDir = userCwd
  ? path.join(userCwd, ".notecraft")
  : process.env.NOTECRAFT_NOTES_DIR
    ? path.join(notesDir, ".notecraft")
    : path.join(process.cwd(), ".notecraft");

/** plugin 套件可能落腳的兩個根：主專案的官方 store、使用者專案的安裝目錄。 */
const PLUGIN_ROOTS = [
  path.resolve(process.cwd(), "plugins"),
  path.join(notecraftDir, "plugins"),
];

const CONFIG_PATH = path.join(notecraftDir, "plugins.json");

function fail(msg: string): never {
  throw new Error(`[plugins] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[plugins] ${msg}`);
}

// ── renderer 發現 ─────────────────────────────────────────
//
// 兩條 glob：主專案的 plugins/（讓官方 plugin 有地方能真的 build、能跑 CI，Q17）
// 與使用者專案的 .notecraft/plugins/。`@notes` alias 恆有定義，指向不存在的目錄時
// glob 命中 0 筆、不報錯（見 astro.config.mjs 的註解）。

type RendererModule = { default?: unknown };

const rendererModules: Record<string, RendererModule> = {
  ...import.meta.glob<RendererModule>("/plugins/*/renderer.tsx", { eager: true }),
  ...import.meta.glob<RendererModule>("@notes/plugins/*/renderer.tsx", { eager: true }),
};

/** 從 glob key 取出 plugin id。key 的前綴依解析方式而異，但結尾恆為 plugins/<id>/renderer.tsx。 */
function pluginIdFromKey(key: string): string | null {
  const m = key.match(/(?:^|\/)plugins\/([^/]+)\/renderer\.tsx$/);
  return m ? m[1] : null;
}

export interface PluginRecord {
  id: string;
  manifest: PluginManifest;
  /** renderer 的 default export；型別在使用端（.astro / island）再收斂。 */
  Renderer: unknown;
  /** manifest 與 schema 所在目錄（絕對路徑）。 */
  dir: string;
}

function readManifest(dir: string, id: string): PluginManifest {
  const abs = path.join(dir, "notecraft-plugin.json");
  if (!fs.existsSync(abs)) {
    fail(`plugin "${id}" 缺少 notecraft-plugin.json（預期位置：${abs}）`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf-8"));
  } catch (e) {
    fail(`plugin "${id}" 的 notecraft-plugin.json 不是合法 JSON：${(e as Error).message}`);
  }
  const manifest = parsed as PluginManifest;
  if (manifest.id !== id) {
    fail(
      `plugin "${id}" 的 manifest id 是 "${manifest.id}"，與資料夾名不一致。` +
        `兩者必須相同，否則 plugins.json 指到的會是一個對不上的目錄。`,
    );
  }
  return manifest;
}

let pluginsCache: Map<string, PluginRecord> | null = null;

/** 已安裝且可用的 plugin，key 為 id。 */
export function getPlugins(): Map<string, PluginRecord> {
  if (pluginsCache) return pluginsCache;
  const out = new Map<string, PluginRecord>();
  for (const [key, mod] of Object.entries(rendererModules)) {
    const id = pluginIdFromKey(key);
    if (!id) continue;
    if (!mod?.default) {
      fail(`plugin "${id}" 的 renderer.tsx 沒有 default export`);
    }
    const dir = PLUGIN_ROOTS.map((root) => path.join(root, id)).find((d) =>
      fs.existsSync(path.join(d, "notecraft-plugin.json")),
    );
    if (!dir) {
      fail(
        `找到 plugin "${id}" 的 renderer.tsx，卻找不到它的 notecraft-plugin.json。` +
          `已查找：${PLUGIN_ROOTS.map((r) => path.join(r, id)).join("、")}`,
      );
    }
    out.set(id, { id, manifest: readManifest(dir, id), Renderer: mod.default, dir });
  }
  pluginsCache = out;
  return out;
}

// ── 設定讀取 ──────────────────────────────────────────────

function readConfig(): PluginsConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null; // 沒設定 = 功能停用，零成本、不報錯也不 warn
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (e) {
    fail(`${CONFIG_PATH} 不是合法 JSON：${(e as Error).message}`);
  }
  const cfg = parsed as PluginsConfig;
  if (!Array.isArray(cfg?.plugins)) {
    fail(`${CONFIG_PATH} 缺少 plugins 陣列`);
  }
  if (cfg.disabled !== undefined && !(Array.isArray(cfg.disabled) && cfg.disabled.every((x) => typeof x === "string"))) {
    fail(`${CONFIG_PATH} 的 disabled 必須是字串陣列（plugin id）`);
  }
  cfg.plugins.forEach((m, i) => validateMapping(m, i));
  return cfg;
}

function validateMapping(m: PluginMapping, i: number): void {
  const at = `plugins.json 第 ${i + 1} 條規則`;
  if (!m.plugin) fail(`${at} 缺少 plugin 欄位`);
  if (!Array.isArray(m.files) || m.files.length === 0) {
    fail(`${at}（${m.plugin}）的 files 必須是非空陣列`);
  }
  for (const pattern of m.files) {
    // md/mdx 是 notes collection 的地盤；讓 plugin 接管會產生兩條路由指向同一內容。
    if (/\.mdx?($|[,}])/i.test(pattern)) {
      fail(
        `${at}（${m.plugin}）的 files 比對到 .md / .mdx："${pattern}"。` +
          `筆記由 notes collection 負責，plugin 不能接管。`,
      );
    }
  }
}

// ── notesDir 走訪 ─────────────────────────────────────────
//
// 自己走而不用現成的 glob 套件：走訪本來就要順手收 mtime 與檔案數給快取失效判斷用
// （Task 56），用 tinyglobby 之類的還得再 stat 一輪。形狀比照 CLI 的 walkMdx。

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

interface ScannedFile {
  relPath: string;
  absPath: string;
  mtimeMs: number;
}

function walk(dir: string, base: string, out: ScannedFile[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // 權限或競態；當作沒有檔案，不中斷 build
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(abs, base, out);
    } else if (e.isFile()) {
      out.push({
        relPath: path.relative(base, abs).split(path.sep).join("/"),
        absPath: abs,
        mtimeMs: fs.statSync(abs).mtimeMs,
      });
    }
  }
}

// ── 資料驗證 ──────────────────────────────────────────────

const ajv = new Ajv2020({ strict: false, allErrors: false });
const validatorCache = new Map<string, ValidateFunction | null>();

function validatorFor(plugin: PluginRecord): ValidateFunction | null {
  if (validatorCache.has(plugin.id)) return validatorCache.get(plugin.id) ?? null;
  const rel = plugin.manifest.dataSchema;
  let fn: ValidateFunction | null = null;
  if (rel) {
    const abs = path.join(plugin.dir, rel);
    if (!fs.existsSync(abs)) {
      fail(`plugin "${plugin.id}" 的 manifest 指定 dataSchema="${rel}"，但該檔不存在（${abs}）`);
    }
    try {
      fn = ajv.compile(JSON.parse(fs.readFileSync(abs, "utf-8")) as object);
    } catch (e) {
      fail(`plugin "${plugin.id}" 的 dataSchema 無法編譯：${(e as Error).message}`);
    }
  }
  validatorCache.set(plugin.id, fn);
  return fn;
}

// ── 主解析 ────────────────────────────────────────────────

export interface ScanStats {
  /** 命中 glob 的資料檔數量。 */
  dataFileCount: number;
  /** 命中檔案中最新的 mtime（毫秒）；沒有命中時為 0。 */
  latestMtimeMs: number;
}

/** 已停用 plugin 的規則「若啟用會命中」的檔（規格 §8.6.1）。只供列表顯示，不產頁。 */
export interface InactiveMatch {
  pluginId: string;
  relPath: string;
}

interface Resolved {
  files: ResolvedDataFile[];
  inactive: InactiveMatch[];
  stats: ScanStats;
}

let resolvedCache: Resolved | null = null;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 取資料檔的 meta.title / meta.description —— app 只約定這兩個欄位，其餘由 plugin 自行解讀。 */
function readMeta(data: unknown, fallbackTitle: string): { title: string; description: string } {
  const meta = isPlainObject(data) && isPlainObject(data.meta) ? data.meta : null;
  const title = meta && typeof meta.title === "string" && meta.title.trim() ? meta.title : fallbackTitle;
  const description = meta && typeof meta.description === "string" ? meta.description : "";
  return { title, description };
}

function resolve(): Resolved {
  if (resolvedCache) return resolvedCache;

  const config = readConfig();
  if (!config) {
    resolvedCache = { files: [], inactive: [], stats: { dataFileCount: 0, latestMtimeMs: 0 } };
    return resolvedCache;
  }

  // 停用（Q22）：在 disabled 裡的 plugin，其所有規則在比對前就略過、等同不存在 ——
  // 因此也不參與「是否已安裝」的檢查（壞掉的 plugin 先停用，站還是 build 得出來）。
  const disabled = new Set(config.disabled ?? []);
  const plugins = getPlugins();
  for (const id of disabled) {
    if (!plugins.has(id) && !config.plugins.some((m) => m.plugin === id)) {
      warn(`plugins.json 的 disabled 列了 "${id}"，但它既沒安裝、也沒有任何規則引用它（是不是打錯字？）`);
    }
  }
  const activeMappings = config.plugins.filter((m) => !disabled.has(m.plugin));
  const inactiveMappings = config.plugins.filter((m) => disabled.has(m.plugin));

  for (const m of activeMappings) {
    if (!plugins.has(m.plugin)) {
      fail(
        `plugins.json 指定的 plugin "${m.plugin}" 尚未安裝。\n` +
          `  安裝：npx notecraftapp install-plugin ${m.plugin}`,
      );
    }
  }

  const scanned: ScannedFile[] = [];
  walk(notesDir, notesDir, scanned);

  // 每條規則預編譯一組 matcher，避免在檔案迴圈裡重複編譯。
  const matchers = activeMappings.map((m) => ({
    mapping: m,
    /** 1-based、以 plugins.json 原始順序計，用於訊息 —— 同一個 plugin 可以出現在多條規則裡，只印 plugin 名會分不出是哪條。 */
    no: config.plugins.indexOf(m) + 1,
    isMatch: picomatch(m.files, { dot: false }),
    isExcluded: m.exclude?.length ? picomatch(m.exclude, { dot: false }) : () => false,
    /** glob 有比對到的檔數（不論最後是否由它接手）。 */
    matched: 0,
    /** 實際接手的檔數。 */
    won: 0,
  }));

  const inactiveMatchers = inactiveMappings.map((m) => ({
    pluginId: m.plugin,
    isMatch: picomatch(m.files, { dot: false }),
    isExcluded: m.exclude?.length ? picomatch(m.exclude, { dot: false }) : () => false,
  }));

  const files: ResolvedDataFile[] = [];
  const inactive: InactiveMatch[] = [];
  const byRoute = new Map<string, ResolvedDataFile>();
  let latestMtimeMs = 0;

  for (const file of scanned) {
    const matched = matchers.filter((x) => x.isMatch(file.relPath) && !x.isExcluded(file.relPath));
    if (matched.length === 0) {
      // 沒有啟用中的規則接手 → 看看是不是被停用的規則「原本會」命中（只供列表顯示）
      const im = inactiveMatchers.find((x) => x.isMatch(file.relPath) && !x.isExcluded(file.relPath));
      if (im) inactive.push({ pluginId: im.pluginId, relPath: file.relPath });
      continue;
    }

    // 第一條勝（Q8）。「大範圍 + 特例」是常見寫法，硬擋會讓萬用 glob 不能用；
    // warn 負責讓作者知道發生了，而不是靜靜地被前面那條吃掉。
    const winner = matched[0];
    for (const x of matched) x.matched += 1;
    if (matched.length > 1) {
      warn(
        `${file.relPath} 同時被 ${matched.length} 條規則命中` +
          `（${matched.map((x) => `第 ${x.no} 條 ${x.mapping.plugin}`).join("、")}）` +
          `，已交給第 ${winner.no} 條：${winner.mapping.plugin}`,
      );
    }
    winner.won += 1;

    const plugin = plugins.get(winner.mapping.plugin);
    if (!plugin) continue; // 上面已檢查過，這裡只為收斂型別

    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(file.absPath, "utf-8"));
    } catch (e) {
      fail(`資料檔 ${file.relPath} 不是合法 JSON：${(e as Error).message}`);
    }

    const validate = validatorFor(plugin);
    if (validate && !validate(data)) {
      const first = validate.errors?.[0];
      fail(
        `資料檔 ${file.relPath} 不符合 plugin "${plugin.id}" 的 schema：` +
          `${first?.instancePath || "(根層)"} ${first?.message ?? "驗證失敗"}`,
      );
    }

    const routePath = file.relPath.replace(/\.json$/i, "");
    const name = path.basename(file.relPath);
    const { title, description } = readMeta(data, name);
    const resolvedFile: ResolvedDataFile = {
      pluginId: plugin.id,
      absPath: file.absPath,
      relPath: file.relPath,
      routePath,
      title,
      description,
      data,
      options: winner.mapping.options ?? {},
      updatedAt: new Date(file.mtimeMs).toISOString(),
    };

    // 目前只吃 .json（Q21），relPath 相異必然 routePath 相異，這道檢查幾乎不可達 ——
    // 留著是為了 Q21 擴充 parser 之後（planning/schema.json 與 planning/schema.yaml
    // 會撞同一個路由），以及大小寫敏感檔案系統上的 .json / .JSON。
    const clash = byRoute.get(routePath);
    if (clash) {
      fail(
        `兩個資料檔對到同一個路由 /view/${routePath}：${clash.relPath} 與 ${file.relPath}。` +
          `請改名或以 exclude 排除其中一個。`,
      );
    }
    byRoute.set(routePath, resolvedFile);
    files.push(resolvedFile);
    if (file.mtimeMs > latestMtimeMs) latestMtimeMs = file.mtimeMs;

    // 資料一律 inline 成 island props（Q10）。夠大的檔值得提醒一聲，但不擋 build。
    const bytes = Buffer.byteLength(JSON.stringify(data));
    if (bytes > 256 * 1024) {
      warn(
        `${file.relPath} 約 ${Math.round(bytes / 1024)} KB，會整份 inline 進 HTML。` +
          `超過 256 KB 建議考慮拆檔。`,
      );
    }
  }

  // 兩種「沒作用」要分開講。混為一談的話，作者會拿著「沒有比對到」的提示去修一個
  // 其實比對得好好的 glob —— 真正的原因是前面有條更寬的規則先接手了。
  for (const x of matchers) {
    if (x.won > 0) continue;
    if (x.matched === 0) {
      warn(
        `plugins.json 第 ${x.no} 條（${x.mapping.plugin}）沒有比對到任何檔案` +
          `（files: ${x.mapping.files.join("、")}）`,
      );
    } else {
      warn(
        `plugins.json 第 ${x.no} 條（${x.mapping.plugin}）比對到 ${x.matched} 個檔案，` +
          `但都已被更前面的規則接手，這條規則實際上沒有作用。若要讓它生效，請把它移到前面。`,
      );
    }
  }

  files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.routePath.localeCompare(b.routePath));
  resolvedCache = { files, inactive, stats: { dataFileCount: files.length, latestMtimeMs } };
  return resolvedCache;
}

// ── 對外 API ──────────────────────────────────────────────

/** 專案有沒有啟用 plugin（有 plugins.json 且至少解析出一個資料檔）。 */
export function isPluginSystemEnabled(): boolean {
  return resolve().files.length > 0;
}

/** 所有命中的資料檔，依 mtime 倒序。 */
export function getDataFiles(): ResolvedDataFile[] {
  return resolve().files;
}

/** 已停用 plugin 的規則若啟用會命中的檔。只供 /plugins 列表與 Plugin Drawer 顯示（灰字、不可點）。 */
export function getInactiveMatches(): InactiveMatch[] {
  return resolve().inactive;
}

/** 依路由段取單一資料檔（`planning/schema`，不含副檔名）。 */
export function getDataFile(routePath: string): ResolvedDataFile | undefined {
  return resolve().files.find((f) => f.routePath === routePath);
}

let configCache: PluginsConfig | null | undefined;

/** dev 用：plugins.json 變動時由 dev integration 呼叫，讓下一次請求重新解析。 */
export function invalidatePluginCaches(): void {
  configCache = undefined;
  resolvedCache = null;
  validatorCache.clear();
}
/** 已驗證的 plugins.json 內容；沒有設定檔時 null。供 /plugins 頁顯示映射規則與 options。 */
export function getPluginsConfig(): PluginsConfig | null {
  if (configCache === undefined) configCache = readConfig();
  return configCache;
}

/** 實際被用到的 plugin（供清單頁的篩選列決定要不要出現）。 */
export function getUsedPlugins(): PluginRecord[] {
  const ids = new Set(resolve().files.map((f) => f.pluginId));
  return [...getPlugins().values()].filter((p) => ids.has(p.id));
}

/** 供快取失效判斷（Task 56）使用的掃描摘要。 */
export function getScanStats(): ScanStats {
  return resolve().stats;
}
