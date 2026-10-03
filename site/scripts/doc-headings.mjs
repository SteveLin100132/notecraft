// 開發輔助：列出每一節文件的 `##`／`###` 標題 slug（github-slugger，與 Astro 產生的錨點相同），
// 給爆炸圖組裝稿（src/lib/figs/）的 `to` 欄位查用。build 時 [...slug].astro 也會檢查 `to` 是否存在。
// 用法：node scripts/doc-headings.mjs [slug…]　（不給 slug 就全部列出）
import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";

const root = "src/content/docs";
const want = process.argv.slice(2);
for (const dir of fs.readdirSync(root)) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const slug = `${dir}/${f.replace(/\.mdx$/, "")}`;
    if (want.length && !want.includes(slug)) continue;
    const src = fs.readFileSync(path.join(root, dir, f), "utf8");
    const slugger = new GithubSlugger();
    const heads = [];
    // 圍欄要記住開頭的反引號數：```` 包住的 ``` 不算結束
    let fence = "";
    for (const line of src.split("\n")) {
      const f = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
      // 反引號圍欄的資訊字串不能再含反引號，否則是行內 code（例如 ```` ```mermaid ````）
      if (f && !fence && f[0] === "`" && line.trim().slice(f.length).includes("`")) continue;
      if (f && !fence) fence = f;
      else if (f && f[0] === fence[0] && f.length >= fence.length && line.trim() === f) fence = "";
      if (fence || f) continue;
      const m = line.match(/^(##+)\s+(.+?)\s*$/);
      if (m) heads.push(`${"  ".repeat(m[1].length - 2)}${slugger.slug(m[2].replace(/`/g, "").replace(/\*\*/g, ""))}`);
    }
    console.log(`${slug}\n  ${heads.join("\n  ")}`);
  }
}
