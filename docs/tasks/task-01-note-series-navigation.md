# Task 01 — 筆記關聯導覽（上一篇 / 下一篇）

> 對應 PRD v1.2.0 §7.1「筆記關聯導覽（上一篇 / 下一篇）」、核心目標 #9。
> 依 frontmatter 手動序列（`series` + `order`）於 build 階段計算前後篇。

## 範圍

在 [筆記檢視頁面](../../src/pages/notes/[slug].astro) 底部，依作者定義的系列序列顯示「上一篇 / 下一篇」卡片連結。dev / 正式環境皆顯示。

## 實作步驟

### 1. 擴充 Content Collections schema

檔案：`src/content/config.ts`

```ts
schema: z.object({
  title: z.string(),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  series: z.string().optional(),     // 新增：系列識別名稱
  order: z.number().optional(),      // 新增：同系列內排序（升冪）
  createdAt: z.string(),
  updatedAt: z.string(),
}),
```

### 2. 序列計算工具

檔案：`src/lib/notes.ts`，新增：

```ts
export type SeriesNav = {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

export function seriesNav(notes: Note[], current: Note): SeriesNav {
  const series = current.data.series;
  if (!series) return { prev: null, next: null };
  const group = notes
    .filter((n) => n.data.series === series)
    .sort(
      (a, b) =>
        (a.data.order ?? 0) - (b.data.order ?? 0) ||
        a.data.createdAt.localeCompare(b.data.createdAt) ||
        a.data.title.localeCompare(b.data.title),
    );
  if (group.length < 2) return { prev: null, next: null };
  const i = group.findIndex((n) => n.slug === current.slug);
  const toLink = (n?: Note) => (n ? { slug: n.slug, title: n.data.title } : null);
  return { prev: toLink(group[i - 1]), next: toLink(group[i + 1]) };
}
```

- 同 series 內 `order` 重複 / 缺漏 → 以 `order`→`createdAt`→`title` 穩定排序；建議在 build 期 `console.warn` 提示作者（不中斷 build）。

### 3. 導覽卡片元件

新增 `src/components/SeriesNav.astro`（純靜態 Astro 元件，無需 island）：

- Props：`prev`、`next`（皆可 `null`）。
- 兩張並排卡片，左卡「上一篇」+ `«`、右卡「下一篇」+ `»`；單側為 `null` 時該側留白 / 撐滿。
- 樣式遵循 `trendlink-design`：`--radius-lg`、`--neutral-200` 邊框、`--shadow-xs`、hover 套 `nc-card-link`（與 NotesList 卡片一致）；標題色 `--text-strong`、方向標籤 `--text-muted`。
- 卡片為 `<a href={/notes/${slug}}>`。

### 4. 接入筆記檢視頁

檔案：`src/pages/notes/[slug].astro`

```astro
import SeriesNav from "@/components/SeriesNav.astro";
import { getAllNotes, seriesNav, ... } from "@/lib/notes";
const allNotes = await getAllNotes();
const nav = seriesNav(allNotes, note);
```

在內文 footer（「建立於 / src/content/notes/...」那段）附近渲染：

```astro
{(nav.prev || nav.next) && <SeriesNav prev={nav.prev} next={nav.next} />}
```

## 驗收（對應 PRD 驗收表）

- [x] 系列中段同時顯示前後兩卡且連到正確 slug
- [x] 系列首篇只顯示「下一篇」、末篇只顯示「上一篇」
- [x] 未設 `series` 或系列僅 1 篇 → 不渲染導覽
- [x] 點擊卡片導向對應 `/notes/[slug]`
- [x] `npx astro build` 通過；卡片樣式符合 design system

## 備註 / 風險

- 範本筆記（`POST /api/notes` 的 TEMPLATE）可不帶 `series`，未分系列筆記不受影響。
- 可選：為示範建立一個 2～3 篇的 series 驗證頭 / 中 / 尾三種情況。
