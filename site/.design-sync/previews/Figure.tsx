import { Page, Figure, FolderTree, FlowSteps, Ref } from "notecraft-site";

export const OnSheet = () => (
  <Page tone="sheet" hideRunningHead>
    <div style={{ paddingTop: 24 }}>
      <Figure n={3} caption="一個專案就是一份文件：全部是文字檔，全部在 git 裡。">
        <FolderTree />
      </Figure>
    </div>
  </Page>
);

export const OnPaper = () => (
  <Page tone="paper" hideRunningHead>
    <div style={{ paddingTop: 24, maxWidth: 420 }}>
      <Figure n={5} caption={<>四個 subagent 依序處理一個標記<Ref n={30} />，驗證未過不寫回。</>}>
        <FlowSteps />
      </Figure>
    </div>
  </Page>
);
