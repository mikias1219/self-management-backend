import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceCyclesStatusColumn1717583000000
  implements MigrationInterface
{
  name = 'AddFinanceCyclesStatusColumn1717583000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."finance_cycles_status_enum" AS ENUM (
          'active',
          'inactive',
          'archived',
          'completed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_cycles"
        ADD COLUMN IF NOT EXISTS "status" "public"."finance_cycles_status_enum" NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "finance_cycles" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."finance_cycles_status_enum"`,
    );
  }
}
