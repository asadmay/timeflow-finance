/**
 * Скрипт пересчета балансов: recalculateBalance
 * 
 * Задача:
 * - Для каждого счета вычислить SUM(transactions.amount)
 * - Обновить accounts.balance с правильной суммой
 * 
 * Запуск: npx tsx script/recalculate-balances.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DatabaseStorage } from "../server/storage";

async function recalculateBalances() {
  console.log("🚀 Начинаем пересчет балансов...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle(pool);
  const storage = new DatabaseStorage(db);

  try {
    const result = await storage.recalculateBalance();
    
    console.log(`\n✅ Пересчет завершен:`);
    console.log(`   ✓ Обновлено счётов: ${result.updated}`);
    console.log(`\n📊 Новые балансы:`);
    
    for (const detail of result.details) {
      console.log(`   Account #${detail.accountId}: ${detail.balance}`);
    }

  } catch (error) {
    console.error("❌ Ошибка при пересчете:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

recalculateBalances();
