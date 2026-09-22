// NoteCraft — sample notes. Content is a block array (simulating rendered MDX).
// Block types: h1, h2, h3, p, code, ul, ol, quote, marker (AI 標記區塊), viz (generated component)
// Note-level frontmatter `status`:  published（預設，已有內容）｜ empty（新建筆記初始畫面）｜ coming-soon（佔位畫面 + 彩蛋）
const NOTES = [
  {
    // ── 用來檢視三層 ToC（h2 / h3）的長篇筆記 ──
    slug: "http-caching",
    title: "HTTP 快取策略：從 Cache-Control 到 ETag",
    description: "一次搞懂瀏覽器與 CDN 如何決定「要不要重新抓」：新鮮度、驗證、以及各種快取層之間的協作。",
    tags: ["後端", "效能", "系統設計"],
    category: "backend",
    createdAt: "2026-06-16",
    updatedAt: "2026-06-16",
    content: [
      { t: "quote", c: "最快的請求，是不必發出的請求。HTTP 快取要解的正是「什麼時候可以不問伺服器」。" },
      { t: "p", c: "HTTP 快取的規則散落在多個標頭與多個角色之間（瀏覽器、代理、CDN、來源伺服器）。這篇依「新鮮度 → 驗證 → 分層」三個層次整理（H1），每一層再拆成幾個小節（H2），需要時再往下補細節（H3）。" },
      { t: "h1", c: "新鮮度：快取還能直接用嗎" },
      { t: "p", c: "第一個問題是快取副本是否仍「新鮮」。新鮮的副本可以直接回應，完全不用連線到來源伺服器。" },
      { t: "h2", c: "Cache-Control 指令" },
      { t: "p", c: "max-age 是最常見的新鮮度宣告，以秒為單位；s-maxage 只對共享快取（CDN、代理）生效，讓你能為瀏覽器與 CDN 設定不同的 TTL。" },
      { t: "code", lang: "http", c: "Cache-Control: public, max-age=60, s-maxage=3600\nCache-Control: private, no-cache\nCache-Control: no-store" },
      { t: "h3", c: "max-age 與 s-maxage" },
      { t: "p", c: "兩者同時出現時，共享快取以 s-maxage 為準、瀏覽器以 max-age 為準。常見組合是「CDN 快取一小時、瀏覽器只快取一分鐘」，兼顧回源成本與更新即時性。" },
      { t: "h3", c: "immutable" },
      { t: "p", c: "告訴瀏覽器「在新鮮期內連重新整理也不必驗證」。只適合檔名含雜湊的靜態資源。" },
      { t: "h2", c: "no-cache 與 no-store 的差別" },
      { t: "ul", c: [
        "no-cache：可以儲存，但每次使用前必須回源驗證。",
        "no-store：完全不得儲存，適用於含個資或一次性的回應。",
        "private：只允許瀏覽器等私有快取儲存，CDN 不得快取。",
      ] },
      { t: "h2", c: "啟發式新鮮度（Heuristic Freshness）" },
      { t: "p", c: "當回應沒有任何明確的新鮮度資訊、但帶有 Last-Modified 時，瀏覽器會自行推估 TTL（常見做法是「距上次修改時間的 10%」）。這是許多「明明改了卻沒更新」問題的來源，正式環境應永遠明確宣告。" },
      { t: "h1", c: "驗證：過期後如何便宜地確認" },
      { t: "p", c: "副本過期不代表要重下載。條件式請求讓伺服器能用一個 304 Not Modified 回答「你手上的還能用」。" },
      { t: "h2", c: "ETag 與 If-None-Match" },
      { t: "p", c: "ETag 是資源版本的不透明識別字串，通常是內容雜湊。瀏覽器重新驗證時把它放進 If-None-Match，伺服器比對後決定回 304 或新內容。" },
      { t: "code", lang: "http", hl: [4], c: "GET /api/report.json\nIf-None-Match: \"a3f9c1\"\n\nHTTP/1.1 304 Not Modified\nETag: \"a3f9c1\"\nCache-Control: max-age=0, must-revalidate" },
      { t: "h2", c: "Last-Modified 與 If-Modified-Since" },
      { t: "p", c: "以時間戳為基準的驗證方式，精度只到秒，且無法表達「內容相同但時間不同」的情況。與 ETag 同時存在時，伺服器應以 ETag 為主。" },
      { t: "h3", c: "多個 ETag 與萬用字元" },
      { t: "p", c: "If-None-Match 可以用逗號帶多個值，讓伺服器對任一版本命中即回 304；`*` 則常用在 If-Match 上，表達「只要資源存在就不要覆寫」。" },
      { t: "h2", c: "強驗證與弱驗證" },
      { t: "p", c: "以 W/ 開頭的弱 ETag 表示「語意相同即可」，允許伺服器在壓縮方式不同時仍回 304；強 ETag 則要求位元組完全一致，Range 請求只能搭配強驗證。" },
      { t: "h1", c: "分層：瀏覽器、CDN 與來源" },
      { t: "p", c: "實務上請求會經過多層快取，每層對標頭的解讀略有不同，也各有自己的失效手段。" },
      { t: "h2", c: "瀏覽器快取的兩個路徑" },
      { t: "p", c: "同分頁內的重新導覽會先查 memory cache，再查 disk cache。前者不檢查新鮮度、生命週期與分頁綁定；後者才遵守完整的 HTTP 規則。" },
      { t: "h2", c: "CDN 的 stale-while-revalidate" },
      { t: "p", c: "允許 CDN 在副本剛過期的一小段時間內先回舊內容、同時在背景回源更新。使用者幾乎感受不到延遲，來源伺服器也不會被瞬間打爆。" },
      { t: "code", lang: "http", c: "Cache-Control: max-age=600, stale-while-revalidate=60, stale-if-error=86400" },
      { t: "h3", c: "stale-if-error" },
      { t: "p", c: "來源伺服器回 5xx 或連不上時，允許 CDN 繼續提供過期副本，是最便宜的降級手段。" },
      { t: "h3", c: "Vary 與快取鍵" },
      { t: "p", c: "Vary: Accept-Encoding 會讓同一 URL 依請求標頭切成多份副本。Vary 越多、命中率越低；Vary: Cookie 或 User-Agent 幾乎等於關掉共享快取。" },
      { t: "h2", c: "主動失效：Purge 與版本化 URL" },
      { t: "p", c: "被動等待 TTL 過期不總是可行。兩條常見路徑：對 CDN 下 purge 指令，或直接把內容雜湊放進檔名（app.3f9c1.js），讓舊 URL 自然被淘汰、新 URL 可以放心設一年的 max-age。" },
      { t: "h1", c: "一張決策表" },
      { t: "ol", c: [
        "會變、且不能有半點舊資料 → no-store，或 no-cache 搭配 ETag。",
        "會變、但容忍幾秒鐘延遲 → 短 max-age 搭配 stale-while-revalidate。",
        "不會變（帶雜湊的靜態資源）→ public, max-age=31536000, immutable。",
      ] },
      { t: "quote", c: "先決定「舊資料可以容忍多久」，標頭只是把這個答案翻譯給每一層快取聽。" },
    ],
  },
  {
    // ── 新建筆記：status: empty → 顯示初始（onboarding）畫面 ──
    slug: "websocket-lifecycle",
    title: "WebSocket 連線生命週期",
    description: "",
    tags: ["前端", "WebSocket", "即時通訊"],
    category: "frontend",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
    status: "empty",
    content: [],
  },
  {
    // ── 規劃中：status: coming-soon → 顯示佔位插圖（內含彩蛋互動）──
    slug: "grpc-protobuf",
    title: "gRPC 與 Protocol Buffers",
    description: "用二進位協定與強型別 IDL，打造跨語言、低延遲的服務間通訊。",
    tags: ["後端", "RPC", "效能"],
    category: "backend",
    createdAt: "2026-06-08",
    updatedAt: "2026-06-14",
    status: "coming-soon",
    plan: ["四種服務方法定義", "HTTP/2 多工串流時序圖", "Protobuf 編碼大小對照"],
    content: [],
  },
  {
    slug: "role-and-responsibility",
    title: "角色與職責 R&R",
    description: "同一群人,在 Waterfall 與 Agile 底下權責流向天差地遠。R&R 要回答的是:每件事誰拍板、誰動手、誰被諮詢、誰只是被通知。",
    tags: ["產品管理", "團隊協作", "PM"],
    category: "pm",
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
    content: [
      { t: "quote", c: "R&R(角色與職責)要回答的不是「團隊有哪些頭銜」,而是「每件事誰拍板、誰動手、誰該被問、誰只是被通知」。" },
      { t: "p", c: "同一群人,在不同的開發方法論底下,權力與責任的流向其實天差地遠 —— 這也是 Waterfall 與 Agile 最深的分野。R&R 釐清的,正是「決策」與「執行」如何在團隊裡分配。" },
      { t: "h2", c: "Waterfall vs Agile：兩種權責結構" },
      { t: "p", c: "同樣是「帶團隊的人」,Waterfall 的 PM 站在指揮鏈頂端、由上而下指派;Agile 的 PO / SM 卻是站在外圍、服務一個自組織團隊。把這兩種結構並排,差異會比讀清單更有感 —— 點選任一角色查看完整職責:" },
      { t: "marker", id: "rr-structure", type: "interactive", status: "generated",
        prompt: "把 Waterfall 與 Agile 的角色結構並排成可互動對照圖:左欄畫成由上而下的指揮鏈(PM → System Architect → Development Team / QA Team),右欄畫成自組織圈(Development Team 在中央,PO 與 SM 在外圍以箭頭向內服務)。可切換權責流向動畫,點選任一角色於下方顯示完整職責。" },
      { t: "viz", id: "rr-structure" },
      { t: "h2", c: "常見的衍生角色" },
      { t: "p", c: "不一定每個團隊都會有,但中大型專案常會看到這些角色。點開每張卡片,看它在團隊裡補上的那塊專業:" },
      { t: "marker", id: "rr-derived-roles", type: "interactive", status: "generated",
        prompt: "把 Stakeholder、Tech Lead、UI/UX Designer、Domain Expert、QA Engineer、Data Engineer 六個衍生角色做成可展開的互動卡片,每張卡有領域標籤與 icon,點擊展開顯示職責。" },
      { t: "viz", id: "rr-derived-roles" },
      { t: "h2", c: "RACI Matrix" },
      { t: "p", c: "中大型專案常用 RACI Matrix 來明確每項任務「誰執行、誰負責、誰諮詢、誰知會」,避免責任歸屬不清。點選 R / A / C / I 聚焦同類角色,或點任一列拆解該任務的權責分工:" },
      { t: "marker", id: "rr-raci", type: "interactive", status: "generated",
        prompt: "把 PRD 撰寫、架構設計、UAT 驗收、上線核准 四項任務對 PM / PO / Tech Lead / QA 的 RACI 矩陣做成互動表:R/A/C/I 以顏色區分並可點擊聚焦,點列顯示權責分工句,並在每列標注「恰好 1 位 A」凸顯 A 的唯一性。" },
      { t: "viz", id: "rr-raci" },
      { t: "quote", c: "實務上要特別注意:A(最終負責人)只能有一個,否則責任會被稀釋,出事時容易互踢皮球。" },
    ],
  },
  {
    slug: "project-vs-product",
    title: "專案 V.S 產品",
    description: "同樣是 PM，在「專案」與「產品」情境下的思考重點其實不同：專案看重成果，產品看重價值。",
    tags: ["產品管理", "PM", "觀念"],
    category: "pm",
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
    content: [
      { t: "quote", c: "一句話總結：專案看重成果，產品看重價值。" },
      { t: "h2", c: "專案（Project）" },
      { t: "p", c: "需求明確、時間有限、資源有限、交付物明確，專案結束後就結束了，生命週期是有限的。PM 在專案中更關注的是「如期、如質、如預算」把東西交出去。" },
      { t: "h2", c: "產品（Product）" },
      { t: "p", c: "需求變化頻繁、持續迭代、持續交付，沒有明確的結束時間，會不斷優化與改進。PM（或 PO）在產品中更關注的是「這次迭代有沒有為用戶／商業帶來價值」。" },
      { t: "marker", id: "pm-project-vs-product-concept", type: "interactive", status: "generated",
        prompt: "重新設計成「可互動的同步模擬」：同一個時鐘下並排呈現專案與產品。左欄專案沿單一路徑前進（啟動→執行→交付物→結案），抵達結案後停止；右欄產品繞著「探索→打造→發布→學習」循環旋轉、永不結束，並持續累積價值。提供開始／暫停／重置控制，以及隨狀態變化的洞察文字。" },
      { t: "viz", id: "pm-project-vs-product-concept" },
      { t: "h2", c: "小結" },
      { t: "p", c: "同樣是 PM 的角色，在「專案」與「產品」的情境下，思考重點其實是不同的：" },
      { t: "marker", id: "pm-project-vs-product-table", type: "table", status: "generated",
        prompt: "把生命週期、衡量標準、需求變動、思考方式四列比較做成有色彩識別的強化比較表，欄頭「比較項目／專案（藍）／產品（橘）」，每列項目前加 lucide icon，偶數列 row striping，可橫向捲動。" },
      { t: "viz", id: "pm-project-vs-product-table" },
    ],
  },
  {
    slug: "oauth-2-pkce",
    title: "OAuth 2.0 與 PKCE 授權流程",
    description: "拆解 Authorization Code Flow，以及為什麼公開用戶端一定要加上 PKCE。",
    tags: ["資安", "後端", "認證"],
    category: "security",
    createdAt: "2026-06-02",
    updatedAt: "2026-06-11",
    content: [
      { t: "p", c: "OAuth 2.0 的 Authorization Code Flow 是目前最主流的授權方式。但在沒有後端、無法安全保存 client_secret 的環境（SPA、行動 App）中，授權碼一旦被攔截就可能被惡意換取 token。PKCE（Proof Key for Code Exchange）就是為此設計的延伸。" },
      { t: "h2", c: "三方角色與訊息順序" },
      { t: "p", c: "整個流程牽涉用戶端、授權伺服器與資源伺服器三者。與其用文字描述每一步，不如直接看一張時序圖：" },
      { t: "marker", id: "oauth-pkce-flow", type: "diagram", status: "generated",
        prompt: "用一張時序圖說明 OAuth 2.0 Authorization Code Flow，強調 PKCE 步驟，以及 client、auth server、resource server 三者之間的訊息順序。" },
      { t: "viz", id: "oauth-pkce-flow" },
      { t: "h2", c: "PKCE 的關鍵" },
      { t: "ul", c: [
        "用戶端先產生隨機 code_verifier，雜湊後得到 code_challenge。",
        "授權請求只帶 code_challenge；換 token 時才帶原始 code_verifier。",
        "授權伺服器驗證兩者吻合，確保「換 token 的人」就是「發起授權的人」。",
      ] },
      { t: "quote", c: "即使授權碼被攔截，攻擊者沒有 code_verifier 也無法換到 access_token。" },
      { t: "h2", c: "實作注意事項" },
      { t: "p", c: "code_verifier 建議使用 43–128 字元的高熵亂數，並以 S256（SHA-256）而非 plain 作為 challenge method。" },
      { t: "code", lang: "ts", c: "const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));\nconst challenge = base64url(await sha256(verifier));\n// 授權請求：?code_challenge=${challenge}&code_challenge_method=S256" },
    ],
  },
  {
    slug: "rate-limiting-token-bucket",
    title: "API 限流：Token Bucket 演算法",
    description: "用一個會動的桶子，直覺理解突發流量與平均速率的取捨。",
    tags: ["後端", "系統設計"],
    category: "backend",
    createdAt: "2026-05-28",
    updatedAt: "2026-06-10",
    content: [
      { t: "p", c: "限流（Rate Limiting）保護後端不被突發流量打垮。Token Bucket 是最常見的演算法之一，因為它同時能控制「平均速率」又允許一定程度的「突發」。" },
      { t: "h2", c: "運作方式" },
      { t: "p", c: "想像一個固定容量的桶子，系統以固定速率往桶裡放 token。每個請求進來時消耗一個 token；桶空了，請求就被拒絕（回 429）。動手玩玩看：" },
      { t: "marker", id: "token-bucket", type: "motion", status: "generated",
        prompt: "以可互動的動畫呈現 token bucket 限流演算法：桶子定速補充 token，按鈕送出請求消耗 token，桶空時請求被拒。" },
      { t: "viz", id: "token-bucket" },
      { t: "h2", c: "兩個關鍵參數" },
      { t: "ol", c: [
        "補充速率（refill rate）— 決定長期允許的平均 QPS。",
        "桶容量（capacity）— 決定一次能容忍多大的突發。",
      ] },
      { t: "p", c: "若把容量設為 1，Token Bucket 就退化成嚴格的固定速率限流；容量越大，越能吸收瞬間尖峰。" },
      { t: "code", lang: "ts", c: "function allow(bucket: Bucket, now: number): boolean {\n  refill(bucket, now);\n  if (bucket.tokens >= 1) { bucket.tokens -= 1; return true; }\n  return false; // 429 Too Many Requests\n}" },
    ],
  },
  {
    slug: "http-versions-performance",
    title: "HTTP/1.1 → HTTP/2 → HTTP/3 效能演進",
    description: "從隊頭阻塞到 QUIC，三代協定如何一步步榨出更低延遲。",
    tags: ["網路", "效能"],
    category: "network",
    createdAt: "2026-05-20",
    updatedAt: "2026-06-08",
    content: [
      { t: "p", c: "每一代 HTTP 協定都在解決上一代的瓶頸。理解它們的差異，能幫你判斷該不該升級基礎設施。" },
      { t: "h2", c: "效能對比" },
      { t: "p", c: "在同樣的網路條件下，三代協定的相對頁面載入時間差異相當明顯：" },
      { t: "marker", id: "http-latency", type: "chart", status: "generated",
        prompt: "用長條圖比較 HTTP/1.1、HTTP/2、HTTP/3 的相對頁面載入時間，並標註各自的關鍵技術。" },
      { t: "viz", id: "http-latency" },
      { t: "h2", c: "各代解決的問題" },
      { t: "ul", c: [
        "HTTP/1.1 — 一個連線一次只能處理一個請求，造成隊頭阻塞（Head-of-Line Blocking）。",
        "HTTP/2 — 在單一 TCP 連線上多工，並壓縮標頭，但仍受 TCP 層級的阻塞影響。",
        "HTTP/3 — 改用基於 UDP 的 QUIC，徹底擺脫 TCP 隊頭阻塞，並加速連線握手。",
      ] },
      { t: "quote", c: "在封包遺失率高的行動網路上，HTTP/3 的優勢最為顯著。" },
    ],
  },
  {
    slug: "react-rendering-fiber",
    title: "React 渲染機制與 Fiber 架構",
    description: "Render 與 Commit 兩階段、可中斷的協調，以及 key 為何重要。",
    tags: ["前端", "React"],
    category: "frontend",
    createdAt: "2026-06-05",
    updatedAt: "2026-06-09",
    content: [
      { t: "p", c: "React 的渲染分為 Render（協調，可中斷）與 Commit（套用到 DOM，不可中斷）兩階段。Fiber 架構讓 Render 階段可以被切片、暫停與恢復，是 Concurrent 特性的基礎。" },
      { t: "h2", c: "協調過程" },
      { t: "p", c: "這張狀態圖會在生成後說明 Fiber 如何在 work loop 中推進。" },
      { t: "marker", id: "fiber-states", type: "diagram", status: "pending",
        prompt: "用狀態圖呈現 React Fiber 的 work loop：beginWork → completeWork → commit，以及可中斷的 yield 點。" },
      { t: "h2", c: "為什麼需要穩定的 key" },
      { t: "p", c: "key 讓 React 在列表 diff 時辨識哪些節點是同一個，避免不必要的卸載與重建。用陣列索引當 key 在重排時會出錯。" },
      { t: "code", lang: "tsx", hl: [2], c: "// 好：穩定且唯一\nitems.map(item => <Row key={item.id} {...item} />)\n// 壞：重排時會錯亂\nitems.map((item, i) => <Row key={i} {...item} />)" },
    ],
  },
  {
    slug: "css-grid-guide",
    title: "CSS Grid 完全指南",
    description: "從 grid-template 到 subgrid，二維排版的心智模型。",
    tags: ["前端", "CSS"],
    category: "",
    createdAt: "2026-05-12",
    updatedAt: "2026-06-04",
    content: [
      { t: "p", c: "Flexbox 處理一維排列，Grid 則是真正的二維系統。當你需要同時控制行與列的對齊，Grid 幾乎總是更乾淨的選擇。" },
      { t: "h2", c: "核心概念" },
      { t: "ul", c: [
        "grid-template-columns / rows 定義軌道（track）。",
        "fr 單位按比例分配剩餘空間。",
        "gap 取代了過去用 margin 製造間距的繁瑣。",
        "minmax() 與 auto-fit / auto-fill 是響應式排版的關鍵。",
      ] },
      { t: "code", lang: "css", hl: [3], c: ".cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 1.5rem;\n}" },
      { t: "p", c: "搭配 minmax 與 auto-fit，這段就能讓卡片在容器變寬時自動增加欄數，不需任何媒體查詢。" },
    ],
  },
  {
    slug: "typescript-generics",
    title: "TypeScript 泛型進階",
    description: "條件型別、infer 與映射型別，把型別當程式寫。",
    tags: ["前端", "TypeScript"],
    category: "frontend",
    createdAt: "2026-05-30",
    updatedAt: "2026-06-03",
    content: [
      { t: "p", c: "泛型讓函式與型別能在「保留型別資訊」的前提下重複使用。進階起來，TypeScript 的型別系統幾乎是一門小型函數式語言。" },
      { t: "h2", c: "條件型別與 infer" },
      { t: "p", c: "下面這張圖會把 infer 在條件型別中如何「捕獲」型別參數視覺化。" },
      { t: "marker", id: "infer-flow", type: "free", status: "pending",
        prompt: "把 TypeScript 條件型別中 infer 的運作視覺化，例如 ReturnType<T> 如何從函式型別捕獲回傳型別。" },
      { t: "code", lang: "ts", c: "type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;\ntype A = ReturnType<() => string>; // string" },
    ],
  },
  {
    slug: "js-event-loop",
    title: "JavaScript Event Loop 與微任務",
    description: "call stack、macro/micro task 佇列，與 await 的真正時機。",
    tags: ["前端", "JavaScript"],
    category: "",
    createdAt: "2026-04-26",
    updatedAt: "2026-05-31",
    content: [
      { t: "p", c: "理解 Event Loop 是搞懂非同步行為的前提。關鍵在於：每跑完一個 macrotask，引擎會清空整個 microtask 佇列，才繼續下一個 macrotask。" },
      { t: "h2", c: "執行順序" },
      { t: "ol", c: [
        "同步程式碼先在 call stack 上跑完。",
        "Promise 的 .then / await 之後屬於 microtask，優先於 setTimeout。",
        "每個 macrotask 之間，microtask 佇列會被完全清空。",
      ] },
      { t: "code", lang: "js", c: "console.log('A');\nsetTimeout(() => console.log('B'));\nPromise.resolve().then(() => console.log('C'));\nconsole.log('D');\n// 輸出順序：A D C B" },
      { t: "quote", c: "microtask 永遠插隊在下一個 macrotask 之前。" },
    ],
  },
  {
    slug: "database-index-btree",
    title: "資料庫索引原理：B-Tree",
    description: "為什麼索引能把查詢從 O(n) 變 O(log n)，以及它的代價。",
    tags: ["後端", "資料庫"],
    category: "backend",
    createdAt: "2026-05-08",
    updatedAt: "2026-05-25",
    content: [
      { t: "p", c: "索引是用空間與寫入成本，換取讀取速度的經典取捨。大多數關聯式資料庫的預設索引結構是 B-Tree（更精確說是 B+Tree）。" },
      { t: "h2", c: "為什麼是 B-Tree" },
      { t: "p", c: "這張圖會說明 B+Tree 的多層結構，以及範圍查詢如何沿著葉節點的鏈結串列掃描。" },
      { t: "marker", id: "btree-structure", type: "diagram", status: "pending",
        prompt: "畫出 B+Tree 的結構：多層內部節點 + 葉節點鏈結串列，並標示一次點查詢的路徑與一次範圍查詢的掃描。" },
      { t: "ul", c: [
        "讀取：點查詢從根到葉只需 O(log n) 次節點存取。",
        "寫入：每次 insert / update 都要維護索引，增加成本。",
        "選擇性低的欄位（如布林）不適合單獨建索引。",
      ] },
      { t: "h2", c: "實際的表結構" },
      { t: "p", c: "下面這張圖不是寫在這篇筆記裡的 —— 它是專案裡的一份資料檔（planning/schema.json），由 er-diagram-renderer 這個 plugin 渲染後內嵌進來。改了那份 JSON，這裡與檢視頁會一起更新。" },
      { t: "dataembed", id: "trendmile-schema" },
    ],
  },
];

