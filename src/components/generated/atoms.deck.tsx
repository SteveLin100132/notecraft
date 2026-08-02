// 原子層驗證基準 deck（Task 38，契約補充見 docs/deck-atoms-inventory.md §5.3）。
//
// **這份 deck 手寫維護，不由 slide-generator 生成** —— 它是驗證基準，不是產物。
// 每個原子至少一頁，頁內同時放「典型用法」與「邊界狀態」（空資料、超長字串、
// 達建議上限的量），密度上限就是從這裡量出來的。
//
// 新增原子時**必須**補一頁，否則 /present/atoms 的逐頁截圖迴歸涵蓋不到它。
// 走 /present/atoms 檢視；不會流出到 npm 套件（package.json 的 files 白名單
// 不含 src/components/generated/）。

import type { CustomSlideProps, Deck } from "@/lib/decks";
import {
  Annotate, BeforeAfter, Cards, Chart, Code, Compare, Contents, Cross, Decision, Frame, Heatmap, Kpi, Layers,
  LogoRow, Mark, Quadrant, Ranking, Risk, Roster, Rows, Share, Spectrum, Stages, Summary, TagCloud, Terminal,
  Triad, Waterfall,
} from "@/components/deck/blocks";
import { DGAP, DS } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";

// ── <Code> 典型用法：A1 行尾註解 + A2 左側標籤 + A6 檔名標頭 ────────────────
// 對齊 dataint p6–p11 的樣子（碼塊 + 每行右側中文註解 + 左側彩色標籤引線）。
function CodeTypicalPage({ dark }: CustomSlideProps) {
  return (
    <Code
      dark={dark}
      lang="ts"
      fileName="src/lib/kafka-consumer.ts"
      labels={[
        { text: "引入 Consumer", lines: [1, 2], tone: "blue" },
        { text: "Consumer 配置", lines: [5, 11], tone: "orange" },
      ]}
      lines={[
        { text: `import { ConsumerGroup } from 'kafka-node';` },
        { text: `import { v4 as uuidv4 } from 'uuid';` },
        { text: `` },
        { text: `const kafkaHost = 'localhost:9092,localhost:9093';`, note: "可用「,」添加多台 Host" },
        { text: `const consumer = new ConsumerGroup({`, note: "實例 Kafka Consumer" },
        { text: `  kafkaHost,` },
        { text: `  groupId: uuidv4(),`, note: "Consumer Group ID" },
        { text: `  fromOffset: 'latest',`, note: "latest 訂閱最新數據" },
        { text: `  sasl: {`, note: "SASL 驗證連線設置" },
        { text: `    mechanism: 'plain',` },
        { text: `    username: 'username',` },
        { text: `  },` },
        { text: `}, topic);`, note: "要訂閱的 Topic" },
        { text: `` },
        // 這兩行是為了讓 comment 與 number 兩個 token 類別也出現在驗證基準裡
        { text: `// 重連次數：超過就放棄` },
        { text: `const maxRetries = 3;` },
      ]}
    />
  );
}

// ── <Code> A3 逐步高亮：同一份 lines、不同 highlight，跨頁講同一支檔案 ──────
// 對齊 tus p7–p10。這裡把「第 2 段」與「第 3 段」並排在同一頁，
// 是為了在一張截圖裡就能看出高亮與淡化的差異；真實 deck 會是兩頁。
const SERVER_SRC = `const server = new Server({
  path: '/files',
  datastore,
  namingFunction: async (_, metadata) => {
    const id = crypto.randomBytes(16).toString('hex');
    return 'test/' + id;
  },
  generateUrl: (_, { proto, host, path, id }) => {
    return proto + '://' + host + path + '/' + id;
  },
});

server.listen({ port });`;

function CodeProgressivePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => (
    <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>
  );
  return (
    <div style={{ display: "flex", gap: DGAP.lg }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cap("startLine 28 · highlight 29–31")}
        <Code dark={dark} size="xs" startLine={28} highlight={[[29, 31]]} lines={SERVER_SRC} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cap("startLine 28 · highlight 34–36")}
        <Code dark={dark} size="xs" startLine={28} highlight={[[34, 36]]} lines={SERVER_SRC} />
      </div>
    </div>
  );
}

// ── <Code> 邊界狀態：空資料 / 超長行 / 達建議上限 / marker ──────────────────
// 這一頁是刻意要它難看的。三個問題若在截圖裡看不出來，就代表沒被擋住。
const LONG_LINE = `const veryLongIdentifierName = await someExtremelyVerboseFactory.createThing({ retries: 3, timeoutMs: 30000 });`;

function CodeEdgePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => (
    <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: DGAP.md }}>
      <div style={{ flex: "none" }}>
        {cap("空 lines → 整個元件不渲染（下方應是空白，不該有空框）")}
        <Code dark={dark} lines={[]} lang="ts" fileName="empty.ts" />
      </div>
      <div style={{ flex: "none" }}>
        {cap("超長單行 · 放進半寬欄位 → 無捲軸，超出的被裁掉，右緣淡出是「後面還有」的提示")}
        {/* 刻意壓成半寬：全寬時這行放得下，就驗不到裁切 */}
        <div style={{ width: 640 }}>
          <Code dark={dark} lines={LONG_LINE} lang="ts" />
        </div>
      </div>
      <div style={{ flex: "none" }}>
        {cap("marker：(n)! 在簡報是靜態編號徽章，不可互動（筆記內文才可點）")}
        <Code dark={dark} lang="ts" lines={`const a = 1; (1)!\nconst b = 2; (2)!`} />
      </div>
    </div>
  );
}

// ── <Code> 密度上限量測頁 ────────────────────────────────────────────────────
// 這一頁**沒有 caption、沒有 callout**，就是兩個 <Code> 填滿 area ——
// 目的是量出乾淨情境下的行數上限。頁面若出現 dev 溢出紅框，就代表常數設太大。
const linesOf = (n: number) => Array.from({ length: n }, (_, i) => `const value${i + 1} = compute(${i + 1});`).join("\n");

