import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskExtensionsWastageSettings1717584000000
  implements MigrationInterface
{
  name = 'AddTaskExtensionsWastageSettings1717584000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tasks_recurringinterval_enum" AS ENUM('none', 'weekly', 'monthly', 'yearly');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD COLUMN IF NOT EXISTS "completionNote" text,
        ADD COLUMN IF NOT EXISTS "parentTaskId" uuid,
        ADD COLUMN IF NOT EXISTS "isRecurring" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "recurringInterval" "public"."tasks_recurringinterval_enum" NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "recurringParentId" uuid,
        ADD COLUMN IF NOT EXISTS "timerStartedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "lastRecurringGeneratedAt" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD COLUMN IF NOT EXISTS "isWastage" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isPartialPayment" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "user_settings"
        ADD COLUMN IF NOT EXISTS "annualSavingsTarget" decimal(14,2),
        ADD COLUMN IF NOT EXISTS "financeOnboardingCompleted" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_settings"
        DROP COLUMN IF EXISTS "financeOnboardingCompleted",
        DROP COLUMN IF EXISTS "annualSavingsTarget"
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        DROP COLUMN IF EXISTS "isPartialPayment",
        DROP COLUMN IF EXISTS "isWastage"
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        DROP COLUMN IF EXISTS "lastRecurringGeneratedAt",
        DROP COLUMN IF EXISTS "timerStartedAt",
        DROP COLUMN IF EXISTS "recurringParentId",
        DROP COLUMN IF EXISTS "recurringInterval",
        DROP COLUMN IF EXISTS "isRecurring",
        DROP COLUMN IF EXISTS "parentTaskId",
        DROP COLUMN IF EXISTS "completionNote"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tasks_recurringinterval_enum"`);
  }
}
