import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  onSubmit: (data: Record<string, string>) => void;
  defaultValues?: Record<string, string>;
  initialValues?: Record<string, any>;
  isLoading?: boolean;
}

export default function AddItemDialog({ open, onClose, title, fields, onSubmit, defaultValues, initialValues, isLoading }: AddItemDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      fields.forEach(f => {
        const iv = initialValues?.[f.name] ?? defaultValues?.[f.name];
        init[f.name] = iv != null ? String(iv) : "";
      });
      setValues(init);
    }
  }, [open]);

  function handleSubmit() {
    const hasRequired = fields.filter(f => f.required).every(f => values[f.name]?.trim());
    if (!hasRequired) return;
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {fields.map(field => (
            <div key={field.name}>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{field.label}</Label>
              {field.type === "select" ? (
                <Select value={values[field.name] ?? ""} onValueChange={v => setValues(prev => ({ ...prev, [field.name]: v }))}>
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    {(field.options ?? []).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type}
                  value={values[field.name] ?? ""}
                  onChange={e => setValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                  placeholder={field.placeholder}
                  className="bg-muted/50 border-border/50"
                  data-testid={`input-${field.name}`}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 border-border/50" onClick={onClose}>Отмена</Button>
            <Button className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" onClick={handleSubmit} disabled={isLoading} data-testid="submit-dialog">Сохранить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
