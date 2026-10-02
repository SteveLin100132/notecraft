// 「本機絕對路徑不得出現在輸出」的純函式斷言（src/lib/local-path.ts）。
//
// publicPluginOrigin 負責把 .installed.json 舊格式（本地安裝記絕對路徑）轉成可輸出的形式；
// findLocalPath 是 build 後掃描產物的護欄（src/lib/no-local-path-integration.mjs）。由 scripts/check-plugins.mjs 串接執行。

import assert from "node:assert/strict";
import { findLocalPath, isLocalAbsPath, localPathNeedles, publicPluginOrigin } from "../../src/lib/local-path.ts";

let failed = 0;
function check(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n  ${e.message.split("\n").join("\n  ")}`);
  }
}

check("isLocalAbsPath：POSIX／Windows／UNC／家目錄", () => {
  for (const s of ["/Users/a/p", "~/p", "C:\\a\\p", "c:/a/p", "\\\\srv\\share\\p"]) assert.equal(isLocalAbsPath(s), true, s);
  for (const s of ["local:p", "https://github.com/a/b", "plugins/er", "local"]) assert.equal(isLocalAbsPath(s), false, s);
});

check("publicPluginOrigin：GitHub 與新格式原樣", () => {
  const gh = "https://github.com/o/r/tree/main/plugins/er";
  assert.equal(publicPluginOrigin(gh), gh);
  assert.equal(publicPluginOrigin("local:my-plugin"), "local:my-plugin");
});

check("publicPluginOrigin：舊格式絕對路徑只留資料夾名", () => {
  assert.equal(publicPluginOrigin("/Users/me/proj/my-plugin"), "local:my-plugin");
  assert.equal(publicPluginOrigin("/Users/me/proj/my-plugin/"), "local:my-plugin");
  assert.equal(publicPluginOrigin("C:\\Users\\me\\外掛"), "local:外掛");
  assert.equal(publicPluginOrigin("~/"), "local");
  assert.equal(publicPluginOrigin("/"), "local");
});

check("localPathNeedles：略過太短的根、Windows 展開三種寫法", () => {
  assert.deepEqual(localPathNeedles(["/", "C:\\", "/home"]), []);
  assert.deepEqual(localPathNeedles(["/Users/me/proj/"]), ["/Users/me/proj"]);
  assert.deepEqual(localPathNeedles(["C:\\Users\\me"]), ["C:\\Users\\me", "C:/Users/me", "C:\\\\Users\\\\me"]);
});

check("findLocalPath：命中 island props 裡的路徑", () => {
  const needles = localPathNeedles(["/Users/me/proj"]);
  const html = `<astro-island props="{&quot;rendererPath&quot;:[0,&quot;/Users/me/proj/.notecraft/plugins/x/renderer.tsx&quot;]}">`;
  assert.equal(findLocalPath(html, needles)?.needle, "/Users/me/proj");
});

check("findLocalPath：JSON 裡跳脫過的 Windows 路徑", () => {
  const needles = localPathNeedles(["C:\\Users\\me\\proj"]);
  assert.ok(findLocalPath(JSON.stringify({ origin: "C:\\Users\\me\\proj\\p" }), needles));
});

check("findLocalPath：vscode:// 連結放行，其後的裸路徑仍抓", () => {
  const needles = localPathNeedles(["/Users/me/proj"]);
  // 頁面組 vscode 連結時會去掉開頭的 /（vscode://file/Users/…），needle 的 / 就是 file 後那個
  assert.equal(findLocalPath(`<a href="vscode://file/Users/me/proj/a.mdx">`, needles), null);
  assert.equal(findLocalPath(`<a href="vscode://file/C:/Users/me/proj/a.mdx">`, localPathNeedles(["C:\\Users\\me\\proj"])), null);
  assert.ok(findLocalPath(`<a href="vscode://file/Users/me/proj/a">x</a> /Users/me/proj/b`, needles));
});

check("findLocalPath：別的路徑不誤判", () => {
  assert.equal(findLocalPath("/Users/me/project-other/a", localPathNeedles(["/Users/me/proj2"])), null);
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ app-local-path");
