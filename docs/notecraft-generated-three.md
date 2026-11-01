Project Name: NoteCraft — AI 生成元件支援 three.js（3D 場景）
文件類型: Design Document
文件版本: v1.0.0
開發模式: Waterfall
技術選型: 新增依賴 `three`（0.187.x）與 `@types/three`；其餘沿用既有技術棧
文件狀態: 已實作（notecraftapp v1.15.0，Task 145–148，2026-11-01）—— §12 的 9 題已確認（紀錄見 §13）；實作後回填見 §14
文件作者: 建宇
建立日期: 2026-11-01
更新日期: 2026-11-01
依賴文件: docs/notecraft-npx-viewer-v2.md（§6.5／§6.6 白名單）、docs/notecraft-plugin-system.md（plugin 共用白名單）、.claude/skills/content-visualize/SKILL.md、.claude/agents/component-generator.md
分支: feat/generated-three
預計版本: notecraftapp 1.15.0（minor：新增能力、既有元件不受影響）
---

# NoteCraft — AI 生成元件支援 three.js 設計文件

讓少數「空間關係本身就是重點」的視覺化（架構分層、平台拓撲、等角插圖風格的流程全景）可以由 AI 生成成可旋轉、可點選的 3D 互動元件。

這份文件先盤點現況（§2），因為需求裡有幾項其實**已經成立**、有幾項**要換個做法**才不會被覆蓋，再逐項給出設計。

---

## 1. 目標與非目標

### 1.1 目標

1. `three` 進入 AI 生成元件的 import 白名單，主專案與 npx viewer 都能 build
2. 支援子路徑匯入（`three/addons/controls/OrbitControls.js` 等）
3. Skill／Subagent 文件補上「何時用 3D」與 3D 元件的寫作規範（生命週期、效能、尺寸、無障礙、減少動態、視覺）
4. 一個實際 import `OrbitControls` 的範例元件，在 `view`／`serve`／`build` 三種模式都能顯示
5. 文件、CHANGELOG、版本號（1.15.0）

### 1.2 非目標

- 不做 `@react-three/fiber`／`drei`（宣告式 3D）：白名單只加 `three` 本體，避免一次引入兩套心智模型；需要時另開需求
- 不做 WebGPU（`three/webgpu`）、不做 TSL、不載入外部模型檔（glTF／貼圖）：元件必須自包含，幾何一律程式產生
- 不做 3D 文字（`TextGeometry` 需要字型檔）；標籤一律 HTML overlay
- 不改 `GeneratedFrame`、`VizZoom`、`CanvasViewport` 的行為

---

## 2. 現況盤點（需求逐項對照）

| 需求項 | 現況 | 結論 |
| --- | --- | --- |
| 白名單常數加 `three` | `src/lib/generated-component-whitelist.ts` 是唯一來源 | 照做 |
| `astro.config.mjs` dedupe 吃到新清單 | `dedupe: notesDir ? [...GENERATED_COMPONENT_PACKAGE_WHITELIST] : []`，直接 import 常數 | **已自動成立**；只需在 viewer 模式驗證子路徑（§4.3） |
| sync-skill 更新所有 whitelist 段落 | `scripts/sync-skill-template.mjs` 先改主專案 4 個 host 檔，再複製到 `skill-template/` | 照做；`git diff` 會包含**主專案** `.claude/` 的 4 個檔，不只 skill-template |
| lint 支援「套件名 + 子路徑」 | component-generator step 3 已規定取 **root package**（`motion/react` → `motion`、`d3/utils` → `d3`）；`bin/install-plugin.mjs:287` 也以 root package 比對 | **已成立**；補一個 `three/addons/...` 的例子即可 |
| 在 `skill-template/` 手寫 3D 規範 | `skill-template/` 是 **sync 的產物**：每次 `npm run sync-skill` 都以 `.claude/` 的來源整份覆寫（檔頭寫明 do NOT edit here） | **改寫在 `.claude/` 的來源檔**，由 sync 帶到 skill-template（見 §12 Q1） |
| `three` 版本「鎖定 major」 | three 的版號是 `0.<release>.x`（目前 `0.187.0`），每個 release 都可能有破壞性變更；`^0.187.0` 依 semver 已等同鎖 minor | 用 `~0.187.0`（只收 patch）（§12 Q2） |
| 需要時加 `@types/three` | three 本體不附型別；`@types/three@0.187.0` 已有，含 `addons/*` 子路徑的 exports | 需要 |

