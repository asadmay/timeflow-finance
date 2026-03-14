import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  total?: number;
  totalColor?: "pos" | "neg" | "asset" | "liability" | "time" | "goal";
  totalDisplay?: string;
  totalLabel?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, totalDisplay, totalLabel, totalColor = "pos", action }: PageHeaderProps) {
  const colorMap: Record<string, string> = {
    pos: "text-emerald-400",
    neg: "text-red-400",
    asset: "text-sky-400",
    liability: "text-orange-400",
    time: "text-purple-400",
    goal: "text-yellow-400",
  };
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {totalDisplay && (
          <div className={cn("num text-sm font-semibold mt-0.5", colorMap[totalColor] ?? "text-foreground")}>
            {totalLabel && <span className="text-muted-foreground font-normal mr-1">{totalLabel}</span>}
            {totalDisplay}
          </div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
