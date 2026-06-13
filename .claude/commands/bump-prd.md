---
description: 自動判斷版號與 changelog 並 bump PRD 版本
argument-hint: (無需參數)
allowed-tools: Bash(bash .claude/scripts/bump-prd.sh:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git show:*), Read
---

# /bump-prd — 自動 Bump PRD 版本

你的任務:根據 `docs/` 底下的最近變更,**自動**判斷該 bump 哪一位、寫出 changelog,然後呼叫 script 寫入 PRD。使用者不會給你參數,所有決策都由你做。

---

## Step 0 — 已自動帶入的上下文

### 目前 PRD 版本行

!`grep -E '^(文件版本|更新日期):' docs/notecraft-prd.md || echo "(找不到 PRD 或欄位)"`

### 目前 git 狀態 (working tree)

!`git status --short -- docs/ ':(exclude)docs/**/*.png' ':(exclude)docs/**/*.jpg' 2>/dev/null || echo "(no git)"`

### Working tree 對 HEAD 的 diff (docs/ 範圍, 摘要)

!`git diff --stat HEAD -- docs/ 2>/dev/null | head -50`

### Working tree 對 HEAD 的 diff (docs/ 範圍, 完整內容,截 400 行)

!`git diff HEAD -- docs/ 2>/dev/null | head -400`

### 最近 10 筆 docs/ 相關 commits (作為「過去 bump 過什麼」的參考)

!`git log --oneline -n 10 -- docs/ 2>/dev/null`

---

## Step 1 — 判斷是否真的需要 bump

先確認上面確實有實質的 docs/ 變更:

- 如果 working tree 對 HEAD **沒有任何 docs/ 變更**(diff stat 空白、status 空白):
  - 直接告訴使用者「目前 `docs/` 沒有未提交的變更,沒東西可以 bump」並**停止**,不要呼叫 script。
- 如果 PRD 開頭抓不到 `文件版本:` 行:回報錯誤並**停止**。

## Step 2 — 判斷 bump 等級

讀目前版本(`文件版本: vX.Y.Z`,可能是兩位 `v1.0`),依下列規則決定新版號:

- **Major (X+1.0.0)**:文件用途/範圍/結構重大改變,舊版讀者需要重新理解。例:整份 PRD 改寫、產品方向 pivot、章節大幅重組。
- **Minor (x.Y+1.0)**:新增功能需求、新增章節、實質內容擴充。例:新增 feature 規格、新增一整節、新增 spec 文件。
- **Patch (x.y.Z+1)**:文字修正、錯字、措辭調整、補充說明、格式。例:typo、釐清描述、補一張圖、調整對齊。

**判斷原則**:讀過舊版的人,看到新版會不會困惑或得到錯誤決策?會 → minor 以上;不會 → patch。

**版號正規化**:script 要求 `X.Y.Z` 三位格式且**不帶 `v`**。如果目前是 `v1.0`,視為 `1.0.0` 後再 bump(例:patch 變 `1.0.1`、minor 變 `1.1.0`、major 變 `2.0.0`)。

**多個變更同時存在**:取最高等級。例如同時有錯字修正 + 新增整節 → minor。

## Step 3 — 判斷 category 與 summary

- `category`:三選一
  - `Added`:新增章節、新功能規格、新增內容
  - `Changed`:改寫、結構調整、措辭調整、格式變動
  - `Fixed`:錯字、格式錯誤、錯誤資訊修正
  - 多種變更同時存在時,取主要的那一類。
- `summary`:一句話繁體中文,具體說出**改了什麼**(不是「更新文件」這種空話)。盡量短,30 字內為佳。如果改了很多東西,概括最重要的那條,或用「、」串接 2–3 件事。

## Step 4 — 呼叫 script

先用一兩句話告訴使用者你的判斷(舊版 → 新版、category、summary 與理由),然後用 Bash tool 執行:

```
bash .claude/scripts/bump-prd.sh <new_version> <category> "<summary>"
```

範例:`bash .claude/scripts/bump-prd.sh 1.1.0 Added "新增工作任務設定功能規格"`

⚠️ Summary 含空白或標點**一定要用雙引號包起來**。

## Step 5 — 回報結果

把 script 的輸出貼給使用者,並提醒:

- 可以執行 `git diff docs/notecraft-prd.md` 檢查實際寫入內容
- 若判斷有誤,可以 `git checkout -- docs/notecraft-prd.md` 還原後再叫一次

**不要**自動 `git add` 或 `git commit`,由使用者決定。
