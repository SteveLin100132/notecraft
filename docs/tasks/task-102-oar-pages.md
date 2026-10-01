# Task 102 — 四種頁面：總覽、Tag、Operation、Schema

> 規格 [notecraft-openapi-renderer.md](../notecraft-openapi-renderer.md) §5.5、§8.3。
> 設計交付 README〈3. 總覽頁〉〈4. Tag 頁〉〈5. Operation 頁〉〈6. Schema 頁〉〈資料狀態〉；對照 `prototype/oa/oa-pages.jsx` 的 `OaOverview`／`OaTagPage`／`OaOpPage`／`OaSchemaPage`。
> 依賴 [Task 101](task-101-oar-shell-nav-routing.md)。

## 為什麼這一步要單獨做

Operation 頁是整個 plugin 的主角，內容最密（參數四組、body 並排、回應分頁、範例請求）。四種頁面共用 Wiki 頁首、h2、Operations 清單與空狀態格式，一起做才能保持一致。

## 範圍

### 1. 共用（`pages.tsx` 內）

- Wiki 頁首：eyebrow → h1 → meta 列 → Markdown（數值對照 ER `styles.ts`）
- h2 + 數量膠囊；`data-sec` 區段標記供捲動同步
- `OpList`：grid `44px | 1.2fr | 1fr | auto`，第三欄可換成「位置」（Schema 頁用）
- `EmptyHint`：缺什麼 + spec 欄位路徑（`paths["/pet"].post.description`、`tags[name="pet"].description`、`components.schemas.Pet.description`、`info.description`）

### 2. 總覽頁

- 3.2／未知 3.x：頂端警示框（handoff 文案）
- 規模長條（點 → Tag 頁）、tag 表（數量長條、method 分布文字化）、伺服器（複製；缺 → 空狀態）、驗證方式（apiKey／http／oauth2 細節）
- 極小模式：Operations 清單 + Schemas chips，不顯示 tag 數與規模長條

### 3. Tag 頁

eyebrow `TAG` → h1 → meta + method 分布 → description（缺／未分類的文案）→ `OpList`。

### 4. Operation 頁

- crumbs、頁首（`Method lg` + `PathText interactive`；點 `{param}` → 捲到 `#param-path-<name>` 並閃橘底 1.2s）、summary／已棄用、meta 列（operationId 或「未設定」、驗證 chips 以「或」分隔、`security: []` →「不需驗證」、複製 path／連結）、deprecated 說明列、description
- **參數**：依 `in` 分四組，`colt` 表（`table-layout: fixed`、外層 `overflow-x: auto`）；deprecated 參數刪除線
- **Request Body**：content-type 切換 → `MediaSplit`（左 `SchemaTree`、右 `ExampleBox` sticky `top: 56px`）；XML／form／binary 的框底註記
- **Responses**：status 分頁（預設第一個 2xx；`route.sub` 指定時選該 status 並捲入）、回應標頭小表、多 content-type 切換、無 body 文案
- **範例請求**：`CodeBox`，cURL／fetch 分段（`localStorage` `oar:v1:lang`，SSR 與首次 render 用 `curl`、`useEffect` 後讀；讀寫包 `try/catch`）、多 server 下拉（預設 `options.server ?? 0`）、框底說明
- 「複製連結」：`location.origin + location.pathname + hash`
- 換 op 時重設 `ct`／`code`／範例選擇

### 5. Schema 頁

crumbs → h1 + `title` + 複製 schema JSON／連結 → meta（type、欄位數、必填數、被 N 支使用、自我參照）→ description → 欄位（`MediaSplit`）→ 被哪些 operation 使用（直接／間接兩段；無 → 文案）→ 參照關係兩欄（自我／互相參照標記）。

## 不做

- 窄版排版（Task 104）；embed（Task 103）

## 驗收

逐條走 handoff〈資料狀態〉1–10（用三份 example 與本機極大 spec），另：

- [ ] orders `createOrder`：body 深巢狀「深入」、400 的 json／problem+json 切換、409 深連結 `#op/createOrder/responses/409`
- [ ] orders `listOrders`：200 json／text/csv 切換；csv 顯示「這裡以 JSON 呈現結構」類註記（依 handoff 文案）
- [ ] Petstore（3.2）：bar 警示膠囊、總覽警示框、`query` method 中性色
- [ ] 長 path `/v1/organizations/{orgId}/members/{memberId}/roles`：頁首換行不截斷、`{orgId}` 點了捲到參數表
- [ ] cURL／fetch 切換後 reload 保留；隱私視窗（localStorage 拋錯）不白屏
- [ ] 所有複製按鈕回饋正常；dev console 零 hydration warning
- [ ] `npm run check:oar`、`npm run check-plugins` 通過；`npx tsc --noEmit && npx astro build` 通過，tsc 錯誤數不增加

## 實作記錄（2026-10-01）

- 列表、tag 表、參照列、型別 chip 都是 `<a>`（`LinkCtx` 攔下點擊走元件內路由），中鍵與複製連結有真的 href
- `OpPage` 以 `key={op.key}` 掛載，換 op 時 content-type／status／範例選擇自然重設
- 深連結 `#op/x/responses/409`：選中該 status 並捲到 Responses **標題**（section 本身沒有 scroll-margin，會躲在 sticky bar 下）
- 「被哪些 operation 使用」直接與間接同一清單、中間分隔列（照 prototype）
- `text/csv` 等非 JSON 回應：框底註明「`<ct>` 依 schema 序列化，這裡以 JSON 呈現結構」
- 實測：orders 的 createOrder（深入 `items[].options.gift`、allOf 來源、anyOf 切換）、409 深連結、`{orgId}` 點了捲到參數列並閃橘底、Category 自我參照、Petstore 3.2 警示、health 極小、Swagger 2.0 轉檔卡
