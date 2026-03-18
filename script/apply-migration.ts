/**
 * Применить ALTER TABLE миграцию вручную
 * Запуск: npx tsx script/apply-migration.ts
 */

// Загрузить env переменные ДО любых других импортов
import "../server/env";

import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log("🚀 Применяем ALTER TABLE миграцию...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    // Прочитать SQL файл
    const sqlPath = path.join(__dirname, "../migrations/add_foreign_keys.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log("📋 SQL запросы:");
    console.log(sqlContent);
    console.log("\n");

    // Выполнить SQL
    const result = await pool.query(sqlContent);
    console.log("✅ Миграция успешно применена!");
    console.log(`📊 Результат:`, result);

  } catch (error) {
    console.error("❌ Ошибка при применении миграции:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
