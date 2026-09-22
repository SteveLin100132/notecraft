// 工作台索引（build 期）。把原本散在 index.astro、notes/index.astro、BaseLayout.astro 各算一次的東西收成一份，
// 以模組層變數快取 —— 一次 build 只算一次，新殼每一頁都用得到（資料夾樹、系列、待生成數）。
//
// **不可進 client bundle**：用了 node:fs，且間接 import 了 plugins.ts（內含 eager glob）。
// island 只能 `import type` 本檔，或改從 @/lib/wb-types 取型別。
//
// 兩條不可違反的規則（規格 §5.2.2）：
// 1. 資料夾與顯示用路徑一律來自**真實檔案路徑**，不是 entry.id —— Astro 的 glob loader 會把 id slug 化
//    （`My Notes/ER Diagram.md` → `my-notes/er-diagram`），viewer 使用者的資料夾會對不上
// 2. **本機絕對路徑不得出現在輸出裡**
import fs from "node:fs";
import path from "node:path";
import { getAllNotes, parseMarkers, tagStats, type Note } from "@/lib/notes";
import { loadSeries, getSeriesChapters } from "@/lib/series";
import { getDataFiles, getPlugins, getPluginsConfig } from "@/lib/plugins";
import { hasDeck } from "@/lib/decks";
import type {
  WbChapter,
  WbDataFile,
  WbFolderNode,
  WbIndex,
  WbNoteRow,
  WbNoteSeriesRef,
  WbPlugin,
  WbPluginAssetRole,
  WbSeries,
} from "@/lib/wb-types";

export type * from "@/lib/wb-types";

const toPosix = (p: string): string => p.split(path.sep).join("/");

/** 專案根：viewer 是使用者執行指令的地方，主專案是 repo 根。 */
function projectRoot(): string {
  return process.env.NOTECRAFT_USER_CWD ? path.resolve(process.env.NOTECRAFT_USER_CWD) : process.cwd();
}

export function notesDirAbs(): string {
  return process.env.NOTECRAFT_NOTES_DIR
    ? path.resolve(process.env.NOTECRAFT_NOTES_DIR)
    : path.resolve(process.cwd(), "src/content/notes");
}

/** notesDir 相對專案根的路徑；不在專案根底下時回傳 null。 */
function notesDirRel(): string | null {
  const rel = toPosix(path.relative(projectRoot(), notesDirAbs()));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel; // 可能是 ""（notesDir 就是專案根）
}

/**
 * 顯示用的工作區名稱（規格 §5.2.2）。
 * 主專案 → `src/content/notes`；viewer → `<專案資料夾名>/<notesDir 相對專案根>`；
 * notesDir 不在專案根底下 → 只用 notesDir 的資料夾名，不輸出 `../`。
 */
export function workspaceLabel(): string {
  const rel = notesDirRel();
  if (rel === null) return path.basename(notesDirAbs());
  if (process.env.NOTECRAFT_USER_CWD) {
    const proj = path.basename(projectRoot());
    return rel ? `${proj}/${rel}` : proj;
  }
  return rel || path.basename(notesDirAbs());
}

/** 筆記相對 notesDir 的真實路徑。entry.filePath 是相對 app 根的路徑，先 resolve 成絕對再取相對。 */
export function noteRelPath(note: Pick<Note, "id" | "filePath">): string {
  if (!note.filePath) return note.id; // 不該發生；退回 slug 總比空字串好
  const abs = path.resolve(process.cwd(), note.filePath);
  const rel = toPosix(path.relative(notesDirAbs(), abs));
  return rel.startsWith("..") ? path.basename(abs) : rel;
}

/** Claude Code 從專案根執行時能直接找到檔案的路徑。notesDir 不在專案根底下時只用相對 notesDir 的路徑。 */
export function promptPathOf(relPath: string): string {
  const rel = notesDirRel();
  return rel ? `${rel}/${relPath}` : relPath;
}

/**
 * 檔案開頭有沒有 `---` 區塊（規格 §5.2.1）。必須讀原始檔：enrichNote() 補完預設值後已無從分辨。
 * 有區塊但內容空白、或只缺 title，都算有。讀檔失敗視為有，不讓一次 I/O 失敗把筆記誤標。
 */
