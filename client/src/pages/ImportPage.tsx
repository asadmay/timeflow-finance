import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import type { IncomeCategory, ExpenseCategory, Account } from "@shared/schema";
import * as XLSX from "xlsx";

interface ParsedTransaction {
  date: string; type: "income" | "expense" | "transfer";
  amount: number; currency: string; categoryName: string;
  accountName: string; payee: string; comment: string;
}
interface BrokerPosition {
  ticker: string; isin: string; name: string; quantity: number;
  avgPrice: number; currentPrice: number; currency: string; type: string; broker: string;
}
interface ImportPreview {
  transactions: ParsedTransaction[];
  newIncomeCategories: string[]; newExpenseCategories: string[];
  newAccounts: { name: string; type: string }[];
}
interface BrokerPreview {
  broker: "vtb" | "sber" | "other"; accountName: string;
  positions: BrokerPosition[]; totalValue: number;
}

function parseZenMoneyCsv(text: string): ParsedTransaction[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split("\n");
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes("date") && lines[i].includes("categoryName")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) throw new Error("Не найден заголовок файла");
  const dataText = lines.slice(headerIdx).join("\n");
  function parseCsvRow(line: string): string[] {
    const result: string[] = []; let cur = ""; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; } }
      else if (ch === "," && !inQuotes) { result.push(cur); cur = ""; }
      else { cur += ch; }
    }
    result.push(cur); return result;
  }
  const allLines = dataText.split("\n").filter(l => l.trim());
  const headers = parseCsvRow(allLines[0]).map(h => h.trim());
  const col = (row: string[], name: string) => { const idx = headers.indexOf(name); return idx >= 0 ? (row[idx] || "").trim() : ""; };
  function parseRuNum(s: string): number { return parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0; }
  const txns: ParsedTransaction[] = [];
  for (let i = 1; i < allLines.length; i++) {
    const row = parseCsvRow(allLines[i]);
    if (row.length < 5) continue;
    const date = col(row, "date");
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
    const outcomeRaw = parseRuNum(col(row, "outcome"));
    const incomeRaw = parseRuNum(col(row, "income"));
    const category = col(row, "categoryName") || "Прочее";
    const payee = col(row, "payee"); const comment = col(row, "comment");
    const outcomeAccount = col(row, "outcomeAccountName"); const incomeAccount = col(row, "incomeAccountName");
    const outCurrency = col(row, "outcomeCurrencyShortTitle") || "RUB";
    const inCurrency = col(row, "incomeCurrencyShortTitle") || "RUB";
    if (outcomeRaw > 0 && incomeRaw > 0) {
      txns.push({ date: date.substring(0,10), type: "transfer", amount: Math.round(outcomeRaw*100), currency: outCurrency, categoryName: category || "Перевод", accountName: outcomeAccount, payee: incomeAccount, comment });
    } else if (outcomeRaw > 0) {
      txns.push({ date: date.substring(0,10), type: "expense", amount: Math.round(outcomeRaw*100), currency: outCurrency, categoryName: category, accountName: outcomeAccount, payee, comment });
    } else if (incomeRaw > 0) {
      txns.push({ date: date.substring(0,10), type: "income", amount: Math.round(incomeRaw*100), currency: inCurrency, categoryName: category, accountName: incomeAccount, payee, comment });
    }
  }
  return txns;
}

