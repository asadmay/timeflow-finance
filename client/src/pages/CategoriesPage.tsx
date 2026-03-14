import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import type { IncomeCategory, ExpenseCategory } from "@shared/schema";

const ICON_OPTIONS = [
  "trending-up", "trending-down", "wallet", "home", "car", "heart",
  "shopping-cart", "coffee", "music", "book", "plane", "star",
  "zap", "gift", "award", "briefcase", "dollar-sign", "percent",
];

const DEFAULT_COLORS = [
  "#22c55e", "#ef4444", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6",
  "#f97316", "#8b5cf6", "#06b6d4", "#84cc16",
];

type CatType = "income" | "expense";

interface CatFormData {
  name: string;
  color: string;
  icon: string;
}

function CategoryForm({
  type, initial, onSave, onCancel, isLoading,
}: {
  type: CatType; initial?: CatFormData; onSave: (data: CatFormData) => void;
  onCancel: () => void; isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? (type === "income" ? "#22c55e" : "#ef4444"));
  const [icon, setIcon] = useState(initial?.icon ?? (type === "income" ? "trending-up" : "trending-down"));

  return (
    <div className="rounded-xl border border-border/40 bg-card/80 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="color" value={color}
          onChange={e => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          title="Цвет"
        />
        <Input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Название категории"
          className="flex-1 bg-muted border-border/40 text-foreground h-8 text-sm"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-12">Иконка</span>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger className="flex-1 h-8 text-xs bg-muted border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            {ICON_OPTIONS.map(i => (
              <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        {DEFAULT_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn(
              "w-5 h-5 rounded-full transition-transform",
              color === c ? "ring-2 ring-white scale-110" : ""
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm" onClick={() => onSave({ name, color, icon })}
          disabled={!name.trim() || isLoading}
          className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-7 text-xs"
        >
          Сохранить
        </Button>
        <Button
          size="sm" variant="outline" onClick={onCancel}
          className="flex-1 border-border/40 h-7 text-xs"
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [addingType, setAddingType] = useState<CatType | null>(null);
  const [editIncome, setEditIncome] = useState<IncomeCategory | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseCategory | null>(null);
  const [activeTab, setActiveTab] = useState<CatType>("income");

  const { data: incomeCategories = [] } = useQuery<IncomeCategory[]>({
    queryKey: ["/api/income-categories"],
  });
  const { data: expenseCategories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  // Income CRUD
  const createIncome = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/income-categories", { ...data, isDefault: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/income-categories"] }); setAddingType(null); },
  });
  const updateIncome = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/income-categories/${editIncome?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/income-categories"] }); setEditIncome(null); },
  });
  const deleteIncome = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/income-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/income-categories"] }),
  });

  // Expense CRUD
  const createExpense = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expense-categories", { ...data, isDefault: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expense-categories"] }); setAddingType(null); },
  });
  const updateExpense = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/expense-categories/${editExpense?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expense-categories"] }); setEditExpense(null); },
  });
  const deleteExpense = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expense-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/expense-categories"] }),
  });

  const renderCategory = (cat: IncomeCategory | ExpenseCategory, type: CatType) => {
    const isEditing = type === "income" ? editIncome?.id === cat.id : editExpense?.id === cat.id;
    if (isEditing) {
      return (
        <CategoryForm
          key={cat.id} type={type}
          initial={{ name: cat.name, color: cat.color, icon: cat.icon }}
          onSave={(data) => type === "income" ? updateIncome.mutate(data) : updateExpense.mutate(data)}
          onCancel={() => type === "income" ? setEditIncome(null) : setEditExpense(null)}
          isLoading={updateIncome.isPending || updateExpense.isPending}
        />
      );
    }
    return (
      <div key={cat.id} className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: cat.color + "33" }}
        >
          <span style={{ color: cat.color }} className="text-xs">
            {cat.icon === "trending-up" ? "↑" : cat.icon === "trending-down" ? "↓" : "●"}
          </span>
        </div>
        <span className="flex-1 text-sm text-foreground">{cat.name}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => type === "income" ? setEditIncome(cat as IncomeCategory) : setEditExpense(cat as ExpenseCategory)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {!cat.isDefault && (
            <button
              onClick={() => type === "income" ? deleteIncome.mutate(cat.id) : deleteExpense.mutate(cat.id)}
              className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Категории" total={incomeCategories.length + expenseCategories.length} totalDisplay={`${incomeCategories.length + expenseCategories.length} катег.`} />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted/30 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("income")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
            activeTab === "income" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="w-3.5 h-3.5 inline mr-1.5 text-green-400" />
          Доходы ({incomeCategories.length})
        </button>
        <button
          onClick={() => setActiveTab("expense")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
            activeTab === "expense" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingDown className="w-3.5 h-3.5 inline mr-1.5 text-red-400" />
          Расходы ({expenseCategories.length})
        </button>
      </div>

      {activeTab === "income" ? (
        <div className="space-y-1">
          {incomeCategories.map(cat => renderCategory(cat, "income"))}

          {addingType === "income" ? (
            <CategoryForm
              type="income"
              onSave={(data) => createIncome.mutate(data)}
              onCancel={() => setAddingType(null)}
              isLoading={createIncome.isPending}
            />
          ) : (
            <Button
              size="sm"
              onClick={() => { setAddingType("income"); setAddingType("income"); }}
              variant="outline"
              className="w-full mt-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Добавить категорию
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {expenseCategories.map(cat => renderCategory(cat, "expense"))}

          {addingType === "expense" ? (
            <CategoryForm
              type="expense"
              onSave={(data) => createExpense.mutate(data)}
              onCancel={() => setAddingType(null)}
              isLoading={createExpense.isPending}
            />
          ) : (
            <Button
              size="sm"
              onClick={() => setAddingType("expense")}
              variant="outline"
              className="w-full mt-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Добавить категорию
            </Button>
          )}
        </div>
      )}
    </>
  );
}
