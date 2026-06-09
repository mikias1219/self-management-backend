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
  /** Public base URL for calendar subscribe links (e.g. https://api.yourdomain.com) */
  apiPublicUrl: process.env.API_PUBLIC_URL ?? '',
  seedOnStart: process.env.SEED_ON_START === 'true',
  seedUser: {
    email: process.env.SEED_USER_EMAIL ?? 'mikiyasabate003@gmail.com',
    password: process.env.SEED_USER_PASSWORD ?? '',
    displayName: process.env.SEED_USER_NAME ?? 'Mikiyas',
  },
  openApiKey: process.env.OPEN_API_KEY ?? '',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      'http://localhost:3000/settings/google-callback',
  },
  calendar: {
    defaultEmbedSrc: process.env.DEFAULT_CALENDAR_EMBED_SRC ?? '',
    defaultIcalUrl: process.env.DEFAULT_CALENDAR_ICAL_URL ?? '',
    defaultTimezone: process.env.DEFAULT_CALENDAR_TIMEZONE ?? 'Africa/Nairobi',
  },
});
