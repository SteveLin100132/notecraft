// NoteCraft 工作台 — 示範筆記：Markdown 基本語法
(() => {
const { H, C, A, Badge, Fn, Fns, Ref, Code, Task } = window.NPMD;
const GB_HEAD = `## 第二層標題
### 第三層標題
#### 第四層標題`;
const GB_INLINE = `**粗體**、*斜體*、~~刪除線~~、==螢光標記==
x^2^、H~2~O、<kbd>⌘</kbd> <kbd>K</kbd>、\`npm run dev\`
[站內連結](/notes/md-advanced)、:badge[Beta]`;
const GB_TS = `import { defineConfig } from "notecraft";

export default defineConfig({
  contentDir: "src/content/notes",
  toc: { minLevel: 2, maxLevel: 3 },
  readingSpeed: 450,
});`;
const GB_DIFF = ` toc: {
-  maxLevel: 4,
+  maxLevel: 3,
 },
+readingSpeed: 450,`;

function NcBasicsBody() {
  return (
    <>
      <div className="md-flow">
        <p>本篇整理 NoteCraft 支援的標準 Markdown（CommonMark 與 GitHub Flavored Markdown）。每一節先列出寫法，再直接呈現渲染結果。MDX 擴充語法，例如<Ref id="nc.syntax-define">定義區塊</Ref>、提示框與分頁，請見系列下一章「進階語法」。</p>

        <H id="b-heading">標題</H>
        <p>以 1 到 6 個 <C>#</C> 開頭。H1 保留給筆記標題，內文從 H2 開始；H2 與 H3 會列入右側目錄，H4 以下只用來切分段落。</p>
        <Code lang="md" label="markdown" code={GB_HEAD} />
        <H lv={3} id="b-h3">第三層標題</H>
        <p>第三層標題會列入目錄，並縮排在所屬的 H2 之下。</p>
        <H lv={4} id="b-h4">第四層標題</H>
        <p>第四層以下不列入目錄。</p>
        <H lv={5} id="b-h5">第五層標題</H>
        <p>較少使用，通常出現在規格的欄位說明。</p>
        <H lv={6} id="b-h6">第六層標題</H>
        <p>最小的標題層級。</p>

        <H id="b-inline">段落與行內樣式</H>
        <p>段落之間以一個空行分隔。行內可以混用 <strong>粗體</strong>、<em>斜體</em>、<del>刪除線</del>、<mark>螢光標記</mark>、上標 x<sup>2</sup>、下標 H<sub>2</sub>O、鍵盤按鍵 <kbd>⌘</kbd> <kbd>K</kbd>、行內程式碼 <C>npm run dev</C>、<A>站內連結</A>，以及徽章 <Badge>v2.3</Badge> <Badge tone="blue">Beta</Badge>。</p>
        <Code lang="md" label="markdown" code={GB_INLINE} />

        <H id="b-list">清單</H>
        <H lv={3} id="b-ul">無序清單</H>
        <ul>
          <li>以 <C>-</C> 或 <C>*</C> 開頭
            <ul><li>縮排兩個空格建立子清單</li><li>子清單可以再包含段落與程式碼</li></ul>
          </li>
          <li>清單項目之間不需要空行</li>
        </ul>
        <H lv={3} id="b-ol">有序清單</H>
        <ol>
          <li>以數字加句點開頭。</li>
          <li>實際編號由渲染器自動產生，原始檔可全部寫 <C>1.</C>。</li>
          <li>中間插入段落時，編號會自動接續。</li>
        </ol>
        <H lv={3} id="b-task">待辦清單</H>
        <p>以 <C>- [ ]</C> 與 <C>- [x]</C> 標示，點擊方框可切換狀態（只影響閱讀畫面，不會寫回檔案）。</p>
        <Task items={[["建立筆記與 frontmatter", true], ["補上標題層級與段落", true], ["加入表格與程式碼範例", false], ["發佈前檢查連結", false]]} />

        <H id="b-quote">引言</H>
        <p>以 <C>&gt;</C> 開頭；連續兩個 <C>&gt;&gt;</C> 為巢狀引言，最後一行可以加上出處。</p>
        <blockquote className="md-bq">
          <p>好的筆記不是把資料抄下來，而是把自己的理解寫清楚，讓三個月後的自己也看得懂。</p>
          <blockquote className="md-bq"><p>寫作是思考的延伸；寫不清楚的地方，通常就是還沒想清楚的地方。</p><cite>寫作課講義</cite></blockquote>
          <cite>NoteCraft 寫作指南</cite>
        </blockquote>

        <H id="b-table">表格</H>
        <p>以 <C>|</C> 分隔欄位，第二列的冒號決定對齊方式。表格過寬時可以左右捲動。</p>
        <div className="md-tw">
          <table className="md-t">
            <thead><tr><th>語法</th><th>用途</th><th className="c">列入目錄</th><th className="r">建議數量</th></tr></thead>
            <tbody>
              <tr><td><C>##</C></td><td>章節標題</td><td className="c">是</td><td className="r"><b>3–8</b></td></tr>
              <tr><td><C>###</C></td><td>小節標題</td><td className="c">是</td><td className="r">0–4 / 章</td></tr>
              <tr><td><C>####</C></td><td>段落標題</td><td className="c">否</td><td className="r">不限</td></tr>
              <tr><td><C>---</C></td><td>主題轉換的分隔線</td><td className="c">—</td><td className="r">少用</td></tr>
            </tbody>
          </table>
        </div>
        <p className="md-tcap">表：標題與分隔線的使用建議（第三欄置中、第四欄靠右）</p>

        <H id="b-code">程式碼區塊</H>
        <p>以三個反引號包住程式碼，並標註語言。可以加上檔名，並以 <C>{"{5}"}</C> 標示要強調的行。</p>
        <Code lang="ts" label="TypeScript" file="notecraft.config.ts" code={GB_TS} hl={[5]} />
        <p>語言標為 <C>diff</C> 時，以 <C>+</C> 與 <C>-</C> 開頭的行會分別標示為新增與刪除：</p>
        <Code lang="diff" label="diff" file="notecraft.config.ts" code={GB_DIFF} diff />

        <H id="b-image">圖片</H>
        <p>以 <C>![替代文字](路徑)</C> 插入；緊接在圖片下一行的斜體文字會成為圖說。</p>
        <figure className="md-fig"><img src="assets/banner-dashboard.png" alt="工作台儀表板畫面" loading="lazy" /><figcaption>工作台儀表板：彙整最近更新的筆記、系列進度與 AI 標記。</figcaption></figure>
        <p>兩張圖片並排時，使用 <C>:::figures</C> 區塊；手機上會改為上下排列。</p>
        <div className="md-figs">
          <figure className="md-fig"><div className="md-ph"><NpI n="image" s={22} sw={1.5} />截圖：筆記列表<span className="m">screenshot · 4:3</span></div><figcaption>筆記列表的清單檢視</figcaption></figure>
          <figure className="md-fig"><div className="md-ph"><NpI n="image" s={22} sw={1.5} />截圖：關聯圖<span className="m">screenshot · 4:3</span></div><figcaption>筆記之間的關聯圖</figcaption></figure>
        </div>

        <H id="b-misc">分隔線、定義清單與註腳</H>
        <p>三個連字號 <C>---</C> 產生分隔線，用於段落主題轉換：</p>
        <hr className="md-hr" />
        <p>定義清單以「名詞」加上以冒號開頭的說明組成：</p>
        <dl className="md-dl">
          <dt>Frontmatter</dt><dd>檔案開頭以 <C>---</C> 包住的 YAML，記錄標題、標籤與狀態。</dd>
          <dt>Slug</dt><dd>由檔名產生的網址片段，例如 <C>md-basics</C>。</dd>
          <dt>MDX</dt><dd>可以在 Markdown 中使用元件的格式，NoteCraft 的擴充語法都建立在它之上。</dd>
        </dl>
        <p>註腳以 <C>[^1]</C> 標記，內容統一列在文末<Fn n={1} />；點註腳編號可跳到說明，再點 ↩ 回到內文<Fn n={2} />。</p>
      </div>
      <Fns items={["註腳內容可以寫在檔案任何位置，渲染時一律移到文末。", "同一個註腳被多處引用時，編號只會出現一次。"]} />
    </>
  );
}
window.NC_BODIES = Object.assign(window.NC_BODIES || {}, { "md-basics": NcBasicsBody });
})();
