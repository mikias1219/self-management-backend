import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyReviewsService } from './application/services/daily-reviews.service';
import { DailyReview } from './domain/entities/daily-review.entity';
import { DailyReviewsController } from './presentation/controllers/daily-reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DailyReview])],
  controllers: [DailyReviewsController],
  providers: [DailyReviewsService],
  exports: [DailyReviewsService],
})
export class DailyReviewsModule {}
