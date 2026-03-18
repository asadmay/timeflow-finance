import { db } from "../server/db";
import { transactions, accounts, incomeCategories, expenseCategories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function runMigration() {
  console.log("Starting relations migration for existing transactions...");

  const allAccounts = await db.select().from(accounts);
  const allIncomeCats = await db.select().from(incomeCategories);
  const allExpenseCats = await db.select().from(expenseCategories);

  const accountsMap = new Map(allAccounts.map(a => [a.name.toLowerCase().trim(), a.id]));
  const incomeCatsMap = new Map(allIncomeCats.map(c => [c.name.toLowerCase().trim(), c.id]));
  const expenseCatsMap = new Map(allExpenseCats.map(c => [c.name.toLowerCase().trim(), c.id]));

  const allTxns = await db.select().from(transactions);
  console.log(`Found ${allTxns.length} transactions to check.`);

  let updatedCount = 0;

  // Process in chunks of 50
  for (let i = 0; i < allTxns.length; i += 50) {
    const chunk = allTxns.slice(i, i + 50);
    const promises = chunk.map(async (txn) => {
      let needsUpdate = false;
      let newAccountId = txn.accountId;
      let newIncomeCategoryId = txn.incomeCategoryId;
      let newExpenseCategoryId = txn.expenseCategoryId;
      let newTargetAccountId = txn.targetAccountId;

      const accName = txn.accountName?.toLowerCase().trim();
      const catName = txn.categoryName?.toLowerCase().trim();

      if (!newAccountId && accName) {
        if (!accountsMap.has(accName)) {
          console.log(`Creating missing account: ${txn.accountName}`);
          const [newAcc] = await db.insert(accounts).values({
            name: txn.accountName || "Unknown",
            type: "card",
            balance: 0,
            currency: txn.currency || "RUB",
            color: "#6366f1",
            icon: "wallet",
            isArchived: false,
          }).returning();
          accountsMap.set(accName, newAcc.id);
        }
        newAccountId = accountsMap.get(accName)!;
        needsUpdate = true;
      }

      if (!newIncomeCategoryId && txn.type === "income" && catName) {
        if (!incomeCatsMap.has(catName)) {
          console.log(`Creating missing income category: ${txn.categoryName}`);
          const [newCat] = await db.insert(incomeCategories).values({
            name: txn.categoryName || "Unknown",
            color: "#22c55e",
            icon: "trending-up",
            isDefault: false,
          }).returning();
          incomeCatsMap.set(catName, newCat.id);
        }
        newIncomeCategoryId = incomeCatsMap.get(catName)!;
        needsUpdate = true;
      } else if (!newExpenseCategoryId && txn.type === "expense" && catName) {
        if (!expenseCatsMap.has(catName)) {
          console.log(`Creating missing expense category: ${txn.categoryName}`);
          const [newCat] = await db.insert(expenseCategories).values({
            name: txn.categoryName || "Unknown",
            color: "#ef4444",
            icon: "trending-down",
            isDefault: false,
          }).returning();
          expenseCatsMap.set(catName, newCat.id);
        }
        newExpenseCategoryId = expenseCatsMap.get(catName)!;
        needsUpdate = true;
      }

      if (txn.type === "transfer" && !newTargetAccountId) {
        const payeeStr = txn.payee?.toLowerCase().trim() || "";
        if (payeeStr.startsWith("transfer to ")) {
          const targetName = payeeStr.replace("transfer to ", "").trim();
          if (targetName && accountsMap.has(targetName)) {
            newTargetAccountId = accountsMap.get(targetName)!;
            needsUpdate = true;
          }
        } else if (payeeStr.includes("перевод на ")) {
          const targetName = payeeStr.split("перевод на ")[1].trim();
          if (targetName && accountsMap.has(targetName)) {
            newTargetAccountId = accountsMap.get(targetName)!;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        await db.update(transactions)
          .set({
            accountId: newAccountId,
            incomeCategoryId: newIncomeCategoryId,
            expenseCategoryId: newExpenseCategoryId,
            targetAccountId: newTargetAccountId,
          })
          .where(eq(transactions.id, txn.id));
        updatedCount++;
      }
    });

    try {
      await Promise.all(promises);
      if ((i + 50) % 500 === 0) {
        console.log(`Processed ${i + 50}/${allTxns.length} transactions...`);
      }
    } catch (e) {
      console.error(`Error in chunk ${i}:`, e);
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} transactions.`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
