---
name: commit-message
description: 根據目前 git staged 變更產生繁體中文 Conventional Commit 訊息並直接提交。當作者說「幫我 commit」「產生 commit message」「根據 staged 變更給 commit 訊息」「提交目前變更」等，或想把暫存區的變更建立成一筆 commit 時使用。Also triggers on English requests like "commit the staged changes" or "write a commit message".
---

# Commit Message Skill

根據 **git staged（已暫存）** 的變更，產生一則繁體中文的 Conventional Commit 訊息，並在確認後直接提交。

## 何時使用此 Skill

- 作者已 `git add` 部分或全部變更，說「幫我 commit」「產生 commit message」「提交目前變更」
- 作者想依本專案慣例格式整理一筆 commit 訊息

## 何時不使用此 Skill

- 暫存區為空（沒有任何 staged 變更）—— 先提醒作者 `git add`，不要自行 `git add -A`
- 作者只是想看 diff 或詢問變更內容，沒有要 commit

## 流程

1. **讀取 staged 變更**
   - `git diff --cached --name-status` 取得檔案清單與新增/修改/刪除類型
   - `git diff --cached` 看實際內容；輸出過大時聚焦關鍵檔（設定檔、邏輯檔、資料檔），元件/資產可只看清單與少量片段
   - 若無任何 staged 變更：停下並提醒作者先 `git add`，**不要**自行 `git add -A`

2. **歸納變更主旨**
   - 找出這批變更「為了完成什麼」的單一主線（例如：新增某篇筆記與其元件、修一個 bug），而非逐檔流水帳
   - 大量同性質檔（如多個生成元件）合併描述，必要時列出代表性名稱

3. **產生訊息**（格式見下）

4. **直接提交**
   - 用 here-doc 保留多行：
     ```
     git commit -F - <<'EOF'
     <訊息內容>
     EOF
     ```
   - 提交前先確認分支：若目前在 `main`（預設分支），依專案慣例**先詢問作者**是否要先開分支，除非作者已明確表示就 commit 在當前分支
   - **不要** push，除非作者要求

## 訊息格式

```
<type>: <繁體中文一句話描述本次變更的目的>

- **<動作>** <條目說明>
- **<動作>** <條目說明>
```

- **首行**：`<type>: <描述>`
  - `type` 用 Conventional Commits：`feat` / `fix` / `docs` / `refactor` / `style` / `test` / `chore` / `perf` / `build` / `ci`
  - 描述為繁體中文、聚焦「目的與影響」，避免只寫「修改 XXX 檔」
  - 是修 bug 時，可在描述點出「症狀 / 後果」，例：`fix: 因同日多次休假無法接續申請，導致出勤狀態出現缺卡(請假)`
- **空一行**後接條列重點（變更較單純時可省略條列）
- **每條**以粗體動作詞開頭，常用：**新增** / **修正** / **移除** / **調整** / **重構**
- 條目描述「做了什麼、為何」，技術名詞保留英文（如 `sticky`、`PR`、`Hook`）
- 全文繁體中文，標點用全形

## 範例

```
fix: 因同日多次休假無法接續申請，導致出勤狀態出現缺卡(請假)

- **新增** 將多個時間區段合併成一個連續的時間區段
- **修正** **缺卡(請假)** 出勤狀態的判斷邏輯，避免非整日且出現多次連貫的休假紀錄涵蓋出勤時間時，被判定為 **缺卡(請假)**
```

```
feat: 新增「AI 顧問陪跑 Workshop 20260618」筆記並嵌入 5 個互動視覺化元件

- **新增** workshop-20260618 會議紀錄筆記，並登記入「AI 顧問陪跑 Workshop」系列
- **新增** 5 個視覺化元件：action-roadmap、clarify-tension-dials、key-points-clusters、open-tradeoff-scales、workshop-theme-constellation
- **新增** Tailwind 色票擴充（blue / orange 完整色階、新增 sky 色系），供生成元件使用
- **修正** workshop-20260611 後續行動項目改為待辦清單 `[ ]` 格式
```

```
fix: 修正右側目錄欄無法 sticky 跟隨捲動

- **新增** `.nc-toc-col` 的 `align-self: stretch`，讓目錄欄拉伸至整欄高度，sticky 才有可黏附範圍
- **移除** `.nc-toc` 上多餘的 `align-self: start`
```
