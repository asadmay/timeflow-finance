import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import AddItemDialog from "@/components/AddItemDialog";
import { cn } from "@/lib/utils";
import type { Goal, Account } from "@shared/schema";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(Math.abs(n) / 100));

const FIELDS = [
  { name: "name", label: "Название цели", type: "text" as const, placeholder: "Машина", required: true },
  { name: "targetAmount", label: "Целевая сумма (₽)", type: "number" as const, placeholder: "1500000", required: true },
  { name: "currentAmount", label: "Накоплено (₽)", type: "number" as const, placeholder: "0" },
  { name: "deadline", label: "Срок", type: "date" as const },
];

export default function GoalsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [linkingGoal, setLinkingGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/goals", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/goals"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/goals/${editItem?.id ?? linkingGoal?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/goals"] });
      setEditItem(null);
      setLinkingGoal(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <>
      <PageHeader
        title="Цели"
        total={goals.length}
        totalDisplay={`${goals.length} целей`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-goal"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : goals.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Нет целей</div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = goal.targetAmount > 0
              ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              : 0;
            const linkedAccount = accounts.find(a => a.id === goal.linkedAccountId);
            const displayCurrent = linkedAccount ? linkedAccount.balance : goal.currentAmount;
            const displayPct = goal.targetAmount > 0
              ? Math.min(100, Math.round((displayCurrent / goal.targetAmount) * 100))
              : 0;

            return (
              <div key={goal.id} className="rounded-xl border border-border/40 bg-card/60 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">{goal.name}</h3>
                      {displayPct >= 100 && (
                        <span className="text-yellow-400"><Check className="w-3.5 h-3.5" /></span>
                      )}
                    </div>
                    {linkedAccount && (
                      <div className="text-xs text-muted-foreground mt-0.5">→ {linkedAccount.name}</div>
                    )}
                    {goal.deadline && (
                      <div className="text-xs text-muted-foreground mt-0.5">{goal.deadline}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {/* Link to account */}
                    <Select
                      value={goal.linkedAccountId ? String(goal.linkedAccountId) : "none"}
                      onValueChange={(v) => {
                        update.mutate({ linkedAccountId: v === "none" ? null : parseInt(v) });
                        // temporarily set linkingGoal so update mutation knows which goal
                        setLinkingGoal(goal);
                      }}
                    >
                      <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent text-muted-foreground hover:text-foreground" title="Привязать счёт">
                        <span className="text-xs">🔗</span>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border/50">
                        <SelectItem value="none" className="text-xs">Без счёта</SelectItem>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={String(a.id)} className="text-xs">{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => setEditItem(goal)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => remove.mutate(goal.id)}
                      className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full progress-gold transition-all duration-500"
                    style={{ width: `${displayPct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {fmt(displayCurrent)} ₽
                    {linkedAccount && <span className="ml-1 opacity-50">(с счёта)</span>}
                  </span>
                  <span className="text-yellow-400 font-semibold">{displayPct}% из {fmt(goal.targetAmount)} ₽</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddItemDialog
        open={dialogOpen || !!editItem}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditItem(null); } }}
        title={editItem ? "Редактировать цель" : "Новая цель"}
        fields={FIELDS}
        initialValues={editItem ? { name: editItem.name, targetAmount: editItem.targetAmount, currentAmount: editItem.currentAmount, deadline: editItem.deadline } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
