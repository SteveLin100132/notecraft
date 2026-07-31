# Deck 原子層擴充盤點：94 頁技術簡報的圖例歸納

> **狀態**：分析文件，未改任何程式碼。
> **目的**：盤點 `custom` 頁原子層（`src/components/deck/blocks/`）目前 6 個元件的覆蓋缺口，
> 作為後續擴充的依據。起因是作者指出「custom 版型庫缺少 Chart 的創作」。
> **前置**：結構層見 [deck-slide-contract.md](deck-slide-contract.md) v0.2 §5（原子層定義），
> 設計工藝與資料視覺化層見 [deck-design-audit.md](deck-design-audit.md)。本文不重複那兩層，
> 只處理「還缺哪些原子」。
> **驗證素材**：作者 2022–2024 年的 5 份技術主題分享簡報，共 **94 頁**，全部逐頁檢視：
>
> | 代號 | 簡報 | 頁數 |
> | --- | --- | --- |
> | `mfe` | 20220827 微前端（Webpack Federation） | 14 |
> | `dataint` | 20220918 Data Integration（Kafka / Data Hub / Loopback 4） | 42 |
> | `bullmq` | 20231109 BullMQ | 15 |
> | `nifi` | 20240111 NiFi Registry | 6 |
> | `tus` | 20240820 TUS | 17 |
>
> **與既有素材的差異**：[deck-slide-contract.md](deck-slide-contract.md) §10 的 17 頁驗證素材是
> **提案／月會型**簡報（trendlink-design 語言、量化資料多）。本批是**技術分享型**
> （程式碼多、量化資料為零），兩者互補 —— 本文的結論只在技術筆記轉簡報的場景成立，
> 不推翻既有 6 個原子的設計。

---

## 1. 結論摘要

### 1.1 Chart：確認缺，但規格不能從本批推導

`src/components/deck/blocks/` 現有 6 個元件（`Rows` / `Cards` / `Stages` / `Kpi` / `Table` /
`Compare`）**沒有任何量化圖表能力**，`<Kpi>` 只是大數字帶、不含視覺編碼。`recharts` 雖在
CLAUDE.md 白名單內，整個 deck 系統**沒有一處使用**。

但必須記錄一個對規格有影響的觀察：

> **這 94 頁裡「有軸的量化圖表」（bar / line / area / scatter）是 0 張。**

技術分享型簡報天生沒有量化資料。因此 `<Chart>` 的規格**不該從本批素材推導**，
應回去接 `dataviz` skill 與 [deck-design-audit.md](deck-design-audit.md) §3.2 的色彩結論。
本批素材真正在喊的缺口是**程式碼呈現**與**標註層**（見 §1.2）。

### 1.2 本批素材真正的缺口排序

| 排序 | 缺口 | 覆蓋頁數 | 既有原子 |
| --- | --- | --- | --- |
| 1 | **程式碼呈現**（行內註解 / 引線標註 / 逐步高亮 / 終端機） | **36 / 94** | 完全沒有 |
| 2 | **架構拓撲圖** | 18 / 94 | 完全沒有 |
| 3 | **標註層**（截圖 + 編號熱點 / 引線標籤） | 11 / 94 | 完全沒有 |
| 4 | 流程變體（里程碑軌 / 循環 / 扇出入） | 8 / 94 | `<Stages>` 只覆蓋線性 |
| 5 | 量化圖表 | **0 / 94** | 完全沒有 |

---

## 2. 圖例分類總表（× 既有原子對照）

分類代號在 §3 的逐頁證據表中引用。

### A. 程式碼類 — 36 / 94 頁，最大宗

| # | 圖例類型 | 主要出處 | 既有原子 | 判定 |
| --- | --- | --- | --- | --- |
| A1 | 行內註解碼塊（每行右側掛淡框中文註解） | dataint p6–p11 / p19–p23 / p34–p36 | — | **缺（最高優先）** |
| A2 | 引線標註碼塊（左側彩色標籤 + 虛線引到某段） | mfe p12/p13、dataint 全篇、tus p12 | — | **缺** |
| A3 | 逐步高亮碼塊（同一段 code 跨頁換高亮框、其餘淡化、帶行號） | tus p7–p10 | — | **缺** |
| A4 | 終端機／CLI 輸出卡（互動 prompt、彩色輸出） | mfe p8–p11、dataint p32 | — | **缺** |
| A5 | 安裝指令列（npm 徽章 + 單行指令） | dataint p5/p33、tus p6/p11 | — | **缺（小）** |
| A6 | 設定檔卡（File Name 標頭 + JSON） | dataint p34–p41、tus p15 | — | A1 的變體 |

