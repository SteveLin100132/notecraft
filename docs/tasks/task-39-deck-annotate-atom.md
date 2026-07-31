# Task 39 — `<Annotate>` 通用標註層

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 A2/B2/E1、§4.1。
> 依賴 [Task 38](task-38-deck-code-atom.md)（`atoms.deck.tsx` 骨架）。

## 範圍

一個**通用標註層**：`children` 放任何東西（截圖 `<img>`、SVG 架構圖、`<Code>`、任意 JSX），
在其上疊加編號熱點與引線標籤。

一次吃掉三種在盤點裡各自獨立、實作卻同源的需求：

| 圖例 | 實證頁 | 用 `<Annotate>` 怎麼表達 |
| --- | --- | --- |
| E1 標註截圖 | dataint p25–p28、bullmq p12、nifi p5、tus p13/p14 | `<img>` + `pins`（編號圓徽章）+ `leaders`（引線標籤） |
| B2 巢狀架構圖的編號熱點 | dataint p15、nifi p4 | 自畫 SVG + `pins`，底部說明卡由 `custom` 頁自己排 |
| A2 引線標註碼塊 | mfe p12/p13、dataint 全篇 | `<Code>` + `leaders` |

## API 草案

```ts
export interface AnnPin {
  n: string;                      // 徽章文字（"1" / "A"）—— 必須編碼真實序列，不做裝飾編號
  x: number; y: number;           // 百分比座標（0–100），相對 children 的顯示框
  tone?: SeriesTone;
}

export interface AnnLeader {
  text: string;
  side: "left" | "right" | "top" | "bottom";   // 標籤停靠邊
  at: { x: number; y: number };                // 引線指向的點（百分比）
  offset?: number;                             // 標籤沿停靠邊的位置（百分比，預設自動分配）
  tone?: SeriesTone;
}

export interface AnnotateProps extends BlockBaseProps {
  children: ReactNode;
  pins?: AnnPin[];
  leaders?: AnnLeader[];
}
```

**座標用百分比不用 px**：`children` 的實際尺寸取決於 `area` 與內容，
寫死 px 會在換頁或改內容時錯位。

## 關鍵落地規則

1. **標註層絕對定位、`children` 正常流** —— 外層 `position: relative`，
   pins / leaders 用 `position: absolute` + `%`。`children` 本身不受影響。
2. **引線用 SVG 畫**（單一 `<svg>` 覆蓋整個容器、`pointer-events: none`），
   不要用 CSS border 拼折線 —— 折線轉角與箭頭在斜向時會歪。
3. **標籤沿停靠邊自動分配位置**：同一邊有多個 leader 時依 `at.y`（或 `at.x`）排序後均分，
   避免重疊。`offset` 給呼叫端覆寫用。
4. **編號徽章不自動產生**（audit A-3）—— `n` 是必填，呼叫端給什麼就顯示什麼。
5. 顏色一律 `dkt(dark)` / `toneColor(tone, c)`，**不硬編色碼**。字級取 `DS.micro` / `DS.small`。
6. **不做 hover / 點擊互動** —— 投影片沒有滑鼠互動的使用情境，
   標註必須在靜態畫面上就讀得完（與筆記端 `:::annotate` 的互動式標記不同，那是內文用的）。
7. 超過建議 pin / leader 數時 `warnOverLimit`（dev-only）。

## 實作步驟

1. `src/components/deck/blocks/Annotate.tsx`：先做 `pins`（純絕對定位徽章），跑通。
2. 加 `leaders`：SVG 折線 + 端點小圓 + 標籤盒。先做 `left` / `right`（實證頁最常見），
   再補 `top` / `bottom`。
3. 同邊多標籤的自動分配。
4. `atoms.deck.tsx` 補一頁：一張佔位圖 + 左右各 3 個 leader + 4 個 pin，
   外加一組**刻意密集**的 leader 測避讓。
5. `/present/atoms` 逐頁截圖，亮暗兩色。

## 驗收

- [x] `pins` 徽章定位正確，換 `area` 尺寸不錯位（百分比座標生效；DOM 實測 `A` → 82.0/50.0）
- [x] `leaders` 四個方向皆可用，引線端點準確指向 `at`（9 個端點實測**誤差 0.0%**）
- [x] 同一邊多個 leader 自動分配、不重疊；`offset` 可覆寫
- [x] `children` 放 `<img>` / SVG / `<Code>` 三種都正常（另加 div 樹）
- [x] 標註層不攔截 `children` 的版面（`pointer-events: none` 生效）
- [x] 無硬編色碼、無字面字級、無 `any`、無 emoji、**無自動佈局**（grep 確認）
- [x] `/present/atoms` 亮暗各 7 頁皆無溢出（dev 偵測回報 `ok`）
- [x] `npx tsc --noEmit`（18 = 既有基準線）`&& npx astro build` 通過

## 風險 / 備註

- **引線避讓是這個元件唯一的難點。** 實證頁（bullmq p12 左右各 3 個標籤）已經是密集上限；
  若自動分配做不好，退路是**要求呼叫端給 `offset`**，把責任交回 deck 檔 ——
  但那會讓 AI 每次都要算位置，違背原子層的目的。優先把自動分配做對。
- 本 Task 完成後回頭評估 [Task 38](task-38-deck-code-atom.md) 的 `<Code labels>`
  能否改為委派給 `<Annotate>`。**是選配的內部重構，不是驗收項** ——
  兩者的引線語意（行區間 vs 任意座標）不見得能收斂，收斂不了就維持兩套。

---

## 實作記錄（2026-07-31，已完成）

### 產出

