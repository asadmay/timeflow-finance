import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import { DatabaseStorage } from "../server/storage";
import {
  insertAccountSchema, insertDepositSchema, insertIncomeCategorySchema,
  insertExpenseCategorySchema, insertBrokerPositionSchema, insertTransactionSchema,
  insertIncomeSchema, insertExpenseSchema, insertAssetSchema, insertLiabilitySchema,
  insertGoalSchema, insertTimeEntrySchema, insertProfileSchema,
} from "../shared/schema";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") 
    ? { rejectUnauthorized: false } 
    : false,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
const storage = new DatabaseStorage(db);

function getPath(req: VercelRequest): string {
  const parts = req.query.path;
  if (Array.isArray(parts)) return "/api/" + parts.join("/");
  if (typeof parts === "string") return "/api/" + parts;
  return "/api";
}

function getId(path: string): number {
  const parts = path.split("/");
  return parseInt(parts[parts.length - 1]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  const method = req.method?.toUpperCase() ?? "GET";
  const body = req.body;

  res.setHeader("Content-Type", "application/json");

  try {
    // ── Profile
    if (path === "/api/profile") {
      if (method === "GET") return res.json(await storage.getProfile());
      if (method === "PUT" || method === "PATCH") {
        const data = insertProfileSchema.partial().parse(body);
        return res.json(await storage.updateProfile(data));
      }
    }

    // ── Accounts
    if (path === "/api/accounts") {
      if (method === "GET") return res.json(await storage.getAccounts());
      if (method === "POST") return res.json(await storage.createAccount(insertAccountSchema.parse(body)));
    }
    if (path.match(/^\/api\/accounts\/\d+$/)) {
      const id = getId(path);
      if (method === "GET") return res.json(await storage.getAccount(id));
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateAccount(id, insertAccountSchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteAccount(id); return res.json({ ok: true }); }
    }

    // ── Deposits
    if (path === "/api/deposits") {
      if (method === "GET") return res.json(await storage.getDeposits());
      if (method === "POST") return res.json(await storage.createDeposit(insertDepositSchema.parse(body)));
    }
    if (path.match(/^\/api\/deposits\/\d+$/)) {
      const id = getId(path);
      if (method === "GET") return res.json(await storage.getDeposit(id));
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateDeposit(id, insertDepositSchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteDeposit(id); return res.json({ ok: true }); }
    }

    // ── Income Categories
    if (path === "/api/income-categories") {
      if (method === "GET") return res.json(await storage.getIncomeCategories());
      if (method === "POST") return res.json(await storage.createIncomeCategory(insertIncomeCategorySchema.parse(body)));
    }
    if (path.match(/^\/api\/income-categories\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateIncomeCategory(id, insertIncomeCategorySchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteIncomeCategory(id); return res.json({ ok: true }); }
    }

    // ── Expense Categories
    if (path === "/api/expense-categories") {
      if (method === "GET") return res.json(await storage.getExpenseCategories());
      if (method === "POST") return res.json(await storage.createExpenseCategory(insertExpenseCategorySchema.parse(body)));
    }
    if (path.match(/^\/api\/expense-categories\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateExpenseCategory(id, insertExpenseCategorySchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteExpenseCategory(id); return res.json({ ok: true }); }
    }

    // ── Transactions
    if (path === "/api/transactions") {
      if (method === "GET") return res.json(await storage.getTransactions());
      if (method === "POST") {
        const { description, ...rest } = body;
        return res.json(await storage.createTransaction(insertTransactionSchema.parse({ ...rest, comment: description || rest.comment || "" })));
      }
      if (method === "DELETE") { await storage.clearTransactions(); return res.json({ ok: true }); }
    }
    if (path === "/api/transactions/batch") {
      if (method === "POST") {
        if (!Array.isArray(body)) return res.status(400).json({ message: "Expected array" });
        const batch = body.slice(0, 50).map((t: any) => {
          const { description, ...rest } = t;
          return insertTransactionSchema.parse({ ...rest, comment: description || rest.comment || "" });
        });
        return res.json(await storage.createTransactionsBatch(batch));
      }
    }
    if (path.match(/^\/api\/transactions\/\d+$/)) {
      const id = getId(path);
      if (method === "DELETE") { await storage.deleteTransaction(id); return res.json({ ok: true }); }
    }

    // ── Import ZenMoney
    if (path === "/api/import/zenmoney") {
      if (method === "POST") {
        console.log(`[import] Received POST request with body:`, {
          transactionCount: body?.transactions?.length,
          newIncomeCategories: body?.newIncomeCategories?.length,
          newExpenseCategories: body?.newExpenseCategories?.length,
          newAccounts: body?.newAccounts?.length,
        });
        
        const { transactions: txns = [], newIncomeCategories = [], newExpenseCategories = [], newAccounts = [] } = body;
        const results = { categoriesCreated: 0, accountsCreated: 0, importErrors: [] };

        // Create income categories
        for (const name of newIncomeCategories as string[]) {
          try { 
            await storage.createIncomeCategory({ name, color: "#22c55e", icon: "trending-up", isDefault: false }); 
            results.categoriesCreated++;
          } catch (err: any) {
            console.warn(`[import] Failed to create income category "${name}":`, err.message);
            results.importErrors.push(`Income category "${name}": ${err.message}`);
          }
        }

        // Create expense categories
        for (const name of newExpenseCategories as string[]) {
          try { 
            await storage.createExpenseCategory({ name, color: "#ef4444", icon: "trending-down", isDefault: false }); 
            results.categoriesCreated++;
          } catch (err: any) {
            console.warn(`[import] Failed to create expense category "${name}":`, err.message);
            results.importErrors.push(`Expense category "${name}": ${err.message}`);
          }
        }

        // Create accounts
        for (const acc of newAccounts as any[]) {
          try { 
            await storage.createAccount({ name: acc.name, type: acc.type || "card", balance: 0, currency: "RUB", color: "#6366f1", icon: "wallet", isArchived: false }); 
            results.accountsCreated++;
          } catch (err: any) {
            console.warn(`[import] Failed to create account "${acc.name}":`, err.message);
            results.importErrors.push(`Account "${acc.name}": ${err.message}`);
          }
        }

        // Получить все счёты и категории для привязки
        const allAccounts = await storage.getAccounts();
        const allIncomeCategories = await storage.getIncomeCategories();
        const allExpenseCategories = await storage.getExpenseCategories();

        // Import transactions in parallel batches with deduplication
        let imported = 0;
        let totalSkipped = 0;
        const batchPromises: Promise<any>[] = [];
        for (let i = 0; i < (txns as any[]).length; i += 50) {
          const chunk = (txns as any[]).slice(i, i + 50).map((t: any) => {
            // Найти счет по имени
            const account = allAccounts.find(a => a.name.toLowerCase() === (t.accountName || "").toLowerCase());
            
            // Найти категорию по типу и имени
            let incomeCategoryId: number | undefined;
            let expenseCategoryId: number | undefined;
            if (t.type === "income" && t.categoryName) {
              const cat = allIncomeCategories.find(c => c.name.toLowerCase() === t.categoryName.toLowerCase());
              incomeCategoryId = cat?.id;
            } else if (t.type === "expense" && t.categoryName) {
              const cat = allExpenseCategories.find(c => c.name.toLowerCase() === t.categoryName.toLowerCase());
              expenseCategoryId = cat?.id;
            }
            
            return {
              date: t.date,
              type: t.type,
              amount: t.amount,
              currency: t.currency || "RUB",
              categoryName: t.categoryName || "",
              accountName: t.accountName || "",
              accountId: account?.id || undefined,
              incomeCategoryId,
              expenseCategoryId,
              payee: t.payee || "",
              comment: t.description || t.comment || "",
              source: t.source || "zenmoney",
            };
          });
          batchPromises.push(
            storage.createTransactionsBatchWithDedup(chunk)
              .then(result => { 
                imported += result.imported.length;
                totalSkipped += result.skipped;
              })
              .catch(err => {
                console.error(`[import] Batch import failed:`, err.message);
                results.importErrors.push(`Batch import: ${err.message}`);
              })
          );
        }
        await Promise.all(batchPromises);

        const response = { 
          imported, 
          skipped: totalSkipped,
          errors: results.importErrors.length > 0 ? results.importErrors : undefined
        };
        console.log(`[import] Complete:`, response);
        return res.json(response);
      }
    }

    // ── Incomes
    if (path === "/api/incomes") {
      if (method === "GET") return res.json(await storage.getIncomes());
      if (method === "POST") return res.json(await storage.createIncome(insertIncomeSchema.parse(body)));
    }
    if (path.match(/^\/api\/incomes\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateIncome(id, insertIncomeSchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteIncome(id); return res.json({ ok: true }); }
    }

    // ── Expenses
    if (path === "/api/expenses") {
      if (method === "GET") return res.json(await storage.getExpenses());
      if (method === "POST") return res.json(await storage.createExpense(insertExpenseSchema.parse(body)));
    }
    if (path.match(/^\/api\/expenses\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateExpense(id, insertExpenseSchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteExpense(id); return res.json({ ok: true }); }
    }

    // ── Assets
    if (path === "/api/assets") {
      if (method === "GET") return res.json(await storage.getAssets());
      if (method === "POST") return res.json(await storage.createAsset(insertAssetSchema.parse(body)));
    }
    if (path.match(/^\/api\/assets\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateAsset(id, insertAssetSchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteAsset(id); return res.json({ ok: true }); }
    }

    // ── Liabilities
    if (path === "/api/liabilities") {
      if (method === "GET") return res.json(await storage.getLiabilities());
      if (method === "POST") return res.json(await storage.createLiability(insertLiabilitySchema.parse(body)));
    }
    if (path.match(/^\/api\/liabilities\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateLiability(id, insertLiabilitySchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteLiability(id); return res.json({ ok: true }); }
    }

    // ── Goals
    if (path === "/api/goals") {
      if (method === "GET") return res.json(await storage.getGoals());
      if (method === "POST") return res.json(await storage.createGoal(insertGoalSchema.parse(body)));
    }
    if (path.match(/^\/api\/goals\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateGoal(id, insertGoalSchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteGoal(id); return res.json({ ok: true }); }
    }

    // ── Broker Positions
    if (path === "/api/broker-positions") {
      if (method === "GET") return res.json(await storage.getBrokerPositions());
      if (method === "POST") return res.json(await storage.createBrokerPosition(insertBrokerPositionSchema.parse(body)));
      if (method === "DELETE") { await storage.clearBrokerPositions(); return res.json({ ok: true }); }
    }
    if (path === "/api/broker-positions/upsert") {
      if (method === "POST") return res.json(await storage.upsertBrokerPosition(insertBrokerPositionSchema.parse(body)));
    }
    if (path.match(/^\/api\/broker-positions\/\d+$/)) {
      const id = getId(path);
      if (method === "DELETE") { await storage.deleteBrokerPosition(id); return res.json({ ok: true }); }
    }

    // ── Time Entries
    if (path === "/api/time-entries") {
      if (method === "GET") return res.json(await storage.getTimeEntries());
      if (method === "POST") return res.json(await storage.createTimeEntry(insertTimeEntrySchema.parse(body)));
    }
    if (path.match(/^\/api\/time-entries\/\d+$/)) {
      const id = getId(path);
      if (method === "PUT" || method === "PATCH") return res.json(await storage.updateTimeEntry(id, insertTimeEntrySchema.partial().parse(body)));
      if (method === "DELETE") { await storage.deleteTimeEntry(id); return res.json({ ok: true }); }
    }

    // ── Transfers
    if (path === "/api/transfers") {
      if (method === "GET") return res.json(await storage.getTransactions({ type: "transfer" }));
      if (method === "POST") {
        const { fromAccountId, toAccountId, amount, date, comment } = body;
        return res.json(await storage.createTransfer({
          fromAccountId: parseInt(fromAccountId),
          toAccountId: parseInt(toAccountId),
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          comment: comment || "",
        }));
      }
    }
    if (path.match(/^\/api\/accounts\/\d+\/transfers$/)) {
      const accountId = parseInt(path.split("/")[3]);
      if (method === "GET") return res.json(await storage.getAccountTransfers(accountId));
    }

    return res.status(404).json({ message: `Not found: ${method} ${path}` });
  } catch (err: any) {
    console.error(`[api] ${method} ${path} error:`, err);
    return res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  }
}
