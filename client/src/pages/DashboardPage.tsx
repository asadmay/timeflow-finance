import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { Pencil, Check, ChevronDown, ChevronUp, Wallet, PiggyBank, Briefcase, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Profile, Income, Expense, Asset, Liability, Account, Deposit, BrokerPosition, Transaction } from "@shared/schema";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.abs(n)) + " ₽";
}

type Period = "current_month" | "last_month" | "current_year" | "all";

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

const PERIOD_LABELS: Record<Period, string> = {
  current_month: "Текущий месяц",
  last_month: "Прошлый месяц",
  current_year: "Текущий год",
  all: "Все время",
};

function StatRow({ label, value, color, onClick }: { label: string; value: string; color?: string; onClick?: () => void }) {
  return (
    <div
      className={cn("flex items-center justify-between py-2.5 px-0 border-b border-border/20 last:border-0", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("num text-sm font-semibold", color ?? "text-foreground")}>{value}</span>
    </div>
  );
}

function calcDepositIncome(deposit: Deposit): number {
  const start = new Date(deposit.startDate);
  const end = new Date(deposit.endDate);
  const days = Math.max(0, (end.getTime() - start.getTime()) / 86400000);
  return Math.round(deposit.amount * (deposit.rate / 100) * (days / 365));
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [editingCash, setEditingCash] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [cashVal, setCashVal] = useState("");
  const [showAccounts, setShowAccounts] = useState(false);
  const [showDeposits, setShowDeposits] = useState(false);
  const [showBroker, setShowBroker] = useState(false);
  const [period, setPeriod] = useState<Period>("current_month");

  const { data: profile } = useQuery<Profile>({ queryKey: ["/api/profile"] });
  const { data: incomes = [] } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });
  const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: assets = [] } = useQuery<Asset[]>({ queryKey: ["/api/assets"] });
  const { data: liabilities = [] } = useQuery<Liability[]>({ queryKey: ["/api/liabilities"] });
  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const { data: deposits = [] } = useQuery<Deposit[]>({ queryKey: ["/api/deposits"] });
  const { data: brokerPositions = [] } = useQuery<BrokerPosition[]>({ queryKey: ["/api/broker-positions"] });

  const updateProfile = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const periodDates = getPeriodDates(period);

  const filteredTxns = useMemo(() => {
    if (!periodDates) return transactions;
    return transactions.filter(t => t.date >= periodDates.from && t.date <= periodDates.to);
  }, [transactions, periodDates]);

  // Income/expense from transactions filtered by period
  const importedIncome = filteredTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const importedExpense = filteredTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Manual (planned) totals
  const manualIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const manualExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // Use imported if available, otherwise manual
  const totalIncome = transactions.length > 0 ? importedIncome / 100 : manualIncome;
  const totalExpense = transactions.length > 0 ? importedExpense / 100 : manualExpense;

  const assetCashflow = assets.reduce((s, a) => s + a.cashflow, 0);
  const liabilityPayment = liabilities.reduce((s, l) => s + l.payment, 0);
  const cashflow = totalIncome + assetCashflow - totalExpense - liabilityPayment;
  const totalAssetsValue = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilitiesAmount = liabilities.reduce((s, l) => s + l.amount, 0);

  // Accounts
  const activeAccounts = accounts.filter(a => !a.isArchived);
  const accountsTotal = activeAccounts.reduce((s, a) => s + a.balance, 0);

  // Deposits
  const activeDeposits = deposits.filter(d => d.isActive);
  const depositsTotal = activeDeposits.reduce((s, d) => s + d.amount, 0);
  const depositsExpected = activeDeposits.reduce((s, d) => s + calcDepositIncome(d), 0);

  // Broker
  const brokerTotal = brokerPositions.reduce((s, p) => s + p.currentPrice * p.quantity, 0);

  const netWorth = accountsTotal + depositsTotal + brokerTotal + (profile?.cash ?? 0) + totalAssetsValue - totalLiabilitiesAmount;

  const saveName = () => {
    if (nameVal.trim()) updateProfile.mutate({ name: nameVal.trim() });
    setEditingName(false);
  };
  const saveCash = () => {
    updateProfile.mutate({ cash: parseInt(cashVal) || 0 });
    setEditingCash(false);
  };

  return (
    <div>
      {/* Name header */}
      <div className="mb-4 flex items-center gap-2">
        {editingName ? (
          <div className="flex gap-2 flex-1">
            <Input
              autoFocus value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              className="bg-muted border-border/40 text-foreground font-bold text-xl h-9 flex-1"
              data-testid="input-profile-name"
            />
            <button onClick={saveName} className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-xl font-bold text-foreground">{profile?.name ?? "..."}</h1>
            <button
              onClick={() => { setNameVal(profile?.name ?? ""); setEditingName(true); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              data-testid="edit-name"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-border/30 flex-1" data-testid="period-select-dashboard">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="space-y-0">
        {/* Cash — editable */}
        <div className="flex items-center justify-between py-2.5 border-b border-border/20">
          <span className="text-sm text-muted-foreground">Наличные</span>
          {editingCash ? (
            <div className="flex gap-1.5 items-center">
              <Input
                autoFocus type="number" value={cashVal}
                onChange={(e) => setCashVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveCash(); if (e.key === "Escape") setEditingCash(false); }}
                className="bg-muted border-border/40 text-foreground num w-36 h-7 text-sm text-right"
                data-testid="input-cash"
              />
              <button onClick={saveCash} className="p-1 rounded bg-yellow-500/20 text-yellow-400">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setCashVal(String(profile?.cash ?? 0)); setEditingCash(true); }}
              className="num text-sm font-semibold text-foreground hover:text-yellow-400 transition-colors flex items-center gap-1"
              data-testid="cash-value"
            >
              {fmt(profile?.cash ?? 0)}
              <Pencil className="w-3 h-3 opacity-50" />
            </button>
          )}
        </div>

        {/* Accounts section */}
        <div>
          <button
            className="w-full flex items-center justify-between py-2.5 border-b border-border/20 hover:bg-muted/20 -mx-1 px-1 rounded transition-colors"
            onClick={() => setShowAccounts(v => !v)}
            data-testid="toggle-accounts"
          >
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              Счета ({activeAccounts.length})
            </span>
            <div className="flex items-center gap-2">
              <span className={cn("num text-sm font-semibold", accountsTotal >= 0 ? "text-cyan-400" : "val-neg")}>{fmt(accountsTotal)}</span>
              {showAccounts ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>
          </button>
          {showAccounts && activeAccounts.length > 0 && (
            <div className="pl-5 pb-1 space-y-0">
              {activeAccounts.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 border-b border-border/10 last:border-0">
                  <span className="text-xs text-muted-foreground">{a.name}</span>
                  <span className={cn("text-xs font-mono font-semibold", a.balance >= 0 ? "text-foreground/80" : "text-red-400")}>
                    {new Intl.NumberFormat("ru-RU").format(a.balance)} {a.currency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deposits section */}
        {activeDeposits.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between py-2.5 border-b border-border/20 hover:bg-muted/20 -mx-1 px-1 rounded transition-colors"
              onClick={() => setShowDeposits(v => !v)}
              data-testid="toggle-deposits"
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <PiggyBank className="w-3.5 h-3.5 text-pink-400" />
                Вклады ({activeDeposits.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="num text-sm font-semibold text-pink-400">{fmt(depositsTotal)}</span>
                {showDeposits ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </div>
            </button>
            {showDeposits && (
              <div className="pl-5 pb-1 space-y-0">
                {activeDeposits.map(d => (
                  <div key={d.id} className="flex justify-between py-1.5 border-b border-border/10 last:border-0">
                    <span className="text-xs text-muted-foreground">{d.name} · {d.rate}%</span>
                    <span className="text-xs font-mono font-semibold text-foreground/80">
                      {new Intl.NumberFormat("ru-RU").format(d.amount)} ₽
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">Ожидаемый доход</span>
                  <span className="text-xs font-mono font-semibold text-yellow-400">+{fmt(depositsExpected)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Broker portfolio */}
        {brokerPositions.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between py-2.5 border-b border-border/20 hover:bg-muted/20 -mx-1 px-1 rounded transition-colors"
              onClick={() => setShowBroker(v => !v)}
              data-testid="toggle-broker"
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                Портфель ({brokerPositions.length} поз.)
              </span>
              <div className="flex items-center gap-2">
                <span className="num text-sm font-semibold text-sky-400">{fmt(brokerTotal)}</span>
                {showBroker ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </div>
            </button>
            {showBroker && (
              <div className="pl-5 pb-1 space-y-0">
                {brokerPositions.slice(0, 10).map(p => (
                  <div key={p.id} className="flex justify-between py-1.5 border-b border-border/10 last:border-0">
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">{p.ticker || p.name}</span>
                    <span className="text-xs font-mono font-semibold text-foreground/80">
                      {new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(p.currentPrice * p.quantity)} ₽
                    </span>
                  </div>
                ))}
                {brokerPositions.length > 10 && (
                  <div className="text-xs text-muted-foreground py-1">...ещё {brokerPositions.length - 10}</div>
                )}
              </div>
            )}
          </div>
        )}

        <StatRow
          label="Денежный поток"
          value={`${cashflow >= 0 ? "+" : "−"}${fmt(cashflow)}`}
          color={cashflow >= 0 ? "val-pos" : "val-neg"}
        />

        <div className="py-1"><div className="h-px bg-border/40" /></div>

        <StatRow label="Доходы" value={`+${fmt(totalIncome)}`} color="val-pos" />
        <StatRow label="Расходы" value={`−${fmt(totalExpense + liabilityPayment)}`} color="val-neg" />

        <div className="py-1"><div className="h-px bg-border/40" /></div>

        <StatRow label="Стоимость активов" value={fmt(totalAssetsValue)} color="text-sky-400" />
        <StatRow label="Сумма пассивов" value={fmt(totalLiabilitiesAmount)} color="text-orange-400" />

        <div className="py-1"><div className="h-px bg-border/40" /></div>

        {/* Net worth highlight */}
        <div className="flex items-center justify-between py-3 mt-1 px-4 rounded-xl bg-muted/50 border border-border/40">
          <span className="text-sm font-medium text-muted-foreground">Чистый капитал</span>
          <span className={cn("num text-base font-bold", netWorth >= 0 ? "text-yellow-400" : "val-neg")}>
            {netWorth >= 0 ? "" : "−"}{fmt(netWorth)}
          </span>
        </div>
      </div>
    </div>
  );
}
