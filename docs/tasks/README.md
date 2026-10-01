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

## v1.13.0 追加功能（§8.1 Phase 4.16）— Workbench 改版（notecraftapp v1.0.0）

> **已完成（2026-09-22）**：Task 59–75 全部實作並逐 Task commit 於 `feat/workbench-redesign`。四個待驗證項的結論回填於規格 §17；各 Task 檔末有「實作記錄」。
> 完成摘要：殼全換、`/notes` 四種 view + Drawer、`⌘K`、Dashboard widget grid、`/plugins`（含啟用／停用）、`/settings`、舊網址轉址、三段響應式與無障礙；刪除 8 個舊 island／元件。偏離原計畫的三處：`bare`／`bareBody` 兩種 layout 模式取代 `noHeader`；TOC 斷點改 container query；預設與 muted pill 文字色為對比而微調。

> 規格：[notecraft-workbench.md](../notecraft-workbench.md) **v1.0.0**（30 項決策已於 2026-09-21 定案，紀錄見該文件 §16；實作後回填見 §17）
> 設計交付：[design_handoff_workbench](../prototype/design_handoff_workbench/)（`README.md` 是像素級規格、`prototype/wb/pt.css` 是視覺定稿、
> `NoteCraft-Workbench-standalone.html` 可離線開啟）
> PRD §8.1 的 Phase 4.15（Plugin System）與 4.16（Workbench）已於 v1.13.0 補上。

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
| [Task 75](task-75-cleanup-docs-release.md) | 清理、文件回填、viewer 端對端、發版 | §12、§13 P13 | 刪舊元件、CLAUDE.md／PRD／plugin 規格／CHANGELOG、`npm pack --dry-run`、v1.0.0 |

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

## v1.14.0 追加功能（§8.1 Phase 4.17 待補）— ER Diagram Renderer v1.2：導覽 + Wiki + Diagram（plugin v1.2.0／notecraftapp v1.3.0）

> **已完成（2026-09-27）**：Task 76–86 全部實作並逐 Task commit 於 `feat/er-diagram-redesign`。四個待驗證項的結論回填於規格 §17；各 Task 檔末有「實作記錄」。
> 偏離原計畫的幾處：`ResolvedDataFile.description` 直接改為純文字（不另開欄位）；embed 畫布改為填滿剩餘高度；page 導覽高度量捲動祖先而非寫死 offset；`<style>` 的 CSS 不可含 SSR 會跳脫的字元（新增 `er-styles.mjs`）。另順手修了 dev 下 Ajv「schema already exists」的既有問題。

> 規格：[notecraft-er-docs.md](../notecraft-er-docs.md) **v0.2.0**（10 項決策已於 2026-09-27 定案，紀錄見該文件 §16）
> 設計交付：[design_handoff_er_docs](../prototype/design_handoff_er_docs/)（`README.md` 是像素級規格與相容性要求、`prototype/er/er.css` 是視覺定稿、
> `prototype/ER Diagram Docs.html` 可離線開啟、`schema.json` 與 `example/schema.json` 是 v1.2 資料規格與範例）

把官方 plugin `er-diagram-renderer` 從「單一關聯圖」擴充成 DBdocs 式的資料庫文件介面：Schema → 分群 → Table 導覽樹、
Wiki（總覽／Schema／Table）、Diagram（v1.1 無限畫布功能不減，加 schema 範圍與 Wiki 雙向跳轉）。page 與 embed 共用同一棵元件樹。