// ── Series（系列）— ordered chapters linking related notes ──
// 把相關筆記串成「系列」，提供系列總覽、閱讀進度彙總，以及筆記頁底的章節導覽。
// 封面採「色塊 + 圖示」：accent 決定漸層色系，icon 取 window.Icons 名稱。
const SERIES = [
  {
    id: "pm-mindset",
    title: "PM 思維入門",
    eyebrow: "PRODUCT SERIES",
    description: "從「專案 vs 產品」的根本差異，到團隊裡每個角色的權責流向，建立 PM 的底層思考框架。",
    accent: "orange",
    icon: "target",
    slugs: ["project-vs-product", "role-and-responsibility"],
  },
  {
    id: "frontend-internals",
    title: "前端底層運作",
    eyebrow: "FRONTEND SERIES",
    description: "Event Loop、Fiber 渲染、Grid 排版到 TypeScript 泛型 —— 拆開瀏覽器與框架的引擎蓋。",
    accent: "blue",
    icon: "code",
    slugs: ["js-event-loop", "react-rendering-fiber", "css-grid-guide", "typescript-generics"],
  },
  {
    id: "backend-systems",
    title: "後端與系統設計",
    eyebrow: "BACKEND SERIES",
    description: "HTTP 協定演進、限流演算法、資料庫索引與 OAuth 授權 —— 後端工程的核心系統設計題。",
    accent: "navy",
    icon: "layers",
    slugs: ["http-versions-performance", "rate-limiting-token-bucket", "database-index-btree", "view:trendmile-schema", "oauth-2-pkce"],
  },
];

