# Task 04 — 刪除筆記功能（dev-only）

> 對應 PRD v1.3.0 §7.1「刪除筆記功能（dev-only）」、核心目標 #12。
> dev 環境 UI 刪除筆記，並連帶移除「僅被該筆記引用」的 generated 元件（共用元件保留）。

## 範圍

dev-only 的刪除入口（[筆記檢視頁面](../../src/pages/notes/[slug].astro) 為主、列表頁加分）＋ `DELETE /api/notes/:slug` dev API。硬刪除、二次確認、依靠 git 復原。

## 實作步驟

### 1. dev API：`DELETE /api/notes/:slug`

檔案：`src/dev-api/integration.ts`（沿用既有 middleware 風格與 `localhostOnly` / `listMdx` / `findNoteFile` / `readNote`）。

```ts
async function handleDeleteNote(cwd: string, slug: string, res: ServerResponse) {
  const file = await findNoteFile(cwd, slug);
  if (!file) return json(res, 404, { error: "note not found" });

  // 解析本筆記的標記 id
  const { content } = await readNote(file);
  const ids = [...content.matchAll(/\{\/\*\s*@ai-visualize[\s\S]*?\bid:\s*([\w-]+)[\s\S]*?\*\/\}/g)].map((m) => m[1]);

  // 掃描其他 MDX 仍引用的 id（保留共用元件）
  const root = path.join(cwd, NOTES_ROOT);
  const others = (await listMdx(root)).filter((f) => f !== file);
  const referencedElsewhere = new Set<string>();
  for (const f of others) {
    const { content: c } = await readNote(f);
    for (const id of ids) {
      if (new RegExp(`id:\\s*${id}\\b`).test(c)) referencedElsewhere.add(id);
    }
  }

  const deletedComponents: string[] = [];
  const keptShared: string[] = [];
  for (const id of ids) {
    const comp = path.join(cwd, "src/components/generated", `${id}.tsx`);
    if (referencedElsewhere.has(id)) { keptShared.push(`${id}.tsx`); continue; }
    try { await fs.unlink(comp); deletedComponents.push(`${id}.tsx`); } catch { /* 不存在則略過 */ }
  }

  await fs.unlink(file);
  return json(res, 200, { deletedNote: path.relative(cwd, file), deletedComponents, keptShared });
}
```

在 middleware 路由表新增（與既有 `/api/notes/:slug/tags` 並列）：

```ts
// /api/notes/:slug — DELETE
if (parts.length === 3 && parts[1] === "notes" && req.method === "DELETE") {
  return await handleDeleteNote(cwd, decodeURIComponent(parts[2]), res);
}
```

> 注意：既有 `id` 正規表達式可重用 `src/lib/notes.ts` 的 `MARKER_RE` 邏輯，但 dev-api 不 import astro:content；用獨立 regex 即可。確保 regex 對多行標記穩健。

### 2. 共用刪除確認 island

新增 `src/components/islands/DeleteNoteButton.tsx`（React island，client:idle）：

- Props：`slug: string`、`title: string`、`componentIds: string[]`（由頁面以 `parseMarkers` 算出）。
- 點擊 → 開二次確認 Modal（沿用 NewNoteModal 的 Modal 視覺、danger 色）：
  - 顯示標題、`src/content/notes/<slug>.mdx`
  - 列出將刪除的 `generated/<id>.tsx`（component 清單）
  - 確認後 `fetch(`/api/notes/${slug}`, { method: "DELETE" })`
  - 成功 → toast（`nc-toast` 事件）＋ `location.assign("/notes")`
  - 失敗 → toast 錯誤
- 注意：「將保留的共用元件」資訊由 API 回傳，可在成功 toast 中補充；確認前的預覽以本頁 componentIds 呈現即可（共用判斷以 API 為準）。

### 3. 接入筆記檢視頁

檔案：`src/pages/notes/[slug].astro`（`isDev` 動作區，與「以 VS Code 編輯」同列）：

```astro
import DeleteNoteButton from "@/components/islands/DeleteNoteButton.tsx";
const componentIds = markers.map((m) => m.id);
...
{isDev && <DeleteNoteButton client:idle slug={note.slug} title={note.data.title} componentIds={componentIds} />}
```

### 4.（加分）列表頁卡片刪除入口

[NotesList.tsx](../../src/components/islands/NotesList.tsx) 卡片 hover 動作區提供刪除，共用同一確認流程與 API。需把每張卡片的 `markers` id 傳入（index.astro 的 `cards` 已可加 `componentIds`）。

## 驗收（對應 PRD 驗收表）

- [x] 刪除筆記同時刪除其專屬 generated 元件，導回列表
- [x] 被其他筆記引用的共用元件保留（API 回傳 `keptShared`）
- [x] 二次確認 Modal 列出 MDX 路徑與將刪 / 將保留元件
- [x] 正式環境不顯示刪除按鈕；build 不輸出 `DELETE` endpoint
- [x] 不存在的 slug → 404，不刪任何檔案
- [x] `npx astro build` 通過

## 風險 / 備註

- 硬刪除、無 undo；確認 Modal 是唯一防線，務必清楚列出受影響檔案。
- 與孤兒元件政策一致：本功能為「明確、具範圍、二次確認」的刪除，不是自動清理。
- best-effort：刪元件失敗回報已刪 / 未刪，不做 rollback。
