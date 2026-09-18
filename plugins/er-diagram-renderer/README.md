# ER Diagram Renderer

把一份資料庫 schema JSON 渲染成可聚焦、可搜尋的實體關聯圖。

## 它畫出什麼

- **固定欄數的版面**：模組分群由上而下堆疊，欄序自己指定 —— 相鄰欄放關係密切的模組，
  多數外鍵就只跨一欄，連線不必繞遠路
- **關聯連線**：由欄位的 `fk` 推導，量測卡片實際位置後畫貝茲曲線
- **聚焦**：點一張表，它的父表與子表保持清晰、其餘變淡，並列出「指向 N 張父表、被 M 張子表指向」
- **搜尋**：比對表名、表的中文標籤與欄位名，附命中數（沒有這個數字，「查不到」與「沒在查」長得一樣）
- **hub 表收折**：被極多張表指向的共用表（例：選項主檔），連線預設收起 ——
  不收的話整張圖會被它的放射狀線條蓋滿
- **全寬檢視**：內嵌在筆記裡時，可把整張圖搬進覆蓋層攤開（獨立頁本來就是全寬，不提供這顆按鈕）

## 資料長什麼樣

完整規格見 [schema.json](./schema.json)，可跑的範例見 [example/schema.json](./example/schema.json)。

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/SteveLin100132/notecraft/main/plugins/er-diagram-renderer/schema.json",
  "meta": { "title": "…", "description": "…", "backTo": "/notes/…" },
  "options": { "defaultRows": 6, "hubTables": ["option_item"] },

  // 語彙都是資料，不是寫死的 —— 換個專案可以改叫法
  "requirement": [{ "key": "required", "label": "必填", "marker": "solid" }],
  "flags":       [{ "key": "pk", "badge": "PK", "tone": "danger", "label": "主鍵" }],
  "derivations": [{ "key": "trigger", "badge": "TRG", "label": "由 trigger 維護" }],

  "groups": [{ "key": "customer", "label": "客戶" }],
  "layout": { "columns": [{ "key": "c1", "groups": ["customer"] }] },

  "tables": [{
    "name": "customer", "label": "客戶主檔", "section": "2.1", "group": "customer",
    "columns": [
      { "name": "id", "type": "bigint", "required": "system", "pk": true, "note": "代理主鍵" },
      { "name": "industry_id", "type": "bigint", "required": "nullable", "fk": "option_item", "note": "產業類別" }
    ]
  }]
}
```

**關聯不要另外存一份。** `edges` 由 `columns[].fk` 推導 —— 存了就會有兩份真相，改一邊忘另一邊。

## 安裝與使用

```bash
npx notecraftapp install-plugin er-diagram-renderer
```

然後在 `.notecraft/plugins.json` 加一條映射：

```json
{ "plugins": [{ "plugin": "er-diagram-renderer", "files": ["**/*.er.json"] }] }
```

`plugins.json` 的 `options` 會覆蓋資料檔自帶的 `options` —— 同一份資料被不同專案引用時，
覆寫權在引用的人手上。

## 從寫死資料的舊元件遷移

若你已經有一支「資料寫死在 tsx 裡」的 ER 元件，用轉檔腳本一次轉出來：

```bash
node scripts/er-schema-from-tsx.mjs <舊元件.tsx> <輸出.json> --title "…" --back "/notes/…"
```

它會抽出表定義與版面、把短鍵轉成長鍵、把每張表重複一份的 `groupLabel` 正規化成頂層 `groups`，
並補上原本寫死在程式裡的語彙。檔案會變大約 1.6 倍 —— 那是為可讀性付的錢，
壓縮過的短鍵 JSON 人改不動、AI 也難產。
