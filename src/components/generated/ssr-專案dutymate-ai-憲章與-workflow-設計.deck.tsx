// deck 資料模組：對應筆記 ssr-專案dutymate-ai-憲章與-workflow-設計.mdx。
// 三個 custom 頁組合原子層 block（Cards+Kpi／Stages／Rows／prose+Mark+Cards／Code+Terminal）；
// 三頁 full-visual 沿用該筆記既有的 @ai-visualize 互動元件
// （sdd-workflow-map / sdd-delivery-loop / sdd-review-boundary），播放時仍可點選操作。
//
// 註：規劃書要求第 4、7 頁 full-visual 用 chrome:false 做滿版視覺，但目前的
// FullVisualSlide 型別（@/lib/decks）並未提供 chrome 欄位（只有 CustomSlide 有）——
// 這兩頁改為標準 full-visual（保留 chrome），並補上型別要求的 title。
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { DS } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import { Cards, Code, Kpi, Mark, Rows, Stages, Terminal } from "@/components/deck/blocks";
import SddWorkflowMap from "@/components/generated/sdd-workflow-map";
import SddDeliveryLoop from "@/components/generated/sdd-delivery-loop";
import SddReviewBoundary from "@/components/generated/sdd-review-boundary";

// Part 01：五層角色分工。Skills / 治理層 / 分析設計層 / 實作層 / 品質層
// 平行並列、不編號；orange 是「新角色」的識別色，不是狀態色。
function RoleLayersPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Cards
        dark={dark}
        columns={5}
        items={[
          {
            title: "Skills 編排",
            desc: "五個指令串起整條流程",
            points: ["openspec-propose", "clarify", "apply-change", "archive", "code-review"],
            tone: "muted",
          },
          {
            title: "治理層",
            desc: "拍板與轉場守門",
            points: ["pm", "tech-lead"],
            tone: "blue",
          },
          {
            title: "分析設計層",
            desc: "新增守門角色，平行分工",
            points: ["sa", "sd", "ui-ux"],
            tone: "orange",
            badge: "新",
          },
          {
            title: "實作層",
            desc: "動手產出交付物",
            points: ["backend-developer", "dba", "ui-ux", "technical-writer"],
            tone: "muted",
          },
          {
            title: "品質層",
            desc: "驗收把關，不重複審查",
            points: ["qa"],
            tone: "orange",
            badge: "新",
          },
        ]}
      />
      <Kpi
        dark={dark}
        style={{ flex: "none" }}
        items={[
          {
            label: "新增/升級角色",
            value: "4",
            sub: "sa、sd、ui-ux（升層）、qa",
            tone: "orange",
            emphasis: true,
          },
          { label: "角色總數", value: "9", tone: "muted" },
        ]}
      />
    </>
  );
}

// Part 01：change 名稱的命名規則 —— 由 sa 一次推導，之後所有階段沿用同一個目錄。
function NamingRulePage({ dark }: CustomSlideProps) {
  return (
    <Stages
      dark={dark}
      items={[
        {
          title: "去數字前綴",
          desc: "01-login.md → login",
        },
        {
          title: "必須字母開頭",
          desc: "OpenSpec CLI 的目錄命名限制",
        },
        {
          title: "轉 kebab-case",
          desc: "02-schedule-management.md → schedule-management",
        },
        {
          title: "建立目錄",
          desc: "sa 執行 openspec new change，後續階段沿用不重建",
        },
      ]}
    />
  );
}

// Part 02：qa 驗收的硬條件 —— DoD 全滿足才算過閘，不是「重看一次結論」。
function QaGatePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <>
      <p style={{ margin: 0, fontSize: DS.body, lineHeight: 1.65, color: c.body }}>
        qa 驗收不是重看一次 Code Review 的結論，而是逐一對照 spec 的每個 Scenario；
        <Mark dark={dark}>DoD 全滿足</Mark>
        才算通過，任何一項卡住都不放行，不通過就
        <Mark dark={dark}>退回實作 agent</Mark>
        重跑 ①②。
      </p>
      <Cards
        dark={dark}
        columns={2}
        items={[
          {
            title: "測試面",
            tone: "blue",
            points: [
              "單元 Jest ＋ 整合 Supertest 全綠",
              "E2E Playwright 全綠",
              "Migration up/down 可回滾",
              "啟動冒煙正常",
            ],
          },
          {
            title: "審核面",
            tone: "muted",
            points: [
              "spec 每個 Scenario 皆已驗證",
              "Decision Table 情境皆覆蓋",
              "通過 ESLint",
              "文件已同步",
            ],
          },
        ]}
      />
    </>
  );
}

