# design_brief_plugin_system

給 **Claude Design** 的設計委託包 —— NoteCraft Plugin System 的 prototype。

與 `design_handoff_canvas_viewport/` 方向相反：那份是「設計 → 程式碼」的交付，
這份是「規格 → 設計」的委託。

## 檔案

| 檔案 | 給誰 | 說明 |
| :-- | :-- | :-- |
| `PROMPT.md` | 你 | 兩段可整段貼上的提示詞（A 主畫面 / B 周邊），外加一句話版 |
| `BRIEF.md` | Claude Design | 設計簡報：畫面清單、每個畫面的必備元素、硬約束、要它提案的開放題 |
| `context-ui.md` | Claude Design | 既有 UI 的實際規格（版型尺寸、側邊欄、卡片結構、GeneratedFrame、完整 token 清單） |
| `sample-data/er-schema.sample.json` | Claude Design | 資料檔的真實形狀（5 張表的縮小版，中文內容） |

## 還要手動附上的

- **ER 圖截圖** —— plugin 渲染出來的內容本體。這張圖已經實作完成，Claude Design 要設計的是
  包住它的外框與導覽，不是重畫它。
- `docs/screenshots/dashboard.png`、`note-detail.png`、`series.png` —— 既有畫面參考（repo 內已有）

## 流程建議

1. 先跑 PROMPT.md 的 **A**（`/view/<path>` 檢視頁）。這頁的版心規則是整個功能的視覺主軸，
   定不下來後面都會歪。
2. A 定稿後再跑 **B**（側邊欄、清單頁、列表卡片、內嵌外框、錯誤狀態）。
3. 設計定稿後，比照 `design_handoff_canvas_viewport/` 的形式產出給 Claude Code 的實作交付包。

## 上游規格

[docs/notecraft-plugin-system.md](../../notecraft-plugin-system.md) v0.2.0（23 項決策已定案）。
設計若與規格衝突，回頭改規格 —— 規格還沒開始實作。
