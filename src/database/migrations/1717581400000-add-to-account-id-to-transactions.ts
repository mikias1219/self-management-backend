import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToAccountIdToTransactions1717581400000
  implements MigrationInterface
{
  name = 'AddToAccountIdToTransactions1717581400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "toAccountId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_transactions_toAccountId" ON "finance_transactions" ("toAccountId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_finance_transactions_toAccountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "toAccountId"`,
    );
  }
}

