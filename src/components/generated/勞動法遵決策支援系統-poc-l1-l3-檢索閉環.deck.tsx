// deck 資料模組：對應筆記 勞動法遵決策支援系統-poc-l1-l3-檢索閉環.mdx。
//
// 主線：「問句進來、撈相近法條、與總表整合——AI 只在頭尾兩端出現，中間靠規則、
// 資料庫 CHECK 與四道閘門頂住。」26 頁 / 5 個 PART：範圍目標與邊界、架構與資料結構、
// 模型治理、驗證、成本與落地。
// 4 頁 full-visual／chrome:false 原樣沿用筆記既有的 @ai-visualize 互動元件
// （poc-l1l3-retrieval-architecture、fallback-degradation-switchboard、
// system-boundary-map、question-lifecycle-swimlane），其餘 5 個互動元件以
// CanvasViewport 混排進 custom 頁（旁欄固定 px、畫布 flex:1）。
//
// 整頁級原子清單（4 個，皆不重複）：Triad／Layers／Spectrum／Decision。
// 另有三頁刻意自寫版面而不套整頁級原子，因為內容的形狀本身就是論點：
//   · 資料結構三頁（兩張表一條 join／扇出統計／CHECK 矩陣）—— 兩欄 schema 卡中間
//     夾一把一對多的扇子，這個形狀就是「反查怎麼成立」的論證，拆進通用原子會弄丟；
//   · 安全稽核頁拆解 <Risk> 的三段式資訊架構（威脅／代價／緩解）自寫窄欄卡片，
//     因為 <Risk> 原生預期全寬，塞進 52/48 分欄會破版；
//   · AI 介入頁的直立數字軌借 <Kpi> 的視覺語言（<Kpi> 只有橫排、沒有直排選項）。
import type { CSSProperties, ReactNode } from "react";
import type { CustomSlideProps, Deck, StatusTone } from "@/lib/decks";
import { Cards, Chart, Code, Decision, Kpi, Layers, Spectrum, Stages, Table, Triad } from "@/components/deck/blocks";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { toneColor } from "@/components/deck/SlideChrome";
import { CanvasViewport } from "@/components/deck/CanvasViewport";
import type { CanvasMode } from "@/components/deck/CanvasViewport";
import PocScopeL1L10Ladder from "@/components/generated/poc-scope-l1-l10-ladder";
import PermissionScopeSwitches from "@/components/generated/permission-scope-switches";
import AiInterventionPipeline from "@/components/generated/ai-intervention-pipeline";
import SecurityGatePlayground from "@/components/generated/security-gate-playground";
import PassCriteriaQuiz from "@/components/generated/pass-criteria-quiz";
import SystemBoundaryMap from "@/components/generated/system-boundary-map";
import QuestionLifecycleSwimlane from "@/components/generated/question-lifecycle-swimlane";
import FallbackDegradationSwitchboard from "@/components/generated/fallback-degradation-switchboard";
import PocL1L3RetrievalArchitecture from "@/components/generated/poc-l1l3-retrieval-architecture";

// ── 共用零件 ────────────────────────────────────────────────────────────────

/** 區塊小標（比 DS.h3 收斂一階，給欄內標題用） */
function ColHead({ c, text }: { c: DeckThemeTokens; text: string }) {
  return (
    <span style={{ flex: "none", fontSize: DS.h3, fontWeight: 900, color: c.ink, letterSpacing: DTRACK.tight }}>
      {text}
    </span>
  );
}

function canvasMode(live: boolean, play: boolean): CanvasMode {
  return !live ? "thumb" : play ? "play" : "view";
}

const panel = (c: DeckThemeTokens): CSSProperties => ({
  boxSizing: "border-box",
  borderRadius: "var(--radius-lg)",
  border: `1px solid ${c.borderSoft}`,
  background: c.sunken,
});

