import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, type Transition } from "motion/react";

/*
 * 「系統架構」的等角爆炸圖（文件頁，白紙版）。投影與 FeatureExplode 相同。
 * 由下而上六層：你的專案 → CLI → Astro 建置 → 生成元件／Plugin 渲染器（同一層並排）→ 輸出 → 瀏覽器裡的工作台；
 * 左上角的 Claude Code 是不在執行路徑上的外部零件。
 * 互動：切換 view／build／serve 會換掉輸出層的內容與 CLI 上亮起的指令；「播放資料流」讓一個封包由下往上走過每一層；
 * 「組合」把各層收攏成一疊。位移全由 motion 驅動，prefers-reduced-motion 時直接跳到終點。
 */

const W = 320;
const D = 220;
const C = 0.866;
const OX = 400;
const T = 16; // 底板厚度
const TOP = 60;
const GAP = 74; // 分解時層距（壓低整張圖，讓圖與下方說明能同時看到）
const GAP_C = 20; // 組合時層距
const SPREAD = 16; // 選中時上下兩側各讓開
const LIFT = 10;
const LABEL_R = 716;
const LABEL_L = 204;

type Pt = [number, number];
type Box = [number, number, number, number];
const P = (u: number, v: number, oy: number, ox = OX): Pt => [ox + C * (u - v), oy + 0.5 * (u + v)];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const MATRIX = (oy: number, ox = OX) => `matrix(${C} 0.5 ${-C} 0.5 ${ox} ${oy})`;
const rect = ([u0, v0, u1, v1]: Box, oy: number, ox = OX): Pt[] => [P(u0, v0, oy, ox), P(u1, v0, oy, ox), P(u1, v1, oy, ox), P(u0, v1, oy, ox)];

/** 由下而上第 t 層（0–5）在分解狀態的 oy */
const oyOf = (t: number) => TOP + (5 - t) * GAP;
const BASE_OY = oyOf(0);
/** 組合狀態相對分解狀態的位移：收攏後整疊置中 */
const collapseOff = (t: number) => t * (GAP - GAP_C) - (5 * (GAP - GAP_C)) / 2;

/* Claude Code 衛星零件：自己的投影原點，浮在左上 */
const SAT_OX = 96;
const SAT_OY = 150;
const SAT_BOX: Box = [0, 0, 110, 80];

export type Mode = "view" | "build" | "serve";
const MODES: { id: Mode; cmd: string; hint: string }[] = [
  { id: "view", cmd: "view", hint: "即時編譯，含寫入 UI" },
  { id: "build", cmd: "build", hint: "輸出靜態網站" },
  { id: "serve", cmd: "serve", hint: "服務 build 結果並自動重新載入" },
];

type Link = { href: string; label: string };
type Layer = {
  ref: number;
  /** 由下而上第幾層；衛星零件為 -1 */
  tier: number;
  name: string;
  /** 這一層屬於哪裡：你的檔案／本機／build 期／瀏覽器／外部 */
  where: string;
  box: Box;
  anchor: [number, number];
  side: "l" | "r";
  lede: string | Record<Mode, string>;
  points: string[] | Record<Mode, string[]>;
  links: Link[];
  hl?: boolean;
};

