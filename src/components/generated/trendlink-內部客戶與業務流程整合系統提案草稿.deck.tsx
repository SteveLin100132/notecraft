// 對應筆記 trendlink-內部客戶與業務流程整合系統提案草稿.mdx。
// Core line：Notion PoC 已把「合約」與「客戶」的規格摸清楚，五道天花板證明 Notion 已到工具極限；
// 在業務流程尚未定型前，方案 B（幾乎全自建、只把電子簽章委外給點點簽）比整合 BizForm 更省錢、
// 也保留更大彈性。
//
// 本版把原本 24 頁收斂為 18 頁：同一主題被拆成數頁、格式又各異的段落（背景／痛點、三個模組的選型、
// 方案 A／B、三項服務的單價）合併成單頁的同構版面，讓讀者能橫向比較而不必翻頁比對。
//
// 三個既有互動元件不用 full-visual，改以 custom 頁內部 import，外框沿用 full-visual 那塊
// 「可縮放平移的藍圖畫布」（CanvasViewport）—— 這些元件是為網頁內文設計的，高度隨內容長，
// 靠畫布的縮放 / 平移才看得完，而不是被靜靜縮成一團或裁掉。
import type { CustomSlideProps, Deck } from "@/lib/decks";
import type { ReactNode } from "react";
import { Cards, Compare, Kpi, Rows, Stages, Table } from "@/components/deck/blocks";
import { CanvasViewport } from "@/components/deck/CanvasViewport";
import type { CanvasMode } from "@/components/deck/CanvasViewport";
import { DGAP, DS } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import ModuleServiceSupportMatrix from "@/components/generated/module-service-support-matrix";
import SolutionArchitectureComparison from "@/components/generated/solution-architecture-comparison";
import CostEstimateComparison from "@/components/generated/cost-estimate-comparison";

// 把筆記既有的 @ai-visualize 元件放進可拖拉縮放的藍圖畫布。
//
// 為什麼不是 <FitToArea>：那個只會把過高的元件等比縮進可用區，架構圖這類密度高的
// 內容縮完就看不清了。畫布改成「元件躺在一張紙上、紙躺在點陣藍圖上」，可縮放、可平移，
// 並提供「還原置中」出口 —— 與 full-visual 版型用的是同一塊元件。
//
// mode 三態：縮覽（live=false）走 "thumb"，畫布只留骨架、不掛載真元件
// （縮覽項本身是 <button>，元件內含按鈕會產生無效 HTML，十幾頁一起掛也會拖慢整頁）；
// 播放中走 "play"（純滾輪即縮放）；其餘走 "view"（需 ⌘/Ctrl + 滾輪）。
// outerScale 一定要往下傳，否則指標位移沒換算回 1600×900 座標系，拖曳不跟手。
function VizCanvas({
  live,
  play,
  area,
  dark,
  outerScale,
  id,
  children,
}: Pick<CustomSlideProps, "live" | "play" | "area" | "dark" | "outerScale"> & {
  id: string;
  children: ReactNode;
}) {
  const mode: CanvasMode = !live ? "thumb" : play ? "play" : "view";
  return (
    <CanvasViewport
      content={live ? children : undefined}
      w={area.w}
      h={area.h}
      mode={mode}
      dark={dark}
      outerScale={outerScale}
      emptyId={id}
    />
  );
}

// ── Part 01 · 背景與痛點 ─────────────────────────────────────────────────────

