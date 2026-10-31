// 筆記閱讀頁的驗收 fixture（Task 144，規格 docs/notecraft-workbench-note-page.md §12.1）。
//
// 把 handoff（design_handoff_note_page）的 4 篇範例筆記以**本專案的語法**寫成工作區：
// md-basics（基本語法）、md-advanced（擴充語法）、md-viz（待生成標記、資料檔嵌入）、annual-leave-spec（4 個定義的來源）。
// 用來逐項對照 prototype 的兩種主題 × 三種寬度；筆記內容不進 src/content/notes/。
//
// 用法：
//   node scripts/fixtures/note-page-sample.mjs --out tmp/note-page-ws    只寫工作區；之後以
//       NOTECRAFT_NOTES_DIR=tmp/note-page-ws npx astro dev（.claude/launch.json 的 note-page-fixture-win）看
//   node scripts/fixtures/note-page-sample.mjs --build                   以 npm pack 的套件 build 並斷言產物（結束刪除暫存，--keep 保留）
//
// 不放 scripts/checks/：要跑一次完整 build。

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const doBuild = argv.includes("--build");
const keep = argv.includes("--keep");
const ER = "er-diagram-renderer";
const HANDOFF = path.join(root, "docs", "prototype", "design_handoff_note_page", "prototype");

const fm = (title, description, tags, extra = "") =>
  `---\ntitle: "${title}"\ndescription: "${description}"\ntags: [${tags.map((t) => `"${t}"`).join(", ")}]\ncreatedAt: "2026-10-01"\nupdatedAt: "2026-10-28"\n${extra}---\n\n`;

const FENCE = "```";

