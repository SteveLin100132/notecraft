// dev-only「以 VS Code 編輯」連結的純函式（scripts/checks/app-vscode-href.mjs 直接載入斷言）。
//
// .mjs 是因為 Astro 頁面與 dev-api（handlers.mjs，CLI 也會直接載入）共用。**不可碰 Node API**：
// 路徑模組由呼叫端注入（正式用 node:path，斷言用 path.win32／path.posix），結果才不依執行平台。

/** @typedef {import("./vscode-href.d.mts").PathResolver} PathResolver */

/**
 * 筆記來源檔的絕對路徑。
 *
 * Content Layer 的 entry.filePath 是 glob loader 以 `path.relative(root, file)` 算的，平常是相對 cwd 的路徑；
 * 但 Windows 上 cwd（viewer 模式是 app 安裝目錄）與筆記不在同一個磁碟機時，`path.relative` 會直接回傳絕對路徑。
 * 所以一律用 `resolve`（遇到絕對路徑直接採用），不可字串串接 cwd。
 *
 * @param {string | undefined} filePath
 * @param {string} id
 * @param {string} cwd
 * @param {PathResolver} p
 * @returns {string}
 */
export function noteAbsPath(filePath, id, cwd, p) {
  return filePath ? p.resolve(cwd, filePath) : p.resolve(cwd, "src/content/notes", `${id}.mdx`);
}

/**
 * 絕對路徑 → `vscode://file/<路徑>`：反斜線轉正斜線、去掉開頭的 `/`（POSIX 路徑的 `/` 由 `file/` 那個補上）。
 *
 * @param {string} absPath
 * @returns {string}
 */
export function toVscodeHref(absPath) {
  return `vscode://file/${absPath.replace(/\\/g, "/").replace(/^\/+/, "")}`;
}
