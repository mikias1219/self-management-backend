import { MigrationInterface, QueryRunner } from 'typeorm';

export class RedesignGoalLevels1717585100000 implements MigrationInterface {
  name = 'RedesignGoalLevels1717585100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "goals_level_enum" ADD VALUE IF NOT EXISTS 'life';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "goals_level_enum" ADD VALUE IF NOT EXISTS 'milestone';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "goals_level_enum" ADD VALUE IF NOT EXISTS 'target';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Enum values cannot be removed safely in PostgreSQL.
  }
}
