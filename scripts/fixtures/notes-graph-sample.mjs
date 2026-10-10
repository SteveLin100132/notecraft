// Graph 檢視的示範／規模 fixture（Task 136，規格 docs/notecraft-workbench-notes-graph.md §16.1、§17）。
//
// repo 的 25 篇筆記邊不多，看不到 handoff 的大部分狀態（第 4 級樞紐要被 8 篇以上連入）。這支在暫存的 viewer 工作區產生
// 一批互相連結的筆記，並**自己記下每一條預期的邊**，build 後與 /wb-index.json 的 graph.edges 逐條比對 ——
// 連結掃描（links-scan.mjs）、URL 解析與合併（wb-graph.ts）、定義索引、系列、資料檔五條路一起驗。
// 以「npm 實際發佈的樣子」跑（同 define-ref-scale.mjs）：npm pack → 解開 → node_modules 連回主 repo → NOTECRAFTAPP_DEV=1。
//
// 用法：
//   node scripts/fixtures/notes-graph-sample.mjs              產生約 65 篇的示範工作區，印出 view／serve 指令（暫存目錄保留）
//   node scripts/fixtures/notes-graph-sample.mjs --build      build 並斷言；結束刪除暫存（--keep 保留）
//   node scripts/fixtures/notes-graph-sample.mjs --n 300      規模測試（300、1000…）：一般連結為主，印出 build 時間與邊數
//   node scripts/fixtures/notes-graph-sample.mjs --no-links   完全沒有邊的工作區（驗空狀態 B）
//   node scripts/fixtures/notes-graph-sample.mjs --out tmp/graph-ws   只把工作區寫到指定資料夾（不打包）；
//       之後以 NOTECRAFT_NOTES_DIR=tmp/graph-ws npx astro dev 用主 repo 的 dev server 看（可與 --n、--no-links 併用）
//
// 不放 scripts/checks/：要跑一次完整 build。亂數固定種子，每次產生的內容相同。

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugOfNotePath } from "../../src/lib/defs-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const doBuild = argv.includes("--build");
const keep = argv.includes("--keep") || !doBuild;
const noLinks = argv.includes("--no-links");
const nArg = argv.indexOf("--n");
const bigN = nArg >= 0 ? Number.parseInt(argv[nArg + 1], 10) : 0;
assert.ok(nArg < 0 || bigN > 0, "--n 後面要接節點數");
const ER = "er-diagram-renderer";

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ── 1. 內容：筆記、連結與「預期的邊」 ───────────────────────────
/** @type {{ rel: string, title: string, tags: string[], body: string[], head: string[], slug: string, orphan: boolean }[]} */
const notes = [];
/** @type {Map<string, { s: string, t: string, kinds: Record<string, number> }>} */
const expected = new Map();
const expectEdge = (s, t, kind) => {
  if (s === t) return;
  const key = `${s}\n${t}`;
  if (!expected.has(key)) expected.set(key, { s, t, kinds: {} });
  const e = expected.get(key);
  e.kinds[kind] = (e.kinds[kind] ?? 0) + 1;
};
const mk = (rel, title, tags = [], orphan = false) => {
  const n = { rel, title, tags, body: [], head: [], slug: slugOfNotePath(rel), orphan };
  notes.push(n);
  return n;
};
const relTo = (from, to) => {
  const r = path.posix.relative(path.posix.dirname(from.rel), to.rel);
  return r.startsWith(".") ? r : "./" + r;
};
// 連結的五種寫法；每一種都同步記下預期的邊
const L = {
  abs: (from, to, hash = "") => (expectEdge(from.slug, to.slug, "link"), `[${to.title}](/notes/${to.slug}${hash})`),
  enc: (from, to) => (expectEdge(from.slug, to.slug, "link"), `[${to.title}](/notes/${encodeURI(to.slug)}/)`),
  md: (from, to) => (expectEdge(from.slug, to.slug, "link"), `[${to.title}](<${relTo(from, to)}>)`),
  bare: (from, to) => {
    // 不帶副檔名的相對連結：瀏覽器以 /notes/<來源 slug> 為基準，所以寫 slug 的相對路徑
    const r = path.posix.relative(path.posix.dirname("/notes/" + from.slug), "/notes/" + to.slug);
    expectEdge(from.slug, to.slug, "link");
    return `[${to.title}](${r.startsWith(".") ? r : "./" + r})`;
  },
  href: (from, to) => (expectEdge(from.slug, to.slug, "link"), `<a href="/notes/${to.slug}">${to.title}</a>`),
};

