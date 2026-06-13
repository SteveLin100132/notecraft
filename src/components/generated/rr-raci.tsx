import React, { useState } from 'react';
import { Check } from 'lucide-react';

// -----------------------------------------------------------------------
// R&R — 互動 RACI Matrix（4 任務 × 4 角色）
// 點 legend 字母聚焦同類、點任一列拆解該任務分工；每列以綠徽章顯示
// 「A 唯一性」（恰好 1 位 A）—— RACI 最重要的鐵律。
// -----------------------------------------------------------------------

type Letter = 'R' | 'A' | 'C' | 'I';

const COLS = ['PM', 'PO', 'Tech Lead', 'QA'];
const ROWS: { t: string; cells: string[] }[] = [
  { t: 'PRD 撰寫', cells: ['R', 'A', 'C', 'I'] },
  { t: '架構設計', cells: ['I', 'I', 'A/R', 'C'] },
  { t: 'UAT 驗收', cells: ['C', 'A', 'I', 'R'] },
  { t: '上線核准', cells: ['C', 'A', 'R', 'I'] },
];

const META: Record<Letter, { en: string; zh: string; color: string; bg: string; desc: string }> = {
  R: { en: 'Responsible', zh: '執行者', color: 'var(--blue-500)', bg: 'var(--blue-50)', desc: '實際動手把事情做出來的人。' },
  A: { en: 'Accountable', zh: '最終負責人', color: 'var(--orange-500)', bg: 'var(--orange-50)', desc: '對成敗負最終責任 —— 每件事只能有一位。' },
  C: { en: 'Consulted', zh: '被諮詢者', color: 'var(--sky-500)', bg: 'color-mix(in srgb, var(--sky-500) 12%, #fff)', desc: '提供意見、雙向溝通的專家。' },
  I: { en: 'Informed', zh: '需被通知者', color: 'var(--text-muted)', bg: 'var(--neutral-100)', desc: '只需單向被告知結果的人。' },
};

const LETTERS: Letter[] = ['R', 'A', 'C', 'I'];

const has = (cell: string, L: Letter) => cell.split('/').indexOf(L) >= 0;
const countLetter = (L: Letter) => ROWS.reduce((n, r) => n + r.cells.filter((c) => has(c, L)).length, 0);