function CodeDensityPage({ dark }: CustomSlideProps) {
  return (
    <div style={{ display: "flex", gap: DGAP.lg }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Code dark={dark} lang="ts" fileName={`size="sm" · 16 行`} lines={linesOf(16)} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Code dark={dark} size="xs" lang="ts" fileName={`size="xs" · 19 行`} lines={linesOf(19)} />
      </div>
    </div>
  );
}

// ── <Annotate> 的替身內容 ─────────────────────────────────────────────────────
// 用自畫的假 UI 當 children，不放真截圖 —— 驗證基準不該依賴外部資產，
// 而且假 UI 每次 render 都一樣，截圖迴歸才比得出差異。
function MockApp({ dark }: { dark: boolean }) {
  const c = dkt(dark);
  const bar = (w: string, h: number, bg: string) => (
    <div style={{ width: w, height: h, borderRadius: 4, background: bg }} />
  );
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${c.border}`,
        borderRadius: "var(--radius-lg)",
        background: c.slide,
        boxShadow: c.shadowLg,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: c.sunken }}>
        {bar("60px", 10, c.brand)}
        {bar("120px", 10, c.borderSoft)}
        <div style={{ flex: 1 }} />
        {bar("40px", 10, c.borderSoft)}
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ width: 150, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: c.sunken }}>
          {bar("100%", 9, c.borderSoft)}
          {bar("80%", 9, c.borderSoft)}
          {bar("90%", 9, c.brand)}
          {bar("70%", 9, c.borderSoft)}
        </div>
        <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {bar("45%", 14, c.border)}
          {/* 內容面板裡放一張內嵌 <svg> —— 順便驗證 Annotate 的 children 放 SVG 也正常 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              border: `1px solid ${c.borderSoft}`,
              borderRadius: 6,
              padding: 10,
              display: "flex",
            }}
          >
            <svg viewBox="0 0 200 80" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }} aria-hidden="true">
              <polyline
                points="6,68 42,44 78,52 114,22 150,30 186,10"
                fill="none"
                stroke={c.brand}
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <line x1="6" y1="74" x2="194" y2="74" stroke={c.borderSoft} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {bar("90px", 22, c.accent)}
            {bar("90px", 22, c.borderSoft)}
          </div>
        </div>
      </div>
    </div>
  );
}

// 典型用法：截圖 + 左右各 3 條引線 + 4 個編號熱點（對齊 bullmq p12 / nifi p5）
function AnnotateTypicalPage({ dark }: CustomSlideProps) {
  return (
    <Annotate
      dark={dark}
      pins={[
        { n: "1", x: 12, y: 42 },
        { n: "2", x: 46, y: 30 },
        { n: "3", x: 62, y: 62 },
        { n: "4", x: 40, y: 88 },
      ]}
      leaders={[
        { text: "全域搜尋", side: "left", at: { x: 22, y: 8 } },
        { text: "側欄目前分頁", side: "left", at: { x: 10, y: 55 } },
        { text: "主要操作區", side: "left", at: { x: 38, y: 74 } },
        { text: "帳號選單", side: "right", at: { x: 94, y: 8 }, tone: "orange" },
        { text: "內容面板", side: "right", at: { x: 70, y: 45 }, tone: "orange" },
        { text: "送出 / 取消", side: "right", at: { x: 52, y: 88 }, tone: "orange" },
      ]}
    >
      <MockApp dark={dark} />
    </Annotate>
  );
}

// 替身「截圖」：inline data-URI SVG。用 <img>（replaced element）而非 inline SVG，
// 是為了驗證 Annotate 的 children 放真截圖時也正常 —— 那是實際最常見的用法（E1）。
const SHOT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">
       <rect width="400" height="240" fill="#eef1f6"/>
       <rect x="0" y="0" width="400" height="34" fill="#cbd3df"/>
       <rect x="12" y="12" width="70" height="10" rx="5" fill="#9aa6b8"/>
       <rect x="0" y="34" width="110" height="206" fill="#e1e6ee"/>
       <rect x="14" y="52" width="80" height="9" rx="4" fill="#9aa6b8"/>
       <rect x="14" y="72" width="66" height="9" rx="4" fill="#9aa6b8"/>
       <rect x="14" y="92" width="74" height="9" rx="4" fill="#2c6ebb"/>
       <rect x="128" y="54" width="150" height="14" rx="4" fill="#9aa6b8"/>
       <rect x="128" y="84" width="256" height="120" rx="6" fill="#ffffff" stroke="#cbd3df"/>
       <rect x="128" y="214" width="86" height="16" rx="4" fill="#e37b24"/>
     </svg>`,
  );

// 邊界狀態：同側目標點刻意擠在一起（測避讓）、上下方向、children 換成 <img> 與 <Code>
function AnnotateEdgePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", gap: DGAP.lg, height: "100%" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {cap("children 換成 <img> 真截圖；4 條引線的目標點全擠在 y 40–52%，標籤應自動撐開")}
        <Annotate
          dark={dark}
          style={{ flex: "none" }}
          minGap={13}
          leaders={[
            { text: "目標 A", side: "left", at: { x: 60, y: 40 } },
            { text: "目標 B", side: "left", at: { x: 72, y: 45 } },
            { text: "目標 C", side: "left", at: { x: 66, y: 49 } },
            { text: "目標 D", side: "left", at: { x: 80, y: 52 } },
          ]}
        >
          <img src={SHOT} alt="示意截圖" style={{ display: "block", width: "100%", borderRadius: "var(--radius-md)" }} />
        </Annotate>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {cap("children 換成 <Code>，並改用 top / bottom 停靠")}
        {/* flex:"none" —— 讓內容區收合到 <Code> 的自然高度，
            否則百分比座標會算到 Code 下方的空白上（見 Annotate.tsx 檔頭警告） */}
        <Annotate
          dark={dark}
          style={{ flex: "none" }}
          leaders={[
            { text: "型別匯入", side: "top", at: { x: 30, y: 12 } },
            { text: "回傳值", side: "bottom", at: { x: 55, y: 86 }, tone: "orange" },
          ]}
          pins={[{ n: "A", x: 82, y: 50 }]}
        >
          <Code
            dark={dark}
            size="xs"
            lang="ts"
            lines={`import type { Deck } from '@/lib/decks';\n\nfunction build(): Deck {\n  return {\n    slug: 'demo',\n    slides: [],\n  };\n}`}
          />
        </Annotate>
      </div>
    </div>
  );
}

// ── <Chart> ──────────────────────────────────────────────────────────────────
// 尺寸一律由頁面從 area 算好傳進去（元件不量測，見 Chart.tsx 檔頭規則 2）。
const QUARTERS = [
  { q: "Q1", 導入: 12, 續約: 8 },
  { q: "Q2", 導入: 19, 續約: 11 },
  { q: "Q3", 導入: 15, 續約: 17 },
  { q: "Q4", 導入: 26, 續約: 21 },
];

function ChartTypicalPage({ dark, live, area }: CustomSlideProps) {
  const w = Math.floor((area.w - DGAP.lg) / 2);
  // height 是「這個 block 的總高」—— heading 與圖例由 <Chart> 自己扣
  const h = area.h;
  return (
    <div style={{ display: "flex", gap: DGAP.lg }}>
      <Chart
        dark={dark}
        live={live}
        heading="分組長條（2 系列）"
        variant="bar"
        data={QUARTERS}
        categoryKey="q"
        series={[
          { key: "導入", label: "導入案件" },
          { key: "續約", label: "續約案件" },
        ]}
        width={w}
        height={h}
        unit=" 件"
      />
      <Chart
        dark={dark}
        live={live}
        heading="折線（同資料）"
        variant="line"
        data={QUARTERS}
        categoryKey="q"
        series={[
          { key: "導入", label: "導入案件" },
          { key: "續約", label: "續約案件" },
        ]}
        width={w}
        height={h}
      />
    </div>
  );
}

function ChartVariantsPage({ dark, live, area }: CustomSlideProps) {
  const w = Math.floor((area.w - DGAP.lg) / 2);
  return (
    <div style={{ display: "flex", gap: DGAP.lg }}>
      <Chart
        dark={dark}
        live={live}
        heading="比例分解（對齊 bullmq p3）"
        variant="donut"
        data={[
          { 類別: "Airflow 可解", 佔比: 5 },
          { 類別: "NiFi 可解", 佔比: 80 },
          { 類別: "需自行開發", 佔比: 15 },
        ]}
        categoryKey="類別"
        series={[{ key: "佔比", label: "佔比" }]}
        width={w}
        height={area.h}
        unit="%"
      />
      <Chart
        dark={dark}
        live={live}
        heading="進度條列（對齊 tus p4 / bullmq p8）"
        variant="bars"
        data={[
          { chunk: "Chunk 01", 進度: 100 },
          { chunk: "Chunk 02", 進度: 25 },
          { chunk: "Chunk 03", 進度: 40 },
          { chunk: "Chunk 04", 進度: 10 },
          { chunk: "Chunk 05", 進度: 35 },
          { chunk: "Chunk 06", 進度: 8 },
        ]}
        categoryKey="chunk"
        series={[{ key: "進度", label: "進度" }]}
        width={w}
        unit="%"
      />
    </div>
  );
}

