# Task 116 — 檢查更新收尾：響應式、無障礙、viewer 與部署站實測、文件回填與發版

> 規格 [notecraft-workbench-update-check.md](../notecraft-workbench-update-check.md) §10–§14、§17。
> 設計交付 README「響應式（≤860px）」「動畫」；視覺定稿 `pt-update.css` 的手機段與 reduced-motion 段。
> 依賴 [Task 115](task-115-update-about-drawer-palette.md)。本批最後一個。
> **本 Task 完成後**開 PR 把 `feat/update-check` 併回 `main`。

## 範圍

### 1. 響應式總檢

| 視窗寬 | 檢查 |
| --- | --- |
| 1280 | Drawer 520px；toast 右下 20px；hero 橫排 |
| 900（平板） | Drawer 與既有 Drawer 同寬；Rail 圓點照常 |
| 375 | hero 直排、兩顆按鈕各半、40px 高；指令框全寬 44px；Drawer 全寬、版本列 46px；toast 左右 12px 在底部列上方；圓點在底部列的「設定」按鈕上 |

`document.documentElement.scrollWidth === clientWidth`（無整頁橫捲）；長指令在框內橫捲、不撐破版面。

### 2. 動畫與 reduced-motion

- 逐條對照 handoff「動畫」表：Drawer、toast、圓點、徽章、版本展開、caret、spinner（靜態圓環 opacity .45）、骨架（靜態）、複製鈕
- 既有 `@media(prefers-reduced-motion:reduce)` 列表補齊所有 `.wb-upd-*` 動畫

### 3. 無障礙

- Tab 序：「關於」分頁 → 查看更新內容 → 檢查更新 → 指令的複製鈕 → 恢復提醒；Drawer 內 Tab 循環不跑出去
- 螢幕閱讀器：Rail「設定與關於 ・ 有新版 v…，落後 N 個版本」；徽章不重複唸；狀態行與「已複製到剪貼簿」由 `aria-live` 唸出；toast 以 `role="status"` 唸出且不搶焦點
- axe 掃 `/settings?tab=about`（有新版狀態、開著 Drawer；桌面與 375）：name、role、contrast 類 0 serious。major 徽章黃底深字、toast 半透明白字的對比要特別看。沒跑就照實記在規格 §17

### 4. viewer 與部署站實測

| 情境 | 做法 | 預期 |
| --- | --- | --- |
| npx viewer（`view`） | `.claude/launch.json` 的 `viewer-poc` | 檢查、toast、Drawer 正常；升級指令為通用文案 |
| npx viewer（`serve`） | `node bin/notecraftapp.mjs serve <資料夾>` | 同上（靜態產物、`DEV` 為 false） |
| 原始碼 repo dev | `astro dev` | 版本與 npm 相同 →「已是最新版」；bump 成未發佈版號 →「尚未發佈的版本」（Q4） |
| 部署產物 | `npx astro build && npx astro preview` | 與 viewer 相同文案（Q3 = D）；`grep -r "$HOME" dist/` 0 筆 |
| 子路徑 | `NOTECRAFT_BASE=/x` build | Palette「檢查更新」導到 `/x/settings?tab=about` |
| 打包 | `npm pack --dry-run` | 含 `CHANGELOG.md`、`src/components/wb/update/*`、`src/lib/update-*.ts`、`changelog-parse.ts` |

### 5. 清理

- `grep -rn "upd-deploy\|NC_UPD_ENV\|UPD_SCEN\|UPD_VERSIONS" src/` 為 0（不該移植的沒混進來）
- `awk` 排除 `:root` 後 `workbench.css` 的 hex／rgba 為 0
- `update-check.ts`、`changelog-parse.ts`、`update-prepaint.ts` 只有 `import type`

### 6. 文件回填

| 文件 | 要改什麼 |
| --- | --- |
| [notecraft-workbench-update-check.md](../notecraft-workbench-update-check.md) §17 | 實測（packument 實際大小、CHANGELOG 來源命中情況、30 分節流與多分頁、離線零痕跡）、三個寬度截圖、實作中新增的決定、與設計稿的最終偏離；文件狀態改「已實作（notecraftapp v1.9.0）」 |
| [notecraft-workbench.md](../notecraft-workbench.md) §4 | Rail 示意補「設定與關於」的更新圓點並連到本規格；§4.5 Escape 順序補「更新 toast」（後開的先關） |
| [CLAUDE.md](../../CLAUDE.md) | 目錄結構加 `components/wb/update/`、`lib/update-check.ts`、`lib/changelog-parse.ts`（純函式，`check:upd` 斷言）、`lib/update-prepaint.ts`、`lib/update-store.ts`；Workbench 一節加「**檢查更新**（v1.9.0，[docs/notecraft-workbench-update-check.md]）」：瀏覽器端查 npm、**部署站也提示**（dev-only 原則的刻意例外）、`nc-update-v1` 依 `cur` 作廢、30 分節流、失敗零痕跡、CHANGELOG 由 jsDelivr／GitHub raw 取得且**必須在 `files` 內**、版本標題格式由 `check:upd` 鎖住、不分 viewer／部署站 |
| [notecraft-prd.md](../notecraft-prd.md) | 用 `/bump-prd` 補 §8.1 Phase 4.24（v1.20.0）與 changelog |
| [README.md](../../README.md)、[CHANGELOG.md](../../CHANGELOG.md) | CHANGELOG「新增」：檢查更新（Rail 圓點、關於頁版本與更新、更新內容 Drawer、發現新版提示、⌘K 指令）；「內部」：`CHANGELOG.md` 加入發佈檔案、`check:upd`。1.9.0 是 minor，標題下加 `<!-- 重點：… -->`（官網 `readMilestones()` 需要） |
| 官網文件 | `site/` 的使用說明若有「設定與關於」頁介紹，補一段檢查更新（沒有就略過，記在 §17） |
| 各 Task 檔末 | 「實作記錄」（日期、實際改了什麼、偏離的理由） |
| [tasks/README.md](README.md) | 本批標為已完成 |

### 7. 版號與總檢

- `package.json`／`package-lock.json` 版號改 **1.9.0**（沿用前幾版直接改檔的做法，不打 tag）
- `npx tsc --noEmit && npx astro build && npm run check-plugins` 全綠；tsc 錯誤數與 `main` 基準相同
- 發版後實測：`curl -sI https://cdn.jsdelivr.net/npm/notecraftapp@1.9.0/CHANGELOG.md` 回 200
- 開 PR 前 `git diff main --stat` 確認沒有夾帶 `tmp/`、截圖以外的二進位檔

## 要改的既有檔案

`src/styles/workbench.css`、`src/components/wb/update/*`（微調）、`docs/*.md`（上表）、`CLAUDE.md`、`README.md`、`CHANGELOG.md`、`package.json`、`package-lock.json`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 三個寬度 | §1 表 | — | 逐一符合 |
| reduced-motion | 系統開「減少動態效果」 | 觸發 toast、開 Drawer、展開版本 | 無動畫、spinner 靜態 |
| 實測 | §4 表 | — | 逐一符合 |
| 文件 | — | — | §6 表逐項完成；規格狀態為「已實作」 |
| 版號 | — | `package.json`、CHANGELOG、PRD | 三處一致 |
| 官網 | — | `site/` build | `readMilestones()` 取得 1.9.0 重點、不 throw |
| 總檢 | — | `npx tsc --noEmit && npx astro build && npm run check-plugins` | 全綠 |

## 依賴

Task 115。
