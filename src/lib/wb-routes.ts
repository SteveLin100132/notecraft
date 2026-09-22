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
  /** Task 70 之前暫時指向舊的資料檔列表頁 */
  plugins: "/view",
  /** Task 73 之前暫時指向舊的關於頁 */
  settings: "/about",
} as const;

export function dataFolderHref(_dir: string): string {
  // Task 70 之前還沒有 /plugins/folder/*，先一律回到資料檔列表
  return ROUTES.plugins;
}
