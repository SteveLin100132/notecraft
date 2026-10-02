import { Page, PageTitle, Lead, Spec, SpecHeading, SpecParagraph, Ref } from "notecraft-site";

export const SheetPage = () => (
  <Page tone="sheet" folio="圖頁 2／4">
    <div className="sheet-head">
      <PageTitle lines={["一段描述，", "一個能操作的元件。"]} />
      <Lead>標記寫在筆記裡要放圖的位置。處理完，標記下方多了一行 import 和一行 JSX，status 改成 generated。</Lead>
    </div>
  </Page>
);

export const PaperPage = () => (
  <Page tone="paper" folio="第 1 頁">
    <PageTitle lines={["文字講不清楚的，", "就讓讀者自己操作。"]} />
    <Spec>
      <SpecHeading>【技術領域】</SpecHeading>
      <SpecParagraph n={1}>本工作台用於撰寫與閱讀技術筆記：流程、比較、架構、策略，這些只用文字很難講清楚的知識。</SpecParagraph>
      <SpecHeading>【內容】</SpecHeading>
      <SpecParagraph n={4}>
        筆記留在你的 git repo<Ref n={10} />。在需要圖的地方寫一段 <code>@ai-visualize</code> 標記<Ref n={30} />，作者在本機的 Claude Code 對話裡處理它，生成一個 React 元件<Ref n={16} />。
      </SpecParagraph>
    </Spec>
  </Page>
);
