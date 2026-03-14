import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import AddItemDialog from "@/components/AddItemDialog";
import { cn } from "@/lib/utils";
import type { Goal } from "@shared/schema";

const CATEGORIES = ["Мечта", "Финансы", "Образование", "Недвижимость", "Путешествие", "Прочее"];
const FIELDS = [
  { name: "name", label: "Название цели", type: "text" as const, placeholder: "Купить квартиру", required: true },
  { name: "targetAmount", label: "Целевая сумма (₽)", type: "number" as const, placeholder: "5000000", required: true },
  { name: "currentAmount", label: "Накоплено (₽)", type: "number" as const, placeholder: "0" },
  { name: "category", label: "Категория", type: "select" as const, options: CATEGORIES },
];

function GoalCard({ goal, onEdit, onDelete, onToggle }: { goal: Goal; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round(goal.currentAmount / goal.targetAmount * 100)) : 0;
  const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
  return (
    <div data-testid={`goal-${goal.id}`} className={cn("p-4 rounded-xl border transition-all duration-200", goal.isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/40 hover:border-border/70")}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <button onClick={onToggle} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all", goal.isCompleted ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-yellow-400")}>
            {goal.isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>
          <div>
            <div className={cn("text-sm font-semibold", goal.isCompleted && "line-through text-muted-foreground")}>{goal.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{goal.category}</div>
          </div>
        </div>
        <div className="flex gap-1 ml-2">
          <button onClick={onEdit} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", goal.isCompleted ? "progress-green" : "progress-gold")} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between items-center">
          <span className="num text-xs text-muted-foreground">{fmt(goal.currentAmount)} ₽</span>
          <span className="num text-xs font-semibold text-yellow-400">{pct}%</span>
          <span className="num text-xs text-muted-foreground">{fmt(goal.targetAmount)} ₽</span>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const { data: goals = [], isLoading } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });
  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/goals", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/goals"] }); setDialogOpen(false); } });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/goals/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/goals"] }); setEditItem(null); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/goals/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/goals"] }) });
  const completed = goals.filter(g => g.isCompleted).length;
  return (
    <>
      <PageHeader title="Цели" totalLabel="Выполнено" totalDisplay={`${completed} / ${goals.length}`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-goal"><Plus className="w-4 h-4 mr-1" /> Добавить</Button>}
      />
      {isLoading ? <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      : goals.length === 0 ? <div className="text-center py-12 text-muted-foreground"><div className="text-3xl mb-3">🎯</div><div className="text-sm">Нет целей</div><div className="text-xs mt-1">Добавьте свои финансовые мечты</div></div>
      : <div className="space-y-3">{goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={() => setEditItem(goal)} onDelete={() => remove.mutate(goal.id)} onToggle={() => update.mutate({ id: goal.id, data: { isCompleted: !goal.isCompleted } })} />)}</div>}
      <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Новая цель" fields={FIELDS} onSubmit={(data) => create.mutate({ ...data, isCompleted: false })} />
      {editItem && <AddItemDialog open={true} onClose={() => setEditItem(null)} title="Редактировать цель" fields={FIELDS} initialValues={editItem} onSubmit={(data) => update.mutate({ id: editItem!.id, data })} />}
    </>
  );
}
