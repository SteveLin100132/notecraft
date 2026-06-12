import React from 'react';

// ---------------------------------------------------------------
// bump-prd-flows — 手寫 SVG 雙流程帶
// 上帶：正常流程（綠色實線箭頭）
// 下帶：哨兵介入（橘色虛線箭頭）
// 動詞節點（動作）用較深底色 + 白字；物件/狀態節點用淺底色 + 深字
// ---------------------------------------------------------------

type NodeKind = 'verb' | 'object';

interface FlowNode {
  label: string;
  kind: NodeKind;
  mono?: boolean;
}

interface LaneDef {
  title: string;
  nodes: FlowNode[];
  arrowStroke: string;
  dashArray?: string;
  verbFill: string;
  verbText: string;
  objectFill: string;
  objectStroke: string;
}

const LANES: LaneDef[] = [
  {
    title: '正常流程',
    nodes: [
      { label: '改 docs',       kind: 'object' },
      { label: '說「commit」',  kind: 'verb'   },
      { label: 'AI 判斷',       kind: 'verb'   },
      { label: '/bump-prd',     kind: 'object', mono: true },
      { label: 'commit',        kind: 'verb'   },
    ],
    arrowStroke:  'var(--success-500)',
    verbFill:     'var(--success-500)',
    verbText:     'var(--neutral-0)',
    objectFill:   'var(--success-50)',
    objectStroke: 'var(--success-500)',
  },
  {
    title: '哨兵介入（忘了發版）',
    nodes: [
      { label: '改 docs',          kind: 'object' },
      { label: '對話結束',         kind: 'object' },
      { label: 'Stop hook 檢查',   kind: 'verb'   },
      { label: '提醒「該發版」',   kind: 'verb'   },
    ],
    arrowStroke:  'var(--orange-400)',
    dashArray:    '6 4',
    verbFill:     'var(--orange-500)',
    verbText:     'var(--neutral-0)',
    objectFill:   'var(--orange-50)',
    objectStroke: 'var(--orange-400)',
  },
];

// ---- SVG 版面常數 -------------------------------------------
const SVG_W    = 900;
const LANE_H   = 114;
const LANE_GAP = 32;
const PAD_TOP  = 20;
const PAD_LEFT = 12;  // 整體左邊留白
const TITLE_W  = 148; // 左側標題欄寬（含右側 gap）

// 節點
const NODE_W   = 118;
const NODE_H   = 44;
const NODE_RX  = 8;

// 箭頭三角形大小
const TIP = 8;

const SVG_H = PAD_TOP + LANE_H * 2 + LANE_GAP + 20;

interface NodePos {
  left: number;   // 節點左緣 x
  center: number; // 節點中心 x
}

// 將 count 個固定寬度節點，沿可用寬度從 originX 起向右排，間距均分（節點間留真實間隙給箭頭）
function layoutLane(count: number, availW: number, originX: number): NodePos[] {
  const gap = count > 1 ? (availW - count * NODE_W) / (count - 1) : 0;
  return Array.from({ length: count }, (_unused, i) => {
    const left = originX + i * (NODE_W + gap);
    return { left, center: left + NODE_W / 2 };
  });
}

export default function BumpPrdFlows(): React.ReactElement {
  const availW = SVG_W - PAD_LEFT - TITLE_W - 16; // 節點區可用寬度

  return (
    <div className="not-prose my-6">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="bump-prd 觸發流程圖：正常流程與哨兵介入對比"
        style={{ display: 'block', fontFamily: 'system-ui, sans-serif' }}
      >
        <defs>
          {LANES.map((lane, li) => (
            <marker
              key={`mkr-${li}`}
              id={`arrowhead-${li}`}
              markerWidth={TIP}
              markerHeight={TIP}
              refX={TIP - 0.5}
              refY={TIP / 2}
              orient="auto"
            >
              <polygon
                points={`0,0 ${TIP},${TIP / 2} 0,${TIP}`}
                fill={lane.arrowStroke}
              />
            </marker>
          ))}
        </defs>

        {LANES.map((lane, li) => {
          const laneTop = PAD_TOP + li * (LANE_H + LANE_GAP);
          const midY    = laneTop + LANE_H / 2;
          const nodeOriginX = PAD_LEFT + TITLE_W;
          const count   = lane.nodes.length;
          const pos     = layoutLane(count, availW, nodeOriginX);

          return (
            <g key={`lane-${li}`}>
              {/* 左側標題（垂直居中對齊 midY） */}
              <text
                x={PAD_LEFT + TITLE_W - 12}
                y={midY}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill={li === 0 ? 'var(--success-500)' : 'var(--orange-500)'}
              >
                {lane.title}
              </text>

              {/* 節點與箭頭 */}
              {lane.nodes.map((node, ni) => {
                const ncx  = pos[ni].center;
                const nx   = pos[ni].left;
                const ny   = midY - NODE_H / 2;
                const isVerb = node.kind === 'verb';

                const fill   = isVerb ? lane.verbFill   : lane.objectFill;
                const stroke = isVerb ? 'none'          : lane.objectStroke;
                const tColor = isVerb ? lane.verbText   : 'var(--neutral-800)';
                const fWeight = isVerb ? 600 : 400;
                const fFamily = node.mono
                  ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
                  : 'inherit';

                return (
                  <g key={`n-${ni}`}>
                    {/* 箭頭線：從本節點右緣連到下一節點左緣，間隙中顯示箭頭 */}
                    {ni < count - 1 && (
                      <line
                        x1={pos[ni].left + NODE_W}
                        y1={midY}
                        x2={pos[ni + 1].left - 1}
                        y2={midY}
                        stroke={lane.arrowStroke}
                        strokeWidth={2}
                        strokeDasharray={lane.dashArray}
                        markerEnd={`url(#arrowhead-${li})`}
                      />
                    )}

                    {/* 節點矩形 */}
                    <rect
                      x={nx}
                      y={ny}
                      width={NODE_W}
                      height={NODE_H}
                      rx={NODE_RX}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isVerb ? 0 : 1.5}
                    />

                    {/* 節點文字（單行） */}
                    <text
                      x={ncx}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight={fWeight}
                      fontFamily={fFamily}
                      fill={tColor}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* 帶間分隔虛線 */}
              {li < LANES.length - 1 && (
                <line
                  x1={PAD_LEFT}
                  y1={laneTop + LANE_H + LANE_GAP / 2}
                  x2={SVG_W - 8}
                  y2={laneTop + LANE_H + LANE_GAP / 2}
                  stroke="var(--neutral-200)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