// 邊界：5 個系列 → 只該畫前 3 個並在 dev console 警告；另加堆疊柱
const FIVE = [
  { m: "1 月", a: 8, b: 5, c: 3, d: 2, e: 1 },
  { m: "2 月", a: 11, b: 7, c: 4, d: 3, e: 2 },
  { m: "3 月", a: 9, b: 9, c: 5, d: 2, e: 2 },
];

function ChartEdgePage({ dark, live, area }: CustomSlideProps) {
  const c = dkt(dark);
  const w = Math.floor((area.w - DGAP.lg) / 2);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", gap: DGAP.lg }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cap("傳入 5 個系列 → 只畫前 3 個，dev console 應出現警告")}
        <Chart
          dark={dark}
          live={live}
          variant="bar"
          data={FIVE}
          categoryKey="m"
          series={[
            { key: "a", label: "系列 A" },
            { key: "b", label: "系列 B" },
            { key: "c", label: "系列 C" },
            { key: "d", label: "系列 D（不該出現）" },
            { key: "e", label: "系列 E（不該出現）" },
          ]}
          width={w}
          height={area.h - 40}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cap("堆疊柱：數值標在段內；無 tooltip、無漸層、無圓角")}
        <Chart
          dark={dark}
          live={live}
          variant="bar"
          stacked
          data={QUARTERS}
          categoryKey="q"
          series={[
            { key: "導入", label: "導入案件" },
            { key: "續約", label: "續約案件" },
          ]}
          width={w}
          height={area.h - 40}
          unit=" 件"
        />
      </div>
    </div>
  );
}

// ── <Terminal> / <Frame> / <Mark> ────────────────────────────────────────────
// 對齊 mfe p8–p11（瀏覽器線框 + CLI 互動問答）、tus p2（錯誤對話框）、tus p6（安裝指令）。
const CLI: { text: string; kind?: "cmd" | "prompt" | "choice" | "out" | "dim" }[] = [
  { text: "npx create-mf-app", kind: "cmd" },
  { text: "Pick the name of your app:", kind: "prompt" },
  { text: "host", kind: "choice" },
  { text: "Project Type: (Use arrow keys)", kind: "prompt" },
  { text: "Application", kind: "choice" },
  { text: "API Server", kind: "dim" },
  { text: "Library", kind: "dim" },
  { text: "Port number: (8080)", kind: "prompt" },
  { text: "8000", kind: "choice" },
  { text: "Your 'host' project is ready to go.", kind: "out" },
];

function TerminalFramePage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", gap: DGAP.lg, height: area.h }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {cap("<Frame kind=\"browser\"> 包住 UI 線框（對齊 mfe p8–p11）")}
        <Frame dark={dark} kind="browser" url="https://localhost:8000/">
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
            <div style={{ height: 26, borderRadius: 4, border: `1px solid ${c.borderSoft}` }} />
            <div style={{ flex: 1, borderRadius: 4, border: `1px solid ${c.borderSoft}` }} />
            <div style={{ height: 26, borderRadius: 4, border: `1px solid ${c.borderSoft}` }} />
          </div>
        </Frame>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.md }}>
        <div style={{ flex: "none" }}>
          {cap("<Terminal> 五種 kind：cmd / prompt / choice / out / dim")}
          <Terminal dark={dark} title="Host Application" lines={CLI} />
        </div>
        <div style={{ flex: "none" }}>
          {cap("<Terminal compact> 單行安裝指令（對齊 tus p6）")}
          <Terminal dark={dark} compact badge="npm" lines="npm install @uppy/tus" />
        </div>
      </div>
    </div>
  );
}

function FrameMarkPage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", gap: DGAP.lg, height: area.h }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.md }}>
        <div style={{ flex: "none" }}>
          {cap("<Frame kind=\"dialog\" tone=\"critical\">：狀態框一律 icon + 文字並行（audit A-6）")}
          <Frame dark={dark} kind="dialog" tone="critical" title="上傳失敗" style={{ flex: "none" }}>
            <div style={{ padding: 16, fontSize: DS.body, color: c.body }}>
              網路連線發生錯誤，錯誤代碼 E8601224。
            </div>
          </Frame>
        </div>
        <div style={{ flex: "none" }}>
          {cap("<Frame kind=\"window\">：標題列 + 控制點")}
          <Frame dark={dark} kind="window" title="MinIO Browser" style={{ flex: "none" }}>
            <div style={{ padding: 16 }}>
              <Terminal dark={dark} lines={"[nodemon] starting `ts-node ./src/index.ts`\nServer run at 3000"} />
            </div>
          </Frame>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cap("<Mark>：行內螢光筆，底色由 tone 前景色 color-mix 26% 而來 + 下緣實線")}
        <div style={{ fontSize: DS.body, lineHeight: 1.9, color: c.body }}>
          <p style={{ margin: 0 }}>
            TUS 是一個<Mark dark={dark}>針對大檔案</Mark>和不穩定網路環境設計的檔案上傳協議，
            主要目的是解決<Mark dark={dark} tone="blue">斷點續傳</Mark>的問題。
          </p>
          <p style={{ marginTop: DGAP.md, marginBottom: 0 }}>
            狀態色也可用：<Mark dark={dark} tone="critical">不建議使用</Mark>、
            <Mark dark={dark} tone="good">建議採用</Mark>、
            <Mark dark={dark} tone="warning">需注意版本</Mark>。
          </p>
          <p style={{ marginTop: DGAP.md, marginBottom: 0, fontSize: DS.small, color: c.muted }}>
            行內元素不改變行高 —— 上下兩段的基線間距應與沒有標記時完全一致。
          </p>
        </div>
      </div>
    </div>
  );
}

// ── <Stages> 三種 variant ────────────────────────────────────────────────────
// linear 是 Task 34 既有外觀（此頁順帶當回歸樣本）；rail / cycle 是 Task 42 新增。
const ETL = [
  { tag: "EXTRACT", title: "數據提取", desc: "從不同來源收集數據", icon: "database" as const },
  { tag: "TRANSFORM", title: "數據轉換", desc: "轉換、聚合、拆分、計算", icon: "settings" as const },
  { tag: "LOAD", title: "數據載入", desc: "儲存到合適的位置", icon: "layers" as const, variant: "active" as const },
  { tag: "ANALYSIS", title: "數據分析", desc: "統計、可視化、機器學習", icon: "gauge" as const },
  { tag: "VISUALIZE", title: "數據呈現", desc: "圖表、報告、儀表板", icon: "trend-up" as const },
];