> **規格與設計稿不一致時，一律以規格為準。** 主要偏離：沒有 `schemas` 時導覽不顯示「全部」節點（prototype 仍顯示）；
> 內嵌 580px 去外框；page 模式外殼不佔滿、bar 與導覽 sticky；斷點改 container query；
> 導覽篩選也比對欄位名；`meta.description` 顯示第一段、索引全文；反引號支援 `table:`／`schema:` 前綴。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 76](task-76-er-schema-v12-examples.md) | 資料格式 v1.2 + 兩份範例護欄 | §5.1、§12.1 | `schema.json`、`example/schema.json`（v1.2）、`example/schema.v1.1.json`、`scripts/check-plugins.mjs` 多範例 |
| [Task 77](task-77-er-split-files.md) | 拆檔（純搬移、零行為變更） | §4.1 | `renderer.tsx` → `types.ts`／`styles.ts`／`diagram.tsx` |
| [Task 78](task-78-er-derive-compat-checks.md) | 資料推導與 v1.1 相容規則 | §5.2–5.4 | `derive.ts`、`matchTable`、dev warn、`scripts/checks/er-derive.mjs`、`npm run check:er` |
| [Task 79](task-79-er-mini-markdown.md) | 迷你 Markdown | §8.5 | `markdown.tsx`、`markdown-text.ts`、連結白名單、自動連結前綴 |
| [Task 80](task-80-er-shell-nav-routing.md) | 外殼、導覽、路由、持久化 | §6、§8.1–8.2 | `renderer.tsx`、`nav.tsx`；全寬按鈕搬到 bar |
| [Task 81](task-81-er-wiki-pages.md) | Wiki 三頁 | §5.3、§8.3 | `wiki.tsx` |
| [Task 82](task-82-er-local-diagram.md) | 局部關聯圖 | §8.4 | `local-diagram.tsx` |
| [Task 83](task-83-er-diagram-scope.md) | Diagram 範圍與雙向跳轉 | §8.6 | `diagram.tsx`、範圍 pill、「開啟 Wiki」 |
| [Task 84](task-84-er-responsive-a11y.md) | 響應式 + 無障礙 + Esc | §9、§10 | container query、焦點管理 |
| [Task 85](task-85-app-meta-description-markdown.md) | **App 端** `meta.description` 去 Markdown | §11 | `src/lib/strip-markdown.ts`、`plugins.ts`、`view/[...path].astro`、`workbench.ts`、`series.ts`；v1.3.0 |
| [Task 86](task-86-er-docs-release.md) | 文件、版號、全面驗收、回填 | §12.2、§17 | manifest／registry 1.2.0、README、CHANGELOG、CLAUDE.md |

**順序**：76 → 77 → 78 是地基，依序做；**76 先把 v1.1 與 v1.2 兩份範例都接進 `check-plugins`**，之後每一步都有相容性回歸保護。
79 與 80 都只依賴 78，可並行；81 需要 79＋80；82 接 81；83 只依賴 80，可與 81、82 並行；84 收 81–83；
85 是唯一動 app 的 Task，只依賴 79（斷言要與 plugin 的 `stripMarkdown` 對照），可隨時插入；86 最後。

```
76 ─ 77 ─ 78 ─┬─ 79 ─┬──────────── 85
              │      └─┐
              └─ 80 ───┴─ 81 ─ 82 ─┐
                  └──────── 83 ────┴─ 84 ─ 86
```

> **交付節奏**：全程在 `feat/er-diagram-redesign` 單一分支上，依 Task 逐步 commit，**Task 86 完成後才併回 main** ——
> repo 根的 `plugins/` 就是官方 store，**推上預設分支等於發佈**。每個 commit 都要能通過
> `npx tsc --noEmit && npx astro build && npm run check-plugins`（Task 78 起加 `npm run check:er`）。
>
> **四個規格標為「待驗證」的項目**，結論由 Task 86 彙整回填規格 §17：
> ① pagefind 是否索引 `hidden` 屬性的元素（Task 85）；
> ② `VizZoom` 在 capture 階段攔 Esc 是否破壞逐層退（Task 84）；
> ③ page 模式 `--erd-page-offset` 的實測值（Task 80）；
> ④ embed 畫布在 580 外殼內的實際高度（Task 83）。
>
> **幾條貫穿整批的規則**：
> - **v1.1 資料零修改可渲染**。`example/schema.v1.1.json` 與 `src/content/notes/schema-demo.er.json` 一個欄位都不准改
> - **每新增一個 plugin 檔就登記到 `registry.json` 的 `files`**。store 安裝只下載清單內的檔；`check-plugins` 會比對集合
> - **被 `scripts/checks` 載入的 `.ts` 只能有 `import type`、不能有 JSX**（Node strip-types 不解析無副檔名的相對 import、不轉 JSX）
> - **靠 localStorage 的東西 SSR 一律當作沒有**：路由在 `useEffect` 掛載後才還原
> - **不用 `dangerouslySetInnerHTML`、不引入白名單外套件**；Markdown 連結只接受 `http(s)`／`mailto`／站內 `/`／`#`
> - **class 一律 `erd-` 前綴、規則以 `.erd-root` 起頭**（prototype 是 `erx-`）；樣式不出現 hex 或裸 `rgba()`，唯一例外集中成 `--erd-warn-ink`
> - 驗畫面前確認 Browser pane **可見**，否則 `client:visible` 的內嵌不會 hydrate