const NOTES = {
  "02-請假系統/md-basics.mdx":
    fm("Markdown 基本語法", "NoteCraft 支援的標準 Markdown 語法一覽：標題、行內樣式、清單、引言、表格、程式碼與圖片。", ["markdown", "語法"]) +
    `NoteCraft 的筆記以 Markdown 為基礎。本篇示範每一種基本語法的渲染結果；擴充語法請見下一章「進階語法」，引用的定義來自 :ref[定義區塊]{id="nc.syntax-define"}。

## 標題

文件以 H2 切分章節，H3 以下用於段落內的細節。

### 第三層標題

#### 第四層標題

##### 第五層標題

###### 第六層標題

## 行內樣式

可以使用 **粗體**、*斜體*、~~刪除線~~、==螢光標記==、\`行內程式碼\` 與 [連結](https://example.com)。快捷鍵寫成 <kbd>⌘</kbd> <kbd>K</kbd>；上標與下標用 H<sub>2</sub>O、x<sup>2</sup>。

## 清單

- 第一項
- 第二項
  - 巢狀項目
  - 另一個巢狀項目
- 第三項

1. 準備資料
2. 撰寫內容
3. 發佈

### 待辦清單

- [x] 建立筆記檔案
- [x] 填寫 frontmatter
- [ ] 加入互動元件
- [ ] 請同事審閱

## 引言

> 好的筆記不是寫給自己看的，而是寫給三個月後的自己看的。
>
> > 巢狀引言用來補充背景。
>
> <cite>— 某位工程師</cite>

## 表格

| 假別 | 天數 | 給薪 |
| :--- | ---: | :---: |
| 特休 | 7 | 全薪 |
| 病假 | 30 | 半薪 |
| 事假 | 14 | 不給薪 |

## 程式碼

${FENCE}ts title="src/lib/leave.ts" {5}
export function annualLeave(months: number): number {
  if (months < 6) return 0;
  if (months < 12) return 3;
  // 滿一年以上依年資遞增
  return Math.min(30, 7 + Math.floor(months / 12));
}
${FENCE}

### diff

${FENCE}diff lang=ts
 export const config = {
-  minUnit: "day",
+  minUnit: "hour",

   carryOver: true,
 };
${FENCE}

## 圖片

![工作台總覽](./assets/banner-dashboard.png "工作台的總覽頁：KPI、更新日誌與標籤分布。")

---

## 定義清單

:::dl
- **Frontmatter**：檔案開頭以 \`---\` 包住的 YAML，記錄標題、標籤與狀態。
- **Slug**：由檔名產生的網址片段，例如 \`md-basics\`。
- **MDX**：可以在 Markdown 中使用元件的格式，NoteCraft 的擴充語法都建立在它之上。
:::

註腳以 \`[^1]\` 標記，內容統一列在文末[^1]；點註腳編號可跳到說明，再點 ↩ 回到內文[^2]。

[^1]: 註腳內容可以寫在檔案任何位置，渲染時一律移到文末。
[^2]: 同一個註腳被多處引用時，編號只會出現一次。
`,

  "02-請假系統/md-advanced.mdx":
    fm("進階語法", "NoteCraft 的 MDX 擴充語法：提示文字、定義與引用、提示框、分頁、步驟、數學與程式碼註解。", ["markdown", "mdx"]) +
    `NoteCraft 以 MDX 擴充標準 Markdown。本篇逐一示範這些語法的寫法與渲染結果。

## 提示文字

以 \`:tip\` 為名詞加上滑鼠停留說明，例如 :tip[frontmatter]{content="檔案開頭以 --- 包住的 YAML，記錄標題、標籤與狀態。"} 與 :tip[slug]{content="由檔名產生的網址片段。"}。

## 定義與引用

### 宣告定義

::::define{id="nc.syntax-define"}
**定義區塊**：以 id 宣告一段可被其他筆記引用的內容。id 在全站唯一，建議以領域作為前綴，例如 \`hr.\` 或 \`nc.\`。
::::

### 行內引用

每位 :ref[員工]{id="hr.role-employee"} 到職滿六個月後取得 :ref[特別休假]{id="hr.term-annual-leave"}，兩個定義都來自「特休假規格與計算」。

### 嵌入定義

::include{id="hr.rule-settlement"}

## 提示框

:::note
備註：補充背景資訊，讀者略過也不影響理解。
:::

:::tip
提示：可以讓事情更順利的做法，例如以 <kbd>⌘</kbd> <kbd>K</kbd> 搜尋定義 id。
:::

:::warning
注意：容易出錯的地方，例如 id 重複時建置會失敗。
:::

:::danger
警告：會造成資料遺失或無法還原的操作。
:::

### 可收合的提示框

:::note{collapsible open title="預設展開：定義與提示文字的差別"}
提示文字只存在於當下這句話；定義則有 id，可以被其他筆記引用與嵌入。
:::

:::warning{collapsible title="預設收合：搬移定義的注意事項"}
把定義搬到另一篇筆記時，id 不需要變更。

- 刪除定義前，先確認被引用篇數為 0
- 建置時會列出找不到 id 的引用
:::

## 分頁

### 內容分頁

::::tabs
:::tab{label="已發佈"}
預設狀態。筆記出現在列表、搜尋與關聯圖，並計入系列進度。
:::
:::tab{label="草稿"}
以 \`status: empty\` 標示。

:::tip
草稿不計入系列進度的分母。
:::
:::
::::

### 程式碼分頁

:::code-group
${FENCE}sh title="npm"
npm install notecraft
npx notecraft dev
${FENCE}

${FENCE}sh title="pnpm"
pnpm add notecraft
pnpm notecraft dev
${FENCE}

${FENCE}json title="package.json"
{
  "scripts": { "dev": "notecraft dev" }
}
${FENCE}
:::

## 步驟

::::steps
:::step{title="建立檔案"}
在 src/content/notes 新增 .mdx 檔，填寫 frontmatter。
:::
:::step{title="撰寫內容"}
以 H2 切分章節，需要時引用定義或加入互動元件。
:::
:::step{title="發佈"}
推送到主分支後自動建置。
:::
::::

標上狀態後，可以呈現單一工作的進度：

::::steps
:::step{title="解析 frontmatter" status="done"}
42 篇筆記
:::
:::step{title="檢查定義引用" status="err"}
1 個引用找不到 id：hr.term-quota
:::
:::step{title="產生視覺化元件" status="skip"}
沒有待生成的標記，略過
:::
:::step{title="建置頁面" status="current"}
等待上一步修正
:::
:::step{title="部署" status="todo"}
:::
::::

::::steps{layout="horizontal"}
:::step{title="基本語法" status="done"}
已讀
:::
:::step{title="進階語法" status="current"}
閱讀中
:::
:::step{title="視覺化元件" status="todo"}
:::
:::step{title="ER 圖" status="todo"}
:::
::::

## 數學公式

以 \`$$\` 包住獨立公式，以 \`$\` 包住行內公式。工作台估算閱讀時間的方式如下：

$$
t = \\left\\lceil \\frac{w}{450} \\right\\rceil + 0.2 \\times n_{\\text{viz}}
$$

其中 $w$ 為字數，$n_{\\text{viz}}$ 為互動元件數量。

## 程式碼註解

:::annotate
${FENCE}ts title="notecraft.config.ts"
export default defineConfig({
  contentDir: "src/content/notes",
  toc: { minLevel: 2, maxLevel: 3 }, (1)!
  defines: { scope: "site" }, (2)!
  visualize: { outDir: "src/components/generated" }, (3)!
});
${FENCE}

1. 只有 H2 與 H3 會列入目錄；改為 \`maxLevel: 4\` 時，目錄會再多一層。
2. 定義 id 的作用範圍。\`site\` 表示全站唯一，跨資料夾也可以引用。
3. AI 依標記產生的元件會寫入這個資料夾，建議納入版本控制。
:::

## 摺疊問答

:::details[定義可以引用其他定義嗎？]{open}
可以。定義內容中的 \`:ref\` 會正常渲染，但嵌入時只會展開一層。
:::

:::details[引用的 id 打錯會怎樣？]
建置時會列出找不到的 id。
:::

:::details[提示框可以放在分頁裡嗎？]
可以，分頁內容支援所有區塊語法。
:::
`,

  "02-請假系統/md-viz.mdx":
    fm("視覺化互動元件", "AI 生成的互動元件、待生成標記，以及 renderer plugin 的資料檔嵌入。", ["視覺化", "plugin"]) +
    `import PluginView from "@/components/PluginView.astro";

在筆記中以 \`@ai-visualize\` 標記需要 AI 處理的位置；生成前，標記會在原位顯示提示卡。和 :ref[特別休假]{id="hr.term-annual-leave"} 有關的圖表都在這篇。

## 待生成標記

{/* @ai-visualize
id: leave-heatmap
type: chart
prompt: |
  以熱度圖呈現各部門 1–9 月的請假時數，顏色越深表示時數越多。
status: pending
*/}

{/* @ai-visualize
id: leave-gauge
type: motion
prompt: |
  儀表板顯示目前特休使用率，指針動畫從 0 轉到實際值。
status: failed
*/}

## 並排圖片

:::figures
![工作台](./assets/banner-dashboard.png "工作台總覽")
![ER 圖](./assets/er-diagram.png "資料檔的 ER 圖")
:::

## Renderer Plugin

資料檔除了有自己的檢視頁，也可以用 \`<PluginView>\` 直接嵌入筆記：

<PluginView src="planning/schema-er-diagram.er.json" />
`,

  "02-請假系統/annual-leave-spec.mdx":
    fm("特休假規格與計算", "一篇真實規格文件：特休假的取得、計算與年度結算。", ["規格", "請假"]) +
    `本規格定義 :ref[員工]{id="hr.role-employee"} 與 :ref[管理員]{id="hr.role-admin"} 在特休假上的權利與操作。

## 名詞

::::define{id="hr.term-annual-leave"}
**特別休假**：勞工在同一雇主或事業單位繼續工作滿一定期間後，依年資取得的有薪休假。休假期間工資照給，未休完者於年度終結時折發工資。
::::

::::define{id="hr.role-employee"}
**員工**：在系統中擁有個人假勤與薪資單檢視權限的帳號，可送出請假申請並查詢自己的特休餘額。
::::

::::define{id="hr.role-admin"}
**管理員**：可修改假勤設定、手動調整員工餘額的帳號；所有調整都會寫入稽核紀錄。
::::

## 計算方式

| 年資 | 天數 |
| :--- | ---: |
| 6 個月以上未滿 1 年 | 3 |
| 1 年以上未滿 2 年 | 7 |
| 2 年以上未滿 3 年 | 10 |

:::warning
年資以到職日起算，留職停薪期間不計入。
:::

## 年度結算

::::define{id="hr.rule-settlement"}
**年度結算規則**：年度結算日當天，系統會鎖定所有員工的特休餘額，並產生「未休特休折發清冊」供薪資計算使用。勞雇雙方若協商遞延，遞延的時數須於次一年度內休完。
::::
`,
};

