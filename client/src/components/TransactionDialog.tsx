import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Account, IncomeCategory, ExpenseCategory, Transaction } from "@shared/schema";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any, type: "income" | "expense" | "transfer") => void;
  onDelete?: () => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  initialData?: Transaction | null;
}

export default function TransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  isLoading,
  isDeleting,
  initialData,
}: TransactionDialogProps) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditMode = !!initialData;

  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const { data: incomeCategories = [] } = useQuery<IncomeCategory[]>({ queryKey: ["/api/income-categories"] });
  const { data: expenseCategories = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["/api/expense-categories"] });

  useEffect(() => {
    if (open) {
      setSaved(false);
      if (initialData) {
        setType(initialData.type as any);
        setAmount((initialData.amount / 100).toString());
        setAccountId(initialData.accountId?.toString() || "");
        if (initialData.type === "transfer") {
          setTargetAccountId(initialData.targetAccountId?.toString() || "");
        } else {
          setCategoryId(
            (initialData.incomeCategoryId || initialData.expenseCategoryId)?.toString() || ""
          );
        }
        setDate(initialData.date.substring(0, 10));
        setComment(initialData.comment || "");
      } else {
        setType("expense");
        setAmount("");
        setAccountId(accounts[0]?.id.toString() || "");
        setTargetAccountId("");
        setCategoryId("");
        setDate(new Date().toISOString().split("T")[0]);
        setComment("");
      }
    }
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [open, accounts, initialData]);

  const buildPayload = useCallback(() => {
    const parsedAmount = Math.round(parseFloat(amount) * 100);
    if (!parsedAmount || !accountId) return null;
    if (type === "transfer") {
      if (!targetAccountId) return null;
      return {
        payload: {
          amount: parsedAmount,
          fromAccountId: parseInt(accountId),
          toAccountId: parseInt(targetAccountId),
          date,
          comment,
        },
        txType: "transfer" as const,
      };
    } else {
      if (!categoryId) return null;
      return {
        payload: {
          amount: parsedAmount,
          type,
          accountId: parseInt(accountId),
          [type === "income" ? "incomeCategoryId" : "expenseCategoryId"]: parseInt(categoryId),
          date,
          comment,
        },
        txType: type,
      };
    }
  }, [amount, accountId, targetAccountId, categoryId, date, comment, type]);

  // Autosave with debounce — only in edit mode
  const scheduleAutosave = useCallback(() => {
    if (!isEditMode) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const result = buildPayload();
      if (result) {
        setSaved(false);
        onSubmit(result.payload, result.txType);
        setTimeout(() => setSaved(true), 500);
        setTimeout(() => setSaved(false), 2500);
      }
    }, 900);
  }, [isEditMode, buildPayload, onSubmit]);

  const handleTypeChange = (v: any) => {
    setType(v);
    setCategoryId("");
    setTargetAccountId("");
  };

  const handleFieldChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (isEditMode) scheduleAutosave();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildPayload();
    if (result) onSubmit(result.payload, result.txType);
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border/60 text-foreground max-w-sm"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditMode ? "Редактирование" : "Новая транзакция"}
            </DialogTitle>
            {isEditMode && saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Сохранено
              </span>
            )}
            {isEditMode && isLoading && (
              <span className="text-xs text-muted-foreground">Сохранение...</span>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Тип</Label>
            <Select
              value={type}
              onValueChange={(v) => { handleTypeChange(v); if (isEditMode) scheduleAutosave(); }}
              disabled={!!initialData && initialData.type === "transfer"}
            >
              <SelectTrigger className="bg-muted border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Расход</SelectItem>
                <SelectItem value="income">Доход</SelectItem>
                <SelectItem value="transfer">Перевод</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              {type === "transfer" ? "Со счета" : "Счет"}
            </Label>
            <Select
              value={accountId}
              onValueChange={handleFieldChange(setAccountId)}
              required
            >
              <SelectTrigger className="bg-muted border-border/40">
                <SelectValue placeholder="Выберите счет" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "transfer" ? (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">На счет</Label>
              <Select
                value={targetAccountId}
                onValueChange={handleFieldChange(setTargetAccountId)}
                required
              >
                <SelectTrigger className="bg-muted border-border/40">
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id.toString() !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Категория</Label>
              <Select
                value={categoryId}
                onValueChange={handleFieldChange(setCategoryId)}
                required
              >
                <SelectTrigger className="bg-muted border-border/40">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Сумма (₽)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleFieldChange(setAmount)(e.target.value)}
                required
                className="bg-muted border-border/40 text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Дата</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => handleFieldChange(setDate)(e.target.value)}
                required
                className="bg-muted border-border/40 text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Комментарий</Label>
            <Input
              type="text"
              placeholder="Комментарий (опционально)"
              value={comment}
              onChange={(e) => handleFieldChange(setComment)(e.target.value)}
              className="bg-muted border-border/40 text-foreground"
            />
          </div>

          {isEditMode ? (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onDelete && onDelete()}
                disabled={isDeleting}
                className="flex items-center gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Удаление..." : "Удалить"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-border/40 text-muted-foreground hover:text-foreground"
              >
                Закрыть
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-border/40 text-muted-foreground hover:text-foreground"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !accountId || (type === "transfer" ? !targetAccountId : !categoryId) || !amount}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              >
                {isLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
