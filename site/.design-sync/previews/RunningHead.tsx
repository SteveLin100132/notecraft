import { Page, RunningHead } from "notecraft-site";

export const OnPaper = () => (
  <Page tone="paper" hideRunningHead>
    <RunningHead folio="第 2 頁" />
  </Page>
);

export const OnSheet = () => (
  <Page tone="sheet" hideRunningHead>
    <RunningHead folio="圖頁 3／4" />
  </Page>
);