### B. 架構 / 拓撲類 — 18 / 94 頁

| # | 圖例類型 | 主要出處 | 既有原子 | 判定 |
| --- | --- | --- | --- | --- |
| B1 | 節點-連線架構圖（盒 + 正交線 + 標籤箭頭） | mfe p4、bullmq p13、tus p15/p16、dataint p33 | — | **缺（拆基元，不做整圖）** |
| B2 | 巢狀分層平台圖 + 編號熱點對應底部說明卡 | dataint p15、nifi p4 | — | **缺** |
| B3 | 矩陣網格（列=層 × 欄=團隊，格內放 icon） | mfe p2 | `<Table>` 勉強 | 半缺 |
| B4 | 叢集／複本拓撲（Broker × Partition、Leader、複製箭頭） | dataint p4 | — | B1 特例 |
| B5 | UML 類別／介面分層對照（三欄 class box + 繼承虛線） | dataint p12 | `<Table>` 可代 | 不做 |
| B6 | 扇出／扇入（split → N 條 → merge） | tus p4、mfe p6 | — | **缺** |
| B7 | 重複主視覺場景 + 狀態疊加 | bullmq p6–p11 | — | **敘事手法，不是原子**（見 §4.4） |

### C. 流程 / 步驟類

| # | 圖例類型 | 主要出處 | 既有原子 | 判定 |
| --- | --- | --- | --- | --- |
| C1 | 線性步驟鏈（箭頭串接） | mfe p3、tus p4 底部 | **`<Stages>`** | ✅ 已涵蓋 |
| C2 | 里程碑軌（icon + 節點圓點 + 上下交錯說明） | bullmq p2、dataint p16 | `<Stages>` 不夠 | **缺（做成變體）** |
| C3 | 循環流程（環形 N 步 + 中心標題 + 環繞說明） | nifi p2 | — | **缺（做成變體）** |
| C4 | 蛇形 roadmap（分組大括號 + 圖例） | dataint p3/p14/p30 | `cover.agenda` 部分 | 缺，**不建議做** |
| C5 | 環形步驟指示器（6 icon 沿圓周、當前高亮，跨 5 頁） | dataint p37–p41 | — | **屬 SlideChrome 層**（§4.5） |
| C6 | 弧形編號議程（01/02/03，當前項高亮，跨 3 頁） | dataint p2/p13/p29 | `cover.agenda` 部分 | 同 C5 |

### D. 資料視覺化類 — 4 / 94 頁

| # | 圖例類型 | 主要出處 | 既有原子 | 判定 |
| --- | --- | --- | --- | --- |
| D1 | 比例分解（5% / 80% / 15% + logo + 說明） | bullmq p3 | `<Kpi>` 只有數字 | **半缺** |
| D2 | 進度條列（多條 bar + 百分比 + 狀態圓點） | tus p4、bullmq p8 | — | **缺** |
| D3 | 有軸圖表（bar / line / area / donut） | **0 頁** | — | **缺，本批無實證** |

### E. UI / 產品類 — 11 / 94 頁

| # | 圖例類型 | 主要出處 | 既有原子 | 判定 |
| --- | --- | --- | --- | --- |
| E1 | 標註截圖（截圖 + 編號熱點 / 引線標籤 / 高亮框） | dataint p25–p28、bullmq p12、nifi p5、tus p13/p14 | — | **缺（高優先）** |
| E2 | 瀏覽器／視窗擬真框 | mfe p4/p8–p11、tus p2/p13 | — | **缺（便宜）** |
| E3 | UI 線框稿（header/content/footer 灰塊） | mfe p8–p11 | — | E2 的內容物 |
| E4 | 模擬對話框／狀態卡（上傳中、錯誤紅框） | tus p2 | — | E2 變體 |