function hasFrontmatter(filePath: string | undefined): boolean {
  if (!filePath) return true;
  try {
    const fd = fs.openSync(path.resolve(process.cwd(), filePath), "r");
    try {
      const buf = Buffer.alloc(8);
      const n = fs.readSync(fd, buf, 0, 8, 0);
      return /^﻿?---\r?\n/.test(buf.subarray(0, n).toString("utf-8"));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return true;
  }
}

function buildFolderTree(rows: WbNoteRow[]): WbFolderNode[] {
  const root: WbFolderNode = { name: "", path: "", count: 0, children: [] };
  for (const r of rows) {
    let node = root;
    for (const seg of r.folder) {
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = { name: seg, path: node.path ? `${node.path}/${seg}` : seg, count: 0, children: [] };
        node.children.push(child);
      }
      child.count += 1; // 每經過一層就 +1 → count 自然含子孫
      node = child;
    }
  }
  const sortRec = (n: WbFolderNode): void => {
    n.children.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root.children;
}

/** app 版本：讀 package.json（astro 的 cwd 就是 app 根，viewer 亦然）。 */
function appVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8")) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function assetRole(rel: string, manifest: { dataSchema?: string; example?: string }): WbPluginAssetRole {
  if (rel === "notecraft-plugin.json") return "manifest";
  if (rel === "renderer.tsx") return "renderer";
  if (manifest.dataSchema && rel === manifest.dataSchema.replace(/^\.\//, "")) return "data schema";
  if (manifest.example && rel === manifest.example.replace(/^\.\//, "")) return "範例資料";
  if (/^readme(\.md)?$/i.test(rel)) return "說明";
  return "";
}

function listAssets(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string, prefix: string) => {
    let ents: fs.Dirent[];
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), rel);
      else if (e.isFile()) out.push(rel);
    }
  };
  walk(dir, "");
  return out;
}

