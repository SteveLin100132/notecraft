# Task 145 — 依賴 `three` 與白名單常數、第一次 sync

> 規格 [notecraft-generated-three.md](../notecraft-generated-three.md) §3、§4.1–§4.3；Q2／Q3／Q4／Q5 定案（§13）。
> 無前置依賴，**本批第一個做**：不先讓 `three` 能 import、能 build，Task 146 的骨架與 Task 147 的生成都驗不了。

## 為什麼要有這一步

白名單常數是 `vite.resolve.dedupe`、component-generator lint、SKILL.md 段落、plugin 安裝檢查四處的唯一來源。
這一步只動常數與依賴、跑一次 sync，讓驗收條件「sync 後 git diff 只有白名單段落」可以乾淨地判讀 —— 手寫的 3D 規範留到 Task 146，避免兩種變更混在同一份 diff 裡。

## 範圍

### 1. `package.json`

- `dependencies` 加 `"three": "~0.187.0"`（three 的版號是 `0.<release>.x`，`~` 只收 patch）
- `devDependencies` 加 `"@types/three": "~0.187.0"`（viewer 不跑 tsc，不隨套件發佈型別）
- `npm install` 更新 `package-lock.json`
- 版本號**不在這一步改**（Task 148 發版時一起改）

### 2. `src/lib/generated-component-whitelist.ts`

- 陣列尾端加 `"three"`
- 檔頭註解補兩句：
  - 「子路徑以 root package 比對（`three/addons/controls/OrbitControls.js` → `three`），常數只放 root package」
  - 「此清單也是 plugin renderer 的白名單（`bin/install-plugin.mjs`、`scripts/check-plugins.mjs`）」

### 3. 第一次 `npm run sync-skill`

- 預期 diff（逐檔確認，**只有** `<!-- BEGIN:whitelist -->` 段落多一個 `` `three` ``）：
  - 主專案：`.claude/skills/content-visualize/SKILL.md`、`.claude/agents/component-generator.md`、`.claude/skills/content-present/SKILL.md`、`.claude/agents/slide-generator.md`
  - `skill-template/` 對應的 4 個檔
- 其餘 `skill-template/` 檔（mdx-writer、note-scanner、references/atoms.md、VERSION…）在工作目錄顯示 modified 但 `git diff --stat` 為空 —— 只是 LF／CRLF，**不要 add、不要 git stash**
- 若 diff 出現白名單段落以外的內容 → 代表 `.claude/` 與 skill-template 原本就漂移，先停下回報，不要順手 commit

### 4. 子路徑解析確認（主專案）

暫存一個不進 commit 的檔 `src/components/generated/_three-probe.tsx`：

```tsx
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export default function ThreeProbe() { void THREE.REVISION; void OrbitControls; return null; }
```

掛進一篇暫時的筆記或直接被任一頁 import，跑 `npx tsc --noEmit` 與 `npx astro build`，確認：

- `three/addons/...` 型別解析得到（`@types/three` 的 exports）
- build 無 `Could not resolve`；dist 出現 three 的 chunk
- 驗完刪掉 probe 與暫時筆記

viewer 模式（dedupe 是否涵蓋子路徑）在 Task 148 的 fixture 驗；若那時失敗，退路是 `astro.config.mjs` 在 `notesDir` 時為 `three` 加 `resolve.alias`（規格 §4.3）。

### 5. plugin 護欄

- `npm run check-plugins -- --skip-build`：既有兩個官方 plugin 不受影響
- 不需改 `install-plugin.mjs`（`inspectFiles` 已取 root package，第 287 行）

## 要改的既有檔案

`package.json`、`package-lock.json`、`src/lib/generated-component-whitelist.ts`；sync 產生的 4 個 `.claude/` 檔與 4 個 `skill-template/` 檔。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| sync diff | 只改了常數 | `npm run sync-skill` → `git diff` | 8 個檔，每檔只有白名單段落多了 `` `three` `` |
| dedupe | — | 讀 `astro.config.mjs` | 未修改；`dedupe` 展開常數，`notesDir` 時含 `three` |
| 子路徑 | probe 元件 | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加；有 three chunk |
| 舊元件 | 刪掉 probe 後 | `npx astro build` | 頁數與既有 island chunk 與改動前一致（記下改動前的 `dist/_astro` 清單比對） |
| plugin | — | `npm run check-plugins -- --skip-build` | 通過 |

## 依賴

無。

## 實作記錄（2026-11-01）

- `npm install` 預設寫成 `^0.187.0`，手動改成 `~0.187.0` 後重跑 install；lockfile 只多了 three、@types/three 及後者的型別依賴
- 第一次 sync：8 個檔各只有白名單段落多了 `` `three` ``（`git diff --word-diff` 確認）
- probe 元件的 tsc 錯誤數維持 40；子路徑的 build 驗證併入 Task 146 的骨架 build（同一個 import），build 通過且產物有 three chunk
- `check-plugins -- --skip-build` 通過
