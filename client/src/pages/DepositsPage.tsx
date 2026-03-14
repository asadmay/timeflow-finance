import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, PiggyBank, Calendar, TrendingUp, Trash2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import AddItemDialog from "@/components/AddItemDialog";
import { cn } from "@/lib/utils";
import type { Deposit } from "@shared/schema";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

function calcIncome(deposit: Deposit): number {
  const start = new Date(deposit.startDate);
  const end = new Date(deposit.endDate);
  const days = Math.max(0, (end.getTime() - start.getTime()) / 86400000);
  return Math.round(deposit.amount * (deposit.rate / 100) * (days / 365));
}

const FIELDS = [
  { name: "name", label: "Название", type: "text" as const, placeholder: "Вклад в Сбербанке", required: true },
  { name: "amount", label: "Сумма (₽)", type: "number" as const, placeholder: "100000", required: true },
  { name: "rate", label: "Ставка (%)", type: "number" as const, placeholder: "16.5", required: true },
  { name: "startDate", label: "Дата начала", type: "date" as const, required: true },
  { name: "endDate", label: "Дата окончания", type: "date" as const, required: true },
  { name: "bank", label: "Банк", type: "text" as const, placeholder: "Сбербанк" },
];

export default function DepositsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Deposit | null>(null);

  const { data: deposits = [], isLoading } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/deposits", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/deposits"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/deposits/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/deposits"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/deposits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/deposits"] }),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/deposits/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/deposits"] }),
  });

  const activeDeposits = deposits.filter(d => d.isActive);
  const closedDeposits = deposits.filter(d => !d.isActive);
  const totalAmount = activeDeposits.reduce((s, d) => s + d.amount, 0);
  const totalExpected = activeDeposits.reduce((s, d) => s + calcIncome(d), 0);

  return (
    <>
      <PageHeader
        title="Вклады"
        total={totalAmount}
        totalDisplay={`${fmt(totalAmount)} ₽`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-deposit"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : deposits.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Нет вкладов</div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          {activeDeposits.length > 0 && (
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Ожидаемый доход</span>
              </div>
              <span className="text-sm font-semibold text-yellow-400">+{fmt(totalExpected)} ₽</span>
            </div>
          )}

          {/* Active deposits */}
          {activeDeposits.map(d => (
            <div key={d.id} className="rounded-xl border border-border/40 bg-card/60 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-3.5 h-3.5 text-pink-400" />
                    <span className="font-semibold text-sm text-foreground">{d.name}</span>
                  </div>
                  {d.bank && <div className="text-xs text-muted-foreground mt-0.5">{d.bank}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggle.mutate({ id: d.id, isActive: false })}
                    className="p-1 rounded text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 transition-colors text-xs"
                    title="Закрыть вклад"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setEditItem(d)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => remove.mutate(d.id)}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Сумма</div>
                  <div className="font-semibold text-foreground">{fmt(d.amount)} ₽</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ставка</div>
                  <div className="font-semibold text-yellow-400">{d.rate}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Срок</div>
                  <div className="font-semibold text-foreground">{d.startDate} – {d.endDate}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Доход</div>
                  <div className="font-semibold text-green-400">+{fmt(calcIncome(d))} ₽</div>
                </div>
              </div>
            </div>
          ))}

          {/* Closed deposits */}
          {closedDeposits.length > 0 && (
            <div className="mt-2 opacity-60">
              <div className="text-xs text-muted-foreground mb-2">Закрытые ({closedDeposits.length})</div>
              {closedDeposits.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <span className="text-sm text-muted-foreground">{d.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{fmt(d.amount)} ₽</span>
                    <button onClick={() => toggle.mutate({ id: d.id, isActive: true })}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >↑</button>
                    <button onClick={() => remove.mutate(d.id)}
                      className="p-1 rounded text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddItemDialog
        open={dialogOpen || !!editItem}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditItem(null); } }}
        title={editItem ? "Редактировать вклад" : "Новый вклад"}
        fields={FIELDS}
        initialValues={editItem ? {
          name: editItem.name, amount: editItem.amount, rate: editItem.rate,
          startDate: editItem.startDate, endDate: editItem.endDate, bank: editItem.bank,
        } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