### F. 文字修辭類

| # | 圖例類型 | 主要出處 | 既有原子 | 判定 |
| --- | --- | --- | --- | --- |
| F1 | 文字雲（字級承載權重） | bullmq p4、tus p3 | — | **缺** |
| F2 | 標籤-定義列表（彩色 chip + 右側說明） | nifi p3、tus p5、bullmq p5 | `<Rows>` 接近 | 補 chip 變體 |
| F3 | 編號選項卡 A/B/C/D + 優缺點 + **選中角標** | mfe p5 | `<Cards>`+`<Compare>` | 缺「推薦角標」 |
| F4 | 行內螢光筆標記 | **全 5 份大量使用** | — | **缺（極便宜）** |
| F5 | Logo 堆疊組合（A + B 技術選型） | nifi p3、tus p5、bullmq p5 | — | 缺（小） |
| F6 | 資源連結卡（icon + 描述 + 按鈕） | bullmq p14 | `<Cards>` | ✅ |
| F7 | icon 特性三卡 | mfe p7、dataint p31 | `<Cards>` | ✅ |

---

## 3. 逐頁證據

代號對應 §2。封面／結尾頁不列類型（已由 `cover` / `closing` 版型覆蓋）。

### 3.1 mfe — 微前端（14 頁）

| 頁 | 內容 | 類型 |
| --- | --- | --- |
| 1 | 封面：插畫 + 大標 + 色帶 | — |
| 2 | Micro Frontend 定義 + 4 團隊 × 3 層 icon 矩陣 | B3 |
| 3 | Module V.S. 微前端：左右對比 + 各自 V1.0/V1.1 步驟鏈 | C1 + `<Compare>` |
| 4 | 微前端工作原理：K8s 節點盒 + JS bootstrap + 中央瀏覽器框 + 連線 | B1 + E2 |
| 5 | Q1 四個實作方案 A/B/C/D 卡（優缺點，D 有選中角標） | F3 |
| 6 | Webpack 打包：多副檔名 → 立方體 → 多輸出 | B6 |
| 7 | Webpack Federation 定義 + 三個漸層 icon 特性卡 | F7 |
| 8–11 | Getting Start：瀏覽器線框 + 三欄 CLI 互動輸出（每頁換 port） | A4 + E3 |
| 12 | Host Webpack Configuration：程式碼 + 左右雙側引線標註 | A2 |
| 13 | Remote Webpack Configuration：同上 | A2 |
| 14 | 結尾頁 | — |

### 3.2 dataint — Data Integration（42 頁）

| 頁 | 內容 | 類型 |
| --- | --- | --- |
| 1 | 封面：地球 + 衛星 | — |
| 2 | 弧形編號議程 01/02/03（01 高亮） | C6 |
| 3 | Course Roadmap 蛇形 + 分組大括號 + 圖例 | C4 |
| 4 | Kafka 介紹 + Broker × Topic 分區複本拓撲（Leader 標記） | B4 |
| 5 | Install Kafka Package：npm 徽章 + 指令 ×2 | A5 |
| 6–8 | Kafka Consumer（基礎 / JSON / Confluent Avro）：碼塊 + 行內註解 + 左側引線標籤 | A1 + A2 |
| 9–11 | Kafka Producer（基礎 / JSON / Avro）：同上 | A1 + A2 |
| 12 | Streaming Job Design：三欄 class / 介面分層 + 繼承虛線 | B5 |
| 13 | 弧形編號議程（02 高亮） | C6 |
| 14 | Course Roadmap 蛇形（第二章） | C4 |
| 15 | Data Pipeline 巢狀分層平台圖 + A–E 編號熱點 + 底部說明卡 | B2 |
| 16 | Step 1–6 上下交錯里程碑軌 | C2 |
| 17 | Step 1 查詢申請：icon 卡 ×2 + 箭頭 + 核准信截圖 | E1 |
| 18 | Step 2 定義表格：兩張產品截圖 + 說明 | E1 |
| 19–23 | Step 3–5：JSON / Python 碼塊 + 引線標籤 + 行內註解 | A1 + A2 + A6 |
| 24 | Step 6 上傳至 MinIO：icon 卡 + 手勢箭頭 + 截圖 | E1 |
| 25–28 | Airflow DAG Operation：產品截圖 + 綠色引線標籤 + 過場箭頭 | E1 |
| 29 | 弧形編號議程（03 高亮） | C6 |
| 30 | Course Roadmap 蛇形（第三章） | C4 |
| 31 | Loopback 4 介紹：三張線描插畫特性卡 | F7 |
| 32 | Create Loopback 4 Project：npm 徽章 + CLI 互動輸出 | A4 + A5 |
| 33 | Loopback Application 架構圖 + 底部四步驟 npm 指令 | B1 + A5 |
| 34–36 | Data Source Configuration（MariaDB / Postgres / REST）：JSON + 行內註解 + 引線 | A1 + A6 |
| 37–41 | Implements RESTful API Service：**環形步驟指示器**（6 icon、逐頁換高亮）+ File Name + 碼塊 | C5 + A6 |
| 42 | END 結尾頁 | — |

