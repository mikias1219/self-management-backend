import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

@Injectable()
export class SavingsGoalsService extends BaseCrudService<SavingsGoal> {
  constructor(
    @InjectRepository(SavingsGoal) repository: Repository<SavingsGoal>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'SavingsGoal',
    });
  }

  override async update(
    id: string,
    dto: DeepPartial<SavingsGoal>,
    userId: string,
  ): Promise<SavingsGoal> {
    const patch = { ...dto };
    delete patch.currentAmount;
    delete patch.savingsShortfallCarryForward;
    return super.update(id, patch, userId);
  }

  /** projectedCompletionDate = months remaining at monthlyTargetAmount */
  withProjectedCompletion(goal: SavingsGoal): SavingsGoal & {
    projectedCompletionDate?: string;
  } {
    const monthly = toNum(goal.monthlyTargetAmount);
    const remaining = Math.max(0, toNum(goal.targetAmount) - toNum(goal.currentAmount));
    if (monthly <= 0 || remaining <= 0) {
      return { ...goal, projectedCompletionDate: undefined };
    }
    const months = Math.ceil(remaining / monthly);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return {
      ...goal,
      projectedCompletionDate: d.toISOString().slice(0, 10),
    };
  }

  override async findAllForUser(userId: string): Promise<SavingsGoal[]> {
    const goals = await super.findAllForUser(userId);
    return goals.map((g) => this.withProjectedCompletion(g));
  }

  override async findOneForUser(
    userId: string,
    id: string,
  ): Promise<SavingsGoal> {
    const goal = await super.findOneForUser(userId, id);
    return this.withProjectedCompletion(goal);
  }
}
