/**
 * 站台部署在子路徑時的前綴（例：GitHub Pages 的 /notecraft/demo）。
 *
 * 來源是 astro.config 的 `base`（由環境變數 NOTECRAFT_BASE 決定，預設 "/"），
 * Vite 在 server 與 client bundle 都會把 import.meta.env.BASE_URL 換成字面值。
 * 站內連結一律經 withBase() 組出；拿 location.pathname 做比對前先 stripBase()。
 * 兩個函式都是冪等的：已帶前綴的路徑不會被加第二次。
 */

const RAW = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

/** 不含結尾斜線的前綴；根目錄部署時是空字串。 */
export const BASE: string = RAW === "/" ? "" : RAW.replace(/\/+$/, "");

/** 站內絕對路徑（`/` 開頭、非 `//host`）加上前綴；其他字串原樣回傳。 */
export function withBase(p: string): string {
  if (!BASE || !p.startsWith("/") || p.startsWith("//")) return p;
  if (p === BASE || p.startsWith(BASE + "/") || p.startsWith(BASE + "?") || p.startsWith(BASE + "#")) return p;
  return BASE + p;
}

/** 把瀏覽器的 pathname 還原成不含前綴的站內路徑，供路由比對。 */
export function stripBase(pathname: string): string {
  if (!BASE) return pathname;
  if (pathname === BASE) return "/";
  if (pathname.startsWith(BASE + "/")) return pathname.slice(BASE.length);
  return pathname;
}
