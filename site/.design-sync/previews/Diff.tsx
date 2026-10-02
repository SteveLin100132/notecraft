import { Page, Diff, Ref } from "notecraft-site";

export const GenerationDiff = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, maxWidth: 520 }}>
      <Diff
        file="notes/guides/oauth/flow.mdx"
        lines={[
          { kind: "ctx", text: "{/* @ai-visualize" },
          { kind: "ctx", text: "id: oauth-flow" },
          { kind: "ctx", text: "type: diagram" },
          { kind: "del", text: "status: pending" },
          { kind: "add", text: "status: generated" },
          { kind: "ctx", text: "*/}" },
          { kind: "add", text: "import OauthFlow from '@notes/components/oauth-flow'" },
          { kind: "add", text: '<GeneratedFrame id="oauth-flow" type="diagram">' },
          { kind: "add", text: "  <OauthFlow client:visible />" },
          { kind: "add", text: "</GeneratedFrame>" },
        ]}
        caption={<><span className="d-new">新檔</span><span className="d-path">.notecraft/components/oauth-flow.tsx <Ref n={54} spaced={false} /></span></>}
      />
    </div>
  </Page>
);
