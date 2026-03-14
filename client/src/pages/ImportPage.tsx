import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import type { Transaction } from "@shared/schema";

type ZenRow = {
  date: string;
  type: "income" | "expense";
  category: string;
  account: string;
  amount: string;
  description?: string;
  currency: string;
};

type ParseResult = {
  rows: ZenRow[];
  skippedTransfers: number;
  newIncomeCategories: string[];
  newExpenseCategories: string[];
  newAccounts: Array<{ name: string; type: string }>;
  errors: string[];
};

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[\s\u00a0]/g, "").replace(",", ".")) || 0;
}

function parseCsvLine(raw: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of raw) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsvText(
  text: string,
  existingIncomeCats: string[],
  existingExpenseCats: string[],
  existingAccounts: string[]
): ParseResult {
  // Убираем BOM (если есть)
  const cleaned = text.replace(/^\uFEFF/, "");
  const allLines = cleaned.split(/\r?\n/);
  const errors: string[] = [];

  // Если первая строка — служебный заголовок zm_dump, пропускаем его и все пустые строки после
  let startIdx = 0;
  if (allLines[0].replace(/^\uFEFF/, "").toLowerCase().startsWith("zm_dump")) {
    startIdx = 1;
    while (startIdx < allLines.length && !allLines[startIdx].trim()) startIdx++;
  }

  const lines = allLines.slice(startIdx);

  if (lines.length < 2)
    return { rows: [], skippedTransfers: 0, newIncomeCategories: [], newExpenseCategories: [], newAccounts: [], errors: ["Файл пуст"] };

  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, "").toLowerCase().replace(/["']/g, "").trim());
  const idx = (name: string) => headers.indexOf(name);

  const isZenFormat = idx("date") !== -1 && (idx("outcome") !== -1 || idx("income") !== -1);
  const isSimpleFormat = idx("date") !== -1 && idx("amount") !== -1;

  if (!isZenFormat && !isSimpleFormat) {
    return {
      rows: [], skippedTransfers: 0,
      newIncomeCategories: [], newExpenseCategories: [], newAccounts: [],
      errors: [`Неизвестный формат файла. Заголовки: ${headers.join(", ")}`],
    };
  }

  const newIncomeCategories = new Set<string>();
  const newExpenseCategories = new Set<string>();
  const newAccounts = new Map<string, string>();
  const rows: ZenRow[] = [];
  let skippedTransfers = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);
    const get = (name: string) => (idx(name) >= 0 ? cols[idx(name)] ?? "" : "").trim();

    const date = get("date");
    if (!date) { errors.push(`Строка ${i + 1}: нет даты`); continue; }

    const category = get("categoryname") || get("category") || "Прочее";
    const comment = get("comment") || get("description") || get("payee") || "";
    const currency = get("outcomecurrencyshorttitle") || get("incomecurrencyshorttitle") || "RUB";

    let type: "income" | "expense";
    let amount: number;
    let account: string;

    if (isZenFormat) {
      const outcomeAmt = parseAmount(get("outcome"));
      const incomeAmt = parseAmount(get("income"));
      const outcomeAccount = get("outcomeaccountname");
      const incomeAccount = get("incomeaccountname");

      const hasOutcome = outcomeAmt > 0 && !!outcomeAccount;
      const hasIncome = incomeAmt > 0 && !!incomeAccount;

      if (hasOutcome && hasIncome) { skippedTransfers++; continue; }
      else if (hasOutcome) { type = "expense"; amount = outcomeAmt; account = outcomeAccount; }
      else if (hasIncome) { type = "income"; amount = incomeAmt; account = incomeAccount; }
      else { errors.push(`Строка ${i + 1}: нет суммы`); continue; }
    } else {
      const rawAmt = get("amount").replace(/[^\d.,-]/g, "").replace(",", ".");
      amount = Math.abs(parseFloat(rawAmt));
      if (!amount) { errors.push(`Строка ${i + 1}: некорректная сумма`); continue; }
      const rawType = get("type").toLowerCase();
      type = ["income", "доход", "приход"].includes(rawType) ? "income" : "expense";
      account = get("account") || "Основной";
    }

    if (type === "income" && category !== "Прочее" && !existingIncomeCats.includes(category))
      newIncomeCategories.add(category);
    if (type === "expense" && category !== "Прочее" && !existingExpenseCats.includes(category))
      newExpenseCategories.add(category);
    if (account && !existingAccounts.includes(account) && !newAccounts.has(account))
      newAccounts.set(account, "card");

    rows.push({ date, type, category, account, amount: amount.toString(), description: comment, currency });
  }

  return {
    rows, skippedTransfers,
    newIncomeCategories: Array.from(newIncomeCategories),
    newExpenseCategories: Array.from(newExpenseCategories),
    newAccounts: Array.from(newAccounts.entries()).map(([name, type]) => ({ name, type })),
    errors,
  };
}