另外盤點到三件需求沒提、但會影響設計的事：

1. **白名單也是 plugin 的白名單**：`check-plugins.mjs` 與 `install-plugin.mjs` 讀同一份常數，加 `three` 後 plugin renderer 也能 import three（§12 Q4）。
2. **npx 使用者的安裝體積**：`three` unpacked 約 21 MB、`@types/three` 另有數 MB；放進 `dependencies` 後每個 `npx notecraftapp` 使用者首次安裝都會下載（§12 Q3）。瀏覽器端不受影響：Vite 依 island 分包，只有用到 3D 元件的頁面才下載 three 的 chunk（`three.module.js` 約 150 KB gzip 前後，含 OrbitControls）。
3. **「Too many active WebGL contexts」的實際觸發點**：筆記頁之間是跨文件導覽（MPA），換頁時整份文件銷毀、context 由瀏覽器回收，**單靠「切換頁面」測不出洩漏**。真正會在同一份文件內反覆 mount／unmount 的是：
   - 簡報頁（`/present/<slug>`）翻頁：`LayoutFullVisual` 只在 `live` 時渲染真元件，縮圖（rail、大綱）不渲染 —— 每翻一頁就 unmount 前一頁、mount 下一頁
   - `astro dev`（`view`）的 HMR：改元件存檔一次就 remount 一次
   - 放大檢視（`VizZoom`）**不會** remount（它搬移同一個 DOM 節點），但會改變容器尺寸與套上 CSS transform（§5.4）

---

## 3. 白名單與依賴

### 3.1 改動

```ts
// src/lib/generated-component-whitelist.ts
export const GENERATED_COMPONENT_PACKAGE_WHITELIST = [
  "react", "react-dom", "motion", "recharts", "d3",
  "lucide-react", "clsx", "tailwind-merge",
  "three",
] as const;
```

```jsonc
// package.json
"dependencies": { "three": "~0.187.0" },
"devDependencies": { "@types/three": "~0.187.0" }   // 位置見 §12 Q5
```

- `three` 必須在 `dependencies`：viewer 模式下外部 tsx 由 dedupe 從 **app root** 解析，套件要隨 npm 套件安裝
- `@types/three` 只有 tsc 用得到：主專案的 component-generator 跑 `tsc --noEmit`；viewer 版驗證是觀察 `serve --watch`、不跑 tsc（`VALIDATION_CG_VIEWER`），build 也不做型別檢查，因此預設放 `devDependencies`

### 3.2 sync-skill

`npm run sync-skill` 後預期的 `git diff`：

- 主專案 4 個 whitelist host 檔：`.claude/skills/content-visualize/SKILL.md`、`.claude/agents/component-generator.md`、`.claude/skills/content-present/SKILL.md`、`.claude/agents/slide-generator.md` —— 只有 `<!-- BEGIN:whitelist -->` 段落多一個 `` `three` ``
- `skill-template/` 對應的檔案 —— 同上，加上 §5 手寫段落帶過去的內容
- `skill-template/.claude/skills/content-visualize/VERSION`（及 content-present 若有改）—— 見 §7.2

驗收時分兩次看：先**只**改常數跑一次 sync，確認 diff 只有白名單段落（需求的驗收條件）；再寫 §5 的規範、跑第二次。

> 工作目錄目前有 10 個 `skill-template/` 檔顯示為 modified，`git diff --stat` 為空 —— 只是 LF／CRLF 的差異，不影響本次 diff 判讀（不要用 `git stash` 處理）。

---

## 4. 子路徑 import

### 4.1 寫法

一律用 `three/addons/...`（three 官方文件的寫法，`package.json` exports 的 `./addons/*` 對應 `./examples/jsm/*`），**含 `.js` 副檔名**：

```ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
```

`three/examples/jsm/...` 也解析得到，但規範只寫一種，lint 不擋另一種（root package 都是 `three`）。

### 4.2 lint

component-generator step 3 的 root package 規則已涵蓋，只補一個例子：`three/addons/controls/OrbitControls.js` → `three`。不需要改任何程式。

另外補一條**禁止**：`three/webgpu`、`three/tsl`、`three/src/*` 不可用（理由見 §1.2；`src/*` 會繞過 build 版本、讓 bundle 變大）。這是 three 內部的子路徑限制，lint 以文字規則寫在 component-generator.md，不進白名單常數（常數只放 root package）。

