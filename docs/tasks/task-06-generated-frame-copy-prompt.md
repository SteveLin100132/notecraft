# Task 06 — GeneratedFrame 提示詞複製

> 對應 PRD v1.3.0 §7.1「AI 生成內容外框卡片 — 提示詞複製」、核心目標 #14。
> `GeneratedFrame` 提供「複製提示詞」按鈕；Skill / mdx-writer 寫回時帶入 `prompt`。

## 範圍

- 擴充 [GeneratedFrame.astro](../../src/components/GeneratedFrame.astro)：新增 `prompt` prop + inline 複製按鈕（dev 與正式皆顯示）。
- 調整 [SKILL.md](../../.claude/skills/content-visualize/SKILL.md) 與 [mdx-writer.md](../../.claude/agents/mdx-writer.md)：寫回時以 `JSON.stringify` 帶入 `prompt`。
- 回填既有筆記的 `GeneratedFrame`（為它們補上 `prompt={...}`）。

## 實作步驟

### 1. GeneratedFrame 新增 prompt + 複製按鈕

檔案：`src/components/GeneratedFrame.astro`

- Props 加 `prompt?: string`。
- header 區（與 `generated/<id>.tsx` 同列）在 `prompt` 存在時渲染一個 `<button data-nc-copy-prompt>`，把 prompt 放在 `data-prompt` 屬性（或鄰近的 `<script type="application/json">`，避免屬性過長 / 引號問題 —— 建議用隱藏的 JSON script 節點較穩健）。
- 以 inline `<script>`（框架無關）綁定點擊 → `navigator.clipboard.writeText(prompt)` → 暫時切換按鈕文字 / icon 為「已複製」。多個外框共存時，script 用事件委派（`document.addEventListener` 一次）或每個 frame 一段 scoped script，注意避免重複綁定。

建議實作（事件委派，整頁一次）：

```astro
<button type="button" data-nc-copy-prompt aria-label="複製提示詞" title="複製提示詞" ...>
  <Icon name="clipboard" size={13} /> 複製提示詞
</button>
<script type="application/json" data-nc-prompt set:html={JSON.stringify(prompt)} />
```

頁面層級（或 BaseLayout / 此元件底部以 `is:inline` 確保只注入一次）綁定委派：

```html
<script>
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-nc-copy-prompt]");
    if (!btn) return;
    const node = btn.parentElement.querySelector("[data-nc-prompt]");
    const prompt = node ? JSON.parse(node.textContent) : "";
    navigator.clipboard.writeText(prompt).then(() => {
      const old = btn.innerHTML; btn.textContent = "已複製";
      setTimeout(() => { btn.innerHTML = old; }, 1800);
    });
  });
</script>
```

樣式遵循 trendlink-design（小型次要按鈕，沿用 header 既有色票）。

### 2. 調整 SKILL.md（寫回範本）

第 5 步「寫回 MDX」的 `GeneratedFrame` 範本新增 `prompt`：

```mdx
<GeneratedFrame id="<id>" type="<type>" prompt={<JSON.stringify(prompt)>} caption="<選用>">
  <<PascalCaseId> client:visible />
</GeneratedFrame>
```

說明：`prompt` 採 JSON 字串化帶入，安全處理換行 / 引號 / 反引號 / `${`。

### 3. 調整 mdx-writer.md

- 「輸入」清單新增 `prompt`。
- 工作流程：寫回時把標記的 `prompt` 經 `JSON.stringify` 後帶入 `GeneratedFrame` 的 `prompt={...}`。

### 4. 回填既有筆記

為既有已使用 `GeneratedFrame` 的筆記補上 `prompt={...}`（prompt 取自各標記區塊）。可委派子代理依 mdx-writer 規則機械式處理（每個 frame 對應其上方標記的 prompt，JSON 字串化）。

## 驗收（對應 PRD 驗收表）

- [ ] 外框帶 `prompt` 時顯示「複製提示詞」按鈕，點擊複製原文並切換「已複製」
- [ ] 無 `prompt` 時不顯示按鈕
- [ ] 正式環境（build 後）按鈕存在且可複製
- [ ] mdx-writer 寫回帶入 `prompt={JSON 字串}`，含特殊字元也能 build / render
- [ ] SKILL.md / mdx-writer.md 同步更新
- [ ] `npx tsc --noEmit`（不含既有無關錯誤）與 `npx astro build` 通過

## 風險 / 備註

- 用隱藏 JSON script 節點承載 prompt 比超長 `data-` 屬性更穩健（引號 / 換行）。
- 事件委派避免每個外框重複注入 script；確保整頁只綁一次。
- `navigator.clipboard` 在非安全內容 / 權限不足時可能失敗 → 加 fallback 或 toast，不阻斷頁面。
- 提示詞會輸出到正式環境 HTML（已確認可公開）。