function Chip({
  c,
  text,
  tone = "muted",
  mono = false,
}: {
  c: DeckThemeTokens;
  text: string;
  tone?: "muted" | "brand" | "accent";
  mono?: boolean;
}) {
  const fg = tone === "brand" ? c.brandInk : tone === "accent" ? c.accent : c.muted;
  const bg = tone === "brand" ? c.brandSoft : tone === "accent" ? c.accentSoft : c.sunken;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        border: `1px solid ${tone === "muted" ? c.borderSoft : fg}`,
        color: fg,
        fontSize: DS.micro,
        fontWeight: 700,
        fontFamily: mono ? "var(--font-mono)" : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/**
 * 直立的數字軌。<Kpi> 是一列橫排、沒有直排選項，塞進 320px 窄欄會把四個數字擠爛，
 * 所以借它的視覺語言（大數字 + unit + label + 左側狀態色條）自寫一支直排版本。
 */
interface StatRailItem {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "blue" | "orange" | "muted" | StatusTone;
}

function StatRail({ dark, width, items }: { dark: boolean; width: number; items: StatRailItem[] }) {
  const c = dkt(dark);
  return (
    <div
      style={{
        flex: "none",
        width,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: DGAP.sm,
      }}
    >
      {items.map((it) => {
        const t = toneColor(it.tone, c);
        return (
          <div
            key={it.label}
            style={{
              flex: 1,
              minHeight: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 2,
              padding: `0 ${DGAP.sm}px`,
              borderLeft: `3px solid ${t.fg}`,
              borderRadius: "var(--radius-sm)",
              background: dark ? c.sunken : "var(--neutral-50)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: DS.h2, fontWeight: 900, lineHeight: 1, color: t.fg, fontVariantNumeric: "tabular-nums" }}>
                {it.value}
              </span>
              {it.unit && <span style={{ fontSize: DS.small, fontWeight: 700, color: c.muted }}>{it.unit}</span>}
            </div>
            <span style={{ fontSize: DS.small, fontWeight: 800, color: c.body }}>{it.label}</span>
            {it.sub && <span style={{ fontSize: DS.micro, color: c.muted }}>{it.sub}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── PART 01 · PoC 範圍：起點在 L6 ────────────────────────────────────────────
// 左：既有互動元件（十層階梯，可縮放探索）。右：把「反查得到什麼」攤成 2×2 KPI。

function ScopeLadderPage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const mode = canvasMode(live, play);
  const sideW = 380;
  const canvasW = area.w - sideW - DGAP.lg;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.lg }}>
      <CanvasViewport
        content={live ? <PocScopeL1L10Ladder /> : undefined}
        w={canvasW}
        h={area.h}
        mode={mode}
        dark={dark}
        outerScale={outerScale}
        emptyId="poc-scope-l1-l10-ladder"
      />
      <div style={{ flex: "none", width: sideW, display: "flex", flexDirection: "column", gap: DGAP.sm }}>
        <Kpi
          dark={dark}
          style={{ flex: 1 }}
          items={[
            { label: "完整", value: "4", sub: "L1/L2/L3/L6，反查", tone: "blue" },
            { label: "凍結·暫代", value: "3", sub: "L7/L8/L9", tone: "warning" },
          ]}
        />
        <Kpi
          dark={dark}
          style={{ flex: 1 }}
          items={[
            { label: "不做", value: "3", sub: "L4/L5/L10", tone: "muted" },
            { label: "唯一起點", value: "L6", sub: "向量檢索 Top-K=5", tone: "blue" },
          ]}
        />
      </div>
    </div>
  );
}

// ── PART 01 · PoC 目標：三個元件各司其職 ────────────────────────────────────

function GoalsTriadPage({ dark }: CustomSlideProps) {
  return (
    <Triad
      dark={dark}
      statement="三個元件各自要達成一件事"
      items={[
        {
          label: "Vector Database",
          desc: "鎖定勞基法，結合 L1~L3+L6 總表建立 Embedding Database",
          icon: "database",
        },
        {
          label: "API（NestJS）",
          desc: "常駐服務：Indexer 觸發建庫、條文檢索 Top-K=5、總表整合免 LLM、風險分析報告唯一碰模型",
          icon: "settings",
        },
        {
          label: "UI（Vite + React）",
          desc: "一頁：問句 → 條文、L1~L3 分類、風險分析報告，讓檢索品質可被肉眼檢查",
          icon: "user",
        },
      ]}
    />
  );
}

// ── PART 01 · 系統邊界：讀寫分兩側（chrome:false 滿版）─────────────────────

function BoundaryMapPage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const mode = canvasMode(live, play);
  return (
    <CanvasViewport
      content={live ? <SystemBoundaryMap /> : undefined}
      w={area.w}
      h={area.h}
      mode={mode}
      dark={dark}
      outerScale={outerScale}
      emptyId="system-boundary-map"
    />
  );
}

// ── PART 01 · 系統邊界：讀寫分兩層 ───────────────────────────────────────────

function BoundaryLayersPage({ dark }: CustomSlideProps) {
  return (
    <Layers
      dark={dark}
      axis={["內部限定 · 寫", "對外公開 · 讀"]}
      lead="三支 API 兩讀一寫——但只有讀的那兩支對外。寫的那支動的是整個向量庫，跟法條管理後台待在同一側。"
      layers={[
        {
          label: "公開 internet",
          desc: "誰都碰得到 · 靠身分擋 · 只有讀",
          items: ["客戶前台 · 會員 · 讀", "對外 API · 串接方 · 讀 · PoC 不對外"],
        },
        {
          label: "限定 IP（不公開）",
          desc: "走不到驗證那一步 · 靠網路層擋",
          items: [
            "法條管理後台 · 顧問師 · 會改動向量庫",
            "Embedding API · 管理端 · 寫 · 由 Indexer 觸發",
            "運維管理後台 · 系統管理者 · Langfuse",
          ],
          emphasis: true,
        },
      ]}
    />
  );
}

// ── PART 01 · 帳號與權限：左導讀 + 右互動元件 ───────────────────────────────

function GuideStep({ c, n, title, desc }: { c: DeckThemeTokens; n: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: DGAP.sm, alignItems: "flex-start" }}>
      <span
        style={{
          flex: "none",
          width: 26,
          height: 26,
          borderRadius: "var(--radius-circle)",
          background: c.brandSoft,
          color: c.brandInk,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: DS.small,
          fontWeight: 900,
          fontFamily: "var(--font-mono)",
        }}
      >
        {n}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: DS.body, fontWeight: 800, color: c.ink, lineHeight: 1.4 }}>{title}</span>
        <span style={{ fontSize: DS.small, color: c.body, lineHeight: 1.5 }}>{desc}</span>
      </div>
    </div>
  );
}

function PermissionPage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const c = dkt(dark);
  const mode = canvasMode(live, play);
  const sideW = 460;
  const canvasW = area.w - sideW - DGAP.lg;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.lg }}>
      <div style={{ flex: "none", width: sideW, display: "flex", flexDirection: "column", gap: DGAP.md, minHeight: 0 }}>
        <ColHead c={c} text="這張圖要看的三件事" />
        <GuideStep c={c} n="1" title="扳開「加上企業帳號層」" desc="看 4 個角色怎麼長出第 5 個" />
        <GuideStep c={c} n="2" title="扳開「讓顧問師看會員問句」" desc="看兩條可見性路線誰通誰斷" />
        <GuideStep c={c} n="3" title="扳開「API key 併進角色表」" desc="看兩條生命週期軌對不對得齊" />
        <span style={{ marginTop: "auto", fontSize: DS.small, color: c.muted, lineHeight: 1.5 }}>
          13 條待決問題裡 6 條筆記已寫、7 條是推估
        </span>
      </div>
      <CanvasViewport
        content={live ? <PermissionScopeSwitches /> : undefined}
        w={canvasW}
        h={area.h}
        mode={mode}
        dark={dark}
        outerScale={outerScale}
        emptyId="permission-scope-switches"
      />
    </div>
  );
}

// ── PART 02 · 五個元件，五組選型 ────────────────────────────────────────────

function StackPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Cards
        dark={dark}
        columns={5}
        style={{ flex: 1, minHeight: 0 }}
        items={[
          {
            title: "Vector Database",
            desc: "PostgreSQL + pgvector",
            points: ["HNSW ＋ cosine 索引", "GIN 索引給 l3_codes", "建在 GCP 並寫 Runbook"],
            tone: "blue",
          },
          {
            title: "API（含 Indexer）",
            desc: "NestJS + TypeScript + LangChain + mistral-embed",
            points: ["Indexer 收進 API，管理端可重跑（ON CONFLICT DO UPDATE）"],
            tone: "blue",
          },
          {
            title: "UI",
            desc: "Vite + React + TypeScript",
            points: ["一頁：問句 → 條文 → 分類 → 報告", "不做登入、不做多頁"],
            tone: "orange",
          },
          {
            title: "生成式 LLM",
            desc: "Codex 5.6 Luna，只用在風險分析報告",
            points: ["換掉不影響向量庫與反查結果", "規格到位後整段換掉"],
            tone: "warning",
          },
          {
            title: "可觀測性",
            desc: "Langfuse（self-host，GCP）",
            points: ["記問句／輸出／token／延遲／模型版本", "不記 embedding（量大單價低）"],
            tone: "muted",
          },
        ]}
      />
      <Kpi
        dark={dark}
        style={{ flex: "none", height: 122 }}
        items={[
          { label: "向量維度", value: "1024", tone: "blue" },
          { label: "TOP-K", value: "5", tone: "blue" },
          { label: "生成式模型介入點", value: "1", unit: "處", tone: "warning" },
          { label: "可觀測性覆蓋", value: "2", unit: "段", sub: "G1 意圖判定＋L9 報告生成", tone: "muted" },
        ]}
      />
    </>
  );
}

