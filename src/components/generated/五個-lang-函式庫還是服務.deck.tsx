// deck 資料模組：對應筆記 五個-lang-函式庫還是服務.mdx。
// 三個 custom 頁改為各自承載一個論點的手繪版面（部署邊界圖 / 決策分岔圖 / 複雜度階梯），
// 不再是「一個 block 頂滿頁」；三頁 full-visual 沿用該筆記既有的 @ai-visualize 互動元件
// （lang-stack-architecture / agent-reliability-compound / lang-selection-guide）。
import type { CSSProperties, ReactNode } from "react";
import { Fragment } from "react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { Cards } from "@/components/deck/blocks";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import LangStackArchitecture from "@/components/generated/lang-stack-architecture";
import AgentReliabilityCompound from "@/components/generated/agent-reliability-compound";
import LangSelectionGuide from "@/components/generated/lang-selection-guide";

// ── Part 01：部署邊界圖 ──────────────────────────────────────────────────────
// 論點不是「四欄矩陣」，是「一條邊界」：兩個函式庫在你的部署單元裡（實線），
// 三個服務在外面（虛線）。原表格的四個欄位降級成卡片上的微標籤，資訊不丟，
// 但由「邊界」承載論點。中間的 trace / 匯出 API 箭頭精準對到對應卡片的垂直中心——
// 座標用容器自身的版面常數算出（PAD / HEADER_H / FOOTER_H / ROW_GAP），
// 不做 DOM 量測，邏輯與 <Annotate> 的百分比座標同一套。
const FOV_PAD = DGAP.sm;
const FOV_HEADER_H = 46;
const FOV_FOOTER_H = 26;
const FOV_ROW_GAP = DGAP.xs;

/** 容器內第 i／共 n 張卡片的垂直中心（px，相對容器頂端），供中間箭頭帶對齊 */
function fovCardCenter(mainH: number, n: number, i: number): number {
  const areaH = mainH - FOV_PAD * 2 - FOV_HEADER_H - FOV_FOOTER_H - FOV_ROW_GAP * 2;
  const cardH = (areaH - (n - 1) * FOV_ROW_GAP) / n;
  const areaTop = FOV_PAD + FOV_HEADER_H + FOV_ROW_GAP;
  return areaTop + i * (cardH + FOV_ROW_GAP) + cardH / 2;
}

function FovTag({ text, c }: { text: string; c: DeckThemeTokens }) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${c.borderSoft}`,
        color: c.muted,
        fontSize: DS.micro,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function FovCard({ c, name, line, tags }: { c: DeckThemeTokens; name: string; line: string; tags: string[] }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        padding: `${DGAP.xs}px ${DGAP.sm}px`,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${c.borderSoft}`,
        background: c.sunken,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>{name}</span>
        <span style={{ fontSize: DS.small, color: c.body }}>{line}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tags.map((t) => (
          <FovTag key={t} text={t} c={c} />
        ))}
      </div>
    </div>
  );
}

function FovBoundary({
  c,
  dashed,
  headTitle,
  headSub,
  footer,
  children,
}: {
  c: DeckThemeTokens;
  dashed: boolean;
  headTitle: string;
  headSub: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: FOV_ROW_GAP,
        padding: FOV_PAD,
        border: `1.5px ${dashed ? "dashed" : "solid"} ${c.border}`,
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div style={{ height: FOV_HEADER_H, flex: "none" }}>
        <div style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>{headTitle}</div>
        <div style={{ fontSize: DS.micro, color: c.muted, marginTop: 2 }}>{headSub}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: FOV_ROW_GAP }}>
        {children}
      </div>
      <div style={{ height: FOV_FOOTER_H, flex: "none", display: "flex", alignItems: "center", fontSize: DS.small, color: c.muted }}>
        {footer}
      </div>
    </div>
  );
}

