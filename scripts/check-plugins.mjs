#!/usr/bin/env node
// 官方 plugin store 的把關（Task 57）。
//
// Q12 定案「store 一律即時從 GitHub 抓」—— 意思是**推上預設分支就等於發佈**。
// 沒有這支腳本，store 裡隨時可能放著一個裝下去就 build fail 的 plugin，
// 體驗比沒有 store 還糟。prepublishOnly 與 CI 都要跑。
//
// 檢查五件事：
//   1. manifest 必填欄位齊全、id 與資料夾名一致
//   2. registry.json 與實際目錄無漂移（含 files 清單與版號）
//   3. import 白名單（與安裝期 lint 共用同一份實作，不寫兩套）
//   4. example 資料通過該 plugin 自己的 dataSchema
//   5. 每個 plugin 配 example 資料真的 build 得起來
//
// 用法：node scripts/check-plugins.mjs [--skip-build]

import { spawnSync } from "node:child_process";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { inspectFiles } from "../bin/install-plugin.mjs";

const Ajv = Ajv2020.default ?? Ajv2020;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeDir = path.join(root, "plugins");
const skipBuild = process.argv.includes("--skip-build");

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const whitelist = (() => {
  const src = readFileSync(path.join(root, "src/lib/generated-component-whitelist.ts"), "utf-8");
  const block = src.match(/GENERATED_COMPONENT_PACKAGE_WHITELIST\s*=\s*\[([\s\S]*?)\]/);
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
})();

const errors = [];
const fail = (msg) => errors.push(msg);

async function readAll(dir, sub = "", out = new Map()) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    const rel = [sub, e.name].filter(Boolean).join("/");
    if (e.isDirectory()) await readAll(abs, rel, out);
    else out.set(rel, await fs.readFile(abs));
  }
  return out;
}

// ── 逐一檢查 ──────────────────────────────────────────────
const entries = (await fs.readdir(storeDir, { withFileTypes: true })).filter((e) => e.isDirectory());
const registry = JSON.parse(readFileSync(path.join(storeDir, "registry.json"), "utf-8"));

for (const e of entries) {
  const id = e.name;
  const dir = path.join(storeDir, id);
  const files = await readAll(dir);

  // 1 + 3：沿用安裝期的同一份檢查
  const { manifest, problems } = inspectFiles(files, whitelist, pkg.version);
  for (const p of problems) fail(`[${id}] ${p}`);
  if (manifest && manifest.id !== id) fail(`[${id}] manifest id 是 "${manifest.id}"，與資料夾名不一致`);
  for (const key of ["title", "description", "version"]) {
    if (!manifest?.[key]) fail(`[${id}] manifest 缺少 ${key}`);
  }

  // 2：registry 漂移
  const reg = registry.plugins.find((p) => p.id === id);
  if (!reg) {
    fail(`[${id}] 不在 registry.json 裡`);
  } else {
    if (reg.version !== manifest?.version) {
      fail(`[${id}] registry 版本 ${reg.version} 與 manifest ${manifest?.version} 不一致`);
    }
    if (reg.dir !== `plugins/${id}`) fail(`[${id}] registry dir 應為 plugins/${id}`);
    const actual = [...files.keys()].sort();
    const listed = [...(reg.files ?? [])].sort();
    const missing = actual.filter((f) => !listed.includes(f));
    const extra = listed.filter((f) => !actual.includes(f));
    if (missing.length) fail(`[${id}] registry files 少了：${missing.join("、")}`);
    if (extra.length) fail(`[${id}] registry files 多了（實際不存在）：${extra.join("、")}`);
  }

  // 4：example 通過自己的 schema
  if (manifest?.example) {
    const exBuf = files.get(manifest.example);
    if (!exBuf) {
      fail(`[${id}] manifest 指定 example=${manifest.example}，但該檔不存在`);
    } else if (manifest.dataSchema) {
      const schemaBuf = files.get(manifest.dataSchema);
      if (!schemaBuf) {
        fail(`[${id}] manifest 指定 dataSchema=${manifest.dataSchema}，但該檔不存在`);
      } else {
        const ajv = new Ajv({ strict: false, allErrors: true });
        const validate = ajv.compile(JSON.parse(schemaBuf.toString("utf-8")));
        if (!validate(JSON.parse(exBuf.toString("utf-8")))) {
          const first = validate.errors?.[0];
          fail(`[${id}] example 不符合自己的 dataSchema：${first?.instancePath} ${first?.message}`);
        }
      }
    }
  } else {
    fail(`[${id}] manifest 沒有 example —— CI 無法驗證這個 plugin 真的 build 得起來`);
  }
}

// 反向：registry 列了但目錄不存在
for (const p of registry.plugins) {
  if (!existsSync(path.join(storeDir, p.id))) fail(`registry 列了 "${p.id}"，但 plugins/${p.id} 不存在`);
}

// ── 5：配 example 資料真的 build 一次 ──────────────────────
if (!skipBuild && errors.length === 0) {
  for (const e of entries) {
    const id = e.name;
    const manifest = JSON.parse(readFileSync(path.join(storeDir, id, "notecraft-plugin.json"), "utf-8"));
    if (!manifest.example) continue;
    const fixture = await fs.mkdtemp(path.join(os.tmpdir(), `notecraft-check-${id}-`));
    await fs.mkdir(path.join(fixture, "docs"), { recursive: true });
    await fs.mkdir(path.join(fixture, ".notecraft"), { recursive: true });
    await fs.copyFile(path.join(storeDir, id, manifest.example), path.join(fixture, "docs", "example.json"));
    await fs.writeFile(
      path.join(fixture, ".notecraft", "plugins.json"),
      JSON.stringify({ plugins: [{ plugin: id, files: ["example.json"] }] }, null, 2),
      "utf-8",
    );
    await fs.writeFile(path.join(fixture, "docs", "readme.md"), "# fixture\n", "utf-8");

    // 輸出到 fixture 自己的目錄，不要碰 repo 的 dist/ ——
    // 這支腳本在開發者機器上也會跑（prepublishOnly），清掉人家的產物很沒禮貌。
    // 直接以 node 執行 astro.js（與 CLI 相同）：Windows 上 spawnSync("npx") 找不到 npx.cmd，
    // 改 shell: true 又會讓含空白的 fixture 路徑（C:\Users\<名字 有空白>\...）被拆開。
    const astroBin = path.join(root, "node_modules", "astro", "astro.js");
    const r = spawnSync(process.execPath, [astroBin, "build", "--outDir", path.join(fixture, "dist")], {
      cwd: root,
      env: { ...process.env, NOTECRAFT_NOTES_DIR: path.join(fixture, "docs"), NOTECRAFT_USER_CWD: fixture },
      stdio: "pipe",
    });
    await fs.rm(fixture, { recursive: true, force: true });
    if (r.status !== 0) {
      const out = r.error?.message ?? (r.stderr?.length ? r.stderr : r.stdout)?.toString() ?? "（無輸出）";
      fail(`[${id}] 配 example 資料 build 失敗：\n${out.split("\n").slice(-12).join("\n")}`);
    } else {
      console.log(`  ✓ ${id} 配 example 資料 build 成功`);
    }
  }
}

if (errors.length) {
  console.error(`\n✗ plugin store 檢查未通過（${errors.length} 項）：`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`\n✓ plugin store 檢查通過（${entries.length} 個 plugin）`);