function seriesById(id) { return SERIES.find((s) => s.id === id) || null; }

function noteBySlug(slug) { return NOTES.find((n) => n.slug === slug) || null; }

// ── note 狀態（frontmatter status）── 缺省視為 published（已有內容的一般筆記）
function noteStatus(note) { return (note && note.status) || "published"; }
function statusMeta(note) {
  const s = noteStatus(note);
  if (s === "empty") return { key: "empty", label: "草稿", tone: "neutral", icon: "edit" };
  if (s === "coming-soon") return { key: "coming-soon", label: "即將登場", tone: "orange", icon: "sparkle" };
  return null;
}

// slug 化（與 dev API 寫入 MDX 檔名一致）
function ncSlugify(s) {
  return (s || "").trim().toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50) || "untitled-note";
}

// 模擬 dev API：POST /api/notes 寫入含預設 frontmatter 的 MDX，並回傳新筆記物件。
function createNote({ title, tags, folder, status }) {
  const slug = ncSlugify(title);
  const note = {
    slug,
    title: (title || "").trim() || "未命名筆記",
    description: "",
    tags: (Array.isArray(tags) ? tags : String(tags || "").split(",")).map((t) => t.trim()).filter(Boolean),
    category: "",
    folder: folder || "src/content/notes/",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
    status: status || "empty",
    content: [],
  };
  NOTES.unshift(note);
  ncEmit();
  return note;
}

