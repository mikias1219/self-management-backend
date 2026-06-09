import { MigrationInterface, QueryRunner } from 'typeorm';

export class RedesignSchemaUpdates1717585000000 implements MigrationInterface {
  name = 'RedesignSchemaUpdates1717585000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "daily_reviews"
      ADD COLUMN IF NOT EXISTS "reviewType" VARCHAR(20) NOT NULL DEFAULT 'daily';
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_savings_goals"
      ADD COLUMN IF NOT EXISTS "linkedGoalId" uuid REFERENCES "goals"(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_user_due_date"
      ON "tasks"("createdBy", "dueDate");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_user_due_date"`);
    await queryRunner.query(`
      ALTER TABLE "finance_savings_goals" DROP COLUMN IF EXISTS "linkedGoalId";
    `);
    await queryRunner.query(`
      ALTER TABLE "daily_reviews" DROP COLUMN IF EXISTS "reviewType";
    `);
  }
}
