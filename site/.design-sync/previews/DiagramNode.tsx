import { Page, DiagramNode } from "notecraft-site";

export const States = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, maxWidth: 380, display: "grid", gap: 12 }}>
      <DiagramNode name="note-scanner" meta="未開始" state="idle" />
      <DiagramNode name="visualize-planner" meta="已完成" state="done" />
      <DiagramNode name="component-generator" meta="進行中" state="active" />
      <DiagramNode name="mdx-writer" meta="被擋下" state="blocked" />
    </div>
  </Page>
);
