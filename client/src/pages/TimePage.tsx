import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import AddItemDialog from "@/components/AddItemDialog";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@shared/schema";

export default function TimePage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TimeEntry | null>(null);
  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({ queryKey: ["/api/time-entries"] });
  const FIELDS = [
    { name: "activity", label: "Занятие", type: "text" as const, placeholder: "Работа", required: true },
    { name: "hoursPerDay", label: "Часов в день", type: "number" as const, placeholder: "8", required: true },
    { name: "daysPerWeek", label: "Дней в неделю", type: "number" as const, placeholder: "5" },
    { name: "category", label: "Категория", type: "select" as const, options: ["Работа", "Сон", "Отдых", "Обучение", "Прочее"] },
  ];
  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/time-entries", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/time-entries"] }); setDialogOpen(false); } });
  const update = useMutation({ mutationFn: (data: any) => apiRequest("PATCH", `/api/time-entries/${editItem?.id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/time-entries"] }); setEditItem(null); } });
  const remove = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/time-entries/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/time-entries"] }) });
  const totalHoursDay = entries.reduce((s, e) => s + e.hoursPerDay, 0);
  const totalHoursWeek = entries.reduce((s, e) => s + e.hoursPerDay * (e.daysPerWeek ?? 5), 0);
  return (
    <>
      <PageHeader title="Время" total={totalHoursDay} totalColor="time" totalDisplay={`${totalHoursDay} ч/день · ${totalHoursWeek} ч/нед`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-8 px-3" data-testid="add-time"><Plus className="w-4 h-4 mr-1" /> Добавить</Button>}
      />
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />)}</div>
      : entries.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-3 opacity-30" /><div className="text-sm">Нет записей о времени</div></div>
      : <div className="space-y-2">{entries.map(entry => <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/20 group"><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{entry.activity}</div>{entry.category && <div className="text-xs text-muted-foreground">{entry.category}</div>}</div><div className="text-right"><div className={cn("num text-sm font-semibold", "text-purple-400")}>{entry.hoursPerDay} ч/д</div><div className="text-xs text-muted-foreground">{entry.daysPerWeek ?? 5} дн/нед</div></div></div>)}</div>}
      <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Добавить занятие" fields={FIELDS} onSubmit={(data) => create.mutate({ ...data, hoursPerDay: parseFloat(data.hoursPerDay), daysPerWeek: parseInt(data.daysPerWeek) || 5 })} />
      {editItem && <AddItemDialog open={true} onClose={() => setEditItem(null)} title="Редактировать занятие" fields={FIELDS} defaultValues={{ activity: editItem.activity, hoursPerDay: String(editItem.hoursPerDay), daysPerWeek: String(editItem.daysPerWeek ?? 5), category: editItem.category ?? "" }} onSubmit={(data) => update.mutate({ ...data, hoursPerDay: parseFloat(data.hoursPerDay), daysPerWeek: parseInt(data.daysPerWeek) || 5 })} />}
    </>
  );
}