function writeWorkspace(notesDir, configDir) {
  for (const [rel, src] of Object.entries(NOTES)) {
    const abs = path.join(notesDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, src, "utf-8");
  }
  const assets = path.join(notesDir, "02-請假系統", "assets");
  fs.mkdirSync(assets, { recursive: true });
  for (const f of ["banner-dashboard.png", "er-diagram.png"]) fs.copyFileSync(path.join(HANDOFF, "assets", f), path.join(assets, f));
  // 資料檔與 ER plugin（與 notes-graph-sample.mjs 相同的安裝方式）
  const example = JSON.parse(fs.readFileSync(path.join(root, "plugins", ER, "example", "schema.json"), "utf-8"));
  const dataAbs = path.join(notesDir, "planning", "schema-er-diagram.er.json");
  fs.mkdirSync(path.dirname(dataAbs), { recursive: true });
  fs.writeFileSync(dataAbs, JSON.stringify({ ...example, meta: { title: "請假系統 ER 圖", description: "fixture", backTo: "/notes/02-請假系統/md-viz" } }, null, 2) + "\n", "utf-8");
  fs.mkdirSync(path.join(configDir, "plugins"), { recursive: true });
  fs.writeFileSync(path.join(configDir, "plugins.json"), JSON.stringify({ plugins: [{ plugin: ER, files: ["**/*.er.json"] }] }, null, 2) + "\n", "utf-8");
  const dest = path.join(configDir, "plugins", ER);
  fs.cpSync(path.join(root, "plugins", ER), dest, { recursive: true });
  fs.writeFileSync(path.join(dest, ".installed.json"), JSON.stringify({ id: ER, origin: `local:${ER}`, commit: "local" }, null, 2) + "\n");
  // 系列：基本 → 進階 → 視覺化 → ER 資料檔
  const series = [{ id: "md-guide", title: "Markdown 指南", eyebrow: "GUIDE", description: "fixture", accent: "blue", icon: "bookOpen", slugs: ["02-請假系統/md-basics", "02-請假系統/md-advanced", "02-請假系統/md-viz", "view:planning/schema-er-diagram.er"] }];
  fs.writeFileSync(path.join(configDir, "series.json"), JSON.stringify({ series }, null, 2) + "\n", "utf-8");
}

