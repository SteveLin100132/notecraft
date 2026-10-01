// 工作台改版 — 靜態示意資料
const WB_SERIES = [
  { id: "pm", name: "PM 思維入門", color: "#ed9b26", total: 6, done: 4 },
  { id: "fe", name: "前端底層運作", color: "#2c6ebb", total: 8, done: 3 },
  { id: "be", name: "後端與系統設計", color: "#163f7d", total: 7, done: 5 },
  { id: "sec", name: "資安與網路", color: "#6c798e", total: 5, done: 1 },
];
const WB_FOLDERS = [
  { id: "fe", name: "01-前端", count: 14, depth: 0, open: true, children: [
    { id: "fe-react", name: "react", count: 6, depth: 1 },
    { id: "fe-css", name: "css-layout", count: 4, depth: 1 },
    { id: "fe-ts", name: "typescript", count: 4, depth: 1 },
  ] },
  { id: "be", name: "02-後端", count: 11, depth: 0 },
  { id: "pm", name: "03-產品管理", count: 8, depth: 0 },
  { id: "net", name: "04-資安與網路", count: 6, depth: 0 },
  { id: "inbox", name: "inbox", count: 3, depth: 0 },
];
// ai: [已生成, 待生成]
const WB_NOTES = [
  { t: "React 渲染機制與 Fiber 架構", p: "01-前端/react/react-rendering-fiber.mdx", g: "01-前端", s: "fe", tags: ["前端", "React"], ai: [3, 0], d: "06/16", w: 2840 },
  { t: "useEffect 的相依陣列與清理時機", p: "01-前端/react/use-effect-deps.mdx", g: "01-前端", s: "fe", tags: ["React"], ai: [1, 2], d: "06/16", w: 1620 },
  { t: "CSS Grid 完全指南", p: "01-前端/css-layout/css-grid-guide.mdx", g: "01-前端", s: "fe", tags: ["前端", "CSS"], ai: [2, 0], d: "06/15", w: 3120 },
  { t: "Container Query 的落地策略", p: "01-前端/css-layout/container-query.mdx", g: "01-前端", s: null, tags: ["CSS"], ai: [0, 1], d: "06/14", w: 980 },
  { t: "TypeScript 泛型進階", p: "01-前端/typescript/typescript-generics.mdx", g: "01-前端", s: "fe", tags: ["TypeScript"], ai: [2, 0], d: "06/12", w: 2450 },
  { t: "JavaScript Event Loop 與微任務", p: "01-前端/js-event-loop.mdx", g: "01-前端", s: "fe", tags: ["JavaScript"], ai: [4, 0], d: "06/11", w: 2980 },
  { t: "WebSocket 連線生命週期", p: "01-前端/websocket-lifecycle.mdx", g: "01-前端", s: null, tags: ["WebSocket", "即時通訊"], ai: [0, 0], d: "06/10", w: 0, nofm: true },
  { t: "API 限流：Token Bucket 演算法", p: "02-後端/rate-limiting-token-bucket.mdx", g: "02-後端", s: "be", tags: ["系統設計"], ai: [2, 1], d: "06/09", w: 2210 },
  { t: "資料庫索引原理：B-Tree", p: "02-後端/database-index-btree.mdx", g: "02-後端", s: "be", tags: ["資料庫"], ai: [3, 0], d: "06/08", w: 2670 },
  { t: "gRPC 與 Protocol Buffers", p: "02-後端/grpc-protobuf.mdx", g: "02-後端", s: "be", tags: ["RPC", "效能"], ai: [0, 2], d: "06/07", w: 1340 },
  { t: "訊息佇列的重試與死信", p: "02-後端/mq-retry-dlq.mdx", g: "02-後端", s: "be", tags: ["系統設計"], ai: [1, 0], d: "06/05", w: 1890 },
  { t: "快取一致性與失效策略", p: "02-後端/cache-invalidation.mdx", g: "02-後端", s: null, tags: ["效能"], ai: [0, 0], d: "06/04", w: 1120, nofm: true },
  { t: "角色與職責 R&R", p: "03-產品管理/role-and-responsibility.mdx", g: "03-產品管理", s: "pm", tags: ["團隊協作", "PM"], ai: [4, 0], d: "06/13", w: 3260 },
  { t: "專案 V.S 產品", p: "03-產品管理/project-vs-product.mdx", g: "03-產品管理", s: "pm", tags: ["PM", "觀念"], ai: [2, 1], d: "06/13", w: 2040 },
  { t: "需求優先級：RICE 與其限制", p: "03-產品管理/rice-scoring.mdx", g: "03-產品管理", s: "pm", tags: ["PM"], ai: [1, 0], d: "06/06", w: 1760 },
  { t: "從路線圖到里程碑", p: "03-產品管理/roadmap-to-milestone.mdx", g: "03-產品管理", s: "pm", tags: ["PM", "規劃"], ai: [0, 1], d: "06/02", w: 1430 },
  { t: "OAuth 2.0 與 PKCE 授權流程", p: "04-資安與網路/oauth-2-pkce.mdx", g: "04-資安與網路", s: "sec", tags: ["資安", "認證"], ai: [3, 0], d: "06/03", w: 2910 },
  { t: "HTTP/1.1 → HTTP/2 → HTTP/3 效能演進", p: "04-資安與網路/http-versions-performance.mdx", g: "04-資安與網路", s: "sec", tags: ["網路", "效能"], ai: [2, 2], d: "06/01", w: 3380 },
  { t: "TLS 握手與憑證鏈", p: "04-資安與網路/tls-handshake.mdx", g: "04-資安與網路", s: "sec", tags: ["資安"], ai: [1, 0], d: "05/29", w: 2130 },
  { t: "CORS 到底在擋什麼", p: "04-資安與網路/cors-explained.mdx", g: "04-資安與網路", s: null, tags: ["網路"], ai: [0, 1], d: "05/27", w: 1240 },
  { t: "本週想寫的題目", p: "inbox/weekly-ideas.mdx", g: "inbox", s: null, tags: [], ai: [0, 0], d: "06/16", w: 210, nofm: true },
  { t: "MDX 自訂元件筆記", p: "inbox/mdx-components.mdx", g: "inbox", s: null, tags: ["MDX"], ai: [0, 1], d: "06/12", w: 640 },
];
const WB_TAGS = [
  ["前端", 14], ["PM", 11], ["後端", 9], ["系統設計", 8], ["效能", 7],
  ["資安", 6], ["React", 6], ["網路", 5], ["CSS", 4], ["TypeScript", 4],
];
const WB_WEEKS = [3, 5, 2, 6, 4, 8, 5, 9, 4, 7, 11, 6];
Object.assign(window, { WB_SERIES, WB_FOLDERS, WB_NOTES, WB_TAGS, WB_WEEKS });
