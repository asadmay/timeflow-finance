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

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(Math.abs(n) / 100));

const CATEGORY_OPTIONS = [
  "Недвижимость", "Автомобиль", "Техника", "Инвестиции", "Бизнес", "Прочее",
];

const FIELDS = [
  { name: "name", label: "Название", type: "text" as const, placeholder: "Квартира", required: true },
  { name: "value", label: "Стоимость (₽)", type: "number" as const, placeholder: "5000000", required: true },
  { name: "cashflow", label: "Денежный поток / мес", type: "number" as const, placeholder: "25000" },
  { name: "category", label: "Категория", type: "select" as const, options: CATEGORY_OPTIONS },
];

export default function AssetsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Asset | null>(null);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/assets", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/assets"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/assets/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/assets"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/assets"] }),
  });

  const total = assets.reduce((s, a) => s + a.value, 0);
  const grouped = groupBy(assets, a => a.category);

  return (
    <>
      <PageHeader
        title="Активы"
        total={total}
        totalColor="pos"
        totalDisplay={`${fmt(total)} ₽`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-asset"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : assets.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Нет активов</div>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([cat, items]) => (
            <CategorySection
              key={cat}
              title={cat}
              total={items.reduce((s, i) => s + i.value, 0)}
              totalDisplay={`${fmt(items.reduce((s, i) => s + i.value, 0))} ₽`}
              totalColor="pos"
            >
              {items.map(item => (
                <ItemRow
                  key={item.id}
                  label={item.name}
                  value={`${fmt(item.value)} ₽`}
                  valueColor="pos"
                  subtitle={item.cashflow ? `CF: +${fmt(item.cashflow)} ₽/мес` : undefined}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => remove.mutate(item.id)}
                />
              ))}
            </CategorySection>
          ))}
        </div>
      )}

      <AddItemDialog
        open={dialogOpen || !!editItem}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditItem(null); } }}
        title={editItem ? "Редактировать актив" : "Новый актив"}
        fields={FIELDS}
        initialValues={editItem ? { name: editItem.name, value: editItem.value, cashflow: editItem.cashflow, category: editItem.category } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
