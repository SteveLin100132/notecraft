import { Page, FolderTree } from "notecraft-site";

export const ProjectTree = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <FolderTree
        root={{
          name: "my-project/", ref: 50,
          children: [
            { name: "notes/", ref: 52, children: [{ name: "guides/oauth/flow.mdx" }, { name: "http-caching.mdx" }, { name: "schema.er.json" }] },
            { name: ".notecraft/", children: [{ name: "components/oauth-flow.tsx", ref: 54 }, { name: "plugins.json · series.json", ref: 56 }] },
            { name: ".claude/ skills · agents", ref: 58 },
          ],
        }}
      />
    </div>
  </Page>
);
