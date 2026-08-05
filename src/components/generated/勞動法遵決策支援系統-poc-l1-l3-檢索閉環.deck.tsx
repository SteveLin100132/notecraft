// deck 資料模組：對應筆記 勞動法遵決策支援系統-poc-l1-l3-檢索閉環.mdx。
//
// 主線：「總表到手之後，PoC 不是變大，是變小 —— 分類是檢索的副產物，主線（檢索＋分類）
// 全程不碰生成式模型；唯一的例外是最末端的風險分析報告，且是 L4~L8 規格未到的暫代做法。」
// 八個 custom 頁各自承載一個完整論證（收斂階梯 / 報告例外的決策記錄 / 反查走查 /
// 四組選型 / 兩表 join / 扇出統計 / CHECK 矩陣 / 六條任務線），一頁 full-visual 原樣沿用
// 筆記既有的 @ai-visualize 元件 poc-l1l3-retrieval-architecture（播放時可縮放探索）。
//
// 反查走查頁（PART 01 最後一頁）建立的「問句 → embedding → Top-K → join → L1/L2/L3」
// 空間記憶，在任務線頁底部以同一組 chip 重現 —— 讀者只需認一次路。
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, X as XIcon, User } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { Cards, Chart, Code, Decision, Kpi, Rows, Stages, Table } from "@/components/deck/blocks";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import PocL1L3RetrievalArchitecture from "@/components/generated/poc-l1l3-retrieval-architecture";

// ── 共用零件 ────────────────────────────────────────────────────────────────

/** 圓角小標籤。mono 給代碼類（條文代碼、L3 編號），一般文字不等寬 */
function Chip({
  c,
  text,
  tone = "muted",
  mono = false,
  strike = false,
}: {
  c: DeckThemeTokens;
  text: string;
  tone?: "muted" | "brand" | "accent";
  mono?: boolean;
  strike?: boolean;
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
        textDecoration: strike ? "line-through" : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/** 區塊小標（比 DS.h3 收斂一階，給欄內標題用） */
function ColHead({ c, text, note }: { c: DeckThemeTokens; text: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs, flex: "none" }}>
      <span style={{ fontSize: DS.h4, fontWeight: 800, color: c.ink, letterSpacing: DTRACK.tight }}>{text}</span>
      {note && <span style={{ fontSize: DS.micro, color: c.muted }}>{note}</span>}
    </div>
  );
}

/** 走查頁的步驟編號徽章 —— 內容真的是序列才用 */
function StepBadge({ c, n, label }: { c: DeckThemeTokens; n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs, flex: "none" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: "var(--radius-circle)",
          background: c.brand,
          color: "var(--neutral-0)",
          fontSize: DS.micro,
          fontWeight: 900,
          fontFamily: "var(--font-mono)",
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>{label}</span>
    </div>
  );
}

const panel = (c: DeckThemeTokens): CSSProperties => ({
  boxSizing: "border-box",
  borderRadius: "var(--radius-lg)",
  border: `1px solid ${c.borderSoft}`,
  background: c.sunken,
});

// ── PART 01 · 收斂：L1–L10 只留三層 ─────────────────────────────────────────
// 論點不是「四列對照表」，是「一座被關掉大半的階梯」：上段整片灰掉（L4 以後），
// 下段三階亮起（L1–L3），中間唯一的例外是 L6 —— 條文借出來用，但判定不跑。
// 左邊承載「剩下什麼」，右邊的 <Rows> 承載「哪四件事變了」。