const TAGS = ["前端", "後端", "網路", "資安", "效能", "系統設計", "產品管理", "系統規格", "測試", "部署", "監控", "文件"];
const dataFiles = [];
const series = [];

if (noLinks) {
  for (let i = 1; i <= 12; i++) mk(`筆記-${String(i).padStart(2, "0")}.md`, `獨立筆記 ${i}`, i % 3 ? [pick(TAGS.slice(0, 4))] : []);
} else if (bigN) {
  const folders = Array.from({ length: 10 }, (_, i) => `區域-${String(i + 1).padStart(2, "0")}`);
  for (let i = 0; i < bigN; i++) {
    mk(`${folders[i % folders.length]}/筆記-${String(i).padStart(4, "0")}.md`, `規模筆記 ${i}`, rnd() < 0.85 ? [pick(TAGS), ...(rnd() < 0.3 ? [pick(TAGS)] : [])].filter((v, k, a) => a.indexOf(v) === k) : [], rnd() < 0.2);
  }
  const live = notes.filter((n) => !n.orphan);
  for (let i = 0; i < bigN * 1.2; i++) {
    const a = pick(live);
    const b = live[Math.floor(rnd() * rnd() * live.length)]; // 偏向前面的筆記：自然長出樞紐
    if (a !== b) a.body.push(`參考 ${L.abs(a, b)}。`);
  }
} else {
  const FOLDERS = [
    ["01-前端", "前端", 13],
    ["02-後端", "後端", 13],
    ["02-後端/資料庫", "資料庫", 6],
    ["03-產品管理", "產品管理", 9],
    ["04-資安", "資安", 9],
    ["05-網路", "網路", 8],
    ["", "雜記", 3],
  ];
  const hubHttp = mk("05-網路/HTTP 基礎總覽.mdx", "HTTP 基礎總覽", ["網路"]);
  const hubTerms = mk("02-後端/系統設計術語表.mdx", "系統設計術語表", ["後端", "系統設計"]);
  const hubOverview = mk("03-產品管理/系統-overview.mdx", "系統 Overview", ["產品管理", "系統規格"]);
  const spaced = mk("01-前端/React Rendering Fiber.mdx", "React 渲染機制與 Fiber", ["前端", "效能"]);
  const TERMS = ["sys.term-idempotent", "sys.term-backpressure", "sys.term-quorum", "sys.term-sla"];
  hubTerms.body.push(...TERMS.map((id, i) => `::::define{id="${id}"}\n**術語 ${i + 1}**：${id} 的說明。\n::::`));

  // 標題只影響畫面（官網的截圖用這份工作區）；檔名仍是流水號，slug 與預期的邊不受影響
  const TITLES = {
    前端: ["瀏覽器渲染流程", "CSS 版面：Grid 與 Flexbox", "事件迴圈與任務佇列", "狀態管理的取捨", "表單驗證策略", "圖片與字型載入", "無障礙檢查清單", "打包與程式碼分割", "前端錯誤監控", "設計 token 與主題", "列表虛擬化", "動畫與效能預算", "元件測試策略"],
    後端: ["API 版本策略", "冪等的寫入端點", "背景工作與重試", "快取失效的模式", "訊息佇列選型", "分散式鎖", "限流與熔斷", "設定管理", "結構化日誌", "服務間認證", "批次匯入流程", "Webhook 設計", "健康檢查與就緒探針"],
    資料庫: ["索引設計原則", "交易隔離等級", "資料表分割", "查詢計畫怎麼讀", "遷移腳本的寫法", "備份與還原演練"],
    產品管理: ["需求訪談紀錄", "使用者旅程圖", "優先序評估方法", "版本規劃節奏", "驗收條件的寫法", "指標定義", "競品觀察", "上線檢查表", "回饋整理流程"],
    資安: ["威脅建模入門", "密碼與金鑰管理", "OAuth 2.0 授權流程", "輸入驗證與輸出編碼", "相依套件掃描", "稽核紀錄要記什麼", "權限模型比較", "資料分級與遮罩", "事故應變流程"],
    網路: ["DNS 解析過程", "TLS 握手", "HTTP 快取策略", "CDN 與邊緣節點", "連線逾時怎麼設", "WebSocket 與 SSE", "負載平衡演算法", "跨來源資源共用"],
    雜記: ["讀書筆記：系統思考", "會議記錄範本", "工具清單"],
  };
  let serial = 0;
  for (const [dir, topic, count] of FOLDERS) {
    for (let i = 0; i < count; i++) {
      serial++;
      const tags = serial % 11 === 0 ? [] : serial % 9 === 0 ? [pick(TAGS.slice(8))] : [pick(TAGS.slice(0, 8)), ...(serial % 4 === 0 ? [pick(TAGS)] : [])].filter((v, k, a) => a.indexOf(v) === k);
      mk(`${dir ? dir + "/" : ""}${topic}-筆記-${String(i + 1).padStart(2, "0")}.md${serial % 2 ? "x" : ""}`, TITLES[topic]?.[i] ?? `${topic}筆記 ${i + 1}`, tags, serial % 4 === 3);
    }
  }
  const plain = notes.filter((n) => !n.orphan && ![hubHttp, hubTerms, hubOverview, spaced].includes(n));
  plain.forEach((n, i) => {
    if (i % 3 === 0) {
      n.body.push(i % 6 === 0 ? `先讀 ${L.enc(n, hubHttp)}。` : `先讀 ${L.abs(n, hubHttp, i % 9 === 0 ? "#快取" : "")}。`);
      if (i % 12 === 0) n.body.push(`再看一次 ${L.href(n, hubHttp)}。`); // 同一對多次 → 次數累加
    } else if (i % 3 === 1) {
      const id = TERMS[i % TERMS.length];
      n.body.push(`這裡用到 :ref[術語]{id="${id}"}，後面又提到一次 :ref[同一個術語]{id="${id}"}。`); // 同一個 id 兩次只算 1
      expectEdge(n.slug, hubTerms.slug, "ref");
      if (i % 4 === 1) {
        const inc = TERMS[(i + 1) % TERMS.length];
        n.body.push(`::include{id="${inc}"}`);
        expectEdge(n.slug, hubTerms.slug, "inc");
      }
    } else {
      n.body.push(`背景見 ${L.md(n, hubOverview)}。`);
    }
  });
  // 筆記之間的一般連結；同資料夾的用不帶副檔名的相對連結
  for (let i = 0; i < 22; i++) {
    const a = pick(plain);
    const b = pick(plain);
    if (a === b) continue;
    const sameDir = path.posix.dirname(a.slug) === path.posix.dirname(b.slug);
    a.body.push(`延伸閱讀：${sameDir ? L.bare(a, b) : i % 2 ? L.md(a, b) : L.abs(a, b)}。`);
  }
  // 檔名含空白與大寫：slug 與路徑不同
  plain[0].body.push(`另見 ${L.md(plain[0], spaced)}。`);
  plain[1].body.push(`另見 ${L.abs(plain[1], spaced)}，網址編碼的寫法：${L.enc(plain[1], spaced)}。`);
  spaced.body.push(`回到 ${L.abs(spaced, hubHttp)}。`);

  // 不該算成邊的寫法
  plain[2].body.push(
    "```md\n[程式碼區塊裡的連結](/notes/" + hubHttp.slug + ")\n```",
    "行內 `[也不算](/notes/" + hubOverview.slug + ")`。",
    `![圖片不算](/notes/${hubOverview.slug})`,
    "[外部網址](https://example.com/notes/" + hubHttp.slug + ")、[不存在的筆記](/notes/does-not-exist)、[本頁錨點](#top)、[自己](/notes/" + plain[2].slug + ")。",
    `{/* [註解裡的連結](/notes/${hubOverview.slug}) */}`,
  );

  // 資料檔：backTo、<PluginView>、/view/ 連結
  const dataOf = (name, title, backTo) => {
    const routePath = `data/${name}.er`;
    dataFiles.push({ rel: `data/${name}.er.json`, routePath, title, backTo });
    return { id: "view:" + routePath, routePath, title };
  };
  const dOrders = dataOf("orders", "訂單資料結構", `/notes/${hubOverview.slug}#資料`);
  const dBilling = dataOf("billing", "帳務資料結構", "");
  const dCrm = dataOf("crm", "客戶資料結構", "/notes/does-not-exist");
  expectEdge(dOrders.id, hubOverview.slug, "link");
  const embedder = plain.find((n) => n.rel.endsWith(".mdx"));
  embedder.head.push('import PluginView from "@/components/PluginView.astro";');
  embedder.body.push(`<PluginView src="data/billing.er.json" />`);
  expectEdge(embedder.slug, dBilling.id, "link");
  plain[3].body.push(`資料結構在 [${dCrm.title}](/view/${dCrm.routePath}#table/customers)。`);
  expectEdge(plain[3].slug, dCrm.id, "link");

  // 系列：相鄰章節連成 seq；第二個系列含資料檔章節
  const chain = (id, title, accent, icon, refs) => {
    series.push({ id, title, eyebrow: id.toUpperCase(), description: `${title}（fixture）`, accent, icon, slugs: refs });
    for (let i = 1; i < refs.length; i++) expectEdge(refs[i - 1], refs[i], "seq");
  };
  const inDir = (dir) => plain.filter((n) => path.posix.dirname(n.rel) === dir);
  chain("frontend", "前端系列", "blue", "code", [spaced.slug, ...inDir("01-前端").slice(0, 4).map((n) => n.slug)]);
  chain("backend", "後端系列", "navy", "layers", [hubTerms.slug, ...inDir("02-後端").slice(0, 2).map((n) => n.slug), dCrm.id]);
  chain("product", "產品系列", "orange", "target", [hubOverview.slug, ...inDir("03-產品管理").slice(0, 3).map((n) => n.slug)]);
}

