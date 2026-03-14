import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  insertAccountSchema, insertDepositSchema, insertIncomeCategorySchema,
  insertExpenseCategorySchema, insertBrokerPositionSchema, insertTransactionSchema,
  insertIncomeSchema, insertExpenseSchema, insertAssetSchema, insertLiabilitySchema,
  insertGoalSchema, insertTimeEntrySchema, insertProfileSchema,
} from "../shared/schema";

export async function registerRoutes(server: Server, app: Express) {
  // ── Profile ────────────────────────────────────────────────────────────
  app.get("/api/profile", async (_req, res) => {
    const p = await storage.getProfile();
    res.json(p);
  });
  app.put("/api/profile", async (req, res) => {
    const data = insertProfileSchema.partial().parse(req.body);
    const p = await storage.updateProfile(data);
    res.json(p);
  });

  // ── Accounts ──────────────────────────────────────────────────────────
  app.get("/api/accounts", async (_req, res) => {
    res.json(await storage.getAccounts());
  });
  app.get("/api/accounts/:id", async (req, res) => {
    const a = await storage.getAccount(Number(req.params.id));
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  });
  app.post("/api/accounts", async (req, res) => {
    const data = insertAccountSchema.parse(req.body);
    res.json(await storage.createAccount(data));
  });
  app.put("/api/accounts/:id", async (req, res) => {
    const data = insertAccountSchema.partial().parse(req.body);
    res.json(await storage.updateAccount(Number(req.params.id), data));
  });
  app.delete("/api/accounts/:id", async (req, res) => {
    await storage.deleteAccount(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Deposits ──────────────────────────────────────────────────────────
  app.get("/api/deposits", async (_req, res) => {
    res.json(await storage.getDeposits());
  });
  app.get("/api/deposits/:id", async (req, res) => {
    const d = await storage.getDeposit(Number(req.params.id));
    if (!d) return res.status(404).json({ message: "Not found" });
    res.json(d);
  });
  app.post("/api/deposits", async (req, res) => {
    const data = insertDepositSchema.parse(req.body);
    res.json(await storage.createDeposit(data));
  });
  app.put("/api/deposits/:id", async (req, res) => {
    const data = insertDepositSchema.partial().parse(req.body);
    res.json(await storage.updateDeposit(Number(req.params.id), data));
  });
  app.delete("/api/deposits/:id", async (req, res) => {
    await storage.deleteDeposit(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Income Categories ─────────────────────────────────────────────────
  app.get("/api/income-categories", async (_req, res) => {
    res.json(await storage.getIncomeCategories());
  });
  app.post("/api/income-categories", async (req, res) => {
    const data = insertIncomeCategorySchema.parse(req.body);
    res.json(await storage.createIncomeCategory(data));
  });
  app.put("/api/income-categories/:id", async (req, res) => {
    const data = insertIncomeCategorySchema.partial().parse(req.body);
    res.json(await storage.updateIncomeCategory(Number(req.params.id), data));
  });
  app.delete("/api/income-categories/:id", async (req, res) => {
    await storage.deleteIncomeCategory(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Expense Categories ────────────────────────────────────────────────
  app.get("/api/expense-categories", async (_req, res) => {
    res.json(await storage.getExpenseCategories());
  });
  app.post("/api/expense-categories", async (req, res) => {
    const data = insertExpenseCategorySchema.parse(req.body);
    res.json(await storage.createExpenseCategory(data));
  });
  app.put("/api/expense-categories/:id", async (req, res) => {
    const data = insertExpenseCategorySchema.partial().parse(req.body);
    res.json(await storage.updateExpenseCategory(Number(req.params.id), data));
  });
  app.delete("/api/expense-categories/:id", async (req, res) => {
    await storage.deleteExpenseCategory(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Broker Positions ──────────────────────────────────────────────────
  app.get("/api/broker-positions", async (_req, res) => {
    res.json(await storage.getBrokerPositions());
  });
  app.post("/api/broker-positions", async (req, res) => {
    const data = insertBrokerPositionSchema.parse(req.body);
    res.json(await storage.createBrokerPosition(data));
  });
  app.post("/api/broker-positions/upsert", async (req, res) => {
    const data = insertBrokerPositionSchema.parse(req.body);
    res.json(await storage.upsertBrokerPosition(data));
  });
  app.delete("/api/broker-positions/:id", async (req, res) => {
    await storage.deleteBrokerPosition(Number(req.params.id));
    res.json({ ok: true });
  });
  app.delete("/api/broker-positions", async (_req, res) => {
    await storage.clearBrokerPositions();
    res.json({ ok: true });
  });

  // ── Transactions ──────────────────────────────────────────────────────
  app.get("/api/transactions", async (_req, res) => {
    res.json(await storage.getTransactions());
  });
  app.post("/api/transactions", async (req, res) => {
    const data = insertTransactionSchema.parse(req.body);
    res.json(await storage.createTransaction(data));
  });
  // Batch import — принимает массив транзакций (до 50 за раз)
  app.post("/api/transactions/batch", async (req, res) => {
    const arr = req.body;
    if (!Array.isArray(arr)) return res.status(400).json({ message: "Expected array" });
    const batch = arr.slice(0, 50).map((t: any) => insertTransactionSchema.parse(t));
    const rows = await storage.createTransactionsBatch(batch);
    res.json(rows);
  });
  app.delete("/api/transactions/:id", async (req, res) => {
    await storage.deleteTransaction(Number(req.params.id));
    res.json({ ok: true });
  });
  app.delete("/api/transactions", async (_req, res) => {
    await storage.clearTransactions();
    res.json({ ok: true });
  });

  // ── Incomes ───────────────────────────────────────────────────────────
  app.get("/api/incomes", async (_req, res) => {
    res.json(await storage.getIncomes());
  });
  app.post("/api/incomes", async (req, res) => {
    const data = insertIncomeSchema.parse(req.body);
    res.json(await storage.createIncome(data));
  });
  app.put("/api/incomes/:id", async (req, res) => {
    const data = insertIncomeSchema.partial().parse(req.body);
    res.json(await storage.updateIncome(Number(req.params.id), data));
  });
  app.delete("/api/incomes/:id", async (req, res) => {
    await storage.deleteIncome(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Expenses ──────────────────────────────────────────────────────────
  app.get("/api/expenses", async (_req, res) => {
    res.json(await storage.getExpenses());
  });
  app.post("/api/expenses", async (req, res) => {
    const data = insertExpenseSchema.parse(req.body);
    res.json(await storage.createExpense(data));
  });
  app.put("/api/expenses/:id", async (req, res) => {
    const data = insertExpenseSchema.partial().parse(req.body);
    res.json(await storage.updateExpense(Number(req.params.id), data));
  });
  app.delete("/api/expenses/:id", async (req, res) => {
    await storage.deleteExpense(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Assets ────────────────────────────────────────────────────────────
  app.get("/api/assets", async (_req, res) => {
    res.json(await storage.getAssets());
  });
  app.post("/api/assets", async (req, res) => {
    const data = insertAssetSchema.parse(req.body);
    res.json(await storage.createAsset(data));
  });
  app.put("/api/assets/:id", async (req, res) => {
    const data = insertAssetSchema.partial().parse(req.body);
    res.json(await storage.updateAsset(Number(req.params.id), data));
  });
  app.delete("/api/assets/:id", async (req, res) => {
    await storage.deleteAsset(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Liabilities ───────────────────────────────────────────────────────
  app.get("/api/liabilities", async (_req, res) => {
    res.json(await storage.getLiabilities());
  });
  app.post("/api/liabilities", async (req, res) => {
    const data = insertLiabilitySchema.parse(req.body);
    res.json(await storage.createLiability(data));
  });
  app.put("/api/liabilities/:id", async (req, res) => {
    const data = insertLiabilitySchema.partial().parse(req.body);
    res.json(await storage.updateLiability(Number(req.params.id), data));
  });
  app.delete("/api/liabilities/:id", async (req, res) => {
    await storage.deleteLiability(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Goals ─────────────────────────────────────────────────────────────
  app.get("/api/goals", async (_req, res) => {
    res.json(await storage.getGoals());
  });
  app.post("/api/goals", async (req, res) => {
    const data = insertGoalSchema.parse(req.body);
    res.json(await storage.createGoal(data));
  });
  app.put("/api/goals/:id", async (req, res) => {
    const data = insertGoalSchema.partial().parse(req.body);
    res.json(await storage.updateGoal(Number(req.params.id), data));
  });
  app.delete("/api/goals/:id", async (req, res) => {
    await storage.deleteGoal(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Time Entries ──────────────────────────────────────────────────────
  app.get("/api/time-entries", async (_req, res) => {
    res.json(await storage.getTimeEntries());
  });
  app.post("/api/time-entries", async (req, res) => {
    const data = insertTimeEntrySchema.parse(req.body);
    res.json(await storage.createTimeEntry(data));
  });
  app.put("/api/time-entries/:id", async (req, res) => {
    const data = insertTimeEntrySchema.partial().parse(req.body);
    res.json(await storage.updateTimeEntry(Number(req.params.id), data));
  });
  app.delete("/api/time-entries/:id", async (req, res) => {
    await storage.deleteTimeEntry(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Error handler ─────────────────────────────────────────────────────
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  });
}
