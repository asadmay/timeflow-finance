import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Pencil, Check, ChevronDown, ChevronUp, Wallet, PiggyBank, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Profile, Income, Expense, Asset, Liability, Account, Deposit, BrokerPosition, Transaction } from "@shared/schema";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.abs(n)) + " ₽";
}

function StatRow({ label, value, color, onClick }: { label: string; value: string; color?: string; onClick?: () => void }) {
  return (
    <div className={cn("flex items-center justify-between py-2.5 px-0 border-b border-border/20 last:border-0", onClick && "cursor-pointer")} onClick={onClick}>
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

  const manualIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const manualExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const importedIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const importedExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.length > 0 ? importedIncome / 100 : manualIncome;
  const totalExpense = transactions.length > 0 ? importedExpense / 100 : manualExpense;
  const assetCashflow = assets.reduce((s, a) => s + a.cashflow, 0);
  const liabilityPayment = liabilities.reduce((s, l) => s + l.payment, 0);
  const cashflow = totalIncome + assetCashflow - totalExpense - liabilityPayment;
  const totalAssetsValue = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilitiesAmount = liabilities.reduce((s, l) => s + l.amount, 0);
  const activeAccounts = accounts.filter(a => !a.isArchived);
  const accountsTotal = activeAccounts.reduce((s, a) => s + a.balance, 0);
  const activeDeposits = deposits.filter(d => d.isActive);
  const depositsTotal = activeDeposits.reduce((s, d) => s + d.amount, 0);
  const depositsExpected = activeDeposits.reduce((s, d) => s + calcDepositIncome(d), 0);
  const brokerTotal = brokerPositions.reduce((s, p) => s + p.currentPrice * p.quantity, 0);
  const netWorth = accountsTotal + depositsTotal + brokerTotal + (profile?.cash ?? 0) + totalAssetsValue - totalLiabilitiesAmount;

  const saveName = () => { if (nameVal.trim()) updateProfile.mutate({ name: nameVal.trim() }); setEditingName(false); };
  const saveCash = () => { updateProfile.mutate({ cash: parseInt(cashVal) || 0 }); setEditingCash(false); };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        {editingName ? (
          <div className="flex gap-2 flex-1">
            <Input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              className="bg-muted border-border/40 text-foreground font-bold text-xl h-9 flex-1" data-testid="input-profile-name" />
            <button onClick={saveName} className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400"><Check className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-xl font-bold">{profile?.name ?? "..."}</h1>
            <button onClick={() => { setNameVal(profile?.name ?? ""); setEditingName(true); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" data-testid="edit-name">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-0">
        <div className="flex items-center justify-between py-2.5 border-b border-border/20">
          <span className="text-sm text-muted-foreground">Наличные</span>
          {editingCash ? (
            <div className="flex gap-1.5 items-center">
              <Input autoFocus type="number" value={cashVal} onChange={(e) => setCashVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveCash(); if (e.key === "Escape") setEditingCash(false); }}
                className="bg-muted border-border/40 num w-36 h-7 text-sm text-right" data-testid="input-cash" />
              <button onClick={saveCash} className="p-1 rounded bg-yellow-500/20 text-yellow-400"><Check className="w-3 h-3" /></button>
            </div>
          ) : (
            <button onClick={() => { setCashVal(String(profile?.cash ?? 0)); setEditingCash(true); }}
              className="num text-sm font-semibold hover:text-yellow-400 transition-colors flex items-center gap-1" data-testid="cash-value">
              {fmt(profile?.cash ?? 0)}<Pencil className="w-3 h-3 opacity-50" />
            </button>
          )}
        </div>
        <div>
          <button className="w-full flex items-center justify-between py-2.5 border-b border-border/20 hover:bg-muted/20 -mx-1 px-1 rounded transition-colors"
            onClick={() => setShowAccounts(v => !v)} data-testid="toggle-accounts">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />Счета ({activeAccounts.length})
            </span>
            <div className="flex items-center gap-2">
              <span className={cn("num text-sm font-semibold", accountsTotal >= 0 ? "text-cyan-400" : "val-neg")}>{fmt(accountsTotal)}</span>
              {showAccounts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </button>
          {showAccounts && activeAccounts.length > 0 && (
            <div className="pl-5 pb-1">
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
        <StatRow label="Денежный поток / мес" value={`${cashflow >= 0 ? "+" : "−"}${fmt(cashflow)}`} color={cashflow >= 0 ? "val-pos" : "val-neg"} />
        <div className="py-1"><div className="h-px bg-border/40" /></div>
        <StatRow label="Доходы / мес" value={`+${fmt(totalIncome)}`} color="val-pos" />
        <StatRow label="Расходы / мес" value={`−${fmt(totalExpense + liabilityPayment)}`} color="val-neg" />
        <div className="py-1"><div className="h-px bg-border/40" /></div>
        <StatRow label="Стоимость активов" value={fmt(totalAssetsValue)} color="text-sky-400" />
        <StatRow label="Сумма пассивов" value={fmt(totalLiabilitiesAmount)} color="text-orange-400" />
        <div className="py-1"><div className="h-px bg-border/40" /></div>
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
