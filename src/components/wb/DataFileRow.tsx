// 資料檔列：單擊直接進渲染頁、沒有 Drawer，所以整列是連結（規格 §8.2.1 的「不放」清單）。
import { FileText } from "lucide-react";
import type { WbDataFile } from "@/lib/wb-types";
import { md } from "@/lib/wb-time";
import { Ic } from "./ui";

export default function DataFileRow({ file }: { file: WbDataFile }) {
  return (
    <a className="wb-row" href={`/view/${file.routePath}`}>
      <Ic icon={FileText} size={13} color="var(--wb-gold)" />
      <span className="wb-row-t">{file.title}</span>
      <span className="wb-row-p">{file.relPath}</span>
      <span className="wb-row-tags wb-keep" style={{ width: 168, flex: "0 0 168px" }}>
        <span className="wb-tagchip" style={{ fontFamily: "var(--font-mono)" }}>
          {file.pluginId}
        </span>
      </span>
      <span className="wb-row-d tnum">{md(file.updatedAt)}</span>
    </a>
  );
}
