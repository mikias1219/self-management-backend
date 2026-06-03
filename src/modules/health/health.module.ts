import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthService } from './application/services/health.service';
import { HealthLog } from './domain/entities/health-log.entity';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HealthLog])],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
