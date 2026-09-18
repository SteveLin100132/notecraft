# Plugin System — 設計交付

Prototype：`NoteCraft.html`（既有 app，新增 `app/plugins.jsx`）
右下 Tweaks 面板 → **Plugin System** 區可切換所有提案與狀態。

---

## 交付的畫面

| 畫面 | 怎麼看 | 實作位置 |
| :-- | :-- | :-- |
| 資料檔檢視頁 `/view/<path>` | 側邊欄「資料」→ 點第一筆 | `DataFileView` |
| 資料檔清單頁 | 側邊欄「資料」 | `DataFilesList` |
| /notes 混排卡片（格狀＋清單） | 側邊欄「筆記」，右上切換卡片／清單 | `DataFileCard` |
| MDX 內嵌外框 | 筆記「資料庫索引原理：B-Tree」→「實際的表結構」 | `DataEmbedFrame` |
| 渲染錯誤卡 | Tweaks → 渲染器出錯 | `PluginErrorCard` |
| 側邊欄展開／收合 | 側邊欄右上角收合鈕，或 Tweaks → 側邊欄收合 | `Sidebar`（`app/app.jsx`） |
| dev-only 工具列有／無 | Tweaks → Dev 模式 | `DevBar` |

---

## 三個提案（＋理由）

**1. 側邊欄第六項：「資料 Data」＋ lucide `Database`**
使用者點進去看到的是內容（一份 schema、一份路線圖），不是外掛管理介面；「Plugins」講的是機制，未來真要做 plugin 安裝管理時那個名字才該留給它。`Database` 與既有 `FileText`（筆記）在 20px 下輪廓差異夠大，且不與 `layers`（系列）混淆。
替代案在 Tweaks 可切：檢視 Views／外掛 Plugins。

**2. 資料檔卡片：換 icon 方塊色系 ＋ 底列改放 mono 路徑**
既有筆記卡片的節奏是「左上 42×42 icon 方塊 → 標題 → 兩行摘要 → 底部一列」。資料檔卡片保留同一節奏，只換三處：
- icon 方塊 `--orange-50` 底 `--orange-600` 色 ＋ `Database`（藍＝筆記已佔用，橘是既有 token 的第二極）
- 右上徽章列只留「資料檔」膠囊 ＋ 時間（資料檔沒有閱讀進度、沒有 `@ai-visualize`）
- 底部標籤列位置改放 `--surface-sunken` 底的 mono 路徑列（`planning/schema.json` ＋ plugin id）。mono 是筆記卡片完全沒有的質地，掃視時最快的訊號。
替代案在 Tweaks 可切：plugin 膠囊／留白。

**3. MDX 內嵌外框：沿用 GeneratedFrame，只換標示**
外框結構、間距、圓角、陰影全部不動（同一個 `figure`）。改三處：膠囊由藍 `sparkle`「視覺化」改為橘 `database`「資料檔 · ER 關聯圖」；右側 mono 由 `generated/<id>.tsx` 改為真實資料檔路徑；dev-only 按鈕由「複製提示詞」改為「以 VS Code 編輯」（重新生成對資料檔不成立），並多一顆「開啟完整檢視頁」。放大檢視保留 —— 內嵌在 760px 版心裡的 ER 圖仍然需要它。
替代案在 Tweaks 可切：完全沿用 AI 標示／改標示＋橘色左邊條。

---

## 兩個開放題的答案

**版心怎麼跳脫 760px 而標題區不空曠**
這頁不套 1120 版心 —— **點進資料檔就是滿版畫面**：內容區不加 `.nc-page-wrap`、不加 34/40/80 padding，渲染器從側邊欄邊緣一路鋪到視窗右緣（ER 渲染器自己帶橫向捲動與「展開全寬」，外層再框一次是重複功能）。
標題區因此不做大版頁首，改成一條 sticky 頁首列（約 100px 高）：
- 第一列：返回鈕 → 34×34 橘色 Database 方塊 → 標題（`--text-md`/700）＋ `DATA FILE` 標記 → 單行描述；右端是「回到來源筆記」與 dev-only「以 VS Code 編輯」。
- 第二列：mono 原始檔路徑、plugin 膠囊、更新時間，右端 dev-only 顯示路由。
把頁面獨有資訊壓成一條資訊帶，既不空曠，也不會與標題爭注意力；捲動時它留在頂端，圖再長也知道自己在看哪一份檔。
Tweaks 可切「1120 置中」對照。

