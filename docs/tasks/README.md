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

## v1.4.0 追加功能（§8.1 Phase 4.7）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 07](task-07-sidebar-collapse.md) | 側邊欄收合 | 側邊欄收合（Sidebar collapse） | `Sidebar.astro`、`BaseLayout.astro`（vanilla JS + CSS） |
| [Task 08](task-08-note-favorites.md) | 筆記收藏 | 筆記收藏（Favorites） | `lib/favorites.ts`、`NotesList.tsx`、`FavoriteButton.tsx`、`[slug].astro` |

## v1.5.0 追加功能（§8.1 Phase 4.8）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 09](task-09-series-data-model.md) | 系列資料模型 + 閱讀進度狀態層 | 系列資料模型 | `src/data/series.ts`、`lib/series.ts`、`lib/reading-progress.ts` |
| [Task 10](task-10-series-overview-page.md) | 系列總覽頁 `/series` | 系列總覽頁面 | `pages/series/index.astro`、`SeriesOverview.tsx`、`Sidebar.astro` |
| [Task 11](task-11-series-detail-page.md) | 系列詳情頁 `/series/[id]` | 系列詳情頁面 | `pages/series/[id].astro`、`SeriesDetail.tsx` |
| [Task 12](task-12-reading-progress-noteview.md) | 筆記頁閱讀進度 + 升級 SeriesNav | 閱讀進度與系列彙總 | `ReadingControl.tsx`、`DonePrompt.tsx`、`SeriesNav`（升級）、`[slug].astro` |
| [Task 13](task-13-progress-list-dashboard.md) | 列表卡徽章 + Dashboard 繼續閱讀 | 閱讀進度與系列彙總 | `NotesList.tsx`、`ContinueReading.tsx`、`index.astro` |

> Task 02 另需驗證互動元件不被外框破壞；Task 04 為硬刪除，務必確認二次確認流程。
> Task 07 注意 FOUC 防閃動 inline script；Task 08 注意星號擋卡片導頁與 hydration mismatch。
## v1.6.0 追加功能（§8.1 Phase 4.9）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 14](task-14-markdown-directive-admonitions.md) | Markdown directive 底座 + Admonitions | Markdown 擴充語法 | `remark-directive`、`lib/remark-notecraft-directives.ts`、`astro.config.mjs`、admonition CSS |
| [Task 15](task-15-content-tabs.md) | Content tabs（內容分頁） | Markdown 擴充語法 | 擴充 remark transform（tabs）、tab CSS + vanilla JS |
| [Task 16](task-16-tooltips.md) | Tooltips（行內提示） | Markdown 擴充語法 | 擴充 remark transform（tip）、tooltip CSS（零 JS） |

> **Task 14 為 15、16 的基礎**（共用 `remark-directive` 底座），先做。全域縮寫（abbreviations）已確認**不做**（PRD §Q3）。語法採 directive 風格、tabs 互動採框架無關 vanilla JS。新增依賴 `remark-directive` 需作者同意。

> **Task 09 為 10～13 的基礎**；先做。三個待釐清項已於 2026-06-16 收斂：① **registry `slugs` 為章節順序唯一權威**（舊 `series`/`order` 停用）；② **不做「可追蹤 / 未發佈」判定**（全部筆記皆可追蹤、`tracked` = `total`、僅三態）；③ **升級版 `SeriesNav` 取代既有 prev/next**（prev/next 內嵌不消失）。
