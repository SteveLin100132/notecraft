// 生成元件 hydrate 前後的高度盤點（規格 docs/notecraft-workbench-loading-transitions.md §9.1、Task 111）。
// 不是檢查（不放 scripts/checks/）：需要 build 好的站與瀏覽器，用來找出 hydrate 時會撐開、推動下方內容的元件。
//
// 用法（Playwright 不在專案 dependencies；臨時裝在別處，以 PLAYWRIGHT_MODULE 指向它的 index.js）：
//   npx astro build && npx astro preview --port 4329
//   PLAYWRIGHT_MODULE=/tmp/pw/node_modules/playwright/index.js node scripts/fixtures/viz-height-audit.mjs [baseURL] [寬度,…]
// REDUCE=1 時以 prefers-reduced-motion: reduce 量（SSR 一律當作沒開，依它決定版面的元件會在這裡露餡）。
// 輸出每個 [data-nc-viz-body] 的 SSR 高度（停用 JS）與 hydrate 後高度；差距 > 8px 的標 ✗。
import fs from "node:fs";
import path from "node:path";

const pw = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const chromium = pw.chromium ?? pw.default.chromium; // CJS 套件以檔案路徑 import 時只有 default

const BASE = process.argv[2] || "http://localhost:4329";
const WIDTHS = (process.argv[3] || "1400,375").split(",").map(Number);
const THRESHOLD = 8;

const distNotes = path.resolve("dist/notes");
const pages = fs
  .readdirSync(distNotes, { recursive: true })
  .filter((f) => String(f).endsWith("index.html") && String(f) !== "index.html")
  .map((f) => "/notes/" + String(f).replace(/index\.html$/, ""));

const measure = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-nc-viz-body]")].map((el) => ({
      id: el.closest("figure")?.querySelector("code")?.textContent?.trim() || "?",
      h: Math.round(el.getBoundingClientRect().height),
    })),
  );

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "chrome" });
const rows = [];
for (const W of WIDTHS) {
  const off = await browser.newContext({ viewport: { width: W, height: 900 }, javaScriptEnabled: false });
  const on = await browser.newContext({ viewport: { width: W, height: 900 }, reducedMotion: process.env.REDUCE ? "reduce" : "no-preference" });
  for (const p of pages) {
    const a = await off.newPage();
    await a.goto(BASE + p, { waitUntil: "load" });
    const ssr = await measure(a);
    await a.close();
    if (!ssr.length) continue;
    const b = await on.newPage();
    await b.goto(BASE + p, { waitUntil: "load" });
    // 逐一捲進視窗，等 client:visible 的 island 全部 hydrate
    const n = await b.evaluate(() => document.querySelectorAll("[data-nc-viz-body]").length);
    for (let i = 0; i < n; i++) {
      await b.evaluate((k) => document.querySelectorAll("[data-nc-viz-body]")[k].scrollIntoView({ block: "center" }), i);
      await b.waitForTimeout(250);
    }
    await b.waitForFunction(() => !document.querySelector("astro-island[ssr]"), null, { timeout: 8000 }).catch(() => {});
    await b.waitForTimeout(800);
    const hyd = await measure(b);
    await b.close();
    ssr.forEach((s, i) => rows.push({ W, page: decodeURI(p), id: s.id, ssr: s.h, hyd: hyd[i]?.h ?? -1 }));
  }
  await off.close();
  await on.close();
}
await browser.close();

let bad = 0;
for (const r of rows) {
  const d = r.hyd - r.ssr;
  const flag = Math.abs(d) > THRESHOLD ? "✗" : " ";
  if (flag === "✗") bad++;
  if (flag === "✗" || process.env.ALL) console.log(`${flag} ${r.W}\t${r.ssr}→${r.hyd}\t(${d > 0 ? "+" : ""}${d})\t${r.id}\t${r.page}`);
}
console.log(`\n${rows.length} 個（含各寬度），高度差 > ${THRESHOLD}px：${bad}`);
