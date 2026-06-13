# Task 05 — 新增筆記標籤複選選單

> 對應 PRD v1.3.0 §7.1「新增筆記 — 標籤複選選單」、核心目標 #13。
> 把新增筆記 Modal 的逗號文字輸入升級為可搜尋複選 + 自訂新增。

## 範圍

僅改 dev-only 的 [NewNoteModal.tsx](../../src/components/islands/NewNoteModal.tsx) 的「標籤」欄位。API（`POST /api/notes` 收 `tags: string[]`）介面不變。

## 實作步驟

### 1. 載入既有標籤

在 Modal 開啟時 `fetch("/api/tags")`（既有 dev endpoint，回 `{ tags: { name, count, lastUsed }[] }`），依 `count` 倒序取得既有標籤名稱清單。失敗時設旗標 `apiUnavailable`，退回純文字輸入。

```ts
const [allTags, setAllTags] = useState<string[]>([]);
const [selected, setSelected] = useState<string[]>([]);
const [tagQuery, setTagQuery] = useState("");
const [apiUnavailable, setApiUnavailable] = useState(false);

useEffect(() => {
  if (!open) return;
  fetch("/api/tags")
    .then((r) => r.json())
    .then((d) =>
      setAllTags((d.tags ?? []).map((t: { name: string }) => t.name)),
    )
    .catch(() => setApiUnavailable(true));
}, [open]);
```

### 2. 取代「標籤」Field 的 UI

替換現行 `tags` 單行輸入（state `tags`、`setTags`，以及送出時的 `tags.split(",")`）為複選元件：

- 已選標籤以 chips 呈現（沿用既有 chip 樣式），每個 chip 可 `x` 移除。
- 一個輸入框：輸入即時過濾 `allTags`（去掉已選的），下方浮出可勾選清單。
- 鍵盤：Enter / 逗號 → 把目前輸入字串加入 `selected`（經正規化）；點清單項 → 加入。
- 正規化：trim、過濾空字串、與既有 `selected` 及 `allTags` 不分大小寫去重（保留首次大小寫）。可抽一個 `addTag(raw)` helper。
- `apiUnavailable` 時：隱藏清單，僅保留「輸入 + Enter 新增」的純輸入行為（仍輸出 `selected`）。

### 3. 送出改用 selected

```ts
body: JSON.stringify({ title: title.trim(), tags: selected, folder }),
```

移除舊的 `tags.split(",")...` 邏輯與 `tags` state。重置（開啟 Modal 的 onClick）時清空 `selected`、`tagQuery`。

### 4. 空狀態

`allTags` 為空且非 `apiUnavailable` → 顯示提示「目前尚無既有標籤，直接輸入新增」（PRD 待釐清 Q1 已收斂為仍以選單型輸入呈現）。

## 驗收（對應 PRD 驗收表）

- [x] 打開 Modal 列出既有標籤（依使用次數倒序）供勾選
- [x] 輸入關鍵字即時過濾既有標籤
- [x] 可勾選既有 + 自訂新增，chips 正確呈現並送出寫入 frontmatter.tags
- [x] 新標籤與既有不分大小寫重複時自動去重
- [x] `GET /api/tags` 失敗時退回純文字輸入仍可建立
- [x] `npx astro build` 通過

## 風險 / 備註

- 標籤正規化規則需與全站一致（trim / 空字串過濾 / 不分大小寫去重保留首次大小寫）。
- 純前端互動；不需動 API。注意 Modal 關閉 / 重開時重置狀態避免殘留。
