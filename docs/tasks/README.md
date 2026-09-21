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

## v1.11.0 追加功能（§8.1 Phase 4.14 待補）— 原子層擴充（technical deck atoms）

> 依據：[deck-atoms-inventory.md](../deck-atoms-inventory.md) —— 作者 5 份技術主題分享簡報
> 共 **94 頁**的逐頁圖例盤點。起因是作者指出「custom 版型庫缺少 Chart 的創作」。
> 盤點結果：最大缺口其實是**程式碼呈現（36/94 頁）**與**架構拓撲（18/94 頁）**，
> 而**有軸的量化圖表在 94 頁裡是 0 張** —— Chart 確實缺，但規格得從 `dataviz` skill 推導。
> **PRD §8.1 尚未有 Phase 4.14 條目** —— 待補（可用 `/bump-prd`，Phase 4.13 也還欠著）。

| Task | 功能 | 依據 | 主要改動 |
| --- | --- | --- | --- |
| [Task 38](task-38-deck-code-atom.md) | `<Code>` 原子 + tokenizer 共用模組 + `atoms.deck.tsx` 骨架（基礎） | inventory §2 A1–A3/A6、§5 決議 2/3 | `lib/code-tokenize.ts`（新增）、`remark-notecraft-codeblock.ts`（重構引用）、`deck/blocks/Code.tsx`、`codeTokens.ts`、`generated/atoms.deck.tsx`（新增） |
| [Task 39](task-39-deck-annotate-atom.md) | `<Annotate>` 通用標註層 | inventory §2 A2/B2/E1 | `deck/blocks/Annotate.tsx` |
| [Task 40](task-40-deck-chart-atom.md) | `<Chart>` 原子（bar / line / area / donut / bars） | inventory §2 D1–D3、§5 決議 1 | `deck/blocks/Chart.tsx`（recharts） |
| [Task 41](task-41-deck-terminal-frame-mark.md) | `<Terminal>` / `<Frame>` / `<Mark>` 三個小原子 | inventory §2 A4/A5/E2–E4/F4 | `deck/blocks/{Terminal,Frame,Mark}.tsx`、`theme.ts`（螢光筆 token） |
| [Task 42](task-42-deck-stages-variants-tagcloud.md) | `<Stages>` rail/cycle 變體 + `<TagCloud>` + 既有 block 增強 | inventory §2 C2/C3/F1/F2/F3/F5 | `deck/blocks/{Stages,Cards,Rows}.tsx`（擴充）、`TagCloud.tsx`、`LogoRow.tsx` |
| [Task 43](task-43-deck-diagram-primitives.md) | 架構圖基元 `<Node>`/`<Connector>`/`<GroupBox>`（**範圍待確認**） | inventory §2 B1/B3/B4/B6、§4.3 | `deck/blocks/{Node,Connector,GroupBox}.tsx` |
| [Task 44](task-44-slide-chrome-progress.md) | SlideChrome 章節進度指示器（`progress` 欄位） | inventory §2 C5/C6、§4.5 | `lib/decks.ts`、`deck/SlideChrome.tsx`（含 `chromeMetrics()`） |
| [Task 45](task-45-present-skill-agents-atoms.md) | Skill + 兩個 agent 更新、密度上限回填（收尾） | inventory §5 決議 1/4、§6 | `content-present/SKILL.md`、`present-planner.md`、`slide-generator.md`、`skill-template/` |

