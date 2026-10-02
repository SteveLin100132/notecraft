import { Page, DataTable } from "notecraft-site";

export const Comparison = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <DataTable />
    </div>
  </Page>
);

export const SecondRowSelected = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <DataTable defaultSelected={1} />
    </div>
  </Page>
);
