// 工作台內部連結的單一來源（client-safe）。
// Rail、Sidebar、Palette、各頁的返回鍵都從這裡取，路由調整時只改這一處。

/** 資料夾路徑 → /notes 的篩選網址。值是真實路徑、不是 slug。 */
export function notesFolderHref(folderPath: string): string {
  return folderPath ? `/notes?folder=${encodeURIComponent(folderPath)}` : "/notes";
}

/** 資料檔所在資料夾 → 列表頁。根目錄用保留字 `_root`（資料夾名不會以底線開頭的 `_root` 命名衝突機率極低，且僅此一處）。 */
export const DATA_ROOT_SEGMENT = "_root";

export const ROUTES = {
  home: "/",
  notes: "/notes",
  aiQueue: "/notes?pending=1",
  series: "/series",
  tags: "/tags",
  plugins: "/plugins",
  settings: "/settings",
} as const;

export function dataFolderHref(dir: string): string {
  return dir === "" ? `/plugins/folder/${DATA_ROOT_SEGMENT}` : `/plugins/folder/${dir.split("/").map(encodeURIComponent).join("/")}`;
}
