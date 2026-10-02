import { Page, CommandTable } from "notecraft-site";

export const CommandList = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, maxWidth: 520 }}>
      <CommandTable />
    </div>
  </Page>
);
