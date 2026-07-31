// <Stages> — 流程段（Task 34；Task 42 加 rail / cycle 兩個 variant）。
//
// 出處：
//   linear（預設）提案 P2 的 PAST → NOW → FUTURE、月會 P8 底部的外包前/中/後三色帶
//   rail          bullmq p2 的 ETL 五階段、dataint p16 的 Step 1–6 上下交錯（inventory §2 C2）
//   cycle         nifi p2 的 NiFi Flow 開發流程 6 步環形（inventory §2 C3）
//
// 三個 variant **共用同一份 StageItem** —— 資料結構相同，只是排法不同，
// 所以擴充既有元件而不是新開檔案。`variant` 不給時行為與 Task 34 完全一致。

import type { IconName, SeriesTone, StatusTone } from "@/lib/decks";
import { ChevronRight } from "lucide-react";
import { DGAP, DS, DTRACK } from "../scale";
import { isStatusTone, toneColor } from "../SlideChrome";
import { DeckIcon, STATUS_ICON } from "../icons";
import type { BlockBaseProps } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";

export interface StageItem {
  /** 段落標籤，如 "PAST · 過去" */
  tag?: string;
  icon?: IconName;
  title: string;
  desc?: string;
  tone?: SeriesTone | StatusTone;
  /** active = 當前段（實心強調）、dashed = 未來段（虛線） */
  variant?: "plain" | "active" | "dashed";
}

export type StagesVariant = "linear" | "rail" | "cycle";

export interface StagesProps extends BlockBaseProps {
  items: StageItem[];
  /** 段與段之間是否畫箭頭（僅 linear）。預設 true */
  arrows?: boolean;
  /** 排法。預設 "linear"（= Task 34 的原始外觀，不給時行為完全不變） */
  variant?: StagesVariant;
  /** rail 專用：說明上下交錯（dataint p16）。預設 false */
  alternate?: boolean;
  /**
   * rail / cycle 的畫布高（px @1600 座標系）。預設 rail 300 / cycle 460。
   * **`alternate` 時建議 ≥ 280** —— 上下都要放「icon + tag + 標題 + 說明」，
   * 給太矮上排會頂出容器（實測 230 會溢出約 13px）。
   */
  size?: number;
  /** cycle 專用：環中心的標題（nifi p2 的「NiFi Flow 開發流程」） */
  center?: string;
}

const LIMIT = 5;
/** rail / cycle 的建議上限 —— 實測值，見 Task 42 實作記錄 */
const LIMIT_RAIL = 6;
const LIMIT_CYCLE = 6;

export function Stages(props: StagesProps) {
  if (props.variant === "rail") return <StagesRail {...props} />;
  if (props.variant === "cycle") return <StagesCycle {...props} />;
  return <StagesLinear {...props} />;
}

