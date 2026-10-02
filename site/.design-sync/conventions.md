# NoteCraftApp 官網：使用慣例

這套元件把官網排成一份「專利說明書」：深藍**圖頁**（sheet）與白色**說明頁**（paper）交替，橙色**參照編號**是唯一的訊號色。完整規範在 `guidelines/DESIGN.md`，動手前先讀它。

## 一定要包在 `Page` 裡

每個區塊都是一個 `<Page tone="sheet" | "paper">`。它會輸出 `.sheet`／`.paper` 底色、1360px 限寬容器 `.wrap`、頂端頁眉（左「NoteCraftApp 說明書」、右頁序），並透過 context 告訴子元件現在在哪種紙上。
沒有 `Page`，`PageTitle`、`Ref`、`Button` 的 hover 都會用錯顏色。`Page` 依頁序交替 tone，頁序寫成 `folio="圖頁 2／4"`（sheet）或 `folio="第 2 頁"`（paper）。

```jsx
const { Page, PageTitle, Lead, Spec, SpecHeading, SpecParagraph, Ref, Legend, CommandBar, Button } = window.NoteCraftSite;

<Page tone="sheet" folio="圖頁 1／4">
  <PageTitle size="display" level={1} lines={["筆記放進 git，", "圖由 AI 畫成元件。"]} />
  <Lead variant="abstract">給寫技術筆記的人用的工作台<Ref n={12} />。</Lead>
  <div className="hero-actions"><CommandBar /><Button href="#demo" arrow>進入 Demo 工作台</Button></div>
</Page>
<Page tone="paper" folio="第 1 頁">
  <div className="paper-grid">
    <div>
      <PageTitle lines={["文字講不清楚的，", "就讓讀者自己操作。"]} />
      <Spec>
        <SpecHeading>【技術領域】</SpecHeading>
        <SpecParagraph n={1}>筆記留在你的 git repo<Ref n={10} />。</SpecParagraph>
      </Spec>
    </div>
    <Legend items={[{ n: 10, name: "你的 git repo" }, { n: 12, name: "三欄工作台" }]} />
  </div>
</Page>
```

## 哪個元件放在哪種紙上

- **只放 sheet**：`CommandBar`、`TopNav`、`Biblio`、`FolderTree`、`VersionNumeral`、`ReleaseGrid`
- **只放 paper**：`Spec`／`SpecHeading`／`SpecParagraph`、`Legend`、`Claims`、`Diff`、`DataTable`、`CommandTable`、`FlowSteps`／`DiagramNode`
- **兩種都可以**（自動換色）：`PageTitle`、`Lead`、`Ref`、`Button`、`Figure`、`RunningHead`、`Logo`

## 樣式語彙

元件已經帶好樣式，不要另外加顏色。自己寫版面時，只用 `styles.css` 定義的 CSS 變數：
`--sheet` `--line` `--line-soft` `--line-faint` `--on-sheet-2` `--mark` `--mark-strong` `--mark-paper` `--paper` `--ink` `--ink-2` `--rule` `--rule-strong` `--tint` `--del-bg` `--del-ink`；
字型 `--f-latin`（Archivo，標題與編號）、`--f-cjk`（Noto Sans TC，內文）、`--f-mono`（JetBrains Mono）；`--gutter`、`--maxw`、`--ease-out`。

可以直接用的版面 class：`paper-grid`（內文＋260px 側欄）、`sheet-head`（5fr／7fr 標題＋導言）、`hero-grid`、`hero-actions`、`fig34`、`emb-grid`、`closing`、`closing-links`。

## 不能違反的規則

- 直角、無陰影、無漸層、無毛玻璃；分隔只用 1px 細線、1.5px 框、2px 章節線。
- 橙色只給參照編號、請求項序號與互動回饋：一律透過 `<Ref n={…} />`，不要把橙色當底色或內文字色。
- 參照編號用偶數，**每個出現的 `Ref` 都要在 `Legend` 裡有一項**。
- 圖下方用 `<Figure n={…} caption={…}>` 放「FIG. n」圖說，不另設圖標題。
- 選中狀態填 `--sheet`、已完成填 `--tint`、被擋下用 `--mark-paper` 虛線（見 `DiagramNode` 的 `state`）。
- 用了 `Claims` 就保留它預設的「並未申請專利」聲明；頁面上不放專利號或官方機關標誌。
- 動畫只用 `var(--ease-out)`，hover 160–180ms，並尊重 `prefers-reduced-motion`。
