// 檢查更新：mock npm registry + CHANGELOG + 前端 store
const UPD_NOW = Date.parse("2026-10-03T10:00:00+08:00");
const UPD_CUR = "1.8.5";
const UPD_PKG = "notecraftapp";
const UPD_GH = "https://github.com/notecraftapp/notecraftapp/blob/main/CHANGELOG.md";
const UPD_CATS = [
  ["安全", "security", "var(--upd-security)"],
  ["移除", "removed", "var(--upd-major)"],
  ["變更", "changed", "var(--wb-blue-l)"],
  ["棄用", "deprecated", "var(--upd-major)"],
  ["新增", "added", "var(--wb-ok)"],
  ["修正", "fixed", "var(--wb-ink-3)"],
];
const UPD_VERSIONS = [
  { v: "1.8.5", date: "2026-08-20", node: ">=20", size: "1.3 MB", files: 147, sec: {
    added: ["系列頁新增「繼續閱讀」，會跳到上次讀到的章節。", "`notecraft.config.js` 新增 `sidebar.collapsed`，可指定預設收合的資料夾。"],
    changed: ["Command Palette 的搜尋改為同時比對標題、路徑與標籤，結果依最近開啟時間排序。"],
    fixed: ["Board 檢視在筆記沒有 `frontmatter` 時會整欄消失。", "轉簡報時，程式碼區塊的行號與內容錯位一行（[#398](https://github.com/notecraftapp/notecraftapp/issues/398)）。"] } },
  { v: "1.8.6", date: "2026-08-27", node: ">=20", size: "1.3 MB", files: 148, sec: {
    security: ["升級 `astro` 至 5.13.4，修補 viewer 開發伺服器的路徑穿越漏洞（[GHSA-7m2c-q4vh](https://github.com/advisories)）。只在本機 `npx notecraftapp view` 時受影響，部署站不受影響。"],
    fixed: ["修正 Windows 路徑下 pagefind 索引遺失子資料夾筆記的問題（[#412](https://github.com/notecraftapp/notecraftapp/issues/412)）。", "資料夾名稱含空白時 `npx notecraftapp view` 無法啟動。"] } },
  { v: "1.9.0", date: "2026-09-03", node: ">=20", size: "1.4 MB", files: 151, sec: {
    added: ["筆記頁籤：可同時開啟多篇筆記，以 `Alt + ,`／`Alt + .` 切換，關閉後可用 `Alt + Shift + T` 重新開啟。", "Command Palette 新增「已開啟的頁籤」分組。"],
    changed: ["`@ai-visualize` 標記的預設 `type` 從 `diagram` 改為 `auto`，由 Skill 依內容判斷要生成圖表、動畫或互動元件。如果你的筆記依賴舊的預設值，請在標記上明確寫出 `type=\"diagram\"`，否則重新生成時可能得到不同類型的元件。"],
    fixed: ["Timeline 檢視在跨年月份的排序錯誤。"] } },
  { v: "1.9.1", date: "2026-09-08", node: ">=20", size: "1.4 MB", files: 151, sec: {
    fixed: ["頁籤列在 Safari 17 拖曳排序時會閃爍。", "系列進度在刪除章節後沒有重新計算。"] } },
  { v: "1.9.2", date: "2026-09-15", node: ">=20", size: "1.4 MB", files: 152, sec: {
    changed: ["系列頁的章節編號改為從 `frontmatter.order` 讀取，未設定時才依檔名排序。"],
    fixed: ["`plugins.json` 有 BOM 時解析失敗。", "深色模式下程式碼區塊的行號對比不足。"] } },
  { v: "1.10.0", date: "2026-09-18", node: ">=20", size: "1.5 MB", files: 156, sec: {
    added: ["更新月曆：在儀表板以月曆檢視每天新增與修改的筆記。", "資料檔支援 `.yaml`。"],
    deprecated: ["`plugins.json` 的 `match` 欄位改名為 `include`。舊名稱仍可使用，會在 2.0 移除；啟動時會在終端機印出一次提醒。"] } },
  { v: "1.10.1", date: "2026-09-20", node: ">=20", size: "1.5 MB", files: 156, sec: {
    fixed: ["更新月曆在使用者時區為 UTC−X 時日期偏移一天。"] } },
  { v: "1.11.0", date: "2026-09-23", node: ">=20", size: "1.5 MB", files: 158, sec: {
    security: ["清理 MDX 中 `<iframe>` 的 `srcdoc` 屬性，避免部署站被內嵌內容注入腳本。若你的筆記刻意使用 `srcdoc`，請改用 `notecraft:embed` 元件。"],
    added: ["轉簡報新增「講者模式」，可在第二個視窗顯示備忘稿與下一頁預覽。"] } },
  { v: "1.11.1", date: "2026-09-24", node: ">=20", size: "1.5 MB", files: 158, sec: {
    fixed: ["講者模式在 Firefox 無法同步頁碼。"] } },
  { v: "1.12.0", date: "2026-09-26", node: ">=20", size: "1.6 MB", files: 161, sec: {
    added: ["ER 圖 plugin 支援 `@relation` 註解，自動推導外鍵連線。"],
    changed: ["建置時改用 `pagefind` 1.3，索引檔體積減少約 30%。"] } },
  { v: "1.12.1", date: "2026-09-28", node: ">=20", size: "1.6 MB", files: 161, sec: {
    security: ["升級 `undici` 至 6.21.1（CVE-2026-1182），影響 viewer 模式抓取遠端圖片。"] } },
  { v: "1.12.2", date: "2026-09-29", node: ">=20", size: "1.6 MB", files: 161, sec: {
    fixed: ["`npx notecraftapp view --port` 指定的連接埠被佔用時，改為自動往後找可用連接埠，不再直接結束。"] } },
  { v: "2.0.0", date: "2026-10-01", node: ">=22", size: "1.6 MB", files: 164, sec: {
    removed: ["移除 `plugins.json` 的 `match` 欄位，請改用 `include`。", "移除 `notecraft.config.js` 的 `legacyRoutes` 選項，舊的 `/n/:slug` 網址不再自動轉址。需要保留時，請在 `netlify.toml` 自行設定 redirects，範例見 [遷移指南](https://github.com/notecraftapp/notecraftapp/blob/main/docs/migrate-2.md)。"],
    changed: ["`engines.node` 提高到 `>=22`，不再支援 Node 20。", "plugin API：`definePlugin()` 的 `render` 改為 async 並回傳 Promise。既有 plugin 需要更新，詳見 [遷移指南](https://github.com/notecraftapp/notecraftapp/blob/main/docs/migrate-2.md)。"],
    added: ["內建檢查更新：開頁時查詢 npm registry，有新版時在「設定與關於」提示。"],
    security: ["部署站預設送出 `Content-Security-Policy: script-src 'self'`。"] } },
];
const UPD_SCEN = {
  latest: { latest: "1.8.5", userNode: "22.11.0" },
  patch: { latest: "1.8.6", userNode: "22.11.0" },
  minor: { latest: "1.9.2", userNode: "22.11.0" },
  major: { latest: "2.0.0", userNode: "22.11.0" },
  deprecated: { latest: "1.9.2", userNode: "22.11.0", deprecated: "1.8.5 的 pagefind 索引在 Windows 會遺失子資料夾裡的筆記，請升級到 1.8.6 以上。" },
  node: { latest: "2.0.0", userNode: "20.11.1" },
};
const updParse = (v) => v.split(".").map(Number);
const updCmp = (a, b) => { const x = updParse(a), y = updParse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const updLevel = (a, b) => { const x = updParse(a), y = updParse(b); return y[0] > x[0] ? "major" : y[1] > x[1] ? "minor" : y[2] > x[2] ? "patch" : null; };
const updNodeMin = (r) => +(String(r).match(/\d+/) || [0])[0];
function updDays(d) {
  const n = Math.round((UPD_NOW - Date.parse(d + "T10:00:00+08:00")) / 864e5);
  return n <= 0 ? "今天" : n === 1 ? "昨天" : n < 14 ? n + " 天前" : n < 60 ? Math.round(n / 7) + " 週前" : Math.round(n / 30) + " 個月前";
}
function updAgo(ms) {
  const m = Math.floor((Date.now() - ms) / 60000);
  return m < 1 ? "剛剛" : m < 60 ? m + " 分鐘前" : Math.floor(m / 60) + " 小時前";
}
function updResult(key) {
  const s = UPD_SCEN[key] || UPD_SCEN.minor;
  const lv = UPD_VERSIONS.find((x) => x.v === s.latest);
  const cur = UPD_VERSIONS.find((x) => x.v === UPD_CUR);
  const missed = UPD_VERSIONS.filter((x) => updCmp(x.v, UPD_CUR) > 0 && updCmp(x.v, s.latest) <= 0).reverse();
  const need = updNodeMin(lv.node), have = updNodeMin(s.userNode);
  return {
    scen: key, cur: UPD_CUR, curDate: cur.date, curV: cur, latest: s.latest, latestDate: lv.date,
    level: updLevel(UPD_CUR, s.latest), behind: missed.length, missed,
    engines: lv.node, nodeNeed: need, userNode: s.userNode, needsNode: have < need,
    deprecated: s.deprecated || null, size: lv.size, files: lv.files,
  };
}
// tone：rail 圓點與整體強度。deprecated > major > info
function updTone(res) {
  if (!res) return null;
  if (res.deprecated) return "danger";
  if (!res.level) return null;
  return res.level === "major" ? "major" : "info";
}

// ── store ──
const UPD_LS = { last: "nc-upd-last", toasted: "nc-upd-toasted", skipped: "nc-upd-skipped" };
const UPD_TTL = 30 * 60000;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
const updStore = { s: { status: "idle", res: null, checkedAt: null, err: null, drawer: false, toast: null, skipped: lsGet(UPD_LS.skipped) }, subs: new Set() };
function updSet(p) { updStore.s = { ...updStore.s, ...p }; updStore.subs.forEach((f) => f()); }
function useUpd() {
  const [, f] = React.useState(0);
  React.useEffect(() => { const fn = () => f((x) => x + 1); updStore.subs.add(fn); return () => updStore.subs.delete(fn); }, []);
  return updStore.s;
}
const updEnv = () => window.NC_UPD_ENV || { scen: "minor", net: "online", cl: "ok", mode: "viewer" };
let updTimer = null;
function updCheck(manual) {
  const env = updEnv();
  clearTimeout(updTimer);
  updSet({ status: "checking", err: null });
  updTimer = setTimeout(() => {
    const prev = updStore.s;
    if (env.net === "offline") {
      // 自動檢查失敗：完全靜默，回到原狀態；手動：一行說明
      updSet({ status: prev.res ? "done" : "idle", err: manual ? "目前無法連線到 npm，稍後再試" : null });
      return;
    }
    const res = updResult(env.scen), at = Date.now();
    lsSet(UPD_LS.last, String(at));
    const p = { status: "done", res, checkedAt: at, err: null };
    const tone = updTone(res);
    const skipped = updStore.s.skipped === res.latest && !res.deprecated;
    if (!manual && tone && !skipped && lsGet(UPD_LS.toasted) !== res.latest) { p.toast = res; lsSet(UPD_LS.toasted, res.latest); }
    updSet(p);
  }, manual ? 900 : 700);
}
function updBoot() {
  const last = +lsGet(UPD_LS.last) || 0;
  if (Date.now() - last < UPD_TTL && updEnv().net !== "offline") {
    updSet({ status: "done", res: updResult(updEnv().scen), checkedAt: last });
  } else updCheck(false);
}
function updSimulateOpen() { lsSet(UPD_LS.last, null); lsSet(UPD_LS.toasted, null); updSet({ status: "idle", res: null, checkedAt: null, err: null, toast: null }); updCheck(false); }
function updSkip(v) { lsSet(UPD_LS.skipped, v); updSet({ skipped: v, toast: null }); }
function updUnskip() { lsSet(UPD_LS.skipped, null); updSet({ skipped: null }); }
const updOpenDrawer = () => updSet({ drawer: true, toast: null });
const updCloseDrawer = () => updSet({ drawer: false });
const updCloseToast = () => updSet({ toast: null });

Object.assign(window, { UPD_NOW, UPD_CUR, UPD_PKG, UPD_GH, UPD_CATS, UPD_VERSIONS, UPD_SCEN, updResult, updTone, updDays, updAgo, updStore, updSet, useUpd, updCheck, updBoot, updSimulateOpen, updSkip, updUnskip, updOpenDrawer, updCloseDrawer, updCloseToast, updEnv });
