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

## v1.7.0 追加功能（§8.1 Phase 4.10）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 17](task-17-expressive-code-foundation.md) | astro-expressive-code 底座 + Shiki 遷移 | 程式碼區塊增強 | `astro-expressive-code`、`astro.config.mjs`（取代 `shikiConfig`）、EC 主題對齊 token |
| [Task 18](task-18-code-filename-copy-linenumbers.md) | 檔名標題 + 複製按鈕 + 行號 | 程式碼區塊增強 | EC frame（`title`/copy）、`@expressive-code/plugin-line-numbers`、fence meta |
| [Task 19](task-19-code-line-highlight.md) | 行 / 文字 / diff highlight | 程式碼區塊增強 | EC 行 / 文字 / diff 標記、語意色 token |
| [Task 20](task-20-code-annotations.md) | Code annotations（互動式編號標記） | 程式碼區塊增強（Code annotations） | `:::annotate` 容器、自訂 remark/rehype、框架無關 vanilla JS |

> **Task 17 為 18 ~ 20 的引擎底座，先做。** 三項待釐清已於 2026-06-21 收斂：① 引擎採 **`astro-expressive-code`**（取代現有 Shiki 設定）；② Code annotations 採**完整互動式標記**（vanilla JS）；③ annotation 以 **`:::annotate` 容器**顯式配對。**Task 20 另依賴 [Task 14](task-14-markdown-directive-admonitions.md) 的 `remark-directive` 底座**。新增依賴 `astro-expressive-code` / `@expressive-code/plugin-line-numbers` 已徵得作者同意。

## v1.8.0 追加功能（§8.1 Phase 4.11）

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 21](task-21-markdown-badge.md) | Markdown 擴充：Badge | Markdown 擴充語法：Badge | 擴充 `remark-notecraft-directives.ts`（`textDirective` `badge`）、badge CSS |
| [Task 22](task-22-markdown-steps.md) | Markdown 擴充：Steps | Markdown 擴充語法：Steps | 擴充 `remark-notecraft-directives.ts`（`containerDirective` `steps` / `step`）、steps CSS（vertical / horizontal） |

> **皆依賴 [Task 14](task-14-markdown-directive-admonitions.md) 的 `remark-directive` 底座**，無新外部依賴。八項待釐清已於 2026-06-22 收斂：Badge — ① variant 語意色 + **與 Admonitions 共用 token**、② 預設 solid、③ v1 支援 `icon`、④ v1 支援 `href`；Steps — ① 預設 vertical、② 支援 `status` 三態、③ `< 640px` 強制降級、④ step 內全支援巢狀 Markdown。

## v1.9.0 追加功能（§8.1 Phase 4.12）— 筆記轉簡報

> 設計交接包：`~/Downloads/design_handoff_note_to_deck/`（`README.md` + `source_reference/deck.jsx`、`present.jsx` 為版型與行為權威）。本輪範圍＝**渲染 + 檢視/播放 + 工具列入口 + 範例 deck**；AI 生成端（`content-present` SKILL、`present-planner`/`slide-generator` agent）為 PRD 已規劃之獨立後續 phase，不在本輪。

| Task | 功能 | PRD spec | 主要改動 |
| --- | --- | --- | --- |
| [Task 23](task-23-deck-data-model-resolution.md) | Deck 資料模型 + 兩模式列舉解析（基礎 / spike） | 筆記轉簡報 + 封裝相容性 | `lib/decks.ts`（`Deck`/`Slide` 型別、`import.meta.glob` 合併 `@/`+`@notes`） |
| [Task 24](task-24-deck-theme-slide-layouts.md) | Deck 主題 token + 8 種版型元件 | 筆記轉簡報 §版型詞彙 | `components/deck/theme.ts`、`components/deck/slideLayouts.tsx`（token 直用、lucide、full-visual 收 viz 參照） |
| [Task 25](task-25-slide-frame-scaling.md) | SlideFrame 16:9 等比縮放 | 筆記轉簡報 §畫布與縮放 | `components/deck/SlideFrame.tsx`（`useMeasure`、scale） |
| [Task 26](task-26-present-app-island.md) | PresentApp island（檢視 / 播放 / 大綱 / 主題） | 筆記轉簡報 §簡報模式 | `islands/PresentApp.tsx`（Fullscreen API、鍵盤、localStorage 主題） |
| [Task 27](task-27-present-route-layout.md) | `/present/[...slug]` 路由 + 無側邊欄外殼 | 筆記轉簡報 §簡報模式、封裝相容性 | `layouts/PresentLayout.astro`、`pages/present/[...slug].astro`（getStaticPaths、`client:only`） |
| [Task 28](task-28-sample-deck.md) | 範例 deck（端到端驗證） | 筆記轉簡報 | `components/generated/role-responsibility-rr.deck.tsx`（接真的 `rr-raci`） |
| [Task 29](task-29-note-toolbar-entry.md) | 筆記頁功能列簡報入口 + 生成簡報鈕 | 筆記轉簡報 §觸發、待釐清 Q1 | `pages/notes/[...slug].astro`、`islands/GenerateDeckButton.tsx` |
| [Task 30](task-30-keyframes-dashboard-stat.md) | 動效 keyframes + Dashboard 簡報統計 | 筆記轉簡報 §Dashboard、§Interactions | `styles/global.css`（keyframes）、`lib/notes.ts`、`pages/index.astro` |

