import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Trash2, Search, Filter, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import TransactionDialog from "@/components/TransactionDialog";
import type { Transaction } from "@shared/schema";

const TYPE_LABEL: Record<string, string> = {
  income: "Доход",
  expense: "Расход",
  transfer: "Перевод",
};

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/transactions"] }),
  });

  const createTx = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/transactions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      setDialogOpen(false);
    },
  });

  const updateTx = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => apiRequest("PATCH", `/api/transactions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      setDialogOpen(false);
    },
  });

  const createTransfer = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/transfers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      setDialogOpen(false);
    },
  });

  const handleTransactionSubmit = (data: any, type: "income" | "expense" | "transfer") => {
    if (editingTx) {
      updateTx.mutate({ id: editingTx.id, data });
    } else if (type === "transfer") {
      createTransfer.mutate(data);
    } else {
      createTx.mutate(data);
    }
  };

  const filtered = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.categoryName.toLowerCase().includes(q) ||
        t.accountName.toLowerCase().includes(q) ||
        t.payee.toLowerCase().includes(q) ||
        t.comment.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n / 100);

  // Group by date
  const groups: Record<string, Transaction[]> = {};
  for (const t of filtered) {
    const d = t.date.substring(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  }
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader
        title="Транзакции"
        totalDisplay={`${transactions.length} записей`}
        action={
          <Button size="sm" onClick={() => { setEditingTx(null); setDialogOpen(true); }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-transaction"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-0.5">Доходы</div>
            <div className="font-mono font-semibold text-emerald-400 text-sm">+{fmt(totalIncome)} ₽</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-0.5">Расходы</div>
            <div className="font-mono font-semibold text-red-400 text-sm">−{fmt(totalExpense)} ₽</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30 border-border/30"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "income", "expense", "transfer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-2.5 h-8 rounded-lg border transition-colors ${
                typeFilter === t
                  ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                  : "border-border/30 text-muted-foreground hover:border-border/60"
              }`}
            >
              {t === "all" ? "Все" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-sm">Нет транзакций</div>
          <div className="text-xs mt-1">Импортируйте данные из Дзен Мани</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Ничего не найдено
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="text-xs text-muted-foreground font-medium mb-1.5 px-1">
                {formatDate(date)}
              </div>
              <div className="rounded-xl border border-border/30 overflow-hidden">
                {groups[date].map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/15 last:border-0 hover:bg-muted/20 transition-colors group"
                    data-testid={`tx-${t.id}`}
                  >
                    <TxIcon type={t.type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground/90 truncate">
                        {t.categoryName || t.payee || t.comment || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.accountName}
                        {t.type === "transfer" && t.payee ? ` → ${t.payee}` : ""}
                        {t.comment && t.type !== "transfer" ? ` · ${t.comment}` : ""}
                      </div>
                    </div>
                    <div className={`font-mono text-xs font-semibold flex-shrink-0 ${
                      t.type === "income" ? "text-emerald-400" :
                      t.type === "expense" ? "text-red-400" : "text-muted-foreground"
                    }`}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : "↔"}
                      {fmt(t.amount)} ₽
                    </div>
                    <div className="flex -mr-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditingTx(t); setDialogOpen(true); }}
                        className="p-2 text-muted-foreground hover:text-yellow-400"
                        data-testid={`edit-tx-${t.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove.mutate(t.id)}
                        className="p-2 text-muted-foreground hover:text-red-400"
                        data-testid={`delete-tx-${t.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTx(null);
        }}
        onSubmit={handleTransactionSubmit}
        isLoading={createTx.isPending || createTransfer.isPending || updateTx.isPending}
        initialData={editingTx}
      />
    </>
  );
}

function TxIcon({ type }: { type: string }) {
  if (type === "income") return <ArrowDownCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
  if (type === "expense") return <ArrowUpCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
  return <ArrowLeftRight className="w-5 h-5 text-cyan-400 flex-shrink-0" />;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}
