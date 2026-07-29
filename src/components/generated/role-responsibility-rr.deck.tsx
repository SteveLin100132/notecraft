// 範例 deck（Task 28）：對應筆記 role-responsibility-rr.mdx。
// full-visual 頁直接沿用該筆記既有的 @ai-visualize 互動元件 rr-raci，播放時仍可點選。
import type { Deck } from "@/lib/decks";
import RrRaci from "@/components/generated/rr-raci";

const deck: Deck = {
  slug: "role-responsibility-rr",
  title: "角色與職責 R&R",
  eyebrow: "PRODUCT MANAGEMENT",
  generatedAt: "2026-06-21",
  source: "src/content/notes/role-responsibility-rr.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 產品管理",
      title: "角色與職責 R&R",
      subtitle: "每件事誰拍板、誰動手、誰該被問、誰只是被通知",
      meta: ["由 role-responsibility-rr.mdx 生成", "8 頁 · 16:9"],
    },
    {
      layout: "section",
      nav: "章節：兩種權責結構",
      num: "01",
      eyebrow: "STRUCTURE",
      title: "兩種權責結構",
      subtitle: "Waterfall 的指揮鏈，與 Agile 的自組織圈",
    },
    {
      layout: "bullets",
      nav: "R&R 的四個問題",
      eyebrow: "FOUNDATION",
      title: "R&R 要回答的四個問題",
      lead: "頭銜不等於權責。把每一件事拆到人，才是 R&R 真正在做的事。",
      items: [
        { k: "誰拍板", v: "Accountable — 最終負責人，一件事只能有一位。", tone: "orange" },
        { k: "誰動手", v: "Responsible — 實際執行的人，可以有多位。", tone: "blue" },
        { k: "誰該被問", v: "Consulted — 決策前必須徵詢的專業意見。", tone: "blue" },
        { k: "誰只是被通知", v: "Informed — 事後知會即可，不介入決策。", tone: "muted" },
      ],
    },
    {
      layout: "media",
      nav: "Waterfall 指揮鏈",
      eyebrow: "WATERFALL",
      title: "由上而下的指揮鏈",
      body: "PM 站在指揮鏈頂端，需求向下拆解、進度向上回報。角色邊界清楚、變更成本高，適合規格明確、驗收條件固定的專案。",
      points: [
        "PM 指派任務並對交付日期負責",
        "System Architect 定義技術規格",
        "Dev / QA 依規格執行與驗證",
      ],
      mediaLabel: "組織階層圖",
      mediaHint: "notes/role-responsibility-rr/waterfall-chain.png",
    },
    {
      layout: "compare",
      nav: "Waterfall vs Agile",
      eyebrow: "COMPARE",
      title: "同一群人，兩種權力流向",
      left: {
        tag: "WATERFALL",
        name: "指揮鏈",
        tone: "blue",
        rows: [
          ["決策", "PM 由上而下拍板"],
          ["團隊", "依職能分工的執行單位"],
          ["變更", "走變更管制流程"],
          ["節奏", "階段閘門驗收"],
        ],
      },
      right: {
        tag: "AGILE",
        name: "自組織圈",
        tone: "orange",
        rows: [
          ["決策", "PO 排序、團隊自行認領"],
          ["團隊", "跨職能、自組織"],
          ["變更", "下一個 Sprint 重新排序"],
          ["節奏", "固定迭代交付"],
        ],
      },
    },
    {
      layout: "full-visual",
      nav: "RACI 互動矩陣",
      eyebrow: "INTERACTIVE",
      title: "RACI Matrix — 播放時仍可點選操作",
      viz: RrRaci,
      vizLabel: "@ai-visualize · rr-raci",
      vizHint: "沿用筆記中已生成的互動元件，播放時可直接點選 R / A / C / I 聚焦角色。",
    },
    {
      layout: "quote",
      nav: "引言：A 的唯一性",
      eyebrow: "KEY TAKEAWAY",
      quote: "A（最終負責人）只能有一個，否則責任會被稀釋，出事時容易互踢皮球。",
      by: "角色與職責 R&R",
      byMeta: "NoteCraft · 產品管理系列",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      eyebrow: "RECAP",
      title: "帶走這三件事",
      items: [
        { n: "01", k: "先拆事，再談頭銜", v: "R&R 的單位是「任務」，不是職稱。" },
        { n: "02", k: "A 只能有一位", v: "唯一的最終負責人，是責任不被稀釋的前提。" },
        { n: "03", k: "方法論決定流向", v: "換了 Waterfall / Agile，同一群人的權責也跟著換。" },
      ],
      cta: "回到筆記閱讀完整互動內容",
      ctaMeta: "/notes/role-responsibility-rr",
    },
  ],
};

export default deck;