// points 裡以 `…` 包起來的字顯示成程式碼
const LAYERS: Layer[] = [
  {
    ref: 10,
    tier: 0,
    name: "你的專案",
    where: "你的檔案",
    box: [0, 0, W, D],
    anchor: [W, 40],
    side: "r",
    lede: "筆記與所有設定都是你專案裡的檔案，跟著 git 走。",
    points: [
      "筆記資料夾（例如 `docs/`）：`.md`、`.mdx`，以及交給 Plugin 的 `.json` 資料檔",
      "`.notecraft/`：生成元件、已安裝的 Plugin、`plugins.json`、`series.json`；以執行指令時的目錄為準",
      "`.claude/`：`init-skill` 裝進來的 Skill 與 Subagent",
      "NoteCraftApp 本身不裝在這裡，專案不會多出 `node_modules`",
    ],
    links: [
      { href: "/docs/getting-started/project-structure/", label: "專案結構" },
      { href: "/docs/intro/concepts/", label: "核心概念" },
    ],
  },
  {
    ref: 12,
    tier: 1,
    name: "CLI notecraftapp",
    where: "本機",
    box: [40, 30, 300, 190],
    anchor: [300, 60],
    side: "r",
    lede: "把你的筆記資料夾交給 NoteCraftApp 這個 Astro 專案，再決定要即時編譯還是 build。",
    points: {
      view: [
        "`view` 啟動 `astro dev`，筆記改了存檔就重新編譯",
        "第一次執行某個版本時，把套件複製到 `~/.notecraft/app-<version>/` 並安裝一次相依",
        "以環境變數告訴 Astro 筆記資料夾與執行目錄在哪，筆記本身不會被複製",
        "`install-plugin` 與 `init-skill` 只寫檔進你的專案，不啟動伺服器",
      ],
      build: [
        "`build` 先比對上次 build 的時間、檔案數與版本，有變動才跑 `astro build`",
        "第一次執行某個版本時，把套件複製到 `~/.notecraft/app-<version>/` 並安裝一次相依",
        "以環境變數告訴 Astro 筆記資料夾與執行目錄在哪，筆記本身不會被複製",
        "`install-plugin` 與 `init-skill` 只寫檔進你的專案，不啟動伺服器",
      ],
      serve: [
        "`serve` 先確保 build 是最新的，再用 Node 服務 `dist/`，並監看檔案變動",
        "第一次執行某個版本時，把套件複製到 `~/.notecraft/app-<version>/` 並安裝一次相依",
        "以環境變數告訴 Astro 筆記資料夾與執行目錄在哪，筆記本身不會被複製",
        "`install-plugin` 與 `init-skill` 只寫檔進你的專案，不啟動伺服器",
      ],
    },
    links: [
      { href: "/docs/reference/cli/", label: "CLI" },
      { href: "/docs/advanced/internals/", label: "運作原理" },
    ],
  },
  {
    ref: 14,
    tier: 2,
    name: "Astro 建置管線",
    where: "build 期",
    box: [10, 10, 310, 210],
    anchor: [310, 60],
    side: "r",
    lede: "讀進筆記、轉成頁面，並在 build 期把工作台要用的索引算好。",
    points: [
      "Content Collections 讀進所有筆記；frontmatter 缺的欄位從 H1、檔名與檔案時間補上",
      "remark 外掛處理程式碼區塊、指令語法、相對路徑的圖片與部署子路徑",
      "`.mdx` 編譯成元件，筆記 import 的生成元件與 Plugin 渲染器一起打包",
      "預先算好 `/wb-index.json` 給 ⌘K 與 Drawer 延遲載入；產物含本機絕對路徑就讓 build 失敗",
    ],
    links: [
      { href: "/docs/writing/md-vs-mdx/", label: "Markdown 與 MDX" },
      { href: "/docs/getting-started/frontmatter/", label: "Frontmatter" },
    ],
  },
  {
    ref: 16,
    tier: 3,
    name: "生成元件與簡報",
    where: "你的檔案",
    box: [12, 20, 150, 200],
    anchor: [12, 180],
    side: "l",
    hl: true,
    lede: "`@ai-visualize` 標記與筆記轉簡報的產物，都是一般的 React `.tsx`。",
    points: [
      "放在 `.notecraft/components/<id>.tsx`，簡報是 `<slug>.deck.tsx`，筆記透過 `@notes/components/<id>` 引用",
      "build 把它們當普通元件編譯，不會再呼叫 AI",
      "只能 import 白名單裡的套件：`react`、`motion`、`recharts`、`d3` 等",
      "有互動的元件在瀏覽器 hydrate；純 SVG 的不載 JavaScript",
    ],
    links: [
      { href: "/docs/guides/ai-pipeline/", label: "生成流程" },
      { href: "/docs/guides/deck/", label: "生成一份簡報" },
    ],
  },
  {
    ref: 18,
    tier: 3,
    name: "Plugin 渲染器",
    where: "build 期",
    box: [170, 20, 308, 200],
    anchor: [308, 60],
    side: "r",
    lede: "把筆記資料夾裡的 JSON 資料檔畫成 `/view/…` 頁面，也能用 `<PluginView>` 嵌進筆記。",
    points: [
      "`plugins.json` 決定哪些檔案交給哪個 Plugin；一個檔命中多條規則時第一條勝",
      "build 時以 Plugin 的 `schema.json` 驗證資料；Plugin 沒裝、JSON 壞掉、不符 schema 都讓 build 失敗",
      "資料內嵌成頁面的 props，渲染器在瀏覽器執行，沒有 API 可呼叫",
      "停用的 Plugin 等同不存在；壞掉時先停用，站一樣 build 得出來",
    ],
    links: [
      { href: "/docs/guides/plugin-mapping/", label: "映射規則" },
      { href: "/docs/advanced/plugin-dev/", label: "開發自己的 Plugin" },
    ],
  },
  {
    ref: 20,
    tier: 4,
    name: "輸出",
    where: "本機",
    box: [20, 20, 300, 200],
    anchor: [300, 60],
    side: "r",
    lede: {
      view: "`astro dev` 即時編譯，存檔就更新畫面，不寫出任何檔案。",
      build: "靜態網站寫到 `~/.notecraft/cache/<hash>/dist/`，並以 pagefind 建全文索引。",
      serve: "用 Node 服務 build 好的 `dist/`；筆記一改就在背景重新 build，再通知頁面重新整理。",
    },
    points: {
      view: [
        "只有 `view` 有寫入 UI：新增筆記、改標籤、刪除筆記都經 dev-only API 寫回你的檔案",
        "dev API 只綁定 `localhost`，build 的產物裡沒有它",
        "沒有 pagefind 索引，⌘K 比對標題、路徑與標籤",
      ],
      build: [
        "沒有伺服器端程式、沒有執行期 API，整個 `dist/` 可以放上任何靜態主機",
        "筆記、設定與 Plugin 都沒變動時，沿用上次的產物",
        "部署到子路徑時以 `NOTECRAFT_BASE` 指定",
      ],
      serve: [
        "沿用 `build` 的快取與重新 build 規則",
        "背景 build 成功後以 SSE 通知已開啟的頁面重新整理；`--no-watch` 回到純靜態",
        "和 `build` 一樣唯讀，沒有寫入 UI",
      ],
    },
    links: [
      { href: "/docs/guides/editing/", label: "在介面新增與編輯" },
      { href: "/docs/guides/live-preview/", label: "即時預覽" },
      { href: "/docs/guides/deploy/", label: "部署" },
    ],
  },
  {
    ref: 22,
    tier: 5,
    name: "瀏覽器裡的工作台",
    where: "瀏覽器",
    box: [0, 0, W, D],
    anchor: [W, 40],
    side: "r",
    lede: "Rail、Sidebar 與主區組成的三欄殼，大部分在 build 期就畫好，只有要互動的部分在瀏覽器執行。",
    points: [
      "儀表板、頁籤列、⌘K 面板、生成元件與 Plugin 渲染器是各自 hydrate 的 React island",
      "閱讀進度、頁籤、收藏與偏好存在瀏覽器的 localStorage，不寫回檔案",
      "「本週更新」這類相對今天的數字，在瀏覽器以當地時區計算",
      "換頁時只有主區換場，Rail 與 Sidebar 留在原位",
    ],
    links: [
      { href: "/docs/guides/workbench/", label: "介面總覽" },
      { href: "/docs/guides/series/", label: "系列與閱讀進度" },
    ],
  },
  {
    ref: 24,
    tier: -1,
    name: "Claude Code",
    where: "外部",
    box: SAT_BOX,
    anchor: [0, 0],
    side: "l",
    lede: "AI 生成只發生在你本機的 Claude Code 對話裡，不在其他任何一層。",
    points: [
      "`init-skill` 把 Skill 與 Subagent 裝進 `.claude/`",
      "你說「處理這個標記」或「轉成簡報」，Subagent 依序掃描、規劃、寫元件，驗證通過才寫回筆記",
      "產物寫進 `.notecraft/components/`，和筆記一起 commit",
      "build、serve 與部署都不呼叫 AI，也不需要 API 金鑰",
    ],
    links: [
      { href: "/docs/guides/ai-pipeline/", label: "生成流程" },
      { href: "/docs/advanced/skills/", label: "自訂 Skill 與 Subagent" },
    ],
  },
];