/** 已安裝外掛的摘要（規格 §8.6）。全是 build 期已知；「不相容」「渲染錯誤」都不做（Q23、Q24）。 */
function buildPlugins(): WbPlugin[] {
  const config = getPluginsConfig();
  const files = getDataFiles();
  const disabled = new Set(config?.disabled ?? []);
  const out: WbPlugin[] = [];
  for (const rec of getPlugins().values()) {
    const m = rec.manifest;
    const builtin = rec.dir.startsWith(path.resolve(process.cwd(), "plugins") + path.sep);
    let source: WbPlugin["source"] = { kind: builtin ? "builtin" : "installed" };
    if (!builtin) {
      try {
        const info = JSON.parse(fs.readFileSync(path.join(rec.dir, ".installed.json"), "utf-8")) as Record<string, unknown>;
        source = {
          kind: "installed",
          ...(typeof info.origin === "string" ? { origin: info.origin } : {}),
          ...(typeof info.commit === "string" ? { commit: info.commit.slice(0, 7) } : {}),
        };
      } catch {
        /* 手動複製進來的 plugin 沒有這個檔 */
      }
    }
    out.push({
      id: rec.id,
      title: m.title,
      version: m.version,
      author: m.author ?? "",
      description: m.description,
      homepage: m.homepage ?? "",
      engines: m.engines?.notecraftapp ?? "",
      dataSchema: m.dataSchema ?? "",
      example: m.example ?? "",
      source,
      dir: builtin ? `plugins/${rec.id}/` : `.notecraft/plugins/${rec.id}/`,
      mappings: (config?.plugins ?? [])
        .filter((x) => x.plugin === rec.id)
        .map((x) => ({ files: x.files, ...(x.exclude?.length ? { exclude: x.exclude } : {}), ...(x.options ? { options: x.options } : {}) })),
      matched: files.filter((f) => f.pluginId === rec.id).map((f) => f.routePath),
      inactiveMatches: [],
      assets: listAssets(rec.dir).map((rel) => ({ path: rel, role: assetRole(rel, m) })),
      enabled: !disabled.has(rec.id),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

async function build(): Promise<WbIndex> {
  const notes = await getAllNotes();
  const seriesList = await loadSeries();
  const dataFilesRaw = getDataFiles();

  // 先算每篇筆記的顯示路徑，章節解析也要用。
  const relPathBySlug = new Map<string, string>();
  for (const n of notes) relPathBySlug.set(n.id, noteRelPath(n));

  const series: WbSeries[] = [];
  const seriesBySlug = new Map<string, WbNoteSeriesRef>();
  for (const s of seriesList) {
    const chapters: WbChapter[] = getSeriesChapters(notes, s, dataFilesRaw).map((c) => ({
      kind: c.kind,
      ref: c.ref,
      href: c.href,
      title: c.title,
      path: c.kind === "data" ? (c.relPath ?? "") : (relPathBySlug.get(c.ref) ?? c.ref),
      ...(c.pluginId ? { pluginId: c.pluginId } : {}),
    }));
    series.push({
      id: s.id,
      title: s.title,
      eyebrow: s.eyebrow,
      description: s.description,
      accent: s.accent,
      icon: s.icon,
      chapters,
    });
    chapters.forEach((c, i) => {
      // 同一 slug 出現在多個系列 → 以首見為準（與 series.ts 的 dedupe 規則一致）
      if (c.kind === "note" && !seriesBySlug.has(c.ref)) {
        seriesBySlug.set(c.ref, { id: s.id, title: s.title, accent: s.accent, index: i + 1, total: chapters.length });
      }
    });
  }

  const rows: WbNoteRow[] = notes.map((n) => {
    const rel = relPathBySlug.get(n.id) ?? n.id;
    const segs = rel.split("/");
    return {
      slug: n.id,
      title: n.data.title,
      description: n.data.description,
      path: rel,
      folder: segs.slice(0, -1),
      tags: n.data.tags,
      // prompt 只用在 Drawer 標記列的 tooltip；截短以免索引被長提示詞撐大
      markers: parseMarkers(n.body).map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        prompt: m.prompt.length > 240 ? m.prompt.slice(0, 240) + "…" : m.prompt,
      })),
      createdAt: n.data.createdAt,
      updatedAt: n.data.updatedAt,
      series: seriesBySlug.get(n.id) ?? null,
      hasFrontmatter: hasFrontmatter(n.filePath),
      hasDeck: hasDeck(n.id),
      promptPath: promptPathOf(rel),
    };
  });

  const dataFiles: WbDataFile[] = dataFilesRaw.map((f) => {
    const i = f.relPath.lastIndexOf("/");
    return {
      routePath: f.routePath,
      relPath: f.relPath,
      dir: i === -1 ? "" : f.relPath.slice(0, i),
      title: f.title,
      description: f.description,
      pluginId: f.pluginId,
      updatedAt: f.updatedAt.slice(0, 10),
    };
  });

  let pendingMarkers = 0;
  let pendingNotes = 0;
  for (const r of rows) {
    const p = r.markers.filter((m) => m.status !== "generated").length;
    pendingMarkers += p;
    if (p > 0) pendingNotes += 1;
  }

  return {
    notes: rows,
    folders: buildFolderTree(rows),
    rootCount: rows.filter((r) => r.folder.length === 0).length,
    series,
    tags: tagStats(notes),
    dataFiles,
    plugins: buildPlugins(),
    pluginSystem: getPluginsConfig() !== null,
    appVersion: appVersion(),
    pending: { markers: pendingMarkers, notes: pendingNotes },
    workspaceLabel: workspaceLabel(),
  };
}

let cache: Promise<WbIndex> | null = null;

/** 模組層快取：一次 build 只算一次。dev 下每次請求重算（檔案會變）。 */
export function getWorkbenchIndex(): Promise<WbIndex> {
  if (import.meta.env.DEV) return build();
  if (!cache) cache = build();
  return cache;
}

/**
 * 對外輸出（/wb-index.json、island props）用的版本：正式 build 剝掉 promptPath。
 * dev-only 的「複製生成提示」才需要它，正式站的訪客用不到，也不該多一個路徑欄位。
 */
export function publicIndex(index: WbIndex): WbIndex {
  if (import.meta.env.DEV) return index;
  return { ...index, notes: index.notes.map(({ promptPath: _drop, ...rest }) => rest) };
}

/** 序列化後若含專案根或 notesDir 的絕對路徑就 throw —— 讓 build 失敗，而不是悄悄洩漏。 */
export function assertNoAbsolutePath(serialized: string, where: string): void {
  const needles = new Set([process.cwd(), projectRoot(), notesDirAbs()]);
  for (const needle of needles) {
    if (needle.length > 1 && serialized.includes(needle)) {
      throw new Error(`[workbench] ${where} 的輸出含本機絕對路徑（${needle}）。請檢查是哪個欄位帶進來的。`);
    }
  }
}
