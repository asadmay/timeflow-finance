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
import type { Income, IncomeCategory, Transaction } from "@shared/schema";

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

export default function IncomesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Income | null>(null);
  const [period, setPeriod] = useState<Period>("current_month");
  const [showManual, setShowManual] = useState(false);

  const { data: incomes = [], isLoading: loadingManual } = useQuery<Income[]>({
    queryKey: ["/api/incomes"],
  });
  const { data: categories = [] } = useQuery<IncomeCategory[]>({
    queryKey: ["/api/income-categories"],
  });
  const { data: transactions = [], isLoading: loadingTx } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const periodDates = getPeriodDates(period);

  const incomeTxns = useMemo(() => {
    const txns = transactions.filter(t => t.type === "income");
    if (!periodDates) return txns;
    return txns.filter(t => t.date >= periodDates.from && t.date <= periodDates.to);
  }, [transactions, periodDates]);

  const catNames = categories.length > 0 ? categories.map(c => c.name) : ["Прочее"];

  const FIELDS = [
    { name: "name", label: "Название", type: "text" as const, placeholder: "Зарплата", required: true },
    { name: "amount", label: "Сумма / мес (₽)", type: "number" as const, placeholder: "50000", required: true },
    { name: "category", label: "Категория", type: "select" as const, options: catNames },
  ];

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/incomes", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/incomes"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/incomes/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/incomes"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/incomes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/incomes"] }),
  });

  const importedTotal = incomeTxns.reduce((s, t) => s + t.amount, 0);
  const manualTotal = incomes.reduce((s, i) => s + i.amount, 0);

  // Group imported by category
  const txByCat: Record<string, Transaction[]> = {};
  for (const t of incomeTxns) {
    const cat = t.categoryName || "Прочее";
    if (!txByCat[cat]) txByCat[cat] = [];
    txByCat[cat].push(t);
  }
  const catsSorted = Object.keys(txByCat).sort();
  const grouped = groupBy(incomes, i => i.category);

  const PERIOD_LABELS: Record<Period, string> = {
    all: "Все время",
    current_month: "Текущий месяц",
    last_month: "Прошлый месяц",
    current_year: "Текущий год",
  };

  return (
    <>
      <PageHeader
        title="Доходы"
        total={importedTotal}
        totalColor="pos"
        totalDisplay={`+${fmt(importedTotal)} ₽`}
        action={
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-income"
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

      {/* Imported transactions */}
      {loadingTx ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : incomeTxns.length > 0 ? (
        <div className="space-y-2">
          {catsSorted.map(cat => {
            const txns = txByCat[cat];
            const catTotal = txns.reduce((s, t) => s + t.amount, 0);
            return (
              <CategorySection
                key={cat}
                title={cat}
                total={catTotal}
                totalDisplay={`+${fmt(catTotal)} ₽`}
                totalColor="pos"
              >
                {txns.map(t => (
                  <ItemRow
                    key={t.id}
                    label={t.description || t.categoryName || "Доход"}
                    value={`+${fmt(t.amount)} ₽`}
                    valueColor="pos"
                    sub={t.date}
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

      {/* Manual incomes toggle */}
      {incomes.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showManual ? "rotate-180" : ""}`} />
            Плановые доходы ({incomes.length}) — {new Intl.NumberFormat("ru-RU").format(manualTotal)} ₽/мес
          </button>
          {showManual && (
            <div className="space-y-2">
              {Object.entries(grouped).map(([cat, items]) => (
                <CategorySection
                  key={cat}
                  title={cat}
                  total={items.reduce((s, i) => s + i.amount, 0)}
                  totalDisplay={`+${new Intl.NumberFormat("ru-RU").format(items.reduce((s, i) => s + i.amount, 0))} ₽`}
                  totalColor="pos"
                >
                  {items.map(item => (
                    <ItemRow
                      key={item.id}
                      label={item.name}
                      value={`+${new Intl.NumberFormat("ru-RU").format(item.amount)} ₽`}
                      valueColor="pos"
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
        title={editItem ? "Редактировать доход" : "Новый доход"}
        fields={FIELDS}
        initialValues={editItem ? { name: editItem.name, amount: editItem.amount, category: editItem.category } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
