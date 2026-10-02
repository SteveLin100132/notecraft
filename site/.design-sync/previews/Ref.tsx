import { Page, Ref } from "notecraft-site";

export const InlineOnPaper = () => (
  <Page tone="paper" hideRunningHead>
    <p style={{ paddingTop: 24, maxWidth: "36em" }}>
      筆記<Ref n={52} />、生成元件<Ref n={54} />、plugin 與系列設定<Ref n={56} /> 都是純文字檔；元件也能原樣搬進放大畫布與簡報<Ref n="62、64" />。
    </p>
  </Page>
);

export const InlineOnSheet = () => (
  <Page tone="sheet" hideRunningHead>
    <p style={{ paddingTop: 24, maxWidth: "36em" }}>
      同一個元件：筆記內嵌<Ref n={60} />、放大畫布<Ref n={62} />、簡報<Ref n={64} />，互動都還在。
    </p>
  </Page>
);
