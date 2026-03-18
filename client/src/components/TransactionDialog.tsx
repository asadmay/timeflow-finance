import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { Account, IncomeCategory, ExpenseCategory } from "@shared/schema";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any, type: "income" | "expense" | "transfer") => void;
  isLoading?: boolean;
}

export default function TransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: TransactionDialogProps) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [comment, setComment] = useState("");

  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const { data: incomeCategories = [] } = useQuery<IncomeCategory[]>({ queryKey: ["/api/income-categories"] });
  const { data: expenseCategories = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["/api/expense-categories"] });

  useEffect(() => {
    if (open) {
      setType("expense");
      setAmount("");
      setAccountId(accounts[0]?.id.toString() || "");
      setTargetAccountId("");
      setCategoryId("");
      setDate(new Date().toISOString().split("T")[0]);
      setComment("");
    }
  }, [open, accounts]);

  useEffect(() => {
    setCategoryId("");
    setTargetAccountId("");
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(parseFloat(amount) * 100);

    if (!parsedAmount || !accountId) return;

    if (type === "transfer") {
      if (!targetAccountId) return;
      onSubmit(
        {
          amount: parsedAmount,
          fromAccountId: parseInt(accountId),
          toAccountId: parseInt(targetAccountId),
          date,
          comment,
        },
        type
      );
    } else {
      if (!categoryId) return;
      onSubmit(
        {
          amount: parsedAmount,
          type,
          accountId: parseInt(accountId),
          [type === "income" ? "incomeCategoryId" : "expenseCategoryId"]: parseInt(categoryId),
          date,
          comment,
        },
        type
      );
    }
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/60 text-foreground max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Новая транзакция</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Тип</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
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
            <Label className="text-sm text-muted-foreground">{type === 'transfer' ? 'Со счета' : 'Счет'}</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger className="bg-muted border-border/40">
                <SelectValue placeholder="Выберите счет" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "transfer" ? (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">На счет</Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId} required>
                <SelectTrigger className="bg-muted border-border/40">
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id.toString() !== accountId).map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger className="bg-muted border-border/40">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
                onChange={e => setAmount(e.target.value)}
                required
                className="bg-muted border-border/40 text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Дата</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
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
              onChange={e => setComment(e.target.value)}
              className="bg-muted border-border/40 text-foreground"
            />
          </div>

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

        </form>
      </DialogContent>
    </Dialog>
  );
}