### 3.3 bullmq — BullMQ（15 頁）

| 頁 | 內容 | 類型 |
| --- | --- | --- |
| 1 | 封面 | — |
| 2 | ETL 五階段里程碑軌（icon + 圓點 + 水平線 + 說明） | C2 |
| 3 | 5% / 80% / 15% 比例分解 + 工具 logo + 引言 | D1 |
| 4 | 痛點文字雲 | F1 |
| 5 | BullMQ 是什麼：三個標籤-定義列 + logo 組合 + 注意事項 callout | F2 + F5 |
| 6 | BullMQ 核心：3D queue 場景圖 + Redis 交換 | B7 |
| 7 | 邏輯處理：同場景 + 前後資料標註 | B7 |
| 8 | 進度追蹤：同場景 + 各 Job 進度條疊加 | B7 + D2 |
| 9 | 日誌記錄：同場景 + 時間戳標註 | B7 |
| 10 | 狀態記錄 & 重試：同場景 ×2（成功 / 失敗）+ backoff 弧線箭頭序列 | B7 |
| 11 | 佇列暫停 & 啟用：同場景 + 斷裂符號 | B7 |
| 12 | BullMQ Dashboard：產品截圖 + 六個引線標籤（左右各三） | E1 |
| 13 | BullMQ + Prometheus + Opsgenie 整合架構圖（分組盒 + 標籤箭頭） | B1 |
| 14 | Reference 四張連結卡（icon + 描述 + 按鈕） | F6 |
| 15 | 結尾頁 | — |

### 3.4 nifi — NiFi Registry（6 頁）

| 頁 | 內容 | 類型 |
| --- | --- | --- |
| 1 | 封面 | — |
| 2 | NiFi Flow 開發流程：環形 6 步循環 + 中心標題 + 環繞說明 | C3 |
| 3 | 痛點標籤列 + 解法標籤列 + 右側 logo 堆疊組合 | F2 + F5 |
| 4 | Registry 生命週期：巢狀 bucket/version 架構 + Commit/Deploy 巨型箭頭 → 三環境 | B2 |
| 5 | NiFi Registry 設定：產品截圖 + 編號熱點 ①② + 引線 | E1 |
| 6 | 結尾頁 | — |

### 3.5 tus — TUS（17 頁）

| 頁 | 內容 | 類型 |
| --- | --- | --- |
| 1 | 封面 | — |
| 2 | 情境設想：上傳中對話框擬真 + 錯誤紅框 + 梗圖 | E4 |
| 3 | 問題文字雲 | F1 |
| 4 | 大檔案上傳機制：fan-out / fan-in + 多條進度條 + 狀態圓點 + 底部 5 步驟卡 | B6 + D2 + C1 |
| 5 | 困難點標籤列 + 右側 logo 組合（tus + Uppy） | F2 + F5 |
| 6 | Node.js 使用 TUS：編號步驟 + 版本徽章 + npm 安裝指令卡 | A5 |
| 7–10 | TUS Server 實作：**同一段程式碼跨 4 頁逐步高亮**（①②→③→④⑤⑥→⑦⑧⑨），未聚焦區淡化 | A3 |
| 11 | Angular + Uppy：編號步驟 + 版本徽章 + 安裝指令卡 | A5 |
| 12 | Angular 實作：三個檔案碼塊 + 編號標記 | A1 + A3 |
| 13 | 續傳 DEMO：兩個視窗截圖 + 引線標籤 | E1 + E2 |
| 14 | MinIO DEMO：同上 | E1 + E2 |
| 15 | File Metadata：Client→Uppy→TUS→儲存 流程圖 + 編號 + JSON 卡 | B1 + A6 |
| 16 | TUS + Uppy + MinIO 總架構圖（四層分組盒 + 標籤箭頭） | B1 |
| 17 | 結尾頁 | — |

