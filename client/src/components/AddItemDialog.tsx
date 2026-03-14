import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  onSubmit: (data: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  isLoading?: boolean;
}

export default function AddItemDialog({ open, onClose, title, fields, onSubmit, initialValues, isLoading }: AddItemDialogProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues ?? {});

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) { onClose(); setValues(initialValues ?? {}); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processed: Record<string, any> = {};
    for (const f of fields) {
      const val = values[f.name];
      processed[f.name] = f.type === "number" ? (parseInt(val) || 0) : (val ?? "");
    }
    onSubmit(processed);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-card border-border/60 text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">{f.label}</Label>
              {f.type === "select" ? (
                <Select
                  value={values[f.name] ?? ""}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                >
                  <SelectTrigger className="bg-muted border-border/40" data-testid={`select-${f.name}`}>
                    <SelectValue placeholder="Выбрать..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/60">
                    {f.options?.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-foreground">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  className="bg-muted border-border/40 text-foreground placeholder:text-muted-foreground"
                  data-testid={`input-${f.name}`}
                  required={f.required}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border/40 text-muted-foreground hover:text-foreground"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              data-testid="button-submit"
            >
              {isLoading ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
