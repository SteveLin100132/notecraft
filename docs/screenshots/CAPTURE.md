# Screenshot 捕捉指南

README.md 引用了下列 10 張截圖（v1.7.0 Workbench 版面，含頁籤列），請在 publish 前放進本資料夾。最近一次重拍：2026-10-01。

## 建議設定

- **視窗尺寸**：1440 × 900（桌面三欄常駐；1280 時筆記頁的右側目錄會收成上方的折疊面板）
- **顯示縮放**：100%
- **不要露出 `private/` 的筆記**：那個資料夾在 `.gitignore`，截圖卻會進 repo。拍之前先把它暫時移走，或用另一份示範資料夾
- **關掉 Astro dev toolbar**：`npx astro preferences disable devToolbar`（寫在 `.astro/settings.json`，已 gitignore），拍完再 `enable`
- **格式**：PNG，檔名對應下列清單

## 拍法：同源輔助頁 + Chrome DevTools Protocol

頁籤、閱讀狀態都存在 localStorage，新的瀏覽器設定檔裡是空的（頁籤列會是空狀態、Board 全擠在「未開始」），
所以每張圖都經過一個暫時的同源輔助頁 `public/_shot.html`：

1. 讀 `/wb-index.json`，寫入固定的頁籤清單（`nc-tabs-v1:<workspaceLabel>`，五篇筆記＋一個資料檔、第一個固定）與一組閱讀狀態（`nc-reading-progress-v1`）
2. 用滿版 iframe 載入 `?to=` 指定的頁面
3. 依 `?act=` 做互動：`drawer`（點第 3 列的 `.wb-row-main`）、`modal`（dispatch `nc-open-new-note`）、`tabsall`（點 `.nt-all`）、`calback4`（月曆往前翻 4 個月）；最後 `document.activeElement.blur()`

拍照用 Node 22 腳本經 CDP 控制 headless Chrome（`--remote-debugging-port`、`Emulation.setDeviceMetricsOverride` 1440×900 @1x、
每張 `Page.navigate` 後等約 6.5 秒再 `Page.captureScreenshot`）。
**不要用 `chrome --headless --screenshot --virtual-time-budget`**：對著 `astro dev` 會卡住不回（HMR 的 WebSocket 讓虛擬時間停不下來）。

拍完刪掉 `public/_shot.html`。

## 10 張圖

| 檔名 | 頁面 | 重點 |
| --- | --- | --- |
| `dashboard.png` | `/` | 總覽兩列固定版面：KPI 環形圖、AI 待生成、寫作頻率堆疊長條、最近更新時間軸、系列、標籤馬賽克、更新日誌（v1.4.0） |
| `dashboard-calendar.png` | `/?tab=calendar` 往前翻到更新最多的月份 | 更新月曆的月檢視：色塊、圖例與週／月切換（v1.5.0）。當月更新太少時畫面會很空 |
| `notes-list.png` | `/notes` | List view 依資料夾分組、Toolbar 的分組與篩選 chip、列尾常駐的「開啟」箭頭 |
| `notes-drawer.png` | `/notes` 點一列 | 右側 480px Drawer：摘要、Metadata、標記、同系列章節 |
| `note-tabs.png` | `/notes/http-caching` 打開「全部頁籤」 | 頁籤列（固定、資料檔金色 icon）與全部頁籤下拉（v1.7.0） |
| `notes-board.png` | `/notes?view=board` | 三欄（未開始／閱讀中／已完成）；先在 localStorage 放幾個閱讀狀態畫面才不會全擠在第一欄 |
| `note-detail.png` | `/notes/<slug>` | 頁首接手標題與動作（簡報、收藏、⋯）、內文、右側黏性目錄 |
| `series.png` | `/series` | stat strip + 一列一個系列 |
| `plugins.png` | `/plugins?tab=installed` | 四格 stat strip、外掛列與 Switch、安裝 callout |
| `new-note-modal.png` | `/` 按「＋ 新增筆記」 | 表單；資料夾下拉顯示的是你當前 notes 資料夾的實際路徑 |

## 拍完後

1. `git add docs/screenshots/*.png`
2. push 到 GitHub
3. `npm pack --dry-run` 確認截圖**沒有**被打包進 npm tarball（`.npmignore` 已排除 `docs/`）

## 為什麼截圖不塞進 npm 套件

- 10 張 png 加起來約 2.5 MB，塞進去每個 npx 使用者都要下載
- npm README 頁面用絕對 GitHub raw URL 才會顯示；相對路徑到套件內部 npm 不會 render
- 所以截圖只需要放在 GitHub repo，不需要打包
