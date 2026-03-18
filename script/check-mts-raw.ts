import "../server/env";
import { Pool } from "pg";

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech") 
      ? { rejectUnauthorized: false } 
      : false,
  });

  try {
    // Получить счет МТС
    const accountResult = await pool.query(
      `SELECT id, name, balance, currency FROM accounts WHERE name ILIKE '%МТС%' LIMIT 1`
    );
    
    if (accountResult.rows.length === 0) {
      console.log("❌ МТС счет не найден");
      return;
    }

    const account = accountResult.rows[0];
    console.log(`📊 Счет: ${account.name}`);
    console.log(`💰 Баланс в БД: ${account.balance} (копейки)`);
    console.log(`💰 Баланс: ${account.balance / 100} (рубли)`);
    console.log(`💱 Валюта: ${account.currency}\n`);

    // Получить транзакции
    const txnResult = await pool.query(
      `SELECT id, date, type, amount, comment, payee FROM transactions 
       WHERE account_id = $1 ORDER BY date DESC LIMIT 10`,
      [account.id]
    );

    console.log(`📋 Транзакции (последние 10):`);
    txnResult.rows.forEach(t => {
      console.log(
        `  ${t.date.substring(0, 10)} | ${t.type.padEnd(8)} | ${t.amount} коп (${t.amount/100}₽) | ${t.payee || t.comment}`
      );
    });

  } finally {
    await pool.end();
  }
}

check().catch(console.error);
