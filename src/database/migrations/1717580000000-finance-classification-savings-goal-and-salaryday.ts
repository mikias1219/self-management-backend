import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceClassificationSavingsGoalAndSalaryday1717580000000
  implements MigrationInterface
{
  name = 'FinanceClassificationSavingsGoalAndSalaryday1717580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "salaryDay" integer NOT NULL DEFAULT 25`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."finance_expense_categories_classificationtype_enum" AS ENUM (
          'fixed_obligation',
          'variable_necessity',
          'discretionary',
          'savings_transfer'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `ALTER TABLE "finance_expense_categories" ADD COLUMN IF NOT EXISTS "classificationType" "public"."finance_expense_categories_classificationtype_enum" NOT NULL DEFAULT 'discretionary'`,
    );

    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "savingsGoalId" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_finance_transactions_savings_goal'
        ) THEN
          ALTER TABLE "finance_transactions"
            ADD CONSTRAINT "FK_finance_transactions_savings_goal"
            FOREIGN KEY ("savingsGoalId") REFERENCES "finance_savings_goals"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP CONSTRAINT IF EXISTS "FK_finance_transactions_savings_goal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "savingsGoalId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_expense_categories" DROP COLUMN IF EXISTS "classificationType"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."finance_expense_categories_classificationtype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "salaryDay"`,
    );
  }
}

