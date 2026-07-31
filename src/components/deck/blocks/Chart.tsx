// <Chart> — 量化圖表原子（Task 40）。
//
// **規格不是從盤點素材推導的** —— 那 94 頁技術簡報裡「有軸的量化圖表」是 0 張
// （docs/deck-atoms-inventory.md §1.1）。規格來源是 `dataviz` skill 與
// docs/deck-design-audit.md §3.2 的色彩結論。實證頁只覆蓋兩個非典型變體：
//   D1 比例分解（bullmq p3 的 5% / 80% / 15%）→ variant="donut"
//   D2 進度條列（tus p4、bullmq p8）        → variant="bars"
//
// 四條硬規則（inventory §5 決議 1 與 §4.1）：
//   1. **系列數上限 3**，沿用 SeriesTone，不擴充色票。超過只畫前 3 筆並 dev 警告。
//   2. **不用 ResponsiveContainer** —— 縮覽側欄的頁在 display:none 下量到 0 寬，圖會消失。
//   3. **禁用 tooltip** —— 投影片沒有 hover，數值一律直接標在圖元上。
//   4. 動畫綁 `live` 且尊重 prefers-reduced-motion。
//
// 反樣式（dataviz）：不做 3D、不做漸層填充、不做圓角柱。

import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesTone } from "@/lib/decks";
import { DGAP, DS } from "../scale";
import { toneColor } from "../SlideChrome";
import type { DeckThemeTokens } from "./shell";
import { BlockShell, dkt, warnOverLimit } from "./shell";
import type { BlockBaseProps } from "./shell";

export type ChartVariant = "bar" | "line" | "area" | "donut" | "bars";

export interface ChartSeries {
  /** 對應 data 物件的欄位名 */
  key: string;
  label: string;
  /** 不給就依序取 blue → orange → muted */
  tone?: SeriesTone;
}

export type ChartRow = Record<string, string | number>;

export interface ChartProps extends BlockBaseProps {
  /** 預設 "bar" */
  variant?: ChartVariant;
  data: ChartRow[];
  /** 類別欄位名（x 軸標籤 / donut 切片名 / bars 列名） */
  categoryKey: string;
  series: ChartSeries[];
  /**
   * **這個 block 總共可以佔多少空間**（px @1600 座標系），由呼叫端從
   * `CustomSlideProps.area` 算好傳入 —— 元件不量測（見檔頭規則 2）。
   *
   * `height` 是**含 heading 與圖例**的總高，圖表畫布高由元件自己扣 ——
   * 讓呼叫端去記「標題 55px、圖例 28px」只會每次都算錯（實測 Task 40 第一版就溢出 22px）。
   */
  width?: number;
  height?: number;
  /**
   * 是否為「真正在看」的畫面。**只有 true 才播動畫** ——
   * 縮覽側欄同時掛十幾張圖會拖垮整頁（契約 §6 的 live 機制）。
   */
  live?: boolean;
  /** bar 專用：堆疊 */
  stacked?: boolean;
  /** 數值後綴，如 "%"、"ms" */
  unit?: string;
  /** bars 專用：滿格值。預設 100 */
  max?: number;
  /** 是否畫 y 軸。預設：line / area 畫，其餘不畫（數值已直接標在圖元上） */
  yAxis?: boolean;
  /** 多系列時是否畫圖例。預設 true */
  legend?: boolean;
}

/** 系列數上限 —— 硬規則，不是建議值（inventory §5 決議 1） */
const MAX_SERIES = 3;
/** donut 切片上限。SeriesTone 只有 3 色，第 4 類請併成「其他」或改用 <Table> */
const MAX_SLICES = 3;
/** bars 建議列數上限 —— 實測值，見 Task 40 實作記錄 */
const LIMIT_BARS = 8;

const FALLBACK_TONES: SeriesTone[] = ["blue", "orange", "muted"];

/**
 * heading 與圖例佔掉的高度 —— 與 BlockShell / Legend 的實際樣式對應，改樣式時要同步。
 * `+4` 是實測安全邊：純算式（30 × 1.3 + 16）比瀏覽器實際的行盒少 2px，
 * 會讓「剛好填滿」的頁溢出 2px。寧可少畫 4px 也不要被裁。
 */