> **2026-07-31：Task 38、39、40、41、42、45 已完成（43 / 44 延後）。**
> Task 38 —— tokenizer 已抽為 `src/lib/code-tokenize.ts` 供筆記與 deck 共用，重構後 18 個含程式碼區塊的
> 筆記頁 HTML **逐位元組不變**；`atoms.deck.tsx` 已建立；`<Code>` 上限實測 **sm 16 行 / xs 19 行**。
> Task 39 —— `<Annotate>` 四方向停靠，9 個引線端點定位**誤差 0.0%**，密集避讓 0 組重疊；
> 上限 **pins ≤ 8 / 單側 leaders ≤ 4**。`atoms.deck.tsx` 現為 7 頁。
> Task 40 —— `<Chart>` 五個 variant；**recharts 在 `transform: scale` 下實測沒問題**，
> 不需退回手寫 SVG；DOM 實測 tooltip / ResponsiveContainer 皆為 0、5 系列只畫前 3。
> `atoms.deck.tsx` 現為 10 頁。
> Task 41 —— `<Terminal>` / `<Frame>` / `<Mark>` 三個小原子；`<Mark>` 改用 `color-mix`
> 從 tone 前景色調底（`soft` 階疊白底幾乎看不見），6 個 tone × 明暗兩階對比已實測記錄。
> `atoms.deck.tsx` 現為 **12 頁**。
> Task 42 —— `<Stages>` 加 rail / cycle 兩個 variant（拆成三個內部元件、`Stages` 只做分派）、
> `<TagCloud>` / `<LogoRow>` 新增、`<Cards recommended>` 與 `<Rows variant="chip">` 增強。
> **原文件標示的最大風險（`<Stages>` 回歸）判斷錯了** —— 沒有任何既有 deck 用 `<Stages>`，
> 真正的回歸面是 `<Cards>`（2 份）與 `<Rows>`（1 份）；已用**版面指紋**（每個元素的座標 +
> 背景 + 邊框 + 字級字重字色）比對，兩份既有 deck 共 23 頁**指紋完全相同**。
> `atoms.deck.tsx` 現為 **15 頁**。
> Task 45 —— SKILL 原子表 6 → **14 個**（每項寫「什麼時候用」）、兩個 agent 更新、
> 密度上限全數回填實測值、`skill-template/` 同步。
> **端到端驗證通過**：用 `ssr-專案dutymate-ai-憲章與-workflow-設計.mdx`（16 個程式碼區塊）
> 跑完整 pipeline，14 頁一次過、溢出全 ok、`slide-generator` 只重試 1 次；
> `present-planner` **主動列出不用哪些新原子與理由**（沒有為了用而用）。
> 順帶抓到一個真的規格漏洞：**`full-visual` 沒有 `chrome` 欄位**，SKILL 原文讀起來像兩種頁型都有 ——
> 已改文字（不改型別，理由見 Task 45 記錄）。
> 各檔末實作記錄含修掉的問題與已知副作用
> （Dashboard 簡報統計 +1；CSS bundle hash 變動與新增的三篇筆記皆已隔離驗證、與本批無關）。
>
> **Task 38 為 39～45 的基礎，先做**（它同時建立 `atoms.deck.tsx` 驗證基準 deck 的骨架，
> 之後每個 Task 各自補頁）。
>
> **順序在 2026-07-31 調整過**：原本是 38 → … → 43 → 44 → **45 最後**，改為
> **38 → 39 → 40 → 41／42 → 45 → 端到端生成一份真實 deck → 再定 43 / 44**。
> 兩個理由：
> ① 38–42 做出的 8 個原子，在 Task 45 之前**對使用者的價值是零** ——
> SKILL 與兩個 agent 不知道它們存在，AI 生成簡報時不會用到任何一個。
> ② Task 43 的決策條件（「若 `custom` 頁自己寫 SVG 的痛感不明顯就不做」）**要到 45 之後才評估得了**，
> 因為在那之前根本生不出用到新原子的簡報。Task 45 最後一步的端到端驗證，正好就是 43 需要的證據。
> Task 44 同理 —— 它動的是 `chromeMetrics()`（算錯會讓內容被靜靜裁掉而 build 全綠），
> 值得等真實 deck 跑過再決定。
>
> inventory §5 的 4 項待決議已於 2026-07-31 全部收斂：① Chart **硬規定 ≤ 3 系列**、
> 不擴充色票、超過改 small multiples 或直接標值；② `<Code>` **v1 不引 shiki**；
> ③ 建 **`atoms.deck.tsx`** 樣板 deck 當截圖迴歸基準（手寫維護、不由 `slide-generator` 生成）；
> ④ 密度上限**隨各原子實作時實測後定**，由 Task 45 彙整回填。
>
> **開工前有一項待確認（Task 38）**：專案已有自寫的 build-time tokenizer
> （`src/lib/remark-notecraft-codeblock.ts`，供 MDX 筆記用，**不依賴 shiki**）。
> 抽成共用模組後 deck 端可**免費得到語法上色、且與筆記內文視覺一致** ——
> 這不違反決議 ②（仍不引 shiki），只是讓「不上色」這個代價消失。
> 不同意抽共用則退回原決議、少做一步。**定案後再開工，不要做一半再改。**
> （另註：`task-17~20` 規劃的 `astro-expressive-code` **實際未採用**，
> `package.json` 無此依賴；`global.css:410` 還留著一句提到 EC 的過時註解。）
>
> **本批最大風險**：Task 38 要重構的 remark plugin 正在服務全站 60 個程式碼圍欄，
> 改壞了整站程式碼區塊都會爛 —— 「build 前後 diff 產出 HTML」是必要關卡。
> 其次是 Task 42 對 `<Stages>` 的回歸（既有三份 deck 都在用）與
> Task 44 對 `chromeMetrics()` 的改動（算錯會讓內容被靜靜裁掉而 build 全綠）。

