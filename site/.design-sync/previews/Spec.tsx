import { Spec, SpecHeading, SpecParagraph, Ref } from "notecraft-site";

export const SpecSections = () => (
  <Spec>
    <SpecHeading>【技術領域】</SpecHeading>
    <SpecParagraph n={1}>本工作台用於撰寫與閱讀技術筆記：流程、比較、架構、策略，這些只用文字很難講清楚的知識。</SpecParagraph>
    <SpecHeading>【先前技術】</SpecHeading>
    <SpecParagraph n={2}>傳統筆記工具只能顯示文字。想把一段流程講清楚、把兩個方案並排比較，只能貼一張靜態圖，或附一個連結。</SpecParagraph>
    <SpecParagraph n={3}>靜態圖會過時、改不動、也不能互動；而存在雲端服務裡的筆記，離開那個服務就讀不到，AI agent 也碰不到。</SpecParagraph>
    <SpecHeading>【內容】</SpecHeading>
    <SpecParagraph n={4}>
      筆記留在你的 git repo<Ref n={10} />。元件是原始碼，跟筆記一起 commit，也能原樣搬進放大畫布與簡報<Ref n="62、64" />。
    </SpecParagraph>
  </Spec>
);

export const SpecEmbodiment = () => (
  <Spec>
    <SpecHeading>【實施例一】在本機閱讀與寫作</SpecHeading>
    <SpecParagraph n={9}><code>view</code> 開 Astro dev server：新增、編輯、刪除筆記即時反映，標籤可以直接在頁面上改。</SpecParagraph>
    <SpecParagraph n={10}><code>serve</code> 服務 build 好的靜態站，背景 rebuild 並自動重新整理。</SpecParagraph>
  </Spec>
);
