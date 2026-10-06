// 官方外掛清單（規格 docs/notecraft-workbench-plugin-empty-states.md §7.1、§7.4）。
// /plugins 空狀態的「官方外掛」清單與 plugins.json 範例只從這裡讀，文案不散寫在元件裡。
// 之後做 Plugin Store 時把這份常數換成 Store 的資料來源即可（handoff §9）。
// **只能 `import type`、不能有 JSX**：scripts/checks/wb-plugin-env.mjs 直接載入，並與 plugins/registry.json 對照 id 與 title。

export interface OfficialPlugin {
  id: string;
  title: string;
  description: string;
  /** `install-plugin --apply` 與 plugins.json 範例用的 glob */
  defaultGlob: string;
}

export const OFFICIAL_PLUGINS: readonly OfficialPlugin[] = [
  {
    id: "er-diagram-renderer",
    title: "ER Diagram",
    description: "資料庫 schema JSON → 可導覽的 Wiki 與實體關聯圖",
    defaultGlob: "**/*.er.json",
  },
  {
    id: "openapi-renderer",
    title: "API 文件",
    description: "OpenAPI 3.0／3.1 JSON → tag 與 operation 導覽、欄位樹、範例與 cURL",
    defaultGlob: "**/*.openapi.json",
  },
];

export const INSTALL_BASE_CMD = "npx notecraftapp install-plugin";

/** 第三方外掛沒有預設 glob（manifest 沒有這個欄位，Q2），與 install-plugin 沒帶 --apply 時印的範例一致 */
export const FALLBACK_GLOB = "**/*.json";

export function installCmd(p: Pick<OfficialPlugin, "id" | "defaultGlob">): string {
  return `${INSTALL_BASE_CMD} ${p.id} --apply "${p.defaultGlob}"`;
}

export function snippetGlob(id: string): string {
  return OFFICIAL_PLUGINS.find((p) => p.id === id)?.defaultGlob ?? FALLBACK_GLOB;
}

/** `.notecraft/plugins.json` 範例全文：每個外掛一行規則、兩格縮排、結尾換行 */
export function mappingSnippet(ids: readonly string[]): string {
  const rows = ids.map((id) => `    { "plugin": ${JSON.stringify(id)}, "files": [${JSON.stringify(snippetGlob(id))}] }`);
  return `{\n  "plugins": [\n${rows.join(",\n")}\n  ]\n}\n`;
}
