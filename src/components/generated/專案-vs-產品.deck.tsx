// 中文檔名筆記的 deck（CJK slug 實測 + full-visual 掛既有 pm-lifecycle）。
import type { Deck } from "@/lib/decks";
import PmLifecycle from "@/components/generated/pm-lifecycle";

const deck: Deck = {
  slug: "專案-vs-產品",
  title: "專案 vs 產品",
  eyebrow: "PRODUCT MANAGEMENT",
  generatedAt: "2026-07-29",
  source: "src/content/notes/專案-vs-產品.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 產品管理",
      title: "專案 vs 產品",
      subtitle: "專案問「有沒有做完」，產品問「有沒有做對」",
      meta: ["由 專案-vs-產品.mdx 生成", "5 頁 · 16:9"],
    },
    {
      layout: "section",
      nav: "章節：兩種思維",
      num: "01",
      eyebrow: "MINDSET",
      title: "兩種思維",
      subtitle: "有限的交付，與無限的成長",
    },
    {
      layout: "compare",
      nav: "專案 vs 產品",
      eyebrow: "COMPARE",
      title: "同一件事，兩種問法",
      left: {
        tag: "PROJECT",
        name: "專案",
        tone: "blue",
        rows: [
          ["目標", "如期如質交付範圍"],
          ["時間", "有明確的開始與結束"],
          ["成功", "準時、在預算內、符合規格"],
          ["結束", "交付即結案"],
        ],
      },
      right: {
        tag: "PRODUCT",
        name: "產品",
        tone: "orange",
        rows: [
          ["目標", "持續為使用者創造價值"],
          ["時間", "沒有終點、持續迭代"],
          ["成功", "留存、成長、解決真問題"],
          ["結束", "下架才算結束"],
        ],
      },
    },
    {
      layout: "full-visual",
      nav: "產品生命週期",
      eyebrow: "INTERACTIVE",
      title: "產品生命週期 — 播放時仍可操作",
      viz: PmLifecycle,
      vizLabel: "@ai-visualize · pm-lifecycle",
      vizHint: "沿用筆記中已生成的互動元件，播放時可直接操作各階段。",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      eyebrow: "RECAP",
      title: "帶走這三件事",
      items: [
        { n: "01", k: "問法決定行為", v: "問「做完沒」與問「做對沒」，會長出完全不同的團隊行為。" },
        { n: "02", k: "交付不等於成功", v: "專案準時交付，不保證產品被使用、被留下。" },
        { n: "03", k: "產品沒有結案", v: "產品是持續的迭代循環，不是一次性的交付。" },
      ],
      cta: "回到筆記閱讀完整互動內容",
      ctaMeta: "/notes/專案-vs-產品",
    },
  ],
};

export default deck;
