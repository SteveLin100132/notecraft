// 把官網樣式合成元件庫的單一 stylesheet：site.css＋figs.css＋ds.css。
// 字型的 @import（@fontsource-variable/*）拿掉，改由 design-sync 的 extraFonts 另外帶。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const site = read("src/styles/site.css").replace(/^@import\s+"@fontsource-variable\/[^"]+";\n/gm, "");
const css = [
  "/* 由 scripts/build-ds-css.mjs 產生，勿手改 */",
  site,
  read("src/styles/figs.css"),
  read("src/ds/ds.css"),
].join("\n");

mkdirSync(new URL("../ds-dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../ds-dist/styles.css", import.meta.url), css);
console.log(`ds-dist/styles.css ${(css.length / 1024).toFixed(0)} KB`);
