import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'lifeos',
  password: process.env.DATABASE_PASSWORD ?? 'lifeos_secret',
  database: process.env.DATABASE_NAME ?? 'lifeos',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: true,
});
