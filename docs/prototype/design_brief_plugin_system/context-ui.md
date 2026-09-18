# 既有 UI 規格 — 設計新畫面時要對齊的東西

全部取自 codebase 實際值，不是憑印象寫的。

---

## 1. 版型骨架

```
┌──────────┬──────────────────────────────────────────┐
│          │  內容區 padding: 34px 40px 80px          │
│ 側邊欄   │  ┌────────────────────────────────────┐  │
│ （可收合）│  │ .nc-page-wrap  max-width: 1120px   │  │
│          │  │ margin: 0 auto                      │  │
│          │  │                                     │  │
│          │  │  筆記內文另有 .nc-prose 760px 上限  │  │
│          │  └────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

| 值 | 說明 |
| :-- | :-- |
| 頁面外框 `max-width` | **1120px**，置中 |
| 內容區 padding | `34px 40px 80px` |
| 筆記內文版心 | **760px**（`.nc-prose`）—— 為長文閱讀設計 |
| 頁面背景 | `--surface-page`（`#f6f8fb`） |
| 卡片背景 | `--surface-card`（`#ffffff`） |

> **設計新的 `/view/<path>` 時要處理的就是這裡**：ER 圖是五欄橫向佈局，
> 760px 甚至 1120px 都塞不下。這頁需要一套自己的版心規則。

## 2. 側邊欄

既有五項（每項都是「中文 + 英文」雙語形式）：

| id | 中文 | 英文 | icon 概念 | href |
| :-- | :-- | :-- | :-- | :-- |
| dashboard | 總覽 | Dashboard | dashboard | `/` |
| notes | 筆記 | Notes | notes | `/notes` |
| series | 系列 | Series | layers | `/series` |
| tags | 標籤 | Tags | tag | `/tags` |
| about | 關於 | About | about | `/about` |

- 項目結構：`icon` + 中文 label（`flex:1`）+ 英文 label（11px / 600 / `letter-spacing:.05em` / `opacity:.55`）
- nav 容器：`padding:16px 14px`，項目間 `gap:4px`
- **可收合**：收合時 `.nc-sb-label` 隱藏，只剩 icon
- 側邊欄底部另有「+ 新增筆記」按鈕（dev-only）

## 3. 筆記卡片（`/notes` 列表，格狀檢視）

由上而下：

| 位置 | 內容 | 實際樣式 |
| :-- | :-- | :-- |
| 左上 | icon 方塊 | `42×42`、`border-radius:5px`、底 `--blue-50`、色 `--blue-700`、內含 lucide `FileText` size 20 |
| 右上 | 徽章列 | `gap:6`、`font-size:12.5`、色 `--text-muted`：`Clock`(14) + 「3 天前」／閱讀進度徽章／`@ai-visualize` 標記徽章／收藏星 |
| 中 | 標題 | `h3`、18px、`--text-strong`、`font-weight:700`、`line-height:1.35`、下距 7px |
| 中 | 摘要 | 13.5px、`--text-muted`、`line-height:1.7`、**兩行截斷**（`-webkit-line-clamp:2`） |
| 底 | 標籤列 | `TagRow`，貼齊卡片底部（`margin-top:auto`） |

卡片資料欄位：`slug / title / description / tags / updatedAt / createdAt / series / order / excerpt / markersTotal / markersGenerated`。

> 資料檔卡片沒有 `tags`、沒有 `markers`、沒有 `series`。底部那一列要放什麼是設計題。

## 4. GeneratedFrame（AI 生成元件的外框卡片）

MDX 內嵌時要沿用的既有元件，實際結構：

```
figure  margin:22px 0 / radius-lg / border 1px --neutral-200 / bg #fff / shadow-xs
├── 標題列  padding:9px 16px / border-bottom 1px --neutral-100 / bg --neutral-50
│   ├── 膠囊  radius:999px / 11.5px / 700 / bg --blue-50 / color --blue-700
│   │        └ sparkle icon(13) + 類型中文（動畫/圖表/示意圖/時間軸/表格/視覺化）
│   │          + 「· <type>」（大寫、letter-spacing .05em、opacity .75）
│   ├── code  靠右 / font-mono / 11.5px / --text-muted → 「generated/<id>.tsx」
│   └── 「複製提示詞」按鈕（dev-only）
└── 元件本體（外層有 data-nc-viz-body，放大檢視靠它搬移，不可拿掉）
```

