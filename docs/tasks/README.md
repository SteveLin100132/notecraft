# 實作 Tasks — v1.2.0 追加功能

對應 PRD v1.2.0（§7.1 三個新 spec、§8.1 Phase 4.5）。各 Task 可獨立實作，彼此無強依賴。

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 01](task-01-note-series-navigation.md) | 筆記關聯導覽（上一篇 / 下一篇） | 筆記關聯導覽 | schema `series`/`order`、`SeriesNav.astro`、`[slug].astro` |
| [Task 02](task-02-generated-frame-card.md) | AI 生成內容外框卡片 | AI 生成內容外框卡片 | `GeneratedFrame.astro`、SKILL.md / mdx-writer / component-generator |
| [Task 03](task-03-notes-list-sort.md) | 筆記列表排序 | 筆記列表排序 | `NotesList.tsx`、`index.astro` 卡片資料 |

完成後跑 `npx tsc --noEmit && npx astro build` 驗證（Task 02 另需驗證互動元件不被外框破壞）。
