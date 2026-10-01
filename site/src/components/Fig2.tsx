import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

/*
 * FIG. 2 — 標記→元件。左邊是一段 @ai-visualize 標記，右邊是它對應的元件。
 * type 切換是「跳過去」而不是補間：未選的 type 以幽影留在原處。
 * 元件是為官網另外製作的示範，不是現場生成（靜態站不呼叫 AI），圖框上明示。
 */

export type Release = { version: string; date: string };

type Kind = "diagram" | "timeline" | "table";

const PROMPTS: Record<Kind, { id: string; lines: string[] }> = {
  diagram: {
    id: "visualize-pipeline",
    lines: ["畫出 @ai-visualize 從標記到寫回筆記的流程：", "四個 subagent 依序接力，", "驗證沒過就不寫回。"],
  },
  timeline: {
    id: "release-history",
    lines: ["把 notecraftapp 從 0.1.0 到現在的發版", "排成時間軸，標出改變用法的那幾版。"],
  },
  table: {
    id: "viz-decision",
    lines: ["整理「描述長什麼樣子 → 用什麼畫」的選型表，", "點一列看這張圖自己用了哪一種。"],
  },
};

const KINDS: Kind[] = ["diagram", "timeline", "table"];

type Props = {
  releases?: Release[];
};

export default function Fig2({ releases = [] }: Props) {
  const [kind, setKind] = useState<Kind>("diagram");
  const prompt = PROMPTS[kind];

  return (
    <figure className="f2">
      <div className="f2-grid">
        <div className="f2-marker">
          <div className="f2-file" aria-hidden="true">
            notes/guides/notecraft.mdx
          </div>
          <pre className="f2-code" aria-label="@ai-visualize 標記原文">
            <Line refNo={30}>
              <span className="tk-c">{"{/* "}</span>
              <span className="tk-k">@ai-visualize</span>
            </Line>
            <Line refNo={32}>
              <span className="tk-a">id:</span> {prompt.id}
            </Line>
            <Line refNo={34}>
              <span className="tk-a">type:</span>{" "}
              <span className="f2-types" role="radiogroup" aria-label="切換 type">
                {KINDS.map((k, i) => (
                  <span key={k}>
                    {i > 0 && <span className="f2-sep"> | </span>}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={kind === k}
                      className={`f2-type${kind === k ? " is-on" : ""}`}
                      onClick={() => setKind(k)}
                    >
                      {k}
                    </button>
                  </span>
                ))}
              </span>
            </Line>
            <Line refNo={36}>
              <span className="tk-a">prompt:</span> |
            </Line>
            {prompt.lines.map((l, i) => (
              <Line key={`${kind}-${i}`}>
                {"  "}
                {l}
              </Line>
            ))}
            <Line refNo={38}>
              <span className="tk-a">status:</span> <span className="tk-ok">generated</span>
            </Line>
            <Line>
              <span className="tk-c">{"*/}"}</span>
            </Line>
            <Line refNo={40}>
              <span className="tk-c">{"<"}</span>
              <span className="tk-k">{toPascal(prompt.id)}</span>
              <span className="tk-c">{" client:visible />"}</span>
            </Line>
          </pre>
          <p className="f2-hint">點上面的 type，右邊的元件就換成那一種。</p>
        </div>

        <div className="f2-frame">
          <div className="f2-frame-head">
            <span className="ref">16</span>
            <span className="f2-frame-title">{prompt.id}.tsx</span>
            <span className="f2-frame-note">官網示範元件，非現場生成</span>
          </div>
          <Compare kind={kind} id={prompt.id} lines={prompt.lines}>
            <div className="f2-frame-body" key={kind}>
              {kind === "diagram" && <Pipeline />}
              {kind === "timeline" && <Timeline releases={releases} />}
              {kind === "table" && <Decision />}
            </div>
          </Compare>
          <div className="f2-ghosts" aria-label="同一段標記的其他畫法">
            {KINDS.filter((k) => k !== kind).map((k) => (
              <button key={k} type="button" className="f2-ghost" onClick={() => setKind(k)} aria-label={`換成 ${k}`}>
                <Ghost kind={k} />
                <span>{k}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="f2-caption">
        <span className="fig-no">FIG. 2</span>
        <span>標記（30–40）與它生成的元件（16）。元件以原始碼寫回 repo，筆記裡只多了幾行。</span>
      </figcaption>
    </figure>
  );
}

/*
 * Before／After：同一個位置，左邊是筆記裡「待生成」的標記卡片，右邊是生成後的元件。
 * 分界線可拖曳（也可用方向鍵）；第一次捲進畫面時從「全是標記」掃到中間一次，示範「生成」這件事。
 * 卡片層用 clip-path 裁切，被裁掉的部分不吃滑鼠事件，底下的元件照常可以操作。
 */
const SPLIT_REST = 42;

function Compare({ kind, id, lines, children }: { kind: Kind; id: string; lines: string[]; children: ReactNode }) {
  const [split, setSplit] = useState(SPLIT_REST);
  const wrap = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const dragging = useRef(false);

  // 第一次進入畫面：100 → SPLIT_REST 掃一次（減少動態時直接停在終點）
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSplit(100);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const D = 1100;
        const tick = (t: number) => {
          if (touched.current) return;
          const k = Math.min(1, (t - t0 - 250) / D);
          if (k < 0) {
            raf = requestAnimationFrame(tick);
            return;
          }
          const e = 1 - Math.pow(1 - k, 4);
          setSplit(100 - (100 - SPLIT_REST) * e);
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const fromPointer = useCallback((clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    touched.current = true;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(e.clientX);
  };
  const onUp = () => {
    dragging.current = false;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = split - step;
    else if (e.key === "ArrowRight") next = split + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    touched.current = true;
    setSplit(Math.min(100, Math.max(0, next)));
  };

  return (
    <div className="cmp" ref={wrap} style={{ ["--split" as string]: `${split}%` }}>
      {children}
      <span className="cmp-tag cmp-tag--after" aria-hidden="true">
        生成後
      </span>
      <div className="cmp-before" aria-hidden={split < 4}>
        <div className="cmp-card">
          <div className="cmp-card-head">
            <span className="cmp-pill">待生成</span>
            <code>
              @ai-visualize · {id} · type: {kind}
            </code>
          </div>
          <p className="cmp-prompt">
            {lines.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </p>
          <p className="cmp-hint">在 Claude Code 對話中處理後，這裡會換成元件。</p>
        </div>
        <span className="cmp-tag cmp-tag--before">標記</span>
      </div>
      <div
        className="cmp-handle"
        role="slider"
        tabIndex={0}
        aria-label="拖曳比較：標記與生成後的元件"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        aria-valuetext={`標記占 ${Math.round(split)}%`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <span className="cmp-knob" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M5 3L1.5 7 5 11M9 3l3.5 4L9 11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** 未選中的 type 以淡線稿留在原處：點了就直接跳過去，不做補間。 */
function Ghost({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 120 64" width="120" height="64" aria-hidden="true" className="f2-ghost-svg">
      {kind === "diagram" &&
        [6, 22, 38].map((y, i) => (
          <g key={y}>
            <rect x="8" y={y} width="56" height="11" />
            {i < 2 && <line x1="20" y1={y + 11} x2="20" y2={y + 16} />}
          </g>
        ))}
      {kind === "diagram" && <rect x="8" y="52" width="56" height="8" strokeDasharray="3 3" />}
      {kind === "timeline" && (
        <>
          <line x1="6" y1="50" x2="114" y2="50" />
          {[12, 18, 40, 62, 90, 104, 110].map((x, i) => (
            <circle key={i} cx={x} cy={i % 3 === 0 ? 40 : 44} r={i % 3 === 0 ? 3.5 : 2.2} />
          ))}
          <line x1="110" y1="38" x2="110" y2="14" />
        </>
      )}
      {kind === "table" && (
        <>
          <line x1="6" y1="12" x2="114" y2="12" strokeWidth="2" />
          {[22, 32, 42, 52].map((y) => (
            <line key={y} x1="6" y1={y} x2="114" y2={y} />
          ))}
          <rect x="6" y="33" width="108" height="9" className="f2-ghost-fill" />
        </>
      )}
    </svg>
  );
}

function Line({ refNo, children }: { refNo?: number; children: ReactNode }) {
  return (
    <span className="f2-line">
      <span className="f2-ln ref" aria-hidden={refNo ? undefined : true}>
        {refNo ?? ""}
      </span>
      <span className="f2-lc">{children}</span>
    </span>
  );
}

function toPascal(id: string) {
  return id
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

/* ── diagram：四個 subagent 的接力 ── */

const AGENTS = [
  { name: "note-scanner", model: "haiku", role: "唯讀", job: "掃描 MDX，找出 status 是 pending 的標記，順便列出孤兒元件。" },
  { name: "visualize-planner", model: "sonnet", role: "唯讀", job: "依決策樹決定畫法：手寫 SVG、recharts、d3 或 motion，寫成規劃書。" },
  { name: "component-generator", model: "sonnet", role: "寫檔", job: "把 .tsx 寫進 .notecraft/components/，跑 tsc 與 astro build；失敗自動修，最多 3 次。" },
  { name: "mdx-writer", model: "haiku", role: "只能 Edit", job: "驗證通過才動筆記：在標記下方插入 import 與 JSX，status 改成 generated。" },
];

function Pipeline() {
  const [step, setStep] = useState(0);
  const [fail, setFail] = useState(false);
  const blocked = fail && step === 3;

  return (
    <div className="pl">
      <ol className="pl-steps" aria-label="四個 subagent 的流程">
        {AGENTS.map((a, i) => (
          <li key={a.name} className={`pl-cell${i === 3 ? " pl-cell--last" : ""}`}>
            {i === 3 && (
              <span className={`pl-gate${fail ? " is-closed" : ""}`}>{fail ? "驗證未過：不寫回" : "驗證通過才往下"}</span>
            )}
            <button
              type="button"
              className={`pl-node${i === step ? " is-on" : ""}${i < step ? " is-done" : ""}${fail && i === 3 ? " is-blocked" : ""}`}
              aria-pressed={i === step}
              onClick={() => setStep(i)}
            >
              <span className="pl-name">{a.name}</span>
              <span className="pl-meta">
                {a.model} · {a.role}
              </span>
            </button>
            {i === 2 && (
              <span className="pl-loop">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M13 8a5 5 0 1 1-1.5-3.6" strokeLinecap="round" />
                  <path d="M12 1.5v3h-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                失敗自動修，最多 3 次
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="pl-side">
      <div className="pl-detail" aria-live="polite">
        <span className="ref">{step + 1}</span>
        <p>{blocked ? "驗證沒過，mdx-writer 不會動筆記：壞掉的元件永遠不會被引用。" : AGENTS[step].job}</p>
      </div>

      <div className="pl-controls">
        <button type="button" className="pl-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          上一步
        </button>
        <button type="button" className="pl-btn" onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={step === 3}>
          下一步
        </button>
        <label className="pl-toggle">
          <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} />
          <span>假設驗證三次都沒過</span>
        </label>
      </div>
      </div>
    </div>
  );
}

/* ── timeline：真實的發版紀錄（build 時從 CHANGELOG.md 讀） ── */

const MILESTONES: Record<string, string> = {
  "0.1.0": "npx 三個子命令",
  "0.2.0": "init-skill：AI 生成層",
  "0.3.0": "筆記轉簡報",
  "0.5.0": "放大檢視",
  "0.6.0": "Plugin system",
  "1.0.0": "三欄工作台",
  "1.4.0": "儀表板改版",
  "1.5.0": "更新月曆",
  "1.6.0": "OpenAPI renderer",
  "1.7.0": "筆記頁籤",
};

function Timeline({ releases }: { releases: Release[] }) {
  const sorted = [...releases].sort((a, b) => a.date.localeCompare(b.date) || cmpVer(a.version, b.version));
  const [sel, setSel] = useState<string>(sorted.at(-1)?.version ?? "");
  if (sorted.length === 0) return <p className="tl-empty">沒有發版紀錄。</p>;

  const t = (d: string) => Date.parse(d + "T00:00:00Z");
  const t0 = t(sorted[0].date);
  const t1 = t(sorted.at(-1)!.date);
  const X0 = 24;
  const X1 = 716;
  const xOf = (d: string) => X0 + ((t(d) - t0) / Math.max(1, t1 - t0)) * (X1 - X0);

  // 同一天多版：往上疊
  const stack = new Map<string, number>();
  const placed = sorted.map((r) => {
    const n = stack.get(r.date) ?? 0;
    stack.set(r.date, n + 1);
    return { ...r, x: xOf(r.date), level: n };
  });
  const months = monthTicks(sorted[0].date, sorted.at(-1)!.date);
  const current = placed.find((p) => p.version === sel) ?? placed.at(-1)!;

  return (
    <div className="tl">
      <svg viewBox="0 0 740 190" className="tl-svg" role="group" aria-label={`發版時間軸，共 ${sorted.length} 版`}>
        <line x1={X0} y1={150} x2={X1} y2={150} className="tl-axis" />
        {months.map((m) => (
          <g key={m}>
            <line x1={xOf(m)} y1={146} x2={xOf(m)} y2={156} className="tl-axis" />
            <text x={xOf(m)} y={176} textAnchor="middle" className="tl-tick">
              {Number(m.slice(5, 7))} 月
            </text>
          </g>
        ))}
        {placed.map((p) => {
          const major = p.version in MILESTONES;
          const cy = 150 - 14 - p.level * 13;
          const on = p.version === sel;
          return (
            <g
              key={p.version}
              className={`tl-dot${major ? " is-major" : ""}${on ? " is-on" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${p.version}，${p.date}${major ? "，" + MILESTONES[p.version] : ""}`}
              onClick={() => setSel(p.version)}
              onMouseEnter={() => setSel(p.version)}
              onFocus={() => setSel(p.version)}
            >
              <circle cx={p.x} cy={cy} r={major ? 5.5 : 3.5} />
              <circle cx={p.x} cy={cy} r={11} className="tl-hit" />
            </g>
          );
        })}
        {/* 選中版本的引線與標號 */}
        <g className="tl-callout" aria-hidden="true">
          <line
            x1={current.x}
            y1={150 - 14 - current.level * 13 - 8}
            x2={current.x}
            y2={46}
          />
          <text x={clamp(current.x, 70, 670)} y={30} textAnchor="middle" className="tl-ver">
            {current.version}
          </text>
        </g>
      </svg>
      <div className="tl-detail" aria-live="polite">
        <span className="tl-date">{current.date}</span>
        <span>{MILESTONES[current.version] ?? "修正與小改進"}</span>
      </div>
      <p className="tl-note">
        資料來自 repo 的 CHANGELOG.md，共 {sorted.length} 個版本。大點是改變用法的版本。
      </p>
    </div>
  );
}

function cmpVer(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

function monthTicks(from: string, to: string) {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7)) + 1;
  for (;;) {
    if (m > 12) {
      m = 1;
      y++;
    }
    const s = `${y}-${String(m).padStart(2, "0")}-01`;
    if (s > to) break;
    out.push(s);
    m++;
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ── table：視覺化選型（與 content-visualize skill 的決策樹一致） ── */

const ROWS = [
  { when: "流程、時序、狀態機、架構", how: "手寫 SVG，不引入函式庫", used: "diagram" as const },
  { when: "有軸的量化資料", how: "recharts；非標準才用 d3", used: null },
  { when: "時間軸、Gantt", how: "手寫 SVG", used: "timeline" as const },
  { when: "欄位豐富的比較", how: "HTML <table>，不做成 SVG", used: "table" as const },
  { when: "動畫、互動、捲動驅動", how: "motion（Framer Motion）", used: null },
  { when: "以上都有", how: "組合使用，不要二選一", used: null },
];

const USED_LABEL: Record<Kind, string> = {
  diagram: "FIG. 2 的 diagram 就是這樣畫的",
  timeline: "FIG. 2 的 timeline 就是這樣畫的",
  table: "你正在看的這張表就是這一列",
};

function Decision() {
  const [sel, setSel] = useState(3);
  const row = ROWS[sel];
  return (
    <div className="dt">
      <table className="dt-table">
        <caption className="visually-hidden">視覺化選型表</caption>
        <thead>
          <tr>
            <th scope="col">prompt 描述的是</th>
            <th scope="col">用什麼畫</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={r.when} className={i === sel ? "is-on" : undefined}>
              <th scope="row">
                <button type="button" className="dt-row" aria-pressed={i === sel} onClick={() => setSel(i)}>
                  {r.when}
                </button>
              </th>
              <td>{r.how}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dt-detail" aria-live="polite">
        {row.used ? USED_LABEL[row.used] : "這次的示範沒有用到這一列；規劃階段會依 prompt 自動選。"}
      </p>
    </div>
  );
}
