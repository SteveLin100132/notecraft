# Screenshot 捕捉指南

README.md 引用了下列 4 張截圖，請在 publish 前放進本資料夾。

## 建議設定

- **視窗尺寸**：1280 × 800（桌面標準）
- **顯示縮放**：100%
- **瀏覽器**：Chrome 或 Safari（去掉 devtools）
- **格式**：PNG，儲存路徑對應下列檔名

## 準備測試環境

啟動 CLI view 模式指向乾淨的示範資料夾：

```bash
node bin/notecraftapp.mjs view tmp/notecraft-test --port 4321
```

（或用你自己精心準備的 md/mdx 資料夾以便有真實內容）

## 4 張要拍的圖

### 1. `dashboard.png`
- URL：`http://localhost:4321/`
- 內容：儀表板首頁完整畫面
- 重點：KPI 卡（筆記總數 / 本週新增 / 本月新增 / AI 視覺化）、「最近更新」列表、右側「繼續閱讀」+「AI 視覺化進度」+ 標籤分布
- 建議先造 8–10 篇有意義的筆記，避免空空的畫面

### 2. `note-detail.png`
- URL：`http://localhost:4321/notes/<某篇有 tags 和多段內文的筆記>`
- 內容：筆記詳細頁，含側邊目錄、標籤 chip、「以 VS Code 編輯」/「刪除筆記」按鈕、內文 render
- 重點：展示閱讀體驗

### 3. `series.png`
- URL：`http://localhost:4321/series`
- 內容：系列總覽，展示外部 `.notecraft/series.json` 定義的系列卡片
- 重點：藍/橘 accent、章節數、進度條、「繼續閱讀」CTA
- 建議 tmp/notecraft-test/.notecraft/series.json 至少定義 2 個系列（範例本 repo 已附）

### 4. `new-note-modal.png`
- URL：`http://localhost:4321/`，然後點右上「+ 新增筆記」開啟 modal
- 內容：新增筆記表單，含標題、標籤選單、資料夾下拉、建立按鈕
- 重點：資料夾下拉顯示的是**你當前 notes 資料夾的實際路徑**（例 `tmp/notecraft-test/`），不是硬編碼的 `src/content/notes/`

## macOS 快速拍法

- `Cmd + Shift + 4`，拖範圍
- 儲存到 `docs/screenshots/<檔名>.png`
- 拍完可以用 [ImageOptim](https://imageoptim.com/mac) 壓一下體積

## 拍完後

1. `git add docs/screenshots/*.png`
2. push 到 GitHub
3. 確認 `package.json` 的 `repository` 欄位填上真實 GitHub URL（npm.js 會靠這個 rewrite 成 raw URL）
4. `npm pack --dry-run` 確認截圖 **沒有** 被打包進 npm tarball（`.npmignore` 已排除 `docs/`）

## 為什麼截圖不塞進 npm 套件

- 4 張 png 加起來可能 1–2 MB，塞進去每個 npx 使用者都要下載
- npm README 頁面用絕對 GitHub raw URL 才會顯示；相對路徑到套件內部 npm 不會 render
- 所以截圖只需要放在 GitHub repo，不需要打包
