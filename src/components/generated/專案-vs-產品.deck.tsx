// deck 資料模組：對應筆記 專案-vs-產品.mdx（v0.2 重寫，取代 v0.1 舊形態）。
// 兩個 custom 頁（五維度對照 / 取捨邏輯 + 全指標對照表）組合原子層 block；
// 三頁 full-visual 沿用該筆記既有的 @ai-visualize 互動元件
// （pm-lifecycle / pm-change-request / pm-metrics），播放時仍可操作。
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { Cards, Compare, Table } from "@/components/deck/blocks";
import PmLifecycle from "@/components/generated/pm-lifecycle";
import PmChangeRequest from "@/components/generated/pm-change-request";
import PmMetrics from "@/components/generated/pm-metrics";

// Part 01：五個維度對照。專案＝blue（一次性任務）、產品＝orange（長期經營）——
// 全篇識別色沿用既有互動元件的配色，這裡不另創第三色。
function DefinitionComparePage({ dark }: CustomSlideProps) {
  return (
    <Compare
      dark={dark}
      left={{
        tag: "專案",
        tone: "blue",
        name: "一次性任務",
        rows: [
          ["需求", "相對明確、可界定"],
          ["時間與節奏", "有限，有交付期限"],
          ["資源與方向", "有限，人力與預算固定"],
          ["交付物", "明確，做完即驗收"],
          ["生命週期", "有限，結案即結束"],
        ],
      }}
      right={{
        tag: "產品",
        tone: "orange",
        name: "長期經營",
        rows: [
          ["需求", "變化頻繁，隨市場與用戶調整"],
          ["時間與節奏", "持續迭代、持續交付"],
          ["資源與方向", "不斷優化與改進"],
          ["交付物", "沒有單一交付物，持續產出"],
          ["生命週期", "沒有明確結束時間"],
        ],
      }}
    />
  );
}

// Part 03：鐵三角是公認框架（左），四要素是作者自訂的取捨示意（右）——
// 用 warning callout 標明兩者約束力不同，避免讀者誤把右側當正式框架。
function TradeoffPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Compare
        dark={dark}
        left={{
          tag: "專案",
          tone: "blue",
          name: "管理鐵三角",
          rows: [
            ["範疇", "加功能／擴需求"],
            ["時程", "交付期限"],
            ["成本", "人力與預算"],
          ],
        }}
        right={{
          tag: "產品",
          tone: "orange",
          name: "四要素（自訂示意）",
          rows: [
            ["用戶價值", "體驗與滿足程度"],
            ["商業價值", "營收與獲利貢獻"],
            ["留存率", "是否持續回訪"],
            ["黏著度", "回訪頻率與使用深度"],
          ],
        }}
      />
      <Cards
        dark={dark}
        columns={2}
        style={{ flex: "none" }}
        items={[
          {
            title: "範疇 ↑ 的代價",
            tone: "blue",
            points: ["延後交期（時程 ↑）", "加人加錢（成本 ↑）", "犧牲其他功能或品質"],
            meta: "例：客戶臨時要加功能",
          },
          {
            title: "商業價值 ↑ 的代價",
            tone: "orange",
            points: [
              "使用者體驗下降（用戶價值 ↓）",
              "不再回訪（留存率 ↓）",
              "回訪頻率降低（黏著度 ↓）",
            ],
            meta: "例：短期強推付費牆或廣告",
          },
        ]}
      />
    </>
  );
}

// 收斂總覽：不編號、不給 callout，刻意留白讓讀者自己對照整篇筆記的四個軸。
function SummaryTablePage({ dark }: CustomSlideProps) {
  return (
    <Table
      dark={dark}
      head={["專案", "產品"]}
      rowHeads={["生命週期", "衡量標準", "需求變動", "思考方式"]}
      rows={[
        [{ text: "有明確結束" }, { text: "持續迭代，沒有結束" }],
        [
          { text: "範疇／時程／成本（品質為結果）" },
          { text: "用戶價值／商業價值／留存" },
        ],
        [{ text: "盡量凍結，變更走 CR" }, { text: "預期會變，擁抱變化" }],
        [{ text: "以終為始、規劃導向" }, { text: "假設驗證、持續學習" }],
      ]}
    />
  );
}

