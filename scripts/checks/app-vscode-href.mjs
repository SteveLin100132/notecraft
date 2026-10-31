// 「以 VS Code 編輯」連結的純函式斷言（src/lib/vscode-href.mjs）。
//
// 重點是跨磁碟機：Windows 上 app 在 C 槽、筆記在 D 槽時，Content Layer 的 filePath 是絕對路徑，
// 不可再接到 cwd 後面。以 path.win32／path.posix 斷言，不依執行平台。由 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import path from "node:path";
import { noteAbsPath, toVscodeHref } from "../../src/lib/vscode-href.mjs";

let failed = 0;
function check(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n  ${e.message.split("\n").join("\n  ")}`);
  }
}

const WIN_CWD = "C:\\Users\\u\\.notecraft\\app-1.13.0";

check("同磁碟機：相對 filePath 以 cwd 解析", () => {
  const abs = noteAbsPath("../../proj/docs/a.mdx", "a", "C:\\Users\\u\\app", path.win32);
  assert.equal(abs, "C:\\Users\\proj\\docs\\a.mdx");
  assert.equal(toVscodeHref(abs), "vscode://file/C:/Users/proj/docs/a.mdx");
});

check("跨磁碟機：絕對 filePath 直接採用、不含 cwd", () => {
  const abs = noteAbsPath("D:\\proj\\docs\\a.mdx", "a", WIN_CWD, path.win32);
  assert.equal(abs, "D:\\proj\\docs\\a.mdx");
  const href = toVscodeHref(abs);
  assert.equal(href, "vscode://file/D:/proj/docs/a.mdx");
  assert.ok(!href.includes("notecraft"), href);
  assert.ok(!href.includes("app-1.13.0"), href);
});

check("跨磁碟機：正斜線寫法的絕對 filePath 也直接採用", () => {
  assert.equal(toVscodeHref(noteAbsPath("D:/proj/docs/a.mdx", "a", WIN_CWD, path.win32)), "vscode://file/D:/proj/docs/a.mdx");
});

check("POSIX：絕對 filePath 直接採用、相對以 cwd 解析", () => {
  const abs = noteAbsPath("/home/u/docs/a.mdx", "a", "/opt/app", path.posix);
  assert.equal(abs, "/home/u/docs/a.mdx");
  assert.equal(toVscodeHref(abs), "vscode://file/home/u/docs/a.mdx");
  assert.equal(noteAbsPath("../docs/a.mdx", "a", "/opt/app", path.posix), "/opt/docs/a.mdx");
});

check("filePath 為 undefined：退回 src/content/notes/<id>.mdx", () => {
  assert.equal(noteAbsPath(undefined, "dir/a", WIN_CWD, path.win32), `${WIN_CWD}\\src\\content\\notes\\dir\\a.mdx`);
  assert.equal(noteAbsPath(undefined, "dir/a", "/opt/app", path.posix), "/opt/app/src/content/notes/dir/a.mdx");
  assert.equal(
    toVscodeHref(noteAbsPath(undefined, "a", WIN_CWD, path.win32)),
    "vscode://file/C:/Users/u/.notecraft/app-1.13.0/src/content/notes/a.mdx",
  );
});

check("toVscodeHref：正斜線、沒有多餘的 /", () => {
  assert.equal(toVscodeHref("D:\\proj\\docs\\a.mdx"), "vscode://file/D:/proj/docs/a.mdx");
  assert.equal(toVscodeHref("D:/proj/docs/a.mdx"), "vscode://file/D:/proj/docs/a.mdx");
  assert.equal(toVscodeHref("//home/u/a.mdx"), "vscode://file/home/u/a.mdx");
  for (const s of ["D:\\a\\b.mdx", "/home/u/b.mdx"]) {
    const href = toVscodeHref(s);
    assert.ok(!href.includes("\\"), href);
    assert.ok(!href.startsWith("vscode://file//"), href);
  }
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ app-vscode-href：全部通過");
