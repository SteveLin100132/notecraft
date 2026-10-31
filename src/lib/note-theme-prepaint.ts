// 筆記頁主題與字級的預繪（docs/notecraft-workbench-note-page.md §4.3）。
// 以 toString() 內嵌進 #nc-scroll 開頭的 inline script，在第一次繪製前把 np-d／np-o 與 --md-fs 換好：
// **必須自足**（不引用模組內的其他名稱、不 import 值），check:wb 會以 new Function 重建後斷言。
// 讀的是 wb-prefs.ts 的同一個 key；夾值規則必須與 readPrefs() 相同（scripts/checks/note-theme-prepaint.mjs 對照）。

export type NotePaint = { theme: "brand" | "classic"; scale: number };

export function notePaint(raw: string | null): NotePaint {
  var scales = [0.9, 1, 1.1, 1.2, 1.25];
  var out: NotePaint = { theme: "brand", scale: 1 };
  try {
    var o = JSON.parse(raw || "{}");
    if (!o || typeof o !== "object") return out;
    if (o.noteTheme === "classic") out.theme = "classic";
    if (typeof o.noteFontScale === "number" && scales.indexOf(o.noteFontScale) >= 0) out.scale = o.noteFontScale;
  } catch (e) {
    /* 壞掉的 JSON 一律當作沒有偏好 */
  }
  return out;
}

/** 把偏好套到捲動容器上（預繪與偏好變更共用） */
export function applyNotePaint(el: HTMLElement, p: NotePaint): void {
  el.classList.toggle("np-d", p.theme !== "classic");
  el.classList.toggle("np-o", p.theme === "classic");
  if (p.scale === 1) el.style.removeProperty("--md-fs");
  else el.style.setProperty("--md-fs", (16 * p.scale).toFixed(1) + "px");
}
