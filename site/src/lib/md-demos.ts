// 「撰寫筆記」各頁的渲染示範：每個示範是一組預設原文（上方的切換鈕），讀者也可以直接改。
// 原文在 build 時用 app 的外掛渲染（nc-render.ts），結果就是 NoteCraftApp 筆記頁上的樣子。
// MDX 文件裡寫 <MdDemo id="…" />；id 對到這裡的鍵。

export type MdPreset = { label: string; source: string };
export type MdDemoSpec = {
  /** 原文框上方的檔名，只是示意 */
  file: string;
  /** 圖說（FIG. n 由 docs.css 的計數器補） */
  caption: string;
  presets: MdPreset[];
  /** 標題示範：右邊多畫筆記頁的目錄，下面列出每個標題的錨點 id */
  toc?: boolean;
  /** 同一段原文分別當成 .md 與 .mdx 渲染，上下並列（MDX 是真的編譯，錯誤訊息與 app 相同） */
  compare?: boolean;
};

const fence = "```";

export const MD_DEMOS: Record<string, MdDemoSpec> = {
  /* ── Markdown 與 MDX ── */
  mdVsMdx: {
    file: "guides/cache.md／.mdx",
    caption: "同一段原文存成 .md 與 .mdx 的差別。MDX 是真的拿去編譯，錯誤訊息與行號就是你會看到的那一份。",
    compare: true,
    presets: [
      { label: "大括號", source: "設定寫成 {a: 1}。" },
      { label: "變數", source: "你好，{name}。" },
      { label: "跳脫", source: '設定寫成 \\{ "debug": true \\}，或寫成 `{ "debug": true }`。' },
      { label: "角括號", source: "a < b 沒問題，<3 不行。" },
      { label: "角括號網址", source: "官網：<https://example.com>" },
      { label: "HTML 註解", source: "<!-- 這行在 MDX 會報錯 -->\n{/* 這樣才對，內容不會顯示 */}\n\n註解前後的文字。" },
      { label: "沒閉合的標籤", source: "第一行<br>第二行" },
      { label: "縮排四格", source: "安裝：\n\n    npm install -g notecraftapp" },
      { label: "自訂標題 id", source: "## 快取策略 {#cache}" },
    ],
  },

  /* ── 標題、目錄與錨點 ── */
  headings: {
    file: "guides/http-cache.md",
    caption: "標題產生的目錄與錨點 id。改標題文字，右邊的目錄與 id 跟著變。",
    toc: true,
    presets: [
      {
        label: "一般筆記",
        source: `## 快取策略

先說結論：靜態資源給長快取，HTML 不快取。

### Cache-Control 與 ETag

### 什麼時候要清快取？

## OAuth 2.0 流程

### Step 1: Install

#### 這層不進目錄`,
      },
      {
        label: "重複的標題",
        source: `## 快取策略

### 範例

## 部署

### 範例

## 快取策略`,
      },
      {
        label: "從 H1 開始",
        source: `# HTTP 快取

## 瀏覽器快取

### 強快取

### 協商快取

## CDN 快取`,
      },
      {
        label: "跳層",
        source: `## 安裝

#### 直接跳到第四層

這段標題不會出現在目錄裡。

## 設定`,
      },
    ],
  },

  /* ── 程式碼區塊 ── */
  codeblock: {
    file: "guides/cache.md",
    caption: "圍欄程式碼的渲染：語言標籤、行號與複製鈕（按下去真的會複製）。",
    presets: [
      {
        label: "基本",
        source: `${fence}ts
export const ttl = 60;
${fence}`,
      },
      {
        label: "沒寫語言",
        source: `${fence}
npx notecraftapp view ./notes
${fence}`,
      },
      {
        label: "長的行",
        source: `${fence}bash
curl -H "Cache-Control: no-cache" -H "If-None-Match: \"33a64df551425fcc55e4d42a148795d9f25f89d4\"" https://example.com/api/notes
${fence}`,
      },
      {
        label: "行內 code",
        source: "回應標頭要帶 `Cache-Control: max-age=60`，再用 `ETag` 做協商快取。",
      },
    ],
  },

  codeblockMeta: {
    file: "guides/auth.md",
    caption: "語言後面加檔名與要高亮的行號，兩者可以並用。",
    presets: [
      {
        label: "檔名＋整行高亮",
        source: `${fence}ts title="src/lib/auth.ts" {2}
import { createSession } from "./session";
const token = readToken();
export const session = createSession(token);
${fence}`,
      },
      {
        label: "多段高亮",
        source: `${fence}tsx {1,3-5}
import { useState } from "react";

export function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
${fence}`,
      },
      {
        label: "只有檔名",
        source: `${fence}json title='.notecraft/plugins.json'
{
  "plugins": [{ "id": "er-diagram", "files": ["**/*.er.json"] }]
}
${fence}`,
      },
    ],
  },

  codeblockColor: {
    file: "guides/languages.md",
    caption: "同一套上色規則套在不同語言上：JavaScript 系最完整，其他語言只有共通的部分上色。",
    presets: [
      {
        label: "TypeScript",
        source: `${fence}ts
// 讀取設定，沒有就用預設值
interface Options { ttl?: number }
export async function load(path: string): Promise<Options> {
  const raw = await readFile(path, "utf8");
  return { ttl: 0x3c, ...JSON.parse(raw) };
}
${fence}`,
      },
      {
        label: "JSON",
        source: `${fence}json
{
  "title": "HTTP 快取",
  "slugs": ["cache/intro", "cache/etag"],
  "draft": false
}
${fence}`,
      },
      {
        label: "Python",
        source: `${fence}python
# 這行不會顯示成註解色
def ttl(seconds: int) -> str:
    return f"max-age={seconds}"
${fence}`,
      },
      {
        label: "SQL",
        source: `${fence}sql
-- 這行也不會
SELECT id, title FROM notes WHERE updated_at > '2026-01-01';
${fence}`,
      },
      {
        label: "跨行註解",
        source: `${fence}ts
/* 同一行內的區塊註解會上色 */
/*
  跨行的只有逐行能配對的部分會上色
*/
const ok = true;
${fence}`,
      },
    ],
  },

  annotate: {
    file: "guides/handler.md",
    caption: "程式碼註解：點程式碼裡的編號，浮出清單裡對應的那一項。",
    presets: [
      {
        label: "兩個標記",
        source: `:::annotate
${fence}ts
function handler(req: Request) { // (1)!
  validate(req);
  return ok(req); // (2)!
}
${fence}

1. 進入點，先檢查請求格式。
2. 回傳統一格式的成功回應。
:::`,
      },
      {
        label: "標記數不符",
        source: `:::annotate
${fence}bash
npx notecraftapp build ./notes \\
  --out dist # (1)!
${fence}

1. 輸出資料夾，預設是 \`dist\`。
2. 這一項沒有對應的標記。
:::`,
      },
      {
        label: "少了清單",
        source: `:::annotate
${fence}ts
const ttl = 60; // (1)!
${fence}
:::`,
      },
    ],
  },

  admonition: {
    file: "guides/upgrade.md",
    caption: "提示框的六種類型，以及自訂標題與可收合。",
    presets: [
      { label: "note", source: ":::note\n升級前先讀一遍更新紀錄。\n:::" },
      { label: "info", source: ":::info\n`view` 只回應本機的連線。\n:::" },
      { label: "tip", source: ":::tip\n按 `⌘K` 可以直接搜尋全文。\n:::" },
      { label: "success", source: ":::success\n設定完成，重新整理頁面就會看到。\n:::" },
      { label: "warning", source: ":::warning\n升級前先備份 `.notecraft/`。\n:::" },
      { label: "danger", source: ":::danger\n這個動作會改動所有筆記，無法復原。\n:::" },
      {
        label: "自訂標題",
        source: ':::warning{title="升級前"}\n先備份 `.notecraft/`。\n:::\n\n:::tip[也可以這樣寫]\n方括號裡的文字就是標題。\n:::',
      },
      {
        label: "可收合",
        source:
          ":::tip{collapsible}\n預設收起，點標題展開。\n:::\n\n:::note{collapsible open}\n加上 `open` 就預設展開。\n:::",
      },
    ],
  },

  tabs: {
    file: "getting-started/install.md",
    caption: "分頁：點分頁按鈕切換，按鈕取得焦點時也能用方向鍵。",
    presets: [
      {
        label: "npm／pnpm",
        source: `::::tabs
:::tab{label="npm"}
${fence}bash
npm install -g notecraftapp
${fence}
:::
:::tab{label="pnpm"}
${fence}bash
pnpm add -g notecraftapp
${fence}
:::
::::`,
      },
      {
        label: "少了 label",
        source: `::::tabs
:::tab
第一個分頁
:::
:::tab
第二個分頁
:::
::::`,
      },
      {
        label: "冒號一樣多",
        source: `:::tabs
:::tab{label="npm"}
npm install -g notecraftapp
:::
:::tab{label="pnpm"}
pnpm add -g notecraftapp
:::
:::`,
      },
    ],
  },

  inline: {
    file: "guides/oauth.md",
    caption: "行內提示、行內標籤與步驟清單。",
    presets: [
      {
        label: "行內提示",
        source: `用 :tip[OAuth]{content="一種授權框架，讓第三方應用程式不必拿到密碼"} 取得授權，再換成 :tip[PKCE]{content="Proof Key for Code Exchange"} 保護的存取權杖。`,
      },
      {
        label: "標籤",
        source: `:badge[note]{variant="note"} :badge[info]{variant="info"} :badge[tip]{variant="tip"} :badge[success]{variant="success"} :badge[warning]{variant="warning"} :badge[danger]{variant="danger"} :badge[neutral]

:badge[Beta]{variant="warning" outline} :badge[新功能]{variant="tip" icon="sparkle"} :badge[已驗證]{variant="success" icon="check" size="sm"} :badge[GitHub]{href="https://github.com" icon="star"}`,
      },
      {
        label: "步驟",
        source: `::::steps
:::step{title="安裝" status="done"}
\`npm install -g notecraftapp\`
:::
:::step{title="建立筆記資料夾" status="current"}
放一篇 \`hello.md\` 進去。
:::
:::step{title="啟動"}
\`notecraftapp view ./notes\`
:::
::::`,
      },
      {
        label: "橫向步驟",
        source: `::::steps{layout="horizontal" start=3}
:::step{title="撰寫" status="done"}
:::
:::step{title="生成" status="current"}
:::
:::step{title="部署"}
:::
::::`,
      },
    ],
  },
};