export default function ImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const { data: incomeCats = [] } = useQuery({ queryKey: ["/api/income-categories"] });
  const { data: expenseCats = [] } = useQuery({ queryKey: ["/api/expense-categories"] });
  const { data: accounts = [] } = useQuery({ queryKey: ["/api/accounts"] });

  const existingIncomeCats = (incomeCats as any[]).map((c: any) => c.name);
  const existingExpenseCats = (expenseCats as any[]).map((c: any) => c.name);
  const existingAccounts = (accounts as any[]).map((a: any) => a.name);

  const importMutation = useMutation({
    mutationFn: async (payload: any) => apiRequest("POST", "/api/import/zenmoney", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/income-categories"] });
      qc.invalidateQueries({ queryKey: ["/api/expense-categories"] });
    },
  });

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { alert("Только .csv файлы"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setParsed(parseCsvText(text, existingIncomeCats, existingExpenseCats, existingAccounts));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = () => {
    if (!parsed || parsed.rows.length === 0) return;
    importMutation.mutate({
      transactions: parsed.rows.map(row => ({
        date: row.date,
        type: row.type,
        categoryName: row.category,
        accountName: row.account,
        amount: Math.round(parseFloat(row.amount) * 100),
        comment: row.description || "",
        currency: row.currency || "RUB",
      })),
      newIncomeCategories: parsed.newIncomeCategories,
      newExpenseCategories: parsed.newExpenseCategories,
      newAccounts: parsed.newAccounts,
    });
  };

  const isSuccess = importMutation.isSuccess;
  const importData = importMutation.data as any;

  return (
    <>
      <PageHeader title="Импорт из Дзенмани" total={0} totalDisplay="" />

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4",
          dragOver ? "border-yellow-400 bg-yellow-400/5" : "border-border/40 hover:border-border/80"
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm font-medium text-foreground mb-1">Перетащите CSV файл из Дзенмани</div>
        <div className="text-xs text-muted-foreground">или нажмите для выбора</div>
        <div className="text-xs text-muted-foreground/50 mt-1">Переводы между счетами пропускаются автоматически</div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {fileName && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground flex-1">{fileName}</span>
          <button onClick={() => { setParsed(null); setFileName(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {parsed && (
        <div className="space-y-3 mb-4">
          {parsed.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Ошибки парсинга ({parsed.errors.length})</span>
              </div>
              {parsed.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="text-xs text-red-300/80">{e}</div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Транзакций к импорту</span>
              <span className="font-semibold text-foreground">{parsed.rows.length}</span>
            </div>
            {parsed.skippedTransfers > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Переводов пропущено</span>
                <span className="text-muted-foreground">{parsed.skippedTransfers}</span>
              </div>
            )}
            {parsed.newIncomeCategories.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Новых кат. доходов</span>
                <span className="font-semibold text-green-400">{parsed.newIncomeCategories.length}</span>
              </div>
            )}
            {parsed.newExpenseCategories.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Новых кат. расходов</span>
                <span className="font-semibold text-red-400">{parsed.newExpenseCategories.length}</span>
              </div>
            )}
            {parsed.newAccounts.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Новых счетов</span>
                <span className="font-semibold text-yellow-400">{parsed.newAccounts.length}</span>
              </div>
            )}
          </div>

          {parsed.rows.length > 0 && !isSuccess && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
            >
              {importMutation.isPending ? "Импорт..." : `Импортировать ${parsed.rows.length} транзакций`}
            </Button>
          )}
        </div>
      )}

      {isSuccess && importData && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-green-400">Импорт завершён</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Импортировано</span>
              <span className="text-green-400 font-semibold">{importData.imported}</span>
            </div>
            {importData.skipped > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Пропущено (дубли)</span>
                <span className="text-yellow-400">{importData.skipped}</span>
              </div>
            )}
          </div>
          <Button size="sm" variant="outline"
            onClick={() => { setParsed(null); setFileName(""); importMutation.reset(); }}
            className="mt-3 border-border/40"
          >
            Импортировать ещё
          </Button>
        </div>
      )}

      <RecentTransactions />
    </>
  );
}

function cn(...args: any[]) { return args.filter(Boolean).join(" "); }

function RecentTransactions() {
  const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const recent = [...transactions].sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 20);
  if (transactions.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Последние ({transactions.length} всего)</h3>
      <div className="space-y-1">
        {recent.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground truncate">{t.comment || t.categoryName || "Прочее"}</div>
              <div className="text-xs text-muted-foreground">{t.date} · {t.accountName} · {t.categoryName}</div>
            </div>
            <span className={`text-xs font-mono font-semibold ml-2 ${t.type === "income" ? "text-green-400" : "text-red-400"}`}>
              {t.type === "income" ? "+" : "−"}{new Intl.NumberFormat("ru-RU").format(t.amount / 100)} ₽
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
