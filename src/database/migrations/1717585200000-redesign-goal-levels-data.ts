import { MigrationInterface, QueryRunner } from 'typeorm';

export class RedesignGoalLevelsData1717585200000 implements MigrationInterface {
  name = 'RedesignGoalLevelsData1717585200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "goals" SET level = 'life' WHERE level IN ('vision', 'yearly');
    `);
    await queryRunner.query(`
      UPDATE "goals" SET level = 'milestone' WHERE level IN ('quarterly', 'monthly');
    `);
    await queryRunner.query(`
      UPDATE "goals" SET level = 'target' WHERE level IN ('weekly', 'daily');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "goals" SET level = 'vision' WHERE level = 'life';
    `);
    await queryRunner.query(`
      UPDATE "goals" SET level = 'quarterly' WHERE level = 'milestone';
    `);
    await queryRunner.query(`
      UPDATE "goals" SET level = 'weekly' WHERE level = 'target';
    `);
  }
}