> **Task 23 為 24～30 的基礎，先做**（含唯一 spike：`import.meta.glob` 對 `@notes` alias 的兩模式列舉；spike 不過走 fs 列舉退路，於 Task 23 內定案）。三項對齊設計交接的決策已於 2026-07-29 收斂：① deck 產物採 **`.tsx` 模組**（`src/components/generated/<slug>.deck.tsx`，攤平兩層符合 watcher），**非** content collection；② `full-visual` **直接 import 生成元件、以 component 參照傳入**（取代原型 `vizId` + `window.GENERATED` registry）；③ 主題 **跟隨系統 + localStorage 記憶**。版型庫（decklib）頁 v1 延後。

## v1.10.0 追加功能（§8.1 Phase 4.13 待補）— 簡報版型改制（contract v0.2）

> 依據：[deck-slide-contract.md](../deck-slide-contract.md) **v0.2** + [deck-design-audit.md](../deck-design-audit.md)。
> 作者決策：內容頁不再由系統版型枚舉，改為 **`custom` 自由頁**；只保留 5 個「結構固定、不需要創意」的版型
> （`cover` / `section` / `quote` / `closing` / `full-visual`）。
> **PRD §8.1 尚未有 Phase 4.13 條目、文件版本仍為 v1.9.0** —— 待補（可用 `/bump-prd`）。

| Task | 功能 | 依據 | 主要改動 |
| --- | --- | --- | --- |
| [Task 31](task-31-deck-type-union-v02.md) | Deck 型別重構：6 版型 union + Tone 拆分（基礎） | contract §3/§4/§6 | `lib/decks.ts`（discriminated union、`SeriesTone`/`StatusTone`、`CustomSlideProps`） |
| [Task 32](task-32-deck-scale-status-tokens.md) | 原子層 token：字級階梯 + status 暗色階 | contract §5.1/§5.2、audit B-1/B-2/B-4 | `components/deck/scale.ts`（新增）、`styles/tokens.css`、`components/deck/theme.ts` |
| [Task 33](task-33-slide-chrome-fixed-layouts.md) | SlideChrome 抽離 + 5 個固定版型改寫 | contract §4/§6 | `components/deck/SlideChrome.tsx`（新增，含 `chromeMetrics()`）、`slideLayouts.tsx` |
| [Task 34](task-34-deck-block-components.md) | Block 元件庫（6 個） | contract §5.3/§5.3.1 | `components/deck/blocks/`（Rows/Cards/Stages/Kpi/Table/Compare） |
| [Task 35](task-35-custom-slide-frame.md) | `custom` 版型渲染 + SlideFrame（area / 溢出偵測 / a11y） | contract §6/§7.3、audit B-5 | `slideLayouts.tsx`（`LayoutCustom`）、`SlideFrame.tsx` |
| [Task 36](task-36-present-skill-agents-v02.md) | Skill + 兩個 agent 改寫（含截圖驗證） | contract §7/§8、audit A-1～A-9 | `content-present/SKILL.md`、`present-planner.md`、`slide-generator.md`、`skill-template/` |
| [Task 37](task-37-regenerate-existing-decks.md) | 重新生成 3 份既有 deck（端到端驗證） | contract §11.3 | `components/generated/*.deck.tsx` |

> **2026-07-31：Task 31–37 全部完成。** 三份 deck 已用新 pipeline 重新生成（11 / 12 / 13 頁，
> 皆一次過驗證），viewer 模式已實測通過。各 Task 檔末有實作記錄，含過程中修掉的問題與偏離原計畫的理由。
> 剩餘後續：`slide-generator` 的截圖層歸屬（它沒有瀏覽器工具）、audit C-1／C-2、PRD Phase 4.13 條目。
>
> **Task 31 為 32～37 的基礎，先做。** 建議順序 31 → 32 → 33／34（可並行）→ 35 → 36 → 37。
> 契約 §12 的 5 項待確認已於 2026-07-30 全部收斂：① layout 命名採 **`custom`**（非 `freestyle`）；
> ② block 元件庫做 **6 個**（砍掉純版面的 `text`/`columns`/`viz`）；③ `custom` 頁元件**一律單檔、不設行數上限**；
> ④ `IconName` **維持 21 個**，治理範圍限於 SlideChrome 欄位與 block props（`custom` 頁可直接 import lucide-react）；
> ⑤ `section` **維持固定版型**但開 `numScale`/`align`/`tone` 三個參數。
>
> **注意中間態**：Task 31 會把既有 deck 使用退役版型的頁**暫時移除**以維持 build 綠燈，
> 由 Task 37 重新生成補回。若不接受中間態，31→37 應視為不可分割的批次。
>
> **本批最大風險**：v0.1 靠型別與元件保證設計品質，v0.2 有一部分改由 SKILL 的文字保證。
> Task 37 是這些規則的第一次真實檢驗；產出不如預期時，修 Task 36 的文字或 Task 34 的 API，
> **不要回頭加型別限制**（那等於退回 v0.1）。

## v1.5.0 補充

> **Task 09 為 10～13 的基礎**；先做。三個待釐清項已於 2026-06-16 收斂：① **registry `slugs` 為章節順序唯一權威**（舊 `series`/`order` 停用）；② **不做「可追蹤 / 未發佈」判定**（全部筆記皆可追蹤、`tracked` = `total`、僅三態）；③ **升級版 `SeriesNav` 取代既有 prev/next**（prev/next 內嵌不消失）。
