// 「本機絕對路徑不得出現在輸出」的純函式（scripts/checks/app-local-path.mjs 直接載入斷言）。
// 只能 import type、不能有 JSX；也不 import node:path —— 要同時處理 POSIX 與 Windows 寫法，不依執行平台。

/** 看起來像本機絕對路徑：`/x`、`~/x`、`C:\x`、`C:/x`、`\\server\share`。 */
export function isLocalAbsPath(s: string): boolean {
  return /^(\/|~[\\/]|~$|[A-Za-z]:[\\/]|\\\\)/.test(s);
}

/**
 * `.installed.json` 的 origin 轉成可以輸出的形式。
 * - GitHub 來源（https://…）原樣
 * - 新格式 `local:<資料夾名>` 原樣
 * - 舊格式（v1.8.2 以前本地安裝寫的是絕對路徑）→ `local:<最後一段>`
 */
export function publicPluginOrigin(origin: string): string {
  const s = origin.trim();
  if (!isLocalAbsPath(s)) return s;
  const name = s.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
  return name && name !== "~" ? `local:${name}` : "local";
}

/**
 * 從一組本機絕對路徑（專案根、notesDir、app 根…）展開成要在輸出裡找的字串：
 * 原樣、正斜線版、以及 JSON 字串裡反斜線被跳脫的版本。太短的（`/`、`C:\`）略過，否則什麼都會命中。
 */
export function localPathNeedles(roots: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of roots) {
    const r = raw.replace(/[\\/]+$/, "");
    if (r.split(/[\\/]/).filter(Boolean).length < 2) continue;
    out.add(r);
    out.add(r.replace(/\\/g, "/"));
    if (r.includes("\\")) out.add(r.replace(/\\/g, "\\\\"));
  }
  return [...out];
}

/**
 * 找出內容裡的本機路徑。`vscode://file/<絕對路徑>` 是 dev-only 的唯一例外 —— 正式 build 不該有，
 * 但 dev 產生的頁面若被拿來掃，不算違規。回傳第一個命中的 needle 與前後片段；沒有則 null。
 */
export function findLocalPath(content: string, needles: readonly string[]): { needle: string; excerpt: string } | null {
  for (const needle of needles) {
    let from = 0;
    for (;;) {
      const i = content.indexOf(needle, from);
      if (i < 0) break;
      from = i + needle.length;
      const before = content.slice(Math.max(0, i - 20), i);
      if (/vscode:\/\/file\/?$/.test(before)) continue;
      return { needle, excerpt: content.slice(Math.max(0, i - 40), i + needle.length + 40) };
    }
  }
  return null;
}