---

## 4. 可行性建議

### 4.1 Tier 1 — 先做這四個，投報率最高

| 原子 | 吃掉的類型 | 規模估計 | 主要風險 |
| --- | --- | --- | --- |
| **`<Code>`** | A1–A3、A6 | ~250 行 | 低 —— v1 不上色（§5-2 已決議），不引新套件 |
| **`<Chart>`** | D1–D3 | ~200 行 | recharts 在 `transform: scale` 下的量測 |
| **`<Annotate>`** | A2、B2、E1 | ~150 行 | 引線路徑與標籤避讓 |
| **`<Terminal>` + `<Frame>`** | A4、A5、E2–E4 | 各 ~60 行 | 幾乎無 |

**`<Code>` 的切法**（§5-2 已決議）—— v1 **不做語法上色**，只做：行號、高亮行區間、
未聚焦淡化、行尾註解欄、檔名標頭。這已拿到那 36 頁 **90% 的價值**，且完全不引新套件。
A3 的「跨頁逐步高亮」天然支援：同一份 `lines` 資料 + 不同 `highlight` 區間即可。

**`<Chart>` 的實作重點**：

- **系列數上限 3**（§5-1 已決議）—— 超過改用 small multiples 或直接標值，
  沿用既有 `SeriesTone`（blue / orange / muted），不擴充色票。
- **不要用 `ResponsiveContainer`** —— 縮覽頁 `display: none` 時量到 0 寬、圖會消失。
  固定 `width` / `height`，尺寸從 `CustomSlideProps.area` 算。
- `isAnimationActive={live}` —— 否則側欄十幾頁 chart 同時動會拖垮整頁
  （同 [deck-slide-contract.md](deck-slide-contract.md) §6 的 `live` 機制）。
- **投影片沒有 hover，禁用 tooltip，數值直接標在圖元上。**
- D2「進度條列」併入為 `variant="bars"`，不另開元件。
- `tabular-nums` 依 audit B-3 由元件內部負責。

**`<Annotate>` 的價值** —— 它是一個**通用標註層**（`children` 放任何東西 +
`pins` / `leaders` 陣列），一次吃掉「標註截圖」「引線標註碼塊」「巢狀架構圖的編號熱點」
三種需求。設計含量高（引線路徑、圓形編號徽章、避讓），完全符合契約 §5.3
「有沒有承載設計決策」的取捨標準。

### 4.2 Tier 2 — 便宜、順手做

| 原子 | 吃掉的類型 | 說明 |
| --- | --- | --- |
| **`<Mark>`** | F4 | 行內螢光筆。一個 `<span>`，但要在 `theme.ts` 補暗色底。全篇最常出現、也最容易被硬編色碼，早做能防退化 |
| **`<Stages variant>`** | C2、C3 | `"rail"`（里程碑軌）／`"cycle"`（環形）擴充既有元件，不新增檔案 |
| **`<TagCloud>`** | F1 | **純 flex + 字級權重，不做碰撞佈局**（不引 `d3-cloud`）。效果與 bullmq p4 差距很小，成本是十分之一 |
| `<Cards>` 補 `recommended` 角標 | F3 | mfe p5 的「選中方案」語意 |
| `<Rows>` 補 chip 變體 | F2 | 左側彩色標籤 + 右側說明 |
| `<LogoRow>` | F5 | A + B 技術選型組合（小） |

### 4.3 Tier 3 — 建議**不要**做成原子

