CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'card' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text DEFAULT 'wallet' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" integer NOT NULL,
	"cashflow" integer DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'Прочее' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"broker" text DEFAULT '' NOT NULL,
	"ticker" text DEFAULT '' NOT NULL,
	"isin" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"quantity" real DEFAULT 0 NOT NULL,
	"avg_price" real DEFAULT 0 NOT NULL,
	"current_price" real DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"type" text DEFAULT 'stock' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bank" text DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"rate" real DEFAULT 0 NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"account_id" integer
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#ef4444' NOT NULL,
	"icon" text DEFAULT 'trending-down' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"category_id" integer,
	"category" text DEFAULT 'Прочее' NOT NULL,
	"account_id" integer
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"category" text DEFAULT 'Мечта' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#22c55e' NOT NULL,
	"icon" text DEFAULT 'trending-up' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"category_id" integer,
	"category" text DEFAULT 'Прочее' NOT NULL,
	"is_passive" boolean DEFAULT false NOT NULL,
	"account_id" integer
);
--> statement-breakpoint
CREATE TABLE "liabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"payment" integer DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'Рутины' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Мой профиль' NOT NULL,
	"cash" integer DEFAULT 0 NOT NULL,
	"free_hours" integer DEFAULT 168 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hours" integer NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"category_name" text DEFAULT '' NOT NULL,
	"account_name" text DEFAULT '' NOT NULL,
	"payee" text DEFAULT '' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"account_id" integer,
	"income_category_id" integer,
	"expense_category_id" integer
);
