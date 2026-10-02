import { Page, Logo } from "notecraft-site";

export const WithName = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <Logo />
    </div>
  </Page>
);

export const MarkOnPaper = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, display: "flex", gap: 24, alignItems: "center" }}>
      <Logo withName={false} size={48} />
      <Logo size={28} />
    </div>
  </Page>
);
