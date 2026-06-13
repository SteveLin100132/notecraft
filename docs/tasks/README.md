# 實作 Tasks

各 Task 可獨立實作，彼此無強依賴。完成後跑 `npx tsc --noEmit && npx astro build` 驗證。

## v1.2.0 追加功能（§8.1 Phase 4.5）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 01](task-01-note-series-navigation.md) | 筆記關聯導覽（上一篇 / 下一篇） | 筆記關聯導覽 | schema `series`/`order`、`SeriesNav.astro`、`[slug].astro` |
| [Task 02](task-02-generated-frame-card.md) | AI 生成內容外框卡片 | AI 生成內容外框卡片 | `GeneratedFrame.astro`、SKILL.md / mdx-writer / component-generator |
| [Task 03](task-03-notes-list-sort.md) | 筆記列表排序 | 筆記列表排序 | `NotesList.tsx`、`index.astro` 卡片資料 |

## v1.3.0 追加功能（§8.1 Phase 4.6）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 04](task-04-delete-note.md) | 刪除筆記（dev-only） | 刪除筆記功能 | `DELETE /api/notes/:slug`（dev-api）、`DeleteNoteButton.tsx`、`[slug].astro` |
| [Task 05](task-05-new-note-tag-multiselect.md) | 新增筆記標籤複選選單 | 新增筆記 — 標籤複選選單 | `NewNoteModal.tsx`（讀 `GET /api/tags`） |
| [Task 06](task-06-generated-frame-copy-prompt.md) | GeneratedFrame 提示詞複製 | 外框卡片 — 提示詞複製 | `GeneratedFrame.astro`、SKILL.md / mdx-writer |

> Task 02 另需驗證互動元件不被外框破壞；Task 04 為硬刪除，務必確認二次確認流程。