> **本批最大風險**：[Task 77](task-77-er-split-files.md) 與 [Task 83](task-83-er-diagram-scope.md) —— Diagram 的縮放、fit、量測是 v1.1 調最久的部分，
> 搬移與加 scope 都可能讓它微妙地壞掉，而 build 全綠。兩個 Task 都附並排比對的驗收。
> 其次是 [Task 85](task-85-app-meta-description-markdown.md)：它改的是**所有 plugin** 的 description 出口與 pagefind 標記，
> 標記搬錯位置資料檔頁會**整頁掉出全文索引**（與 Task 72 同一類風險），只有實際搜尋才看得出來。

## v1.15.0 追加功能（§8.1 Phase 4.18 待補）— Dashboard 總覽改版（notecraftapp v1.4.0）

> **已完成（2026-09-29）**：Task 87–91 全部實作並逐 Task commit 於 `feat/dashboard-redesign`。實測結論回填於規格 §17；各 Task 檔末有「實作記錄」。

> 規格：[notecraft-workbench-dashboard.md](../notecraft-workbench-dashboard.md) **v0.2.0**（6 項決策已於 2026-09-29 定案，紀錄見該文件 §16；實作後回填見 §17）。
> 設計交付：[design_handoff_workbench_dashboard](../prototype/design_handoff_workbench_dashboard/)（README、可離線開啟的 prototype、`source/pt-dash2.*`）。
> 範圍只有 Dashboard 的「總覽」Body：Row 1 三張 KPI ＋ 寫作頻率堆疊長條、Row 2 最近更新／系列＋標籤馬賽克／更新日誌，整頁填滿一個視窗、卡片內捲動。
> 「本週」「AI 佇列」Tab、Drawer、殼都不動。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 87](task-87-dashboard-foundation.md) | 地基：token、`dv-` 樣式、時間工具、純函式與斷言、island props | §3、§4、§7、§9 | `workbench.css`（`--wb-dv-*`、刪舊 widget 規則、移植 `pt-dash2.css`）、`wb-time.ts`（`weekOf`／`weekWindow`／`mdShort`）、`lib/wb-dashboard.ts`、`scripts/checks/wb-dashboard.mjs`、`index.astro`、`dashboard/Overview.tsx` 骨架 |
| [Task 88](task-88-dashboard-kpi-freq.md) | Row 1：三張 KPI 與寫作頻率 | §5、§6.1 | `dashboard/Ring.tsx`、`KpiCard.tsx`、`FreqChart.tsx` |
| [Task 89](task-89-dashboard-timeline-log.md) | 最近更新（時間軸）與更新日誌 | §6.2、§6.5、§8 | `dashboard/Timeline.tsx`、`UpdateLog.tsx`；列的容器 DOM 與 `rowHandlers` |
| [Task 90](task-90-dashboard-series-treemap.md) | 系列卡與標籤分布馬賽克 | §6.3、§6.4 | `dashboard/SeriesCard.tsx`、`TagTreemap.tsx`（ResizeObserver、tooltip） |
| [Task 91](task-91-dashboard-responsive-cleanup-release.md) | 響應式、無障礙、viewer 空狀態、清理、文件回填、發版 | §9–§14、§17 | 刪 `DashboardWorkbench` 舊 JSX、CLAUDE.md／PRD／CHANGELOG、v1.4.0 |

**順序**：87 是地基，先做；88、89、90 只依賴 87，可並行；91 收尾。

```
87 ─┬─ 88 ─┐
    ├─ 89 ─┼─ 91
    └─ 90 ─┘
```

