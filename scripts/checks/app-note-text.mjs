// 筆記內文推導（src/lib/note-text.ts）的斷言：備用標題、excerpt 不被程式碼區塊與 MDX 註解騙到；
// 只有 .mdx 的 @ai-visualize 標記算數。由 check:wb 與 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { acceptsMarkers, excerpt, firstH1, parseMarkers, stripNonProse } from "../../src/lib/note-text.ts";

const bash = "```bash\n# 安裝相依\nnpm i\n```";
const tilde = "~~~python\n# 這是 Python 註解\nprint(1)\n~~~";
const marker = "{/* @ai-visualize\nid: flow\ntype: diagram\nprompt: |\n  # 不是標題\nstatus: pending\n*/}";

// 備用標題
assert.equal(firstH1(`${bash}\n\n# 真正的標題\n`), "真正的標題");
assert.equal(firstH1(`${tilde}\n\n# 真正的標題`), "真正的標題");
assert.equal(firstH1(`${marker}\n\n# 真正的標題`), "真正的標題");
assert.equal(firstH1(`段落\n\n${bash}`), undefined, "只有程式碼區塊裡的 # → 沒有 H1");
assert.equal(firstH1(`${marker}`), undefined, "只有標記 prompt 裡的 # → 沒有 H1");
assert.equal(firstH1("## 二級\n\n# 一級"), "一級");
assert.equal(firstH1("#沒有空白不是標題"), undefined);
assert.equal(firstH1(""), undefined);
assert.equal(firstH1(null), undefined);
// 收尾 fence 要同字元、不短於開頭；~~~ 不能關 ```
assert.equal(firstH1("````md\n```\n# 內層\n```\n````\n# 外面"), "外面");
assert.equal(firstH1("```\n~~~\n# 還在程式碼裡\n```\n# 外面"), "外面");
// 未收尾的程式碼區塊延伸到文末
assert.equal(firstH1("```sh\n# 註解\n"), undefined);
// 行內註解只拿掉註解本身，同一行的其他字保留
assert.equal(stripNonProse("前 {/* x */} 後"), "前  後");
assert.equal(stripNonProse("前 {/* 多\n行 */} 後\n下一行"), "前 \n 後\n下一行");
// 跨行註解留下空行（段落仍分得開），註解內容不留
assert.equal(stripNonProse("a\n{/* 多\n行\n*/}\nb"), "a\n\n\nb");
assert.equal(stripNonProse("縮排 4 格的 ```不算 fence\n    ```\n# 標題").includes("# 標題"), true);

// excerpt
assert.equal(excerpt(`${bash}\n\n第一段文字。`, ""), "第一段文字。");
assert.equal(excerpt(`${tilde}\n\n第一段文字。`, ""), "第一段文字。", "~~~ 區塊不可當成段落");
assert.equal(excerpt(`${marker}\n\n# 標題\n\n內文`, ""), "內文");
assert.equal(excerpt("", "備援"), "備援");

// 標記只認 .mdx
assert.equal(acceptsMarkers("notes/a.mdx"), true);
assert.equal(acceptsMarkers("notes/A.MDX"), true);
assert.equal(acceptsMarkers("notes/a.md"), false);
assert.equal(acceptsMarkers("notes/a.mdx.md"), false);
assert.equal(acceptsMarkers(undefined), true);
assert.deepEqual(
  parseMarkers(marker).map((m) => [m.id, m.type, m.status, m.prompt]),
  [["flow", "diagram", "pending", "# 不是標題"]],
);

console.log("✓ app-note-text");
