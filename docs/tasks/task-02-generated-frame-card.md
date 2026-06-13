# Task 02 — AI 生成內容外框卡片（GeneratedFrame）

> 對應 PRD v1.2.0 §7.1「AI 生成內容外框卡片」、核心目標 #10。
> 為每個嵌入筆記的 generated 元件套上統一外框，**不影響互動效果**。

## 關鍵設計：職責分離

既有 `content-visualize-skill` 規定「生成元件不要加外層包裝」。本任務**不**推翻該原則：

- generated 元件本體維持無外框（純內容、自包含）。
- 外框由獨立共用元件 `GeneratedFrame` 提供，於 mdx-writer 寫回時包住生成元件。
- 外框為純展示容器，`client:*` directive 仍掛在被包住的生成元件上，外框不攔截事件 → 互動 / 動畫不受影響。

## 實作步驟

### 1. 新增 `GeneratedFrame` 元件

新增 `src/components/GeneratedFrame.astro`（系統元件，**不**放在 `src/components/generated/`，不被 AI 覆寫）：

- Props：
  - `id: string` — 對應標記 id（顯示來源檔名）
  - `type: string` — 標記 type，推導左上角類型標籤
  - `caption?: string` — 選用底部說明
- 結構（參考附件二與 `src/content/notes/rate-limiting-token-bucket.mdx` 的 TokenBucket 外框）：
  - header：左上 `type` 標籤（Badge 樣式，如「動畫 · MOTION」）、右上 `generated/{id}.tsx`（mono、淡色）
  - body：`<slot />` 原樣渲染生成元件（避免額外 padding 破壞元件佈局）
  - footer：`caption` 存在時以 figcaption 呈現，否則不渲染
- 樣式：`trendlink-design` token — `--radius-lg`、`--neutral-200/300` 邊框、`--shadow-xs`、type 標籤色用 `--blue-*` / Badge；**不硬編碼色碼**。
- 類型標籤映射建議：`motion→動畫`、`chart→圖表`、`diagram→示意圖`、`timeline→時間軸`、`table→表格`、`free→視覺化`。

> 注意：與既有 `src/components/AiMarkerCard.astro`（dev-only、顯示 prompt/status 的編輯用 metadata 卡）是**不同元件**，兩者並存。

### 2. 調整 `content-visualize-skill`（SKILL.md）

檔案：`.claude/skills/content-visualize/SKILL.md`

- 「3. 生成元件」：保留「元件本體不加頁面層級標題 / 外層包裝」，新增一句：外框由系統 `GeneratedFrame` 統一提供，元件只需專注內容。
- 「5. 寫回 MDX」：寫回範本由

  ```mdx
  import <PascalCaseId> from '@/components/generated/<id>'

  <<PascalCaseId> client:visible />
  ```

  改為：

  ```mdx
  import GeneratedFrame from '@/components/GeneratedFrame.astro'
  import <PascalCaseId> from '@/components/generated/<id>'

  <GeneratedFrame id="<id>" type="<type>" caption="<選用>">
    <<PascalCaseId> client:visible />
  </GeneratedFrame>
  ```

  - 純靜態 SVG 仍省略 `client:visible`（directive 規則不變，只是改掛在被包住的元件上）。
  - 新增選用 `caption:` 標記欄位說明。

### 3. 調整 `mdx-writer`（Subagent）

檔案：`.claude/agents/mdx-writer.md`

- 「輸入」清單新增 `type`、`caption?` 欄位。
- 「工作流程」插入步驟改為插入 `GeneratedFrame` 包裹版 JSX：確保 `GeneratedFrame` import 存在（若無則一併插入，與生成元件 import 並列）。
- `failed` 時一樣只改 status、不插入外框 / 元件。

### 4. 調整 `component-generator`（Subagent）

檔案：`.claude/agents/component-generator.md`

- 「元件寫作守則」重申：元件本體不要加頁面層級標題或外層 layout / 卡片（外框由 `GeneratedFrame` 負責）。無功能性改動，僅澄清以免與外框重複包裝。

### 5. 解析 caption + 回填既有筆記

- `src/lib/notes.ts` 的 `parseMarkers` 可順帶解析 `caption` 欄位（型別 `AiMarker` 加選用 `caption?: string`）—— 供未來頁面 / 工具使用。
- 回填：將既有已生成筆記（如 `rate-limiting-token-bucket.mdx`、`http-latency` 所在筆記）的 `<Component client:visible />` 改為 `GeneratedFrame` 包裹版，驗證互動。

## 驗收（對應 PRD 驗收表）

- [x] 生成內容以 `GeneratedFrame` 呈現，左上類型 / 右上 `generated/<id>.tsx`
- [x] `TokenBucket` 等互動元件包外框後點擊 / 拖曳 / 動畫照常
- [x] 有 / 無 `caption` 分別顯示 / 隱藏底部說明
- [x] 樣式採 trendlink-design token，無硬編碼衝突色
- [x] SKILL.md / mdx-writer / component-generator 三檔同步更新
- [x] `npx tsc --noEmit` 與 `npx astro build` 通過

## 風險

- 外框**不可**自帶 `client:*`，否則可能改變 hydration 邊界。directive 留在生成元件上。
- `GeneratedFrame` 不可 import 任何 `generated/` 元件，避免耦合。
