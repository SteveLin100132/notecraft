# Task 86 — 文件、版號、全面驗收與回填（ER plugin v1.2.0）

> 規格 [notecraft-er-docs.md](../notecraft-er-docs.md) §2.1、§12.2、§13、§17。
> 設計交付 README〈驗收清單〉。
> 依賴 Task 76–85 全部完成。

## 範圍

### 1. 版號

| 檔案 | 改動 |
| --- | --- |
| `plugins/er-diagram-renderer/notecraft-plugin.json` | `version` → `1.2.0`；`description` 改為涵蓋 Wiki（例：「把資料庫 schema JSON 渲染成可導覽的 Wiki 與可聚焦、可搜尋的實體關聯圖」）；`engines` 維持 `>=0.6.0` |
| `plugins/registry.json` | `version` → `1.2.0`、`description` 同上；`files` 最終核對（應為 14 個：manifest、README、schema、兩份 example、`renderer.tsx`、`types.ts`、`styles.ts`、`derive.ts`、`diagram.tsx`、`local-diagram.tsx`、`nav.tsx`、`wiki.tsx`、`markdown.tsx`、`markdown-text.ts` —— 以實際檔案為準，`check-plugins` 會比對） |

### 2. plugin README

`plugins/er-diagram-renderer/README.md`：

- 「它畫出什麼」：加導覽樹、Wiki 三頁、Diagram 的範圍與雙向跳轉；「全寬檢視」改寫（按鈕在外殼 bar）
- 「資料長什麼樣」：範例 JSON 補 `schemas`、`groups[].schema／description`、`tables[].description`；說明**全部選填、v1.1 資料不改也能跑**、沒有 `schemas` 時介面怎麼降一層
- 新增「Wiki 內文」一節：支援的 8 種語法、反引號自動連結、`table:`／`schema:` 前綴、連結只接受 `http(s)`／`mailto`／站內 `/`／`#`
- 新增一行：`meta.description` 寫 Markdown 時，需 notecraftapp ≥ 1.3.0 才會在頁面描述與搜尋索引中自動去除標記
- 範例檔說明：`example/schema.json`（v1.2）與 `example/schema.v1.1.json`（相容測試）

### 3. 其他文件

| 文件 | 改動 |
| --- | --- |
| `CHANGELOG.md` | 1.3.0 條目補「官方 plugin er-diagram-renderer 升級至 1.2.0（導覽 + Wiki + Diagram）」，並說明 `check-plugins` 現在驗證並 build `example/` 下所有範例、串接 `scripts/checks/*.mjs` |
| `CLAUDE.md` | Plugin System 章節補兩條：`check-plugins` 驗 `example/` 下所有 `.json`；`scripts/checks/*.mjs` 以 Node strip-types 直接載入 `.ts`，被它載入的檔案只能有 `import type`。「工作慣例」的 commit 前檢查補 `npm run check:er` |
| [notecraft-plugin-system.md](../notecraft-plugin-system.md) | `meta.description` 的約定補一句：允許 Markdown，app 顯示與索引時去除標記（顯示第一段、索引全文） |
| 設計文件 [notecraft-er-docs.md](../notecraft-er-docs.md) | 文件狀態改「已實作」；**§17 回填**：待驗證項結論（pagefind 索引 `hidden` 元素、VizZoom 的 Esc 攔截、`--erd-page-offset` 實測值、embed 畫布實際高度）、實作中新增的決定、仍未做的 |
| [docs/tasks/README.md](README.md) | 本批標記已完成、補完成摘要 |

### 4. 全面驗收（handoff 驗收清單 + 設計文件 §12.2）

在 dev（Browser pane，確認 pane **可見**，否則 `client:visible` 不 hydrate）與 `npm run build && npm run preview` 各走一次：

- [ ] v1.1 範例與 `schema-demo.er` 零修改可渲染；無 Schema 層、無範圍切換
- [ ] v1.2 三層導覽；篩選顯示命中數；欄位命中顯示欄名
- [ ] Wiki 三種頁面與所有空狀態
- [ ] 反引號表名／schema key 自動連結；`table:`／`schema:` 前綴；壞引用保留原字串
- [ ] 局部關聯圖箭頭指向父表、縮放後重算、超過 8 張的 chip
- [ ] Diagram 無回歸：縮放、平移、fit、雙擊還原、聚焦、搜尋、hub、展開、tooltip、Esc
- [ ] 範圍切換、跨 schema 連線提示
- [ ] Wiki ↔ Diagram 雙向跳轉與路由同步；搜尋字串跨分頁保留
- [ ] embed：580px 無雙框、導覽預設收、全寬覆蓋層、hold 卡片、焦點歸還
- [ ] page：bar 與導覽 sticky
- [ ] localStorage 殘留無效路由 → 總覽；reload 無 hydration 警告
- [ ] 手機寬度（375）page 與 embed
- [ ] `/view` 頁描述只有第一段、pagefind 搜得到全文
- [ ] `npm pack --dry-run` 內含 plugin 所有新檔與 `src/lib/strip-markdown.ts`；不含 `scripts/checks/`
- [ ] 以本機 pack 的套件在一個暫存專案執行 `install-plugin er-diagram-renderer`（本機來源）後 build 成功

### 5. 收尾

- `npx tsc --noEmit && npx astro build && npm run check-plugins` 全過
- 分支 `feat/er-diagram-redesign` 開 PR 併回 main。**推上預設分支就等於發佈官方 store**，併之前務必確認 `check-plugins` 通過

## 要改的既有檔案

`plugins/er-diagram-renderer/{notecraft-plugin.json, README.md}`、`plugins/registry.json`、`CHANGELOG.md`、`CLAUDE.md`、`docs/notecraft-plugin-system.md`、`docs/notecraft-er-docs.md`、`docs/tasks/README.md`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 版號一致 | — | `npm run check-plugins` | 通過（registry 與 manifest 皆 1.2.0） |
| 驗收清單 | — | 走完 §4 | 全勾 |
| 文件 | — | 讀設計文件 §17 | 四個待驗證項都有結論 |

## 依賴

Task 76–85。

## 實作記錄（2026-09-27）

- manifest／registry 1.2.0、README 重寫、CLAUDE.md（check-plugins 範圍、`<style>` 字元限制、description 約定）、plugin 規格 §8.2 補一段、設計文件 §17 回填
- `npm pack --dry-run` 含 plugin 全部 15 個檔與 `src/lib/strip-markdown.ts`，不含 `scripts/checks/`；以本機來源 `install-plugin --yes` 到暫存專案，14 個檔與兩份 example 皆複製