> **交付節奏**：全程在 `feat/dashboard-redesign` 單一分支上，依 Task 逐步 commit，**Task 91 完成後才併回 main**。
> 每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`（Task 87 起加 `npm run check:wb`；`check-plugins` 會自動串到它）。
>
> **幾條貫穿整批的規則**：
> - **兩個瀏覽器端資料來源**（今天、localStorage 閱讀進度）**SSR 一律以佔位輸出**（「—」、只畫底環、不畫長條、不輸出日誌清單），真值只在 `useEffect` 後進 render；`now` 與 `live` 只由 `DashboardWorkbench` 持有一份往下傳
> - **時間基準是今天**（workbench Q10、本批 Q2），不是 handoff 的「最新更新日」
> - **閱讀狀態三態**、**資料夾不分色**、**系列 accent 三種**——handoff 的四態、`FOLDER_COLOR`、`green` 都不移植
> - **列的 DOM**：時間軸節點與日誌卡片是容器內並排的 `<button class="wb-row-main">` 與常駐 `<a class="wb-row-open">`，不巢狀（workbench §8.2.1）
> - **class 一律沿用 prototype 的 `dv-` 名稱**；`workbench.css` 規則零色碼，新色值全部收成 `--wb-dv-*` token；SVG 內的顏色用 `style`，不用 `fill="var(…)"` 屬性
> - **被 `scripts/checks` 載入的 `wb-dashboard.ts` 只能 `import type`、不能有 JSX**
> - `id="nc-scroll"` 留在總覽 Body 上；驗畫面前確認 Browser pane **可見**（隱藏時 ResizeObserver 量到 0）

> **本批最大風險**：Row 2 的「整頁不捲、卡片內捲」靠一整條 `flex:1 1 0; min-height:0` 鏈（`.dv-row2>.dv-card`、`.dv-midcol`、`.dv-tags`、`.dv-tm`），漏一層就退化成整頁捲動而 build 全綠——Task 88／89 驗收各附「視窗 900 高、清單超出」的截圖。
> 其次是 hydration：任何人把 `new Date()` 或 `readingStatus()` 放進 render 初值就會 mismatch，dev console 零警告才算過。

## v1.15.0 追加功能（§8.1 Phase 4.19）— 首頁「更新月曆」頁籤 ✅ 已完成（2026-09-30 / notecraftapp v1.5.0）

> 規格：[notecraft-workbench-calendar.md](../notecraft-workbench-calendar.md) **v0.2.0**（5 項決策已於 2026-09-30 定案，紀錄見該文件 §16；實作後回填見 §17）。
> 設計交付：[design_handoff_update_calendar](../prototype/design_handoff_update_calendar/)（README、可離線開啟的 prototype、`source/pt-cal.*`）。
> 範圍只有 Dashboard 的第二個 Tab：「本週」（近 7 日 `NoteRow` 列表）換成「更新月曆」——月檢視每篇一顆閱讀狀態色塊、週檢視每篇一張卡片，點了開既有 Drawer。
> 「總覽」「AI 佇列」Tab、Drawer、殼都不動。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 92](task-92-calendar-foundation.md) | 地基：token、`cal-` 樣式、純函式與斷言、Tab 改名、空殼 | §2–§5、§7、§9 | `workbench.css`（`--wb-cal-*`、`--wb-a-blue-12`、移植 `pt-cal.css`）、`lib/wb-calendar.ts`、`scripts/checks/wb-calendar.mjs`、`DashboardWorkbench.tsx`（`calendar` Tab、`?tab=week` 相容、刪舊列表）、`dashboard/Calendar.tsx` 空殼 |
| [Task 93](task-93-calendar-month-view.md) | 月檢視：state、日期格、色塊、導覽、圖例、週月切換 | §4.4、§5、§6.1–§6.4、§8 | `dashboard/Calendar.tsx`、`CalCell.tsx`、`CalDot.tsx` |
| [Task 94](task-94-calendar-week-view.md) | 週檢視：卡片（容器 DOM）、格內捲動、週標題 | §6.5、§7.3、§10 | `dashboard/CalNote.tsx`；`Calendar.tsx`／`CalCell.tsx` 的週分支 |
| [Task 95](task-95-calendar-responsive-cleanup-release.md) | 響應式、無障礙、viewer 實測、清理、文件回填、發版 | §9–§14、§17 | CLAUDE.md／workbench.md／Dashboard 文件／PRD／CHANGELOG、v1.5.0 |

**順序**：92 是地基，先做；93、94 只依賴 92，可並行；95 收尾。

```
92 ─┬─ 93 ─┐
    └─ 94 ─┴─ 95
