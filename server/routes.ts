import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  insertAccountSchema, insertDepositSchema, insertIncomeCategorySchema,
  insertExpenseCategorySchema, insertBrokerPositionSchema, insertTransactionSchema,
  insertIncomeSchema, insertExpenseSchema, insertAssetSchema, insertLiabilitySchema,
  insertGoalSchema, insertTimeEntrySchema, insertProfileSchema,
} from "../shared/schema";

// Express 5 does NOT auto-catch async errors on Vercel — wrap every handler
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export async function registerRoutes(server: Server, app: Express) {
  // ── Profile ──────────────────────────────────────────────────────────
  app.get("/api/profile", wrap(async (_req, res) => {
    res.json(await storage.getProfile());
  }));
  app.put("/api/profile", wrap(async (req, res) => {
    res.json(await storage.updateProfile(insertProfileSchema.partial().parse(req.body)));
  }));
  app.patch("/api/profile", wrap(async (req, res) => {
    res.json(await storage.updateProfile(insertProfileSchema.partial().parse(req.body)));
  }));

  // ── Accounts ─────────────────────────────────────────────────────────
  app.get("/api/accounts", wrap(async (_req, res) => {
    res.json(await storage.getAccounts());
  }));
  app.get("/api/accounts/:id", wrap(async (req, res) => {
    const a = await storage.getAccount(Number(req.params.id));
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  }));
  app.post("/api/accounts", wrap(async (req, res) => {
    res.json(await storage.createAccount(insertAccountSchema.parse(req.body)));
  }));
  app.put("/api/accounts/:id", wrap(async (req, res) => {
    res.json(await storage.updateAccount(Number(req.params.id), insertAccountSchema.partial().parse(req.body)));
  }));
  app.patch("/api/accounts/:id", wrap(async (req, res) => {
    res.json(await storage.updateAccount(Number(req.params.id), insertAccountSchema.partial().parse(req.body)));
  }));
  app.delete("/api/accounts/:id", wrap(async (req, res) => {
    await storage.deleteAccount(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Deposits ─────────────────────────────────────────────────────────
  app.get("/api/deposits", wrap(async (_req, res) => {
    res.json(await storage.getDeposits());
  }));
  app.get("/api/deposits/:id", wrap(async (req, res) => {
    const d = await storage.getDeposit(Number(req.params.id));
    if (!d) return res.status(404).json({ message: "Not found" });
    res.json(d);
  }));
  app.post("/api/deposits", wrap(async (req, res) => {
    res.json(await storage.createDeposit(insertDepositSchema.parse(req.body)));
  }));
  app.put("/api/deposits/:id", wrap(async (req, res) => {
    res.json(await storage.updateDeposit(Number(req.params.id), insertDepositSchema.partial().parse(req.body)));
  }));
  app.patch("/api/deposits/:id", wrap(async (req, res) => {
    res.json(await storage.updateDeposit(Number(req.params.id), insertDepositSchema.partial().parse(req.body)));
  }));
  app.delete("/api/deposits/:id", wrap(async (req, res) => {
    await storage.deleteDeposit(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Income Categories ────────────────────────────────────────────────
  app.get("/api/income-categories", wrap(async (_req, res) => {
    res.json(await storage.getIncomeCategories());
  }));
  app.post("/api/income-categories", wrap(async (req, res) => {
    res.json(await storage.createIncomeCategory(insertIncomeCategorySchema.parse(req.body)));
  }));
  app.put("/api/income-categories/:id", wrap(async (req, res) => {
    res.json(await storage.updateIncomeCategory(Number(req.params.id), insertIncomeCategorySchema.partial().parse(req.body)));
  }));
  app.patch("/api/income-categories/:id", wrap(async (req, res) => {
    res.json(await storage.updateIncomeCategory(Number(req.params.id), insertIncomeCategorySchema.partial().parse(req.body)));
  }));
  app.delete("/api/income-categories/:id", wrap(async (req, res) => {
    await storage.deleteIncomeCategory(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Expense Categories ───────────────────────────────────────────────
  app.get("/api/expense-categories", wrap(async (_req, res) => {
    res.json(await storage.getExpenseCategories());
  }));
  app.post("/api/expense-categories", wrap(async (req, res) => {
    res.json(await storage.createExpenseCategory(insertExpenseCategorySchema.parse(req.body)));
  }));
  app.put("/api/expense-categories/:id", wrap(async (req, res) => {
    res.json(await storage.updateExpenseCategory(Number(req.params.id), insertExpenseCategorySchema.partial().parse(req.body)));
  }));
  app.patch("/api/expense-categories/:id", wrap(async (req, res) => {
    res.json(await storage.updateExpenseCategory(Number(req.params.id), insertExpenseCategorySchema.partial().parse(req.body)));
  }));
  app.delete("/api/expense-categories/:id", wrap(async (req, res) => {
    await storage.deleteExpenseCategory(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Broker Positions ─────────────────────────────────────────────────
  app.get("/api/broker-positions", wrap(async (_req, res) => {
    res.json(await storage.getBrokerPositions());
  }));
  app.post("/api/broker-positions/upsert", wrap(async (req, res) => {
    res.json(await storage.upsertBrokerPosition(insertBrokerPositionSchema.parse(req.body)));
  }));
  app.post("/api/broker-positions", wrap(async (req, res) => {
    res.json(await storage.createBrokerPosition(insertBrokerPositionSchema.parse(req.body)));
  }));
  app.delete("/api/broker-positions/:id", wrap(async (req, res) => {
    await storage.deleteBrokerPosition(Number(req.params.id));
    res.json({ ok: true });
  }));
  app.delete("/api/broker-positions", wrap(async (_req, res) => {
    await storage.clearBrokerPositions();
    res.json({ ok: true });
  }));

  // ── Transactions ─────────────────────────────────────────────────────
  app.get("/api/transactions", wrap(async (_req, res) => {
    res.json(await storage.getTransactions());
  }));
  app.post("/api/transactions/batch", wrap(async (req, res) => {
    const arr = req.body;
    if (!Array.isArray(arr)) return res.status(400).json({ message: "Expected array" });
    const batch = arr.slice(0, 50).map((t: any) => {
      const { description, ...rest } = t;
      return insertTransactionSchema.parse({ ...rest, comment: description || rest.comment || "" });
    });
    res.json(await storage.createTransactionsBatch(batch));
  }));
  app.post("/api/transactions", wrap(async (req, res) => {
    const data = insertTransactionSchema.parse(req.body);
    const txn = await storage.createTransaction(data);
    if (txn.accountId) await storage.recalculateBalance(txn.accountId ?? undefined);
    if (txn.targetAccountId) await storage.recalculateBalance(txn.targetAccountId ?? undefined);
    res.json(txn);
  }));

  app.patch("/api/transactions/:id", wrap(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getTransaction(id);
    if (!existing) return res.status(404).json({ error: "Transaction not found" });

    const updated = await storage.updateTransaction(id, req.body);
    
    const accs = new Set<number>();
    if (existing.accountId !== null) accs.add(existing.accountId);
    if (existing.targetAccountId !== null) accs.add(existing.targetAccountId);
    if (updated.accountId !== null) accs.add(updated.accountId);
    if (updated.targetAccountId !== null) accs.add(updated.targetAccountId);
    
    for (const accId of Array.from(accs)) {
      await storage.recalculateBalance(accId);
    }
    
    res.json(updated);
  }));
  app.delete("/api/transactions/:id", wrap(async (req, res) => {
    await storage.deleteTransaction(Number(req.params.id));
    res.json({ ok: true });
  }));
  app.delete("/api/transactions", wrap(async (_req, res) => {
    await storage.clearTransactions();
    res.json({ ok: true });
  }));

  // ── Import (ZenMoney) ────────────────────────────────────────────────
  app.post("/api/import/zenmoney", wrap(async (req, res) => {
    console.log(`[import] Received POST request with body:`, {
      transactionCount: req.body?.transactions?.length,
      newIncomeCategories: req.body?.newIncomeCategories?.length,
      newExpenseCategories: req.body?.newExpenseCategories?.length,
      newAccounts: req.body?.newAccounts?.length,
    });

    const { transactions: txns = [], newIncomeCategories = [], newExpenseCategories = [], newAccounts = [] } = req.body;
    const results = { categoriesCreated: 0, accountsCreated: 0, importErrors: [] as string[] };

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
    for (let i = 0; i < txns.length; i += 50) {
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
    res.json(response);
  }));

  // ── Incomes ──────────────────────────────────────────────────────────
  app.get("/api/incomes", wrap(async (_req, res) => {
    res.json(await storage.getIncomes());
  }));
  app.post("/api/incomes", wrap(async (req, res) => {
    res.json(await storage.createIncome(insertIncomeSchema.parse(req.body)));
  }));
  app.put("/api/incomes/:id", wrap(async (req, res) => {
    res.json(await storage.updateIncome(Number(req.params.id), insertIncomeSchema.partial().parse(req.body)));
  }));
  app.patch("/api/incomes/:id", wrap(async (req, res) => {
    res.json(await storage.updateIncome(Number(req.params.id), insertIncomeSchema.partial().parse(req.body)));
  }));
  app.delete("/api/incomes/:id", wrap(async (req, res) => {
    await storage.deleteIncome(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Expenses ─────────────────────────────────────────────────────────
  app.get("/api/expenses", wrap(async (_req, res) => {
    res.json(await storage.getExpenses());
  }));
  app.post("/api/expenses", wrap(async (req, res) => {
    res.json(await storage.createExpense(insertExpenseSchema.parse(req.body)));
  }));
  app.put("/api/expenses/:id", wrap(async (req, res) => {
    res.json(await storage.updateExpense(Number(req.params.id), insertExpenseSchema.partial().parse(req.body)));
  }));
  app.patch("/api/expenses/:id", wrap(async (req, res) => {
    res.json(await storage.updateExpense(Number(req.params.id), insertExpenseSchema.partial().parse(req.body)));
  }));
  app.delete("/api/expenses/:id", wrap(async (req, res) => {
    await storage.deleteExpense(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Assets ───────────────────────────────────────────────────────────
  app.get("/api/assets", wrap(async (_req, res) => {
    res.json(await storage.getAssets());
  }));
  app.post("/api/assets", wrap(async (req, res) => {
    res.json(await storage.createAsset(insertAssetSchema.parse(req.body)));
  }));
  app.put("/api/assets/:id", wrap(async (req, res) => {
    res.json(await storage.updateAsset(Number(req.params.id), insertAssetSchema.partial().parse(req.body)));
  }));
  app.patch("/api/assets/:id", wrap(async (req, res) => {
    res.json(await storage.updateAsset(Number(req.params.id), insertAssetSchema.partial().parse(req.body)));
  }));
  app.delete("/api/assets/:id", wrap(async (req, res) => {
    await storage.deleteAsset(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Liabilities ──────────────────────────────────────────────────────
  app.get("/api/liabilities", wrap(async (_req, res) => {
    res.json(await storage.getLiabilities());
  }));
  app.post("/api/liabilities", wrap(async (req, res) => {
    res.json(await storage.createLiability(insertLiabilitySchema.parse(req.body)));
  }));
  app.put("/api/liabilities/:id", wrap(async (req, res) => {
    res.json(await storage.updateLiability(Number(req.params.id), insertLiabilitySchema.partial().parse(req.body)));
  }));
  app.patch("/api/liabilities/:id", wrap(async (req, res) => {
    res.json(await storage.updateLiability(Number(req.params.id), insertLiabilitySchema.partial().parse(req.body)));
  }));
  app.delete("/api/liabilities/:id", wrap(async (req, res) => {
    await storage.deleteLiability(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Goals ────────────────────────────────────────────────────────────
  app.get("/api/goals", wrap(async (_req, res) => {
    res.json(await storage.getGoals());
  }));
  app.post("/api/goals", wrap(async (req, res) => {
    res.json(await storage.createGoal(insertGoalSchema.parse(req.body)));
  }));
  app.put("/api/goals/:id", wrap(async (req, res) => {
    res.json(await storage.updateGoal(Number(req.params.id), insertGoalSchema.partial().parse(req.body)));
  }));
  app.patch("/api/goals/:id", wrap(async (req, res) => {
    res.json(await storage.updateGoal(Number(req.params.id), insertGoalSchema.partial().parse(req.body)));
  }));
  app.delete("/api/goals/:id", wrap(async (req, res) => {
    await storage.deleteGoal(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Time Entries ─────────────────────────────────────────────────────
  app.get("/api/time-entries", wrap(async (_req, res) => {
    res.json(await storage.getTimeEntries());
  }));
  app.post("/api/time-entries", wrap(async (req, res) => {
    res.json(await storage.createTimeEntry(insertTimeEntrySchema.parse(req.body)));
  }));
  app.put("/api/time-entries/:id", wrap(async (req, res) => {
    res.json(await storage.updateTimeEntry(Number(req.params.id), insertTimeEntrySchema.partial().parse(req.body)));
  }));
  app.patch("/api/time-entries/:id", wrap(async (req, res) => {
    res.json(await storage.updateTimeEntry(Number(req.params.id), insertTimeEntrySchema.partial().parse(req.body)));
  }));
  app.delete("/api/time-entries/:id", wrap(async (req, res) => {
    await storage.deleteTimeEntry(Number(req.params.id));
    res.json({ ok: true });
  }));

  // ── Transfers ────────────────────────────────────────────────────────
  app.get("/api/transfers", wrap(async (_req, res) => {
    res.json(await storage.getTransactions({ type: "transfer" }));
  }));
  app.post("/api/transfers", wrap(async (req, res) => {
    const { fromAccountId, toAccountId, amount, date, comment } = req.body;
    res.json(await storage.createTransfer({
      fromAccountId: Number(fromAccountId),
      toAccountId: Number(toAccountId),
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      comment: comment || "",
    }));
  }));
  app.get("/api/accounts/:id/transfers", wrap(async (req, res) => {
    res.json(await storage.getAccountTransfers(Number(req.params.id)));
  }));
}
