import { useId, useRef, useState, type CSSProperties } from "react";

/*
 * 「它做什麼」的等角爆炸圖（文件頁，白紙版）。
 * 投影與首頁 FIG. 1 相同：平面座標 (u, v) 經等角投影成畫面座標；每個功能是工作台平面上的一塊子區域，
 * 由下而上分層拉開，上層以紙色填滿、遮住下層。點部件（或右側的符號說明）在旁邊展開完整說明。
 * 選中的部件浮起，它上方的層再往上、下方的層再往下讓開一點，像把機構從那一層掰開。
 */

const W = 320; // 平面寬（u）
const D = 220; // 平面深（v）
const OX = 250;
const C = 0.866;
const T = 16; // 底板厚度
const SPREAD = 16; // 選中時上下兩側各讓開的距離

type Pt = [number, number];
const P = (u: number, v: number, oy: number): Pt => [OX + C * (u - v), oy + 0.5 * (u + v)];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const MATRIX = (oy: number) => `matrix(${C} 0.5 ${-C} 0.5 ${OX} ${oy})`;
const rect = (u0: number, v0: number, u1: number, v1: number, oy: number): Pt[] => [
  P(u0, v0, oy),
  P(u1, v0, oy),
  P(u1, v1, oy),
  P(u0, v1, oy),
];

type Link = { href: string; label: string };
export type Feature = {
  ref: number;
  name: string;
  lede: string;
  points: string[];
  links: Link[];
};