function LadderLevel({ c, code, name, value }: { c: DeckThemeTokens; code: string; name: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        gap: DGAP.sm,
        padding: `0 ${DGAP.sm}px`,
        borderRadius: "var(--radius-md)",
        background: c.brandSoft,
      }}
    >
      <span
        style={{
          flex: "none",
          width: 34,
          fontFamily: "var(--font-mono)",
          fontSize: DS.small,
          fontWeight: 900,
          color: c.brandInk,
        }}
      >
        {code}
      </span>
      <span style={{ flex: 1, fontSize: DS.body, fontWeight: 700, color: c.ink }}>{name}</span>
      <span
        style={{
          flex: "none",
          fontSize: DS.h3,
          fontWeight: 900,
          lineHeight: 1,
          color: c.brandInk,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CondensePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.lg }}>
      {/* 左：階梯 */}
      <div style={{ flex: "none", width: 470, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
        <ColHead c={c} text="L1–L10 只留三層" note="範圍那篇匡的十層" />

        {/* 上段：關掉的部分 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: DGAP.xs,
            padding: DGAP.sm,
            boxSizing: "border-box",
            borderRadius: "var(--radius-lg)",
            border: `1.5px dashed ${c.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs, flex: "none" }}>
            <span style={{ display: "inline-flex", color: c.muted }}>
              <XIcon size={18} strokeWidth={2.5} />
            </span>
            <span style={{ fontSize: DS.small, fontWeight: 800, color: c.muted }}>L4 以後 · 這一版全部不做</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: "none" }}>
            <Chip c={c} text="必要事實追問" strike />
            <Chip c={c} text="地雷判定" strike />
            <Chip c={c} text="受控報告" strike />
          </div>

          {/* 唯一的例外 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4,
              padding: `${DGAP.xs}px ${DGAP.sm}px`,
              boxSizing: "border-box",
              borderRadius: "var(--radius-md)",
              border: `1.5px dashed ${c.accent}`,
              background: c.accentSoft,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: DS.body, fontWeight: 900, color: c.accent }}>
                L6
              </span>
              <span style={{ fontSize: DS.body, fontWeight: 800, color: c.ink }}>對應法條</span>
              <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.accent }}>唯一的例外</span>
            </div>
            <div style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
              只借條文出來做檢索，不跑 L6 的判定 —— 它是這一版反查分類的入口。
            </div>
          </div>
        </div>

        <div style={{ flex: "none", textAlign: "center", fontSize: DS.micro, fontWeight: 800, color: c.muted }}>
          ↓ 整段關掉之後，剩下的是
        </div>

        {/* 下段：留下的三層 */}
        <div
          style={{
            flex: "none",
            height: 176,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: DGAP.sm,
            boxSizing: "border-box",
            borderRadius: "var(--radius-lg)",
            border: `2px solid ${c.brand}`,
          }}
        >
          <LadderLevel c={c} code="L3" name="題型" value="85" />
          <LadderLevel c={c} code="L2" name="主題" value="22" />
          <LadderLevel c={c} code="L1" name="大類" value="4" />
        </div>
      </div>

      {/* 右：四件事變了 */}
      <Rows
        dark={dark}
        heading="原設計 → 這一版"
        noteWidth={300}
        style={{ flex: 1, minWidth: 0 }}
        items={[
          {
            k: "L1–L3 分類",
            v: "原設計：LLM 分類 ＋ structured output",
            desc: "現在改由檢索到的 L6 條文，拿 l3_codes 回總表反查",
            noteLabel: "反查",
            note: "分類是檢索的副產物",
            tone: "blue",
          },
          {
            k: "L6 條文檢索",
            v: "原設計：向量檢索 ＋ rerank",
            desc: "保留向量檢索，rerank 延後到資料量長大再說",
            noteLabel: "保留",
            note: "只砍掉 rerank",
            tone: "blue",
          },
          {
            k: "L4–L9",
            v: "事實追問、地雷判定、受控報告",
            desc: "整段不在這一版的驗收範圍內",
            noteLabel: "不做",
            note: "留給下一版",
            tone: "muted",
          },
          {
            k: "生成式 LLM",
            v: "原設計：Claude 或同級模型，貫穿全流程",
            desc: "現在只留在最末端風險分析報告一段，模型尚未定案",
            noteLabel: "限縮",
            note: "主線（檢索＋分類）不碰，只留報告例外",
            tone: "warning",
          },
          {
            k: "風險分析報告",
            v: "原設計：L9 受控報告（依規格模板）",
            desc: "自撰 prompt 出報告，規格到位後整段換掉",
            noteLabel: "暫代",
            note: "L4~L8 規格未到的權宜做法",
            tone: "warning",
          },
          {
            k: "前端 UI",
            v: "原設計：無（只有 API）",
            desc: "一頁看完：問句、條文、分類、報告",
            noteLabel: "新增",
            note: "讓檢索品質可被肉眼檢查",
            tone: "blue",
          },
        ]}
      />
    </div>
  );
}

