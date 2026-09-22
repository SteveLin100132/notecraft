// 給 Claude Code 對話用的範本字串（client-safe）。
// 路徑一律用 `promptPath`（相對專案根的真實路徑，見 src/lib/workbench.ts）——
// 舊版寫死 `src/content/notes/${slug}.mdx`，對子資料夾、`.md` 副檔名、viewer 使用者的資料夾都是錯的。

export function buildRegeneratePrompt({ promptPath, pendingIds }: { promptPath: string; pendingIds: string[] }): string {
  return (
    `請使用 content-visualize-skill 重新處理 ${promptPath} 內的 @ai-visualize 標記區塊（${pendingIds.join(", ")}），` +
    `依 note-scanner → visualize-planner → component-generator → mdx-writer 流程生成元件並回寫 MDX。`
  );
}

/**
 * 刻意**不列舉版型、也不寫輸出路徑** —— 兩者都由 content-present Skill 定義：
 * 版型詞彙會隨改制變動，輸出路徑主專案與 viewer 不同（Skill 的 viewer 版由 sync-skill-template 改寫）。
 */
export function buildDeckPrompt({ promptPath }: { promptPath: string }): string {
  return `請依 content-present Skill 把 ${promptPath} 轉成 16:9 簡報，沿用筆記中既有的 @ai-visualize 互動元件。`;
}

/** 複製到剪貼簿；成功回 true。失敗時發 Toast，不 throw。 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg: "無法複製，請檢查瀏覽器權限", icon: "x" } }));
    return false;
  }
}

export function toast(msg: string, icon = "check"): void {
  window.dispatchEvent(new CustomEvent("nc-toast", { detail: { msg, icon } }));
}
