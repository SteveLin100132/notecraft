// 文件頁的「實際渲染」示範要長得跟 NoteCraftApp 筆記頁一模一樣，所以樣式不另寫一份：
// 每次 astro dev／build 從 app 的 src/styles/tokens.css 與 global.css 抽出筆記內文（.nc-prose）那一段，
// 限縮到示範框 .ncp 裡面，寫成 src/styles/nc-prose.gen.css（不進版控）。
//
// - tokens 的 :root 改成 .ncp：app 的 --ease-out 等同名變數不會蓋到官網
// - .nc-prose 規則改成 .ncp .nc-prose：比 docs.css 的 .doc-body h2 這類規則更具體，app 的樣式勝出
// - 內文區段裡的 :root（定義與引用的 --wb-ref-* 等 token）也改成 .ncp；它們引用的工作台基底 token（--wb-blue-l…）
//   取自 app 的 workbench.css 第一個 :root，同樣縮進 .ncp
// - 前面補一段縮在 .ncp 裡的基底（對應 app 的 base reset 與 Tailwind preflight），
//   把 docs.css 會漏進來、app 自己沒設的屬性（h2 上框線、清單縮排…）歸零
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const START = "/* ── prose styles for MDX note bodies ── */";
const END = "/* ── unstyled button reset for ghost buttons ── */";

const BASE = `
/* 官網示範框的基底：對應 app 的 base reset 與 Tailwind preflight，只作用在 .ncp 裡 */
.ncp {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  line-height: var(--leading-normal);
  color: var(--text-body);
  font-variant-numeric: normal;
  letter-spacing: normal;
  text-align: left;
}
.ncp.ncp :where(*, *::before, *::after) { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #e5e7eb; }
.ncp.ncp :where(h1, h2, h3, h4, h5, h6) {
  margin: 0; padding: 0; border: 0;
  font-family: var(--font-sans); font-size: inherit; font-weight: var(--weight-bold);
  line-height: var(--leading-tight); letter-spacing: normal; color: var(--text-strong); scroll-margin-top: 0;
}
.ncp.ncp :where(p) { margin: 0; line-height: var(--leading-relaxed); }
.ncp.ncp :where(ul, ol) { margin: 0; padding: 0; list-style: none; }
.ncp.ncp :where(li) { margin: 0; }
.ncp.ncp :where(li)::marker { color: inherit; }
.ncp.ncp :where(a) { color: var(--action-link); text-decoration: none; }
.ncp.ncp :where(strong, b) { font-weight: bolder; }
.ncp.ncp :where(code) { padding: 0; background: none; font-size: 1em; overflow-wrap: normal; }
.ncp.ncp :where(blockquote) { margin: 0; padding: 0; border: 0; color: inherit; }
.ncp.ncp :where(img, svg) { display: block; max-width: 100%; }
.ncp.ncp :where(img) { height: auto; }
.ncp.ncp :where(button) {
  margin: 0; padding: 0; font: inherit; color: inherit; text-transform: none;
  background: transparent; cursor: pointer; -webkit-appearance: button;
}
.ncp.ncp :where(details, summary) { display: block; }
.ncp.ncp :where(summary) { display: list-item; }
.ncp.ncp :where(table) { border-collapse: collapse; text-indent: 0; }
`;

export function syncNcProse() {
  const root = new URL("../../src/styles/", import.meta.url);
  const tokens = readFileSync(new URL("tokens.css", root), "utf8");
  const global = readFileSync(new URL("global.css", root), "utf8");
  const workbench = readFileSync(new URL("workbench.css", root), "utf8");
  const a = global.indexOf(START);
  const b = global.indexOf(END);
  if (a < 0 || b < a) throw new Error("sync-nc-prose：app 的 global.css 找不到筆記內文樣式的起訖註解，請更新 site/scripts/sync-nc-prose.mjs");

  const scopedTokens = tokens
    .replace(/:root\s*\{/, ".ncp {")
    // app 由 Google Fonts 載入 Noto Sans TC；官網已有同一字族的 Variable 版
    .replace(/--font-sans:/, '--font-sans:"Noto Sans TC Variable",');
  const prose = global
    .slice(a, b)
    .replace(/\.nc-prose\b/g, ".ncp .nc-prose")
    .replace(/^:root\s*\{/gm, ".ncp {");
  const wb = /^:root\s*\{[\s\S]*?^\}/m.exec(workbench);
  if (!wb) throw new Error("sync-nc-prose：app 的 workbench.css 找不到 :root 區塊");
  const wbTokens = wb[0].replace(/^:root/, ".ncp");

  const out = [
    "/* 由 site/scripts/sync-nc-prose.mjs 從 app 的 src/styles 產生，不要手改。 */",
    scopedTokens,
    "/* 工作台基底 token（workbench.css 的 :root）：定義與引用的樣式會用到 */",
    wbTokens,
    BASE,
    prose,
  ].join("\n");
  const file = fileURLToPath(new URL("../src/styles/nc-prose.gen.css", import.meta.url));
  let prev = "";
  try {
    prev = readFileSync(file, "utf8");
  } catch {}
  if (prev !== out) writeFileSync(file, out);
}