// 由下而上的層序就是編號順序。points 裡以 `…` 包起來的字顯示成程式碼。
export const FEATURES: Feature[] = [
  {
    ref: 10,
    name: "工作台",
    lede: "三欄的殼，除了簡報頁，每一頁都套用它。",
    points: [
      "左起是 Rail（主要入口）、Sidebar（真實的資料夾樹、系列、資料檔、標籤）與主區",
      "整頁不捲動，只有主區內容與 Sidebar 各自捲動，頁首與導覽一直留在原位",
      "筆記列表有 List／Board／Table／Timeline 四種 view；單擊一列在右側 Drawer 預覽，雙擊進筆記",
      "資料夾直接對到網址：`guides/oauth/flow.mdx` 就是 `/notes/guides/oauth/flow`",
    ],
    links: [
      { href: "/docs/guides/workbench/", label: "介面總覽" },
      { href: "/docs/guides/notes-list/", label: "筆記列表" },
    ],
  },
  {
    ref: 12,
    name: "系列與閱讀進度",
    lede: "把多篇筆記串成有順序的閱讀路徑，並告訴你下一篇該讀哪裡。",
    points: [
      "在 `series.json` 定義章節順序；資料檔頁也可以當成一章",
      "每篇筆記有未開始、閱讀中、已完成三種狀態，打開未讀的筆記就自動變成閱讀中",
      "Sidebar 與儀表板上的進度條旁寫著下一章，「繼續閱讀」直接跳過去",
      "閱讀狀態存在瀏覽器的 localStorage，不會寫進筆記檔",
    ],
    links: [
      { href: "/docs/guides/series/", label: "系列與閱讀進度" },
      { href: "/docs/getting-started/series/", label: "系列設定" },
    ],
  },
  {
    ref: 14,
    name: "儀表板",
    lede: "工作台首頁，一個視窗看完筆記量、寫作節奏與系列進度。",
    points: [
      "總覽八張卡：筆記總數、本週更新、AI 待生成、寫作頻率、最近更新、系列、標籤分布、更新日誌",
      "「更新月曆」把每篇筆記依更新日放進日期格，顏色代表閱讀狀態，可切月檢視與週檢視",
      "「AI 佇列」列出還沒生成的 `@ai-visualize` 標記",
      "「本週」相關的數字以今天為基準，在瀏覽器端計算",
    ],
    links: [{ href: "/docs/guides/dashboard/", label: "儀表板與更新月曆" }],
  },
  {
    ref: 16,
    name: "AI 視覺化",
    lede: "在筆記裡用自然語言描述一張圖，由 Claude Code 生成可以操作的元件，嵌回原本的位置。",
    points: [
      "在 MDX 裡寫一個 `@ai-visualize` 標記，`prompt` 寫你想看到什麼",
      "在 Claude Code 對話說「處理視覺化」，四個 subagent 依序掃描、規劃、寫元件、寫回筆記",
      "產物是 React 元件，按鈕能按、滑桿能拖；檔案跟筆記一起進 git",
      "內文欄放不下的寬元件可以放大到全螢幕畫布平移、縮放，也能匯出 PNG",
      "網頁本身不呼叫 AI，`build` 與部署也不會自動生成",
    ],
    links: [
      { href: "/docs/guides/ai-markers/", label: "標記語法" },
      { href: "/docs/guides/ai-pipeline/", label: "生成流程" },
      { href: "/docs/guides/zoom/", label: "放大檢視" },
    ],
  },
  {
    ref: 18,
    name: "筆記轉簡報",
    lede: "一篇筆記轉成 16:9 多頁簡報，筆記裡的互動元件原樣搬進投影片。",
    points: [
      "在 Claude Code 說「把 `flow.mdx` 轉成簡報」，AI 先抓主線、切章節，再逐頁挑版型",
      "一份通常 8–14 頁，內容頁從 29 個預先設計好的原子中選",
      "在 `/present/<slug>` 檢視或全螢幕播放，`←` `→` 翻頁、`O` 開大綱",
      "已生成的互動元件整個放進投影片，播放到那一頁時照樣能點、能拖",
    ],
    links: [
      { href: "/docs/guides/deck/", label: "生成一份簡報" },
      { href: "/docs/guides/deck-play/", label: "播放與快捷鍵" },
    ],
  },
  {
    ref: 20,
    name: "Plugin",
    lede: "結構化的 JSON 資料檔交給可安裝的渲染器，畫成一個頁面。",
    points: [
      "官方有 ER Diagram 與 OpenAPI 兩個渲染器，也能裝第三方 GitHub repo 或本地資料夾的 plugin",
      "用 `npx notecraftapp install-plugin` 安裝，安裝前先做靜態檢查並要你確認",
      "`plugins.json` 決定哪些檔案交給哪個 plugin；資料檔頁在 `/view/…`，也能用 `<PluginView>` 嵌進筆記",
      "同一種形狀的資料會反覆出現，用 plugin；只為一段文字服務，用 AI 視覺化",
    ],
    links: [
      { href: "/docs/guides/plugin-install/", label: "安裝來源" },
      { href: "/docs/guides/plugin-mapping/", label: "映射規則" },
    ],
  },
  {
    ref: 22,
    name: "筆記頁籤",
    lede: "開過的筆記與資料檔留在主區最上方，像編輯器的頁籤。",
    points: [
      "從列表、Sidebar 或 ⌘K 打開已經開著的筆記，會切到那個頁籤，不會重複開",
      "切回一個頁籤時，捲回上次讀到的位置",
      "可以固定、拖曳排序；`⌥.` `⌥,` 切換，`⌥W` 關閉，`⌥⇧T` 重開剛關掉的",
      "未固定的頁籤最多 20 個，超過時自動關掉最久沒用的那個",
    ],
    links: [{ href: "/docs/guides/tabs/", label: "筆記頁籤" }],
  },
  {
    ref: 24,
    name: "⌘K 指令面板",
    lede: "全站的跳轉入口，任何一頁按 ⌘K 就能開。",
    points: [
      "一次搜已開啟的頁籤、筆記、系列、標籤與資料檔，比對標題、路徑與標籤",
      "Windows／Linux 用 `Ctrl+K`，左側 Rail 的放大鏡也能開",
      "`build`／`serve` 輸出的站還能用 pagefind 搜筆記內文",
    ],
    links: [{ href: "/docs/guides/palette/", label: "指令面板與全文搜尋" }],
  },
];