### 4.3 Vite 解析（viewer 模式）

Vite 的 `resolve.dedupe` 是以「bare import 的套件名」比對（`three/addons/x` 的套件名是 `three`），所以子路徑同樣會從 app root 解析。**這需要實測**：在 viewer 模式（筆記資料夾在 app 外、元件在 `<notesDir>/.notecraft/components/`）跑 `build` 與 `serve`，確認沒有 `Could not resolve "three/addons/..."`。若不成立，退路是在 `astro.config.mjs` 為 `three` 加 `resolve.alias`（只在 `notesDir` 時）。

### 4.4 範例元件

`src/components/generated/<id>.tsx`，題材是「三層平台拓撲」：等角視角、OrbitControls、raycaster 點選、HTML overlay 標籤、步驟按鈕列，完整套用 §5 的規範，同時是 Skill 範例骨架的實際驗證對象。放在哪篇筆記見 §12 Q6。

---

## 5. 3D 元件寫作規範

寫在 `.claude/` 的來源檔（不在 whitelist 標記內），sync 時帶到 `skill-template/`：

| 檔案 | 補什麼 |
| --- | --- |
| `.claude/skills/content-visualize/SKILL.md` | 決策樹加「3D 場景」一列；新增「3D 元件（three）」章節：§5.1–§5.7 全文 + §5.8 骨架 |
| `.claude/agents/component-generator.md` | 元件寫作守則加 3D 子節（規則條列、指向 SKILL.md 的骨架）；lint 補子路徑例子與禁用子路徑 |
| `.claude/agents/visualize-planner.md` | 選型說明加「只有空間關係本身是重點才用 three」，規劃書要寫出「為何不是 SVG」 |
| `.claude/skills/content-present/SKILL.md`、`.claude/agents/slide-generator.md` | 只加一段：deck 的 custom 頁**不新寫** 3D；既有 3D 元件以 full-visual 沿用（§12 Q7） |

### 5.1 何時用

只有「**空間關係本身是重點**」才用 three：層疊（哪一層在哪一層上面）、拓撲中的遠近與包含、需要轉角度才看得清的結構。流程、比較、數值、時間軸、狀態機一律維持手寫 SVG／recharts／d3／Tailwind table。

判斷句寫進決策樹：「把它畫成等角 SVG 會不會損失資訊？不會 → 用 SVG」。3D 的成本（bundle、可讀性、無障礙）要由「可旋轉」換到的資訊付清。

### 5.2 生命週期（SSR 安全）

- 模組頂層**不得**存取 `window`／`document`／`WebGLRenderingContext`；`new THREE.WebGLRenderer()` 只在 `useEffect` 內
- `import * as THREE from "three"` 在模組頂層是安全的（three 的模組本身不碰 DOM），可以在頂層建立純資料（顏色常數、座標表）
- cleanup 必須依序：`cancelAnimationFrame` → `ResizeObserver.disconnect()` → `IntersectionObserver.disconnect()` → `controls.dispose()` → 走訪 scene `dispose()` 每個 geometry／material（含 `material.map` 等貼圖）→ `renderer.dispose()` → `renderer.forceContextLoss()` → 從 DOM 移除 canvas
  - `forceContextLoss()` 是讓瀏覽器**立即**釋放 context 的關鍵，只有 `dispose()` 時 context 要等 GC，連續翻簡報頁仍可能累積到上限
- React 18 StrictMode／HMR 會 mount → unmount → mount：cleanup 寫對就自然成立，不要用 module-level 單例 renderer

### 5.3 效能

- `IntersectionObserver`：離開可視範圍停止 rAF 迴圈，回到可視範圍才恢復；迴圈只在「有動畫或控制器阻尼中」時跑，靜止時改為事件驅動（`controls.addEventListener('change', render)`）
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- 陰影貼圖 `shadow.mapSize` ≤ 1024；預設不開陰影，需要時只給一盞主光
- `antialias: true`、`powerPreference: "low-power"`（筆記裡的插圖不需要獨顯）
- MDX 端 `client:visible`（mdx-writer 規則已是「含互動加 client:visible」，3D 一律互動）

### 5.4 尺寸