// Part 03：接回 CLAUDE.md 的既有規範 —— 沒有新規則，只是收斂進同一條流程。
function ExistingNormsPage({ dark }: CustomSlideProps) {
  return (
    <Rows
      dark={dark}
      items={[
        {
          k: "派工機制",
          v: "AI 角色分工遵循既定派工順序，不隨意跳過",
          noteLabel: "出處",
          note: "CLAUDE.md §1-2",
        },
        {
          k: "測試分層",
          v: "單元、整合、E2E 三層測試各有明確歸屬",
          noteLabel: "出處",
          note: "CLAUDE.md §1-2",
        },
        {
          k: "Commit 時機",
          v: "每個轉場完成才 commit，不中途累積",
          noteLabel: "出處",
          note: "CLAUDE.md §3.2",
        },
        {
          k: "DoD 基準",
          v: "驗收標準沿用既有基準，不另訂一套",
          noteLabel: "出處",
          note: "CLAUDE.md §2",
        },
        {
          k: "Design Token",
          v: "介面樣式一律取自既有 token，不硬編色碼",
          noteLabel: "出處",
          note: "CLAUDE.md §1-4",
        },
      ]}
    />
  );
}

// Part 03：提示詞即介面 —— [2a]+[2b] 平行分支要一次貼，不能拆成兩則訊息。
// 同一份程式碼區塊，highlight 標出「同時發起」與「不得先後跑」兩句關鍵句。
function ParallelPromptPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Code
        dark={dark}
        size="xs"
        fileName="prompt · [2a]+[2b] sd ∥ ui-ux"
        highlight={[3, 4]}
        lines={[
          "# [2a]+[2b] 平行分支：sd ∥ ui-ux",
          "",
          "> 請在同一則回覆內同時發起兩個分支",
          "> 不得先跑一個、再跑另一個",
          "",
          "## 分支 A · sd",
          "1. 讀取 sa 產出的 spec.md",
          "2. 設計資料模型與 API 介面",
          "3. 輸出 design.md 至 change 目錄",
          "",
          "## 分支 B · ui-ux",
          "1. 讀取同一份 spec.md，產出畫面線框",
          "兩分支皆完成後才觸發 propose",
        ].join("\n")}
      />
      <Terminal
        dark={dark}
        style={{ flex: "none" }}
        lines={[
          { text: "/clarify login", kind: "cmd" },
          { text: "/openspec-apply-change login", kind: "cmd" },
          { text: "/openspec-archive-change login", kind: "cmd" },
        ]}
      />
    </>
  );
}

