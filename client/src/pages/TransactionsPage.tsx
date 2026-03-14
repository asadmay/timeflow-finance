import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Search, Trash2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import type { Transaction } from "@shared/schema";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n / 100);

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });

  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/transactions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/transactions"] }) });
  const clearAll = useMutation({ mutationFn: () => apiRequest("DELETE", "/api/transactions"), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/transactions"] }) });

  const filtered = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.payee || "").toLowerCase().includes(q) || (t.comment || "").toLowerCase().includes(q) || (t.categoryName || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader title="Транзакции" totalDisplay={`${transactions.length} записей`}
        action={transactions.length > 0 ? <Button size="sm" variant="destructive" onClick={() => clearAll.mutate()} className="h-8 px-3 text-xs" data-testid="clear-transactions">Очистить всё</Button> : undefined}
      />
      {transactions.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="flex gap-1 flex-1">
            {(["all", "income", "expense"] as const).map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${filterType === type ? (type === "income" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : type === "expense" ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-muted border-border/50 text-foreground") : "border-border/20 text-muted-foreground"}`}>
                {type === "all" ? "Все" : type === "income" ? "Доходы" : "Расходы"}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="pl-7 h-8 text-xs bg-muted/30 border-border/30" />
          </div>
        </div>
      )}
      {isLoading ? <div className="space-y-1">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />)}</div>
      : transactions.length === 0 ? <div className="text-center py-12 text-muted-foreground"><div className="text-sm">Нет транзакций</div><div className="text-xs mt-1">Загрузите файл на странице Импорт</div></div>
      : (
        <div className="space-y-0.5">
          {filtered.slice(0, 200).map(t => (
            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 group text-xs">
              <span className="text-muted-foreground font-mono w-20 flex-shrink-0">{t.date.substring(0, 10)}</span>
              <span className="flex-1 truncate text-foreground/80">{t.payee || t.comment || "—"}</span>
              {t.categoryName && <span className="text-muted-foreground/60 truncate max-w-[80px]">{t.categoryName}</span>}
              <span className={`font-mono font-semibold flex-shrink-0 ${t.type === "income" ? "text-emerald-400" : "text-red-400"}`}>{t.type === "income" ? "+" : "−"}{fmt(t.amount)} ₽</span>
              <button onClick={() => remove.mutate(t.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 text-muted-foreground transition-all"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          {filtered.length > 200 && <div className="text-center py-2 text-xs text-muted-foreground">... ещё {filtered.length - 200} записей</div>}
        </div>
      )}
    </>
  );
}
