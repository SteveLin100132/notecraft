// NoteCraft 工作台 — 示範筆記：進階語法（MDX 擴充）
(() => {
const { H, C, Fn, Fns, Tip, Ref, Code, Adm, Tabs, Def, Inc, Det, Steps } = window.NPMD;
const GA_REF = `:::define{#nc.syntax-define}
**定義區塊**：以 id 宣告一段可被其他筆記引用的內容。
:::

員工到職滿半年取得:ref[特別休假]{#hr.term-annual-leave}。

::include{#hr.rule-settlement}`;
const GA_ADM = `:::tip
在「假勤設定」開啟提前提醒。
:::

:::warn{fold="closed" title="系統升級注意事項"}
v2.3 起申請最小單位改為 1 小時。
:::`;
const GA_NPM = `npm install notecraft
npx notecraft dev`;
const GA_PNPM = `pnpm add notecraft
pnpm notecraft dev`;
const GA_JSON = `{
  "scripts": {
    "dev": "notecraft dev",
    "build": "notecraft build"
  }
}`;
const GA_ANN = `export default defineConfig({
  contentDir: "src/content/notes",
  toc: { minLevel: 2, maxLevel: 3 },
  defines: { scope: "site" },
  visualize: { outDir: "src/components/generated" },
});`;

function NcAdvancedBody() {
  return (
    <>
      <div className="md-flow">
        <p>NoteCraft 以 MDX 擴充標準 Markdown。本篇逐一示範這些語法的寫法與渲染結果；基本語法請見上一章「Markdown 基本語法」，互動元件請見下一章「視覺化互動元件」。</p>

        <H id="a-tip">提示文字</H>
        <p>以 <C>:tip[文字]{"{d=\"說明\"}"}</C> 為名詞加上滑鼠停留說明，例如<Tip t="檔案開頭以 --- 包住的 YAML，記錄標題、標籤與狀態。">frontmatter</Tip>與<Tip t="由檔名產生的網址片段。">slug</Tip>。適合不值得獨立成定義的短說明。</p>

        <H id="a-ref">定義與引用</H>
        <p>同一個名詞在多篇筆記出現時，只在一處用 <C>:::define</C> 宣告，其他地方以 id 引用。修改定義時只改來源，所有引用處會同步更新。</p>
        <Code lang="md" label="mdx" code={GA_REF} />
        <H lv={3} id="a-define">宣告定義</H>
        <p>宣告後，左側會出現定義標記，上方顯示 id 與被引用的篇數：</p>
        <Def id="nc.syntax-define">
          <p><strong>定義區塊</strong>：以 id 宣告一段可被其他筆記引用的內容。id 在全站唯一，建議以領域作為前綴，例如 <C>hr.</C> 或 <C>nc.</C>。</p>
        </Def>
        <H lv={3} id="a-inline-ref">行內引用</H>
        <p>以 <C>:ref</C> 在句子中引用定義，滑鼠停留顯示摘要，點擊前往來源。例如：每位<Ref id="hr.role-employee">員工</Ref>到職滿六個月後取得<Ref id="hr.term-annual-leave">特別休假</Ref>，兩個定義都來自「特休假規格與計算」。</p>
        <H lv={3} id="a-include">嵌入定義</H>
        <p>需要完整呈現定義內容時，以 <C>::include</C> 整段嵌入，並保留前往來源的連結：</p>
        <Inc id="hr.rule-settlement">
          <p>年度結算日當天，系統會鎖定所有員工的特休餘額，並產生「未休特休折發清冊」供薪資計算使用。勞雇雙方若協商遞延，遞延的時數須於次一年度內休完。</p>
        </Inc>

        <H id="a-adm">提示框</H>
        <p>以 <C>:::note</C>、<C>:::tip</C>、<C>:::warn</C>、<C>:::danger</C> 四種類型區分重要程度。</p>
        <Adm k="note"><p>備註：補充背景資訊，讀者略過也不影響理解。</p></Adm>
        <Adm k="tip"><p>提示：可以讓事情更順利的做法，例如以 <kbd>⌘</kbd> <kbd>K</kbd> 搜尋定義 id。</p></Adm>
        <Adm k="warn"><p>注意：容易出錯的地方，例如 id 重複時建置會失敗。</p></Adm>
        <Adm k="danger"><p>警告：會造成資料遺失或無法還原的操作。</p></Adm>
        <H lv={3} id="a-adm-fold">可收合的提示框</H>
        <p>加上 <C>fold</C> 屬性即可收合，<C>open</C> 為預設展開、<C>closed</C> 為預設收合：</p>
        <Adm k="note" fold="open" title="預設展開：定義與提示文字的差別"><p>提示文字只存在於當下這句話；定義則有 id，可以被其他筆記引用與嵌入，也會出現在關聯圖中。</p></Adm>
        <Adm k="warn" fold="closed" title="預設收合：搬移定義的注意事項"><p>把定義搬到另一篇筆記時，id 不需要變更，引用處會自動指向新的來源。</p><ul><li>刪除定義前，先確認被引用篇數為 0</li><li>建置時會列出找不到 id 的引用</li></ul></Adm>
        <Code lang="md" label="mdx" code={GA_ADM} />

        <H id="a-tabs">分頁</H>
        <H lv={3} id="a-tabs-content">內容分頁</H>
        <p>以 <C>:::tabs</C> 包住多個 <C>::tab</C>，每個分頁可放任意 Markdown，包含清單、表格與提示框。</p>
        <Tabs content name="筆記狀態" items={[
          ["已發佈", <>
            <p>預設狀態。筆記出現在列表、搜尋與關聯圖，並計入系列進度。</p>
            <ul><li>frontmatter 不需要寫 <C>status</C></li><li>可以轉成簡報</li></ul>
          </>],
          ["草稿", <>
            <p>以 <C>status: empty</C> 標示，筆記頁顯示新建時的引導畫面。</p>
            <Adm k="tip"><p>草稿不計入系列進度的分母。</p></Adm>
          </>],
          ["即將登場", <>
            <p>以 <C>status: coming-soon</C> 標示，用來預告系列中還沒寫完的章節。</p>
            <div className="md-tw"><table className="md-t"><thead><tr><th>狀態</th><th className="c">列表</th><th className="c">系列進度</th></tr></thead><tbody><tr><td>已發佈</td><td className="c">顯示</td><td className="c">計入</td></tr><tr><td>草稿</td><td className="c">顯示</td><td className="c">不計入</td></tr><tr><td>即將登場</td><td className="c">顯示</td><td className="c">不計入</td></tr></tbody></table></div>
          </>],
        ]} />
        <H lv={3} id="a-tabs-code">程式碼分頁</H>
        <p>分頁裡只有程式碼時，使用 <C>:::code-group</C>，分頁會直接貼合程式碼區塊：</p>
        <Tabs name="安裝方式" items={[
          ["npm", <Code lang="sh" label="bash" code={GA_NPM} />],
          ["pnpm", <Code lang="sh" label="bash" code={GA_PNPM} />],
          ["package.json", <Code lang="json" label="json" code={GA_JSON} />],
        ]} />

        <H id="a-steps">步驟</H>
        <p>以 <C>:::steps</C> 包住有序清單。每一步可以加上說明與狀態，狀態有已完成、進行中、未開始、需處理與已略過五種。</p>
        <Steps label="發佈一篇筆記" items={[
          ["建立檔案", "在 src/content/notes 新增 .mdx 檔，填寫 frontmatter。"],
          ["撰寫內容", "以 H2 切分章節，需要時引用定義或加入互動元件。"],
          ["本機預覽", "執行 notecraft dev，在工作台確認目錄與引用。"],
          ["發佈", "推送到主分支後自動建置。"],
        ]} />
        <p>標上狀態後，可以呈現單一工作的進度：</p>
        <Steps label="建置 #1042 進度" items={[
          ["解析 frontmatter", "42 篇筆記", "done"],
          ["檢查定義引用", "1 個引用找不到 id：hr.term-quota", "err"],
          ["產生視覺化元件", "沒有待生成的標記，略過", "skip"],
          ["建置頁面", "等待上一步修正", "cur"],
          ["部署", null, "todo"],
        ]} />
        <p>加上 <C>dir="h"</C> 改為水平排列，適合 3 到 5 個簡短步驟：</p>
        <Steps dir="h" label="系列進度" items={[
          ["基本語法", "已讀", "done"],
          ["進階語法", "閱讀中", "cur"],
          ["視覺化元件", null, "todo"],
          ["ER 圖", null, "todo"],
        ]} />

        <H id="a-math">數學公式</H>
        <p>以 <C>$$</C> 包住獨立公式，以 <C>$</C> 包住行內公式，語法與 LaTeX 相同。工作台估算閱讀時間的方式如下：</p>
        <div className="md-math">
          <span className="md-math-m" dangerouslySetInnerHTML={{ __html: '<math display="block"><mrow><mi>t</mi><mo>=</mo><mo>⌈</mo><mfrac><mi>w</mi><mn>450</mn></mfrac><mo>⌉</mo><mo>+</mo><mn>0.2</mn><mo>×</mo><msub><mi>n</mi><mtext>viz</mtext></msub></mrow></math>' }} />
          <span className="eq">(1)</span>
        </div>
        <p>其中 <span className="md-math-i" dangerouslySetInnerHTML={{ __html: '<math><mi>w</mi></math>' }} /> 為字數，<span className="md-math-i" dangerouslySetInnerHTML={{ __html: '<math><msub><mi>n</mi><mtext>viz</mtext></msub></math>' }} /> 為互動元件數量，每個元件以 0.2 分鐘計<Fn n={1} />。</p>

        <H id="a-ann">程式碼註解</H>
        <p>在行尾加上 <C>// (1)</C>，並於區塊下方以編號清單撰寫註解。點行尾的編號即可展開對應說明。</p>
        <Code lang="ts" label="TypeScript" file="notecraft.config.ts" code={GA_ANN} ann={[
          [3, <>只有 H2 與 H3 會列入目錄；改為 <C>maxLevel: 4</C> 時，目錄會再多一層。</>],
          [4, <>定義 id 的作用範圍。<C>site</C> 表示全站唯一，跨資料夾也可以引用。</>],
          [5, <>AI 依標記產生的元件會寫入這個資料夾，建議納入版本控制。</>],
        ]} />

        <H id="a-det">摺疊問答</H>
        <p>以 <C>:::details</C> 撰寫常見問題，標題即為問題，預設收合，可加上 <C>open</C> 預設展開。</p>
        <div className="md-dets">
          <Det q="定義可以引用其他定義嗎？" open><p>可以。定義內容中的 <C>:ref</C> 會正常渲染，但嵌入時只會展開一層，避免循環。</p></Det>
          <Det q="引用的 id 打錯會怎樣？"><p>建置時會列出找不到的 id，筆記頁上的引用改以虛線顯示。</p></Det>
          <Det q="提示框可以放在分頁裡嗎？"><p>可以，分頁內容支援所有區塊語法，見上方「草稿」分頁的範例。</p></Det>
        </div>
      </div>
      <Fns items={["互動元件需要操作時間，因此另外加計；純圖片不加計。"]} />
    </>
  );
}
window.NC_BODIES = Object.assign(window.NC_BODIES || {}, { "md-advanced": NcAdvancedBody });
})();
