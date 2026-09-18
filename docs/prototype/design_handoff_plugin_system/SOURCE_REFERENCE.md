# 原始碼參考（prototype 取出）

這些是原型裡實際跑的程式，供對照用 —— 不是要直接搬進 Astro 專案（原型是 React UMD + 手寫 style object，專案是 Astro + Tailwind）。

| 檔案 | 內容 |
| :-- | :-- |
| `src_plugins.jsx` | Plugin System 的全部新畫面：`DataFileView` / `DataFilesList` / `DataFileCard` / `DataEmbedFrame` / `PluginErrorCard` / `DataDonePrompt` |
| `src_series.jsx` | 系列詳情頁的章節列（entry 化後的 `ChapterRow`） |
| `src_noteview_series_nav.jsx` | 筆記頁底部系列導覽（entry 化後的 `SeriesNav` / `SeriesNavCard`） |
| `src_data_series.jsx` | `seriesEntry` / `seriesOf` / `seriesProgress` 的實作 |
| `prototype.html` | 可離線開啟的完整原型（單檔） |

原型入口：專案根目錄 `NoteCraft.html`（右下 Tweaks → Plugin System 可切換所有提案與狀態）。