function FovArrows({
  c,
  leftY,
  rightY,
  leftMidY,
}: {
  c: DeckThemeTokens;
  leftY: [number, number];
  rightY: [number, number, number];
  leftMidY: number;
}) {
  // 標籤沿著「自己那條線」取一個參數位置 t（0 = 起點、1 = 終點），x/y 一起由 t 算出。
  // 三條線在中段靠得很近，若全部固定在 left: 50%，第二條 trace 與「匯出 API」會疊在一起
  // （實測重疊 47×13px）—— 給不同的 t 讓它們沿線錯開，標籤仍然貼在各自的線上。
  const chipAt = (t: number, yStart: number, yEnd: number, color: string, fromRight = false): CSSProperties => ({
    position: "absolute",
    left: `${fromRight ? 96 - t * 92 : 4 + t * 92}%`,
    top: `${yStart + t * (yEnd - yStart)}%`,
    transform: "translate(-50%, -50%)",
    padding: "1px 6px",
    borderRadius: "var(--radius-sm)",
    background: c.slide,
    fontSize: DS.micro,
    fontWeight: 700,
    whiteSpace: "nowrap",
    color,
  });
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <marker id="fov-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.brand} />
          </marker>
          <marker id="fov-arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.seriesMuted} />
          </marker>
        </defs>
        <line x1={4} y1={leftY[0]} x2={96} y2={rightY[0]} stroke={c.brand} strokeWidth={2} markerEnd="url(#fov-arrow-blue)" vectorEffect="non-scaling-stroke" />
        <line x1={4} y1={leftY[1]} x2={96} y2={rightY[1]} stroke={c.brand} strokeWidth={2} markerEnd="url(#fov-arrow-blue)" vectorEffect="non-scaling-stroke" />
        <line
          x1={96}
          y1={rightY[2]}
          x2={4}
          y2={leftMidY}
          stroke={c.seriesMuted}
          strokeWidth={2}
          strokeDasharray="5 4"
          markerEnd="url(#fov-arrow-muted)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span style={chipAt(0.5, leftY[0], rightY[0], c.brand)}>trace</span>
      <span style={chipAt(0.7, leftY[1], rightY[1], c.brand)}>trace</span>
      <span style={chipAt(0.35, rightY[2], leftMidY, c.seriesMuted, true)}>匯出 API</span>
    </div>
  );
}

const FOV_ROWS: { k: string; left: string; right: string }[] = [
  { k: "維運", left: "app 自己扛", right: "另一個行程要顧" },
  { k: "付費", left: "零授權費", right: "視方案與用量計費" },
  { k: "資料", left: "留在行程內", right: "得送出去" },
];

function FormOverviewPage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cols = "90px 1fr 132px 1fr";

  // 後果帶固定用量（分隔線 + 3 列數值），主圖拿走剩下的高度——不猜可用高，用 area 反推
  const DIVIDER_ZONE = DGAP.md + 1 + DGAP.sm;
  const ROW_H = 28;
  const rowsH = FOV_ROWS.length * ROW_H + (FOV_ROWS.length - 1) * DGAP.sm;
  const mainH = area.h - DIVIDER_ZONE - rowsH;

  const leftY = [0, 1].map((i) => (fovCardCenter(mainH, 2, i) / mainH) * 100) as [number, number];
  const rightY = [0, 1, 2].map((i) => (fovCardCenter(mainH, 3, i) / mainH) * 100) as [number, number, number];
  const leftMidY = (leftY[0] + leftY[1]) / 2;

  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, columnGap: DGAP.lg, height: area.h }}>
      <div />
      <div style={{ height: mainH }}>
        <FovBoundary c={c} dashed={false} headTitle="實線 = 你的部署單元" headSub="在 package.json 裡" footer="2 個 · 函式庫">
          <FovCard c={c} name="LangChain" line="高階 API · createAgent" tags={["應用開發層", "開源 · MIT", "跟 app 一起跑"]} />
          <FovCard c={c} name="LangGraph" line="狀態 · 節點 · checkpoint · 重試" tags={["執行／編排層", "開源 · MIT", "跟 app 一起跑"]} />
        </FovBoundary>
      </div>
      <div style={{ height: mainH }}>
        <FovArrows c={c} leftY={leftY} rightY={rightY} leftMidY={leftMidY} />
      </div>
      <div style={{ height: mainH }}>
        <FovBoundary c={c} dashed headTitle="虛線 = 另外跑的行程" headSub="要自己顧、資料要送出去" footer="3 個 · 服務">
          <FovCard c={c} name="Langfuse" line="可觀測／評估層" tags={["開源 · MIT", "可以，零授權費"]} />
          <FovCard c={c} name="LangSmith" line="可觀測／評估層" tags={["閉源", "僅 Enterprise 方案"]} />
          <FovCard c={c} name="LangFlow" line="視覺化建構層" tags={["開源 · MIT", "目前只能自架"]} />
        </FovBoundary>
      </div>

      <div style={{ gridColumn: "1 / -1", marginTop: DGAP.md, marginBottom: DGAP.sm, height: 1, background: c.borderSoft }} />

      {FOV_ROWS.map((row) => (
        <Fragment key={row.k}>
          <div style={{ height: ROW_H, display: "flex", alignItems: "center", fontSize: DS.small, fontWeight: 700, color: c.muted }}>
            {row.k}
          </div>
          <div style={{ height: ROW_H, display: "flex", alignItems: "center", fontSize: DS.small, color: c.body }}>{row.left}</div>
          <div />
          <div style={{ height: ROW_H, display: "flex", alignItems: "center", fontSize: DS.small, color: c.body }}>{row.right}</div>
        </Fragment>
      ))}
    </div>
  );
}

