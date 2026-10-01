import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/*
 * 實施方式的工作台導覽：從「你想做的事」選一個畫面，畫面依步驟平移放大到該區域並壓暗其餘部分。
 * 步驟會自己往下走（每步一條進度條）；滑過、聚焦或點擊就停，捲出畫面也停；減少動態時不自動播放、不做平移動畫。
 * 區域座標以 1600×1000 的截圖為準（plates/*.webp 都是 1440×900 的畫面放大到 1600 寬）。
 */

type Step = { ref: number; name: string; text: string; box: [number, number, number, number] };
type Scene = { fig: number; id: string; intent: string; title: string; path: string; demoPath: string; steps: Step[] };

export const SCENES: Scene[] = [
  {
    fig: 5,
    id: "dashboard",
    intent: "一眼看完所有筆記的狀態",
    title: "儀表板",
    path: "/",
    demoPath: "",
    steps: [
      { ref: 70, name: "筆記總數與閱讀狀態", text: "幾篇讀完、幾篇讀到一半、幾篇還沒開始，環形圖一眼看完。", box: [349, 176, 216, 244] },
      { ref: 72, name: "寫作頻率", text: "最近 8／12／16 週每週寫了幾篇，依閱讀狀態分段。", box: [1027, 176, 549, 246] },
      { ref: 74, name: "系列進度", text: "每個系列讀到第幾篇，按一下就接著讀下一篇。", box: [762, 435, 400, 316] },
      { ref: 76, name: "標籤分布", text: "標籤越常用，方塊越大；點方塊就篩出那個標籤的筆記。", box: [762, 765, 400, 214] },
    ],
  },
  {
    fig: 6,
    id: "notes-list",
    intent: "在一大堆筆記裡找到要的那篇",
    title: "筆記列表",
    path: "/notes",
    demoPath: "notes/",
    steps: [
      { ref: 78, name: "資料夾樹", text: "左邊就是你的真實資料夾，不限層數，筆記不必搬家。", box: [58, 88, 262, 540] },
      { ref: 80, name: "分組切換", text: "依資料夾、系列、標籤或月份分組；篩選都寫在網址上，可以直接分享。", box: [330, 150, 480, 50] },
      { ref: 82, name: "AI 生成狀態", text: "每篇有幾個 @ai-visualize 標記已生成、還有幾個在等，看這一欄。", box: [1376, 232, 106, 760] },
    ],
  },
  {
    fig: 7,
    id: "notes-drawer",
    intent: "先看摘要再決定要不要讀",
    title: "Drawer 預覽",
    path: "/notes",
    demoPath: "notes/",
    steps: [
      { ref: 84, name: "選中的列", text: "在列表上單擊一篇，不用離開列表。", box: [324, 276, 744, 44] },
      { ref: 86, name: "預覽抽屜", text: "右側滑出摘要、Metadata 與 @ai-visualize 標記；雙擊才真的打開筆記。", box: [1072, 48, 520, 300] },
      { ref: 88, name: "同系列章節", text: "這篇是哪個系列的第幾章、前後是哪幾篇，順著讀下去。", box: [1084, 672, 500, 186] },
    ],
  },
  {
    fig: 8,
    id: "note-tabs",
    intent: "同時開好幾篇對照著讀",
    title: "筆記頁籤",
    path: "/notes/…",
    demoPath: "notes/ai-內容生成演示系列-訂單狀態機/",
    steps: [
      { ref: 90, name: "頁籤列", text: "開過的筆記會留下頁籤，可以固定、拖曳、右鍵管理；⌥. 與 ⌥, 切換。", box: [324, 0, 1112, 40] },
      { ref: 92, name: "閱讀狀態", text: "未開始、閱讀中、已完成，一鍵標記；儀表板與系列進度跟著更新。", box: [540, 306, 280, 44] },
      { ref: 94, name: "目錄", text: "右側目錄跟著捲動；切回頁籤時，會停在上次讀到的位置。", box: [1300, 156, 250, 200] },
    ],
  },
  {
    fig: 9,
    id: "dashboard-calendar",
    intent: "看這陣子寫了哪些",
    title: "更新月曆",
    path: "/?tab=calendar",
    demoPath: "?tab=calendar",
    steps: [
      { ref: 96, name: "當日更新的筆記", text: "每篇筆記落在它最後更新的那一天，色塊就是它的閱讀狀態。", box: [699, 688, 175, 146] },
      { ref: 98, name: "月／週切換", text: "月檢視看整體節奏，週檢視看每一天寫了什麼。", box: [1496, 164, 88, 40] },
    ],
  },
  {
    fig: 10,
    id: "plugins",
    intent: "把 JSON 資料檔變成頁面",
    title: "Plugin 管理",
    path: "/plugins?tab=installed",
    demoPath: "plugins/?tab=installed",
    steps: [
      { ref: 100, name: "已安裝的外掛", text: "ER 圖與 OpenAPI 兩個官方 plugin，各自命中幾個資料檔。", box: [325, 307, 1260, 80] },
      { ref: 102, name: "啟用狀態", text: "壞掉的 plugin 先停用，網站照樣 build 得出來。", box: [1485, 312, 100, 72] },
    ],
  },
];

const STEP_MS = 3600;
const W = 1600;
const H = 1000;

