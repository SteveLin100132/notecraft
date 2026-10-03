// Rail「設定與關於」更新圓點的預繪（規格 docs/notecraft-workbench-update-check.md §7）。
//
// Rail 是 build 期畫完的 .astro，圓點的有無來自 localStorage；WorkbenchLayout 以 inline script 在第一次繪製前設好，
// 換頁時不閃。之後的變化由 UpdateHost 訂閱 store 改同一組屬性。
//
// 函式以 `Function.prototype.toString()` 內嵌進 inline script，所以**必須自足**：
// 不引用模組內其他識別碼、只能 import type、不能有 JSX、不碰 window／localStorage。
// 邏輯與 update-check.ts 的 readCache + railHintOf 相同（scripts/checks/upd-prepaint.mjs 對照兩者）。

export interface RailPrepaint {
  tone: "info" | "major" | "danger";
  label: string;
}

export function railHint(raw: string | null, cur: string): RailPrepaint | null {
  try {
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || typeof c !== "object" || c.cur !== cur) return null;
    const r = c.res;
    if (!r || typeof r !== "object" || r.cur !== cur || typeof r.latest !== "string") return null;
    const deprecated = typeof r.deprecated === "string" && r.deprecated ? r.deprecated : null;
    const level = r.level === "patch" || r.level === "minor" || r.level === "major" ? r.level : null;
    const tone = deprecated ? "danger" : level === "major" ? "major" : level ? "info" : null;
    if (!tone) return null;
    if (c.skipped === r.latest && !deprecated) return null;
    const behind = typeof r.behind === "number" ? r.behind : 0;
    const label = deprecated ? "目前版本 v" + cur + " 已棄用" : "有新版 v" + r.latest + "，落後 " + behind + " 個版本";
    return { tone: tone, label: label };
  } catch (e) {
    return null;
  }
}
