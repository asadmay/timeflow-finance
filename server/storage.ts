import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  profile, accounts, deposits, incomeCategories, expenseCategories,
  brokerPositions, transactions, incomes, expenses, assets, liabilities,
  goals, timeEntries,
  type Profile, type Account, type Deposit, type IncomeCategory, type ExpenseCategory,
  type BrokerPosition, type Transaction, type Income, type Expense,
  type Asset, type Liability, type Goal, type TimeEntry,
  type InsertProfile, type InsertAccount, type InsertDeposit,
  type InsertIncomeCategory, type InsertExpenseCategory,
  type InsertBrokerPosition, type InsertTransaction, type InsertIncome,
  type InsertExpense, type InsertAsset, type InsertLiability,
  type InsertGoal, type InsertTimeEntry,
} from "../shared/schema";

export class DatabaseStorage {
  // ── Profile
  async getProfile(): Promise<Profile | undefined> {
    const rows = await db.select().from(profile).limit(1);
    if (rows.length > 0) return rows[0];
    const created = await db.insert(profile).values({ name: "Мой профиль", cash: 0, freeHours: 168 }).returning();
    return created[0];
  }
  async updateProfile(data: Partial<InsertProfile>): Promise<Profile> {
    const existing = await this.getProfile();
    const updated = await db.update(profile).set(data).where(eq(profile.id, existing!.id)).returning();
    return updated[0];
  }

  // ── Accounts
  async getAccounts(): Promise<Account[]> { return db.select().from(accounts); }
  async getAccount(id: number): Promise<Account | undefined> {
    const rows = await db.select().from(accounts).where(eq(accounts.id, id));
    return rows[0];
  }
  async createAccount(data: InsertAccount): Promise<Account> {
    const rows = await db.insert(accounts).values(data).returning();
    return rows[0];
  }
  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account> {
    const rows = await db.update(accounts).set(data).where(eq(accounts.id, id)).returning();
    return rows[0];
  }
  async deleteAccount(id: number): Promise<void> { await db.delete(accounts).where(eq(accounts.id, id)); }

  // ── Deposits
  async getDeposits(): Promise<Deposit[]> { return db.select().from(deposits); }
  async getDeposit(id: number): Promise<Deposit | undefined> {
    const rows = await db.select().from(deposits).where(eq(deposits.id, id));
    return rows[0];
  }
  async createDeposit(data: InsertDeposit): Promise<Deposit> {
    const rows = await db.insert(deposits).values(data).returning();
    return rows[0];
  }
  async updateDeposit(id: number, data: Partial<InsertDeposit>): Promise<Deposit> {
    const rows = await db.update(deposits).set(data).where(eq(deposits.id, id)).returning();
    return rows[0];
  }
  async deleteDeposit(id: number): Promise<void> { await db.delete(deposits).where(eq(deposits.id, id)); }

  // ── Income Categories
  async getIncomeCategories(): Promise<IncomeCategory[]> { return db.select().from(incomeCategories); }
  async createIncomeCategory(data: InsertIncomeCategory): Promise<IncomeCategory> {
    const rows = await db.insert(incomeCategories).values(data).returning();
    return rows[0];
  }
  async updateIncomeCategory(id: number, data: Partial<InsertIncomeCategory>): Promise<IncomeCategory> {
    const rows = await db.update(incomeCategories).set(data).where(eq(incomeCategories.id, id)).returning();
    return rows[0];
  }
  async deleteIncomeCategory(id: number): Promise<void> { await db.delete(incomeCategories).where(eq(incomeCategories.id, id)); }

  // ── Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> { return db.select().from(expenseCategories); }
  async createExpenseCategory(data: InsertExpenseCategory): Promise<ExpenseCategory> {
    const rows = await db.insert(expenseCategories).values(data).returning();
    return rows[0];
  }
  async updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>): Promise<ExpenseCategory> {
    const rows = await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id)).returning();
    return rows[0];
  }
  async deleteExpenseCategory(id: number): Promise<void> { await db.delete(expenseCategories).where(eq(expenseCategories.id, id)); }

  // ── Broker Positions
  async getBrokerPositions(): Promise<BrokerPosition[]> { return db.select().from(brokerPositions); }
  async createBrokerPosition(data: InsertBrokerPosition): Promise<BrokerPosition> {
    const rows = await db.insert(brokerPositions).values(data).returning();
    return rows[0];
  }
  async upsertBrokerPosition(data: InsertBrokerPosition): Promise<BrokerPosition> {
    const isinVal = data.isin ?? "";
    const existing = await db.select().from(brokerPositions).where(eq(brokerPositions.isin, isinVal));
    if (existing.length > 0) {
      const rows = await db.update(brokerPositions).set(data).where(eq(brokerPositions.id, existing[0].id)).returning();
      return rows[0];
    }
    return this.createBrokerPosition(data);
  }
  async deleteBrokerPosition(id: number): Promise<void> { await db.delete(brokerPositions).where(eq(brokerPositions.id, id)); }
  async clearBrokerPositions(): Promise<void> { await db.delete(brokerPositions); }

  // ── Transactions
  async getTransactions(): Promise<Transaction[]> { return db.select().from(transactions); }
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const rows = await db.insert(transactions).values(data).returning();
    return rows[0];
  }
  async createTransactionsBatch(data: InsertTransaction[]): Promise<Transaction[]> {
    if (data.length === 0) return [];
    return db.insert(transactions).values(data).returning();
  }
  async deleteTransaction(id: number): Promise<void> { await db.delete(transactions).where(eq(transactions.id, id)); }
  async clearTransactions(): Promise<void> { await db.delete(transactions); }

  // ── Incomes
  async getIncomes(): Promise<Income[]> { return db.select().from(incomes); }
  async createIncome(data: InsertIncome): Promise<Income> {
    const rows = await db.insert(incomes).values(data).returning();
    return rows[0];
  }
  async updateIncome(id: number, data: Partial<InsertIncome>): Promise<Income> {
    const rows = await db.update(incomes).set(data).where(eq(incomes.id, id)).returning();
    return rows[0];
  }
  async deleteIncome(id: number): Promise<void> { await db.delete(incomes).where(eq(incomes.id, id)); }

  // ── Expenses
  async getExpenses(): Promise<Expense[]> { return db.select().from(expenses); }
  async createExpense(data: InsertExpense): Promise<Expense> {
    const rows = await db.insert(expenses).values(data).returning();
    return rows[0];
  }
  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense> {
    const rows = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return rows[0];
  }
  async deleteExpense(id: number): Promise<void> { await db.delete(expenses).where(eq(expenses.id, id)); }

  // ── Assets
  async getAssets(): Promise<Asset[]> { return db.select().from(assets); }
  async createAsset(data: InsertAsset): Promise<Asset> {
    const rows = await db.insert(assets).values(data).returning();
    return rows[0];
  }
  async updateAsset(id: number, data: Partial<InsertAsset>): Promise<Asset> {
    const rows = await db.update(assets).set(data).where(eq(assets.id, id)).returning();
    return rows[0];
  }
  async deleteAsset(id: number): Promise<void> { await db.delete(assets).where(eq(assets.id, id)); }

  // ── Liabilities
  async getLiabilities(): Promise<Liability[]> { return db.select().from(liabilities); }
  async createLiability(data: InsertLiability): Promise<Liability> {
    const rows = await db.insert(liabilities).values(data).returning();
    return rows[0];
  }
  async updateLiability(id: number, data: Partial<InsertLiability>): Promise<Liability> {
    const rows = await db.update(liabilities).set(data).where(eq(liabilities.id, id)).returning();
    return rows[0];
  }
  async deleteLiability(id: number): Promise<void> { await db.delete(liabilities).where(eq(liabilities.id, id)); }

  // ── Goals
  async getGoals(): Promise<Goal[]> { return db.select().from(goals); }
  async createGoal(data: InsertGoal): Promise<Goal> {
    const rows = await db.insert(goals).values(data).returning();
    return rows[0];
  }
  async updateGoal(id: number, data: Partial<InsertGoal>): Promise<Goal> {
    const rows = await db.update(goals).set(data).where(eq(goals.id, id)).returning();
    return rows[0];
  }
  async deleteGoal(id: number): Promise<void> { await db.delete(goals).where(eq(goals.id, id)); }

  // ── Time Entries
  async getTimeEntries(): Promise<TimeEntry[]> { return db.select().from(timeEntries); }
  async createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry> {
    const rows = await db.insert(timeEntries).values(data).returning();
    return rows[0];
  }
  async updateTimeEntry(id: number, data: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const rows = await db.update(timeEntries).set(data).where(eq(timeEntries.id, id)).returning();
    return rows[0];
  }
  async deleteTimeEntry(id: number): Promise<void> { await db.delete(timeEntries).where(eq(timeEntries.id, id)); }
}

export const storage = new DatabaseStorage();