// ── PART 01 · 為什麼報告那一步還要生成式模型：ADR ───────────────────────────
// L4~L8 規格顧問師還沒交，等規格到位才做報告會讓這一版停在「回傳一包 JSON」。
// 這裡是唯一碰生成式模型的節點的決策記錄 —— 說明為什麼是暫代，而不是走回頭路。

function DecisionPage({ dark }: CustomSlideProps) {
  return (
    <Decision
      dark={dark}
      context="L4~L8（事實追問、地雷判定、介入程度）規格顧問師還沒交，等規格到位才做報告，這一版就只能回傳一包 JSON，看不出東西。"
      options={[
        { label: "等規格到位再做報告", note: "最乾淨，但這一版會停在「回傳一包 JSON」，看不出東西" },
        { label: "先手刻規則判定", note: "沒有規格就是憑空編邏輯，規格一到大概率整段重寫" },
        {
          label: "自撰 prompt 餵生成式模型",
          note: "先把檢索結果餵給 LLM 出一份報告，讓 PoC 看得出價值",
          chosen: true,
        },
        { label: "只留 API，不做報告", note: "退回到只做檢索與分類，UI 沒有東西可以展示" },
      ]}
      decision="先自己寫一段 prompt，把檢索到的條文與總表對應結果餵進生成式模型，產出風險分析報告——不是 L9 的受控報告，只是規格到位前的出口。"
      consequences={[
        "換模型不影響向量庫與 L1~L3 反查結果",
        "規格到位後這段 prompt 要整個換掉、不疊功能",
        "生成式模型選型可以晚一點決定",
        "UI 把報告攤開，讓檢索品質可被肉眼檢查",
      ]}
    />
  );
}

// ── PART 01 · 反查走查：分類不是算出來的 ────────────────────────────────────
// 一個真實問句從左走到右，中途沒有任何生成式模型。底部那條被劃掉的帶子是punchline：
// 原設計在這裡放 LLM 分類，這一版整段拿掉，分類由 join 得到。

