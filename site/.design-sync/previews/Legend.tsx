import { Page, Legend } from "notecraft-site";

export const Sidebar = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <Legend
        items={[
          { n: 10, name: "你的 git repo" }, { n: 12, name: "三欄工作台" }, { n: 14, name: "筆記" },
          { n: 16, name: "生成元件" }, { n: 18, name: "筆記頁籤" }, { n: 20, name: "⌘K 指令面板" },
          { n: 30, name: "標記開頭" }, { n: 32, name: "id" }, { n: 34, name: "type" },
          { n: 36, name: "prompt" }, { n: 38, name: "status" }, { n: 40, name: "寫回的 JSX" },
        ]}
      />
    </div>
  </Page>
);