const deck: Deck = {
  slug: "ssr-專案dutymate-ai-憲章與-workflow-設計",
  title: "SDD Workflow：轉場有條件，退回有上限",
  eyebrow: "DUTY MATE · AI 憲章與 WORKFLOW",
  generatedAt: "2026-07-31",
  source: "src/content/notes/ssr-專案dutymate-ai-憲章與-workflow-設計.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      title: "SDD Workflow：轉場有條件，退回有上限",
      subtitle: "把 AI 團隊的分工與交付規則，收斂成一張可回放的治理地圖",
      meta: [
        "由 ssr-專案dutymate-ai-憲章與-workflow-設計.mdx 生成",
        "14 頁 · 16:9 · 含 3 組可互動元件",
      ],
      agenda: [
        {
          n: "01",
          title: "治理結構與七階段主流程",
          sub: "角色分工、平行分支、每階段的觸發與過閘條件",
        },
        {
          n: "02",
          title: "微觀交付迴圈：退回有上限",
          sub: "Code Review × QA 兩層守門，第 3 次退回自動升級",
        },
        {
          n: "03",
          title: "審查邊界與落地心法",
          sub: "tech-lead 與 qa 互補不取代，並對齊既有規範與提示詞介面",
        },
      ],
    },
    {
      layout: "section",
      nav: "章節：治理結構",
      num: "01",
      eyebrow: "GOVERNANCE",
      title: "治理結構與七階段主流程",
      subtitle: "從 sa 到封存，每一步都要使用者明確觸發、每個轉場都有過閘條件——這不是靠默契運作",
    },
    {
      layout: "custom",
      nav: "五層角色分工",
      num: "01",
      eyebrow: "PART 01 · 治理結構",
      title: "五層角色，四個是新面孔",
      titleNote: "Skills 編排、治理層拍板、分析設計層並行、實作層動手、品質層把關",
      render: RoleLayersPage,
      callout: {
        icon: "users",
        text: "sa／sd／qa 是全新角色，ui-ux 從實作層升格為與 sd 平行的設計層——這是舊流程沒有的守門動作。",
        tone: "blue",
      },
    },
    {
      layout: "full-visual",
      nav: "互動地圖：七階段全貌",
      title: "七階段全貌：一張圖看完整流程",
      viz: SddWorkflowMap,
      vizLabel: "@ai-visualize · sdd-workflow-map",
      vizHint: "點擊任一節點看觸發方式、負責角色、產物與過閘條件；[2] 節點會分裂成 sd／ui-ux 雙軌再匯流",
    },
    {
      layout: "custom",
      nav: "命名規則與例外通道",
      num: "01",
      eyebrow: "PART 01 · 治理結構",
      title: "一個名字，用到封存為止",
      titleNote: "change 名稱由 sa 推導，之後所有階段沿用同一個目錄",
      render: NamingRulePage,
      callout: {
        icon: "git-branch",
        text: "例外通道：sa 判定為超小型調整（純文案／設定值微調、不涉新類別或版面）時，使用者確認後可直接跳過 [2a]／[2b]，進 openspec-propose。",
        chip: "預設仍走 sd∥ui-ux",
        tone: "muted",
      },
    },
    {
      layout: "section",
      nav: "章節：交付迴圈",
      num: "02",
      eyebrow: "DELIVERY LOOP",
      title: "微觀交付迴圈：退回有上限",
      subtitle: "Code Review 同 task 最多退兩次，第三次不再迴圈，直接升級給人類",
    },
    {
      layout: "full-visual",
      nav: "播放交付迴圈：退回計數",
      title: "交付迴圈：退回計數即時模擬",
      viz: SddDeliveryLoop,
      vizLabel: "@ai-visualize · sdd-delivery-loop",
      vizHint: "按『模擬：Code Review 退回』看計數從 0/2 累積到 2/2，第 3 次自動觸發升級警示",
    },
    {
      layout: "custom",
      nav: "qa 驗收的硬條件",
      num: "02",
      eyebrow: "PART 02 · 交付迴圈",
      title: "『通過』不是感覺，是清單",
      titleNote: "DoD 全滿足才算過閘，完整清單以 qa.md 為準",
      render: QaGatePage,
    },
    {
      layout: "section",
      nav: "章節：審查邊界",
      num: "03",
      eyebrow: "REVIEW BOUNDARY",
      title: "審查邊界與落地心法",
      subtitle: "邊界靠『不做什麼』定義；操作介面則是一句提示詞，貼對了才算數",
    },
    {
      layout: "full-visual",
      nav: "職責邊界：兩張卡的對照",
      num: "03",
      eyebrow: "PART 03 · 審查邊界與落地",
      title: "負責什麼，更要看不做什麼",
      titleNote: "先 tech-lead Code Review，後 qa 驗收，順序不能反",
      footnotes: [
        {
          n: "1",
          text: "打勾權責：qa 驗收通過是前提，但實際把 tasks.md 該列改成 [x] 的人是 tech-lead，qa 不自行打勾。",
        },
      ],
      viz: SddReviewBoundary,
      vizLabel: "@ai-visualize · sdd-review-boundary",
      vizHint: "左卡 tech-lead／右卡 qa，各自的『負責』與『不做』",
    },
    {
      layout: "custom",
      nav: "接回 CLAUDE.md 的既有規範",
      num: "03",
      eyebrow: "PART 03 · 審查邊界與落地",
      title: "這套流程不是憑空發明的",
      titleNote: "五個機制，早已寫在 CLAUDE.md 裡",
      render: ExistingNormsPage,
      callout: {
        icon: "link",
        text: "SDD workflow 只是把既有規範釘進七個明確的觸發點——沒有新規則，只是把散落的規範收斂進同一條流程。",
        tone: "muted",
      },
    },
    {
      layout: "custom",
      nav: "提示詞即介面",
      num: "03",
      eyebrow: "PART 03 · 審查邊界與落地",
      title: "平行分支要一次貼，不能拆兩則",
      titleNote: "[2a]＋[2b] 是整份提示詞裡最容易踩雷的一步",
      render: ParallelPromptPage,
      callout: {
        icon: "alert",
        text: "拆成兩則訊息貼會退化成先跑 sd、再跑 ui-ux 的序列，白費『平行』設計——這是全文件唯一特別加警示框的地方。",
        tone: "warning",
      },
    },
    {
      layout: "quote",
      nav: "引言：邊界靠不做什麼定義",
      eyebrow: "KEY TAKEAWAY",
      quote:
        "這不是『兩人一起看』的併行審查，而是互補不取代的邊界——tech-lead 不做 Scenario 驗收，qa 不做 Code Review。『不做什麼』比『做什麼』更能定義這條邊界。",
      by: "SSR 專案（DutyMate）AI 憲章與 Workflow 設計",
      byMeta: "NoteCraft · SDD Workflow",
    },
    {
      layout: "closing",
      nav: "結語 / 重點回顧",
      title: "把三件事帶回團隊",
      items: [
        {
          n: "01",
          k: "轉場要觸發，不要默契",
          v: "七個階段都需要使用者明確觸發，每個轉場都有清楚的過閘條件——流程靠設計運作，不是靠有沒有人記得。",
        },
        {
          n: "02",
          k: "退回要計數，不要無限迴圈",
          v: "Code Review 同 task 最多退兩次，第三次自動升級給人類；QA 不通過就回實作 agent 重跑。",
        },
        {
          n: "03",
          k: "邊界靠不做什麼定義",
          v: "tech-lead 不做 Scenario 驗收、qa 不做 Code Review——互補而非重複審查。",
        },
      ],
      cta: "回到筆記看完整互動流程圖與各階段提示詞範本",
      ctaMeta: "/notes/ssr-專案dutymate-ai-憲章與-workflow-設計",
    },
  ],
};

export default deck;
