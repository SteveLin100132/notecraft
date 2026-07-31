# Task 44 — SlideChrome 章節進度指示器（`progress` 欄位）

> 對應 [deck-atoms-inventory.md](../deck-atoms-inventory.md) §2 C5/C6、§4.5。
> 依賴 [Task 31](task-31-deck-type-union-v02.md)（`SlideChromeFields`）、
> [Task 33](task-33-slide-chrome-fixed-layouts.md)（`SlideChrome.tsx`）。
> 這是 **chrome 層**改動，不是原子層 —— 與 38–43 無相依，可任意順序插入。

## 為什麼不做成原子

盤點裡有兩個看起來像「圖」、實際上是**跨頁導覽器**的東西：

| 圖例 | 實證頁 | 行為 |
| --- | --- | --- |
| C5 環形步驟指示器 | dataint p37–p41 | 6 個 icon 沿圓周排列，**連用 5 頁**，每頁只換高亮位置 |
| C6 弧形編號議程 | dataint p2/p13/p29 | 01/02/03 弧形排列，**連用 3 頁**，每頁只換高亮項 |

它們的語意等同 `SlideChromeFields` 的 `num` / `eyebrow`：告訴觀眾「現在講到哪」。

**做成原子會讓每頁自己畫**，正是契約 §4 要防的
「8 頁自由發揮就會變成 8 份不同的簡報」。故改為 chrome 層的選配欄位，由系統統一渲染。

## 範圍

### 1. 型別（`src/lib/decks.ts`）

```ts
export interface SlideProgress {
  /** 這一章的步驟標籤，依序 */
  steps: string[];
  /** 目前在第幾步（1-indexed） */
  current: number;
  /** 呈現形式。預設 "dots" */
  style?: "dots" | "ring";
}

export interface SlideChromeFields {
  // …既有欄位不變…
  progress?: SlideProgress;
}
```

- `dots`：一排小圓點 + 當前項帶標籤（低調，適合大多數情況）。
- `ring`：環形（dataint p37–p41 的樣子）。**只在 `custom` 頁的內容區右側留得出空間時用**，
  規劃書要寫明理由。

### 2. 渲染（`src/components/deck/SlideChrome.tsx`）

- `dots` 放在 chrome 的既有 footer 帶或標題列右側（實作時取版面較穩的一處）。
- `ring` 需要佔用內容區右側 —— **必須反映在 `chromeMetrics()` 回傳的 `area`**，
  否則 `custom` 頁會畫到指示器底下（`SlideFrame` 是 `overflow: hidden`，溢出不報錯只被裁掉）。

### 3. 不做的事

- **不自動推算 `current`。** 系統不知道哪幾頁屬於同一章 ——
  `eyebrow` 是自由字串、`num` 也不保證連續。硬猜會產生假資訊（audit A-3）。
  由 deck 檔明確給值。
- **不做動畫轉場。** 跨頁的進度變化靠翻頁本身表達就夠。

## 關鍵落地規則

1. `progress` 是 optional，**未給時 chrome 的外觀與 `area` 值必須與現在完全一致**
   —— 既有三份 deck 不能有任何變化。
2. 顏色一律 `dkt(dark)`，字級一律 `DS.micro` / `DS.eyebrow`，**不硬編色碼**。
3. `steps.length` 建議 3–6；超過時 `dots` 仍可用但不顯示標籤，`ring` 則 `console.warn`。
4. `current` 超出 `steps` 範圍時 clamp 並在 dev 警告，不要靜靜畫錯。
5. 全型別標註、無 `any`、無 emoji（icon 走 `IconName` 查表）。

## 實作步驟

1. `decks.ts` 加型別。
2. `SlideChrome.tsx` 實作 `dots`，**先確認 `chromeMetrics()` 的 `area` 沒有變化**
   （dots 放在既有帶內，不吃內容區）。
3. 實作 `ring`，同步改 `chromeMetrics()` 讓 `area.w` 扣掉環的寬度。
4. `atoms.deck.tsx` 補一組頁（同一章連 3 頁、`current` 遞增），驗證跨頁看起來確實像導覽器。
5. **回歸**：跑既有三份 deck，確認未給 `progress` 時 `area` 與外觀零變化。

## 驗收

- [ ] 未給 `progress` 時，既有三份 deck 的 chrome 外觀與 `area` **零變化**（截圖比對）
- [ ] `dots` 正確顯示步數與當前項；不吃內容區
- [ ] `ring` 正確渲染，且 `chromeMetrics()` 的 `area.w` 已扣除其寬度
      （放一個刻意滿版的 `custom` 頁驗證沒有被裁到）
- [ ] `current` 越界時 clamp + dev 警告
- [ ] 系統**不自動推算** `current`（`grep` 確認無章節推斷邏輯）
- [ ] 無硬編色碼、無字面字級、無 `any`、無 emoji
- [ ] `npx tsc --noEmit && npx astro build` 通過

## 風險 / 備註

- **`ring` 動到 `chromeMetrics()` 是本 Task 唯一的實質風險。** 那個函式是所有 `custom` 頁
  自我約束的依據（契約 §6 `CustomSlideProps.area`），算錯會讓內容被靜靜裁掉而 build 全綠。
  驗收第三項的「刻意滿版頁」不是形式檢查。
- 若評估後覺得 `ring` 的成本不划算，**只做 `dots` 也是完整的交付** ——
  dataint p2/p13/p29 的弧形議程用 `dots` 表達不會損失資訊，
  只有 p37–p41 那種「章節內細步驟」才真的需要 `ring`。
