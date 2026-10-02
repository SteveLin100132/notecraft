import { Page, CommandBar, Button } from "notecraft-site";

export const HeroActions = () => (
  <Page tone="sheet" hideRunningHead>
    <div className="hero-actions" style={{ paddingTop: 24 }}>
      <CommandBar />
      <Button href="#demo" arrow>進入 Demo 工作台</Button>
    </div>
  </Page>
);

export const InitSkill = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <CommandBar command="npx notecraftapp init-skill" />
    </div>
  </Page>
);
