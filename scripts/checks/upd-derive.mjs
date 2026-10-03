// 檢查更新：版本推導的斷言（Task 113；規格 docs/notecraft-workbench-update-check.md §4.2、§4.4、§5）。
// 由 scripts/check-plugins.mjs 串接執行；單跑 npm run check:upd

import assert from "node:assert/strict";
import {
  agoLabel,
  cmpSemver,
  daysLabel,
  deriveResult,
  isFresh,
  levelOf,
  nodeNeedOf,
  parseSemver,
  railHintOf,
  readCache,
  repoBlobBaseOf,
  shouldToast,
  sizeLabel,
  updTone,
  UPD_TTL_MS,
} from "../../src/lib/update-check.ts";

let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message.split("\n").join("\n    ")}`);
  }
};

const pack = (latest, list, extra = {}) => ({
  "dist-tags": { latest },
  versions: Object.fromEntries(
    list.map((v) => [v, { engines: { node: ">=22.0.0" }, dist: { unpackedSize: 1468006, fileCount: 152 }, ...(extra[v] ?? {}) }]),
  ),
  time: Object.fromEntries(list.map((v, i) => [v, `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00.000Z`])),
});

console.log("upd-derive");

check("semver 比較", () => {
  assert.ok(cmpSemver("1.10.0", "1.9.0") > 0);
  assert.ok(cmpSemver("1.9.0-beta.1", "1.9.0") < 0);
  assert.equal(cmpSemver("1.8.5", "1.8.5"), 0);
  assert.equal(parseSemver("v1"), null);
  assert.deepEqual(parseSemver("2.0.0-rc.1"), { major: 2, minor: 0, patch: 0, pre: "rc.1" });
});

check("更新等級", () => {
  assert.equal(levelOf("1.8.5", "1.8.6"), "patch");
  assert.equal(levelOf("1.8.5", "1.9.0"), "minor");
  assert.equal(levelOf("1.8.5", "2.0.0"), "major");
  assert.equal(levelOf("1.8.5", "1.8.5"), null);
  assert.equal(levelOf("1.9.0", "1.8.5"), null);
});

check("missed／behind 排除 prerelease、新到舊", () => {
  const r = deriveResult(pack("1.9.1", ["1.8.4", "1.8.5", "1.8.6", "1.9.0-beta.1", "1.9.0", "1.9.1"]), "1.8.5", "22.16.0");
  assert.deepEqual(r.missed, ["1.9.1", "1.9.0", "1.8.6"]);
  assert.equal(r.behind, 3);
  assert.equal(r.level, "minor");
  assert.equal(r.ahead, false);
  assert.equal(r.latestDate, "2026-09-15T00:00:00.000Z");
  assert.equal(r.size, 1468006);
  assert.equal(r.files, 152);
});

check("目前版本較新（Q4）", () => {
  const r = deriveResult(pack("1.8.5", ["1.8.0", "1.8.5"]), "1.9.0", "22.16.0");
  assert.equal(r.ahead, true);
  assert.equal(r.level, null);
  assert.equal(r.behind, 0);
  assert.deepEqual(r.missed, []);
  assert.equal(updTone(r), null);
});

check("已是最新", () => {
  const r = deriveResult(pack("1.8.5", ["1.8.0", "1.8.5"]), "1.8.5", "22.16.0");
  assert.equal(r.level, null);
  assert.equal(r.ahead, false);
  assert.equal(r.curDate, "2026-09-11T00:00:00.000Z");
});

check("目前版本沒發佈過", () => {
  const r = deriveResult(pack("1.8.5", ["1.8.0", "1.8.5"]), "1.8.4", "22.16.0");
  assert.equal(r.curDate, null);
  assert.equal(r.deprecated, null);
  assert.deepEqual(r.missed, ["1.8.5"]);
});

check("engines 寫法", () => {
  for (const s of [">=22", ">=22.0.0", "^22", "22.x", ">= 22"]) assert.equal(nodeNeedOf(s), 22, s);
  for (const s of [">=18 <23", "^18 || ^20", "", null, undefined]) assert.equal(nodeNeedOf(s), null, String(s));
  const r = deriveResult(pack("2.0.0", ["1.8.5", "2.0.0"]), "1.8.5", "20.11.1");
  assert.equal(r.nodeNeed, 22);
  assert.equal(r.needsNode, true);
  assert.equal(deriveResult(pack("2.0.0", ["1.8.5", "2.0.0"]), "1.8.5", "22.1.0").needsNode, false);
});

check("deprecated", () => {
  const r = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"], { "1.8.5": { deprecated: "請升級" } }), "1.8.5", "22.16.0");
  assert.equal(r.deprecated, "請升級");
  assert.equal(updTone(r), "danger");
});

check("packument 外形不對 → throw", () => {
  assert.throws(() => deriveResult({ versions: {} }, "1.8.5", "22"));
  assert.throws(() => deriveResult({ "dist-tags": { latest: "1.8.5" } }, "1.8.5", "22"));
  assert.throws(() => deriveResult(null, "1.8.5", "22"));
});

check("tone", () => {
  const base = deriveResult(pack("1.8.6", ["1.8.5", "1.8.6"]), "1.8.5", "22");
  assert.equal(updTone(base), "info");
  assert.equal(updTone(deriveResult(pack("2.0.0", ["1.8.5", "2.0.0"]), "1.8.5", "22")), "major");
  assert.equal(updTone(null), null);
});

check("Rail 顯示條件（略過、已棄用不能略過）", () => {
  const r = deriveResult(pack("1.9.0", ["1.8.5", "1.8.6", "1.9.0"]), "1.8.5", "22");
  assert.deepEqual(railHintOf(r, null), { tone: "info", n: 2, label: "有新版 v1.9.0，落後 2 個版本" });
  assert.equal(railHintOf(r, "1.9.0"), null);
  assert.notEqual(railHintOf(r, "1.8.6"), null);
  const d = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"], { "1.8.5": { deprecated: "x" } }), "1.8.5", "22");
  assert.equal(railHintOf(d, "1.9.0").label, "目前版本 v1.8.5 已棄用");
  const latest = deriveResult(pack("1.8.5", ["1.8.5"]), "1.8.5", "22");
  assert.equal(railHintOf(latest, null), null);
});

check("快取", () => {
  const res = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"]), "1.8.5", "22");
  const raw = JSON.stringify({ cur: "1.8.5", at: 1000, res, toasted: "1.9.0", skipped: null });
  assert.equal(readCache(raw, "1.8.5").toasted, "1.9.0");
  assert.equal(readCache(raw, "1.8.6"), null);
  assert.equal(readCache("{", "1.8.5"), null);
  assert.equal(readCache(null, "1.8.5"), null);
  assert.equal(readCache(JSON.stringify({ cur: "1.8.5", at: 1, res: { cur: "1.8.4", latest: "1.9.0", missed: [] } }), "1.8.5"), null);
  const c = readCache(raw, "1.8.5");
  assert.equal(isFresh(c, 1000 + 29 * 60 * 1000), true);
  assert.equal(isFresh(c, 1000 + 31 * 60 * 1000), false);
  assert.equal(isFresh(c, 1000 + UPD_TTL_MS), false);
  assert.equal(isFresh(null, 0), false);
});

check("toast 條件", () => {
  const r = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"]), "1.8.5", "22");
  assert.equal(shouldToast(r, { toasted: null, skipped: null }, false), true);
  assert.equal(shouldToast(r, { toasted: null, skipped: null }, true), false);
  assert.equal(shouldToast(r, { toasted: "1.9.0", skipped: null }, false), false);
  assert.equal(shouldToast(r, { toasted: null, skipped: "1.9.0" }, false), false);
  const d = deriveResult(pack("1.9.0", ["1.8.5", "1.9.0"], { "1.8.5": { deprecated: "x" } }), "1.8.5", "22");
  assert.equal(shouldToast(d, { toasted: null, skipped: "1.9.0" }, false), true);
  const latest = deriveResult(pack("1.8.5", ["1.8.5"]), "1.8.5", "22");
  assert.equal(shouldToast(latest, { toasted: null, skipped: null }, false), false);
});

check("文字", () => {
  const now = Date.parse("2026-10-03T12:00:00");
  assert.equal(agoLabel(now - 30_000, now), "剛剛");
  assert.equal(agoLabel(now - 3 * 60_000, now), "3 分鐘前");
  assert.equal(agoLabel(now - 2 * 3600_000, now), "2 小時前");
  assert.equal(agoLabel(now - 3 * 86400_000, now), "3 天前");
  assert.equal(daysLabel("2026-10-03T01:00:00", now), "今天");
  assert.equal(daysLabel("2026-10-02T23:00:00", now), "昨天");
  assert.equal(daysLabel("2026-09-21T12:00:00", now), "12 天前");
  assert.equal(daysLabel("2026-09-03T12:00:00", now), "4 週前");
  assert.equal(daysLabel("2026-06-03T12:00:00", now), "4 個月前");
  assert.equal(daysLabel(null, now), "");
  assert.equal(sizeLabel(1468006), "1.4 MB");
  assert.equal(sizeLabel(839680), "820 KB");
  assert.equal(sizeLabel(null), "");
});

check("repoBlobBaseOf", () => {
  assert.equal(repoBlobBaseOf("git+https://github.com/SteveLin100132/notecraft.git"), "https://github.com/SteveLin100132/notecraft/blob/main/");
  assert.equal(repoBlobBaseOf("https://github.com/a/b"), "https://github.com/a/b/blob/main/");
  assert.equal(repoBlobBaseOf(""), "");
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
