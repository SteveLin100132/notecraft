// CLI build 不得把 Astro content layer 的內部檔（data-store.json 等）帶進產物（1.10.1 修正的回歸測試）。
//
// 成因：outDir 不在 astro 的 cwd 底下時，Astro 5 的 static build 經 <cwd>/.astro/ 中轉、整包 cp 進 outDir，
// 而 <cwd>/.astro/ 也是 content layer 的 dotAstroDir（view 指令跑過 astro dev 後還會有含筆記原文的 data-store.json）。
// 這裡在 <app>/.astro/ 放一個哨兵檔模擬那些內部檔，實際跑 `notecraftapp build --rebuild`，斷言：
//   - 產物沒有 data-store.json、content-assets.mjs、content-modules.mjs、collections/、哨兵
//   - 產物的 .html／.json／.mjs／.js 不含 notesDir 與 app 根的絕對路徑
//   - <app>/.astro/ 沒被 Astro 清掉（中轉路徑會在 build 後 rm 它），staging 目錄沒有殘留
// Windows 跨磁碟：預設 app 是本 repo、筆記在 repo 的 tmp/、快取在家目錄。repo 不在系統磁碟時，
// staging → 快取會走 EXDEV 的複製路徑。要重現「app 與快取在 C:、筆記在 D:」，以 --app 指向一份裝好相依的 app 複本。
//
// 會實際跑一次 astro build（約 1–2 分鐘），所以不放 scripts/checks/。
// 執行：node scripts/fixtures/content-layer-leak.mjs [--app <app 根>] [--notes <筆記資料夾>]

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONTENT_LAYER_FILES } from "../../src/lib/content-layer-guard-integration.mjs";

const repo = path.resolve(import.meta.dirname, "..", "..");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : path.resolve(process.argv[i + 1]);
};
const appRoot = arg("--app") ?? repo;
const notesDir = arg("--notes") ?? path.join(repo, "tmp", "content-layer-leak");
const cacheDir = path.join(os.homedir(), ".notecraft", "cache", crypto.createHash("sha1").update(notesDir).digest("hex").slice(0, 12));
const distDir = path.join(cacheDir, "dist");
const stageDir = path.join(appRoot, "node_modules", ".notecraft-build", path.basename(cacheDir));
const dotAstro = path.join(appRoot, ".astro");
const SENTINEL = "nc-leak-sentinel.json";

const drive = (p) => (process.platform === "win32" ? path.parse(p).root.slice(0, 2).toUpperCase() : "/");
console.log(`app   : ${appRoot}`);
console.log(`notes : ${notesDir}`);
console.log(`cache : ${cacheDir}`);
console.log(
  `磁碟  : app ${drive(appRoot)}、筆記 ${drive(notesDir)}、快取 ${drive(cacheDir)}` +
    `（筆記與 app ${drive(notesDir) === drive(appRoot) ? "同" : "跨"}磁碟；staging → 快取 ${drive(appRoot) === drive(cacheDir) ? "rename" : "跨磁碟複製"}）`,
);

// 筆記：只在用預設 tmp/ 資料夾時產生，--notes 指向既有資料夾就原樣使用
if (!arg("--notes")) {
  fs.rmSync(notesDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(notesDir, "sub"), { recursive: true });
  const fm = (title) => `---\ntitle: "${title}"\ntags: ["leak"]\ncreatedAt: "2026-10-04"\nupdatedAt: "2026-10-04"\n---\n\n`;
  fs.writeFileSync(path.join(notesDir, "a.mdx"), fm("A") + "原始碼裡的一段文字：`秘密段落-A`。\n");
  fs.writeFileSync(path.join(notesDir, "sub", "b.md"), fm("B") + "# B\n\n另一篇。\n");
}

// 哨兵：放在 dotAstroDir，內容是絕對路徑（若被中轉帶進產物，名稱與內容都抓得到）。
// 沒跑過 view 的 app 沒有 data-store.json，也暫放一份（build 讀的是 cacheDir 那份，不讀這裡），結束後移除
fs.mkdirSync(dotAstro, { recursive: true });
const sentinelBody = JSON.stringify({ filePath: notesDir.split(path.sep).join("/") }) + "\n";
fs.writeFileSync(path.join(dotAstro, SENTINEL), sentinelBody);
const plantedStore = !fs.existsSync(path.join(dotAstro, "data-store.json"));
if (plantedStore) fs.writeFileSync(path.join(dotAstro, "data-store.json"), sentinelBody);

let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n    ${e.message.split("\n").join("\n    ")}`);
  }
};

try {
  const r = spawnSync(process.execPath, [path.join(appRoot, "bin", "notecraftapp.mjs"), "build", notesDir, "--rebuild"], {
    cwd: notesDir,
    env: { ...process.env, NOTECRAFTAPP_DEV: "1" },
    encoding: "utf-8",
  });
  const log = `${r.stdout}\n${r.stderr}`;

  check("notecraftapp build 成功", () => assert.equal(r.status, 0, log.split("\n").slice(-30).join("\n")));
  check("產物根目錄沒有 content layer 內部檔與哨兵", () => {
    const hits = [...CONTENT_LAYER_FILES, SENTINEL].filter((n) => fs.existsSync(path.join(distDir, n)));
    assert.deepEqual(hits, []);
  });
  check("產物不含筆記原文以外的本機絕對路徑", () => {
    const needles = [notesDir, appRoot].flatMap((p) => [p, p.split(path.sep).join("/")]).map((s) => s.toLowerCase());
    const hits = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const abs = path.join(d, e.name);
        if (e.isDirectory()) walk(abs);
        else if (/\.(html|json|mjs|js)$/i.test(e.name)) {
          const text = fs.readFileSync(abs, "utf-8").toLowerCase();
          if (needles.some((n) => text.includes(n))) hits.push(path.relative(distDir, abs));
        }
      }
    };
    walk(distDir);
    assert.deepEqual(hits, []);
  });
  check("筆記頁有輸出", () => {
    assert.ok(fs.existsSync(path.join(distDir, "notes", "a", "index.html")));
    assert.ok(fs.existsSync(path.join(distDir, "notes", "sub", "b", "index.html")));
  });
  check("<app>/.astro/ 沒被 build 清掉", () => assert.ok(fs.existsSync(path.join(dotAstro, SENTINEL))));
  check("staging 目錄沒有殘留", () => assert.ok(!fs.existsSync(stageDir)));
  check("dist.next 沒有殘留", () => assert.ok(!fs.existsSync(path.join(cacheDir, "dist.next"))));
} finally {
  fs.rmSync(path.join(dotAstro, SENTINEL), { force: true });
  if (plantedStore) fs.rmSync(path.join(dotAstro, "data-store.json"), { force: true });
}

console.log(failed ? `\n${failed} 項失敗` : "\n全部通過");
process.exit(failed ? 1 : 0);
