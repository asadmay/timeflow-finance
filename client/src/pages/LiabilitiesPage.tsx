import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import ItemRow from "@/components/ItemRow";
import CategorySection from "@/components/CategorySection";
import AddItemDialog from "@/components/AddItemDialog";
import { groupBy } from "@/lib/format";
import type { Liability } from "@shared/schema";

export default function LiabilitiesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Liability | null>(null);
  const { data: liabilities = [], isLoading } = useQuery<Liability[]>({ queryKey: ["/api/liabilities"] });
  const FIELDS = [
    { name: "name", label: "Название", type: "text" as const, placeholder: "Ипотека", required: true },
    { name: "amount", label: "Остаток долга (₽)", type: "number" as const, placeholder: "3000000", required: true },
    { name: "payment", label: "Платёж / мес (₽)", type: "number" as const, placeholder: "30000" },
    { name: "rate", label: "Ставка (%)", type: "number" as const, placeholder: "12" },
    { name: "category", label: "Категория", type: "select" as const, options: ["Ипотека", "Кредит", "Микрозайм", "Прочее"] },
  ];
  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/liabilities", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/liabilities"] }); setDialogOpen(false); } });
  const update = useMutation({ mutationFn: (data: any) => apiRequest("PATCH", `/api/liabilities/${editItem?.id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/liabilities"] }); setEditItem(null); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/liabilities/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/liabilities"] }) });
  const total = liabilities.reduce((s, l) => s + l.amount, 0);
  const grouped = groupBy(liabilities, (l) => l.category);
  return (
    <>
      <PageHeader title="Пассивы" total={total} totalColor="liability" totalDisplay={`${new Intl.NumberFormat("ru-RU").format(total)} ₽`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-liability"><Plus className="w-4 h-4 mr-1" /> Добавить</Button>}
      />
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />)}</div>
      : liabilities.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Нет пассивов</div>
      : Object.entries(grouped).map(([cat, items]) => <CategorySection key={cat} category={cat}>{items.map(item => <ItemRow key={item.id} item={item} onEdit={() => setEditItem(item)} onDelete={() => remove.mutate(item.id)} valueLabel={`${new Intl.NumberFormat("ru-RU").format(item.amount)} ₽`} subLabel={item.payment ? `−${new Intl.NumberFormat("ru-RU").format(item.payment)} ₽/мес` : undefined} />)}</CategorySection>)}
      <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Добавить пассив" fields={FIELDS} onSubmit={(data) => create.mutate({ ...data, amount: parseInt(data.amount), payment: parseInt(data.payment) || 0, rate: parseFloat(data.rate) || 0 })} />
      {editItem && <AddItemDialog open={true} onClose={() => setEditItem(null)} title="Редактировать пассив" fields={FIELDS} defaultValues={{ name: editItem.name, amount: String(editItem.amount), payment: String(editItem.payment), rate: String(editItem.rate), category: editItem.category ?? "" }} onSubmit={(data) => update.mutate({ ...data, amount: parseInt(data.amount), payment: parseInt(data.payment) || 0, rate: parseFloat(data.rate) || 0 })} />}
    </>
  );
}
