import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpiritualService } from './application/services/spiritual.service';
import { SpiritualActivity } from './domain/entities/spiritual-activity.entity';
import { SpiritualController } from './presentation/controllers/spiritual.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpiritualActivity])],
  controllers: [SpiritualController],
  providers: [SpiritualService],
  exports: [SpiritualService],
})
export class SpiritualModule {}