const byRef = (r: number) => LAYERS.find((l) => l.ref === r)!;

/* 資料流：一篇筆記由下往上走過的六站 */
const FLOW_REFS = [10, 12, 14, 16, 20, 22];
const FLOW: Record<Mode, string[]> = {
  view: [
    "你存檔了 `guides/oauth.mdx`。",
    "`view` 早已啟動 `astro dev`，筆記資料夾就是它的內容來源。",
    "dev server 發現變動，只重新編譯這一篇。",
    "筆記 import 的 `oauth-flow.tsx` 一起編譯進來。",
    "瀏覽器透過 HMR 收到更新，不用手動重新整理。",
    "工作台換上新內容。你在介面改標籤時，dev API 再把它寫回檔案。",
  ],
  build: [
    "`build` 掃過筆記資料夾與 `.notecraft/`，和上次 build 比對時間與檔案數。",
    "有變動，CLI 在 `~/.notecraft/app-<version>/` 跑 `astro build`。",
    "每篇筆記編譯成 HTML，`/wb-index.json`、標籤與系列統計一次算好。",
    "生成元件與 Plugin 渲染器打包成瀏覽器端的 chunk。",
    "產物寫進 `dist/`，pagefind 為全文搜尋建索引。",
    "把 `dist/` 放上靜態主機，讀者的瀏覽器打開就是完整的工作台。",
  ],
  serve: [
    "`serve` 開著時，你改了一篇筆記。",
    "CLI 監看到變動，在背景重新 build。",
    "照 `build` 的流程重新編譯整站。",
    "生成元件與 Plugin 渲染器一起重新打包。",
    "新的 `dist/` 換上去，SSE 通知已開啟的頁面。",
    "頁面自動重新整理，看到新內容。",
  ],
};
const STEP_MS = 2100;
const MODE_NOTE: Record<Mode, string> = {
  view: "即時編譯、存檔即更新，只有這個模式有寫入 UI。用資料流的 ‹ ▶ › 看一篇筆記怎麼走到畫面上。",
  build: "輸出靜態網站到 `dist/`，含 pagefind 全文索引。用資料流的 ‹ ▶ › 看一篇筆記怎麼走到畫面上。",
  serve: "服務 build 好的 `dist/`，筆記一改就背景重新 build 並自動重新整理。用資料流的 ‹ ▶ › 看一篇筆記怎麼走到畫面上。",
};

/* ── 各層的線稿（平面座標，畫在 MATRIX 裡）── */
function Txt({ x, y, children, cls = "" }: { x: number; y: number; children: ReactNode; cls?: string }) {
  return (
    <text x={x} y={y} className={`ax-ptext ${cls}`}>
      {children}
    </text>
  );
}

function Folder({ box, label, on }: { box: Box; label: string; on?: boolean }) {
  const [u0, v0, u1, v1] = box;
  return (
    <>
      <path d={`M${u0} ${v0 + 6} V${v0} H${u0 + 34} L${u0 + 40} ${v0 + 6} H${u1} V${v1} H${u0} Z`} className={on ? "ax-mark" : "ax-ink"} />
      <Txt x={u0 + 6} y={v0 + 18} cls="ax-ptext-b">
        {label}
      </Txt>
    </>
  );
}

