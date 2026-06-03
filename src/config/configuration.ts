export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'lifeos',
    password: process.env.DATABASE_PASSWORD ?? 'lifeos_secret',
    name: process.env.DATABASE_NAME ?? 'lifeos',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'lifeos-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  seedOnStart: process.env.SEED_ON_START === 'true',
  openApiKey: process.env.OPEN_API_KEY ?? '',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
});
