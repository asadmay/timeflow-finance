import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  name?: string;
  label?: string;
  value: string;
  valueColor?: "pos" | "neg" | "neutral";
  subtitle?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  testId?: string;
}

export default function ItemRow({ name, label, value, valueColor = "neutral", subtitle, onEdit, onDelete, testId }: ItemRowProps) {
  const displayName = name || label || "";
  
  return (
    <div
      data-testid={testId}
      className="item-card flex items-center justify-between px-3 py-2.5 rounded-lg group"
    >
      <div className="flex-1 min-w-0 mr-2">
        <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          "num text-sm font-semibold",
          valueColor === "pos" ? "val-pos" :
          valueColor === "neg" ? "val-neg" :
          "text-foreground"
        )}>
          {value}
        </span>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`edit-${testId}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                data-testid={`delete-${testId}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
