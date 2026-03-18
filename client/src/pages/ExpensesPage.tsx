import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { Plus, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import ItemRow from "@/components/ItemRow";
import CategorySection from "@/components/CategorySection";
import AddItemDialog from "@/components/AddItemDialog";
import { groupBy } from "@/lib/format";
import type { Expense, ExpenseCategory, Transaction } from "@shared/schema";

const fmt = (n: number, cents = true) =>
  new Intl.NumberFormat("ru-RU").format(cents ? n / 100 : n);

type Period = "all" | "current_month" | "last_month" | "current_year";

function getPeriodDates(period: Period): { from: string; to: string } | null {
  const now = new Date();
  if (period === "all") return null;
  if (period === "current_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
  }
  if (period === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
  }
  if (period === "current_year") {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  return null;
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [period, setPeriod] = useState<Period>("current_month");
  const [showManual, setShowManual] = useState(false);

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });
  const { data: transactions = [], isLoading: loadingTx } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const periodDates = getPeriodDates(period);

  const expenseTxns = useMemo(() => {
    const txns = transactions.filter(t => t.type === "expense");
    if (!periodDates) return txns;
    return txns.filter(t => t.date >= periodDates.from && t.date <= periodDates.to);
  }, [transactions, periodDates]);

  const catNames = categories.length > 0 ? categories.map(c => c.name) : ["Прочее"];

  const FIELDS = [
    { name: "name", label: "Название", type: "text" as const, placeholder: "Аренда", required: true },
    { name: "amount", label: "Сумма / мес (₽)", type: "number" as const, placeholder: "30000", required: true },
    { name: "category", label: "Категория", type: "select" as const, options: catNames },
  ];

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/expenses/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/expenses"] }),
  });

  const importedTotal = expenseTxns.reduce((s, t) => s + t.amount, 0);
  const manualTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const txByCat: Record<string, Transaction[]> = {};
  for (const t of expenseTxns) {
    const cat = t.categoryName || "Прочее";
    if (!txByCat[cat]) txByCat[cat] = [];
    txByCat[cat].push(t);
  }
  const catsSorted = Object.keys(txByCat).sort();
  const grouped = groupBy(expenses, e => e.category);

  const PERIOD_LABELS: Record<Period, string> = {
    all: "Все время",
    current_month: "Текущий месяц",
    last_month: "Прошлый месяц",
    current_year: "Текущий год",
  };

  return (
    <>
      <PageHeader
        title="Расходы"
        total={importedTotal}
        totalColor="neg"
        totalDisplay={`−${fmt(importedTotal)} ₽`}
        action={
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-expense"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {/* Period filter */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/30 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Imported expense transactions */}
      {loadingTx ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : expenseTxns.length > 0 ? (
        <div className="space-y-2">
          {catsSorted.map(cat => {
            const txns = txByCat[cat];
            const catTotal = txns.reduce((s, t) => s + t.amount, 0);
            return (
              <CategorySection
                key={cat}
                title={cat}
                total={catTotal}
                totalDisplay={`−${fmt(catTotal)} ₽`}
                totalColor="neg"
              >
                {txns.map(t => (
                  <ItemRow
                    key={t.id}
                    label={t.comment || t.categoryName || "Расход"}
                    value={`−${fmt(t.amount)} ₽`}
                    valueColor="neg"
                    subtitle={t.date}
                  />
                ))}
              </CategorySection>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Нет транзакций. Импортируйте из ZenMoney или добавьте вручную.
        </div>
      )}

      {/* Manual expenses toggle */}
      {expenses.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showManual ? "rotate-180" : ""}`} />
            Плановые расходы ({expenses.length}) — {new Intl.NumberFormat("ru-RU").format(manualTotal)} ₽/мес
          </button>
          {showManual && (
            <div className="space-y-2">
              {Object.entries(grouped).map(([cat, items]) => (
                <CategorySection
                  key={cat}
                  title={cat}
                  total={items.reduce((s, i) => s + i.amount, 0)}
                  totalDisplay={`−${new Intl.NumberFormat("ru-RU").format(items.reduce((s, i) => s + i.amount, 0))} ₽`}
                  totalColor="neg"
                >
                  {items.map(item => (
                    <ItemRow
                      key={item.id}
                      label={item.name}
                      value={`−${new Intl.NumberFormat("ru-RU").format(item.amount)} ₽`}
                      valueColor="neg"
                      onEdit={() => setEditItem(item)}
                      onDelete={() => remove.mutate(item.id)}
                    />
                  ))}
                </CategorySection>
              ))}
            </div>
          )}
        </div>
      )}

      <AddItemDialog
        open={dialogOpen || !!editItem}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditItem(null); } }}
        title={editItem ? "Редактировать расход" : "Новый расход"}
        fields={FIELDS}
        initialValues={editItem ? { name: editItem.name, amount: editItem.amount, category: editItem.category } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