const deck: Deck = {
  slug: "專案-vs-產品",
  title: "專案 vs 產品",
  eyebrow: "專案管理系列 · 第一章",
  generatedAt: "2026-07-30",
  source: "src/content/notes/專案-vs-產品.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 專案管理系列 第一章",
      title: "專案 vs 產品",
      subtitle: "先分清楚手上是哪一種，才知道要凍結需求，還是擁抱變化",
      meta: ["由 專案-vs-產品.mdx 生成", "12 頁 · 16:9 · 含 3 組可互動元件"],
      agenda: [
        { n: "01", title: "定義與生命週期", sub: "起點終點大不同，資源調度判斷的起點" },
        { n: "02", title: "需求變動", sub: "同樣是需求變了，一個叫風險、一個叫日常" },
        { n: "03", title: "衡量指標", sub: "鐵三角 vs 四要素，拆解取捨邏輯" },
      ],
    },
    {
      layout: "section",
      nav: "章節：定義與生命週期",
      num: "01",
      eyebrow: "DEFINITION",
      title: "專案有終點，產品沒有",
      subtitle: "同一件「項目」，起點終點的想像完全不同",
    },
    {
      layout: "custom",
      nav: "專案 vs 產品：五個維度對照",
      num: "01",
      eyebrow: "PART 01 · 定義與生命週期",
      title: "5 個維度，看懂兩種心智模型的分岔",
      titleNote: "判斷完是哪一種，才知道要用哪一套管理邏輯",
      render: DefinitionComparePage,
      callout: {
        icon: "target",
        text: "先分清是專案還是產品，才知道要凍結需求、還是擁抱變化——這是後面兩章的判斷基礎。",
        tone: "blue",
      },
    },
    {
      layout: "full-visual",
      nav: "同步模擬：專案結案 vs 產品迭代",
      num: "01",
      eyebrow: "PART 01 · 定義與生命週期",
      title: "按下開始，看兩種生命週期怎麼跑",
      viz: PmLifecycle,
      vizLabel: "@ai-visualize · pm-lifecycle",
      vizHint:
        "沿用筆記中已生成的雙欄同步模擬。左欄專案沿線性軌道跑到結案就停，右欄產品繞迭代圓環持續旋轉；播放時可開始／暫停／重置。",
    },
    {
      layout: "section",
      nav: "章節：需求變動",
      num: "02",
      eyebrow: "CHANGE",
      title: "同樣是需求變了，意義完全相反",
      subtitle: "專案把它當風險，產品把它當日常",
    },
    {
      layout: "full-visual",
      nav: "需求變動流程對照",
      num: "02",
      eyebrow: "PART 02 · 需求變動",
      title: "一邊要簽核放行，一邊直接排進下個 Sprint",
      viz: PmChangeRequest,
      vizLabel: "@ai-visualize · pm-change-request",
      vizHint:
        "沿用筆記中已生成的雙欄流程對照。左欄專案走正式 CR 流程，右欄產品走輕量 Backlog；按下按鈕逐項浮現。",
    },
    {
      layout: "section",
      nav: "章節：衡量指標",
      num: "03",
      eyebrow: "METRICS",
      title: "成功長什麼樣子，兩邊答案不同",
      subtitle: "鐵三角看範疇時程成本，四要素看用戶與商業價值",
    },
    {
      layout: "custom",
      nav: "取捨的邏輯：動一個，牽動其他",
      num: "03",
      eyebrow: "PART 03 · 衡量指標",
      title: "鐵三角是公認框架，四要素只是我的取捨示意",
      titleNote: "兩邊都遵守「動一個、牽動其他」的邏輯，但約束力不同",
      render: TradeoffPage,
      callout: {
        icon: "alert",
        text: "鐵三角是業界公認、有明確約束的模型；右側「產品四要素」是我自己挑的示意，不是正式框架，四者也不一定真的此消彼長——體驗做好時，用戶價值、留存、黏著常一起上升。",
        tone: "warning",
      },
      footnotes: [
        { n: "①", text: "延伸閱讀：Google HEART 框架" },
        { n: "②", text: "AARRR 模型" },
        { n: "③", text: "北極星指標 North Star Metric" },
      ],
    },
    {
      layout: "full-visual",
      nav: "拖曳體驗：資源有限下的此消彼長",
      num: "03",
      eyebrow: "PART 03 · 衡量指標",
      title: "拖一個指標，看其餘幾個怎麼被牽動",
      viz: PmMetrics,
      vizLabel: "@ai-visualize · pm-metrics",
      vizHint:
        "沿用筆記中已生成的雙欄雷達拖曳互動。左欄專案鐵三角三軸、右欄產品四要素四軸，拖動任一指標其餘依比例被牽動；附重置按鈕。",
    },
    {
      layout: "custom",
      nav: "全指標對照表",
      eyebrow: "SUMMARY",
      title: "把整篇筆記濃縮成一張表",
      titleNote: "生命週期、衡量標準、需求變動、思考方式，一次對齊",
      render: SummaryTablePage,
    },
    {
      layout: "quote",
      nav: "引言：一句話總結",
      eyebrow: "KEY TAKEAWAY",
      quote: "專案看重成果，產品看重價值。",
      by: "專案 vs 產品",
      byMeta: "NoteCraft · 專案管理系列 第一章",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      eyebrow: "RECAP",
      title: "帶走這三件事",
      items: [
        {
          n: "01",
          k: "先分清類型，才決定管法",
          v: "同一件事，是專案還是產品，會一路影響資源調度與管理模式。",
        },
        {
          n: "02",
          k: "需求變動的意義相反",
          v: "專案把它當風險走 CR 凍結；產品把它當日常擁抱變化。",
        },
        {
          n: "03",
          k: "衡量標準不是同一套",
          v: "鐵三角看範疇時程成本；四要素看用戶與商業價值——後者只是我的取捨示意，非正式框架。",
        },
      ],
      cta: "回到筆記閱讀完整定義與互動元件",
      ctaMeta: "/notes/專案-vs-產品",
    },
  ],
};

export default deck;