function parseVtbXls(buffer: ArrayBuffer): { positions: BrokerPosition[]; totalValue: number } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames.find(s => s === "Брокер_отчет") || workbook.SheetNames.find(s => s === "brokerage_report") || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const positions: BrokerPosition[] = []; let totalValue = 0;
  let inSecuritiesSection = false; let currentType = "stock"; let formatDetected: "A" | "B" | null = null;
  const clean = (v: any): string => (v != null ? String(v).trim() : "");
  const num = (v: any): number => { if (v == null) return 0; const s = String(v).replace(/\s/g, "").replace(",", "."); return parseFloat(s) || 0; };
  const isSecurityName = (s: string) => s.length > 3 && !s.includes("Отчет") && !s.includes("Наименование") && !s.includes("Движение") && s !== "АКЦИЯ" && s !== "ОБЛИГАЦИЯ" && !s.startsWith("ИТОГО");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]; if (!row) continue;
    const c0 = clean(row[0]); const c1 = clean(row[1]);
    if (c0.includes("Отчет об остатках") || c1.includes("Отчет об остатках")) { inSecuritiesSection = true; continue; }
    if (!inSecuritiesSection) continue;
    if (c0.includes("Наименование ценной") || c1.includes("Наименование ценной")) continue;
    if (c0.includes("Движение") || c1.includes("Движение")) break;
    const typeCandidate = c0 || c1;
    if (typeCandidate === "АКЦИЯ") { currentType = "stock"; continue; }
    if (typeCandidate === "ОБЛИГАЦИЯ") { currentType = "bond"; continue; }
    if (typeCandidate === "ПИФ" || typeCandidate.includes("ФОНД")) { currentType = "fund"; continue; }
    if (typeCandidate === "ИТОГО:" || typeCandidate === "ИТОГО") { for (let c = row.length-1; c >= 0; c--) { const v = num(row[c]); if (v > 100) { totalValue = v; break; } } break; }
    if (formatDetected === null) { if (isSecurityName(c0)) formatDetected = "A"; else if (isSecurityName(c1)) formatDetected = "B"; else continue; }
    let nameCell: string; let qty: number; let price: number; let valuation: number;
    if (formatDetected === "A") { nameCell = c0; if (!isSecurityName(nameCell)) continue; qty = num(row[19]); price = num(row[31]); valuation = num(row[55]) || num(row[51]); }
    else { nameCell = c1; if (!isSecurityName(nameCell)) continue; qty = num(row[11]); price = num(row[15]); valuation = num(row[27]) || num(row[31]); }
    if (qty <= 0) continue;
    const parts = nameCell.split(",").map(p => p.trim());
    const name = parts[0] || nameCell;
    const isin = parts.find(p => /^[A-Z]{2}[A-Z0-9]{10}$/.test(p)) || "";
    const currentPrice = qty > 0 && valuation > 0 ? valuation / qty : price;
    totalValue += valuation;
    positions.push({ ticker: "", isin, name, quantity: qty, avgPrice: price, currentPrice, currency: "RUB", type: currentType, broker: "vtb" });
  }
  return { positions, totalValue };
}

