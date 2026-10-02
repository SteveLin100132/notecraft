# design-sync 筆記（site/ 官網元件庫）

- 元件庫原始碼在 `site/src/ds/`（React，輸出 site.css／figs.css 既有的 class，不自帶樣式）；`npm run build:ds` 以 `tsconfig.ds.json` 編到 `ds-dist/`，並由 `scripts/build-ds-css.mjs` 合成 `ds-dist/styles.css`（site.css＋figs.css＋src/ds/ds.css，拿掉 @fontsource import）。
- `site/package.json` 的 `module`／`types` 指向 `ds-dist/ds/index.*`，只為了讓 design-sync 找到 entry 與 .d.ts；Astro 不讀這兩個欄位。
- converter 指令（在 site/ 下、Node 22）：
  `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./ds-dist/ds/index.js --out ./ds-bundle`
- 本機 shell 預設 Node 16；一律先 `export PATH=~/.nvm/versions/node/v22.16.0/bin:$PATH`。
- render check 用的 playwright 要配本機快取的 chromium：`~/Library/Caches/ms-playwright/chromium-1228` → `playwright@1.61.1`（裝在 `.ds-sync/`）。
- 字型走 `extraFonts`（node_modules 的 @fontsource-variable CSS）；Noto Sans TC 有 100 多個 unicode-range 子集，fonts/ 約 5 MB，上傳要分小批。
- 群組名取自 `src/ds/<group>/` 資料夾；資料夾名不能跟元件同名（`page/Page.tsx` 會掉進 general），所以用 layout／document。`DiagramNode`、`SpecHeading`、`SpecParagraph` 跟別人同檔，靠 `componentSrcMap` 釘住。
- `CommandBar` 包的是站上真正的 `src/components/CopyCommand.tsx`；`CopyCommand` 的 `tone="paper"` 沒有對應 CSS（白框白鈕），所以 CommandBar 不開放 tone、只放 sheet。
- 預覽的 sheet-only 元件都包在 `<Page tone="sheet" hideRunningHead>` 裡，否則顏色錯。
- `Claims` 對應 commit 1526012 的磚牆排版（`.claims` 三欄 grid、`.claim.is-wide` 跨兩欄、`.claim-text`／`.claim-legal-label`）。`art` 是 320×180 座標的 SVG 內容（`ca-*` class），元件自己包 `<figure class="ca"><svg>`；站上的線稿在 `src/components/ClaimArt.astro`。
- `Figure`、`Page`、`PageTitle`、`Claims` 的預覽比格狀卡片寬，`overrides` 設 `cardMode: column`。

## Known render warns

（目前沒有）

## Re-sync risks

- `ds-dist/styles.css` 是 site.css＋figs.css 的快照：官網改了 CSS 要先 `npm run build:ds` 再同步，否則元件庫樣式落後。
- 元件只輸出 class，若官網把 class 改名（例如 `.pl-node`、`.dt-table`、`.claim`），元件會無聲失去樣式；同步前 grep 一下 `src/ds/` 用到的 class 是否還在。
- `ReleaseGrid`、`Biblio` 的預設值是 2026-10-01 的版本資料（寫死），只是展示用。
- `DESIGN.md` 描述的「圖版（Plates，框外參照編號）」目前站上已改成工作台導覽（Tour），元件庫沒有 Plate 元件。
