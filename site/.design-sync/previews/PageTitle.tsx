import { Page, PageTitle } from "notecraft-site";

export const DisplayOnSheet = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 40 }}>
      <PageTitle size="display" level={1} lines={["筆記放進 git，", "圖由 AI 畫成元件。"]} />
    </div>
  </Page>
);

export const HeadlineOnSheet = () => (
  <Page tone="sheet" folio="圖頁 2／4">
    <div style={{ paddingTop: 40 }}>
      <PageTitle lines={["一段描述，", "一個能操作的元件。"]} />
    </div>
  </Page>
);

export const HeadlineOnPaper = () => (
  <Page tone="paper" folio="第 4 頁">
    <PageTitle lines={["它做得到的事，", "逐條列出。"]} />
  </Page>
);

export const Closing = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <PageTitle size="closing" lines={["從你現有的", "資料夾開始。"]} />
    </div>
  </Page>
);
