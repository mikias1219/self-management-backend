import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceObligationsSalaryAllocation1717582000000
  implements MigrationInterface
{
  name = 'FinanceObligationsSalaryAllocation1717582000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."finance_pending_obligations_status_enum" AS ENUM ('pending', 'paid', 'overdue');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_cycles"
        ADD COLUMN IF NOT EXISTS "fixedObligations" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "savingsTarget" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "spendingBudget" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "totalFixedObligations" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "totalSavingsAllocated" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "totalVariableSpent" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "remainingBalance" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "savingsShortfall" numeric(14,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_expense_categories"
        ADD COLUMN IF NOT EXISTS "dueDay" integer,
        ADD COLUMN IF NOT EXISTS "expectedAmount" numeric(14,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_savings_goals"
        ADD COLUMN IF NOT EXISTS "monthlyTargetAmount" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "savingsShortfallCarryForward" numeric(14,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD COLUMN IF NOT EXISTS "grossAmount" numeric(14,2),
        ADD COLUMN IF NOT EXISTS "taxDeducted" numeric(14,2),
        ADD COLUMN IF NOT EXISTS "pensionDeducted" numeric(14,2),
        ADD COLUMN IF NOT EXISTS "netAmount" numeric(14,2),
        ADD COLUMN IF NOT EXISTS "needsReview" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isCorrection" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "correctionReason" character varying,
        ADD COLUMN IF NOT EXISTS "cycleId" uuid,
        ADD COLUMN IF NOT EXISTS "pendingObligationId" uuid
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_recurring_obligations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "createdBy" uuid,
        "status" character varying NOT NULL DEFAULT 'active',
        "name" character varying NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "dueDayOfMonth" integer NOT NULL,
        "paymentMethod" character varying,
        "landlordReference" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_finance_recurring_obligations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_pending_obligations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "createdBy" uuid,
        "status" character varying NOT NULL DEFAULT 'active',
        "cycleId" uuid NOT NULL,
        "recurringObligationId" uuid,
        "categoryId" uuid,
        "name" character varying NOT NULL,
        "expectedAmount" numeric(14,2) NOT NULL,
        "dueDate" date NOT NULL,
        "obligationStatus" "public"."finance_pending_obligations_status_enum" NOT NULL DEFAULT 'pending',
        "paidTransactionId" uuid,
        CONSTRAINT "PK_finance_pending_obligations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pending_obligations_cycle" ON "finance_pending_obligations" ("createdBy", "cycleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_recurring_obligations_user" ON "finance_recurring_obligations" ("createdBy", "isActive")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_pending_obligations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_recurring_obligations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."finance_pending_obligations_status_enum"`);
  }
}
