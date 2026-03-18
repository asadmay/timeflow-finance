import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { Plus, Wallet, CreditCard, Building, Briefcase, PiggyBank, ChevronDown, ChevronUp, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import AddItemDialog from "@/components/AddItemDialog";
import { cn } from "@/lib/utils";
import type { Account, Transaction } from "@shared/schema";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

type AccountType = "card" | "cash" | "savings" | "broker" | "crypto" | "other";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  card: <CreditCard className="w-4 h-4" />,
  cash: <Wallet className="w-4 h-4" />,
  savings: <PiggyBank className="w-4 h-4" />,
  broker: <Briefcase className="w-4 h-4" />,
  crypto: <Building className="w-4 h-4" />,
  other: <Wallet className="w-4 h-4" />,
};

const ICON_OPTIONS = [
  "wallet", "credit-card", "piggy-bank", "briefcase", "building", "coins",
  "banknote", "landmark", "trending-up", "star", "home", "car",
];

const ACCOUNT_TYPES = [
  { value: "card", label: "Карта" },
  { value: "cash", label: "Наличные" },
  { value: "savings", label: "Накопительный" },
  { value: "broker", label: "Брокерский" },
  { value: "crypto", label: "Крипто" },
  { value: "other", label: "Другой" },
];

const FIELDS = [
  { name: "name", label: "Название", type: "text" as const, placeholder: "Сбербанк", required: true },
  { name: "type", label: "Тип", type: "select" as const, options: ACCOUNT_TYPES.map(t => t.label) },
  { name: "balance", label: "Баланс (₽)", type: "number" as const, placeholder: "0" },
  { name: "currency", label: "Валюта", type: "text" as const, placeholder: "RUB" },
  { name: "color", label: "Цвет (hex)", type: "text" as const, placeholder: "#6366f1" },
  { name: "icon", label: "Иконка", type: "select" as const, options: ICON_OPTIONS },
];

export default function AccountsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const create = useMutation({
    mutationFn: (data: any) => {
      const typeLabel = data.type;
      const typeValue = ACCOUNT_TYPES.find(t => t.label === typeLabel)?.value ?? typeLabel;
      return apiRequest("POST", "/api/accounts", { ...data, type: typeValue });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => {
      const typeLabel = data.type;
      const typeValue = ACCOUNT_TYPES.find(t => t.label === typeLabel)?.value ?? typeLabel;
      return apiRequest("PATCH", `/api/accounts/${editItem?.id}`, { ...data, type: typeValue });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/accounts"] }),
  });
  const archive = useMutation({
    mutationFn: ({ id, isArchived }: { id: number; isArchived: boolean }) =>
      apiRequest("PATCH", `/api/accounts/${id}`, { isArchived }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/accounts"] }),
  });

  const activeAccounts = accounts.filter(a => !a.isArchived);
  const archivedAccounts = accounts.filter(a => a.isArchived);
  const total = activeAccounts.reduce((s, a) => s + a.balance, 0);

  // Group transactions by accountName for history
  const txByAccount = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const t of transactions) {
      const key = t.accountName;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [transactions]);

  const renderAccount = (account: Account) => {
    const isExpanded = expandedId === account.id;
    const accountTxns = txByAccount[account.name] ?? [];
    const recentTxns = accountTxns.slice(-5).reverse();

    return (
      <div key={account.id} className="rounded-xl border border-border/40 bg-card/60">
        <div className="flex items-center p-3 gap-3">
          {/* Color dot + icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
            style={{ backgroundColor: account.color + "33", color: account.color }}
          >
            {TYPE_ICONS[account.type] ?? <Wallet className="w-4 h-4" />}
          </div>

          {/* Name + type */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{account.name}</div>
            <div className="text-xs text-muted-foreground">
              {ACCOUNT_TYPES.find(t => t.value === account.type)?.label ?? account.type} · {account.currency}
            </div>
          </div>

          {/* Balance */}
          <div className={cn(
            "num text-sm font-bold mr-1",
            account.balance >= 0 ? "text-foreground" : "text-red-400"
          )}>
            {fmt(account.balance)} {account.currency}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setExpandedId(isExpanded ? null : account.id)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="История"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditItem(account)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => archive.mutate({ id: account.id, isArchived: true })}
              className="p-1.5 rounded text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
              title="Архивировать"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => remove.mutate(account.id)}
              className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Transaction history */}
        {isExpanded && (
          <div className="border-t border-border/30 px-3 pb-3 pt-2">
            {recentTxns.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">Нет транзакций</div>
            ) : (
              <div className="space-y-1">
                {recentTxns.map(t => (
                  <div key={t.id} className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                      {t.comment || t.categoryName || t.type}
                    </span>
                    <span className={cn(
                      "text-xs font-mono",
                      t.type === "income" ? "text-green-400" : "text-red-400"
                    )}>
                      {t.type === "income" ? "+" : "−"}{new Intl.NumberFormat("ru-RU").format(t.amount / 100)} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Счета"
        total={total}
        totalDisplay={`${fmt(total)} ₽`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-account"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : (
        <div className="space-y-2">
          {activeAccounts.map(renderAccount)}

          {/* Archived */}
          {archivedAccounts.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowArchived(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                {showArchived ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Архив ({archivedAccounts.length})
              </button>
              {showArchived && (
                <div className="space-y-2 opacity-60">
                  {archivedAccounts.map(account => (
                    <div key={account.id} className="rounded-xl border border-border/30 bg-card/40 p-3 flex items-center gap-3">
                      <div className="flex-1 text-sm text-muted-foreground">{account.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{fmt(account.balance)} {account.currency}</div>
                      <button
                        onClick={() => archive.mutate({ id: account.id, isArchived: false })}
                        className="p-1 rounded text-muted-foreground hover:text-foreground text-xs"
                        title="Восстановить"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => remove.mutate(account.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AddItemDialog
        open={dialogOpen || !!editItem}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditItem(null); } }}
        title={editItem ? "Редактировать счёт" : "Новый счёт"}
        fields={FIELDS}
        initialValues={editItem ? {
          name: editItem.name,
          type: ACCOUNT_TYPES.find(t => t.value === editItem.type)?.label ?? editItem.type,
          balance: editItem.balance,
          currency: editItem.currency,
          color: editItem.color,
          icon: editItem.icon,
        } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
