# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- 產品本體：Astro 5 + MDX + React islands + TailwindCSS（既有 codebase，見 CLAUDE.md）。
- 官方網站（2026-10-01 確認）：放在同一個 repo 的 `site/`，是獨立的 Astro 專案，由 GitHub Actions build 之後部署到 GitHub Pages（`stevelin100132.github.io/notecraft`，需要處理 `/notecraft` base path）。
  官網包含 Landing 頁與一份用 NoteCraft 本身 build 出來的實機 Demo 工作台。

## Users

1. **寫技術筆記的開發者**（主要）：手上已經有一個 md／mdx 資料夾，多半用過或聽過 Claude Code。想要的是「把筆記讀得舒服、找得到」，並且讓文字講不清楚的流程、比較或策略，變成可以操作的圖。成功的定義是看完官網就跑 `npx notecraftapp view ./docs` 試用。
2. **評估要不要導入的團隊／技術主管**：在找團隊知識庫或技術文件方案。關心部署方式（純靜態、無執行期 API）、plugin（ER 圖、OpenAPI）、系列與閱讀進度、維護成本，以及產品是否持續維護。

## Product Purpose

NoteCraftApp 是給寫技術筆記的人用的筆記工作台。只要一行 `npx` 指令，就能直接讀現有的 md／mdx 資料夾，開出三欄工作台：資料夾樹、四種筆記檢視、儀表板、更新月曆、系列進度、⌘K 全站搜尋和多筆記頁籤。
筆記裡用 `@ai-visualize` 標記描述想要的圖，Claude Code 會生成 React 互動元件並寫回筆記。同一份筆記可以轉成 16:9 簡報；結構化的 JSON 資料檔則交給可安裝的 plugin 渲染。

## Positioning

讓「知識能被看見、被操作」：AI 生成的是真的 React 互動元件，以原始碼形式 commit 在作者自己的 repo 裡，不是靜態圖片，也不是雲端服務。同一個元件可以在筆記裡用、在放大畫布裡用，也能原樣搬進簡報，播放時一樣可以點、可以拖。
零鎖定：讀的是你現有的資料夾，產出是靜態網站，不依賴任何執行期 API。

**文件即 codebase**（作者 2026-10-01 確認為主要論點之一）：在 AI 時代，文件應該像程式碼一樣管理。所有筆記、生成元件和資料檔集中在一個 git repo 裡，可以 diff、可以 review、可以回溯，AI agent 也能直接讀寫；一行 `npx` 就把這個 repo 變成工作台。

## Operating Context

- 安裝與啟動：`npx notecraftapp view ./docs`（閱讀＋輕量寫入）、`serve`（背景 rebuild＋SSE 自動重新整理）、`npx notecraftapp init-skill`（把 skill 與 subagent 裝進專案的 `.claude/`）。
- AI 生成只在作者本機的 Claude Code 對話中觸發，不在 CI 執行。
- 正式部署是純靜態（目前是 Netlify），沒有 Function，也沒有執行期 API；只有 dev 環境才有寫入 UI。
- 發佈管道：npm 套件 `notecraftapp`、GitHub `SteveLin100132/notecraft`（MIT）。

## Capabilities and Constraints

- 目前版本 v1.7.0。功能：工作台、儀表板、更新月曆、AI 佇列、筆記頁籤、系列、Plugin system（官方 ER 圖、OpenAPI renderer）、放大檢視（可匯出 PNG）、筆記轉簡報。
- 官網語言：繁體中文為主，結構上預留之後加英文的 i18n 路徑。
- 官網範圍：Landing ＋ 實機 Demo。文件先連回 README，正式文件站留到之後。
- **Demo 內容（已決定，尚未執行）**：把 TrendLink 與公司相關的筆記（內部提案、workshop 紀錄等）移到 `src/content/notes/private/`，其餘筆記當作 Demo 工作台的內容。Demo build **必須排除 `private/`**。
  移動檔案會改變 slug，連帶影響系列章節的識別碼、生成元件的引用與 localStorage key，執行時要一起檢查。
- 官網不能出現本機絕對路徑；Demo 是正式環境 build，不會出現任何 dev-only 的寫入 UI。

## Brand Commitments

- 產品名稱：NoteCraftApp（npm 套件名 `notecraftapp`）。Logo：`public/favicon.svg`。
- README 的語氣：直接、以功能事實為主，用「你」稱呼讀者，繁體中文並夾雜必要的英文技術名詞。
- 現有 banner：`docs/assets/github-repo-banner.webp`。

## Evidence on Hand

- 產品截圖（v1.7.0 版面）：`docs/screenshots/`（dashboard、dashboard-calendar、notes-list、notes-drawer、note-tabs、notes-board、plugins）。
- 實機 Demo：用 NoteCraft 本身 build 的公開筆記工作台（見上方 Demo 內容）。
- 版本歷程：`CHANGELOG.md`（v0.2 → v1.7 的發版節奏）。
- **沒有、不得捏造**：使用者見證、客戶名單、使用量數據、媒體報導、效能 benchmark。npm／GitHub 數字徽章不當成證據主打。

## Product Principles

1. **用實物證明，不靠形容**：能讓訪客自己點、自己拖的，就不要只用截圖或文字描述。
2. **讀你已有的東西**：資料夾不搬家、產出是自己的原始碼，零鎖定是主要的承諾。
3. **AI 是作者手上的工具，不是黑箱服務**：生成發生在作者本機的對話中，結果可以審查、可以 commit、可以鎖定。
4. **一次滿足兩種讀者**：開發者要能馬上試用；評估者要能看到部署形態、擴充性與持續維護的跡象。
