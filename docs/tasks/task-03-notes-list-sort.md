# Task 03 — 筆記列表排序

> 對應 PRD v1.2.0 §7.1「筆記列表排序」、核心目標 #11。
> 列表頁可依建立 / 更新時間 / 標題切換並支援升降冪；預設維持更新時間倒序。

## 範圍

在 [筆記列表頁面](../../src/pages/notes/index.astro) 的 [NotesList](../../src/components/islands/NotesList.tsx) 加入排序控制，與既有標籤過濾 / 關鍵字搜尋疊加。純前端，無後端 API。

## 實作步驟

### 1. 卡片資料補上 createdAt + title

檔案：`src/pages/notes/index.astro`，`cards` map 內新增：

```ts
createdAt: n.data.createdAt,
// title 已有
```

`NoteCardData`（`NotesList.tsx`）型別新增 `createdAt: string;`。

### 2. NotesList 加入排序 state 與 UI

檔案：`src/components/islands/NotesList.tsx`

```ts
type SortField = "updatedAt" | "createdAt" | "title";
type SortDir = "asc" | "desc";
const [sortField, setSortField] = useState<SortField>("updatedAt");
const [sortDir, setSortDir] = useState<SortDir>("desc"); // 預設更新時間倒序
```

排序套在現有 `filtered` 的 `.sort()`（取代目前寫死的 `b.updatedAt.localeCompare(a.updatedAt)`）：

```ts
.sort((a, b) => {
  let cmp: number;
  if (sortField === "title") cmp = a.title.localeCompare(b.title);
  else cmp = a[sortField].localeCompare(b[sortField]); // YYYY-MM-DD 字典序 = 時間序
  return sortDir === "asc" ? cmp : -cmp;
})
```

把 `sortField` / `sortDir` 加進 `useMemo` 依賴陣列。

### 3. 排序控制 UI

於工具列（搜尋框 / grid|list 切換同一列）新增：

- 排序欄位：分段按鈕或 `<select>` —「更新時間 / 建立時間 / 標題」。
- 方向切換鈕：icon（升 / 降）切換 `sortDir`。
- 樣式沿用既有版型切換鈕的 pill / segment 樣式（`--neutral-100` 底、選中 `#fff` + `--blue-700`），遵循 `trendlink-design`。

### 4. （選用，列為加分）URL query 同步

PRD 待釐清 Q1 已收斂為 v1 **不同步**。若日後需求出現，再加 `?sort=&dir=`，與既有 `?tag=` 行為一致。

## 驗收（對應 PRD 驗收表）

- [x] 未調整時預設依更新時間降冪（與舊版一致）
- [x] 建立時間升冪：最早 → 最新
- [x] 標題降冪：依 `localeCompare`（含中文）反向
- [x] 排序與標籤過濾 / 搜尋疊加，不清除過濾條件
- [x] grid / list 兩種版型皆套用
- [x] `npx astro build` 通過

## 風險

- 標題排序需處理空標題與大小寫；`localeCompare` 已涵蓋，注意排序穩定性避免同鍵亂序。
- 排序選項固定列舉（3 欄位 × 2 方向），不接受任意 frontmatter 欄位。