// 背景（Excel → Notion → 自建）壓成一條時間軌，版面留給真正的重點：五道天花板。
// 用 rail 而不是三張並排卡，是因為它只吃約 180px 高；痛點才有空間展開「說明 + 影響」兩欄。
function OriginPainpointPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Stages
        dark={dark}
        variant="rail"
        size={214}
        style={{ flex: "none" }}
        items={[
          {
            tag: "過去",
            title: "Excel 逐筆手動",
            desc: "客服與顧問師逐筆維護客戶合約資訊",
            icon: "file",
          },
          {
            tag: "現在",
            title: "Notion PoC",
            desc: "過渡期工具，同步蒐集需求、記錄規格",
            icon: "layers",
            variant: "active",
          },
          {
            tag: "目標",
            title: "自建系統",
            desc: "以 PoC 累積的規格作為開發藍本",
            icon: "database",
            variant: "dashed",
          },
        ]}
      />
      <Rows
        dark={dark}
        variant="chip"
        chipWidth={128}
        noteWidth={296}
        items={[
          {
            k: "資料分散",
            icon: "layers",
            tone: "warning",
            v: "客戶與合約跨多個資料庫，靠關聯串接，無法像 RDB 做複雜查詢",
            noteLabel: "影響",
            note: "跨表報表需人工彙整",
          },
          {
            k: "權限設定",
            icon: "lock",
            tone: "warning",
            v: "可依人員顯示特定合約，但做不到 Column Level 權限控管",
            noteLabel: "影響",
            note: "合約金額無法分層遮蔽",
          },
          {
            k: "欄位驗證",
            icon: "file",
            tone: "warning",
            v: "無法鎖定必填欄位與資料格式，資料品質難以把關",
            noteLabel: "影響",
            note: "漏填、格式錯誤難以稽核",
          },
          {
            k: "效能瓶頸",
            icon: "gauge",
            tone: "warning",
            v: "資料量增加後查詢與操作效能下降，影響使用者體驗",
            noteLabel: "影響",
            note: "客戶量一大即明顯卡頓",
          },
          {
            k: "版本迭代",
            icon: "settings",
            tone: "warning",
            v: "改版變動表單權限設定，導致既有功能直接失效",
            noteLabel: "影響",
            note: "每次改版需重設、不可控",
          },
        ]}
      />
    </>
  );
}

// ── Part 02 · 系統模組與服務選型 ─────────────────────────────────────────────

// 三個模組同構並列，讀者才能橫向比較「誰自建、誰外購」。
// 藍＝自建、橘＝外部 SaaS：識別色在這裡編碼真實資訊，不是裝飾。
function ModuleOwnershipPage({ dark }: CustomSlideProps) {
  return (
    <Cards
      dark={dark}
      columns={3}
      items={[
        {
          icon: "git-branch",
          tone: "blue",
          title: "業務流程管理",
          chips: ["BPM"],
          meta: "服務選型：自建系統",
          points: [
            "流程可追蹤，能管理派案到執案每個節點的交付文件",
            "需求尚未定型，自建才保得住隨時調整的彈性",
            "Vital CRM 與 BizForm 都要額外整合，才蓋得住四個節點",
          ],
        },
        {
          icon: "lock",
          tone: "orange",
          title: "合約管理",
          chips: ["CLM"],
          meta: "服務選型：點點簽",
          points: [
            "目前唯一具電子簽章法律效力的服務",
            "API 可自動化建立與查詢合約",
            "無法單獨管理合約資料，需與主系統同步",
          ],
        },
        {
          icon: "users",
          tone: "orange",
          title: "客戶管理與商機追蹤",
          chips: ["CRM"],
          meta: "服務選型：Vital CRM",
          points: [
            "權限可依組織或個人劃分並支援分享，滿足多顧問共同執案",
            "具 Lead Time 與 Cycle Time，能追蹤商機各階段停留天數",
            "內建會簽、擇簽、加簽，另附知識庫 KM",
          ],
        },
      ]}
    />
  );
}

// 8 題釐清依「判定」分三組，8 題全數歸位 —— 舊版只挑 4 題放清單，KPI 卻寫 8 題，數字對不上內容。
// 中間那欄明顯最長，正是「工作量都堆在客製」的誠實訊號；左右兩欄用 meta 補一行影響把高度拉近。
function CrmVerdictPage({ dark }: CustomSlideProps) {
  return (
    <Cards
      dark={dark}
      columns={3}
      items={[
        {
          tone: "good",
          title: "直接可用",
          badge: "2 題",
          points: [
            "客戶資料權限可按組織或個人設定，並可分享",
            "客戶欄位可自訂，如客戶來源種類、公司員工人數",
          ],
          meta: "多顧問共同執案的場景可直接支援",
        },
        {
          tone: "warning",
          title: "需整合或客制",
          badge: "5 題",
          points: [
            "商機節點表單須搭配 BizForm 客製，才能填寫與統計",
            "BizForm 無法綁定商機階段，需走客製或改用 KM",
            "合約沒有原生模組，靠 KM 文件管理承接並自訂欄位",
            "KM 與 CRM 靠網址欄位串接，權限要兩邊各自設定",
            "儀表板統計範圍僅含 CRM 自身資料",
          ],
          meta: "全部指向業務流程節點與合約文件",
        },
        {
          tone: "critical",
          title: "做不到",
          badge: "1 題",
          points: ["簽核流程不支援渠道人員以訪客身分參與，一定要有系統帳號"],
          meta: "外部渠道無法納入線上簽核，需另想辦法",
        },
      ]}
    />
  );
}