| 檔案 | 內容 |
| --- | --- |
| `src/components/deck/blocks/Annotate.tsx` | **新增**（320 行）—— `pins` + `leaders`，四方向停靠 |
| `src/components/deck/blocks/index.ts` | barrel 補匯出 |
| `src/components/generated/atoms.deck.tsx` | 補兩頁（典型 / 邊界），deck 由 5 頁增為 7 頁 |

### 版面策略：標籤住在保留出來的側欄

原規劃只說「標註層絕對定位」，實作時決定**再往前一步**：`<Annotate>` 依實際用到的方向
保留側欄（左右預設 200px、上下 64px），`children` 佔中間那格。

理由來自實證頁 —— bullmq p12 / nifi p5 都是**截圖置中、標籤在留白處**，
標籤壓在截圖上會蓋掉它要指的東西。副作用是不需要做「標籤避開內容」的碰撞偵測，
只要做同側標籤之間的縱向避讓就好（少一整類複雜度）。

### 三個實作決定

1. **引線用一張 `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` 的 SVG。**
   非等比縮放本來會扭曲線寬與角度 —— 但折線**只有軸向線段**（水平 / 垂直），
   角度不受影響；線寬則用 `vectorEffect="non-scaling-stroke"` 解決。
   代價是 SVG 內畫不了圓（會被拉成橢圓），所以**端點小圓與 pin 徽章改用 HTML 畫**。
2. **側欄裡那一小段連接線用 HTML 而非 SVG。** 它一定是水平或垂直的直線，
   一個帶 `border-dashed` 的 `<span>` 就夠，不必為它再開一張 SVG 或處理跨格座標換算。
3. **避讓演算法選「期望位置 + 最小間距鬆弛」而不是平均分配。**
   標籤會盡量待在它指的東西旁邊（平均分配做不到），而且**結果是決定性的** ——
   同樣輸入永遠得到同樣版面，截圖迴歸才有意義。真正的力導向就沒這個性質。

### 過程中修掉的問題：座標系與「children 沒填滿」

`at` 的百分比是相對**內容區**（扣掉側欄的那一格），不是 children 的視覺範圍。
兩者在 children 填滿時一致 —— 但把自然高度的 `<Code>` 放進被拉伸的頁面時，
內容區比 code 卡高，`y: 86%` 就算到了 code 下方的空白上（截圖可見引線指向空氣）。

**沒有改成自動量測 children 高度**（那要 ref + effect，且縮覽頁 `live=false` 時不掛載），
改為明確的用法規則並寫進檔頭警告：

```tsx
<Annotate dark={dark} style={{ flex: "none" }}>…</Annotate>
```

`flex: "none"` 讓內容區收合到 children 的高度，座標就與眼睛看到的一致。
`atoms.deck.tsx` 的兩個 demo 都用了它，並在原地註明理由。

### 驗證（DOM 實測，非目視）

| 項目 | 結果 |
| --- | --- |
| 9 個引線端點 vs `at` 指定值 | **誤差 0.0%**（如 22/8、94/8、52/88、60/40、72/45、66/49、80/52、30/12、55/86） |
| pin 定位 | `A` → 82.0 / 50.0，與指定值相同 |
| 同側標籤重疊（p6 左右各 3 條） | **0 組重疊** |
| 密集避讓（p7 左，4 個目標點擠在 y 40–52%） | **0 組重疊**，間距 28 / 28 / 28.1px，且維持目標點的先後順序 |
| `children` 型別 | div 樹 / inline `<svg>` / `<img>`（data-URI）/ `<Code>` 四種皆正常 |
| 溢出 | 亮暗各 7 頁全數 `ok` |

### 建議上限（回填給 [Task 45](task-45-present-skill-agents-atoms.md)）

| 項目 | 建議上限 | 依據 |
| --- | --- | --- |
| `pins` | **8** | 超過就該考慮拆頁；dataint p15 的 A–E 是 5 個 |
| 單側 `leaders` | **4** | bullmq p12 左右各 3 是實證上限；第 4 條在 `minGap` 11% 下仍不重疊，第 5 條開始會被推到邊界 |

`minGap` 預設 11%（可覆寫）。標籤在側欄的可用範圍是 6%–94%，避免貼齊角落。

### 已知副作用與備註

- **`atoms.deck.tsx` 的替身內容全部自畫**（假 UI + data-URI SVG「截圖」），
  不依賴任何外部資產 —— 驗證基準要能離線重現，而且每次 render 都一樣，截圖迴歸才比得出差異。
- **`<Code labels>` 未改為委派給 `<Annotate>`。** 兩者的引線語意不同：
  `<Code>` 是「標到第幾行」（一維、與行高綁定），`<Annotate>` 是「標到任意座標」（二維百分比）。
  硬收斂會讓 `<Code>` 得先把行號換算成百分比，反而更繞。**維持兩套。**
  Task 39 文件把這件事列為選配而非驗收項，結論是不做。
- **build 產物有一個與本 Task 無關的變動**：CSS bundle 多出 `@keyframes ncBadgeIn`
  （90 bytes，`global.css` 本來就無條件宣告它），連帶所有頁面的 stylesheet 檔名 hash 改變。
  已用 `git stash` 排除 Task 39 的三個檔案後重建驗證：**沒有它們也一樣會出現**，
  故與本 Task 無關（推測是 Task 38 建基準線時的 Astro 快取讓那個 keyframe 被漏掉，
  之後快取失效才補回 —— 也就是舊產物才是不完整的那個）。
  **忽略 bundle hash 後比對內容**：28 個筆記頁與其餘頁面全數相同，
  唯一內容差異仍是 `index.html` 的 Dashboard 簡報計數（Task 38 已知）。