/*
 * 每層的位置（oy）、外框（平面座標）、引線起點（平面座標）與標籤位置。
 * 標籤分左右兩欄：Sidebar 那一條（系列）與底板在左，其餘在右，引線才不會穿過圖。
 */
type Geo = { oy: number; box: [number, number, number, number]; anchor: [number, number]; side: "l" | "r"; labelY: number };
const GEO: Record<number, Geo> = {
  24: { oy: 0, box: [132, 34, 276, 124], anchor: [276, 56], side: "r", labelY: 150 },
  22: { oy: 88, box: [92, 0, W, 16], anchor: [W, 10], side: "r", labelY: 250 },
  20: { oy: 176, box: [196, 136, 316, 214], anchor: [316, 190], side: "r", labelY: 380 },
  18: { oy: 264, box: [112, 70, 300, 176], anchor: [300, 120], side: "r", labelY: 480 },
  16: { oy: 352, box: [116, 80, 296, 176], anchor: [296, 150], side: "r", labelY: 590 },
  14: { oy: 440, box: [92, 26, W, D], anchor: [W, 196], side: "r", labelY: 720 },
  12: { oy: 520, box: [26, 128, 88, 212], anchor: [44, 212], side: "l", labelY: 640 },
  10: { oy: 586, box: [0, 0, W, D], anchor: [24, D], side: "l", labelY: 790 },
};
const BASE_OY = GEO[10].oy;
const LABEL_R = 566;
const LABEL_L = 46;

const ORDER = FEATURES.map((f) => f.ref);

