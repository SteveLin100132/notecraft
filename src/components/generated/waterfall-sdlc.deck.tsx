// deck 資料模組：對應筆記 waterfall-sdlc.mdx（專案管理系列 第四章）。
//
// 核心設計：本檔自建一支 <WaterfallStair> 階梯 SVG／版面元件，在 4 頁重複出現、
// 只換「標記層」（時期色帶 / 會議括號 / 交付物鏈 / 三層疊加）。
// 理由是契約 §敘事切分 第 6 條 —— 多頁講同一個系統的不同面向時，重用同一個視覺
// 比每頁新畫一張圖好：讀者只建立一次空間記憶，之後每頁只讀「這次多亮了什麼」。
//
// 筆記的「總體對照表」有 9 列，超過 <Table> 6 列上限；而且表格讀不出「單向遞降」
// 這個本篇最重要的形狀 —— 所以改由 stair 的三欄疊加頁（P08）承擔。
//
// 兩個 @ai-visualize 既有元件（waterfall-lifecycle / waterfall-change-cost）
// 走 custom 頁 + <CanvasViewport> 嵌入，播放時仍可互動。
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { Cards, Stages } from "@/components/deck/blocks";
import { CanvasViewport } from "@/components/deck/CanvasViewport";
import type { CanvasMode } from "@/components/deck/CanvasViewport";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import WaterfallLifecycle from "@/components/generated/waterfall-lifecycle";
import WaterfallChangeCost from "@/components/generated/waterfall-change-cost";

// ── 資料：九階段 × 交付物 ────────────────────────────────────

interface StageDatum {
  n: string;
  en: string;
  zh: string;
  /** 階段說明（投影尺度，一行讀完） */
  desc: string;
  /** Cutover 視情況 —— 用虛線與淡化編碼這個真實資訊 */
  optional?: boolean;
  /** 該階段的交付物；null = 這一階沒有文件交付物 */
  doc: string | null;
  docNote: string;
}

const STAGES: StageDatum[] = [
  {
    n: "01",
    en: "Blueprint",
    zh: "藍圖",
    desc: "確認目標、範疇與預期成果，把模糊想法收斂成可被估算的輪廓。",
    doc: "PRD",
    docNote: "定義「為什麼要做」與「成功長什麼樣」。",
  },
  {
    n: "02",
    en: "System Analysis",
    zh: "系統分析",
    desc: "把藍圖翻譯成「系統做什麼」：訪談需求、釐清業務流程、定義使用者情境。",
    doc: "SRS",
    docNote: "把 PRD 轉成可驗證的系統需求。",
  },
  {
    n: "03",
    en: "System Design",
    zh: "系統設計",
    desc: "把「做什麼」轉成「怎麼做」：架構、資料模型、介面、API、權限與整合點。",
    doc: "SDD",
    docNote: "承接 SRS 給出架構與細部設計。",
  },
  {
    n: "04",
    en: "Coding",
    zh: "開發",
    desc: "依設計文件實作。開發者不必重新想需求，只需把 SDD 變成程式。",
    doc: null,
    docNote: "沒有新文件 —— 程式碼本身就是這一階的產出。",
  },
  {
    n: "05",
    en: "SIT",
    zh: "系統整合測試",
    desc: "QA 驗證模組與系統間能否正確協作，重點是「整體會不會壞」而非「功能對不對」。",
    doc: "Test Plan / Test Case",
    docNote: "對應 SRS 與 SDD 中的可驗證項。",
  },
  {
    n: "06",
    en: "UAT",
    zh: "使用者驗收測試",
    desc: "用戶依驗收標準實際操作；通過代表業務方認可系統可以上線。",
    doc: "UAT Checklist",
    docNote: "驗收清單，是業務方簽收的依據。",
  },
  {
    n: "07",
    en: "Cutover",
    zh: "切換",
    desc: "資料移轉、停機計畫、舊系統下線與進退版機制。全新系統無歷史資料時可略過。",
    optional: true,
    doc: "Cutover Plan",
    docNote: "切換計畫，含資料移轉、停機與進退版策略。",
  },
  {
    n: "08",
    en: "Go-Live",
    zh: "上線",
    desc: "系統正式對外運作。此刻起任何修改都是 Production 修改，成本最高。",
    doc: null,
    docNote: "沒有新文件 —— 上線本身就是交付。",
  },
  {
    n: "09",
    en: "Maintenance",
    zh: "維運",
    desc: "上線後的維護、修補與優化；也是知識回流到下次專案藍圖的階段。",
    doc: "Maintenance Manual",
    docNote: "維運手冊，是 Handover 會議的核心交付。",
  },
];

