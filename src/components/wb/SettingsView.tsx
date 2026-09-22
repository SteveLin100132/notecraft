// /settings（規格 §8.8）：設定（三項，存 localStorage）與關於（build 期資料）。Tab 寫進 ?tab=about。
import { useEffect, useState, type ComponentType } from "react";
import { BookOpen, FileText, Layers, Plus, Search, Sparkles, Tag, type LucideProps } from "lucide-react";
import {
  DEFAULT_PREFS,
  GROUP_LABEL,
  readPrefs,
  TOC_DEFAULT_LABEL,
  VIEW_LABEL,
  WB_GROUPS,
  WB_TOC_DEFAULTS,
  WB_VIEWS,
  writePrefs,
  type WbPrefs,
} from "@/lib/wb-prefs";
import { toast } from "@/lib/prompts";
import WbHeader from "./WbHeader";
import { GroupHeader, Ic, Seg, StatStrip } from "./ui";

type Tab = "settings" | "about";

export type AboutData = {
  workspaceLabel: string;
  appVersion: string;
  notes: number;
  series: number;
  tags: number;
  dataFiles: number;
  pendingMarkers: number;
  /** viewer 模式（NOTECRAFT_NOTES_DIR）時「部署」列改顯示模式 */
  viewer: boolean;
};

// 文案照抄 prototype 的 PT_FLOW／PT_STACK（規格 §8.8）
const FLOW: { k: string; d: string; phase: "作者" | "AI" | "發佈"; where: string; icon: ComponentType<LucideProps> }[] = [
  { k: "建立", d: "dev API 寫入含範本的 MDX 檔", phase: "作者", where: "工作台", icon: Plus },
  { k: "撰寫", d: "自由撰寫文字內容", phase: "作者", where: "VS Code", icon: FileText },
  { k: "標記", d: "在需要圖、動畫、互動處填入 @ai-visualize 與提示詞", phase: "作者", where: "VS Code", icon: Tag },
  { k: "生成", d: "依 content-visualize-skill 掃描標記、生成元件", phase: "AI", where: "Claude Code", icon: Sparkles },
  { k: "檢視", d: "不滿意可調整提示詞、重跑生成", phase: "AI", where: "工作台", icon: Search },
  { k: "發佈", d: "commit 後自動 build & deploy 為靜態網頁", phase: "發佈", where: "Netlify", icon: Layers },
];
const PHASE_GC: Record<string, string> = { 作者: "wb-gc-blue-l", AI: "wb-gc-gold", 發佈: "wb-gc-blue-d" };
const STACK: [string, string][] = [
  ["Astro 5", "框架"],
  ["MDX", "原始檔"],
  ["React", "互動元件"],
  ["TailwindCSS", "樣式"],
  ["motion", "動態互動"],
  ["Claude Code", "AI 載體"],
  ["pagefind", "搜尋"],
  ["Netlify", "部署"],
];

function SetRow({ k, d, children }: { k: string; d?: string; children?: React.ReactNode }) {
  return (
    <div className="wb-set">
      <div className="wb-set-l">
        <div className="wb-set-k">{k}</div>
        {d ? <div className="wb-set-d">{d}</div> : null}
      </div>
      <div className="wb-set-c">{children}</div>
    </div>
  );
}