const HEADING_H = Math.round(DS.h3 * 1.3) + DGAP.sm + 4;
const LEGEND_H = 20 + DGAP.xs;

const fmt = (v: number, unit?: string) => `${v}${unit ?? ""}`;

/** recharts 傳給 Pie label render function 的座標與資料（只取用得到的欄位） */
interface PieLabelProps {
  x?: number;
  y?: number;
  name?: string;
  value?: number;
  textAnchor?: "start" | "middle" | "end";
}

/** 軸與標籤的共用文字樣式（tabular-nums 依 audit B-3） */
const tickStyle = (c: DeckThemeTokens) =>
  ({
    fontSize: DS.micro,
    fill: c.muted,
    fontVariantNumeric: "tabular-nums",
  }) as const;

function Legend({ series, c, dark }: { series: ChartSeries[]; c: DeckThemeTokens; dark: boolean }) {
  return (
    <div style={{ display: "flex", gap: DGAP.md, marginBottom: DGAP.xs, flexWrap: "wrap" }}>
      {series.map((s, i) => {
        const t = toneColor(s.tone ?? FALLBACK_TONES[i], c);
        return (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: t.fg }} />
            <span style={{ fontSize: DS.micro, color: dark ? c.body : c.muted }}>{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function Chart({
  dark,
  heading,
  style,
  variant = "bar",
  data,
  categoryKey,
  series,
  width = 640,
  height = 340,
  live = false,
  stacked = false,
  unit,
  max = 100,
  yAxis,
  legend = true,
}: ChartProps) {
  const c = dkt(dark);
  const reduced = useReducedMotion() ?? false;
  const animate = live && !reduced;

  // 硬上限：超過只畫前 3 筆，並明確喊出來 ——
  // 靜靜畫出一張讀不懂的圖比報錯更糟（型別擋不住陣列長度，所以只能在這裡擋）。
  if (import.meta.env.DEV && series.length > MAX_SERIES) {
    console.warn(
      `[deck/Chart] ${series.length} 個系列超過上限 ${MAX_SERIES} —— 只畫前 ${MAX_SERIES} 筆。` +
        `請改用 small multiples（拆成多張圖）或 <Table> 直接標值（inventory §5 決議 1）`,
    );
  }
  const ser = series.slice(0, MAX_SERIES);
  const color = (i: number, s: ChartSeries) => toneColor(s.tone ?? FALLBACK_TONES[i], c).fg;
  const showY = yAxis ?? (variant === "line" || variant === "area");
  const showLegend = legend && ser.length > 1 && variant !== "donut" && variant !== "bars";
  // 圖表畫布高 = 給的總高 − heading − 圖例
  const canvasH = Math.max(80, height - (heading ? HEADING_H : 0) - (showLegend ? LEGEND_H : 0));

  const grid = <CartesianGrid stroke={c.borderSoft} vertical={false} />;
  const xAxis = (
    <XAxis dataKey={categoryKey} tick={tickStyle(c)} stroke={c.border} tickLine={false} axisLine={{ stroke: c.border }} />
  );
  const yAxisEl = showY ? (
    <YAxis tick={tickStyle(c)} stroke={c.border} tickLine={false} axisLine={false} width={48} />
  ) : null;

  const body = () => {
    switch (variant) {
      // ── 進度條列：不走 recharts。純 flex + 寬度百分比就夠（tus p4 / bullmq p8 的樣子），
      //    為了一排橫條去背 recharts 的座標系與動畫反而更重。
      case "bars": {
        warnOverLimit("Chart/bars", data.length, LIMIT_BARS);
        const k = ser[0]?.key ?? "value";
        const t = toneColor(ser[0]?.tone ?? "blue", c);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: DGAP.xs, width }}>
            {data.map((row, i) => {
              const v = Number(row[k] ?? 0);
              const pct = Math.max(0, Math.min(100, (v / max) * 100));
              return (
                <div key={`${row[categoryKey]}-${i}`} style={{ display: "flex", alignItems: "center", gap: DGAP.sm }}>
                  <span style={{ flex: "none", width: 170, fontSize: DS.small, color: c.body }}>
                    {String(row[categoryKey])}
                  </span>
                  <span style={{ flex: 1, height: 14, borderRadius: 7, background: c.sunken, overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${pct}%`,
                        background: t.fg,
                        transition: animate ? "width 320ms var(--ease-out)" : "none",
                      }}
                    />
                  </span>
                  <span
                    style={{
                      flex: "none",
                      width: 76,
                      textAlign: "right",
                      fontSize: DS.small,
                      fontWeight: 700,
                      color: c.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(v, unit)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }

      case "donut": {
        if (import.meta.env.DEV && data.length > MAX_SLICES) {
          console.warn(
            `[deck/Chart] donut ${data.length} 片超過上限 ${MAX_SLICES} —— 只畫前 ${MAX_SLICES} 片。` +
              `SeriesTone 只有 3 色；第 4 類請併成「其他」或改用 <Table>`,
          );
        }
        const slices = data.slice(0, MAX_SLICES);
        const k = ser[0]?.key ?? "value";
        // 半徑要留出外側標籤的空間 —— 用 min(width, height)/2 會讓標籤被畫布邊界裁掉
        // （實測：660 寬的畫布下「自行開發 15%」只剩「…行開發 1」）。
        const r = Math.max(60, Math.min(width * 0.3, canvasH / 2 - 24));
        return (
          <PieChart width={width} height={canvasH}>
            <Pie
              data={slices}
              dataKey={k}
              nameKey={categoryKey}
              cx="50%"
              cy="50%"
              innerRadius={r * 0.58}
              outerRadius={r}
              isAnimationActive={animate}
              stroke={c.slide}
              strokeWidth={2}
              // 直接把「名稱 + 值」標在切片外側 —— 投影片沒有 hover，圖例＋tooltip 讀不出來。
              // 標籤只能用**字串**形態。實測 recharts 2.15：
              //   - 回傳 React element（想自訂 fill / 字級）→ 標籤完全不渲染
              //   - 在 <Pie> 上加 fill / fontSize 想讓它帶到標籤 → **連 sector 都不畫了**
              // 兩條路都試過並回退。字串形態下標籤會**繼承該切片 <Cell> 的顏色**
              // （實測：blue-300 / orange-300 / neutral-300），仍然走 design token，
              // 而且顏色與切片一一對應，等於免了圖例。
              label={(p: PieLabelProps) => `${p.name ?? ""} ${fmt(Number(p.value ?? 0), unit)}`}
              labelLine={{ stroke: c.border }}
            >
              {slices.map((_, i) => (
                <Cell key={i} fill={toneColor(FALLBACK_TONES[i], c).fg} />
              ))}
            </Pie>
          </PieChart>
        );
      }

      case "line":
      case "area": {
        const Comp = variant === "line" ? LineChart : AreaChart;
        return (
          <Comp width={width} height={canvasH} data={data} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
            {grid}
            {xAxis}
            {yAxisEl}
            {ser.map((s, i) =>
              variant === "line" ? (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={color(i, s)}
                  strokeWidth={3}
                  dot={{ r: 4, fill: color(i, s), strokeWidth: 0 }}
                  isAnimationActive={animate}
                />
              ) : (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={color(i, s)}
                  strokeWidth={3}
                  // 純色低透明度，不用漸層（dataviz 反樣式）
                  fill={color(i, s)}
                  fillOpacity={0.16}
                  isAnimationActive={animate}
                />
              ),
            )}
          </Comp>
        );
      }

      default: {
        return (
          <BarChart width={width} height={canvasH} data={data} margin={{ top: 24, right: 16, bottom: 4, left: 0 }}>
            {grid}
            {xAxis}
            {yAxisEl}
            {ser.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId={stacked ? "s" : undefined}
                fill={color(i, s)}
                isAnimationActive={animate}
              >
                {/* 數值直接標在柱上（禁用 tooltip 的配套）。堆疊時標在段內、否則標在柱頂 */}
                <LabelList
                  dataKey={s.key}
                  position={stacked ? "center" : "top"}
                  fontSize={DS.micro}
                  fill={stacked ? "var(--neutral-0)" : c.body}
                  formatter={(v: number) => fmt(v, unit)}
                />
              </Bar>
            ))}
          </BarChart>
        );
      }
    }
  };

  return (
    <BlockShell heading={heading} c={c} style={style}>
      {showLegend ? <Legend series={ser} c={c} dark={dark} /> : null}
      {body()}
    </BlockShell>
  );
}