function FlowArrow({ c, label }: { c: DeckThemeTokens; label: string }) {
  return (
    <div
      style={{
        flex: "none",
        width: 110,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.brandInk, textAlign: "center", lineHeight: 1.35 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        <span style={{ flex: 1, height: 2, background: c.brand }} />
        <span style={{ display: "inline-flex", color: c.brand, marginLeft: -4 }}>
          <ArrowRight size={20} strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

function ArticleCard({ c, code, snippet, codes }: { c: DeckThemeTokens; code: string; snippet: string; codes: string[] }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        ...panel(c),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        padding: `${DGAP.xs}px ${DGAP.sm}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: DS.body, fontWeight: 900, color: c.ink }}>{code}</span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: DS.micro,
            color: c.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {snippet}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {codes.map((x) => (
          <Chip key={x} c={c} text={x} tone="brand" mono />
        ))}
      </div>
    </div>
  );
}

function LookupPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: DGAP.sm }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: DGAP.sm, alignItems: "stretch" }}>
        {/* 1 問句 → 2 向量 */}
        <div style={{ flex: "none", width: 300, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
          <StepBadge c={c} n="1" label="使用者提問" />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              ...panel(c),
              display: "flex",
              alignItems: "center",
              gap: DGAP.sm,
              padding: DGAP.sm,
            }}
          >
            <span style={{ flex: "none", display: "inline-flex", color: c.muted }}>
              <User size={30} strokeWidth={1.8} />
            </span>
            <span style={{ flex: 1, fontSize: DS.h4, fontWeight: 800, lineHeight: 1.4, color: c.ink }}>
              「公司可以不給特休嗎」
            </span>
          </div>

          <StepBadge c={c} n="2" label="Embedding" />
          <div
            style={{
              flex: "none",
              height: 96,
              ...panel(c),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 6,
              padding: DGAP.sm,
            }}
          >
            <div style={{ fontSize: DS.body, fontWeight: 800, color: c.ink, fontFamily: "var(--font-mono)" }}>
              mistral-embed
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs }}>
              <Chip c={c} text="vector(1024)" mono tone="brand" />
              <span style={{ fontSize: DS.micro, color: c.muted }}>與 Indexer 同一個模型</span>
            </div>
          </div>
        </div>

        <FlowArrow c={c} label="向量相似度查詢" />

        {/* 3 Top-K */}
        <div style={{ flex: "none", width: 420, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
          <StepBadge c={c} n="3" label="檢索近似條文 · Top-K = 5" />
          <ArticleCard
            c={c}
            code="第38條"
            snippet="繼續工作滿一定期間者，應給予特別休假……"
            codes={["B5-02", "B5-03", "D5-05"]}
          />
          <ArticleCard
            c={c}
            code="第39條"
            snippet="例假、休息日、休假及特別休假，工資照給……"
            codes={["B5-01", "B5-02", "B5-03", "B5-04", "C3-01", "D5-05"]}
          />
          <div style={{ flex: "none", fontSize: DS.micro, color: c.muted }}>
            每一條法條身上都掛著它被哪些題型引用的 l3_codes
          </div>
        </div>

        <FlowArrow c={c} label="l3_codes join 總表" />

        {/* 4 反查結果 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: DGAP.xs, minHeight: 0 }}>
          <StepBadge c={c} n="4" label="回 decision_tree 反查" />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              boxSizing: "border-box",
              borderRadius: "var(--radius-lg)",
              border: `2px solid ${c.brand}`,
              background: c.brandSoft,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: DGAP.xs,
              padding: DGAP.sm,
            }}
          >
            {[
              ["L1", "B · 蜜蜂", "工時、排班、休假與加班管理"],
              ["L2", "B5", "國定假日、特休、請假與停止假期管理"],
              ["L3", "B5-02", "特別休假管理"],
            ].map(([lv, code, name]) => (
              <div key={lv} style={{ display: "flex", alignItems: "baseline", gap: DGAP.xs }}>
                <span
                  style={{
                    flex: "none",
                    width: 26,
                    fontFamily: "var(--font-mono)",
                    fontSize: DS.small,
                    fontWeight: 900,
                    color: c.brandInk,
                  }}
                >
                  {lv}
                </span>
                <span style={{ flex: "none", fontSize: DS.body, fontWeight: 900, color: c.ink }}>{code}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: DS.small, lineHeight: 1.4, color: c.body }}>{name}</span>
              </div>
            ))}
            <div style={{ height: 1, background: c.border, margin: "2px 0" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Chip c={c} text="高頻" />
              <Chip c={c} text="中風險" />
              <Chip c={c} text="地雷 4 顆" tone="accent" />
              <Chip c={c} text="介入 高" tone="accent" />
            </div>
          </div>
        </div>
      </div>

      {/* punchline：原設計在這裡放 LLM */}
      <div
        style={{
          flex: "none",
          height: 76,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: DGAP.md,
          padding: `0 ${DGAP.md}px`,
          borderRadius: "var(--radius-lg)",
          border: `1.5px dashed ${c.border}`,
        }}
      >
        <span style={{ flex: "none", display: "inline-flex", color: c.muted }}>
          <XIcon size={26} strokeWidth={2.5} />
        </span>
        <span
          style={{
            flex: "none",
            fontSize: DS.h4,
            fontWeight: 800,
            color: c.muted,
            textDecoration: "line-through",
          }}
        >
          原設計：LLM 分類 ＋ structured output
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: DS.body, lineHeight: 1.5, color: c.body }}>
          這一版整段拿掉。四個步驟走完，L1／L2／L3 已經在手上 —— 它是 join 的結果，不是模型的輸出。
        </span>
      </div>
    </div>
  );
}

// ── PART 02 · 三件選型 ──────────────────────────────────────────────────────

function StackPage({ dark }: CustomSlideProps) {
  return (
    <>
      <Cards
        dark={dark}
        columns={4}
        style={{ flex: 1, minHeight: 0 }}
        items={[
          {
            title: "Vector Database",
            desc: "PostgreSQL + pgvector",
            points: [
              "HNSW ＋ cosine 索引，之後擴到函釋不用改",
              "GIN 索引給 l3_codes，反查靠它",
              "建在 GCP，環境步驟寫進 Runbook",
            ],
            chips: ["extension 名稱是 vector"],
            tone: "blue",
          },
          {
            title: "API（含 Indexer）",
            desc: "NestJS + TypeScript + LangChain",
            points: [
              "Indexer 模組收進 API：管理端 command／endpoint 觸發，不再是獨立 CLI",
              "embedding 設定只有一份，建庫與查詢共用",
              "條文檢索、總表整合兩步都不碰生成式模型",
            ],
            chips: ["Indexer 模組化"],
            tone: "blue",
          },
          {
            title: "UI",
            desc: "Vite + React + TypeScript",
            points: [
              "一頁展示：問句 → 條文清單 → L1~L3 分類 → 風險分析報告",
              "目的是讓檢索品質可被肉眼檢查，不做登入、不做多頁",
              "純前端讀 API 回傳的 JSON 攤開顯示",
            ],
            chips: ["肉眼可查"],
            tone: "orange",
          },
          {
            title: "生成式 LLM",
            desc: "只用在風險分析報告那一段",
            points: [
              "換掉不影響向量庫，也不影響 L1~L3 的反查結果",
              "規格到位前的暫代 prompt，規格到位後整段換掉",
              "候選：Claude 或同級模型（待定）",
            ],
            chips: ["尚未定案"],
            tone: "warning",
          },
        ]}
      />
      <Kpi
        dark={dark}
        style={{ flex: "none", height: 122 }}
        items={[
          { label: "向量維度", value: "1024", sub: "mistral-embed 固定，換模型要一起改", tone: "blue" },
          { label: "TOP-K", value: "5", sub: "常數設定，先設 5", tone: "blue" },
          { label: "生成式模型", value: "1", unit: "處", sub: "只掛在風險分析報告，模型尚未定案", tone: "warning" },
        ]}
      />
    </>
  );
}

// ── PART 03 · 兩張表，一條 join ─────────────────────────────────────────────
// 不把 25 個欄位平鋪成兩張表格 —— 那只會很滿。左右各列一次欄位，重點欄位加底，
// 中間那把「一對多」的扇子就是 text[] 的理由本身。

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
            { name: "embedding", type: "vector(1024)", note: "允許 NULL：Indexer 模組先載入條文列、再回填向量", mark: true },
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

// ── PART 03 · 扇出統計：為什麼一定得是 text[] ───────────────────────────────

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

// ── PART 03 · CHECK 矩陣：地雷數是算出來的 ──────────────────────────────────

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

// ── PART 04 · 四條任務線 ────────────────────────────────────────────────────
// 底部那條 chip 帶刻意重現反查走查頁的同一條路徑 —— 讀者只需要認一次路，
// 這裡只讀「四步做完，那條線就通了」。

function TasksPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const steps = ["問句", "embedding", "Top-K = 5", "l3_codes join", "L1／L2／L3"];

  return (
    <>
      <Stages
        dark={dark}
        variant="rail"
        alternate
        size={460}
        style={{ flex: "none" }}
        items={[
          {
            tag: "現在",
            icon: "database",
            title: "Vector Database",
            desc: "在 GCP 建 PostgreSQL + pgvector，同時把每一步寫成 Runbook",
            tone: "blue",
            variant: "active",
          },
          {
            tag: "API 1",
            icon: "settings",
            title: "Indexer 模組",
            desc: "收進 NestJS，管理端 command／endpoint 觸發，可重跑（ON CONFLICT DO UPDATE）",
            tone: "blue",
          },
          {
            tag: "API 2",
            icon: "plug",
            title: "條文檢索",
            desc: "依用戶問句回傳最相近的勞基法條文及解釋",
            tone: "blue",
          },
          {
            tag: "API 3",
            icon: "layers",
            title: "總表整合",
            desc: "把檢索結果與 L1~L3+L6 總表整合，找到匹配後回傳",
            tone: "orange",
          },
          {
            tag: "API 4",
            icon: "trend-up",
            title: "風險分析報告",
            desc: "撰寫 prompt 把條文與分類結果餵進生成式模型，輸出報告——這一步是暫代，規格到位後整段換掉",
            tone: "warning",
          },
          {
            tag: "UI",
            icon: "user",
            title: "UI",
            desc: "Vite + React 一頁：問句 → 條文清單 → L1~L3 分類 → 風險分析報告",
            tone: "muted",
          },
        ]}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: DGAP.md,
          padding: `0 ${DGAP.md}px`,
          borderRadius: "var(--radius-lg)",
          background: c.sunken,
        }}
      >
        <span style={{ flex: "none", fontSize: DS.small, fontWeight: 800, color: c.muted }}>問句到分類，這條線已經打通</span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: DGAP.xs, flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: DGAP.xs }}>
              <Chip c={c} text={s} tone={i === steps.length - 1 ? "brand" : "muted"} />
              {i < steps.length - 1 && (
                <span style={{ display: "inline-flex", color: c.muted }}>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── deck ────────────────────────────────────────────────────────────────────

const deck: Deck = {
  slug: "勞動法遵決策支援系統-poc-l1-l3-檢索閉環",
  title: "收斂到 L1–L3：勞動法遵 PoC 的第一版範圍與技術選型",
  eyebrow: "PoC · 勞動法遵決策支援系統",
  generatedAt: "2026-08-02",
  source: "src/content/notes/勞動法遵決策支援系統-poc-l1-l3-檢索閉環.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PoC · 勞動法遵決策支援系統",
      title: "收斂到 L1–L3",
      subtitle: "問句進來、撈相近法條、與總表整合 —— 主線不碰生成式 LLM，只有末端報告是暫代例外",
      meta: ["2026-07-31", "檢核機制_工程師初檢表_A段_L1-L3+L6 v1", "說明書 v1"],
      agenda: [
        { n: "01", title: "收斂", sub: "缺口補上之後，範圍為什麼變小" },
        { n: "02", title: "架構", sub: "三層架構（UI／API／PostgreSQL）與四件技術選型" },
        { n: "03", title: "資料", sub: "兩張表、85 列決策樹、一條 join" },
        { n: "04", title: "落地", sub: "六條任務線，現在在第一條" },
      ],
    },

    {
      layout: "section",
      nav: "章節：收斂",
      num: "01",
      eyebrow: "SCOPE",
      title: "缺口補上之後，PoC 變小了",
      subtitle: "L4 以後全部不做；生成式模型只留在最末端一段暫代報告",
    },
    {
      layout: "custom",
      nav: "L1–L10 只留三層",
      num: "01",
      eyebrow: "PART 01 · PoC 範圍",
      title: "不是變大，是變小",
      titleNote: "《L1~L3+L6 總表》到手之後的第一個決定",
      render: CondensePage,
      pill: { text: "L1–L3 · 85 個題型", tone: "blue" },
      callout: {
        icon: "target",
        tone: "blue",
        text: "分類與檢索用不到生成式模型；生成式 LLM 只留在最末端一段暫代報告，規格到位就整段換掉。",
      },
    },
    {
      layout: "custom",
      nav: "報告例外：為什麼還要生成式模型",
      num: "01",
      eyebrow: "PART 01 · 為什麼是暫代",
      title: "為什麼報告那一步還要生成式模型",
      titleNote: "規格沒到位前的暫代出口，不是走回頭路",
      render: DecisionPage,
      pill: { text: "暫代，非受控報告", tone: "orange" },
      callout: {
        icon: "info",
        tone: "warning",
        text: "這一步是暫代：L4~L8 規格交付後，這段 prompt 要整個換掉，不要在上面疊功能。",
      },
    },
    {
      layout: "custom",
      nav: "反查走查：一個問句走到底",
      num: "01",
      eyebrow: "PART 01 · 分類怎麼來的",
      title: "分類不是算出來的，是反查出來的",
      titleNote: "拿一個真實問句走一次",
      render: LookupPage,
      callout: {
        icon: "lightbulb",
        tone: "orange",
        text: "L1／L2／L3 是檢索的副產物 —— 條文身上本來就掛著它被哪些題型引用，撈到條文就等於撈到分類。",
      },
    },

    {
      layout: "section",
      nav: "章節：架構",
      num: "02",
      eyebrow: "ARCHITECTURE",
      title: "UI 進、API 出，一個服務內交棒",
      subtitle: "建庫與查詢都收在同一個 NestJS 服務裡，中間用 PostgreSQL 交棒",
    },
    {
      layout: "full-visual",
      nav: "技術架構圖",
      num: "02",
      eyebrow: "PART 02 · 技術架構",
      title: "UI、API、PostgreSQL：三層一次看完",
      viz: PocL1L3RetrievalArchitecture,
      vizWidth: 1160,
      vizLabel: "@ai-visualize · poc-l1l3-retrieval-architecture",
      vizHint:
        "最上層 UI（Vite + React）送出白話問句；左側 API（NestJS 常駐服務）內部並排 Indexer 模組（管理端觸發、非常駐流程，把法條與總表寫入向量與結構化資料）與查詢流程（Question → Embedding → Top-K 檢索 → Mapping → 風險分析報告）；右側 PostgreSQL + pgvector 是建庫與查詢共用的唯一交棒點。查詢流程前四步只用 mistral-embed，只有最後一步的風險分析報告碰生成式 LLM——那是 L4~L8 規格未到的暫代做法。",
    },
    {
      layout: "custom",
      nav: "四件選型",
      num: "02",
      eyebrow: "PART 02 · 技術選型",
      title: "四個元件，四組選型",
      titleNote: "Indexer 收進 API 模組；UI 只是把 API 回傳攤開顯示",
      render: StackPage,
      callout: {
        icon: "alert",
        tone: "critical",
        chip: "設定層綁死",
        text: "建庫與查詢用不同的 embedding 模型，向量空間對不上、檢索結果會是隨機的 —— 而且不會報錯。",
      },
    },

    {
      layout: "section",
      nav: "章節：資料",
      num: "03",
      eyebrow: "DATA",
      title: "兩張表：一張存向量，一張存決策樹",
      subtitle: "85 列決策樹、101 條相異法條、350 筆條文–題型對應",
    },
    {
      layout: "custom",
      nav: "兩張表，一條 join",
      num: "03",
      eyebrow: "PART 03 · 資料結構",
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
      nav: "扇出統計：為什麼是 text[]",
      num: "03",
      eyebrow: "PART 03 · 資料結構",
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
      nav: "CHECK：地雷數是算出來的",
      num: "03",
      eyebrow: "PART 03 · 資料結構",
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
      nav: "章節：落地",
      num: "04",
      eyebrow: "NEXT",
      title: "六條任務線，現在在第一條",
      subtitle: "Runbook 不是最後才補的文件",
    },
    {
      layout: "custom",
      nav: "六條任務線",
      num: "04",
      eyebrow: "PART 04 · 任務拆解",
      title: "六步走完，就是這一版的全部",
      titleNote: "Vector Database → Indexer → 檢索 → 總表整合 → 報告 → UI",
      render: TasksPage,
      callout: {
        icon: "file",
        tone: "orange",
        text: "Runbook 的價值不在文件本身，在逼你把手動做過的每一步寫下來 —— 沒寫下來的那幾步，就是之後重建環境時卡住的地方。",
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
          k: "總表補上缺口，範圍反而變小",
          v: "只做 L1–L3，L4 以後的事實追問、地雷判定、受控報告全部不在這一版；L6 只借條文，不跑判定。",
        },
        {
          n: "02",
          k: "主線不碰生成式模型，只有一處例外",
          v: "檢索與分類全程只用 mistral-embed；生成式 LLM 只掛在最末端的風險分析報告，且是 L4~L8 規格未到的暫代做法。",
        },
        {
          n: "03",
          k: "分類是檢索的副產物",
          v: "撈到條文就等於撈到 l3_codes，回 decision_tree 一 join 就有 L1／L2／L3，連同頻率、風險、地雷數一起帶出來。",
        },
      ],
      cta: "回到筆記看完整的 schema、範例資料與 Create SQL",
      ctaMeta: "/notes/勞動法遵決策支援系統-poc-l1-l3-檢索閉環",
    },
  ],
};

export default deck;
