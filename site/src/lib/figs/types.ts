// 文件爆炸圖的組裝稿型別。每一節一份 Fig：由下而上的一疊零件（Layer），零件從 components/fig/parts.tsx 的零件庫挑。
// 換節時，兩份組裝稿裡 id 相同的零件會原地變形（改外框、換內容），其餘的拆下飛出、新的飛入再展開。
// 所以同一種東西在不同節請沿用同一個 id（見 PARTS.md 的「共用 id」）。

export type PartKind =
  | "slab"
  | "window"
  | "browser"
  | "screen"
  | "rail"
  | "sidebar"
  | "list"
  | "board"
  | "table"
  | "timeline"
  | "kpi"
  | "chart"
  | "calendar"
  | "tabs"
  | "palette"
  | "drawer"
  | "modal"
  | "file"
  | "folder"
  | "tree"
  | "terminal"
  | "json"
  | "code"
  | "diff"
  | "flow"
  | "component"
  | "marker"
  | "slides"
  | "chips"
  | "shield"
  | "er"
  | "api"
  | "package"
  | "server"
  | "keys"
  | "progress"
  | "headings"
  | "image"
  | "canvas"
  | "scan"
  | "toggles"
  | "columns"
  | "note";

/** 零件的參數；每種零件只讀自己用得到的欄位（見 PARTS.md）。 */
export type PartProps = {
  /** 數量：列數、頁籤數、節點數、投影片數… */
  n?: number;
  /** 被選中（填深藍）的那一個，從 0 起算；-1 表示沒有 */
  on?: number;
  /** 一小段字：檔名、指令、網址。等角平面上會斜著印，要短（≤ 18 字元） */
  text?: string;
  /** 幾個短字串：按鍵、標籤、欄名 */
  items?: string[];
  /** 零件的變體，各零件自己定義 */
  variant?: string;
  /** 以虛線畫：尚未發生／被擋下 */
  dashed?: boolean;
};

export type Layer = {
  /** 跨節的身分：相同 id 的零件在換節時原地變形 */
  id: string;
  kind: PartKind;
  /** 參照編號：偶數、同一張圖內不重複，由下而上遞增 */
  ref: number;
  /** 符號說明上的名稱 */
  name: string;
  /** 對應的小節錨點（`##`／`###` 標題的 slug）；點編號跳過去。build 時會檢查存在 */
  to?: string;
  /**
   * 這個零件也負責的其他小節錨點：捲到這些段落時它一樣浮起（點它仍跳到 `to`）。
   * 每個 `##` 都要被某個零件的 `to` 或 `also` 涵蓋（爆炸圖取代本頁目錄，不能有到不了的段落）
   */
  also?: string[];
  /** 在底板平面上的範圍 [u0, v0, u1, v1]；省略即整塊底板（320 × 220） */
  box?: [number, number, number, number];
  /** 板厚，只有底板需要（預設 0） */
  slab?: number;
  /** 與下一層的間距倍數（預設 1） */
  gap?: number;
  /** 引線拉到左側或右側（預設右側） */
  side?: "l" | "r";
  /** 「被指認／生成出來的那一塊」：以星芒橙描邊 */
  hl?: boolean;
  /** screen 零件的實機截圖名（public/plates/<shot>.webp） */
  shot?: string;
  p?: PartProps;
};

export type Fig = {
  /** 圖說：FIG. 節號 之後的那句話 */
  caption: string;
  /** 由下而上 */
  layers: Layer[];
};

export const PLANE_W = 320;
export const PLANE_D = 220;
