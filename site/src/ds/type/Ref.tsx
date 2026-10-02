export type RefProps = {
  /** 參照編號：偶數，依圖分段（FIG. 1 是 10–20、FIG. 2 是 30–40…）；可寫「62、64」並列。 */
  n?: number | string;
  /** 編號前是否留一個空白。行內寫法是「工作台 12」，所以預設 true；放在清單欄位裡時設 false。 */
  spaced?: boolean;
};

/**
 * 參照編號：全站唯一的訊號色。藍底用 mark、白底用 mark-paper，由所在的紙自動決定。
 * 每個出現在頁面的編號都必須在 Legend（符號說明）裡有一項。
 */
export function Ref({ n = 12, spaced = true }: RefProps) {
  return (
    <span className="ref">
      {spaced ? " " : ""}
      {n}
    </span>
  );
}
