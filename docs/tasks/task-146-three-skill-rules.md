# Task 146 — Skill 與 Subagent 的 3D 寫作規範、最小骨架、第二次 sync

> 規格 [notecraft-generated-three.md](../notecraft-generated-three.md) §4.2、§5、§7.2；Q1／Q7／Q8 定案（§13）。
> 依賴 Task 145（骨架要能 import three 才驗得了）。
> **要在 Task 147 之前做**：Task 147 由 component-generator 實際生成範例元件，生成時讀的就是這一步寫的規範。

## 為什麼要有這一步

白名單只決定「能不能 import」，不決定「該不該用、怎麼用」。沒有規範，AI 會把流程圖也做成 3D，或寫出 SSR 時碰 `window`、unmount 不釋放 WebGL context 的元件。

**規範寫在 `.claude/` 的來源檔**（Q1）：`skill-template/` 是 sync 的產物、每次整份覆寫，手寫在那裡下次 sync 就消失。所有段落都寫在 `<!-- BEGIN:whitelist -->` 標記**之外**。

## 範圍

### 1. `.claude/skills/content-visualize/SKILL.md`

- 決策樹表格加一列：「空間關係本身是重點（層疊、拓撲遠近、需要轉角度才看得清的結構）→ `three`（等角 Orthographic），其餘維持 SVG／recharts／d3」
- 判斷句：「畫成等角 SVG 會不會損失資訊？不會 → 用 SVG」
- 新章節「3D 元件（three）」，內容即規格 §5.2–§5.7：
  - 生命週期與 cleanup 順序（含 `renderer.forceContextLoss()`、走訪 scene dispose geometry／material／貼圖）
  - 效能（IntersectionObserver 暫停、靜止時事件驅動、`setPixelRatio` ≤ 2、陰影 ≤ 1024、`powerPreference: "low-power"`）
  - 尺寸（ResizeObserver、高度寫死在元件內、raycaster 用 `getBoundingClientRect()` 換算 —— 放大檢視的 CSS transform 下才不會偏）
  - 無障礙（`role="img"` + 描述畫面的 `aria-label`、canvas `aria-hidden`、HTML 資訊面板 `aria-live`、`div role="group"` 按鈕列：上一步／下一步／播放／暫停／重設視角／＋／－）
  - 減少動態（`useReducedMotion()` → 不跑 rAF、關阻尼與 autoRotate、只 render 終態）
  - 視覺（檔內顏色常數逐一註明對應的 trendlink-design token —— 這是「不硬編碼色碼」的明文例外、只限傳給 three 的值；`alpha: true` 透明底；禁 bloom／glow／fog／EffectComposer／TextGeometry；Hemisphere + 一盞 Directional；`EdgesGeometry` 描邊；HTML overlay 標籤）
  - WebGL 不可用：建立 renderer 失敗時 catch，只顯示 HTML 面板版的靜態資訊
  - **滾輪不縮放**（Q8）：`enableZoom = false`，縮放走按鈕、`camera.zoom` 夾在 `minZoom`／`maxZoom`，避免攔截筆記頁捲動
- 最小骨架（約 120 行 `.tsx`，規格 §5.8）：OrthographicCamera 等角、OrbitControls 限制 polar 20°–70°／`enablePan = false`／`enableZoom = false`、raycaster 點選、ResizeObserver、IntersectionObserver、reduced motion、overlay 標籤、按鈕列、完整 cleanup

### 2. `.claude/agents/component-generator.md`

- step 3 lint 的 root package 例子加 `three/addons/controls/OrbitControls.js` → `three`
- lint 加禁用子路徑：`three/webgpu`、`three/tsl`、`three/src/*`、`three/examples/fonts/*`（視為違規、直接改寫，不需徵詢作者）
- 元件寫作守則加「3D 元件」子節：條列規則（一行一條）並指向 SKILL.md 的骨架；寫明「先複製骨架再改，不要從零寫」

### 3. `.claude/agents/visualize-planner.md`

- 選型說明加「只有空間關係本身是重點才用 three」
- 規劃書選了 three 時必須多一欄「為何不是 SVG」，寫不出來就改回 SVG

### 4. `.claude/skills/content-present/SKILL.md`、`.claude/agents/slide-generator.md`（Q7）

- 各加一段：custom 頁**不新寫** 3D；筆記裡既有的 3D 元件以 full-visual 頁沿用（只有目前頁 `live`，縮圖不渲染元件）

### 5. 骨架驗證

把骨架原樣存成暫存的 `src/components/generated/_three-skeleton.tsx`、掛進一篇暫時筆記（`client:visible`），`npx tsc --noEmit && npx astro build` 通過、dev 開起來能轉能點。驗完刪掉，不 commit。

### 6. 版本與第二次 sync

- `scripts/sync-skill-template.mjs`：`VERSION` `2.0.0-alpha.2` → `2.1.0-alpha.1`（`init-skill --check` 靠它判斷 viewer 使用者的 skill 是否過期）；`PRESENT_VERSION` `1.1.0-alpha.1` → `1.1.1-alpha.1`（content-present 有加段落）
- `npm run sync-skill`，確認 `skill-template/` 的 diff 與 `.claude/` 的手寫內容一致（只多了路徑替換與檔頭），沒有其他漂移

## 要改的既有檔案

`.claude/skills/content-visualize/SKILL.md`、`.claude/agents/component-generator.md`、`.claude/agents/visualize-planner.md`、`.claude/skills/content-present/SKILL.md`、`.claude/agents/slide-generator.md`、`scripts/sync-skill-template.mjs`；sync 產生的 `skill-template/` 對應檔與兩個 `VERSION`。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 骨架可 build | 暫存骨架元件 | `npx tsc --noEmit && npx astro build` | 通過；tsc 錯誤數不增加 |
| 骨架行為 | `npx astro dev` | 拖曳、點物件、按鈕列、滾輪 | 可旋轉（polar 受限）、點選命中、按鈕可操作、滾輪捲頁面而非縮放 |
| 白名單段落 | — | `git diff` 4 個 host 檔 | 手寫段落都在 whitelist 標記之外；標記內容與 Task 145 相同 |
| sync | — | `npm run sync-skill` | skill-template 對應檔帶到新段落、路徑已替換；`VERSION` 為 `2.1.0-alpha.1` |
| check-skill | — | `node bin/notecraftapp.mjs init-skill --check`（在裝了舊 skill 的暫存資料夾） | 顯示版本落差 |

## 依賴

Task 145。