export default function ImportPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"zenmoney" | "vtb" | "sber">("zenmoney");
  const [zenPreview, setZenPreview] = useState<ImportPreview | null>(null);
  const [brokerPreview, setBrokerPreview] = useState<BrokerPreview | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");
  const { data: incomeCats = [] } = useQuery<IncomeCategory[]>({ queryKey: ["/api/income-categories"] });
  const { data: expenseCats = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["/api/expense-categories"] });
  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const importZen = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/import/zenmoney", data),
    onSuccess: (data: any) => { qc.invalidateQueries({ queryKey: ["/api/transactions"] }); qc.invalidateQueries({ queryKey: ["/api/accounts"] }); qc.invalidateQueries({ queryKey: ["/api/income-categories"] }); qc.invalidateQueries({ queryKey: ["/api/expense-categories"] }); setZenPreview(null); setFileName(""); toast({ description: `Импортировано ${data.imported} транзакций` }); },
    onError: (e: any) => toast({ description: `Ошибка: ${e.message}`, variant: "destructive" }),
  });
  const importBroker = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/import/broker", data),
    onSuccess: (data: any) => { qc.invalidateQueries({ queryKey: ["/api/broker-positions"] }); qc.invalidateQueries({ queryKey: ["/api/accounts"] }); setBrokerPreview(null); setFileName(""); toast({ description: `Импортировано ${data.imported} позиций` }); },
    onError: (e: any) => toast({ description: `Ошибка: ${e.message}`, variant: "destructive" }),
  });
  async function handleFile(file: File) {
    setParseError(""); setZenPreview(null); setBrokerPreview(null); setFileName(file.name);
    try {
      if (tab === "zenmoney") {
        const text = await file.text();
        const txns = parseZenMoneyCsv(text);
        if (txns.length === 0) { setParseError("Транзакций не найдено."); return; }
        const existingInCatNames = new Set(incomeCats.map(c => c.name));
        const existingExCatNames = new Set(expenseCats.map(c => c.name));
        const existingAccountNames = new Set(accounts.map(a => a.name));
        const newInCats = new Set<string>(); const newExCats = new Set<string>(); const newAccs = new Set<string>();
        for (const t of txns) {
          if (t.type === "income" && t.categoryName && !existingInCatNames.has(t.categoryName)) newInCats.add(t.categoryName);
          if (t.type === "expense" && t.categoryName && !existingExCatNames.has(t.categoryName)) newExCats.add(t.categoryName);
          if (t.accountName && !existingAccountNames.has(t.accountName)) newAccs.add(t.accountName);
          if (t.payee && t.type === "transfer" && !existingAccountNames.has(t.payee)) newAccs.add(t.payee);
        }
        setZenPreview({ transactions: txns, newIncomeCategories: Array.from(newInCats), newExpenseCategories: Array.from(newExCats), newAccounts: Array.from(newAccs).map(name => ({ name, type: "card" })) });
      } else {
        const broker = tab as "vtb" | "sber";
        const buffer = await file.arrayBuffer();
        const { positions, totalValue } = parseVtbXls(buffer);
        if (positions.length === 0) { setParseError("Позиций не найдено."); return; }
        setBrokerPreview({ broker, accountName: broker === "vtb" ? "ВТБ ИИС" : "Сбер Брокер", positions, totalValue });
      }
    } catch (err: any) { setParseError(`Ошибка разбора файла: ${err.message}`); }
  }
  function confirmZenImport() {
    if (!zenPreview) return;
    importZen.mutate({ transactions: zenPreview.transactions.map(t => ({ ...t, source: "zenmoney" })), newIncomeCategories: zenPreview.newIncomeCategories, newExpenseCategories: zenPreview.newExpenseCategories, newAccounts: zenPreview.newAccounts });
  }
  function confirmBrokerImport() {
    if (!brokerPreview) return;
    importBroker.mutate({ broker: brokerPreview.broker, accountName: brokerPreview.accountName, positions: brokerPreview.positions.map(p => ({ ...p, accountId: null })), totalValue: brokerPreview.totalValue });
  }
  function resetFile() { setFileName(""); setZenPreview(null); setBrokerPreview(null); setParseError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }
  const incomeCount = zenPreview?.transactions.filter(t => t.type === "income").length ?? 0;
  const expenseCount = zenPreview?.transactions.filter(t => t.type === "expense").length ?? 0;
  const transferCount = zenPreview?.transactions.filter(t => t.type === "transfer").length ?? 0;
  return (
    <>
      <PageHeader title="Импорт" totalDisplay="" />
      <Tabs value={tab} onValueChange={v => { setTab(v as any); resetFile(); }}>
        <TabsList className="bg-muted/50 border border-border/30 w-full h-9 mb-5">
          <TabsTrigger value="zenmoney" className="flex-1 text-xs data-[state=active]:bg-card" data-testid="tab-zenmoney">Дзен Мани</TabsTrigger>
          <TabsTrigger value="vtb" className="flex-1 text-xs data-[state=active]:bg-card" data-testid="tab-vtb">ВТБ Брокер</TabsTrigger>
          <TabsTrigger value="sber" className="flex-1 text-xs data-[state=active]:bg-card" data-testid="tab-sber">Сбер</TabsTrigger>
        </TabsList>
        <TabsContent value="zenmoney">
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/20 border border-border/30 p-4 text-xs text-muted-foreground">
              <div className="font-medium text-foreground/80 mb-2">Экспорт из Дзен Мани</div>
              <div>Настройки → Экспорт данных → CSV (.csv с запятой)</div>
            </div>
            <DropZone accept=".csv,.txt" onFile={handleFile} fileInputRef={fileInputRef} label="CSV файл Дзен Мани" hint=".csv" currentFile={fileName} onReset={resetFile} />
            {parseError && <ErrorBanner message={parseError} />}
            {zenPreview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Всего" value={zenPreview.transactions.length} color="text-foreground" />
                  <StatCard label="Дох / Расх" value={`${incomeCount} / ${expenseCount}`} color="text-emerald-400" />
                  <StatCard label="Переводы" value={transferCount} color="text-cyan-400" />
                  <StatCard label="Новых счётов" value={zenPreview.newAccounts.length} color="text-yellow-400" />
                </div>
                {zenPreview.newAccounts.length > 0 && <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3"><div className="text-xs font-medium text-cyan-400 mb-2">Будут созданы счета ({zenPreview.newAccounts.length}):</div><div className="flex flex-wrap gap-1">{zenPreview.newAccounts.map(a => <Badge key={a.name} variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">{a.name}</Badge>)}</div></div>}
                <div>
                  <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-muted-foreground">Предпросмотр</span><button className="text-xs text-yellow-400 flex items-center gap-1" onClick={() => setShowAll(v => !v)}>{showAll ? <><ChevronUp className="w-3 h-3" />Свернуть</> : <><ChevronDown className="w-3 h-3" />Все</>}</button></div>
                  <div className="rounded-xl border border-border/30 overflow-hidden"><div className="max-h-44 overflow-y-auto">{(showAll ? zenPreview.transactions : zenPreview.transactions.slice(0,8)).map((t, i) => (<div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/15 last:border-0 text-xs"><span className="text-muted-foreground w-20 flex-shrink-0 font-mono">{t.date}</span><span className={`w-16 flex-shrink-0 font-semibold font-mono ${t.type === "income" ? "text-emerald-400" : t.type === "expense" ? "text-red-400" : "text-muted-foreground"}`}>{t.type === "income" ? "+" : t.type === "expense" ? "−" : "↔"}{new Intl.NumberFormat("ru-RU").format(t.amount/100)} ₽</span><span className="flex-1 truncate text-muted-foreground">{t.categoryName || t.payee || t.comment}</span></div>))}</div></div>
                </div>
                <div className="flex gap-2"><Button variant="outline" className="flex-1 border-border/50 text-xs h-9" onClick={resetFile}><X className="w-3.5 h-3.5 mr-1" />Отмена</Button><Button className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs h-9" onClick={confirmZenImport} disabled={importZen.isPending} data-testid="confirm-zenmoney-import"><CheckCircle className="w-3.5 h-3.5 mr-1" />{importZen.isPending ? "Импорт..." : `Импортировать ${zenPreview.transactions.length}`}</Button></div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="vtb">
          <BrokerTab broker="vtb" label="ВТБ Брокер" instructions={["Приложение ВТБ Мои Инвестиции → Прочее", "Отчёты и справки → Заказать брокерский отчёт", "Формат: XLSX"]} accept=".xlsx,.xls" onFile={handleFile} fileInputRef={fileInputRef} currentFile={fileName} onReset={resetFile} preview={brokerPreview?.broker === "vtb" ? brokerPreview : null} parseError={parseError} onConfirm={confirmBrokerImport} isPending={importBroker.isPending} />
        </TabsContent>
        <TabsContent value="sber">
          <BrokerTab broker="sber" label="Сбер Брокер" instructions={["Сбербанк Онлайн → Накопления → Инвестиции", "Портфель → Отчёт брокера → Скачать XLSX"]} accept=".xlsx,.xls" onFile={handleFile} fileInputRef={fileInputRef} currentFile={fileName} onReset={resetFile} preview={brokerPreview?.broker === "sber" ? brokerPreview : null} parseError={parseError} onConfirm={confirmBrokerImport} isPending={importBroker.isPending} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function BrokerTab({ broker, label, instructions, accept, onFile, fileInputRef, currentFile, onReset, preview, parseError, onConfirm, isPending }: { broker: string; label: string; instructions: string[]; accept: string; onFile: (f: File) => void; fileInputRef: React.RefObject<HTMLInputElement>; currentFile: string; onReset: () => void; preview: BrokerPreview | null; parseError: string; onConfirm: () => void; isPending: boolean; }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/20 border border-border/30 p-4 text-xs text-muted-foreground"><div className="font-medium text-foreground/80 mb-2">{label} — инструкция</div>{instructions.map((s, i) => <div key={i}>{i+1}. {s}</div>)}</div>
      <DropZone accept={accept} onFile={onFile} fileInputRef={fileInputRef} label={`Отчёт ${label}`} hint=".xlsx" currentFile={currentFile} onReset={onReset} />
      {parseError && <ErrorBanner message={parseError} />}
      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2"><StatCard label="Позиций" value={preview.positions.length} color="text-foreground" /><StatCard label="Стоимость" value={`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(preview.totalValue)} ₽`} color="text-emerald-400" /></div>
          <div className="rounded-xl border border-border/30 overflow-hidden"><div className="max-h-52 overflow-y-auto">{preview.positions.map((p, i) => (<div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border/15 last:border-0 text-xs"><div className="w-16 flex-shrink-0"><div className="font-mono truncate">{p.isin.slice(-4) || "—"}</div><div className="text-muted-foreground capitalize">{p.type}</div></div><div className="flex-1 min-w-0"><div className="truncate">{p.name}</div><div className="text-muted-foreground">{p.quantity} шт.</div></div><div className="text-right flex-shrink-0"><div className="font-mono text-xs">{new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(p.currentPrice * p.quantity)} ₽</div></div></div>))}</div></div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1 border-border/50 text-xs h-9" onClick={onReset}><X className="w-3.5 h-3.5 mr-1" />Отмена</Button><Button className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs h-9" onClick={onConfirm} disabled={isPending} data-testid={`confirm-${broker}-import`}><CheckCircle className="w-3.5 h-3.5 mr-1" />{isPending ? "Импорт..." : `Импортировать ${preview.positions.length}`}</Button></div>
        </div>
      )}
    </div>
  );
}

function DropZone({ accept, onFile, fileInputRef, label, hint, currentFile, onReset }: { accept: string; onFile: (f: File) => void; fileInputRef: React.RefObject<HTMLInputElement>; label: string; hint: string; currentFile: string; onReset: () => void; }) {
  const [dragging, setDragging] = useState(false);
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) onFile(file); }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) onFile(file); }
  if (currentFile) return (<div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center justify-between"><div className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-yellow-400 flex-shrink-0" /><span className="truncate max-w-[200px]">{currentFile}</span></div><button onClick={onReset} className="text-muted-foreground hover:text-red-400 ml-2"><X className="w-4 h-4" /></button></div>);
  return (<div className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${dragging ? "border-yellow-500/60 bg-yellow-500/5" : "border-border/40 hover:border-border/70"}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} data-testid="dropzone"><input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleChange} /><Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" /><div className="text-sm">{label}</div><div className="text-xs text-muted-foreground mt-1">{hint} · нажмите или перетащите</div></div>);
}
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (<div className="bg-muted/30 rounded-xl p-3 border border-border/30"><div className="text-xs text-muted-foreground mb-0.5">{label}</div><div className={`text-base font-semibold font-mono ${color}`}>{value}</div></div>);
}
function ErrorBanner({ message }: { message: string }) {
  return (<div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{message}</span></div>);
}
