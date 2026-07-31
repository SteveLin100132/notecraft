# Task 28 — 範例 deck（端到端驗證）

> 對應 PRD v1.9.0 §7.1「筆記轉簡報」。依賴 [Task 23](task-23-deck-data-model-resolution.md)〜[Task 27](task-27-present-route-layout.md)。
> 資料取樣：deck.jsx 的 `DECKS["role-and-responsibility"]`（8 頁，涵蓋全部 8 版型）。

## 範圍

- 新增 [src/components/generated/role-responsibility-rr.deck.tsx](../../src/components/generated/role-responsibility-rr.deck.tsx)：對應**本專案既有筆記** slug（[role-responsibility-rr.mdx](../../src/content/notes/role-responsibility-rr.mdx)，該筆記已有 `rr-raci` / `rr-structure` / `rr-derived-roles` 生成元件）。
- 讓 `full-visual` 頁接**真的** `rr-raci` 元件，端到端跑通「檢視 → 播放 → 互動」。

## 實作

- 依 deck.jsx `DECKS` 的 8 頁結構改寫，`slug` / `source` 對齊本專案：
  - `slug: "role-responsibility-rr"`、`source: "src/content/notes/role-responsibility-rr.mdx"`。
  - 8 頁涵蓋 cover / section / bullets / media / compare / full-visual / quote / closing。
  - `full-visual` 頁：`import RrRaci from "@/components/generated/rr-raci"`，`viz: RrRaci`、`vizLabel: "@ai-visualize · rr-raci"`。
- 內容用繁中真實文案（可直接沿用 deck.jsx 的 R&R 範例文字），讓版型看起來「用心設計過」。

## 驗收

- [ ] 筆記 `role-responsibility-rr` 的功能列出現「簡報」入口（Task 29）
- [ ] `/present/role-responsibility-rr` 檢視模式顯示 8 頁縮覽 + 主畫布
- [ ] 播放模式可全螢幕逐頁播放、進度列 / 大綱正常
- [ ] `full-visual` 頁的 `rr-raci` 元件**播放時仍可互動**（點 R/A/C/I 聚焦）
- [ ] 亮 / 暗主題皆正確
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- 這是本功能的第一個真實 deck，同時作為 Task 23〜27 的整合驗收。
- 若既有筆記 slug 與 deck.jsx 取樣的 `role-and-responsibility` 不同名，一律以**本專案實際 slug** 為準（`role-responsibility-rr`）。
