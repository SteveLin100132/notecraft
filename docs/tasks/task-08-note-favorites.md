# Task 08 — 筆記收藏（Favorites）

> 對應 PRD v1.4.0 §7.1「筆記收藏（Favorites）」、核心目標 #16。
> 星號收藏（卡片 + 檢視頁）＋ 列表「只看收藏」篩選；狀態存 `localStorage`，正式環境可用。

## 範圍

- [NotesList.tsx](../../src/components/islands/NotesList.tsx)：卡片星號 + 「只看收藏」篩選。
- 檢視頁 [[slug].astro](../../src/pages/notes/[slug].astro)：頁首收藏切換鈕（新 island）。
- 共用收藏邏輯（建議抽 `src/lib/favorites.ts` 給 client 用）。
- 純前端、無 API、不寫 MDX、不進 build 統計。

## 實作步驟

### 1. 收藏存取小工具（client-only）

新增 `src/lib/favorites.ts`：

```ts
const KEY = "nc:favorites";

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}
export function toggleFavorite(slug: string): boolean {
  const cur = new Set(getFavorites());
  const now = !cur.has(slug);
  if (now) cur.add(slug);
  else cur.delete(slug);
  try {
    localStorage.setItem(KEY, JSON.stringify([...cur]));
  } catch {
    /* localStorage 不可用時降級：僅當下 session 有效 */
  }
  window.dispatchEvent(new CustomEvent("nc-favorites-changed"));
  return now;
}
```

- `nc-favorites-changed` 事件讓同分頁的卡片與篩選即時同步；跨分頁可另聽 `storage` 事件（加分）。

### 2. NotesList：卡片星號 + 篩選

- state：`const [favs, setFavs] = useState<string[]>([])`；`const [onlyFav, setOnlyFav] = useState(false)`。
- `useEffect` 掛載時 `setFavs(getFavorites())`，並監聽 `nc-favorites-changed` 重新讀取（避免 hydration mismatch：初次 render 視為空，effect 後修正）。
- 在 `NoteCardGrid` / `NoteCardList` 右上角加星號鈕：
  - `onClick={(e) => { e.preventDefault(); e.stopPropagation(); const now = toggleFavorite(note.slug); ... }}`（卡片本身是 `<a>`，務必擋冒泡與預設導頁）。
  - 已收藏實心 + 強調色（lucide `Star`，`fill` 切換）；未收藏空心。
- 「只看收藏」toggle：放工具列（搜尋 / 排序同列）。
- `filtered` 串接：在既有標籤過濾 / 搜尋 / 排序鏈上再加 `if (onlyFav && !favs.includes(n.slug)) return false`。
- 空狀態：`onlyFav && filtered.length === 0` → 顯示「尚無收藏，點卡片上的星號加入」。

### 3. 檢視頁收藏鈕

新增 `src/components/islands/FavoriteButton.tsx`（client:idle）：

- Props：`slug: string`。
- `useState` + `useEffect` 讀 `isFavorite(slug)`；點擊 `toggleFavorite(slug)` 更新；監聽 `nc-favorites-changed`。
- 星號 + 文案（「收藏」/「已收藏」），樣式比照頁首其他動作鈕（trendlink-design）。
- 接入 `[slug].astro` 頁首動作區（與「以 VS Code 編輯」等同列；此鈕**dev 與正式皆顯示**）：

```astro
import FavoriteButton from "@/components/islands/FavoriteButton.tsx";
...
<FavoriteButton client:idle slug={note.slug} />
```

### 4. hydration / SSR 注意

- SSR 無 localStorage：初始一律渲染「未收藏」，`useEffect` 後再依 localStorage 修正，避免 hydration mismatch。
- 讀取顯示時，列表的收藏篩選只作用於目前存在的卡片（slug），自然忽略孤兒 slug。

## 驗收（對應 PRD 驗收表）

- [ ] 卡片星號可切換、寫入 localStorage、不觸發卡片導頁
- [ ] 檢視頁收藏後回列表，該卡片為已收藏（跨頁一致）
- [ ] 「只看收藏」只顯示收藏項，且與標籤 / 搜尋 / 排序疊加
- [ ] 收藏為空開篩選 → 空狀態提示
- [ ] 重整後依 localStorage 還原
- [ ] 正式環境（build 後）可收藏，無需 API
- [ ] `npx astro build` 通過、無 hydration 警告

## 風險 / 備註

- 星號在 `<a>` 卡片內：務必 `preventDefault` + `stopPropagation`，否則點星號會跳轉。
- 隱私模式 localStorage 受限：try/catch 降級，不可報錯中斷。
- 收藏不進 git / 不入 Dashboard 統計（build-time 無法得知各裝置狀態）—— 與 PRD 決策一致。