function Art({ refNo, mode }: { refNo: number; mode: Mode }) {
  switch (refNo) {
    case 10:
      return (
        <>
          <Folder box={[166, 12, 308, 208]} label="docs/" />
          {[36, 58, 80, 102, 124].map((v, i) => (
            <g key={v}>
              <rect x={176 + (i % 3 === 2 ? 12 : 0)} y={v} width={10} height={12} className={i === 1 ? "ax-mark ax-fill" : "ax-ink"} />
              <line x1={192 + (i % 3 === 2 ? 12 : 0)} y1={v + 6} x2={[262, 292, 280, 250, 286][i]} y2={v + 6} className="ax-ink" />
            </g>
          ))}
          <Txt x={178} y={160}>
            *.md · *.mdx
          </Txt>
          <Txt x={178} y={180}>
            *.json
          </Txt>
          <Folder box={[12, 12, 150, 100]} label=".claude/" />
          <Txt x={22} y={52}>
            skills/
          </Txt>
          <Txt x={22} y={72}>
            agents/
          </Txt>
          <Folder box={[12, 112, 150, 208]} label=".notecraft/" />
          <Txt x={22} y={150}>
            components/
          </Txt>
          <Txt x={22} y={168}>
            plugins/
          </Txt>
          <Txt x={22} y={186}>
            plugins.json
          </Txt>
          <Txt x={22} y={204} cls="ax-ptext-s">
            series.json
          </Txt>
        </>
      );
    case 12: {
      const chips: { id: string; box: Box }[] = [
        { id: "view", box: [52, 98, 100, 116] },
        { id: "build", box: [108, 98, 158, 116] },
        { id: "serve", box: [166, 98, 216, 116] },
        { id: "install-plugin", box: [52, 126, 150, 144] },
        { id: "init-skill", box: [158, 126, 230, 144] },
      ];
      return (
        <>
          <line x1={40} y1={46} x2={300} y2={46} className="ax-ink" />
          {[50, 60, 70].map((u) => (
            <circle key={u} cx={u} cy={38} r={2.6} className="ax-ink" />
          ))}
          <Txt x={52} y={74} cls="ax-ptext-b">
            {`$ npx notecraftapp ${mode}`}
          </Txt>
          {chips.map((c) => {
            const [u0, v0, u1, v1] = c.box;
            const on = c.id === mode;
            return (
              <g key={c.id}>
                <rect x={u0} y={v0} width={u1 - u0} height={v1 - v0} className={on ? "ax-mark ax-fill" : "ax-ink"} />
                <Txt x={u0 + 5} y={v1 - 5} cls={on ? "ax-ptext-b" : ""}>
                  {c.id}
                </Txt>
              </g>
            );
          })}
          <Txt x={52} y={176} cls="ax-ptext-s">
            ~/.notecraft/app-&lt;ver&gt;/
          </Txt>
        </>
      );
    }
    case 14: {
      const stages: { u: number; w: number; label: string }[] = [
        { u: 22, w: 62, label: "content" },
        { u: 98, w: 58, label: "remark" },
        { u: 170, w: 50, label: "mdx" },
        { u: 234, w: 66, label: "index" },
      ];
      return (
        <>
          {stages.map((s, i) => (
            <g key={s.label}>
              <rect x={s.u} y={56} width={s.w} height={44} className={i === 2 ? "ax-mark ax-fill" : "ax-ink"} />
              <Txt x={s.u + 6} y={83}>
                {s.label}
              </Txt>
              {i < stages.length - 1 && (
                <>
                  <line x1={s.u + s.w} y1={78} x2={stages[i + 1].u} y2={78} className="ax-ink" />
                  <path d={`M${stages[i + 1].u - 5} 74 L${stages[i + 1].u} 78 L${stages[i + 1].u - 5} 82`} className="ax-ink" />
                </>
              )}
            </g>
          ))}
          <Txt x={22} y={36} cls="ax-ptext-b">
            astro
          </Txt>
          <rect x={22} y={124} width={140} height={60} className="ax-ink ax-dash" />
          <Txt x={30} y={146}>
            @notes →
          </Txt>
          <Txt x={30} y={166}>
            .notecraft/
          </Txt>
          <path d="M190 124 L242 124 L248 150 Q246 172 216 186 Q186 172 184 150 Z" className="ax-ink" transform="translate(32 0)" />
          <path d="M236 152 l8 8 l14 -16" className="ax-mark" />
          <Txt x={196} y={204} cls="ax-ptext-s">
            無本機路徑
          </Txt>
        </>
      );
    }
    case 16:
      return (
        <>
          <rect x={26} y={34} width={110} height={88} className="ax-ink" />
          <line x1={26} y1={46} x2={136} y2={46} className="ax-ink" />
          <rect x={36} y={62} width={22} height={16} className="ax-ink" />
          <rect x={70} y={62} width={22} height={16} className="ax-mark ax-fill" />
          <rect x={104} y={62} width={22} height={16} className="ax-ink" />
          <line x1={58} y1={70} x2={70} y2={70} className="ax-ink" />
          <line x1={92} y1={70} x2={104} y2={70} className="ax-ink" />
          <line x1={36} y1={104} x2={126} y2={104} className="ax-ink" />
          <circle cx={92} cy={104} r={4} className="ax-mark ax-fill" />
          <Txt x={26} y={146}>
            &lt;id&gt;.tsx
          </Txt>
          <Txt x={26} y={168}>
            &lt;slug&gt;.deck.tsx
          </Txt>
          <Txt x={26} y={190} cls="ax-ptext-s">
            components/
          </Txt>
        </>
      );
    case 18:
      return (
        <>
          <path d="M190 36 Q182 36 182 44 V62 Q182 68 176 68 Q182 68 182 74 V92 Q182 100 190 100" className="ax-ink" />
          {[48, 60, 72, 84].map((v, i) => (
            <line key={v} x1={192 + (i % 2) * 6} y1={v} x2={[226, 236, 222, 232][i]} y2={v} className="ax-ink" />
          ))}
          <line x1={240} y1={68} x2={256} y2={68} className="ax-ink" />
          <path d="M251 64 L256 68 L251 72" className="ax-ink" />
          <rect x={258} y={46} width={40} height={44} className="ax-ink" />
          <path d="M266 68 l7 7 l14 -16" className="ax-mark" />
          <rect x={182} y={116} width={116} height={30} className="ax-mark" />
          <line x1={182} y1={126} x2={298} y2={126} className="ax-mark" />
          <Txt x={188} y={141}>
            renderer.tsx
          </Txt>
          <Txt x={182} y={170}>
            plugins.json
          </Txt>
          <Txt x={182} y={190} cls="ax-ptext-s">
            schema.json
          </Txt>
        </>
      );
    case 20:
      return (
        <AnimatePresence mode="wait" initial={false}>
          <motion.g key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {mode === "view" && (
              <>
                <rect x={36} y={36} width={120} height={70} className="ax-ink" />
                <path d="M92 48 L80 72 H94 L86 96 L108 66 H94 L102 48 Z" className="ax-mark ax-fill" />
                <Txt x={42} y={126} cls="ax-ptext-b">
                  astro dev
                </Txt>
                <rect x={176} y={36} width={108} height={70} className="ax-ink ax-dash" />
                <Txt x={184} y={60}>
                  dev API
                </Txt>
                <Txt x={184} y={80} cls="ax-ptext-s">
                  /api/notes
                </Txt>
                <Txt x={184} y={96} cls="ax-ptext-s">
                  /api/tags
                </Txt>
                <path d="M36 160 q14 -16 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" className="ax-ink" />
                <Txt x={36} y={190} cls="ax-ptext-s">
                  HMR
                </Txt>
              </>
            )}
            {mode === "build" && (
              <>
                {[0, 1, 2].map((k) => (
                  <rect key={k} x={36 + k * 8} y={36 + k * 8} width={110} height={120} className={k === 2 ? "ax-mark" : "ax-ink"} style={{ fill: "var(--paper)" }} />
                ))}
                {[70, 86, 102, 118].map((v) => (
                  <line key={v} x1={62} y1={v} x2={[140, 126, 134, 116][(v - 70) / 16]} y2={v} className="ax-ink" />
                ))}
                <Txt x={62} y={146} cls="ax-ptext-b">
                  dist/
                </Txt>
                <circle cx={226} cy={86} r={30} className="ax-ink" />
                <line x1={248} y1={108} x2={274} y2={134} className="ax-ink ax-thick" />
                <Txt x={194} y={168}>
                  pagefind/
                </Txt>
              </>
            )}
            {mode === "serve" && (
              <>
                {[0, 1].map((k) => (
                  <rect key={k} x={36 + k * 8} y={36 + k * 8} width={96} height={120} className={k === 1 ? "ax-mark" : "ax-ink"} style={{ fill: "var(--paper)" }} />
                ))}
                <Txt x={54} y={146} cls="ax-ptext-b">
                  dist/
                </Txt>
                <rect x={160} y={36} width={124} height={56} className="ax-ink" />
                {[50, 64, 78].map((v) => (
                  <g key={v}>
                    <line x1={168} y1={v} x2={250} y2={v} className="ax-ink" />
                    <circle cx={270} cy={v} r={2.4} className="ax-mark ax-fill" />
                  </g>
                ))}
                <Txt x={160} y={110}>
                  node http
                </Txt>
                {[128, 144, 160].map((v, i) => (
                  <path key={v} d={`M${170 + i * 8} ${v + 12} q${50 - i * 8} -${18 - i * 3} ${100 - i * 16} 0`} className="ax-ink" />
                ))}
                <Txt x={160} y={194} cls="ax-ptext-s">
                  SSE reload
                </Txt>
              </>
            )}
          </motion.g>
        </AnimatePresence>
      );
    case 22:
      return (
        <>
          <rect x={0} y={0} width={22} height={D} className="ax-ink" />
          {[30, 54, 78].map((v, i) => (
            <rect key={v} x={6} y={v - 5} width={10} height={10} className={i === 0 ? "ax-mark ax-fill" : "ax-ink"} />
          ))}
          <rect x={22} y={0} width={70} height={D} className="ax-ink" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={30 + (i % 3) * 7} y1={24 + i * 18} x2={84} y2={24 + i * 18} className="ax-ink" />
          ))}
          <rect x={30} y={140} width={54} height={6} className="ax-ink" />
          <rect x={30} y={140} width={34} height={6} className="ax-mark ax-fill" />
          {[92, 140, 188].map((u, i) => (
            <rect key={u} x={u + 4} y={3} width={42} height={10} className={i === 1 ? "ax-mark ax-fill" : "ax-ink"} />
          ))}
          <line x1={92} y1={16} x2={W} y2={16} className="ax-ink" />
          <line x1={92} y1={28} x2={W} y2={28} className="ax-ink" />
          <rect x={102} y={38} width={96} height={56} className="ax-ink" />
          <rect x={206} y={38} width={104} height={56} className="ax-ink" />
          {[22, 34, 18, 40, 30, 46].map((h, i) => (
            <rect key={i} x={112 + i * 13} y={88 - h} width={8} height={h} className={i === 5 ? "ax-mark ax-fill" : "ax-ink"} />
          ))}
          <circle cx={258} cy={66} r={18} className="ax-ink" />
          <path d="M258 48 A18 18 0 0 1 274 74" className="ax-mark ax-thick" />
          <rect x={102} y={104} width={208} height={50} className="ax-ink" />
          {[116, 130, 144].map((v) => (
            <line key={v} x1={112} y1={v} x2={290} y2={v} className="ax-ink" />
          ))}
          <rect x={102} y={166} width={208} height={44} className="ax-ink ax-dash" />
          <Txt x={110} y={192}>
            localStorage
          </Txt>
        </>
      );
    case 24:
      return (
        <>
          <path d="M22 14 L26 26 L38 30 L26 34 L22 46 L18 34 L6 30 L18 26 Z" className="ax-mark ax-fill" />
          <Txt x={46} y={26} cls="ax-ptext-b">
            Claude
          </Txt>
          <Txt x={46} y={42} cls="ax-ptext-b">
            Code
          </Txt>
          {[14, 30, 46, 62, 78, 94].map((u, i) => (
            <g key={u}>
              <circle cx={u} cy={64} r={4.5} className={i === 2 ? "ax-mark ax-fill" : "ax-ink"} />
              {i < 5 && <line x1={u + 4.5} y1={64} x2={u + 11.5} y2={64} className="ax-ink" />}
            </g>
          ))}
        </>
      );
    default:
      return null;
  }
}