| 項目 | 理由 |
| --- | --- |
| **B1 完整「架構圖」元件** | 18 頁架構圖**每張結構都不同**，包成通用元件等於自造迷你 mermaid，維護成本高、AI 還是會想跳脫。**改做基元**：`<Node>`（盒 + icon + 標籤）、`<Connector>`（正交／曲線 + 箭頭 + 標籤）、`<GroupBox>`（虛線分組框 + 標題），位置交給 `custom` 頁自己排 —— 這才是「原子」，符合 v0.2 §1.3「把設計決策下移一層」的精神 |
| **C4 蛇形 roadmap** | 佈局複雜、只用在 agenda，而 `cover.agenda` 已覆蓋該場景 |
| **B5 UML 類別圖** | `<Table>` 或 Node/GroupBox 基元組出來就夠 |
| **C5 / C6 環形／弧形進度指示器** | 見 §4.5 —— 這不是內容原子 |

### 4.4 B7「重複場景 + 狀態疊加」不是原子，是敘事手法

bullmq p6–p11 用**同一張 3D queue 場景圖連續 6 頁**，每頁只換高亮與疊加標註
（進度條、時間戳、重試序列、斷裂符號）。這是本批素材裡最有效的敘事裝置，
但它**不該做成原子** —— 場景圖本身是一次性的 `@ai-visualize` 元件。

正確的支援方式是**規則層**：在 `content-present` SKILL 的敘事切分原則中加一條 ——
「當多頁在講同一個系統的不同狀態時，優先重用同一個視覺元件並改變其 props，
不要每頁畫一張新圖」。對應到型別，就是 `full-visual` / `custom` 頁重複 import
同一個元件、傳不同 `state` prop。

### 4.5 C5 / C6 應該進 SlideChrome，不是原子層

dataint p37–p41 的環形步驟指示器、p2/p13/p29 的弧形編號議程，都是**跨頁導覽器**：
連用 3–5 頁、每頁只換高亮位置，語意等同 `SlideChromeFields` 的 `num` / `eyebrow`。

放進原子層會讓每頁自己畫，正是契約 §4 要防的「8 頁自由發揮變成 8 份不同的簡報」。
**建議改為 `SlideChrome` 增加選配 `progress` 欄位**（章節內第幾步 / 共幾步），
由系統統一渲染。

---

## 5. 已決議事項（2026-07-31，作者裁定）

| # | 議題 | 決議 | 理由 | 落在 |
| --- | --- | --- | --- | --- |
| 1 | `SeriesTone` 只有 3 色，chart 常有 5+ 系列 | **硬規定 ≤ 3 系列**，超過改用 small multiples 或直接把數值標在圖元上；**不擴充色票** | 投影片沒有 hover、也沒有時間慢慢對照圖例，多系列本來就讀不出來。這條同時解決「無 tooltip」的問題，且不動 [deck-design-audit.md](deck-design-audit.md) §3.2 已驗證過的色彩結論。代價是遇到真的多系列資料時要拆頁 | §4.1、§5.1 |
| 2 | `shiki` 是否入白名單 | **v1 不引、不上色** | 那 36 頁程式碼承載資訊的是「哪幾行是重點」與「這行在做什麼」，不是關鍵字顏色。不引套件就沒有白名單、bundle 體積、SSR 相容性的問題，能最快驗證這個原子的真正價值。之後想上色隨時可加 | §4.1、§5.2 |
| 3 | 新原子的截圖迴歸機制 | **建 `atoms.deck.tsx` 樣板 deck**，每個原子一頁，新增原子就補一頁 | 零新增基礎設施 —— 複用契約 §7.2 已經是強制流程的 `/present/<slug>` 逐頁截圖路徑。而且這份 deck 本身就是給 AI 看的「原子用法範例」，一舉兩得 | §5.3、§6 |
| 4 | 各新原子的密度建議上限 | **隨各原子實作時定**，用實測結果寫進 SKILL | 既有 6 個 block 的上限是從 17 頁實證量出來的，不是拍腦袋定的。`<Code>` 幾行會爆、`<Chart>` 幾個系列會擠，只有實際渲染在 900px 高度裡才知道 | §5.4 |

