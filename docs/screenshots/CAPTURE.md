# Screenshot 捕捉指南

README.md 引用了下列 8 張截圖（v1.0.0 Workbench 版面），請在 publish 前放進本資料夾。

## 建議設定

- **視窗尺寸**：1440 × 900（桌面三欄常駐；1280 時筆記頁的右側目錄會收成上方的折疊面板）
- **顯示縮放**：100%
- **不要露出 `private/` 的筆記**：那個資料夾在 `.gitignore`，截圖卻會進 repo。拍之前先把它暫時移走，或用另一份示範資料夾
- **關掉 Astro dev toolbar**：`npx astro preferences disable devToolbar`（寫在 `.astro/settings.json`，已 gitignore），拍完再 `enable`
- **格式**：PNG，檔名對應下列清單

## 用 headless Chrome 一次拍完

dev server 開在 4329（或改成你的 port）：

```bash
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot(){ "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=10000 --screenshot="docs/screenshots/$1.png" "$2"; }
shot dashboard   "http://localhost:4329/"
shot notes-list  "http://localhost:4329/notes"
shot notes-board "http://localhost:4329/notes?view=board"
shot note-detail "http://localhost:4329/notes/<某篇有 tags、多段內文與 h2 的筆記>"
shot series      "http://localhost:4329/series"
shot plugins     "http://localhost:4329/plugins?tab=installed"
```

`--virtual-time-budget` 讓 island hydrate 完（相對時間、系列進度、Sidebar 高亮都靠 client）再拍。

需要互動的兩張（Drawer、新增筆記 Modal）放一個暫時的 `public/_shot.html`，用同源 iframe 載入頁面後
`dispatchEvent(new CustomEvent("nc-open-new-note"))` 或點第 N 列的 `.wb-row-main`，拍完把檔案刪掉。
點完記得 `document.activeElement.blur()`，否則關閉鈕會帶著 focus ring 入鏡。

## 8 張圖

| 檔名 | 頁面 | 重點 |
| --- | --- | --- |
| `dashboard.png` | `/` | widget grid：筆記總數、AI 生成率、近 8 週長條、最近更新、系列進度、標籤分布、待生成標記 |
| `notes-list.png` | `/notes` | List view 依資料夾分組、Toolbar 的分組與篩選 chip、列尾常駐的「開啟」箭頭 |
| `notes-drawer.png` | `/notes` 點一列 | 右側 480px Drawer：摘要、Metadata、標記、同系列章節 |
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

- 8 張 png 加起來約 1.8 MB，塞進去每個 npx 使用者都要下載
- npm README 頁面用絕對 GitHub raw URL 才會顯示；相對路徑到套件內部 npm 不會 render
- 所以截圖只需要放在 GitHub repo，不需要打包
