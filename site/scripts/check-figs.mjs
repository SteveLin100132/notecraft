// 檢查文件爆炸圖的組裝稿（src/lib/figs/*.ts）：
//   每一節都有、錨點 `to` 存在、編號偶數且由下而上遞增、id 不重複、kind 是零件庫裡有的、截圖檔存在、box 在底板內。
// 用法：node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/check-figs.mjs [章檔名…]
// （章檔只能 `import type`，才能被 Node 直接載入）
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import GithubSlugger from "github-slugger";

const root = path.resolve(import.meta.dirname, "..");
const figDir = path.join(root, "src/lib/figs");
const docsDir = path.join(root, "src/content/docs");
const platesDir = path.join(root, "public/plates");

const kinds = new Set([...fs.readFileSync(path.join(figDir, "types.ts"), "utf8").matchAll(/\|\s*"([a-z]+)"/g)].map((m) => m[1]));
const { CHAPTERS } = await import(pathToFileURL(path.join(root, "src/lib/docs.ts")).href);
const all = [];
const walk = (items) => items.forEach((it) => (it.slug && all.push(it.slug), it.children && walk(it.children)));
CHAPTERS.forEach((c) => walk(c.items));

function anchors(slug) {
  const file = path.join(docsDir, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const s = new GithubSlugger();
  const out = new Set();
  out.h2 = [];
  // 圍欄要記住開頭的反引號數：```` 包住的 ``` 不算結束
  let fence = "";
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const f = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    // 反引號圍欄的資訊字串不能再含反引號，否則是行內 code（例如 ```` ```mermaid ````）
    if (f && !fence && f[0] === "`" && line.trim().slice(f.length).includes("`")) {
      // 這一行仍可能是一般段落，不是標題，略過即可
      continue;
    }
    if (f && !fence) fence = f;
    else if (f && f[0] === fence[0] && f.length >= fence.length && line.trim() === f) fence = "";
    if (fence || f) continue;
    const m = line.match(/^(##+)\s+(.+?)\s*$/);
    if (!m) continue;
    const id = s.slug(m[2].replace(/`/g, "").replace(/\*\*/g, ""));
    out.add(id);
    if (m[1].length === 2) out.h2.push(id);
  }
  return out;
}

const want = process.argv.slice(2);
const files = fs.readdirSync(figDir).filter((f) => f.endsWith(".ts") && !["types.ts", "index.ts"].includes(f) && (!want.length || want.includes(f.replace(/\.ts$/, ""))));
const errors = [];
const warns = [];
const seen = new Set();
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(figDir, f)).href);
  const figs = Object.values(mod)[0];
  for (const [slug, fig] of Object.entries(figs)) {
    seen.add(slug);
    const at = `${f} › ${slug}`;
    const a = anchors(slug);
    if (!a) errors.push(`${at}：沒有這一節（src/content/docs/${slug}.mdx）`);
    if (!fig.caption) errors.push(`${at}：缺 caption`);
    if (fig.layers.length < 3 || fig.layers.length > 7) warns.push(`${at}：${fig.layers.length} 層（建議 3–6）`);
    // 爆炸圖取代本頁目錄：每個 ## 都要被某個零件的 to 或 also 涵蓋
    if (a) {
      const covered = new Set(fig.layers.flatMap((l) => [l.to, ...(l.also ?? [])]));
      const loose = a.h2.filter((h) => !covered.has(h));
      if (loose.length) errors.push(`${at}：## 沒有零件涵蓋：${loose.join("、")}`);
    }
    let prev = 0;
    const ids = new Set();
    let hl = 0;
    for (const l of fig.layers) {
      const lt = `${at} › ${l.id}`;
      if (!kinds.has(l.kind)) errors.push(`${lt}：沒有「${l.kind}」這種零件`);
      if (l.ref % 2 || l.ref <= prev) errors.push(`${lt}：編號 ${l.ref} 要是偶數且由下而上遞增`);
      prev = l.ref;
      if (ids.has(l.id)) errors.push(`${lt}：id 重複`);
      ids.add(l.id);
      if (l.to && a && !a.has(l.to)) errors.push(`${lt}：to「${l.to}」不存在；可用：${[...a].join("、")}`);
      for (const x of l.also ?? []) if (a && !a.has(x)) errors.push(`${lt}：also「${x}」不存在；可用：${[...a].join("、")}`);
      if (!l.to) warns.push(`${lt}：沒有 to`);
      if (l.hl) hl++;
      if (l.box) {
        const [u0, v0, u1, v1] = l.box;
        if (u0 < 0 || v0 < 0 || u1 > 320 || v1 > 220 || u1 - u0 < 12 || v1 - v0 < 10) errors.push(`${lt}：box ${JSON.stringify(l.box)} 超出底板 320×220 或太小`);
      }
      if (l.shot) {
        if (l.kind !== "screen") errors.push(`${lt}：shot 只能給 screen`);
        if (!fs.existsSync(path.join(platesDir, `${l.shot}.webp`))) errors.push(`${lt}：沒有截圖 public/plates/${l.shot}.webp`);
        const [u0, v0, u1, v1] = l.box ?? [0, 0, 320, 220];
        const r = (u1 - u0) / (v1 - v0);
        if (Math.abs(r - 1.6) > 0.06) warns.push(`${lt}：截圖層 box 比例 ${r.toFixed(2)}，建議 16:10`);
      }
      if (l.name.length > 14) warns.push(`${lt}：name 太長（${l.name.length} 字）`);
    }
    if (hl > 1) warns.push(`${at}：${hl} 層 hl（建議最多 1）`);
  }
}
const scoped = want.length ? all.filter((s) => files.some((f) => s.startsWith(`${f.replace(/\.ts$/, "").replace("intro", "intro")}`))) : all;
const missing = all.filter((s) => !seen.has(s));
for (const w of warns) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${seen.size}/${all.length} 節有組裝稿${missing.length && !want.length ? `；缺：${missing.join("、")}` : ""}`);
void scoped;
process.exit(errors.length ? 1 : 0);
