import { Page, Button } from "notecraft-site";

export const OnSheet = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Button href="#demo" arrow>進入 Demo 工作台</Button>
      <Button href="#github">GitHub</Button>
      <Button href="#npm">npm</Button>
    </div>
  </Page>
);

export const OnPaper = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Button>上一步</Button>
      <Button arrow>下一步</Button>
    </div>
  </Page>
);