export default function RrRaci(): React.ReactElement {
  const [spot, setSpot] = useState<Letter | null>(null);
  const [row, setRow] = useState<number | null>(null);

  const thBase: React.CSSProperties = {
    padding: '11px 12px',
    fontSize: 13,
    fontWeight: 800,
    color: 'var(--neutral-700)',
    borderBottom: '2px solid var(--neutral-200)',
    whiteSpace: 'nowrap',
    background: 'var(--neutral-50)',
  };

  const chip = (L: Letter) => {
    const m = META[L];
    const on = spot === L;
    return (
      <button
        key={L}
        onClick={() => {
          setSpot((s) => (s === L ? null : L));
          setRow(null);
        }}
        aria-pressed={on}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 13px 6px 8px',
          borderRadius: 'var(--radius-pill)',
          border: `1.5px solid ${on ? m.color : 'var(--neutral-200)'}`,
          background: on ? m.bg : 'var(--surface-card)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all 140ms',
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: m.color,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 900,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {L}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--neutral-700)' }}>{m.zh}</span>
      </button>
    );
  };

  const letterCell = (cell: string, rIdx: number) => {
    const parts = cell.split('/') as Letter[];
    const dim = (spot && !has(cell, spot)) || (row !== null && row !== rIdx);
    return (
      <td style={{ padding: 7, textAlign: 'center', borderTop: '1px solid var(--neutral-100)' }}>
        <span
          style={{
            display: 'inline-flex',
            gap: 4,
            justifyContent: 'center',
            opacity: dim ? 0.22 : 1,
            transition: 'opacity 160ms',
          }}
        >
          {parts.map((L) => {
            const m = META[L];
            const hot = spot === L;
            return (
              <span
                key={L}
                title={`${m.en} · ${m.zh}`}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: m.bg,
                  color: m.color,
                  fontSize: 14,
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: hot ? `0 0 0 2px ${m.color}` : 'none',
                }}
              >
                {L}
              </span>
            );
          })}
        </span>
      </td>
    );
  };

  // explanation text (row breakdown > letter spotlight > default hint)
  let exp: React.ReactNode;
  if (row !== null) {
    const r = ROWS[row];
    const byL: Record<Letter, string[]> = { R: [], A: [], C: [], I: [] };
    r.cells.forEach((c, i) => c.split('/').forEach((L) => byL[L as Letter].push(COLS[i])));
    const seg = (L: Letter, verb: string) => (byL[L].length ? `${byL[L].join('、')} ${verb}(${L})` : null);
    const parts = [seg('A', '最終負責'), seg('R', '執行'), seg('C', '被諮詢'), seg('I', '被通知')].filter(Boolean);
    exp = (
      <span>
        <strong style={{ color: 'var(--neutral-700)' }}>{`「${r.t}」`}</strong>：{parts.join('；')}。
      </span>
    );
  } else if (spot) {
    const m = META[spot];
    exp = (
      <span>
        <strong style={{ color: m.color }}>{`${spot} · ${m.en}（${m.zh}）`}</strong>：{m.desc}
        {` 在此矩陣中共出現 ${countLetter(spot)} 次。`}
      </span>
    );
  } else {
    exp =
      '點上方 R / A / C / I 聚焦同類角色，或點任一列拆解該任務的權責分工。每列右側都標注「恰好 1 位 A」—— 這是 RACI 最重要的鐵律。';
  }

  return (
    <figure className="not-prose mx-auto" style={{ maxWidth: '48rem', margin: 0 }}>
      {/* Legend / filter chips */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}>{LETTERS.map(chip)}</div>

      {/* Matrix */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
        <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: 'left' }}>任務 \ 角色</th>
              {COLS.map((c) => (
                <th key={c} style={{ ...thBase, textAlign: 'center' }}>
                  {c}
                </th>
              ))}
              <th style={{ ...thBase, textAlign: 'center' }}>A 唯一性</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, rIdx) => {
              const aCount = r.cells.filter((c) => has(c, 'A')).length;
              const seld = row === rIdx;
              return (
                <tr
                  key={r.t}
                  onClick={() => {
                    setRow((x) => (x === rIdx ? null : rIdx));
                    setSpot(null);
                  }}
                  style={{ cursor: 'pointer', background: seld ? 'var(--blue-50)' : 'var(--surface-card)', transition: 'background 140ms' }}
                >
                  <td style={{ padding: '11px 12px', fontSize: 13.5, fontWeight: 700, color: 'var(--neutral-700)', borderTop: '1px solid var(--neutral-100)', whiteSpace: 'nowrap' }}>
                    {r.t}
                  </td>
                  {r.cells.map((c, i) => (
                    <React.Fragment key={i}>{letterCell(c, rIdx)}</React.Fragment>
                  ))}
                  <td style={{ padding: '11px 12px', textAlign: 'center', borderTop: '1px solid var(--neutral-100)', borderLeft: '1px solid var(--neutral-100)' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--success-50)',
                        color: 'var(--success-500)',
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Check size={13} />
                      {`${aCount} 位 A`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanation row */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: row !== null ? 'var(--blue-50)' : 'var(--neutral-50)',
          borderLeft: `3px solid ${row !== null ? 'var(--blue-500)' : spot ? META[spot].color : 'var(--neutral-300)'}`,
          fontSize: 13,
          lineHeight: 1.75,
          color: 'var(--neutral-700)',
          minHeight: 22,
        }}
      >
        {exp}
      </div>
    </figure>
  );
}
