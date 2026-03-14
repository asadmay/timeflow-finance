import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Wallet, CreditCard, Banknote, Briefcase, Bitcoin, MoreHorizontal, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import type { Account } from "@shared/schema";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Наличные", icon: Banknote, color: "#22c55e" },
  { value: "card", label: "Карта", icon: CreditCard, color: "#3b82f6" },
  { value: "checking", label: "Р/счёт", icon: Wallet, color: "#8b5cf6" },
  { value: "broker", label: "Брокер", icon: Briefcase, color: "#06b6d4" },
  { value: "crypto", label: "Крипто", icon: Bitcoin, color: "#f59e0b" },
  { value: "other", label: "Другое", icon: MoreHorizontal, color: "#6b7280" },
];
const defaultForm = { name: "", type: "card", balance: "0", currency: "RUB", color: "#6366f1" };

export default function AccountsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showArchived, setShowArchived] = useState(false);
  const { data: accounts = [], isLoading } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/accounts", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setDialogOpen(false); setForm(defaultForm); toast({ description: "Счёт добавлен" }); } });
  const update = useMutation({ mutationFn: (data: any) => apiRequest("PATCH", `/api/accounts/${editItem?.id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setEditItem(null); toast({ description: "Счёт обновлён" }); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/accounts/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/accounts"] }) });
  const visible = accounts.filter(a => showArchived ? a.isArchived : !a.isArchived);
  const totalBalance = accounts.filter(a => !a.isArchived).reduce((s, a) => s + a.balance, 0);
  function openEdit(a: Account) { setEditItem(a); setForm({ name: a.name, type: a.type, balance: String(a.balance), currency: a.currency, color: a.color }); }
  function handleSubmit() { const data = { ...form, balance: parseInt(form.balance) || 0 }; if (editItem) update.mutate(data); else create.mutate(data); }
  return (
    <>
      <PageHeader title="Счета" total={totalBalance} totalColor="pos" totalDisplay={`${new Intl.NumberFormat("ru-RU").format(totalBalance)} ₽`}
        action={<div className="flex items-center gap-2"><button onClick={() => setShowArchived(v => !v)} className={`text-xs px-2 py-1 rounded-md border transition-colors ${showArchived ? "border-yellow-500/50 text-yellow-400" : "border-border/40 text-muted-foreground"}`} data-testid="toggle-archived">{showArchived ? "Архив" : "Активные"}</button><Button size="sm" onClick={() => { setForm(defaultForm); setDialogOpen(true); }} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-account"><Plus className="w-4 h-4 mr-1" /> Добавить</Button></div>}
      />
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      : visible.length === 0 ? <div className="text-center py-12 text-muted-foreground"><div className="text-3xl mb-3">🏦</div><div className="text-sm">{showArchived ? "Нет архивных счетов" : "Нет счетов"}</div><div className="text-xs mt-1">Добавьте первый счёт</div></div>
      : <div className="space-y-2">{visible.map(account => { const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.type) ?? ACCOUNT_TYPES[5]; const TypeIcon = typeInfo.icon; return (<div key={account.id} data-testid={`account-${account.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-border/60 transition-colors"><div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${account.color}22`, border: `1px solid ${account.color}44` }}><TypeIcon className="w-5 h-5" style={{ color: account.color }} /></div><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{account.name}</div><div className="text-xs text-muted-foreground">{typeInfo.label} · {account.currency}</div></div><div className={`text-sm font-semibold font-mono flex-shrink-0 ${account.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{new Intl.NumberFormat("ru-RU").format(account.balance)} ₽</div><div className="flex gap-1 flex-shrink-0"><button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs" onClick={() => openEdit(account)} data-testid={`edit-account-${account.id}`}>✏</button><button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-red-400 text-xs" onClick={() => update.mutate({ isArchived: !account.isArchived })} title={account.isArchived ? "Восстановить" : "В архив"}><Archive className="w-3.5 h-3.5" /></button><button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-red-400 text-xs" onClick={() => remove.mutate(account.id)} data-testid={`delete-account-${account.id}`}>✕</button></div></div>); })}</div>}
      <Dialog open={dialogOpen || !!editItem} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditItem(null); } }}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Редактировать счёт" : "Новый счёт"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Название</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Моя карта" className="bg-muted/50 border-border/50" data-testid="input-account-name" /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Тип</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border/50">{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Баланс (₽)</Label><Input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} className="bg-muted/50 border-border/50 font-mono" data-testid="input-account-balance" /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Валюта</Label><Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}><SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border/50"><SelectItem value="RUB">RUB</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="CNY">CNY</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Цвет</Label><div className="flex gap-2 flex-wrap">{["#6366f1","#22c55e","#3b82f6","#f59e0b","#ef4444","#ec4899","#06b6d4","#8b5cf6"].map(c => <button key={c} className={`w-7 h-7 rounded-lg ${form.color === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : ""}`} style={{ backgroundColor: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />)}</div></div>
            <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1 border-border/50" onClick={() => { setDialogOpen(false); setEditItem(null); }}>Отмена</Button><Button className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" onClick={handleSubmit} data-testid="submit-account">{editItem ? "Сохранить" : "Добавить"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
