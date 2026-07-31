// 對應筆記 trendlink-內部客戶與業務流程整合系統提案草稿.mdx（present-planner 規劃 · 重新生成）。
// Core line：Notion PoC 已把合約／客戶規格摸清楚，五大痛點證明工具見頂；流程尚未定型前，
// 方案 B（幾乎全自建、只把電子簽章委外給點點簽）比整合 BizForm 更省錢、也更有彈性。
// 4 個 full-visual / chrome:false 頁沿用該筆記既有的 @ai-visualize 互動元件，播放時仍可操作。
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { Cards, Compare, Kpi } from "@/components/deck/blocks";
import { FitToArea } from "@/components/deck/FitToArea";
import { DS } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import BackgroundPainpointEvolution from "@/components/generated/background-painpoint-evolution";
import ModuleServiceSupportMatrix from "@/components/generated/module-service-support-matrix";
import SolutionArchitectureComparison from "@/components/generated/solution-architecture-comparison";
import CostEstimateComparison from "@/components/generated/cost-estimate-comparison";

// Part 02：五個模組是平行清單，不是好壞排名 —— Cards 刻意不給 tone，
// 避免色彩暗示不存在的語意。Kpi 三格取自筆記「Vital CRM 問題釐清」8 題 Q&A 的真實統計。
function ModuleSelectionPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Cards
        dark={dark}
        columns={5}
        items={[
          {
            icon: "users",
            title: "客戶管理與商機追蹤",
            chips: ["CRM"],
            points: ["權限可按組織／個人劃分", "App 端可外勤使用", "可自訂商機階段與 Lead/Cycle Time"],
            meta: "服務選型：Vital CRM",
          },
          {
            icon: "git-branch",
            title: "業務流程管理",
            chips: ["BPM"],
            points: ["需要流程追蹤與交付文件管理", "現階段規格仍在驗證中"],
            meta: "服務選型：自建系統",
          },
          {
            icon: "file",
            title: "合約管理",
            chips: ["CLM"],
            points: ["需要電子簽章與法律效力", "目前僅點點簽提供簽章服務"],
            meta: "服務選型：點點簽 + BizForm",
          },
          {
            icon: "plug",
            title: "表單簽核",
            chips: ["BPM", "CLM"],
            points: ["內建簽核流程，關卡數不設限", "讓 CRM 串起業務節點表單"],
            meta: "服務選型：BizForm",
          },
          {
            icon: "database",
            title: "知識庫管理",
            chips: ["KM", "CLM"],
            points: ["合約與文件集中管理", "支援自訂欄位與模糊查詢"],
            meta: "服務選型：Vital KM",
          },
        ]}
      />
      <Kpi
        dark={dark}
        style={{ flex: "none" }}
        items={[
          { label: "完全滿足", value: "2", unit: "題", tone: "good", sub: "客戶資料權限、欄位自訂皆可" },
          { label: "需整合／客制", value: "5", unit: "題", tone: "warning", sub: "商機節點表單、KM 串接皆須客制" },
          { label: "無法滿足", value: "1", unit: "題", tone: "critical", sub: "渠道人員無法走簽核流程" },
        ]}
      />
    </>
  );
}

// Part 03：Compare 撐滿主體，左藍右橘為慣例；右側 badge「建議」元件內部固定渲染綠色。
function SolutionComparePage({ dark }: CustomSlideProps) {
  return (
    <Compare
      dark={dark}
      left={{
        tag: "整合派",
        tone: "blue",
        name: "方案 A：整合 BizForm",
        rows: [
          ["派案／諮詢／報價", "整合 BizForm 表單"],
          ["執案管理", "整合 BizForm 表單"],
          ["合約管理", "點點簽（兩案相同）"],
          ["分析看板", "串接 BizForm 節點狀態"],
        ],
        pros: ["不用架設相關服務，有人維運", "BizForm 內建簽核流程，未來要用可直接接"],
        cons: ["串接 BizForm API 需額外收費，需額外估算資源"],
      }}
      right={{
        tag: "自建派",
        tone: "orange",
        name: "方案 B：幾乎全自建",
        badge: "建議",
        rows: [
          ["派案／諮詢／報價", "自建系統"],
          ["執案管理", "自建系統"],
          ["合約管理", "點點簽（兩案相同）"],
          ["分析看板", "純自建即時看板"],
        ],
        pros: ["高度彈性，依公司流程與需求設計", "不受第三方限制，點點簽 API 不需額外收費"],
        cons: ["開發成本較高，須投入更多資源自行維運"],
      }}
    />
  );
}