function StagesVariantsPage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: DGAP.md, height: area.h }}>
      <div style={{ flex: "none" }}>
        {cap("variant 不給 = linear（Task 34 原始外觀，此頁同時是回歸樣本）")}
        <Stages
          dark={dark}
          style={{ flex: "none" }}
          items={[
            { tag: "PAST", title: "手動整合", desc: "人工搬資料" },
            { tag: "NOW", title: "半自動", desc: "排程 + 腳本", variant: "active" },
            { tag: "FUTURE", title: "事件驅動", desc: "串流管線", variant: "dashed" },
          ]}
        />
      </div>
      <div style={{ flex: "none" }}>
        {cap('variant="rail" · alternate —— 對齊 bullmq p2 / dataint p16')}
        <Stages dark={dark} variant="rail" alternate size={285} style={{ flex: "none" }} items={ETL} />
      </div>
    </div>
  );
}

function StagesCyclePage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", gap: DGAP.lg, height: area.h }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cap('variant="cycle" · 6 節點環形（對齊 nifi p2）')}
        <Stages
          dark={dark}
          variant="cycle"
          center="NiFi Flow 開發流程"
          size={Math.min(area.h - 40, 430)}
          style={{ flex: "none" }}
          items={[
            { title: "建立 / 修改 Flow" },
            { title: "建立 Template" },
            { title: "匯出 Template", variant: "active" },
            { title: "移除舊的 Flow" },
            { title: "匯入 Template" },
            { title: "修改 Flow 設定" },
          ]}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.md }}>
        <div style={{ flex: "none" }}>
          {cap('<Rows variant="chip"> —— 對齊 nifi p3 / tus p5 的痛點標籤列')}
          <Rows
            dark={dark}
            variant="chip"
            style={{ flex: "none" }}
            items={[
              { k: "人工轉移難免出現錯誤", tone: "critical", v: "手動轉移 Template 可能導致漏改或設定遺漏。" },
              { k: "難以追蹤修改哪些項目", tone: "warning", v: "多人參與流程配置時，難以追蹤誰改了什麼。" },
              { k: "難以處理環境配置差異", tone: "blue", v: "不同環境的資料庫連線、IP 或參數都需調整。" },
            ]}
          />
        </div>
        <div style={{ flex: "none" }}>
          {cap("<LogoRow> —— 技術選型組合（此處不放真 logo，只驗排列與間隔符號）")}
          <LogoRow
            dark={dark}
            style={{ flex: "none" }}
            items={[{ label: "Apache NiFi" }, { label: "NiFi Registry" }]}
          />
        </div>
      </div>
    </div>
  );
}

// ── <TagCloud> 與 <Cards recommended> ───────────────────────────────────────
const PAINS: { text: string; weight?: 1 | 2 | 3 | 4 }[] = [
  { text: "異常通知", weight: 4 },
  { text: "災難復原", weight: 4 },
  { text: "異常監控", weight: 4 },
  { text: "容錯處理", weight: 3 },
  { text: "Graceful Shutdown", weight: 3 },
  { text: "沒有可視化介面", weight: 3 },
  { text: "設定緩衝區", weight: 3 },
  { text: "流程追蹤", weight: 2 },
  { text: "重拋機制", weight: 2 },
  { text: "例外處理", weight: 2 },
  { text: "錯誤代碼定義", weight: 2 },
  { text: "Retry 機制", weight: 2 },
  { text: "手動觸發", weight: 2 },
  { text: "Metric", weight: 3 },
  { text: "背壓設計", weight: 2 },
  { text: "日誌", weight: 1 },
  { text: "不易排查錯誤", weight: 1 },
  { text: "難以進行還原測試", weight: 1 },
  { text: "Retry Interval", weight: 1 },
  { text: "FIFO", weight: 1 },
  { text: "LIFO", weight: 1 },
];

function TagCloudCardsPage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cap = (s: string) => <div style={{ fontSize: DS.small, color: c.muted, marginBottom: DGAP.xs }}>{s}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: DGAP.md, height: area.h }}>
      <div style={{ flex: "none" }}>
        {cap("<TagCloud> 21 個標籤 · 四級權重（對齊 bullmq p4 / tus p3）")}
        <TagCloud dark={dark} style={{ flex: "none", height: 190 }} items={PAINS} />
      </div>
      <div style={{ flex: "none" }}>
        {cap("<Cards recommended> —— 被選中的方案加粗框 + check icon + 文字（audit A-6）")}
        <Cards
          dark={dark}
          columns={4}
          style={{ flex: "none" }}
          items={[
            { n: "A", title: "使用 iframe", desc: "簡單上手、可有效隔離資源", tone: "muted" },
            { n: "B", title: "JS 載入模組", desc: "引入腳本即可使用", tone: "muted" },
            { n: "C", title: "Web Component", desc: "元件之間各自獨立", tone: "muted" },
            { n: "D", title: "Webpack Federation", desc: "可獨立部署、獨立擴展", tone: "orange", recommended: true },
          ]}
        />
      </div>
    </div>
  );
}

// ── <Quadrant> 典型用法：左欄敘述 + 右側 2×2，只強調一格 ────────────────────
function QuadrantPage({ dark }: CustomSlideProps) {
  return (
    <Quadrant
      dark={dark}
      lead="把「策略價值」與「落地確定性」交叉，四種處境各自對應不同的投入方式 —— 同一個功能落在哪一格，決定的是要不要現在做，而不是要不要做。"
      yAxis="策略價值"
      yNote="對長期定位的影響，不是短期使用量"
      xAxis="落地確定性"
      xNote="技術路徑與驗收標準是否已清楚"
      takeaway="只有右上那一格值得現在排進 sprint。"
      cells={[
        { title: "押注區", desc: "值得做，但路徑還沒清楚。先做一次小規模驗證再談排程。", items: ["自動生成版型", "跨筆記敘事"] },
        {
          title: "優先投入",
          desc: "價值與確定性都高，資源該集中在這裡。",
          items: ["版型庫", "填充契約"],
          emphasis: true,
        },
        { title: "先擱置", desc: "兩邊都不強。記錄下來就好，不要佔用討論時間。", items: ["主題切換 UI"] },
        { title: "順手做", desc: "做得出來但影響有限，適合塞進零碎時間。", items: ["匯出 PDF"] },
      ]}
    />
  );
}

// ── <Waterfall> 典型用法：含一段負增量（沿用既有元件省下的工時）───────────────
function WaterfallPage({ dark, area }: CustomSlideProps) {
  return (
    <Waterfall
      dark={dark}
      width={area.w}
      height={area.h}
      unit="h"
      lead="一份 deck 從讀筆記到驗收通過的工時拆解。沿用筆記既有的互動元件是唯一會讓總數下降的一段。"
      headline={{ value: "31h", label: "單份 deck 合計" }}
      steps={[
        { label: "讀筆記", value: 3 },
        { label: "規劃大綱", value: 5 },
        { label: "寫 deck", value: 18 },
        { label: "沿用既有元件", value: -6 },
        { label: "驗證與修正", value: 11 },
      ]}
      totalLabel="合計"
      takeaway="寫 deck 佔掉一半以上 —— 版型存量正是為了壓縮這一段。"
    />
  );
}

