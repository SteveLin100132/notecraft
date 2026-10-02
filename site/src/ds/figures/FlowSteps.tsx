export type StepState = "idle" | "active" | "done" | "blocked";

export type FlowStep = {
  /** 節點名（等寬 600）。 */
  name: string;
  /** 右側的次要說明。 */
  meta?: string;
  /** `active` 填 sheet、`done` 填 tint、`blocked` 是 mark-paper 虛線框。 */
  state?: StepState;
};

export type FlowStepsProps = {
  steps?: FlowStep[];
  /** 點節點時回傳索引；省略時節點仍是按鈕但沒有行為。 */
  onSelect?: (index: number) => void;
  label?: string;
};

export type DiagramNodeProps = FlowStep & {
  onClick?: () => void;
};

const STATE_CLASS: Record<StepState, string> = { idle: "", active: " is-on", done: " is-done", blocked: " is-blocked" };

/** 流程圖的一個節點：直角、1.25px 墨框、最低 48px 高。只放在 paper（或圖頁內的白框）上。 */
export function DiagramNode({ name = "component-generator", meta = "寫元件、跑驗證", state = "idle", onClick }: DiagramNodeProps) {
  return (
    <button type="button" className={`pl-node${STATE_CLASS[state]}`} aria-pressed={state === "active"} onClick={onClick}>
      <span className="pl-name">{name}</span>
      {meta && <span className="pl-meta">{meta}</span>}
    </button>
  );
}

const DEFAULT_STEPS: FlowStep[] = [
  { name: "note-scanner", meta: "找出標記", state: "done" },
  { name: "visualize-planner", meta: "規劃方案", state: "done" },
  { name: "component-generator", meta: "寫元件、跑驗證", state: "active" },
  { name: "mdx-writer", meta: "寫回筆記", state: "idle" },
];

/**
 * 直排流程：節點之間以墨線箭頭相連，最後一格沒有箭頭。
 * 狀態語彙與全站一致：選中即填 sheet、已完成填 tint、被擋下是橙色虛線框。
 */
export function FlowSteps({ steps = DEFAULT_STEPS, onSelect, label = "流程" }: FlowStepsProps) {
  return (
    <ol className="pl-steps" aria-label={label}>
      {steps.map((s, i) => (
        <li key={s.name} className="pl-cell">
          <DiagramNode {...s} onClick={onSelect ? () => onSelect(i) : undefined} />
        </li>
      ))}
    </ol>
  );
}
