import { Page, TopNav, RunningHead } from "notecraft-site";

export const HeroNav = () => (
  <Page tone="sheet" hideRunningHead>
    <TopNav homeHref="/notecraft/" />
    <div className="runhead--hero">
      <RunningHead folio="圖頁 1／4" />
    </div>
  </Page>
);
