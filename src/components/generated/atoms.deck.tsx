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
import { Annotate, Cards, Chart, Code, Frame, LogoRow, Mark, Rows, Stages, TagCloud, Terminal } from "@/components/deck/blocks";
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
  ],
};

export default deck;