- 寬度跟著版面：`ResizeObserver` 觀察容器，更新 `renderer.setSize(w, h, false)` 與 camera（Orthographic 改 left/right/top/bottom；Perspective 改 aspect）後 `updateProjectionMatrix()`
- 高度固定、寫在元件內（例：`const H = 420`），不讀外部 props
- **放大檢視相容**：VizZoom 把節點搬進套了 CSS `transform: scale()` 的 CanvasViewport。ResizeObserver 量到的是**未縮放**的版面尺寸（正確），但指標座標是螢幕座標 —— raycaster 的 NDC 換算**一律用 `canvas.getBoundingClientRect()`** 的寬高，不用 `clientWidth`，否則放大後點選會偏
- 拖曳：CanvasViewport 已是「元件互動優先、⌥ 才平移」，OrbitControls 的拖曳旋轉不衝突

### 5.5 無障礙

- canvas 外層 `role="img"` + 描述**畫面內容**的 `aria-label`（不是「3D 場景」這種空話）；canvas 本身 `aria-hidden`
- 資訊放在 canvas 外的 HTML 面板（選中物件的名稱、說明），`aria-live="polite"`
- 一定要有按鈕操作：上一步／下一步／播放／暫停（＋「重設視角」），按鈕列 `<div role="group" aria-label="…">`；點 3D 物件只是捷徑
- 鍵盤：按鈕列可 Tab；不在 canvas 上掛全域 keydown（筆記頁、簡報頁都有自己的快捷鍵）

### 5.6 減少動態

`useReducedMotion()` 為 true 時：不跑 rAF 迴圈、`controls.enableDamping = false`、`autoRotate = false`，只 render 一次終態；步驟切換直接跳到該步的狀態並重繪一次。

### 5.7 視覺

- 顏色用**檔內常數**，每個常數註明對應的 trendlink-design token（WebGL 讀不到 CSS 變數；`THREE.Color` 收十六進位）。這是 CLAUDE.md「不要硬編碼色碼」的明文例外，只限傳給 three 的值；HTML 面板與 overlay 仍用 Tailwind／token class
- 白底與細框由 `GeneratedFrame` 提供：renderer 用 `alpha: true`、`setClearColor(0x000000, 0)`，元件根元素不自帶外框
- 禁用：bloom、glow、fog、任何 `EffectComposer` 後處理、`TextGeometry`
- 光：`HemisphereLight`＋一盞 `DirectionalLight`；陰影淡（`ShadowMaterial` opacity ≤ 0.15）
- 材質：`MeshStandardMaterial`（低 metalness）或 `MeshLambertMaterial`；邊線用 `EdgesGeometry` + `LineBasicMaterial` 做插圖感
- 文字標籤：HTML overlay，每次 render 後以 `vector.project(camera)` 換算到容器座標、以 `transform: translate()` 定位；被遮擋或在背面時淡出

### 5.8 最小範例骨架

SKILL.md 內附一份 ~120 行的骨架，涵蓋：

- `OrthographicCamera` 等角視角（`position.set(d, d, d)`、`lookAt(0,0,0)`）
- `OrbitControls`：`minPolarAngle`／`maxPolarAngle` 限制在俯視 20°–70°、`minZoom`／`maxZoom`、`enablePan = false`、`enableZoom` 見 §12 Q8
- raycaster 點選（`getBoundingClientRect` 換算 NDC）
- ResizeObserver、IntersectionObserver、`useReducedMotion()`
- HTML overlay 標籤與資訊面板、`role="group"` 按鈕列
- §5.2 順序的完整 cleanup

骨架就是 §4.4 範例元件精簡後的版本；兩者同時維護，骨架改了範例也要能 build。

---

## 6. 驗證計畫

| # | 項目 | 做法 |
| --- | --- | --- |
| V1 | sync-skill diff 只有白名單段落 | 只改常數 → `npm run sync-skill` → `git diff` 逐檔檢查（§3.2） |
| V2 | 主專案 build | `npx tsc --noEmit`（看有無**新增**錯誤）＋ `npx astro build` |
| V3 | 舊元件不受影響 | 改動前後各 build 一次，比對 `dist/` 中既有頁面的 HTML 與既有 island chunk 檔名／大小；預期只有新增 three 相關 chunk |
| V4 | viewer 三模式 | `npm pack` → 臨時工作區（筆記在 app 外、元件在 `.notecraft/components/`）+ `NOTECRAFTAPP_DEV=1`，跑 `view`／`serve`／`build`，瀏覽器確認可旋轉、可點選、無 console 錯誤；包成 `scripts/fixtures/three-viewer.mjs` |
| V5 | component-generator 實際生成 | 寫一個 `@ai-visualize` 標記（type: free、prompt 描述等角拓撲），走完四個 Subagent，lint 通過，人工對照 §5 清單逐條勾 |
| V6 | WebGL context 不殘留 | (a) 簡報頁：含 3D full-visual 的 deck 來回翻頁 ≥ 30 次；(b) `view` 模式改元件存檔 ≥ 20 次；兩者 console 都不得出現 `Too many active WebGL contexts`。另以 `javascript_tool` 在 cleanup 後檢查 canvas 已移除 |
| V7 | 減少動態 | `prefers-reduced-motion: reduce` 下無 rAF 迴圈（Performance 面板或計數器確認） |
| V8 | 放大檢視 | 開 VizZoom 後點選物件命中正確、關閉後尺寸復原 |

