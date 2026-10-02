import { Page, FlowSteps } from "notecraft-site";

export const InProgress = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, maxWidth: 420 }}>
      <FlowSteps label="四個 subagent 的流程" />
    </div>
  </Page>
);

export const BlockedAtWriteBack = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, maxWidth: 420 }}>
      <FlowSteps
        label="驗證未過的流程"
        steps={[
          { name: "note-scanner", meta: "找出標記", state: "done" },
          { name: "visualize-planner", meta: "規劃方案", state: "done" },
          { name: "component-generator", meta: "驗證未過", state: "active" },
          { name: "mdx-writer", meta: "不寫回", state: "blocked" },
        ]}
      />
    </div>
  </Page>
);
