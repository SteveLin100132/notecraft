import { useId, useRef, useState, type KeyboardEvent } from "react";
import { FEATURES } from "./FeatureExplode";

/*
 * 「它做什麼」：左邊功能清單，右邊是選中那一項的實機截圖與說明。
 * 文字沿用 FeatureExplode 的 FEATURES（同一份內容，不另寫一份），截圖都是 public/plates/ 的真實畫面（旁邊有 .json 出處）。
 * 清單是 tablist：方向鍵切換、Home／End 到頭尾；選中填深藍（說明書的「選中即填 sheet」）。
 */

const SHOTS: Record<number, { name: string; alt: string }> = {
  10: { name: "notes-list", alt: "筆記列表：左側資料夾樹，主區依資料夾分組列出筆記" },
  12: { name: "series", alt: "系列頁：每個系列一列，含進度條與下一章" },
  14: { name: "dashboard", alt: "儀表板：筆記總數、本週更新、寫作頻率、最近更新、系列與標籤分布" },
  16: { name: "tutorial-generated", alt: "筆記裡生成的互動流程圖，外框右上有放大檢視" },
  18: { name: "deck-play", alt: "簡報檢視頁：左側投影片縮圖，中間是目前這一頁" },
  20: { name: "plugin-er", alt: "ER Diagram plugin 的資料庫頁：左側資料表導覽，右側分群總覽" },
  22: { name: "note-tabs", alt: "主區上方的頁籤列，開著數篇筆記" },
  24: { name: "palette", alt: "⌘K 指令面板：搜尋框下列出已開啟的頁籤與筆記" },
};

/* points 裡 `…` 包住的字輸出成 <code> */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((p, i) =>
        p.startsWith("`") && p.endsWith("`") ? (
          <code key={i} className={p.length <= 18 ? "ft-nw" : undefined}>
            {p.slice(1, -1)}
          </code>
        ) : (
          p
        ),
      )}
    </>
  );
}

type Props = { base?: string; initial?: number };

export default function FeatureTour({ base = "/", initial = 10 }: Props) {
  const start = Math.max(0, FEATURES.findIndex((f) => f.ref === initial));
  const [i, setI] = useState(start);
  const uid = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const root = base.replace(/\/$/, "");
  const f = FEATURES[i];
  const shot = SHOTS[f.ref];
  const src = (name: string) => `${root}/plates/${name}.webp`;

  const preload = (k: number) => {
    const s = SHOTS[FEATURES[k].ref];
    if (s) new Image().src = src(s.name);
  };
  const go = (k: number) => {
    const n = (k + FEATURES.length) % FEATURES.length;
    setI(n);
    tabs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: FEATURES.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    go(map[e.key]);
  };

  return (
    <section className="ft" aria-label="NoteCraftApp 的八個功能">
      <div className="ft-grid">
      <div className="ft-list" role="tablist" aria-orientation="vertical" aria-label="功能" onKeyDown={onKey}>
        {FEATURES.map((x, k) => (
          <button
            key={x.ref}
            ref={(el) => {
              tabs.current[k] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-t${k}`}
            aria-selected={k === i}
            aria-controls={`${uid}-panel`}
            tabIndex={k === i ? 0 : -1}
            className="ft-tab"
            onClick={() => setI(k)}
            onMouseEnter={() => preload(k)}
            onFocus={() => preload(k)}
          >
            <span className="ref">{x.ref}</span>
            <span className="ft-tab-name">{x.name}</span>
          </button>
        ))}
      </div>

      <div className="ft-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-t${i}`}>
        {shot && (
          <figure className="ft-shot">
            <img key={shot.name} src={src(shot.name)} alt={shot.alt} width={1600} height={1000} loading="lazy" decoding="async" />
          </figure>
        )}
        <div className="ft-body" key={f.ref}>
          <h3 className="ft-title">
            <span className="ref">{f.ref}</span>
            {f.name}
          </h3>
          <p className="ft-lede">{f.lede}</p>
          <ul className="ft-points">
            {f.points.map((p) => (
              <li key={p}>
                <Inline text={p} />
              </li>
            ))}
          </ul>
          <p className="ft-links">
            {f.links.map((l) => (
              <a key={l.href} href={root + l.href}>
                {l.label}
              </a>
            ))}
          </p>
        </div>
      </div>
      </div>
    </section>
  );
}
