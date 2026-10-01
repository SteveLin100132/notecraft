// 跨 island 發 toast（規格 docs/notecraft-workbench-note-tabs.md §6.6）。
// ToastHost 是 client:idle，比 client:load 的 island（例如頁籤列）晚掛載；
// 頁面剛載入時發的提示若走 nc-toast 事件，當下沒人在聽就會遺失。
// 這裡在 host 登記前先排隊，登記時一次送出。既有的 nc-toast 事件與 nc-toast-next 不受影響。

export type ToastDetail = { msg: string; icon?: string };
type Push = (t: ToastDetail) => void;

let host: Push | null = null;
const queue: ToastDetail[] = [];

export function toast(msg: string, icon?: string): void {
  const t = { msg, icon };
  if (host) host(t);
  else queue.push(t);
}

/** ToastHost 掛載時呼叫；回傳取消登記的函式 */
export function registerToastHost(push: Push): () => void {
  host = push;
  queue.splice(0).forEach(push);
  return () => {
    if (host === push) host = null;
  };
}
