import "../server/env";
import { DatabaseStorage } from "../server/storage";
import { db } from "../api/[...path]";

async function debug() {
  const storage = new DatabaseStorage(db);
  
  // Найти счет МТС Pay
  const accounts = await storage.getAccounts();
  const mtsPay = accounts.find(a => a.name.includes("МТС Pay"));
  
  if (!mtsPay) {
    console.log("❌ МТС Pay карта не найдена");
    process.exit(1);
  }
  
  console.log(`📊 Счет: ${mtsPay.name}`);
  console.log(`💰 Баланс: ${mtsPay.balance} ${mtsPay.currency}\n`);
  
  // Получить все транзакции для этого счета
  const allTxns = await storage.getTransactions();
  const txns = allTxns.filter(t => t.accountId === mtsPay.id);
  
  console.log(`📋 Всего транзакций: ${txns.length}`);
  console.log(`\nТранзакции (последние 20):`);
  
  let totalSum = 0;
  txns.slice(-20).forEach(t => {
    let displayAmount = t.amount;
    if (t.type === "income") {
      totalSum += t.amount;
    } else if (t.type === "expense") {
      totalSum -= t.amount;
      displayAmount = -t.amount;
    } else if (t.type === "transfer" && t.accountId === mtsPay.id) {
      totalSum -= t.amount;
      displayAmount = -t.amount;
    } else if (t.type === "transfer" && t.targetAccountId === mtsPay.id) {
      totalSum += t.amount;
    }
    console.log(`  ${t.date.substring(0,10)} | ${t.type.padEnd(8)} | ${displayAmount} | ${t.comment || t.payee}`);
  });
  
  console.log(`\n✅ Сумма всех транзакций: ${totalSum}`);
  console.log(`📊 Баланс в БД: ${mtsPay.balance}`);
  console.log(`⚠️  Разница: ${mtsPay.balance - totalSum}`);
}

debug().catch(console.error);
