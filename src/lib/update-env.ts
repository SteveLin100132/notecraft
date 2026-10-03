// 檢查更新的 build 期環境（server only；規格 docs/notecraft-workbench-update-check.md §8）。
// WorkbenchLayout（UpdateHost）與 settings.astro（SettingsView）共用，三個值都是 build／dev 期字串，不含本機路徑。
import pkg from "../../package.json";
import { repoBlobBaseOf } from "./update-check";
import type { UpdEnv } from "./update-store";

export function updEnv(appVersion: string): UpdEnv {
  return {
    cur: appVersion,
    // 專案沒有 @types/node：經 globalThis 取，不新增 tsc 錯誤
    userNode: (globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node ?? "",
    repoBlobBase: repoBlobBaseOf((pkg as { repository?: { url?: string } }).repository?.url),
  };
}
