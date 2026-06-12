# UI Kit — Duty Mate 值日生排班（內部系統原型）

聯和趨動內部 Side Project。解決值日生排班 effort 過度集中於一人的痛點：值日生自助填寫
排除時段，系統一鍵產生平均、無衝突的推薦班表，負責人微調後發布，並自動累計出勤統計。

完整可點擊原型，依 `uploads/project-requirement-document.md` 與 `site-map.svg` 建置，
沿用本設計系統的品牌色，採更清爽的內部後台風格。桌面為主，RWD 適配手機。

## 角色
- **排班負責人**（登入帳號：吳金燕）— 全部功能。
- **值日生** — 主介面、正式班表、排除時段、申請換班。
- 右上角「視角切換」可在負責人 / 值日生預覽間切換，側邊選單與資料權限會跟著變。

## 頁面（10 + 1）
| 路由 | 頁面 | 角色 | 重點互動 |
|---|---|---|---|
| `official` | 正式班表（預設首頁） | 共用 | 篩選單一值日生、工作任務備註、編輯模式臨時調整、停班日標記無法出勤 |
| `exclude` | 排除時段 | 共用 | 點格子標記/取消「不能排」；負責人可代填同仁；發布後鎖定 |
| `constraint` | 排班限制表 | 負責人 | 每日彙整當天不能排的人員 |
| `draft` | 草稿班表 | 負責人 | 一鍵產生推薦、手動指派/移除、人員統計即時聯動、清除、發布 |
| `activity` | 活動設定 | 共用(值日生 R) | 設定停班日 / 調整上班日 + 註記 |
| `users` | 用戶管理 | 負責人 | 新增/編輯/刪除、角色、列入排班；無法改自己角色或刪自己 |
| `stats` | 出勤統計 | 負責人 | 年度表格（平均/實際/缺勤）、點姓名聯動日曆 |
| `import` | 過往班表匯入 | 負責人 | CSV 上傳預覽（mock） |
| `swap` | 申請換班 | 共用 | 第 5 階段追加功能，placeholder |

## 推薦演算法（`DutyKit.recommend`）
排除停班日、納入調整上班日、計算平均次數、避開各人排除時段、排班間隔 ≥ 3 天、優先補
次數最少者；**不覆蓋已排班的格子**（PRD Q2）。發布允許有空班但會提醒（PRD Q1）。

## 核心流程（可點擊串接）
登入 → 正式班表（尚未發布）→ 前往草稿班表 → 一鍵產生推薦 → 微調 → 發布 →
正式班表填入 → 出勤統計累計。狀態以 `localStorage`（`dutymate_v1`）持久化，重整不遺失。

## 檔案
- `index.html` — 登入、路由、狀態、持久化、全部 CSS（`.dm-*`）。也是 Starting Point。
- `DutyKit.jsx` — 示範資料、icons、日期/排班 helpers、推薦演算法（`window.Duty`）。
- `DutyCalendar.jsx` — 可重用月曆 `MonthCalendar` + `MonthNav` + `DayCell`。
- `DutyShell.jsx` — 登入頁、App shell（側邊/上方列/視角切換）、共用 atoms、`StatPanel`。
- `DutyViewShared.jsx` — 跨頁共用的 `fmtDate` 與 `AssignDialog`（原本卡在 ViewsA）。
- `dutymate.css` — 全部 `.dm-*` 樣式（由 `index.html` 抽出，整合版與各單頁共用）。
- `DutyPageHarness.jsx` — 單頁啟動殼：載入狀態、包 AppShell、`go()` 改為真實導航。
- `views/*.jsx` — 每頁一個元件（10 檔）：`OfficialView`、`ExcludeView`、`ConstraintView`、
  `DraftView`、`ActivityView`、`WorkTaskView`、`UsersView`、`StatsView`、`ImportView`、`SwapView`。

## 兩種進入點
- **整合版**：`index.html` — 完整單頁 App，內部 state 路由切換所有頁面（DS 起始點 / dsCard）。
- **單頁版**：`pages/<id>.html`（official / exclude / constraint / draft / activity / worktask /
  users / stats / import / swap）— 每頁可獨立開啟、獨立開發；側邊選單與 `go()` 改為跳轉對應
  HTML。兩種版本共用同一份 `views/*.jsx` 與 `localStorage`（`dutymate_v1`），帳號與視角另存
  於 `dutymate_account` / `dutymate_role`，跨頁維持登入。`pages/index.html` 會導向 official。

> 按頁面開發時：只改 `views/<該頁>.jsx`，整合版與單頁版會同步生效。新增頁面 = 新增一個
> `views/X.jsx` + 在 harness 的 `DUTY_VIEW_EXPORT`/`DUTY_ALLOWED` 與 NAV 註冊 + 複製一份
> `pages/x.html`（只需改 view 檔名與 `mountDutyPage("x")`）。

## 自包含資源（可單獨服務／打包此資料夾）
為了讓 `ui_kits/dutymate/` 能單獨用 http server 服務或單獨 zip 分發，設計系統的共用檔已
複製進本資料夾：`_ds_bundle.js`、`styles.css`、`tokens/*.css`。引用路徑都是本地相對路徑
（`index.html` → `styles.css`／`_ds_bundle.js`；`pages/*.html` → `../styles.css`／`../_ds_bundle.js`）。
- 字型走 Google Fonts CDN（需連網），無本地字型檔。
- ⚠ 這三項是**副本**：設計系統（根目錄的 `_ds_bundle.js` / `styles.css` / `tokens/`）更新時，
  需重新複製進來才會同步。
- 注意：`file://` 雙擊仍不行（瀏覽器擋 babel 執行期抓 `.jsx`）。請用 http server 開啟；
  server 根目錄設在本資料夾即可。

## 示範資料
7 名同仁（劉亭筠、張耘瑄、吳金燕[負責人]、陳舒珊、Vicky Huang[不列入排班]、黃喻靖、
黃宣凱）；當前月份 2026 年 6 月；活動：端午節停班（06/19）、補班（06/20）。

## 備註
- Icons 為內嵌 Lucide 風格線性 SVG（`DutyIcons`）。
- 後端排班邏輯為前端 demo 版重現，著重 UI/UX 與流程，非生產演算法。
