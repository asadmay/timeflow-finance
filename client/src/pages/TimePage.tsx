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
import type { TimeEntry } from "@shared/schema";

const CATEGORY_OPTIONS = [
  "Работа", "Учёба", "Хобби", "Здоровье", "Семья", "Прочее",
];

const FIELDS = [
  { name: "name", label: "Название", type: "text" as const, placeholder: "Работа", required: true },
  { name: "hours", label: "Часов / нед", type: "number" as const, placeholder: "40", required: true },
  { name: "value", label: "Ценность (1-10)", type: "number" as const, placeholder: "8" },
  { name: "type", label: "Категория", type: "select" as const, options: CATEGORY_OPTIONS },
];

export default function TimePage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TimeEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/time-entries", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/time-entries"] }); setDialogOpen(false); },
  });
  const update = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/time-entries/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/time-entries"] }); setEditItem(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/time-entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/time-entries"] }),
  });

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const grouped = groupBy(entries, e => e.type);

  return (
    <>
      <PageHeader
        title="Время"
        total={totalHours}
        totalDisplay={`${totalHours} ч/нед`}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3"
            data-testid="add-time"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Нет записей о времени</div>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([cat, items]) => (
            <CategorySection
              key={cat}
              title={cat}
              total={items.reduce((s, i) => s + i.hours, 0)}
              totalDisplay={`${items.reduce((s, i) => s + i.hours, 0)} ч/нед`}
            >
              {items.map(item => (
                <ItemRow
                  key={item.id}
                  label={item.name}
                  value={`${item.hours} ч/нед`}
                  subtitle={item.value ? `Ценность: ${item.value}/10` : undefined}
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
        title={editItem ? "Редактировать запись" : "Новая запись"}
        fields={FIELDS}
        initialValues={editItem ? { name: editItem.name, hours: editItem.hours, value: editItem.value, type: editItem.type } : undefined}
        onSubmit={(data) => editItem ? update.mutate(data) : create.mutate(data)}
        isLoading={create.isPending || update.isPending}
      />
    </>
  );
}
