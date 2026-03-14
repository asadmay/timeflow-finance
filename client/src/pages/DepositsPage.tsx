import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import type { Deposit, Account } from "@shared/schema";

const defaultForm = { name: "", bank: "", amount: "0", rate: "0", startDate: new Date().toISOString().split("T")[0], endDate: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0], currency: "RUB", isActive: true, accountId: "" };

function calcExpectedIncome(deposit: Deposit): number {
  const start = new Date(deposit.startDate); const end = new Date(deposit.endDate);
  const days = Math.max(0, (end.getTime() - start.getTime()) / 86400000);
  return Math.round(deposit.amount * (deposit.rate / 100) * (days / 365));
}
function daysLeft(endDate: string): number { return Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 86400000)); }

export default function DepositsPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Deposit | null>(null);
  const [form, setForm] = useState(defaultForm);
  const { data: deposits = [], isLoading } = useQuery<Deposit[]>({ queryKey: ["/api/deposits"] });
  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/deposits", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/deposits"] }); setDialogOpen(false); setForm(defaultForm); toast({ description: "Вклад добавлен" }); } });
  const update = useMutation({ mutationFn: (data: any) => apiRequest("PATCH", `/api/deposits/${editItem?.id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/deposits"] }); setEditItem(null); toast({ description: "Вклад обновлён" }); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/deposits/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/deposits"] }) });
  const totalAmount = deposits.filter(d => d.isActive).reduce((s, d) => s + d.amount, 0);
  const totalExpected = deposits.filter(d => d.isActive).reduce((s, d) => s + calcExpectedIncome(d), 0);
  function openEdit(d: Deposit) { setEditItem(d); setForm({ name: d.name, bank: d.bank, amount: String(d.amount), rate: String(d.rate), startDate: d.startDate, endDate: d.endDate, currency: d.currency, isActive: d.isActive, accountId: d.accountId ? String(d.accountId) : "" }); }
  function handleSubmit() { const data = { ...form, amount: parseInt(form.amount) || 0, rate: parseFloat(form.rate) || 0, accountId: form.accountId ? parseInt(form.accountId) : null }; if (editItem) update.mutate(data); else create.mutate(data); }
  return (
    <>
      <PageHeader title="Вклады" total={totalAmount} totalColor="pos" totalDisplay={`${new Intl.NumberFormat("ru-RU").format(totalAmount)} ₽`}
        action={<Button size="sm" onClick={() => { setForm(defaultForm); setDialogOpen(true); }} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-deposit"><Plus className="w-4 h-4 mr-1" /> Добавить</Button>}
      />
      {deposits.length > 0 && <div className="flex gap-3 mb-4"><div className="flex-1 bg-muted/30 rounded-xl p-3 border border-border/30"><div className="text-xs text-muted-foreground mb-0.5">Сумма вкладов</div><div className="text-sm font-semibold font-mono text-emerald-400">{new Intl.NumberFormat("ru-RU").format(totalAmount)} ₽</div></div><div className="flex-1 bg-muted/30 rounded-xl p-3 border border-border/30"><div className="text-xs text-muted-foreground mb-0.5">Ожидаемый доход</div><div className="text-sm font-semibold font-mono text-yellow-400">+{new Intl.NumberFormat("ru-RU").format(totalExpected)} ₽</div></div></div>}
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      : deposits.length === 0 ? <div className="text-center py-12 text-muted-foreground"><div className="text-3xl mb-3">🐷</div><div className="text-sm">Нет вкладов</div></div>
      : <div className="space-y-2">{deposits.map(deposit => { const expected = calcExpectedIncome(deposit); const left = daysLeft(deposit.endDate); return (<div key={deposit.id} data-testid={`deposit-${deposit.id}`} className={`p-3 rounded-xl border transition-colors ${deposit.isActive && left > 0 ? "bg-muted/30 border-border/30" : "bg-muted/10 border-border/20 opacity-70"}`}><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center flex-shrink-0"><PiggyBank className="w-4 h-4 text-pink-400" /></div><div className="min-w-0"><div className="text-sm font-medium truncate">{deposit.name}</div><div className="text-xs text-muted-foreground">{deposit.bank || "—"} · {deposit.rate}%</div></div></div><div className="text-right flex-shrink-0"><div className="text-sm font-semibold font-mono text-foreground">{new Intl.NumberFormat("ru-RU").format(deposit.amount)} ₽</div><div className="text-xs text-yellow-400">+{new Intl.NumberFormat("ru-RU").format(expected)} ₽</div></div><div className="flex gap-1"><button onClick={() => openEdit(deposit)} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs">✏</button><button onClick={() => remove.mutate(deposit.id)} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-red-400 text-xs">✕</button></div></div></div>); })}</div>}
      <Dialog open={dialogOpen || !!editItem} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditItem(null); } }}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Редактировать вклад" : "Новый вклад"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs text-muted-foreground mb-1 block">Название</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted/50 border-border/50" /></div>
            <div><Label className="text-xs text-muted-foreground mb-1 block">Банк</Label><Input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className="bg-muted/50 border-border/50" /></div>
            <div><Label className="text-xs text-muted-foreground mb-1 block">Сумма (₽)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-muted/50 border-border/50 font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground mb-1 block">Ставка (%)</Label><Input type="number" step="0.1" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} className="bg-muted/50 border-border/50 font-mono" /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label className="text-xs text-muted-foreground mb-1 block">Начало</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-muted/50 border-border/50" /></div><div><Label className="text-xs text-muted-foreground mb-1 block">Окончание</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-muted/50 border-border/50" /></div></div>
            <div className="flex gap-2 pt-1"><Button variant="outline" className="flex-1 border-border/50" onClick={() => { setDialogOpen(false); setEditItem(null); }}>Отмена</Button><Button className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" onClick={handleSubmit}>{editItem ? "Сохранить" : "Добавить"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
