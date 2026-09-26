/**
 * Windows 跨磁碟修正：viewer app 在 C:（~/.notecraft/app-<v>/）、筆記在 D: 時 astro build 失敗，
 * 錯誤為 `[commonjs--resolver] The URL must be of scheme file`。
 *
 * 成因在 Astro（5.18）：content entry 的 `fileName` 以 `path.relative(root, file)` 記錄；
 * 跨磁碟時 relative 回傳絕對路徑 `d:/...`，之後 `astro-content-virtual-mod-plugin` 的 resolveId 做
 * `fileURLToPath(new URL(fileName, root))`，`d:` 被當成 URL scheme 而丟錯。
 *
 * 該 Astro plugin 本身是 enforce: "pre" 且排在使用者 plugin 之前，另掛 plugin 攔不到，
 * 所以在 configResolved 包住它的 resolveId：把 deferred content module id 裡的磁碟機路徑改寫成
 * `file:///d:/...` 再交給它。同磁碟時 fileName 是相對路徑，不受影響；只有磁碟機路徑才會命中，
 * 所以非 Windows 下這層包裝是 no-op。
 *
 * 另一個同類問題（1.2.3）：`import.meta.glob("@notes/...")` 產生的 import 跨磁碟時是 `../../D:/...`，
 * 由本 plugin 自己的 resolveId 還原，見下方 CROSS_DRIVE_RELATIVE。
 */
import { pathToFileURL } from "node:url";
import type { Plugin } from "vite";

const TARGET_PLUGIN = "astro-content-virtual-mod-plugin";
const CONTENT_MODULE_FLAG = "astroContentModuleFlag";
const DRIVE_PATH = /^[a-zA-Z]:[\\/]/;

type ResolveIdFn = (this: unknown, id: string, ...rest: unknown[]) => unknown;

function fixId(id: string): string {
  const q = id.indexOf("?");
  if (q === -1 || !id.includes(CONTENT_MODULE_FLAG)) return id;
  const params = new URLSearchParams(id.slice(q + 1));
  const fileName = params.get("fileName");
  if (!fileName || !DRIVE_PATH.test(fileName)) return id;
  params.set("fileName", pathToFileURL(fileName).href);
  return `${id.slice(0, q)}?${params.toString()}`;
}

// import.meta.glob("@notes/...") 跨磁碟時，Vite 以「importer 所在目錄 → 目標檔」的相對路徑產生 specifier，
// 得到 `../../../D:/...` 這種不存在的路徑（plugin renderer、deck 都會踩到）。還原成磁碟機絕對路徑。
// 同磁碟與非 Windows 不會產生這種 id，所以只有跨磁碟才命中。glob 回傳物件的 key 仍是壞掉的相對路徑，
// 但取 id 的程式只看結尾（plugins/<id>/renderer.tsx、<slug>.deck.tsx），不受影響。
const CROSS_DRIVE_RELATIVE = /^(?:\.\.\/)+([a-zA-Z]:\/.*)$/;

export default function crossDriveContent(): Plugin {
  return {
    name: "notecraft:cross-drive-content",
    enforce: "pre",
    resolveId(id) {
      const m = CROSS_DRIVE_RELATIVE.exec(id);
      return m ? m[1] : null;
    },
    configResolved(config) {
      const target = config.plugins.find((p) => p.name === TARGET_PLUGIN);
      const hook = target?.resolveId;
      if (!target || !hook) {
        console.warn(`[notecraft] 找不到 ${TARGET_PLUGIN}，跨磁碟修正未套用`);
        return;
      }
      const original = (typeof hook === "function" ? hook : hook.handler) as ResolveIdFn;
      const wrapped: ResolveIdFn = function (id, ...rest) {
        return original.call(this, fixId(id), ...rest);
      };
      // configResolved 拿到的 plugins 是唯讀型別，但物件本身可改；Vite 之後才建立 plugin container
      if (typeof hook === "function") {
        (target as { resolveId: unknown }).resolveId = wrapped;
      } else {
        (hook as { handler: unknown }).handler = wrapped;
      }
    },
  };
}