V6(a) 需要一份含該元件的 deck；若 §12 Q7 決定 deck 不碰 3D，改以一頁暫時的 fixture deck 驗證、不 commit。

---

## 7. 文件與版本

### 7.1 文件

- `docs/notecraft-npx-viewer-v2.md` §6.5 清單與 §6.6 常數範例加 `three`，補一句「子路徑以 root package 比對」
- `docs/notecraft-plugin-system.md` 白名單那一行同步（若 §12 Q4 允許 plugin 用）
- `CLAUDE.md`「元件白名單」一行加 `three`，「視覺化選型」表加一列
- `CHANGELOG.md` 新增 `## [1.15.0] - YYYY-MM-DD`：
  - 新增：AI 生成的互動元件可以使用 three.js 做 3D 場景（只建議用在空間關係是重點的圖）
  - 內部：新增依賴 `three`；Skill 版本升級（viewer 使用者跑 `notecraftapp init-skill` 取得新規範）

### 7.2 版本號

- `package.json`：`1.14.0` → `1.15.0`
- `scripts/sync-skill-template.mjs` 的 `VERSION`（content-visualize skill）：`2.0.0-alpha.2` → `2.1.0-alpha.1` —— **必須升**，`init-skill --check` 靠它判斷 viewer 使用者的 skill 是否過期；只升套件版不升這個，使用者會一直用沒有 three 規範的舊 skill，卻能 import three
- `PRESENT_VERSION`：只有 content-present 有實質內容變更才升

---

## 8. 檔案變更清單

| 檔案 | 動作 |
| --- | --- |
| `src/lib/generated-component-whitelist.ts` | 加 `"three"`；註解補「子路徑以 root package 比對」 |
| `package.json`、`package-lock.json` | `three`、`@types/three`、版本 1.15.0 |
| `.claude/skills/content-visualize/SKILL.md` | 決策樹一列 + 3D 章節 + 骨架（whitelist 段落由 sync 改） |
| `.claude/agents/component-generator.md` | 3D 守則、lint 子路徑例子與禁用子路徑 |
| `.claude/agents/visualize-planner.md` | 選型說明 |
| `.claude/skills/content-present/SKILL.md`、`.claude/agents/slide-generator.md` | 依 Q7；whitelist 段落由 sync 改 |
| `scripts/sync-skill-template.mjs` | `VERSION`（及視需要 `PRESENT_VERSION`） |
| `skill-template/**` | sync 產物，不手改 |
| `src/components/generated/<id>.tsx` | 範例元件 |
| 範例筆記（依 Q6） | 標記區塊 + import + JSX |
| `scripts/fixtures/three-viewer.mjs` | viewer 三模式驗證 |
| `astro.config.mjs` | 預期不改；§4.3 實測失敗才加 alias |
| `docs/notecraft-npx-viewer-v2.md`、`docs/notecraft-plugin-system.md`、`CLAUDE.md`、`CHANGELOG.md` | §7.1 |

---

## 9. 實作順序

對應 Task 145–148（`docs/tasks/README.md` v1.26.0 一節）。Q9 定案範例元件由 component-generator 生成，因此規範要先於範例：

1. Task 145：依賴 + 白名單常數 → 第一次 sync（V1）→ 主專案子路徑 build（V2）
2. Task 146：寫 §5 規範與骨架到 `.claude/` → skill 版號 → 第二次 sync
3. Task 147：以四個 Subagent 生成範例元件進 md-viz（V5）→ V3、V8
4. Task 148：viewer fixture（V4）→ V6、V7 → 文件、CHANGELOG、版本號

---

## 10. 風險

