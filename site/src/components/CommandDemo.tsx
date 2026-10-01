import { useState, type ReactNode } from "react";

/*
 * 實施方式的「指令一覽」：點一個指令，右邊的小線稿畫出它產生了什麼。
 * 切換時線稿重新描一次（CSS 動畫，pathLength=1 的 dash；減少動態時直接顯示終態）。
 */

type Cmd = { id: string; label: string; what: string; draw: ReactNode };

const T = ({ x, y, children, b }: { x: number; y: number; children: ReactNode; b?: boolean }) => (
  <text x={x} y={y} className={b ? "cd-t cd-t--b" : "cd-t"}>
    {children}
  </text>
);

const Folder = ({ x, y, label }: { x: number; y: number; label: string }) => (
  <g>
    <path d={`M${x} ${y + 6} h14 l5 -6 h27 v40 h-46 z`} className="cd-l" pathLength={1} />
    <T x={x - 2} y={y + 58}>
      {label}
    </T>
  </g>
);

const Arrow = ({ x1, x2, y }: { x1: number; x2: number; y: number }) => (
  <g>
    <line x1={x1} y1={y} x2={x2} y2={y} className="cd-l" pathLength={1} />
    <path d={`M${x2 - 7} ${y - 5} L${x2} ${y} L${x2 - 7} ${y + 5}`} className="cd-l" pathLength={1} />
  </g>
);

const Browser = ({ x, y, w, h, url }: { x: number; y: number; w: number; h: number; url: string }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} className="cd-l" pathLength={1} />
    <line x1={x} y1={y + 18} x2={x + w} y2={y + 18} className="cd-l" pathLength={1} />
    <T x={x + 8} y={y + 13}>
      {url}
    </T>
  </g>
);

const Tree = ({ x, y, rows }: { x: number; y: number; rows: [number, string, boolean?][] }) => (
  <g>
    {rows.map(([depth, name, mark], i) => (
      <g key={i}>
        {depth > 0 && (
          <path
            d={`M${x + (depth - 1) * 18 + 4} ${y + i * 22 - 14} V${y + i * 22 - 4} H${x + depth * 18 - 2}`}
            className="cd-l cd-l--soft"
            pathLength={1}
          />
        )}
        <text x={x + depth * 18} y={y + i * 22} className={mark ? "cd-t cd-t--mark" : depth === 0 ? "cd-t cd-t--b" : "cd-t"}>
          {name}
        </text>
      </g>
    ))}
  </g>
);

const CMDS: Cmd[] = [
  {
    id: "view",
    label: "view [dir]",
    what: "在本機開 Astro dev server。新增、編輯、刪除筆記即時反映，標籤可以直接在頁面上改。",
    draw: (
      <>
        <Folder x={18} y={86} label="./docs" />
        <Arrow x1={78} x2={128} y={106} />
        <Browser x={140} y={40} w={204} h={140} url="localhost:4321" />
        <rect x={148} y={66} width={10} height={106} className="cd-l" pathLength={1} />
        <rect x={164} y={66} width={44} height={106} className="cd-l" pathLength={1} />
        {[80, 94, 108, 122].map((yy, i) => (
          <line key={yy} x1={218} y1={yy} x2={[326, 300, 318, 280][i]} y2={yy} className="cd-l cd-l--soft" pathLength={1} />
        ))}
        <rect x={218} y={134} width={92} height={30} className="cd-m" pathLength={1} />
      </>
    ),
  },
  {
    id: "build",
    label: "build [dir]",
    what: "輸出純靜態網站：沒有 Function、沒有執行期 API，任何靜態主機都能放。",
    draw: (
      <>
        <Folder x={18} y={86} label="./docs" />
        <Arrow x1={78} x2={128} y={106} />
        <Tree
          x={146}
          y={62}
          rows={[
            [0, "dist/"],
            [1, "index.html"],
            [1, "notes/…/index.html"],
            [1, "_astro/*.js"],
            [1, "wb-index.json"],
          ]}
        />
      </>
    ),
  },
  {
    id: "serve",
    label: "serve [dir]",
    what: "服務 build 好的靜態站，背景 rebuild 並自動重新整理：另一個終端機寫檔，這邊的瀏覽器跟著更新。",
    draw: (
      <>
        <rect x={18} y={70} width={84} height={72} className="cd-l" pathLength={1} />
        <T x={28} y={92} b>
          rebuild
        </T>
        <T x={28} y={112}>
          dist/
        </T>
        <Arrow x1={110} x2={150} y={106} />
        <T x={108} y={96}>
          SSE
        </T>
        <Browser x={160} y={44} w={184} h={124} url="localhost:4321" />
        <path d="M252 132 a22 22 0 1 1 20 -22" className="cd-m" pathLength={1} />
        <path d="M266 104 l6 6 l6 -6" className="cd-m" pathLength={1} />
      </>
    ),
  },
  {
    id: "init-skill",
    label: "init-skill",
    what: "把 3 個 skill 與 6 個 subagent 裝進專案的 .claude/，Claude Code 就能處理 @ai-visualize 標記與筆記轉簡報。",
    draw: (
      <Tree
        x={40}
        y={40}
        rows={[
          [0, ".claude/"],
          [1, "skills/"],
          [2, "content-visualize", true],
          [2, "content-present"],
          [2, "trendlink-design"],
          [1, "agents/ ×6"],
          [2, "note-scanner · visualize-planner …"],
        ]}
      />
    ),
  },
  {
    id: "install-plugin",
    label: "install-plugin",
    what: "安裝 ER 圖、OpenAPI 等 plugin；在 plugins.json 加一條映射，符合的資料檔就變成頁面。",
    draw: (
      <Tree
        x={40}
        y={40}
        rows={[
          [0, ".notecraft/"],
          [1, "plugins.json"],
          [1, "plugins/"],
          [2, "er-diagram-renderer/", true],
          [3, "notecraft-plugin.json"],
          [3, "renderer.tsx"],
          [3, "schema.json"],
        ]}
      />
    ),
  },
];

export default function CommandDemo() {
  const [sel, setSel] = useState(0);
  const cmd = CMDS[sel];
  return (
    <div className="cd">
      <h3 className="cd-title">指令一覽</h3>
      <div className="cd-grid">
        <ul className="cd-list" role="tablist" aria-label="指令">
          {CMDS.map((c, i) => (
            <li key={c.id} role="presentation">
              <button
                type="button"
                role="tab"
                id={`cd-tab-${c.id}`}
                aria-selected={i === sel}
                aria-controls="cd-panel"
                className={`cd-cmd${i === sel ? " is-on" : ""}`}
                onClick={() => setSel(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const n = (i + (e.key === "ArrowDown" ? 1 : CMDS.length - 1)) % CMDS.length;
                    setSel(n);
                    document.getElementById(`cd-tab-${CMDS[n].id}`)?.focus();
                  }
                }}
              >
                <code>{c.label}</code>
              </button>
            </li>
          ))}
        </ul>
        <div className="cd-panel" id="cd-panel" role="tabpanel" aria-labelledby={`cd-tab-${cmd.id}`}>
          <svg viewBox="0 10 360 200" className="cd-svg" key={cmd.id} aria-hidden="true">
            {cmd.draw}
          </svg>
          <p className="cd-what">
            <code>npx notecraftapp {cmd.label.replace(" [dir]", " ./docs")}</code>
            <span>{cmd.what}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
