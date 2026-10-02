import { Page, Lead, Ref } from "notecraft-site";

export const Abstract = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 32 }}>
      <Lead variant="abstract">
        給寫技術筆記的人用的工作台<Ref n={12} />。一行 npx 就能讀你現有的 md／mdx 資料夾<Ref n={10} />；在筆記裡用 <code>@ai-visualize</code> 描述想要的圖，Claude Code 會生成 React 互動元件<Ref n={16} />，寫回你的 repo。
      </Lead>
    </div>
  </Page>
);

export const SheetLead = () => (
  <Page tone="sheet" folio="圖頁 4／4">
    <div style={{ paddingTop: 32 }}>
      <Lead>2026-07-14 第一次發佈，到 2026-10-01 共 32 個版本。每一版都記在 repo 的 CHANGELOG.md。</Lead>
    </div>
  </Page>
);