## v1.12.0 追加功能（§8.1 Phase 4.15 待補）— Plugin System ✅ 已完成（2026-09-18 / notecraftapp v0.6.0）

> 規格：[notecraft-plugin-system.md](../notecraft-plugin-system.md) v0.2.1（23 項決策已定案）
> 設計交付：[design_handoff_plugin_system](../prototype/design_handoff_plugin_system/)（含可離線開啟的 prototype.html）

讓專案裡的結構化 JSON 資料檔，被一個可安裝的渲染器畫成頁面。第一個官方 plugin 是 ER Diagram。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 46](task-46-plugin-contract-types.md) | Plugin 契約與型別 | §5、§6.1–6.3 | 兩份 JSON Schema、`PluginRendererProps`、`_types.d.ts` |
| [Task 47](task-47-plugin-build-resolution.md) | build 期解析 | §7.1、§7.2、§7.7 | `src/lib/plugins.ts`、picomatch、ajv |
| [Task 48](task-48-data-file-view-route.md) | `/view/<path>` 檢視頁 | §7.3-A、§7.7 | `pages/view/[...path].astro`、滿版版型、sticky 頁首、`PluginErrorCard` |
| [Task 49](task-49-sidebar-and-data-list.md) | 側邊欄第六項與清單頁 | §7.5 | `Sidebar.astro`、`pages/view/index.astro` |
| [Task 50](task-50-notes-list-mixed-cards.md) | `/notes` 混排卡片 | §7.5 | `NotesList.tsx`（卡片型別擴成聯集） |
| [Task 51](task-51-er-diagram-renderer-plugin.md) | **ER Diagram Renderer** | §8 | `plugins/er-diagram-renderer/`、轉檔腳本、renderer 改吃 props |
| [Task 52](task-52-series-entry-integration.md) | 系列整合（entry 化） | §7.6（Q6′） | `series.ts`、`SeriesDetail.tsx`、`SeriesNav.tsx`、5 處 `/notes/` 前綴 |
| [Task 53](task-53-mdx-plugin-view-embed.md) | MDX 內嵌 `<PluginView />` | §7.3-B、Q22 | `GeneratedFrame` 標示、`VizZoom` 自訂標籤 |
| [Task 54](task-54-install-plugin-cli.md) | `install-plugin` CLI | §9.1、9.2、9.5、9.6 | `bin/notecraftapp.mjs` 新子命令、安裝期 lint |
| [Task 55](task-55-install-plugin-remote-sources.md) | 第三方來源與抓取 | §9.3、9.4 | 逐檔 fetch、git clone 退路、`.installed.json` |
| [Task 56](task-56-plugin-watch-cache.md) | watch / 快取 / dev HMR | §11 | 快取失效條件、chokidar 清單、HMR 實測 |
| [Task 57](task-57-official-store-ci.md) | 官方 store 與 CI | §10 | `plugins/registry.json`、`scripts/check-plugins.mjs` |
| [Task 58](task-58-plugin-e2e-and-docs.md) | 端對端驗證與文件回填 | §13 P9 | TrendMile 遷移、PRD / CLAUDE.md / README / CHANGELOG |

