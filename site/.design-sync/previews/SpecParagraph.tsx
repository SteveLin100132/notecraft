import { Spec, SpecParagraph, Ref } from "notecraft-site";

export const NumberedParagraphs = () => (
  <Spec>
    <SpecParagraph n={6}>
      在 AI 時代，文件最好的位置是 repo<Ref n={50} />。筆記<Ref n={52} />、生成元件<Ref n={54} />都是純文字檔，放在同一個 git repo 裡。
    </SpecParagraph>
    <SpecParagraph n={7}>
      <code>npx notecraftapp init-skill</code> 會把需要的 skill 與 subagent 裝進 <code>.claude/</code><Ref n={58} />。
    </SpecParagraph>
    <SpecParagraph n={8}>這是一次生成在 git 裡留下的樣子：筆記裡改了 status、多了 import 和外框，元件是一個新檔。</SpecParagraph>
  </Spec>
);
