import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        }),
        ttl: 60_000,
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