**順序**：46 → 47 是地基，先做。之後 48–50（畫面）、51（plugin）、54–55（CLI）三條可並行；
52 依賴 47+48；53 依賴 47+48；56 依賴 47；57 依賴 51；58 最後。

> **章節識別碼已定案（2026-09-18）**：採 **`view:` 前綴**（`view:planning/schema`），不靠副檔名推斷。
> PRD〈系列資料模型〉與規格 §7.6 已同步。閱讀進度的 localStorage key 用含前綴的原字串，
> 避免與筆記撞 key。
>
> **兩項後續確認亦已定案（2026-09-18）**：
>
> ① **進度分母 `tracked = total`** —— 不做可追蹤判定，與現行實作及 PRD Q2 收斂一致。
> 設計原型的 `isTrackable()` 是基於不同假設寫的，**沒有搬進來**。
> PRD 功能列表 #18 那句過時的「未發佈不可追蹤」已修正。
>
> ② **「篇」→「章」** —— 改了，但只改系列相關的兩處字串
> （`SeriesOverview.tsx` 的封面 chip、`pages/series/index.astro` 的副標）。
> `/notes` 副標、Dashboard、`TagsManager` 的「N 篇筆記」數的是筆記不是章節，維持原樣。
>
> **完成摘要**：46–58 全部實作完畢，隨 notecraftapp **v0.6.0** 發佈；
> 各 Task 的實作記錄寫在各自檔案末尾，規格 [§15](../notecraft-plugin-system.md) 已回填。
> **仍未做的三件**：`view`（astro dev）模式的 HMR 實測（Q19）、遠端安裝的端對端
> （要等 `plugins/` 推上 GitHub）、官方 store 的 screenshot。

> **本批最大風險**：[Task 56](task-56-plugin-watch-cache.md) 的 dev HMR —— 資料檔不在 Vite 模組圖裡，
> 是整批唯一沒有既有經驗可循的部分。其次是 [Task 53](task-53-mdx-plugin-view-embed.md)：
> `GeneratedFrame` 與 `VizZoom` 服務全站所有 AI 生成元件，改成支援兩種標示時預設值必須維持現行行為，
> 否則是全站回歸。[Task 51](task-51-er-diagram-renderer-plugin.md) 則是唯一「已經有正確答案」的 Task——
> 舊元件的行為就是驗收基準，任何差異都是回歸。

## v1.13.0 追加功能（§8.1 Phase 4.16 待補）— Workbench 改版（notecraftapp v0.7.0）

> 規格：[notecraft-workbench.md](../notecraft-workbench.md) **v0.2.0**（30 項決策已於 2026-09-21 定案，紀錄見該文件 §16）
> 設計交付：[design_handoff_workbench](../prototype/design_handoff_workbench/)（`README.md` 是像素級規格、`prototype/wb/pt.css` 是視覺定稿、
> `NoteCraft-Workbench-standalone.html` 可離線開啟）
> **PRD §8.1 尚未有對應 Phase 條目** —— 待補（可用 `/bump-prd`；Phase 4.13–4.15 也還欠著）。

把外殼從「248px navy 側邊欄 + 卡片式頁面」換成**三欄工作台**（Rail + 檔案樹 Sidebar + 壓縮頁首／工具列／內容），
並新增 `/notes` 四種 view、Drawer 預覽、⌘K 指令面板、Dashboard widget grid、Plugin 管理頁、設定頁與平板／手機響應式。