// Part 03 滿版：FullVisualSlide 型別沒有 chrome 欄位，只有 custom 有 ——
// 沿用既有元件的滿版頁只能走 custom + chrome:false。此圖是筆記中最密的視覺
// （巢狀分組 + 帶協定標籤的折線），元件內部已自帶方案 A/B 切換與節點點擊說明卡；
// 疊加 SlideChrome 會壓縮高度導致下層節點被裁，這是本 deck 唯一一頁滿版。
// 這個元件的自然高度約 1278px（為網頁內文設計、頁面可滾），比 900px 的投影片高
// 378px —— 直接放會被裁掉底部。用 <FitToArea> 等比縮到可用區內。
// 縮覽（live: false）不掛載真元件：一來省效能，二來元件內含 <button>，
// 縮覽側欄本身也是 <button>，直接掛會產生 button 嵌 button 的無效 HTML。
function ArchitectureFullPage({ live, area, dark }: CustomSlideProps) {
  if (!live) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: DS.h3,
          fontWeight: 800,
          color: dkt(dark).muted,
        }}
      >
        GCP 部署架構 · 方案 A / B
      </div>
    );
  }
  return (
    <FitToArea area={area}>
      <SolutionArchitectureComparison />
    </FitToArea>
  );
}

const deck: Deck = {
  slug: "trendlink-內部客戶與業務流程整合系統提案草稿",
  title: "內部客戶與業務流程整合系統提案",
  eyebrow: "SYSTEM PROPOSAL",
  generatedAt: "2026-07-30",
  source: "src/content/notes/trendlink-內部客戶與業務流程整合系統提案草稿.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 系統提案",
      title: "內部客戶與業務流程整合系統提案",
      subtitle: "Notion PoC 已驗證規格，該轉向能做複雜查詢與分級授權的自建系統",
      meta: ["由 trendlink-內部客戶與業務流程整合系統提案草稿.mdx 生成", "13 頁 · 16:9"],
      agenda: [
        { n: "01", title: "背景與痛點", sub: "Excel → Notion PoC 演進，五大痛點逼近工具天花板" },
        { n: "02", title: "系統模組與服務選型", sub: "CRM／BPM／CLM／表單簽核／知識庫，各自對應誰來做" },
        { n: "03", title: "方案取捨與部署架構", sub: "整合 BizForm，或幾乎全部自建" },
        { n: "04", title: "成本評估", sub: "兩案年度花費對照，唯一差異只在 BizForm" },
      ],
    },
    {
      layout: "section",
      nav: "章節：背景與痛點",
      num: "01",
      eyebrow: "BACKGROUND",
      title: "為什麼要做這套系統",
      subtitle: "從 Excel 逐筆手動，到 Notion PoC 驗證規格，五大痛點逼近工具天花板",
    },
    {
      layout: "full-visual",
      nav: "背景 × 痛點因果敘事",
      num: "01",
      eyebrow: "PART 01 · 背景與痛點",
      title: "Notion 不是終點，而是過渡",
      titleNote: "工具天花板逼出自建系統的必要性",
      pill: { text: "演進中", tone: "orange" },
      callout: {
        icon: "lightbulb",
        text: "五大痛點皆源於 Notion 的工具天花板，需轉向具 RDB 複雜查詢與 Column-Level 權限控管的自建系統。",
        chip: "規格已成熟",
        tone: "blue",
      },
      viz: BackgroundPainpointEvolution,
      vizLabel: "@ai-visualize · background-painpoint-evolution",
      vizHint: "沿用筆記中已生成的因果敘事圖：Excel → Notion PoC → 自建系統的演進，以及五大痛點如何逼出這個結論。",
    },
    {
      layout: "section",
      nav: "章節：系統模組與服務選型",
      num: "02",
      eyebrow: "MODULES",
      title: "系統模組如何整合現有服務",
      subtitle: "CRM／BPM／CLM／表單簽核／知識庫，各自對應誰來做",
    },
    {
      layout: "custom",
      nav: "五個模組，各自的最佳解",
      num: "02",
      eyebrow: "PART 02 · 系統模組與服務選型",
      title: "五個模組，各自的最佳解不同",
      titleNote: "沒有一套服務能單獨扛起全部功能",
      render: ModuleSelectionPage,
      callout: {
        icon: "info",
        text: "唯一具電子簽章效力的服務只有點點簽；BizForm 補上流程串接，Vital KM 補上合約文件庫。",
        tone: "blue",
      },
    },
    {
      layout: "full-visual",
      nav: "模組 × 服務支援矩陣",
      num: "02",
      eyebrow: "PART 02 · 系統模組與服務選型",
      title: "一眼看懂每個模組的支援程度",
      callout: {
        icon: "target",
        text: "合約管理整欄皆為「需整合／客制」：自建管資料、點點簽管法律效力，缺一不可。",
        tone: "warning",
      },
      viz: ModuleServiceSupportMatrix,
      vizLabel: "@ai-visualize · module-service-support-matrix",
      vizHint: "沿用筆記中已生成的對照矩陣，含每格支援程度、方案 B 採用標記與六條註腳。",
    },
    {
      layout: "section",
      nav: "章節：方案取捨與架構",
      num: "03",
      eyebrow: "SOLUTION",
      title: "兩個方案，一個中控",
      subtitle: "整合 BizForm 換取現成簽核，或全部自建換取彈性",
    },
    {
      layout: "custom",
      nav: "方案 A vs 方案 B",
      num: "03",
      eyebrow: "PART 03 · 方案取捨與部署架構",
      title: "流程還沒定型，先別急著整合",
      titleNote: "建議採用方案 B：全部自建，僅合約簽章委外",
      pill: { text: "建議採用方案 B", tone: "orange" },
      render: SolutionComparePage,
      callout: {
        icon: "lightbulb",
        text: "目前尚無簽核流程、BizForm API 需額外收費，業務流程也尚未完全定案 —— 方案 B 保留最大彈性。",
        chip: "年省 NTD 11,100",
        tone: "good",
      },
    },
    {
      layout: "custom",
      nav: "系統架構：GCP 部署（可切換方案 A/B）",
      chrome: false,
      render: ArchitectureFullPage,
    },
    {
      layout: "section",
      nav: "章節：成本評估",
      num: "04",
      eyebrow: "COST",
      title: "多花的錢，花在哪裡",
      subtitle: "方案 A 與方案 B 的唯一差異，只有一項固定年費",
    },
    {
      layout: "full-visual",
      nav: "年度成本對照",
      num: "04",
      eyebrow: "PART 04 · 成本評估",
      title: "方案 A 比方案 B 多花多少",
      titleNote: "兩案的差異只有一項固定年費",
      callout: {
        icon: "trend-up",
        text: "改走年費預繳，GCP 費用每年再省 NTD 37,444。",
        tone: "blue",
      },
      footnotes: [
        { n: "①", text: "尚未涵蓋 BizForm API 串接費、Cloud Storage 超用與對外流量費，後續評估另計。" },
      ],
      viz: CostEstimateComparison,
      vizLabel: "@ai-visualize · cost-estimate-comparison",
      vizHint: "沿用筆記中已生成的成本堆疊圖，播放時可切換月繳／年費預繳，內建三格 KPI。",
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
          v: "Notion 五大痛點——跨庫查詢、權限分級、欄位驗證——逼出自建系統的必要性。",
        },
        {
          n: "02",
          k: "中控式整合，非全外包",
          v: "CRM／BPM／CLM／表單簽核圍繞自建系統中控，只有電子簽章委外給點點簽。",
        },
        {
          n: "03",
          k: "先求彈性，年省 NTD 11,100",
          v: "流程未定型前，方案 B 比整合 BizForm 更省成本，也保留調整空間。",
        },
      ],
      cta: "回到筆記閱讀完整評估與成本估算",
      ctaMeta: "/notes/trendlink-內部客戶與業務流程整合系統提案草稿",
    },
  ],
};

export default deck;