// ── Part 03：決策分岔圖 ──────────────────────────────────────────────────────
// 論點是「判斷點不是功能」，<Compare> 的左右對照恰恰會把讀者引導去比功能。
// 改畫實際的判斷程序：兩個問題、三條路（兩條都指向 Langfuse 的匯流刻意讓人看見）。
// 終點卡沿用 <Cards>（色帶 + bullet 剛好對齊「事實清單」的份量），
// 底部功能重疊帶刻意調得很淡——它是論點本身（存在但不參與決策），不是第三張卡。
function ObsBranchLabel({ x, y, text, c }: { x: number; y: number; text: string; c: DeckThemeTokens }) {
  return (
    <span
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        padding: "2px 8px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${c.borderSoft}`,
        background: c.slide,
        color: c.muted,
        fontSize: DS.micro,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function ObsQBox({ x, y, q, text, c }: { x: number; y: number; q: string; text: string; c: DeckThemeTokens }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, 0)",
        width: 340,
        boxSizing: "border-box",
        padding: `${DGAP.xs}px ${DGAP.sm}px`,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${c.border}`,
        background: c.sunken,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: DS.eyebrow, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>{q}</div>
      <div style={{ fontSize: DS.small, fontWeight: 800, color: c.ink, marginTop: 2 }}>{text}</div>
    </div>
  );
}

function DecisionTree({ c }: { c: DeckThemeTokens }) {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <marker id="obs-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c.border} />
          </marker>
        </defs>
        <polyline points="50,30 22,94" fill="none" stroke={c.border} strokeWidth={2} markerEnd="url(#obs-arrow)" vectorEffect="non-scaling-stroke" />
        <polyline points="50,30 62,46" fill="none" stroke={c.border} strokeWidth={2} markerEnd="url(#obs-arrow)" vectorEffect="non-scaling-stroke" />
        <polyline points="62,69 22,94" fill="none" stroke={c.border} strokeWidth={2} markerEnd="url(#obs-arrow)" vectorEffect="non-scaling-stroke" />
        <polyline points="62,69 80,94" fill="none" stroke={c.border} strokeWidth={2} markerEnd="url(#obs-arrow)" vectorEffect="non-scaling-stroke" />
      </svg>

      <ObsQBox x={50} y={6} q="Q1" text="資料能不能離開你的機房？" c={c} />
      <ObsQBox x={62} y={46} q="Q2" text="團隊會長到多大？" c={c} />

      <ObsBranchLabel x={36} y={62} text="不能" c={c} />
      <ObsBranchLabel x={56} y={38} text="可以" c={c} />
      <ObsBranchLabel x={42} y={81} text="會長大" c={c} />
      <ObsBranchLabel x={71} y={81} text="小團隊起步" c={c} />
    </div>
  );
}

function ObservabilityComparePage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const cardsH = 232;
  const overlapH = 84;
  const gap = DGAP.md;
  const treeH = area.h - cardsH - overlapH - gap * 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: area.h, gap }}>
      <div style={{ flex: "none", height: treeH }}>
        <DecisionTree c={c} />
      </div>

      <Cards
        dark={dark}
        columns={2}
        style={{ flex: "none", height: cardsH }}
        items={[
          {
            title: "Langfuse",
            desc: "開源自架",
            tone: "blue",
            points: [
              "MIT 開源，可完全自架、零授權費",
              "不按 seat 計費",
              "線上確定性評估仍在 roadmap，非正式版",
              "2026-01-16 被 ClickHouse 收購，官方稱 roadmap 不變",
            ],
          },
          {
            title: "LangSmith",
            desc: "閉源託管",
            tone: "orange",
            points: [
              "閉源託管，自架僅 Enterprise 且部分功能不提供",
              "按 seat + trace 用量計費，人多成本線性成長",
              "線上評估目前較完整",
              "深度整合 LangGraph Studio 與官方託管部署，Developer 方案免費起步",
            ],
          },
        ]}
      />

      <div
        style={{
          flex: "none",
          height: overlapH,
          boxSizing: "border-box",
          padding: `${DGAP.sm}px ${DGAP.md}px`,
          borderRadius: "var(--radius-md)",
          background: c.sunken,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <div style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>
          兩邊都有，所以都不是判斷點
        </div>
        <div style={{ fontSize: DS.small, color: c.muted }}>追蹤 · 評估 · prompt 管理 · 資料集</div>
      </div>
    </div>
  );
}

// ── Part 04：複雜度階梯 + 貫穿底線 ────────────────────────────────────────────
// 論點分兩件事：(1) 複雜度只在被迫時往上爬（用階梯，第二階虛線＝尚未發生）；
// (2) 可觀測層不是第三步，是第一天鋪好、貫穿全程的地基（獨立於階梯之外的橫帶，
// 而不是排進 <Stages> 讓它被誤讀成「第二步做完就結束」）。
const ADOPTION_STATS: { value: string; label: string }[] = [
  { value: "10-22", label: "LangChain / LangGraph 1.0 發布（2025）" },
  { value: "≈20%", label: "0.85^10，十步、每步 85%" },
  { value: "2 : 3", label: "函式庫 : 服務" },
];

function AdoptionStepsPage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  // 72 = DS.h3 數值行 + 4px gap + DS.micro 標籤行的實測高（64 會少 5px、被裁掉）
  const statsH = 72;
  const foundationH = 116;
  const gap = DGAP.md;
  const staircaseH = area.h - statsH - foundationH - gap * 2;
  const padTop = 8;
  const padBottom = 28;
  const padLeft = 48;
  const padRight = 16;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: area.h, gap }}>
      <div style={{ flex: "none", height: staircaseH, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: padTop,
            bottom: padBottom,
            width: padLeft - 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: DS.micro, color: c.muted, writingMode: "vertical-rl" }}>複雜度</span>
        </div>
        <div style={{ position: "absolute", right: padRight, bottom: 0, height: padBottom, display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: DS.micro, color: c.muted }}>時間</span>
        </div>

        <div style={{ position: "absolute", left: padLeft, right: padRight, top: padTop, bottom: padBottom }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <defs>
              <marker id="adopt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={c.seriesMuted} />
              </marker>
            </defs>
            <line x1={0} y1={100} x2={100} y2={100} stroke={c.borderSoft} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={0} y1={0} x2={0} y2={100} stroke={c.borderSoft} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <rect x={6} y={68} width={28} height={32} fill={c.brandSoft} stroke={c.brand} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <rect x={62} y={28} width={32} height={72} fill="none" stroke={c.seriesMuted} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            <polyline
              points="34,68 62,28"
              fill="none"
              stroke={c.seriesMuted}
              strokeWidth={2}
              strokeDasharray="4 3"
              markerEnd="url(#adopt-arrow)"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div style={{ position: "absolute", left: "20%", top: "68%", transform: "translate(-50%, -100%)", width: 260, textAlign: "center" }}>
            <div style={{ fontSize: DS.h4, fontWeight: 800, color: c.brand }}>createAgent</div>
            <div style={{ fontSize: DS.small, color: c.body, marginTop: 2 }}>高階 API，幾行就跑起來</div>
            <div style={{ fontSize: DS.micro, color: c.muted, marginTop: 4 }}>想更快看到形狀：先在 LangFlow 上拖一版草稿</div>
          </div>

          <div style={{ position: "absolute", left: "78%", top: "28%", transform: "translate(-50%, -100%)", width: 260, textAlign: "center" }}>
            <div style={{ fontSize: DS.h4, fontWeight: 800, color: c.seriesMuted }}>StateGraph</div>
            <div style={{ fontSize: DS.small, color: c.body, marginTop: 2 }}>手刻節點與邊：循環 · 分支 · 人工審核</div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "48%",
              top: "48%",
              transform: "translate(-50%, -50%)",
              width: 400,
              boxSizing: "border-box",
              padding: `${DGAP.xs}px ${DGAP.sm}px`,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${c.borderSoft}`,
              background: c.sunken,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, lineHeight: 1.5 }}>
              只有這時才往上：要循環或重試 · 要條件路由 · 要人工審核卡點
            </div>
            <div style={{ fontSize: DS.small, color: c.muted, marginTop: 4, lineHeight: 1.5 }}>
              高階 API 撐不住的那一刻你會很清楚，在那之前不必付這個複雜度的代價
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: "none",
          height: foundationH,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          padding: `${DGAP.sm}px ${DGAP.md}px`,
          borderRadius: "var(--radius-lg)",
          background: c.brandSoft,
          borderLeft: `5px solid ${c.brand}`,
        }}
      >
        <div style={{ fontSize: DS.body, fontWeight: 800, color: c.ink }}>
          Day 1 就接上 Langfuse 或 LangSmith —— 貫穿每一階，不是第三步
        </div>
        <div style={{ fontSize: DS.small, color: c.body }}>出問題時你需要的是「當時」的紀錄，那時候補裝已經來不及</div>
      </div>

      <div style={{ flex: "none", height: statsH, display: "flex", alignItems: "center" }}>
        {ADOPTION_STATS.map((s, i) => (
          <div
            key={s.value}
            style={{
              flex: 1,
              boxSizing: "border-box",
              padding: `0 ${DGAP.lg}px`,
              borderLeft: i === 0 ? "none" : `1px solid ${c.borderSoft}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: DS.h3, fontWeight: 900, color: c.ink, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
            <span style={{ fontSize: DS.micro, color: c.muted, textAlign: "center" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const deck: Deck = {
  slug: "五個-lang-函式庫還是服務",
  title: "五個 Lang，各自佔一個位置",
  eyebrow: "NOTECRAFT DECK · AI 技術選型",
  generatedAt: "2026-08-02",
  source: "src/content/notes/五個-lang-函式庫還是服務.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      title: "五個 Lang，各自佔一個位置",
      subtitle: "兩個是函式庫、三個是服務——分不清時，先問它是哪一種",
      meta: ["由 五個-lang-函式庫還是服務.mdx 生成", "13 頁 · 16:9 · 含 3 組可互動元件"],
      agenda: [
        { n: "01", title: "先分清形態", sub: "函式庫跟 app 一起部署；服務是另外跑的行程" },
        { n: "02", title: "堆疊關係與可靠度", sub: "五層怎麼疊在一起，以及為什麼要接可觀測層" },
        { n: "03", title: "可觀測層怎麼選", sub: "Langfuse 還是 LangSmith，關鍵不是功能" },
        { n: "04", title: "選型與採用順序", sub: "六種情境的建議，加上三步走的採用路徑" },
      ],
    },
    {
      layout: "section",
      nav: "章節：先分清形態",
      num: "01",
      eyebrow: "FORM",
      title: "先分清形態，才有得比",
      subtitle: "函式庫跟 app 一起部署；服務是另外跑的行程",
    },
    {
      layout: "custom",
      nav: "五個工具的形態總表",
      num: "01",
      eyebrow: "PART 01 · 先分清形態",
      title: "兩個函式庫、三個服務，一張表看完",
      titleNote: "形態決定誰顧維運、誰付費、資料流向哪",
      render: FormOverviewPage,
      pill: { text: "2 函式庫 · 3 服務", tone: "blue" },
      callout: {
        icon: "info",
        tone: "blue",
        text: "LangFlow 對 TS 專案來說純粹是外部服務——它的後端是 Python（FastAPI），不會出現在你的 package.json 裡",
      },
    },
    {
      layout: "section",
      nav: "章節：堆疊關係與可靠度",
      num: "02",
      eyebrow: "STACK",
      title: "疊起來看，才知道為什麼要接可觀測層",
      subtitle: "單步成功率很高，走完全程不一定",
    },
    {
      layout: "full-visual",
      nav: "堆疊架構：實線函式庫、虛線服務",
      num: "02",
      eyebrow: "PART 02 · 堆疊關係",
      title: "五層怎麼疊在一起，trace 往哪送",
      viz: LangStackArchitecture,
      vizLabel: "@ai-visualize · lang-stack-architecture",
      vizHint:
        "主堆疊三層（LangChain / LangGraph / 模型與工具）皆為函式庫（實線），LangFlow 與可觀測層（Langfuse / LangSmith）為獨立部署的服務（虛線）；三條 trace 箭頭代表「三層各自送出紀錄，可觀測層不參與執行」。",
    },
    {
      layout: "full-visual",
      nav: "可靠度複利崩塌：單步高、全程低",
      num: "02",
      eyebrow: "PART 02 · 堆疊關係",
      title: "換更強的模型救不了逾時，只有 checkpoint 能",
      viz: AgentReliabilityCompound,
      vizLabel: "@ai-visualize · agent-reliability-compound",
      vizHint:
        "拖動「步驟數」（1–20）與「每步成功率」（50–99%）兩個滑桿，即時算出整體成功率＝每步成功率的步驟次方；預設 10 步、85% 時整體約 20%。",
    },
    {
      layout: "section",
      nav: "章節：可觀測層怎麼選",
      num: "03",
      eyebrow: "OBSERVABILITY",
      title: "功能重疊時，看的不是功能",
      subtitle: "資料能不能離開機房，團隊會長多大",
    },
    {
      layout: "custom",
      nav: "Langfuse vs LangSmith",
      num: "03",
      eyebrow: "PART 03 · 可觀測層怎麼選",
      title: "開源自架，還是閉源託管",
      titleNote: "判斷點是資料主權與團隊規模，不是功能",
      render: ObservabilityComparePage,
    },
    {
      layout: "section",
      nav: "章節：選型與採用順序",
      num: "04",
      eyebrow: "ADOPTION",
      title: "多數時候答案是組合，不是二選一",
      subtitle: "六種情境，加上建議的三步走",
    },
    {
      layout: "full-visual",
      nav: "六種情境，走查一次",
      num: "04",
      eyebrow: "PART 04 · 選型與採用順序",
      title: "什麼時候用哪個，六格走一遍",
      viz: LangSelectionGuide,
      vizLabel: "@ai-visualize · lang-selection-guide",
      vizHint:
        "左側清單切六種情境（只用 LangChain／往下掉到 LangGraph／接上可觀測層／Langfuse／LangSmith／加上 LangFlow），右側面板顯示推薦工具的形態徽章、一句話理由與案例或代價提醒。",
    },
    {
      layout: "custom",
      nav: "建議的採用順序：三步走",
      num: "04",
      eyebrow: "PART 04 · 選型與採用順序",
      title: "先求可跑，再補追蹤，最後才升級複雜度",
      titleNote: "高階 API 撐不住的那一刻你會很清楚",
      render: AdoptionStepsPage,
      footnotes: [
        { n: "1", text: "LangFlow 拖一版當草稿，卡住時可以直接掉下去改 Python 程式碼" },
        {
          n: "2",
          text: "多 agent 協作、人工審核卡點的實例：Klarna 客服 bot 服務 8500 萬用戶、解決時間降 80%；LinkedIn 全公司 SQL Bot",
        },
      ],
    },
    {
      layout: "quote",
      nav: "引言：一句話總結",
      eyebrow: "KEY TAKEAWAY",
      quote: "分不清楚的時候，先問它是函式庫還是服務，答案通常就出來了。",
      by: "五個 Lang，各自佔一個位置",
      byMeta: "NoteCraft · AI 技術選型",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      eyebrow: "RECAP",
      title: "帶走這三件事",
      items: [
        {
          n: "01",
          k: "先分形態，再談選型",
          v: "兩個函式庫（LangChain / LangGraph）跟你的 app 一起部署；三個服務（LangSmith / Langfuse / LangFlow）要另外顧維運與資料流向。",
        },
        {
          n: "02",
          k: "往下掉到 LangGraph 是因為數學，不是因為酷",
          v: "十步、每步 85% 成功率，全程只剩約 20%——換更強的模型救不了逾時，只有 checkpoint 與 resume 可以。",
        },
        {
          n: "03",
          k: "多數時候是組合，不是二選一",
          v: "用 LangChain 寫、跑在 LangGraph 上、把 trace 送進 Langfuse 或 LangSmith，LangFlow 視團隊組成決定加不加。",
        },
      ],
      cta: "回到筆記看完整比較表與三個互動元件",
      ctaMeta: "/notes/五個-lang-函式庫還是服務",
    },
  ],
};

export default deck;
