// 工作台內部連結的單一來源（client-safe）。
import { withBase } from "@/lib/base";
// Rail、Sidebar、Palette、各頁的返回鍵都從這裡取，路由調整時只改這一處。

/** 資料夾路徑 → /notes 的篩選網址。值是真實路徑、不是 slug。 */
export function notesFolderHref(folderPath: string): string {
  return withBase(folderPath ? `/notes?folder=${encodeURIComponent(folderPath)}` : "/notes");
}

/** 資料檔所在資料夾 → 列表頁。根目錄用保留字 `_root`（資料夾名不會以底線開頭的 `_root` 命名衝突機率極低，且僅此一處）。 */
export const DATA_ROOT_SEGMENT = "_root";

export const ROUTES = {
  home: withBase("/"),
  notes: withBase("/notes"),
  aiQueue: withBase("/notes?pending=1"),
  series: withBase("/series"),
  tags: withBase("/tags"),
  plugins: withBase("/plugins"),
  settings: withBase("/settings"),
} as const;

export function dataFolderHref(dir: string): string {
  return withBase(dir === "" ? `/plugins/folder/${DATA_ROOT_SEGMENT}` : `/plugins/folder/${dir.split("/").map(encodeURIComponent).join("/")}`);
}