/* ── 各層的線稿（平面座標，畫在 MATRIX 裡） ── */
function Art({ refNo }: { refNo: number }) {
  switch (refNo) {
    case 10:
      return (
        <>
          <rect x={0} y={0} width={22} height={D} className="fx-ink" />
          <rect x={22} y={0} width={70} height={D} className="fx-ink" />
          {[30, 56, 82, 108].map((v) => (
            <rect key={v} x={6} y={v - 5} width={10} height={10} className="fx-ink" />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={32 + (i % 2) * 8} y1={28 + i * 18} x2={82} y2={28 + i * 18} className="fx-ink" />
          ))}
          <rect x={26} y={128} width={62} height={84} className="fx-ink fx-dash" />
          <line x1={92} y1={16} x2={W} y2={16} className="fx-ink" />
          <line x1={92} y1={26} x2={W} y2={26} className="fx-ink" />
          <rect x={100} y={34} width={212} height={178} className="fx-ink fx-dash" />
        </>
      );
    case 12:
      return (
        <>
          {[140, 166, 192].map((v, i) => (
            <g key={v}>
              <line x1={32} y1={v} x2={[72, 64, 78][i]} y2={v} className="fx-ink" />
              <rect x={32} y={v + 6} width={50} height={6} className="fx-ink" />
              <rect x={32} y={v + 6} width={[38, 18, 50][i]} height={6} className={i === 0 ? "fx-mark fx-fill" : "fx-ink fx-fill-ink"} />
            </g>
          ))}
        </>
      );
    case 14:
      return (
        <>
          {[
            [102, 60],
            [170, 60],
            [238, 72],
          ].map(([x, w], i) => (
            <g key={x}>
              <rect x={x} y={36} width={w} height={34} className="fx-ink" />
              {i < 2 ? <circle cx={x + 18} cy={53} r={9} className={i === 0 ? "fx-mark" : "fx-ink"} /> : <path d={`M${x + 18} 44 L${x + 21} 50 L${x + 27} 53 L${x + 21} 56 L${x + 18} 62 L${x + 15} 56 L${x + 9} 53 L${x + 15} 50 Z`} className="fx-mark" />}
              <line x1={x + 34} y1={48} x2={x + w - 8} y2={48} className="fx-ink" />
              <line x1={x + 34} y1={58} x2={x + w - 16} y2={58} className="fx-ink" />
            </g>
          ))}
          <rect x={102} y={80} width={104} height={70} className="fx-ink" />
          {[22, 34, 18, 40, 30, 46, 26, 38].map((h, i) => (
            <rect key={i} x={110 + i * 11.5} y={144 - h} width={7} height={h} className={i === 5 ? "fx-mark fx-fill" : "fx-ink"} />
          ))}
          <rect x={214} y={80} width={96} height={70} className="fx-ink" />
          <line x1={262} y1={80} x2={262} y2={150} className="fx-ink" />
          <line x1={214} y1={118} x2={262} y2={118} className="fx-ink" />
          <line x1={286} y1={80} x2={286} y2={150} className="fx-ink" />
          <line x1={262} y1={108} x2={286} y2={108} className="fx-ink" />
          <rect x={214} y={80} width={48} height={38} className="fx-mark fx-fill" />
          <rect x={102} y={160} width={104} height={50} className="fx-ink" />
          {[170, 184, 198].map((v) => (
            <line key={v} x1={112} y1={v} x2={196} y2={v} className="fx-ink" />
          ))}
          <rect x={214} y={160} width={96} height={50} className="fx-ink" />
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <line key={k} x1={214 + k * 13.7} y1={160} x2={214 + k * 13.7} y2={210} className="fx-ink fx-thin" />
          ))}
          {[177, 193].map((v) => (
            <line key={v} x1={214} y1={v} x2={310} y2={v} className="fx-ink fx-thin" />
          ))}
        </>
      );
    case 16:
      return (
        <>
          <line x1={116} y1={94} x2={296} y2={94} className="fx-ink" />
          <line x1={124} y1={87} x2={168} y2={87} className="fx-ink" />
          <rect x={132} y={110} width={30} height={20} className="fx-ink" />
          <rect x={190} y={110} width={30} height={20} className="fx-mark fx-fill" />
          <rect x={248} y={110} width={30} height={20} className="fx-ink" />
          <line x1={162} y1={120} x2={190} y2={120} className="fx-ink" />
          <line x1={220} y1={120} x2={248} y2={120} className="fx-ink" />
          <path d="M205 130 V146 H147 V130" className="fx-ink fx-dash" />
          <line x1={132} y1={162} x2={278} y2={162} className="fx-ink" />
          <circle cx={222} cy={162} r={4} className="fx-mark fx-fill" />
        </>
      );
    case 18:
      return (
        <>
          <line x1={124} y1={86} x2={204} y2={86} className="fx-ink" />
          <line x1={124} y1={96} x2={170} y2={96} className="fx-ink" />
          {[116, 130, 144].map((v) => (
            <g key={v}>
              <rect x={124} y={v - 2} width={4} height={4} className="fx-ink" />
              <line x1={134} y1={v} x2={182} y2={v} className="fx-ink" />
            </g>
          ))}
          <rect x={194} y={106} width={94} height={52} className="fx-ink fx-dash" />
          {[202, 232, 262].map((x, i) => (
            <rect key={x} x={x} y={124} width={18} height={12} className={i === 1 ? "fx-mark fx-fill" : "fx-ink"} />
          ))}
          {[0, 1, 2, 3, 4].map((k) => (
            <circle key={k} cx={126 + k * 8} cy={166} r={1.8} className={k === 2 ? "fx-mark fx-fill" : "fx-ink"} />
          ))}
        </>
      );
    case 20:
      return (
        <>
          <path d="M210 146 Q204 146 204 152 V170 Q204 175 200 175 Q204 175 204 180 V198 Q204 204 210 204" className="fx-ink" />
          {[154, 165, 176, 187, 198].map((v, i) => (
            <line key={v} x1={212 + (i % 2) * 6} y1={v} x2={[238, 244, 232, 246, 236][i]} y2={v} className="fx-ink" />
          ))}
          <rect x={254} y={144} width={52} height={24} className="fx-ink" />
          <line x1={254} y1={152} x2={306} y2={152} className="fx-ink" />
          <rect x={254} y={182} width={52} height={24} className="fx-mark" />
          <line x1={254} y1={190} x2={306} y2={190} className="fx-mark" />
          <line x1={280} y1={168} x2={280} y2={182} className="fx-ink" />
          <path d="M275 182 L280 177 L285 182" className="fx-ink" />
        </>
      );
    case 22:
      return (
        <>
          {[92, 140, 188, 236].map((u, i) => (
            <rect key={u} x={u + 4} y={3} width={42} height={10} className={i === 1 ? "fx-mark fx-fill" : "fx-ink"} />
          ))}
        </>
      );
    case 24:
      return (
        <>
          <rect x={142} y={44} width={124} height={14} className="fx-ink" />
          <circle cx={150} cy={51} r={3} className="fx-ink" />
          <rect x={142} y={66} width={124} height={12} className="fx-mark fx-fill" />
          {[92, 104, 116].map((v, i) => (
            <line key={v} x1={146} y1={v} x2={[236, 250, 214][i]} y2={v} className="fx-ink" />
          ))}
        </>
      );
    default:
      return null;
  }
}

