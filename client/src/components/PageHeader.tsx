interface PageHeaderProps {
  title: string;
  total?: number;
  totalLabel?: string;
  totalColor?: "pos" | "neg" | "neutral" | "custom";
  totalDisplay?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, total, totalLabel = "Всего", totalColor, totalDisplay, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {action}
      </div>
      {(total !== undefined || totalDisplay) && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 border border-border/40">
          <span className="text-sm text-muted-foreground">{totalLabel}</span>
          <span className={`num font-semibold text-base ${
            totalColor === "pos" ? "val-pos" :
            totalColor === "neg" ? "val-neg" :
            "text-foreground"
          }`}>
            {totalDisplay ?? (total ? `${new Intl.NumberFormat("ru-RU").format(Math.abs(total!))} ₽` : "0 ₽")}
          </span>
        </div>
      )}
    </div>
  );
}
