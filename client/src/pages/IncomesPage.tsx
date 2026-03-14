import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader";
import ItemRow from "@/components/ItemRow";
import CategorySection from "@/components/CategorySection";
import AddItemDialog from "@/components/AddItemDialog";
import { groupBy } from "@/lib/format";
import type { Income, IncomeCategory, Transaction } from "@shared/schema";

const fmt = (n: number, cents = true) => new Intl.NumberFormat("ru-RU").format(cents ? n / 100 : n);

export default function IncomesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Income | null>(null);
  const [tab, setTab] = useState<"manual" | "imported">("imported");

  const { data: incomes = [], isLoading: loadingManual } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });
  const { data: categories = [] } = useQuery<IncomeCategory[]>({ queryKey: ["/api/income-categories"] });
  const { data: transactions = [], isLoading: loadingTx } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });

  const incomeTxns = transactions.filter((t) => t.type === "income");
  const catNames = categories.length > 0 ? categories.map((c) => c.name) : ["Прочее"];
  const FIELDS = [
    { name: "name", label: "Название", type: "text" as const, placeholder: "Зарплата", required: true },
    { name: "amount", label: "Сумма / мес (₽)", type: "number" as const, placeholder: "50000", required: true },
    { name: "category", label: "Категория", type: "select" as const, options: catNames },
  ];

  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/incomes", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/incomes"] }); setDialogOpen(false); } });
  const update = useMutation({ mutationFn: (data: any) => apiRequest("PATCH", `/api/incomes/${editItem?.id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/incomes"] }); setEditItem(null); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/incomes/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/incomes"] }) });

  const manualTotal = incomes.reduce((s, i) => s + i.amount, 0);
  const importedTotal = incomeTxns.reduce((s, t) => s + t.amount, 0);
  const grouped = groupBy(incomes, (i) => i.category);

  return (
    <>
      <PageHeader title="Доходы" total={manualTotal} totalColor="pos"
        totalDisplay={tab === "manual" ? `+${new Intl.NumberFormat("ru-RU").format(manualTotal)} ₽ / мес` : `+${fmt(importedTotal)} ₽`}
        action={tab === "manual" ? <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-income"><Plus className="w-4 h-4 mr-1" /> Добавить</Button> : undefined}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-muted/50 border border-border/30 w-full h-9 mb-4">
          <TabsTrigger value="imported" className="flex-1 text-xs data-[state=active]:bg-card">Из импорта {incomeTxns.length > 0 && `(${incomeTxns.length})`}</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 text-xs data-[state=active]:bg-card">Плановые {incomes.length > 0 && `(${incomes.length})`}</TabsTrigger>
        </TabsList>
        <TabsContent value="imported">
          {loadingTx ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />)}</div>
          : incomeTxns.length === 0 ? <div className="text-center py-12 text-muted-foreground"><ArrowDownCircle className="w-10 h-10 mx-auto mb-3 opacity-30" /><div className="text-sm">Нет импортированных доходов</div><div className="text-xs mt-1">Загрузите файл на странице Импорт</div></div>
          : <div className="space-y-2">{incomeTxns.slice(0,50).map(t => <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/20 text-xs"><span className="text-muted-foreground font-mono w-20">{t.date.substring(0,10)}</span><span className="flex-1 truncate">{t.payee || t.comment || "—"}</span><span className="font-mono font-semibold text-emerald-400">+{fmt(t.amount)} ₽</span></div>)}</div>}
        </TabsContent>
        <TabsContent value="manual">
          {loadingManual ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />)}</div>
          : incomes.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Нет плановых доходов</div>
          : Object.entries(grouped).map(([cat, items]) => <CategorySection key={cat} category={cat}>{items.map(item => <ItemRow key={item.id} item={item} onEdit={() => setEditItem(item)} onDelete={() => remove.mutate(item.id)} />)}</CategorySection>)}
        </TabsContent>
      </Tabs>
      <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Добавить доход" fields={FIELDS} onSubmit={(data) => create.mutate({ ...data, amount: parseInt(data.amount) })} />
      {editItem && <AddItemDialog open={true} onClose={() => setEditItem(null)} title="Редактировать доход" fields={FIELDS} defaultValues={{ name: editItem.name, amount: String(editItem.amount), category: editItem.category ?? "" }} onSubmit={(data) => update.mutate({ ...data, amount: parseInt(data.amount) })} />}
    </>
  );
}