// ── PART 02 · 資料結構：兩張表，一條 join ───────────────────────────────────
// 這三頁（schema／扇出／CHECK）沿用改版前的版面：兩欄 schema 卡中間夾一把一對多的
// 扇子、扇出統計的 KPI + bars、CHECK 的 SQL + 矩陣。它們是自寫版面而非整頁級原子，
// 因為「兩張表怎麼接起來」這件事的形狀本身就是論點。

interface FieldRow {
  name: string;
  type: string;
  note?: string;
  mark?: boolean;
}

function FieldList({ c, rows, rowH }: { c: DeckThemeTokens; rows: FieldRow[]; rowH: number }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 3 }}>
      {rows.map((f) => (
        <div
          key={f.name}
          style={{
            flex: "none",
            height: rowH,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: DGAP.xs,
            padding: `0 ${DGAP.xs}px`,
            borderRadius: "var(--radius-sm)",
            background: f.mark ? c.brandSoft : "transparent",
          }}
        >
          <span
            style={{
              flex: "none",
              width: 152,
              fontFamily: "var(--font-mono)",
              fontSize: DS.small,
              fontWeight: f.mark ? 900 : 600,
              color: f.mark ? c.brandInk : c.ink,
            }}
          >
            {f.name}
          </span>
          <span style={{ flex: "none", width: 108, fontSize: DS.micro, color: c.muted, fontFamily: "var(--font-mono)" }}>
            {f.type}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: DS.micro, lineHeight: 1.35, color: f.mark ? c.body : c.muted }}>
            {f.note ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function TableCard({
  c,
  name,
  kind,
  children,
}: {
  c: DeckThemeTokens;
  name: string;
  kind: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: DGAP.xs,
        padding: DGAP.sm,
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${c.border}`,
      }}
    >
      <div style={{ flex: "none", display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{name}</span>
        <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>{kind}</span>
      </div>
      {children}
    </div>
  );
}

function SchemaJoinPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.xs, alignItems: "stretch" }}>
      <TableCard c={c} name="labor_articles" kind="法條 · VECTOR DATA">
        <FieldList
          c={c}
          rowH={30}
          rows={[
            { name: "id", type: "bigserial" },
            { name: "law_name", type: "text", note: "PoC 鎖定勞基法" },
            { name: "article_code", type: "text", note: "對得起總表的 L6 條文代碼" },
            { name: "clause_no", type: "text", note: "長條文按項切時才填" },
            { name: "content", type: "text", note: "法條原文，留著才 debug 得動", mark: true },
            { name: "embedding", type: "vector(1024)", note: "允許 NULL：Indexer 元件先載入條文列、再回填向量", mark: true },
            { name: "embedding_model", type: "text", note: "換模型時可辨識殘留資料" },
            { name: "l1_codes", type: "text[]", note: "多值", mark: true },
            { name: "l2_codes", type: "text[]", note: "多值", mark: true },
            { name: "l3_codes", type: "text[]", note: "多值 · GIN 索引 · 反查的鍵", mark: true },
            { name: "created_at", type: "timestamptz" },
          ]}
        />
        <div
          style={{
            flex: "none",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: `${DGAP.xs}px ${DGAP.sm}px`,
            borderRadius: "var(--radius-md)",
            background: c.accentSoft,
            borderLeft: `3px solid ${c.accent}`,
          }}
        >
          <div style={{ fontSize: DS.micro, fontWeight: 800, color: c.accent }}>兩處偏離原始欄位定義</div>
          <div style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.body }}>
            一、L1／L2／L3 編號在法條側是多值，單一字串放不下。
            <br />
            二、法條內容拆成 content 與 embedding 兩欄，原文要留著。
          </div>
        </div>
      </TableCard>

      {/* 中間：一對多的扇子 */}
      <div
        style={{
          flex: "none",
          width: 172,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: DGAP.xs,
        }}
      >
        <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.brandInk, textAlign: "center" }}>
          一條法條
          <br />
          對到多個題型
        </span>
        <svg width={150} height={132} viewBox="0 0 150 132" aria-hidden="true">
          <circle cx={10} cy={66} r={6} fill={c.brand} />
          {[18, 66, 114].map((y) => (
            <path key={y} d={`M 16 66 C 70 66, 80 ${y}, 134 ${y}`} fill="none" stroke={c.brand} strokeWidth={2} />
          ))}
          {[18, 66, 114].map((y) => (
            <circle key={y} cx={138} cy={y} r={5} fill="none" stroke={c.brand} strokeWidth={2} />
          ))}
        </svg>
        <Chip c={c} text="l3_codes[] ⊃ l3_code" mono tone="brand" />
        <span style={{ fontSize: DS.micro, color: c.muted, textAlign: "center", lineHeight: 1.4 }}>
          GIN 索引比對
          <br />
          不需要 LLM
        </span>
      </div>

      <TableCard c={c} name="decision_tree" kind="決策樹 · STRUCTURED DATA">
        <FieldList
          c={c}
          rowH={30}
          rows={[
            { name: "l3_code", type: "text", note: "主鍵，如 B5-02", mark: true },
            { name: "l3_origin_code", type: "text", note: "85 列中有 23 列與 l3_code 不同" },
            { name: "l1_code", type: "char(1)", note: "A / B / C / D" },
            { name: "l1_animal", type: "text", note: "獵犬／蜜蜂／大象／貓頭鷹" },
            { name: "l1_scope", type: "text" },
            { name: "l2_code", type: "text" },
            { name: "l2_name", type: "text" },
            { name: "l3_title", type: "text" },
            { name: "enterprise_tone", type: "text", note: "天然的評測 query", mark: true },
            { name: "frequency", type: "text", note: "高／中／低頻 · CHECK" },
            { name: "risk", type: "text", note: "高／中／低風險 · CHECK" },
            { name: "initial_mines", type: "smallint", note: "1–5，是算出來的", mark: true },
            { name: "initial_intervention", type: "text", note: "低／中／高／急迫，同樣算出來", mark: true },
            { name: "article_codes", type: "text[]", note: "全部 L6 條文代碼" },
          ]}
        />
      </TableCard>
    </div>
  );
}

// ── PART 02 · 扇出統計：為什麼一定得是 text[] ───────────────────────────────

function FanoutPage({ dark, live }: CustomSlideProps) {
  const c = dkt(dark);

  return (
    <>
      <Kpi
        dark={dark}
        style={{ flex: "none", height: 118 }}
        items={[
          { label: "L3 題型", value: "85", sub: "總表 85 列", tone: "blue" },
          { label: "L2 主題", value: "22", sub: "四大類之下", tone: "blue" },
          { label: "相異條文", value: "101", sub: "85 列攤開後", tone: "blue" },
          { label: "條文–題型對應", value: "350", sub: "平均一條被 3.5 個題型引用", tone: "orange" },
        ]}
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.md }}>
        <div style={{ flex: "none", width: 820, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
          <Chart
            dark={dark}
            live={live}
            variant="bars"
            width={820}
            max={33}
            categoryKey="k"
            series={[{ key: "v", label: "被引用的 L3 題型數", tone: "blue" }]}
            data={[
              { k: "第79條（罰則）", v: 33 },
              { k: "第39條", v: 6 },
              { k: "第38條", v: 3 },
              { k: "全表平均", v: 3.5 },
            ]}
            style={{ flex: "none" }}
          />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              ...panel(c),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 6,
              padding: DGAP.sm,
            }}
          >
            <div style={{ fontSize: DS.body, fontWeight: 800, color: c.ink }}>第 79 條是全表扇出最高的條文</div>
            <div style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>
              罰則條文被 33 個題型引用，四個 L1 大類全中。這種條文一旦被檢索到，反查會一次帶回一大票題型 ——
              也正是 rerank 之後要處理的問題。
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: DGAP.xs,
            padding: DGAP.sm,
            borderRadius: "var(--radius-lg)",
            border: `1px solid ${c.border}`,
          }}
        >
          <ColHead c={c} text="所以是 text[]，不是 text" />
          <div style={{ fontSize: DS.micro, fontFamily: "var(--font-mono)", color: c.muted }}>
            第39條 · l3_codes text[]
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["B5-01", "B5-02", "B5-03", "B5-04", "C3-01", "D5-05"].map((x) => (
              <Chip key={x} c={c} text={x} tone="brand" mono />
            ))}
          </div>
          <div style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
            一條法條同時橫跨 B／C／D 三個大類 —— 單一字串放不下。
          </div>

          <div style={{ height: 1, background: c.border, margin: `${DGAP.xs}px 0` }} />

          <div style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
            <span
              style={{
                fontSize: DS.h2,
                fontWeight: 900,
                lineHeight: 1,
                color: c.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              51
            </span>
            <span style={{ fontSize: DS.body, fontWeight: 700, color: c.muted }}>／ 101 條</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, fontSize: DS.small, lineHeight: 1.55, color: c.body }}>
            超過一半的法條橫跨一個以上的 L1 大類。這就是 l1_codes／l2_codes／l3_codes 三欄都用陣列 ＋ GIN
            索引的理由，不是為了彈性好看。
          </div>
        </div>
      </div>
    </>
  );
}

// ── PART 02 · CHECK 矩陣：地雷數是算出來的 ──────────────────────────────────

const MINES_SQL = `CONSTRAINT chk_mines_derived CHECK (
  initial_mines =
    (CASE frequency
       WHEN '低頻' THEN 1
       WHEN '中頻' THEN 2
       ELSE 3 END)
  + (CASE risk
       WHEN '低風險' THEN 0
       WHEN '中風險' THEN 1
       ELSE 2 END)
),
CONSTRAINT chk_intervention_derived CHECK (
  initial_intervention = CASE
    WHEN initial_mines <= 1 THEN '低'
    WHEN initial_mines <= 3 THEN '中'
    WHEN initial_mines  = 4 THEN '高'
    ELSE '急迫' END
)`;

function CheckPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);

  const cell = (mines: number, level: string, top = false) => ({
    text: `${mines} 顆`,
    note: `介入 ${level}`,
    tone: "blue" as const,
    emphasis: top,
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.md }}>
      <Code
        dark={dark}
        lines={MINES_SQL}
        lang="sql"
        fileName="db/schema.sql · decision_tree"
        size="xs"
        showLineNumbers={false}
        style={{ flex: "none", width: 620 }}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: DGAP.xs,
            flexWrap: "wrap",
            padding: `${DGAP.xs}px ${DGAP.sm}px`,
            borderRadius: "var(--radius-md)",
            background: c.brandSoft,
          }}
        >
          <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>地雷數</span>
          <span style={{ fontSize: DS.body, fontWeight: 700, color: c.body }}>＝ 頻率分</span>
          <Chip c={c} text="低 1 ／ 中 2 ／ 高 3" />
          <span style={{ fontSize: DS.body, fontWeight: 700, color: c.body }}>＋ 風險分</span>
          <Chip c={c} text="低 0 ／ 中 1 ／ 高 2" />
        </div>

        <Table
          dark={dark}
          style={{ flex: 1, minHeight: 0 }}
          corner="頻率 ／ 風險"
          head={["低風險", "中風險", "高風險"]}
          rowHeads={["高頻", "中頻", "低頻"]}
          highlightCol={2}
          rows={[
            [cell(3, "中"), cell(4, "高"), cell(5, "急迫", true)],
            [cell(2, "中"), cell(3, "中"), cell(4, "高")],
            [cell(1, "低"), cell(2, "中"), cell(3, "中")],
          ]}
        />
      </div>
    </div>
  );
}

// ── PART 02 · AI 介入：上畫布 + 下 Kpi 帶 ───────────────────────────────────

function PipelinePage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const mode = canvasMode(live, play);
  // 這個管線元件是「窄而高」的直式版面：把 KPI 壓在底部會讓畫布只剩一條扁帶，
  // 縮放比被高度綁死（實測 29%），左右還留下大片灰。改成 KPI 直立成右側窄軌，
  // 畫布吃滿整個內容區高度，縮放比才拉得起來。
  const railW = 320;
  const canvasW = area.w - railW - DGAP.md;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.md }}>
      <CanvasViewport
        content={live ? <AiInterventionPipeline /> : undefined}
        w={canvasW}
        h={area.h}
        mode={mode}
        dark={dark}
        outerScale={outerScale}
        emptyId="ai-intervention-pipeline"
      />
      <StatRail
        dark={dark}
        width={railW}
        items={[
          { label: "節點", value: "14", unit: "格", tone: "muted" },
          { label: "碰模型", value: "3", unit: "處", tone: "warning" },
          { label: "閘門", value: "4", unit: "道", tone: "blue" },
          { label: "AI 閘門", value: "1", unit: "道", sub: "只有 G1", tone: "warning" },
        ]}
      />
    </div>
  );
}

// ── PART 02 · 安全與稽核：畫布 55% + 右欄自寫威脅卡（拆解重組 <Risk>）─────────
// <Risk> 原生預期全寬，塞進 55/45 分欄很可能破版；改借它「威脅／代價／緩解」
// 的三段式資訊架構，自寫窄欄卡片——顏色一律取 dkt(dark)，狀態色走 toneColor()。

interface ThreatCardData {
  letter: string;
  title: string;
  threat: string;
  cost: string;
  mitigation: string;
  tone: StatusTone;
}

/**
 * 威脅／代價／緩解三段。標籤走**行內前綴**而不是各佔一行 —— 三張卡疊在窄欄裡，
 * 每個標籤各佔一行會多吃掉九行的高度，直接把第三張卡的緩解那行擠出可用區。
 *
 * 用 grid 而不是 flex：標籤欄寬度釘死一格，換行的第二行才會整齊縮排到文字欄下方，
 * 而不是回到標籤的位置；`alignItems: baseline` 讓小標籤與第一行文字對齊基線。
 */
const FIELD_LABEL_W = 38;

function Field({ c, label, text }: { c: DeckThemeTokens; label: string; text: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${FIELD_LABEL_W}px minmax(0, 1fr)`,
        columnGap: DGAP.xs,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontSize: DS.micro,
          fontWeight: 800,
          color: c.muted,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: DS.small, lineHeight: 1.4, color: c.body, textWrap: "pretty" }}>{text}</span>
    </div>
  );
}