/* points 裡 `…` 包住的字輸出成 <code> */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!(p.startsWith("`") && p.endsWith("`"))) return p;
        const code = p.slice(1, -1);
        // 短的不在中間斷行（`@ai-visualize` 斷成兩半很難讀）；長指令照常換行
        return (
          <code key={i} className={code.length <= 16 ? "fx-nw" : undefined}>
            {code}
          </code>
        );
      })}
    </>
  );
}

type Props = {
  base?: string;
  initial?: number;
};

export default function FeatureExplode({ base = "/", initial = 16 }: Props) {
  const [active, setActive] = useState<number>(initial);
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();
  const ai = ORDER.indexOf(active);
  const feature = FEATURES[ai];
  const href = (h: string) => base.replace(/\/$/, "") + h;
  const lit = hover ?? active;

  const panel = useRef<HTMLElement>(null);
  const select = (r: number) => setActive(r);
  // 從圖上點選：窄版的說明在圖下方，捲到看得見為止
  const pick = (r: number) => {
    setActive(r);
    const el = panel.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight - 120) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  };
  const step = (d: number) => setActive(ORDER[(ai + d + ORDER.length) % ORDER.length]);

  return (
    <figure className="fx" aria-labelledby={`${uid}-cap`}>
      <div className="fx-grid">
        <div className="fx-drawing">
          <svg viewBox="0 48 620 830" className="fx-svg" role="img" aria-label="NoteCraftApp 各功能的爆炸圖：由下而上是工作台、系列、儀表板、AI 視覺化、簡報、Plugin、頁籤與指令面板">
            {/* 組裝線：底板四角往上到儀表板層 */}
            <g className="fx-assembly" aria-hidden="true">
              {[
                [92, 26],
                [W, 26],
                [W, D],
                [92, D],
              ].map(([u, v]) => {
                const [x, y1] = P(u, v, GEO[14].oy);
                const [, y2] = P(u, v, BASE_OY);
                return <line key={`${u}-${v}`} x1={x} y1={y1} x2={x} y2={y2} />;
              })}
              {[
                [194, 106],
                [288, 158],
              ].map(([u, v]) => {
                const [x, y1] = P(u, v, GEO[18].oy);
                const [, y2] = P(u, v, GEO[16].oy);
                return <line key={`${u}-${v}`} x1={x} y1={y1} x2={x} y2={y2} />;
              })}
            </g>

            {ORDER.map((r, idx) => {
              const g = GEO[r];
              const [u0, v0, u1, v1] = g.box;
              const outline = rect(u0, v0, u1, v1, g.oy);
              const isActive = active === r;
              const isLit = lit === r;
              const shift = idx > ai ? -SPREAD : idx < ai ? SPREAD : 0;
              
              const [ax, ay] = P(g.anchor[0], g.anchor[1], g.oy);
              const lx = g.side === "r" ? LABEL_R : LABEL_L;
              const x2 = g.side === "r" ? lx - 14 : lx + 14;
              const mid = ax + (x2 - ax) * 0.55;

              return (
                <g
                  key={r}
                  className={`fx-part${isActive ? " is-active" : ""}${isLit ? " is-lit" : ""}${lit !== r ? " is-dim" : ""}`}
                  style={{ "--shift": `${shift}px`, "--dy": `${(BASE_OY - g.oy) * 0.8}px`, "--i": idx } as CSSProperties}
                  onClick={() => pick(r)}
                  onMouseEnter={() => setHover(r)}
                  onMouseLeave={() => setHover(null)}
                >
                  <g className="fx-in">
                    <g className="fx-shift">
                      <g className="fx-lift">
                        {r === 10 && (
                          <>
                            <polygon className="fx-face fx-side" points={pts([P(0, D, g.oy), P(W, D, g.oy), [P(W, D, g.oy)[0], P(W, D, g.oy)[1] + T], [P(0, D, g.oy)[0], P(0, D, g.oy)[1] + T]])} />
                            <polygon className="fx-face fx-side" points={pts([P(W, 0, g.oy), P(W, D, g.oy), [P(W, D, g.oy)[0], P(W, D, g.oy)[1] + T], [P(W, 0, g.oy)[0], P(W, 0, g.oy)[1] + T]])} />
                          </>
                        )}
                        <polygon points={pts(outline)} className="fx-face" />
                        <g transform={MATRIX(g.oy)} className="fx-plane">
                          <Art refNo={r} />
                        </g>
                        <polygon points={pts(outline)} className="fx-edge" />
                      </g>
                      <g className="fx-leader" aria-hidden="true">
                        <path d={`M${ax} ${ay} Q ${mid} ${ay} ${x2} ${g.labelY}`} className="fx-leader-line" />
                        <circle cx={ax} cy={ay} r={3.2} className="fx-leader-dot" />
                        <rect x={g.side === "r" ? lx - 6 : lx - 50} y={g.labelY - 22} width={56} height={44} className="fx-hit" />
                        <text x={lx} y={g.labelY + 10} className="fx-num" textAnchor={g.side === "r" ? "start" : "end"}>
                          {r}
                        </text>
                      </g>
                    </g>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="fx-side-col">
          <div className="fx-legend" role="group" aria-label="符號說明：選一個部件看說明">
            {FEATURES.map((f) => (
              <button
                key={f.ref}
                type="button"
                className={`fx-item${active === f.ref ? " is-active" : ""}`}
                aria-pressed={active === f.ref}
                aria-controls={`${uid}-panel`}
                onClick={() => select(f.ref)}
                onMouseEnter={() => setHover(f.ref)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="ref">{f.ref}</span>
                <span className="fx-item-name">{f.name}</span>
              </button>
            ))}
          </div>

          <section className="fx-panel" id={`${uid}-panel`} ref={panel} aria-live="polite">
            <div className="fx-panel-body" key={active}>
              <h3 className="fx-title">
                <span className="ref">{feature.ref}</span>
                {feature.name}
              </h3>
              <p className="fx-lede">{feature.lede}</p>
              <ul className="fx-points">
                {feature.points.map((p) => (
                  <li key={p}>
                    <Inline text={p} />
                  </li>
                ))}
              </ul>
              <p className="fx-links">
                {feature.links.map((l) => (
                  <a key={l.href} href={href(l.href)}>
                    {l.label}
                  </a>
                ))}
              </p>
            </div>
            <div className="fx-step">
              <button type="button" onClick={() => step(-1)} aria-label="上一個部件">
                ‹ {FEATURES[(ai - 1 + ORDER.length) % ORDER.length].ref}
              </button>
              <span>
                {ai + 1}／{ORDER.length}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="下一個部件">
                {FEATURES[(ai + 1) % ORDER.length].ref} ›
              </button>
            </div>
          </section>
        </div>
      </div>

      <figcaption id={`${uid}-cap`} className="fx-caption">
        NoteCraftApp 的爆炸圖：由下而上是工作台、系列、儀表板、AI 視覺化、簡報、Plugin、頁籤與指令面板。點任一部件看完整說明。
      </figcaption>
    </figure>
  );
}