### 5.1 決議 1 的落地細節

`<Chart>` 的 `series` 陣列型別上限為 3，超過時 **tsc 擋不住**（陣列長度不進型別），
故需在兩處補：

- **元件內部**：`series.length > 3` 時 `console.warn`（dev），並只渲染前 3 筆 —— 讓它明確失敗，
  而不是靜靜畫出一張讀不懂的圖。
- **SKILL 規則**：`present-planner` 規劃 chart 頁時，若資料超過 3 系列，
  規劃書要直接寫成「拆成 N 張 small multiples」或「改用 `<Table>` 標值」。

### 5.2 決議 2 的落地細節

`<Code>` v1 的 props 範圍（不含任何語法解析）：

| prop | 用途 | 對應圖例 |
| --- | --- | --- |
| `lines` | 每行的文字 + 選配的行尾註解 | A1 |
| `highlight` | 要框起來的行區間（可多段），其餘淡化 | A3 |
| `startLine` | 行號起算值（tus p7–p10 的 28 / 60 這種續接） | A3 |
| `fileName` | 檔名標頭 | A6 |
| `labels` | 左側彩色標籤 + 引到哪個行區間 | A2 |

> `labels` 與 `<Annotate>` 的引線能力有重疊。實作順序建議 **`<Code>` 先做、`<Annotate>` 後做**，
> 屆時若 `<Annotate>` 的引線夠通用，`<Code>` 的 `labels` 可以改為內部委派給它。

### 5.3 決議 3 的落地細節

`atoms.deck.tsx` 的落點與規則：

- 檔案：`src/components/generated/atoms.deck.tsx`（走既有 deck 路徑，不特例）。
- **每個原子至少一頁**，頁內同時放「典型用法」與「邊界狀態」（空資料、超長字串、達建議上限值）——
  §5-4 的密度上限就是從這一頁量出來的。
- 這份 deck **手寫維護、不由 `slide-generator` 生成**，因為它是驗證基準而非產物。
- 新增原子的 PR 必須同時補這一頁，否則截圖迴歸涵蓋不到。

### 5.4 決議 4 的落地細節

各原子實作完成時，量測並回填下列數字到 `content-present` SKILL 的密度基準表
（比照契約 §7.1 的 rows ≤ 6 / cards ≤ 6 / stages ≤ 5 / kpi ≤ 5 / table ≤ 6×6）：

| 原子 | 要量的上限 |
| --- | --- |
| `<Code>` | 最大行數（含註解欄時 / 不含時分開量） |
| `<Chart>` | 系列數（已定 3）、單系列資料點數 |
| `<Annotate>` | 同一張圖上的 pin / leader 數 |
| `<Terminal>` | 最大行數 |
| `<TagCloud>` | 標籤數 |
| `<Stages variant="rail" \| "cycle">` | 節點數（線性版現為 5） |

---

## 6. 落地時要同步改的檔案

| 檔案 | 改動 |
| --- | --- |
| `src/components/deck/blocks/` | 新增元件 + `index.ts` barrel 匯出 |
| `src/components/generated/atoms.deck.tsx` | **新增** —— 原子驗證基準 deck，手寫維護（§5.3） |
| `src/components/deck/theme.ts` / `src/styles/tokens.css` | `<Mark>` 的螢光筆底色、`<Code>` 的碼塊底色（明暗兩階） |
| `src/components/deck/SlideChrome.tsx` | §4.5 的 `progress` 欄位（若採納） |
| `src/lib/decks.ts` | `SlideChromeFields` 對應欄位；§5-1 若採 (a) 則 `SeriesTone` 要動 |
| `.claude/skills/content-present/SKILL.md` | 版型詞彙表補新原子；加 §4.4 的重複場景規則 |
| `.claude/agents/present-planner.md` | 規劃書的「版面構想」欄要能指名新原子 |
| `.claude/agents/slide-generator.md` | 新原子的用法與密度上限（注意 `<!-- BEGIN:validation-sg -->` 同步標記，兩套都要改） |
| `skill-template/` | 由 `scripts/sync-skill-template.mjs` 重新產生 |
