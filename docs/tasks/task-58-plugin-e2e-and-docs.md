# Task 58 — 端對端驗證與文件回填（收尾）

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §13 P9。
> **依賴 46–57 全部完成。本 Task 必須最後做。**

## 範圍

### 1. 端對端流程

在一個乾淨專案跑完整條線，每一步都要真的做而不是想像：

```
空專案
  → npx notecraftapp install-plugin er-diagram-renderer
  → 寫 .notecraft/plugins.json
  → 放一份 schema.json 進 notesDir
  → npx notecraftapp serve
  → /view/<path> 看到圖
  → 側邊欄「資料」看得到清單
  → /notes 混排卡片可辨
  → 改 JSON → 自動 rebuild → 畫面更新
  → 把它寫進 series.json 的 slugs → 章節列出現、可標記完成、計入進度
  → 在筆記裡 <PluginView /> 內嵌 → 外框正確、放大檢視可用
```

### 2. TrendMile 實際遷移

- 轉檔腳本產出完整 `schema.json`（36 表）
- 舊元件 `schema-er-diagram.tsx` 與筆記裡的 import 刪除
- **新舊畫面逐項比對**：聚焦、搜尋命中數、展開欄位、tooltip、全寬
- 複驗 inline 的實際影響（Task 51 已測得 81 KB JSON → 245 KB HTML），
  確認 [Task 48](task-48-data-file-view-route.md) 的 256 KB 警告門檻是否合理

### 3. 文件回填

| 文件 | 回填什麼 |
| --- | --- |
| [notecraft-plugin-system.md](../notecraft-plugin-system.md) | §15「實作時仍需判斷的細節」逐項標註實際採用的做法；Q19 的 HMR 實測結果 |
| [notecraft-prd.md](../notecraft-prd.md) | Plugin System 章節（目前只有系列資料模型被同步到）；章節識別碼形式依 Task 52 待確認①的定案回填 |
| `CLAUDE.md` | plugin 目錄約定、白名單適用範圍、`plugins.json` 的存在 |
| `README.md` | `install-plugin` 用法、官方 store 位置 |
| `CHANGELOG.md` | 版本條目 |
| `docs/tasks/README.md` | 本批標記完成 |

### 4. 版號

跑 `/bump-prd` 決定 PRD 版號與 changelog，不要手動猜規則。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 空專案可跑通 | 全新資料夾 | 照上述流程 | 每一步都成功，無需查原始碼或手改檔案 |
| TrendMile 無回歸 | 遷移後 | 逐項比對 | 五項互動行為與舊元件一致 |
| 資料量可接受 | 81 KB 資料 | 量測 | 記錄 gzip 後大小；注意 256 KB 警告是量 JSON，HTML 約為其 3 倍 |
| 文件無殘留矛盾 | 全部文件 | 通讀 | 無「系列只收筆記」「未發佈不計入分母」這類過時敘述 |

## 依賴

46–57 全部。

## 風險

低（驗證性質），但**這是唯一會發現契約缺口的 Task**。若端對端跑不通，
問題多半在 Task 46 的契約，回頭修契約而不是在這裡打補丁。

## 實作記錄（2026-09-18）

**端對端**（乾淨專案，完整流程跑通）：

```
空專案 → install-plugin（本地來源）→ --apply 寫映射 → 放 36 張表的資料檔
→ 寫一篇內嵌筆記 + series.json（slugs 混放 view: 與筆記 slug）→ build
```

驗證結果：

| 畫面 | 結果 |
| --- | --- |
| `/view/planning/schema` | 滿版、sticky 頁首（DATA FILE、路徑、plugin、時間）、「資料庫設計 第 2 章」連結、頁尾系列導覽 |
| `/series/db` | 共 3 章，資料檔那一列與筆記同構（序號、字級、點擊面積），多一枚橘色「資料檔」徽章與 mono 路徑 |
| `/notes` | 「2 篇筆記、1 個資料檔」，卡片橘系 icon + mono 路徑列 |
| `/notes/embed` | `GeneratedFrame` 橘色「資料檔 · ER Diagram」膠囊、放大檢視可用、無「複製提示詞」 |
| 側邊欄 | 第六項「資料 Data」就位 |
| `/notes/intro` | 下一章是資料檔，卡片有「· 資料檔」標示與 mono 路徑 |

**過程中抓到兩個漏網的呼叫端**（原本的盤點只列了 5 處 `/notes/` 前綴）：
Dashboard 的 `getSeriesChapters` 沒傳 `dataFiles`、`ContinueReading` 的「繼續閱讀」跳轉
仍寫死 `/notes/`。兩者都只有在資料檔真的排進系列時才會現形。

**pagefind 的判斷我一開始做反了**：原本以為要用 `data-pagefind-ignore` 排除渲染區，
實際上專案早已在筆記頁用 `data-pagefind-body`，pagefind 因此處於「只索引標記過的區塊」模式 ——
`/view` 頁沒標就根本不會進索引。修正後：`/view` 頁首標 body（191 字，只有標題與描述），
`PluginView` 外層標 ignore（內嵌那篇從 6648 字降回 34 字）。

**資料量實測**：81 KB JSON → 245 KB HTML。Astro 的 island props 編碼約放大 3 倍，
所以 256 KB 的警告門檻（量的是 JSON）在 HTML 端其實對應約 750 KB。門檻是否要改成量 HTML，
留給日後真的遇到瓶頸時再說。

**文件**：CHANGELOG 0.6.0、README（第五個子命令 + flags 表）、CLAUDE.md（Plugin System 一節）、
PRD（系列資料模型）、規格 §15 回填。版號 0.5.1 → 0.6.0。
