# NoteCraft

以 **Astro 5 + MDX** 為核心，由 AI 在 Claude Code 中生成視覺化與動態互動元件、嵌入筆記的個人筆記 Web App。完整規格見 [`docs/notecraft-prd.md`](docs/notecraft-prd.md)；設計交付見 `design_handoff_notecraft/`（外部目錄）。

## 開發

```bash
npm install        # Node 22.x
npm run dev        # 含 dev-only /api 與「+ 新增筆記」/「以 VS Code 編輯」等控制
npm run build      # astro build && pagefind 索引（dist/）
npm run preview    # 本機預覽建置結果
npm run new-note -- --title "新筆記標題" --tags "標籤A,標籤B"
```

dev API（`src/dev-api/integration.ts`）只在 `astro dev` 時掛載到 Vite 中介層，且綁定 localhost；正式建置（Netlify）完全沒有 server-side 端點。

## 目錄

```
src/
├── content/notes/**.mdx          筆記原始檔（Content Collections）
├── components/
│   ├── generated/                AI 生成的視覺化元件（id 對應一個 .tsx）
│   ├── islands/                  React island（互動 UI）
│   └── *.astro                   靜態元件
├── pages/
│   ├── index.astro               /  總覽
│   ├── notes/index.astro         /notes
│   ├── notes/[slug].astro        /notes/:slug
│   ├── tags.astro                /tags
│   └── about.astro               /about
├── layouts/BaseLayout.astro
├── lib/                          notes / dates / tags 工具
├── styles/                       global.css + tokens.css（TrendLink DS）
└── dev-api/integration.ts        dev-only middleware
```

## AI 標記 → 元件

在 MDX 中以註解標示：

```mdx
{/* @ai-visualize
id: oauth-flow
type: diagram
status: pending
prompt: |
  畫一張 OAuth 2.0 + PKCE 的時序圖
*/}
```

接著在 Claude Code 中執行 `content-visualize-skill` 的 Subagent 鏈：
note-scanner → visualize-planner → component-generator → mdx-writer。元件會被寫到
`src/components/generated/<id>.tsx`，並在 MDX 中插入對應 `import` 與 `<Component client:visible />`。

## 部署

Netlify 靜態部署，建置指令 `npm run build`，輸出 `dist/`，pagefind 索引附在 `dist/pagefind/`。
無 Function、無執行時 API。