// 「兩個配角補缺口」的對位圖 —— 系統沒有拓撲圖元件，依契約在 custom 頁自己畫 SVG + div。
// 箭頭不用 <marker>（同一份文件會同時掛 24 張投影片，marker id 會互撞），直接畫三角形 path。
function GapNode({
  c,
  title,
  chips,
  body,
  center,
}: {
  c: DeckThemeTokens;
  title: string;
  chips?: string;
  body: string;
  center?: boolean;
}) {
  const edge = center ? c.brand : c.accent;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: DGAP.xs,
        padding: `${DGAP.sm}px ${DGAP.md}px`,
        borderRadius: "var(--radius-lg)",
        background: center ? c.brandSoft : c.accentSoft,
        border: `${center ? 2 : 1}px solid ${edge}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
        <span style={{ fontSize: DS.h4, fontWeight: 800, color: c.ink }}>{title}</span>
        {chips && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: DS.micro, fontWeight: 800, color: edge }}>
            {chips}
          </span>
        )}
      </div>
      <div style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{body}</div>
    </div>
  );
}

function GapArrow({ c, label, sub, toLeft }: { c: DeckThemeTokens; label: string; sub: string; toLeft?: boolean }) {
  const W = 172;
  const head = toLeft ? `0,9 14,2 14,16` : `${W},9 ${W - 14},2 ${W - 14},16`;
  const line = toLeft ? { x1: 14, x2: W } : { x1: 0, x2: W - 14 };
  return (
    <div style={{ flex: "none", width: W, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.ink, textAlign: "center" }}>{label}</span>
      <svg width={W} height={18} viewBox={`0 0 ${W} 18`} aria-hidden>
        <line {...line} y1={9} y2={9} stroke={c.accent} strokeWidth={2} strokeDasharray="7 5" />
        <polygon points={head} fill={c.accent} />
      </svg>
      <span style={{ fontSize: DS.micro, color: c.muted, textAlign: "center", lineHeight: 1.4 }}>{sub}</span>
    </div>
  );
}

function SupportingServicesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: DGAP.xs }}>
        <GapNode
          c={c}
          title="BizForm"
          chips="[BPM]"
          body="補上派案・諮詢・報價・執案四個節點的表單與簽核關卡"
        />
        <GapArrow c={c} label="表單交付資料" sub="Webhook 回寫" />
        <GapNode c={c} center title="Vital CRM" chips="[CRM]" body="客戶與商機主資料，本身沒有流程表單、也沒有合約模組" />
        <GapArrow c={c} label="文件關聯" sub="網址欄位 · 權限兩邊各自設" toLeft />
        <GapNode c={c} title="Vital KM" chips="[KM][CLM]" body="補上合約與文件的集中管理與查找" />
      </div>
      <Rows
        dark={dark}
        style={{ flex: "none" }}
        items={[
          {
            k: "表單簽核",
            icon: "file",
            tone: "orange",
            v: "線上表單建構器、公式計算、標籤分類與自訂篩選器，簽核關卡數不設限，並可串接點點簽電子簽章",
            noteLabel: "選型",
            note: "BizForm",
          },
          {
            k: "知識庫管理",
            icon: "database",
            tone: "orange",
            v: "自訂欄位、關聯文件、模糊查詢（含附件），讓 Vital CRM 得以實現 CLM 整合",
            noteLabel: "選型",
            note: "Vital KM",
          },
        ]}
      />
    </>
  );
}

// ── Part 03 · 解決方案 ───────────────────────────────────────────────────────

// 綜合評估：沿用筆記既有的支援矩陣元件。矩陣欄位密、註腳多，放進畫布才能推近看清格子。
function EvaluationMatrixPage(p: CustomSlideProps) {
  return (
    <VizCanvas {...p} id="module-service-support-matrix">
      <ModuleServiceSupportMatrix />
    </VizCanvas>
  );
}

// 兩案原本各佔一頁、欄位完全平行卻要翻頁比對 —— 這正是 <Compare> 的用途。
// 五列裡只有「業務流程四節點」不同，對決版型讓這件事自己浮出來。
function PlanComparePage({ dark }: CustomSlideProps) {
  return (
    <Compare
      dark={dark}
      left={{
        tag: "方案 A",
        tone: "blue",
        name: "整合 BizForm，借力現成簽核",
        rows: [
          ["主系統", "自建中控"],
          ["客戶管理", "自建系統"],
          ["業務流程四節點", "BizForm 建表單，交付後回寫主系統"],
          ["合約管理", "整合點點簽"],
          ["分析看板", "自建，並與 BizForm 串接"],
        ],
        pros: ["不用架設相關服務，有人運維", "BizForm 內建簽核流程，未來要用可直接接"],
        cons: ["BizForm API 交互需額外收費", "串接需 Follow 點點簽試用模式，資源與時間要另估"],
      }}
      right={{
        tag: "方案 B",
        tone: "orange",
        badge: "建議",
        name: "全部自建，只把簽章委外",
        rows: [
          ["主系統", "自建中控"],
          ["客戶管理", "自建系統"],
          ["業務流程四節點", "全部自建"],
          ["合約管理", "整合點點簽"],
          ["分析看板", "自建即時看板"],
        ],
        pros: ["高度彈性，可依公司業務流程設計", "點點簽 API 不需額外收費，維運成本可控"],
        cons: ["開發成本較高，需自行管理 Infrastructure 等基建"],
      }}
    />
  );
}

// A/B 對決搬到上一頁後，這頁不能再放 Compare（會整頁重複）。
// 改成「決策依據 + 誠實的代價」：三個判準各自導向 B，代價寫進 callout 而不是藏起來。
function WhyPlanBPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Kpi
        dark={dark}
        style={{ flex: "none" }}
        items={[
          {
            label: "改用方案 B 年省",
            value: "11,100",
            unit: "NTD／年",
            tone: "orange",
            emphasis: true,
            sub: "省下的正是 BizForm 年費，約每月 925",
          },
          { label: "外部依賴", value: "1", unit: "個", tone: "blue", sub: "僅點點簽，換取電子簽章法律效力" },
          { label: "需自建模組", value: "4", unit: "個", tone: "blue", sub: "派案・諮詢・報價・執案" },
        ]}
      />
      <Rows
        dark={dark}
        noteWidth={286}
        items={[
          {
            k: "內部尚無簽核流程",
            icon: "clock",
            tone: "blue",
            v: "對外的合約、報價單目前都沒有簽核關卡，BizForm 最強的內建簽核現在用不到",
            noteLabel: "所以",
            note: "為用不到的功能先付費",
          },
          {
            k: "API 需另外收費",
            icon: "alert",
            tone: "warning",
            v: "BizForm API 交互另計費用，串接又得 Follow 點點簽試用模式，成本無法先估準",
            noteLabel: "所以",
            note: "成本風險不可控",
          },
          {
            k: "流程尚未定案",
            icon: "target",
            tone: "blue",
            v: "派案到執案的節點與交付文件都還在調整，綁死第三方表單會限制迭代",
            noteLabel: "所以",
            note: "先保留調整空間",
          },
        ]}
      />
    </>
  );
}

// ── Part 04 · 系統架構（chrome:false，本 deck 唯一一頁）────────────────────
// 此元件是全篇最密的視覺（巢狀分組 + Docker 子框 + 帶協定標籤的折線，內部自帶
// 方案 A/B 切換與節點點擊），自然高度遠高於 900px。chrome:false 讓畫布吃滿整頁
// 1600×900，縮放平移的空間才夠 —— 這是本 deck 唯一一頁滿版。
function ArchitecturePage(p: CustomSlideProps) {
  return (
    <VizCanvas {...p} id="solution-architecture-comparison">
      <SolutionArchitectureComparison />
    </VizCanvas>
  );
}

// ── Part 05 · 成本評估 ───────────────────────────────────────────────────────

// 三項服務的單價合成一張表。刻意不放合計 —— 兩案總額對照是下一頁（費用總結）的工作。
function UnitCostTablePage({ dark }: CustomSlideProps) {
  return (
    <Table
      dark={dark}
      corner="服務"
      head={["方案 · 規格", "年費（NTD）", "額度與加購"]}
      rowHeads={["點點簽", "BizForm", "GCP DEV", "GCP PRD"]}
      rows={[
        [
          { text: "商務方案", note: "使用 API 串接需要此方案" },
          { text: "6,000", note: "USD 200 · 月約 500", tone: "blue" },
          { text: "100 份簽署任務", note: "含 API 發起 · 3 支 API 應用程式" },
        ],
        [
          { text: "年繳方案", note: "目前僅提供此方案" },
          { text: "11,100", note: "月約 925 · 僅方案 A 需要", tone: "orange" },
          { text: "5 帳號 · 100 GB", note: "加購 +2,100／帳號、+6,600／100 GB" },
        ],
        [
          { text: "n4d-highcpu-2 ／ db-standard-1 ／ Standard", note: "Cloud Storage 預留 250 GiB" },
          { text: "45,148", note: "年費預繳 32,666", tone: "blue" },
          { text: "2 vCPU · 4 GiB", note: "1 vCPU · 3.75 GiB · 50 GB" },
        ],
        [
          { text: "n4d-highcpu-4 ／ db-standard-2 ／ Standard", note: "Cloud Storage 預留 500 GiB" },
          { text: "89,042", note: "年費預繳 64,080", tone: "blue", emphasis: true },
          { text: "4 vCPU · 8 GiB", note: "2 vCPU · 7.5 GiB · 100 GB" },
        ],
      ]}
    />
  );
}

// 費用總結：沿用筆記既有的成本堆疊圖，播放時可切換月繳／年費預繳，內建三格 KPI。
// 此頁 chrome:true —— 圖本身密度低於架構圖，留著標題與 callout 反而讀得懂脈絡。
function CostSummaryPage(p: CustomSlideProps) {
  return (
    <VizCanvas {...p} id="cost-estimate-comparison">
      <CostEstimateComparison />
    </VizCanvas>
  );
}

const deck: Deck = {
  slug: "trendlink-內部客戶與業務流程整合系統提案草稿",
  title: "內部客戶與業務流程整合系統提案",
  eyebrow: "SYSTEM PROPOSAL",
  generatedAt: "2026-08-02",
  source: "src/content/notes/trendlink-內部客戶與業務流程整合系統提案草稿.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 系統提案",
      title: "內部客戶與業務流程整合系統提案",
      subtitle: "Notion PoC 已驗證規格，該轉向能做複雜查詢與分級授權的自建系統",
      meta: ["由 trendlink-內部客戶與業務流程整合系統提案草稿.mdx 生成", "18 頁 · 16:9"],
      agenda: [
        { n: "01", title: "背景與痛點", sub: "Excel → Notion PoC 演進，五道天花板逼出自建系統" },
        { n: "02", title: "系統模組與服務選型", sub: "CRM／BPM／CLM／表單簽核／知識庫，各自對應誰來做" },
        { n: "03", title: "解決方案", sub: "綜合評估、方案 A / B 取捨、最終建議" },
        { n: "04", title: "系統架構", sub: "GCP 部署，方案 A / B 節點對照" },
        { n: "05", title: "成本評估", sub: "三項服務單價，兩案年度總花費對照" },
      ],
    },
    {
      layout: "section",
      nav: "章節：背景與痛點",
      num: "01",
      eyebrow: "BACKGROUND",
      title: "為什麼要做這套系統",
      subtitle: "從 Excel 逐筆手動，到 Notion PoC 驗證規格，五道天花板逼出自建系統",
    },
    {
      layout: "custom",
      nav: "Notion 是過渡，不是終點",
      num: "01",
      eyebrow: "PART 01 · 背景與痛點",
      title: "Notion 是過渡，不是終點",
      titleNote: "從 Excel 手工維護到 PoC 驗證規格，五道天花板逼出自建系統",
      pill: { text: "現況問題", tone: "orange" },
      render: OriginPainpointPage,
      callout: {
        icon: "lightbulb",
        tone: "blue",
        chip: "規格已成熟",
        text: "五道天花板同源：缺 RDB 複雜查詢與 Column-Level 權限控管，這正是自建系統要補的兩件事。",
      },
    },
    {
      layout: "section",
      nav: "章節：系統模組與服務選型",
      num: "02",
      eyebrow: "MODULES",
      title: "系統模組如何整合現有服務",
      subtitle: "CRM／BPM／CLM／表單簽核／知識庫，五個模組各自對應不同服務",
    },
    {
      layout: "custom",
      nav: "三個模組，三種歸屬",
      num: "02",
      eyebrow: "PART 02 · 系統模組與服務選型",
      title: "三個模組，三種歸屬",
      titleNote: "流程自建、簽章外包、客戶管理買現成",
      legend: [
        { label: "自建", tone: "blue" },
        { label: "外部 SaaS", tone: "orange" },
      ],
      render: ModuleOwnershipPage,
      footnotes: [
        { n: "1", text: "BizForm 僅提供表單簽核、不具電子簽章效力，因此合約管理不選它。" },
        { n: "2", text: "Vital CRM 另有手機 App、商機狀態自訂、客戶記事範本、模糊查詢（含附件）。" },
      ],
    },
    {
      layout: "custom",
      nav: "8 題釐清：2 可用、5 客制、1 做不到",
      num: "02",
      eyebrow: "PART 02 · 系統模組與服務選型",
      title: "8 題釐清後，仍有 5 題要客制",
      titleNote: "Vital CRM 的能力邊界",
      pill: { text: "問題釐清", tone: "orange" },
      render: CrmVerdictPage,
      callout: {
        icon: "target",
        tone: "warning",
        text: "五題客制全部指向同一件事：業務流程節點與合約文件，Vital CRM 沒有原生解 —— 這正是主系統要自建的理由。",
      },
    },
    {
      layout: "custom",
      nav: "兩個配角，補上兩個缺口",
      num: "02",
      eyebrow: "PART 02 · 系統模組與服務選型",
      title: "兩個配角，補上 Vital CRM 的兩個缺口",
      titleNote: "BizForm 補流程節點的表單，Vital KM 補合約文件庫",
      pill: { text: "待觀察", tone: "orange" },
      render: SupportingServicesPage,
      callout: {
        icon: "clock",
        tone: "warning",
        text: "內部目前對合約、報價單都沒有簽核流程，表單簽核先列為待觀察項目，待需求明確再評估自建或介接。",
      },
    },
    {
      layout: "section",
      nav: "章節：解決方案",
      num: "03",
      eyebrow: "SOLUTION",
      title: "兩個方案，一個中控",
      subtitle: "除自建外，業務也跨足 BPM、Finance 與 CLM，需同時評估整合現有平台",
    },
    {
      layout: "custom",
      nav: "綜合評估：支援矩陣",
      num: "03",
      eyebrow: "PART 03 · 解決方案",
      title: "一眼看懂每個模組的支援程度",
      // 元件本身已帶「重點洞察」與圖例，這裡不再加 callout（會逐字重複，也吃掉矩陣的高度）。
      titleNote: "5 個服務選型 × 5 個功能模組，方案 B 的採用組合以橘框標示",
      render: EvaluationMatrixPage,
    },
    {
      layout: "custom",
      nav: "方案 A vs 方案 B",
      num: "03",
      eyebrow: "PART 03 · 解決方案",
      title: "差別只在業務流程四節點，其餘完全相同",
      titleNote: "方案 A 整合 BizForm，方案 B 自建",
      render: PlanComparePage,
      callout: {
        icon: "target",
        tone: "blue",
        text: "兩案唯一差異：派案、諮詢、報價、執案四個節點誰來做 —— 主系統、客戶管理、合約管理、分析看板四項完全相同。",
      },
    },
    {
      layout: "custom",
      nav: "為什麼是方案 B",
      num: "03",
      eyebrow: "PART 03 · 解決方案",
      title: "三個判準都指向方案 B",
      titleNote: "現在整合，等於為還用不到的功能先付錢",
      pill: { text: "建議採用方案 B", tone: "orange" },
      render: WhyPlanBPage,
      callout: {
        icon: "check",
        tone: "good",
        chip: "可逆性",
        text: "代價是開發成本較高、基建要自己管。但流程一旦定型，隨時可以再把節點外包出去 —— 反過來不成立。",
      },
    },
    {
      layout: "section",
      nav: "章節：系統架構",
      num: "04",
      eyebrow: "ARCHITECTURE",
      title: "部署在 GCP 上的中控系統",
      subtitle: "User → Web UI → API Server，方案 A 與 B 只差業務節點與 BizForm 一環",
    },
    {
      layout: "custom",
      nav: "系統架構：GCP 部署（可切換方案 A/B）",
      chrome: false,
      render: ArchitecturePage,
    },
    {
      layout: "section",
      nav: "章節：成本評估",
      num: "05",
      eyebrow: "COST",
      title: "多花的錢，花在哪裡",
      subtitle: "點點簽、BizForm、GCP 三項服務的年度花費；超出方案額度需另外加購付費",
    },
    {
      layout: "custom",
      nav: "三項服務的單價與額度",
      num: "05",
      eyebrow: "PART 05 · 成本評估",
      title: "三項服務的單價與額度",
      titleNote: "點點簽必買、BizForm 只有方案 A 需要、GCP 分 DEV／PRD 兩套",
      pill: { text: "額度超出需加購", tone: "orange" },
      render: UnitCostTablePage,
      callout: {
        icon: "trend-up",
        tone: "blue",
        text: "匯率統一以 1 USD = 30 NTD 換算；GCP 改走年費預繳，DEV 與 PRD 合計每年省 NTD 37,444。",
      },
      footnotes: [{ n: "1", text: "BizForm 只有方案 A 需要，方案 B 不含這筆年費。" }],
    },
    {
      layout: "custom",
      nav: "費用總結：兩案年度成本對照",
      num: "05",
      eyebrow: "PART 05 · 成本評估",
      title: "方案 A 比方案 B 多花多少",
      titleNote: "兩案差異只有一項固定年費",
      render: CostSummaryPage,
      callout: { icon: "trend-up", tone: "blue", text: "改走年費預繳，GCP 費用每年再省 NTD 37,444。" },
      footnotes: [{ n: "1", text: "尚未涵蓋 BizForm API 串接費、Cloud Storage 超用與對外流量費，後續評估另計。" }],
    },
    {
      layout: "quote",
      nav: "引言：先求彈性",
      eyebrow: "KEY TAKEAWAY",
      quote: "流程尚未定型時，用彈性換取自由；等規格成熟，再談整合。",
      by: "建議採用方案 B",
      byMeta: "內部客戶與業務流程整合系統提案 · 結論",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      title: "帶走這三件事",
      items: [
        {
          n: "01",
          k: "工具天花板已現形",
          v: "Notion 五道天花板：跨庫查詢、權限分級、欄位驗證，逼出自建系統的必要性。",
        },
        {
          n: "02",
          k: "模組各自最佳解，非全外包",
          v: "CRM、BPM、CLM、表單簽核、知識庫圍繞自建系統中控，只有電子簽章委外給點點簽。",
        },
        {
          n: "03",
          k: "先求彈性，方案 B 年省 NTD 11,100",
          v: "流程未定型前，方案 B 比整合 BizForm 更省成本，也保留調整空間。",
        },
      ],
      cta: "回到筆記閱讀完整評估與成本估算",
      ctaMeta: "/notes/trendlink-內部客戶與業務流程整合系統提案草稿",
    },
  ],
};

export default deck;
