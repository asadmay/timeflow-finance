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
import type { Asset } from "@shared/schema";

export default function AssetsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Asset | null>(null);
  const { data: assets = [], isLoading } = useQuery<Asset[]>({ queryKey: ["/api/assets"] });
  const FIELDS = [
    { name: "name", label: "Название", type: "text" as const, placeholder: "Квартира", required: true },
    { name: "value", label: "Стоимость (₽)", type: "number" as const, placeholder: "5000000", required: true },
    { name: "cashflow", label: "Денежный поток / мес (₽)", type: "number" as const, placeholder: "0" },
    { name: "category", label: "Категория", type: "select" as const, options: ["Недвижимость", "Транспорт", "Инвестиции", "Прочее"] },
  ];
  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/assets", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/assets"] }); setDialogOpen(false); } });
  const update = useMutation({ mutationFn: (data: any) => apiRequest("PATCH", `/api/assets/${editItem?.id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/assets"] }); setEditItem(null); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/assets"] }) });
  const total = assets.reduce((s, a) => s + a.value, 0);
  const grouped = groupBy(assets, (a) => a.category);
  return (
    <>
      <PageHeader title="Активы" total={total} totalColor="asset" totalDisplay={`${new Intl.NumberFormat("ru-RU").format(total)} ₽`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-asset"><Plus className="w-4 h-4 mr-1" /> Добавить</Button>}
      />
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />)}</div>
      : assets.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Нет активов</div>
      : Object.entries(grouped).map(([cat, items]) => <CategorySection key={cat} category={cat}>{items.map(item => <ItemRow key={item.id} item={item} onEdit={() => setEditItem(item)} onDelete={() => remove.mutate(item.id)} valueLabel={`${new Intl.NumberFormat("ru-RU").format(item.value)} ₽`} subLabel={item.cashflow !== 0 ? `+${new Intl.NumberFormat("ru-RU").format(item.cashflow)} ₽/мес` : undefined} />)}</CategorySection>)}
      <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Добавить актив" fields={FIELDS} onSubmit={(data) => create.mutate({ ...data, value: parseInt(data.value), cashflow: parseInt(data.cashflow) || 0 })} />
      {editItem && <AddItemDialog open={true} onClose={() => setEditItem(null)} title="Редактировать актив" fields={FIELDS} defaultValues={{ name: editItem.name, value: String(editItem.value), cashflow: String(editItem.cashflow), category: editItem.category ?? "" }} onSubmit={(data) => update.mutate({ ...data, value: parseInt(data.value), cashflow: parseInt(data.cashflow) || 0 })} />}
    </>
  );
}