// ── 資料：五場管控會議（以「跨哪幾階」建模，括號的形狀本身就是資訊）────

interface MeetingDatum {
  en: string;
  zh: string;
  /** 起訖階段索引（含）。Milestone Review 真的橫跨 SA～SIT，畫成跨列括號 */
  from: number;
  to: number;
  note: string;
}

const MEETINGS: MeetingDatum[] = [
  {
    en: "Kickoff Meeting",
    zh: "啟動會議",
    from: 0,
    to: 0,
    note: "對齊目標、範疇、角色責任與初步計畫；唯一不審查交付物、而是建立共識的會議。",
  },
  {
    en: "Milestone Review Meeting",
    zh: "里程碑審查會議",
    from: 1,
    to: 4,
    note: "於每道閘門評估進度與成果、決定是否放行下一階段，是 Waterfall 的節拍器。",
  },
  {
    en: "UAT Meeting",
    zh: "使用者驗收會議",
    from: 5,
    to: 5,
    note: "讓用戶與利害關係人實際參與驗收、簽署驗收文件，是業務側對系統的正式背書。",
  },
  {
    en: "Go-Live Meeting",
    zh: "上線會議",
    from: 6,
    to: 7,
    note: "確認部署計畫、步驟、責任分工、回退機制與支援資源，讓上線當天沒有意外。",
  },
  {
    en: "Handover Meeting",
    zh: "交接會議",
    from: 8,
    to: 8,
    note: "把成果與文件交接給維運團隊，含專案總結、知識轉移、未結項目與已知風險。",
  },
];

// 三個時期。這是「修改成本」的量級序列，所以用單一色相由淺到深（dataviz 規則：
// 量級用單色階，不用綠黃紅混色）。
const PERIODS = [
  { label: "構思期", from: 0, to: 2 },
  { label: "建置期", from: 3, to: 5 },
  { label: "上線期", from: 6, to: 8 },
];

/** 這一階的閘門要審什麼。沒有文件交付物的兩階，審的是產出本身 */
const gateOf = (s: StageDatum): string =>
  s.doc ?? (s.en === "Coding" ? "程式碼" : "上線作業");

// ── 共用視覺：瀑布階梯 ──────────────────────────────────────
//
// 一支元件、四種標記層。階段欄逐級往右下遞降（呼應「水只能往下流」），
// 附加欄則對齊成直欄 —— 斜的部分承擔隱喻，直的部分承擔可讀性。

type StairCol = "meeting" | "doc";

interface StairProps {
  dark: boolean;
  w: number;
  h: number;
  /** 左側三個時期色帶（成本量級的單色階） */
  periods?: boolean;
  /** 右側附加欄 */
  cols?: StairCol[];
  /** 顯示階段說明欄（cols 為空時使用） */
  desc?: boolean;
  /** 附加欄只顯示名稱、不顯示說明（三層疊加頁用） */
  compact?: boolean;
  /** 階段欄的識別色。附加欄是主角時降為 muted */
  stageTone?: "brand" | "muted";
  stageW?: number;
  dx?: number;
}

