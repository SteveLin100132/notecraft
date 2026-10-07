// Content tabs（PRD §7.1 / task-15）漸進增強：框架無關 vanilla JS，不引入 React island。
// 無此 script 時 CSS 會展開所有面板（不遺失內容）；載入後才接管切換。
// 筆記頁與預覽卡（RefLayer：從 <template> 複製出來的內容）共用，同一個根只會初始化一次。

export function initTabs(root: HTMLElement): void {
  if (root.hasAttribute("data-enhanced")) return;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (!tabs.length) return;
  root.setAttribute("data-enhanced", "");

  const select = (i: number) => {
    tabs.forEach((tab, j) => {
      const selected = j === i;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      if (panels[j]) panels[j].hidden = !selected;
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      select(i);
      tab.focus();
    });
    tab.addEventListener("keydown", (e: KeyboardEvent) => {
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      e.preventDefault();
      select(next);
      tabs[next].focus();
    });
  });

  const initial = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
  select(initial < 0 ? 0 : initial);
}

export function initAllTabs(scope: ParentNode): void {
  scope.querySelectorAll<HTMLElement>("[data-nc-tabs]").forEach(initTabs);
}
