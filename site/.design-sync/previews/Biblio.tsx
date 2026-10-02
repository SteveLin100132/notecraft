import { Page, Biblio } from "notecraft-site";

export const HeroFields = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <Biblio fields={[{ label: "名稱", value: "NoteCraftApp" }, { label: "版本", value: "1.7.0" }, { label: "授權", value: "MIT" }, { label: "套件", value: "notecraftapp" }]} />
    </div>
  </Page>
);
