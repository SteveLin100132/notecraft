import type { ReactNode } from "react";

export type ClaimItem = {
  /** 白話：這一格的標題（22px／800），講一件讀者聽得懂的事。 */
  plain: string;
  /** 法律句型原文，放在「請求項 n」標籤下（15px、ink-2）。 */
  legal: string;
  /**
   * 示意線稿：320×180 座標系裡的 SVG 內容（不含外層 `<svg>`）。
   * 墨線用 class `ca-l`、次要線 `ca-s`、文字 `ca-t`（粗體再加 `ca-t--b`、中文加 `ca-t--s`），
   * 只有「生成的元件」用 `ca-m`（星芒橙）。省略時這格只有文字。
   */
  art?: ReactNode;
  /** 寬格：桌面跨兩欄、文字在左圖在右；1020px 以下不跨欄。 */
  wide?: boolean;
};

export type ClaimsProps = {
  items?: ClaimItem[];
  /** 磚牆後的聲明。借用專利形式就必須保留「並未申請專利」。 */
  note?: string;
};

const DEFAULT_ITEMS: ClaimItem[] = [
  { plain: "你的資料夾原封不動，npx 一行就開。", legal: "一種筆記工作台，讀取使用者既有之 md／mdx 資料夾，不搬移、不轉存，以單一指令啟動。" },
  { plain: "壞掉的元件不會出現在你的筆記裡。", legal: "如請求項 1 所述之工作台，其中元件未通過型別檢查與建置驗證前，不寫回筆記。", wide: true },
  { plain: "GitHub Pages、Netlify 或任何靜態主機都能放。", legal: "如請求項 1 所述之工作台，其輸出為純靜態網站，不依賴執行期 API。" },
];

export const CLAIMS_NOTE = "本頁借用專利說明書的版面形式來介紹功能；NoteCraftApp 是 MIT 授權的開源專案，並未申請專利。";

/**
 * 請求項磚牆：同一張圖紙以 1px 細線分格，桌面三欄、1020px 以下兩欄、640px 以下單欄，上緣 2px 章節線。
 * 每格：示意線稿（在上；寬格在右）→ 窄體大序號（mark-paper）→ 白話標題 →「請求項 n」與法律句型。
 * 磚牆後必有「並未申請專利」的聲明。只放在 paper 上。
 */
export function Claims({ items = DEFAULT_ITEMS, note = CLAIMS_NOTE }: ClaimsProps) {
  return (
    <>
      <ol className="claims">
        {items.map((c, i) => (
          <li className={c.wide ? "claim is-wide" : "claim"} key={i}>
            {c.art && (
              <figure className="ca" aria-hidden="true">
                <svg viewBox="0 0 320 180" className="ca-svg">
                  {c.art}
                </svg>
              </figure>
            )}
            <div className="claim-text">
              <span className="claim-n">{i + 1}.</span>
              <h3 className="claim-plain">{c.plain}</h3>
              <p className="claim-legal">
                <span className="claim-legal-label">請求項 {i + 1}</span>
                {c.legal}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="claims-note">{note}</p>
    </>
  );
}
