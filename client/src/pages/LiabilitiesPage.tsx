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

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

const CATEGORY_OPTIONS = [
  "Ипотека", "Автокредит", "Потребительский кредит", "Кредитная карта", "Займ", "Прочее",
];

const FIELDS = [
  { name: "name", label: "Название", type: "text" as const, placeholder: "Ипотека", required: true },
  { name: "amount", label: "Сумма долга (₽)", type: "number" as const, placeholder: "2000000", required: true },
  { name: "payment", label: "Платёж / мес (₽)", type: "number" as const, placeholder: "20000" },
  { name: "rate", label: "Ставка (%)", type: "number" as const, placeholder: "12.5" },
  { name: "category", label: "Категория", type: "select" as const, options: CATEGORY_OPTIONS },
];

export default function LiabilitiesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Liability | null>(null);

  const { data: liabilities = [], isLoading } = useQuery<Liability[]>({
    queryKey: ["/api/liabilities"],
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/liabilities", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/liabilities"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/liabilities/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/liabilities"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/liabilities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/liabilities"] }),
  });

  const total = liabilities.reduce((s, l) => s + l.amount, 0);
  const grouped = groupBy(liabilities, l => l.category);

  return (
    <>
      <PageHeader
        title="Пассивы"
        total={total}
        totalColor="neg"
        totalDisplay={`${fmt(total)} ₽`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-liability"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : liabilities.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Нет пассивов</div>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([cat, items]) => (
            <CategorySection
              key={cat}
              title={cat}
              total={items.reduce((s, i) => s + i.amount, 0)}
              totalDisplay={`${fmt(items.reduce((s, i) => s + i.amount, 0))} ₽`}
              totalColor="neg"
            >
              {items.map(item => (
                <ItemRow
                  key={item.id}
                  label={item.name}
                  value={`${fmt(item.amount)} ₽`}
                  valueColor="neg"
                  subtitle={item.payment ? `Платёж: −${fmt(item.payment)} ₽/мес` : undefined}
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
        title={editItem ? "Редактировать пассив" : "Новый пассив"}
        fields={FIELDS}
        initialValues={editItem ? { name: editItem.name, amount: editItem.amount, payment: editItem.payment, rate: editItem.rate, category: editItem.category } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