/* `…` 包住的字輸出成 <code> */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((p, i) => {
        if (!(p.startsWith("`") && p.endsWith("`"))) return p;
        const code = p.slice(1, -1);
        return (
          <code key={i} className={code.length <= 16 ? "ax-nw" : undefined}>
            {code}
          </code>
        );
      })}
    </>
  );
}

type Props = { base?: string; initial?: number };

export default function ArchExplode({ base = "/", initial = 14 }: Props) {
  const [mode, setMode] = useState<Mode>("build");
  const [active, setActive] = useState<number>(initial);
  const [hover, setHover] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [step, setStep] = useState<number | null>(null); // 資料流停在第幾站；null 表示不在資料流裡
  const [auto, setAuto] = useState(false); // 自動往下一站
  const [entered, setEntered] = useState(false);
  const uid = useId();
  const drawing = useRef<HTMLDivElement>(null);
  const inView = useInView(drawing, { once: true, amount: 0.2 });
  const still = useReducedMotion() ?? false;

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setEntered(true), still ? 0 : 1300);
    return () => clearTimeout(t);
  }, [inView, still]);

  // 到站就選中那一層
  useEffect(() => {
    if (step !== null) setActive(FLOW_REFS[step]);
  }, [step]);

  // 自動播放：每一站停 STEP_MS，走完停在最後一站
  useEffect(() => {
    if (!auto || step === null) return;
    if (step >= FLOW_REFS.length - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => setStep(step + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [auto, step]);

  const playing = step !== null;
  const activeLayer = byRef(active);
  const ai = activeLayer.tier;
  const lit = hover ?? active;
  // 資料流在第 4 站時，同一層的 Plugin 渲染器也一起亮
  const alsoLit = playing && FLOW_REFS[step!] === 16 ? 18 : null;
  const href = (h: string) => base.replace(/\/$/, "") + h;

  const offsetOf = (l: Layer) => {
    if (l.tier < 0) return active === l.ref ? -LIFT : 0;
    let y = collapsed ? collapseOff(l.tier) : 0;
    if (!collapsed && ai >= 0) y += l.tier > ai ? -SPREAD : l.tier < ai ? SPREAD : 0;
    if (active === l.ref) y -= collapsed ? LIFT / 2 : LIFT;
    return y;
  };
  const spring: Transition = still ? { duration: 0 } : { type: "spring", stiffness: 210, damping: 26, mass: 0.9 };
  const enterT = (t: number): Transition => (still || entered ? spring : { ...spring, delay: 0.12 + Math.max(t, 0) * 0.08 });

  const leaveFlow = () => {
    setAuto(false);
    setStep(null);
  };
  const select = (r: number) => {
    leaveFlow();
    setActive(r);
  };
  // 切換執行方式時留在同一站，旁白換成該模式的版本
  const changeMode = (m: Mode) => {
    setAuto(false);
    setMode(m);
  };
  const last = FLOW_REFS.length - 1;
  /** 手動上一站／下一站：停掉自動播放 */
  const stepBy = (d: number) => {
    setAuto(false);
    setCollapsed(false);
    setStep((s) => (s === null ? (d > 0 ? 0 : last) : Math.min(last, Math.max(0, s + d))));
  };
  const toggleAuto = () => {
    if (auto) return setAuto(false);
    setCollapsed(false);
    setStep((s) => (s === null || s >= last ? 0 : s));
    setAuto(true);
  };

  // 封包：停在當站那一層平面的中心，跟著那一層的位移
  const flowLayer = playing ? byRef(FLOW_REFS[step!]) : null;
  const packet = flowLayer ? (() => {
    const [x, y] = P(160, 110, oyOf(flowLayer.tier));
    return { x, y: y + offsetOf(flowLayer) - 8 };
  })() : null;

  // 跨層的連線（要跟著兩端的層移動，所以算出 d 交給 motion 補間）
  const L10 = byRef(10);
  const L22 = byRef(22);
  const L24 = byRef(24);
  const satFrom = P(SAT_BOX[2], SAT_BOX[3], SAT_OY + offsetOf(L24), SAT_OX);
  const satTo = P(14, 196, BASE_OY + offsetOf(L10));
  const satD = `M${satFrom[0].toFixed(1)} ${satFrom[1].toFixed(1)} Q 120 ${(satTo[1] - 40).toFixed(1)} ${satTo[0].toFixed(1)} ${satTo[1].toFixed(1)}`;
  const wbTop = P(W, 150, oyOf(5) + offsetOf(L22));
  const wbBot = P(W, 150, BASE_OY + offsetOf(L10));
  const wbX = 690;
  const wbD = `M${wbTop[0].toFixed(1)} ${wbTop[1].toFixed(1)} H ${wbX} V ${wbBot[1].toFixed(1)} H ${(wbBot[0] + 6).toFixed(1)}`;
  const showWb = mode === "view" && !collapsed;

  const lede = typeof activeLayer.lede === "string" ? activeLayer.lede : activeLayer.lede[mode];
  const points = Array.isArray(activeLayer.points) ? activeLayer.points : activeLayer.points[mode];

  // 畫的順序：衛星先畫，主疊由下而上（上層遮下層）
  const drawOrder = [L24, ...LAYERS.filter((l) => l.tier >= 0)];

  return (
    <figure className="ax" aria-labelledby={`${uid}-cap`}>
      <div className="ax-bar">
        <div className="ax-modes" role="group" aria-label="執行方式">
          {MODES.map((m) => (
            <button key={m.id} type="button" className={`ax-mode${mode === m.id ? " is-on" : ""}`} aria-pressed={mode === m.id} onClick={() => changeMode(m.id)} title={m.hint}>
              {m.cmd}
            </button>
          ))}
        </div>
        <div className="ax-actions">
          <button type="button" className="ax-act" aria-pressed={collapsed} onClick={() => (leaveFlow(), setCollapsed((c) => !c))}>
            <span aria-hidden="true">{collapsed ? "⇕" : "⇣"}</span>
            {collapsed ? "分解" : "組合"}
          </button>
        </div>
      </div>

      {/* 三欄：左＝資料流控制與符號說明、中＝圖、右＝旁白與說明。窄時圖在上、左右兩欄排到圖下方 */}
      <div className="ax-grid">
        <div className="ax-left">
          <div className="ax-player" role="group" aria-label="資料流">
            <span className="ax-player-label">
              資料流<b>{playing ? `${step! + 1}／${FLOW_REFS.length}` : `— ／${FLOW_REFS.length}`}</b>
            </span>
            <div className="ax-player-btns">
              <button type="button" onClick={() => stepBy(-1)} disabled={step === 0} aria-label="上一站">
                ‹
              </button>
              <button type="button" className={`ax-player-play${auto ? " is-on" : ""}`} onClick={toggleAuto} aria-label={auto ? "暫停" : "自動播放"} aria-pressed={auto}>
                {auto ? "❚❚" : "▶"}
              </button>
              <button type="button" onClick={() => stepBy(1)} disabled={step === last} aria-label="下一站">
                ›
              </button>
              {playing && (
                <button type="button" className="ax-player-x" onClick={leaveFlow} aria-label="結束資料流">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="ax-legend" role="group" aria-label="符號說明：選一個部件看說明">
            {LAYERS.map((l) => (
              <button
                key={l.ref}
                type="button"
                className={`ax-item${active === l.ref ? " is-active" : ""}`}
                aria-pressed={active === l.ref}
                aria-controls={`${uid}-panel`}
                onClick={() => select(l.ref)}
                onMouseEnter={() => setHover(l.ref)}
                onMouseLeave={() => setHover(null)}
                title={l.name}
              >
                <span className="ref">{l.ref}</span>
                <span className="ax-item-name">{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ax-drawing" ref={drawing}>
          <svg
            viewBox="14 36 752 700"
            className="ax-svg"
            role="img"
            aria-label="NoteCraftApp 系統架構的爆炸圖：由下而上是你的專案、CLI、Astro 建置管線、生成元件與 Plugin 渲染器、輸出、瀏覽器裡的工作台；左上角是不在執行路徑上的 Claude Code"
          >
            <defs>
              <marker id={`${uid}-ah`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" className="ax-ah" />
              </marker>
            </defs>

            {/* Claude Code → .notecraft/：只在你本機對話時寫檔 */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: inView && !collapsed ? 1 : 0 }} transition={{ duration: still ? 0 : 0.3, delay: entered ? 0 : 1 }} aria-hidden="true">
              <motion.path className="ax-link" d={satD} animate={{ d: satD }} transition={spring} markerEnd={`url(#${uid}-ah)`} />
              <text x={34} y={satFrom[1] + 64} className="ax-note">
                寫入元件
              </text>
              <text x={34} y={satFrom[1] + 82} className="ax-note">
                不在 build 裡
              </text>
            </motion.g>

            {/* view 的寫入 UI：工作台經 dev API 寫回你的檔案 */}
            <motion.g initial={false} animate={{ opacity: inView && showWb ? 1 : 0 }} transition={{ duration: still ? 0 : 0.3 }} aria-hidden="true">
              <motion.path className="ax-link ax-link-wb" d={wbD} animate={{ d: wbD }} transition={spring} markerEnd={`url(#${uid}-ah)`} />
              <text x={wbX + 8} y={(wbTop[1] + wbBot[1]) / 2} className="ax-note ax-note-v">
                dev API 寫回
              </text>
            </motion.g>

            {drawOrder.map((l) => {
              const sat = l.tier < 0;
              const oy = sat ? SAT_OY : oyOf(l.tier);
              const ox = sat ? SAT_OX : OX;
              const outline = rect(l.box, oy, ox);
              const y = offsetOf(l);
              const entryY = sat ? -40 : (BASE_OY - oy) * 0.8;
              const isActive = active === l.ref;
              const isLit = lit === l.ref || alsoLit === l.ref;
              const [ax, ay] = sat ? P(0, 0, oy, ox) : P(l.anchor[0], l.anchor[1], oy);
              const lx = sat ? 40 : l.side === "r" ? LABEL_R : LABEL_L;
              const ly = sat ? oy - 26 : ay + (l.side === "l" ? 4 : 0);
              const x2 = l.side === "r" && !sat ? lx - 14 : lx + 14;
              const mid = ax + (x2 - ax) * 0.55;
              return (
                <motion.g
                  key={l.ref}
                  className={`ax-part${isActive ? " is-active" : ""}${isLit ? " is-lit" : ""}${!isLit && lit !== l.ref ? " is-dim" : ""}${l.hl ? " is-hl" : ""}`}
                  initial={{ opacity: 0, y: entryY }}
                  animate={inView ? { opacity: 1, y } : { opacity: 0, y: entryY }}
                  transition={enterT(l.tier)}
                  onClick={() => select(l.ref)}
                  onMouseEnter={() => setHover(l.ref)}
                  onMouseLeave={() => setHover(null)}
                >
                  {l.ref === 10 && (
                    <>
                      <polygon className="ax-face ax-side" points={pts([P(0, D, oy), P(W, D, oy), [P(W, D, oy)[0], P(W, D, oy)[1] + T], [P(0, D, oy)[0], P(0, D, oy)[1] + T]])} />
                      <polygon className="ax-face ax-side" points={pts([P(W, 0, oy), P(W, D, oy), [P(W, D, oy)[0], P(W, D, oy)[1] + T], [P(W, 0, oy)[0], P(W, 0, oy)[1] + T]])} />
                    </>
                  )}
                  <polygon points={pts(outline)} className="ax-face" />
                  <g transform={MATRIX(oy, ox)} className="ax-plane">
                    <Art refNo={l.ref} mode={mode} />
                  </g>
                  <polygon points={pts(outline)} className="ax-edge" />
                  <motion.g className="ax-leader" aria-hidden="true" initial={false} animate={{ opacity: collapsed && !sat ? 0 : 1 }} transition={{ duration: still ? 0 : 0.2 }}>
                    {sat ? (
                      <path d={`M${ax} ${ay} L ${lx + 14} ${ly}`} className="ax-leader-line" />
                    ) : (
                      <path d={`M${ax} ${ay} Q ${mid} ${ay} ${x2} ${ly}`} className="ax-leader-line" />
                    )}
                    <circle cx={ax} cy={ay} r={3.2} className="ax-leader-dot" />
                    <rect x={l.side === "r" && !sat ? lx - 6 : lx - 50} y={ly - 22} width={56} height={44} className="ax-hit" />
                    <text x={lx} y={ly + 10} className="ax-num" textAnchor={l.side === "r" && !sat ? "start" : "end"}>
                      {l.ref}
                    </text>
                  </motion.g>
                </motion.g>
              );
            })}

            {/* 資料流的封包 */}
            <AnimatePresence>
              {packet && (
                <motion.g
                  key="packet"
                  className="ax-packet"
                  aria-hidden="true"
                  initial={{ opacity: 0, x: packet.x, y: packet.y + 40 }}
                  animate={{ opacity: 1, x: packet.x, y: packet.y }}
                  exit={{ opacity: 0, transition: { duration: still ? 0 : 0.25 } }}
                  transition={still ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 18 }}
                >
                  {!still && <motion.circle r={18} className="ax-packet-ring" animate={{ scale: [0.6, 1.4], opacity: [0.7, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} />}
                  <g transform="scale(1.5)">
                    <path d="M-8 -11 H4 L9 -6 V11 H-8 Z" className="ax-packet-doc" />
                    <path d="M4 -11 V-6 H9" className="ax-packet-fold" />
                    <line x1={-4} y1={-1} x2={5} y2={-1} className="ax-packet-fold" />
                    <line x1={-4} y1={4} x2={3} y2={4} className="ax-packet-fold" />
                  </g>
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>

        <div className="ax-right">
          {/* 資料流的旁白；不播放時說明目前的執行方式 */}
          <div className={`ax-flow${playing ? " is-on" : ""}`} aria-live="polite">
            <div className="ax-flow-head">
              <span>{playing ? `資料流 · ${mode}` : `npx notecraftapp ${mode}`}</span>
              <span className="ax-flow-dots" aria-hidden="true">
                {FLOW_REFS.map((r, i) => (
                  <i key={r} className={playing && i <= step! ? "is-on" : undefined} />
                ))}
              </span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={playing ? `${mode}-${step}` : mode}
                className="ax-flow-text"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: still ? 0 : 0.2 }}
              >
                <Inline text={playing ? FLOW[mode][step!] : MODE_NOTE[mode]} />
              </motion.p>
            </AnimatePresence>
          </div>

          <section className="ax-panel" id={`${uid}-panel`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${active}-${mode}`}
                className="ax-panel-body"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: still ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="ax-title">
                  <span className="ref">{activeLayer.ref}</span>
                  {activeLayer.name}
                  <span className="ax-where">{activeLayer.where}</span>
                </h3>
                <p className="ax-lede">
                  <Inline text={lede} />
                </p>
                <ul className="ax-points">
                  {points.map((p) => (
                    <li key={p}>
                      <Inline text={p} />
                    </li>
                  ))}
                </ul>
                <p className="ax-links">
                  {activeLayer.links.map((k) => (
                    <a key={k.href} href={href(k.href)}>
                      {k.label}
                    </a>
                  ))}
                </p>
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </div>

      <figcaption id={`${uid}-cap`} className="ax-caption">
        NoteCraftApp 系統架構的爆炸圖：由下而上是你的專案、CLI、Astro 建置管線、生成元件與 Plugin 渲染器、輸出與瀏覽器裡的工作台；Claude Code 在執行路徑之外。切換上方的執行方式看輸出層怎麼變；用「資料流」的 ‹ ▶ › 一站一站看一篇筆記怎麼往上走。
      </figcaption>
    </figure>
  );
}