function WaterfallStair({
  dark,
  w,
  h,
  periods = false,
  cols = [],
  desc = false,
  compact = false,
  stageTone = "brand",
  stageW = 300,
  dx = 18,
}: StairProps) {
  const c = dkt(dark);
  const n = STAGES.length;
  const rowH = h / n;
  const blockH = Math.max(28, rowH - 9);
  const periodW = periods ? 46 : 0;
  const x0 = periods ? periodW + 18 : 0;
  const railX = x0 + (n - 1) * dx + stageW + 28;
  const railW = Math.max(0, w - railX);
  const gap = DGAP.md;
  const colW = cols.length ? (railW - (cols.length - 1) * gap) / cols.length : 0;

  const rowY = (i: number) => i * rowH;
  const stageX = (i: number) => x0 + i * dx;
  const colX = (k: number) => railX + k * (colW + gap);

  const stageEdge = stageTone === "muted" ? c.seriesMuted : c.brand;
  const docIdx = cols.indexOf("doc");
  const docRailX = docIdx >= 0 ? colX(docIdx) + 14 : 0;

  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {/* 階梯的落差線：從上一階底緣折向下一階頂緣，畫出「水只能往下流」的riser */}
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        {STAGES.slice(0, -1).map((_, i) => {
          const x1 = stageX(i) + 14;
          const x2 = stageX(i + 1) + 14;
          const y1 = rowY(i) + blockH;
          const y2 = rowY(i + 1);
          const ym = (y1 + y2) / 2;
          return (
            <g key={`riser-${i}`} stroke={c.brand} strokeOpacity={0.5} fill="none" strokeLinecap="round">
              <path d={`M ${x1} ${y1} V ${ym} H ${x2} V ${y2}`} strokeWidth={2} />
              <path d={`M ${x2 - 4} ${y2 - 5} L ${x2} ${y2} L ${x2 + 4} ${y2 - 5}`} strokeWidth={2} />
            </g>
          );
        })}

        {/* 交付物接力鏈：前一份是後一份的輸入。無文件的兩階用虛線續接 */}
        {docIdx >= 0 &&
          STAGES.slice(0, -1).map((s, i) => {
            const broken = s.doc === null || STAGES[i + 1].doc === null;
            const y1 = rowY(i) + blockH / 2;
            const y2 = rowY(i + 1) + blockH / 2;
            return (
              <g
                key={`relay-${i}`}
                stroke={c.seriesMuted}
                strokeOpacity={broken ? 0.4 : 0.85}
                fill="none"
                strokeLinecap="round"
              >
                <path
                  d={`M ${docRailX} ${y1 + 12} V ${y2 - 12}`}
                  strokeWidth={2}
                  strokeDasharray={broken ? "4 5" : undefined}
                />
                <path
                  d={`M ${docRailX - 4} ${y2 - 17} L ${docRailX} ${y2 - 11} L ${docRailX + 4} ${y2 - 17}`}
                  strokeWidth={2}
                />
              </g>
            );
          })}
      </svg>

      {/* 三個時期：單一色相由淺到深，編碼「修改成本的量級」 */}
      {periods &&
        PERIODS.map((p, k) => {
          const top = rowY(p.from);
          const height = rowY(p.to) + blockH - top;
          return (
            <div
              key={p.label}
              style={{
                position: "absolute",
                left: 0,
                top,
                width: periodW,
                height,
                boxSizing: "border-box",
                borderRadius: "var(--radius-md)",
                background: `color-mix(in srgb, ${c.brand} ${6 + k * 8}%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  writingMode: "vertical-rl",
                  fontSize: DS.small,
                  fontWeight: 800,
                  color: c.brand,
                  letterSpacing: "0.12em",
                }}
              >
                {p.label}
              </span>
            </div>
          );
        })}

      {/* 階段欄 */}
      {STAGES.map((s, i) => (
        <div
          key={s.n}
          style={{
            position: "absolute",
            left: stageX(i),
            top: rowY(i),
            width: stageW,
            height: blockH,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: DGAP.xs,
            padding: `0 ${DGAP.sm}px`,
            borderRadius: "var(--radius-md)",
            background: dark ? c.sunken : "var(--neutral-50)",
            border: s.optional ? `1px dashed ${c.border}` : `1px solid ${c.borderSoft}`,
            borderLeft: `4px solid ${stageEdge}`,
          }}
        >
          <span
            style={{
              flex: "none",
              width: 26,
              fontFamily: "var(--font-mono)",
              fontSize: DS.small,
              fontWeight: 900,
              color: c.muted,
            }}
          >
            {s.n}
          </span>
          <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink, whiteSpace: "nowrap" }}>
            {s.en}
          </span>
          <span style={{ fontSize: DS.small, color: c.body, whiteSpace: "nowrap" }}>{s.zh}</span>
          {s.optional && (
            <span style={{ marginLeft: "auto", flex: "none", fontSize: DS.micro, color: c.muted }}>
              視情況
            </span>
          )}
        </div>
      ))}

      {/* 會議欄：跨階段的會議畫成跨列括號 —— 括號的高度就是它管轄的範圍 */}
      {cols.includes("meeting") &&
        MEETINGS.map((m) => {
          const top = rowY(m.from);
          const height = rowY(m.to) + blockH - top;
          const spans = m.to > m.from;
          return (
            <div
              key={m.en}
              style={{
                position: "absolute",
                left: colX(cols.indexOf("meeting")),
                top,
                width: colW,
                height,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 2,
                padding: `0 ${DGAP.sm}px`,
                borderRadius: "var(--radius-md)",
                background: c.accentSoft,
                borderLeft: `4px solid ${c.accent}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs, flexWrap: "wrap" }}>
                <span style={{ fontSize: DS.body, fontWeight: 800, color: c.ink }}>{m.en}</span>
                <span style={{ fontSize: DS.small, color: c.body }}>{m.zh}</span>
                {spans && (
                  <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>
                    跨 {m.to - m.from + 1} 個階段
                  </span>
                )}
              </div>
              {!compact && (
                <div style={{ fontSize: DS.small, color: c.body, lineHeight: 1.4 }}>{m.note}</div>
              )}
              {/* 跨階段的會議：把它實際把關的每一道閘門攤開，括號裡就不只是留白 */}
              {!compact && spans && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: DGAP.xs, marginTop: DGAP.xs }}>
                  {STAGES.slice(m.from, m.to + 1).map((s) => (
                    <span
                      key={s.n}
                      style={{
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 999,
                        fontSize: DS.micro,
                        background: dark ? c.sunken : "var(--neutral-0)",
                        border: `1px solid ${c.border}`,
                      }}
                    >
                      <span style={{ fontWeight: 800, color: c.ink }}>{s.zh}</span>
                      <span style={{ color: c.muted }}>審 {gateOf(s)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {/* 交付物欄 */}
      {cols.includes("doc") &&
        STAGES.map((s, i) => {
          const has = s.doc !== null;
          return (
            <div
              key={`doc-${s.n}`}
              style={{
                position: "absolute",
                left: colX(cols.indexOf("doc")),
                top: rowY(i),
                width: colW,
                height: blockH,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: DGAP.sm,
                paddingLeft: 34,
              }}
            >
              <span
                style={{
                  flex: "none",
                  minWidth: compact ? 320 : 196,
                  padding: "6px 12px",
                  boxSizing: "border-box",
                  textAlign: "center",
                  borderRadius: "var(--radius-sm)",
                  fontSize: DS.small,
                  fontWeight: has ? 800 : 600,
                  color: has ? c.ink : c.muted,
                  background: has ? (dark ? c.sunken : "var(--neutral-50)") : "transparent",
                  border: has ? `1px solid ${c.seriesMuted}` : `1px dashed ${c.borderSoft}`,
                }}
              >
                {has ? s.doc : "—"}
              </span>
              {!compact && (
                <span style={{ fontSize: DS.small, color: has ? c.body : c.muted, lineHeight: 1.4 }}>
                  {s.docNote}
                </span>
              )}
            </div>
          );
        })}

      {/* 階段說明欄 */}
      {desc &&
        !cols.length &&
        STAGES.map((s, i) => (
          <div
            key={`desc-${s.n}`}
            style={{
              position: "absolute",
              left: railX,
              top: rowY(i),
              width: railW,
              height: blockH,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: DS.small, color: c.body, lineHeight: 1.4 }}>{s.desc}</span>
          </div>
        ))}
    </div>
  );
}

// ── custom 頁 ───────────────────────────────────────────────

// P03：建立地圖。九級落差 + 左側成本量級色帶 + 逐階說明。
function StageMapPage({ dark, area }: CustomSlideProps) {
  return <WaterfallStair dark={dark} w={area.w} h={area.h} periods desc />;
}

// P04 / P11：沿用筆記既有的 @ai-visualize 元件。
//
// 兩頁都用 chrome: false（整頁滿版）。理由是實測出來的，不是偏好：帶 chrome 時可用區
// 只剩 1392×576，兩個元件的自然高度都在 950px 上下，畫布只能縮到 58% —— 投影時正文
// 約等於 9px，讀不到。滿版後縮放回到 90–100%，而且拖曳滑桿 / 點階段需要完整寬度。
// 這兩頁的標題與結論由前一頁（P03 / P10）承擔，這裡專心讓元件可讀、可操作。
//
// mode 三態：縮覽（live false）只畫骨架、不掛載真元件 —— 縮覽項本身是 <button>，
// 元件內的按鈕掛進去會變成 button 嵌 button。outerScale 必須往下傳，否則拖曳不跟手。
function LifecycleCanvasPage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const mode: CanvasMode = !live ? "thumb" : play ? "play" : "view";
  return (
    <CanvasViewport
      content={live ? <WaterfallLifecycle /> : undefined}
      natural={1120}
      w={area.w}
      h={area.h}
      mode={mode}
      dark={dark}
      outerScale={outerScale}
      emptyId="waterfall-lifecycle"
    />
  );
}

function ChangeCostCanvasPage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const mode: CanvasMode = !live ? "thumb" : play ? "play" : "view";
  return (
    <CanvasViewport
      content={live ? <WaterfallChangeCost /> : undefined}
      natural={1120}
      w={area.w}
      h={area.h}
      mode={mode}
      dark={dark}
      outerScale={outerScale}
      emptyId="waterfall-change-cost"
    />
  );
}

// P06：同一座階梯，掛上五個守門人。階段欄降為 muted 讓會議括號成為主角。
function MeetingsPage({ dark, area }: CustomSlideProps) {
  return <WaterfallStair dark={dark} w={area.w} h={area.h} cols={["meeting"]} stageTone="muted" />;
}

// P07：同一座階梯，掛上七份文件與它們的接力鏈。
function DeliverablesPage({ dark, area }: CustomSlideProps) {
  return <WaterfallStair dark={dark} w={area.w} h={area.h} cols={["doc"]} stageTone="muted" />;
}

// P08：收束頁。三層同時亮起，取代筆記中那張 9 列的總體對照表。
function MatrixPage({ dark, area }: CustomSlideProps) {
  return (
    <WaterfallStair dark={dark} w={area.w} h={area.h} cols={["meeting", "doc"]} compact dx={16} />
  );
}

// P10：變更成本的結構。回流鏈用識別色 orange（這是「變更走的路徑」，不是狀態），
// 狀態色留給 callout 的 critical 警示。
function ReworkPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Stages
        dark={dark}
        style={{ flex: "none" }}
        heading="一次晚期變更，要沿著這條鏈一路回頭重做"
        items={[
          { tag: "回頭第 1 站", title: "設計", desc: "SDD 與 SRS 得先改對，否則後面全部白做。", tone: "orange" },
          { tag: "回頭第 2 站", title: "開發", desc: "程式跟著改動後的設計重寫。", tone: "orange" },
          { tag: "回頭第 3 站", title: "測試", desc: "Test Plan 與 Test Case 全部重跑一輪。", tone: "orange" },
          { tag: "回頭第 4 站", title: "文件", desc: "整條交付文件鏈同步修訂，否則合約對不上。", tone: "orange" },
        ]}
      />
      <Cards
        dark={dark}
        columns={3}
        heading="所以瀑布用三道防線，把問題擋在便宜的前期"
        items={[
          {
            icon: "lock",
            title: "階段閘門",
            tone: "blue",
            points: ["交付物驗收通過，水才往下一階", "問題止步於當前階段，不往下游外溢"],
            meta: "貫穿九個階段",
          },
          {
            icon: "clock",
            title: "需求凍結",
            tone: "blue",
            points: ["藍圖是整段瀑布最便宜的修改點", "凍結後再動，成本逐級放大"],
            meta: "Blueprint 階段",
          },
          {
            icon: "check",
            title: "里程碑審查",
            tone: "blue",
            points: ["每道閘門評估進度與成果", "決定是否放行下一階段"],
            meta: "System Analysis ～ SIT",
          },
        ]}
      />
    </>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "waterfall-sdlc",
  title: "Waterfall SDLC",
  eyebrow: "專案管理系列 · 第四章",
  generatedAt: "2026-08-02",
  source: "src/content/notes/waterfall-sdlc.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 專案管理系列 第四章",
      title: "Waterfall SDLC",
      subtitle: "九道閘門、五場會議、七份文件，一條只能往下流的河",
      meta: ["由 waterfall-sdlc.mdx 生成", "13 頁 · 16:9 · 含 2 組可互動元件"],
      agenda: [
        { n: "01", title: "流程", sub: "九個階段逐級遞降，每一階都是一道閘門" },
        { n: "02", title: "治理", sub: "會議守門、文件接力，鏈跑通了專案才算跑完" },
        { n: "03", title: "風險", sub: "越晚改越貴，成本沿階段近似指數放大" },
      ],
    },

    {
      layout: "section",
      nav: "章節：流程",
      num: "01",
      eyebrow: "PROCESS",
      title: "水只能往下流",
      subtitle: "九個階段，每一階都是一道閘門",
    },
    {
      layout: "custom",
      nav: "九級落差：階段全景",
      num: "01",
      eyebrow: "PART 01 · 流程",
      title: "九個階段，逐級遞降",
      titleNote: "由左上往右下，每一階都比上一階更難回頭",
      render: StageMapPage,
      callout: {
        icon: "lightbulb",
        text: "左側色帶由淺到深，是「修改成本」的量級：藍圖是整段瀑布最便宜的修改點，凍結後再動就逐級放大。Cutover 以虛線標示 —— 全新系統或無歷史資料的場景可略過。",
        tone: "blue",
      },
      footnotes: [
        {
          n: "①",
          text: "下一頁：同一骨幹切換三個面向的互動元件",
        },
      ],
    },
    {
      layout: "custom",
      nav: "互動：瀑布生命週期（三面向）",
      chrome: false,
      render: LifecycleCanvasPage,
    },

    {
      layout: "section",
      nav: "章節：治理",
      num: "02",
      eyebrow: "GOVERNANCE",
      title: "誰放行，憑什麼放行",
      subtitle: "會議是守門人，文件是合約",
    },
    {
      layout: "custom",
      nav: "五場管控會議",
      num: "02",
      eyebrow: "PART 02 · 治理",
      title: "會議不是進度回報，是放行審查",
      titleNote: "括號的高度就是它管轄的範圍 —— 里程碑審查真的橫跨四個階段",
      render: MeetingsPage,
    },
    {
      layout: "custom",
      nav: "七份交付物與接力鏈",
      num: "02",
      eyebrow: "PART 02 · 治理",
      title: "文件即合約，前一份是後一份的輸入",
      titleNote: "虛線處是沒有文件的兩階 —— 產出的是程式碼與上線本身",
      render: DeliverablesPage,
    },
    {
      layout: "custom",
      nav: "三層疊加：階段 × 會議 × 交付物",
      num: "02",
      eyebrow: "PART 02 · 治理",
      title: "把整章收進同一座階梯",
      titleNote: "第三次看到這個形狀，只需要讀「這次多亮了什麼」",
      legend: [
        { label: "階段（成本遞增）", tone: "blue" },
        { label: "管控會議", tone: "orange" },
        { label: "交付物文件鏈", tone: "muted" },
      ],
      render: MatrixPage,
    },

    {
      layout: "section",
      nav: "章節：風險",
      num: "03",
      eyebrow: "RISK",
      title: "越晚改，越貴",
      subtitle: "單向流動帶來的結構性風險",
    },
    {
      layout: "custom",
      nav: "回頭重做的不只是程式",
      num: "03",
      eyebrow: "PART 03 · 風險",
      title: "晚期變更要逆著瀑布往上游走一遍",
      titleNote: "四段全部重做完，才回得到原本的進度",
      render: ReworkPage,
      callout: {
        icon: "alert",
        text: "需求若到後期才改動，成本隨階段往後呈近似指數的放大 —— 這正是階段閘門、需求凍結與里程碑審查存在的理由：盡早凍結、盡早驗收。",
        tone: "critical",
      },
      footnotes: [
        { n: "①", text: "下一頁可拖曳滑桿，實際感受成本曲線與受影響的下游文件" },
      ],
    },
    {
      layout: "custom",
      nav: "互動：變更成本曲線",
      chrome: false,
      render: ChangeCostCanvasPage,
    },

    {
      layout: "quote",
      nav: "引言：一句話總結",
      eyebrow: "KEY TAKEAWAY",
      quote: "盡早凍結、盡早驗收，把問題擋在便宜的前期。",
      by: "Waterfall SDLC",
      byMeta: "NoteCraft · 專案管理系列 第四章",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      eyebrow: "RECAP",
      title: "帶走這三件事",
      items: [
        {
          n: "01",
          k: "單向流動，閘門放行",
          v: "九個階段逐級遞降，交付物驗收通過，水才往下一階。",
        },
        {
          n: "02",
          k: "會議是守門人",
          v: "五場會議確認「上一階段是否真的完成」，不是聽進度報告。",
        },
        {
          n: "03",
          k: "文件即合約",
          v: "七份文件前後接力，文件鏈跑通了，專案才算真的跑完。",
        },
      ],
      cta: "回到筆記閱讀完整內容與互動元件",
      ctaMeta: "/notes/waterfall-sdlc",
    },
  ],
};

export default deck;