| 風險 | 緩解 |
| --- | --- |
| AI 過度使用 3D（什麼都想轉） | §5.1 的判斷句、planner 規劃書必須寫「為何不是 SVG」 |
| three release 間破壞性變更 | `~0.187.0` 只收 patch；升 release 時以範例元件 build 驗證 |
| 筆記頁捲動被 OrbitControls 吃掉 | §12 Q8 |
| 低階裝置／無 WebGL | `WebGLRenderer` 建立失敗時 catch，顯示 HTML 面板版的靜態資訊（不 throw 進錯誤卡） |
| 官網 Demo 也取自範例筆記 | §12 Q6 |

---

## 11. 驗收條件（對照需求）

- [ ] `npm run sync-skill` 後 git diff 只有預期的白名單段落變更（V1）
- [ ] 範例 three 元件在 view、serve、build 都正常顯示，build 無錯誤（V4）
- [ ] 舊有元件 build 結果不受影響（V3）
- [ ] component-generator 實際生成一個 three 元件，lint 通過並符合 §5（V5）
- [ ] unmount 後無殘留 WebGL context（V6）

---

## 12. 待釐清問題

| # | 問題 | 建議 |
| --- | --- | --- |
| Q1 | 3D 規範寫在 `.claude/` 來源、由 sync 帶進 `skill-template/`（直接寫 skill-template 下次 sync 就被覆蓋）？ | 寫在 `.claude/` |
| Q2 | three 版本範圍：`~0.187.0`（只收 patch）或釘死 `0.187.0`？ | `~0.187.0` |
| Q3 | 每個 npx 使用者多下載約 21 MB（three）可以接受嗎？ | 接受；替代方案（optional peer、按需安裝）會讓 viewer 的 AI 生成在沒裝時 build fail，UX 更差 |
| Q4 | plugin renderer 也一併允許 import three（白名單共用）？ | 允許，文件同步 |
| Q5 | `@types/three` 放 `devDependencies` 或 `dependencies`？ | `devDependencies`（viewer 不跑 tsc） |
| Q6 | 範例元件放哪：加進 4 篇範例之一（`md-viz`，會出現在官網 Demo）、新增一篇範例筆記、或只放 fixture？ | 加進 `md-viz` 的末段 |
| Q7 | content-present／slide-generator：custom 頁可否新寫 3D？ | 不可；只以 full-visual 沿用既有 3D 元件 |
| Q8 | 筆記頁上 OrbitControls 的滾輪縮放會攔截頁面捲動。預設 `enableZoom = false`、改由按鈕（＋／－）縮放？ | 關閉滾輪縮放，按鈕列加縮放 |
| Q9 | V5 的「實際生成」能否就是 §4.4 的範例元件（由 component-generator 生成而非手寫）？ | 可以，少一個元件；骨架仍手寫在 SKILL.md |

---

## 13. 決策紀錄（2026-11-01，作者逐題確認）

Q1–Q9 全部採建議：

| # | 決策 |
| --- | --- |
| Q1 | 3D 規範寫在 `.claude/` 來源，由 `npm run sync-skill` 帶進 `skill-template/`，不手改 skill-template |
| Q2 | `three: ~0.187.0` |
| Q3 | 接受 npx 安裝多約 21 MB，`three` 放 `dependencies` |
| Q4 | plugin renderer 同樣可 import three；`docs/notecraft-plugin-system.md` 同步 |
| Q5 | `@types/three: ~0.187.0` 放 `devDependencies` |
| Q6 | 範例元件加進 `md-viz` 末段（官網 Demo 也會出現） |
| Q7 | 簡報 custom 頁不新寫 3D；既有 3D 元件以 full-visual 沿用 |
| Q8 | OrbitControls `enableZoom = false`，按鈕列加＋／－縮放（`camera.zoom` 夾在 `minZoom`／`maxZoom`） |
| Q9 | md-viz 的範例元件就是 V5 的實際生成對象（標記 → 四個 Subagent）；SKILL.md 的骨架另外手寫 |

---

## 14. 實作記錄（2026-11-01）

Task 145–148 全部實作於 `feat/generated-three`，依 Task 逐筆 commit。

### 14.1 與規格不同之處