> 資料檔內嵌時走同一個外框，但膠囊裡的「類型」與那行 `generated/<id>.tsx`
> 對資料檔都不成立（它不是 AI 生成的、檔案是 `.json` 不是 `.tsx`）。這是提案題之一。

## 5. Design tokens（完整清單，不要新增任何值）

### 色彩

```
藍   --blue-50 #eef4fb / -100 #d6e4f5 / -200 #adc8e8 / -300 #7ba6da / -400 #4d84cb
     --blue-500 #2c6ebb / -600 #1f5aa6 / -700 #1b4f9c / -800 #163f7d / -900 #112f5d / -950 #0b1f3e
天藍 --sky-400 #4aa3d6 / -500 #348bc9 / -600 #2a76ad
橘   --orange-50 #fdf4e6 / -100 #fbe7c6 / -200 #f6cd86 / -300 #f2b955
     --orange-400 #ed9b26 / -500 #e37b24 / -600 #c7641a / -700 #a04f15
中性 --neutral-0 #ffffff / -50 #f6f8fb / -100 #eef1f6 / -200 #e1e6ee / -300 #cbd3df
     --neutral-400 #9aa6b8 / -500 #6c798e / -600 #4f5b6e / -700 #3a4456 / -800 #262e3d / -900 #161c28
狀態 --success-500 #2e9e6b / --success-50 #e7f6ee / --success-300 #5cc494
     --warning-500 #e3a008 / --warning-50 #fcf3da / --warning-300 #f2c14e / --warning-700 #9a6600
     --danger-500 #d64545 / --danger-50 #fbeaea / --danger-300 #ef8b8b
     --info-500 #2c6ebb / --info-50 #eef4fb
```

### 語意色

```
文字 --text-strong / --text-body / --text-muted / --text-on-brand / --text-brand / --text-accent
表面 --surface-page / --surface-card / --surface-sunken / --surface-brand
     --surface-brand-soft / --surface-accent-soft / --surface-inverse
邊框 --border-subtle / --border-default / --border-strong / --border-brand
動作 --action-primary（橘 400）/ --action-primary-hover / --action-primary-press
     --action-secondary（藍 700）/ --action-secondary-hover / --action-link
     --focus-ring（sky-500）
漸層 --gradient-header（藍）/ --gradient-accent（橘）
```

### 字

```
字體 --font-sans（Noto Sans TC）/ --font-latin / --font-mono
字重 --weight-regular 400 / --weight-medium 500 / --weight-bold 700 / --weight-black 900
字級 --text-2xs .6875rem / --text-xs .75 / --text-sm .875 / --text-base 1
     --text-md 1.125 / --text-lg 1.25 / --text-xl 1.5 / --text-2xl 1.875
     --text-3xl 2.25 / --text-4xl 2.875 / --text-5xl 3.75
行高 --leading-tight 1.25 / --leading-snug 1.4 / --leading-normal 1.6 / --leading-relaxed 1.8
字距 --tracking-tight -.01em / --tracking-normal 0 / --tracking-wide .04em / --tracking-wider .12em
```

### 間距 / 圓角 / 陰影 / 動畫

```
間距 --space-1 .25rem / -2 .5 / -3 .75 / -4 1 / -5 1.5 / -6 2 / -7 2.5 / -8 3
圓角 --radius-xs 2px / -sm 3 / -md 5 / -lg 8 / -xl 11 / -2xl 14 / -pill 999 / -circle 50%
陰影 --shadow-xs / -sm / -md / -lg / -xl / -accent（橘光）/ -brand（藍光）
動畫 --ease-standard / --ease-out cubic-bezier(.16,1,.3,1)
     --duration-fast 140ms / --duration-normal 220ms / --duration-slow 360ms
```

## 6. dev-only 元素的既有慣例

本機開發時才出現、正式環境完全隱藏的東西（新畫面的「以 VS Code 編輯」按鈕同此規則）：

- 側邊欄的「+ 新增筆記」
- 筆記頁的「以 VS Code 編輯」「在 Claude Code 中重新生成」「刪除筆記」
- 標籤 chip 的編輯 UI、`/tags` 的重新命名與刪除
- `GeneratedFrame` 的「複製提示詞」
