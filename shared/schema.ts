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

export const insertDepositSchema = createInsertSchema(deposits);
export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;

// ─── Categories (Категории) ─────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("expense"), // income | expense | transfer
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("tag"),
  budget: integer("budget"),                      // бюджет в месяц (null = нет лимита)
  isArchived: boolean("is_archived").notNull().default(false),
});

export const insertCategorySchema = createInsertSchema(categories);
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// ─── Transactions (Транзакции) ───────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),                  // income | expense | transfer
  amount: integer("amount").notNull(),           // в копейках
  date: text("date").notNull(),                  // YYYY-MM-DD
  description: text("description").notNull().default(""),
  categoryId: integer("category_id"),
  accountId: integer("account_id"),
  toAccountId: integer("to_account_id"),         // для переводов
  tags: text("tags").notNull().default(""),       // comma-separated
});

export const insertTransactionSchema = createInsertSchema(transactions);
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// ─── Incomes (Доходы) ───────────────────────────────────────────────────────────
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),           // в копейках/месяц
  frequency: text("frequency").notNull().default("monthly"), // monthly | weekly | annual | once
  isActive: boolean("is_active").notNull().default(true),
  accountId: integer("account_id"),
  categoryId: integer("category_id"),
});

export const insertIncomeSchema = createInsertSchema(incomes);
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

// ─── Expenses (Расходы) ──────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),           // в копейках/месяц
  frequency: text("frequency").notNull().default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  accountId: integer("account_id"),
  categoryId: integer("category_id"),
});

export const insertExpenseSchema = createInsertSchema(expenses);
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// ─── Assets (Активы) ─────────────────────────────────────────────────────────────
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("real_estate"), // real_estate | vehicle | equipment | other
  value: integer("value").notNull().default(0),    // текущая стоимость
  purchaseValue: integer("purchase_value"),        // цена покупки
  purchaseDate: text("purchase_date"),             // YYYY-MM-DD
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertAssetSchema = createInsertSchema(assets);
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// ─── Liabilities (Обязательства) ──────────────────────────────────────────────────
export const liabilities = pgTable("liabilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("loan"),   // loan | mortgage | credit_card | other
  balance: integer("balance").notNull().default(0),  // текущий долг
  originalAmount: integer("original_amount"),     // исходная сумма
  rate: real("rate").notNull().default(0),        // ставка % годовых
  startDate: text("start_date"),
  endDate: text("end_date"),
  monthlyPayment: integer("monthly_payment"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertLiabilitySchema = createInsertSchema(liabilities);
export type Liability = typeof liabilities.$inferSelect;
export type InsertLiability = z.infer<typeof insertLiabilitySchema>;

// ─── Goals (Цели) ───────────────────────────────────────────────────────────────────
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  deadline: text("deadline"),                    // YYYY-MM-DD or null
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("target"),
  isCompleted: boolean("is_completed").notNull().default(false),
  accountId: integer("account_id"),
});

export const insertGoalSchema = createInsertSchema(goals);
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

// ─── Time Entries (Время) ────────────────────────────────────────────────────────
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),                  // YYYY-MM-DD
  hours: real("hours").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("work"), // work | personal | sleep | other
  hourlyRate: integer("hourly_rate"),            // стоимость часа (null = бесплатно)
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries);
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

// ─── Profile insert schema ──────────────────────────────────────────────────────────
export const insertProfileSchema = createInsertSchema(profile);
export type Profile = typeof profile.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export const insertAccountSchema = createInsertSchema(accounts);
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
