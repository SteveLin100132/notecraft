// deck 資料模組：對應筆記 role-responsibility-rr.mdx（v0.2 重寫）。
// 兩個 custom 頁（Compare 對照 / RACI 定義）組合原子層 block；
// 三頁 full-visual 沿用該筆記既有的 @ai-visualize 互動元件
// （rr-structure / rr-derived-roles / rr-raci），播放時仍可點選操作。
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { Compare, Kpi, Rows } from "@/components/deck/blocks";
import RrStructure from "@/components/generated/rr-structure";
import RrDerivedRoles from "@/components/generated/rr-derived-roles";
import RrRaci from "@/components/generated/rr-raci";

// Part 01：結構對照。兩種結構管的是同一群人，差別只在箭頭方向 ——
// 不是優劣比較，所以不給 badge。
function StructureComparePage({ dark }: CustomSlideProps) {
  return (
    <Compare
      dark={dark}
      left={{
        tag: "WATERFALL",
        tone: "blue",
        name: "由上而下指派",
        rows: [
          ["拍板", "PM 統籌排程範疇"],
          ["轉譯", "System Architect 拆成技術任務"],
          ["執行", "Development / QA Team 依序落實"],
        ],
      }}
      right={{
        tag: "SCRUM",
        tone: "orange",
        name: "由外圍服務",
        rows: [
          ["對外", "PO 定義做什麼、管 Backlog"],
          ["對內", "SM 排除障礙守護節奏"],
          ["核心", "Development Team 自組織決定怎麼做"],
        ],
      }}
    />
  );
}

// Part 03：R/A/C/I 四個字母的定義。只有 A 給 orange，其餘 blue / muted ——
// 用色彩層次帶出「A 是本頁重點」，而不是四色平鋪。
function RaciDefinitionsPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Rows
        dark={dark}
        items={[
          {
            k: "R",
            v: "Responsible · 實際動手執行這件事的人",
            noteLabel: "角色示例",
            note: "Development Team、QA",
            tone: "blue",
          },
          {
            k: "A",
            v: "Accountable · 最終負責、拍板的唯一一人",
            noteLabel: "角色示例",
            note: "PM 或 Tech Lead（依任務而定）",
            tone: "orange",
          },
          {
            k: "C",
            v: "Consulted · 決策前需要被諮詢意見的人",
            noteLabel: "角色示例",
            note: "System Architect、PO",
            tone: "muted",
          },
          {
            k: "I",
            v: "Informed · 事後只需被知會結果的人",
            noteLabel: "角色示例",
            note: "跨組利害關係人",
            tone: "muted",
          },
        ]}
      />
      <Kpi
        dark={dark}
        style={{ flex: "none" }}
        items={[
          { label: "每項任務的 A", value: "1", tone: "orange", emphasis: true },
          {
            label: "任務數",
            value: "4",
            sub: "PRD 撰寫、架構設計、UAT 驗收、上線核准",
            tone: "muted",
          },
        ]}
      />
    </>
  );
}

