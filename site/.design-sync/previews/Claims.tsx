import { Page, Claims } from "notecraft-site";

const ArtFolder = (
  <g>
    <path d="M18 76 h16 l6 -7 h30 v48 h-52 z" className="ca-l" />
    <text x="18" y="136" className="ca-t">./docs</text>
    <text x="18" y="152" className="ca-t ca-t--s">原封不動</text>
    <line x1="76" y1="98" x2="96" y2="98" className="ca-l" />
    <path d="M90 93 L96 98 L90 103" className="ca-l" />
    <rect x="100" y="80" width="104" height="36" className="ca-l" />
    <text x="108" y="103" className="ca-t ca-t--b">$ npx … view</text>
    <line x1="206" y1="98" x2="226" y2="98" className="ca-l" />
    <path d="M220 93 L226 98 L220 103" className="ca-l" />
    <rect x="230" y="46" width="82" height="100" className="ca-l" />
    <line x1="230" y1="58" x2="312" y2="58" className="ca-l" />
    <rect x="234" y="62" width="6" height="80" className="ca-s" />
    <rect x="244" y="62" width="18" height="80" className="ca-s" />
    <line x1="268" y1="70" x2="306" y2="70" className="ca-s" />
    <line x1="268" y1="80" x2="298" y2="80" className="ca-s" />
    <line x1="268" y1="90" x2="304" y2="90" className="ca-s" />
    <rect x="268" y="102" width="38" height="24" className="ca-m" />
  </g>
);

const ArtMarker = (
  <g>
    <rect x="10" y="36" width="140" height="108" className="ca-l ca-dash" />
    <text x="18" y="58" className="ca-t ca-t--b">@ai-visualize</text>
    <text x="18" y="78" className="ca-t">type: diagram</text>
    <text x="18" y="98" className="ca-t">prompt: |</text>
    <text x="26" y="118" className="ca-t ca-t--s">畫出流程…</text>
    <text x="164" y="26" textAnchor="middle" className="ca-t ca-t--s">Claude Code</text>
    <line x1="164" y1="32" x2="164" y2="84" className="ca-s ca-dash" />
    <line x1="152" y1="90" x2="176" y2="90" className="ca-l" />
    <path d="M170 85 L176 90 L170 95" className="ca-l" />
    <rect x="180" y="36" width="128" height="108" className="ca-l" />
    <rect x="190" y="78" width="26" height="18" className="ca-l" />
    <rect x="229" y="78" width="26" height="18" className="ca-m" />
    <rect x="268" y="78" width="26" height="18" className="ca-l" />
    <line x1="216" y1="87" x2="229" y2="87" className="ca-l" />
    <line x1="255" y1="87" x2="268" y2="87" className="ca-l" />
    <path d="M242 96 V114 H203 V96" className="ca-s ca-dash" />
    <text x="180" y="162" className="ca-t ca-t--s">寫回 repo 的 .tsx</text>
  </g>
);

export const BrickWall = () => (
  <Page tone="paper" folio="第 4 頁">
    <div style={{ paddingTop: 32 }}>
      <Claims
        items={[
          { plain: "你的資料夾原封不動，npx 一行就開。", legal: "一種筆記工作台，讀取使用者既有之 md／mdx 資料夾，不搬移、不轉存，以單一指令啟動。", art: ArtFolder },
          { plain: "寫一段描述，得到一個能操作的元件，而且是你 repo 裡看得到的原始碼。", legal: "如請求項 1 所述之工作台，其中筆記內以 @ai-visualize 標記描述圖表，經作者本機之 Claude Code 生成 React 元件並寫回該筆記。", art: ArtMarker, wide: true },
          { plain: "GitHub Pages、Netlify 或任何靜態主機都能放。", legal: "如請求項 1 所述之工作台，其輸出為純靜態網站，不依賴執行期 API。" },
        ]}
      />
    </div>
  </Page>
);
