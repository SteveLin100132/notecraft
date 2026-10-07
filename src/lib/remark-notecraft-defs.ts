/**
 * 定義與引用的 remark plugin（app 用）：把 remark-notecraft-defs-core.ts 接上 build／dev 期的索引單例。
 * 掛在 `remark-directive` 之後、`remarkNotecraftDirectives` 之前（astro.config.mjs）。
 * Node API（索引、路徑、NOTECRAFT_BASE）都在 defs-state.mjs：.ts 不碰 node:*／process，tsc 錯誤數才不會增加。
 */
import { assertDefIndex, getDefIndex, relOfNoteFile, siteBase } from "./defs-state.mjs";
import { createRemarkDefs } from "./remark-notecraft-defs-core";

export default createRemarkDefs({ getIndex: getDefIndex, assert: assertDefIndex, relOf: relOfNoteFile, base: siteBase });