const deck: Deck = {
  slug: "role-responsibility-rr",
  title: "角色與職責 R&R",
  eyebrow: "專案管理系列 · 第三章",
  generatedAt: "2026-07-30",
  source: "src/content/notes/role-responsibility-rr.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "NOTECRAFT DECK · 專案管理系列 第三章",
      title: "角色與職責 R&R",
      subtitle:
        "同一群人換了方法論，權責流向就跟著換——R&R 要把「決策」與「執行」釘死在誰身上",
      meta: ["由 role-responsibility-rr.mdx 生成", "11 頁 · 16:9 · 含 3 組可互動元件"],
      agenda: [
        { n: "01", title: "兩種權責結構", sub: "Waterfall 由上而下指派 vs Scrum 由外圍服務" },
        { n: "02", title: "補位的專業", sub: "中大型專案常見的六個衍生角色" },
        { n: "03", title: "落地到每一件事", sub: "RACI 矩陣：誰執行、誰負責、誰諮詢、誰知會" },
      ],
    },
    {
      layout: "section",
      nav: "章節 01：兩種權責結構",
      num: "01",
      eyebrow: "STRUCTURE",
      title: "兩種權責結構",
      subtitle: "同樣是「帶團隊的人」，一邊由上而下指派，一邊從外圍服務",
    },
    {
      layout: "custom",
      nav: "誰指派、誰服務",
      num: "01",
      eyebrow: "PART 01 · 權責結構",
      title: "指揮鏈 vs 自組織圈",
      titleNote: "同一群人，換了方法論，權責流向就完全相反",
      render: StructureComparePage,
      callout: {
        icon: "target",
        text: "兩種結構管的都是同一群人——差別在箭頭方向：一邊由上而下指派，一邊由外圍服務核心。",
        tone: "blue",
      },
    },
    {
      layout: "full-visual",
      nav: "互動對照：點角色看職責",
      num: "01",
      eyebrow: "PART 01 · 權責結構",
      title: "箭頭方向，就是答案",
      titleNote: "點選任一角色，展開完整職責",
      legend: [
        { label: "Waterfall", tone: "blue" },
        { label: "Scrum", tone: "orange" },
      ],
      viz: RrStructure,
      vizLabel: "@ai-visualize · rr-structure",
      vizHint: "沿用筆記中已生成的互動元件。可切換權責流向動畫，點選任一角色看完整職責。",
    },
    {
      layout: "section",
      nav: "章節 02：補位的專業",
      num: "02",
      eyebrow: "DERIVED ROLES",
      title: "補位的專業",
      subtitle: "核心三角撐得住小團隊，中大型專案得靠衍生角色填上缺口",
    },
    {
      layout: "full-visual",
      nav: "六個衍生角色",
      num: "02",
      eyebrow: "PART 02 · 補位的專業",
      title: "核心三角之外，還缺這六塊專業",
      titleNote: "點開任一卡片，看它補上的職責",
      callout: {
        icon: "users",
        text: "這些角色不一定每個團隊都有，但團隊一大，總有一塊專業是核心三角撐不住的。",
        tone: "muted",
      },
      viz: RrDerivedRoles,
      vizLabel: "@ai-visualize · rr-derived-roles",
      vizHint: "沿用筆記中已生成的互動元件。手風琴一次展開一張，播放時可直接點選。",
    },
    {
      layout: "section",
      nav: "章節 03：落到每一件事",
      num: "03",
      eyebrow: "RACI",
      title: "把權責落到每一件事",
      subtitle: "結構圖說清楚了誰對誰負責，還沒說清楚「這件事」誰拍板",
    },
    {
      layout: "custom",
      nav: "R/A/C/I 是什麼",
      num: "03",
      eyebrow: "PART 03 · RACI",
      title: "R&R 要回答的四個問題",
      titleNote: "先講清楚字母，再看它怎麼落到任務上",
      render: RaciDefinitionsPage,
      callout: {
        icon: "alert",
        text: "A 只能有一位——這是全表最容易被忽略、也最容易出事的鐵律。下一頁的互動矩陣會實際標出每項任務的那一位 A。",
        tone: "warning",
      },
    },
    {
      layout: "full-visual",
      nav: "RACI 互動矩陣",
      num: "03",
      eyebrow: "PART 03 · RACI",
      title: "四項任務，每一列都只有一位 A",
      titleNote: "PRD 撰寫、架構設計、UAT 驗收、上線核准 × PM / PO / Tech Lead / QA",
      footnotes: [
        { n: "R", text: "Responsible · 誰執行" },
        { n: "A", text: "Accountable · 誰最終負責，且只能一位" },
        { n: "C", text: "Consulted · 誰該被諮詢" },
        { n: "I", text: "Informed · 誰只需被知會" },
      ],
      callout: {
        icon: "alert",
        text: "A（最終負責人）只能有一個，否則責任會被稀釋，出事時容易互踢皮球。",
        tone: "warning",
      },
      viz: RrRaci,
      vizLabel: "@ai-visualize · rr-raci",
      vizHint: "沿用筆記中已生成的互動元件。點 R/A/C/I 聚焦同類角色，點任一列拆解該任務的權責分工。",
    },
    {
      layout: "quote",
      nav: "引言：A 的唯一性",
      eyebrow: "KEY TAKEAWAY",
      quote: "A（最終負責人）只能有一個，否則責任會被稀釋，出事時容易互踢皮球。",
      by: "角色與職責 R&R",
      byMeta: "NoteCraft · 專案管理系列 第三章",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      eyebrow: "RECAP",
      title: "帶走這三件事",
      items: [
        {
          n: "01",
          k: "先拆事，再談頭銜",
          v: "R&R 的單位是任務，不是職稱。頭銜排好了，權責仍可能是空的。",
        },
        {
          n: "02",
          k: "方法論決定流向",
          v: "換了 Waterfall 或 Scrum，同一群人的權力與責任也跟著換方向。",
        },
        {
          n: "03",
          k: "A 只能一位",
          v: "唯一的最終負責人，是責任不被稀釋的前提，也是最常被違反的鐵律。",
        },
      ],
      cta: "回到筆記閱讀完整互動內容",
      ctaMeta: "/notes/role-responsibility-rr",
    },
  ],
};

export default deck;
