import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { format } from 'date-fns';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';
import { FinanceTransaction } from '../../../finance/domain/entities/transaction.entity';
import { TransactionType } from '../../../finance/domain/enums/finance.enums';

export interface TimelineEvent {
  id: string;
  type: 'activity' | 'task_completed' | 'finance';
  title: string;
  description?: string;
  timestamp: string;
  module?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TimelineService {
  constructor(
    private readonly activityLogs: ActivityLogsService,
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
  ) {}

  async getTimeline(
    userId: string,
    query: DateRangeQueryDto,
  ): Promise<TimelineEvent[]> {
    const range = resolveDateRange(query.period, query.startDate, query.endDate);
    const [logsResult, completedTasks, financeTx] = await Promise.all([
      this.activityLogs.findByUser(userId, query),
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: TaskStatus.DONE,
          completedAt: Between(range.start, range.end),
        },
        order: { completedAt: 'DESC' },
        take: 50,
      }),
      this.txRepo.find({
        where: {
          createdBy: userId,
          transactionDate: Between(
            format(range.start, 'yyyy-MM-dd'),
            format(range.end, 'yyyy-MM-dd'),
          ),
        },
        order: { transactionDate: 'DESC' },
        take: 50,
      }),
    ]);

    const events: TimelineEvent[] = [];
    const logs = logsResult.data;

    for (const log of logs) {
      events.push({
        id: `log-${log.id}`,
        type: 'activity',
        title: log.description ?? `${log.action} ${log.entityType}`,
        timestamp: log.createdAt.toISOString(),
        module: log.module,
        metadata: log.metadata ?? undefined,
      });
    }

    for (const task of completedTasks) {
      events.push({
        id: `task-${task.id}`,
        type: 'task_completed',
        title: task.title,
        description: task.completionNote,
        timestamp: task.completedAt!.toISOString(),
        module: 'tasks',
        metadata: {
          plannedMinutes: task.estimatedMinutes,
          achievedMinutes: task.timeSpentMinutes,
          lifeArea: task.lifeArea,
        },
      });
    }

    for (const tx of financeTx) {
      if (
        tx.transactionType !== TransactionType.INCOME &&
        tx.transactionType !== TransactionType.TRANSFER
      ) {
        continue;
      }
      events.push({
        id: `tx-${tx.id}`,
        type: 'finance',
        title: tx.description ?? tx.transactionType,
        timestamp: `${tx.transactionDate}T12:00:00.000Z`,
        module: 'finance',
        metadata: {
          amount: Number(tx.amount),
          transactionType: tx.transactionType,
          isWastage: tx.isWastage,
        },
      });
    }

    return events
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 100);
  }
}
