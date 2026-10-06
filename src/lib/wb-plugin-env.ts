// /plugins 的情境模型（規格 docs/notecraft-workbench-plugin-empty-states.md §3）。
// **只能 `import type`、不能有 JSX、不碰 window**：scripts/checks/wb-plugin-env.mjs 以 Node --experimental-strip-types 直接載入做斷言。
// Header 徽章、Sidebar、兩個頁籤的 Toolbar 與 Body 都只看這裡的結果，UI 不自己數規則或外掛。

import type { WbPlugin } from "./wb-types";

/**
 * 為什麼沒有資料檔。`null` = 有資料檔（正常畫面）。
 * - fresh：沒有外掛、沒有 plugins.json
 * - noplugins：有 plugins.json、沒有外掛
 * - disabled：外掛全部停用
 * - nohit：啟用中的外掛有規則，但沒有命中任何檔
 * - nomap：啟用中的外掛都沒有規則
 */
export type PluginReason = null | "fresh" | "noplugins" | "nomap" | "nohit" | "disabled";

export interface PluginEnv {
  reason: PluginReason;
  /** 啟用中外掛的映射規則數（plugins.json 的 plugins[] 條目，不是 glob 數） */
  activeRules: number;
  /** 啟用中外掛的所有 files glob，去重、保留出現順序 */
  activeGlobs: string[];
  enabledCount: number;
}

type EnvPlugin = Pick<WbPlugin, "id" | "enabled" | "mappings">;

/**
 * 判定順序（第一個成立者，§3.2，Q1）：有檔 → 沒外掛 → 全部停用 → 啟用中有規則 → 其餘。
 * 只看**啟用中**的外掛：停用外掛的規則不會執行，算進去會在混合狀態講錯話
 * （A 停用有規則＋B 啟用無規則，不是「有規則但沒命中」）。
 */
export function derivePluginEnv(input: { plugins: readonly EnvPlugin[]; hasConfig: boolean; fileCount: number }): PluginEnv {
  const on = input.plugins.filter((p) => p.enabled);
  const activeRules = on.reduce((a, p) => a + p.mappings.length, 0);
  const activeGlobs: string[] = [];
  for (const p of on) for (const m of p.mappings) for (const g of m.files) if (!activeGlobs.includes(g)) activeGlobs.push(g);
  const base = { activeRules, activeGlobs, enabledCount: on.length };

  let reason: PluginReason;
  if (input.fileCount > 0) reason = null;
  else if (input.plugins.length === 0) reason = input.hasConfig ? "noplugins" : "fresh";
  else if (on.length === 0) reason = "disabled";
  else if (activeRules > 0) reason = "nohit";
  else reason = "nomap";
  return { reason, ...base };
}

/** 單一外掛列的狀態：停用優先，再看有沒有規則、有沒有命中。 */
export type PluginRowState = "ok" | "unmapped" | "nohit" | "off";

export function pluginRowState(p: Pick<WbPlugin, "enabled" | "mappings" | "matched">): PluginRowState {
  if (!p.enabled) return "off";
  if (p.mappings.length === 0) return "unmapped";
  if (p.matched.length === 0) return "nohit";
  return "ok";
}
