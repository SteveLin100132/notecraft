(() => {
// 範例資料：與 schema.json v1.2 同形（新增 schemas 層、各層 description 為 Markdown）
const c = (name, type, required, x = {}) => ({ name, type, required, ...x });
const PK = c('id', 'bigint', 'system', { default: 'identity', pk: true, note: '代理主鍵' });
const AUDIT = [
  c('created_at', 'timestamptz', 'system', { default: 'now()', note: '建立時間' }),
  c('updated_at', 'timestamptz', 'system', { derivation: 'trigger', note: '最後更新時間，trigger 維護' }),
];

const ER_SAMPLE = {
  $schema: '../schema.json',
  meta: {
    title: 'TrendMile 業務系統 schema',
    source: '業務系統規格書 v3.2 §2',
    backTo: '/notes/trendmile/spec',
    description: `業務系統的資料庫結構，涵蓋**客戶經營 → 報價簽約 → 開票收款**的完整流程，以及各模組共用的選項與組織主檔。

## 閱讀順序
1. 先看 \`crm\`：客戶與案件是所有業務資料的起點
2. 再看 \`sales\`：合約從案件或報價轉入，發票掛在合約下
3. \`core\` 是共用主檔，被幾乎每張表指向，Diagram 預設收起它的連線

## 命名慣例
- 主鍵一律 \`id bigint identity\`，外鍵以 \`<父表>_id\` 命名
- 金額欄一律 \`numeric(12,0)\`，新台幣不留小數
- 軟刪除用 \`archived_at\`，不做實體刪除

> 2026-09-01 決議：行政區不做，縣市層即可。`,
  },
  options: {
    defaultRows: 6,
    hubTables: ['option_item'],
    sectionPrefix: '§',
    hint: '點一張表可聚焦它的關聯，其餘變淡；再點一次、點空白處或按 Esc 取消。',
    searchPlaceholder: '搜尋表名或欄位名（例：quotation、case_id）',
  },
  requirement: [
    { key: 'required', label: '必填', marker: 'solid' },
    { key: 'condition', label: '條件', marker: 'half', title: '條件必填，條件見說明' },
    { key: 'nullable', label: '可空', marker: 'hollow' },
    { key: 'system', label: '系統', marker: 'muted', title: '系統維護，應用層不可寫入' },
  ],
  flags: [
    { key: 'pk', badge: 'PK', tone: 'danger', label: '主鍵' },
    { key: 'fk', badge: 'FK', tone: 'info', label: '外鍵' },
    { key: 'unique', badge: 'UQ', tone: 'success', label: '唯一' },
    { key: 'index', badge: 'IX', tone: 'neutral', label: '索引' },
  ],
  derivations: [
    { key: 'generated', badge: 'GEN', label: '資料庫計算欄' },
    { key: 'trigger', badge: 'TRG', label: '由 trigger 維護' },
    { key: 'encrypted', badge: 'ENC', label: '加密儲存' },
  ],
  schemas: [
    { key: 'crm', label: '客戶關係', description: `客戶主檔與業務案件。一個客戶可有多位聯絡人、多個地址，案件記錄從接洽到結案的每一次活動。

案件結案後才可轉為合約，轉換邏輯見 \`sales\`。` },
    { key: 'sales', label: '合約與帳務', description: `報價、合約、發票與收款。

- 合約可由案件轉入，也可直接建立（\`contract.case_id\` 為空）
- 合約總額由明細加總，trigger 維護，應用層不可寫
- 一張發票只對一份合約；分期收款以多筆 \`payment\` 表達` },
    { key: 'core', label: '主系統', description: `跨模組共用的選項與組織資料。\`option_item\` 是 hub 表，被十幾個欄位指向，Diagram 預設收起它的連線。` },
  ],
  groups: [
    { key: 'customer', label: '客戶', schema: 'crm', description: '客戶本體與其聯絡資訊。' },
    { key: 'case', label: '案件與派案', schema: 'crm', description: '業務案件與活動紀錄，是合約的上游。' },
    { key: 'contract', label: '報價與合約', schema: 'sales' },
    { key: 'billing', label: '開票與收款', schema: 'sales' },
    { key: 'org', label: '組織', schema: 'core' },
    { key: 'option', label: '選項主檔', schema: 'core' },
  ],
  layout: {
    columns: [
      { key: 'c1', groups: ['customer'] },
      { key: 'c2', groups: ['case'] },
      { key: 'c3', groups: ['contract', 'billing'] },
      { key: 'c4', groups: ['org', 'option'] },
    ],
  },
  tables: [
    { name: 'customer', label: '客戶主檔', section: '2.1', group: 'customer',
      description: `一筆客戶即一個法人或自然人。\`name\` 原本是合約標題，§4 #1 決議從合約拆出成獨立主檔。

統一編號可空：個人客戶沒有統編，但同一統編不得重複。`,
      columns: [PK,
        c('name', 'varchar(120)', 'required', { index: true, note: '公司名稱；§4 #1 從合約拆出' }),
        c('tax_id', 'char(8)', 'nullable', { unique: true, note: '統一編號，個人客戶為空' }),
        c('company_city_id', 'bigint', 'nullable', { fk: 'option_item', note: '縣市，type_code＝地區' }),
        c('industry_id', 'bigint', 'nullable', { fk: 'option_item', note: '產業類別' }),
        c('owner_id', 'bigint', 'required', { fk: 'employee', index: true, note: '負責業務' }),
        c('employee_count', 'integer', 'nullable', { note: '公司員工總數' }),
        c('invoice_title', 'varchar(120)', 'nullable', { note: '發票抬頭' }),
        c('archived_at', 'timestamptz', 'nullable', { note: '軟刪除時間' }),
        ...AUDIT] },
    { name: 'customer_contact', label: '聯絡人子表', section: '2.1', group: 'customer',
      description: '客戶底下的聯絡窗口。電話與 email 為個資，匯出報表時需遮罩。',
      columns: [PK,
        c('customer_id', 'bigint', 'required', { fk: 'customer', index: true, note: '所屬客戶' }),
        c('name', 'varchar(60)', 'required', { note: '聯絡人姓名', pii: true }),
        c('title', 'varchar(60)', 'nullable', { note: '職稱' }),
        c('phone', 'varchar(30)', 'nullable', { pii: true, derivation: 'encrypted', note: '聯絡電話，加密儲存' }),
        c('email', 'varchar(120)', 'nullable', { pii: true, note: '電子郵件' }),
        c('is_primary', 'boolean', 'required', { default: 'false', note: '主要聯絡人；每位客戶至多一位' })] },
    { name: 'customer_address', label: '客戶地址', section: '2.1', group: 'customer',
      columns: [PK,
        c('customer_id', 'bigint', 'required', { fk: 'customer', index: true, note: '所屬客戶' }),
        c('kind_id', 'bigint', 'required', { fk: 'option_item', note: '地址類型：登記／通訊／帳寄' }),
        c('city_id', 'bigint', 'required', { fk: 'option_item', note: '縣市' }),
        c('line', 'varchar(200)', 'required', { note: '詳細地址' })] },
    { name: 'biz_case', label: '案件主檔', section: '2.12', group: 'case',
      description: `業務從接洽到結案的單位。\`stage\` 走固定流程：接洽 → 需求確認 → 報價 → 結案。

結案分「成交」與「流失」，流失時 \`lost_reason_id\` 必填。成交的案件由業務手動轉為合約。`,
      columns: [PK,
        c('case_no', 'varchar(20)', 'system', { unique: true, derivation: 'generated', note: '案件編號，依年度流水配號' }),
        c('customer_id', 'bigint', 'required', { fk: 'customer', index: true, note: '所屬客戶' }),
        c('owner_id', 'bigint', 'required', { fk: 'employee', index: true, note: '承辦業務' }),
        c('stage', 'case_stage', 'required', { default: "'接洽'", note: '目前階段' }),
        c('source_id', 'bigint', 'nullable', { fk: 'option_item', note: '案件來源' }),
        c('lost_reason_id', 'bigint', 'condition', { fk: 'option_item', note: '結案原因；stage＝流失時必填' }),
        c('expected_amount', 'numeric(12,0)', 'nullable', { note: '預估金額' }),
        ...AUDIT] },
    { name: 'case_activity', label: '案件活動', section: '2.13', group: 'case',
      description: '拜訪、電話、會議等每次接觸的紀錄，依時間倒序顯示於案件頁。',
      columns: [PK,
        c('case_id', 'bigint', 'required', { fk: 'biz_case', index: true, note: '所屬案件' }),
        c('actor_id', 'bigint', 'required', { fk: 'employee', note: '記錄者' }),
        c('kind_id', 'bigint', 'required', { fk: 'option_item', note: '活動類型' }),
        c('happened_at', 'timestamptz', 'required', { index: true, note: '發生時間' }),
        c('summary', 'text', 'required', { note: '內容摘要' })] },
    { name: 'quotation', label: '報價單', section: '2.3', group: 'contract',
      description: '案件在「報價」階段產生的報價單。同一案件可有多版報價，以 `version` 區分，最新一版才可轉合約。',
      columns: [PK,
        c('case_id', 'bigint', 'required', { fk: 'biz_case', index: true, note: '所屬案件' }),
        c('version', 'smallint', 'required', { default: '1', note: '版次；(case_id, version) 唯一' }),
        c('valid_until', 'date', 'required', { note: '報價有效期限' }),
        c('amount', 'numeric(12,0)', 'system', { derivation: 'trigger', note: '由報價明細加總' }),
        c('approved_by', 'bigint', 'condition', { fk: 'employee', note: '核准主管；金額超過 50 萬時必填' })] },
    { name: 'contract', label: '合約主檔', section: '2.2', group: 'contract',
      description: `簽約後的正式合約。可由案件轉入，也可直接建立。

\`total_amount\` 由 \`contract_item\` 加總，trigger 維護；應用層寫入會被拒絕。`,
      columns: [PK,
        c('contract_no', 'varchar(20)', 'system', { unique: true, derivation: 'generated', note: '合約編號' }),
        c('customer_id', 'bigint', 'required', { fk: 'customer', index: true, note: '所屬客戶' }),
        c('case_id', 'bigint', 'nullable', { fk: 'biz_case', note: '來源案件；直接建約時為空' }),
        c('quotation_id', 'bigint', 'nullable', { fk: 'quotation', note: '依據的報價單' }),
        c('sign_item_id', 'bigint', 'condition', { fk: 'option_item', note: '簽約項目，條件見 §4 #4' }),
        c('pay_method_id', 'bigint', 'nullable', { fk: 'option_item', note: '付款方式' }),
        c('signed_on', 'date', 'required', { index: true, note: '簽約日' }),
        c('total_amount', 'numeric(12,0)', 'system', { derivation: 'trigger', note: '由合約明細加總，trigger 維護' }),
        ...AUDIT] },
    { name: 'contract_item', label: '合約明細', section: '2.2', group: 'contract',
      columns: [PK,
        c('contract_id', 'bigint', 'required', { fk: 'contract', index: true, note: '所屬合約' }),
        c('service_id', 'bigint', 'required', { fk: 'option_item', note: '服務項目' }),
        c('qty', 'integer', 'required', { default: '1', note: '數量' }),
        c('unit_price', 'numeric(12,0)', 'required', { note: '單價' }),
        c('subtotal', 'numeric(12,0)', 'system', { derivation: 'generated', note: 'qty × unit_price' })] },
    { name: 'invoice', label: '發票', section: '2.5', group: 'billing',
      description: '一張發票只對一份合約。作廢不刪除，改以 `voided_at` 標記。',
      columns: [PK,
        c('invoice_no', 'char(10)', 'required', { unique: true, note: '發票號碼' }),
        c('contract_id', 'bigint', 'required', { fk: 'contract', index: true, note: '所屬合約' }),
        c('issued_on', 'date', 'required', { index: true, note: '開立日' }),
        c('amount', 'numeric(12,0)', 'required', { note: '含稅金額' }),
        c('tax', 'numeric(12,0)', 'system', { derivation: 'generated', note: '營業稅 5%' }),
        c('voided_at', 'timestamptz', 'nullable', { note: '作廢時間' })] },
    { name: 'payment', label: '收款紀錄', section: '2.6', group: 'billing',
      description: '分期收款以多筆紀錄表達。累計收款等於發票金額時，發票狀態自動轉為已收訖。',
      columns: [PK,
        c('invoice_id', 'bigint', 'required', { fk: 'invoice', index: true, note: '對應發票' }),
        c('received_on', 'date', 'required', { note: '入帳日' }),
        c('amount', 'numeric(12,0)', 'required', { note: '本次金額' }),
        c('method_id', 'bigint', 'required', { fk: 'option_item', note: '收款方式' }),
        c('bank_ref', 'varchar(40)', 'nullable', { derivation: 'encrypted', note: '銀行交易序號，加密儲存' })] },
    { name: 'department', label: '部門', section: '1.2', group: 'org',
      columns: [PK,
        c('code', 'varchar(20)', 'required', { unique: true, note: '部門代碼' }),
        c('name', 'varchar(60)', 'required', { note: '部門名稱' }),
        c('parent_id', 'bigint', 'nullable', { fk: 'department', note: '上層部門' })] },
    { name: 'employee', label: '員工', section: '1.1', group: 'org',
      description: '系統使用者與業務承辦人。離職員工保留紀錄，以 `left_on` 標記。',
      columns: [PK,
        c('emp_no', 'varchar(12)', 'required', { unique: true, note: '員工編號' }),
        c('name', 'varchar(60)', 'required', { pii: true, note: '姓名' }),
        c('department_id', 'bigint', 'required', { fk: 'department', index: true, note: '所屬部門' }),
        c('email', 'varchar(120)', 'required', { unique: true, pii: true, note: '登入帳號' }),
        c('left_on', 'date', 'nullable', { note: '離職日' })] },
    { name: 'option_type', label: '選項集合', section: '1.3', group: 'option',
      columns: [PK,
        c('code', 'varchar(40)', 'required', { unique: true, note: '集合代碼，如 地區、產業' }),
        c('label', 'varchar(80)', 'required', { note: '顯示名稱' }),
        c('hierarchical', 'boolean', 'required', { default: 'false', note: '是否支援階層' })] },
    { name: 'option_item', label: '選項項目', section: '1.3', group: 'option',
      description: `所有下拉選項的共用主檔。以 \`type_code\` 區分集合，\`parent_id\` 支援階層（縣市 → 行政區，目前只用到縣市層）。

被系統中大多數表指向，是本 schema 唯一的 hub 表。`,
      columns: [PK,
        c('type_code', 'varchar(40)', 'required', { fk: 'option_type', index: true, note: '所屬選項集合' }),
        c('code', 'varchar(40)', 'required', { unique: true, note: '選項代碼' }),
        c('label', 'varchar(80)', 'required', { note: '顯示名稱' }),
        c('parent_id', 'bigint', 'nullable', { fk: 'option_item', note: '上層選項' }),
        c('sort_order', 'smallint', 'nullable', { note: '排序' })] },
  ],
};

window.ER_SAMPLE = ER_SAMPLE;

})();
