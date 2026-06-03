import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { DailyReview } from '../../../daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../../../english/domain/entities/english-practice.entity';
import { FinanceTransaction } from '../../../finance/domain/entities/transaction.entity';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { HabitLog } from '../../../habits/domain/entities/habit-log.entity';
import { HealthLog } from '../../../health/domain/entities/health-log.entity';
import { Book } from '../../../learning/domain/entities/book.entity';
import { Course } from '../../../learning/domain/entities/course.entity';
import { StudySession } from '../../../learning/domain/entities/study-session.entity';
import { JournalEntry } from '../../../journal/domain/entities/journal-entry.entity';
import { SpiritualActivity } from '../../../spiritual/domain/entities/spiritual-activity.entity';
import { Task } from '../../../tasks/domain/entities/task.entity';

export interface ModuleCounts {
  tasks: number;
  goals: number;
  habitLogs: number;
  dailyReviews: number;
  studySessions: number;
  courses: number;
  books: number;
  transactions: number;
  englishPractices: number;
  spiritualActivities: number;
  healthLogs: number;
  journalEntries: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(HabitLog) private readonly habitLogsRepo: Repository<HabitLog>,
    @InjectRepository(DailyReview) private readonly dailyReviewsRepo: Repository<DailyReview>,
    @InjectRepository(StudySession) private readonly studySessionsRepo: Repository<StudySession>,
    @InjectRepository(Course) private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Book) private readonly booksRepo: Repository<Book>,
    @InjectRepository(FinanceTransaction) private readonly transactionsRepo: Repository<FinanceTransaction>,
    @InjectRepository(EnglishPractice) private readonly englishRepo: Repository<EnglishPractice>,
    @InjectRepository(SpiritualActivity) private readonly spiritualRepo: Repository<SpiritualActivity>,
    @InjectRepository(HealthLog) private readonly healthRepo: Repository<HealthLog>,
    @InjectRepository(JournalEntry) private readonly journalRepo: Repository<JournalEntry>,
  ) {}

  async getCountsByPeriod(
    userId: string,
    query: DateRangeQueryDto,
  ): Promise<{ period: DateRangeQueryDto; range: { start: Date; end: Date }; counts: ModuleCounts }> {
    const range = resolveDateRange(query.period, query.startDate, query.endDate);
    const between = Between(range.start, range.end);

    const [
      tasks,
      goals,
      habitLogs,
      dailyReviews,
      studySessions,
      courses,
      books,
      transactions,
      englishPractices,
      spiritualActivities,
      healthLogs,
      journalEntries,
    ] = await Promise.all([
      this.tasksRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.goalsRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.habitLogsRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.dailyReviewsRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.studySessionsRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.coursesRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.booksRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.transactionsRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.englishRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.spiritualRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.healthRepo.count({ where: { createdBy: userId, createdAt: between } }),
      this.journalRepo.count({ where: { createdBy: userId, createdAt: between } }),
    ]);

    return {
      period: query,
      range,
      counts: {
        tasks,
        goals,
        habitLogs,
        dailyReviews,
        studySessions,
        courses,
        books,
        transactions,
        englishPractices,
        spiritualActivities,
        healthLogs,
        journalEntries,
      },
    };
  }
}
