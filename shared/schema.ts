import { pgTable, text, integer, boolean, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Мой профиль"),
  cash: integer("cash").notNull().default(0),
  freeHours: integer("free_hours").notNull().default(168),
});

// ─── Accounts (Счета) ─────────────────────────────────────────────────────────
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("card"), // cash | card | checking | broker | crypto | other
  balance: integer("balance").notNull().default(0),
  currency: text("currency").notNull().default("RUB"),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("wallet"),
  isArchived: boolean("is_archived").notNull().default(false),
});

// ─── Deposits (Вклады) ────────────────────────────────────────────────────────
export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bank: text("bank").notNull().default(""),
  amount: integer("amount").notNull(),            // сумма вклада
  rate: real("rate").notNull().default(0),        // ставка % годовых
  startDate: text("start_date").notNull(),        // YYYY-MM-DD
  endDate: text("end_date").notNull(),            // YYYY-MM-DD
  currency: text("currency").notNull().default("RUB"),
  isActive: boolean("is_active").notNull().default(true),
  accountId: integer("account_id"),               // связанный счёт
});

// ─── Income Categories ─────────────────────────────────────────────────────────
export const incomeCategories = pgTable("income_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#22c55e"),
  icon: text("icon").notNull().default("trending-up"),
  isDefault: boolean("is_default").notNull().default(false),
});

// ─── Expense Categories ────────────────────────────────────────────────────────
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#ef4444"),
  icon: text("icon").notNull().default("trending-down"),
  isDefault: boolean("is_default").notNull().default(false),
});

// ─── Broker Positions (Брокерский портфель) ────────────────────────────────────
export const brokerPositions = pgTable("broker_positions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id"),               // брокерский счёт
  broker: text("broker").notNull().default(""),   // vtb | sber | other
  ticker: text("ticker").notNull().default(""),
  isin: text("isin").notNull().default(""),
  name: text("name").notNull(),
  quantity: real("quantity").notNull().default(0),
  avgPrice: real("avg_price").notNull().default(0),
  currentPrice: real("current_price").notNull().default(0),
  currency: text("currency").notNull().default("RUB"),
  type: text("type").notNull().default("stock"),  // stock | bond | etf | fund | other
});

// ─── Transactions (Импортированные транзакции) ─────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),                   // YYYY-MM-DD
  type: text("type").notNull(),                   // income | expense | transfer
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("RUB"),
  categoryName: text("category_name").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  payee: text("payee").notNull().default(""),
  comment: text("comment").notNull().default(""),
  source: text("source").notNull().default("manual"), // manual | zenmoney | vtb | sber
  // Foreign Keys для связности данных
  accountId: integer("account_id"),               // связанный счет (transactions -> accounts)
  incomeCategoryId: integer("income_category_id"), // для доходов (transactions -> income_categories)
  expenseCategoryId: integer("expense_category_id"), // для расходов (transactions -> expense_categories)
  // Для переводов между счетами
  targetAccountId: integer("target_account_id"), // счет-получатель при type=transfer
});

// ─── Incomes ──────────────────────────────────────────────────────────────────
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  categoryId: integer("category_id"),
  category: text("category").notNull().default("Прочее"),
  isPassive: boolean("is_passive").notNull().default(false),
  accountId: integer("account_id"),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  categoryId: integer("category_id"),
  category: text("category").notNull().default("Прочее"),
  accountId: integer("account_id"),
});

// ─── Assets ───────────────────────────────────────────────────────────────────
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: integer("value").notNull(),
  cashflow: integer("cashflow").notNull().default(0),
  category: text("category").notNull().default("Прочее"),
});

// ─── Liabilities ──────────────────────────────────────────────────────────────
export const liabilities = pgTable("liabilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  payment: integer("payment").notNull().default(0),
  category: text("category").notNull().default("Рутины"),
});

// ─── Goals ────────────────────────────────────────────────────────────────────
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  category: text("category").notNull().default("Мечта"),
});

// ─── Time Entries ─────────────────────────────────────────────────────────────
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hours: integer("hours").notNull(),
  type: text("type").notNull(),
});

// ─── Insert schemas ───────────────────────────────────────────────────────────
export const insertProfileSchema        = createInsertSchema(profile).omit({ id: true });
export const insertAccountSchema        = createInsertSchema(accounts).omit({ id: true });
export const insertDepositSchema        = createInsertSchema(deposits).omit({ id: true });
export const insertIncomeCategorySchema = createInsertSchema(incomeCategories).omit({ id: true });
export const insertExpenseCategorySchema= createInsertSchema(expenseCategories).omit({ id: true });
export const insertBrokerPositionSchema = createInsertSchema(brokerPositions).omit({ id: true });
export const insertTransactionSchema    = createInsertSchema(transactions).omit({ id: true });
export const insertIncomeSchema         = createInsertSchema(incomes).omit({ id: true });
export const insertExpenseSchema        = createInsertSchema(expenses).omit({ id: true });
export const insertAssetSchema          = createInsertSchema(assets).omit({ id: true });
export const insertLiabilitySchema      = createInsertSchema(liabilities).omit({ id: true });
export const insertGoalSchema           = createInsertSchema(goals).omit({ id: true });
export const insertTimeEntrySchema      = createInsertSchema(timeEntries).omit({ id: true });

// ─── Insert types ─────────────────────────────────────────────────────────────
export type InsertProfile         = z.infer<typeof insertProfileSchema>;
export type InsertAccount         = z.infer<typeof insertAccountSchema>;
export type InsertDeposit         = z.infer<typeof insertDepositSchema>;
export type InsertIncomeCategory  = z.infer<typeof insertIncomeCategorySchema>;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type InsertBrokerPosition  = z.infer<typeof insertBrokerPositionSchema>;
export type InsertTransaction     = z.infer<typeof insertTransactionSchema>;
export type InsertIncome          = z.infer<typeof insertIncomeSchema>;
export type InsertExpense         = z.infer<typeof insertExpenseSchema>;
export type InsertAsset           = z.infer<typeof insertAssetSchema>;
export type InsertLiability       = z.infer<typeof insertLiabilitySchema>;
export type InsertGoal            = z.infer<typeof insertGoalSchema>;
export type InsertTimeEntry       = z.infer<typeof insertTimeEntrySchema>;

// ─── Select types ─────────────────────────────────────────────────────────────
export type Profile         = typeof profile.$inferSelect;
export type Account         = typeof accounts.$inferSelect;
export type Deposit         = typeof deposits.$inferSelect;
export type IncomeCategory  = typeof incomeCategories.$inferSelect;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type BrokerPosition  = typeof brokerPositions.$inferSelect;
export type Transaction     = typeof transactions.$inferSelect;
export type Income          = typeof incomes.$inferSelect;
export type Expense         = typeof expenses.$inferSelect;
export type Asset           = typeof assets.$inferSelect;
export type Liability       = typeof liabilities.$inferSelect;
export type Goal            = typeof goals.$inferSelect;
export type TimeEntry       = typeof timeEntries.$inferSelect;

