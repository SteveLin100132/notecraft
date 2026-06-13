import React, { useState } from 'react';
import { Target, Code2, Pencil, Lightbulb, Check, Layers } from 'lucide-react';

// -----------------------------------------------------------------------
// R&R — 衍生角色互動卡（手風琴）
// 六個中大型專案常見的補位角色，一次只展開一張卡片顯示其職責。
// -----------------------------------------------------------------------

type Tone = 'blue' | 'orange' | 'green' | 'sky';

interface DerivedRole {
  id: string;
  icon: React.ReactElement;
  zh: string;
  name: string;
  scope: string;
  tone: Tone;
  d: string;
}

// tone → 主色 / 淺底（取自 trendlink-design token）
const HEX: Record<Tone, string> = {
  blue: 'var(--blue-700)',
  orange: 'var(--orange-500)',
  green: 'var(--success-500)',
  sky: 'var(--sky-500)',
};
const TINT: Record<Tone, string> = {
  blue: 'var(--blue-50)',
  orange: 'var(--orange-50)',
  green: 'var(--success-50)',
  sky: 'color-mix(in srgb, var(--sky-500) 12%, #fff)',
};

const ROLES: DerivedRole[] = [
  {
    id: 'stakeholder',
    icon: <Target size={19} />,
    zh: 'Stakeholder',
    name: '利益相關者',
    scope: '外部',
    tone: 'orange',
    d: '對產品或專案有直接或間接利益的人，包含用戶、客戶、管理層、投資者等。',
  },
  {
    id: 'techlead',
    icon: <Code2 size={19} />,
    zh: 'Tech Lead',
    name: '技術主管',
    scope: '技術',
    tone: 'blue',
    d: '負責技術決策與指導，協助團隊解決技術問題，並與 PO、SM 協作，確保技術方向與產品需求一致。',
  },
  {
    id: 'uiux',
    icon: <Pencil size={19} />,
    zh: 'UI/UX Designer',
    name: '介面體驗設計',
    scope: '設計',
    tone: 'sky',
    d: '設計產品的介面與使用者體驗，確保產品在易用性與美觀性上符合用戶需求。',
  },
  {
    id: 'domain',
    icon: <Lightbulb size={19} />,
    zh: 'Domain Expert',
    name: '領域專家',
    scope: '領域',
    tone: 'orange',
    d: '在特定領域具備專業知識，協助團隊理解用戶需求與市場脈絡。',
  },
  {
    id: 'qae',
    icon: <Check size={19} />,
    zh: 'QA Engineer',
    name: '品質保證工程師',
    scope: '品質',
    tone: 'green',
    d: '負責測試規劃與執行，協助團隊識別與解決品質問題。',
  },
  {
    id: 'data',
    icon: <Layers size={19} />,
    zh: 'Data Engineer',
    name: '數據工程師',
    scope: '數據',
    tone: 'blue',
    d: '負責資料基礎設施的設計、建置與維護，協助團隊以數據驅動決策。',
  },
];

export default function RrDerivedRoles(): React.ReactElement {
  const [open, setOpen] = useState<string | null>('stakeholder');

  return (
    <figure className="not-prose mx-auto" style={{ maxWidth: '48rem', margin: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(224px, 1fr))', gap: 12 }}>
        {ROLES.map((r) => {
          const on = open === r.id;
          const th = HEX[r.tone];
          const tb = TINT[r.tone];
          return (
            <button
              key={r.id}
              onClick={() => setOpen((o) => (o === r.id ? null : r.id))}
              aria-expanded={on}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                display: 'block',
                width: '100%',
                border: `1px solid ${on ? th : 'var(--neutral-200)'}`,
                borderTop: `3px solid ${th}`,
                borderRadius: 'var(--radius-md)',
                background: on ? 'var(--surface-card)' : 'var(--neutral-50)',
                padding: '14px 15px',
                boxShadow: on ? '0 5px 16px rgba(17,47,93,.11)' : 'var(--shadow-xs)',
                transition: 'box-shadow 180ms, border-color 180ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: tb,
                    color: th,
                    flexShrink: 0,
                  }}
                >
                  {r.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14.5,
                      fontWeight: 800,
                      color: 'var(--neutral-700)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.zh}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{r.name}</span>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-pill)',
                    background: tb,
                    color: th,
                    flexShrink: 0,
                  }}
                >
                  {r.scope}
                </span>
              </div>
              <div
                style={{
                  maxHeight: on ? 160 : 0,
                  opacity: on ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 280ms ease, opacity 220ms ease, margin-top 220ms ease',
                  marginTop: on ? 11 : 0,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: 'var(--neutral-700)', lineHeight: 1.78 }}>{r.d}</p>
              </div>
            </button>
          );
        })}
      </div>
    </figure>
  );
}
