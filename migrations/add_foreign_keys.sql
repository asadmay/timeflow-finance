-- Add Foreign Key columns to transactions table
ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "account_id" integer,
ADD COLUMN IF NOT EXISTS "income_category_id" integer,
ADD COLUMN IF NOT EXISTS "expense_category_id" integer;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_transactions_account_id" ON "transactions"("account_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_income_category_id" ON "transactions"("income_category_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_expense_category_id" ON "transactions"("expense_category_id");
