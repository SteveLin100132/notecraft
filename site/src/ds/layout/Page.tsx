import type { ReactNode } from "react";
import { DOC_NAME, ToneContext, type Tone } from "../tone";
import { RunningHead } from "./RunningHead";

export type PageProps = {
  /** 紙的種類：`sheet` 深藍圖頁、`paper` 白色說明頁。依頁序交替。 */
  tone?: Tone;
  /** 頁眉右側的頁序。圖頁寫「圖頁 n／4」，說明頁寫「第 n 頁」；省略時依 tone 給第一頁。 */
  folio?: string;
  /** 頁眉左側的文件名。 */
  docName?: string;
  /** 不畫頁眉（只有首頁 hero 把頁眉放在導覽下方時才用）。 */
  hideRunningHead?: boolean;
  id?: string;
  children?: ReactNode;
};

/**
 * 一頁說明書：滿版的 sheet 或 paper 區塊，內容限寬 1360px、左右 gutter，頂端是頁眉。
 * 區塊底色只有這兩種紙，依頁序交替（兩種紙規則）。子元件會依所在的紙自動換色。
 */
export function Page({ tone = "paper", folio, docName = DOC_NAME, hideRunningHead = false, id, children }: PageProps) {
  const page = folio ?? (tone === "sheet" ? "圖頁 1／4" : "第 1 頁");
  return (
    <ToneContext.Provider value={tone}>
      <section className={tone} id={id}>
        <div className="wrap">
          {!hideRunningHead && <RunningHead docName={docName} folio={page} />}
          {children}
        </div>
      </section>
    </ToneContext.Provider>
  );
}