// 系列的一章可以是筆記（slug）或資料檔頁（"view:<id>"）。兩者一視同仁：
// 都有序號、都計入進度分母、都可被標記為已完成。
function seriesEntry(ref) {
  if (typeof ref === "string" && ref.indexOf("view:") === 0) {
    const f = (window.DATAFILES || []).find((d) => d.id === ref.slice(5));
    if (!f) return null;
    return { kind: "data", ref, id: f.id, title: f.title, description: f.description, file: f, note: null };
  }
  const n = noteBySlug(ref);
  return n ? { kind: "note", ref, id: n.slug, title: n.title, description: n.description, note: n, file: null } : null;
}

// 回傳某一章（筆記 slug 或 "view:<id>"）所屬系列的導覽資訊；不在任何系列則回傳 null。
function seriesOf(ref) {
  for (const s of SERIES) {
    const i = s.slugs.indexOf(ref);
    if (i === -1) continue;
    const chapters = s.slugs.map(seriesEntry).filter(Boolean);
    const j = chapters.findIndex((c) => c.ref === ref);
    return {
      series: s,
      index: j,
      total: chapters.length,
      chapters,
      prev: j > 0 ? chapters[j - 1] : null,
      next: j < chapters.length - 1 ? chapters[j + 1] : null,
    };
  }
  return null;
}

