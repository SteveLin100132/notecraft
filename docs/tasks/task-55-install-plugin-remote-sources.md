# Task 55 — 第三方來源與抓取實作

> 對應 [notecraft-plugin-system.md](../notecraft-plugin-system.md) §9.3、§9.4（實作階段 P6）。
> 依賴 [Task 54](task-54-install-plugin-cli.md)。

## 範圍

### 1. 來源形式解析

| 形式 | 例 |
| --- | --- |
| 官方 id | `install-plugin er-diagram-renderer` |
| GitHub repo 根 | `install-plugin owner/repo` |
| GitHub 子目錄 | `install-plugin owner/repo/plugins/foo` |
| 指定版本 | `install-plugin owner/repo#v1.2.0` |
| 完整網址 | `install-plugin https://github.com/owner/repo/tree/main/plugins/foo` |
| 本地路徑（開發用） | `install-plugin ./my-plugin` |

一個 repo 可放好幾個 plugin（Q23），靠 `owner/repo/path` 指定子目錄；
repo 根有 `registry.json` 時列出全部讓使用者選。

### 2. 抓取（Q13）

**主路徑：逐檔 fetch。** GitHub API 列目錄 + `raw.githubusercontent.com` 逐檔下載。
一個 plugin 典型只有五六個小檔 —— 零新依賴、不必解壓縮、不要求環境有 git。

`registry.json` 的 `files` 欄位讓這條路連目錄列表 API 都不用打（省一次請求也避開限流）。

**退路：`git clone --depth 1`。** 非 GitHub 來源，或 GitHub API 限流（未認證 60 次/小時）時走這條。

### 3. `.installed.json`

抓完寫一份記錄來源網址與**實際 commit**，供日後追溯與升級比對。

## 驗收

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| 子目錄安裝 | `owner/repo/plugins/foo` | 安裝 | 只取該子目錄，裝成 `.notecraft/plugins/foo/` |
| tag 可 pin | `owner/repo#v1.2.0` | 安裝 | `.installed.json` 記錄該 tag 對應的 commit |
| 限流退路 | 模擬 API 429 | 安裝 | 自動改走 git clone，訊息說明已切換 |
| 無 git 亦可裝 | PATH 無 git、GitHub 來源 | 安裝 | 逐檔 fetch 成功 |
| 本地路徑 | `./my-plugin` | 安裝 | 直接複製，不打網路 |
| 路徑逃脫被擋 | 惡意檔名含 `../` | 安裝 | 拒裝並指出違規項 |

## 依賴

Task 54。

## 風險

中。GitHub API 的限流與未認證行為要實測（60 次/小時是 per-IP，共用網路環境下會更快用完）。
退路的切換必須自動且有訊息，否則使用者只看到「裝不起來」。

## 實作記錄（2026-09-18）

`parseSource()` 支援六種形式；抓取走「GitHub API 列目錄 + raw 逐檔下載」，
失敗自動退回 `git clone --depth 1` 並印出切換原因。`.installed.json` 記錄來源與實際 commit。

- `registry.json` 的 `files` 清單讓官方 plugin 完全不必打目錄列表 API（省請求也避開限流）
- 路徑安全在 `inspectFiles()` 一併檢查（拒絕 `..` 與絕對路徑）

**未實測**：遠端安裝需要 `plugins/` 已推上 GitHub。本地來源與靜態檢查路徑已完整驗過，
遠端路徑要等這批 commit 推上去才能端對端跑。
