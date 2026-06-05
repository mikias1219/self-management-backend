import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceCycles1717581000000 implements MigrationInterface {
  name = 'AddFinanceCycles1717581000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_cycles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "createdBy" uuid,
        "status" character varying NOT NULL DEFAULT 'active',
        "cycleStatus" character varying NOT NULL DEFAULT 'open',
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "grossSalary" numeric(14,2) NOT NULL DEFAULT 0,
        "netSalary" numeric(14,2) NOT NULL DEFAULT 0,
        "actualSavingsRate" numeric(5,2) NOT NULL DEFAULT 0,
        "fixedObligationRate" numeric(5,2) NOT NULL DEFAULT 0,
        "discretionaryRate" numeric(5,2) NOT NULL DEFAULT 0,
        "largestExpenseCategory" character varying,
        "unspentBudget" numeric(14,2) NOT NULL DEFAULT 0,
        "financialHealthScore" integer NOT NULL DEFAULT 0,
        "closedAt" timestamptz,
        CONSTRAINT "PK_finance_cycles_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_cycles_createdBy_startDate" ON "finance_cycles" ("createdBy", "startDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_cycles_createdBy_cycleStatus" ON "finance_cycles" ("createdBy", "cycleStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_cycles"`);
  }
}

