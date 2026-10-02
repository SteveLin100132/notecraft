export type TreeNode = {
  name: string;
  /** 這個節點的參照編號。 */
  ref?: number | string;
  children?: TreeNode[];
};

export type FolderTreeProps = {
  root?: TreeNode;
  label?: string;
};

const DEFAULT_ROOT: TreeNode = {
  name: "my-project/",
  ref: 50,
  children: [
    { name: "notes/", ref: 52, children: [{ name: "guides/oauth/flow.mdx" }, { name: "schema.er.json" }] },
    { name: ".notecraft/", children: [{ name: "components/oauth-flow.tsx", ref: 54 }] },
    { name: ".claude/ skills · agents", ref: 58 },
  ],
};

function Branch({ node }: { node: TreeNode }) {
  return (
    <li>
      <span className="tree-name">{node.name}</span>
      {node.ref != null && <span className="ref">{node.ref}</span>}
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Branch key={c.name} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** 資料夾樹：等寬字、半透白枝線，節點後可接參照編號。只放在 sheet 上（枝線是 line-soft）。 */
export function FolderTree({ root = DEFAULT_ROOT, label = "專案資料夾結構" }: FolderTreeProps) {
  return (
    <ul className="tree" aria-label={label}>
      <Branch node={root} />
    </ul>
  );
}
