/**
 * Тестирование функциональности переводов между счетами
 * Запуск: npx tsx script/test-transfers.ts
 */

// Загрузить env переменные ДО любых других импортов
import "../server/env";

import { DatabaseStorage } from "../server/storage";
import { db } from "../api/[...path]";

async function testTransfers() {
  console.log("🧪 Начинаем тестирование переводов между счетами...\n");

  const storage = new DatabaseStorage(db);

  try {
    // Получить счета
    const accounts = await storage.getAccounts();
    if (accounts.length < 2) {
      console.error("❌ Недостаточно счетов. Минимум 2 требуется для теста.");
      process.exit(1);
    }

    const fromAccount = accounts[0];
    const toAccount = accounts[1];

    console.log(`📊 Первоначальные балансы:`);
    console.log(`   ${fromAccount.name}: ${fromAccount.balance} ${fromAccount.currency}`);
    console.log(`   ${toAccount.name}: ${toAccount.balance} ${toAccount.currency}`);
    console.log();

    // Создать тестовый перевод
    const transferAmount = 10000; // 10000 копеек = 100 рублей
    const testDate = new Date().toISOString();

    console.log(`💸 Создаем перевод $${transferAmount} от ${fromAccount.name} к ${toAccount.name}...`);
    
    const transferResult = await storage.createTransfer({
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount: transferAmount,
      date: testDate,
      comment: "Test transfer",
    });

    console.log(`✅ Перевод создан:`, transferResult);
    console.log();

    // Получить обновленные балансы
    const updatedFromAccount = await storage.getAccount(fromAccount.id);
    const updatedToAccount = await storage.getAccount(toAccount.id);

    console.log(`📊 Балансы после перевода:`);
    console.log(`   ${updatedFromAccount.name}: ${updatedFromAccount.balance} ${updatedFromAccount.currency}`);
    console.log(`   ${updatedToAccount.name}: ${updatedToAccount.balance} ${updatedToAccount.currency}`);
    console.log();

    // Проверить результаты
    const expectedFromBalance = fromAccount.balance - transferAmount;
    const expectedToBalance = toAccount.balance + transferAmount;

    const fromBalanceOk = updatedFromAccount.balance === expectedFromBalance;
    const toBalanceOk = updatedToAccount.balance === expectedToBalance;

    if (fromBalanceOk && toBalanceOk) {
      console.log(`✅ Тест пройден! Балансы корректно обновлены.`);
    } else {
      console.log(`❌ Тест не пройден!`);
      console.log(`   Ожидаемый баланс ${fromAccount.name}: ${expectedFromBalance}, получено: ${updatedFromAccount.balance}`);
      console.log(`   Ожидаемый баланс ${toAccount.name}: ${expectedToBalance}, получено: ${updatedToAccount.balance}`);
      process.exit(1);
    }

    // Получить все переводы
    const transfers = await storage.getTransactions({ type: "transfer" });
    console.log(`\n📋 Всего переводов в системе: ${transfers.length}`);

    // Получить переводы конкретного счета
    const accountTransfers = await storage.getAccountTransfers(fromAccount.id);
    console.log(`📋 Переводы для ${fromAccount.name}: ${accountTransfers.length}`);

  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
    process.exit(1);
  }
}

testTransfers();
