// Graph 的兩種空狀態（handoff §6.2、§6.3；規格 docs/notecraft-workbench-notes-graph.md §11）。
// 版面沿用 handoff 的 gr-，不用 wb/EmptyState.tsx（那個元件只給有插圖的空狀態）。
import { Filter, Link2, Tag } from "lucide-react";
import type { ReactNode } from "react";

/** A：篩選後沒有筆記。「清除篩選」是真的連結（換頁後 Sidebar 的高亮才會對）。 */
export function GrEmptyFilter({ label = "", clearHref = "" }: { label?: string; clearHref?: string }) {
  return (
    <div className="gr-center">
      <div className="gr-msg">
        <div className="gr-medal">
          <Filter size={20} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h3>沒有符合篩選條件的筆記</h3>
        <p>目前篩選「{label}」底下沒有任何筆記，Graph 沒有東西可以畫。清除篩選後會回到全部筆記。</p>
        <div className="gr-acts">
          <a className="wb-btn-solid" href={clearHref}>
            清除篩選
          </a>
        </div>
      </div>
    </div>
  );
}

// 文案與 handoff 不同：handoff 的 `:ref[hr.term-quota]` 不是合法寫法，系列也不是用 frontmatter 定義（規格 §11）。
// dev 與正式環境都顯示（Q10）：npx viewer 的 serve／build 也是正式模式，看自己筆記的作者同樣需要這些提示。
const WAYS: readonly (readonly [string, ReactNode])[] = [
  [
    "行內引用定義",
    <>
      在內文寫 <code>{':ref[文字]{id="…"}'}</code>，引用另一篇筆記裡的定義。
    </>,
  ],
  [
    "嵌入定義",
    <>
      用 <code>{'::include{id="…"}'}</code> 把定義整段嵌入。
    </>,
  ],
  [
    "站內連結",
    <>
      用 <code>[文字](/notes/slug)</code> 連到另一篇筆記。
    </>,
  ],
  [
    "加入系列",
    <>
      在 <code>.notecraft/series.json</code> 把筆記列進同一個系列，章節之間會依序相連。
    </>,
  ],
];

/** B：有筆記但完全沒有關聯（文件模式）。 */
export function GrEmptyLinks({ n = 0, onTagMode = () => {} }: { n?: number; onTagMode?: () => void }) {
  return (
    <div className="gr-center">
      <div className="gr-msg wide">
        <div className="gr-medal">
          <Link2 size={20} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h3>這 {n} 篇筆記之間還沒有任何關聯</h3>
        <p>文件模式只畫引用、嵌入、連結與系列順序。用下面任一種方式建立關聯後，這裡就會出現 Graph；也可以先用標籤看筆記怎麼分群。</p>
        <div className="gr-ways">
          {WAYS.map(([title, desc]) => (
            <div key={title} className="gr-way">
              <b>{title}</b>
              <span>{desc}</span>
            </div>
          ))}
        </div>
        <div className="gr-acts">
          <button type="button" className="wb-btn-solid" onClick={onTagMode}>
            <Tag size={13} strokeWidth={1.8} aria-hidden="true" /> 改用標籤模式
          </button>
        </div>
      </div>
    </div>
  );
}
