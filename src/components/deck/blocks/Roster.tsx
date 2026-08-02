// <Roster> — 中心與周邊角色（Task 45）。
//
// 構圖借 dashi-ppt theme07「圖譜」頁的意思，但**沒有照它的三卡並排做** ——
// 三張並排的卡片 <Cards> 已經能畫，再做一次只是多一個重複的原子。
// 這裡改成放射狀：一個中心 + 周邊角色 + 連線，表達的是「誰圍著誰轉」，
// 那是 <Cards> 的並列語意畫不出來的。
//
// 與 <Stages variant="cycle"> 的分界：cycle 的節點之間**有先後**（會繞回起點）；
// Roster 的周邊節點彼此沒有順序，它們只各自與中心有關係。
//
// 沿用 <Chart> 的規則：不量測父層寬高（縮覽側欄 display:none 會量到 0），
// 尺寸由呼叫端從 area 傳入。

import type { IconName, SeriesTone } from "@/lib/decks";
import { DeckIcon } from "../icons";
import { DGAP, DS, DTRACK } from "../scale";
import { toneColor } from "../SlideChrome";
import type { BlockBaseProps, DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface RosterActor {
  label: string;
  /** 這個角色做什麼 */
  role?: string;
  icon?: IconName;
}

export interface RosterProps extends BlockBaseProps {
  center: { label: string; note?: string };
  /** 周邊角色，3–6 個。**順序不帶意義** */
  actors: RosterActor[];
  lead?: string;
  /** 這個 block 的總寬 / 總高（px @1600 座標系），由呼叫端從 area 算好傳入 */
  width?: number;
  height?: number;
  tone?: SeriesTone;
}

const ACTOR_LIMIT = 6;
const HEADING_H = Math.round(DS.h3 * 1.3) + DGAP.sm + 4;
const LEAD_H = 60;
const NODE_W = 210;
const NODE_H = 76;
const CENTER_R = 84;

export function Roster({
  dark,
  heading,
  style,
  center,
  actors,
  lead,
  width = 1200,
  height = 480,
  tone = "blue",
}: RosterProps) {
  const c = dkt(dark);
  const t = toneColor(tone, c);
  warnOverLimit("Roster", actors.length, ACTOR_LIMIT);

  const list = actors.slice(0, ACTOR_LIMIT);
  const canvasH = Math.max(220, height - (heading ? HEADING_H : 0) - (lead ? LEAD_H : 0));
  const cx = width / 2;
  const cy = canvasH / 2;
  // 橢圓半徑：留住節點盒與邊界的距離，節點才不會被裁掉
  const rx = Math.max(180, width / 2 - NODE_W / 2 - 12);
  const ry = Math.max(90, canvasH / 2 - NODE_H / 2 - 10);

  // 從正上方順時針均分。節點之間沒有順序，起點取正上方只是為了每次渲染都一樣
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / list.length;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  };

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {lead && (
        <p style={{ margin: 0, flex: "none", height: LEAD_H, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{lead}</p>
      )}

      <div style={{ flex: 1, position: "relative", minHeight: 0, width, height: canvasH }}>
        {/* 連線先畫，讓節點盒疊在上面 */}
        <svg width={width} height={canvasH} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          {list.map((a, i) => {
            const p = pos(i);
            return <line key={a.label} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={c.border} strokeWidth={1.5} />;
          })}
        </svg>

        {/* 中心 */}
        <div
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            transform: "translate(-50%, -50%)",
            width: CENTER_R * 2,
            height: CENTER_R * 2,
            borderRadius: 999,
            background: t.soft,
            border: `2px solid ${t.fg}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: DGAP.xs,
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: DS.h4, fontWeight: 900, lineHeight: 1.2, color: t.fg }}>{center.label}</span>
          {center.note && <span style={{ fontSize: DS.micro, lineHeight: 1.3, color: c.body }}>{center.note}</span>}
        </div>

        {/* 周邊角色 */}
        {list.map((a, i) => {
          const p = pos(i);
          return (
            <div
              key={a.label}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                transform: "translate(-50%, -50%)",
                width: NODE_W,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: DGAP.xs,
                padding: `${DGAP.xs}px ${DGAP.sm}px`,
                borderRadius: "var(--radius-lg)",
                background: c.slide,
                border: `1px solid ${c.border}`,
                boxShadow: c.shadow,
              }}
            >
              {a.icon && (
                <span style={{ flex: "none", display: "inline-flex", color: t.fg }}>
                  <DeckIcon name={a.icon} size={20} />
                </span>
              )}
              <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: DS.small, fontWeight: 800, lineHeight: 1.25, color: c.ink }}>{a.label}</span>
                {a.role && (
                  <span style={{ fontSize: DS.micro, lineHeight: 1.3, letterSpacing: DTRACK.label, color: c.muted }}>
                    {a.role}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