const outArg = argv.indexOf("--out");
if (outArg >= 0) {
  assert.ok(argv[outArg + 1], "--out 後面要接資料夾");
  const out = path.resolve(argv[outArg + 1]);
  fs.rmSync(out, { recursive: true, force: true });
  writeWorkspace(out, path.join(out, ".notecraft"));
  console.log(`已寫到 ${path.relative(root, out) || out}`);
  process.exit(0);
}
if (!doBuild) {
  console.log("用法：--out <dir>（寫工作區給 dev server）或 --build（打包、build、斷言）");
  process.exit(0);
}

// ── 打包並解開（同 notes-graph-sample.mjs），以 npm 實際發佈的樣子 build ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notecraft-notepage-"));
const npmCli = process.env.npm_execpath;
const pack = npmCli
  ? spawnSync(process.execPath, [npmCli, "pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8" })
  : spawnSync("npm", ["pack", "--pack-destination", tmp, "--ignore-scripts", "--json"], { cwd: root, encoding: "utf-8", shell: process.platform === "win32" });
const tgz = JSON.parse(pack.stdout)[0].filename;
const appDir = path.join(tmp, "package");
spawnSync("tar", ["xzf", path.basename(tgz)], { cwd: tmp });
for (const f of ["src/lib/note-theme-prepaint.ts", "src/lib/remark-notecraft-mark.ts", "src/lib/remark-notecraft-ai-markers.ts"]) {
  assert.ok(fs.existsSync(path.join(appDir, f)), `打包內容沒有 ${f}`);
}
fs.symlinkSync(path.join(root, "node_modules"), path.join(appDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
const cli = path.join(appDir, "bin", "notecraftapp.mjs");
const ws = path.join(tmp, "ws");
writeWorkspace(path.join(ws, "notes"), path.join(ws, ".notecraft"));

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
const r = spawnSync(process.execPath, [cli, "build", "--rebuild", "./notes"], { cwd: ws, env: { ...process.env, NOTECRAFTAPP_DEV: "1" }, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
const log = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
const m = log.match(/dist:\s*:\s*(\S+)/);
let dist = "";
check(`build（${((Date.now() - t0) / 1000).toFixed(1)}s）`, () => {
  assert.equal(r.status, 0, `build 失敗：\n${log.split("\n").slice(-20).join("\n")}`);
  assert.ok(m, "build log 找不到 dist 路徑");
  dist = m[1];
});

if (dist) {
  const page = (slug) => fs.readFileSync(path.join(dist, "notes", ...slug.split("/"), "index.html"), "utf-8");
  const basics = page("02-請假系統/md-basics");
  const adv = page("02-請假系統/md-advanced");
  const viz = page("02-請假系統/md-viz");
  check("每篇都有文內 H1、主題 class、資訊列", () => {
    for (const h of [basics, adv, viz]) {
      assert.match(h, /<h1 class="md-h1" id="nc-note-title">/);
      assert.match(h, /id="nc-scroll" class="[^"]*np-scroll np-d/);
      assert.match(h, /class="md-meta"/);
    }
  });
  check("基本語法：螢光、待辦、註腳、定義清單、diff", () => {
    assert.match(basics, /<mark>螢光標記<\/mark>/);
    assert.match(basics, /task-list-item/);
    assert.match(basics, /data-footnotes/);
    assert.match(basics, /class="nc-fns-h"/);
    assert.match(basics, /<dl class="nc-dl">/);
    assert.match(basics, /nc-cb--diff/);
    assert.match(basics, /nc-cb__ln is-add/);
  });
  check("進階語法：KaTeX、code-group、步驟狀態、問答群組、註解補上 //", () => {
    assert.match(adv, /class="katex-display"/);
    assert.match(adv, /nc-tabs nc-tabs--code/);
    assert.match(adv, /nc-step--err is-set/);
    assert.match(adv, /nc-step--skip is-set/);
    assert.match(adv, /class="nc-dets"/);
    assert.match(adv, /nc-cb__t--comment">\s?\/\/ <\/span><span class="nc-anno-marker"/);
  });
  check("待生成標記：pending 與 failed 在原位、帶 data-pagefind-ignore", () => {
    assert.match(viz, /class="nc-aim nc-aim--pending"[^>]*data-pagefind-ignore/);
    assert.match(viz, /nc-aim--failed/);
  });
  check("並排圖片與資料檔外框", () => {
    assert.match(viz, /class="nc-figs"/);
    assert.match(viz, /class="nc-viz nc-viz--data"/);
  });
  check("產物不含本機路徑", () => {
    for (const h of [basics, adv, viz]) assert.ok(!h.includes(root) && !h.includes(tmp), "HTML 含本機路徑");
  });
  console.log(`\ndist：${dist}`);
}

if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`暫存目錄：${tmp}`);
if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("\nnote-page-sample：全部通過");