```

> **交付節奏**：全程在 `feat/dashboard-update-calendar` 單一分支上，依 Task 逐步 commit，**Task 95 完成後才併回 main**。
> 每個 commit 都要能通過 `npx tsc --noEmit && npx astro build && npm run check:wb`。
>
> **幾條貫穿整批的規則**：
> - **今天與閱讀狀態都在瀏覽器**：`now`／`live`／`readingVersion` 只由 `DashboardWorkbench` 持有一份往下傳；`anchor` 初值 `null`、SSR **不輸出任何日期格**（只有工具列「—」與星期列）；真值只在 `useEffect` 後進 render
> - **月曆用日曆週（週日→週六）**，總覽 KPI 與更新日誌維持滾動 7 天（Q1）；日期一律 `YYYY-MM-DD` 當地日字串進出，`wb-calendar.ts` 不 import `wb-time.ts`
> - **閱讀狀態三態**，直接沿用總覽的 `DV_RS` 與 `.dv-rs-*` class；handoff 的「未發佈」不移植；色塊底色走 class、不寫 inline `style`
> - **列的 DOM**：週卡片是容器內並排 `<button class="wb-row-main">` 與常駐 `<a class="wb-row-open">`；月色塊是純 `<button>` 走 `rowHandlers`、無開啟連結（Q2，treemap 方塊同一例外）
> - **class 一律沿用 prototype 的 `cal-` 名稱**；`workbench.css` 規則零色碼，新底色收成 `--wb-cal-*`；`cal-` 規則要放在 Task 74 的 860px 媒體規則**之前**，否則手機底部留白被蓋掉
> - **格子底色上的小字用 `--wb-muted-ink`**（Q5；handoff 的 `--wb-ink-3` 在淡藍底只有 3.8:1）
> - **被 `scripts/checks` 載入的 `wb-calendar.ts` 只能 `import type`、不能有 JSX**
> - `id="nc-scroll"` 留在月曆 Body 上；驗畫面前確認 Browser pane **可見**（隱藏時 island 不 hydrate）

> **本批最大風險**：hydration——任何人把 `iso(new Date())` 寫進 `anchor` 初值就 mismatch，dev console 零警告才算過。
> 其次是「整月一屏」：6 列月份在矮視窗會撐開格區，捲動必須發生在 `#nc-scroll`、不是整頁（Task 93 附 2026-08 在 768 高的截圖）。

## v1.16.0 追加功能（§8.1 Phase 4.20）— 空狀態插圖 ✅ 已完成（2026-09-30 / notecraftapp v1.5.1）

> 規格：[notecraft-workbench-empty-states.md](../notecraft-workbench-empty-states.md) **v0.2.0**（4 項決策已於 2026-09-30 定案，紀錄見該文件 §14；實作後回填見 §15）。
> 設計交付：[design_handoff_empty_states](../prototype/design_handoff_empty_states/)（README、prototype、`source/pt-dash*.jsx`）。
> 範圍只有兩處：總覽「更新日誌」卡片與「AI 佇列」分頁的空狀態，換成共用的插圖元件 `EmptyState`。資料、state、其他頁面的空狀態都不動。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 96](task-96-empty-state-component.md) | `EmptyState` 元件、樣式、兩處接入、最矮卡片量測 | §2–§8 | `wb/EmptyState.tsx`、`workbench.css`（`.pt-empty*`、`.dv-log-list.is-empty`）、`dashboard/UpdateLog.tsx`、`DashboardWorkbench.tsx` |
| [Task 97](task-97-empty-state-cleanup-release.md) | 響應式與 viewer 實測、文件回填、發版 | §7、§10、§15 | 規格／Dashboard 文件／CLAUDE.md／PRD／CHANGELOG、v1.5.1 |