function StagesLinear({ dark, heading, style, items, arrows = true }: StagesProps) {
  const c = dkt(dark);
  warnOverLimit("Stages", items.length, LIMIT);

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: DGAP.xs, minHeight: 0 }}>
        {items.map((it, i) => {
          const t = toneColor(it.tone, c);
          const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
          const variant = it.variant ?? "plain";
          const active = variant === "active";
          const dashed = variant === "dashed";
          return (
            <div key={it.title} style={{ flex: 1, display: "flex", alignItems: "center", gap: DGAP.xs, minWidth: 0 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: `${DGAP.sm}px`,
                  borderRadius: "var(--radius-md)",
                  background: active ? t.soft : dark ? c.sunken : "var(--neutral-50)",
                  border: `${active ? 2 : 1}px ${dashed ? "dashed" : "solid"} ${active ? t.fg : c.border}`,
                }}
              >
                {(it.tag || icon) && (
                  <div style={{ display: "flex", alignItems: "center", gap: DGAP.xs }}>
                    {icon && (
                      <span style={{ display: "inline-flex", color: t.fg }}>
                        <DeckIcon name={icon} size={20} />
                      </span>
                    )}
                    {it.tag && (
                      <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: t.fg }}>
                        {it.tag}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
                  {it.title}
                </div>
                {it.desc && <div style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{it.desc}</div>}
              </div>

              {arrows && i < items.length - 1 && (
                <span style={{ flex: "none", display: "inline-flex", color: c.muted }}>
                  <ChevronRight size={26} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}

// ── rail：一條水平軸 + 節點圓點（bullmq p2 / dataint p16）────────────────────
// 與 linear 的差別是「這是一條時間軸上的里程碑」而不是「三個並排的區塊」，
// 所以節點之間**不畫箭頭**（軸本身已經表達方向），也不畫卡片外框。
function StagesRail({ dark, heading, style, items, alternate = false, size = 300 }: StagesProps) {
  const c = dkt(dark);
  warnOverLimit("Stages/rail", items.length, LIMIT_RAIL);
  if (!items.length) return null;

  const half = size / 2;

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ position: "relative", height: size, display: "flex", alignItems: "center" }}>
        {/* 軸線：只穿過節點區間，不畫到兩端外，避免看起來像「還有更多」 */}
        <div
          style={{
            position: "absolute",
            left: `${100 / items.length / 2}%`,
            right: `${100 / items.length / 2}%`,
            top: half - 1,
            height: 2,
            background: c.border,
          }}
        />
        {items.map((it, i) => {
          const t = toneColor(it.tone, c);
          const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
          const active = (it.variant ?? "plain") === "active";
          // alternate：奇數項的說明放到軸的另一側（dataint p16 的上下交錯）
          const below = !alternate || i % 2 === 0;
          return (
            <div
              key={it.title}
              style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: `0 ${DGAP.xs}px`,
              }}
            >
              {/*
                icon 的位置分兩種情況：
                  alternate=false → 固定在軸上方、文字在下方（bullmq p2 的構圖）
                  alternate=true  → 跟著文字走。上下交錯時「另一側」已被鄰項的文字佔用，
                                    icon 若還固定在上方，就會離自己的標題很遠、甚至壓到別人
              */}
              {icon && (
                <span
                  style={{
                    position: "absolute",
                    ...(alternate
                      ? below
                        ? { top: half + 22 }
                        : { bottom: half + 22 }
                      : { top: half - 74 }),
                    display: "inline-flex",
                    color: t.fg,
                  }}
                >
                  <DeckIcon name={icon} size={30} />
                </span>
              )}
              <span
                style={{
                  position: "absolute",
                  top: half - 11,
                  width: 22,
                  height: 22,
                  borderRadius: "var(--radius-circle)",
                  background: active ? t.fg : c.slide,
                  border: `3px solid ${t.fg}`,
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: below ? half + (alternate ? 58 : 22) : undefined,
                  bottom: below ? undefined : half + (alternate ? 58 : 22),
                  left: DGAP.xs,
                  right: DGAP.xs,
                  textAlign: "center",
                }}
              >
                {it.tag && (
                  <div style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: t.fg }}>
                    {it.tag}
                  </div>
                )}
                <div style={{ fontSize: DS.h4, fontWeight: 800, lineHeight: 1.3, color: c.ink, textWrap: "balance" }}>
                  {it.title}
                </div>
                {it.desc && (
                  <div style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body, marginTop: 4 }}>{it.desc}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}

// ── cycle：環形排列 + 圓弧箭頭 + 中心標題（nifi p2）─────────────────────────
// 唯一有幾何計算的 variant。節點沿圓周均分；標籤放在節點外側，
// 放不下時**縮環半徑而不是縮字級**（字級要守 DS 階梯）。
function StagesCycle({ dark, heading, style, items, size = 460, center }: StagesProps) {
  const c = dkt(dark);
  warnOverLimit("Stages/cycle", items.length, LIMIT_CYCLE);
  if (!items.length) return null;

  const n = items.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  // 每個節點的角度（從 12 點鐘方向開始，順時針）
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const px = (i: number) => cx + r * Math.cos(angle(i));
  const py = (i: number) => cy + r * Math.sin(angle(i));

  // 兩節點之間的圓弧（留間隙，讓箭頭讀起來是「一段一段」而不是一個整圓）
  const gap = 0.16;
  const arc = (i: number) => {
    const a0 = angle(i) + gap;
    const a1 = angle(i + 1) - gap;
    const R = r;
    const x0 = cx + R * Math.cos(a0);
    const y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1);
    const y1 = cy + R * Math.sin(a1);
    return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`;
  };

  return (
    <BlockShell heading={heading} c={c} style={style}>
      <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          <defs>
            <marker id="nc-cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={c.border} />
            </marker>
          </defs>
          {items.map((_, i) => (
            <path
              key={i}
              d={arc(i)}
              fill="none"
              stroke={c.border}
              strokeWidth={3}
              markerEnd="url(#nc-cycle-arrow)"
            />
          ))}
        </svg>

        {items.map((it, i) => {
          const t = toneColor(it.tone, c);
          const icon = it.icon ?? (isStatusTone(it.tone) ? STATUS_ICON[it.tone] : undefined);
          const active = (it.variant ?? "plain") === "active";
          return (
            <div
              key={it.title}
              style={{
                position: "absolute",
                left: px(i),
                top: py(i),
                transform: "translate(-50%, -50%)",
                width: size * 0.3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-circle)",
                  background: active ? t.fg : c.slide,
                  border: `2px solid ${t.fg}`,
                  color: active ? "var(--neutral-0)" : t.fg,
                }}
              >
                {icon ? <DeckIcon name={icon} size={22} /> : <span style={{ fontSize: DS.small, fontWeight: 900 }}>{i + 1}</span>}
              </span>
              <div
                style={{
                  fontSize: DS.small,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  color: c.ink,
                  textAlign: "center",
                  textWrap: "balance",
                }}
              >
                {it.title}
              </div>
            </div>
          );
        })}

        {center && (
          <div
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              transform: "translate(-50%, -50%)",
              width: size * 0.36,
              textAlign: "center",
              fontSize: DS.h4,
              fontWeight: 800,
              lineHeight: 1.35,
              color: c.ink,
              textWrap: "balance",
            }}
          >
            {center}
          </div>
        )}
      </div>
    </BlockShell>
  );
}
