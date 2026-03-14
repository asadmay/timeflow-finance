import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  item: any;
  onEdit?: () => void;
  onDelete?: () => void;
  valueLabel?: string;
  subLabel?: string;
}

export default function ItemRow({ item, onEdit, onDelete, valueLabel, subLabel }: ItemRowProps) {
  const displayValue = valueLabel ?? (item.amount != null ? `${new Intl.NumberFormat("ru-RU").format(item.amount)} ₽` : "");

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 group item-card rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
        {subLabel && <div className="text-xs text-muted-foreground">{subLabel}</div>}
      </div>
      <div className="num text-sm font-semibold text-foreground/80 flex-shrink-0">{displayValue}</div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            data-testid={`edit-${item.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            data-testid={`delete-${item.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