> **規格與設計稿不一致時，一律以規格為準。** 設計稿是單頁 React prototype，codebase 是 Astro 多頁靜態站；
> 另有十餘處刻意偏離（Board 三欄、字數與版型庫不做、資料檔移出筆記列表、收藏保留、常駐「開啟」圖示、
> 外掛的「渲染錯誤」「不相容」狀態不做、觸控不做拖曳…），全部記在規格 §1.3 與各節。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 59](task-59-workbench-style-foundation.md) | 樣式地基 | §7、§4.5 | `styles/workbench.css`（移植 `pt.css`）、`--wb-*` token、`Icon.astro`、`wb/Logo.astro`、`wb/ui.tsx`、`package.json` `files` |
| [Task 60](task-60-workbench-index.md) | 工作台索引 | §5 | `lib/workbench.ts`、`pages/wb-index.json.ts`、`lib/wb-time.ts`、`GET /api/folders` 改遞迴 |
| [Task 61](task-61-workbench-shell.md) | **三欄殼、全站換殼** | §4、§2.1 | `layouts/WorkbenchLayout.astro`、`wb/{Rail,Sidebar,Header}.astro`、`SidebarLive.tsx`、9 個頁面搬家；刪 `BaseLayout`／`Sidebar`／`PageHead` |
| [Task 62](task-62-notes-list-toolbar-filters.md) | `/notes`：List、Toolbar、篩選參數 | §8.2、§8.2.1、§6 | `wb/NotesWorkbench.tsx`、`NoteRow.tsx`、`lib/wb-filter.ts`、`lib/wb-prefs.ts`；刪 `NotesList.tsx` |
| [Task 63](task-63-note-drawer.md) | 筆記 Drawer | §8.2 | `wb/NoteDrawer.tsx`、`lib/prompts.ts`、`useWbIndex()` |
| [Task 64](task-64-board-table-timeline.md) | Board／Table／Timeline | §8.2 | `wb/views/*`、HTML5 DnD、`readingMeta()` 文案 |
| [Task 65](task-65-command-palette.md) | 指令面板 ⌘K（含全文搜尋） | §8.9 | `wb/Palette.tsx`、pagefind 延遲載入；刪 `PagefindSearch.tsx` |
| [Task 66](task-66-dashboard-widgets.md) | Dashboard widget grid + 三 Tab | §8.1、§5.4 | `wb/DashboardWorkbench.tsx`、`pages/index.astro`；刪 `ContinueReading.tsx`、寫死的 `TODAY` |
| [Task 67](task-67-series-rows.md) | 系列總覽與詳情改版 | §8.4 | `SeriesOverview.tsx`、`SeriesDetail.tsx` |
| [Task 68](task-68-tags-rows.md) | 標籤頁改版 + inline 改名 | §8.5 | `TagsManager.tsx`（確認流程不動） |
| [Task 69](task-69-note-page-header-actions.md) | 筆記頁：頁首接手標題與動作 | §8.3 | `pages/notes/[...slug].astro`、`wb/MoreMenu.tsx`；刪 `RegenerateButton.tsx` |
| [Task 70](task-70-plugins-pages.md) | Plugin 頁與 Plugin Drawer | §8.6 | `pages/plugins/**`、`wb/PluginsWorkbench.tsx`、`PluginDrawer.tsx`；刪 `view/index.astro`、`DataFilesList.tsx` |
| [Task 71](task-71-plugin-enable-disable.md) | Plugin 啟用／停用 | §8.6.1 | `plugins.schema.json`（`disabled`）、`lib/plugins.ts`、`lib/series.ts`、`PUT /api/plugins/:id`、Switch |
| [Task 72](task-72-view-page-header.md) | 資料檔渲染頁換頁首 | §8.7 | `pages/view/[...path].astro`、`meta.backTo` 檢查、pagefind 標記搬家 |
| [Task 73](task-73-settings-about-redirects.md) | 設定與關於、舊網址轉址 | §8.8、§6 | `pages/settings.astro`、`wb/SettingsView.tsx`、`astro.config.mjs` `redirects`；刪 `about.astro` |
| [Task 74](task-74-responsive-a11y.md) | 響應式三段 + 無障礙收尾 | §9、§10 | `workbench.css`、各元件 `aria-*`、TOC 斷點 |
| [Task 75](task-75-cleanup-docs-release.md) | 清理、文件回填、viewer 端對端、發版 | §12、§13 P13 | 刪舊元件、CLAUDE.md／PRD／plugin 規格／CHANGELOG、`npm pack --dry-run`、v0.7.0 |

**順序**：59、60 是地基，可並行，先做。**61 是唯一必須全站同時切換的一步** —— 它只換殼、各頁內容原樣搬進來，
完成後畫面會是「新殼 + 舊卡片版面」，這是預期中的中間態。
之後建議 **65 → 62 → 63 → 64**（先做 Palette，拿掉舊的全文搜尋框時新入口已經在，沒有空窗）；
66 依賴 63；67、68、70 只依賴 61，可與上面那條線並行；69 依賴 61+63；71、72 依賴 70；73 依賴 62+70；74、75 最後。

