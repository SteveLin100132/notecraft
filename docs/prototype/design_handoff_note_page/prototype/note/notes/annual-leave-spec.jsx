// NoteCraft 筆記頁 — 樣張筆記「特休假規格與計算」（提案頁與工作台共用）
(() => {
const { H, C, A, Badge, Fn, Tip, Ref, Code, Adm, Tabs, Task, Viz, Def, Inc, Det, Steps } = window.NPMD;
const { VzLeave, VzFlow, VzMix } = window;
const NP_TS = `export type Tier = { minYears: number; days: number };

const TIERS: Tier[] = [
  { minYears: 0.5, days: 3 }, { minYears: 1, days: 7 },
  { minYears: 2, days: 10 }, { minYears: 3, days: 14 },
  { minYears: 5, days: 15 },
];

// 10 年以上：每 1 年加給 1 日，最多 30 日
export function annualLeaveDays(years: number): number {
  if (years >= 10) return Math.min(15 + Math.floor(years) - 9, 30);
  const tier = [...TIERS].reverse().find((t) => years >= t.minYears);
  return tier ? tier.days : 0;
}`;
const NP_DIFF = ` export function toHours(days: number): number {
-  return days * 4; // 舊版以半日為單位
+  return days * 8; // 改以小時為單位
 }
+
+export const MIN_UNIT_HOURS = 1;`;
const NP_TS2 = `const res = await fetch("/api/leave/balance?employeeId=E1024");
const { remainingHours, expiresAt } = await res.json();`;
const NP_SH = `# 查詢員工特休餘額
curl -s "https://hr.example.com/api/leave/balance" \\
  --header "Authorization: Bearer $TOKEN" \\
  --data-urlencode "employeeId=E1024"`;
const NP_JSON = `{
  "employeeId": "E1024",
  "grantedDays": 15,
  "remainingHours": 72,
  "expiresAt": "2027-03-01",
  "carryOver": false
}`;

function NpAnnualBody() {
  return (
    <>
      <div className="md-flow">
        <H id="s-overview">概述</H>
        <p>員工到職滿六個月後，依<strong>勞動基準法第 38 條</strong>取得<Tip t="雇主依年資給予的有薪休假，期間工資照給。">特別休假</Tip>。系統會在每位<Ref id="hr.role-employee" desc="在系統中擁有個人假勤與薪資單檢視權限的帳號。">員工</Ref>的到職週年日自動發放天數，並於<em>年度結算日</em>處理未休完的時數<Fn n={1} />。</p>
        <p>系統畫面中的天數以<strong>日</strong>為單位、申請以<em>小時</em>為最小單位；<del>以半日計算</del>的舊規則已停用。需要人工調整時，<Ref id="hr.role-admin" desc="可修改假勤設定、手動調整員工餘額的帳號。">管理員</Ref>可按 <kbd>⌘</kbd> <kbd>K</kbd> 搜尋 <C>annual-leave</C>，或參考<A>假勤設定說明</A>。本規格版本為 <Badge>v2.3</Badge>，計算引擎目前標示 <Badge tone="blue">Beta</Badge>。</p>
        <p><mark>未休完的特休，雇主應於年度終結或契約終止時發給工資</mark>，不得以任何理由逕行歸零<Fn n={2} />。</p>

        <H id="s-scope">適用對象</H>
        <H lv={3} id="s-scope-who">適用身分</H>
        <ul>
          <li>全職員工
            <ul><li>不定期契約（正職）</li><li>定期契約，且同一雇主下累計年資滿六個月</li></ul>
          </li>
          <li>部分工時員工：依約定工時占比折算時數</li>
          <li>派遣人員：由派遣公司發放，系統僅記錄使用情形</li>
        </ul>
        <H lv={3} id="s-scope-order">發放順序</H>
        <ol>
          <li>比對員工到職日與年度結算方式（週年制或曆年制）。</li>
          <li>依年資查表計算天數，換算為時數。</li>
          <li>寫入假勤餘額，並以 Email 與 App 推播通知員工。</li>
        </ol>
        <H lv={3} id="s-scope-check">導入檢核</H>
        <Task items={[["匯入所有員工的到職日", true], ["設定年度結算日", true], ["確認部分工時員工的工時比例", false], ["公告新版特休規則", false]]} />

        <H id="s-calc">天數計算</H>
        <p>天數依年資級距給予，年資以到職日起算，留職停薪期間不計入。</p>
        <div className="md-tw">
          <table className="md-t">
            <thead><tr><th>年資</th><th className="r">特休天數</th><th className="r">換算時數</th><th>備註</th></tr></thead>
            <tbody>
              <tr><td>6 個月以上，未滿 1 年</td><td className="r"><b>3</b></td><td className="r">24</td><td>到職滿半年即發放</td></tr>
              <tr><td>1 年以上，未滿 2 年</td><td className="r"><b>7</b></td><td className="r">56</td><td>—</td></tr>
              <tr><td>2 年以上，未滿 3 年</td><td className="r"><b>10</b></td><td className="r">80</td><td>—</td></tr>
              <tr><td>3 年以上，未滿 5 年</td><td className="r"><b>14</b></td><td className="r">112</td><td>每年</td></tr>
              <tr><td>5 年以上，未滿 10 年</td><td className="r"><b>15</b></td><td className="r">120</td><td>每年</td></tr>
              <tr><td>10 年以上</td><td className="r"><b>16–30</b></td><td className="r">128–240</td><td>每 1 年加給 1 日</td></tr>
            </tbody>
          </table>
        </div>
        <p className="md-tcap">表：特別休假天數級距（勞動基準法第 38 條第 1 項）</p>
        <H lv={3} id="s-calc-mode">結算方式</H>
        <p>公司可擇一採用以下結算方式，切換分頁查看差異。</p>
        <Tabs content name="結算方式" items={[
          ["週年制", <>
            <p>以每位員工的<strong>到職日</strong>為年度起算點，每到週年日重新發放天數。</p>
            <ul><li>計算最直觀，員工容易理解</li><li>每位員工的結算日都不同，HR 需逐月處理</li></ul>
            <Adm k="tip"><p>員工數少於 30 人的公司，多半採用週年制。</p></Adm>
          </>],
          ["曆年制", <>
            <p>全公司統一以 <C>1/1</C> 起算，年中到職者第一年<em>依比例折算</em>。</p>
            <div className="md-tw"><table className="md-t"><thead><tr><th>到職日</th><th className="r">第一年天數</th></tr></thead><tbody><tr><td>2026/03/01</td><td className="r">3 × 10/12 ≈ 2.5</td></tr><tr><td>2026/09/01</td><td className="r">0（未滿 6 個月）</td></tr></tbody></table></div>
          </>],
          ["部分工時", <>
            <p>依約定工時占全時工時的比例折算：</p>
            <ol><li>計算每週約定工時 ÷ 40。</li><li>乘上同年資全時員工的時數。</li><li>四捨五入至小數點後一位。</li></ol>
            <blockquote className="md-bq"><p>部分工時勞工的特休，依其工作時數與全時勞工的比例計給。</p></blockquote>
          </>],
        ]} />
        <H lv={3} id="s-calc-formula">計算公式</H>
        <p>年資 10 年以上時，以 d<sub>n</sub> 表示第 n 年的天數：</p>
        <div className="md-math">
          <span className="md-math-m" dangerouslySetInnerHTML={{ __html: '<math display="block"><mrow><msub><mi>d</mi><mi>n</mi></msub><mo>=</mo><mi>min</mi><mo>(</mo><mn>15</mn><mo>+</mo><mo>⌊</mo><mi>n</mi><mo>⌋</mo><mo>−</mo><mn>9</mn><mo>,</mo><mspace width="0.4em"></mspace><mn>30</mn><mo>)</mo><mo>,</mo><mspace width="1em"></mspace><mi>n</mi><mo>≥</mo><mn>10</mn></mrow></math>' }} />
          <span className="eq">(1)</span>
        </div>
        <p>年度結算時未休的時數，以 <span className="md-math-i" dangerouslySetInnerHTML={{ __html: '<math><mfrac><mtext>月薪</mtext><mn>240</mn></mfrac></math>' }} /> 計算時薪後折發工資。</p>
        <Viz kind="互動計算器" file="annual-leave-calculator" caption="拖曳滑桿或點長條，查看不同年資對應的特休天數。">
          <VzLeave />
        </Viz>

        <H id="s-flow">申請與簽核</H>
        <p>員工於 App 或網頁送出申請後，依請假長度進入不同的簽核路徑。</p>
        <H lv={3} id="s-flow-steps">一般流程</H>
        <Steps label="申請步驟" items={[
          ["送出申請", "選擇假別、日期與時段，系統即時檢查剩餘時數。"],
          ["代理人確認", "職務代理人需於 24 小時內確認。"],
          ["主管簽核", "直屬主管核准後立即扣除餘額。"],
          ["歸檔", "同步至排班表與薪資計算。"],
        ]} />
        <p>單筆申請的簽核進度會以狀態標示，例如部門主管本人請假時，代理人步驟會略過：</p>
        <Steps label="申請 #A-20261028 進度" items={[
          ["送出申請", "10/28 09:12 由林小姐送出", "done"],
          ["代理人確認", "申請人為部門主管，免指定代理人", "skip"],
          ["主管簽核", "等待處長簽核，已等候 3 小時", "cur"],
          ["HR 確認", "連續 4 日以上需 HR 確認", "todo"],
          ["歸檔", null, "todo"],
        ]} />
        <p>導入特休模組時，工作台以水平步驟顯示整體進度：</p>
        <Steps dir="h" label="導入進度" items={[
          ["匯入員工資料", "128 人", "done"],
          ["設定結算方式", "曆年制", "done"],
          ["試算驗證", "3 筆到職日缺漏", "err"],
          ["員工公告", "預計 11/05", "cur"],
          ["正式上線", null, "todo"],
        ]} />
        <Viz kind="流程模擬" file="leave-approval-flow" caption="切換情境並按「下一步」，觀察不同請假長度的簽核路徑。">
          <VzFlow />
        </Viz>
        <H lv={3} id="s-flow-notes">注意事項</H>
        <Adm k="note"><p>特休期日原則上由員工排定，主管僅能基於急迫的營運需求與員工協商調整。</p></Adm>
        <Adm k="tip"><p>在「假勤設定」開啟<strong>提前提醒</strong>，系統會在年度結算前 60 日通知仍有餘額的員工。</p></Adm>
        <Adm k="warn"><p>曆年制公司若有年中到職的員工，第一年需依比例折算，請確認 <C>prorate</C> 設定已開啟。</p></Adm>
        <Adm k="danger"><p>手動調整餘額會直接影響薪資結算，調整後無法自動還原，請保留調整原因。</p></Adm>
        <p>較長的補充說明可以收合，預設展開或收合皆可：</p>
        <Adm k="note" fold="open" title="預設展開：特休與補休的差別"><p>補休來自加班時數的換算，有效期限由勞雇雙方約定；特休則依年資發放，兩者在系統中分開計算餘額。</p></Adm>
        <Adm k="warn" fold="closed" title="預設收合：系統升級注意事項"><p>v2.3 起申請最小單位改為 1 小時，舊版以半日送出的申請會自動換算為 4 小時。</p><ul><li>已核准的申請不受影響</li><li>簽核中的申請需重新送出</li></ul></Adm>
        <blockquote className="md-bq">
          <p>實務上，我們建議企業在工作規則中寫明排休的申請期限與協商方式，避免結算時才發現大量未休時數。</p>
          <blockquote className="md-bq"><p>特別休假期日，由勞工排定之。但雇主基於企業經營上之急迫需求或勞工因個人因素，得與他方協商調整。</p><cite>勞動基準法第 38 條第 2 項</cite></blockquote>
          <cite>聯和趨動 勞資顧問團隊</cite>
        </blockquote>

        <H id="s-impl">系統實作</H>
        <H lv={3} id="s-impl-fn">計算函式</H>
        <p>級距與上限集中定義在 <C>TIERS</C>，第 11 行處理 10 年以上的加給。點程式碼行尾的編號可對照註解。</p>
        <Code lang="ts" label="TypeScript" file="src/lib/leave/annual.ts" code={NP_TS} hl={[11]} ann={[
          [3, <>級距依勞基法第 38 條，以「滿幾年」為下限，不含上限。</>],
          [11, <>10 年以上不查表：第 10 年 16 日，每多 1 年加 1 日，以 <C>Math.min</C> 封頂 30 日。</>],
          [12, <>反轉後用 <C>find</C> 取第一個符合的級距，未滿 6 個月回傳 0。</>],
        ]} />
        <H lv={3} id="s-impl-diff">變更紀錄</H>
        <Code lang="diff" label="diff" file="src/lib/leave/units.ts" code={NP_DIFF} diff />
        <H lv={3} id="s-impl-api">查詢餘額 API</H>
        <p>多語言範例使用程式碼分頁（Code Group），分頁直接貼合程式碼區塊：</p>
        <Tabs name="API 範例" items={[
          ["TypeScript", <Code lang="ts" label="ts" code={NP_TS2} />],
          ["cURL", <Code lang="sh" label="bash" code={NP_SH} />],
          ["回應", <Code lang="json" label="json" code={NP_JSON} />],
        ]} />

        <H id="s-figures">畫面與資料模型</H>
        <p>工作台儀表板會彙整全公司的假勤狀態，管理員可從這裡進入個別員工的餘額明細。</p>
        <figure className="md-fig"><img src="assets/banner-dashboard.png" alt="工作台儀表板畫面" loading="lazy" /><figcaption>工作台儀表板：右側卡片顯示本月特休使用率與即將到期的時數。</figcaption></figure>
        <div className="md-figs">
          <figure className="md-fig"><div className="md-ph"><NpI n="image" s={22} sw={1.5} />插圖：員工在手機送出特休申請<span className="m">illustration · 4:3</span></div><figcaption>員工端申請畫面</figcaption></figure>
          <figure className="md-fig"><div className="md-ph"><NpI n="image" s={22} sw={1.5} />插圖：主管於通知中一鍵簽核<span className="m">illustration · 4:3</span></div><figcaption>主管端簽核通知</figcaption></figure>
        </div>
        <figure className="md-fig"><img src="assets/er-diagram.png" alt="假勤資料表關聯圖" loading="lazy" /><figcaption>資料模型：<C>leave_balance</C> 以 <C>employee_id</C> 關聯員工，每次發放與使用都寫入 <C>leave_ledger</C>。</figcaption></figure>
        <Viz kind="互動圖表" file="leave-usage-by-dept" caption="2026 年 1–9 月各部門的請假時數分布。">
          <VzMix />
        </Viz>

        <H id="s-terms">名詞、角色與常見問題</H>
        <Def id="hr.term-annual-leave" n={12}>
          <p><strong>特別休假</strong>：勞工在同一雇主或事業單位繼續工作滿一定期間後，依年資取得的有薪休假。休假期間工資照給，未休完者於年度終結時折發工資。</p>
        </Def>
        <Def id="hr.rule-settlement" n={1}>
          <p><strong>年度結算規則</strong>：年度結算日當天，系統會鎖定所有員工的特休餘額，並產生「未休特休折發清冊」供薪資計算使用。勞雇雙方若協商遞延，遞延的時數須於次一年度內休完。</p>
        </Def>
        <Def id="hr.role-employee" n={2}>
          <p><strong>員工</strong>：在系統中擁有個人假勤與薪資單檢視權限的帳號，可送出請假申請並查詢自己的特休餘額。</p>
        </Def>
        <Def id="hr.role-admin" n={1}>
          <p><strong>管理員</strong>：可修改假勤設定、手動調整員工餘額的帳號；所有調整都會寫入稽核紀錄。</p>
        </Def>
        <dl className="md-dl">
          <dt>週年制</dt><dd>以每位員工的到職日為年度起算點。</dd>
          <dt>曆年制</dt><dd>全公司統一以 1 月 1 日起算，年中到職者第一年依比例折算。</dd>
          <dt>年度結算日</dt><dd>計算未休時數並折發工資的日期。</dd>
        </dl>
        <H lv={3} id="s-terms-faq">常見問題</H>
        <div className="md-dets">
          <Det q="特休可以預支嗎？" open><p>法規未強制，企業可自行規定。若開放預支，離職時已預支但未滿年資的部分不得自工資中扣回。</p></Det>
          <Det q="留職停薪期間會累計年資嗎？"><p>不會。留職停薪期間不計入年資，復職後接續計算。</p></Det>
          <Det q="員工離職時如何處理未休特休？"><p>依離職日計算未休時數，與最後一期薪資一併發給。</p></Det>
        </div>

        <H id="s-headings">附錄：標題層級</H>
        <p>以下為三級以下的標題樣式，用於確認層級在本方案中的對比。</p>
        <H lv={3} id="s-h3">第三層標題</H>
        <p>第三層標題會列入目錄。</p>
        <H lv={4} id="s-h4">第四層標題</H>
        <p>第四層以下不列入目錄，只用來切分段落。</p>
        <H lv={5} id="s-h5">第五層標題</H>
        <p>較少使用，通常出現在規格的欄位說明。</p>
        <H lv={6} id="s-h6">第六層標題</H>
        <p>最小的標題層級。</p>
        <hr className="md-hr" />
        <p>本規格若與最新法規不一致，以法規為準。</p>
      </div>

      <section className="md-fns" aria-label="註腳">
        <div className="md-fns-h">註腳</div>
        <ol>
          <li id="fn-1">年度結算方式可選週年制或曆年制，於「假勤設定 › 結算」設定。<a href="#fnref-1" onClick={(e) => { e.preventDefault(); window.npJump("fnref-1"); }} aria-label="回到內文">↩</a></li>
          <li id="fn-2">勞動基準法第 38 條第 4 項。<a href="#fnref-2" onClick={(e) => { e.preventDefault(); window.npJump("fnref-2"); }} aria-label="回到內文">↩</a></li>
        </ol>
      </section>
    </>
  );
}
function NpNote() {
  return (
    <article className="md-art">
      <header className="md-head">
        <div className="md-eyebrow">02-功能規格</div>
        <div className="md-tags"><span className="md-tag">勞動法令</span><span className="md-tag">假勤</span><span className="md-tag">規格</span></div>
        <h1 className="md-h1">特休假規格與計算</h1>
        <p className="md-desc">依勞動基準法第 38 條計算特別休假天數，並說明申請、簽核與年度結算的規則。</p>
        <div className="md-meta">
          <span className="mi"><i className="ml">資料夾</i><NpI n="folder" s={13} c="#2e9e6b" />02-功能規格</span>
          <span className="mi"><i className="ml">更新</i><NpI n="clock" s={13} />2026/10/28</span>
          <span className="mi"><i className="ml">閱讀時間</i><NpI n="book" s={13} />約 8 分鐘</span>
          <span className="mi"><i className="ml">版本</i><NpI n="tag" s={13} />v2.3</span>
        </div>
      </header>

      <NpAnnualBody />
      <div className="md-foot"><span>建立於 2026/03/02</span><span className="mono">src/content/notes/annual-leave-spec.mdx</span></div>
    </article>
  );
}
window.NpNote = NpNote;
window.NC_BODIES = Object.assign(window.NC_BODIES || {}, { "annual-leave-spec": NpAnnualBody });
})();