// ── 3. 寫出工作區（函式；--out 時不打包，直接寫到指定位置）──────────────
function writeWorkspace(notesDir, configDir) {
  const fm = (n) => `---\ntitle: "${n.title}"\n${n.tags.length ? `tags: [${n.tags.map((t) => `"${t}"`).join(", ")}]\n` : ""}createdAt: "2026-10-10"\nupdatedAt: "2026-10-10"\n---\n\n`;
  for (const n of notes) {
    const abs = path.join(notesDir, n.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const head = n.head.length ? n.head.join("\n") + "\n\n" : "";
    fs.writeFileSync(abs, fm(n) + head + `這是「${n.title}」。\n\n` + n.body.join("\n\n") + "\n", "utf-8");
  }
  if (dataFiles.length) {
    const example = JSON.parse(fs.readFileSync(path.join(root, "plugins", ER, "example", "schema.json"), "utf-8"));
    for (const d of dataFiles) {
      const meta = { title: d.title, description: `${d.title}（fixture）` };
      if (d.backTo) meta.backTo = d.backTo;
      const abs = path.join(notesDir, d.rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, JSON.stringify({ ...example, meta }, null, 2) + "\n", "utf-8");
    }
    fs.mkdirSync(path.join(configDir, "plugins"), { recursive: true });
    fs.writeFileSync(path.join(configDir, "plugins.json"), JSON.stringify({ plugins: [{ plugin: ER, files: ["**/*.er.json"] }] }, null, 2) + "\n", "utf-8");
    const dest = path.join(configDir, "plugins", ER);
    fs.cpSync(path.join(root, "plugins", ER), dest, { recursive: true });
    fs.writeFileSync(path.join(dest, ".installed.json"), JSON.stringify({ id: ER, origin: `local:${ER}`, commit: "local" }, null, 2) + "\n");
  }
  if (series.length) {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, "series.json"), JSON.stringify({ series }, null, 2) + "\n", "utf-8");
  }
}
const want = [...expected.values()].sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
console.log(`工作區：${notes.length} 篇筆記、${dataFiles.length} 個資料檔、${series.length} 個系列，預期 ${want.length} 條邊`);