```
59 ─┐
    ├─ 61 ─┬─ 65 ─ 62 ─ 63 ─┬─ 64
60 ─┘      │                ├─ 66
           │                └─ 69
           ├─ 67
           ├─ 68
           └─ 70 ─┬─ 71
                  ├─ 72
                  └─ 73（另需 62）          … 74 → 75
```

> **交付節奏（規格 Q30）**：全程在 `feat/workbench-redesign` 單一分支上，依 Task 逐步 commit，**Task 75 完成後才併回 main**，
> 期間正式站不受影響。每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`。
> 注意：CLAUDE.md 寫的「pre-push hook 跑 `astro build`」**實際上不存在**（`.git/hooks` 只有 sample、也沒有 husky），
> build 要自己手動跑。Task 75 會處理 CLAUDE.md 這句。
>
> **四個規格標為「待驗證」的項目**，各自在對應 Task 的驗收表裡，結論由 Task 75 彙整回填規格：
> ① viewer 模式下 `entry.filePath` 是否變成一長串 `../`（Task 60）；
> ② 移除筆記內文 h1 後，pagefind 搜尋結果的標題來源（Task 69）；
> ③ 刪掉 `/view` 列表頁後，該網址是落到 redirect 還是被 `[...path]` rest 路由接走（Task 73）；
> ④ `astro dev` 下改 `plugins.json` 是否即時反映 —— plugin 規格 Q19 的遺留項（Task 71）。
>
> **幾條貫穿整批的規則**（各 Task 都會引用，集中列一次）：
> - **連結不可包在按鈕裡。** 列、系列項目、章節列都是「容器內並排的 `<button>`／`<a>`」，不巢狀（規格 §8.2.1）
> - **資料夾與路徑一律來自真實檔案路徑，不是 `entry.id`。** Astro 會把 id slug 化；slug 只用於 `/notes/<slug>` 與 localStorage key
> - **本機絕對路徑不得出現在任何輸出的 HTML／JSON。** 唯一例外是 dev-only 的 `vscode://` 連結
> - **相對於「今天」的數字在瀏覽器算、首繪以「—」佔位**；靠 localStorage 的東西（閱讀進度、收藏、偏好）SSR 一律當作沒有
> - **`id="nc-scroll"` 要留在新的捲動容器上**，`Toc` 與筆記頁 inline script 靠它
> - **樣式規則不出現 hex 或裸 `rgba()`**，只引用 `--wb-*` token
> - 驗畫面前確認 Browser pane **可見**，否則 `client:visible` 的 island 不會 hydrate

> **本批最大風險**：[Task 61](task-61-workbench-shell.md) —— 捲動容器從整個右半邊變成 `.wb-body`，
> `Toc` 的 scroll spy、`client:visible` 的觸發、`VizZoom` 的定位都可能受影響，而且它是全站同時切換、沒有漸進上線的路。
> 其次是 [Task 72](task-72-view-page-header.md) 的 pagefind 標記：頁內 `<header>` 一移除標記就跟著消失，
> 資料檔頁會**整頁掉出全文索引而 build 全綠**，只有實際搜尋才看得出來。
> 再其次是 [Task 69](task-69-note-page-header-actions.md) 搬動 `DeleteNoteButton`：它「先導頁、不 await 刪除回應」的寫法是為了避開
> Astro dev 刪檔後的 HMR 競態，看起來像可以整理的程式碼，**整理了就會閃 404**。
> [Task 71](task-71-plugin-enable-disable.md) 則是唯一會改動 `plugins.json` 格式與 build 期解析的 Task，
> 改完務必跑 `npm run check-plugins`。

## v1.5.0 補充

> **Task 09 為 10～13 的基礎**；先做。三個待釐清項已於 2026-06-16 收斂：① **registry `slugs` 為章節順序唯一權威**（舊 `series`/`order` 停用）；② **不做「可追蹤 / 未發佈」判定**（全部筆記皆可追蹤、`tracked` = `total`、僅三態）；③ **升級版 `SeriesNav` 取代既有 prev/next**（prev/next 內嵌不消失）。