**「這是資料檔、不是筆記」怎麼說**
四個一致的訊號，全部只用既有 token：
1. 橘系 `Database` 方塊（筆記一律藍系 `FileText`）
2. eyebrow `DATA FILE` ＋ 一行「由 plugin 渲染 · ER 關聯圖」
3. mono 字體承載所有路徑與 plugin id（筆記頁沒有 mono 中繼資訊）
4. 頁首右欄那塊來源資訊面板本身 —— 筆記頁該位置是標籤與閱讀進度

不做的事：不換頁面底色、不加外框卡片（`GeneratedFrame` 在全寬頁上是重複功能）、不動側邊欄既有五項。

---

## 其他決定

- **清單頁篩選**：做，但只在裝了 2 個以上 plugin 時出現；`plugins.length <= 1` 時整條 filter row 不存在（Tweaks 的「已裝 plugin 數」可切 1 / 3 驗證）。
- **混排排序**：資料檔用檔案 mtime，與筆記的 `updatedAt` 同軸排序；套用標籤篩選時資料檔退出列表（它們沒有 tags）。
- **錯誤卡**：`--danger-300` 邊框 ＋ `--danger-50` icon 底，標題「這份資料沒有畫出來」，正文明說「你的筆記與這份資料檔都沒有壞」，下方 sunken 區列出 plugin id、資料檔路徑、錯誤訊息；dev 模式多兩顆按鈕。頁面其他區塊不受影響。
- **硬約束**：無新色碼／字級／間距／圓角／陰影；icon 全部畫在既有 `app/icons.jsx` 的 lucide 風格集合裡（新增 `database` / `fileJson` / `plug` / `alert` / `panelLeft`）；無 emoji；動畫沿用 `--duration-normal` ＋ `--ease-out`，`prefers-reduced-motion` 由既有全域規則關閉。

## 檔案

```
app/plugins.jsx     新畫面與元件（唯一新檔）
app/icons.jsx       + database / fileJson / plug / alert / panelLeft
app/app.jsx         側邊欄第六項、收合狀態、/view 與清單路由、Plugin System tweaks
app/views.jsx       /notes 混排資料檔卡片
app/noteview.jsx    新 block 型別 dataembed
app/data.jsx        在 B-Tree 筆記裡放一個內嵌示例
app/vizzoom.jsx     放大檢視標題列支援自訂 codeLabel / icon
assets/er-diagram.png、assets/er-schema.sample.json
```

---

## 追加：系列的一章可以是資料檔頁

一章的識別碼從「筆記 slug」放寬成 slug 或 `view:<id>`（`SERIES.slugs` 混放兩種），`seriesEntry(ref)` 把兩者解成同一種 entry（kind / title / description / note | file）。進度機制完全不動 —— 開頁轉「閱讀中」、手動按「已完成」，資料檔一律可追蹤並計入分母，所以三個進度顯示位置（系列卡進度條、詳情頁整體進度、章節狀態點）的畫法一個字都沒改。

**提案：資料檔那一列怎麼被認出來又不像次等附件**（Tweaks → 系列章節裡的資料檔）
定案是「徽章＋路徑」：那一列的序號方塊、狀態徽章、點擊面積、字級與筆記**完全相同** —— 它有序號，就是正式的一章。型別差異只由兩個新增元素承載：標題後一枚橘色 `Database`「資料檔」徽章，以及筆記那一格原本放 `@ai-visualize` 計數的位置改放 mono 原始檔路徑。換句話說，差異表現在「多了一種資訊」，不是「少了什麼」或「縮小什麼」。
替代案可切：序號改成橘色 Database 圖示（型別更明顯，但失去序號＝失去同儕感）／整列淡橘底（最醒目，但看起來像被標註的例外）。

**筆記頁底部的系列導覽**：章節縮覽混入資料檔項目（同一組狀態圖示、同一個序號欄）；上一章／下一章卡片在方向標那行補「· 資料檔」與橘色 `Database`，標題處理不變，卡片下緣多一行 mono 路徑 —— 讓人知道點下去會看到圖而不是文章。

**資料檔頁自己的系列導覽**：`/view/<path>` 屬於某系列時，頁首右側多一條「<系列名> 第 N 章」連結，頁尾接「標記為已完成」提示與同一組系列導覽，**包在 `max-width:1120px` 的一般版心裡**（`padding:0 40px 72px`），不跟著渲染區出血；此時渲染區的 `min-height` 收掉，避免圖與導覽之間出現一整屏空白。