const outArg = argv.indexOf("--out");
if (outArg >= 0) {
  // 給主 repo 的 dev server 用：NOTECRAFT_NOTES_DIR=<out> npx astro dev（.notecraft 放在筆記資料夾裡）
  const out = path.resolve(argv[outArg + 1] ?? "");
  assert.ok(argv[outArg + 1], "--out 後面要接資料夾");
  fs.rmSync(out, { recursive: true, force: true });
  writeWorkspace(out, path.join(out, ".notecraft"));
  console.log(`已寫到 ${path.relative(root, out) || out}`);
  process.exit(0);
}

// ── 2. 打包並解開 ────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notecraft-graph-"));
const npmCli = process.env.npm_execpath;
const pack = npmCli
  ? spawnSync(process.execPath, [npmCli, "pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8" })
  : spawnSync("npm", ["pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8", shell: process.platform === "win32" });
const tgz = JSON.parse(pack.stdout)[0].filename;
const appDir = path.join(tmp, "package");
spawnSync("tar", ["xzf", path.basename(tgz)], { cwd: tmp });
for (const f of ["src/lib/links-scan.mjs", "src/lib/wb-graph.ts", "src/lib/wb-graph-layout.ts", "src/lib/wb-graph-worker.ts", "src/components/wb/graph/GraphView.tsx"]) {
  assert.ok(fs.existsSync(path.join(appDir, f)), `打包內容沒有 ${f}`);
}
fs.symlinkSync(path.join(root, "node_modules"), path.join(appDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
const cli = path.join(appDir, "bin", "notecraftapp.mjs");

const ws = path.join(tmp, "ws");
writeWorkspace(path.join(ws, "notes"), path.join(ws, ".notecraft"));
const env = { ...process.env, NOTECRAFTAPP_DEV: "1" };

if (!doBuild) {
  console.log(`\n暫存目錄：${tmp}（不會自動刪除）\n`);
  console.log(`  cd ${JSON.stringify(ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} view ./notes`);
  console.log(`  cd ${JSON.stringify(ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} serve ./notes`);
  console.log("\n開 /notes?view=graph，對照規格 §17 的清單（handoff §3 的 14 個狀態）。");
  process.exit(0);
}

// ── 4. build 並斷言 ──────────────────────────────────────────
let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message.split("\n").slice(0, 30).join("\n    ")}`);
  }
};
const t0 = Date.now();
const r = spawnSync(process.execPath, [cli, "build", "--rebuild", "./notes"], { cwd: ws, env, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
const log = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
const m = log.match(/dist:\s*:\s*(\S+)/);
let dist = "";
check(`build（${((Date.now() - t0) / 1000).toFixed(1)}s）`, () => {
  assert.equal(r.status, 0, `build 失敗：\n${log.split("\n").slice(-20).join("\n")}`);
  assert.ok(m, "build log 找不到 dist 路徑");
  dist = m[1];
});

if (dist) {
  const raw = fs.readFileSync(path.join(dist, "wb-index.json"), "utf-8");
  const index = JSON.parse(raw);
  const got = index.graph.edges;
  check(`/wb-index.json：筆記 ${notes.length} 篇、邊 ${want.length} 條，與產生器記下的逐條相同`, () => {
    assert.equal(index.notes.length, notes.length);
    assert.deepEqual(new Set(index.notes.map((n) => n.slug)), new Set(notes.map((n) => n.slug)), "slug 與 slugOfNotePath 不一致");
    assert.deepEqual(got, want);
  });
  if (!noLinks && !bigN) {
    check("三個樞紐各被 8 篇以上連入（第 4 級）", () => {
      for (const title of ["HTTP 基礎總覽", "系統設計術語表", "系統 Overview"]) {
        const slug = index.notes.find((n) => n.title === title).slug;
        const inDeg = new Set(got.filter((e) => e.t === slug).map((e) => e.s)).size;
        assert.ok(inDeg >= 8, `${title} 只被 ${inDeg} 篇連入`);
      }
    });
    check("四種邊都有；資料檔的三條路（backTo、PluginView、/view/）都連到 view: 節點", () => {
      for (const k of ["ref", "inc", "link", "seq"]) assert.ok(got.some((e) => e.kinds[k]), `沒有 ${k} 邊`);
      assert.ok(got.some((e) => e.s === "view:data/orders.er"), "backTo");
      assert.ok(got.some((e) => e.t === "view:data/billing.er"), "PluginView");
      assert.ok(got.some((e) => e.t === "view:data/crm.er" && e.kinds.link), "/view/ 連結");
      assert.ok(got.some((e) => e.t === "view:data/crm.er" && e.kinds.seq), "系列的資料檔章節");
    });
    check("孤島：標成 orphan 的筆記不在任何一條邊裡", () => {
      const linked = new Set(got.flatMap((e) => [e.s, e.t]));
      const lonely = notes.filter((n) => n.orphan);
      assert.ok(lonely.length >= 10);
      for (const n of lonely) assert.ok(!linked.has(n.slug), n.rel);
    });
  }
  if (noLinks) check("沒有任何邊（文件模式應顯示空狀態 B）", () => assert.equal(got.length, 0));
  const page = fs.readFileSync(path.join(dist, "notes", "index.html"), "utf-8");
  check("/notes：SSR 不輸出任何節點；island props 帶著邊", () => {
    assert.ok(!/class="gr-svg/.test(page), "SSR 不該畫 Graph");
    assert.ok(!page.includes("gr-n"), "SSR 不該有節點");
    assert.ok(page.includes("edges"), "island props 沒有 edges");
  });
  check("Graph 另外分包：有 GraphView 與 Worker 的 chunk", () => {
    const files = fs.readdirSync(path.join(dist, "_astro"));
    assert.ok(files.some((f) => /^GraphView\..+\.js$/.test(f)), "沒有 GraphView chunk");
    assert.ok(files.some((f) => /^wb-graph-worker.*\.js$/.test(f)), "沒有 Worker chunk");
    assert.ok(!page.includes("GraphView."), "/notes 的 HTML 不該預先載入 Graph chunk");
  });
  check("產物不含本機絕對路徑", () => {
    for (const needle of [tmp, root]) assert.ok(!raw.includes(needle) && !page.includes(needle), needle);
  });
  if (bigN) console.log(`\n  ${notes.length} 篇、${got.length} 條邊；/wb-index.json ${(raw.length / 1024).toFixed(0)} KB、/notes ${(page.length / 1024).toFixed(0)} KB`);
  if (keep) console.log(`\n  cd ${JSON.stringify(ws)} && NOTECRAFTAPP_DEV=1 node ${JSON.stringify(cli)} serve ./notes`);
  else fs.rmSync(path.dirname(dist), { recursive: true, force: true });
}

if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`\n暫存目錄保留：${tmp}`);

if (failed) {
  console.error(`\n✗ notes-graph-sample：${failed} 項失敗`);
  process.exit(1);
}
console.log("\n✓ notes-graph-sample 全部通過");