// ── <Triad> 典型用法：置中主張 + 三支撐點 ──────────────────────────────────
function TriadPage({ dark }: CustomSlideProps) {
  return (
    <Triad
      dark={dark}
      chip="選頁填字"
      statement="簡報好不好看，不是排版問題，是版型存量問題。"
      emphasis="版型存量"
      items={[
        { label: "版型庫", desc: "預先設計好的成品頁，生成時只負責挑，不負責想。", icon: "layers" },
        { label: "填充契約", desc: "每個文字槽標好字數上限，生成前就擋，不靠事後截圖抓。", icon: "file" },
        { label: "不重複規則", desc: "同一份 deck 內版型不得重用，節奏由機器保證。", icon: "settings" },
      ]}
      meta="構圖參考 dashi-ppt theme07，版面語彙以本專案設計系統重寫"
    />
  );
}

// ── <Heatmap> 典型用法：4 欄 × 5 列，強度跨滿 0–1 ─────────────────────────────
function HeatmapPage({ dark }: CustomSlideProps) {
  return (
    <Heatmap
      dark={dark}
      columns={["手寫 SVG", "recharts", "d3", "motion"]}
      rows={[
        { label: "流程 / 時序圖", cells: [1, 0.1, 0.25, 0.4] },
        { label: "有軸的量化資料", cells: [0.3, 1, 0.7, 0.15] },
        { label: "非標準座標系", cells: [0.45, 0.2, 0.95, 0.3] },
        { label: "scroll 驅動的動畫", cells: [0.35, 0.05, 0.4, 1] },
        { label: "架構 / 拓撲圖", cells: [0.9, 0, 0.5, 0.2] },
      ]}
      scale={["不適合", "首選"]}
      note="依 content-visualize 決策樹整理"
    />
  );
}

// ── <Ranking> 典型用法：8 列（達建議上限）+ 前二名重點 + 變化欄 ─────────────────
function RankingPage({ dark }: CustomSlideProps) {
  return (
    <Ranking
      dark={dark}
      unit="次"
      highlightTop={2}
      lead="既有 8 份 deck 裡各原子的實際使用次數。用得最多的兩個決定了版型庫該先補什麼。"
      note="口徑：以 custom 頁內的 import 計，同頁重複只計一次"
      items={[
        { label: "Rows", value: 24, meta: "並列要點清單", delta: 3 },
        { label: "Cards", value: 19, meta: "分組卡片", delta: 5 },
        { label: "Stages", value: 12, meta: "流程與時間軸", delta: 0 },
        { label: "Compare", value: 9, meta: "兩方案對決", delta: -2 },
        { label: "Kpi", value: 8, meta: "頭條數字" },
        { label: "Table", value: 6, meta: "交叉對照矩陣", delta: 1 },
        { label: "Code", value: 4, meta: "程式碼片段" },
        { label: "Chart", value: 2, meta: "量化圖表", delta: -1 },
      ]}
    />
  );
}

// ── <Risk> 典型用法：5 條（達建議上限）、三種等級都出現 ─────────────────────────
function RiskPage({ dark }: CustomSlideProps) {
  return (
    <Risk
      dark={dark}
      lead="把 dashi 的版型搬進 NoteCraft 這件事，真正的風險不在工程量。"
      items={[
        {
          risk: "視覺驗證缺口",
          level: "critical",
          impact: "截圖能力不可用時，只能保證不溢出，保證不了好看。",
          mitigation: "每批做完由作者亮暗各看一次再往下做，不累積未驗收的頁。",
        },
        {
          risk: "授權界線",
          level: "warning",
          impact: "逐頁 1:1 還原會從「參考」變成「重製 AGPL 專案的表達」。",
          mitigation: "只取構圖決策，色票字級一律改走本專案 token，並在檔頭註明出處。",
        },
        {
          risk: "版型與筆記題材不合",
          level: "warning",
          impact: "theme07 是融資報告，照搬會讓技術筆記削足適履。",
          mitigation: "只挑語境中性的版面，逐個改寫成技術筆記用得上的語彙。",
        },
        {
          risk: "原子過多反而難選",
          level: "good",
          impact: "22 個原子已接近人腦一次能權衡的上限。",
          mitigation: "每個檔頭都寫明「與 X 的分界」，讓選型有依據而非憑印象。",
        },
        {
          risk: "既有 deck 需回歸",
          level: "good",
          impact: "barrel 變動可能影響已生成的 8 份 deck。",
          mitigation: "純新增匯出、不改既有簽章；每批跑 tsc 與 astro build 確認基準不變。",
        },
      ]}
      takeaway="只有第一條需要你介入，其餘都已在流程裡處理掉。"
    />
  );
}

// ── <Contents> 典型用法：8 格（達建議上限）+ current 定位 ────────────────────────
function ContentsPage({ dark }: CustomSlideProps) {
  return (
    <Contents
      dark={dark}
      current={3}
      lead="版型庫從盤點到收斂的完整路徑。目前走到第三站 —— 前兩站的結論已經固定，不再回頭。"
      items={[
        { title: "盤點差異", sub: "量出 1020 對 6 的落差" },
        { title: "決定架構", sub: "選頁填字，不是加規則" },
        { title: "累積版型", sub: "每批 3–5 個，逐批驗收" },
        { title: "填充契約", sub: "字數上限事前擋" },
        { title: "選頁機制", sub: "role 檢索與不重複規則" },
        { title: "改寫 Skill", sub: "custom 頁降級為例外" },
        { title: "真實筆記試跑", sub: "與現況並排比較" },
        { title: "決定是否擴充", sub: "看成效再談 40 頁" },
      ]}
    />
  );
}

// ── <BeforeAfter> 典型用法：5 列，含一列 better="before" 的反向指標 ──────────────
function BeforeAfterPage({ dark }: CustomSlideProps) {
  return (
    <BeforeAfter
      dark={dark}
      beforeLabel="現況（現場組版）"
      afterLabel="目標（選頁填字）"
      lead="同一篇筆記轉成 deck 的成本結構。唯一會變差的是原子總數 —— 那是這個方案的代價，不是副作用。"
      rows={[
        { label: "可選版型數", before: "6", after: "40+", delta: "×6.7", better: "after" },
        { label: "單份 deck 工時", before: "31h", after: "9h", delta: "−71%", better: "after" },
        { label: "AI 產出行數", before: "700–1150", after: "60–90", delta: "−92%", better: "after" },
        { label: "溢出返工輪次", before: "2–3", after: "0", delta: "事前擋下", better: "after" },
        { label: "原子總數", before: "17", after: "40+", delta: "選型變難", better: "before" },
      ]}
      takeaway="工時省下來的部分，一次性付在版型庫的建置上。"
    />
  );
}

// ── <Summary> 典型用法：論點 + 右欄要點 + 底部 4 格統計 ─────────────────────────
function SummaryPage({ dark }: CustomSlideProps) {
  return (
    <Summary
      dark={dark}
      lead="NoteCraft 的簡報品質差距，不在提示詞寫得夠不夠嚴格，而在版型存量。對照組有 1020 個由人設計完成的成品頁，我們有 6 個版型加一塊自由畫布。"
      takeaway="補的是存量，不是規則。"
      points={[
        { label: "設計在事前", desc: "生成時只負責挑頁與填字，不負責想版面。" },
        { label: "容量事前擋", desc: "每個文字槽標好字數上限，不靠事後截圖抓溢出。" },
        { label: "節奏靠機器", desc: "同一份 deck 內版型不得重用。" },
      ]}
      stats={[
        { v: "1020", k: "對照組版型數", note: "12 套主題" },
        { v: "6", k: "現有版型數", note: "含 1 個自由頁" },
        { v: "29", k: "本批後的原子數" },
        { v: "0", k: "溢出警告", note: "三批累計" },
      ]}
    />
  );
}

