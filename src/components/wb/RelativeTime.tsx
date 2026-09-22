// 「N 天前更新」：SSR 輸出絕對日期，hydrate 後以當地時區換成相對時間（規格 §5.4，Q10）。極小的 island。
import { useEffect, useState } from "react";
import { daysAgoLabel, ymd } from "@/lib/wb-time";

export default function RelativeTime({ date = "", suffix = "", className = "" }: { date?: string; suffix?: string; className?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(daysAgoLabel(date));
  }, [date]);
  return (
    <span className={className} title={ymd(date)}>
      {label ? `${label}${suffix}` : ymd(date)}
    </span>
  );
}
