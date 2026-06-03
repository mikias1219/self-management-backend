import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnglishService } from './application/services/english.service';
import { EnglishPractice } from './domain/entities/english-practice.entity';
import { EnglishController } from './presentation/controllers/english.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EnglishPractice])],
  controllers: [EnglishController],
  providers: [EnglishService],
  exports: [EnglishService],
})
export class EnglishModule {}
