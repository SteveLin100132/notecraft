// 程式碼 token 的色彩對照（Task 38）。
//
// `DeckThemeTokens` 沒有程式碼色 —— 它是為版面設計的（ink / body / muted / brand…），
// 硬塞 9 個語法類別進去會讓那個型別失焦。故獨立成本檔。
//
// **亮色一律對齊 global.css 的 `.nc-cb__t--*`**（筆記內文用的那套）——
// 同一份內容在筆記與簡報裡看起來必須是同一套色。
// **暗色是新配的**（筆記端沒有暗色），對比值見下方註解。

import type { CodeTokenCat } from "@/lib/code-tokenize";

export interface CodeTokenStyle {
  color: string;
  fontStyle?: "italic";
  fontWeight?: number;
}

/**
 * 亮色：逐項對齊 `global.css` 的 `.nc-cb__t--*`（勿單方面改動，會與筆記內文脫鉤）。
 *
 * 對比（on #ffffff）：plain 13.63、keyword 7.94、number 5.79、func 5.18、attr 4.89、
 * type 3.99、string 3.38、comment / punct 2.46。
 *
 * ⚠️ comment / punct 的 2.46:1 是**沿用筆記端的既有值**。在螢幕上（近距離、深色文字為主體）
 * 可接受，但投影片是遠距觀看 —— 若實測發現註解在投影環境讀不到，
 * 解法是把**筆記與簡報一起**升到 `--neutral-500`（4.41:1），而不是只改簡報這一邊。
 * 見 Task 38 實作記錄。
 */
const LIGHT: Record<CodeTokenCat, CodeTokenStyle> = {
  comment: { color: "var(--neutral-400)", fontStyle: "italic" },
  string: { color: "var(--success-500)" },
  number: { color: "var(--orange-700)" },
  keyword: { color: "var(--blue-700)", fontWeight: 600 },
  func: { color: "var(--blue-500)" },
  type: { color: "var(--orange-600)" },
  attr: { color: "var(--sky-600)" },
  punct: { color: "var(--neutral-400)" },
  plain: { color: "var(--neutral-800)" },
};

/**
 * 暗色：亮色的鏡像（同色相、明度反轉），維持「這兩個模式是同一套配色」的認知。
 *
 * 對比（on `dkt(dark).codeSurface` = 22% 黑疊在 #262e3d 上 ≈ #1d232e）**全部 ≥ 5.6:1**：
 * plain 12.58、number 10.51、func 9.16、type 8.89、string 7.34、comment / punct 6.40、
 * keyword 6.24、attr 5.63。
 *
 * 註：`codeSurface` 是為此新增的 token（theme.ts）。原本沿用 `sunken`（5% 白）時，
 * 卡片被提亮到 #313847，attr 只有 4.20:1 —— 改成比投影片更深的內嵌卡才全數過關。
 *
 * 註：keyword↔func（1.47:1）與 number↔type（1.18:1）彼此相近 —— 這與亮色的情況相同
 * （blue-700↔blue-500、orange-700↔orange-600），是刻意的色相分群：
 * 讀者要分辨的是「藍系＝語言結構 / 橘系＝型別與字面量」，不是每個類別各自一色。
 * keyword 另有 600 字重輔助。
 */
const DARK: Record<CodeTokenCat, CodeTokenStyle> = {
  comment: { color: "var(--neutral-400)", fontStyle: "italic" },
  string: { color: "var(--success-300)" },
  number: { color: "var(--orange-200)" },
  keyword: { color: "var(--blue-300)", fontWeight: 600 },
  func: { color: "var(--blue-200)" },
  type: { color: "var(--orange-300)" },
  attr: { color: "var(--sky-400)" },
  punct: { color: "var(--neutral-400)" },
  plain: { color: "var(--neutral-200)" },
};

export const codeTone = (dark: boolean): Record<CodeTokenCat, CodeTokenStyle> => (dark ? DARK : LIGHT);