> **交付節奏**：全程在 `feat/dashboard-empty-states` 單一分支，Task 97 完成後開 PR 併回 main。每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`。
>
> **貫穿規則**：SVG 顏色用 `style` 寫 CSS 變數（不用 `stroke="var(…)"`）；TSX 與 CSS 零色碼、不新增 token；class 沿用 prototype 的 `pt-empty*`；「前往筆記」是 `<a href="/notes">`。

## v1.17.0 追加功能（§8.1 Phase 4.21）— OpenAPI Renderer（plugin `openapi-renderer` v1.0.0／notecraftapp v1.6.0）✅ 已完成（2026-10-01）

> **已完成（2026-10-01）**：Task 98–104 全部實作於 `feat/openapi-renderer`。實測結論回填於規格 §17；各 Task 檔末有「實作記錄」。
> 偏離原計畫的幾處：Esc 改為晚一拍（`setTimeout`）判斷 `defaultPrevented`；導覽 path 截斷長度 19／21（handoff 24／26）；
> 順手修了 `GeneratedFrame` 資料檔膠囊在窄寬度斷行；極大 spec 產生器放 `scripts/fixtures/`（不放 `scripts/checks/`）。

> 規格：[notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) **v1.0.0**（9 項決策已於 2026-10-01 定案，紀錄見該文件 §16；實作後回填見 §17）。
> 設計交付：[design_handoff_openapi_renderer](../prototype/design_handoff_openapi_renderer/)（`README.md` 是像素級規格、`prototype/oa/oa.css` 是視覺定稿、
> `prototype/OpenAPI Renderer Prototype.html` 需經本機 http server 開啟、`example/` 是三份範例 spec）

新增第二個官方 plugin：把筆記資料夾內的 OpenAPI 文件（JSON，OAS 3.0／3.1）渲染成 NoteCraft 風格的 API 文件——
導覽（tag → operation、schemas）+ 總覽／Tag／Operation／Schema 四種頁面；embed 為單一 operation 卡或總覽縮影。ER Diagram 的同一家族。

> **規格與設計稿不一致時，一律以規格為準。** 主要偏離：路由保留 `.openapi`（`/view/api/orders.openapi`，Q2）；
> embed 外框由 `GeneratedFrame` 提供、plugin 不畫 figcaption；`<PluginView>` 的 prop 是 `src`；CSS 變數 `--oar-*`（不是 `--wb-oa-*`）；
> 斷點改 container query；與 ER 不共用模組（各自一份，Q6）；store 不放極大案例 spec（Q9）。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 98](task-98-app-manifest-meta-pluginview-options.md) | App 端：manifest `meta` pointer、`<PluginView>` 的 `options`／`anchor`、app 升 1.6.0 | §11 | `lib/plugins.ts`、`lib/plugin-types.ts`、`plugins/notecraft-plugin.schema.json`、`PluginView.astro`、`GeneratedFrame.astro`、`scripts/checks/app-plugin-meta.mjs` |
| [Task 99](task-99-oar-scaffold-derive-examples.md) | Plugin 骨架：manifest、dataSchema、推導、範例產生、Markdown、斷言 | §4、§5、§12.1 | `plugins/openapi-renderer/{notecraft-plugin.json,schema.json,types.ts,derive.ts,examples.ts,markdown-text.ts}`、`registry.json`、`scripts/checks/oar-{derive,examples,markdown}.mjs` |
| [Task 100](task-100-oar-atoms-schema-tree-styles.md) | 原子元件、欄位樹、樣式 | §7、§8.4 | `atoms.tsx`、`markdown.tsx`、`schema-tree.tsx`、`styles.ts`、`scripts/checks/oar-styles.mjs` |
| [Task 101](task-101-oar-shell-nav-routing.md) | 外殼、bar、導覽、hash 路由、鍵盤、捲動同步 | §6、§8.1–§8.2、§10 | `renderer.tsx`、`nav.tsx` |
| [Task 102](task-102-oar-pages.md) | 總覽、Tag、Operation、Schema 四種頁面 | §8.3 | `pages.tsx` |
| [Task 103](task-103-oar-embed.md) | embed：單卡、縮影、錯誤；與 app 外框整合 | §8.5 | `embed.tsx`、測試筆記 |
| [Task 104](task-104-oar-responsive-docs-release.md) | 響應式、無障礙收尾、手動驗證、文件回填、發版 | §9、§10、§12.2 | CLAUDE.md／規格 §17／PRD／CHANGELOG、v1.6.0 |

**順序**：98 → 99 → 100 是地基，依序做；101 與 103 只依賴 100（103 另依賴 98），可並行；102 接在 101 之後；104 收尾。

```
98 ─ 99 ─ 100 ─┬─ 101 ─ 102 ─┐
               └─ 103 ───────┴─ 104
