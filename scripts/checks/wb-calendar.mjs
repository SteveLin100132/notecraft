// 更新月曆純函式的斷言（Task 92，規格 docs/notecraft-workbench-calendar.md §4.3）。
// 月格的週數 4／5／6、週日起算、跨月跨年、翻月不溢位 —— 這些壞了 build 仍全綠，只有這裡抓得到。
// 由 scripts/check-plugins.mjs 串接執行；單跑：npm run check:wb

import assert from "node:assert/strict";
import { calCellLabel, calInMonth, calIso, calMonthGrid, calShift, calTitle, calWeekOf, groupByDay } from "../../src/lib/wb-calendar.ts";

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
const DAY = 86400000;
const local = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const consecutive = (days) => {
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((local(days[i]) - local(days[i - 1])) / DAY);
    assert.equal(diff, 1, `${days[i - 1]} → ${days[i]} 差 ${diff} 天`);
  }
};

check("calMonthGrid 2026-02：剛好 4 列、沒有補位格", () => {
  const g = calMonthGrid("2026-02-10");
  assert.equal(g.weeks, 4);
  assert.equal(g.days[0], "2026-02-01");
  assert.equal(g.days[27], "2026-02-28");
  assert.equal(g.first, "2026-02-01");
  assert.equal(g.last, "2026-02-28");
  assert.equal(g.year, 2026);
  assert.equal(g.month, 2);
});

check("calMonthGrid 2026-08：6 列、前後都有補位格", () => {
  const g = calMonthGrid("2026-08-15");
  assert.equal(g.weeks, 6);
  assert.equal(g.days[0], "2026-07-26");
  assert.equal(g.days[41], "2026-09-05");
  assert.equal(g.first, "2026-08-01");
  assert.equal(g.last, "2026-08-31");
});

check("calMonthGrid 2026-09：5 列、首列 2 個補位格", () => {
  const g = calMonthGrid("2026-09-29");
  assert.equal(g.weeks, 5);
  assert.equal(g.days[0], "2026-08-30");
  assert.equal(g.days[2], "2026-09-01");
});

check("calMonthGrid 連續性：days.length = weeks×7、首格週日、相鄰差 1 天、weeks ∈ {4,5,6}（6 個月份）", () => {
  for (const iso of ["2026-02-10", "2026-08-15", "2026-09-29", "2026-10-01", "2026-11-30", "2027-05-20"]) {
    const g = calMonthGrid(iso);
    assert.ok([4, 5, 6].includes(g.weeks), `${iso} weeks=${g.weeks}`);
    assert.equal(g.days.length, g.weeks * 7, iso);
    assert.equal(local(g.days[0]).getDay(), 0, `${iso} 首格不是週日`);
    consecutive(g.days);
    assert.ok(g.days.includes(g.first) && g.days.includes(g.last), iso);
  }
});

check("calWeekOf：跨月、跨年、週日起算、7 天", () => {
  const a = calWeekOf("2026-09-29");
  assert.deepEqual([a.start, a.end], ["2026-09-27", "2026-10-03"]);
  assert.equal(a.days.length, 7);
  assert.equal(a.days[0], a.start);
  assert.equal(a.days[6], a.end);
  assert.equal(local(a.start).getDay(), 0);
  consecutive(a.days);
  const b = calWeekOf("2026-12-30");
  assert.deepEqual([b.start, b.end], ["2026-12-27", "2027-01-02"]);
  const c = calWeekOf("2026-09-27"); // 週日本身
  assert.equal(c.start, "2026-09-27");
});

check("calShift 月：回該月 1 日、1 月 31 日不溢到 3 月、跨年", () => {
  assert.equal(calShift("month", "2026-01-31", 1), "2026-02-01");
  assert.equal(calShift("month", "2026-03-01", -1), "2026-02-01");
  assert.equal(calShift("month", "2026-12-15", 1), "2027-01-01");
  assert.equal(calShift("month", "2026-01-15", -1), "2025-12-01");
});

check("calShift 週：±7 天", () => {
  assert.equal(calShift("week", "2026-09-29", 1), "2026-10-06");
  assert.equal(calShift("week", "2026-09-29", -1), "2026-09-22");
});

check("calTitle：不補零；週的年份取週日那天", () => {
  assert.equal(calTitle("month", "2026-09-29"), "2026 年 9 月");
  assert.equal(calTitle("week", "2026-09-29"), "2026 年 9/27 – 10/3");
  assert.equal(calTitle("week", "2026-12-30"), "2026 年 12/27 – 1/2");
  assert.equal(calTitle("week", "2027-01-03"), "2027 年 1/3 – 1/9");
});

check("calCellLabel：1 日與首格顯示 M/D", () => {
  assert.equal(calCellLabel("2026-10-01", false), "10/1");
  assert.equal(calCellLabel("2026-10-02", false), "2");
  assert.equal(calCellLabel("2026-10-02", true), "10/2");
});

check("calInMonth", () => {
  assert.equal(calInMonth("2026-08-30", "2026-09-15"), false);
  assert.equal(calInMonth("2026-09-01", "2026-09-15"), true);
  assert.equal(calInMonth("2025-09-01", "2026-09-15"), false);
});

check("groupByDay：忽略時間部分、保留輸入順序、空陣列回空物件", () => {
  const g = groupByDay([
    { updatedAt: "2026-09-29T10:00:00", id: 1 },
    { updatedAt: "2026-09-28", id: 2 },
    { updatedAt: "2026-09-29", id: 3 },
  ]);
  assert.deepEqual(Object.keys(g).sort(), ["2026-09-28", "2026-09-29"]);
  assert.deepEqual(
    g["2026-09-29"].map((r) => r.id),
    [1, 3],
  );
  assert.deepEqual(groupByDay([]), {});
});

check("calIso 當地日", () => {
  assert.equal(calIso(new Date(2026, 8, 30, 23, 59)), "2026-09-30");
  assert.equal(calIso(new Date(2026, 0, 5)), "2026-01-05");
});

if (failed) {
  console.error(`\n✗ wb-calendar：${failed} 項失敗`);
  process.exit(1);
}
console.log("✓ wb-calendar：通過");
