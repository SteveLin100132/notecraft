import { CircleCheck, Repeat, Clock } from "lucide-react";

interface CardConfig {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  title: string;
  desc: string;
}

const cards: CardConfig[] = [
  {
    icon: <CircleCheck size={30} />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    titleColor: "text-blue-700",
    title: "一次性檢查",
    desc: "對話結束時做一次性檢查，不會像 PostToolUse 那樣每改一個檔案就觸發。",
  },
  {
    icon: <Repeat size={30} />,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    titleColor: "text-orange-500",
    title: "避免無限迴圈",
    desc: "不會因為改了 PRD 又再次觸發自己。",
  },
  {
    icon: <Clock size={30} />,
    iconBg: "[background-color:var(--success-50)]",
    iconColor: "[color:var(--success-500)]",
    titleColor: "[color:var(--success-500)]",
    title: "時機自然",
    desc: "Claude 講完話的瞬間檢查，使用者剛好會看到提醒。",
  },
];

export default function WhyStopEvent() {
  return (
    <div className="not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div
            className={[
              "flex h-14 w-14 items-center justify-center rounded-full",
              card.iconBg,
              card.iconColor,
            ].join(" ")}
          >
            {card.icon}
          </div>
          <p
            className={["text-base font-bold leading-snug", card.titleColor].join(
              " "
            )}
          >
            {card.title}
          </p>
          <p className="text-sm leading-relaxed text-neutral-700">{card.desc}</p>
        </div>
      ))}
    </div>
  );
}