// ── <Cross> 典型用法：A × B = C + 右側三張說明卡 ───────────────────────────────
function CrossPage({ dark }: CustomSlideProps) {
  return (
    <Cross
      dark={dark}
      lead="把「誰來設計」與「何時設計」兩個角度疊起來，就能看出兩套工具的差別不在能力，而在時序。"
      a="人設計版面"
      b="事前完成"
      result="選頁填字"
      notes={[
        { label: "只換第一項", desc: "AI 設計 × 事前完成 = 版型庫自動生成。可行，但品質仍看模型當下發揮。" },
        { label: "只換第二項", desc: "人設計 × 生成時完成 = 每份簡報找設計師。品質最好，但不可規模化。" },
        { label: "兩項都不換", desc: "AI 設計 × 生成時完成 = 現況。這正是差距的來源。" },
      ]}
      takeaway="能規模化又能保品質的，只有右上那一格。"
    />
  );
}

// ── <Share> 典型用法：6 段達上限，含一段 emphasis ──────────────────────────────
function SharePage({ dark }: CustomSlideProps) {
  return (
    <Share
      dark={dark}
      lead="單份 deck 的工時分布。寫版面這一段吃掉最多，也正是版型庫要壓縮的目標。"
      axisLabel="工時佔比 · 按工作類型分層"
      segments={[
        { label: "寫版面", value: 18, emphasis: true },
        { label: "驗證與修正", value: 11 },
        { label: "規劃大綱", value: 5 },
        { label: "讀筆記", value: 3 },
        { label: "選型決策", value: 2 },
        { label: "其他", value: 1 },
      ]}
      takeaway="壓掉寫版面那段，總工時就少掉四成五。"
    />
  );
}

// ── <Layers> 典型用法：4 層 + 方向軸 + 一層 emphasis ───────────────────────────
function LayersPage({ dark }: CustomSlideProps) {
  return (
    <Layers
      dark={dark}
      lead="版型庫不是一堆平行的元件，而是四層依賴。上層換掉不影響下層，下層一改整批都要重驗。"
      axis={["基礎", "產出"]}
      layers={[
        { n: "L4", label: "deck 檔", desc: "一篇筆記一份", items: ["選頁", "填字"] },
        { n: "L3", label: "版型庫", desc: "本次在做的", items: ["Quadrant", "Waterfall", "Heatmap", "Decision"], emphasis: true },
        { n: "L2", label: "原子層", desc: "既有 14 個", items: ["Rows", "Cards", "Stages", "Chart"] },
        { n: "L1", label: "設計系統", desc: "trendlink-design", items: ["DS 字級", "dkt 色票", "DGAP 間距"] },
      ]}
    />
  );
}

// ── <Decision> 典型用法：4 選項（1 chosen）+ 決定 + 後果 ────────────────────────
function DecisionPage({ dark }: CustomSlideProps) {
  return (
    <Decision
      dark={dark}
      context="dashi-ppt 有 1020 個現成版型，授權為 AGPL-3.0。要不要直接把它們搬進 NoteCraft？"
      options={[
        { label: "直接搬程式碼", note: "只拿得到 minified bundle，且整個 NoteCraft 會被 AGPL 傳染。" },
        { label: "改用 dashi 產簡報", note: "產物是獨立 HTML，嵌不了筆記既有的互動元件。" },
        { label: "搬架構不搬程式碼", note: "取選頁填字的設計思路，版型自己重做。", chosen: true },
        { label: "維持現況", note: "省下工，但品質差距不會自己消失。" },
      ]}
      decision="取其架構決策，版面語彙以本專案設計系統重寫"
      status="採用"
      consequences={[
        "不觸及 AGPL —— 產物是自己寫的，沒有重製或散布對方程式碼。",
        "保留了嵌入 @ai-visualize 互動元件的能力，那是對方架構做不到的。",
        "代價是版型要自己一個一個累積，短期內數量遠不及對照組。",
        "原子總數上升，選型難度跟著上升，需靠檔頭的分界說明彌補。",
      ]}
    />
  );
}

// ── <Spectrum> 典型用法：5 個標記達上限，上下交錯 ──────────────────────────────
function SpectrumPage({ dark }: CustomSlideProps) {
  return (
    <Spectrum
      dark={dark}
      left="完全由 AI 現場決定"
      right="完全由人事前決定"
      lead="簡報生成工具在這條軸上的落點。越往右品質越穩定，但建置成本也越高。"
      marks={[
        { label: "純提示詞生成", at: 0.02, note: "每次結果都不一樣" },
        { label: "原子層 + 自由排版", at: 0.3, note: "NoteCraft 現況" },
        { label: "版型庫 + 選頁填字", at: 0.72, note: "本次的目標", emphasis: true },
        { label: "dashi-ppt", at: 0.88, note: "1020 個成品頁" },
        { label: "人工做簡報", at: 1, note: "不可規模化" },
      ]}
      takeaway="目標不是走到最右邊，是走到品質夠穩、成本還付得起的那一點。"
    />
  );
}

// ── <Roster> 典型用法：5 個周邊角色 + 中心 ─────────────────────────────────────
function RosterPage({ dark, area }: CustomSlideProps) {
  return (
    <Roster
      dark={dark}
      width={area.w}
      height={area.h}
      lead="版型庫建好之後，圍繞它的五個角色各自負責一段，彼此之間沒有先後。"
      center={{ label: "版型庫", note: "L3" }}
      actors={[
        { label: "present-planner", role: "選頁", icon: "target" },
        { label: "slide-generator", role: "填字", icon: "file" },
        { label: "填充契約", role: "擋溢出", icon: "lock" },
        { label: "trendlink-design", role: "供 token", icon: "layers" },
        { label: "作者", role: "驗收視覺", icon: "user" },
      ]}
    />
  );
}

// ── <Compare> + <Kpi>：補上原本漏掉的兩個原子，順帶示範「組合級並排」 ──────────
// 這兩個是既有 14 個裡唯二沒有驗證頁的（Task 46 補齊）。
// Compare 每側 5 列接近上限、Kpi 4 格，兩者上下並排即為升級路徑第 2 級的樣子。
function CompareKpiPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Compare
        dark={dark}
        left={{
          tag: "方案 A",
          name: "搬 dashi 的版型",
          tone: "blue",
          rows: [
            ["取得成本", "極低，現成 1020 頁"],
            ["可改性", "無 —— 只有 minified bundle"],
            ["授權", "AGPL 會傳染整個專案"],
            ["設計系統", "色碼寫死，接不上 trendlink"],
            ["互動元件", "靜態 HTML，嵌不進去"],
          ],
        }}
        right={{
          tag: "方案 B",
          name: "自建版型庫",
          tone: "orange",
          badge: "採用",
          rows: [
            ["取得成本", "高，一個一個做"],
            ["可改性", "完全可控"],
            ["授權", "自己寫的，無牽連"],
            ["設計系統", "原生走 dkt token"],
            ["互動元件", "保留 CanvasViewport 嵌入"],
          ],
        }}
      />
      <Kpi
        dark={dark}
        style={{ flex: "none" }}
        items={[
          { label: "原子總數", value: "29", sub: "14 → 29" },
          { label: "整頁級", value: "15", sub: "本次新增" },
          { label: "溢出警告", value: "0", sub: "三批累計" },
          { label: "tsc 錯誤", value: "19", sub: "與基準相同" },
        ]}
      />
    </>
  );
}

