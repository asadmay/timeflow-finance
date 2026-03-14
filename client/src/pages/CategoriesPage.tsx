import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/PageHeader";
import type { IncomeCategory, ExpenseCategory } from "@shared/schema";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: incomeCategories = [] } = useQuery<IncomeCategory[]>({ queryKey: ["/api/income-categories"] });
  const { data: expenseCategories = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["/api/expense-categories"] });

  const createIncome = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/income-categories", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/income-categories"] }); setDialogOpen(false); setNewName(""); } });
  const createExpense = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/expense-categories", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expense-categories"] }); setDialogOpen(false); setNewName(""); } });
  const deleteIncome = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/income-categories/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/income-categories"] }) });
  const deleteExpense = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/expense-categories/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/expense-categories"] }) });

  const categories = tab === "income" ? incomeCategories : expenseCategories;

  function handleCreate() {
    if (!newName.trim()) return;
    if (tab === "income") createIncome.mutate({ name: newName.trim() });
    else createExpense.mutate({ name: newName.trim() });
  }

  return (
    <>
      <PageHeader title="Категории" totalDisplay={`${categories.length} категорий`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-category"><Plus className="w-4 h-4 mr-1" /> Добавить</Button>}
      />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("income")} className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${tab === "income" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "border-border/30 text-muted-foreground"}`} data-testid="tab-income">Доходы ({incomeCategories.length})</button>
        <button onClick={() => setTab("expense")} className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${tab === "expense" ? "bg-red-500/15 border-red-500/30 text-red-400" : "border-border/30 text-muted-foreground"}`} data-testid="tab-expense">Расходы ({expenseCategories.length})</button>
      </div>
      {categories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Нет категорий</div>
      ) : (
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <div key={cat.id} data-testid={`category-${cat.id}`} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card border border-border/20 group">
              <span className="text-sm font-medium">{cat.name}</span>
              <button onClick={() => tab === "income" ? deleteIncome.mutate(cat.id) : deleteExpense.mutate(cat.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" data-testid={`delete-category-${cat.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setNewName(""); } }}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle>Новая категория {tab === "income" ? "доходов" : "расходов"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Название</Label><Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} placeholder="Название категории" className="bg-muted/50 border-border/50" data-testid="input-category-name" autoFocus /></div>
            <div className="flex gap-2"><Button variant="outline" className="flex-1 border-border/50" onClick={() => { setDialogOpen(false); setNewName(""); }}>Отмена</Button><Button className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" onClick={handleCreate} data-testid="submit-category">Добавить</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
