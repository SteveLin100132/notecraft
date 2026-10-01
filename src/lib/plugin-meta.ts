// 資料檔的標題／描述／backTo 從哪裡取（Task 98）。
//
// 預設約定是資料檔頂層的 `meta.title`／`meta.description`／`meta.backTo`。
// 但有些 plugin 吃的是「別人定的格式」（OpenAPI 的標題在 info.title、頂層只允許 x- 擴充），
// 不能叫作者加 meta —— 這類 plugin 在 manifest 以 JSON Pointer 宣告來源：
//
//   "meta": { "title": "/info/title", "description": "/info/description", "backTo": "/x-notecraft-back-to" }
//
// 沒宣告的鍵仍退回 data.meta.<鍵>。這裡只負責「取值」，字串清理與驗證留在 plugins.ts。
//
// scripts/checks/app-plugin-meta.mjs 以 Node 原生 strip-types 直接載入本檔 —— 只能 import type。

import type { PluginManifest } from "./plugin-types";

type MetaKey = "title" | "description" | "backTo";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** RFC 6901 JSON Pointer。`""` 指整份；中途不存在回 undefined。 */
export function resolvePointer(data: unknown, pointer: string): unknown {
  if (pointer === "") return data;
  if (!pointer.startsWith("/")) return undefined;
  let cur: unknown = data;
  for (const raw of pointer.slice(1).split("/")) {
    const seg = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(cur)) {
      if (!/^(0|[1-9]\d*)$/.test(seg)) return undefined;
      cur = cur[Number(seg)];
    } else if (isPlainObject(cur)) {
      if (!Object.prototype.hasOwnProperty.call(cur, seg)) return undefined;
      cur = cur[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

export interface MetaPick {
  /** 取到的值；不是字串一律為 undefined（呼叫端當作沒有） */
  value: string | undefined;
  /** 原始值（任何型別），給錯誤訊息顯示 */
  raw: unknown;
  /** 有沒有這個欄位（給 backTo 的 warn 判斷：寫了但不合法 vs 根本沒寫） */
  present: boolean;
  /** 給錯誤訊息用的來源名稱，例：`meta.backTo` 或 `x-notecraft-back-to` */
  source: string;
}

/** 依 manifest.meta（若有）取出一個 meta 欄位。 */
export function pickMeta(data: unknown, key: MetaKey, metaMap?: PluginManifest["meta"]): MetaPick {
  const pointer = metaMap?.[key];
  let raw: unknown;
  let source: string;
  if (typeof pointer === "string") {
    raw = resolvePointer(data, pointer);
    source = pointer.slice(1).replace(/\//g, ".") || "(根層)";
  } else {
    const meta = isPlainObject(data) && isPlainObject(data.meta) ? data.meta : null;
    raw = meta ? meta[key] : undefined;
    source = `meta.${key}`;
  }
  return { value: typeof raw === "string" ? raw : undefined, raw, present: raw !== undefined, source };
}