```

> **交付節奏**：全程在 `feat/openapi-renderer` 單一分支上，依 Task 逐步 commit，**Task 104 完成後開 PR 併回 main**。
> 每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`；動到 plugin 的再跑 `npm run check-plugins`（純函式只跑 `npm run check:oar`）。
>
> **幾條貫穿整批的規則**：
> - **plugin 不 import app、也不 import ER**：兩個 plugin 各自安裝；需要的 Markdown parser 複製一份，以 `oar-markdown.mjs` 對照行為
> - **被 `scripts/checks` 載入的 `derive.ts`／`examples.ts`／`markdown-text.ts` 只能 `import type`、不能有 JSX**
> - **CSS 字串不可含 `< > & " '`**、所有規則以 `.oar-root` 起頭、DS 沒有的值集中為 `.oar-root` 上的 `--oar-*`（`oar-styles.mjs` 把關）
> - **SSR 一律總覽、一律 cURL**：hash 與 `localStorage`（`oar:v1:lang`）都在 `useEffect` 後才讀；範例產生器的日期與 uuid 寫死，不取今天
> - **embed 不讀寫 hash、不掛 keydown、不畫外框**；page 的 Esc 先看 `defaultPrevented`，實際有東西可退才 `preventDefault`
> - 每新增一個 plugin 檔就同步 `plugins/registry.json` 的 `files`（`check-plugins` 擋漂移）
> - 驗畫面前確認 Browser pane **可見**（隱藏時 island 不 hydrate）

> **本批最大風險**：hydration 與捲動容器——hash／localStorage 若進了初值就 mismatch；sticky 與捲動同步要以 `#nc-scroll`（最近的捲動祖先）為準而不是 window。
> 其次是真實世界的 spec 不規矩（斷掉的 `$ref`、重複 operationId）：一律容錯 + dev warn，不白屏、不 build fail。

## v1.5.0 補充

> **Task 09 為 10～13 的基礎**；先做。三個待釐清項已於 2026-06-16 收斂：① **registry `slugs` 為章節順序唯一權威**（舊 `series`/`order` 停用）；② **不做「可追蹤 / 未發佈」判定**（全部筆記皆可追蹤、`tracked` = `total`、僅三態）；③ **升級版 `SeriesNav` 取代既有 prev/next**（prev/next 內嵌不消失）。

## v1.18.0 追加功能（§8.1 Phase 4.22）— 筆記頁籤（notecraftapp v1.7.0）✅ 已完成（2026-10-01）

> **已完成（2026-10-01）**：Task 105–108 全部實作於 `feat/note-tabs`。實測結論回填於規格 §17；各 Task 檔末有「實作記錄」。
> 偏離原計畫的幾處：浮層改 `position:fixed`、overlay 層；下拉與手機抽屜的列同樣是「連結＋並排關閉鈕」；
> 「關閉其他／右側」關到目前頁面時導覽到被點的頁籤。bfcache、axe、README 截圖未做（見規格 §17「仍未做的」）。

> 規格：[notecraft-workbench-note-tabs.md](../notecraft-workbench-note-tabs.md) **v1.0.0**（5 項決策已於 2026-10-01 定案，紀錄見該文件 §16；實作後回填見 §17）。
> 設計交付：[design_handoff_note_tabs](../prototype/design_handoff_note_tabs/)（`README.md` 是像素級規格、`prototype/wb/pt-tabs.css` 是視覺定稿、
> `prototype/NoteCraft-Workbench-Tabs.html` 需經本機 http server 開啟、`Note-Tabs-Spec.html` 是各狀態畫面）

