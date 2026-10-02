import { createContext, useContext } from "react";

/** 兩種紙：深藍圖頁（sheet）與白色說明頁（paper）。 */
export type Tone = "sheet" | "paper";

export const ToneContext = createContext<Tone>("paper");

/** 目前所在的紙；Page 之外預設為說明頁。 */
export function useTone(): Tone {
  return useContext(ToneContext);
}

export const DOC_NAME = "NoteCraftApp 說明書";
