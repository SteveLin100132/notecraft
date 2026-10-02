// 寫入剪貼簿（client-only）。所有複製鈕共用，成敗判定一致。
//
// navigator.clipboard 只在安全連線（HTTPS、localhost、127.0.0.1）存在；
// 以 `--host 0.0.0.0` 從另一台裝置用 http://<區網 IP> 開時它是 undefined，
// 舊寫法 `navigator.clipboard?.writeText(...)` 會靜靜什麼都不做、卻照樣顯示「已複製」。
// 這裡在 API 不存在或被拒時退回 document.execCommand('copy')（暫時的 textarea），
// 兩者都失敗才回 false —— 呼叫端只在 true 時顯示成功。

/** 失敗時給使用者的提示字（各複製鈕一致） */
export const COPY_FAILED_MSG = "無法複製，請手動選取";

function execCopy(text: string): boolean {
  const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  // 不可 display:none（選不到）；放在視窗外、不觸發捲動
  ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  let ok = false;
  try {
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS Safari 不吃 select()
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  prevFocus?.focus({ preventScroll: true });
  return ok;
}

/** 寫入剪貼簿；真的寫進去才回 true。不 throw。 */
export async function writeClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 權限被拒或文件失焦 → 退回 execCommand
    }
  }
  return execCopy(text);
}