const deck: Deck = {
  slug: "atoms",
  title: "Deck 原子層驗證基準",
  eyebrow: "內部驗證用 · 非筆記產物",
  generatedAt: "2026-07-31",
  source: "docs/deck-atoms-inventory.md",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT · 原子層驗證基準",
      title: "Deck Atoms",
      subtitle: "每個原子一頁，含典型用法與邊界狀態；密度上限從這裡量出來",
      meta: ["手寫維護，不由 slide-generator 生成", "新增原子必須補頁"],
      agenda: [
        { n: "01", title: "<Code>", sub: "程式碼呈現（Task 38）" },
        { n: "02", title: "<Annotate>", sub: "通用標註層（Task 39）" },
        { n: "03", title: "<Chart>", sub: "量化圖表（Task 40）" },
        { n: "04", title: "<Terminal> / <Frame> / <Mark>", sub: "三個小原子（Task 41）" },
        { n: "05", title: "<Stages> 變體 / <TagCloud> / <LogoRow>", sub: "流程變體與小增強（Task 42）" },
      ],
    },
    {
      layout: "custom",
      nav: "Code · 典型",
      num: "01",
      eyebrow: "ATOM · <Code>",
      title: "行尾註解 + 左側標籤 + 檔名標頭",
      titleNote: "A1 / A2 / A6",
      render: CodeTypicalPage,
      callout: { icon: "info", text: "語法上色與筆記內文共用同一支 tokenizer（@/lib/code-tokenize）" },
    },
    {
      layout: "custom",
      nav: "Code · 逐步高亮",
      num: "01",
      eyebrow: "ATOM · <Code>",
      title: "同一份程式碼，跨頁換高亮",
      titleNote: "A3 · startLine + highlight",
      render: CodeProgressivePage,
      footnotes: [{ n: "1", text: "真實 deck 會是兩頁；並排只是為了讓截圖一次看到差異" }],
    },
    {
      layout: "custom",
      nav: "Code · 邊界",
      num: "01",
      eyebrow: "ATOM · <Code>",
      title: "邊界狀態",
      titleNote: "空資料 / 超長行 / 上限 / marker",
      render: CodeEdgePage,
      callout: { icon: "alert", tone: "warning", text: "這頁刻意要它難看 —— 問題若在截圖裡看不出來，就代表沒被擋住" },
    },
    {
      layout: "custom",
      nav: "Code · 密度上限",
      num: "01",
      eyebrow: "ATOM · <Code>",
      title: "行數上限量測",
      titleNote: "無 callout / 無 caption 的乾淨情境",
      render: CodeDensityPage,
      footnotes: [{ n: "1", text: "這頁一旦出現 dev 溢出紅框，就代表 Code.tsx 的 LIMIT_LINES 設太大" }],
    },
    {
      layout: "custom",
      nav: "Annotate · 典型",
      num: "02",
      eyebrow: "ATOM · <Annotate>",
      title: "編號熱點 + 左右引線標籤",
      titleNote: "E1 · 對齊 bullmq p12 / nifi p5",
      render: AnnotateTypicalPage,
      callout: { icon: "info", text: "標籤住在保留出來的側欄，不覆蓋 children —— 座標一律用百分比" },
    },
    {
      layout: "custom",
      nav: "Annotate · 邊界",
      num: "02",
      eyebrow: "ATOM · <Annotate>",
      title: "邊界狀態",
      titleNote: "密集避讓 / top-bottom / children 換成 <Code>",
      render: AnnotateEdgePage,
      callout: { icon: "alert", tone: "warning", text: "左圖四條引線的目標點刻意擠在一起 —— 標籤若重疊就是避讓失效" },
    },
    {
      layout: "custom",
      nav: "Chart · 有軸圖表",
      num: "03",
      eyebrow: "ATOM · <Chart>",
      title: "長條與折線",
      titleNote: "D3 · 尺寸由頁面從 area 算好傳入",
      render: ChartTypicalPage,
      callout: { icon: "info", text: "數值直接標在圖元上 —— 投影片沒有 hover，tooltip 一律禁用" },
    },
    {
      layout: "custom",
      nav: "Chart · 比例與進度",
      num: "03",
      eyebrow: "ATOM · <Chart>",
      title: "比例分解與進度條列",
      titleNote: "D1 / D2 · 唯二有實證頁的變體",
      render: ChartVariantsPage,
      footnotes: [{ n: "1", text: "bars 不走 recharts —— 一排橫條用 flex 就夠，背整套座標系反而更重" }],
    },
    {
      layout: "custom",
      nav: "Chart · 邊界",
      num: "03",
      eyebrow: "ATOM · <Chart>",
      title: "邊界狀態",
      titleNote: "系列數硬上限 / 堆疊",
      render: ChartEdgePage,
      callout: { icon: "alert", tone: "warning", text: "系列數上限 3 是硬規則（inventory §5 決議 1）——型別擋不住陣列長度，只能在元件內擋" },
    },
    {
      layout: "custom",
      nav: "Terminal / Frame",
      num: "04",
      eyebrow: "ATOM · <Terminal> / <Frame>",
      title: "終端機與擬真框",
      titleNote: "A4 / A5 / E2",
      render: TerminalFramePage,
      callout: { icon: "info", text: "Terminal 的顏色取自 <Code> 的 codeTone —— 同一份簡報裡兩者色系必須一致" },
    },
    {
      layout: "custom",
      nav: "Frame / Mark",
      num: "04",
      eyebrow: "ATOM · <Frame> / <Mark>",
      title: "狀態框與行內螢光筆",
      titleNote: "E4 / F4",
      render: FrameMarkPage,
      footnotes: [{ n: "1", text: "Mark 不另開 markBg token —— 用 color-mix 從 tone 前景色即時調底，一行涵蓋 6 個 tone × 明暗兩階" }],
    },
    {
      layout: "custom",
      nav: "Stages · linear / rail",
      num: "05",
      eyebrow: "ATOM · <Stages>",
      title: "線性與里程碑軌",
      titleNote: "C1 / C2 · variant 不給時外觀不變",
      render: StagesVariantsPage,
      callout: { icon: "info", text: "rail 不畫箭頭 —— 軸本身已經表達方向，再加箭頭是重複編碼" },
    },
    {
      layout: "custom",
      nav: "Stages · cycle",
      num: "05",
      eyebrow: "ATOM · <Stages> / <Rows> / <LogoRow>",
      title: "循環流程、chip 列與 logo 組合",
      titleNote: "C3 / F2 / F5",
      render: StagesCyclePage,
      footnotes: [{ n: "1", text: "cycle 是唯一有幾何計算的 variant：節點沿圓周均分，標籤放不下時縮環半徑而不是縮字級" }],
    },
    {
      layout: "custom",
      nav: "TagCloud / Cards",
      num: "05",
      eyebrow: "ATOM · <TagCloud> / <Cards>",
      title: "文字雲與推薦角標",
      titleNote: "F1 / F3",
      render: TagCloudCardsPage,
      callout: { icon: "alert", tone: "warning", text: "TagCloud 只在真的有一組並列、無先後關係的短詞時使用 —— 不要拿來塞同義詞充版面" },
    },
    {
      layout: "custom",
      nav: "Quadrant · 典型",
      num: "06",
      eyebrow: "ATOM · <Quadrant>",
      title: "兩軸四象限定位",
      titleNote: "G1 · 左欄敘述 + 右側矩陣",
      render: QuadrantPage,
      legend: [{ label: "重點象限", tone: "blue" }],
      callout: { icon: "info", text: "四格不可增減、不可重排 —— 格子的位置本身就是資訊。離散類別請改用 <Table>" },
    },
    {
      layout: "custom",
      nav: "Waterfall · 典型",
      num: "06",
      eyebrow: "ATOM · <Waterfall>",
      title: "累計貢獻拆解",
      titleNote: "G2 · 含一段負增量",
      render: WaterfallPage,
      legend: [
        { label: "各段增量", tone: "blue" },
        { label: "合計", tone: "orange" },
      ],
      footnotes: [{ n: "1", text: "尺度取累計軌跡的最高點而非總計 —— 有負段時中途可能高於總計" }],
    },
    {
      layout: "custom",
      nav: "Triad · 典型",
      num: "06",
      eyebrow: "ATOM · <Triad>",
      title: "主張加三個支撐點",
      titleNote: "G3 · 固定三欄",
      render: TriadPage,
      callout: { icon: "lightbulb", text: "三欄是型別上釘死的 —— 要四個就改用 <Cards>，不要把「三」當成剛好的數量" },
    },
    {
      layout: "custom",
      nav: "Heatmap · 典型",
      num: "07",
      eyebrow: "ATOM · <Heatmap>",
      title: "單色階強度矩陣",
      titleNote: "G4 · 4 欄 × 5 列",
      render: HeatmapPage,
      callout: {
        icon: "info",
        text: "底色最深只染到 26% —— 剩下的強度差由量條長度與數值補足，深色底才不會壓掉文字對比",
      },
    },
    {
      layout: "custom",
      nav: "Ranking · 典型",
      num: "07",
      eyebrow: "ATOM · <Ranking>",
      title: "排序榜",
      titleNote: "G5 · 8 列達上限 + 前二重點",
      render: RankingPage,
      footnotes: [{ n: "1", text: "變化欄刻意不上狀態色 —— 「上升」在不同題目裡可能是好事也可能是壞事" }],
    },
    {
      layout: "custom",
      nav: "Risk · 典型",
      num: "07",
      eyebrow: "ATOM · <Risk>",
      title: "風險研判",
      titleNote: "G6 · 5 條達上限、三種等級齊備",
      render: RiskPage,
      legend: [
        { label: "高", tone: "critical" },
        { label: "中", tone: "warning" },
        { label: "低", tone: "good" },
      ],
      callout: { icon: "alert", tone: "warning", text: "缺 mitigation 會在 dev console 被點名 —— 沒有緩解的風險清單只是抱怨" },
    },
    {
      layout: "custom",
      nav: "Contents · 典型",
      num: "07",
      eyebrow: "ATOM · <Contents>",
      title: "章節導覽",
      titleNote: "G7 · 8 格達上限 + current 定位",
      render: ContentsPage,
      footnotes: [{ n: "1", text: "編號由元件依順序產生，呼叫端不能自己編 —— 目錄的序號必然連續" }],
    },
    {
      layout: "custom",
      nav: "BeforeAfter · 典型",
      num: "07",
      eyebrow: "ATOM · <BeforeAfter>",
      title: "量化前後對比",
      titleNote: "G8 · 含一列反向指標",
      render: BeforeAfterPage,
      callout: { icon: "info", text: "better 不給就兩側都中性 —— 「數字變大」是好是壞由呼叫端明講，元件不猜" },
    },
    {
      layout: "custom",
      nav: "Summary · 典型",
      num: "08",
      eyebrow: "ATOM · <Summary>",
      title: "開場濃縮",
      titleNote: "G9 · 論點 + 要點 + 統計卡",
      render: SummaryPage,
      callout: { icon: "info", text: "一份 deck 最多用一次 —— 用兩次就代表主線沒收斂" },
    },
    {
      layout: "custom",
      nav: "Cross · 典型",
      num: "08",
      eyebrow: "ATOM · <Cross>",
      title: "兩個面向交叉推論",
      titleNote: "G10 · A × B = C",
      render: CrossPage,
      callout: {
        icon: "lightbulb",
        text: "與 <Quadrant> 的差別：Quadrant 是地圖（很多項目落在四格），Cross 是公式（兩個角度推出一個結論）",
      },
    },
    {
      layout: "custom",
      nav: "Share · 典型",
      num: "08",
      eyebrow: "ATOM · <Share>",
      title: "分段佔比條",
      titleNote: "G11 · 6 段達上限",
      render: SharePage,
      footnotes: [
        { n: "1", text: "能放到 6 段不是放寬 donut 的 3 片規則 —— 線性長度可直接比較，且每段都自標名稱與百分比，顏色不承載身分" },
      ],
    },
    {
      layout: "custom",
      nav: "Layers · 典型",
      num: "08",
      eyebrow: "ATOM · <Layers>",
      title: "分層堆疊",
      titleNote: "G12 · 4 層 + 方向軸",
      render: LayersPage,
      callout: { icon: "alert", tone: "warning", text: "分層是上下依賴、不是先後順序 —— 有時間順序請改用 <Stages>" },
    },
    {
      layout: "custom",
      nav: "Decision · 典型",
      num: "08",
      eyebrow: "ATOM · <Decision>",
      title: "決策記錄",
      titleNote: "G13 · 背景 / 選項 / 決定 / 後果",
      render: DecisionPage,
      callout: { icon: "info", text: "沒被選的選項一定要留在畫面上 —— 只寫結論的決策記錄，半年後沒人敢改" },
    },
    {
      layout: "custom",
      nav: "Spectrum · 典型",
      num: "08",
      eyebrow: "ATOM · <Spectrum>",
      title: "一維取捨光譜",
      titleNote: "G14 · 5 個標記、上下交錯",
      render: SpectrumPage,
      footnotes: [{ n: "1", text: "兩極都是有名字的立場，不是「沒有」與「全部」—— 這是與 <Chart variant=\"bars\"> 的分界" }],
    },
    {
      layout: "custom",
      nav: "Roster · 典型",
      num: "08",
      eyebrow: "ATOM · <Roster>",
      title: "中心與周邊角色",
      titleNote: "G15 · 5 個角色、放射狀",
      render: RosterPage,
      callout: { icon: "info", text: "周邊節點彼此沒有順序 —— 會繞回起點的循環流程請用 <Stages variant=\"cycle\">" },
    },
    {
      layout: "custom",
      nav: "Compare / Kpi",
      num: "09",
      eyebrow: "ATOM · <Compare> / <Kpi>",
      title: "兩案對決與頭條數字",
      titleNote: "補齊 · 組合級並排",
      render: CompareKpiPage,
      footnotes: [{ n: "1", text: "這兩個原子原本沒有驗證頁（Task 46 補齊）—— deck 檔頭要求「每個原子至少一頁」" }],
    },
  ],
};

export default deck;