在工作台主區最上方、Header 之上加一條 34px 頁籤列（VS Code 式）：筆記與資料檔頁開啟後留下頁籤，可固定、拖曳、右鍵管理、⌥ 快捷鍵切換，切回時還原捲動位置；手機改為 Header 右上的計數鈕＋底部抽屜。
MPA 下頁籤是存在 localStorage 的「已開啟清單」，每次換頁由 `client:load` island 重畫。

> **規格與設計稿不一致時，一律以規格為準。** 主要偏離：localStorage 存標題快照、idle 時以 `/wb-index.json` 校正（Q1）；
> 頁籤是 `<a role="tab">` 並排 ✕ 按鈕，不是 `div role=tab` 包按鈕（Q2）；key 為 `nc-tabs-v1:<workspaceLabel>`（Q5）；
> 網址有 hash 時不還原捲動；狀態小點與 `?tabsDemo=` 不移植。

| Task | 功能 | 規格 | 主要改動 |
| --- | --- | --- | --- |
| [Task 105](task-105-tabs-store-pure-functions.md) | 地基：純函式、store、斷言、Toast 佇列 | §4、§6.6、§11 | `lib/wb-tabs.ts`、`lib/wb-tabs-store.ts`、`lib/toast.ts`、`scripts/checks/wb-tabs.mjs`、`ToastHost.tsx`、`check:wb` |
| [Task 106](task-106-tabs-desktop-strip.md) | 桌面頁籤列：layout 佔位、頁籤 DOM、溢出、拖曳、樣式 | §3、§5、§6.1–§6.4、§10、§12.1 | `WorkbenchLayout.astro`（`tab` prop）、`notes/[...slug].astro`、`view/[...path].astro`、`wb/tabs/TabBar.tsx`／`TabStrip.tsx`、`workbench.css`（`.nt-*`、`--wb-a-blue-04`） |
| [Task 107](task-107-tabs-menu-shortcuts-scroll.md) | 右鍵選單、全部頁籤、快捷鍵、捲動還原、Palette、刪除筆記 | §6.3、§6.5、§7、§8、§12.2 | `TabMenu.tsx`、`TabAll.tsx`、`TabBar.tsx`、`Palette.tsx`、`MoreMenu.tsx`、`DeleteNoteButton.tsx` |
| [Task 108](task-108-tabs-responsive-docs-release.md) | 平板、手機計數鈕與抽屜、viewer 實測、文件回填、發版 | §9、§11、§12、§17 | `TabSheet.tsx`、`workbench.css` RWD、CLAUDE.md／workbench.md／PRD／CHANGELOG、v1.7.0 |

**順序**：一條直線，每一步都依賴前一步。

```
105 ─ 106 ─ 107 ─ 108
```

> **交付節奏**：全程在 `feat/note-tabs` 單一分支上，依 Task 逐步 commit，**Task 108 完成後開 PR 併回 main**。
> 每個 commit 都要能通過 `npx tsc --noEmit && npx astro build`；動到 `wb-tabs.ts` 的再跑 `npm run check:wb`。
>
> **幾條貫穿整批的規則**：
> - **`wb-tabs.ts` 只能 `import type`、不能有 JSX、不碰 `window`／`localStorage`／`Date.now()`**（`scripts/checks` 直接載入）
> - **SSR 只輸出 34px 空列**（與手機的 32×32 空計數框），頁籤內容一律 hydrate 後才畫；hydrate 前後 `#nc-scroll` 位置不得改變
> - **每次寫 store 都先重讀 localStorage**，不拿 React state 當來源（多個瀏覽器分頁同時開）
> - 浮層（選單、下拉、手機抽屜）走 `wb-escape` 堆疊；`workbench.css` 規則零色碼；`.nt-*` 規則放在第一個 860px 殼響應式區塊之前
> - 快捷鍵只用 `⌥`、比對 `event.code`，焦點在輸入元件內不攔截
