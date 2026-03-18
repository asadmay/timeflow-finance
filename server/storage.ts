import { eq, sql } from "drizzle-orm";
import { db as defaultDb } from "./db";
import type { DrizzleD1Database } from "drizzle-orm/d1";
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
  private db: any;

  constructor(dbInstance?: any) {
    this.db = dbInstance ?? defaultDb;
  }

  // ── Profile
  async getProfile(): Promise<Profile | undefined> {
    const rows = await this.db.select().from(profile).limit(1);
    if (rows.length > 0) return rows[0];
    const created = await this.db.insert(profile).values({ name: "Мой профиль", cash: 0, freeHours: 168 }).returning();
    return created[0];
  }
  async updateProfile(data: Partial<InsertProfile>): Promise<Profile> {
    const existing = await this.getProfile();
    const updated = await this.db.update(profile).set(data).where(eq(profile.id, existing!.id)).returning();
    return updated[0];
  }

  // ── Accounts
  async getAccounts(): Promise<Account[]> { return this.db.select().from(accounts); }
  async getAccount(id: number): Promise<Account | undefined> {
    const rows = await this.db.select().from(accounts).where(eq(accounts.id, id));
    return rows[0];
  }
  async createAccount(data: InsertAccount): Promise<Account> {
    const rows = await this.db.insert(accounts).values(data).returning();
    return rows[0];
  }
  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account> {
    const rows = await this.db.update(accounts).set(data).where(eq(accounts.id, id)).returning();
    return rows[0];
  }
  async deleteAccount(id: number): Promise<void> { await this.db.delete(accounts).where(eq(accounts.id, id)); }

  // ── Deposits
  async getDeposits(): Promise<Deposit[]> { return this.db.select().from(deposits); }
  async getDeposit(id: number): Promise<Deposit | undefined> {
    const rows = await this.db.select().from(deposits).where(eq(deposits.id, id));
    return rows[0];
  }
  async createDeposit(data: InsertDeposit): Promise<Deposit> {
    const rows = await this.db.insert(deposits).values(data).returning();
    return rows[0];
  }
  async updateDeposit(id: number, data: Partial<InsertDeposit>): Promise<Deposit> {
    const rows = await this.db.update(deposits).set(data).where(eq(deposits.id, id)).returning();
    return rows[0];
  }
  async deleteDeposit(id: number): Promise<void> { await this.db.delete(deposits).where(eq(deposits.id, id)); }

  // ── Income Categories
  async getIncomeCategories(): Promise<IncomeCategory[]> { return this.db.select().from(incomeCategories); }
  async createIncomeCategory(data: InsertIncomeCategory): Promise<IncomeCategory> {
    const rows = await this.db.insert(incomeCategories).values(data).returning();
    return rows[0];
  }
  async updateIncomeCategory(id: number, data: Partial<InsertIncomeCategory>): Promise<IncomeCategory> {
    const rows = await this.db.update(incomeCategories).set(data).where(eq(incomeCategories.id, id)).returning();
    return rows[0];
  }
  async deleteIncomeCategory(id: number): Promise<void> { await this.db.delete(incomeCategories).where(eq(incomeCategories.id, id)); }

  // ── Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> { return this.db.select().from(expenseCategories); }
  async createExpenseCategory(data: InsertExpenseCategory): Promise<ExpenseCategory> {
    const rows = await this.db.insert(expenseCategories).values(data).returning();
    return rows[0];
  }
  async updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>): Promise<ExpenseCategory> {
    const rows = await this.db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id)).returning();
    return rows[0];
  }
  async deleteExpenseCategory(id: number): Promise<void> { await this.db.delete(expenseCategories).where(eq(expenseCategories.id, id)); }

  // ── Broker Positions
  async getBrokerPositions(): Promise<BrokerPosition[]> { return this.db.select().from(brokerPositions); }
  async createBrokerPosition(data: InsertBrokerPosition): Promise<BrokerPosition> {
    const rows = await this.db.insert(brokerPositions).values(data).returning();
    return rows[0];
  }
  async upsertBrokerPosition(data: InsertBrokerPosition): Promise<BrokerPosition> {
    const isinVal = data.isin ?? "";
    const existing = await this.db.select().from(brokerPositions).where(eq(brokerPositions.isin, isinVal));
    if (existing.length > 0) {
      const rows = await this.db.update(brokerPositions).set(data).where(eq(brokerPositions.id, existing[0].id)).returning();
      return rows[0];
    }
    return this.createBrokerPosition(data);
  }
  async deleteBrokerPosition(id: number): Promise<void> { await this.db.delete(brokerPositions).where(eq(brokerPositions.id, id)); }
  async clearBrokerPositions(): Promise<void> { await this.db.delete(brokerPositions); }

  // ── Transactions
  async getTransactions(filters?: { type?: string }): Promise<Transaction[]> { 
    if (filters?.type) {
      return this.db.select().from(transactions).where(eq(transactions.type, filters.type));
    }
    return this.db.select().from(transactions); 
  }
  async resolveTransactionRelations(txn: InsertTransaction): Promise<InsertTransaction> {
    const res = { ...txn };
    
    if (!res.accountId && res.accountName) {
      const accs = await this.db.select().from(accounts).where(sql`LOWER(${accounts.name}) = LOWER(${res.accountName})`).limit(1);
      if (accs.length > 0) {
        res.accountId = accs[0].id;
      } else {
        const [newAcc] = await this.db.insert(accounts).values({
          name: res.accountName, type: "card", balance: 0, currency: res.currency || "RUB", color: "#6366f1", icon: "wallet", isArchived: false
        }).returning();
        res.accountId = newAcc.id;
      }
    }
    
    if (!res.incomeCategoryId && res.type === "income" && res.categoryName) {
      const cats = await this.db.select().from(incomeCategories).where(sql`LOWER(${incomeCategories.name}) = LOWER(${res.categoryName})`).limit(1);
      if (cats.length > 0) {
        res.incomeCategoryId = cats[0].id;
      } else {
        const [newCat] = await this.db.insert(incomeCategories).values({ name: res.categoryName, color: "#22c55e", icon: "trending-up", isDefault: false }).returning();
        res.incomeCategoryId = newCat.id;
      }
    } else if (!res.expenseCategoryId && res.type === "expense" && res.categoryName) {
      const cats = await this.db.select().from(expenseCategories).where(sql`LOWER(${expenseCategories.name}) = LOWER(${res.categoryName})`).limit(1);
      if (cats.length > 0) {
        res.expenseCategoryId = cats[0].id;
      } else {
        const [newCat] = await this.db.insert(expenseCategories).values({ name: res.categoryName, color: "#ef4444", icon: "trending-down", isDefault: false }).returning();
        res.expenseCategoryId = newCat.id;
      }
    }

    if (res.type === "transfer" && !res.targetAccountId) {
      const payeeStr = res.payee?.toLowerCase().trim() || "";
      let targetName = "";
      if (payeeStr.startsWith("transfer to ")) targetName = payeeStr.replace("transfer to ", "").trim();
      else if (payeeStr.includes("перевод на ")) targetName = payeeStr.split("перевод на ")[1].trim();

      if (targetName) {
        const accs = await this.db.select().from(accounts).where(sql`LOWER(${accounts.name}) = LOWER(${targetName})`).limit(1);
        if (accs.length > 0) res.targetAccountId = accs[0].id;
      }
    }
    return res;
  }

  // ────────────────────────────────────────────────────────
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const resolvedTxn = await this.resolveTransactionRelations(data);
    const rows = await this.db.insert(transactions).values(resolvedTxn).returning();
    return rows[0];
  }

  // Check for duplicate transaction (same date, amount, and account)
  async checkDuplicate(txn: InsertTransaction): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(transactions)
      .where(
        sql`
          DATE(date) = DATE(${new Date(txn.date)}) AND 
          amount = ${txn.amount} AND 
          account_name = ${txn.accountName}
        `
      )
      .limit(1);
    return existing.length > 0;
  }

  // Import batch with deduplication
  async createTransactionsBatchWithDedup(data: InsertTransaction[]): Promise<{ imported: Transaction[], skipped: number }> {
    if (data.length === 0) return { imported: [], skipped: 0 };
    
    const toInsert: InsertTransaction[] = [];
    let skipped = 0;

    // Check each transaction for duplicates
    for (const txn of data) {
      const resolvedTxn = await this.resolveTransactionRelations(txn);
      const isDuplicate = await this.checkDuplicate(resolvedTxn);
      if (!isDuplicate) {
        toInsert.push(resolvedTxn);
      } else {
        skipped++;
      }
    }

    // Bulk insert only non-duplicates
    if (toInsert.length === 0) {
      return { imported: [], skipped };
    }

    const imported = await this.db.insert(transactions).values(toInsert).returning();
    return { imported, skipped };
  }

  async createTransactionsBatch(data: InsertTransaction[]): Promise<Transaction[]> {
    if (data.length === 0) return [];
    return this.db.insert(transactions).values(data).returning();
  }
  async deleteTransaction(id: number): Promise<void> { await this.db.delete(transactions).where(eq(transactions.id, id)); }
  async clearTransactions(): Promise<void> { await this.db.delete(transactions); }

  // ── Incomes
  async getIncomes(): Promise<Income[]> { return this.db.select().from(incomes); }
  async createIncome(data: InsertIncome): Promise<Income> {
    const rows = await this.db.insert(incomes).values(data).returning();
    return rows[0];
  }
  async updateIncome(id: number, data: Partial<InsertIncome>): Promise<Income> {
    const rows = await this.db.update(incomes).set(data).where(eq(incomes.id, id)).returning();
    return rows[0];
  }
  async deleteIncome(id: number): Promise<void> { await this.db.delete(incomes).where(eq(incomes.id, id)); }

  // ── Expenses
  async getExpenses(): Promise<Expense[]> { return this.db.select().from(expenses); }
  async createExpense(data: InsertExpense): Promise<Expense> {
    const rows = await this.db.insert(expenses).values(data).returning();
    return rows[0];
  }
  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense> {
    const rows = await this.db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return rows[0];
  }
  async deleteExpense(id: number): Promise<void> { await this.db.delete(expenses).where(eq(expenses.id, id)); }

  // ── Assets
  async getAssets(): Promise<Asset[]> { return this.db.select().from(assets); }
  async createAsset(data: InsertAsset): Promise<Asset> {
    const rows = await this.db.insert(assets).values(data).returning();
    return rows[0];
  }
  async updateAsset(id: number, data: Partial<InsertAsset>): Promise<Asset> {
    const rows = await this.db.update(assets).set(data).where(eq(assets.id, id)).returning();
    return rows[0];
  }
  async deleteAsset(id: number): Promise<void> { await this.db.delete(assets).where(eq(assets.id, id)); }

  // ── Liabilities
  async getLiabilities(): Promise<Liability[]> { return this.db.select().from(liabilities); }
  async createLiability(data: InsertLiability): Promise<Liability> {
    const rows = await this.db.insert(liabilities).values(data).returning();
    return rows[0];
  }
  async updateLiability(id: number, data: Partial<InsertLiability>): Promise<Liability> {
    const rows = await this.db.update(liabilities).set(data).where(eq(liabilities.id, id)).returning();
    return rows[0];
  }
  async deleteLiability(id: number): Promise<void> { await this.db.delete(liabilities).where(eq(liabilities.id, id)); }

  // ── Goals
  async getGoals(): Promise<Goal[]> { return this.db.select().from(goals); }
  async createGoal(data: InsertGoal): Promise<Goal> {
    const rows = await this.db.insert(goals).values(data).returning();
    return rows[0];
  }
  async updateGoal(id: number, data: Partial<InsertGoal>): Promise<Goal> {
    const rows = await this.db.update(goals).set(data).where(eq(goals.id, id)).returning();
    return rows[0];
  }
  async deleteGoal(id: number): Promise<void> { await this.db.delete(goals).where(eq(goals.id, id)); }

  // ── Time Entries
  async getTimeEntries(): Promise<TimeEntry[]> { return this.db.select().from(timeEntries); }
  async createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry> {
    const rows = await this.db.insert(timeEntries).values(data).returning();
    return rows[0];
  }
  async updateTimeEntry(id: number, data: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const rows = await this.db.update(timeEntries).set(data).where(eq(timeEntries.id, id)).returning();
    return rows[0];
  }
  async deleteTimeEntry(id: number): Promise<void> { await this.db.delete(timeEntries).where(eq(timeEntries.id, id)); }

  // ── Recalculate Balances
  /**
   * Пересчитать балансы всех счётов на основе транзакций
   * Вычисляет: SUM(transactions.amount) для каждого счёта
   */
  async recalculateBalance(accountId?: number): Promise<{ updated: number; details: Array<{ accountId: number; balance: number }> }> {
    try {
      const allAccounts = accountId 
        ? await this.db.select().from(accounts).where(eq(accounts.id, accountId))
        : await this.db.select().from(accounts);

      const details: Array<{ accountId: number; balance: number }> = [];

      for (const account of allAccounts) {
        // Получить все исходящие транзакции для этого счёта
        const outgoingTxns = await this.db
          .select()
          .from(transactions)
          .where(eq(transactions.accountId, account.id));

        // Получить все входящие переводы для этого счёта (из других счетов)
        const incomingTransfers = await this.db
          .select()
          .from(transactions)
          .where(eq(transactions.targetAccountId, account.id));

        // Вычислить сумму (доходы добавляются, расходы вычитаются, переводы учитываются)
        let calculatedBalance = 0;
        
        // Обработать исходящие транзакции
        for (const txn of outgoingTxns) {
          if (txn.type === "income") {
            calculatedBalance += txn.amount;
          } else if (txn.type === "expense") {
            calculatedBalance -= txn.amount;
          } else if (txn.type === "transfer") {
            // Перевод ИЗ этого счета - вычесть
            calculatedBalance -= txn.amount;
          }
        }

        // Обработать входящие переводы
        for (const txn of incomingTransfers) {
          if (txn.type === "transfer") {
            // Перевод В этот счет - добавить
            calculatedBalance += txn.amount;
          }
        }

        // Обновить баланс счёта
        await this.db
          .update(accounts)
          .set({ balance: calculatedBalance })
          .where(eq(accounts.id, account.id));

        details.push({ accountId: account.id, balance: calculatedBalance });
        console.log(`[recalculate] Account "${account.name}" (#${account.id}): ${calculatedBalance}`);
      }

      return { updated: allAccounts.length, details };
    } catch (error) {
      console.error("[recalculate] Error:", error);
      throw error;
    }
  }

  // ── Transfers
  /**
   * Создать перевод между двумя счётами
   * Вычитает из исходного счета, добавляет целевому
   */
  async createTransfer(data: {
    date: string;
    amount: number;
    fromAccountId: number;
    toAccountId: number;
    comment?: string;
  }): Promise<{ from: Transaction; to: Transaction; success: boolean }> {
    try {
      // Валидация
      if (data.fromAccountId === data.toAccountId) {
        throw new Error("Cannot transfer to the same account");
      }
      if (data.amount <= 0) {
        throw new Error("Transfer amount must be positive");
      }

      // Получить источник и целевой счета
      const fromAccount = await this.getAccount(data.fromAccountId);
      const toAccount = await this.getAccount(data.toAccountId);

      if (!fromAccount) throw new Error(`Source account #${data.fromAccountId} not found`);
      if (!toAccount) throw new Error(`Target account #${data.toAccountId} not found`);

      // Проверить достаточность средств
      if (fromAccount.balance < data.amount) {
        console.warn(
          `[transfer] Insufficient funds: ${fromAccount.name} has ${fromAccount.balance}, trying to transfer ${data.amount}`
        );
      }

      // Создать две связанные транзакции
      const fromTransaction = await this.createTransaction({
        date: data.date,
        type: "transfer",
        amount: data.amount,
        currency: fromAccount.currency,
        categoryName: "",
        accountName: fromAccount.name,
        accountId: fromAccount.id,
        targetAccountId: toAccount.id,
        payee: `Transfer to ${toAccount.name}`,
        comment: data.comment || "",
        source: "manual",
      });

      const toTransaction = await this.createTransaction({
        date: data.date,
        type: "transfer",
        amount: data.amount,
        currency: toAccount.currency,
        categoryName: "",
        accountName: toAccount.name,
        accountId: toAccount.id,
        targetAccountId: fromAccount.id,
        payee: `Transfer from ${fromAccount.name}`,
        comment: data.comment || "",
        source: "manual",
      });

      // Обновить балансы обоих счетов
      await this.db
        .update(accounts)
        .set({ balance: fromAccount.balance - data.amount })
        .where(eq(accounts.id, fromAccount.id));

      await this.db
        .update(accounts)
        .set({ balance: toAccount.balance + data.amount })
        .where(eq(accounts.id, toAccount.id));

      console.log(
        `[transfer] ✓ ${data.amount} transferred from ${fromAccount.name} to ${toAccount.name}`
      );

      return {
        from: fromTransaction,
        to: toTransaction,
        success: true,
      };
    } catch (error) {
      console.error("[transfer] Error:", error);
      throw error;
    }
  }

  /**
   * Получить все переводы для счёта
   */
  async getAccountTransfers(accountId: number): Promise<Transaction[]> {
    return this.db
      .select()
      .from(transactions)
      .where(
        sql`(${transactions.accountId} = ${accountId} OR ${transactions.targetAccountId} = ${accountId}) AND ${transactions.type} = 'transfer'`
      );
  }
}

export const storage = new DatabaseStorage();