type Props = { base?: string };

export default function Tour({ base = "/" }: Props) {
  const [si, setSi] = useState(0);
  const [st, setSt] = useState(0);
  const [auto, setAuto] = useState(false); // 有沒有在自動播放（使用者操作過就永遠停）
  const [paused, setPaused] = useState(false); // 滑過／聚焦時暫停
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scene = SCENES[si];
  const step = scene.steps[st];

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    setAuto(!r);
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { threshold: 0.4 });
    io.observe(el);
    const onVis = () => setVisible((v) => v && !document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const running = auto && visible && !paused;

  // 自動往下一步；一個畫面走完就換下一個畫面
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => {
      if (st + 1 < scene.steps.length) setSt(st + 1);
      else {
        setSi((si + 1) % SCENES.length);
        setSt(0);
      }
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, si, st, scene.steps.length]);

  const take = useCallback(() => setAuto(false), []);
  const pickScene = (i: number) => {
    take();
    setSi(i);
    setSt(0);
  };
  const pickStep = (i: number) => {
    take();
    setSt(i);
  };

  // 鏡頭：把目前區域平移到畫面中央並放大，邊緣不露出截圖外
  const [bx, by, bw, bh] = step.box;
  const s = Math.max(1, Math.min(1.9, Math.min((W * 0.62) / bw, (H * 0.62) / bh)));
  const cx = (bx + bw / 2) / W;
  const cy = (by + bh / 2) / H;
  const tx = Math.min(0, Math.max(1 - s, 0.5 - s * cx));
  const ty = Math.min(0, Math.max(1 - s, 0.5 - s * cy));
  const cam: CSSProperties = { transform: `translate(${tx * 100}%, ${ty * 100}%) scale(${s})` };
  const spot: CSSProperties = {
    left: `${(bx / W) * 100}%`,
    top: `${(by / H) * 100}%`,
    width: `${(bw / W) * 100}%`,
    height: `${(bh / H) * 100}%`,
    ["--s" as string]: s,
  };

  const demoHref = `${base.replace(/\/?$/, "/")}demo/${scene.demoPath}`;

  return (
    <div
      className={`tour${reduce ? " is-reduced" : ""}`}
      ref={rootRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="tour-intents" role="tablist" aria-label="你想做的事">
        {SCENES.map((sc, i) => (
          <button
            key={sc.id}
            type="button"
            role="tab"
            id={`tour-tab-${sc.id}`}
            aria-selected={i === si}
            aria-controls="tour-panel"
            className={`tour-intent${i === si ? " is-on" : ""}`}
            onClick={() => pickScene(i)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const n = (i + (e.key === "ArrowRight" ? 1 : SCENES.length - 1)) % SCENES.length;
              pickScene(n);
              document.getElementById(`tour-tab-${SCENES[n].id}`)?.focus();
            }}
          >
            <span className="tour-intent-fig">FIG. {sc.fig}</span>
            <span className="tour-intent-text">{sc.intent}</span>
          </button>
        ))}
      </div>

      <div className="tour-body" id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${scene.id}`}>
        <figure className="tour-view">
          <div className="tour-chrome">
            <span className="tour-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="tour-url">{scene.path}</span>
            <a className="tour-open" href={demoHref}>
              在 Demo 開這一頁
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 2h6v6M10 2L3 9" />
              </svg>
            </a>
          </div>
          <div className="tour-frame">
            <div className="tour-cam" style={cam}>
              {SCENES.map((sc, i) => (
                <img
                  key={sc.id}
                  src={`${base.replace(/\/?$/, "/")}plates/${sc.id}.webp`}
                  alt={i === si ? `${sc.title}的畫面` : ""}
                  aria-hidden={i === si ? undefined : true}
                  className={i === si ? "is-on" : undefined}
                  width={W}
                  height={H}
                  loading="lazy"
                  decoding="async"
                />
              ))}
              <div className={`tour-spot${by < 80 ? " is-top" : ""}`} style={spot} key={`${si}-${st}`}>
                <span className="tour-spot-num">{step.ref}</span>
              </div>
            </div>
          </div>
          <figcaption className="tour-cap">
            <span className="fig-no">FIG. {scene.fig}</span>
            <span>
              <b>{scene.title}</b>　{step.ref} {step.name}
            </span>
          </figcaption>
        </figure>

        <ol className="tour-steps" aria-label={`${scene.title}的導覽步驟`}>
          {scene.steps.map((p, i) => (
            <li key={p.ref}>
              <button
                type="button"
                className={`tour-step${i === st ? " is-on" : ""}${i < st ? " is-done" : ""}`}
                aria-current={i === st ? "step" : undefined}
                onClick={() => pickStep(i)}
              >
                <span className="ref">{p.ref}</span>
                <span className="tour-step-body">
                  <span className="tour-step-name">{p.name}</span>
                  <span className="tour-step-text">{p.text}</span>
                </span>
                {i === st && running && <span className="tour-progress" key={`${si}-${st}`} style={{ animationDuration: `${STEP_MS}ms` }} />}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="tour-hint">
        {auto ? "自動導覽中，滑過或點任一步就停下來。" : "點上面換一件事，點右邊的步驟看細節。"}
      </p>
    </div>
  );
}
