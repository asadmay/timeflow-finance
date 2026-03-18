-- Add targetAccountId column for transfers between accounts
ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "target_account_id" integer;

-- Create index for transfer tracking
CREATE INDEX IF NOT EXISTS "idx_transactions_target_account_id" ON "transactions"("target_account_id");
