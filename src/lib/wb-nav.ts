// 換頁轉場的分類（規格 docs/notecraft-workbench-loading-transitions.md §5.2）。
//
// 這兩個函式會以 `Function.prototype.toString()` 內嵌進 WorkbenchLayout 的 inline script
// （pagereveal 必須在第一次繪製前處理，不能等模組載入）。所以：
// **每個函式必須自足**：不引用模組內其他識別碼、不用 TS 專屬語法以外的東西（型別註記會被 Vite 拿掉）；
// 只能 import type、不能有 JSX、不碰 window（scripts/checks/wb-nav.mjs 直接載入斷言）。

export type NavKind = "hub" | "leaf" | "none";
export type VtType = "peer" | "drill" | "section";

/** 路徑屬於哪一類：hub（列表、頂層頁）、leaf（筆記、資料檔）、none（簡報與其他，不轉場）。 */
export function navKind(pathname: string, base: string): NavKind {
  let p = pathname;
  if (base && (p === base || p.startsWith(base + "/"))) p = p.slice(base.length) || "/";
  try {
    p = decodeURI(p);
  } catch {
    /* 壞編碼就用原字串 */
  }
  p = p.replace(/\/+$/, "") || "/";
  if (/^\/(?:notes|plugins|settings|series|tags)?$/.test(p)) return "hub";
  if (/^\/(?:plugins\/folder|series)\/./.test(p)) return "hub";
  if (/^\/(?:notes|view)\/./.test(p)) return "leaf";
  return "none";
}

/**
 * from → to 的轉場 type。`from`／`to` 可以是完整網址或路徑；不同源、任一端是 none、沒有來源 → null（不轉場）。
 * 任何 → hub = section；hub → leaf = drill；leaf → leaf = peer。
 */
export function vtType(from: string | null, to: string, base: string): VtType | null {
  if (!from) return null;
  const kind = (pathname: string): string => {
    let p = pathname;
    if (base && (p === base || p.startsWith(base + "/"))) p = p.slice(base.length) || "/";
    try {
      p = decodeURI(p);
    } catch {
      /* 壞編碼就用原字串 */
    }
    p = p.replace(/\/+$/, "") || "/";
    if (/^\/(?:notes|plugins|settings|series|tags)?$/.test(p)) return "hub";
    if (/^\/(?:plugins\/folder|series)\/./.test(p)) return "hub";
    if (/^\/(?:notes|view)\/./.test(p)) return "leaf";
    return "none";
  };
  let a: URL;
  let b: URL;
  try {
    b = new URL(to, "http://nc.invalid");
    a = new URL(from, b);
  } catch {
    return null;
  }
  if (a.origin !== b.origin) return null;
  const f = kind(a.pathname);
  const t = kind(b.pathname);
  if (f === "none" || t === "none") return null;
  if (t === "hub") return "section";
  return f === "hub" ? "drill" : "peer";
}