// derived helpers
function fmtDate(s) {
  const d = new Date(s + "T00:00:00");
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(s) {
  const ms = new Date("2026-06-12T00:00:00") - new Date(s + "T00:00:00");
  const d = Math.round(ms / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 週前`;
  return `${Math.floor(d / 30)} 個月前`;
}
function markersOf(note) {
  return note.content.filter((b) => b.t === "marker");
}
function allTags() {
  const m = {};
  NOTES.forEach((n) => n.tags.forEach((t) => { m[t] = (m[t] || 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function excerpt(note) {
  const p = note.content.find((b) => b.t === "p");
  return p ? p.c : note.description;
}

// ── mutable tag store (simulates dev API writing MDX frontmatter) ──
const _ncListeners = new Set();
function ncSubscribe(fn) { _ncListeners.add(fn); return () => _ncListeners.delete(fn); }
function ncEmit() { _ncListeners.forEach((fn) => fn()); }

function tagStats() {
  const m = {};
  NOTES.forEach((n) => n.tags.forEach((t) => {
    if (!m[t]) m[t] = { name: t, count: 0, lastUsed: "0000-00-00" };
    m[t].count += 1;
    if (n.updatedAt > m[t].lastUsed) m[t].lastUsed = n.updatedAt;
  }));
  return Object.values(m);
}
function notesWithTag(tag) { return NOTES.filter((n) => n.tags.includes(tag)); }

function addNoteTag(slug, raw) {
  const tag = (raw || "").trim();
  const n = NOTES.find((x) => x.slug === slug);
  if (!n || !tag) return { ok: false, reason: "empty" };
  if (n.tags.includes(tag)) return { ok: false, reason: "dup" };
  n.tags = [...n.tags, tag];
  n.updatedAt = "2026-06-12";
  ncEmit();
  return { ok: true };
}
function removeNoteTag(slug, tag) {
  const n = NOTES.find((x) => x.slug === slug);
  if (!n) return { ok: false };
  n.tags = n.tags.filter((t) => t !== tag);
  ncEmit();
  return { ok: true };
}
// rename (or merge when newName already exists). best-effort, no rollback.
function renameTag(oldName, newRaw) {
  const newName = (newRaw || "").trim();
  if (!newName || newName === oldName) return { ok: false };
  const affected = notesWithTag(oldName);
  const merged = NOTES.some((n) => n.tags.includes(newName));
  let done = 0;
  affected.forEach((n) => {
    n.tags = Array.from(new Set(n.tags.map((t) => (t === oldName ? newName : t))));
    done += 1;
  });
  ncEmit();
  return { ok: true, affected: affected.length, done, failed: affected.length - done, merged, oldName, newName };
}
function deleteTag(name) {
  const affected = notesWithTag(name);
  let done = 0;
  affected.forEach((n) => { n.tags = n.tags.filter((t) => t !== name); done += 1; });
  ncEmit();
  return { ok: true, affected: affected.length, done, failed: affected.length - done, name };
}

// ─────────────────── 閱讀進度（個人狀態，存於 localStorage）───────────────────
// 狀態：not-started（待開始）→ reading（閱讀中）→ done（已完成）。
// 未發佈筆記（empty / coming-soon）不可追蹤、不計入系列進度（回傳 "unpublished"）。
const NC_PROGRESS_KEY = "nc-reading-progress-v1";
function _loadProgress() {
  try { return JSON.parse(localStorage.getItem(NC_PROGRESS_KEY)) || {}; } catch (e) { return {}; }
}
let _progress = _loadProgress();
function _saveProgress() {
  try { localStorage.setItem(NC_PROGRESS_KEY, JSON.stringify(_progress)); } catch (e) {}
}

function isTrackable(note) { return !!note && noteStatus(note) === "published"; }

function readingStatus(slug) {
  const n = noteBySlug(slug);
  if (n && !isTrackable(n)) return "unpublished";
  return _progress[slug] || "not-started";
}
function setReadingStatus(slug, status) {
  const n = noteBySlug(slug);
  if (n && !isTrackable(n)) return;
  if (status === "not-started") delete _progress[slug];
  else _progress[slug] = status;
  _saveProgress();
  ncEmit();
}
// 手動為主；開啟筆記時的輕量自動轉換：待開始 → 閱讀中（永不降級）。
function markReading(slug) {
  if (readingStatus(slug) === "not-started") setReadingStatus(slug, "reading");
}

function readingMeta(status) {
  switch (status) {
    case "done": return { key: "done", label: "已完成", tone: "success", icon: "circleCheck" };
    case "reading": return { key: "reading", label: "閱讀中", tone: "blue", icon: "bookOpen" };
    case "unpublished": return { key: "unpublished", label: "未發佈", tone: "neutral", icon: "clock" };
    default: return { key: "not-started", label: "待開始", tone: "neutral", icon: "circle" };
  }
}

// 系列進度彙總。只把「已發佈」章節計入分母（tracked）；資料檔頁一律可追蹤。
function seriesProgress(series) {
  const chapters = series.slugs.map(seriesEntry).filter(Boolean);
  const trackableEntry = (c) => (c.kind === "data" ? true : isTrackable(c.note));
  const statuses = chapters.map((c) => ({ entry: c, note: c.note, status: readingStatus(c.ref) }));
  const tracked = chapters.filter(trackableEntry);
  const done = tracked.filter((c) => readingStatus(c.ref) === "done").length;
  const reading = tracked.filter((c) => readingStatus(c.ref) === "reading").length;
  const notStarted = tracked.length - done - reading;
  const pct = tracked.length ? Math.round((done / tracked.length) * 100) : 0;
  const completed = tracked.length > 0 && done === tracked.length;
  const started = done + reading > 0;
  // 下一章：優先閱讀中，其次第一個待開始；全完成則回到首章供重讀。
  const next =
    tracked.find((c) => readingStatus(c.ref) === "reading") ||
    tracked.find((c) => readingStatus(c.ref) === "not-started") ||
    chapters[0] || null;
  return { chapters, statuses, total: chapters.length, tracked: tracked.length,
    done, reading, notStarted, pct, completed, started, next };
}
function resetSeriesProgress(series) {
  series.slugs.forEach((s) => { delete _progress[s]; });
  _saveProgress();
  ncEmit();
}

Object.assign(window, { NOTES, SERIES, noteBySlug, seriesById, seriesOf, seriesEntry, fmtDate, daysAgo, markersOf, allTags, excerpt,
  noteStatus, statusMeta, ncSlugify, createNote,
  tagStats, notesWithTag, addNoteTag, removeNoteTag, renameTag, deleteTag, ncSubscribe, ncEmit,
  readingStatus, setReadingStatus, markReading, readingMeta, seriesProgress, resetSeriesProgress, isTrackable });
