// 靜態端點：build 期輸出 /wb-index.json（**不是執行時 API**）。
// 給 Palette 與 Dashboard 上的 Drawer 延遲載入用 —— Palette 每頁都在，
// 若把全站筆記清單 inline 進每一頁，N 篇筆記就是 N 倍重複（規格 §5.3，Q2 混合式）。
import type { APIRoute } from "astro";
import { assertNoAbsolutePath, getWorkbenchIndex, publicIndex } from "@/lib/workbench";

export const GET: APIRoute = async () => {
  const body = JSON.stringify(publicIndex(await getWorkbenchIndex()));
  assertNoAbsolutePath(body, "/wb-index.json");
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