export default function SettingsView({ about, isDev = false }: { about: AboutData; isDev?: boolean }) {
  const [tab, setTab] = useState<Tab>("settings");
  const [prefs, setPrefs] = useState<WbPrefs>(DEFAULT_PREFS); // SSR 用預設值

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "about") setTab("about");
    setPrefs(readPrefs());
  }, []);
  const goTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", window.location.pathname + (t === "about" ? "?tab=about" : ""));
  };
  const save = (patch: Partial<WbPrefs>) => {
    setPrefs(writePrefs(patch));
    toast("已儲存");
  };

  const meta: [string, string][] = [
    ["名稱", "NoteCraft 工作台"],
    ["工作區", about.workspaceLabel],
    ["筆記", `${about.notes} 篇`],
    ["系列", `${about.series} 個`],
    ["標籤", `${about.tags} 個`],
    ["資料檔", `${about.dataFiles} 個`],
    about.viewer ? ["模式", "notecraftapp viewer"] : ["部署", "Netlify ・ 靜態建置"],
    ["版本", `notecraftapp v${about.appVersion}`],
  ];

  return (
    <>
      <WbHeader
        title="設定與關於"
        crumbs={[{ label: "NoteCraft", href: "/" }, { label: "設定" }]}
        tabs={[
          { key: "settings", label: "設定" },
          { key: "about", label: "關於" },
        ]}
        activeTab={tab}
        onTab={goTab}
        isDev={isDev}
      />
      {tab === "settings" ? (
        <div id="nc-scroll" className="wb-body flush">
          <GroupHeader name="工作台" icon={Layers} gc="wb-gc-blue-l" />
          <SetRow k="預設 view" d="開啟筆記列表時使用的檢視；網址帶 ?view= 時以網址為準，手機一律 List">
            <Seg boxed label="預設 view" value={prefs.defaultView} options={WB_VIEWS.map((v) => ({ value: v, label: VIEW_LABEL[v] }))} onChange={(v) => save({ defaultView: v })} />
          </SetRow>
          <SetRow k="List 預設分組" d="List 檢視一開始的分組依據；在筆記列表切換分組時也會回寫這裡">
            <Seg boxed label="List 預設分組" value={prefs.groupBy} options={WB_GROUPS.map((g) => ({ value: g, label: GROUP_LABEL[g] }))} onChange={(g) => save({ groupBy: g })} />
          </SetRow>
          <GroupHeader name="筆記" icon={BookOpen} gc="wb-gc-blue-l" />
          <SetRow k="目錄預設狀態" d="開啟筆記時，右側目錄的子項目要全部展開或全部收合；目錄標頭的按鈕仍可隨時切換">
            <Seg boxed label="目錄預設狀態" value={prefs.tocDefault} options={WB_TOC_DEFAULTS.map((t) => ({ value: t, label: TOC_DEFAULT_LABEL[t] }))} onChange={(t) => save({ tocDefault: t })} />
          </SetRow>
          <p style={{ margin: 0, padding: "12px 18px", fontSize: 11.5, color: "var(--wb-ink-3)" }}>設定儲存在這個瀏覽器，不會同步到其他裝置。</p>
        </div>
      ) : (
        <div id="nc-scroll" className="wb-body flush">
          <StatStrip
            items={[
              { label: "筆記", value: about.notes },
              { label: "系列", value: about.series },
              { label: "資料檔", value: about.dataFiles },
              { label: "待生成標記", value: about.pendingMarkers, tone: "warn" },
            ]}
          />
          <GroupHeader name="工作區" icon={FileText} gc="wb-gc-blue" stats="以 MDX 為原始檔，由 AI Agent 與 Skill 生成視覺化與互動" />
          {meta.map(([k, v]) => (
            <SetRow key={k} k={k}>
              <span className="wb-set-v tnum">{v}</span>
            </SetRow>
          ))}
          <GroupHeader name="一份筆記的生命週期" count={FLOW.length} icon={Sparkles} gc="wb-gc-gold" />
          <div className="wb-flow">
            {FLOW.map((s, i) => {
              const newPhase = i === 0 || FLOW[i - 1].phase !== s.phase;
              return (
                <div key={s.k} className={`wb-flow-s ${PHASE_GC[s.phase]}`}>
                  <div className="wb-flow-rail">
                    <span className="wb-flow-line" style={i === 0 ? { visibility: "hidden" } : undefined} />
                    <span className="wb-flow-node tnum">{i + 1}</span>
                    <span className="wb-flow-line" style={i === FLOW.length - 1 ? { visibility: "hidden" } : undefined} />
                  </div>
                  <div className="wb-flow-b">
                    <div className="wb-flow-ph">{newPhase ? s.phase : " "}</div>
                    <div className="wb-flow-k">
                      <Ic icon={s.icon} size={13} color="var(--gc)" />
                      {s.k}
                    </div>
                    <div className="wb-flow-d">{s.d}</div>
                    <div>
                      <span className="wb-flow-w">{s.where}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <GroupHeader name="技術選型" count={STACK.length} icon={Layers} gc="wb-gc-ink3" />
          <div className="wb-set">
            <div className="wb-set-l" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STACK.map(([n, r]) => (
                <span key={n} className="wb-tagchip">
                  {n}
                  <span style={{ color: "var(--wb-ink-3)", marginLeft: 5 }}>{r}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
