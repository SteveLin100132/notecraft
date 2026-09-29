// Dashboard 總覽的純函式（規格 docs/notecraft-workbench-dashboard.md §4.3）。
// **只能 `import type`、不能有 JSX**：scripts/checks/wb-dashboard.mjs 以 Node --experimental-strip-types 直接載入做斷言。
// 元件（src/components/wb/dashboard/*）只做 JSX 與 DOM 量測，版面演算法全在這裡。

export type ReadingKey = "done" | "reading" | "not-started";

export type Rect = { x: number; y: number; w: number; h: number };

export type TreemapItem = {
  /** 標籤名；「其他」為 "__rest" */
  k: string;
  /** 顯示用文字；沒有就顯示 `#k` */
  l?: string;
  v: number;
  rest?: boolean;
};

export type TileTier = "big" | "full" | "num" | "none";

export function countByStatus(statuses: ReadingKey[]): Record<ReadingKey, number> {
  const out: Record<ReadingKey, number> = { done: 0, reading: 0, "not-started": 0 };
  for (const s of statuses) out[s] += 1;
  return out;
}

/**
 * 遞迴二分 treemap（pt-dash2.jsx 的 dvTreemap 原樣）。
 * 依累計值把項目切成約各佔一半的兩組，較寬的方向優先切；每塊面積與 v 成正比；座標以 % 計。
 * 輸入應已依 v 遞減；v 全為 0 時回傳空陣列（沒有東西可畫）。
 */
export function treemap<T extends { v: number }>(items: T[], x: number, y: number, w: number, h: number): (T & Rect)[] {
  const out: (T & Rect)[] = [];
  const rec = (list: T[], rx: number, ry: number, rw: number, rh: number): void => {
    if (!list.length) return;
    if (list.length === 1) {
      out.push({ ...list[0], x: rx, y: ry, w: rw, h: rh });
      return;
    }
    const tot = list.reduce((a, i) => a + i.v, 0);
    if (tot <= 0) return;
    let acc = 0;
    let k = 0;
    while (k < list.length - 1 && acc + list[k].v <= tot / 2) {
      acc += list[k].v;
      k++;
    }
    if (k === 0) {
      acc = list[0].v;
      k = 1;
    }
    const a = list.slice(0, k);
    const b = list.slice(k);
    const r = acc / tot;
    if (rw >= rh) {
      rec(a, rx, ry, rw * r, rh);
      rec(b, rx + rw * r, ry, rw * (1 - r), rh);
    } else {
      rec(a, rx, ry, rw, rh * r);
      rec(b, rx, ry + rh * r, rw, rh * (1 - r));
    }
  };
  rec(
    items.filter((i) => i.v > 0),
    x,
    y,
    w,
    h,
  );
  return out;
}

/** 依方塊實際像素決定顯示等級（handoff §6「自適應文字」）。 */
export function tileTier(pw: number, ph: number): TileTier {
  if (pw >= 120 && ph >= 84) return "big";
  if (pw >= 60 && ph >= 42) return "full";
  if (pw >= 24 && ph >= 22) return "num";
  return "none";
}

/**
 * 前 max 名 + 「其他 N 個」。
 * `tags` 是 build 期已依 count 遞減的前 max 筆；`total` 是全站標籤數、`useTotal` 是全站標記次數（分母在 build 期算好）。
 * 其他的值 = useTotal − 前 max 筆總和；N = total − max；N ≤ 0 或值 ≤ 0 時不加。
 */
export function topTagsWithRest(
  tags: { name: string; count: number }[],
  max: number,
  total: number,
  useTotal: number,
): TreemapItem[] {
  const top = tags
    .filter((t) => t.count > 0)
    .slice(0, max)
    .map((t) => ({ k: t.name, v: t.count }));
  const restN = total - top.length;
  const restV = useTotal - top.reduce((a, t) => a + t.v, 0);
  if (restN > 0 && restV > 0) top.push({ k: "__rest", l: `其他 ${restN} 個`, v: restV, rest: true } as TreemapItem);
  return top;
}

/** 方塊配色索引（DV_TILE）：前 3 名固定，之後在第 4–6 種之間輪替；「其他」回 −1。 */
export function tileStyleIndex(i: number, rest: boolean): number {
  if (rest) return -1;
  return i < 3 ? i : 3 + ((i - 3) % 3);
}