| 項目 | 規格 | 實際 | 理由 |
| --- | --- | --- | --- |
| 範例位置（§4.4、Q6） | md-viz 末段 | md-viz「互動圖表」之後的新一節「3D 場景」 | 末段是 Renderer Plugin 的完整敘事（接系列最後一章），放在其他已生成範例旁邊較順；開頭「三種已生成的元件」改為四種 |
| 範例題材（§4.4） | 三層平台拓撲 | 請假系統的三層架構（介面／服務／資料，7 個元件、7 步走查） | 沿用整篇筆記的請假主題 |
| 骨架長度（§5.8） | 約 120 行 | 約 250 行 | 規範要求的按鈕列、overlay、IntersectionObserver 與完整 cleanup 全放進去後無法再短 |
| 資訊面板 | 未規定高度 | 新規則：說明長短不一時給 `min-h-*` | 實測切換說明時按鈕列會上下跳動、點不到；已補進 SKILL.md 與 component-generator（生成後唯一的手動修改） |
| `PRESENT_VERSION` | 有實質變更才升 | `1.1.0-alpha.1` → `1.1.1-alpha.1` | content-present 與 slide-generator 加了 3D 段落 |

### 14.2 驗證結果

- **V1**：只改常數跑 sync，8 個檔（主專案 4 個 host、skill-template 4 個）每檔只有白名單段落多了 `` `three` ``
- **V2**：tsc 錯誤數維持 40（既有），沒有任何錯誤指向新檔；主 repo build 29 頁
- **V3**：改動前後 `dist/` 比對——舊頁面 HTML 的差異只有版號（`1.15.0`）與共用 CSS 的 hash（新增 Tailwind class）；JS 只多了 `demo-platform-layers` chunk 與一個共用的 `pause` 圖示 chunk（因此 `PresentApp` 換了 hash）；除 md-viz 外沒有頁面載入 three
- **V4**：`scripts/fixtures/three-viewer.mjs --build` 通過（元件在 `.notecraft/components/`、工作區沒有 node_modules，`three/addons/...` 由 dedupe 從 app root 解析成功）；`view` 與 `serve` 皆可顯示並互動，`serve` 改元件存檔後背景 rebuild、頁面自動 reload。`astro.config.mjs` **不需要**加 alias
- **V5**：四個 Subagent 實際生成：visualize-planner 選 three 並寫出 Why not SVG；component-generator 一次通過 lint／tsc／build，並逐條回報 3D 自查清單皆符合
- **V6**：以 `getContext` 計數——(a) 簡報翻頁讓元件 mount／unmount 32 次：建立 32、釋放 32，同時最多 1 個 canvas；(b) dev 熱重載 40 次：建立 40、釋放 39（剩目前那 1 個）；(c) 放大檢視開關 20 次：不新增 context、關閉後寬度復原。三者都沒有「Too many active WebGL contexts」
- **V7**：未能在瀏覽器實測（內建瀏覽器無法模擬 `prefers-reduced-motion`）；以程式碼確認：`enableDamping = !reduce`、無補間與 autoRotate、狀態改變只排一幀
- **V8**：放大檢視（CSS `scale` 0.97）下以滑鼠點選方塊命中正確
- **滾輪**：`enableZoom = false` 時 OrbitControls 在 `preventDefault` 之前就 return（原始碼確認），window 收到的 wheel 事件 `defaultPrevented = false`。內建瀏覽器的合成滾輪在 canvas 上不一定捲得動，但在非 canvas 區域也同樣不穩，判定為工具限制
- **發版檢查**：`npm run check:upd`、`npm run check-plugins` 通過
- **bundle**：範例元件 chunk（含 three 與 OrbitControls）約 550 KB、gzip 約 138 KB，只有用到 3D 元件的頁面下載

### 14.3 fixture 的環境限制（與 three 無關）

`three-viewer.mjs` 沿用 `plugin-empty-states.mjs` 的做法：打包後把 `node_modules` 以 junction 指回主 repo。這樣跑出來的產物**沒有任何 CSS**（改動前的 commit `6c343f1` 以同樣方式跑也是 0 個 CSS 檔；本機真實安裝的 `~/.notecraft/app-1.14.0/` 則有），所以 fixture 的頁面沒有樣式，只用來驗 three 的解析、打包與 hydrate。另外 Astro 的 content 快取在共用的 `node_modules/.astro/`，記著最後一次 build 的工作區，換工作區後直接 `serve` 會以 `content-layer-deferred-module … fileName=<舊路徑>` 失敗，先 `build --rebuild` 一次即可。兩者都寫在 fixture 檔頭。