function ThreatCard({ dark, c, data }: { dark: boolean; c: DeckThemeTokens; data: ThreatCardData }) {
  const t = toneColor(data.tone, c);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 3,
        padding: "6px 10px",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${c.borderSoft}`,
        borderLeft: `3px solid ${t.fg}`,
        background: dark ? c.sunken : "var(--neutral-50)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs, lineHeight: 1 }}>
        <span
          style={{
            flex: "none",
            width: 20,
            height: 20,
            borderRadius: "var(--radius-circle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: t.soft,
            color: t.fg,
            fontSize: DS.small,
            fontWeight: 900,
          }}
        >
          {data.letter}
        </span>
        <span style={{ fontSize: DS.body, fontWeight: 800, color: c.ink }}>{data.title}</span>
      </div>
      <Field c={c} label="威脅" text={data.threat} />
      <Field c={c} label="代價" text={data.cost} />
      <Field c={c} label="緩解" text={data.mitigation} />
    </div>
  );
}

function SecurityGatePage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const c = dkt(dark);
  const mode = canvasMode(live, play);
  // 畫布 52 / 威脅卡 48：右欄再窄一點，B 卡的「緩解」就會多折一行、把整欄擠出可用區。
  const leftW = Math.round((area.w - DGAP.lg) * 0.52);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.lg }}>
      <CanvasViewport
        content={live ? <SecurityGatePlayground /> : undefined}
        w={leftW}
        h={area.h}
        mode={mode}
        dark={dark}
        outerScale={outerScale}
        emptyId="security-gate-playground"
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
        <ThreatCard
          dark={dark}
          c={c}
          data={{
            letter: "A",
            title: "離題濫用",
            threat: "拿系統當翻譯機／聊天／寫程式",
            cost: "燒 token",
            mitigation: "G1 判 in_scope，不與報告生成共用 context",
            tone: "warning",
          }}
        />
        <ThreatCard
          dark={dark}
          c={c}
          data={{
            letter: "B",
            title: "提示注入／越權",
            threat: "角色扮演、忽略指令、誘導直接給法律結論",
            cost: "產出未經審核的法律意見，踩產品定位紅線",
            mitigation: "砍掉模型權限面：不能決定範圍、不能引用未檢索條文、不能有副作用；出口再過 G3",
            tone: "critical",
          }}
        />
        <ThreatCard
          dark={dark}
          c={c}
          data={{
            letter: "C",
            title: "內部資訊外洩",
            threat: "誘導吐出 prompt 模板／其他請求內容",
            cost: "PoC 單租戶風險低，但 trace 裡有真實企業問句",
            mitigation: "self-host，context 只剩公開法條＋使用者輸入＋報告範本",
            tone: "warning",
          }}
        />
      </div>
    </div>
  );
}

// ── PART 02 · 四道閘門，只有一道是 AI ───────────────────────────────────────

function GatesSpectrumPage({ dark }: CustomSlideProps) {
  return (
    <Spectrum
      dark={dark}
      left="不經模型（規則）"
      right="AI"
      marks={[
        { label: "G0 規則守門", at: 0.04, note: "使用者輸入層，長度／次數／檔案限制；不判斷內容" },
        {
          label: "G3 輸出白名單",
          at: 0.22,
          note: "L9 報告輸出，l3_code ∈ 候選、article_codes ⊆ 檢索集合、DB 值直取、語意對稱、矛盾偵測",
        },
        { label: "G2 檢索幾何", at: 0.4, note: "L3 之後進 L4 前，top1／mean@5／margin 三統計量" },
        {
          label: "G1 意圖判定",
          at: 0.95,
          note: "L1 四大類分流前，判 in_scope／has_directive，溫度 0、fail closed",
          emphasis: true,
        },
      ]}
    />
  );
}

// ── PART 02 · 一條主幹，六個出口（chrome:false 滿版）───────────────────────

function SwimlanePage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const mode = canvasMode(live, play);
  return (
    <CanvasViewport
      content={live ? <QuestionLifecycleSwimlane /> : undefined}
      w={area.w}
      h={area.h}
      mode={mode}
      dark={dark}
      outerScale={outerScale}
      emptyId="question-lifecycle-swimlane"
    />
  );
}

// ── PART 03 · 測試策略：畫布縮小置中 + 四角自寫標註 ─────────────────────────
// PassCriteriaQuiz 是可互動元件，pin 疊在畫布上會攔截點擊、也會干擾 CanvasViewport
// 的拖曳。四個「題型」標註改放在畫布四周的留白裡，pin 與引線一律 pointerEvents:none，
// 不蓋在畫布互動區上、也不使用 <Annotate> 元件本體。

type Corner = "tl" | "tr" | "bl" | "br";

function CornerLabel({
  c,
  corner,
  width,
  title,
  text,
}: {
  c: DeckThemeTokens;
  corner: Corner;
  width: number;
  title: string;
  text: string;
}) {
  const isTop = corner === "tl" || corner === "tr";
  const isLeft = corner === "tl" || corner === "bl";
  const posStyle: CSSProperties = {
    ...(isTop ? { top: 8 } : { bottom: 8 }),
    ...(isLeft ? { left: 8 } : { right: 8 }),
  };
  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        width,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ flex: "none" }}>
          <line
            x1={isLeft ? 2 : 16}
            y1={isTop ? 2 : 16}
            x2={isLeft ? 16 : 2}
            y2={isTop ? 16 : 2}
            stroke={c.border}
            strokeWidth={2}
          />
          <circle cx={isLeft ? 16 : 2} cy={isTop ? 16 : 2} r={2.5} fill={c.brand} />
        </svg>
        <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>{title}</span>
      </div>
      <span style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.muted }}>{text}</span>
    </div>
  );
}

function QuizPage({ dark, live, play, area, outerScale }: CustomSlideProps) {
  const c = dkt(dark);
  const mode = canvasMode(live, play);
  const canvasW = Math.min(1000, area.w);
  const margin = (area.w - canvasW) / 2;
  const labelW = Math.max(120, margin - 24);

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div style={{ position: "absolute", left: margin, top: 0 }}>
        <CanvasViewport
          content={live ? <PassCriteriaQuiz /> : undefined}
          w={canvasW}
          h={area.h}
          mode={mode}
          dark={dark}
          outerScale={outerScale}
          emptyId="pass-criteria-quiz"
        />
      </div>
      <CornerLabel c={c} corner="tl" width={labelW} title="基準線題" text="第 1 題：Top-5 命中第 1 名，這題掛了後面不用看" />
      <CornerLabel c={c} corner="tr" width={labelW} title="陷阱題" text="第 2–5 題：直覺通過但正解不算通過" />
      <CornerLabel c={c} corner="bl" width={labelW} title="known gap" text="第 6 題：G3 只檢查形式，這題該放行" />
      <CornerLabel c={c} corner="br" width={labelW} title="不計分" text="第 7 題：答案出自函釋，標註時就該排除" />
    </div>
  );
}

// ── PART 03 · 為什麼兩份題庫都要跑 ───────────────────────────────────────────

function TwoDecksDecisionPage({ dark }: CustomSlideProps) {
  return (
    <Decision
      dark={dark}
      context="能測的只有兩端：L6 檢索撈得準不準、L9 報告有沒有守規矩。中間 L4~L8 沒實作，測不到。"
      options={[
        { label: "只跑 A 卷（勞動部 FAQ）", note: "問句是法律人寫的，測不出真實使用者的白話語域" },
        { label: "只跑 B 卷（Threads 真實貼文）", note: "沒有標準答案可自動評分，覆蓋率測不出來" },
        { label: "兩者都跑，但都自動評分", note: "B 卷沒有官方條號可比對，自動評分做不到" },
        { label: "A 卷自動評分測覆蓋率、B 卷人工評分測真實語域", note: "用問句語域區分兩件事", chosen: true },
      ]}
      decision="A 卷 20 題照 L1 四大類與 L2 22 主題鋪開（不隨機抽），主指標 Recall@5；B 卷 5~8 題由顧問師從條文對不對、風險等級合不合理、缺漏事實準不準、有沒有越線給法律結論四維度各打 1~5 分，任一項 ≤2 不及格。"
      consequences={[
        "A 卷另記 Hit@1、L1 與 L3 正確率分開算、unclassified 率",
        "B 卷入題庫前公司名／人名／金額一律改寫",
        "改 prompt 後同一批重跑，靠 prompt 版本號對回是哪一次調的",
        "這 20 題與 G2 門檻校準共用同一批資料，換 embedding 模型時一起重跑",
      ]}
    />
  );
}

// ── PART 04 · Token 與成本 · 下次會議交付清單 ───────────────────────────────

function CostAndDeliverablesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.lg }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.sm, minHeight: 0 }}>
        <ColHead c={c} text="Token 與成本：還沒到位的三件事" />
        <Kpi
          dark={dark}
          style={{ flex: "none" }}
          items={[{ label: "確定的成本數字", value: "0", sub: "待補", tone: "muted", emphasis: true }]}
        />
        <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>
          數字從 Langfuse trace 來：單次報告的 token 用量、延遲、失敗率都在 trace 裡，不必另外埋計數器。
        </p>
        <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>
          embedding 那段不記，所以這裡只涵蓋報告生成。
        </p>
        <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>
          待補：單次與月度成本估算、使用者月限額。
        </p>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.sm, minHeight: 0 }}>
        <ColHead c={c} text="下次會議交付清單：8 項 6 項到位" />
        <Table
          dark={dark}
          style={{ flex: 1, minHeight: 0 }}
          head={["# · 主題", "狀態"]}
          rows={[
            [{ text: "1 系統邊界" }, { text: "已完成", tone: "good" }],
            [{ text: "2 帳號與權限" }, { text: "推估待對齊", tone: "warning" }],
            [{ text: "3 技術棧 · 4 AI 介入" }, { text: "已完成", tone: "good" }],
            [{ text: "5 測試策略 · 6 Token 與成本 · 7 安全與稽核" }, { text: "已完成", tone: "good" }],
            [{ text: "8 RAG 預留" }, { text: "未開始", tone: "muted" }],
          ]}
        />
      </div>
    </div>
  );
}

// ── PART 04 · 五步走完，就是這一版的全部 ────────────────────────────────────

function TasksRailPage({ dark }: CustomSlideProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Stages
        dark={dark}
        variant="rail"
        alternate
        size={460}
        style={{ flex: "none" }}
        items={[
          {
            tag: "1",
            icon: "database",
            title: "Vector Database",
            desc: "GCP 建 PostgreSQL + pgvector，同步撰寫環境建置 Runbook",
            tone: "blue",
            variant: "active",
          },
          {
            tag: "2",
            icon: "settings",
            title: "API（Indexer + 檢索 + 總表整合）",
            desc: "收進 NestJS，管理端 command／endpoint 觸發，可重跑 ON CONFLICT DO UPDATE",
            tone: "blue",
          },
          {
            tag: "3",
            icon: "plug",
            title: "API（風險分析報告）",
            desc: "撰寫 prompt 餵 Codex 5.6 Luna；這一步是暫代，規格到位後整段換掉",
            tone: "warning",
          },
          {
            tag: "4",
            icon: "gauge",
            title: "可觀測性接線",
            desc: "GCP 架設 self-host Langfuse（含自己的 PostgreSQL），報告呼叫掛 trace，降級事件一併上報",
            tone: "blue",
          },
          {
            tag: "5",
            icon: "user",
            title: "UI",
            desc: "Vite + React 一頁：問句 → 條文清單 → L1~L3 分類 → 風險分析報告",
            tone: "muted",
          },
        ]}
      />
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────────────────────

const deck: Deck = {
  slug: "勞動法遵決策支援系統-poc-l1-l3-檢索閉環",
  title: "收斂到 L1–L3",
  eyebrow: "PoC · 勞動法遵決策支援系統",
  generatedAt: "2026-08-07",
  source: "src/content/notes/勞動法遵決策支援系統-poc-l1-l3-檢索閉環.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PoC · 勞動法遵決策支援系統",
      title: "收斂到 L1–L3",
      subtitle: "問句進來、撈相近法條、與總表整合——AI 只在頭尾兩端出現，中間靠規則、資料庫 CHECK 與四道閘門頂住",
      meta: ["由 勞動法遵決策支援系統-poc-l1-l3-檢索閉環.mdx 生成", "26 頁 · 16:9"],
      agenda: [
        { n: "01", title: "PoC 範圍", sub: "只做 L1–L3，L4 以後不做" },
        { n: "02", title: "PoC 目標", sub: "三個元件各自要達成的事" },
        { n: "03", title: "系統邊界", sub: "四個模組，讀寫切在兩側" },
        { n: "04", title: "帳號與權限", sub: "四個角色，推估待對齊" },
        { n: "05", title: "技術棧", sub: "五個元件，五組選型" },
        { n: "06", title: "PoC 資料結構", sub: "兩張表、85 列決策樹" },
        { n: "07", title: "AI 介入", sub: "14 個節點只有 3 個碰模型" },
        { n: "08", title: "安全與稽核", sub: "三類威脅，四道閘門" },
        { n: "09", title: "失敗降級", sub: "每種失敗都有預先定好的退路" },
        { n: "10", title: "一次提問的完整路徑", sub: "一條主幹，六個出口" },
        { n: "11", title: "測試策略", sub: "A 卷測覆蓋率，B 卷測語域" },
        { n: "12", title: "Token 與成本", sub: "數字從 Langfuse trace 來" },
        { n: "13", title: "PoC 任務拆解", sub: "五步走完就是這一版" },
        { n: "14", title: "下次會議交付清單", sub: "八項，六項已完成" },
      ],
    },

    {
      layout: "section",
      nav: "章節：範圍、目標與邊界",
      num: "01",
      eyebrow: "SCOPE & BOUNDARY",
      title: "範圍、目標與邊界，三層收斂",
      subtitle: "L1–L3 由 L6 反查；讀寫分兩側；權限由三個『不做』撐出簡單",
    },
    {
      layout: "custom",
      nav: "PoC 範圍：起點在 L6",
      num: "01",
      eyebrow: "PART 01 · PoC 範圍",
      title: "起點在 L6，往回反查 L1–L3",
      titleNote: "十層裡完整 4、凍結·暫代 3、不做 3",
      render: ScopeLadderPage,
      callout: {
        icon: "target",
        tone: "blue",
        text: "分類是檢索的副產物：L6 條文一撈到，L1/L2/L3 就在手上，不需要模型判斷。",
      },
    },
    {
      layout: "custom",
      nav: "PoC 目標：三個元件各司其職",
      num: "01",
      eyebrow: "PART 01 · PoC 目標",
      title: "三個元件，各自完成一件事",
      titleNote: "跟前一版最大差別：Indexer 不再是獨立 CLI，收進 API",
      render: GoalsTriadPage,
      pill: { text: "Indexer 收進 API", tone: "blue" },
      callout: {
        icon: "lightbulb",
        tone: "blue",
        text: "Indexer 收進 API 之後，embedding 設定只有一份——模型名稱、維度、切塊規則不會在兩支程式裡各寫一次然後悄悄長歪。",
      },
    },
    {
      layout: "custom",
      nav: "系統邊界：讀寫分兩側",
      chrome: false,
      render: BoundaryMapPage,
    },
    {
      layout: "custom",
      nav: "系統邊界：讀寫分兩層",
      num: "01",
      eyebrow: "PART 01 · 系統邊界",
      title: "這條邊界切的不是模組，是讀寫",
      titleNote: "線上方只讀得到東西，會改動向量庫的入口一個都不在線上方",
      render: BoundaryLayersPage,
      callout: {
        icon: "lock",
        tone: "blue",
        text: "三支 API，兩讀一寫——但只有讀的那兩支對外。寫的那支動的是整個向量庫，跟法條管理後台待在同一側：網路層擋在門外是第一層，管理端 key 是第二層。",
      },
      footnotes: [{ n: "1", text: "前台驗證方案（JWT／OAuth／SSO）與限定 IP 的實作手段（VPN／IAP／allowlist）都未定案" }],
    },
    {
      layout: "custom",
      nav: "帳號與權限：三個『不做』撐出簡單",
      num: "01",
      eyebrow: "PART 01 · 帳號與權限",
      title: "單純的權限表，是設計出來的",
      titleNote: "崴仁的角色×功能×資料權限表尚未交付，這是推估版本",
      render: PermissionPage,
      callout: {
        icon: "info",
        tone: "warning",
        text: "四個角色（會員／顧問師／系統管理者／API 串接方·機器）撐起的權限表只有 6 條資料權限——單純是三個範圍決策撐出來的。",
      },
    },

    {
      layout: "section",
      nav: "章節：架構與資料結構",
      num: "02",
      eyebrow: "ARCHITECTURE & DATA",
      title: "一個模型，兩張表",
      subtitle: "UI 進、API 出，一庫交棒；兩張表一條 join，反查不需要模型",
    },
    {
      layout: "full-visual",
      nav: "技術架構圖",
      num: "02",
      eyebrow: "PART 02 · 技術架構",
      title: "UI 進、API 出，一庫交棒",
      viz: PocL1L3RetrievalArchitecture,
      vizLabel: "@ai-visualize · poc-l1l3-retrieval-architecture",
      vizHint:
        "最上層 UI（Vite + React）送出白話問句；左側 API（NestJS 常駐服務）內部並排 Indexer 元件（管理端觸發、非常駐流程）與查詢流程（Question → Embedding → Top-K 檢索 → Mapping → 風險分析報告）；右側 PostgreSQL + pgvector 是建庫與查詢共用的唯一交棒點。查詢流程前四步只用 mistral-embed，只有最後一步的風險分析報告碰生成式 LLM（Codex 5.6 Luna）——那是 L4~L8 規格未到的暫代做法。",
    },
    {
      layout: "custom",
      nav: "五個元件，五組選型",
      num: "02",
      eyebrow: "PART 02 · 技術選型",
      title: "五個元件，五組選型",
      titleNote: "生成式模型與可觀測性都是新增，不在原設計裡",
      render: StackPage,
      callout: {
        icon: "alert",
        tone: "critical",
        chip: "設定層綁死",
        text: "建庫與查詢用不同 embedding 模型，向量空間對不上、檢索結果會是隨機的——而且不會報錯。",
      },
    },
    {
      layout: "custom",
      nav: "兩張表，一條 join",
      num: "02",
      eyebrow: "PART 02 · 資料結構",
      title: "兩張表，一條 join",
      titleNote: "labor_articles 存法條與向量，decision_tree 存 85 列決策樹",
      render: SchemaJoinPage,
      callout: {
        icon: "database",
        tone: "blue",
        text: "反查就是拿檢索回來的條文 l3_codes 去比對總表主鍵 —— 一個 GIN 索引的陣列比對，不是一次模型呼叫。",
      },
    },
    {
      layout: "custom",
      nav: "為什麼一定得是陣列欄位",
      num: "02",
      eyebrow: "PART 02 · 資料結構",
      title: "為什麼一定得是陣列欄位",
      titleNote: "把 85 列攤開之後看到的形狀",
      render: FanoutPage,
      callout: {
        icon: "info",
        tone: "blue",
        text: "101 個相異條文對上 350 筆條文–題型對應，平均一條法條被 3.5 個題型引用；其中 51 條橫跨一個以上的 L1 大類。",
      },
    },
    {
      layout: "custom",
      nav: "地雷數是算出來的",
      num: "02",
      eyebrow: "PART 02 · 資料結構",
      title: "地雷數不是資料，是算出來的",
      titleNote: "所以用 CHECK 守住，而不是相信載入的人",
      render: CheckPage,
      callout: {
        icon: "lock",
        tone: "good",
        chip: "85 列零例外",
        text: "總表 85 列全部吻合這條公式。之後顧問師改了風險等級卻忘了改地雷數，載入當下就會被擋下來。",
      },
    },

    {
      layout: "section",
      nav: "章節：模型治理",
      num: "03",
      eyebrow: "AI GOVERNANCE",
      title: "AI 只在頭尾兩端出現",
      subtitle: "四道閘門只有一道是 AI；每一種失敗都退到下一層仍交得出東西",
    },
    {
      layout: "custom",
      nav: "AI 只在頭尾兩端",
      num: "03",
      eyebrow: "PART 03 · AI 介入",
      title: "14 個節點，只有 3 個碰模型",
      titleNote: "G1 判意圖、L9 寫報告、L10 顧問推薦（不做）",
      render: PipelinePage,
      callout: {
        icon: "alert",
        tone: "warning",
        text: "兜底的 G2（檢索幾何）與 G3（輸出白名單）都不經模型——G1 可以被說服，所以不是最後一道。",
      },
    },
    {
      layout: "custom",
      nav: "安全：追一句話穿過四道閘門",
      num: "03",
      eyebrow: "PART 03 · 安全與稽核",
      title: "三類威脅，模型的權限面被砍掉",
      titleNote: "禁止語句只是輔助，真正的防線是 context 裡沒東西可洩",
      render: SecurityGatePage,
      callout: {
        icon: "alert",
        tone: "critical",
        chip: "G3 是出口檢查，不是完整保證",
        text: "一旦報告生成呼叫工具，G3 就看不到側門；格式合法但敘述被污染的內容，G3 也抓不到——那要靠顧問師在 B 卷測試裡抓。",
      },
      footnotes: [{ n: "1", text: "PoC 會記完整會員問句，去識別化不在 PoC 範圍——self-host 是這個取捨成立的前提" }],
    },
    {
      layout: "custom",
      nav: "四道閘門：只有一道是 AI",
      num: "03",
      eyebrow: "PART 03 · 安全與稽核",
      title: "四道閘門，只有一道是 AI",
      titleNote: "便宜的擋前面；兜底的 G2 與 G3 都不經模型",
      render: GatesSpectrumPage,
      callout: {
        icon: "lock",
        tone: "blue",
        text: "G1 是 LLM、可以被說服，所以兜底的是不經模型的 G2 與 G3——這正是為什麼便宜的規則要擋在最前面，唯一的 AI 閘門被前後兩層規則包住。",
      },
    },
    {
      layout: "full-visual",
      nav: "扳故障開關，看結果一層層剝落",
      num: "03",
      eyebrow: "PART 03 · 失敗降級",
      title: "降級不是壞掉，是退到下一層",
      viz: FallbackDegradationSwitchboard,
      vizLabel: "@ai-visualize · fallback-degradation-switchboard",
      vizHint:
        "四個故障開關對應四種失敗情境：分類模型逾時／schema 驗證失敗 → 退回純反查；信心低於門檻 → 列 2–3 候選待確認；完全無命中 → 走 unclassified 出口；報告模型失敗 → 退回結構化 JSON。可複選，右欄按最嚴重者呈現；每一次降級都寫進 Langfuse trace，標上降級原因。",
    },
    {
      layout: "custom",
      nav: "一條主幹，六個出口",
      chrome: false,
      render: SwimlanePage,
    },

    {
      layout: "section",
      nav: "章節：驗證",
      num: "04",
      eyebrow: "VALIDATION",
      title: "先猜再驗證",
      subtitle: "一半以上的『通過』是反直覺的",
    },
    {
      layout: "custom",
      nav: "七題先猜再驗證",
      num: "04",
      eyebrow: "PART 04 · 測試策略",
      title: "一半以上的『通過』是反直覺的",
      render: QuizPage,
      callout: {
        icon: "info",
        tone: "blue",
        text: "只有第 1 題的直覺答案是對的——照『把紅燈改綠』的本能調系統，會把系統改壞。",
      },
    },
    {
      layout: "custom",
      nav: "為什麼兩份題庫都要跑",
      num: "04",
      eyebrow: "PART 04 · 測試策略",
      title: "為什麼兩份題庫都要跑",
      titleNote: "只跑 A 卷分數會很好看，然後上線第一天被打臉",
      render: TwoDecksDecisionPage,
      callout: {
        icon: "target",
        tone: "blue",
        text: "兩份題庫測的是兩件事：A 卷測檢索覆蓋率，B 卷測白話輸入、多爭點與範圍邊界。",
      },
    },

    {
      layout: "section",
      nav: "章節：成本與落地",
      num: "05",
      eyebrow: "COST & NEXT",
      title: "誠實的『還沒有』，與六步落地",
      subtitle: "Token 數字待補；六步走完，就是這一版的全部",
    },
    {
      layout: "custom",
      nav: "還沒到位的三件事 + 8 項交付狀態",
      num: "05",
      eyebrow: "PART 05 · Token 與成本 · 下次會議交付清單",
      title: "還沒到位的三件事，六項已完成",
      titleNote: "依 2026/8/3 李總線上顧問輔導會議紀錄",
      render: CostAndDeliverablesPage,
      callout: {
        icon: "check",
        tone: "good",
        chip: "6/8 已完成",
        text: "只剩帳號與權限（等崴仁的表對齊）與 RAG 預留（下一版才開始）兩項。",
      },
    },
    {
      layout: "custom",
      nav: "五步走完，就是這一版的全部",
      num: "05",
      eyebrow: "PART 05 · PoC 任務拆解",
      title: "五步走完，就是這一版的全部",
      titleNote: "Runbook 不是最後才補的文件",
      render: TasksRailPage,
      callout: {
        icon: "file",
        tone: "orange",
        text: "Runbook 的價值不在文件本身，在逼你把手動做過的每一步寫下來——沒寫下來的那幾步，就是之後重建環境時卡住的地方。",
      },
    },

    {
      layout: "closing",
      nav: "結語 / 帶走三件事",
      eyebrow: "RECAP",
      title: "帶走三件事",
      items: [
        {
          n: "01",
          k: "主線只用一個模型",
          v: "mistral-embed 撐起檢索與分類全程；生成式模型（Codex 5.6 Luna）只掛在最末端的風險分析報告，且是 L4~L8 規格未到的暫代做法。",
        },
        {
          n: "02",
          k: "AI 只在頭尾兩端出現",
          v: "14 個節點只有 3 個碰模型；四道閘門裡真正兜底的 G2 與 G3 都不經模型，每一種失敗都退到下一層仍交得出東西。",
        },
        {
          n: "03",
          k: "沒做完的部分，也誠實留在紙上",
          v: "帳號與權限是推估待對齊、Token 與成本待補、RAG 預留未開始——單純不是掩飾，是設計出來的。",
        },
      ],
      cta: "回到筆記看完整的四道閘門判定邏輯、CHECK 約束與 Create SQL",
      ctaMeta: "/notes/勞動法遵決策支援系統-poc-l1-l3-檢索閉環",
    },
  ],
};

export default deck;
