/**
 * Скрипт миграции: привязать существующие транзакции к accountId
 * 
 * Задача:
 * - Для каждой транзакции найти счет по transactions.accountName
 * - Обновить transactions.accountId = accounts.id
 * - Обновить transactions.categoryId (если возможно)
 * 
 * Запуск: npx tsx script/migrate-transactions.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { transactions, accounts, incomeCategories, expenseCategories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateTransactions() {
  console.log("🚀 Начинаем миграцию транзакций...\n");

  // Подключение к БД
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle(pool);

  try {
    // 1️⃣ Получить все транзакции
    const allTransactions = await db.select().from(transactions);
    console.log(`📊 Найдено ${allTransactions.length} транзакций для обработки\n`);

    // 2️⃣ Получить все счёта и категории
    const allAccounts = await db.select().from(accounts);
    const allIncomeCategories = await db.select().from(incomeCategories);
    const allExpenseCategories = await db.select().from(expenseCategories);

    console.log(`📋 Счётов: ${allAccounts.length}`);
    console.log(`💰 Доходных категорий: ${allIncomeCategories.length}`);
    console.log(`💸 Расходных категорий: ${allExpenseCategories.length}\n`);

    // 3️⃣ Привязать транзакции к счётам и категориям
    let updated = 0;
    let accountsNotFound = 0;
    let categoriesMatched = 0;

    for (const txn of allTransactions) {
      let needsUpdate = false;
      const update: any = {};

      // Попытаться найти счет по имени
      if (txn.accountName && !txn.accountId) {
        const account = allAccounts.find(
          (a) => a.name.toLowerCase() === txn.accountName.toLowerCase()
        );
        if (account) {
          update.accountId = account.id;
          needsUpdate = true;
        } else {
          accountsNotFound++;
        }
      }

      // Попытаться найти категорию по типу и имени
      if (txn.categoryName && txn.type === "income" && !txn.incomeCategoryId) {
        const category = allIncomeCategories.find(
          (c) => c.name.toLowerCase() === txn.categoryName.toLowerCase()
        );
        if (category) {
          update.incomeCategoryId = category.id;
          categoriesMatched++;
          needsUpdate = true;
        }
      } else if (txn.categoryName && txn.type === "expense" && !txn.expenseCategoryId) {
        const category = allExpenseCategories.find(
          (c) => c.name.toLowerCase() === txn.categoryName.toLowerCase()
        );
        if (category) {
          update.expenseCategoryId = category.id;
          categoriesMatched++;
          needsUpdate = true;
        }
      }

      // Обновить транзакцию если нужно
      if (needsUpdate) {
        await db
          .update(transactions)
          .set(update)
          .where(eq(transactions.id, txn.id));
        updated++;
      }
    }

    console.log(`\n✅ Миграция завершена:`);
    console.log(`   ✓ Обновлено транзакций: ${updated}`);
    console.log(`   ✓ Категорий привязано: ${categoriesMatched}`);
    console.log(`   ⚠️  Счётов не найдено: ${accountsNotFound}`);

    // 4️⃣ Проверка целостности
    const transactionsWithAccountId = await db
      .select()
      .from(transactions)
      .then((txns) => txns.filter((t) => t.accountId !== null).length);

    console.log(`\n📊 Статистика завершения:`);
    console.log(`   Транзакций с accountId: ${transactionsWithAccountId}/${allTransactions.length}`);
    console.log(`   Процент заполнения: ${((transactionsWithAccountId / allTransactions.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error("❌ Ошибка при миграции:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateTransactions();
